// R7 (Route 7 "in-subband value prediction and adaptive transform") unit tests
// for Prism's true JXL-Modular multi-pass architecture.
//
// Rail:
//   VB-R7-SYMMETRY   - InSubbandPredictor::reversible_for_all_inputs holds for
//                      both MED and GRADIENT predictors on arbitrary integer data.
//   VB-R7-ROUNDTRIP  - frame_wavelet_encode_r7 / decode is byte-exact (I29: zero
//                      predictor state transmitted; the residual is rebuilt from
//                      reconstructed same-subband neighbours at both ends).
//   VB-R7-ADAPTIVE   - R7-B per-level adaptive filter selection round-trips and
//                      the transmitted sub_filter decodes to the chosen tags.
//   VB-R7-NOREGRESS   - on natural Kodak images R7-A is never a catastrophic
//                      regression vs the X6b baseline (frame_wavelet_encode); the
//                      precise gain is reported, not asserted (honest measurement).

#include <gtest/gtest.h>
#include "prism/types.h"
#include "prism/codec/wavelet.h"
#include "prism/codec/bitplane.h"
#include "prism/codec/wavelet_container.h"
#include "prism/codec/predictor.h"
#include "prism/codec/color.h"
#include <random>
#include <vector>
#include <fstream>
#include <string>
#include <algorithm>

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

// Minimal PPM (P6/P5) reader for the held-out Kodak measurement.
Raster load_ppm(const std::string& path) {
    std::ifstream f(path, std::ios::binary);
    std::string magic; f >> magic;
    uint32_t w = 0, h = 0, maxv = 0;
    f >> w >> h >> maxv;
    f.ignore(1);
    uint8_t bd = (maxv <= 255) ? 8 : 16;
    bool gray = (magic == "P5");
    uint8_t ch = gray ? 1 : 3;
    Raster r(w, h, (Channels)ch, bd == 8 ? BitDepth::BD8 : BitDepth::BD16);
    if (bd == 8) {
        for (uint32_t y = 0; y < h; ++y)
            for (uint32_t x = 0; x < w; ++x)
                for (uint8_t c = 0; c < ch; ++c) {
                    uint8_t v; f.read((char*)&v, 1);
                    r.planes[c][(size_t)y * w + x] = v;
                }
    } else {
        for (uint32_t y = 0; y < h; ++y)
            for (uint32_t x = 0; x < w; ++x)
                for (uint8_t c = 0; c < ch; ++c) {
                    uint8_t lo, hi; f.read((char*)&lo, 1); f.read((char*)&hi, 1);
                    r.planes[c][(size_t)y * w + x] = (uint16_t)((hi << 8) | lo);
                }
    }
    return r;
}

} // namespace

// VB-R7-SYMMETRY: predictor is reversible for all inputs (both kinds).
TEST(R7, PredictorReversible) {
    EXPECT_TRUE(InSubbandPredictor::reversible_for_all_inputs(InSubbandPredictor::Kind::MED));
    EXPECT_TRUE(InSubbandPredictor::reversible_for_all_inputs(InSubbandPredictor::Kind::GRADIENT));
}

// VB-R7-ROUNDTRIP: byte-exact frame round-trip, MED and GRADIENT, across filters/levels/depth.
TEST(R7, FrameRoundtrip) {
    std::mt19937 rng(20260829);
    WaveletFilter filters[] = {WaveletFilter::Haar, WaveletFilter::LeGall53,
                               WaveletFilter::Reversible97};
    bool grads[] = {false, true};
    for (int fi = 0; fi < 3; ++fi) {
        for (int levels = 1; levels <= 5; ++levels) {
            for (bool g : grads) {
                Raster r = make_raster(64, 48, 3, 8, rng);
                size_t net = 0;
                auto bytes = frame_wavelet_encode_r7(r, filters[fi], levels, net, g, false);
                Raster dec = frame_wavelet_decode(bytes);
                EXPECT_EQ(dec, r) << "filter " << fi << " levels " << levels << " grad " << g;
            }
        }
    }
}

// VB-R7-ROUNDTRIP: 16-bit and odd sizes too.
TEST(R7, FrameRoundtripVariants) {
    std::mt19937 rng(31415);
    Raster r16 = make_raster(48, 48, 3, 16, rng);
    size_t net16 = 0;
    auto bytes16 = frame_wavelet_encode_r7(r16, WaveletFilter::Reversible97, 4, net16, false, false);
    EXPECT_EQ(frame_wavelet_decode(bytes16), r16);
    for (uint32_t w : {1u, 2u, 3u, 7u, 33u})
        for (uint32_t h : {1u, 5u, 9u, 48u}) {
            Raster r = make_raster(w, h, 1, 8, rng);
            size_t net = 0;
            auto bytes = frame_wavelet_encode_r7(r, WaveletFilter::LeGall53, 2, net, false, false);
            EXPECT_EQ(frame_wavelet_decode(bytes), r) << "w" << w << "h" << h;
        }
}

// VB-R7-ADAPTIVE: R7-B per-level filter selection round-trips and the
// transmitted sub_filter decodes to the chosen tags.
TEST(R7, AdaptiveRoundtrip) {
    std::mt19937 rng(92653);
    Raster r = make_raster(80, 64, 3, 8, rng);
    size_t net = 0;
    auto bytes = frame_wavelet_encode_r7(r, WaveletFilter::LeGall53, 5, net, false, true);
    // Decode and confirm byte-exact recovery.
    Raster dec = frame_wavelet_decode(bytes);
    EXPECT_EQ(dec, r);
    // The adaptive frame must carry a sub_filter tag per subband.
    WaveletFrame fr = wavelet_container_decode(bytes);
    EXPECT_TRUE((fr.hdr.residual_mode & R7B_FLAG) != 0);
    EXPECT_EQ(fr.hdr.sub_filter.size(), fr.hdr.orient.size());
}

// VB-R7-NOREGRESS + honest measurement (T9, R7-1 held-out): on kodim02/07/17/21,
// report R7-A median NET vs the X6b baseline (frame_wavelet_encode). The precise
// delta is logged, not asserted; we only guard against a catastrophic regression.
TEST(R7, HeldOutVsBaseline) {
    const char* kodak_dir = "prism/benchmarks/data/kodak";
    std::vector<std::string> imgs = {"kodim02.ppm", "kodim07.ppm", "kodim17.ppm", "kodim21.ppm"};
    bool any = false;
    std::vector<double> deltas;
    for (auto& fn : imgs) {
        std::string path = std::string(kodak_dir) + "/" + fn;
        std::ifstream f(path);
        if (!f.good()) continue;
        Raster r = load_ppm(path);
        if (r.w == 0) continue;
        any = true;
        size_t net_r7 = 0, net_base = 0;
        auto b7 = frame_wavelet_encode_r7(r, WaveletFilter::LeGall53, X_DEFAULT_LEVELS, net_r7, false, false);
        auto bb = frame_wavelet_encode(r, WaveletFilter::LeGall53, X_DEFAULT_LEVELS, net_base);
        EXPECT_EQ(frame_wavelet_decode(b7), r) << fn;
        double net = (net_base > 0) ? 100.0 * ((double)net_r7 - (double)net_base) / (double)net_base : 0.0;
        deltas.push_back(net);
        std::cout << "[R7-1] " << fn << " r7=" << net_r7 << " base=" << net_base
                  << " NET=" << net << "% (vs X6b)\n";
    }
    if (any) {
        std::sort(deltas.begin(), deltas.end());
        double median = deltas[deltas.size() / 2];
        std::cout << "[R7-1] median NET vs X6b = " << median << "% (gate: <= -1.5% to proceed)\n";
        // PINNED REJECTION (2026-09-03, issue #130): R7-A measured +14.5% median
        // on this held-out set at Route 7 build time
        // (progress/130-prism-route7-transform-prediction.md, R7-1 FAIL), and
        // re-confirmed at +15.0% median on current main (blend default 0.0).
        // The promotion gate (median <= -1.5%) is closed; this pin asserts the
        // route STAYS rejected. It fails loudly if R7 behavior ever changes in
        // either direction - that is intentional: whoever reworks R7 must
        // update this pin AND the ledger together. Round-trip correctness above
        // must always hold regardless.
        EXPECT_GT(median, 5.0)
            << "R7 rejection pin broken: R7-A no longer regresses vs X6b. "
               "If R7 was reworked, update this pin and the #130 ledger together "
               "(progress/130-prism-route7-transform-prediction.md)";
    } else {
        std::cout << "[R7-1] kodak dir not present; skipping held-out measurement\n";
    }
}

// VB-R7-DETERMINISM: two encodes of the same raster are byte-identical.
TEST(R7, Determinism) {
    std::mt19937 rng(7);
    Raster r = make_raster(64, 64, 3, 8, rng);
    size_t n1 = 0, n2 = 0;
    auto a = frame_wavelet_encode_r7(r, WaveletFilter::LeGall53, 4, n1, false, false);
    auto b = frame_wavelet_encode_r7(r, WaveletFilter::LeGall53, 4, n2, false, false);
    EXPECT_EQ(a, b);
}
