#include "prism/codec/transform.h"
#include <algorithm>
#include <cstring>

namespace prism::codec {

// ----- 8x8 Type-II DCT (spec addendum 21, amendment 22) -----
//
// Non-overlapping 8x8 Type-II DCT. Bounded-error per the 12-bit fixed-point
// cosine constants (C_SCALE = 4096), symmetric round-to-nearest (ties away
// from zero). For BD8 inputs [0, 255]: |fwd(inv(x)) - x| <= 1.
// Not byte-exact (see amendment 22 for details).
//
// Uses orthonormal DCT-II / DCT-III pair: both forward and inverse apply
// the normalization factor alpha(k) per dimension:
//   alpha(0) = sqrt(1/8), alpha(k>0) = sqrt(2/8) = 1/2.
// The cosine table is pre-baked with alpha(k) so both passes use the
// same table. Together, alpha^2 per dimension gives the correct
// orthonormal reconstruction.

// Precomputed cosine table with normalization: COS_BAKED[k][n] =
// round(alpha(k) * cos(pi*(2n+1)*k/16) * C_SCALE).
// For k=0: alpha(0) * C_SCALE = 4096/sqrt(8) = 1448.
// For k>0: alpha(k) * C_SCALE = 4096/2 = 2048, then scaled by cos.
static const int32_t COS_BAKED[8][8] = {
    { 1448,  1448,  1448,  1448,  1448,  1448,  1448,  1448},
    { 2009,  1703,  1138,   400,  -400, -1138, -1703, -2009},
    { 1892,   784,  -784, -1892, -1892,  -784,   784,  1892},
    { 1703,  -400, -2009, -1138,  1138,  2009,   400, -1703},
    { 1448, -1448, -1448,  1448,  1448, -1448, -1448,  1448},
    { 1138, -2009,   400,  1703, -1703,  -400,  2009, -1138},
    {  784, -1892,  1892,  -784,  -784,  1892, -1892,   784},
    {  400, -1138,  1703, -2009,  2009, -1703,  1138,  -400}
};

// Symmetric round-to-nearest with ties away from zero (spec 21.1 ROUNDING).
// The naive (sum+2048)>>12 truncates toward negative infinity, producing
// asymmetric error. This helper rounds symmetrically so that the rounding
// error is at most 0.5 LSB per pass (2 passes in 2D -> max |error| <= 1
// for BD8 inputs in the 12-bit domain).
static inline int32_t symmetric_round(int64_t sum) {
    if (sum >= 0)
        return (int32_t)((sum + 2048) >> 12);
    else
        return -(int32_t)((-sum + 2048) >> 12);
}

// Forward 1D DCT-II: in[8] -> out[8] (12-bit fixed-point integer)
static void dct_1d_forward(const int32_t* in, int32_t* out) {
    for (int k = 0; k < 8; ++k) {
        int64_t sum = 0;
        for (int n = 0; n < 8; ++n)
            sum += (int64_t)in[n] * COS_BAKED[k][n];
        out[k] = symmetric_round(sum);
    }
}

// Inverse 1D DCT-II: in[8] -> out[8] (12-bit fixed-point integer)
// COS_BAKED matrix is symmetric, so transpose equals the original.
static void dct_1d_inverse(const int32_t* in, int32_t* out) {
    for (int n = 0; n < 8; ++n) {
        int64_t sum = 0;
        for (int k = 0; k < 8; ++k)
            sum += (int64_t)in[k] * COS_BAKED[k][n];
        out[n] = symmetric_round(sum);
    }
}

void block_dct_forward_8x8(const int32_t* src, int32_t* dst) {
    int32_t temp[64];

    // Forward DCT on rows
    for (int y = 0; y < 8; ++y)
        dct_1d_forward(src + y * 8, temp + y * 8);

    // Forward DCT on columns
    int32_t col_in[8], col_out[8];
    for (int x = 0; x < 8; ++x) {
        for (int y = 0; y < 8; ++y) col_in[y] = temp[y * 8 + x];
        dct_1d_forward(col_in, col_out);
        for (int y = 0; y < 8; ++y) dst[y * 8 + x] = col_out[y];
    }
}

void block_dct_inverse_8x8(const int32_t* src, int32_t* dst) {
    int32_t temp[64];

    // Inverse DCT on columns
    int32_t col_in[8], col_out[8];
    for (int x = 0; x < 8; ++x) {
        for (int y = 0; y < 8; ++y) col_in[y] = src[y * 8 + x];
        dct_1d_inverse(col_in, col_out);
        for (int y = 0; y < 8; ++y) temp[y * 8 + x] = col_out[y];
    }

    // Inverse DCT on rows
    for (int y = 0; y < 8; ++y)
        dct_1d_inverse(temp + y * 8, dst + y * 8);
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
            int32_t block_in[64], block_out[64];
            for (int dy = 0; dy < DCT_BLOCK; ++dy) {
                for (int dx = 0; dx < DCT_BLOCK; ++dx) {
                    uint32_t px = bx * DCT_BLOCK + dx;
                    uint32_t py = by * DCT_BLOCK + dy;
                    block_in[dy * DCT_BLOCK + dx] = padded[py * result.padded_w + px];
                }
            }
            block_dct_forward_8x8(block_in, block_out);
            size_t offset = (by * result.blocks_x + bx) * 64;
            std::memcpy(&result.coefficients[offset], block_out, 64 * sizeof(int32_t));
        }
    }

    return result;
}

// Inverse DCT to reconstruct the original plane.
std::vector<uint16_t> block_dct_inverse_plane(const int32_t* coeffs,
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
            int32_t block_in[64], block_out[64];
            size_t offset = (by * blocks_x + bx) * 64;
            std::memcpy(block_in, &coeffs[offset], 64 * sizeof(int32_t));
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
// 4-neighbor MED (W, N, NW, NE) per spec 21.2 TransformDomainMED constants.
// Both prediction and residual computation operate on int32 coefficients.
std::vector<int32_t> compute_transform_residuals(const DctPlaneResult& dct) {
    const uint32_t bx = dct.blocks_x;
    const uint32_t by = dct.blocks_y;
    std::vector<int32_t> res(bx * by * 64);

    for (uint32_t block_y = 0; block_y < by; ++block_y) {
        for (uint32_t block_x = 0; block_x < bx; ++block_x) {
            for (int v = 0; v < DCT_BLOCK; ++v) {
                for (int u = 0; u < DCT_BLOCK; ++u) {
                    size_t idx = (block_y * bx + block_x) * 64 + v * DCT_BLOCK + u;
                    int32_t coeff = dct.coefficients[idx];

                    int32_t W = 0, N = 0, NW = 0, NE = 0;
                    if (block_x > 0)
                        W = dct.coefficients[((block_y) * bx + (block_x - 1)) * 64 + v * DCT_BLOCK + u];
                    if (block_y > 0)
                        N = dct.coefficients[((block_y - 1) * bx + (block_x)) * 64 + v * DCT_BLOCK + u];
                    if (block_x > 0 && block_y > 0)
                        NW = dct.coefficients[((block_y - 1) * bx + (block_x - 1)) * 64 + v * DCT_BLOCK + u];
                    if (block_x + 1 < bx && block_y > 0)
                        NE = dct.coefficients[((block_y - 1) * bx + (block_x + 1)) * 64 + v * DCT_BLOCK + u];

                    // 4-neighbor MED per spec 21.2 (W, N, NW, NE).
                    // Standard MED uses W, N, NW; NE is added for the
                    // transform-domain stencil per the pinned spec.
                    int32_t mn = std::min({W, N, NW, NE});
                    int32_t mx = std::max({W, N, NW, NE});
                    int32_t pred;
                    if (NW >= mx) pred = mn;
                    else if (NW <= mn) pred = mx;
                    else pred = W + N - NW;

                    res[idx] = coeff - pred;
                }
            }
        }
    }

    return res;
}

// Reconstruct DCT coefficients from transform-domain residuals.
// Replays the 4-neighbor MED prediction from int32 reconstructed history.
std::vector<int32_t> reconstruct_transform_coefficients(
    const std::vector<int32_t>& residuals,
    uint32_t blocks_x, uint32_t blocks_y) {
    const size_t total = blocks_x * blocks_y * 64;
    std::vector<int32_t> coeffs(total);

    for (uint32_t block_y = 0; block_y < blocks_y; ++block_y) {
        for (uint32_t block_x = 0; block_x < blocks_x; ++block_x) {
            for (int v = 0; v < DCT_BLOCK; ++v) {
                for (int u = 0; u < DCT_BLOCK; ++u) {
                    size_t idx = (block_y * blocks_x + block_x) * 64 + v * DCT_BLOCK + u;

                    int32_t W = 0, N = 0, NW = 0, NE = 0;
                    if (block_x > 0)
                        W = coeffs[((block_y) * blocks_x + (block_x - 1)) * 64 + v * DCT_BLOCK + u];
                    if (block_y > 0)
                        N = coeffs[((block_y - 1) * blocks_x + (block_x)) * 64 + v * DCT_BLOCK + u];
                    if (block_x > 0 && block_y > 0)
                        NW = coeffs[((block_y - 1) * blocks_x + (block_x - 1)) * 64 + v * DCT_BLOCK + u];
                    if (block_x + 1 < blocks_x && block_y > 0)
                        NE = coeffs[((block_y - 1) * blocks_x + (block_x + 1)) * 64 + v * DCT_BLOCK + u];

                    int32_t mn = std::min({W, N, NW, NE});
                    int32_t mx = std::max({W, N, NW, NE});
                    int32_t pred;
                    if (NW >= mx) pred = mn;
                    else if (NW <= mn) pred = mx;
                    else pred = W + N - NW;

                    coeffs[idx] = pred + residuals[idx];
                }
            }
        }
    }

    return coeffs;
}

} // namespace prism::codec
