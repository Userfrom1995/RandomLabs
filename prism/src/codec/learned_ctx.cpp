// Learned neural context model - forward pass (Route 4 / X3a).
//
// The MLP weights (LW1/Lb1/LW2/Lb2) are baked constants produced by
// `prism train-learned` on real Kodak imagery, stored in
// prism/src/codec/learned_ctx_data.inc. Until training runs, that file holds
// zeros and LBlend = 0, so the network outputs P(bit==1)=0.5 (a neutral prior
// that keeps the codec correct and rate-neutral versus the pre-X3a baseline).

#include "prism/codec/learned_ctx.h"
#include <algorithm>
#include <cmath>

namespace prism::codec {

namespace {
constexpr int LH = 16; // hidden units
constexpr int LF = 10; // input features

// Baked by `prism train-learned`. Default (pre-training) values are neutral.
#include "learned_ctx_data.inc"

inline float sigmoidf(float x) { return 1.0f / (1.0f + std::exp(-x)); }
} // namespace

const float kLearnedBlend = LBlend;

namespace {
float g_blend = LBlend; // runtime-overridable mirror of LBlend
float g_pseudo = 64.0f; // runtime-overridable MLP-prior pseudocount
}

float learned_blend() { return g_blend; }
void learned_set_blend(float v) { g_blend = v; }
float learned_pseudo() { return g_pseudo; }
void learned_set_pseudo(float v) { g_pseudo = v; }

float learned_predict_p1(const LCFeat& f) {
    float x[LF];
    x[0] = f.symtype / 2.0f;
    x[1] = f.orient / 3.0f;
    x[2] = f.parent_sig ? 1.0f : 0.0f;
    x[3] = f.fc / 4.0f;
    x[4] = f.dg / 4.0f;
    x[5] = f.nbsig / 8.0f;
    x[6] = f.nmag / 7.0f;
    x[7] = f.pmag / 7.0f;
    x[8] = f.ownmag / 7.0f;
    x[9] = f.ppos / 7.0f;

    float h[LH];
    for (int j = 0; j < LH; ++j) {
        float acc = Lb1[j];
        for (int i = 0; i < LF; ++i) acc += LW1[j][i] * x[i];
        h[j] = acc > 0.0f ? acc : 0.0f; // ReLU
    }
    float acc = Lb2;
    for (int j = 0; j < LH; ++j) acc += LW2[j] * h[j];
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
