// R3 Hybrid-uint tokenization tests.
// Bijection: tokenize -> detokenize round-trips every residual in range.
// Zero-token exclusivity, ladder edges, sign-after-nonzero (L-C5).

#include "prism/codec/hybrid_uint.h"
#include <gtest/gtest.h>

using namespace prism::codec::r3;

namespace {

int32_t roundtrip(const HybridUintProfile& p, int32_t r) {
    auto ev = p.tokenize(r);
    return p.detokenize(ev);
}

} // namespace

TEST(HybridUint, ZigzagBijection) {
    for (int32_t v = -10000; v <= 10000; ++v) {
        int32_t u = HybridUintProfile::zigzag_fold(v);
        ASSERT_GE(u, 0);
        EXPECT_EQ(HybridUintProfile::zigzag_unfold(u), v);
    }
}

TEST(HybridUint, ZeroTokenExclusivity) {
    HybridUintProfile p;
    p.T_ESC = 8;

    auto zero_ev = p.tokenize(0);
    EXPECT_EQ(zero_ev.token, 0);
    EXPECT_FALSE(zero_ev.has_sign);

    for (int32_t r = -1000; r <= 1000; ++r) {
        if (r == 0) continue;
        auto ev = p.tokenize(r);
        EXPECT_NE(ev.token, 0) << "r=" << r;
        EXPECT_TRUE(ev.has_sign) << "r=" << r;
    }
}

TEST(HybridUint, LadderEdgesT8) {
    HybridUintProfile p;
    p.T_ESC = 8;

    // Direct tokens: 1..7
    for (int32_t r = 1; r < 8; ++r) {
        auto ev = p.tokenize(r);
        EXPECT_EQ(ev.token, (uint8_t)r);
        EXPECT_TRUE(ev.has_sign);  // nonzero always has sign (L-C5)
        EXPECT_FALSE(ev.sign_bit); // positive
        EXPECT_EQ(ev.esc_quotient, 0);
    }

    // Escape token at T_ESC boundary.
    auto ev8 = p.tokenize(8);
    EXPECT_EQ(ev8.token, 8);
    EXPECT_TRUE(ev8.has_sign);
    EXPECT_FALSE(ev8.sign_bit);
    EXPECT_EQ(ev8.esc_quotient, 0);  // m = 1, q = 0
    EXPECT_EQ(ev8.esc_rawbits, 0);
    // m = 1, q = 0, low 0 bits = 0 (no bypass bits when q=0)
    EXPECT_EQ(ev8.raw_value, 0u);

    // Negative.
    auto ev_neg = p.tokenize(-5);
    EXPECT_EQ(ev_neg.token, 5);
    EXPECT_TRUE(ev_neg.has_sign);
    EXPECT_TRUE(ev_neg.sign_bit);
}

TEST(HybridUint, LadderEdgesT4) {
    HybridUintProfile p;
    p.T_ESC = 4;

    auto ev4 = p.tokenize(4);
    EXPECT_EQ(ev4.token, 4);
    EXPECT_EQ(ev4.esc_quotient, 0);
    EXPECT_EQ(ev4.esc_rawbits, 0);
    EXPECT_EQ(ev4.raw_value, 0u);
    EXPECT_EQ(roundtrip(p, 4), 4);
}

TEST(HybridUint, LadderEdgesT16) {
    HybridUintProfile p;
    p.T_ESC = 16;

    auto ev16 = p.tokenize(16);
    EXPECT_EQ(ev16.token, 16);
    EXPECT_EQ(ev16.esc_quotient, 0);

    auto ev32 = p.tokenize(32);
    EXPECT_EQ(ev32.token, 16);
    // m = 32-16+1 = 17, bitlen(17) = 5, q = 4
    EXPECT_EQ(ev32.esc_quotient, 4);
}

TEST(HybridUint, RoundTripDenseLattice) {
    HybridUintProfile p;
    p.T_ESC = 8;

    for (int32_t r = -5000; r <= 5000; ++r) {
        EXPECT_EQ(roundtrip(p, r), r) << "r=" << r;
    }
}

TEST(HybridUint, RoundTripLargeValues) {
    HybridUintProfile p;
    p.T_ESC = 8;

    // Test values beyond direct range.
    int32_t big_values[] = {100, 255, 1000, 32767, -32768, 100000, -100000};
    for (int32_t r : big_values) {
        EXPECT_EQ(roundtrip(p, r), r) << "r=" << r;
    }
}

TEST(HybridUint, ComputeAlphabet) {
    EXPECT_EQ(HybridUintProfile::compute_alphabet(8, 0), 9);
    EXPECT_EQ(HybridUintProfile::compute_alphabet(8, 7), 9);
    EXPECT_EQ(HybridUintProfile::compute_alphabet(8, 8), 9);
    EXPECT_EQ(HybridUintProfile::compute_alphabet(8, 15), 9);
}

TEST(HybridUint, NegativeResiduals) {
    HybridUintProfile p;
    p.T_ESC = 8;

    for (int32_t r = -100; r < 0; ++r) {
        auto ev = p.tokenize(r);
        EXPECT_TRUE(ev.has_sign);
        EXPECT_TRUE(ev.sign_bit);
        EXPECT_EQ(roundtrip(p, r), r);
    }
}
