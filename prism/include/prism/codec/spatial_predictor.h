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
};

// Configuration for P1 (JXL-style adaptive bank).
struct P1Config {
    int lr_shift = 5;           // Learning rate (log-scale)
    int energy_shift = 11;      // Energy normalization
};

// P1 adaptive bank sub-predictor indices.
// 0: median(W,N,NW) - LOCO-I median edge detector
// 1: gradient(clip(W+N-NW, min(W,N), max(W,N))) - gradient predictor
// 2: N + (N - NW)   - north-east slope extrapolation
// 3: W + (W - NW)   - west-east slope extrapolation

// Spatial predictor state (evolves causally, same at encode and decode).
struct SpatialState {
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

} // namespace prism::codec
