// R3 Histogram tests: accumulator, normalization, smoothing, serialization.
// VB-HISTOGRAM-FIDELITY: serialize -> deserialize -> compare.

#include "prism/codec/histogram.h"
#include <gtest/gtest.h>
#include <numeric>

using namespace prism::codec::r3;

TEST(Histogram, AccumulatorBasic) {
    Histogram h;
    h.alphabet_size = 8;
    h.reset();
    EXPECT_EQ(h.total, 0u);

    h.add(0);
    h.add(3);
    h.add(3);
    h.add(7);
    EXPECT_EQ(h.total, 4u);
    EXPECT_EQ(h.counts[0], 1u);
    EXPECT_EQ(h.counts[3], 2u);
    EXPECT_EQ(h.counts[7], 1u);
    EXPECT_EQ(h.alphabet_size, 8u);
}

TEST(Histogram, AccumulatorOutOfRange) {
    Histogram h;
    h.alphabet_size = 8;
    EXPECT_THROW(h.add(64), std::out_of_range);
}

TEST(Histogram, NormalizeSumExact) {
    Histogram h;
    h.alphabet_size = 4;
    h.reset();
    // Add some non-uniform data.
    for (int i = 0; i < 1000; ++i) {
        h.add(i % 4);
    }
    auto norm = h.normalize_12bit();
    uint32_t sum = 0;
    for (size_t i = 0; i < 4; ++i) sum += norm[i];
    EXPECT_EQ(sum, Histogram::NORMALIZE_SUM);
    // Ascending-id tie-break: all frequencies should be > 0.
    for (size_t i = 0; i < 4; ++i) EXPECT_GT(norm[i], 0u);
}

TEST(Histogram, NormalizeZeroTotal) {
    Histogram h;
    h.reset();
    h.alphabet_size = 4;
    auto norm = h.normalize_12bit();
    uint32_t sum = 0;
    for (size_t i = 0; i < 4; ++i) {
        sum += norm[i];
        EXPECT_GT(norm[i], 0u);
    }
    EXPECT_EQ(sum, Histogram::NORMALIZE_SUM);
}

TEST(Histogram, NormalizeUniform) {
    Histogram h;
    h.alphabet_size = 4;
    h.reset();
    for (int i = 0; i < 100; ++i) h.add(i % 4);
    auto norm = h.normalize_12bit();
    // Uniform distribution: all frequencies should be approximately equal.
    for (size_t i = 0; i < 3; ++i) {
        EXPECT_NEAR(norm[i], norm[i + 1], 2);
    }
}

TEST(Histogram, SmoothBasic) {
    Histogram h;
    h.alphabet_size = 4;
    h.reset();
    for (int i = 0; i < 100; ++i) h.add(i % 4);

    Histogram prior;
    prior.alphabet_size = 4;
    prior.reset();
    for (int i = 0; i < 100; ++i) prior.add(i % 4);

    h.smooth(prior, 1.0, 15.0 / 16.0);

    // After smoothing with identical prior, frequencies should be similar.
    uint32_t sum = 0;
    for (size_t i = 0; i < 4; ++i) sum += h.counts[i];
    EXPECT_EQ(sum, Histogram::NORMALIZE_SUM);
}

TEST(Histogram, CDFCumulative) {
    Histogram h;
    h.alphabet_size = 4;
    h.counts[0] = 1000;
    h.counts[1] = 1000;
    h.counts[2] = 1000;
    h.counts[3] = 1096;
    h.total = 4096;
    auto freq = h.normalize_12bit();
    auto cdf = h.build_cdf(freq);

    EXPECT_EQ(cdf[0], 0u);
    for (size_t i = 0; i < 4; ++i) {
        EXPECT_LE(cdf[i], cdf[i + 1]);
    }
    EXPECT_EQ(cdf[4], Histogram::NORMALIZE_SUM);
}

TEST(HistogramSerializer, RoundTrip) {
    Histogram global;
    global.alphabet_size = 4;
    global.reset();
    for (int i = 0; i < 1000; ++i) global.add(i % 4);

    std::vector<Histogram> clusters(3);
    for (int c = 0; c < 3; ++c) {
        clusters[c].alphabet_size = 4;
        clusters[c].reset();
        for (int i = 0; i < 200; ++i) clusters[c].add((i + c) % 4);
    }

    size_t audit = 0;
    auto blob = HistogramSerializer::serialize(global, clusters, &audit);
    EXPECT_GT(blob.size(), 0u);
    EXPECT_EQ(audit, blob.size());

    auto deser = HistogramSerializer::deserialize(
        blob.data(), blob.size(), 3, 4);

    EXPECT_EQ(deser.global.alphabet_size, 4u);
    EXPECT_EQ(deser.cluster_hists.size(), 3u);

    // Global prior should match (normalized).
    auto gn = global.normalize_12bit();
    for (size_t i = 0; i < 4; ++i) {
        EXPECT_EQ(deser.global.counts[i], gn[i]);
    }

    // Cluster histograms should be reconstructed within rounding.
    for (int c = 0; c < 3; ++c) {
        auto cn = clusters[c].normalize_12bit();
        for (size_t i = 0; i < 4; ++i) {
            int32_t expected = (int32_t)cn[i];
            int32_t actual = (int32_t)deser.cluster_hists[c].counts[i];
            // Delta-coded: within 1 due to rounding.
            EXPECT_NEAR(expected, actual, 1);
        }
    }
}

TEST(HistogramSerializer, TruncatedHeader) {
    uint8_t data[] = {0x04};
    EXPECT_THROW(
        HistogramSerializer::deserialize(data, 1, 1, 4),
        std::runtime_error);
}

TEST(HistogramSerializer, AlphabetMismatch) {
    uint8_t data[] = {0x04, 0x01, 0x00};  // alphabet=4, nc=1
    EXPECT_THROW(
        HistogramSerializer::deserialize(data, 3, 1, 8),
        std::runtime_error);
}
