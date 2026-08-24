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

} // namespace prism::codec

