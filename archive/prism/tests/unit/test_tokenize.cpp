// V0 sandbox tokenization tests (blueprint section 3 test matrix):
// zigzag bijection both directions over a dense lattice including extremes;
// ZERO-token exclusivity (r=0 never escapes, r!=0 never takes t=0); ladder
// edge values T_ESC +/- 1; step-exact determinism; event-count exactness of
// detokenize_sample round-trips.

#include "prism/codec/tokenize.h"
#include <gtest/gtest.h>
#include <random>

using namespace prism::codec::sandbox;

namespace {

bool has_zero_token(TokProfile p, int32_t r) {
    std::vector<TokEvent> evs;
    tokenize_sample(p, r, evs);
    return !evs.empty() && evs[0].kind == EvKind::TOKEN && evs[0].value == 0;
}

int32_t roundtrip(TokProfile p, int32_t r) {
    std::vector<TokEvent> evs;
    tokenize_sample(p, r, evs);
    size_t pos = 0;
    return detokenize_sample(p, evs, pos);
}

} // namespace

TEST(Tokenize, ZigzagBijectionDenseLattice) {
    for (int32_t v = -100000; v <= 100000; ++v) {
        int32_t u = zigzag_fold(v);
        ASSERT_GE(u, 0);
        EXPECT_EQ(zigzag_unfold(u), v);
    }
    // BD8 and BD16 extremes saturate consistently (injective on range).
    EXPECT_EQ(zigzag_fold(0), 0);
    EXPECT_EQ(zigzag_fold(-1), 1);
    EXPECT_EQ(zigzag_fold(1), 2);
}

TEST(Tokenize, ZeroTokenExclusivity) {
    const TokProfile hybs[3] = {TokProfile::HYB_A, TokProfile::HYB_B,
                                TokProfile::HYB_C};
    for (TokProfile p : hybs) {
        EXPECT_TRUE(has_zero_token(p, 0));
        for (int32_t r = -400; r <= 400; ++r) {
            if (r == 0) continue;
            EXPECT_FALSE(has_zero_token(p, r)) << "r=" << r;
        }
    }
}

TEST(Tokenize, LadderEdges) {
    const struct {
        TokProfile p;
        int t_esc;
    } ladders[3] = {{TokProfile::HYB_A, 4},
                    {TokProfile::HYB_B, 8},
                    {TokProfile::HYB_C, 16}};
    for (const auto& L : ladders) {
        // Last direct magnitude T_ESC - 1 must NOT produce an escape
        // (no RAWBITS event); first escaped magnitude T_ESC produces
        // m = 1 (pin D1), i.e. q = 0 raw bits.
        for (int sign = 0; sign < 2; ++sign) {
            int32_t direct = sign ? -(L.t_esc - 1) : (L.t_esc - 1);
            int32_t esc = sign ? -L.t_esc : L.t_esc;
            std::vector<TokEvent> de, ee;
            tokenize_sample(L.p, direct, de);
            tokenize_sample(L.p, esc, ee);
            bool d_raw = false, e_raw = false;
            for (auto& e : de) if (e.kind == EvKind::RAWBITS) d_raw = true;
            for (auto& e : ee) if (e.kind == EvKind::RAWBITS) e_raw = true;
            EXPECT_FALSE(d_raw) << "direct token escaped";
            EXPECT_TRUE(e_raw) << "escape missing raw region";
            EXPECT_EQ(roundtrip(L.p, direct), direct);
            EXPECT_EQ(roundtrip(L.p, esc), esc);
        }
    }
}

TEST(Tokenize, RoundTripDenseLatticeAndExtremes) {
    const TokProfile all[4] = {TokProfile::ZFFCTRL, TokProfile::HYB_A,
                               TokProfile::HYB_B, TokProfile::HYB_C};
    std::mt19937 rng(7);
    std::uniform_int_distribution<int32_t> wide(-65535, 65535);
    for (TokProfile p : all) {
        for (int32_t v = -3000; v <= 3000; ++v)
            ASSERT_EQ(roundtrip(p, v), v) << "profile=" << (int)p;
        for (int i = 0; i < 20000; ++i) {
            int32_t v = wide(rng);
            ASSERT_EQ(roundtrip(p, v), v);
        }
        // Extremes of the sandbox magnitude range.
        for (int64_t e : {-65535, -65534, -32768, -1, 1, 32767, 65534, 65535})
            ASSERT_EQ(roundtrip(p, (int32_t)e), (int32_t)e);
    }
}

TEST(Tokenize, DeterminismAndShape) {
    const TokProfile all[4] = {TokProfile::ZFFCTRL, TokProfile::HYB_A,
                               TokProfile::HYB_B, TokProfile::HYB_C};
    for (TokProfile p : all) {
        std::vector<TokEvent> a, b;
        tokenize_sample(p, -12345, a);
        tokenize_sample(p, -12345, b);
        EXPECT_EQ(a, b);
    }
    // Table-shape contract matches the profile family.
    EXPECT_EQ(kind_key_count(TokProfile::ZFFCTRL, EvKind::QPOS),
              (size_t)Q_POS_MAX);
    EXPECT_EQ(kind_key_count(TokProfile::ZFFCTRL, EvKind::REM),
              (size_t)REM_L_MAX * (REM_L_MAX + 1) / 2 + REM_OVERFLOW_BINS);
    EXPECT_EQ(kind_key_count(TokProfile::HYB_B, EvKind::ESCQ),
              (size_t)hyb_esc_contexts(TokProfile::HYB_B) * Q_POS_MAX);
    EXPECT_THROW(kind_key_count(TokProfile::ZFFCTRL, EvKind::ESCQ),
                 std::runtime_error);
}
