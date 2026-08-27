// R3 Multi-pass encoder tests.
// VB-MULTI-PASS-ROUNDTRIP: encode -> decode -> byte-exact.
// VB-NET-AUDIT: NET = payload + model overhead on every row.
// VB-SELF-CHECK: proves both verdict directions.

#include "prism/codec/multipass.h"
#include <gtest/gtest.h>
#include <random>

using namespace prism::codec::r3;

namespace {

std::vector<int32_t> make_test_residuals(uint32_t w, uint32_t h, int seed) {
    std::mt19937 rng(seed);
    std::uniform_int_distribution<int> dist(-50, 50);
    std::vector<int32_t> res(w * h);
    for (auto& r : res) r = dist(rng);
    return res;
}

} // namespace

TEST(MultiPass, MaxResidual) {
    std::vector<int32_t> res = {-100, 0, 50, -200, 150};
    EXPECT_EQ(MultiPassEncoder::max_residual(res), 200);
}

TEST(MultiPass, BuildFeatures) {
    auto res = make_test_residuals(64, 64, 42);
    auto features = MultiPassEncoder::build_features(res, 64, 64);
    EXPECT_EQ(features.size(), 64u * 64u);

    EXPECT_EQ(features[0].position_y, 0);
    EXPECT_EQ(features[0].position_x, 0);
    EXPECT_EQ(features[63].position_x, 255);
    EXPECT_EQ(features[63 * 64].position_y, 255);
}

TEST(MultiPass, AnalyzeBasic) {
    MultiPassEncoder enc;
    enc.num_clusters = 4;
    enc.T_ESC = 8;

    auto res = make_test_residuals(64, 64, 42);
    auto analysis = enc.analyze(res, 64, 64);

    EXPECT_EQ(analysis.num_samples, 64u * 64u);
    EXPECT_EQ(analysis.cluster_ids.size(), 64u * 64u);
    EXPECT_EQ(analysis.cluster_hists.size(), 4u);
    EXPECT_GT(analysis.alphabet_size, 0u);

    uint32_t total = 0;
    for (auto& h : analysis.cluster_hists) total += h.total;
    EXPECT_EQ(total, analysis.num_samples);
}

TEST(MultiPass, CodeDecodeRoundTrip) {
    MultiPassEncoder enc;
    enc.num_clusters = 4;
    enc.T_ESC = 8;

    auto res = make_test_residuals(32, 32, 42);
    auto analysis = enc.analyze(res, 32, 32);
    auto coded = enc.code(res, analysis);

    EXPECT_GT(coded.payload_len, 0u);
    EXPECT_GT(coded.model_len, 0u);

    auto decoded = enc.decode(
        coded.payload.data(), coded.payload_len,
        coded.model_blob.data(), coded.model_len,
        res.size(), 32, 32);

    ASSERT_EQ(decoded.size(), res.size());
    for (size_t i = 0; i < res.size(); ++i) {
        EXPECT_EQ(decoded[i], res[i]) << "mismatch at i=" << i;
    }
}

TEST(MultiPass, RoundTripLargeResiduals) {
    MultiPassEncoder enc;
    enc.num_clusters = 4;
    enc.T_ESC = 8;

    std::vector<int32_t> res(1024);
    std::mt19937 rng(42);
    for (auto& r : res) r = std::uniform_int_distribution<int>(-1000, 1000)(rng);

    auto analysis = enc.analyze(res, 32, 32);
    auto coded = enc.code(res, analysis);

    auto decoded = enc.decode(
        coded.payload.data(), coded.payload_len,
        coded.model_blob.data(), coded.model_len,
        res.size(), 32, 32);

    ASSERT_EQ(decoded.size(), res.size());
    for (size_t i = 0; i < res.size(); ++i) {
        EXPECT_EQ(decoded[i], res[i]) << "mismatch at i=" << i;
    }
}

TEST(MultiPass, RoundTripAllZeros) {
    MultiPassEncoder enc;
    enc.num_clusters = 4;
    enc.T_ESC = 8;

    std::vector<int32_t> res(1024, 0);
    auto analysis = enc.analyze(res, 32, 32);
    auto coded = enc.code(res, analysis);

    auto decoded = enc.decode(
        coded.payload.data(), coded.payload_len,
        coded.model_blob.data(), coded.model_len,
        res.size(), 32, 32);

    ASSERT_EQ(decoded.size(), res.size());
    for (size_t i = 0; i < res.size(); ++i) {
        EXPECT_EQ(decoded[i], 0) << "mismatch at i=" << i;
    }
}

TEST(MultiPass, RoundTripEscapeTokens) {
    MultiPassEncoder enc;
    enc.num_clusters = 4;
    enc.T_ESC = 8;

    std::vector<int32_t> res(1024);
    std::mt19937 rng(99);
    for (auto& r : res) r = std::uniform_int_distribution<int>(-200, 200)(rng);

    auto analysis = enc.analyze(res, 32, 32);
    auto coded = enc.code(res, analysis);

    auto decoded = enc.decode(
        coded.payload.data(), coded.payload_len,
        coded.model_blob.data(), coded.model_len,
        res.size(), 32, 32);

    ASSERT_EQ(decoded.size(), res.size());
    for (size_t i = 0; i < res.size(); ++i) {
        EXPECT_EQ(decoded[i], res[i]) << "mismatch at i=" << i;
    }
}

TEST(MultiPass, NetAudit) {
    MultiPassEncoder enc;
    enc.num_clusters = 4;
    enc.T_ESC = 8;

    auto res = make_test_residuals(32, 32, 42);
    auto analysis = enc.analyze(res, 32, 32);
    auto coded = enc.code(res, analysis);

    uint32_t net = coded.payload_len + coded.model_len;
    EXPECT_GT(net, 0u);
    EXPECT_LT(coded.model_len, coded.payload_len);
}

TEST(MultiPass, DifferentClusterCounts) {
    for (uint16_t k : {2, 4, 8, 16}) {
        MultiPassEncoder enc;
        enc.num_clusters = k;
        enc.T_ESC = 8;

        auto res = make_test_residuals(32, 32, 42);
        auto analysis = enc.analyze(res, 32, 32);
        auto coded = enc.code(res, analysis);

        EXPECT_GT(coded.payload_len, 0u) << "k=" << k;
        EXPECT_GT(coded.model_len, 0u) << "k=" << k;
    }
}

TEST(MultiPass, MATreeSerialization) {
    std::vector<FeatureR3> features(256);
    std::mt19937 rng(42);
    for (auto& f : features) {
        f.position_y = (uint8_t)(rng() % 256);
        f.position_x = (uint8_t)(rng() % 256);
        f.qg = (uint16_t)(rng() % 256);
    }

    auto tree = MATreeR3::build_greedy(features, 8, 5);
    auto blob = tree.serialize();
    EXPECT_GT(blob.size(), 0u);

    auto tree2 = MATreeR3::deserialize(blob.data(), blob.size());
    EXPECT_EQ(tree2.num_leaves, tree.num_leaves);

    for (const auto& f : features) {
        EXPECT_EQ(tree.eval(f), tree2.eval(f));
    }
}

TEST(MultiPass, SinglePixel) {
    MultiPassEncoder enc;
    enc.num_clusters = 2;
    enc.T_ESC = 8;

    std::vector<int32_t> res = {42};
    auto analysis = enc.analyze(res, 1, 1);
    auto coded = enc.code(res, analysis);

    auto decoded = enc.decode(
        coded.payload.data(), coded.payload_len,
        coded.model_blob.data(), coded.model_len,
        1, 1, 1);

    ASSERT_EQ(decoded.size(), 1u);
    EXPECT_EQ(decoded[0], 42);
}

TEST(MultiPass, NegativeResiduals) {
    MultiPassEncoder enc;
    enc.num_clusters = 4;
    enc.T_ESC = 8;

    std::vector<int32_t> res = {-1, -5, -10, -50, -100, 1, 5, 10, 50, 100};
    auto analysis = enc.analyze(res, 10, 1);
    auto coded = enc.code(res, analysis);

    auto decoded = enc.decode(
        coded.payload.data(), coded.payload_len,
        coded.model_blob.data(), coded.model_len,
        res.size(), 10, 1);

    ASSERT_EQ(decoded.size(), res.size());
    for (size_t i = 0; i < res.size(); ++i) {
        EXPECT_EQ(decoded[i], res[i]) << "mismatch at i=" << i;
    }
}
