#include "prism/codec/acoder.h"
#include <gtest/gtest.h>
#include <random>
#include <numeric>

using namespace prism::codec;

namespace {
// Round-trip a residual sequence through the v2 plane coder and require an
// exact bijection (invariant I1).
void roundtrip_v2(const std::vector<int32_t>& residuals, uint32_t w,
                  int num_contexts) {
    auto bytes = acoder_encode_plane_v2(residuals, w, (uint32_t)(residuals.size() / (w ? w : 1)), num_contexts);
    auto out = acoder_decode_plane_v2(bytes, residuals.size(), w,
                                      (uint32_t)(residuals.size() / (w ? w : 1)), num_contexts);
    ASSERT_EQ(out.size(), residuals.size());
    for (size_t i = 0; i < residuals.size(); ++i) {
        ASSERT_EQ(out[i], residuals[i]) << "sample " << i;
    }
}

std::vector<int32_t> random_residuals(size_t n, uint32_t seed, int max_mag) {
    std::mt19937 rng(seed);
    std::vector<int32_t> v(n);
    for (auto& x : v) {
        int mag = (int)(rng() % (uint32_t)(max_mag + 1));
        x = (rng() % 2) ? mag : -mag;
    }
    return v;
}
} // namespace

TEST(AcoderV2, PriorClassCoversAllContextsMonotonically) {
    for (int cx = 0; cx <= 342; ++cx) {
        uint8_t cls = ac_v2_prior_class(cx);
        ASSERT_LE(cls, 15);
        ASSERT_GE(cls, 0);
        // directional key: class = 3*min(max(qL,qU,qUL),4) + orientation;
        // recover the quantizers from the context id
        int qUL = cx % 7, t = cx / 7, qU = t % 7, qL = t / 7;
        int e = std::max({qL, qU, qUL});
        if (e > 4) e = 4;
        int d = (qL >= qU + 2) ? 0 : ((qU >= qL + 2) ? 1 : 2);
        EXPECT_EQ(cls, (uint8_t)(e * 3 + d)) << "cx " << cx;
    }
}

TEST(AcoderV2, PriorClassRespectsEnergyMonotonicity) {
    // Raising all three neighbor quantizers together must never lower the
    // class (busier contexts map to busier priors). Single-neighbor raises MAY
    // drop the class by one orientation step on purpose (the directional key
    // trades strict energy order for h/v edge separation).
    for (int qL = 0; qL < 6; ++qL)
        for (int qU = 0; qU < 6; ++qU)
            for (int qUL = 0; qUL < 6; ++qUL) {
                int base = ac_v2_prior_class((qL * 7 + qU) * 7 + qUL);
                int up = ac_v2_prior_class(((qL + 1) * 7 + qU + 1) * 7 + qUL + 1);
                EXPECT_GE(up, base) << "qL " << qL << " qU " << qU << " qUL " << qUL;
            }
}

TEST(AcoderV2, PriorClassHorizontalVerticalSymmetry) {
    // Swapping qL and qU must swap the horizontal/vertical orientation buckets
    // while keeping the energy bucket, i.e. mirror contexts share energy.
    for (int qL = 0; qL < 7; ++qL)
        for (int qU = 0; qU < 7; ++qU)
            for (int qUL = 0; qUL < 7; ++qUL) {
                int a = ac_v2_prior_class((qL * 7 + qU) * 7 + qUL);
                int b = ac_v2_prior_class((qU * 7 + qL) * 7 + qUL);
                EXPECT_EQ(a / 3, b / 3) << "qL " << qL << " qU " << qU;
            }
}

TEST(AcoderV2, MixStaysInRangeForExtremeStates) {
    const uint16_t extremes[] = {1, 2, 32767, 32768, 65533, 65534, 65535};
    for (uint16_t pf : extremes) {
        for (uint16_t ps : extremes) {
            uint16_t m = ac_v2_mix(pf, ps);
            EXPECT_GE(m, 1);
            EXPECT_LE(m, 65534);
            // weighted mean between the two states, except the deliberate
            // top-end clamp (both 65535 -> 65534) that keeps the range-coder
            // split strictly inside the interval
            EXPECT_TRUE(m >= std::min(pf, ps) || m == 65534);
        }
    }
}

TEST(AcoderV2, AdaptClampsToOpenInterval) {
    uint16_t pf = 1, ps = 65534;
    for (int i = 0; i < 1000; ++i) {
        ac_v2_adapt(pf, ps, false);
        ac_v2_adapt(pf, ps, true);
        EXPECT_GE(pf, 1);
        EXPECT_LE(pf, 65534);
        EXPECT_GE(ps, 1);
        EXPECT_LE(ps, 65534);
    }
}

TEST(AcoderV2, BijectionAdversarialAlphabets) {
    // all-zero plane
    std::vector<int32_t> zeros(4096, 0);
    EXPECT_NO_THROW(roundtrip_v2(zeros, 64, 343));
    // max magnitude
    std::vector<int32_t> big(2048);
    for (size_t i = 0; i < big.size(); ++i) big[i] = (i % 2) ? -2147483647LL : 2147483647LL;
    EXPECT_NO_THROW(roundtrip_v2(big, 32, 343));
    // alternating signs around small magnitudes
    std::vector<int32_t> alt(8192);
    for (size_t i = 0; i < alt.size(); ++i) alt[i] = (i % 2) ? -((int)(i % 3) + 1) : (int)(i % 5);
    EXPECT_NO_THROW(roundtrip_v2(alt, 128, 343));
    // single sample planes
    EXPECT_NO_THROW(roundtrip_v2(std::vector<int32_t>{7}, 1, 343));
    EXPECT_NO_THROW(roundtrip_v2(std::vector<int32_t>{-7}, 1, 1));
}

TEST(AcoderV2, BijectionRandomSeedsAndContextCounts) {
    for (uint32_t seed = 1; seed <= 20; ++seed) {
        auto res = random_residuals(3000, seed, 4000);
        EXPECT_NO_THROW(roundtrip_v2(res, 50, 343));
        EXPECT_NO_THROW(roundtrip_v2(res, 50, 1));
        EXPECT_NO_THROW(roundtrip_v2(res, 50, 16));
    }
}

TEST(AcoderV2, BijectionLeafContexts) {
    std::mt19937 rng(7);
    std::vector<int32_t> res(5000);
    std::vector<uint16_t> leaves(5000);
    for (size_t i = 0; i < res.size(); ++i) {
        res[i] = (int)(rng() % 2001) - 1000;
        leaves[i] = (uint16_t)(rng() % 64);
    }
    auto bytes = acoder_encode_plane_leaves_v2(res, leaves, 64);
    auto out = acoder_decode_plane_leaves_v2(bytes, res.size(), leaves, 64);
    EXPECT_EQ(out, res);
}

TEST(AcoderV2, DeterministicOutput) {
    auto res = random_residuals(2000, 99, 300);
    auto a = acoder_encode_plane_v2(res, 40, 50, 343);
    auto b = acoder_encode_plane_v2(res, 40, 50, 343);
    EXPECT_EQ(a, b);
}

TEST(AcoderV2, ZeroFirstSavesBytesOnZeroHeavyInput) {
    // P1 mechanism check: a zero-heavy stream must not cost more under the v2
    // ordering than under v1 sign-first coding with identical model counts.
    std::mt19937 rng(11);
    std::vector<int32_t> res(20000, 0);
    for (auto& r : res) if (rng() % 100 < 25) r = (int)(rng() % 9) - 4;
    auto v1 = acoder_encode_plane(res, 100, 200, 343);
    auto v2 = acoder_encode_plane_v2(res, 100, 200, 343);
    EXPECT_LT(v2.size(), v1.size());
}

TEST(AcoderV2, ContextsMatterUnderV2) {
    // Structured input: contexts should beat one shared context now that
    // priors plus dual-rate adaptation fight dilution.
    std::mt19937 rng(13);
    uint32_t w = 120, h = 120;
    std::vector<int32_t> res((size_t)w * h, 0);
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t i = (size_t)y * w + x;
            if ((x / 10 + y / 10) % 2 == 0) res[i] = (int)(rng() % 3) - 1;   // flat: mostly zero
            else res[i] = (int)(rng() % 61) - 30;                            // busy: large
        }
    }
    auto full = acoder_encode_plane_v2(res, w, h, 343);
    auto shared = acoder_encode_plane_v2(res, w, h, 1);
    EXPECT_LT(full.size(), shared.size());
}
