#include "prism/codec/spatial_predictor.h"

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

} // namespace prism::codec
