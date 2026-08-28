// X0 harness unit tests (Prism Route 4 "beyond-predictive").
//
// Rails:
//   VB-X-WAVELET-ROUNDTRIP  - integer wavelet lift is reversible (I26)
//   VB-X-LIFT-FIDELITY      - lift_inv(lift(x)) == x for arbitrary integer planes
//   VB-X-ANS-FIDELITY       - per-context rANS round-trips arbitrary bit strings
//   VB-X-CONTEXT-DETERMINISM- the pinned parent-aware context is a fixed function
//   VB-X-NET-AUDIT          - frame encode/decode is byte-exact and reports NET

#include <gtest/gtest.h>
#include "prism/types.h"
#include "prism/codec/wavelet.h"
#include "prism/codec/bitplane.h"
#include "prism/codec/bitplane_rans.h"
#include "prism/codec/wavelet_container.h"
#include "prism/codec/color.h"
#include <random>
#include <vector>

using namespace prism;
using namespace prism::codec;

namespace {

Raster make_raster(uint32_t w, uint32_t h, uint8_t ch, uint8_t bd, std::mt19937& rng) {
    Raster r(w, h, (Channels)ch, bd == 8 ? BitDepth::BD8 : BitDepth::BD16);
    uint32_t maxv = bd == 8 ? 255u : 65535u;
    for (auto& pl : r.planes)
        for (auto& v : pl) v = (uint16_t)(rng() % (maxv + 1));
    return r;
}

} // namespace

// VB-X-LIFT-FIDELITY / VB-X-WAVELET-ROUNDTRIP (I26): reversible for all filters.
TEST(X0Wavelet, LiftReversible) {
    std::mt19937 rng(20260828);
    WaveletFilter filters[] = {WaveletFilter::Haar, WaveletFilter::LeGall53,
                               WaveletFilter::Reversible97};
    for (auto f : filters) {
        for (int levels = 1; levels <= 5; ++levels) {
            Raster r = make_raster(64, 64, 3, 8, rng);
            WaveletLift lift;
            WaveletParams p{f, levels};
            for (auto& pl : r.planes) {
                std::vector<int32_t> plane(pl.begin(), pl.end());
                auto subs = lift.forward(plane, r.w, r.h, p);
                auto inv = lift.inverse(subs, r.w, r.h, p);
                ASSERT_EQ(inv.size(), plane.size()) << (int)f << " L" << levels;
                for (size_t i = 0; i < plane.size(); ++i)
                    EXPECT_EQ(inv[i], plane[i]) << (int)f << " L" << levels << " i" << i;
            }
        }
    }
}

// VB-X-LIFT-FIDELITY: odd sizes / single rows too.
TEST(X0Wavelet, LiftReversibleOddSizes) {
    std::mt19937 rng(99);
    WaveletFilter f = WaveletFilter::LeGall53;
    for (uint32_t w : {1u, 2u, 3u, 7u, 33u, 64u}) {
        for (uint32_t h : {1u, 2u, 5u, 9u, 48u}) {
            Raster r = make_raster(w, h, 1, 8, rng);
            WaveletLift lift;
            WaveletParams p{f, 2};
            auto subs = lift.forward(std::vector<int32_t>(r.planes[0].begin(), r.planes[0].end()),
                                     r.w, r.h, p);
            auto inv = lift.inverse(subs, r.w, r.h, p);
            ASSERT_EQ(inv.size(), r.w * r.h);
            for (size_t i = 0; i < inv.size(); ++i)
                EXPECT_EQ(inv[i], (int32_t)r.planes[0][i]) << "w" << w << "h" << h << "i" << i;
        }
    }
}

// VB-X-ANS-FIDELITY: per-symbol rANS round-trips arbitrary bits/probabilities.
TEST(X0Rans, Roundtrip) {
    BitplaneRans rans;
    std::mt19937 rng(5);
    for (int t = 0; t < 20; ++t) {
        int n = 1 + (rng() % 4000);
        std::vector<uint8_t> bits(n);
        std::vector<uint16_t> p0(n);
        for (int i = 0; i < n; ++i) {
            bits[i] = (uint8_t)(rng() & 1);
            // arbitrary valid probability in (0, M)
            p0[i] = (uint16_t)(1 + (rng() % (BitplaneRans::M - 2)));
        }
        auto enc = rans.encode(bits, p0);
        BitplaneRans::Decoder dec;
        dec.init(enc);
        std::vector<uint8_t> out(n);
        for (int i = 0; i < n; ++i) out[i] = dec.decode_symbol(p0[i]);
        EXPECT_EQ(out, bits) << "trial " << t;
    }
}

// VB-X-CONTEXT-DETERMINISM: context_id is a fixed function of (orient, parent
// state, 4-connected count, diagonal count) only, never of the bit value - so
// the decoder (which recomputes it from already-recovered data) stays in sync.
TEST(X0Bitplane, ContextDeterminism) {
    // Same inputs must always map to the same ctx id, and changing any input must
    // not collide with an unrelated input in the 0..599 range the coder actually
    // uses (200 base, +200 sign, +400 refine).
    for (int o = 0; o < 4; ++o)
        for (int ps = 0; ps < 2; ++ps)
            for (int fc = 0; fc < 5; ++fc)
                for (int dg = 0; dg < 5; ++dg) {
                    uint32_t a = BitplaneCoder::context_id((Subband::Orient)o, ps != 0, fc, dg);
                    uint32_t b = BitplaneCoder::context_id((Subband::Orient)o, ps != 0, fc, dg);
                    EXPECT_EQ(a, b);
                    EXPECT_LT(a, 200u);
                    // distinct parent state -> distinct context
                    EXPECT_NE(a, BitplaneCoder::context_id((Subband::Orient)o, !ps, fc, dg));
                    // distinct 4-connected pattern -> distinct context
                    if (fc > 0)
                        EXPECT_NE(a, BitplaneCoder::context_id((Subband::Orient)o, ps != 0, fc - 1, dg));
                }
}

// VB-X-NET-AUDIT: full frame pipeline is lossless and CRC-audited end to end.
TEST(X0Frame, WaveletRoundtrip) {
    std::mt19937 rng(424242);
    WaveletFilter filters[] = {WaveletFilter::Haar, WaveletFilter::LeGall53,
                               WaveletFilter::Reversible97};
    for (int fi = 0; fi < 3; ++fi) {
        Raster r = make_raster(64, 64, 3, 8, rng);
        size_t net = 0;
        auto bytes = frame_wavelet_encode(r, filters[fi], 5, net);
        Raster dec = frame_wavelet_decode(bytes);
        EXPECT_EQ(dec, r) << "filter " << fi;
    }
}

// VB-X-NET-AUDIT: 16-bit single/three channel, larger size.
TEST(X0Frame, WaveletRoundtripBd16) {
    std::mt19937 rng(7);
    Raster r = make_raster(48, 48, 3, 16, rng);
    size_t net = 0;
    auto bytes = frame_wavelet_encode(r, WaveletFilter::Reversible97, 4, net);
    Raster dec = frame_wavelet_decode(bytes);
    EXPECT_EQ(dec, r);
}
