#pragma once
#include <vector>
#include <cstdint>
#include <algorithm>
#include <cmath>

namespace prism::codec {

// Spatial predictor type identifier (stored in container header via residual_mode flags).
enum class SpatialPredType : uint8_t {
    NONE = 0,    // No spatial predictor (legacy X6b path)
    P1 = 1,      // JXL-style adaptive bank (median + gradient + slope)
    P2 = 2,      // Learned MLP (17->64->32->1, baked weights)
};

// Configuration for P1 (JXL-style adaptive bank).
struct P1Config {
    int lr_shift = 5;           // Learning rate (log-scale)
    int energy_shift = 11;      // Energy normalization
    int frac_bits = 16;         // Fixed-point unit
    int temp_bits = 8;          // Temperature T (8-bit)
    int decay_bits = 4;         // Decay factor (4-bit)
};

// P1 adaptive bank sub-predictor indices.
// 0: median(W,N,NW) - LOCO-I median edge detector
// 1: gradient(clip(W+N-NW, min(W,N), max(W,N))) - gradient predictor
// 2: N + (N - NW)   - north-east slope extrapolation
// 3: W + (W - NW)   - west-east slope extrapolation

// Spatial predictor state (evolves causally, same at encode and decode).
struct SpatialState {
    int64_t scores[4] = {0};          // Running scores for sub-predictors
    int64_t max_errors[4] = {0};      // Max-error tracking per sub-predictor
    int64_t energy = 0;               // Running energy for normalization
    int weights[4] = {16384,16384,16384,16384}; // Fixed-point weights (init quarter-scale)

    void reset();
};

// Predict pixel at (x,y) in raster order, using causal neighbours.
// Returns the predicted value (clamped to [0, bd_max]).
int32_t spatial_predict_p1(const uint16_t* plane, uint32_t w, uint32_t h,
                           uint32_t x, uint32_t y, SpatialState& state,
                           uint16_t bd_max, const P1Config& cfg = P1Config());

// Compute full residual plane (raster scan order): R[i] = pixel[i] - spatial_hat[i].
std::vector<int32_t> compute_spatial_residuals(const std::vector<uint16_t>& plane,
                                               uint32_t w, uint32_t h,
                                               uint16_t bd_max,
                                               const P1Config& cfg = P1Config());

// Reconstruct plane from spatial residuals (decoder mirror):
// pixel[i] = spatial_hat[i] + R[i].
std::vector<uint16_t> reconstruct_spatial(const std::vector<int32_t>& residuals,
                                          uint32_t w, uint32_t h,
                                          uint16_t bd_max,
                                          const P1Config& cfg = P1Config());

// --- P2: Learned MLP spatial predictor (17->64->32->1, baked weights) ---

// Predict pixel at (x,y) using the P2 MLP. No mutable state needed (pure
// function of causal neighbours + baked weights). Returns predicted value
// clamped to [0, bd_max].
int32_t spatial_predict_p2(const uint16_t* plane, uint32_t w, uint32_t h,
                           uint32_t x, uint32_t y, uint16_t bd_max);

// Compute full P2 spatial residual plane (raster scan order).
std::vector<int32_t> compute_spatial_residuals_p2(const std::vector<uint16_t>& plane,
                                                   uint32_t w, uint32_t h,
                                                   uint16_t bd_max);

// Reconstruct from P2 spatial residuals (decoder mirror).
std::vector<uint16_t> reconstruct_spatial_p2(const std::vector<int32_t>& residuals,
                                              uint32_t w, uint32_t h,
                                              uint16_t bd_max);

} // namespace prism::codec
