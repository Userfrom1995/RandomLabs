#include <gtest/gtest.h>
#include "prism/codec/analyze.h"
#include "prism/codec/predict.h"
#include "prism/codec/acoder.h"
#include "prism/codec/color.h"
#include <random>

namespace prism::codec {
namespace {

Raster make_raster(uint32_t w, uint32_t h, Channels ch, uint32_t seed, bool correlated) {
    Raster r(w, h, ch, BitDepth::BD8);
    std::mt19937 rng(seed);
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            // Correlated mode uses spatially RANDOM luma with chroma slaved
            // to it: chroma is unpredictable from its own causal neighbors
            // but fully explained by luma, so a color transform must win.
            int base = correlated ? (int)(rng() % 256) : (int)(rng() % 256);
            r.at(0, x, y) = (uint16_t)base;
            if (r.num_channels() >= 3) {
                r.at(1, x, y) = correlated
                    ? (uint16_t)std::max(0, std::min(255, base / 2 + (int)(rng() % 5) - 2))
                    : (uint16_t)(rng() % 256);
                r.at(2, x, y) = correlated
                    ? (uint16_t)std::max(0, std::min(255, 255 - base / 2 + (int)(rng() % 5) - 2))
                    : (uint16_t)(rng() % 256);
            }
        }
    }
    return r;
}

TEST(AnalyzeTrial, FinalistsAlwaysContainIdentity) {
    std::mt19937 rng(7);
    for (int iter = 0; iter < 50; ++iter) {
        size_t n = 1 + rng() % 12;
        size_t identity = rng() % n;
        size_t k = 1 + rng() % (n + 1);
        std::vector<double> costs(n);
        for (auto& c : costs) c = (double)(rng() % 1000);
        auto finals = trial_finalists(costs, k, identity);
        ASSERT_EQ(finals.size(), std::min(k, n));
        EXPECT_TRUE(std::find(finals.begin(), finals.end(), identity) != finals.end())
            << "identity " << identity << " dropped from finalists (k=" << k << ", n=" << n << ")";
    }
}

TEST(AnalyzeTrial, FinalistsDeterministicTieBreakLowerIndex) {
    std::vector<double> costs{5.0, 5.0, 5.0, 5.0};
    auto a = trial_finalists(costs, 2, 3);
    auto b = trial_finalists(costs, 2, 3);
    EXPECT_EQ(a, b);
    // All tied: the k lowest indices win, identity (3) forced in.
    EXPECT_EQ(a, (std::vector<size_t>{0, 3}));
}

TEST(AnalyzeTrial, FinalistsIdentityDisplacesWorstWhenBudgetFull) {
    // Identity is the most expensive but must still be fully evaluated.
    std::vector<double> costs{10.0, 20.0, 30.0, 40.0}; // identity index 3 is worst
    auto finals = trial_finalists(costs, 2, 3);
    EXPECT_EQ(finals.size(), 2u);
    EXPECT_TRUE(std::find(finals.begin(), finals.end(), 3) != finals.end());
    // The best pruning survivor keeps its seat, the runner-up yields.
    EXPECT_NE(std::find(finals.begin(), finals.end(), 0), finals.end());
}

TEST(AnalyzeTrial, FinalistsEmptyAndSingleCases) {
    EXPECT_TRUE(trial_finalists({}, 3, 0).empty());
    auto one = trial_finalists({42.0}, 3, 0);
    EXPECT_EQ(one, (std::vector<size_t>{0}));
}

TEST(AnalyzeTrial, DecimateSamplesExactValues) {
    Raster r(8, 6, Channels::RGB, BitDepth::BD8);
    for (uint32_t y = 0; y < 6; ++y)
        for (uint32_t x = 0; x < 8; ++x)
            r.at(0, x, y) = (uint16_t)(y * 8 + x);
    Raster d = decimate_raster(r, 4); // ceil(8/4)=2 cols, ceil(6/4)=2 rows
    EXPECT_EQ(d.w, 2u);
    EXPECT_EQ(d.h, 2u);
    EXPECT_EQ(d.num_channels(), r.num_channels());
    // Samples are the exact source pixels at strided positions.
    EXPECT_EQ(d.planes[0][0], r.at(0, 0, 0));
    EXPECT_EQ(d.planes[0][1], r.at(0, 4, 0));
    EXPECT_EQ(d.planes[0][2], r.at(0, 0, 4));
    EXPECT_EQ(d.planes[0][3], r.at(0, 4, 4));
    // Odd tail: width 9 step 4 keeps columns 0,4,8 (ceil).
    Raster r9(9, 1, Channels::GRAY, BitDepth::BD8);
    for (uint32_t x = 0; x < 9; ++x) r9.at(0, x, 0) = (uint16_t)(x * 10);
    Raster d9 = decimate_raster(r9, 4);
    EXPECT_EQ(d9.w, 3u);
    EXPECT_EQ(d9.planes[0][2], 80u);
    // Passthrough below step 2.
    EXPECT_TRUE(decimate_raster(r, 1) == r);
    EXPECT_TRUE(decimate_raster(r, 0) == r);
}

TEST(AnalyzeTrial, TrialFlatBitsMatchesEmissionPath) {
    Raster r = make_raster(40, 30, Channels::RGB, 11, false);
    const size_t direct = trial_flat_bits(r, PredId::GAP);
    size_t manual = 0;
    for (const auto& pl : r.planes) {
        auto res = compute_residuals(pl, r.w, r.h, PredId::GAP);
        manual += acoder_encode_plane_v2(res, r.w, r.h, AC_V2_RESDIFF_CONTEXTS).size();
    }
    EXPECT_EQ(direct, manual);
    EXPECT_GT(direct, 0u);
    // Deterministic across calls.
    EXPECT_EQ(trial_flat_bits(r, PredId::GAP), direct);
}

// I4 at decision level: whatever the chooser picks, its fully-encoded cost
// under the decision's own reference predictor never loses to the identity
// plan's cost, because the identity always reaches the final round and only
// strict improvement displaces it.
TEST(AnalyzeTrial, ColorChoiceNeverLosesToIdentity) {
    for (uint32_t seed = 0; seed < 6; ++seed) {
        for (bool correlated : {false, true}) {
            Raster r = make_raster(48, 40, Channels::RGB, seed * 31 + (correlated ? 5 : 0), correlated);
            ColorTrialResult chosen = choose_color_transform_trial(r, 2);
            Raster identity = apply_color(r, ColorTransform::None, {});
            const double chosen_bits = (double)trial_flat_bits(chosen.raster, PredId::MED);
            const double identity_bits = (double)trial_flat_bits(identity, PredId::MED);
            EXPECT_LE(chosen_bits, identity_bits)
                << "seed=" << seed << " correlated=" << correlated
                << " ct=" << (int)chosen.ct << " chose more bits than None";
        }
    }
}

TEST(AnalyzeTrial, ColorChoiceCorrelatedFindsStructure) {
    // Strong luma-chroma correlation: a decorrelating transform should beat
    // None by a clear margin (not required by I4, expected by design).
    Raster r = make_raster(96, 64, Channels::RGB, 99, true);
    ColorTrialResult chosen = choose_color_transform_trial(r, 1);
    Raster identity = apply_color(r, ColorTransform::None, {});
    EXPECT_LT(trial_flat_bits(chosen.raster, PredId::MED),
              trial_flat_bits(identity, PredId::MED));
    EXPECT_NE(chosen.ct, ColorTransform::None);
}

TEST(AnalyzeTrial, AnalyzerFieldsValidAndRoundTripHolds) {
    Raster r = make_raster(70, 66, Channels::RGB, 123, true);
    AnalyzeResult res = analyze(r, 2);
    EXPECT_LE((int)res.color_transform_id, 6);
    ASSERT_EQ(res.cfl_scales.size(), 2u);
    for (uint8_t s : res.cfl_scales) EXPECT_LE(s, 7);
    EXPECT_LE((int)res.global_pred_id, 8);
    // Deterministic: same input, same plan.
    AnalyzeResult again = analyze(r, 2);
    EXPECT_EQ(res.color_transform_id, again.color_transform_id);
    EXPECT_EQ(res.cfl_scales, again.cfl_scales);
    EXPECT_EQ(res.global_pred_id, again.global_pred_id);
}

} // namespace
} // namespace prism::codec
