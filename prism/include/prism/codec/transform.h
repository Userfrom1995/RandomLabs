#pragma once
#include "prism/types.h"
#include <cstdint>
#include <vector>

namespace prism::codec {

// ----- BlockDCT: reversible integer 8x8 block DCT (spec addendum 21) -----
//
// Non-overlapping 8x8 Type-II DCT. Internally uses double precision to
// guarantee |fwd(inv(x)) - x| <= 1 for all inputs in [0, 2^BD - 1].
//
// FORMAT-UNWIRED: this module touches no container, no production path,
// and no entropy coding. It is a pure source-domain preprocessing step
// for the U-series sandbox instrument.

constexpr int DCT_BLOCK = 8;

// Forward 8x8 block DCT: src[64] -> dst[64].
// Input: pixel samples as int32.
// Output: DCT coefficients as double.
void block_dct_forward_8x8(const int32_t* src, double* dst);

// Inverse 8x8 block DCT: src[64] -> dst[64].
// Input: DCT coefficients as double.
// Output: reconstructed pixel samples as int32 (rounded).
void block_dct_inverse_8x8(const double* src, int32_t* dst);

// Apply forward 8x8 block DCT to an entire plane.
// The plane is padded with replicate edge pixels to fill partial blocks
// at right/bottom boundaries. Returns the DCT coefficients in raster
// block order: for each 8x8 block, 64 coefficients in row-major order.
// blocks_x = ceil(w / 8), blocks_y = ceil(h / 8).
// Output size: blocks_x * blocks_y * 64 coefficients.
struct DctPlaneResult {
    std::vector<double> coefficients;    // DCT coefficients, raster block order
    uint32_t blocks_x;                   // number of blocks horizontally
    uint32_t blocks_y;                   // number of blocks vertically
    uint32_t padded_w;                   // padded width (blocks_x * 8)
    uint32_t padded_h;                   // padded height (blocks_y * 8)
};

DctPlaneResult block_dct_forward_plane(const std::vector<uint16_t>& plane,
                                        uint32_t w, uint32_t h);

// Apply inverse 8x8 block DCT to reconstruct the original plane.
// Input: DCT coefficients from block_dct_forward_plane.
// Output: reconstructed pixel values (clamped to [0, max_val]).
std::vector<uint16_t> block_dct_inverse_plane(const double* coeffs,
                                               uint32_t blocks_x,
                                               uint32_t blocks_y,
                                               uint32_t orig_w,
                                               uint32_t orig_h,
                                               uint16_t max_val);

// ----- TransformDomainMED: MED prediction on DCT coefficients -----
//
// For each 8x8 block, the DCT coefficients at position (u,v) are predicted
// from their four spatial neighbors in the coefficient plane (adjacent
// blocks). The residual is coded by the existing entropy backend.

// Compute residuals in the transform domain: for each coefficient position
// (u,v), predict from W/N/NW neighbors in the block grid, compute
// residual = coefficient - prediction.
// Returns residuals in the same layout as the DCT coefficients (raster
// block order, 64 coefficients per block).
std::vector<int32_t> compute_transform_residuals(const DctPlaneResult& dct);

// Reconstruct DCT coefficients from transform-domain residuals.
// Replays the MED prediction from reconstructed history to recover
// the original coefficients.
std::vector<double> reconstruct_transform_coefficients(
    const std::vector<int32_t>& residuals,
    uint32_t blocks_x, uint32_t blocks_y);

} // namespace prism::codec
