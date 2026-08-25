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

// ----- E1 CALIC-class bias cancellation (spec addenda 14.3 + 16) -----
// (floor_div now lives once as the public pinned helper below; same
// floor-toward-negative-infinity semantics this file always used.)

int bias_bucket(int64_t g, int bd_shift) {
    static const int64_t kT[7] = {0, 1, 2, 4, 8, 16, 32};
    int64_t a = g < 0 ? -g : g;
    int n = 0;
    for (int i = 0; i < 7; ++i)
        if ((kT[i] << bd_shift) < a) ++n;
    return n;
}

BiasModel::BiasModel(uint8_t bd, const BiasConfig& cfg) : cfg_(cfg), bmax_(0) {
    // Bmax = 2^(BD-3), pinned in addendum 14.3.
    bmax_ = 1 << (((bd >= 16) ? 8 : 0) + 5);   // BD8: 2^5 = 32; BD16: 2^13 = 8192
    for (int i = 0; i < 64; ++i) {
        b_[i] = 0;
        g_[i] = 65536;   // exact unity: a fresh model corrects nothing
    }
}

void BiasModel::reset() {
    for (int i = 0; i < 64; ++i) {
        b_[i] = 0;
        g_[i] = 65536;
    }
}

int32_t BiasModel::predict(int ctx, int32_t med) const {
    int64_t p = med;
    if (cfg_.additive) p += b_[ctx];
    if (cfg_.gain) {
        // sym_round(pred' * G): round half away from zero on magnitude.
        int64_t v = p * g_[ctx];
        p = v >= 0 ? ((v + 32768) >> 16) : -((-v + 32768) >> 16);
    }
    return (int32_t)p;
}

void BiasModel::update(int ctx, int32_t med, int32_t actual) {
    if (cfg_.off()) return;   // identity path: no correction, no adaptation
    // Recompute the chain from current state so encode and decode derive err
    // through one shared path (mirror by construction).
    int64_t pred_pregain = med + (cfg_.additive ? b_[ctx] : 0);
    int32_t pred_final = predict(ctx, med);
    int64_t err = (int64_t)actual - pred_final;
    if (cfg_.additive)
        b_[ctx] = (int32_t)std::clamp<int64_t>(
            b_[ctx] + floor_div(err, 64), -(int64_t)bmax_, (int64_t)bmax_);
    if (cfg_.gain) {
        int64_t den = ((pred_pregain < 0 ? -pred_pregain : pred_pregain) >> 4) + 1;
        int64_t g = g_[ctx] + floor_div(err << 9, den);
        if (g < 32768) g = 32768;
        if (g > 131072) g = 131072;
        g_[ctx] = g;
    }
}

namespace {

// Shared border rule for the gradient pair (addendum 14.2): any term with a
// missing neighbor contributes 0; when y > 0 but x == 0, gN keeps P[N] as its
// term. Mirrors build_props so harness and library agree cell-for-cell.
inline void bias_gradients(const std::vector<uint16_t>& hist, size_t idx,
                           uint32_t w, uint32_t x, uint32_t y,
                           int64_t* gn, int64_t* gw) {
    *gn = 0;
    *gw = 0;
    if (y == 0) return;
    int32_t T = (int32_t)hist[idx - w];
    int32_t TL = (x > 0 && y > 0) ? (int32_t)hist[idx - w - 1] : 0;
    int32_t L = (x > 0) ? (int32_t)hist[idx - 1] : 0;
    *gn = (int64_t)T - TL;
    *gw = (x > 0) ? (int64_t)L - TL : 0;
}

inline int bd_shift_of(uint8_t bd) { return (bd >= 16) ? 8 : 0; }

} // namespace

std::vector<int32_t> compute_residuals_bias(const std::vector<uint16_t>& plane,
                                            uint32_t w, uint32_t h,
                                            uint8_t bd, const BiasConfig& cfg) {
    std::vector<int32_t> res(plane.size());
    BiasModel model(bd, cfg);
    const int sh = bd_shift_of(bd);
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            int64_t gn, gw;
            bias_gradients(plane, idx, w, x, y, &gn, &gw);
            int ctx = 8 * bias_bucket(gn, sh) + bias_bucket(gw, sh);
            int32_t med = med_predictor(
                x > 0 ? (int32_t)plane[idx - 1] : 0,
                y > 0 ? (int32_t)plane[idx - w] : 0,
                (x > 0 && y > 0) ? (int32_t)plane[idx - w - 1] : 0);
            int32_t s = (int32_t)plane[idx];
            res[idx] = s - model.predict(ctx, med);
            model.update(ctx, med, s);
        }
    }
    return res;
}

std::vector<uint16_t> reconstruct_plane_bias(const std::vector<int32_t>& residuals,
                                             uint32_t w, uint32_t h,
                                             uint8_t bd, const BiasConfig& cfg,
                                             uint16_t bd_max) {
    std::vector<uint16_t> plane(residuals.size());
    BiasModel model(bd, cfg);
    const int sh = bd_shift_of(bd);
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            int64_t gn, gw;
            // History IS the output buffer under reconstruction: identical
            // decoded values on both sides, so the states mirror exactly (I2).
            bias_gradients(plane, idx, w, x, y, &gn, &gw);
            int ctx = 8 * bias_bucket(gn, sh) + bias_bucket(gw, sh);
            int32_t med = med_predictor(
                x > 0 ? (int32_t)plane[idx - 1] : 0,
                y > 0 ? (int32_t)plane[idx - w] : 0,
                (x > 0 && y > 0) ? (int32_t)plane[idx - w - 1] : 0);
            int32_t pred = model.predict(ctx, med);
            int64_t s = (int64_t)pred + residuals[idx];
            // States mirror exactly, so pred+residual is the original sample;
            // the clamp bounds corrupt-stream damage instead of UB.
            if (s < 0) s = 0;
            if (s > bd_max) s = bd_max;
            plane[idx] = (uint16_t)s;
            model.update(ctx, med, (int32_t)s);
        }
    }
    return plane;
}

// ----- S1 predictor families (spec 18.4 verbatim except amendment A4;
// pins P-S1-1..P-S1-7 in decisions/builder/2026-08-25T22-30-00) -----

bool parse_pred_family(const std::string& s, PredFamily& out) {
    if (s == "MED") { out = PredFamily::MED; return true; }
    if (s == "GAP") { out = PredFamily::GAP; return true; }
    if (s == "W") { out = PredFamily::WENS; return true; }
    return false;
}

const char* pred_family_name(PredFamily f) {
    switch (f) {
        case PredFamily::GAP: return "GAP";
        case PredFamily::WENS: return "W";
        default: return "MED";
    }
}

int64_t sym_round_div(int64_t a, int64_t b) {
    // Round half away from zero, b > 0 (pin P-S1-4).
    if (a >= 0) return (a + b / 2) / b;
    return -((-a + b / 2) / b);
}

int64_t floor_div(int64_t b_a, int64_t b_b) {
    // Floor toward negative infinity, b_b > 0 (pin P-S1-5).
    int64_t q = b_a / b_b;
    if ((b_a % b_b) != 0 && b_a < 0) --q;
    return q;
}

int32_t gap_reduced_predict(int32_t W, int32_t WW, int32_t N, int32_t NW,
                            int32_t NE, int32_t NN, int bd) {
    // Amendment A4 gradient pair (pins P-S1-3); everything else 18.4
    // verbatim. int64 internal arithmetic per 18.4.
    const int64_t dh = std::abs((int64_t)W - WW) + std::abs((int64_t)N - NW) +
                       std::abs((int64_t)NE - N);
    const int64_t dv = std::abs((int64_t)NW - W) + std::abs((int64_t)N - NN) +
                       std::abs((int64_t)N - NE);
    const int64_t t80 = (int64_t)80 << (bd - 8);
    const int64_t t32 = (int64_t)32 << (bd - 8);
    if (dv - dh > t80) return N;
    if (dh - dv > t80) return W;
    const int64_t num = 2 * (int64_t)W + 2 * (int64_t)N + (int64_t)NE -
                        (int64_t)NW;
    int64_t dhat = sym_round_div(num, 4);
    if (dh - dv > t32) {
        dhat = sym_round_div(dhat + W, 2);
    } else if (dv - dh > t32) {
        dhat = sym_round_div(dhat + N, 2);
    }
    return (int32_t)dhat;
}

void WEnsemble::reset() {
    w[0] = w[1] = w[2] = w[3] = 65536;
}

int64_t WEnsemble::weighted_mean(int32_t W, int32_t N, int32_t NW,
                                 int64_t maxval, int32_t p[4]) const {
    // ORDER PINNED i = W, N, NW, TE; TE clamped into [0, maxval] (P-S1-6).
    p[0] = W;
    p[1] = N;
    p[2] = NW;
    int64_t te = (int64_t)W + N - NW;
    if (te < 0) te = 0;
    if (te > maxval) te = maxval;
    p[3] = (int32_t)te;
    const int64_t sumw = w[0] + w[1] + w[2] + w[3];
    return sym_round_div(w[0] * (int64_t)p[0] + w[1] * (int64_t)p[1] +
                             w[2] * (int64_t)p[2] + w[3] * (int64_t)p[3],
                         sumw);
}

void WEnsemble::update(const int32_t p[4], int64_t clamped_pred,
                       int64_t err) {
    for (int i = 0; i < 4; ++i) {
        int64_t wi = w[i] + floor_div(err * ((int64_t)p[i] - clamped_pred),
                                      512);
        if (wi < 16384) wi = 16384;
        if (wi > 1048576) wi = 1048576;
        w[i] = wi;
    }
}

bool WEnsemble::weights_in_bounds() const {
    for (int i = 0; i < 4; ++i)
        if (w[i] < 16384 || w[i] > 1048576) return false;
    return true;
}

namespace {

// One sample's causal neighborhood under the production derivation
// (pin P-S1-2): missing primaries read 0, farther neighbors replicate the
// nearest available one - 18.4's "replicated edge" border rule.
struct Neighborhood {
    int32_t L, T, TL, TR, WW, NN;
};

template <typename Hist>
inline Neighborhood neighbors_at(const Hist& hist, uint32_t w,
                                 size_t idx, uint32_t x, uint32_t y) {
    Neighborhood nb;
    nb.L = (x > 0) ? (int32_t)hist[idx - 1] : 0;
    nb.T = (y > 0) ? (int32_t)hist[idx - w] : 0;
    nb.TL = (x > 0 && y > 0) ? (int32_t)hist[idx - w - 1] : 0;
    nb.TR = (y > 0 && x + 1 < w) ? (int32_t)hist[idx - w + 1] : 0;
    nb.WW = (x > 1) ? (int32_t)hist[idx - 2] : nb.L;
    nb.NN = (y > 1) ? (int32_t)hist[idx - 2 * w] : nb.T;
    return nb;
}

} // namespace

std::vector<int32_t> compute_residuals_family(
    const std::vector<uint16_t>& plane, uint32_t w, uint32_t h, PredFamily fam,
    int bd) {
    std::vector<int32_t> res(plane.size());
    const int64_t maxval = ((int64_t)1 << bd) - 1;
    WEnsemble ens;
    ens.reset();   // state reset per plane (18.4)
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            const size_t idx = (size_t)y * w + x;
            // Encode side: history IS the source plane; because every stream
            // here is losslessly reversible, decoded history equals original
            // history and the decoder mirrors this walk step-for-step (I2).
            const Neighborhood nb = neighbors_at(plane, w, idx, x, y);
            int64_t pred;
            int32_t wp[4] = {0, 0, 0, 0};
            switch (fam) {
                case PredFamily::MED:
                    pred = med_predictor(nb.L, nb.T, nb.TL);
                    break;
                case PredFamily::GAP:
                    pred = gap_reduced_predict(nb.L, nb.WW, nb.T, nb.TL,
                                               nb.TR, nb.NN, bd);
                    break;
                default:   // PredFamily::WENS
                    pred = ens.weighted_mean(nb.L, nb.T, nb.TL, maxval, wp);
                    break;
            }
            if (pred < 0) pred = 0;
            if (pred > maxval) pred = maxval;   // output clamp (18.4)
            const int32_t actual = (int32_t)plane[idx];
            const int32_t r = actual - (int32_t)pred;
            res[idx] = r;
            if (fam == PredFamily::WENS)
                ens.update(wp, pred, (int64_t)r);   // err == residual (P-S1-6)
        }
    }
    return res;
}

std::vector<uint16_t> reconstruct_plane_family(
    const std::vector<int32_t>& residuals, uint32_t w, uint32_t h,
    PredFamily fam, int bd) {
    std::vector<uint16_t> plane(residuals.size());
    const int64_t maxval = ((int64_t)1 << bd) - 1;
    WEnsemble ens;
    ens.reset();   // state reset per plane (18.4)
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            const size_t idx = (size_t)y * w + x;
            // Decode side: history is the RECONSTRUCTED plane so far; it
            // equals the encoder-side history by induction, so predictions
            // and weight states mirror exactly (pinned step-equality test).
            const Neighborhood nb = neighbors_at(plane, w, idx, x, y);
            int64_t pred;
            int32_t wp[4] = {0, 0, 0, 0};
            switch (fam) {
                case PredFamily::MED:
                    pred = med_predictor(nb.L, nb.T, nb.TL);
                    break;
                case PredFamily::GAP:
                    pred = gap_reduced_predict(nb.L, nb.WW, nb.T, nb.TL,
                                               nb.TR, nb.NN, bd);
                    break;
                default:   // PredFamily::WENS
                    pred = ens.weighted_mean(nb.L, nb.T, nb.TL, maxval, wp);
                    break;
            }
            if (pred < 0) pred = 0;
            if (pred > maxval) pred = maxval;
            int64_t s = pred + residuals[idx];
            if (s < 0) s = 0;             // bounds corrupt-stream damage only:
            if (s > maxval) s = maxval;   // mirrored states make it exact
            plane[idx] = (uint16_t)s;
            if (fam == PredFamily::WENS)
                ens.update(wp, pred, (int64_t)residuals[idx]);
        }
    }
    return plane;
}

} // namespace prism::codec
