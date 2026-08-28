#include <gtest/gtest.h>
#include "prism/codec/predict.h"
#include <random>
#include <vector>

using namespace prism;
using namespace prism::codec;

namespace {
BiasConfig off_cfg() { return BiasConfig{false, false}; }
BiasConfig add_cfg() { return BiasConfig{true, false}; }
BiasConfig gain_cfg() { return BiasConfig{true, true}; }

std::vector<uint16_t> random_plane(uint32_t w, uint32_t h, uint16_t maxv,
                                   uint64_t seed) {
    std::mt19937_64 rng(seed);
    std::vector<uint16_t> p((size_t)w * h);
    for (auto& v : p) v = (uint16_t)(rng() % ((uint64_t)maxv + 1));
    return p;
}

// Smooth base plus sparse deterministic spikes: after every spike MED
// over-predicts from the inflated neighbor, so a systematic per-cell bias
// exists for mechanism (a) to harvest.
std::vector<uint16_t> spiked_plane(uint32_t w, uint32_t h, uint16_t maxv) {
    std::vector<uint16_t> p((size_t)w * h);
    for (uint32_t y = 0; y < h; ++y)
        for (uint32_t x = 0; x < w; ++x) {
            uint32_t v = (x * 3 + y * 2) % maxv;
            if (x % 8 == 4 && y % 8 == 2) v = maxv;
            p[(size_t)y * w + x] = (uint16_t)v;
        }
    return p;
}
} // namespace

TEST(Bias, BucketMatchesPinnedThresholds) {
    // bucket(g) = count of thresholds {0,1,2,4,8,16,32} strictly below |g|,
    // capped at 7 (addendum 14.2).
    struct Case { int64_t g; int want; };
    for (Case c : {Case{-1, 1}, {0, 0}, {1, 1}, {2, 2}, {3, 3}, {4, 3},
                   {5, 4}, {33, 7}, {1000000, 7}}) {
        EXPECT_EQ(bias_bucket(c.g, 0), c.want) << "g=" << c.g;
    }
    // BD16 scaling: thresholds shift left by 8 -> {0,256,512,...}.
    EXPECT_EQ(bias_bucket(255, 8), 1);   // only threshold 0 is below 255
    EXPECT_EQ(bias_bucket(256, 8), 1);   // strict inequality at the boundary
    EXPECT_EQ(bias_bucket(257, 8), 2);
    EXPECT_EQ(bias_bucket(0, 8), 0);
}

TEST(Bias, OffConfigurationIsPlainMed) {
    // BIAS-anchor contract at library level: corrections disabled means no
    // correction AND no adaptation - byte-identical residuals to the shipped
    // MED walk on every plane shape and bit depth.
    for (uint32_t dim : {1u, 2u, 5u, 17u, 64u}) {
        auto plane = random_plane(dim, dim, 255, 700 + dim);
        EXPECT_EQ(compute_residuals_bias(plane, dim, dim, 8, off_cfg()),
                  compute_residuals(plane, dim, dim, PredId::MED))
            << "dim=" << dim;
    }
    std::vector<uint16_t> big(32 * 32, 65535), zero(32 * 32, 0);
    for (auto* p : {&big, &zero}) {
        EXPECT_EQ(compute_residuals_bias(*p, 32, 32, 16, off_cfg()),
                  compute_residuals(*p, 32, 32, PredId::MED));
    }
}

TEST(Bias, BijectionRandomBD8AllConfigs) {
    for (auto cfg : {add_cfg(), gain_cfg()}) {
        for (uint32_t dim : {1u, 2u, 3u, 7u, 16u, 33u}) {
            auto plane = random_plane(dim, dim, 255, 2000 + dim);
            auto res = compute_residuals_bias(plane, dim, dim, 8, cfg);
            auto back = reconstruct_plane_bias(res, dim, dim, 8, cfg, 255);
            ASSERT_EQ(back, plane) << "dim=" << dim;
        }
    }
}

TEST(Bias, BijectionBD16Extremes) {
    for (auto cfg : {add_cfg(), gain_cfg()}) {
        std::vector<uint16_t> flat_max(48 * 48, 65535),
            flat_min(48 * 48, 0), ramp(48 * 48);
        for (uint32_t i = 0; i < 48; ++i)
            for (uint32_t j = 0; j < 48; ++j)
                ramp[i * 48 + j] = (uint16_t)((i * 1024 + j * 7) & 0xFFFF);
        for (const auto* p : {&flat_max, &flat_min, &ramp}) {
            auto res = compute_residuals_bias(*p, 48, 48, 16, cfg);
            auto back = reconstruct_plane_bias(res, 48, 48, 16, cfg, 65535);
            ASSERT_EQ(back, *p);
        }
    }
}

TEST(Bias, DeterminismSameInputSameState) {
    auto plane = spiked_plane(40, 40, 200);
    for (auto cfg : {add_cfg(), gain_cfg()}) {
        auto r1 = compute_residuals_bias(plane, 40, 40, 8, cfg);
        auto r2 = compute_residuals_bias(plane, 40, 40, 8, cfg);
        EXPECT_EQ(r1, r2);
    }
}

TEST(Bias, ClampBoundsHoldUnderAdversarialStream) {
    // Alternating extreme spikes drive huge errors every sample; both tables
    // must stay inside their pinned clamp ranges forever.
    BiasModel m(8, gain_cfg());
    ASSERT_EQ(m.bias_at(0), 0);
    ASSERT_EQ(m.gain_at(0), 65536);
    std::mt19937_64 rng(99);
    for (int i = 0; i < 20000; ++i) {
        int32_t med = (int32_t)(rng() % 256);
        int32_t actual = (i % 2) ? 255 : 0;
        int ctx = (int)(rng() % 64);
        m.update(ctx, med, actual);
        EXPECT_GE(m.bias_at(ctx), -32);
        EXPECT_LE(m.bias_at(ctx), 32);
        EXPECT_GE(m.gain_at(ctx), 32768);
        EXPECT_LE(m.gain_at(ctx), 131072);
    }
}

TEST(Bias, BD16ClampBoundsScaleWithDepth) {
    BiasModel m(16, gain_cfg());
    // err = 2^15 with den small drives b toward its BD16 bound of 2^13.
    for (int i = 0; i < 5000; ++i) {
        m.update(0, 0, 32767);
        EXPECT_GE(m.bias_at(0), -8192);
        EXPECT_LE(m.bias_at(0), 8192);
        EXPECT_GE(m.gain_at(0), 32768);
        EXPECT_LE(m.gain_at(0), 131072);
    }
    EXPECT_EQ(m.bias_at(0), 8192);   // saturated exactly at the pinned bound
}

TEST(Bias, UpdateLawMatchesPinnedArithmetic) {
    // Additive law with its feedback loop: b steps by floor_div(err,64), and
    // err itself shrinks as b grows. From b=0 an offset of 64 yields exactly
    // one step (+1), then err = 63 stops the table: the pinned fixed point.
    BiasModel n(8, add_cfg());
    for (int i = 0; i < 100; ++i) n.update(5, 100, 164);
    EXPECT_EQ(n.bias_at(5), 1);
    EXPECT_EQ(n.predict(5, 100), 101);
    // Sub-64 steady error never moves the table.
    BiasModel t(8, add_cfg());
    for (int i = 0; i < 1000; ++i) t.update(5, 100, 150);
    EXPECT_EQ(t.bias_at(5), 0);
    // A steady error that STAYS above one quantum drives b to the BD8 clamp
    // Bmax = 32 (err = 96 - b >= 64 throughout).
    BiasModel m(8, add_cfg());
    for (int i = 0; i < 1000; ++i) m.update(5, 100, 196);
    EXPECT_EQ(m.bias_at(5), 32);
    EXPECT_EQ(m.predict(5, 100), 132);
    // Zero-mean alternation cancels into a bounded cycle around zero (the
    // floor semantics make the cycle sit one notch below the start).
    BiasModel z(8, add_cfg());
    for (int i = 0; i < 1000; ++i) {
        z.update(3, 100, 165);
        z.update(3, 100, 35);
    }
    EXPECT_GE(z.bias_at(3), -3);
    EXPECT_LE(z.bias_at(3), 1);
}

TEST(Bias, GainUpdateLawMatchesPinnedArithmetic) {
    // First gain step on med'=128, err=64: den = (128>>4)+1 = 9,
    // dG = floor_div(64 << 9, 9) = floor_div(32768, 9) = 3640 -> G = 69176.
    BiasModel m(8, gain_cfg());
    ASSERT_EQ(m.gain_at(0), 65536);
    m.update(0, 128, 128 + 64);
    EXPECT_EQ(m.gain_at(0), 65536 + 3640);
}

TEST(Bias, NoisePlaneStaysBijectionClean) {
    // On i.i.d. noise no systematic per-cell bias exists; the contract here
    // is structural (bijection + determinism), not performance.
    auto noise = random_plane(48, 48, 255, 4242);
    for (auto cfg : {add_cfg(), gain_cfg()}) {
        auto res = compute_residuals_bias(noise, 48, 48, 8, cfg);
        auto back = reconstruct_plane_bias(res, 48, 48, 8, cfg, 255);
        EXPECT_EQ(back, noise);
    }
}

TEST(Bias, ResetRestoresFreshState) {
    BiasModel m(8, add_cfg());
    m.update(7, 100, 255);
    ASSERT_NE(m.bias_at(7), 0);
    m.reset();
    EXPECT_EQ(m.bias_at(7), 0);
    EXPECT_EQ(m.gain_at(7), 65536);
}
