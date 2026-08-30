// R8 (Route 8 "learned parametric reversible lifting") unit tests for Prism's
// true JXL-Modular multi-pass architecture.
//
// Rail:
//   VB-R8-SYMMETRY   - WaveletLift with WaveletFilter::Learned is exactly
//                      reversible (invariant I26) for arbitrary integer data and
//                      for several learned coefficient sets.
//   VB-R8-ROUNDTRIP  - frame_wavelet_encode(_residual) with Learned filter is
//                      byte-exact (I29: zero lift state transmitted; the decoder
//                      reconstructs from the same baked coefficients).
//   VB-R8-NOREGRESS   - honest held-out measurement vs the X6b baseline; the
//                      precise delta is logged, not asserted.
//   VB-R8-DETERMINISM - two encodes of the same raster are byte-identical.

#include <gtest/gtest.h>
#include "prism/types.h"
#include "prism/codec/wavelet.h"
#include "prism/codec/bitplane.h"
#include "prism/codec/wavelet_container.h"
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

// VB-R8-SYMMETRY: the learned lift is exactly reversible for all inputs, for
// the default CDF 9/7 coefficients and a few perturbed sets (incl. learned ones).
TEST(R8, LiftReversibleAllInputs) {
    WaveletLift lift;
    std::vector<std::array<float,4>> sets = {
        {-1.586134342f, -0.052980118f, 0.882911076f, 0.443506852f},
        {-1.5f, -0.125f, 0.75f, 0.375f},
        {-1.25f, 0.0f, 1.0f, 0.5f},
        {-1.75f, 0.125f, 0.5f, 0.25f},
    };
    for (auto& s : sets) {
        set_learned_lift(s[0], s[1], s[2], s[3]);
        EXPECT_TRUE(lift.reversible_for_all_inputs(WaveletParams{WaveletFilter::Learned, 5}))
            << "learned lift not reversible for coeffs " << s[0] << "," << s[1]
            << "," << s[2] << "," << s[3];
    }
    set_learned_lift(-1.586134342f, -0.052980118f, 0.882911076f, 0.443506852f);
}

// VB-R8-ROUNDTRIP: byte-exact frame round-trip (residual path) across filters/levels.
TEST(R8, FrameRoundtrip) {
    std::mt19937 rng(20260829);
    for (int levels = 1; levels <= 5; ++levels) {
        Raster r = make_raster(64, 48, 3, 8, rng);
        size_t net = 0;
        auto bytes = frame_wavelet_encode_residual(r, WaveletFilter::Learned, levels, net);
        Raster dec = frame_wavelet_decode(bytes);
        EXPECT_EQ(dec, r) << "levels " << levels;
    }
}

// VB-R8-ROUNDTRIP: 16-bit, odd sizes, and the plain (non-residual) path.
TEST(R8, FrameRoundtripVariants) {
    std::mt19937 rng(31415);
    Raster r16 = make_raster(48, 48, 3, 16, rng);
    size_t net16 = 0;
    auto bytes16 = frame_wavelet_encode_residual(r16, WaveletFilter::Learned, 4, net16);
    EXPECT_EQ(frame_wavelet_decode(bytes16), r16);
    for (uint32_t w : {1u, 2u, 3u, 7u, 33u})
        for (uint32_t h : {1u, 5u, 9u, 48u}) {
            Raster r = make_raster(w, h, 1, 8, rng);
            size_t net = 0;
            auto bytes = frame_wavelet_encode_residual(r, WaveletFilter::Learned, 2, net);
            EXPECT_EQ(frame_wavelet_decode(bytes), r) << "w" << w << "h" << h;
        }
    Raster r = make_raster(64, 64, 3, 8, rng);
    size_t net = 0;
    auto bp = frame_wavelet_encode(r, WaveletFilter::Learned, 4, net);
    EXPECT_EQ(frame_wavelet_decode(bp), r);
}

// VB-R8-NOREGRESS + honest measurement (held-out): on kodim02/07/17/21, report
// R8 (learned lift, residual path) median NET vs the X6b baseline. Not asserted.
TEST(R8, HeldOutVsBaseline) {
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
        size_t net_r8 = 0, net_base = 0;
        auto b8 = frame_wavelet_encode_residual(r, WaveletFilter::Learned, X_DEFAULT_LEVELS, net_r8);
        auto bb = frame_wavelet_encode_residual(r, WaveletFilter::LeGall53, X_DEFAULT_LEVELS, net_base);
        EXPECT_EQ(frame_wavelet_decode(b8), r) << fn;
        double net = (net_base > 0) ? 100.0 * ((double)net_r8 - (double)net_base) / (double)net_base : 0.0;
        deltas.push_back(net);
        std::cout << "[R8] " << fn << " r8=" << net_r8 << " base=" << net_base
                  << " NET=" << net << "% (vs X6b)\n";
    }
    if (any) {
        std::sort(deltas.begin(), deltas.end());
        double median = deltas[deltas.size() / 2];
        std::cout << "[R8] median NET vs X6b = " << median
                  << "% (gate: <= -1.5% to be a real win)\n";
        EXPECT_LE(*std::max_element(deltas.begin(), deltas.end()), 5.0)
            << "R8 learned lift regressed catastrophically vs X6b on held-out set";
    } else {
        std::cout << "[R8] kodak dir not present; skipping held-out measurement\n";
    }
}

// VB-R8-DETERMINISM: two encodes of the same raster are byte-identical.
TEST(R8, Determinism) {
    std::mt19937 rng(7);
    Raster r = make_raster(64, 64, 3, 8, rng);
    size_t n1 = 0, n2 = 0;
    auto a = frame_wavelet_encode_residual(r, WaveletFilter::Learned, 4, n1);
    auto b = frame_wavelet_encode_residual(r, WaveletFilter::Learned, 4, n2);
    EXPECT_EQ(a, b);
}
