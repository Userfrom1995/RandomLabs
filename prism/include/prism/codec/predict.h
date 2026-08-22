#pragma once
#include "prism/types.h"
#include <cstdint>

namespace prism::codec {

// Predictor ids P0..P7 + Weighted (8) + Paeth (9) + AVG (10) + HGRAD/VGRAD (11,12) + SMOOTH (13) + EXTRAP H/V (14,15)
enum class PredId : uint8_t {
    LEFT = 0,
    TOP = 1,
    TL = 2,
    MED = 3,
    GAP = 4,
    GRAD = 5,
    TRUE_MOTION = 6,
    CLAMPED = 7,
    WEIGHTED = 8,
    PAETH = 9,
    AVG = 10,
    HGRAD = 11,
    VGRAD = 12,
    SMOOTH = 13,
    H_EXTRAP = 14,
    V_EXTRAP = 15
};

// Predict sample at (x,y) in plane data[w*h], using causal neighbors.
// For HF bands, llc is the co-located LL sample (0 if not available).
int32_t predict_sample(const uint16_t* plane, uint32_t w, uint32_t x, uint32_t y,
                       PredId id, int32_t llc = 0);

// MED (LOCO-I median) helper
inline int32_t med_predictor(int32_t a, int32_t b, int32_t c) {
    // a=L, b=T, c=TL
    if (c >= std::max(a, b)) return std::min(a, b);
    if (c <= std::min(a, b)) return std::max(a, b);
    return a + b - c;
}

// GAP predictor
int32_t gap_predictor(int32_t W, int32_t WW, int32_t N, int32_t NW, int32_t NE, int32_t NN, int32_t NNE);

// Compute residual plane: e = sample - predict(sample)
std::vector<int32_t> compute_residuals(const std::vector<uint16_t>& plane, uint32_t w, uint32_t h, PredId id);

// Block-wise variants (B5.10): block size e.g. 64, per-block predictor ids size = nbX*nbY
std::vector<int32_t> compute_residuals_blockwise(const std::vector<uint16_t>& plane, uint32_t w, uint32_t h,
                                                 const std::vector<uint8_t>& per_block_pred,
                                                 uint32_t block_size);
std::vector<uint16_t> reconstruct_plane_blockwise(const std::vector<int32_t>& residuals, uint32_t w, uint32_t h,
                                                  const std::vector<uint8_t>& per_block_pred,
                                                  uint32_t block_size, uint16_t bd_max);

// Reconstruct plane from residuals
std::vector<uint16_t> reconstruct_plane(const std::vector<int32_t>& residuals, uint32_t w, uint32_t h, PredId id, uint16_t bd_max);

} // namespace prism::codec
