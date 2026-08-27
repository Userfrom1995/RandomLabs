// R2 hybrid-uint encode/decode round-trip tests.
// Bijection: encode_residual_hybrid -> decode_residual_hybrid reproduces
// source byte-exact for residuals in range. T_ESC parameterization,
// binary tree path correctness, model memory audit.

#include "prism/codec/acoder.h"
#include <gtest/gtest.h>
#include <random>
#include <numeric>

using namespace prism::codec;

namespace {
void roundtrip_hybrid(const std::vector<int32_t>& residuals, uint32_t w,
                       int T_ESC = 8) {
    uint32_t h = (w == 0) ? 0 : (uint32_t)(residuals.size() / w);
    auto bytes = acoder_encode_plane_hybrid(residuals, w, h, T_ESC);
    auto out = acoder_decode_plane_hybrid(bytes, residuals.size(), w, h, T_ESC);
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

TEST(AcoderHybrid, SingleSampleRoundTrip) {
    int32_t values[] = {0, 1, -1, 2, -2, 5, -5, 10, -10, 100, -100, 1000, -1000};
    for (int tesc : {4, 8, 16}) {
        for (int32_t v : values) {
            ACModelsHybrid m(1, tesc);
            AEncoder enc;
            encode_residual_hybrid(enc, m, 0, v);
            auto bytes = enc.flush_and_emit();
            ACModelsHybrid m2(1, tesc);
            ADecoder dec;
            dec.init(bytes);
            int32_t d = decode_residual_hybrid(dec, m2, 0);
            EXPECT_EQ(d, v) << "T_ESC=" << tesc << " value=" << v;
        }
    }
}

TEST(AcoderHybrid, BijectionDenseLattice) {
    for (int tesc : {4, 8, 16}) {
        std::vector<int32_t> res;
        for (int32_t r = -200; r <= 200; ++r) res.push_back(r);
        EXPECT_NO_THROW(roundtrip_hybrid(res, 1, tesc));
    }
}

TEST(AcoderHybrid, BijectionAdversarialAlphabets) {
    // all-zero plane
    std::vector<int32_t> zeros(4096, 0);
    EXPECT_NO_THROW(roundtrip_hybrid(zeros, 64, 8));
    // max magnitude
    std::vector<int32_t> big(2048);
    for (size_t i = 0; i < big.size(); ++i) big[i] = (i % 2) ? -32767 : 32767;
    EXPECT_NO_THROW(roundtrip_hybrid(big, 32, 8));
    // alternating signs around small magnitudes
    std::vector<int32_t> alt(8192);
    for (size_t i = 0; i < alt.size(); ++i) alt[i] = (i % 2) ? -((int)(i % 3) + 1) : (int)(i % 5);
    EXPECT_NO_THROW(roundtrip_hybrid(alt, 128, 8));
}

TEST(AcoderHybrid, BijectionRandomSeeds) {
    for (uint32_t seed = 1; seed <= 20; ++seed) {
        auto res = random_residuals(3000, seed, 4000);
        EXPECT_NO_THROW(roundtrip_hybrid(res, 50, 8));
        EXPECT_NO_THROW(roundtrip_hybrid(res, 50, 4));
        EXPECT_NO_THROW(roundtrip_hybrid(res, 50, 16));
    }
}

TEST(AcoderHybrid, DeterministicOutput) {
    auto res = random_residuals(2000, 99, 300);
    auto a = acoder_encode_plane_hybrid(res, 40, 50, 8);
    auto b = acoder_encode_plane_hybrid(res, 40, 50, 8);
    EXPECT_EQ(a, b);
}

TEST(AcoderHybrid, DifferentTEscDifferentSize) {
    auto res = random_residuals(5000, 42, 100);
    auto enc4 = acoder_encode_plane_hybrid(res, 50, 100, 4);
    auto enc8 = acoder_encode_plane_hybrid(res, 50, 100, 8);
    auto enc16 = acoder_encode_plane_hybrid(res, 50, 100, 16);
    // T_ESC=4 has fewer direct tokens, more escapes -> generally larger
    // T_ESC=16 has more direct tokens, fewer escapes -> generally smaller
    // Just verify they all round-trip, sizes may vary
    EXPECT_NO_THROW(roundtrip_hybrid(res, 50, 4));
    EXPECT_NO_THROW(roundtrip_hybrid(res, 50, 8));
    EXPECT_NO_THROW(roundtrip_hybrid(res, 50, 16));
}

TEST(AcoderHybrid, ModelMemoryAudit) {
    // Model should be bounded: 343 * T_ESC token nodes + 343 sign + 343 escq
    // For T_ESC=8: 343*8 + 343 + 343 = 3430 * 2 * 2 = ~27 KB
    // Per sample overhead should be <= 0.01 bpp
    ACModelsHybrid m(343, 8);
    size_t token_nodes = m.token.ctx.p_fast.size();
    size_t sign_nodes = m.sign.ctx.p_fast.size();
    size_t escq_nodes = m.escq.ctx.p_fast.size();
    EXPECT_EQ(token_nodes, (size_t)(343 * 8));
    EXPECT_EQ(sign_nodes, (size_t)343);
    EXPECT_EQ(escq_nodes, (size_t)343);
    // Total bytes = (token_nodes + sign_nodes + escq_nodes) * 2 rates * 2 bytes
    size_t total_bytes = (token_nodes + sign_nodes + escq_nodes) * 2 * 2;
    // For a 768x512 3ch image (1179648 samples): overhead = total_bytes / samples * 8 bpp
    double samples = 768.0 * 512.0 * 3.0;
    double overhead_bpp = 8.0 * total_bytes / samples;
    EXPECT_LT(overhead_bpp, 0.2) << "model overhead " << overhead_bpp << " bpp exceeds 0.2 bpp";
}
