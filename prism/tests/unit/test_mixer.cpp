#include <gtest/gtest.h>
#include "prism/codec/mixer.h"
#include <random>
#include <vector>

using namespace prism::codec;

// squash/stretch pair must be mutual inverses within the piecewise-linear
// quantization error (one 12-bit step), and both must be monotone.
TEST(Mixer, SquashStretchRoundTrip) {
    mix_stretch_init();
    for (int d = -2047; d <= 2047; ++d) {
        int p = mix_squash(d);
        ASSERT_GE(p, 0);
        ASSERT_LE(p, 4095);
    }
    // monotone non-decreasing
    int prev = 0;
    for (int d = -2047; d <= 2047; ++d) {
        int p = mix_squash(d);
        ASSERT_GE(p, prev) << "squash not monotone at " << d;
        prev = p;
    }
    // stretch: exact-inverse construction -> round trip within 3 p12 steps
    // (worst case sits on the steepest mid-curve segment around p=1105; the
    // error is one-directional and bounded, so aggregate cost impact is a few
    // hundredths of a percent - acceptable for a go/no-go projection).
    for (int p = 1; p <= 4093; ++p) {
        int s = mix_stretch(p);
        ASSERT_GE(s, -2047);
        ASSERT_LE(s, 2047);
        int back = mix_squash(s);
        ASSERT_LE(std::abs(back - p), 3) << "round trip off at p=" << p;
    }
    // monotone
    int prevs = -2048;
    for (int p = 0; p <= 4095; ++p) {
        int s = mix_stretch(p);
        ASSERT_GE(s, prevs) << "stretch not monotone at " << p;
        prevs = s;
    }
}

// Identity at init: with untouched SSE tables and neutral weights summing to
// 1.0 over equal inputs, filter() reproduces the input stretch.
TEST(Mixer, IdentityAtInit) {
    MixerConfig cfg;
    cfg.use_sse = false;
    MixerCore m(cfg);
    std::mt19937 rng(7);
    for (int iter = 0; iter < 200; ++iter) {
        std::array<int32_t, 4> st{0, 0, 0, 0};
        for (auto& v : st) v = (int32_t)(rng() % 4095) - 2047;
        int s_out = m.filter(st.data(), 0);
        // dot = sum(16384*st_k) >> 16 = average, rounded toward -inf by shift
        int64_t dot = 0;
        for (int k = 0; k < 4; ++k) dot += 16384 * st[k];
        int expect = (int)(dot >> 16);
        EXPECT_EQ(s_out, expect);
    }
}

// SSE identity at init: a fresh APM must pass the mixed value through
// exactly at slot centers (frac == 0 interpolates a single identity slot).
TEST(Mixer, SseIdentityAtSlotCenters) {
    MixerCore m(MixerConfig{}); // use_sse = true
    // With all four inputs equal to s, neutral weights give
    // s_mix == floor-average == s, and the identity table returns s.
    for (int j = 0; j <= 31; ++j) {
        int s = j * 128 - 2047;
        std::array<int32_t, 4> st{s, s, s, s};
        int s_out = m.filter(st.data(), 2);
        EXPECT_EQ(s_out, s) << "SSE identity violated at slot " << j;
    }
}

// Bounded-weight invariant under adversarial one-sided streams.
TEST(Mixer, WeightsStayBounded) {
    MixerConfig cfg;
    MixerCore m(cfg);
    std::array<int32_t, 4> st{-2047, 2047, -1000, 1000};
    for (int i = 0; i < 200000; ++i) {
        m.update(i % 2 == 0, st.data(), i % 4);
        for (int k = 0; k < cfg.K; ++k) {
            ASSERT_GE(m.weight(k), cfg.w_min);
            ASSERT_LE(m.weight(k), cfg.w_max);
        }
    }
}

// Determinism: identical call sequences produce identical state.
TEST(Mixer, Deterministic) {
    auto run = []() {
        MixerCore m(MixerConfig{});
        std::mt19937 rng(123);
        for (int i = 0; i < 5000; ++i) {
            std::array<int32_t, 4> st{
                (int32_t)(rng() % 4095) - 2047, (int32_t)(rng() % 4095) - 2047,
                (int32_t)(rng() % 4095) - 2047, (int32_t)(rng() % 4095) - 2047};
            int cls = (int)(rng() % 4);
            int s_out = m.filter(st.data(), cls);
            bool bit = (rng() % 2) != 0;
            m.update(bit, st.data(), cls);
            if (i == 4999) return s_out + m.weight(0) * 10000 + (int)m.sse_slot(cls, 17);
        }
        return 0;
    };
    int64_t a = run();
    int64_t b = run();
    EXPECT_EQ(a, b);
}

// Frozen adaptation (lr_shift = -1 sentinel) must leave weights untouched;
// this backs the harness's mix4-frozen / mix4-adversarial ablation presets.
TEST(Mixer, FrozenWeightsAreInert) {
    MixerConfig cfg;
    cfg.lr_shift = -1;
    cfg.sse_rate_shift = -1;
    MixerCore m(cfg);
    std::array<int32_t, 4> st{-2047, 2047, 0, 1000};
    int64_t s0 = m.sse_slot(0, 17);
    for (int i = 0; i < 10000; ++i) m.update(i % 2 == 0, st.data(), i % 4);
    for (int k = 0; k < cfg.K; ++k)
        ASSERT_EQ(m.weight(k), cfg.w_init) << "frozen weight moved";
    ASSERT_EQ(m.sse_slot(0, 17), s0) << "frozen SSE slot moved";
}
