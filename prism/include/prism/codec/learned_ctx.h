#pragma once
#include <cstdint>
#include <array>
#include <vector>

namespace prism::codec {

// Learned neural context model (Route 4 / X3a, "beyond-predictive" paradigm).
//
// The fixed-context EMA (I28) is a strong online model, but it can only use a
// coarse summary of the already-coded neighbourhood (significance counts). The
// magnitude of the already-coded neighbours carries far more information about a
// coefficient's own magnitude than a binary significance count does. A tiny
// multilayer perceptron, trained offline on real Kodak imagery and baked into
// the binary as constants, turns a window of neighbour-magnitude / own-magnitude
// features into a per-symbol probability estimate. That estimate is blended with
// the per-context EMA so the coder keeps online adaptation while gaining the
// richer, data-driven prior.
//
// All features are computable from ALREADY-CODED information at both encode and
// decode time (mirror symmetry is what makes the rANS stream round-trip), so no
// model table is ever transmitted: the NET stays equal to payload + header
// (invariant I29).

// Per-symbol feature vector fed to the MLP. Every field is an integer in a small
// range; the MLP normalises internally.
struct LCFeat {
    uint8_t symtype = 0;     // 0 = significance, 1 = sign, 2 = refinement
    uint8_t orient = 0;      // subband orientation 0..3
    uint8_t parent_sig = 0;  // parent coefficient already significant (0/1)
    uint8_t fc = 0;          // significant 4-connected neighbour count 0..4
    uint8_t dg = 0;          // significant diagonal neighbour count 0..4
    uint8_t nbsig = 0;       // fc + dg 0..8 (cheap aggregate)
    uint8_t nmag = 0;        // max already-coded same-subband neighbour magnitude, log2-quantised 0..7
    uint8_t pmag = 0;        // parent coefficient magnitude, log2-quantised 0..7
    uint8_t ownmag = 0;       // this coefficient's reconstructed magnitude so far, log2-quantised 0..7
                             //   (0 while still insignificant; for sign it is the msb position)
    uint8_t ppos = 0;        // current bitplane index, clamped 0..7
    uint8_t level = 0;       // wavelet decomposition level (0 = LL, 1..maxlevel); see X3b context fix
};

// Build the feature vector from the scalar walk state. This is the single source
// of truth for feature computation, shared by the encoder, decoder, the offline
// trainer, and sample collection so encode/decode stay perfectly symmetric.
inline LCFeat make_lcfeat(uint8_t symtype, uint8_t orient, uint8_t parent_sig,
                           uint8_t fc, uint8_t dg, uint8_t nmag, uint8_t pmag,
                           uint8_t ownmag, uint8_t ppos, uint8_t level) {
    LCFeat f;
    f.symtype = symtype;
    f.orient = orient;
    f.parent_sig = parent_sig;
    f.fc = fc;
    f.dg = dg;
    f.nbsig = (uint8_t)(fc + dg);
    f.nmag = nmag;
    f.pmag = pmag;
    f.ownmag = ownmag;
    f.ppos = ppos;
    f.level = level;
    return f;
}

// One training / evaluation sample: the feature vector, the true symbol bit, and
// the coarse context key (legacy I28 base + sign/refine pool) used by the EMA.
struct LSample {
    LCFeat feat{};
    uint8_t label = 0;   // actual bit (0/1)
    uint32_t coarse = 0; // coarse context id (0..599)
};

// MLP forward (P(bit==1) in (0,1)) and convenience P(bit==0)*M (rANS safe range).
float learned_predict_p1(const LCFeat& f);
uint16_t learned_predict_p0(const LCFeat& f);

// Normalise a feature vector into the MLP input range. Single shared definition
// so the offline trainer (main.cpp) and the baked inference (learned_ctx.cpp)
// can never drift apart and break encode/decode symmetry.
void learned_norm(const LCFeat& f, float out[10]);

// Runtime blend weight between the learned prior and the online EMA. 0 = pure
// EMA (pre-training safe), 1 = pure learned. Initialised from the baked LBlend
// value but overridable (e.g. by `prism bench-x --blend`) without rebuild.
float learned_blend();
void learned_set_blend(float v);

// Runtime override of the MLP-prior pseudocount K in LearnedModel (X3a). Larger K
// => trust the learned prior more for fine contexts. Overridable without rebuild.
float learned_pseudo();
void learned_set_pseudo(float v);

// Online model that blends the learned MLP prior with a per-context EMA over a
// FINE, magnitude-aware context. The fine context keys on neighbour/own
// magnitude buckets so it is far more discriminative than the legacy I28 coarse
// context; but a fine context starves of samples under pure EMA (table-economics
// law). The learned MLP supplies a data-driven prior that SEEDS each fine context
// via a pseudocount blend: rare contexts (few samples) lean on the MLP, common
// contexts converge to the exact per-stream EMA. This takes the MLP's
// generalisation where EMA cannot adapt and EMA's precision where data is rich.
struct LearnedModel {
    // Fine context layout (bit-packed). Buckets chosen so the table stays
    // bounded yet discriminative. Max id < FINE_POOL.
    //
    // X3b context fix: FB_LEVEL was the critical missing dimension. Previously
    // the context keyed only on (orient, parent_sig, fc, dg, nmag, ownmag,
    // ppos) and IGNORED the decomposition level, so e.g. HL at level 1 (large
    // coefficients) and HL at level 5 (tiny coefficients) collided in the same
    // EMA bucket despite completely different magnitude distributions. Adding
    // the level separates them and lets the online model track each level's
    // statistics independently.
    static constexpr int FB_SYMTYPE = 3;
    static constexpr int FB_ORIENT = 4;
    static constexpr int FB_PARENT = 2;
    static constexpr int FB_FC = 5;
    static constexpr int FB_DG = 5;
    static constexpr int FB_NMAG = 8;
    static constexpr int FB_OWN = 8;
    static constexpr int FB_PPOS = 8;
    static constexpr int FB_LEVEL = 6; // 0..5 (X_DEFAULT_LEVELS=5)
    static constexpr uint32_t FINE_POOL = 3u * 4 * 2 * 5 * 5 * 8 * 8 * 8 * 6; // 1843200
    static constexpr int EMA_SHIFT = 5;
    static constexpr uint32_t M = 1u << 16;
    // Default MLP-prior pseudocount (runtime-overridable via --pseudo). Kept in
    // sync with the effective default g_pseudo in learned_ctx.cpp (X3b cleanup:
    // was an inconsistent 32 here vs 64 there).
    static constexpr float K_PSEUDO = 64.0f;

    LearnedModel() {
        ema_.assign(FINE_POOL, M / 2);
        count_.assign(FINE_POOL, 0);
    }

    static uint32_t fine_ctx(const LCFeat& f) {
        uint32_t id = 0;
        id = id * FB_SYMTYPE + (f.symtype % FB_SYMTYPE);
        id = id * FB_ORIENT + (f.orient % FB_ORIENT);
        id = id * FB_PARENT + (f.parent_sig ? 1u : 0u);
        id = id * FB_FC + (uint32_t)(f.fc % FB_FC);
        id = id * FB_DG + (uint32_t)(f.dg % FB_DG);
        id = id * FB_NMAG + (uint32_t)(f.nmag % FB_NMAG);
        id = id * FB_OWN + (uint32_t)(f.ownmag % FB_OWN);
        id = id * FB_PPOS + (uint32_t)(f.ppos % FB_PPOS);
        id = id * FB_LEVEL + (uint32_t)(f.level % FB_LEVEL);
        return id;
    }

    // Probability (P(0)*M) for the next symbol given its learned features. Does
    // NOT advance the state (call update() afterwards).
    //
    // Two-stage blend: (1) the per-context pseudocount `alpha = n/(n+K)`
    // weights the online EMA against the MLP prior (rare contexts lean on the
    // MLP, frequent contexts converge to the exact per-stream EMA); (2) the
    // global `blend` lever (learned_blend(), overridable via --blend) further
    // tilts the whole mixture toward the MLP. blend=0 reproduces the original
    // pure-pseudocount mix; blend=1 forces the MLP prior entirely.
    uint16_t predict(const LCFeat& f) const {
        uint32_t c = fine_ctx(f);
        uint16_t ema = ema_[c];
        uint32_t n = count_[c];
        float alpha = (float)n / (float)(n + learned_pseudo());
        uint16_t mlp = learned_predict_p0(f);
        float w_ema = alpha * (1.0f - learned_blend());
        float w_mlp = 1.0f - w_ema;
        int blended = (int)(w_ema * (float)ema + w_mlp * (float)mlp);
        if (blended < 1) blended = 1;
        if (blended > (int)M - 1) blended = (int)M - 1;
        return (uint16_t)blended;
    }

    // Advance the EMA + sample count with the symbol's actual bit (causal).
    void update(const LCFeat& f, uint8_t bit) {
        uint32_t c = fine_ctx(f);
        uint16_t& p0 = ema_[c];
        if (bit == 0)
            p0 += (uint16_t)((M - p0) >> EMA_SHIFT);
        else
            p0 -= (uint16_t)(p0 >> EMA_SHIFT);
        if (p0 < 1) p0 = 1;
        if (p0 > M - 1) p0 = (uint16_t)(M - 1);
        if (count_[c] < 0xFFFFu) ++count_[c];
    }

private:
    std::vector<uint16_t> ema_;
    std::vector<uint32_t> count_;
};

} // namespace prism::codec
