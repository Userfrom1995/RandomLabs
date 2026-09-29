// Unit tests for the neural codec Gaussian entropy model (E1-E, issue #226).
//
// Tests: CDF table construction, conditional rANS encode/decode round-trip,
// entropy estimation, sigma quantization.

#include <gtest/gtest.h>
#include "prism/codec/neural_entropy.h"
#include <cmath>
#include <vector>

namespace prism::codec {
namespace {

// Test that the CDF table can be built without error.
TEST(NeuralEntropyTest, BuildCDFTable) {
    auto table = build_gaussian_cdf_table();

    EXPECT_EQ(table.cdf.size(), static_cast<size_t>(SIGMA_BINS) * LATENT_ALPHABET);
    EXPECT_EQ(table.freq.size(), static_cast<size_t>(SIGMA_BINS) * LATENT_ALPHABET);

    // Frequencies in each sigma bin should sum to RANS_M.
    for (int sb = 0; sb < SIGMA_BINS; ++sb) {
        uint32_t total = 0;
        for (int i = 0; i < 256; ++i) {
            total += table.freq[sb * 256 + i];
        }
        EXPECT_EQ(total, 65536u) << "sigma bin " << sb << " freq sum != 65536";
    }
}

// Test CDF monotonicity within each sigma bin.
TEST(NeuralEntropyTest, CDFMonotonicity) {
    auto table = build_gaussian_cdf_table();

    for (int sb = 0; sb < SIGMA_BINS; ++sb) {
        for (int i = 1; i < 256; ++i) {
            EXPECT_GE(table.cdf[sb * 256 + i], table.cdf[sb * 256 + i - 1])
                << "CDF not monotone at bin=" << sb << " sym=" << i;
        }
    }
}

// Test sigma quantization.
TEST(NeuralEntropyTest, QuantizeSigma) {
    EXPECT_EQ(quantize_sigma(0), 0);
    EXPECT_EQ(quantize_sigma(1024), 16);
    EXPECT_EQ(quantize_sigma(2048), 32);
    EXPECT_EQ(quantize_sigma(-100), 0);
    EXPECT_EQ(quantize_sigma(32767), SIGMA_BINS - 1);
}

// Test conditional rANS encode/decode round-trip with uniform sigma.
TEST(NeuralEntropyTest, RansRoundTripUniform) {
    auto table = build_gaussian_cdf_table();
    const int count = 1000;

    std::vector<int8_t> symbols(count);
    std::vector<int16_t> sigma(count, 1024);  // sigma = 1.0

    uint32_t seed = 42;
    for (int i = 0; i < count; ++i) {
        seed = seed * 1103515245 + 12345;
        symbols[i] = static_cast<int8_t>((seed >> 16) & 0xFF);
    }

    auto encoded = neural_rans_encode(symbols.data(), sigma.data(), count, table);
    EXPECT_FALSE(encoded.empty());

    auto decoded = neural_rans_decode(encoded, count, sigma.data(), table);
    EXPECT_EQ(decoded.size(), static_cast<size_t>(count));

    for (int i = 0; i < count; ++i) {
        EXPECT_EQ(decoded[i], symbols[i]) << "mismatch at index " << i;
    }
}

// Test conditional rANS round-trip with varying sigma.
TEST(NeuralEntropyTest, RansRoundTripVaryingSigma) {
    auto table = build_gaussian_cdf_table();
    const int count = 500;

    std::vector<int8_t> symbols(count);
    std::vector<int16_t> sigma(count);

    uint32_t seed = 123;
    for (int i = 0; i < count; ++i) {
        seed = seed * 1103515245 + 12345;
        symbols[i] = static_cast<int8_t>((seed >> 16) & 0xFF);
        int sb = 4 + (i % 60);
        sigma[i] = static_cast<int16_t>(sb * 1024.0f / 16.0f + 0.5f);
    }

    auto encoded = neural_rans_encode(symbols.data(), sigma.data(), count, table);
    auto decoded = neural_rans_decode(encoded, count, sigma.data(), table);

    for (int i = 0; i < count; ++i) {
        EXPECT_EQ(decoded[i], symbols[i]) << "mismatch at index " << i;
    }
}

// Test entropy estimation for a Gaussian-matched source.
TEST(NeuralEntropyTest, EntropyEstimate) {
    auto table = build_gaussian_cdf_table();
    const int count = 10000;

    std::vector<int8_t> symbols(count);
    std::vector<int16_t> sigma(count, 1024);

    uint32_t seed = 999;
    for (int i = 0; i < count; ++i) {
        seed = seed * 1103515245 + 12345;
        float u1 = static_cast<float>((seed >> 16) & 0xFFFF) / 65536.0f;
        seed = seed * 1103515245 + 12345;
        float u2 = static_cast<float>((seed >> 16) & 0xFFFF) / 65536.0f;
        float z = std::sqrt(-2.0f * std::log(u1 + 1e-10f)) * std::cos(2.0f * 3.14159265f * u2);
        int val = static_cast<int>(std::round(z * 128.0f));
        if (val < -128) val = -128;
        if (val > 127) val = 127;
        symbols[i] = static_cast<int8_t>(val);
    }

    double entropy = neural_entropy_estimate(symbols.data(), sigma.data(), count, table);

    // For N(0,1) quantized to int8 with step=1, entropy should be reasonable.
    EXPECT_GT(entropy, 1.0);
    EXPECT_LT(entropy, 12.0);
}

// Test with all-zero symbols.
TEST(NeuralEntropyTest, AllZeroSymbols) {
    auto table = build_gaussian_cdf_table();
    const int count = 100;

    std::vector<int8_t> symbols(count, 0);
    std::vector<int16_t> sigma(count, 1024);

    auto encoded = neural_rans_encode(symbols.data(), sigma.data(), count, table);
    auto decoded = neural_rans_decode(encoded, count, sigma.data(), table);

    for (int i = 0; i < count; ++i) {
        EXPECT_EQ(decoded[i], 0) << "mismatch at index " << i;
    }
}

// Test with extreme sigma values.
TEST(NeuralEntropyTest, ExtremeSigma) {
    auto table = build_gaussian_cdf_table();
    const int count = 100;

    std::vector<int8_t> symbols(count);
    std::vector<int16_t> sigma(count);

    // Half with very small sigma, half with very large sigma.
    for (int i = 0; i < count; ++i) {
        symbols[i] = static_cast<int8_t>(i % 5 - 2);  // range [-2, 2]
        sigma[i] = (i < 50) ? 102 : 16384;  // 0.1 or 16.0
    }

    auto encoded = neural_rans_encode(symbols.data(), sigma.data(), count, table);
    auto decoded = neural_rans_decode(encoded, count, sigma.data(), table);

    for (int i = 0; i < count; ++i) {
        EXPECT_EQ(decoded[i], symbols[i]) << "mismatch at index " << i;
    }
}

} // namespace
} // namespace prism::codec
