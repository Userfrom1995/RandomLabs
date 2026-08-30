// Learned neural context model - forward pass (Route 4 / X3a).
//
// The MLP weights (LW1/Lb1/LW2/Lb2) are baked constants produced by
// `prism train-learned` on real Kodak imagery, stored in
// prism/src/codec/learned_ctx_data.inc. Until training runs, that file holds
// zeros and LBlend = 0, so the network outputs P(bit==1)=0.5 (a neutral prior
// that keeps the codec correct and rate-neutral versus the pre-X3a baseline).

#include "prism/codec/learned_ctx.h"
#include "prism/codec/bitplane.h"   // R6DRaw full definition (R9 tree mode)
#include "route6d_tree.inc"          // baked R6D property tree (R9 context quantizer)
#include <algorithm>
#include <cmath>

namespace prism::codec {

namespace {
// R9: local copy of the R6D tree walk operating on R6DRaw, so LearnedModel can
// key its online EMA by the baked property-tree leaf without exposing the tree
// in the public header. Mirrors bitplane.cpp's r6d_leaf_id exactly.
inline int r9_raw_feat(const R6DRaw& r, int feat) {
    switch (feat) {
        case R6D_FEAT_W:   return r.mW;
        case R6D_FEAT_N:   return r.mN;
        case R6D_FEAT_E:   return r.mE;
        case R6D_FEAT_S:   return r.mS;
        case R6D_FEAT_NW:  return r.mNW;
        case R6D_FEAT_NE:  return r.mNE;
        case R6D_FEAT_SW:  return r.mSW;
        case R6D_FEAT_SE:  return r.mSE;
        case R6D_FEAT_PARENT: return r.mParent;
        case R6D_FEAT_LUMA:   return r.mLuma;
        case R6D_FEAT_OWN:    return r.mOwn;
        case R6D_FEAT_PPOS:   return r.ppos;
        case R6D_FEAT_SYMTYPE: return (int)r.symtype;
        case R6D_FEAT_ORIENT:  return (int)r.orient;
        case R6D_FEAT_LEVEL:   return (int)r.level;
        case R6D_FEAT_PARENT_SIG: return (int)r.parent_sig;
        default: return 0;
    }
}
inline int r9_leaf(const R6DRaw& r) {
    int node = 0;
    while (R6D_TREE[node].split != 0) {
        const R6DNode& nd = R6D_TREE[node];
        bool go_rhs;
        if (nd.split == 1) go_rhs = (r9_raw_feat(r, nd.feat) >= (int)nd.thr);
        else go_rhs = ((int)r.symtype == (int)nd.thr);
        node = go_rhs ? nd.rhs : nd.lhs;
    }
    return R6D_TREE[node].leaf;
}
inline int r9_leaf_id(const R6DRaw& r, int K) {
    int l = r9_leaf(r);
    if (l >= K) l = K - 1;
    return l;
}
} // namespace

bool g_r9_tree_ema = false;
void learned_set_r9_tree_ema(bool v) { g_r9_tree_ema = v; }


namespace {
constexpr int LF = 13;  // input features (X5a adds lc_mag + lc_sig; X3b fix adds level)
constexpr int LH1 = 32; // first hidden layer width (X3b: deeper/wider)
constexpr int LH2 = 16; // second hidden layer width

// Baked by `prism train-learned`. Default (pre-training) values are neutral.
#include "learned_ctx_data.inc"

inline float sigmoidf(float x) { return 1.0f / (1.0f + std::exp(-x)); }
} // namespace

const float kLearnedBlend = LBlend;

namespace {
float g_blend = LBlend; // runtime-overridable mirror of LBlend
// Runtime-overridable MLP-prior pseudocount. Default kept consistent with
// LearnedModel::K_PSEUDO (X3b cleanup of the 32-vs-64 inconsistency).
float g_pseudo = LearnedModel::K_PSEUDO;
}

float learned_blend() { return g_blend; }
void learned_set_blend(float v) { g_blend = v; }
float learned_pseudo() { return g_pseudo; }
void learned_set_pseudo(float v) { g_pseudo = v; }

// R9 predict overload. INTENTIONAL: returns a PURE EMA with no MLP prior (see
// the documentation note on LearnedModel::predict(f, r) in learned_ctx.h). R9
// isolates the context-granularity effect (coarse 1024-leaf tree cluster vs the
// fine 1.84M-entry MLP-blended EMA), so the overload deliberately drops the MLP
// blend that the fine-context path uses. The diagnosis below is read against
// that known design choice, not as blended-vs-blended.
uint16_t LearnedModel::predict(const LCFeat& f, const R6DRaw& r) const {
    if (g_r9_tree_ema) {
        int leaf = r9_leaf_id(r, (int)R6D_K);
        uint32_t c = (uint32_t)leaf * 3u + (uint32_t)(f.symtype % 3);
        uint16_t p = ema_[c];
        if (p < 1) p = 1;
        if (p > M - 1) p = (uint16_t)(M - 1);
        return p;
    }
    return predict(f);
}

void LearnedModel::update(const LCFeat& f, const R6DRaw& r, uint8_t bit) {
    if (g_r9_tree_ema) {
        int leaf = r9_leaf_id(r, (int)R6D_K);
        uint32_t c = (uint32_t)leaf * 3u + (uint32_t)(f.symtype % 3);
        uint16_t& p0 = ema_[c];
        if (bit == 0)
            p0 += (uint16_t)((M - p0) >> EMA_SHIFT);
        else
            p0 -= (uint16_t)(p0 >> EMA_SHIFT);
        if (p0 < 1) p0 = 1;
        if (p0 > M - 1) p0 = (uint16_t)(M - 1);
        if (count_[c] < 0xFFFFu) ++count_[c];
        return;
    }
    update(f, bit);
}

void learned_norm(const LCFeat& f, float out[LF]) {
    out[0] = f.symtype / 2.0f;
    out[1] = f.orient / 3.0f;
    out[2] = f.parent_sig ? 1.0f : 0.0f;
    out[3] = f.fc / 4.0f;
    out[4] = f.dg / 4.0f;
    out[5] = f.nbsig / 8.0f;
    out[6] = f.nmag / 7.0f;
    out[7] = f.pmag / 7.0f;
    out[8] = f.ownmag / 7.0f;
    out[9] = f.ppos / 7.0f;
    out[10] = f.lc_mag / 7.0f;
    out[11] = f.lc_sig ? 1.0f : 0.0f;
    // X3b fix (F1): the wavelet decomposition level was previously only used by
    // the online EMA (fine_ctx -> FB_LEVEL). Exposing it to the MLP prior lets the
    // network specialise its magnitude prior per level (e.g. HL@L1 vs HL@L5 have
    // very different magnitude distributions) instead of relying solely on the EMA
    // to separate them. Normalised to 0..1 (level 0..5).
    out[12] = f.level / 5.0f;
}

float learned_predict_p1(const LCFeat& f) {
    float x[LF];
    learned_norm(f, x);

    // Layer 1: ReLU(LW1.x + b1)
    float h1[LH1];
    for (int j = 0; j < LH1; ++j) {
        float acc = Lb1[j];
        for (int i = 0; i < LF; ++i) acc += LW1[j][i] * x[i];
        h1[j] = acc > 0.0f ? acc : 0.0f;
    }
    // Layer 2: ReLU(LW2.h1 + b2)
    float h2[LH2];
    for (int j = 0; j < LH2; ++j) {
        float acc = Lb2[j];
        for (int i = 0; i < LH1; ++i) acc += LW2[j][i] * h1[i];
        h2[j] = acc > 0.0f ? acc : 0.0f;
    }
    float acc = Lb3;
    for (int j = 0; j < LH2; ++j) acc += LW3[j] * h2[j];
    float p = sigmoidf(acc);
    if (p < 0.02f) p = 0.02f;
    if (p > 0.98f) p = 0.98f;
    return p;
}

uint16_t learned_predict_p0(const LCFeat& f) {
    float p1 = learned_predict_p1(f);
    int p0 = (int)((1.0f - p1) * (float)(1u << 16) + 0.5f);
    if (p0 < 1) p0 = 1;
    if (p0 > (int)(1u << 16) - 1) p0 = (int)(1u << 16) - 1;
    return (uint16_t)p0;
}

} // namespace prism::codec
