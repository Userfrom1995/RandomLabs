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
    P2 = 2,      // 17->16->8->1 learned MLP on raw RGB causal neighbours (~408 MACs)
    P4 = 4,      // Attention-gated blend of MED + gradient + MLP (D1 spec candidate)
};

// P2 MLP spatial predictor constants.
constexpr int SP2_NF  = 17;  // input features
constexpr int SP2_H1  = 16;  // hidden layer 1
constexpr int SP2_H2  = 8;   // hidden layer 2
constexpr int SP2_Q   = 1024; // fixed-point scale

// P4 attention-gated spatial predictor constants.
// Attention network: 5 input features -> 3 logits (MED, gradient, MLP).
constexpr int P4_NF   = 5;   // attention input features
constexpr int P4_NP   = 3;   // number of sub-predictors
constexpr int P4_Q    = 1024; // fixed-point scale for attention weights

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

// --- P2: 17->16->8->1 learned MLP spatial predictor on raw RGB ---

// Feature extraction for P2 (causal neighbours on raw RGB).
// Layout: [R_W,G_W,B_W, R_N,G_N,B_N, R_NW,G_NW,B_NW, R_NE,G_NE,B_NE, R_WW,G_WW,B_WW, x_norm, y_norm]
// All values in 0..255 range; position features in Q10 fixed-point.
struct P2Features {
    int32_t feat[SP2_NF];
};

// Extract 17 features at (x,y) from 3 raw RGB planes (causal neighbours).
P2Features p2_extract_features(const uint16_t* plane_r, const uint16_t* plane_g,
                               const uint16_t* plane_b,
                               uint32_t w, uint32_t h, uint32_t x, uint32_t y);

// Predict one pixel value (0..255) for a given channel (0=R, 1=G, 2=B) using the
// P2 MLP with baked weights. Uses the same integer floor-shift arithmetic as the
// Python trainer.
int32_t p2_predict_channel(const P2Features& feat, int channel);

// Compute full P2 spatial residual plane for one channel (raster scan).
std::vector<int32_t> compute_spatial_residuals_p2(const uint16_t* plane_r,
                                                   const uint16_t* plane_g,
                                                   const uint16_t* plane_b,
                                                   uint32_t w, uint32_t h,
                                                   int channel);

// Reconstruct one channel from P2 spatial residuals (decoder mirror).
std::vector<uint16_t> reconstruct_spatial_p2(const int32_t* residuals_r,
                                              const int32_t* residuals_g,
                                              const int32_t* residuals_b,
                                              uint32_t w, uint32_t h,
                                              int channel);

// Compute P2 spatial residuals for ALL 3 channels in a single pass.
// Faster than calling compute_spatial_residuals_p2 3 times separately.
void compute_spatial_residuals_p2_all(const uint16_t* plane_r,
                                       const uint16_t* plane_g,
                                       const uint16_t* plane_b,
                                       uint32_t w, uint32_t h,
                                       std::vector<int32_t>& res_r,
                                       std::vector<int32_t>& res_g,
                                       std::vector<int32_t>& res_b);

// Reconstruct ALL 3 channels from P2 spatial residuals in a single pass.
void reconstruct_spatial_p2_all(const int32_t* residuals_r,
                                 const int32_t* residuals_g,
                                 const int32_t* residuals_b,
                                 uint32_t w, uint32_t h,
                                 std::vector<uint16_t>& out_r,
                                 std::vector<uint16_t>& out_g,
                                 std::vector<uint16_t>& out_b);

// --- P4: Attention-gated spatial predictor (D1 spec) ---

// P4 attention features extracted at (x,y) from a single plane.
// Layout: [variance_3x3, gradient_magnitude, edge_direction, texture_energy, level_context]
// All values normalized to Q10 fixed-point range.
struct P4Features {
    int32_t feat[P4_NF];
};

// Extract P4 attention features at (x,y) from a single plane.
P4Features p4_extract_features(const uint16_t* plane, uint32_t w, uint32_t h,
                                uint32_t x, uint32_t y);

// Predict pixel at (x,y) using P4 attention-gated blend of MED + gradient + P2 MLP.
// Channel parameter selects which P2 MLP weights to use (0=R, 1=G, 2=B).
// For single-plane mode, pass channel=-1 to use only MED + gradient (2 sub-predictors).
int32_t p4_predict(const uint16_t* plane, uint32_t w, uint32_t h,
                    uint32_t x, uint32_t y, uint16_t bd_max,
                    const P4Features& feat, int channel = -1);

// Compute P4 spatial residuals for all 3 channels on raw RGB.
void compute_spatial_residuals_p4_all(const uint16_t* plane_r,
                                       const uint16_t* plane_g,
                                       const uint16_t* plane_b,
                                       uint32_t w, uint32_t h,
                                       std::vector<int32_t>& res_r,
                                       std::vector<int32_t>& res_g,
                                       std::vector<int32_t>& res_b);

// Reconstruct all 3 channels from P4 spatial residuals (decoder mirror).
void reconstruct_spatial_p4_all(const int32_t* residuals_r,
                                 const int32_t* residuals_g,
                                 const int32_t* residuals_b,
                                 uint32_t w, uint32_t h,
                                 std::vector<uint16_t>& out_r,
                                 std::vector<uint16_t>& out_g,
                                 std::vector<uint16_t>& out_b);

} // namespace prism::codec
