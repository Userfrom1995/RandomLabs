#include "prism/codec/spatial_predictor.h"

namespace prism::codec {

void SpatialState::reset() {
    for (int i = 0; i < 4; ++i) { scores[i] = 0; max_errors[i] = 0; }
    energy = 0;
    for (int i = 0; i < 4; ++i) weights[i] = 16384;
}

namespace {

inline int32_t gp(const uint16_t* p, uint32_t w, uint32_t h, int x, int y) {
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
    int32_t WW = gp(plane, w, h, x - 2, y);
    int32_t NN = gp(plane, w, h, x, y - 2);

    int32_t P[4];
    P[0] = med3(W, N, NW);
    int32_t grad = W + N - NW;
    P[1] = (int32_t)clp(grad, std::min(W, N), std::max(W, N));
    P[2] = (int32_t)clp(N + (N - NN), 0, (int32_t)bd_max);
    P[3] = (int32_t)clp(W + (W - WW), 0, (int32_t)bd_max);

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
    for (int k = 0; k < 4; ++k) {
        int64_t pk_err = std::abs((int64_t)P[k] - (int64_t)actual);
        int64_t clamped_err = std::min(pk_err, state.max_errors[k]);
        state.scores[k] -= clamped_err << cfg.lr_shift;
        int64_t decay = ((int64_t)1 << cfg.decay_bits) - 1;
        state.max_errors[k] = std::max((state.max_errors[k] * decay) >> cfg.decay_bits, pk_err);
    }
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
    int32_t WW = gp(plane_prev, w, h, x - 2, y);
    int32_t NN = gp(plane_prev, w, h, x, y - 2);

    int32_t P[4];
    P[0] = med3(W, N, NW);
    int32_t grad = W + N - NW;
    P[1] = (int32_t)clp(grad, std::min(W, N), std::max(W, N));
    P[2] = (int32_t)clp(N + (N - NN), 0, (int32_t)bd_max);
    P[3] = (int32_t)clp(W + (W - WW), 0, (int32_t)bd_max);

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
    for (int k = 0; k < 4; ++k) {
        int64_t pk_err = std::abs((int64_t)P[k] - (int64_t)actual);
        int64_t clamped_err = std::min(pk_err, state.max_errors[k]);
        state.scores[k] -= clamped_err << cfg.lr_shift;
        int64_t decay = ((int64_t)1 << cfg.decay_bits) - 1;
        state.max_errors[k] = std::max((state.max_errors[k] * decay) >> cfg.decay_bits, pk_err);
    }
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
    int32_t WW = gp(plane, w, h, (int)x - 2, (int)y);
    int32_t NN = gp(plane, w, h, (int)x, (int)y - 2);
    P[0] = med3(W, N, NW);
    int32_t grad = W + N - NW;
    P[1] = (int32_t)clp(grad, std::min(W, N), std::max(W, N));
    P[2] = (int32_t)clp(N + (N - NN), 0, (int32_t)bd_max);
    P[3] = (int32_t)clp(W + (W - WW), 0, (int32_t)bd_max);

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

// --- P2: Learned MLP spatial predictor ---

} // namespace prism::codec (close before include to avoid double-nesting)

#include "spatial_predictor_p2_data.inc"

namespace prism::codec {

namespace {

inline int32_t p2_px(const uint16_t* plane, uint32_t w, uint32_t h,
                     int x, int y) {
    if (x < 0 || (uint32_t)x >= w || y < 0 || (uint32_t)y >= h) return 0;
    return (int32_t)plane[(size_t)y * w + x];
}

inline int64_t p2_fdiv(int64_t x, int64_t q) {
    int64_t r = x / q;
    if ((x % q) != 0 && x < 0) --r;
    return r;
}

} // namespace

int32_t spatial_predict_p2(const uint16_t* plane, uint32_t w, uint32_t h,
                           uint32_t x, uint32_t y, uint16_t bd_max) {

    int32_t W  = p2_px(plane, w, h, (int)x - 1, (int)y);
    int32_t N  = p2_px(plane, w, h, (int)x, (int)y - 1);
    int32_t NW = p2_px(plane, w, h, (int)x - 1, (int)y - 1);
    int32_t NE = p2_px(plane, w, h, (int)x + 1, (int)y - 1);
    int32_t WW = p2_px(plane, w, h, (int)x - 2, (int)y);
    int32_t NN = p2_px(plane, w, h, (int)x, (int)y - 2);

    // 17 features (raw pixel-scale, no normalization)
    int16_t feat[17];
    feat[0]  = (int16_t)W;
    feat[1]  = (int16_t)N;
    feat[2]  = (int16_t)NW;
    feat[3]  = (int16_t)NE;
    feat[4]  = (int16_t)(W - N);
    feat[5]  = (int16_t)(N - NW);
    feat[6]  = (int16_t)(W - NW);
    feat[7]  = (int16_t)(W - WW);
    feat[8]  = (int16_t)(N - NN);
    feat[9]  = (int16_t)((W + N) / 2 - NW);
    feat[10] = (int16_t)((W + N + NW) / 3);
    feat[11] = (int16_t)(((int)x % 8) << 4);
    feat[12] = (int16_t)(((int)y % 8) << 4);
    int32_t vals[4] = {W, N, NW, NE};
    int32_t mean_v = (W + N + NW + NE + 2) / 4;
    int32_t var_sum = 0;
    for (int i = 0; i < 4; ++i) {
        int32_t d = vals[i] - mean_v;
        var_sum += d * d;
    }
    feat[13] = (int16_t)std::min((int32_t)(std::sqrt((double)var_sum / 4.0) + 0.5), (int32_t)255);
    feat[14] = (int16_t)std::abs(W - N);
    int32_t max_diff = 0;
    for (int i = 0; i < 4; ++i)
        for (int j = 0; j < 4; ++j)
            max_diff = std::max(max_diff, std::abs(vals[i] - vals[j]));
    feat[15] = (int16_t)max_diff;
    feat[16] = (int16_t)((W + N + NW + NE + 2) / 4);

    // Layer 1: h1 = relu(W1 @ feat + B1) >> P2_SHIFT
    int16_t h1[64];
    for (int j = 0; j < 64; ++j) {
        int64_t acc = p2::B1[j];
        for (int k = 0; k < 17; ++k)
            acc += (int64_t)p2::W1[j][k] * feat[k];
        int64_t v = p2_fdiv(acc, p2::P2_QW * p2::P2_QW);
        h1[j] = (int16_t)std::max((int64_t)0, std::min((int64_t)32767, v));
    }

    // Layer 2: h2 = relu(W2 @ h1 + B2) >> P2_SHIFT
    int16_t h2[32];
    for (int j = 0; j < 32; ++j) {
        int64_t acc = p2::B2[j];
        for (int k = 0; k < 64; ++k)
            acc += (int64_t)p2::W2[j][k] * h1[k];
        int64_t v = p2_fdiv(acc, p2::P2_QW * p2::P2_QW);
        h2[j] = (int16_t)std::max((int64_t)0, std::min((int64_t)32767, v));
    }

    // Layer 3: out = (W3 @ h2 + B3) >> P2_SHIFT
    int64_t acc = p2::B3[0];
    for (int k = 0; k < 32; ++k)
        acc += (int64_t)p2::W3[0][k] * h2[k];
    int32_t pred = (int32_t)p2_fdiv(acc, p2::P2_QW * p2::P2_QW);

    return std::max((int32_t)0, std::min((int32_t)bd_max, pred));
}

std::vector<int32_t> compute_spatial_residuals_p2(const std::vector<uint16_t>& plane,
                                                   uint32_t w, uint32_t h,
                                                   uint16_t bd_max) {
    std::vector<int32_t> residuals((size_t)w * h);
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            int32_t p_hat = spatial_predict_p2(plane.data(), w, h, x, y, bd_max);
            int32_t actual = (int32_t)plane[(size_t)y * w + x];
            residuals[(size_t)y * w + x] = actual - p_hat;
        }
    }
    return residuals;
}

std::vector<uint16_t> reconstruct_spatial_p2(const std::vector<int32_t>& residuals,
                                              uint32_t w, uint32_t h,
                                              uint16_t bd_max) {
    std::vector<uint16_t> plane((size_t)w * h, 0);
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            // For reconstruction, the plane is filled in raster order, so
            // spatial_predict_p2 reads only already-reconstructed neighbours.
            int32_t p_hat = spatial_predict_p2(plane.data(), w, h, x, y, bd_max);
            int32_t val = p_hat + residuals[(size_t)y * w + x];
            plane[(size_t)y * w + x] = (uint16_t)std::max((int32_t)0,
                                                           std::min((int32_t)bd_max, val));
        }
    }
    return plane;
}

} // namespace prism::codec
