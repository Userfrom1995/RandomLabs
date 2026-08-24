#include <gtest/gtest.h>
#include "prism/codec/predict.h"
#include <random>
#include <vector>

using namespace prism;
using namespace prism::codec;

namespace {
BlendConfig default_cfg() { return BlendConfig(); }

std::vector<uint16_t> random_plane(uint32_t w, uint32_t h, uint16_t maxv,
                                   uint64_t seed) {
    std::mt19937_64 rng(seed);
    std::vector<uint16_t> p((size_t)w * h);
    for (auto& v : p) v = (uint16_t)(rng() % ((uint64_t)maxv + 1));
    return p;
}

// Smooth 2D linear ramp: adaptive blending should track it far better than a
// fixed median of neighbors once weights converge (and never worse by much).
std::vector<uint16_t> ramp_plane(uint32_t w, uint32_t h, int step_x, int step_y,
                                 uint16_t maxv) {
    std::vector<uint16_t> p((size_t)w * h);
    for (uint32_t y = 0; y < h; ++y)
        for (uint32_t x = 0; x < w; ++x) {
            int64_t v = (int64_t)x * step_x + (int64_t)y * step_y;
            if (v < 0) v = 0;
            if (v > maxv) v = maxv;
            p[(size_t)y * w + x] = (uint16_t)v;
        }
    return p;
}

int64_t abs_sum(const std::vector<int32_t>& r) {
    int64_t s = 0;
    for (int32_t v : r) s += v < 0 ? -(int64_t)v : (int64_t)v;
    return s;
}
} // namespace

TEST(Blend, BijectionRandomBD8) {
    auto cfg = default_cfg();
    for (uint32_t dim : {1u, 2u, 3u, 7u, 16u, 33u}) {
        auto plane = random_plane(dim, dim == 1 ? 1 : dim, 255, 1000 + dim);
        auto res = compute_residuals_blend(plane, dim, dim == 1 ? 1 : dim, cfg);
        auto back = reconstruct_plane_blend(res, dim, dim == 1 ? 1 : dim, cfg, 255);
        EXPECT_EQ(back, plane) << "dim=" << dim;
    }
}

TEST(Blend, BijectionRandomBD16Extremes) {
    auto cfg = default_cfg();
    // All-min, all-max and full-range noise must survive exactly (overflow pins).
    std::vector<uint16_t> flat65535(64 * 64, 65535), flat0(64 * 64, 0);
    for (auto* p : {&flat65535, &flat0}) {
        auto res = compute_residuals_blend(*p, 64, 64, cfg);
        auto back = reconstruct_plane_blend(res, 64, 64, cfg, 65535);
        EXPECT_EQ(back, *p);
    }
    auto noise = random_plane(37, 23, 65535, 42);
    auto res = compute_residuals_blend(noise, 37, 23, cfg);
    auto back = reconstruct_plane_blend(res, 37, 23, cfg, 65535);
    EXPECT_EQ(back, noise);
}

TEST(Blend, BijectionBorderShapes) {
    auto cfg = default_cfg();
    struct Shape { uint32_t w, h; };
    for (auto s : {Shape{1u, 1u}, Shape{1u, 17u}, Shape{17u, 1u}, Shape{2u, 65u}}) {
        auto plane = random_plane(s.w, s.h, 255, (uint64_t)s.w * 131 + s.h);
        auto res = compute_residuals_blend(plane, s.w, s.h, cfg);
        auto back = reconstruct_plane_blend(res, s.w, s.h, cfg, 255);
        EXPECT_EQ(back, plane) << s.w << "x" << s.h;
    }
}

TEST(Blend, AnchoredBijectionAndBorders) {
    BlendConfig cfg;
    cfg.med_anchor = true;
    cfg.init_w = 0;
    cfg.w_min = -65536;
    cfg.w_max = 196608;
    struct Shape { uint32_t w, h; };
    for (auto s : {Shape{1u, 1u}, Shape{1u, 9u}, Shape{9u, 1u}, Shape{13u, 13u}}) {
        auto plane = random_plane(s.w, s.h, 65535, (uint64_t)s.w * 17 + s.h);
        auto res = compute_residuals_blend(plane, s.w, s.h, cfg);
        auto back = reconstruct_plane_blend(res, s.w, s.h, cfg, 65535);
        EXPECT_EQ(back, plane) << s.w << "x" << s.h;
    }
}

TEST(Blend, AnchoredStartsAtMEDScaleOnNoise) {
    // Identity at init plus bounded corrections: on random noise the anchored
    // blend must stay in MED's cost neighborhood instead of diverging.
    BlendConfig cfg;
    cfg.med_anchor = true;
    cfg.init_w = 0; cfg.w_min = -65536; cfg.w_max = 196608;
    auto plane = random_plane(32, 32, 255, 99);
    auto blend = compute_residuals_blend(plane, 32, 32, cfg);
    auto med = compute_residuals(plane, 32, 32, PredId::MED);
    EXPECT_LT(abs_sum(blend), 2 * abs_sum(med));
}

TEST(Blend, Determinism) {
    auto cfg = default_cfg();
    auto plane = random_plane(24, 24, 255, 7);
    auto r1 = compute_residuals_blend(plane, 24, 24, cfg);
    auto r2 = compute_residuals_blend(plane, 24, 24, cfg);
    EXPECT_EQ(r1, r2);
}

TEST(Blend, TracksSmoothRampBetterThanMED) {
    auto cfg = default_cfg();
    auto plane = ramp_plane(48, 48, 3, 2, 255);
    auto blend = compute_residuals_blend(plane, 48, 48, cfg);
    auto med = compute_residuals(plane, 48, 48, PredId::MED);
    EXPECT_LT(abs_sum(blend), abs_sum(med));
}

TEST(Blend, DiagonalPlaneBeatsMED) {
    auto cfg = default_cfg();
    // sample(x,y) = (x+y) clamped: b3 = L+T-TL is exact away from borders, so
    // the adaptive blend must converge onto it while MED keeps mispredicting
    // along the anti-diagonal.
    uint32_t w = 40, h = 40;
    std::vector<uint16_t> plane((size_t)w * h);
    for (uint32_t y = 0; y < h; ++y)
        for (uint32_t x = 0; x < w; ++x)
            plane[(size_t)y * w + x] = (uint16_t)std::min<int>(255, (int)(x + y));
    auto blend = compute_residuals_blend(plane, w, h, cfg);
    auto med = compute_residuals(plane, w, h, PredId::MED);
    EXPECT_LT(abs_sum(blend), abs_sum(med));
}
