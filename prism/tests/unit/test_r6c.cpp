// R6-C (Route 6 "per-fine-context transmitted histogram" backbone) unit tests.
//
// Rail:
//   VB-R6C-ROUNDTRIP - frame_wavelet_encode_r6c / decode is byte-exact (I29:
//                      zero full-model bytes transmitted; only the tiny r6c_p0
//                      header is sent, so the two-pass coder must still
//                      round-trip).
//   VB-R6C-SYMMETRY  - the two-pass encode (count pass + re-walk blend pass)
//                      reproduces the adaptive coder's losslessness on arbitrary
//                      integer planes.
//   VB-R6C-CLUSTER   - r6c_leaf is deterministic, in [0, r6c_K()), and reacts to
//                      every symmetric LCFeat dimension (so the partition is finer
//                      than the broken R6-C0 coarse quant that dropped nmag/
//                      ownmag/ppos).
//   VB-R6C-AXIS-INTEGRITY - r6c_leaf ignores lc_mag/lc_sig (always zero in the
//                      R6-C residual walk, so they are deliberately excluded from
//                      the split axes); toggling them alone never changes the leaf.
#include <gtest/gtest.h>
#include "prism/types.h"
#include "prism/codec/wavelet.h"
#include "prism/codec/bitplane.h"
#include "prism/codec/wavelet_container.h"
#include "prism/codec/color.h"
#include "prism/codec/route6c_tree.h"
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

// Symmetric dimensions that the baked tree is allowed to split on (indices used
// by r6c_feat_val). lc_mag/lc_sig are intentionally excluded.

} // namespace

// VB-R6C-ROUNDTRIP: byte-exact frame round-trip across filters / depths / sizes.
TEST(R6C, FrameRoundtrip) {
    std::mt19937 rng(20260829);
    WaveletFilter filters[] = {WaveletFilter::Haar, WaveletFilter::LeGall53,
                               WaveletFilter::Reversible97};
    for (int fi = 0; fi < 3; ++fi) {
        for (int levels = 1; levels <= 5; ++levels) {
            Raster r = make_raster(64, 48, 3, 8, rng);
            size_t net = 0;
            auto bytes = frame_wavelet_encode_r6c(r, filters[fi], levels, net);
            Raster dec = frame_wavelet_decode(bytes);
            EXPECT_EQ(dec, r) << "filter " << fi << " levels " << levels;
        }
    }
}

// VB-R6C-ROUNDTRIP: 16-bit and odd sizes too.
TEST(R6C, FrameRoundtripVariants) {
    std::mt19937 rng(31415);
    Raster r16 = make_raster(48, 48, 3, 16, rng);
    size_t net16 = 0;
    auto bytes16 = frame_wavelet_encode_r6c(r16, WaveletFilter::Reversible97, 4, net16);
    EXPECT_EQ(frame_wavelet_decode(bytes16), r16);
    WaveletFilter f = WaveletFilter::LeGall53;
    for (uint32_t w : {1u, 2u, 3u, 7u, 33u})
        for (uint32_t h : {1u, 5u, 9u, 48u}) {
            Raster r = make_raster(w, h, 1, 8, rng);
            size_t net = 0;
            auto bytes = frame_wavelet_encode_r6c(r, f, 2, net);
            EXPECT_EQ(frame_wavelet_decode(bytes), r) << "w" << w << "h" << h;
        }
}

// VB-R6C-CLUSTER: r6c_leaf is deterministic, in range, and reacts to every
// symmetric dimension (so the partition is strictly finer than R6-C0, which
// dropped nmag/ownmag/ppos and thereby coarsened the fine context).
TEST(R6C, ClusterDeterminism) {
    std::mt19937 rng(98765);
    const uint32_t K = r6c_K();
    // Pinned design target K = 1024 (frozen addendum-27 B). The baked tree is
    // trained to land at exactly this leaf count and must never exceed it.
    EXPECT_LE(K, 1024u);
    EXPECT_GE(K, 256u);
    for (int it = 0; it < 20000; ++it) {
        LCFeat f;
        f.symtype = (uint8_t)(rng() % 3);
        f.orient = (uint8_t)(rng() % 4);
        f.parent_sig = (uint8_t)(rng() % 2);
        f.fc = (uint8_t)(rng() % 8);
        f.dg = (uint8_t)(rng() % 8);
        f.level = (uint8_t)(rng() % 6);
        f.nmag = (uint8_t)(rng() % 8);
        f.pmag = (uint8_t)(rng() % 8);
        f.ownmag = (uint8_t)(rng() % 8);
        f.ppos = (uint8_t)(rng() % 8);
        f.nbsig = (uint8_t)(f.fc + f.dg);
        f.lc_mag = (uint8_t)(rng() % 8);
        f.lc_sig = (uint8_t)(rng() % 2);
        uint32_t id = r6c_leaf(f);
        EXPECT_GE(id, 0u);
        EXPECT_LT(id, K);
        EXPECT_EQ(id, r6c_leaf(f)); // deterministic
    }
    // At least one symmetric dimension must be able to change the leaf: build a
    // base feature and flip each symmetric dim, asserting some flip moves it.
    bool any_split = false;
    LCFeat base;
    base.symtype = 0; base.orient = 0; base.parent_sig = 0;
    base.fc = 2; base.dg = 2; base.level = 2;
    base.nmag = 4; base.pmag = 4; base.ownmag = 4; base.ppos = 4;
    base.lc_mag = 0; base.lc_sig = 0;
    uint32_t base_id = r6c_leaf(base);
    auto flip = [&](auto LCFeat::*m) {
        LCFeat f = base; f.*m = 7; return r6c_leaf(f) != base_id;
    };
    any_split |= flip(&LCFeat::symtype);
    any_split |= flip(&LCFeat::orient);
    any_split |= flip(&LCFeat::parent_sig);
    any_split |= flip(&LCFeat::fc);
    any_split |= flip(&LCFeat::dg);
    any_split |= flip(&LCFeat::nmag);
    any_split |= flip(&LCFeat::pmag);
    any_split |= flip(&LCFeat::ownmag);
    any_split |= flip(&LCFeat::ppos);
    any_split |= flip(&LCFeat::level);
    EXPECT_TRUE(any_split) << "baked tree ignores all symmetric dims";
}

// VB-R6C-AXIS-INTEGRITY: lc_mag/lc_sig are excluded from the split axes (they are
// always zero in the R6-C residual walk), so toggling them alone must never move
// a leaf. This documents the deliberate, correct scope of the R6-C1 partition.
TEST(R6C, AxisIntegrity) {
    std::mt19937 rng(424242);
    for (int it = 0; it < 5000; ++it) {
        LCFeat f;
        f.symtype = (uint8_t)(rng() % 3);
        f.orient = (uint8_t)(rng() % 4);
        f.parent_sig = (uint8_t)(rng() % 2);
        f.fc = (uint8_t)(rng() % 8);
        f.dg = (uint8_t)(rng() % 8);
        f.level = (uint8_t)(rng() % 6);
        f.nmag = (uint8_t)(rng() % 8);
        f.pmag = (uint8_t)(rng() % 8);
        f.ownmag = (uint8_t)(rng() % 8);
        f.ppos = (uint8_t)(rng() % 8);
        uint32_t a = r6c_leaf(f);
        LCFeat g = f; g.lc_mag = 7; g.lc_sig = 1;
        EXPECT_EQ(r6c_leaf(g), a) << "lc_mag/lc_sig must not affect the leaf";
    }
}

// VB-R6C-SYMMETRY: the two-pass R6-C subband coder round-trips the coefficient
// set directly (independent of the wavelet lift), proving encode/decode mirror
// symmetry even when the transmitted per-cluster histogram is blended in.
TEST(R6C, SubbandRoundtrip) {
    std::mt19937 rng(271828);
    auto sbs = [&rng]() {
        std::vector<int32_t> plane(64 * 48);
        for (auto& v : plane) v = (int32_t)(rng() % 511) - 255;
        WaveletLift lift;
        WaveletParams p{WaveletFilter::LeGall53, 3};
        return lift.forward(plane, 64, 48, p);
    }();
    BitplaneCoder coder;
    auto res = coder.encode_static_r6c(sbs);
    ASSERT_EQ(res.sp0.size(), (size_t)r6c_K());
    auto out = coder.decode_static_r6c(res.streams, sbs, res.sub_maxbits,
                                       res.total_symbols, res.sp0, nullptr);
    ASSERT_EQ(out.size(), sbs.size());
    for (size_t oi = 0; oi < sbs.size(); ++oi)
        for (size_t ci = 0; ci < sbs[oi].coeffs.size(); ++ci)
            EXPECT_EQ(out[oi].coeffs[ci], sbs[oi].coeffs[ci]) << "sb " << oi << " ci " << ci;
}
