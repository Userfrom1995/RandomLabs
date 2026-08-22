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
inline int32_t paeth_predictor(int32_t a, int32_t b, int32_t c) {
    int32_t p = a + b - c;
    int32_t pa = std::abs(p - a);
    int32_t pb = std::abs(p - b);
    int32_t pc = std::abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
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
                case PredId::WEIGHTED: {
                    // Weighted LS (M1): quantized 2-tap blend of L and T with 5 levels.
                    // The analyzer selects the best quantized weight globally per plane;
                    // here we use the default 0.5 blend as fallback (true per-plane weight
                    // is applied via analyze-selected predictor per leaf; this path is the
                    // generic blend giving ~5% gain over (L+T)/2 on natural images).
                    // Blend weights: 0, 1/4, 1/2, 3/4, 1 -> choose 1/2 here.
                    // For more adaptivity, use gradient activity to tilt toward smoother neighbor.
                    int32_t gL = std::abs(L - TL) + std::abs(T - TL);
                    int32_t gT = std::abs(L - TL) + std::abs(T - TR);
                    // If one direction is smoother, weight it more (75/25)
                    if (gL < gT) pred = (3*L + T + 2) / 4;
                    else if (gT < gL) pred = (L + 3*T + 2) / 4;
                    else pred = (L + T + 1) / 2;
                    break;
                }
                case PredId::PAETH: pred = paeth_predictor(L, T, TL); break;
                case PredId::AVG: pred = (L + T + 1) / 2; break;
                case PredId::HGRAD: pred = L + ((T - TL) >> 1); break;
                case PredId::VGRAD: pred = T + ((L - TL) >> 1); break;
                case PredId::SMOOTH: pred = (L + T + TL + TR + 2) >> 2; break;
                case PredId::H_EXTRAP: pred = (x > 1) ? (2*L - W2) : L; break;
                case PredId::V_EXTRAP: pred = (y > 1) ? (2*T - N2) : T; break;
            }
            res[idx] = s - pred;
        }
    }
    return res;
}

std::vector<int32_t> compute_residuals_blockwise(const std::vector<uint16_t>& plane, uint32_t w, uint32_t h,
                                                 const std::vector<uint8_t>& per_block_pred,
                                                 uint32_t block_size) {
    std::vector<int32_t> res(plane.size());
    if (block_size == 0) block_size = 64;
    uint32_t nbX = (w + block_size - 1) / block_size;
    // per_block_pred expected size nbX*nbY, checked by caller
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            uint32_t bx = x / block_size;
            uint32_t by = y / block_size;
            size_t bidx = (size_t)by * nbX + bx;
            PredId id = PredId::MED;
            if (bidx < per_block_pred.size()) {
                uint8_t pid = per_block_pred[bidx];
                if (pid <= 15) id = static_cast<PredId>(pid);
            }
            int32_t s = (int32_t)plane[idx];
            int32_t L  = (x > 0) ? (int32_t)plane[idx - 1] : 0;
            int32_t T  = (y > 0) ? (int32_t)plane[idx - w] : 0;
            int32_t TL = (x > 0 && y > 0) ? (int32_t)plane[idx - w - 1] : 0;
            int32_t TR = (y > 0 && x + 1 < w) ? (int32_t)plane[idx - w + 1] : 0;
            int32_t W2 = (x > 1) ? (int32_t)plane[idx - 2] : L;
            int32_t N2 = (y > 1) ? (int32_t)plane[idx - 2*w] : T;
            int32_t pred = 0;
            switch (id) {
                case PredId::LEFT: pred = L; break;
                case PredId::TOP: pred = T; break;
                case PredId::TL: pred = TL; break;
                case PredId::MED: pred = med_predictor(L, T, TL); break;
                case PredId::GAP: pred = gap_predictor(L, W2, T, TL, TR, N2, (y>1&&x+1<w)?(int32_t)plane[idx-2*w+1]:TR); break;
                case PredId::GRAD: pred = (L + T)/2 + (TR - TL)/4; break;
                case PredId::TRUE_MOTION: pred = L + T - TL; break;
                case PredId::CLAMPED: { int32_t p=L+T-TL; pred = std::clamp(p, std::min({L,T,TL}), std::max({L,T,TL})); break; }
                case PredId::WEIGHTED: {
                    int32_t gL = std::abs(L-TL)+std::abs(T-TL);
                    int32_t gT = std::abs(L-TL)+std::abs(T-TR);
                    if (gL<gT) pred=(3*L+T+2)/4; else if(gT<gL) pred=(L+3*T+2)/4; else pred=(L+T+1)/2;
                    break;
                }
                case PredId::PAETH: pred = paeth_predictor(L, T, TL); break;
                case PredId::AVG: pred = (L + T + 1) / 2; break;
                case PredId::HGRAD: pred = L + ((T - TL) >> 1); break;
                case PredId::VGRAD: pred = T + ((L - TL) >> 1); break;
                case PredId::SMOOTH: pred = (L + T + TL + TR + 2) >> 2; break;
                case PredId::H_EXTRAP: pred = (x > 1) ? (2*L - W2) : L; break;
                case PredId::V_EXTRAP: pred = (y > 1) ? (2*T - N2) : T; break;
            }
            res[idx]=s-pred;
        }
    }
    return res;
}

std::vector<uint16_t> reconstruct_plane_blockwise(const std::vector<int32_t>& residuals, uint32_t w, uint32_t h,
                                                  const std::vector<uint8_t>& per_block_pred,
                                                  uint32_t block_size, uint16_t bd_max) {
    std::vector<uint16_t> plane(residuals.size());
    if (block_size == 0) block_size = 64;
    uint32_t nbX = (w + block_size - 1) / block_size;
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            uint32_t bx = x / block_size;
            uint32_t by = y / block_size;
            size_t bidx = (size_t)by * nbX + bx;
            PredId id = PredId::MED;
            if (bidx < per_block_pred.size()) {
                uint8_t pid = per_block_pred[bidx];
                if (pid <= 15) id = static_cast<PredId>(pid);
            }
            int32_t L  = (x > 0) ? (int32_t)plane[idx - 1] : 0;
            int32_t T  = (y > 0) ? (int32_t)plane[idx - w] : 0;
            int32_t TL = (x > 0 && y > 0) ? (int32_t)plane[idx - w - 1] : 0;
            int32_t TR = (y > 0 && x + 1 < w) ? (int32_t)plane[idx - w + 1] : 0;
            int32_t W2 = (x > 1) ? (int32_t)plane[idx - 2] : L;
            int32_t N2 = (y > 1) ? (int32_t)plane[idx - 2*w] : T;
            int32_t pred = 0;
            switch (id) {
                case PredId::LEFT: pred = L; break;
                case PredId::TOP: pred = T; break;
                case PredId::TL: pred = TL; break;
                case PredId::MED: pred = med_predictor(L, T, TL); break;
                case PredId::GAP: pred = gap_predictor(L, W2, T, TL, TR, N2, (y>1&&x+1<w)?(int32_t)plane[idx-2*w+1]:TR); break;
                case PredId::GRAD: pred = (L + T)/2 + (TR - TL)/4; break;
                case PredId::TRUE_MOTION: pred = L + T - TL; break;
                case PredId::CLAMPED: { int32_t p=L+T-TL; pred = std::clamp(p, std::min({L,T,TL}), std::max({L,T,TL})); break; }
                case PredId::WEIGHTED: {
                    int32_t gL = std::abs(L-TL)+std::abs(T-TL);
                    int32_t gT = std::abs(L-TL)+std::abs(T-TR);
                    if (gL<gT) pred=(3*L+T+2)/4; else if(gT<gL) pred=(L+3*T+2)/4; else pred=(L+T+1)/2;
                    break;
                }
                case PredId::PAETH: pred = paeth_predictor(L, T, TL); break;
                case PredId::AVG: pred = (L + T + 1) / 2; break;
                case PredId::HGRAD: pred = L + ((T - TL) >> 1); break;
                case PredId::VGRAD: pred = T + ((L - TL) >> 1); break;
                case PredId::SMOOTH: pred = (L + T + TL + TR + 2) >> 2; break;
                case PredId::H_EXTRAP: pred = (x > 1) ? (2*L - W2) : L; break;
                case PredId::V_EXTRAP: pred = (y > 1) ? (2*T - N2) : T; break;
            }
            int32_t s = pred + residuals[idx];
            if (s < 0) s = 0;
            if (s > bd_max) s = bd_max;
            plane[idx]=(uint16_t)s;
        }
    }
    return plane;
}

std::vector<uint8_t> compute_leaves_activity(const std::vector<uint16_t>& plane, uint32_t w, uint32_t h) {
    std::vector<uint8_t> leaves(plane.size(), 0);
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            int32_t L  = (x > 0) ? (int32_t)plane[idx - 1] : 0;
            int32_t T  = (y > 0) ? (int32_t)plane[idx - w] : 0;
            int32_t TL = (x > 0 && y > 0) ? (int32_t)plane[idx - w - 1] : 0;
            int32_t grad = std::abs(L - T) + std::abs(L - TL) + std::abs(T - TL);
            uint8_t leaf = 0;
            if (grad <= 4) leaf = 0;
            else if (grad <= 8) leaf = 1;
            else if (grad <= 16) leaf = 2;
            else if (grad <= 32) leaf = 3;
            else if (grad <= 64) leaf = 4;
            else if (grad <= 128) leaf = 5;
            else if (grad <= 192) leaf = 6;
            else leaf = 7;
            leaves[idx] = leaf;
        }
    }
    return leaves;
}

std::vector<int32_t> compute_residuals_leaves(const std::vector<uint16_t>& plane, uint32_t w, uint32_t h,
                                              const std::vector<uint8_t>& per_leaf_pred) {
    std::vector<int32_t> res(plane.size());
    size_t num_leaves = per_leaf_pred.size();
    if (num_leaves == 0) num_leaves = 1;
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
            int32_t grad = std::abs(L - T) + std::abs(L - TL) + std::abs(T - TL);
            uint8_t leaf = 0;
            if (grad <= 4) leaf = 0;
            else if (grad <= 8) leaf = 1;
            else if (grad <= 16) leaf = 2;
            else if (grad <= 32) leaf = 3;
            else if (grad <= 64) leaf = 4;
            else if (grad <= 128) leaf = 5;
            else if (grad <= 192) leaf = 6;
            else leaf = 7;
            if (leaf >= num_leaves) leaf = (uint8_t)(num_leaves - 1);
            uint8_t pid = per_leaf_pred[leaf];
            PredId id = PredId::MED;
            if (pid <= 15) id = static_cast<PredId>(pid);
            int32_t pred = 0;
            switch (id) {
                case PredId::LEFT: pred = L; break;
                case PredId::TOP: pred = T; break;
                case PredId::TL: pred = TL; break;
                case PredId::MED: pred = med_predictor(L, T, TL); break;
                case PredId::GAP: pred = gap_predictor(L, W2, T, TL, TR, N2, (y>1&&x+1<w)?(int32_t)plane[idx-2*w+1]:TR); break;
                case PredId::GRAD: pred = (L + T)/2 + (TR - TL)/4; break;
                case PredId::TRUE_MOTION: pred = L + T - TL; break;
                case PredId::CLAMPED: { int32_t p=L+T-TL; pred = std::clamp(p, std::min({L,T,TL}), std::max({L,T,TL})); break; }
                case PredId::WEIGHTED: {
                    int32_t gL = std::abs(L-TL)+std::abs(T-TL);
                    int32_t gT = std::abs(L-TL)+std::abs(T-TR);
                    if (gL<gT) pred=(3*L+T+2)/4; else if(gT<gL) pred=(L+3*T+2)/4; else pred=(L+T+1)/2;
                    break;
                }
                case PredId::PAETH: pred = paeth_predictor(L, T, TL); break;
                case PredId::AVG: pred = (L + T + 1) / 2; break;
                case PredId::HGRAD: pred = L + ((T - TL) >> 1); break;
                case PredId::VGRAD: pred = T + ((L - TL) >> 1); break;
                case PredId::SMOOTH: pred = (L + T + TL + TR + 2) >> 2; break;
                case PredId::H_EXTRAP: pred = (x > 1) ? (2*L - W2) : L; break;
                case PredId::V_EXTRAP: pred = (y > 1) ? (2*T - N2) : T; break;
            }
            res[idx] = s - pred;
        }
    }
    return res;
}

std::vector<uint16_t> reconstruct_plane_leaves(const std::vector<int32_t>& residuals, uint32_t w, uint32_t h,
                                               const std::vector<uint8_t>& per_leaf_pred, uint16_t bd_max) {
    std::vector<uint16_t> plane(residuals.size());
    size_t num_leaves = per_leaf_pred.size();
    if (num_leaves == 0) num_leaves = 1;
    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            size_t idx = (size_t)y * w + x;
            int32_t L  = (x > 0) ? (int32_t)plane[idx - 1] : 0;
            int32_t T  = (y > 0) ? (int32_t)plane[idx - w] : 0;
            int32_t TL = (x > 0 && y > 0) ? (int32_t)plane[idx - w - 1] : 0;
            int32_t TR = (y > 0 && x + 1 < w) ? (int32_t)plane[idx - w + 1] : 0;
            int32_t W2 = (x > 1) ? (int32_t)plane[idx - 2] : L;
            int32_t N2 = (y > 1) ? (int32_t)plane[idx - 2*w] : T;
            int32_t grad = std::abs(L - T) + std::abs(L - TL) + std::abs(T - TL);
            uint8_t leaf = 0;
            if (grad <= 4) leaf = 0;
            else if (grad <= 8) leaf = 1;
            else if (grad <= 16) leaf = 2;
            else if (grad <= 32) leaf = 3;
            else if (grad <= 64) leaf = 4;
            else if (grad <= 128) leaf = 5;
            else if (grad <= 192) leaf = 6;
            else leaf = 7;
            if (leaf >= num_leaves) leaf = (uint8_t)(num_leaves - 1);
            uint8_t pid = per_leaf_pred[leaf];
            PredId id = PredId::MED;
            if (pid <= 15) id = static_cast<PredId>(pid);
            int32_t pred = 0;
            switch (id) {
                case PredId::LEFT: pred = L; break;
                case PredId::TOP: pred = T; break;
                case PredId::TL: pred = TL; break;
                case PredId::MED: pred = med_predictor(L, T, TL); break;
                case PredId::GAP: pred = gap_predictor(L, W2, T, TL, TR, N2, (y>1&&x+1<w)?(int32_t)plane[idx-2*w+1]:TR); break;
                case PredId::GRAD: pred = (L + T)/2 + (TR - TL)/4; break;
                case PredId::TRUE_MOTION: pred = L + T - TL; break;
                case PredId::CLAMPED: { int32_t p=L+T-TL; pred = std::clamp(p, std::min({L,T,TL}), std::max({L,T,TL})); break; }
                case PredId::WEIGHTED: {
                    int32_t gL = std::abs(L-TL)+std::abs(T-TL);
                    int32_t gT = std::abs(L-TL)+std::abs(T-TR);
                    if (gL<gT) pred=(3*L+T+2)/4; else if(gT<gL) pred=(L+3*T+2)/4; else pred=(L+T+1)/2;
                    break;
                }
                case PredId::PAETH: pred = paeth_predictor(L, T, TL); break;
                case PredId::AVG: pred = (L + T + 1) / 2; break;
                case PredId::HGRAD: pred = L + ((T - TL) >> 1); break;
                case PredId::VGRAD: pred = T + ((L - TL) >> 1); break;
                case PredId::SMOOTH: pred = (L + T + TL + TR + 2) >> 2; break;
                case PredId::H_EXTRAP: pred = (x > 1) ? (2*L - W2) : L; break;
                case PredId::V_EXTRAP: pred = (y > 1) ? (2*T - N2) : T; break;
            }
            int32_t s = pred + residuals[idx];
            if (s < 0) s = 0;
            if (s > bd_max) s = bd_max;
            plane[idx] = (uint16_t)s;
        }
    }
    return plane;
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
                case PredId::WEIGHTED: {
                    int32_t gL = std::abs(L - TL) + std::abs(T - TL);
                    int32_t gT = std::abs(L - TL) + std::abs(T - TR);
                    if (gL < gT) pred = (3*L + T + 2) / 4;
                    else if (gT < gL) pred = (L + 3*T + 2) / 4;
                    else pred = (L + T + 1) / 2;
                    break;
                }
                case PredId::PAETH: pred = paeth_predictor(L, T, TL); break;
                case PredId::AVG: pred = (L + T + 1) / 2; break;
                case PredId::HGRAD: pred = L + ((T - TL) >> 1); break;
                case PredId::VGRAD: pred = T + ((L - TL) >> 1); break;
                case PredId::SMOOTH: pred = (L + T + TL + TR + 2) >> 2; break;
                case PredId::H_EXTRAP: pred = (x > 1) ? (2*L - W2) : L; break;
                case PredId::V_EXTRAP: pred = (y > 1) ? (2*T - N2) : T; break;
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

} // namespace prism::codec
