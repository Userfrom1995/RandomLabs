#include "prism/codec/spatial_predictor.h"
#include "spatial_predictor_p2_data.inc"

namespace prism::codec {

void SpatialState::reset() {
    for (int i = 0; i < 4; ++i) weights[i] = 16384;
    energy = 0;
}

namespace {

inline int32_t gp(const uint16_t* p, uint32_t w, uint32_t h, int x, int y) {
    // x,y are int because callers compute (int)x - 1 which can go negative.
    if (x < 0 || (uint32_t)x >= w || y < 0 || (uint32_t)y >= h) return 0;
    return (int32_t)p[(size_t)y * w + x];
}

inline int64_t clp(int64_t v, int64_t lo, int64_t hi) {
    return v < lo ? lo : (v > hi ? hi : v);
}

inline int32_t med3(int32_t a, int32_t b, int32_t c) {
    if (a >= b) { return (b >= c) ? b : ((a >= c) ? c : a); }
    else        { return (a >= c) ? a : ((b >= c) ? c : b); }
}

// Combined predict + update in one pass (avoids redundant neighbor fetches).
void predict_and_update(const uint16_t* plane, uint32_t w, uint32_t h,
                        int x, int y, uint16_t bd_max,
                        SpatialState& state, const P1Config& cfg,
                        int32_t& p_hat_out, int32_t& err_out) {
    int32_t W  = gp(plane, w, h, x - 1, y);
    int32_t N  = gp(plane, w, h, x, y - 1);
    int32_t NW = gp(plane, w, h, x - 1, y - 1);
    int32_t P[4];
    P[0] = med3(W, N, NW);
    int32_t grad = W + N - NW;
    P[1] = (int32_t)clp(grad, std::min(W, N), std::max(W, N));
    P[2] = (int32_t)clp(N + (N - NW), 0, (int32_t)bd_max);
    P[3] = (int32_t)clp(W + (W - NW), 0, (int32_t)bd_max);

    // Weighted prediction
    int64_t wsum = 0;
    for (int i = 0; i < 4; ++i) wsum += std::max((int64_t)0, (int64_t)state.weights[i]);
    if (wsum == 0) wsum = 1;
    int64_t pred_sum = 0;
    for (int i = 0; i < 4; ++i)
        pred_sum += (int64_t)std::max((int64_t)0, (int64_t)state.weights[i]) * P[i];
    int32_t p_hat = (int32_t)((pred_sum + wsum / 2) / wsum);
    p_hat = (int32_t)clp(p_hat, 0, (int32_t)bd_max);

    // State update
    int32_t actual = (int32_t)plane[(size_t)y * w + x];
    int32_t err = actual - p_hat;
    state.energy += (int64_t)(err * err) >> cfg.energy_shift;
    int64_t den = (state.energy >> cfg.energy_shift) + 1;
    for (int k = 0; k < 4; ++k) {
        state.weights[k] += (err * ((int64_t)P[k] - p_hat) << cfg.lr_shift) / den;
        state.weights[k] = std::max((int64_t)0, std::min((int64_t)131072, (int64_t)state.weights[k]));
    }

    p_hat_out = p_hat;
    err_out = err;
}

// Reconstruct and update state in one pass (decoder mirror).
void reconstruct_and_update(const uint16_t* plane_prev, uint32_t w, uint32_t h,
                            int x, int y, uint16_t bd_max,
                            SpatialState& state, const P1Config& cfg,
                            const int32_t* residuals,
                            uint16_t& pixel_out) {
    int32_t W  = gp(plane_prev, w, h, x - 1, y);
    int32_t N  = gp(plane_prev, w, h, x, y - 1);
    int32_t NW = gp(plane_prev, w, h, x - 1, y - 1);
    int32_t P[4];
    P[0] = med3(W, N, NW);
    int32_t grad = W + N - NW;
    P[1] = (int32_t)clp(grad, std::min(W, N), std::max(W, N));
    P[2] = (int32_t)clp(N + (N - NW), 0, (int32_t)bd_max);
    P[3] = (int32_t)clp(W + (W - NW), 0, (int32_t)bd_max);

    int64_t wsum = 0;
    for (int i = 0; i < 4; ++i) wsum += std::max((int64_t)0, (int64_t)state.weights[i]);
    if (wsum == 0) wsum = 1;
    int64_t pred_sum = 0;
    for (int i = 0; i < 4; ++i)
        pred_sum += (int64_t)std::max((int64_t)0, (int64_t)state.weights[i]) * P[i];
    int32_t p_hat = (int32_t)((pred_sum + wsum / 2) / wsum);
    p_hat = (int32_t)clp(p_hat, 0, (int32_t)bd_max);

    size_t idx = (size_t)y * w + x;
    int32_t actual = p_hat + residuals[idx];
    actual = std::max(0, std::min((int32_t)bd_max, actual));
    pixel_out = (uint16_t)actual;

    int32_t err = residuals[idx];
    state.energy += (int64_t)(err * err) >> cfg.energy_shift;
    int64_t den = (state.energy >> cfg.energy_shift) + 1;
    for (int k = 0; k < 4; ++k) {
        state.weights[k] += (err * ((int64_t)P[k] - p_hat) << cfg.lr_shift) / den;
        state.weights[k] = std::max((int64_t)0, std::min((int64_t)131072, (int64_t)state.weights[k]));
    }
}

} // namespace

int32_t spatial_predict_p1(const uint16_t* plane, uint32_t w, uint32_t h,
                           uint32_t x, uint32_t y, SpatialState& state,
                           uint16_t bd_max, const P1Config& cfg) {
    int32_t P[4];
    int32_t W  = gp(plane, w, h, (int)x - 1, (int)y);
    int32_t N  = gp(plane, w, h, (int)x, (int)y - 1);
    int32_t NW = gp(plane, w, h, (int)x - 1, (int)y - 1);
    P[0] = med3(W, N, NW);
    int32_t grad = W + N - NW;
    P[1] = (int32_t)clp(grad, std::min(W, N), std::max(W, N));
    P[2] = (int32_t)clp(N + (N - NW), 0, (int32_t)bd_max);
    P[3] = (int32_t)clp(W + (W - NW), 0, (int32_t)bd_max);

    int64_t wsum = 0;
    for (int i = 0; i < 4; ++i) wsum += std::max((int64_t)0, (int64_t)state.weights[i]);
    if (wsum == 0) wsum = 1;
    int64_t pred_sum = 0;
    for (int i = 0; i < 4; ++i)
        pred_sum += (int64_t)std::max((int64_t)0, (int64_t)state.weights[i]) * P[i];
    int32_t p_hat = (int32_t)((pred_sum + wsum / 2) / wsum);
    return (int32_t)clp(p_hat, 0, (int32_t)bd_max);
}

std::vector<int32_t> compute_spatial_residuals(const std::vector<uint16_t>& plane,
                                               uint32_t w, uint32_t h,
                                               uint16_t bd_max,
                                               const P1Config& cfg) {
    std::vector<int32_t> residuals((size_t)w * h);
    SpatialState state;
    state.reset();
    const uint16_t* p = plane.data();

    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            int32_t p_hat, err;
            predict_and_update(p, w, h, (int)x, (int)y, bd_max, state, cfg, p_hat, err);
            residuals[(size_t)y * w + x] = err;
        }
    }
    return residuals;
}

std::vector<uint16_t> reconstruct_spatial(const std::vector<int32_t>& residuals,
                                          uint32_t w, uint32_t h,
                                          uint16_t bd_max,
                                          const P1Config& cfg) {
    std::vector<uint16_t> plane((size_t)w * h);
    SpatialState state;
    state.reset();

    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            reconstruct_and_update(plane.data(), w, h, (int)x, (int)y, bd_max,
                                   state, cfg, residuals.data(), plane[(size_t)y * w + x]);
        }
    }
    return plane;
}

// --- P2: 17->64->32->1 learned MLP spatial predictor ---

namespace {

inline int32_t p2_gp(const uint16_t* p, uint32_t w, uint32_t h, int x, int y) {
    if (x < 0 || (uint32_t)x >= w || y < 0 || (uint32_t)y >= h) return 0;
    return (int32_t)p[(size_t)y * w + x];
}

} // namespace

P2Features p2_extract_features(const uint16_t* plane_r, const uint16_t* plane_g,
                               const uint16_t* plane_b,
                               uint32_t w, uint32_t h, uint32_t x, uint32_t y) {
    P2Features f{};
    int ix = (int)x, iy = (int)y;
    // W
    f.feat[0]  = p2_gp(plane_r, w, h, ix-1, iy);
    f.feat[1]  = p2_gp(plane_g, w, h, ix-1, iy);
    f.feat[2]  = p2_gp(plane_b, w, h, ix-1, iy);
    // N
    f.feat[3]  = p2_gp(plane_r, w, h, ix, iy-1);
    f.feat[4]  = p2_gp(plane_g, w, h, ix, iy-1);
    f.feat[5]  = p2_gp(plane_b, w, h, ix, iy-1);
    // NW
    f.feat[6]  = p2_gp(plane_r, w, h, ix-1, iy-1);
    f.feat[7]  = p2_gp(plane_g, w, h, ix-1, iy-1);
    f.feat[8]  = p2_gp(plane_b, w, h, ix-1, iy-1);
    // NE
    f.feat[9]  = p2_gp(plane_r, w, h, ix+1, iy-1);
    f.feat[10] = p2_gp(plane_g, w, h, ix+1, iy-1);
    f.feat[11] = p2_gp(plane_b, w, h, ix+1, iy-1);
    // WW
    f.feat[12] = p2_gp(plane_r, w, h, ix-2, iy);
    f.feat[13] = p2_gp(plane_g, w, h, ix-2, iy);
    f.feat[14] = p2_gp(plane_b, w, h, ix-2, iy);
    // Position (normalised to Q10 fixed-point: 0..1023)
    f.feat[15] = (int32_t)((uint64_t)x * 1024 / std::max(w, 1u));
    f.feat[16] = (int32_t)((uint64_t)y * 1024 / std::max(h, 1u));
    return f;
}

int32_t p2_predict_channel(const P2Features& feat, int channel) {
    // Select baked weights for this channel.
    const int16_t (*W1)[SP2_NF] = nullptr;
    const int16_t* B1 = nullptr;
    const int16_t (*W2)[SP2_H1] = nullptr;
    const int16_t* B2 = nullptr;
    const int16_t* W3 = nullptr;
    int16_t B3 = 0;
    switch (channel) {
        case 0: W1 = SP2_W1_R; B1 = SP2_B1_R; W2 = SP2_W2_R; B2 = SP2_B2_R; W3 = SP2_W3_R; B3 = SP2_B3_R; break;
        case 1: W1 = SP2_W1_G; B1 = SP2_B1_G; W2 = SP2_W2_G; B2 = SP2_B2_G; W3 = SP2_W3_G; B3 = SP2_B3_G; break;
        case 2: W1 = SP2_W1_B; B1 = SP2_B1_B; W2 = SP2_W2_B; B2 = SP2_B2_B; W3 = SP2_W3_B; B3 = SP2_B3_B; break;
        default: return 128;
    }
    // Layer 1: ReLU (int16 fixed-point, Q=1024)
    int32_t a1[SP2_H1];
    for (int j = 0; j < SP2_H1; ++j) {
        int32_t sum = (int32_t)B1[j];
        for (int k = 0; k < SP2_NF; ++k)
            sum += (int32_t)W1[j][k] * feat.feat[k];
        a1[j] = std::max(0, sum >> 10); // floor-shift = ReLU
    }
    // Layer 2: ReLU
    int32_t a2[SP2_H2];
    for (int j = 0; j < SP2_H2; ++j) {
        int32_t sum = (int32_t)B2[j];
        for (int k = 0; k < SP2_H1; ++k)
            sum += (int32_t)W2[j][k] * a1[k];
        a2[j] = std::max(0, sum >> 10);
    }
    // Layer 3: linear
    int32_t sum = (int32_t)B3;
    for (int k = 0; k < SP2_H2; ++k)
        sum += (int32_t)W3[k] * a2[k];
    int32_t pred = sum >> 10;
    // Clamp to valid pixel range.
    return std::max(0, std::min(255, pred));
}

std::vector<int32_t> compute_spatial_residuals_p2(const uint16_t* plane_r,
                                                   const uint16_t* plane_g,
                                                   const uint16_t* plane_b,
                                                   uint32_t w, uint32_t h,
                                                   int channel) {
    const uint16_t* planes[3] = {plane_r, plane_g, plane_b};
    std::vector<int32_t> residuals((size_t)w * h);
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            P2Features feat = p2_extract_features(plane_r, plane_g, plane_b, w, h, x, y);
            int32_t pred = p2_predict_channel(feat, channel);
            int32_t actual = (int32_t)planes[channel][(size_t)y * w + x];
            residuals[(size_t)y * w + x] = actual - pred;
        }
    }
    return residuals;
}

std::vector<uint16_t> reconstruct_spatial_p2(const int32_t* residuals_r,
                                              const int32_t* residuals_g,
                                              const int32_t* residuals_b,
                                              uint32_t w, uint32_t h,
                                              int channel) {
    // Reconstruct ALL 3 channels simultaneously in raster order, then return
    // the requested channel. The P2 MLP features depend on cross-channel
    // values (W/N/NW/NE of all 3 channels), so we must reconstruct all 3
    // at each pixel position before advancing.
    const int32_t* resids[3] = {residuals_r, residuals_g, residuals_b};
    std::vector<uint16_t> rbuf(w * h, 0), gbuf(w * h, 0), bbuf(w * h, 0);
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            P2Features feat = p2_extract_features(rbuf.data(), gbuf.data(), bbuf.data(),
                                                   w, h, x, y);
            // Reconstruct all 3 channels at this position.
            int32_t pred_r = p2_predict_channel(feat, 0);
            int32_t actual_r = pred_r + resids[0][idx];
            actual_r = std::max(0, std::min(255, actual_r));
            rbuf[idx] = (uint16_t)actual_r;

            int32_t pred_g = p2_predict_channel(feat, 1);
            int32_t actual_g = pred_g + resids[1][idx];
            actual_g = std::max(0, std::min(255, actual_g));
            gbuf[idx] = (uint16_t)actual_g;

            int32_t pred_b = p2_predict_channel(feat, 2);
            int32_t actual_b = pred_b + resids[2][idx];
            actual_b = std::max(0, std::min(255, actual_b));
            bbuf[idx] = (uint16_t)actual_b;
        }
    }
    // Return the requested channel.
    switch (channel) {
        case 0: return rbuf;
        case 1: return gbuf;
        case 2: return bbuf;
        default: return rbuf;
    }
}

void compute_spatial_residuals_p2_all(const uint16_t* plane_r,
                                       const uint16_t* plane_g,
                                       const uint16_t* plane_b,
                                       uint32_t w, uint32_t h,
                                       std::vector<int32_t>& res_r,
                                       std::vector<int32_t>& res_g,
                                       std::vector<int32_t>& res_b) {
    size_t n = (size_t)w * h;
    res_r.resize(n);
    res_g.resize(n);
    res_b.resize(n);
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            P2Features feat = p2_extract_features(plane_r, plane_g, plane_b, w, h, x, y);
            int32_t pred_r = p2_predict_channel(feat, 0);
            int32_t pred_g = p2_predict_channel(feat, 1);
            int32_t pred_b = p2_predict_channel(feat, 2);
            res_r[idx] = (int32_t)plane_r[idx] - pred_r;
            res_g[idx] = (int32_t)plane_g[idx] - pred_g;
            res_b[idx] = (int32_t)plane_b[idx] - pred_b;
        }
    }
}

void reconstruct_spatial_p2_all(const int32_t* residuals_r,
                                 const int32_t* residuals_g,
                                 const int32_t* residuals_b,
                                 uint32_t w, uint32_t h,
                                 std::vector<uint16_t>& out_r,
                                 std::vector<uint16_t>& out_g,
                                 std::vector<uint16_t>& out_b) {
    size_t n = (size_t)w * h;
    out_r.resize(n);
    out_g.resize(n);
    out_b.resize(n);
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            P2Features feat = p2_extract_features(out_r.data(), out_g.data(), out_b.data(),
                                                   w, h, x, y);
            int32_t pred_r = p2_predict_channel(feat, 0);
            int32_t actual_r = pred_r + residuals_r[idx];
            out_r[idx] = (uint16_t)std::max(0, std::min(255, actual_r));

            int32_t pred_g = p2_predict_channel(feat, 1);
            int32_t actual_g = pred_g + residuals_g[idx];
            out_g[idx] = (uint16_t)std::max(0, std::min(255, actual_g));

            int32_t pred_b = p2_predict_channel(feat, 2);
            int32_t actual_b = pred_b + residuals_b[idx];
            out_b[idx] = (uint16_t)std::max(0, std::min(255, actual_b));
        }
    }
}

// --- P4: Attention-gated spatial predictor (D1 spec candidate) ---

namespace {

// Baked P4 attention weights (5 -> 3, int16 Q=1024).
// Trained offline on Kodak-24: minimize MSE of attention-blended prediction.
// These are initial weights; will be replaced by trained values.
// For now, use identity-like initialization: each sub-predictor gets equal weight
// in smooth regions, gradient-heavy in edge regions.
constexpr int16_t P4_W1[P4_NP][P4_NF] = {
    // MED-dominant: high weight in smooth regions (low variance, low gradient)
    { 200, -150, -100, -120, 50 },
    // Gradient-dominant: high weight at edges (high gradient, directional)
    { -100, 300, 200, -50, 80 },
    // MLP-dominant: high weight in textured regions (high variance, high texture)
    { 150, -50, -150, 250, -30 },
};
constexpr int16_t P4_B1[P4_NP] = { 0, 0, 0 };

// Softmax with temperature (fixed-point Q10).
// Returns weights[0..2] summing to 1024.
void p4_softmax(const int32_t logits[P4_NP], int32_t weights[P4_NP]) {
    // Temperature = 2.0 (Q10: 2048)
    constexpr int32_t TEMP = 2048;
    int32_t max_logit = logits[0];
    for (int i = 1; i < P4_NP; ++i)
        if (logits[i] > max_logit) max_logit = logits[i];

    // exp((logit - max) / temp) in fixed-point
    int32_t exp_sum = 0;
    int32_t exp_vals[P4_NP];
    for (int i = 0; i < P4_NP; ++i) {
        int32_t shifted = ((logits[i] - max_logit) << 10) / TEMP;
        // Approximate exp(x) for small negative x: 1 + x + x^2/2
        // shifted is <= 0 (since we subtracted max)
        int32_t x = shifted;
        int32_t exp_val = (1 << 10) + x + (x * x >> 11);
        if (exp_val < 1) exp_val = 1;
        exp_vals[i] = exp_val;
        exp_sum += exp_val;
    }
    // Normalize to sum=1024
    for (int i = 0; i < P4_NP; ++i) {
        weights[i] = (exp_vals[i] * 1024 + exp_sum / 2) / exp_sum;
    }
}

} // namespace

P4Features p4_extract_features(const uint16_t* plane, uint32_t w, uint32_t h,
                                uint32_t x, uint32_t y) {
    P4Features f{};
    int ix = (int)x, iy = (int)y;
    auto gp = [&](int dx, int dy) -> int32_t {
        int nx = ix + dx, ny = iy + dy;
        if (nx < 0 || (uint32_t)nx >= w || ny < 0 || (uint32_t)ny >= h) return 0;
        return (int32_t)plane[(size_t)ny * w + nx];
    };

    // Feature 0: local 3x3 variance (texture measure)
    // Only use causal neighbors (W, N, NW, NE, WW) for decode consistency.
    int32_t vals[5], n = 0;
    vals[n++] = gp(-1, 0);   // W
    vals[n++] = gp(0, -1);   // N
    vals[n++] = gp(-1, -1);  // NW
    vals[n++] = gp(1, -1);   // NE (causal: previous row)
    vals[n++] = gp(-2, 0);   // WW
    int64_t sum = 0, sum2 = 0;
    for (int i = 0; i < n; ++i) { sum += vals[i]; sum2 += (int64_t)vals[i] * vals[i]; }
    int32_t mean = (int32_t)(sum / n);
    int32_t variance = (int32_t)(sum2 / n - (int64_t)mean * mean);
    f.feat[0] = std::min(1023, variance); // Q10 clamp

    // Feature 1: gradient magnitude
    int32_t W = gp(-1, 0), N = gp(0, -1);
    f.feat[1] = std::min(1023, std::abs(W - N));

    // Feature 2: edge direction (|horizontal| - |vertical|, normalized)
    int32_t WW = gp(-2, 0), NN = gp(0, -2);
    int32_t horiz = std::abs(W - WW);
    int32_t vert = std::abs(N - NN);
    f.feat[2] = std::min(1023, std::max(-1023, horiz - vert));

    // Feature 3: texture energy (high-frequency estimate, causal only)
    int32_t NW = gp(-1, -1), NE = gp(1, -1);
    int32_t diag_diff = std::abs((W + N) - (NW + NE));
    f.feat[3] = std::min(1023, diag_diff);

    // Feature 4: level context (always 0 for spatial domain; reserved for future)
    f.feat[4] = 0;

    return f;
}

int32_t p4_predict(const uint16_t* plane, uint32_t w, uint32_t h,
                    uint32_t x, uint32_t y, uint16_t bd_max,
                    const P4Features& feat, int channel) {
    int ix = (int)x, iy = (int)y;
    auto gp = [&](int dx, int dy) -> int32_t {
        int nx = ix + dx, ny = iy + dy;
        if (nx < 0 || (uint32_t)nx >= w || ny < 0 || (uint32_t)ny >= h) return 0;
        return (int32_t)plane[(size_t)ny * w + nx];
    };

    // Sub-predictor 0: MED(W, N, NW)
    int32_t W = gp(-1, 0), N = gp(0, -1), NW = gp(-1, -1);
    int32_t P_med;
    if (W >= N) {
        P_med = (N >= NW) ? N : ((W >= NW) ? NW : W);
    } else {
        P_med = (W >= NW) ? W : ((N >= NW) ? NW : N);
    }

    // Sub-predictor 1: Gradient (clamped)
    int32_t grad = W + N - NW;
    int32_t P_grad = std::max(std::min(W, N), std::min(std::max(W, N), grad));

    // Compute attention logits (2 sub-predictors: MED + gradient)
    // Use a simplified 5->2 attention network.
    int32_t logits[2];
    // MED-dominant: high weight in smooth regions (low variance, low gradient)
    logits[0] = (int32_t)P4_B1[0] + (int32_t)P4_W1[0][0] * feat.feat[0]
                + (int32_t)P4_W1[0][1] * feat.feat[1]
                + (int32_t)P4_W1[0][2] * feat.feat[2]
                + (int32_t)P4_W1[0][3] * feat.feat[3]
                + (int32_t)P4_W1[0][4] * feat.feat[4];
    // Gradient-dominant: high weight at edges (high gradient, directional)
    logits[1] = (int32_t)P4_B1[1] + (int32_t)P4_W1[1][0] * feat.feat[0]
                + (int32_t)P4_W1[1][1] * feat.feat[1]
                + (int32_t)P4_W1[1][2] * feat.feat[2]
                + (int32_t)P4_W1[1][3] * feat.feat[3]
                + (int32_t)P4_W1[1][4] * feat.feat[4];

    // Softmax with temperature (fixed-point Q10).
    constexpr int32_t TEMP = 2048;
    int32_t max_logit = std::max(logits[0], logits[1]);
    int32_t e0 = logits[0] - max_logit;
    int32_t e1 = logits[1] - max_logit;
    // exp(x/TEMP) approx: 1 + x/1024 + (x/1024)^2/2
    auto approx_exp = [](int32_t x) -> int32_t {
        int32_t x1024 = (x << 10) / 2048; // x/TEMP in Q10
        int32_t val = (1 << 10) + x1024 + (x1024 * x1024 >> 11);
        return std::max(1, val);
    };
    int32_t exp0 = approx_exp(e0), exp1 = approx_exp(e1);
    int32_t exp_sum = exp0 + exp1;
    int32_t w0 = (exp0 * 1024 + exp_sum / 2) / exp_sum;
    int32_t w1 = 1024 - w0;

    // Weighted blend
    int64_t blended = (int64_t)w0 * P_med + (int64_t)w1 * P_grad;
    int32_t p_hat = (int32_t)((blended + 512) / 1024);
    return std::max(0, std::min((int32_t)bd_max, p_hat));
}

namespace {

void p4_predict_and_update(const uint16_t* plane, uint32_t w, uint32_t h,
                            int x, int y, uint16_t bd_max,
                            int32_t& p_hat_out, int32_t& err_out) {
    P4Features feat = p4_extract_features(plane, w, h, (uint32_t)x, (uint32_t)y);
    p_hat_out = p4_predict(plane, w, h, (uint32_t)x, (uint32_t)y, bd_max, feat);
    int32_t actual = (int32_t)plane[(size_t)y * w + x];
    err_out = actual - p_hat_out;
}

void p4_reconstruct_and_update(const uint16_t* plane_prev, uint32_t w, uint32_t h,
                                int x, int y, uint16_t bd_max,
                                const int32_t* residuals,
                                uint16_t& pixel_out) {
    P4Features feat = p4_extract_features(plane_prev, w, h, (uint32_t)x, (uint32_t)y);
    int32_t p_hat = p4_predict(plane_prev, w, h, (uint32_t)x, (uint32_t)y, bd_max, feat);
    size_t idx = (size_t)y * w + x;
    int32_t actual = p_hat + residuals[idx];
    actual = std::max(0, std::min((int32_t)bd_max, actual));
    pixel_out = (uint16_t)actual;
}

} // namespace

void compute_spatial_residuals_p4_all(const uint16_t* plane_r,
                                       const uint16_t* plane_g,
                                       const uint16_t* plane_b,
                                       uint32_t w, uint32_t h,
                                       std::vector<int32_t>& res_r,
                                       std::vector<int32_t>& res_g,
                                       std::vector<int32_t>& res_b) {
    size_t n = (size_t)w * h;
    res_r.resize(n);
    res_g.resize(n);
    res_b.resize(n);
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            // P4 on each channel independently (attention features from that channel)
            P4Features feat_r = p4_extract_features(plane_r, w, h, x, y);
            int32_t pred_r = p4_predict(plane_r, w, h, x, y, 255, feat_r, 0);
            res_r[idx] = (int32_t)plane_r[idx] - pred_r;

            P4Features feat_g = p4_extract_features(plane_g, w, h, x, y);
            int32_t pred_g = p4_predict(plane_g, w, h, x, y, 255, feat_g, 1);
            res_g[idx] = (int32_t)plane_g[idx] - pred_g;

            P4Features feat_b = p4_extract_features(plane_b, w, h, x, y);
            int32_t pred_b = p4_predict(plane_b, w, h, x, y, 255, feat_b, 2);
            res_b[idx] = (int32_t)plane_b[idx] - pred_b;
        }
    }
}

void reconstruct_spatial_p4_all(const int32_t* residuals_r,
                                 const int32_t* residuals_g,
                                 const int32_t* residuals_b,
                                 uint32_t w, uint32_t h,
                                 std::vector<uint16_t>& out_r,
                                 std::vector<uint16_t>& out_g,
                                 std::vector<uint16_t>& out_b) {
    size_t n = (size_t)w * h;
    out_r.resize(n);
    out_g.resize(n);
    out_b.resize(n, 0);
    // Reconstruct all 3 channels simultaneously in raster order (P4 features
    // depend on already-reconstructed neighbours, same as P2).
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            P4Features feat_r = p4_extract_features(out_r.data(), w, h, x, y);
            int32_t pred_r = p4_predict(out_r.data(), w, h, x, y, 255, feat_r, 0);
            out_r[idx] = (uint16_t)std::max(0, std::min(255, pred_r + residuals_r[idx]));

            P4Features feat_g = p4_extract_features(out_g.data(), w, h, x, y);
            int32_t pred_g = p4_predict(out_g.data(), w, h, x, y, 255, feat_g, 1);
            out_g[idx] = (uint16_t)std::max(0, std::min(255, pred_g + residuals_g[idx]));

            P4Features feat_b = p4_extract_features(out_b.data(), w, h, x, y);
            int32_t pred_b = p4_predict(out_b.data(), w, h, x, y, 255, feat_b, 2);
            out_b[idx] = (uint16_t)std::max(0, std::min(255, pred_b + residuals_b[idx]));
        }
    }
}

} // namespace prism::codec
