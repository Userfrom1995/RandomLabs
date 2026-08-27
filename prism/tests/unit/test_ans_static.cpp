// R3 ANS static-probability coder tests.
// VB-ANS-FIDELITY: encode -> decode -> bit-exact round-trip.
// Build from histograms, encode symbols, decode, compare.

#include "prism/codec/ans_static.h"
#include "prism/codec/histogram.h"
#include <gtest/gtest.h>
#include <random>

using namespace prism::codec::r3;

namespace {

// Build a simple histogram with known distribution.
Histogram make_histogram(uint8_t alphabet, const std::vector<uint32_t>& counts) {
    Histogram h;
    h.alphabet_size = alphabet;
    h.reset();
    for (uint8_t i = 0; i < alphabet; ++i) {
        for (uint32_t j = 0; j < counts[i]; ++j) {
            h.add(i);
        }
    }
    return h;
}

} // namespace

TEST(ANSStatic, BuildFromHistograms) {
    Histogram h = make_histogram(4, {100, 200, 300, 400});
    std::vector<Histogram> hists = {h};

    ANSStaticModel model;
    model.build_from_histograms(hists);

    ASSERT_EQ(model.tables.size(), 1u);
    EXPECT_EQ(model.tables[0].alphabet_size, 4u);
    EXPECT_EQ(model.tables[0].total, ANSStaticModel::SCALE);

    // Verify cumulative frequencies are monotonically increasing.
    for (size_t i = 0; i < 4; ++i) {
        EXPECT_LE(model.tables[0].cum_freq[i], model.tables[0].cum_freq[i + 1]);
    }
    EXPECT_EQ(model.tables[0].cum_freq[4], ANSStaticModel::SCALE);
}

TEST(ANSStatic, EncodeDecodeRoundTrip) {
    Histogram h = make_histogram(4, {256, 256, 256, 256});
    std::vector<Histogram> hists = {h};

    ANSStaticModel model;
    model.build_from_histograms(hists);

    // Encode a symbol stream.
    uint16_t clusters[] = {0, 0, 0, 0, 0};
    int32_t symbols[] = {0, 1, 2, 3, 0};

    auto encoded = model.encode(symbols, clusters, 5);
    EXPECT_GT(encoded.size(), 0u);

    // Decode.
    int32_t decoded[5] = {};
    model.decode(encoded.data(), encoded.size(), decoded, clusters, 5);

    for (int i = 0; i < 5; ++i) {
        EXPECT_EQ(decoded[i], symbols[i]) << "i=" << i;
    }
}

TEST(ANSStatic, RoundTripLargerStream) {
    Histogram h = make_histogram(9, {400, 400, 400, 400, 400, 400, 400, 400, 896});
    std::vector<Histogram> hists = {h};

    ANSStaticModel model;
    model.build_from_histograms(hists);

    // Generate a random symbol stream.
    std::mt19937 rng(42);
    std::uniform_int_distribution<int> dist(0, 8);
    const size_t N = 1000;
    std::vector<int32_t> symbols(N);
    std::vector<uint16_t> clusters(N, 0);
    for (size_t i = 0; i < N; ++i) symbols[i] = dist(rng);

    auto encoded = model.encode(symbols.data(), clusters.data(), N);
    EXPECT_GT(encoded.size(), 0u);

    std::vector<int32_t> decoded(N, -1);
    model.decode(encoded.data(), encoded.size(), decoded.data(), clusters.data(), N);

    for (size_t i = 0; i < N; ++i) {
        EXPECT_EQ(decoded[i], symbols[i]) << "i=" << i;
    }
}

TEST(ANSStatic, MultipleClusters) {
    Histogram h0 = make_histogram(4, {400, 300, 200, 100});
    Histogram h1 = make_histogram(4, {100, 200, 300, 400});
    std::vector<Histogram> hists = {h0, h1};

    ANSStaticModel model;
    model.build_from_histograms(hists);

    const size_t N = 100;
    std::vector<int32_t> symbols(N);
    std::vector<uint16_t> clusters(N);
    std::mt19937 rng(42);
    for (size_t i = 0; i < N; ++i) {
        symbols[i] = std::uniform_int_distribution<int>(0, 3)(rng);
        clusters[i] = std::uniform_int_distribution<int>(0, 1)(rng);
    }

    auto encoded = model.encode(symbols.data(), clusters.data(), N);
    std::vector<int32_t> decoded(N, -1);
    model.decode(encoded.data(), encoded.size(), decoded.data(), clusters.data(), N);

    for (size_t i = 0; i < N; ++i) {
        EXPECT_EQ(decoded[i], symbols[i]) << "i=" << i;
    }
}

TEST(ANSStatic, SingleSymbol) {
    Histogram h = make_histogram(2, {1, 1});
    std::vector<Histogram> hists = {h};

    ANSStaticModel model;
    model.build_from_histograms(hists);

    uint16_t clusters[] = {0};
    int32_t symbols[] = {1};

    auto encoded = model.encode(symbols, clusters, 1);
    int32_t decoded[1] = {};
    model.decode(encoded.data(), encoded.size(), decoded, clusters, 1);

    EXPECT_EQ(decoded[0], 1);
}

TEST(ANSStatic, InvalidClusterId) {
    Histogram h = make_histogram(4, {256, 256, 256, 256});
    std::vector<Histogram> hists = {h};

    ANSStaticModel model;
    model.build_from_histograms(hists);

    uint16_t clusters[] = {5};  // invalid: only 1 cluster
    int32_t symbols[] = {0};

    EXPECT_THROW(model.encode(symbols, clusters, 1), std::runtime_error);
}
