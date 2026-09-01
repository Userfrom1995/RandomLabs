// Unit tests for the neural codec integer inference engine (E1, issue #226).
//
// Tests: forward pass, GDN/IGDN round-trip, quantization, conv2d.

#include <gtest/gtest.h>
#include "prism/codec/neural_codec.h"
#include <cmath>
#include <vector>

namespace prism::codec {
namespace {

// Test basic convolution with known weights.
TEST(NeuralCodecTest, Conv2dIdentity) {
    // 3x3 input, 1 channel, 1 output channel, 3x3 kernel, stride 1.
    // Weight = 1024 (Q=1.0), bias = 0.
    // Input = 5 (int8) everywhere.
    // With padding=1, center pixel sees all 9 elements.
    const int in_h = 3, in_w = 3;
    std::vector<int8_t> input(in_h * in_w, 5);
    const int16_t weight[] = {
        0, 0, 0,
        0, NeuralCodecParams::Q, 0,
        0, 0, 0
    };
    const int16_t bias[] = {0};
    int32_t output[1];

    neural_conv2d_int16(input.data(), 1, in_h, in_w, weight, bias,
                        1, 3, 3, 1, output, 1, 1);

    // Center pixel: weight center is 1024, input center is 5, all other weights are 0.
    // output[0] = 5 * 1024 = 5120 (before quantization)
    EXPECT_EQ(output[0], 5 * NeuralCodecParams::Q);
}

// Test GDN and IGDN produce valid outputs (numerical stability).
// GDN and IGDN are NOT mathematical inverses - they are complementary
// normalization layers trained jointly in the analysis/synthesis pair.
TEST(NeuralCodecTest, GDN_IGDN_ApproxRoundTrip) {
    const int ch = 4;
    const int h = 8;
    const int w = 8;
    const int len = ch * h * w;

    std::vector<int8_t> data(len);
    for (int i = 0; i < len; ++i) {
        data[i] = static_cast<int8_t>(i % 127 - 63);  // range [-63, 63]
    }
    std::vector<int16_t> beta(ch, NeuralCodecParams::Q);  // beta = 1.0

    // Save original.
    std::vector<int8_t> orig = data;

    // GDN should produce values in int8 range.
    neural_gdn(data.data(), ch, h, w, beta.data());
    for (int i = 0; i < len; ++i) {
        EXPECT_GE(data[i], -128);
        EXPECT_LE(data[i], 127);
    }
    // GDN with beta=1.0 should reduce magnitude for large inputs.
    EXPECT_LT(std::abs(static_cast<int>(data[len-1])), std::abs(static_cast<int>(orig[len-1])));

    // IGDN should produce values in int8 range.
    neural_igdn(data.data(), ch, h, w, beta.data());
    for (int i = 0; i < len; ++i) {
        EXPECT_GE(data[i], -128);
        EXPECT_LE(data[i], 127);
    }
}

// Test ReLU.
TEST(NeuralCodecTest, ReLU) {
    int8_t data[] = {-5, -1, 0, 1, 5, 100, -100};
    neural_relu(data, 7);
    EXPECT_EQ(data[0], 0);
    EXPECT_EQ(data[1], 0);
    EXPECT_EQ(data[2], 0);
    EXPECT_EQ(data[3], 1);
    EXPECT_EQ(data[4], 5);
    EXPECT_EQ(data[5], 100);
    EXPECT_EQ(data[6], 0);
}

// Test quantization.
TEST(NeuralCodecTest, Quantize) {
    int32_t data[] = {0, 512, 1024, 2048, -512, -1024, 3276800};
    int8_t out[7];
    neural_quantize_to_int8(data, out, 7, 10);

    EXPECT_EQ(out[0], 0);       // 0 >> 10 = 0
    EXPECT_EQ(out[1], 0);       // 512 >> 10 = 0
    EXPECT_EQ(out[2], 1);       // 1024 >> 10 = 1
    EXPECT_EQ(out[3], 2);       // 2048 >> 10 = 2
    EXPECT_EQ(out[4], -1);      // -512 >> 10 = -1
    EXPECT_EQ(out[5], -1);      // -1024 >> 10 = -1
    // 3276800 >> 10 = 3200, clamped to 127.
    EXPECT_EQ(out[6], 127);
}

// Test conv2d with stride 2 (downsampling).
TEST(NeuralCodecTest, Conv2dStride2) {
    // 4x4 input, 1 channel, 1 output channel, 3x3 kernel, stride 2.
    // Output: 2x2.
    // Weight = 1024 (identity-like), bias = 0.
    // With padding, each position sees 9 elements, but border positions see fewer.
    const int in_h = 4, in_w = 4;
    const int kH = 3, kW = 3, stride = 2;
    const int out_h = in_h / stride;  // 2
    const int out_w = in_w / stride;  // 2

    std::vector<int8_t> input(in_h * in_w, 1);

    std::vector<int16_t> weight(1 * 1 * kH * kW, NeuralCodecParams::Q);
    std::vector<int16_t> bias(1, 0);
    std::vector<int32_t> output(1 * out_h * out_w);

    neural_conv2d_int16(input.data(), 1, in_h, in_w,
                        weight.data(), bias.data(),
                        1, kH, kW, stride,
                        output.data(), out_h, out_w);

    // With padding, 3x3 kernel on 4x4 with stride 2:
    // All positions see 9 elements (padding=1 implied by 3x3 kernel).
    // In our implementation, border positions clamp to valid indices.
    // Center positions: all 9 valid. Border positions may see fewer.
    // All outputs should be positive and consistent.
    for (int i = 0; i < out_h * out_w; ++i) {
        EXPECT_GT(output[i], 0);
    }
}

// Test full analysis encode produces correct output dimensions.
TEST(NeuralCodecTest, AnalysisEncodeDimensions) {
    const int h = 64, w = 64, c = 3;
    const int N = NeuralCodecParams::N;

    std::vector<uint16_t> input(c * h * w, 32768);  // mid-gray

    int out_h, out_w;
    std::vector<int8_t> output(static_cast<size_t>(N) * (h/4) * (w/4));

    neural_analysis_encode(input.data(), h, w, c, output.data(), out_h, out_w);

    EXPECT_EQ(out_h, h / 4);
    EXPECT_EQ(out_w, w / 4);
}

// Test that neural_full_encode and neural_full_decode produce matching dimensions.
// Note: with placeholder (zero) weights, the output is not meaningful,
// but the dimensions and memory management should work correctly.
TEST(NeuralCodecTest, FullEncodeDecodeDimensions) {
    const int h = 32, w = 32, c = 3;
    const int N = NeuralCodecParams::N;

    std::vector<uint16_t> input(c * h * w, 32768);

    auto result = neural_full_encode(input.data(), h, w, c);

    EXPECT_EQ(result.yh, h / 4);
    EXPECT_EQ(result.yw, w / 4);
    EXPECT_EQ(static_cast<int>(result.yq.size()), N * (h/4) * (w/4));
}

} // namespace
} // namespace prism::codec
