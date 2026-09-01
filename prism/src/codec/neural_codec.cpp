// Neural codec integer inference engine (E1, issue #226).
//
// Full neural codec end-to-end with int16 fixed-point (Q=1024) arithmetic.
// Architecture: g_a -> quantize -> h_a -> quantize -> h_s -> g_s.
// The analysis network learns a complete representation that jointly optimizes
// for decorrelation and rate-distortion trade-off.

#include "prism/codec/neural_codec.h"
#include "neural_codec_data.inc"  // baked int16 weights
#include <algorithm>
#include <cmath>
#include <cstring>
#include <stdexcept>

namespace prism::codec {

// -----------------------------------------------------------------------
// Fixed-point helpers
// -----------------------------------------------------------------------

namespace {
// Floor-division for signed integers (towards negative infinity).
inline int32_t fdivQ(int32_t x) {
    int32_t r = x / NeuralCodecParams::Q;
    if ((x % NeuralCodecParams::Q) != 0 && x < 0) --r;
    return r;
}

// Arithmetic right shift (preserves sign).
inline int32_t asr(int32_t x, int shift) {
    return x >> shift;
}

// Clamp to int8 range.
inline int8_t clamp_i8(int32_t x) {
    return static_cast<int8_t>(std::max(-128, std::min(127, x)));
}

// Clamp to uint16 range.
inline uint16_t clamp_u16(int32_t x) {
    return static_cast<uint16_t>(std::max(0, std::min(65535, x)));
}
} // namespace

// -----------------------------------------------------------------------
// Integer convolution
// -----------------------------------------------------------------------

void neural_conv2d_int16(const int8_t* input, int in_ch, int in_h, int in_w,
                          const int16_t* weight, const int16_t* bias,
                          int out_ch, int kH, int kW, int stride,
                          int32_t* output, int out_h, int out_w) {
    // Weight layout: [out_ch][in_ch * kH * kW] (row-major, matching PyTorch conv2d).
    // Input layout: [in_ch][in_h * in_w] (CHW).
    // Output layout: [out_ch][out_h * out_w] (CHW).
    for (int oc = 0; oc < out_ch; ++oc) {
        const int16_t* w_oc = weight + oc * in_ch * kH * kW;
        int32_t b_val = bias ? static_cast<int32_t>(bias[oc]) : 0;

        for (int oh = 0; oh < out_h; ++oh) {
            for (int ow = 0; ow < out_w; ++ow) {
                int32_t acc = b_val;

                for (int ic = 0; ic < in_ch; ++ic) {
                    const int8_t* in_ch_data = input + ic * in_h * in_w;
                    const int16_t* w_ic = w_oc + ic * kH * kW;

                    for (int kh = 0; kh < kH; ++kh) {
                        int ih = oh * stride + kh;
                        if (ih < 0 || ih >= in_h) continue;

                        for (int kw = 0; kw < kW; ++kw) {
                            int iw = ow * stride + kw;
                            if (iw < 0 || iw >= in_w) continue;

                            int32_t in_val = static_cast<int32_t>(in_ch_data[ih * in_w + iw]);
                            int32_t w_val = static_cast<int32_t>(w_ic[kh * kW + kw]);
                            acc += in_val * w_val;
                        }
                    }
                }

                output[oc * out_h * out_w + oh * out_w + ow] = acc;
            }
        }
    }
}

// -----------------------------------------------------------------------
// GDN / IGDN normalization
// -----------------------------------------------------------------------

void neural_gdn(int8_t* data, int ch, int h, int w, const int16_t* beta) {
    int plane_size = h * w;
    for (int c = 0; c < ch; ++c) {
        int32_t b = static_cast<int32_t>(beta[c]);
        int8_t* ch_data = data + c * plane_size;
        for (int i = 0; i < plane_size; ++i) {
            int32_t x = static_cast<int32_t>(ch_data[i]);
            // GDN: output = x / sqrt(beta + x^2)
            // All in Q=1024 fixed-point.
            int32_t x2 = x * x / NeuralCodecParams::Q;
            int32_t denom = b + x2;
            if (denom <= 0) denom = 1;
            // sqrt in fixed-point: use float approximation then convert back.
            float denom_f = static_cast<float>(denom) / NeuralCodecParams::Q;
            float sqrt_val = std::sqrt(denom_f);
            int32_t sqrt_q = static_cast<int32_t>(sqrt_val * NeuralCodecParams::Q);
            if (sqrt_q <= 0) sqrt_q = 1;
            // x * Q / sqrt_q (all in Q domain)
            int32_t result = (x * NeuralCodecParams::Q) / sqrt_q;
            ch_data[i] = clamp_i8(result);
        }
    }
}

void neural_igdn(int8_t* data, int ch, int h, int w, const int16_t* beta) {
    int plane_size = h * w;
    for (int c = 0; c < ch; ++c) {
        int32_t b = static_cast<int32_t>(beta[c]);
        int8_t* ch_data = data + c * plane_size;
        for (int i = 0; i < plane_size; ++i) {
            int32_t x = static_cast<int32_t>(ch_data[i]);
            // IGDN: output = x * sqrt(beta + x^2)
            int32_t x2 = x * x / NeuralCodecParams::Q;
            int32_t denom = b + x2;
            if (denom <= 0) denom = 1;
            float denom_f = static_cast<float>(denom) / NeuralCodecParams::Q;
            float sqrt_val = std::sqrt(denom_f);
            int32_t sqrt_q = static_cast<int32_t>(sqrt_val * NeuralCodecParams::Q);
            int32_t result = (x * sqrt_q) / NeuralCodecParams::Q;
            ch_data[i] = clamp_i8(result);
        }
    }
}

void neural_relu(int8_t* data, int len) {
    for (int i = 0; i < len; ++i) {
        if (data[i] < 0) data[i] = 0;
    }
}

void neural_quantize_to_int8(const int32_t* data, int8_t* out, int len, int right_shift) {
    for (int i = 0; i < len; ++i) {
        int32_t val = asr(data[i], right_shift);
        out[i] = clamp_i8(val);
    }
}

// -----------------------------------------------------------------------
// Analysis network g_a: HxWxC -> H/4 x W/4 x N
// -----------------------------------------------------------------------

namespace {
void run_conv_gdn(const int8_t* in, int in_ch, int in_h, int in_w,
                   int out_ch, int stride,
                   const int16_t* weight, const int16_t* bias, const int16_t* gdn_beta,
                   int8_t* out, int& out_h, int& out_w) {
    out_h = in_h / stride;
    out_w = in_w / stride;
    std::vector<int32_t> conv_out(static_cast<size_t>(out_ch) * out_h * out_w);
    neural_conv2d_int16(in, in_ch, in_h, in_w, weight, bias,
                        out_ch, 3, 3, stride,
                        conv_out.data(), out_h, out_w);
    // Quantize int32 -> int8 (right shift by log2(Q) = 10)
    neural_quantize_to_int8(conv_out.data(), out, out_ch * out_h * out_w, 10);
    // GDN
    if (gdn_beta) {
        neural_gdn(out, out_ch, out_h, out_w, gdn_beta);
    }
}
} // namespace

void neural_analysis_encode(const uint16_t* input, int h, int w, int c,
                             int8_t* output, int& out_h, int& out_w) {
    // Convert uint16 [0,65535] to int8 [-128,127] (simple scaling).
    int plane_size = h * w;
    std::vector<int8_t> buf(static_cast<size_t>(c) * plane_size);
    for (int i = 0; i < c * plane_size; ++i) {
        // Map [0, 65535] -> [-128, 127]
        buf[i] = static_cast<int8_t>((input[i] >> 8) - 128);
    }

    int cur_h = h, cur_w = w;
    int cur_ch = c;
    const int8_t* cur_in = buf.data();

    // Layer 0: Conv2d(c, 128, 3, stride=2) + GDN
    std::vector<int8_t> layer0(128 * (cur_h/2) * (cur_w/2));
    run_conv_gdn(cur_in, cur_ch, cur_h, cur_w, 128, 2,
                 baked_ga_conv0_w(), baked_ga_conv0_b(), baked_ga_gdn1_beta(),
                 layer0.data(), cur_h, cur_w);
    cur_ch = 128;
    cur_in = layer0.data();

    // Layer 1: Conv2d(128, 128, 3, stride=1) + GDN
    std::vector<int8_t> layer1(128 * cur_h * cur_w);
    run_conv_gdn(cur_in, cur_ch, cur_h, cur_w, 128, 1,
                 baked_ga_conv1_w(), baked_ga_conv1_b(), baked_ga_gdn2_beta(),
                 layer1.data(), cur_h, cur_w);
    cur_in = layer1.data();

    // Layer 2: Conv2d(128, 128, 3, stride=2) + GDN
    std::vector<int8_t> layer2(128 * (cur_h/2) * (cur_w/2));
    run_conv_gdn(cur_in, cur_ch, cur_h, cur_w, 128, 2,
                 baked_ga_conv2_w(), baked_ga_conv2_b(), baked_ga_gdn3_beta(),
                 layer2.data(), cur_h, cur_w);
    cur_in = layer2.data();

    // Layer 3: Conv2d(128, N, 3, stride=1) - no GDN on output
    int N = NeuralCodecParams::N;
    std::vector<int32_t> layer3_out(static_cast<size_t>(N) * cur_h * cur_w);
    neural_conv2d_int16(cur_in, 128, cur_h, cur_w, baked_ga_conv3_w(), baked_ga_conv3_b(),
                        N, 3, 3, 1, layer3_out.data(), cur_h, cur_w);
    neural_quantize_to_int8(layer3_out.data(), output, N * cur_h * cur_w, 10);

    out_h = cur_h;
    out_w = cur_w;
}

// -----------------------------------------------------------------------
// Hyper-analysis network h_a: H/4 x W/4 x N -> H/8 x W/8 x M
// -----------------------------------------------------------------------

void neural_hyper_analysis_encode(const int8_t* input, int in_h, int in_w, int n,
                                   int8_t* output, int& out_h, int& out_w) {
    int cur_h = in_h, cur_w = in_w;
    int cur_ch = n;
    const int8_t* cur_in = input;

    // Layer 0: Conv2d(N, 128, 3, stride=1) + GDN
    std::vector<int8_t> layer0(128 * cur_h * cur_w);
    run_conv_gdn(cur_in, cur_ch, cur_h, cur_w, 128, 1,
                 baked_ha_conv0_w(), baked_ha_conv0_b(), baked_ha_gdn1_beta(),
                 layer0.data(), cur_h, cur_w);
    cur_ch = 128;
    cur_in = layer0.data();

    // Layer 1: Conv2d(128, 128, 3, stride=2) + GDN
    std::vector<int8_t> layer1(128 * (cur_h/2) * (cur_w/2));
    run_conv_gdn(cur_in, cur_ch, cur_h, cur_w, 128, 2,
                 baked_ha_conv1_w(), baked_ha_conv1_b(), baked_ha_gdn2_beta(),
                 layer1.data(), cur_h, cur_w);
    cur_in = layer1.data();

    // Layer 2: Conv2d(128, M, 3, stride=1) - no GDN
    int M = NeuralCodecParams::M;
    std::vector<int32_t> layer2_out(static_cast<size_t>(M) * cur_h * cur_w);
    neural_conv2d_int16(cur_in, 128, cur_h, cur_w, baked_ha_conv2_w(), baked_ha_conv2_b(),
                        M, 3, 3, 1, layer2_out.data(), cur_h, cur_w);
    neural_quantize_to_int8(layer2_out.data(), output, M * cur_h * cur_w, 10);

    out_h = cur_h;
    out_w = cur_w;
}

// -----------------------------------------------------------------------
// Hyper-synthesis network h_s: H/8 x W/8 x M -> H/4 x W/4 x 2N
// -----------------------------------------------------------------------

void neural_hyper_synthesis_decode(const int8_t* input, int in_h, int in_w, int m,
                                    int16_t* sigma, int16_t* bias,
                                    int /*out_h*/, int /*out_w*/, int n) {
    int cur_h = in_h, cur_w = in_w;
    int cur_ch = m;
    const int8_t* cur_in = input;

    // Layer 0: Conv2d(M, 32, 3, stride=1) + ReLU
    std::vector<int8_t> layer0(32 * cur_h * cur_w);
    run_conv_gdn(cur_in, cur_ch, cur_h, cur_w, 32, 1,
                 baked_hs_conv0_w(), baked_hs_conv0_b(), nullptr,
                 layer0.data(), cur_h, cur_w);
    neural_relu(layer0.data(), 32 * cur_h * cur_w);
    cur_ch = 32;
    cur_in = layer0.data();

    // Layer 1: Conv2d(32, 2N, 3, stride=1) - no activation
    int total_out = 2 * n;
    std::vector<int32_t> layer1_out(static_cast<size_t>(total_out) * cur_h * cur_w);
    neural_conv2d_int16(cur_in, 32, cur_h, cur_w, baked_hs_conv1_w(), baked_hs_conv1_b(),
                        total_out, 3, 3, 1, layer1_out.data(), cur_h, cur_w);

    // Scale to match output spatial dims if needed
    // (upsample from in_h x in_w to out_h x out_w if stride was 2 somewhere)
    // h_s doesn't have strided layers, so cur_h/in_h should match.

    // Split into sigma and bias, apply exp to sigma.
    int plane = cur_h * cur_w;
    for (int i = 0; i < n * plane; ++i) {
        // sigma: exp(value) in fixed-point
        int32_t val = layer1_out[i];
        float val_f = static_cast<float>(val) / NeuralCodecParams::Q;
        float exp_val = std::exp(val_f);
        sigma[i] = static_cast<int16_t>(std::max(-32768.0f, std::min(32767.0f,
                    exp_val * NeuralCodecParams::Q)));
    }
    for (int i = 0; i < n * plane; ++i) {
        bias[i] = static_cast<int16_t>(layer1_out[n * plane + i]);
    }
}

// -----------------------------------------------------------------------
// Synthesis network g_s: H/4 x W/4 x N -> HxWxC
// -----------------------------------------------------------------------

void neural_synthesis_decode(const int8_t* input, int in_h, int in_w, int n,
                              uint16_t* output, int /*out_h*/, int /*out_w*/, int c) {
    int cur_h = in_h, cur_w = in_w;
    int cur_ch = n;
    const int8_t* cur_in = input;

    // Layer 0: Conv2d(N, 128, 3, stride=1) + IGDN
    std::vector<int8_t> layer0(128 * cur_h * cur_w);
    run_conv_gdn(cur_in, cur_ch, cur_h, cur_w, 128, 1,
                 baked_gs_conv0_w(), baked_gs_conv0_b(), baked_gs_igdn1_beta(),
                 layer0.data(), cur_h, cur_w);
    cur_ch = 128;
    cur_in = layer0.data();

    // Layer 1: ConvTranspose2d(128, 128, 3, stride=2) + IGDN
    int new_h = cur_h * 2;
    int new_w = cur_w * 2;
    // ConvTranspose2d is implemented as conv2d with inverted stride and padded input.
    // For simplicity, we upsample then apply regular conv.
    std::vector<int8_t> upsampled(128 * new_h * new_w);
    // Nearest-neighbor upsample
    for (int ch = 0; ch < 128; ++ch) {
        for (int oh = 0; oh < new_h; ++oh) {
            int ih = oh / 2;
            for (int ow = 0; ow < new_w; ++ow) {
                int iw = ow / 2;
                upsampled[ch * new_h * new_w + oh * new_w + ow] =
                    cur_in[ch * cur_h * cur_w + ih * cur_w + iw];
            }
        }
    }
    std::vector<int8_t> layer1(128 * new_h * new_w);
    run_conv_gdn(upsampled.data(), 128, new_h, new_w, 128, 1,
                 baked_gs_conv1_w(), baked_gs_conv1_b(), baked_gs_igdn2_beta(),
                 layer1.data(), cur_h, cur_w);
    cur_in = layer1.data();

    // Layer 2: Conv2d(128, 128, 3, stride=1) + IGDN
    std::vector<int8_t> layer2(128 * cur_h * cur_w);
    run_conv_gdn(cur_in, 128, cur_h, cur_w, 128, 1,
                 baked_gs_conv2_w(), baked_gs_conv2_b(), baked_gs_igdn3_beta(),
                 layer2.data(), cur_h, cur_w);
    cur_in = layer2.data();

    // Layer 3: ConvTranspose2d(128, C, 3, stride=2) - final output
    new_h = cur_h * 2;
    new_w = cur_w * 2;
    std::vector<int8_t> upsampled2(128 * new_h * new_w);
    for (int ch = 0; ch < 128; ++ch) {
        for (int oh = 0; oh < new_h; ++oh) {
            int ih = oh / 2;
            for (int ow = 0; ow < new_w; ++ow) {
                int iw = ow / 2;
                upsampled2[ch * new_h * new_w + oh * new_w + ow] =
                    cur_in[ch * cur_h * cur_w + ih * cur_w + iw];
            }
        }
    }
    std::vector<int32_t> layer3_out(static_cast<size_t>(c) * new_h * new_w);
    neural_conv2d_int16(upsampled2.data(), 128, new_h, new_w,
                        baked_gs_conv3_w(), baked_gs_conv3_b(),
                        c, 3, 3, 1, layer3_out.data(), new_h, new_w);

    // Convert int32 output to uint16 [0, 65535].
    // Reverse the int8 mapping: x_int8 = (x_u16 >> 8) - 128
    // So x_u16 = (x_int8 + 128) << 8
    for (int i = 0; i < c * new_h * new_w; ++i) {
        int32_t val = asr(layer3_out[i], 10);  // right shift by Q
        val = val + 128;  // reverse offset
        output[i] = clamp_u16(val << 8);  // scale back to uint16
    }
}

// -----------------------------------------------------------------------
// Full encode / decode
// -----------------------------------------------------------------------

NeuralCodecResult neural_full_encode(const uint16_t* input, int h, int w, int c) {
    NeuralCodecResult result;
    int N = NeuralCodecParams::N;
    int M = NeuralCodecParams::M;

    // g_a: encode image to latent
    int yh, yw;
    result.yq.resize(static_cast<size_t>(N) * (h/4) * (w/4));
    neural_analysis_encode(input, h, w, c, result.yq.data(), yh, yw);
    result.yh = yh;
    result.yw = yw;

    // Quantize latent: Y_q = round(Y + 0.5) - already done in int8 via quantize_to_int8.
    // For true lossless, we'd need the float intermediate. Here we use the int8 quantized.

    // h_a: encode latent to hyper-latent
    int zh, zw;
    result.zq.resize(static_cast<size_t>(M) * (yh/2) * (yw/2));
    neural_hyper_analysis_encode(result.yq.data(), yh, yw, N,
                                 result.zq.data(), zh, zw);
    result.zh = zh;
    result.zw = zw;

    // h_s: decode hyper-latent to scale/bias
    result.sigma.resize(static_cast<size_t>(N) * yh * yw);
    std::vector<int16_t> bias(N * yh * yw);
    neural_hyper_synthesis_decode(result.zq.data(), zh, zw, M,
                                  result.sigma.data(), bias.data(),
                                  yh, yw, N);

    return result;
}

void neural_full_decode(const int8_t* yq, int yh, int yw, int n,
                         uint16_t* output, int out_h, int out_w, int c) {
    neural_synthesis_decode(yq, yh, yw, n, output, out_h, out_w, c);
}

} // namespace prism::codec
