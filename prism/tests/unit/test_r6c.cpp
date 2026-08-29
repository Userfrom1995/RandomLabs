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
//   VB-R6C-CLUSTER   - r6c_cluster_id is deterministic, in [0, r6c_K()), and
//                      matches an independent reference recomputation across a
//                      sweep of synthetic LCFeat vectors.
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

// Reference reimplementation of the R6-C0 fixed coarse quantization, used to
// confirm the production r6c_cluster_id is deterministic and self-consistent.
uint32_t ref_cluster_id(const LCFeat& f) {
    uint32_t t = (uint32_t)(f.symtype % 3);
    uint32_t o = (uint32_t)(f.orient % 4);
    uint32_t ps = f.parent_sig ? 1u : 0u;
    uint32_t fc = (uint32_t)std::min<int>(f.fc, 2);
    uint32_t dg = (uint32_t)std::min<int>(f.dg, 2);
    uint32_t lv = (uint32_t)std::min<int>(f.level, 2);
    return (((((t * 4u + o) * 2u + ps) * 3u + fc) * 3u + dg) * 3u + lv);
}

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

// VB-R6C-CLUSTER: the cluster partition is deterministic, in range, and matches
// an independent reference recomputation across a sweep of synthetic features.
TEST(R6C, ClusterDeterminism) {
    std::mt19937 rng(98765);
    const uint32_t K = r6c_K();
    EXPECT_EQ(K, 648u);
    std::uniform_int_distribution<int> u8(0, 255);
    for (int it = 0; it < 20000; ++it) {
        LCFeat f;
        f.symtype = (uint8_t)(rng() % 3);
        f.orient = (uint8_t)(rng() % 4);
        f.parent_sig = (uint8_t)(rng() % 2);
        f.fc = (uint8_t)(rng() % 8);
        f.dg = (uint8_t)(rng() % 8);
        f.level = (uint8_t)(rng() % 6);
        // Fields not used by the cluster id; still must not perturb the result.
        f.nmag = (uint8_t)(rng() % 8);
        f.pmag = (uint8_t)(rng() % 8);
        f.ownmag = (uint8_t)(rng() % 8);
        f.ppos = (uint8_t)(rng() % 8);
        f.nbsig = (uint8_t)(rng() % 9);
        f.lc_mag = (uint8_t)(rng() % 8);
        f.lc_sig = (uint8_t)(rng() % 2);
        uint32_t id = r6c_cluster_id(f);
        EXPECT_GE(id, 0u);
        EXPECT_LT(id, K);
        EXPECT_EQ(id, ref_cluster_id(f));
        // Deterministic: same input, same output.
        EXPECT_EQ(id, r6c_cluster_id(f));
        (void)u8;
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
