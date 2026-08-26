#include "prism/codec/transform.h"
#include <algorithm>
#include <cmath>
#include <cstring>

namespace prism::codec {

// ----- 8x8 Type-II DCT (spec addendum 21) -----
//
// Non-overlapping 8x8 Type-II DCT. Internally uses double precision
// throughout. The round-trip error is bounded by +/- 1 per sample
// due to final rounding to int32.

// Forward 1D DCT-II: in[8] -> out[8] (double precision)
static void dct_1d_forward(const double* in, double* out) {
    for (int k = 0; k < 8; ++k) {
        double sum = 0.0;
        for (int n = 0; n < 8; ++n) {
            sum += in[n] * std::cos(M_PI * (2 * n + 1) * k / 16.0);
        }
        double Ck = (k == 0) ? (1.0 / std::sqrt(2.0)) : 1.0;
        out[k] = Ck * sum * 0.5;
    }
}

// Inverse 1D DCT-II: in[8] -> out[8] (double precision)
static void dct_1d_inverse(const double* in, double* out) {
    for (int n = 0; n < 8; ++n) {
        double sum = 0.0;
        for (int k = 0; k < 8; ++k) {
            double Ck = (k == 0) ? (1.0 / std::sqrt(2.0)) : 1.0;
            sum += Ck * in[k] * std::cos(M_PI * (2 * n + 1) * k / 16.0);
        }
        out[n] = sum * 0.5;
    }
}

void block_dct_forward_8x8(const int32_t* src, double* dst) {
    double in_f[64], temp[64];

    for (int i = 0; i < 64; ++i) in_f[i] = (double)src[i];

    // Forward DCT on rows
    for (int y = 0; y < 8; ++y)
        dct_1d_forward(in_f + y * 8, temp + y * 8);

    // Forward DCT on columns
    double col_in[8], col_out[8];
    for (int x = 0; x < 8; ++x) {
        for (int y = 0; y < 8; ++y) col_in[y] = temp[y * 8 + x];
        dct_1d_forward(col_in, col_out);
        for (int y = 0; y < 8; ++y) dst[y * 8 + x] = col_out[y];
    }
}

void block_dct_inverse_8x8(const double* src, int32_t* dst) {
    double in_f[64], temp[64], out_f[64];

    for (int i = 0; i < 64; ++i) in_f[i] = src[i];

    // Inverse DCT on columns
    double col_in[8], col_out[8];
    for (int x = 0; x < 8; ++x) {
        for (int y = 0; y < 8; ++y) col_in[y] = in_f[y * 8 + x];
        dct_1d_inverse(col_in, col_out);
        for (int y = 0; y < 8; ++y) temp[y * 8 + x] = col_out[y];
    }

    // Inverse DCT on rows
    for (int y = 0; y < 8; ++y)
        dct_1d_inverse(temp + y * 8, out_f + y * 8);

    for (int i = 0; i < 64; ++i)
        dst[i] = (int32_t)std::round(out_f[i]);
}

// Forward DCT on an entire plane with replicate border padding.
DctPlaneResult block_dct_forward_plane(const std::vector<uint16_t>& plane,
                                        uint32_t w, uint32_t h) {
    DctPlaneResult result;
    result.blocks_x = (w + DCT_BLOCK - 1) / DCT_BLOCK;
    result.blocks_y = (h + DCT_BLOCK - 1) / DCT_BLOCK;
    result.padded_w = result.blocks_x * DCT_BLOCK;
    result.padded_h = result.blocks_y * DCT_BLOCK;
    result.coefficients.resize(result.blocks_x * result.blocks_y * 64);

    // Build padded plane with replicate border
    std::vector<int32_t> padded(result.padded_w * result.padded_h);
    for (uint32_t py = 0; py < result.padded_h; ++py) {
        uint32_t sy = std::min(py, h - 1);
        for (uint32_t px = 0; px < result.padded_w; ++px) {
            uint32_t sx = std::min(px, w - 1);
            padded[py * result.padded_w + px] = (int32_t)plane[sy * w + sx];
        }
    }

    // Apply 8x8 block DCT
    for (uint32_t by = 0; by < result.blocks_y; ++by) {
        for (uint32_t bx = 0; bx < result.blocks_x; ++bx) {
            int32_t block_in[64];
            double block_out[64];
            for (int dy = 0; dy < DCT_BLOCK; ++dy) {
                for (int dx = 0; dx < DCT_BLOCK; ++dx) {
                    uint32_t px = bx * DCT_BLOCK + dx;
                    uint32_t py = by * DCT_BLOCK + dy;
                    block_in[dy * DCT_BLOCK + dx] = padded[py * result.padded_w + px];
                }
            }
            block_dct_forward_8x8(block_in, block_out);
            size_t offset = (by * result.blocks_x + bx) * 64;
            std::memcpy(&result.coefficients[offset], block_out, 64 * sizeof(double));
        }
    }

    return result;
}

// Inverse DCT to reconstruct the original plane.
std::vector<uint16_t> block_dct_inverse_plane(const double* coeffs,
                                               uint32_t blocks_x,
                                               uint32_t blocks_y,
                                               uint32_t orig_w,
                                               uint32_t orig_h,
                                               uint16_t max_val) {
    uint32_t padded_w = blocks_x * DCT_BLOCK;
    uint32_t padded_h = blocks_y * DCT_BLOCK;
    std::vector<int32_t> reconstructed(padded_w * padded_h);

    for (uint32_t by = 0; by < blocks_y; ++by) {
        for (uint32_t bx = 0; bx < blocks_x; ++bx) {
            double block_in[64];
            int32_t block_out[64];
            size_t offset = (by * blocks_x + bx) * 64;
            std::memcpy(block_in, &coeffs[offset], 64 * sizeof(double));
            block_dct_inverse_8x8(block_in, block_out);
            for (int dy = 0; dy < DCT_BLOCK; ++dy) {
                for (int dx = 0; dx < DCT_BLOCK; ++dx) {
                    uint32_t px = bx * DCT_BLOCK + dx;
                    uint32_t py = by * DCT_BLOCK + dy;
                    reconstructed[py * padded_w + px] = block_out[dy * DCT_BLOCK + dx];
                }
            }
        }
    }

    std::vector<uint16_t> result(orig_w * orig_h);
    for (uint32_t y = 0; y < orig_h; ++y) {
        for (uint32_t x = 0; x < orig_w; ++x) {
            int32_t val = std::clamp(reconstructed[y * padded_w + x],
                                      0, (int32_t)max_val);
            result[y * orig_w + x] = (uint16_t)val;
        }
    }

    return result;
}

// Compute residuals in the transform domain using MED prediction.
std::vector<int32_t> compute_transform_residuals(const DctPlaneResult& dct) {
    const uint32_t bx = dct.blocks_x;
    const uint32_t by = dct.blocks_y;
    std::vector<int32_t> res(bx * by * 64);

    for (uint32_t block_y = 0; block_y < by; ++block_y) {
        for (uint32_t block_x = 0; block_x < bx; ++block_x) {
            for (int v = 0; v < DCT_BLOCK; ++v) {
                for (int u = 0; u < DCT_BLOCK; ++u) {
                    size_t idx = (block_y * bx + block_x) * 64 + v * DCT_BLOCK + u;
                    int32_t coeff = (int32_t)std::round(dct.coefficients[idx]);

                    int32_t W = 0, N = 0, NW = 0;
                    if (block_x > 0)
                        W = (int32_t)std::round(dct.coefficients[((block_y) * bx + (block_x - 1)) * 64 + v * DCT_BLOCK + u]);
                    if (block_y > 0)
                        N = (int32_t)std::round(dct.coefficients[((block_y - 1) * bx + (block_x)) * 64 + v * DCT_BLOCK + u]);
                    if (block_x > 0 && block_y > 0)
                        NW = (int32_t)std::round(dct.coefficients[((block_y - 1) * bx + (block_x - 1)) * 64 + v * DCT_BLOCK + u]);

                    int32_t pred;
                    if (NW >= std::max(W, N)) pred = std::min(W, N);
                    else if (NW <= std::min(W, N)) pred = std::max(W, N);
                    else pred = W + N - NW;

                    res[idx] = coeff - pred;
                }
            }
        }
    }

    return res;
}

// Reconstruct DCT coefficients from transform-domain residuals.
std::vector<double> reconstruct_transform_coefficients(
    const std::vector<int32_t>& residuals,
    uint32_t blocks_x, uint32_t blocks_y) {
    const size_t total = blocks_x * blocks_y * 64;
    std::vector<double> coeffs(total);

    for (uint32_t block_y = 0; block_y < blocks_y; ++block_y) {
        for (uint32_t block_x = 0; block_x < blocks_x; ++block_x) {
            for (int v = 0; v < DCT_BLOCK; ++v) {
                for (int u = 0; u < DCT_BLOCK; ++u) {
                    size_t idx = (block_y * blocks_x + block_x) * 64 + v * DCT_BLOCK + u;

                    double W = 0, N = 0, NW = 0;
                    if (block_x > 0)
                        W = coeffs[((block_y) * blocks_x + (block_x - 1)) * 64 + v * DCT_BLOCK + u];
                    if (block_y > 0)
                        N = coeffs[((block_y - 1) * blocks_x + (block_x)) * 64 + v * DCT_BLOCK + u];
                    if (block_x > 0 && block_y > 0)
                        NW = coeffs[((block_y - 1) * blocks_x + (block_x - 1)) * 64 + v * DCT_BLOCK + u];

                    double pred;
                    if (NW >= std::max(W, N)) pred = std::min(W, N);
                    else if (NW <= std::min(W, N)) pred = std::max(W, N);
                    else pred = W + N - NW;

                    coeffs[idx] = pred + residuals[idx];
                }
            }
        }
    }

    return coeffs;
}

} // namespace prism::codec
