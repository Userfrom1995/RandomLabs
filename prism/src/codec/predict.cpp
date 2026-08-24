#include "prism/codec/predict.h"
#include <algorithm>
#include <cmath>

namespace prism::codec {

int32_t gap_predictor(int32_t W, int32_t WW, int32_t N, int32_t NW, int32_t NE, int32_t NN, int32_t NNE) {
    int32_t gW = std::abs(W - WW) + std::abs(N - NW) + std::abs(N - NE);
    int32_t gN = std::abs(W - NW) + std::abs(N - NN) + std::abs(NE - NNE);
    int32_t d = gW - gN;
    if (d > 80) return N;
    if (d < -80) return W;
    int32_t p = (W + N) / 2 + (NE - NW) / 4;
    if (d > 32) return (p + N) / 2;
    if (d < -32) return (p + W) / 2;
    return p;
}

int32_t predict_sample(const uint16_t* /*plane*/, uint32_t /*w*/, uint32_t /*x*/, uint32_t /*y*/, PredId /*id*/, int32_t /*llc*/) {
    // Placeholder: real prediction is performed inline in compute_residuals / reconstruct_plane
    // where full causal context (including h) is available. This stub preserves the
    // declared API without implying it is the active predictor path.
    return 0;
}

std::vector<int32_t> compute_residuals(const std::vector<uint16_t>& plane, uint32_t w, uint32_t h, PredId id) {
    std::vector<int32_t> res(plane.size());
    int bd_max = 255; // not used
    (void)bd_max;
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            int32_t s = (int32_t)plane[idx];
            int32_t L  = (x > 0) ? (int32_t)plane[idx - 1] : 0;
            int32_t T  = (y > 0) ? (int32_t)plane[idx - w] : 0;
            int32_t TL = (x > 0 && y > 0) ? (int32_t)plane[idx - w - 1] : 0;
            int32_t TR = (y > 0 && x + 1 < w) ? (int32_t)plane[idx - w + 1] : 0;
            int32_t W2 = (x > 1) ? (int32_t)plane[idx - 2] : L;
            int32_t N2 = (y > 1) ? (int32_t)plane[idx - 2*w] : T;
            int32_t NW = TL;
            int32_t NE = TR;
            int32_t NN = N2;
            int32_t NNE = (y > 1 && x + 1 < w) ? (int32_t)plane[idx - 2*w + 1] : NE;
            int32_t W = L, N = T;
            int32_t pred = 0;
            switch (id) {
                case PredId::LEFT: pred = L; break;
                case PredId::TOP: pred = T; break;
                case PredId::TL: pred = TL; break;
                case PredId::MED: pred = med_predictor(L, T, TL); break;
                case PredId::GAP: pred = gap_predictor(W, W2, N, NW, NE, NN, NNE); break;
                case PredId::GRAD: pred = (L + T) / 2 + (TR - TL) / 4; break;
                case PredId::TRUE_MOTION: pred = L + T - TL; break;
                case PredId::CLAMPED: {
                    int32_t p = L + T - TL;
                    int32_t mn = std::min({L, T, TL});
                    int32_t mx = std::max({L, T, TL});
                    pred = std::clamp(p, mn, mx);
                    break;
                }
                case PredId::WEIGHTED:
                    pred = (L + T) / 2; // fallback for M0
                    break;
            }
            res[idx] = s - pred;
        }
    }
    return res;
}

std::vector<uint16_t> reconstruct_plane(const std::vector<int32_t>& residuals, uint32_t w, uint32_t h, PredId id, uint16_t bd_max) {
    std::vector<uint16_t> plane(residuals.size());
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            int32_t L  = (x > 0) ? (int32_t)plane[idx - 1] : 0;
            int32_t T  = (y > 0) ? (int32_t)plane[idx - w] : 0;
            int32_t TL = (x > 0 && y > 0) ? (int32_t)plane[idx - w - 1] : 0;
            int32_t TR = (y > 0 && x + 1 < w) ? (int32_t)plane[idx - w + 1] : 0;
            int32_t W2 = (x > 1) ? (int32_t)plane[idx - 2] : L;
            int32_t N2 = (y > 1) ? (int32_t)plane[idx - 2*w] : T;
            int32_t NW = TL;
            int32_t NE = TR;
            int32_t NN = N2;
            int32_t NNE = (y > 1 && x + 1 < w) ? (int32_t)plane[idx - 2*w + 1] : NE;
            int32_t W = L, N = T;
            int32_t pred = 0;
            switch (id) {
                case PredId::LEFT: pred = L; break;
                case PredId::TOP: pred = T; break;
                case PredId::TL: pred = TL; break;
                case PredId::MED: pred = med_predictor(L, T, TL); break;
                case PredId::GAP: pred = gap_predictor(W, W2, N, NW, NE, NN, NNE); break;
                case PredId::GRAD: pred = (L + T) / 2 + (TR - TL) / 4; break;
                case PredId::TRUE_MOTION: pred = L + T - TL; break;
                case PredId::CLAMPED: {
                    int32_t p = L + T - TL;
                    int32_t mn = std::min({L, T, TL});
                    int32_t mx = std::max({L, T, TL});
                    pred = std::clamp(p, mn, mx);
                    break;
                }
                case PredId::WEIGHTED:
                    pred = (L + T) / 2;
                    break;
            }
            int32_t s = pred + residuals[idx];
            // Clamp to [0, bd_max] (modular for lossless but clamp keeps in range)
            if (s < 0) s = 0;
            if (s > bd_max) s = bd_max;
            plane[idx] = (uint16_t)s;
        }
    }
    return plane;
}

// ----- C5 cross-band prediction (issue #130, blueprint section 7) -----

int32_t xband_gradient(const std::vector<uint16_t>& ll, uint32_t w, uint32_t h,
                       uint32_t x, uint32_t y, uint8_t band_type) {
    if (w == 0 || h == 0) return 0;
    auto at = [&](uint32_t xx, uint32_t yy) -> int32_t {
        return (int32_t)ll[(size_t)yy * w + xx];
    };
    switch (band_type) {
        case 1: { // H band: horizontal LL difference
            bool hasL = x > 0, hasR = x + 1 < w;
            if (hasL && hasR) return at(x + 1, y) - at(x - 1, y);
            if (hasR) return at(x + 1, y) - at(x, y);
            if (hasL) return at(x, y) - at(x - 1, y);
            return 0;
        }
        case 2: { // V band: vertical LL difference
            bool hasU = y > 0, hasD = y + 1 < h;
            if (hasU && hasD) return at(x, y + 1) - at(x, y - 1);
            if (hasD) return at(x, y + 1) - at(x, y);
            if (hasU) return at(x, y) - at(x, y - 1);
            return 0;
        }
        case 3: { // D band: diagonal LL difference
            bool hasUL = x > 0 && y > 0;
            bool hasDR = x + 1 < w && y + 1 < h;
            if (hasUL && hasDR) return at(x + 1, y + 1) - at(x - 1, y - 1);
            if (hasDR) return at(x + 1, y + 1) - at(x, y);
            if (hasUL) return at(x, y) - at(x - 1, y - 1);
            return 0;
        }
        default:
            return 0;
    }
}

int32_t xband_apply(int32_t grad, int8_t weight) {
    if (grad == 0 || weight == 0) return 0;
    int32_t t = grad * (int32_t)weight;
    int32_t q = t / 16;                 // truncates toward zero
    if (t % 16 != 0 && t < 0) --q;      // adjust to exact floor semantics
    return q;
}

// ----- D1 adaptive blended prediction (issue #130, re-scope section D1) -----
//
// One shared walk serves encode and decode so the two sides cannot drift:
// neighbors always come from the RECONSTRUCTED history, which makes the
// weight state decoder-mirrored by construction. Encode reads samples from
// the source plane; decode rebuilds them from residuals - both then apply the
// identical update with err = sample - pred. Arithmetic follows
// algorithmic-spec.md 11.2 verbatim: floor semantics via arithmetic shifts,
// truncating division for step.

namespace {

struct BlendState {
    int64_t w[4];
    explicit BlendState(const BlendConfig& c) {
        if (c.med_anchor) {
            w[0] = 65536; w[1] = 0; w[2] = 0; w[3] = 0; // identity at init
        } else {
            for (int k = 0; k < 4; ++k) w[k] = c.init_w;
        }
    }
};

inline void blend_bases(const BlendConfig& cfg, const std::vector<uint16_t>& p,
                        uint32_t w, size_t idx, uint32_t x, uint32_t y,
                        int64_t b[4]) {
    int32_t L = (x > 0) ? (int32_t)p[idx - 1] : 0;
    int32_t T = (y > 0) ? (int32_t)p[idx - w] : 0;
    int32_t TL = (x > 0 && y > 0) ? (int32_t)p[idx - w - 1] : 0;
    if (cfg.med_anchor) {
        int32_t TR = (y > 0 && x + 1 < w) ? (int32_t)p[idx - w + 1] : 0;
        b[0] = med_predictor(L, T, TL);
        b[1] = L - TL;
        b[2] = T - TL;
        b[3] = (int64_t)TR - TL;
    } else {
        b[0] = L;
        b[1] = T;
        b[2] = TL;
        b[3] = (int64_t)L + T - TL;
    }
}

inline int32_t blend_predict(const BlendConfig& cfg, const BlendState& st,
                             const int64_t b[4]) {
    int64_t dot = st.w[0] * b[0] + st.w[1] * b[1] + st.w[2] * b[2] + st.w[3] * b[3];
    // floor((dot + 2^(frac-1)) / 2^frac); arithmetic shift is exact floor.
    return (int32_t)((dot + ((int64_t)1 << (cfg.frac_bits - 1))) >> cfg.frac_bits);
}

inline void blend_update(const BlendConfig& cfg, BlendState& st,
                         const int64_t b[4], int64_t err) {
    // NLMS with effective step mu = 2^(lr_shift + energy_shift - frac_bits).
    // The increment is (err*b_k << lr) / den - computed before any shift can
    // truncate it to a no-op, which a two-stage step*b_k >> frac formulation
    // would do for the small errors that dominate natural images.
    // In anchored mode the MED base stays FIXED at unit scale; only the three
    // correction weights adapt.
    int k0 = cfg.med_anchor ? 1 : 0;
    int64_t E = b[0] * b[0] + b[1] * b[1] + b[2] * b[2] + b[3] * b[3];
    int64_t den = (E >> cfg.energy_shift) + 1;
    for (int k = k0; k < 4; ++k) {
        st.w[k] += ((err * b[k]) << cfg.lr_shift) / den; // truncates toward zero
        if (st.w[k] < cfg.w_min) st.w[k] = cfg.w_min;
        if (st.w[k] > cfg.w_max) st.w[k] = cfg.w_max;
    }
}

} // namespace

std::vector<int32_t> compute_residuals_blend(const std::vector<uint16_t>& plane,
                                             uint32_t w, uint32_t h,
                                             const BlendConfig& cfg) {
    std::vector<int32_t> res(plane.size());
    BlendState st(cfg);
    int64_t b[4];
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            blend_bases(cfg, plane, w, idx, x, y, b);
            int32_t s = (int32_t)plane[idx];
            int32_t pred = blend_predict(cfg, st, b);
            res[idx] = s - pred;
            blend_update(cfg, st, b, (int64_t)s - pred);
        }
    }
    return res;
}

std::vector<uint16_t> reconstruct_plane_blend(const std::vector<int32_t>& residuals,
                                              uint32_t w, uint32_t h,
                                              const BlendConfig& cfg,
                                              uint16_t bd_max) {
    std::vector<uint16_t> plane(residuals.size());
    BlendState st(cfg);
    int64_t b[4];
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            blend_bases(cfg, plane, w, idx, x, y, b);
            int32_t pred = blend_predict(cfg, st, b);
            int64_t s = (int64_t)pred + residuals[idx];
            // States mirror exactly, so pred+residual is the original sample
            // and the clamp below never fires on valid streams; it bounds a
            // corrupt stream's damage to the sample domain instead of UB.
            if (s < 0) s = 0;
            if (s > bd_max) s = bd_max;
            plane[idx] = (uint16_t)s;
            blend_update(cfg, st, b, (int64_t)(int32_t)s - pred);
        }
    }
    return plane;
}

} // namespace prism::codec

