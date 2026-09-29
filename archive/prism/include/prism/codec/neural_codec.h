#pragma once
#include "prism/types.h"
#include <cstdint>
#include <vector>

namespace prism::codec {

// Neural codec parameters (matching export_weights.py output).
// N, M are read from the baked data; Q is fixed at 1024.
struct NeuralCodecParams {
    static constexpr int N = 192;   // latent channels
    static constexpr int M = 192;   // hyper-latent channels
    static constexpr int C = 3;     // input channels (RGB)
    static constexpr int Q = 1024;  // fixed-point quantization factor
    static constexpr int PAD = 1;   // padding for 3x3 conv
};

// Baked weight accessors (defined in neural_codec_data.inc).
// Each function returns a pointer to the static int16 weight array.
const int16_t* baked_ga_conv0_w();
int baked_ga_conv0_w_size();
const int16_t* baked_ga_conv0_b();
int baked_ga_conv0_b_size();

const int16_t* baked_ga_conv1_w();
const int16_t* baked_ga_conv1_b();
const int16_t* baked_ga_conv2_w();
const int16_t* baked_ga_conv2_b();
const int16_t* baked_ga_conv3_w();
const int16_t* baked_ga_conv3_b();

const int16_t* baked_ha_conv0_w();
const int16_t* baked_ha_conv0_b();
const int16_t* baked_ha_conv1_w();
const int16_t* baked_ha_conv1_b();
const int16_t* baked_ha_conv2_w();
const int16_t* baked_ha_conv2_b();

const int16_t* baked_gs_conv0_w();
const int16_t* baked_gs_conv0_b();
const int16_t* baked_gs_conv1_w();
const int16_t* baked_gs_conv1_b();
const int16_t* baked_gs_conv2_w();
const int16_t* baked_gs_conv2_b();
const int16_t* baked_gs_conv3_w();
const int16_t* baked_gs_conv3_b();

const int16_t* baked_hs_conv0_w();
const int16_t* baked_hs_conv0_b();
const int16_t* baked_hs_conv1_w();
const int16_t* baked_hs_conv1_b();

const int16_t* baked_ga_gdn1_beta();
const int16_t* baked_ga_gdn2_beta();
const int16_t* baked_ga_gdn3_beta();
const int16_t* baked_ha_gdn1_beta();
const int16_t* baked_ha_gdn2_beta();
const int16_t* baked_gs_igdn1_beta();
const int16_t* baked_gs_igdn2_beta();
const int16_t* baked_gs_igdn3_beta();

// Integer convolution: int8 input, int16 weights, int32 accumulation.
// in_ch: number of input channels, out_ch: number of output channels.
// in_h, in_w: input spatial dimensions.
// out_h, out_w: output spatial dimensions (in_h/stride, in_w/stride).
// weight: [out_ch][in_ch * kH * kW] in row-major (flattened from PyTorch).
// bias: [out_ch] or nullptr.
// output: [out_ch * out_h * out_w] in CHW layout.
void neural_conv2d_int16(const int8_t* input, int in_ch, int in_h, int in_w,
                          const int16_t* weight, const int16_t* bias,
                          int out_ch, int kH, int kW, int stride,
                          int32_t* output, int out_h, int out_w);

// GDN normalization: element-wise x / sqrt(beta + x^2).
// beta: [ch] int16 Q=1024.
// input/output: [ch * h * w] in CHW layout (int8 after right-shift).
void neural_gdn(int8_t* data, int ch, int h, int w, const int16_t* beta);

// IGDN normalization: element-wise x * sqrt(beta + x^2).
void neural_igdn(int8_t* data, int ch, int h, int w, const int16_t* beta);

// ReLU activation (in-place).
void neural_relu(int8_t* data, int len);

// Quantize float to int8 with right-shift.
// scale is the reciprocal of the quantization step (Q factor applied elsewhere).
void neural_quantize_to_int8(const int32_t* data, int8_t* out, int len, int right_shift);

// Analysis network g_a: HxWxC -> H/4 x W/4 x N.
// Input: [C * H * W] uint16, range [0, 65535].
// Output: [N * (H/4) * (W/4)] int8 (quantized latent Y_q).
void neural_analysis_encode(const uint16_t* input, int h, int w, int c,
                             int8_t* output, int& out_h, int& out_w);

// Hyper-analysis network h_a: H/4 x W/4 x N -> H/8 x W/8 x M.
void neural_hyper_analysis_encode(const int8_t* input, int in_h, int in_w, int n,
                                   int8_t* output, int& out_h, int& out_w);

// Hyper-synthesis network h_s: H/8 x W/8 x M -> H/4 x W/4 x 2N.
// Output first N channels are sigma (scale), next N are bias.
void neural_hyper_synthesis_decode(const int8_t* input, int in_h, int in_w, int m,
                                    int16_t* sigma, int16_t* bias,
                                    int out_h, int out_w, int n);

// Synthesis network g_s: H/4 x W/4 x N -> HxWxC.
// Input: [N * (H/4) * (W/4)] int8 (quantized latent Y_q).
// Output: [C * H * W] uint16.
void neural_synthesis_decode(const int8_t* input, int in_h, int in_w, int n,
                              uint16_t* output, int out_h, int out_w, int c);

// Full encode: input image -> quantized latent Y_q + quantized hyper-latent Z_q.
struct NeuralCodecResult {
    std::vector<int8_t> yq;      // quantized latent [N * yh * yw]
    std::vector<int8_t> zq;      // quantized hyper-latent [M * zh * zw]
    std::vector<int16_t> sigma;  // scale from h_s [N * yh * yw]
    int yh = 0, yw = 0;         // latent spatial dims
    int zh = 0, zw = 0;         // hyper-latent spatial dims
};

NeuralCodecResult neural_full_encode(const uint16_t* input, int h, int w, int c);

// Full decode: quantized latent Y_q -> reconstructed image X_hat.
void neural_full_decode(const int8_t* yq, int yh, int yw, int n,
                         uint16_t* output, int out_h, int out_w, int c);

} // namespace prism::codec
