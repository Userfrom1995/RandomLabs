// R6-C (Route 6 "per-fine-context CLUSTER transmitted histogram" backbone) unit
// tests for Prism's true JXL-Modular multi-pass architecture.
//
// Rail:
//   VB-R6C-ROUNDTRIP - frame_wavelet_encode_r6c / decode is byte-exact (I29:
//                      zero full-model bytes transmitted; only the tiny cluster
//                      histogram header is sent, so the two-pass coder must
//                      still round-trip).
//   VB-R6C-SYMMETRY - the two-pass encode (cluster histogram pass + re-walk
//                      blend pass) reproduces the adaptive coder's losslessness
//                      on arbitrary integer coefficient planes.

#include <gtest/gtest.h>
#include "prism/types.h"
#include "prism/codec/wavelet.h"
#include "prism/codec/bitplane.h"
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

// VB-R6C-ROUNDTRIP: byte-exact frame round-trip across filters / depths / sizes.
TEST(R6C, FrameRoundtrip) {
    std::mt19937 rng(20260829);
    WaveletFilter filters[] = {WaveletFilter::Haar, WaveletFilter::LeGall53,
                               WaveletFilter::Reversible97};
    int kbs[] = {128, 256, 1024};
    for (int fi = 0; fi < 3; ++fi) {
        for (int levels = 1; levels <= 5; ++levels) {
            for (int ki = 0; ki < 3; ++ki) {
                Raster r = make_raster(64, 48, 3, 8, rng);
                size_t net = 0;
                auto bytes = frame_wavelet_encode_r6c(r, filters[fi], levels, kbs[ki], net);
                Raster dec = frame_wavelet_decode(bytes);
                EXPECT_EQ(dec, r) << "filter " << fi << " levels " << levels << " kb " << kbs[ki];
            }
        }
    }
}

// VB-R6C-ROUNDTRIP: 16-bit and odd sizes too.
TEST(R6C, FrameRoundtripVariants) {
    std::mt19937 rng(31415);
    Raster r16 = make_raster(48, 48, 3, 16, rng);
    size_t net16 = 0;
    auto bytes16 = frame_wavelet_encode_r6c(r16, WaveletFilter::Reversible97, 4, 256, net16);
    EXPECT_EQ(frame_wavelet_decode(bytes16), r16);
    WaveletFilter f = WaveletFilter::LeGall53;
    for (uint32_t w : {1u, 2u, 3u, 7u, 33u})
        for (uint32_t h : {1u, 5u, 9u, 48u}) {
            Raster r = make_raster(w, h, 1, 8, rng);
            size_t net = 0;
            auto bytes = frame_wavelet_encode_r6c(r, f, 2, 256, net);
            EXPECT_EQ(frame_wavelet_decode(bytes), r) << "w" << w << "h" << h;
        }
}

// VB-R6C-SYMMETRY: the two-pass R6-C subband coder round-trips the coefficient
// set directly (independent of the wavelet lift), proving encode/decode mirror
// symmetry even when the transmitted per-cluster static histogram is blended in.
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
    for (int kb : {128, 256, 1024}) {
        auto res = coder.encode_static_cluster(sbs, kb);
        auto out = coder.decode_static_cluster(res.streams, sbs, res.sub_maxbits,
                                               res.total_symbols, res.hist, nullptr);
        ASSERT_EQ(out.size(), sbs.size());
        for (size_t oi = 0; oi < sbs.size(); ++oi)
            for (size_t ci = 0; ci < sbs[oi].coeffs.size(); ++ci)
                EXPECT_EQ(out[oi].coeffs[ci], sbs[oi].coeffs[ci])
                    << "kb " << kb << " sb " << oi << " ci " << ci;
    }
}
