// Route 7 (issue #130) unit tests: in-subband value predictor (R7-A) + per-level
// adaptive filter (R7-B).
//
// Rails:
//   VB-R7-ROUNDTRIP - frame_wavelet_encode_r7 / decode is byte-exact (I29: zero
//                    full-model bytes; only the tiny per-subband mode / per-level
//                    filter header is sent).
//   VB-R7-SYMMETRY - the in-subband residual r = c - c_hat reconstucts the true
//                    coefficient set exactly under a raster post-pass (the JXL /
//                    LOCO-I predictor-transform contract).
//   VB-R7-FILTER   - per-level filter assignment in WaveletParams is exactly
//                    reversible for arbitrary filter vectors.

#include <gtest/gtest.h>
#include "prism/types.h"
#include "prism/codec/wavelet.h"
#include "prism/codec/bitplane.h"
#include "prism/codec/wavelet_container.h"
#include "prism/codec/r7_predictor.h"
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

// VB-R7-ROUNDTRIP: byte-exact frame round-trip across filters / depths / sizes,
// R7-A alone and R7-A + R7-B composed.
TEST(R7, FrameRoundtrip) {
    std::mt19937 rng(20260829);
    WaveletFilter filters[] = {WaveletFilter::Haar, WaveletFilter::LeGall53,
                               WaveletFilter::Reversible97};
    for (int fi = 0; fi < 3; ++fi) {
        for (int levels = 1; levels <= 5; ++levels) {
            for (bool r7b : {false, true}) {
                Raster r = make_raster(64, 48, 3, 8, rng);
                size_t net = 0;
                auto bytes = frame_wavelet_encode_r7(r, filters[fi], levels, net, r7b);
                Raster dec = frame_wavelet_decode(bytes);
                EXPECT_EQ(dec, r) << "filter " << fi << " levels " << levels
                                  << " r7b " << r7b;
            }
        }
    }
}

// VB-R7-ROUNDTRIP: 16-bit and odd sizes.
TEST(R7, FrameRoundtripVariants) {
    std::mt19937 rng(31415);
    Raster r16 = make_raster(48, 48, 3, 16, rng);
    size_t net16 = 0;
    auto bytes16 = frame_wavelet_encode_r7(r16, WaveletFilter::Reversible97, 4, net16, true);
    EXPECT_EQ(frame_wavelet_decode(bytes16), r16);
    WaveletFilter f = WaveletFilter::LeGall53;
    for (uint32_t w : {1u, 2u, 3u, 7u, 33u})
        for (uint32_t h : {1u, 5u, 9u, 48u}) {
            Raster r = make_raster(w, h, 1, 8, rng);
            size_t net = 0;
            auto bytes = frame_wavelet_encode_r7(r, f, 2, net, false);
            EXPECT_EQ(frame_wavelet_decode(bytes), r) << "w" << w << "h" << h;
        }
}

// VB-R7-SYMMETRY: the in-subband residual reconstructs the true coefficient set
// exactly under a raster post-pass, for both MED and GRADIENT modes. This is the
// JXL / LOCO-I predictor-transform contract the codec relies on.
TEST(R7, InSubbandResidualReconstructs) {
    std::mt19937 rng(98765);
    for (R7PredictorMode mode : {R7PredictorMode::MED, R7PredictorMode::GRADIENT}) {
        for (int w : {1, 4, 16, 33}) {
            for (int h : {1, 7, 24}) {
                std::vector<int32_t> c((size_t)w * h);
                for (auto& v : c) v = (int32_t)(rng() % 8191) - 4095;
                // r = c - c_hat (encode reads true c as recon).
                std::vector<int32_t> r((size_t)w * h);
                for (int y = 0; y < h; ++y)
                    for (int x = 0; x < w; ++x) {
                        int32_t cc = c[(size_t)y * w + x];
                        int32_t ch_ = InSubbandPredictor::predict(c, w, h, x, y, mode);
                        r[(size_t)y * w + x] = cc - ch_;
                    }
                // Decode post-pass: recon starts as r; rebuild c_hat + r in raster
                // order (same as the frame decoder).
                std::vector<int32_t> recon((size_t)w * h);
                for (int y = 0; y < h; ++y)
                    for (int x = 0; x < w; ++x) {
                        int32_t c_hat = InSubbandPredictor::predict(recon, w, h, x, y, mode);
                        recon[(size_t)y * w + x] = c_hat + r[(size_t)y * w + x];
                    }
                for (int i = 0; i < w * h; ++i)
                    EXPECT_EQ(recon[i], c[i]) << "mode " << (int)mode << " w" << w << "h" << h
                                             << " i" << i;
            }
        }
    }
}

// VB-R7-SYMMETRY: the per-subband residual round-trips through the bitplane coder
// exactly (independent of the wavelet lift), for both predictor modes.
TEST(R7, SubbandResidualRoundtrip) {
    std::mt19937 rng(271828);
    auto sbs = [&rng]() {
        std::vector<int32_t> plane(64 * 48);
        for (auto& v : plane) v = (int32_t)(rng() % 511) - 255;
        WaveletLift lift;
        WaveletParams p{WaveletFilter::LeGall53, 3};
        return lift.forward(plane, 64, 48, p);
    }();
    for (R7PredictorMode mode : {R7PredictorMode::MED, R7PredictorMode::GRADIENT}) {
        std::vector<Subband> R(sbs.size());
        for (size_t si = 0; si < sbs.size(); ++si) {
            R[si].orient = sbs[si].orient; R[si].level = sbs[si].level;
            R[si].w = sbs[si].w; R[si].h = sbs[si].h;
            R[si].coeffs.resize((size_t)sbs[si].w * sbs[si].h);
            const auto& c = sbs[si].coeffs;
            for (int y = 0; y < sbs[si].h; ++y)
                for (int x = 0; x < sbs[si].w; ++x) {
                    int32_t cc = c[(size_t)y * sbs[si].w + x];
                    int32_t ch_ = InSubbandPredictor::predict(c, sbs[si].w, sbs[si].h, x, y, mode);
                    R[si].coeffs[(size_t)y * sbs[si].w + x] = cc - ch_;
                }
        }
        BitplaneCoder coder;
        auto res = coder.encode(R);
        auto out = coder.decode(res.streams, R, res.sub_maxbits, res.total_symbols, nullptr);
        ASSERT_EQ(out.size(), sbs.size());
        for (size_t oi = 0; oi < sbs.size(); ++oi)
            for (size_t ci = 0; ci < sbs[oi].coeffs.size(); ++ci)
                EXPECT_EQ(out[oi].coeffs[ci], R[oi].coeffs[ci]) << "mode " << (int)mode;
    }
}

// VB-R7-FILTER: per-level filter assignment in WaveletParams is exactly reversible
// for arbitrary filter vectors (the R7-B lift change).
TEST(R7, PerLevelFilterReversible) {
    std::mt19937 rng(424242);
    std::vector<WaveletFilter> all{WaveletFilter::Haar, WaveletFilter::LeGall53,
                                    WaveletFilter::Reversible97};
    for (int trial = 0; trial < 20; ++trial) {
        int levels = 1 + (int)(rng() % 5);
        std::vector<WaveletFilter> plf(levels);
        for (int l = 0; l < levels; ++l) plf[l] = all[rng() % 3];
        WaveletParams p{WaveletFilter::LeGall53, levels, plf};
        WaveletLift lift;
        std::vector<int32_t> plane(64 * 48);
        for (auto& v : plane) v = (int32_t)(rng() % 2001) - 1000;
        auto subs = lift.forward(plane, 64, 48, p);
        auto rec = lift.inverse(subs, 64, 48, p);
        EXPECT_EQ(rec, plane) << "trial " << trial;
    }
}

// VB-R7-ROUNDTRIP: fuzz-style random planes (no crash, byte-exact) for R7-A alone.
TEST(R7, FuzzRoundtrip) {
    std::mt19937 rng(70707);
    for (int t = 0; t < 12; ++t) {
        uint32_t w = 32 + (uint32_t)(rng() % 96);
        uint32_t h = 32 + (uint32_t)(rng() % 96);
        Raster r = make_raster(w, h, 3, 8, rng);
        size_t net = 0;
        auto bytes = frame_wavelet_encode_r7(r, WaveletFilter::LeGall53, 4, net, false);
        EXPECT_EQ(frame_wavelet_decode(bytes), r);
    }
}
