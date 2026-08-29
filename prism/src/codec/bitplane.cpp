// EBCOT-style bitplane coder with the pinned parent-aware context (I28) plus the
// X3a learned neural context model.
//
// Codec structure: for each subband in coding order (LL first, then HL/LH/HH
// coarse-to-fine), and for each bitplane from MSB down to LSB, each coefficient
// emits one SIGNIFICANCE (or REFINEMENT) bit; on the bitplane where a coefficient
// first becomes significant an extra SIGN bit follows. The probability for every
// symbol is produced by LearnedModel: a per-context EMA (the legacy I28 adaptive
// model) blended with a tiny MLP that turns a window of already-coded neighbour /
// own magnitudes into a data-driven prior. All features are computable from
// already-coded information at both encode and decode time, so the rANS stream
// round-trips exactly and no model table is ever transmitted (invariant I29).

#include "prism/codec/bitplane.h"
#include "prism/codec/bitplane_rans.h"
#include "prism/codec/learned_ctx.h"
#include "prism/codec/route6c_tree.h"
#include <algorithm>
#include <stdexcept>
#include <vector>
#include <cmath>

namespace prism::codec {

namespace {

// X6c hyperprior: apply a per-subband probability-calibration factor `s` to a
// predicted P(0)*M probability. p0 in [1, 65534] keeps rANS valid (P(0),P(1) both
// strictly inside (0, M)). Sub-1 factors sharpen the predicted peak (assume the
// model over-spreads the mass); super-1 factors flatten it. Symmetric encode/decode.
static inline uint16_t scale_p0(uint16_t p, float s) {
    if (s == 1.0f) return p;
    float v = (float)p * s;
    if (v < 1.0f) v = 1.0f;
    if (v > 65534.0f) v = 65534.0f;
    return (uint16_t)std::lround(v);
}

int floor_log2(uint32_t v) {
    if (v == 0) return -1;
    return 31 - __builtin_clz(v);
}

int mag_bucket(int32_t v) {
    if (v <= 0) return 0;
    return (int)std::min(7, floor_log2((uint32_t)v));
}

// R6-B class: (symtype x bitplane-bucket). Both terms are known at BOTH encode
// and decode time BEFORE the bit is decided (symtype is the walk state; p is the
// current bitplane index), so the class is perfectly symmetric and the
// transmitted per-class histogram stays a valid static prior. 3 symtypes x 4
// bitplane buckets = 12 classes (research-route6 section 3).
inline int r6b_class(uint8_t symtype, int p) {
    int pb = (p < 3) ? 0 : (p < 6) ? 1 : (p < 9) ? 2 : 3;
    return (int)symtype * 4 + pb;
}

// R6-B blend model: a transmitted per-(subband, class) static P(0) backbone
// combined with the learned context model (MLP prior + per-context adaptive
// EMA, i.e. LearnedModel). The static histogram is the JXL-Modular "transmitted
// tree" that removes the per-subband systematic bias and seeds every context at
// its class empirical distribution instead of p=0.5; the learned model keeps the
// magnitude-aware prior and refines rich contexts. Both evolve identically at
// encode and decode (the learned weights are baked constants, the static table
// is transmitted), so the rANS stream round-trips byte-exact. R6B_W_STATIC is a
// global blend weight (0 = pure learned, 1 = pure transmitted histogram).
struct StaticAdaptiveModel {
    static constexpr uint32_t M = 1u << 16;
    static constexpr float W_STATIC = 0.35f; // transmitted-histogram weight
    std::vector<std::vector<uint16_t>> sp0;  // [NS][R6B_CLASSES]
    LearnedModel learned;

    void init(size_t NS, const std::vector<std::vector<uint16_t>>& s) {
        sp0 = s;
        learned = LearnedModel();
    }
    uint16_t predict(const LCFeat& f, uint8_t oi, uint8_t cls) const {
        uint16_t lp = learned.predict(f);
        uint16_t sp = sp0[oi][cls];
        float w = W_STATIC;
        int b = (int)(w * (float)sp + (1.0f - w) * (float)lp);
        if (b < 1) b = 1;
        if (b > (int)M - 1) b = (int)M - 1;
        return (uint16_t)b;
    }
    void update(const LCFeat& f, uint8_t bit) { learned.update(f, bit); }
};

// R6-C (Route 6 lever C) blend model: a transmitted per-cluster P(0) backbone
// combined with the learned context model (EMA + MLP, i.e. LearnedModel). The
// static histogram here is ONE image-global P(0) per fine-context CLUSTER (see
// route6c_tree.h), not R6-B's per-(subband, class) table. Because the cluster
// partition keys on the same LCFeat the EMA keys on, the transmitted backbone is
// finer-or-equal to the cold-starting EMA everywhere: populated clusters carry
// the whole-image exact P(0); empty clusters carry neutral M/2 and the blend
// degenerates to pure EMA. Both the (1-W) learned prior and the W static prior
// evolve identically at encode and decode, so the rANS stream round-trips
// byte-exact. R6C_W is a global blend weight (0 = pure learned, 1 = pure
// transmitted histogram).
struct R6CAdaptiveModel {
    static constexpr uint32_t M = 1u << 16;
    std::vector<uint16_t> sp0;  // [r6c_K()] transmitted P(0)*M per cluster
    LearnedModel learned;

    void init(size_t K, const std::vector<uint16_t>& s) {
        sp0.assign(K, (uint16_t)(M / 2));
        for (size_t i = 0; i < s.size() && i < sp0.size(); ++i) sp0[i] = s[i];
        learned = LearnedModel();
    }
    uint16_t predict(const LCFeat& f) const {
        uint32_t C = r6c_cluster_id(f);
        uint16_t sp = sp0[C];
        uint16_t lp = learned.predict(f);
        float w = r6c_w();
        int b = (int)(w * (float)sp + (1.0f - w) * (float)lp);
        if (b < 1) b = 1;
        if (b > (int)M - 1) b = (int)M - 1;
        return (uint16_t)b;
    }
    void update(const LCFeat& f, uint8_t bit) { learned.update(f, bit); }
};

// Build the coding order: LL(level 0) first, then level 1..maxlevel HL,LH,HH.
std::vector<int> coding_order(const std::vector<Subband>& subs, int& maxlevel) {
    int ml = 0;
    for (const auto& s : subs) if (s.level > ml) ml = s.level;
    maxlevel = ml;
    std::vector<int> map(4 * (ml + 1), -1);
    for (int i = 0; i < (int)subs.size(); ++i)
        map[(int)subs[i].orient * (ml + 1) + subs[i].level] = i;
    std::vector<int> order;
    order.reserve(subs.size());
    if (map[0 * (ml + 1) + 0] >= 0) order.push_back(map[0 * (ml + 1) + 0]);
    for (int L = 1; L <= ml; ++L)
        for (int o = 1; o <= 3; ++o) {
            int idx = map[o * (ml + 1) + L];
            if (idx >= 0) order.push_back(idx);
        }
    return order;
}

std::vector<int> build_parent_map(const std::vector<Subband>& subs, int ml) {
    std::vector<int> map(4 * (ml + 1), -1);
    for (int i = 0; i < (int)subs.size(); ++i)
        map[(int)subs[i].orient * (ml + 1) + subs[i].level] = i;
    std::vector<int> parent(subs.size(), -1);
    for (int i = 0; i < (int)subs.size(); ++i) {
        const Subband& s = subs[i];
        if (s.level == 0) parent[i] = -1;
        else if (s.level == 1) parent[i] = map[0 * (ml + 1) + 0];
        else parent[i] = map[(int)s.orient * (ml + 1) + (s.level - 1)];
    }
    return parent;
}

// 8-neighbour significance pattern -> (fc, dg) counts (EBCOT significance
// propagation context, the legacy I28 base).
void neighbor_counts(const std::vector<uint8_t>& sig, int w, int h, int x, int y,
                     int& fc, int& dg) {
    fc = 0; dg = 0;
    auto at = [&](int nx, int ny) -> bool {
        return nx >= 0 && nx < w && ny >= 0 && ny < h && sig[(size_t)ny * w + nx];
    };
    if (at(x - 1, y)) ++fc;
    if (at(x + 1, y)) ++fc;
    if (at(x, y - 1)) ++fc;
    if (at(x, y + 1)) ++fc;
    if (at(x - 1, y - 1)) ++dg;
    if (at(x + 1, y - 1)) ++dg;
    if (at(x - 1, y + 1)) ++dg;
    if (at(x + 1, y + 1)) ++dg;
}

// Compute the X3a learned features for the symbol at (x, y) on bitplane p within
// subband `si`. `sig`/`mag` are the single-subband significance and RUNNING
// reconstructed-magnitude maps (already-coded coefficients only). `pmag` (when
// non-null) is the parent subband's magnitude map. `lmag`/`lsig` (when non-null)
// are the co-located LUMA subband's magnitude/significance maps (X5a cross-
// component context); indexed by the SAME oi as the subband being coded.
// Identical between encoder and decoder because both maintain `mag`/`sig` from
// the same already-coded state.
void learned_features(const std::vector<uint8_t>& sig,
                      const std::vector<int32_t>& mag,
                      const std::vector<int32_t>* pmag, int pw, int ph,
                      const std::vector<int32_t>* lmag,
                      int w, int h, int x, int y, int p, int symtype,
                      int level, LCFeat& f) {
    int nm = 0;
    auto nmag_at = [&](int nx, int ny) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && sig[(size_t)ny * w + nx])
            nm = std::max(nm, (int)mag[(size_t)ny * w + nx]);
    };
    nmag_at(x - 1, y); nmag_at(x + 1, y); nmag_at(x, y - 1); nmag_at(x, y + 1);
    nmag_at(x - 1, y - 1); nmag_at(x + 1, y - 1); nmag_at(x - 1, y + 1); nmag_at(x + 1, y + 1);
    int pm = 0;
    if (pmag) {
        int pcx = x >> 1, pcy = y >> 1;
        if (pcx < pw && pcy < ph) pm = (int)(*pmag)[(size_t)pcy * pw + pcx];
    }
    int lm = 0, ls = 0;
    if (lmag) lm = (int)std::abs((*lmag)[(size_t)y * w + x]), ls = ((*lmag)[(size_t)y * w + x] != 0);
    uint8_t nmag = (uint8_t)mag_bucket(nm);
    uint8_t pmag_b = (uint8_t)mag_bucket(pm);
    uint8_t ownmag = 0;
    if (symtype == 1) ownmag = (uint8_t)std::min(7, p);                   // sign: msb == p
    else if (symtype == 2) ownmag = (uint8_t)mag_bucket(mag[(size_t)y * w + x]); // refine
    f = make_lcfeat((uint8_t)symtype, 0, 0, 0, 0, nmag, pmag_b, ownmag, (uint8_t)std::min(7, p),
                    (uint8_t)std::min(5, level), (uint8_t)mag_bucket(lm),
                    (uint8_t)(ls ? 1 : 0));
}

} // namespace

// R6-C blend weight (global, runtime-overridable via --w without rebuild). At
// prism::codec scope so the CLI (main.cpp) can set it via set_r6c_w().
float g_r6c_w = 0.6f;
float r6c_w() { return g_r6c_w; }
void set_r6c_w(float v) {
    if (v < 0.0f) v = 0.0f;
    if (v > 1.0f) v = 1.0f;
    g_r6c_w = v;
}

uint32_t BitplaneCoder::context_id(Subband::Orient o, bool parent_sig, int fc, int dg) {
    uint32_t orient = (uint32_t)o;          // 0..3  (2 bits)
    uint32_t ps = parent_sig ? 1u : 0u;     // 1 bit
    uint32_t f = (fc > 4) ? 4u : (uint32_t)fc;  // 0..4 (3 bits)
    uint32_t d = (dg > 4) ? 4u : (uint32_t)dg;  // 0..4 (3 bits)
    return orient + ps * 4u + f * 8u + d * 40u; // base in [0, 199]
}

static inline uint32_t coarse_ctx(uint32_t base, int symtype) {
    return base + (uint32_t)symtype * 200u; // 0..199 sig, 200..399 sign, 400..599 refine
}

BitplaneCoder::Result BitplaneCoder::encode(const std::vector<Subband>& subbands,
                                            int maxbits_override,
                                            const std::vector<std::vector<int32_t>>* luma_mag,
                                            const std::vector<float>* sub_scale) const {
    int ml = 0;
    auto order = coding_order(subbands, ml);
    auto parent = build_parent_map(subbands, ml);
    size_t NS = subbands.size();

    // Per-subband bitplane range (EBCOT-style): each subband keeps its own B so
    // tiny AC bands are not forced to emit the global LL bit-depth as wasted
    // all-zero significance bits. Indexed by original subband index oi.
    std::vector<uint8_t> sub_maxbits(NS, 0);
    for (size_t oi = 0; oi < NS; ++oi) {
        int B = 1;
        for (int32_t c : subbands[oi].coeffs) {
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            int b = (m == 0) ? 0 : floor_log2(m) + 1;
            if (b > B) B = b;
        }
        if (maxbits_override > 0) B = maxbits_override;
        sub_maxbits[oi] = (uint8_t)B;
    }

    // Shared per-subband state, indexed by original oi. Shared so a child
    // subband's PARENT magnitude/context is available while it is coded (the
    // critical X3b fix: previously each subband was encoded in isolation, so
    // parent features were always zero at inference).
    std::vector<std::vector<uint8_t>> sig(NS);
    std::vector<std::vector<int32_t>> magv(NS), curmag(NS);
    std::vector<std::vector<uint8_t>> sgn(NS);
    std::vector<std::vector<int>> topbit(NS);
    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = subbands[oi].coeffs.size();
        sig[oi].assign(n, 0);
        magv[oi].resize(n);
        curmag[oi].assign(n, 0);
        sgn[oi].resize(n);
        topbit[oi].assign(n, -1);
        for (size_t ci = 0; ci < n; ++ci) {
            int32_t c = subbands[oi].coeffs[ci];
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            magv[oi][ci] = (int32_t)m;
            sgn[oi][ci] = (c < 0) ? 1 : 0;
            topbit[oi][ci] = (m == 0) ? -1 : floor_log2(m);
        }
    }

    uint32_t total = 0;
    for (size_t si = 0; si < order.size(); ++si) {
        size_t oi = order[si];
        int B = sub_maxbits[oi];
        size_t n = subbands[oi].coeffs.size();
        total += (uint32_t)(n * (size_t)B);
        for (size_t ci = 0; ci < n; ++ci)
            if (magv[oi][ci] > 0) ++total;
    }

    std::vector<std::vector<uint8_t>> streams(NS);
    // One shared predictor across the whole plane so the EMA branch evolves the
    // same way it did during training (collect_samples walks all subbands of a
    // plane with a single persistent model). Encode and decode both share one
    // model per plane, so roundtrip stays byte-exact.
    LearnedModel model;
    for (size_t si = 0; si < order.size(); ++si) {
        size_t oi = order[si];
        const Subband& s = subbands[oi];
        float sc = (sub_scale && oi < sub_scale->size()) ? (*sub_scale)[oi] : 1.0f;
        int w = s.w, h = s.h, B = sub_maxbits[oi];
        size_t n = subbands[oi].coeffs.size();
        int pidx = parent[oi];
        int pw = (pidx >= 0) ? subbands[pidx].w : 0;
        int ph = (pidx >= 0) ? subbands[pidx].h : 0;
        std::vector<uint8_t> bits;
        std::vector<uint16_t> p0;
        bits.reserve(n * (size_t)B + n);
        p0.reserve(n * (size_t)B + n);
        for (int p = B - 1; p >= 0; --p) {
            for (size_t ci = 0; ci < n; ++ci) {
                int x = (int)(ci % w), y = (int)(ci / w);
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph)
                        parent_sig = sig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(sig[oi], w, h, x, y, fc, dg);
                if (sig[oi][ci] == 0) {
                    bool becomes = (topbit[oi][ci] == p);
                    uint8_t bit = becomes ? 1 : 0;
                    LCFeat f; learned_features(sig[oi], curmag[oi], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 0, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                    p0.push_back(scale_p0(model.predict(f), sc)); bits.push_back(bit); model.update(f, bit);
                    if (becomes) {
                        uint8_t sg = sgn[oi][ci];
                        LCFeat fs; learned_features(sig[oi], curmag[oi], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 1, s.level, fs);
                        fs.orient = (uint8_t)s.orient; fs.parent_sig = parent_sig ? 1 : 0; fs.fc = (uint8_t)fc; fs.dg = (uint8_t)dg;
                        p0.push_back(scale_p0(model.predict(fs), sc)); bits.push_back(sg); model.update(fs, sg);
                        sig[oi][ci] = 1; curmag[oi][ci] = (int32_t)(1 << p);
                    }
                } else {
                    uint8_t bit = (uint8_t)((magv[oi][ci] >> p) & 1);
                    LCFeat f; learned_features(sig[oi], curmag[oi], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 2, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                    p0.push_back(scale_p0(model.predict(f), sc)); bits.push_back(bit); model.update(f, bit);
                    if (bit) curmag[oi][ci] |= (int32_t)(1 << p);
                }
            }
        }
        BitplaneRans rans;
        streams[oi] = rans.encode(bits, p0);
    }

    Result res;
    res.streams = std::move(streams);
    res.sub_maxbits = std::move(sub_maxbits);
    res.total_symbols = total;
    return res;
}


std::vector<Subband> BitplaneCoder::decode(const std::vector<std::vector<uint8_t>>& streams,
                                            const std::vector<Subband>& layout,
                                            const std::vector<uint8_t>& sub_maxbits,
                                            uint32_t total_symbols,
                                            const std::vector<std::vector<int32_t>>* luma_mag,
                                            const std::vector<float>* sub_scale) const {
    int ml = 0;
    auto order = coding_order(layout, ml);
    auto parent = build_parent_map(layout, ml);
    size_t NS = layout.size();

    std::vector<Subband> out = layout;
    for (auto& s : out) s.coeffs.assign((size_t)s.w * s.h, 0);

    std::vector<std::vector<uint8_t>> sig(NS);
    std::vector<std::vector<int32_t>> value(NS);
    std::vector<std::vector<int8_t>> signv(NS);
    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = out[oi].coeffs.size();
        sig[oi].assign(n, 0); value[oi].resize(n, 0); signv[oi].assign(n, 1);
    }

    uint32_t idx = 0;
    // One shared predictor per plane (matches encode and training EMA evolution).
    LearnedModel model;
    for (size_t si = 0; si < order.size(); ++si) {
        size_t oi = order[si];
        const Subband& s = layout[oi];
        float sc = (sub_scale && oi < sub_scale->size()) ? (*sub_scale)[oi] : 1.0f;
        int w = s.w, h = s.h;
        int pidx = parent[oi];
        int pw = (pidx >= 0) ? layout[pidx].w : 0, ph = (pidx >= 0) ? layout[pidx].h : 0;
        int B = sub_maxbits[oi];
        BitplaneRans::Decoder d; d.init(streams[oi]);
        for (int p = B - 1; p >= 0; --p) {
            for (size_t ci = 0; ci < s.coeffs.size(); ++ci) {
                int x = (int)(ci % w), y = (int)(ci / w);
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph)
                        parent_sig = sig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(sig[oi], w, h, x, y, fc, dg);
                if (sig[oi][ci] == 0) {
                    LCFeat f; learned_features(sig[oi], value[oi], (pidx>=0?&value[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 0, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                    uint8_t bit = d.decode_symbol(scale_p0(model.predict(f), sc)); model.update(f, bit); ++idx;
                    if (bit) {
                        LCFeat fs; learned_features(sig[oi], value[oi], (pidx>=0?&value[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 1, s.level, fs);
                        fs.orient = (uint8_t)s.orient; fs.parent_sig = parent_sig ? 1 : 0; fs.fc = (uint8_t)fc; fs.dg = (uint8_t)dg;
                        uint8_t sg = d.decode_symbol(scale_p0(model.predict(fs), sc)); model.update(fs, sg); ++idx;
                        sig[oi][ci] = 1; signv[oi][ci] = sg ? -1 : 1;
                        value[oi][ci] = (int32_t)(1 << p);
                    }
                } else {
                    LCFeat f; learned_features(sig[oi], value[oi], (pidx>=0?&value[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 2, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                    uint8_t rb = d.decode_symbol(scale_p0(model.predict(f), sc)); model.update(f, rb); ++idx;
                    if (rb) value[oi][ci] |= (int32_t)(1 << p);
                }
            }
        }
    }

    if (total_symbols != 0 && idx != total_symbols)
        throw std::runtime_error("BitplaneCoder::decode: symbol count mismatch");

    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = out[oi].coeffs.size();
        for (size_t ci = 0; ci < n; ++ci)
            out[oi].coeffs[ci] = (int32_t)value[oi][ci] * signv[oi][ci];
    }
    return out;
}

std::pair<std::vector<uint8_t>, std::vector<uint16_t>>
BitplaneCoder::generate_symbols(const std::vector<Subband>& subbands, int maxbits_override,
                                const std::vector<std::vector<int32_t>>* luma_mag,
                                const std::vector<float>* sub_scale) {
    int ml = 0;
    auto order = coding_order(subbands, ml);
    auto parent = build_parent_map(subbands, ml);
    size_t NS = subbands.size();

    // Per-subband bitplane range, mirroring encode()/decode() (F2): previously a
    // single global B forced tiny AC bands to emit wasted all-zero significance
    // planes that encode/decode never produce. Indexed by original subband oi.
    std::vector<uint8_t> sub_maxbits(NS, 0);
    for (size_t oi = 0; oi < NS; ++oi) {
        int B = 1;
        for (int32_t c : subbands[oi].coeffs) {
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            int b = (m == 0) ? 0 : floor_log2(m) + 1;
            if (b > B) B = b;
        }
        if (maxbits_override > 0) B = maxbits_override;
        sub_maxbits[oi] = (uint8_t)B;
    }
    // Shared per-subband state indexed by original oi (F2b).
    std::vector<std::vector<uint8_t>> sig(NS);
    std::vector<std::vector<int32_t>> magv(NS);
    std::vector<std::vector<int32_t>> curmag(NS);
    std::vector<std::vector<uint8_t>> sgn(NS);
    std::vector<std::vector<int>> topbit(NS);
    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = subbands[oi].coeffs.size();
        sig[oi].assign(n, 0); magv[oi].resize(n); curmag[oi].assign(n, 0);
        sgn[oi].resize(n); topbit[oi].assign(n, -1);
        for (size_t ci = 0; ci < n; ++ci) {
            int32_t c = subbands[oi].coeffs[ci];
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            magv[oi][ci] = (int32_t)m; sgn[oi][ci] = (c < 0) ? 1 : 0;
            topbit[oi][ci] = (m == 0) ? -1 : floor_log2(m);
        }
    }
    std::vector<uint8_t> bits; std::vector<uint16_t> p0;
    LearnedModel model;
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si]; const Subband& s = subbands[oi];
        float sc = (sub_scale && oi < sub_scale->size()) ? (*sub_scale)[oi] : 1.0f;
        int w = s.w, h = s.h; int pidx = parent[oi];
        int pw = (pidx >= 0) ? subbands[pidx].w : 0, ph = (pidx >= 0) ? subbands[pidx].h : 0;
        int B = sub_maxbits[oi];
        for (int p = B - 1; p >= 0; --p) {
            for (size_t ci = 0; ci < s.coeffs.size(); ++ci) {
                int x = (int)(ci % w), y = (int)(ci / w);
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph) parent_sig = sig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(sig[oi], w, h, x, y, fc, dg);
                if (sig[oi][ci] == 0) {
                    bool becomes = (topbit[oi][ci] == p);
                    uint8_t bit = becomes ? 1 : 0;
                    LCFeat f; learned_features(sig[oi], curmag[oi], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 0, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc=(uint8_t)fc; f.dg=(uint8_t)dg;
                    p0.push_back(scale_p0(model.predict(f), sc)); bits.push_back(bit); model.update(f, bit);
                    if (becomes) {
                        uint8_t sg = sgn[oi][ci];
                        LCFeat fs; learned_features(sig[oi], curmag[oi], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 1, s.level, fs);
                        fs.orient = (uint8_t)s.orient; fs.parent_sig = parent_sig ? 1 : 0; fs.fc=(uint8_t)fc; fs.dg=(uint8_t)dg;
                        p0.push_back(scale_p0(model.predict(fs), sc)); bits.push_back(sg); model.update(fs, sg);
                        sig[oi][ci] = 1; curmag[oi][ci] = (int32_t)(1 << p);
                    }
                } else {
                    uint8_t bit = (uint8_t)((magv[oi][ci] >> p) & 1);
                    LCFeat f; learned_features(sig[oi], curmag[oi], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 2, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc=(uint8_t)fc; f.dg=(uint8_t)dg;
                    p0.push_back(scale_p0(model.predict(f), sc)); bits.push_back(bit); model.update(f, bit);
                    if (bit) curmag[oi][ci] |= (int32_t)(1 << p);
                }
            }
        }
    }
    return {bits, p0};
}

bool BitplaneCoder::probe_rans(const std::vector<Subband>& subbands, int maxbits_override) {
    auto [bits, p0] = generate_symbols(subbands, maxbits_override);
    BitplaneRans r;
    auto enc = r.encode(bits, p0);
    BitplaneRans::Decoder d; d.init(enc);
    std::vector<uint8_t> out(bits.size(), 0);
    for (uint32_t k = 0; k < bits.size(); ++k) out[k] = d.decode_symbol(p0[k]);
    return out == bits;
}

void BitplaneCoder::collect_samples(const std::vector<Subband>& subbands,
                                    std::vector<LSample>& out, int maxbits_override,
                                    const std::vector<std::vector<int32_t>>* luma_mag,
                                    const std::vector<float>* sub_scale) {
    int ml = 0;
    auto order = coding_order(subbands, ml);
    auto parent = build_parent_map(subbands, ml);
    size_t NS = subbands.size();

    // Per-subband bitplane range, mirroring encode()/decode() exactly so the
    // training distribution matches the inference walk (F2: previously a single
    // global B forced tiny AC bands to emit wasted all-zero significance planes
    // that encode/decode never produce). Indexed by original subband index oi.
    std::vector<uint8_t> sub_maxbits(NS, 0);
    for (size_t oi = 0; oi < NS; ++oi) {
        int B = 1;
        for (int32_t c : subbands[oi].coeffs) {
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            int b = (m == 0) ? 0 : floor_log2(m) + 1;
            if (b > B) B = b;
        }
        if (maxbits_override > 0) B = maxbits_override;
        sub_maxbits[oi] = (uint8_t)B;
    }

    // Shared per-subband state indexed by ORIGINAL subband index oi, exactly like
    // encode()/decode() (F2b: previously indexed by coding-order si, which made
    // the parent lookup sig[pidx] (an oi) read the wrong subband's map).
    std::vector<std::vector<uint8_t>> sig(NS);
    std::vector<std::vector<int32_t>> magv(NS);
    std::vector<std::vector<int32_t>> curmag(NS);
    std::vector<std::vector<uint8_t>> sgn(NS);
    std::vector<std::vector<int>> topbit(NS);
    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = subbands[oi].coeffs.size();
        sig[oi].assign(n, 0); magv[oi].resize(n); curmag[oi].assign(n, 0);
        sgn[oi].resize(n); topbit[oi].assign(n, -1);
        for (size_t ci = 0; ci < n; ++ci) {
            int32_t c = subbands[oi].coeffs[ci];
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            magv[oi][ci] = (int32_t)m; sgn[oi][ci] = (c < 0) ? 1 : 0;
            topbit[oi][ci] = (m == 0) ? -1 : floor_log2(m);
        }
    }
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si]; const Subband& s = subbands[oi];
        int w = s.w, h = s.h; int pidx = parent[oi];
        int pw = (pidx >= 0) ? subbands[pidx].w : 0, ph = (pidx >= 0) ? subbands[pidx].h : 0;
        int B = sub_maxbits[oi];
        for (int p = B - 1; p >= 0; --p) {
            for (int ci = 0; ci < (int)s.coeffs.size(); ++ci) {
                int x = ci % w, y = ci / w;
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph) parent_sig = sig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(sig[oi], w, h, x, y, fc, dg);
                uint32_t base = context_id(s.orient, parent_sig, fc, dg);
                if (sig[oi][ci] == 0) {
                    bool becomes = (topbit[oi][ci] == p);
                    LCFeat f; learned_features(sig[oi], curmag[oi], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 0, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc=(uint8_t)fc; f.dg=(uint8_t)dg;
                    out.push_back({f, becomes ? 1 : 0, coarse_ctx(base, 0)});
                    if (becomes) {
                        LCFeat fs; learned_features(sig[oi], curmag[oi], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 1, s.level, fs);
                        fs.orient = (uint8_t)s.orient; fs.parent_sig = parent_sig ? 1 : 0; fs.fc=(uint8_t)fc; fs.dg=(uint8_t)dg;
                        out.push_back({fs, sgn[oi][ci], coarse_ctx(base, 1)});
                        sig[oi][ci] = 1; curmag[oi][ci] = (int32_t)(1 << p);
                    }
                } else {
                    uint8_t bit = (uint8_t)((magv[oi][ci] >> p) & 1);
                    LCFeat f; learned_features(sig[oi], curmag[oi], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 2, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc=(uint8_t)fc; f.dg=(uint8_t)dg;
                    out.push_back({f, bit, coarse_ctx(base, 2)});
                    if (bit) curmag[oi][ci] |= (int32_t)(1 << p);
                }
            }
        }
    }
}

StaticBitplaneResult BitplaneCoder::encode_static(
    const std::vector<Subband>& subbands, int maxbits_override,
    const std::vector<std::vector<int32_t>>* luma_mag) const {
    int ml = 0;
    auto order = coding_order(subbands, ml);
    auto parent = build_parent_map(subbands, ml);
    size_t NS = subbands.size();

    std::vector<uint8_t> sub_maxbits(NS, 0);
    for (size_t oi = 0; oi < NS; ++oi) {
        int B = 1;
        for (int32_t c : subbands[oi].coeffs) {
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            int b = (m == 0) ? 0 : floor_log2(m) + 1;
            if (b > B) B = b;
        }
        if (maxbits_override > 0) B = maxbits_override;
        sub_maxbits[oi] = (uint8_t)B;
    }

    std::vector<std::vector<uint8_t>> sig(NS);
    std::vector<std::vector<int32_t>> magv(NS), curmag(NS);
    std::vector<std::vector<uint8_t>> sgn(NS);
    std::vector<std::vector<int>> topbit(NS);
    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = subbands[oi].coeffs.size();
        sig[oi].assign(n, 0); magv[oi].resize(n); curmag[oi].assign(n, 0);
        sgn[oi].resize(n); topbit[oi].assign(n, -1);
        for (size_t ci = 0; ci < n; ++ci) {
            int32_t c = subbands[oi].coeffs[ci];
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            magv[oi][ci] = (int32_t)m; sgn[oi][ci] = (c < 0) ? 1 : 0;
            topbit[oi][ci] = (m == 0) ? -1 : floor_log2(m);
        }
    }

    // Histogram + symbol stores (pass 1). We accumulate per-(subband, class)
    // counts and remember each symbol's bit so pass 2 can blend the transmitted
    // static backbone with the learned model (re-walking for the LCFeat) and
    // rANS-encode.
    StaticHist hist;
    hist.cnt.assign(NS, std::vector<uint32_t>(R6B_CLASSES * 2, 0));
    std::vector<std::vector<uint8_t>> bits_by_sub(NS);
    uint32_t total = 0;
    for (size_t si = 0; si < order.size(); ++si) {
        size_t oi = order[si];
        int B = sub_maxbits[oi];
        size_t n = subbands[oi].coeffs.size();
        total += (uint32_t)(n * (size_t)B);
        for (size_t ci = 0; ci < n; ++ci)
            if (magv[oi][ci] > 0) ++total;
    }
    for (size_t si = 0; si < order.size(); ++si) {
        size_t oi = order[si];
        const Subband& s = subbands[oi];
        int w = s.w, h = s.h, B = sub_maxbits[oi];
        size_t n = subbands[oi].coeffs.size();
        int pidx = parent[oi];
        int pw = (pidx >= 0) ? subbands[pidx].w : 0;
        int ph = (pidx >= 0) ? subbands[pidx].h : 0;
        for (int p = B - 1; p >= 0; --p) {
            for (size_t ci = 0; ci < n; ++ci) {
                int x = (int)(ci % w), y = (int)(ci / w);
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph)
                        parent_sig = sig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(sig[oi], w, h, x, y, fc, dg);
                uint8_t bit; uint8_t symtype;
                if (sig[oi][ci] == 0) {
                    bool becomes = (topbit[oi][ci] == p);
                    bit = becomes ? 1 : 0; symtype = 0;
                    int cls = r6b_class(0, p);
                    hist.cnt[oi][cls * 2 + bit]++;
                    bits_by_sub[oi].push_back(bit);
                    if (becomes) {
                        uint8_t sg = sgn[oi][ci]; symtype = 1;
                        int cls = r6b_class(1, p);
                        hist.cnt[oi][cls * 2 + sg]++;
                        bits_by_sub[oi].push_back(sg);
                        sig[oi][ci] = 1; curmag[oi][ci] = (int32_t)(1 << p);
                    }
                } else {
                    bit = (uint8_t)((magv[oi][ci] >> p) & 1); symtype = 2;
                    int cls = r6b_class(2, p);
                    hist.cnt[oi][cls * 2 + bit]++;
                    bits_by_sub[oi].push_back(bit);
                    if (bit) curmag[oi][ci] |= (int32_t)(1 << p);
                }
                (void)symtype;
            }
        }
    }

    // Build the transmitted static P(0)*M per (subband, class).
    std::vector<std::vector<uint16_t>> sp0(NS);
    for (size_t oi = 0; oi < NS; ++oi) {
        sp0[oi].resize(R6B_CLASSES);
        for (int cls = 0; cls < R6B_CLASSES; ++cls) {
            uint32_t c0 = hist.cnt[oi][cls * 2 + 0];
            uint32_t c1 = hist.cnt[oi][cls * 2 + 1];
            uint32_t tot = c0 + c1;
            sp0[oi][cls] = (tot == 0) ? (uint16_t)(StaticAdaptiveModel::M / 2)
                                      : (uint16_t)((uint32_t)((uint64_t)c0 * StaticAdaptiveModel::M / tot) & 0xFFFF);
        }
    }

    // Pass 2: blend the transmitted static backbone with the learned model and
    // rANS-encode. We re-walk the coefficients (deterministic) so each symbol's
    // LCFeat + class is recomputed exactly as in pass 1 / decode, and the stored
    // bits (from pass 1) drive the rANS stream. The learned model's EMA evolves
    // identically to decode, so round-trip is byte-exact. Fresh per-subband walk
    // state (lsig/lcurmag) is used so the walk starts from scratch.
    std::vector<std::vector<uint8_t>> streams(NS);
    // Fresh per-subband walk state for the re-walk (must track parent subbands).
    std::vector<std::vector<uint8_t>> lsig(NS);
    std::vector<std::vector<int32_t>> lcurmag(NS);
    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = subbands[oi].coeffs.size();
        lsig[oi].assign(n, 0);
        lcurmag[oi].assign(n, 0);
    }
    StaticAdaptiveModel model; model.init(NS, sp0);
    for (size_t si = 0; si < order.size(); ++si) {
        size_t oi = order[si];
        const Subband& s = subbands[oi];
        int w = s.w, h = s.h, B = sub_maxbits[oi];
        size_t n = subbands[oi].coeffs.size();
        int pidx = parent[oi];
        int pw = (pidx >= 0) ? subbands[pidx].w : 0;
        int ph = (pidx >= 0) ? subbands[pidx].h : 0;
        const auto& bits = bits_by_sub[oi];
        size_t k = 0;
        std::vector<uint16_t> p0vec;
        p0vec.reserve(bits.size());
        for (int p = B - 1; p >= 0; --p) {
            for (size_t ci = 0; ci < n; ++ci) {
                int x = (int)(ci % w), y = (int)(ci / w);
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph)
                        parent_sig = lsig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(lsig[oi], w, h, x, y, fc, dg);
                const std::vector<int32_t>* parent_cur = (pidx >= 0) ? &lcurmag[pidx] : nullptr;
                const std::vector<int32_t>* lmag = (luma_mag ? &(*luma_mag)[oi] : nullptr);
                if (lsig[oi][ci] == 0) {
                    bool becomes = (topbit[oi][ci] == p);
                    uint8_t bit = bits[k++];
                    LCFeat f; learned_features(lsig[oi], lcurmag[oi], parent_cur, pw, ph, lmag, w, h, x, y, p, 0, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                    int cls = r6b_class(0, p);
                    p0vec.push_back(model.predict(f, (uint8_t)oi, (uint8_t)cls));
                    model.update(f, bit);
                    if (becomes) {
                        uint8_t sg = bits[k++];
                        LCFeat fs; learned_features(lsig[oi], lcurmag[oi], parent_cur, pw, ph, lmag, w, h, x, y, p, 1, s.level, fs);
                        fs.orient = (uint8_t)s.orient; fs.parent_sig = parent_sig ? 1 : 0; fs.fc = (uint8_t)fc; fs.dg = (uint8_t)dg;
                        int cls = r6b_class(1, p);
                        p0vec.push_back(model.predict(fs, (uint8_t)oi, (uint8_t)cls));
                        model.update(fs, sg);
                        lsig[oi][ci] = 1; lcurmag[oi][ci] = (int32_t)(1 << p);
                    }
                } else {
                    uint8_t bit = bits[k++];
                    LCFeat f; learned_features(lsig[oi], lcurmag[oi], parent_cur, pw, ph, lmag, w, h, x, y, p, 2, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                    int cls = r6b_class(2, p);
                    p0vec.push_back(model.predict(f, (uint8_t)oi, (uint8_t)cls));
                    model.update(f, bit);
                    if (bit) lcurmag[oi][ci] |= (int32_t)(1 << p);
                }
            }
        }
        BitplaneRans rans;
        streams[oi] = rans.encode(bits, p0vec);
    }

    StaticBitplaneResult res;
    res.streams = std::move(streams);
    res.sub_maxbits = std::move(sub_maxbits);
    res.total_symbols = total;
    res.hist = std::move(hist);
    return res;
}

std::vector<Subband> BitplaneCoder::decode_static(
    const std::vector<std::vector<uint8_t>>& streams,
    const std::vector<Subband>& layout,
    const std::vector<uint8_t>& sub_maxbits,
    uint32_t total_symbols,
    const StaticHist& hist,
    const std::vector<std::vector<int32_t>>* luma_mag) const {
    int ml = 0;
    auto order = coding_order(layout, ml);
    auto parent = build_parent_map(layout, ml);
    size_t NS = layout.size();

    std::vector<Subband> out = layout;
    for (auto& s : out) s.coeffs.assign((size_t)s.w * s.h, 0);

    std::vector<std::vector<uint8_t>> sig(NS);
    std::vector<std::vector<int32_t>> value(NS);
    std::vector<std::vector<int8_t>> signv(NS);
    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = out[oi].coeffs.size();
        sig[oi].assign(n, 0); value[oi].resize(n, 0); signv[oi].assign(n, 1);
    }

    // Rebuild the transmitted static P(0)*M per (subband, class).
    std::vector<std::vector<uint16_t>> sp0(NS);
    for (size_t oi = 0; oi < NS; ++oi) {
        sp0[oi].resize(R6B_CLASSES);
        for (int cls = 0; cls < R6B_CLASSES; ++cls) {
            uint32_t c0 = hist.cnt[oi][cls * 2 + 0];
            uint32_t c1 = hist.cnt[oi][cls * 2 + 1];
            uint32_t tot = c0 + c1;
            sp0[oi][cls] = (tot == 0) ? (uint16_t)(StaticAdaptiveModel::M / 2)
                                      : (uint16_t)((uint32_t)((uint64_t)c0 * StaticAdaptiveModel::M / tot) & 0xFFFF);
        }
    }

    uint32_t idx = 0;
    for (size_t si = 0; si < order.size(); ++si) {
        size_t oi = order[si];
        const Subband& s = layout[oi];
        int w = s.w, h = s.h;
        int pidx = parent[oi];
        int pw = (pidx >= 0) ? layout[pidx].w : 0, ph = (pidx >= 0) ? layout[pidx].h : 0;
        int B = sub_maxbits[oi];
        // Per-subband model reset. This is intentional: the learned feature
        // carried into model.predict/update already includes orient + level
        // (see LearnedModel::fine_ctx), so subband contexts are disjoint; the
        // shared vs per-subband reset choice is benign but kept per-subband for
        // a fully deterministic, symmetric encode/decode accumulator.
        StaticAdaptiveModel model; model.init(NS, sp0);
        BitplaneRans::Decoder d; d.init(streams[oi]);
        for (int p = B - 1; p >= 0; --p) {
            for (size_t ci = 0; ci < s.coeffs.size(); ++ci) {
                int x = (int)(ci % w), y = (int)(ci / w);
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph)
                        parent_sig = sig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(sig[oi], w, h, x, y, fc, dg);
                if (sig[oi][ci] == 0) {
                    LCFeat f; learned_features(sig[oi], value[oi], (pidx>=0?&value[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 0, s.level, f);
                f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                int cls = r6b_class(0, p);
                    uint16_t dp0 = model.predict(f, (uint8_t)oi, (uint8_t)cls);
                    uint8_t bit = d.decode_symbol(dp0);
                    model.update(f, bit); ++idx;
                    if (bit) {
                        LCFeat fs; learned_features(sig[oi], value[oi], (pidx>=0?&value[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 1, s.level, fs);
                        fs.orient = (uint8_t)s.orient; fs.parent_sig = parent_sig ? 1 : 0; fs.fc = (uint8_t)fc; fs.dg = (uint8_t)dg;
                        int cls = r6b_class(1, p);
                        uint16_t dp0s = model.predict(fs, (uint8_t)oi, (uint8_t)cls);
                        uint8_t sg = d.decode_symbol(dp0s);
                        model.update(fs, sg); ++idx;
                        sig[oi][ci] = 1; signv[oi][ci] = sg ? -1 : 1;
                        value[oi][ci] = (int32_t)(1 << p);
                    }
                } else {
                    LCFeat f; learned_features(sig[oi], value[oi], (pidx>=0?&value[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 2, s.level, f);
                f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                int cls = r6b_class(2, p);
                    uint16_t dp0r = model.predict(f, (uint8_t)oi, (uint8_t)cls);
                    uint8_t rb = d.decode_symbol(dp0r);
                    model.update(f, rb); ++idx;
                    if (rb) value[oi][ci] |= (int32_t)(1 << p);
                }
            }
        }
    }

    if (total_symbols != 0 && idx != total_symbols)
        throw std::runtime_error("BitplaneCoder::decode_static: symbol count mismatch");

    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = out[oi].coeffs.size();
        for (size_t ci = 0; ci < n; ++ci)
            out[oi].coeffs[ci] = (int32_t)value[oi][ci] * signv[oi][ci];
    }
    return out;
}

// Per-plane cluster-count pass used to pool an IMAGE-GLOBAL r6c_p0 across all
// planes (luma + chroma share the same cluster space; pooling makes the single
// transmitted vector consistent at encode and decode). Only increments cnt, does
// not store symbols.
static void r6c_accumulate(const std::vector<Subband>& subbands,
                           std::vector<std::vector<uint32_t>>& cnt) {
    int ml = 0;
    auto order = coding_order(subbands, ml);
    auto parent = build_parent_map(subbands, ml);
    size_t NS = subbands.size();

    std::vector<std::vector<uint8_t>> sig(NS);
    std::vector<std::vector<int32_t>> magv(NS), curmag(NS);
    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = subbands[oi].coeffs.size();
        sig[oi].assign(n, 0); magv[oi].resize(n); curmag[oi].assign(n, 0);
        for (size_t ci = 0; ci < n; ++ci) {
            int32_t c = subbands[oi].coeffs[ci];
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            magv[oi][ci] = (int32_t)m;
        }
    }
    for (size_t si = 0; si < order.size(); ++si) {
        size_t oi = order[si];
        const Subband& s = subbands[oi];
        int w = s.w, h = s.h;
        size_t n = subbands[oi].coeffs.size();
        int pidx = parent[oi];
        int pw = (pidx >= 0) ? subbands[pidx].w : 0;
        int ph = (pidx >= 0) ? subbands[pidx].h : 0;
        int B = 1;
        for (size_t ci = 0; ci < n; ++ci) {
            uint32_t m = (uint32_t)magv[oi][ci];
            int b = (m == 0) ? 0 : floor_log2(m) + 1;
            if (b > B) B = b;
        }
        std::vector<int> topbit(n, -1);
        for (size_t ci = 0; ci < n; ++ci) {
            uint32_t m = (uint32_t)magv[oi][ci];
            topbit[ci] = (m == 0) ? -1 : floor_log2(m);
        }
        for (int p = B - 1; p >= 0; --p) {
            for (size_t ci = 0; ci < n; ++ci) {
                int x = (int)(ci % w), y = (int)(ci / w);
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph)
                        parent_sig = sig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(sig[oi], w, h, x, y, fc, dg);
                if (sig[oi][ci] == 0) {
                    bool becomes = (topbit[ci] == p);
                    uint8_t bit = becomes ? 1 : 0;
                    LCFeat f; learned_features(sig[oi], curmag[oi], nullptr, 0, 0, nullptr, w, h, x, y, p, 0, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                    cnt[r6c_cluster_id(f)][bit]++;
                    if (becomes) {
                        uint8_t sg = (magv[oi][ci] < 0) ? 1 : 0;
                        LCFeat fs; learned_features(sig[oi], curmag[oi], nullptr, 0, 0, nullptr, w, h, x, y, p, 1, s.level, fs);
                        fs.orient = (uint8_t)s.orient; fs.parent_sig = parent_sig ? 1 : 0; fs.fc = (uint8_t)fc; fs.dg = (uint8_t)dg;
                        cnt[r6c_cluster_id(fs)][sg]++;
                        sig[oi][ci] = 1; curmag[oi][ci] = (int32_t)(1 << p);
                    }
                } else {
                    uint8_t bit = (uint8_t)((magv[oi][ci] >> p) & 1);
                    LCFeat f; learned_features(sig[oi], curmag[oi], nullptr, 0, 0, nullptr, w, h, x, y, p, 2, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                    cnt[r6c_cluster_id(f)][bit]++;
                    if (bit) curmag[oi][ci] |= (int32_t)(1 << p);
                }
            }
        }
    }
}

// Build the pooled IMAGE-GLOBAL r6c_p0 (one vector shared by every plane) from a
// set of already-computed residual subbands (one entry per plane). Pooling keeps
// the single transmitted vector consistent between encode and decode while
// staying finer-or-equal to the cold-starting EMA on every cluster.
std::vector<uint16_t> BitplaneCoder::r6c_global_sp0(
    const std::vector<std::vector<Subband>>& plane_residuals) const {
    uint32_t K = r6c_K();
    std::vector<std::vector<uint32_t>> cnt(K, std::vector<uint32_t>(2, 0));
    for (const auto& subs : plane_residuals) r6c_accumulate(subs, cnt);
    std::vector<uint16_t> sp0(K);
    for (uint32_t C = 0; C < K; ++C) {
        uint32_t c0 = cnt[C][0], c1 = cnt[C][1];
        uint32_t tot = c0 + c1;
        sp0[C] = (tot == 0) ? (uint16_t)(R6CAdaptiveModel::M / 2)
                            : (uint16_t)((uint32_t)((uint64_t)c0 * R6CAdaptiveModel::M / tot) & 0xFFFF);
    }
    return sp0;
}

// R6-C (Route 6 lever C): per-fine-context-cluster transmitted P(0) backbone.
// Two-pass mirror of encode_static, but the static histogram is ONE image-global
// count over K = r6c_K() clusters (a fixed partition of the learned feature
// space) instead of R6-B's per-(subband, class) table. See R6CAdaptiveModel.
BitplaneCoder::R6CResult BitplaneCoder::encode_static_r6c(
    const std::vector<Subband>& subbands, int maxbits_override,
    const std::vector<std::vector<int32_t>>* luma_mag,
    const std::vector<uint16_t>* sp0_ext) const {
    int ml = 0;
    auto order = coding_order(subbands, ml);
    auto parent = build_parent_map(subbands, ml);
    size_t NS = subbands.size();
    uint32_t K = r6c_K();

    std::vector<uint8_t> sub_maxbits(NS, 0);
    for (size_t oi = 0; oi < NS; ++oi) {
        int B = 1;
        for (int32_t c : subbands[oi].coeffs) {
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            int b = (m == 0) ? 0 : floor_log2(m) + 1;
            if (b > B) B = b;
        }
        if (maxbits_override > 0) B = maxbits_override;
        sub_maxbits[oi] = (uint8_t)B;
    }

    std::vector<std::vector<uint8_t>> sig(NS);
    std::vector<std::vector<int32_t>> magv(NS), curmag(NS);
    std::vector<std::vector<uint8_t>> sgn(NS);
    std::vector<std::vector<int>> topbit(NS);
    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = subbands[oi].coeffs.size();
        sig[oi].assign(n, 0); magv[oi].resize(n); curmag[oi].assign(n, 0);
        sgn[oi].resize(n); topbit[oi].assign(n, -1);
        for (size_t ci = 0; ci < n; ++ci) {
            int32_t c = subbands[oi].coeffs[ci];
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            magv[oi][ci] = (int32_t)m; sgn[oi][ci] = (c < 0) ? 1 : 0;
            topbit[oi][ci] = (m == 0) ? -1 : floor_log2(m);
        }
    }

    // Pass 1: count per-cluster (0/1) symbols AND remember each symbol's bit.
    // The cluster id is a function of the full LCFeat, so we rebuild f exactly
    // as in pass 2 / decode and maintain the walk state (sig/curmag) as we go.
    std::vector<std::vector<uint32_t>> cnt(K, std::vector<uint32_t>(2, 0));
    std::vector<std::vector<uint8_t>> bits_by_sub(NS);
    uint32_t total = 0;
    for (size_t si = 0; si < order.size(); ++si) {
        size_t oi = order[si];
        int B = sub_maxbits[oi];
        size_t n = subbands[oi].coeffs.size();
        total += (uint32_t)(n * (size_t)B);
        for (size_t ci = 0; ci < n; ++ci)
            if (magv[oi][ci] > 0) ++total;
    }
    for (size_t si = 0; si < order.size(); ++si) {
        size_t oi = order[si];
        const Subband& s = subbands[oi];
        int w = s.w, h = s.h, B = sub_maxbits[oi];
        size_t n = subbands[oi].coeffs.size();
        int pidx = parent[oi];
        int pw = (pidx >= 0) ? subbands[pidx].w : 0;
        int ph = (pidx >= 0) ? subbands[pidx].h : 0;
        for (int p = B - 1; p >= 0; --p) {
            for (size_t ci = 0; ci < n; ++ci) {
                int x = (int)(ci % w), y = (int)(ci / w);
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph)
                        parent_sig = sig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(sig[oi], w, h, x, y, fc, dg);
                uint8_t bit; uint8_t symtype;
                if (sig[oi][ci] == 0) {
                    bool becomes = (topbit[oi][ci] == p);
                    bit = becomes ? 1 : 0; symtype = 0;
                    LCFeat f; learned_features(sig[oi], curmag[oi], nullptr, 0, 0, nullptr, w, h, x, y, p, 0, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                    cnt[r6c_cluster_id(f)][bit]++;
                    bits_by_sub[oi].push_back(bit);
                    if (becomes) {
                        uint8_t sg = sgn[oi][ci]; symtype = 1;
                        LCFeat fs; learned_features(sig[oi], curmag[oi], nullptr, 0, 0, nullptr, w, h, x, y, p, 1, s.level, fs);
                        fs.orient = (uint8_t)s.orient; fs.parent_sig = parent_sig ? 1 : 0; fs.fc = (uint8_t)fc; fs.dg = (uint8_t)dg;
                        cnt[r6c_cluster_id(fs)][sg]++;
                        bits_by_sub[oi].push_back(sg);
                        sig[oi][ci] = 1; curmag[oi][ci] = (int32_t)(1 << p);
                    }
                } else {
                    bit = (uint8_t)((magv[oi][ci] >> p) & 1); symtype = 2;
                    LCFeat f; learned_features(sig[oi], curmag[oi], nullptr, 0, 0, nullptr, w, h, x, y, p, 2, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                    cnt[r6c_cluster_id(f)][bit]++;
                    bits_by_sub[oi].push_back(bit);
                    if (bit) curmag[oi][ci] |= (int32_t)(1 << p);
                }
                (void)symtype;
            }
        }
    }

    // Build the transmitted static P(0)*M per cluster. Empty clusters get the
    // neutral M/2 so the blend degenerates to pure EMA (never worse than it).
    std::vector<uint16_t> sp0(K);
    for (uint32_t C = 0; C < K; ++C) {
        uint32_t c0 = cnt[C][0], c1 = cnt[C][1];
        uint32_t tot = c0 + c1;
        sp0[C] = (tot == 0) ? (uint16_t)(R6CAdaptiveModel::M / 2)
                            : (uint16_t)((uint32_t)((uint64_t)c0 * R6CAdaptiveModel::M / tot) & 0xFFFF);
    }
    // When an external (image-global, pooled) backbone is supplied it overrides
    // the per-plane local counts so every plane codes against the SAME vector
    // that will be transmitted and decoded.
    const std::vector<uint16_t>& used_sp0 = (sp0_ext && sp0_ext->size() == (size_t)K)
                                                ? *sp0_ext : sp0;

    // Pass 2: blend the transmitted per-cluster backbone with the learned model
    // and rANS-encode. Fresh per-subband walk state (lsig/lcurmag) so the EMA
    // starts from scratch for each subband, matching decode.
    std::vector<std::vector<uint8_t>> streams(NS);
    std::vector<std::vector<uint8_t>> lsig(NS);
    std::vector<std::vector<int32_t>> lcurmag(NS);
    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = subbands[oi].coeffs.size();
        lsig[oi].assign(n, 0);
        lcurmag[oi].assign(n, 0);
    }
    R6CAdaptiveModel model; model.init(K, used_sp0);
    for (size_t si = 0; si < order.size(); ++si) {
        size_t oi = order[si];
        const Subband& s = subbands[oi];
        int w = s.w, h = s.h, B = sub_maxbits[oi];
        size_t n = subbands[oi].coeffs.size();
        int pidx = parent[oi];
        int pw = (pidx >= 0) ? subbands[pidx].w : 0;
        int ph = (pidx >= 0) ? subbands[pidx].h : 0;
        const auto& bits = bits_by_sub[oi];
        size_t k = 0;
        std::vector<uint16_t> p0vec;
        p0vec.reserve(bits.size());
        for (int p = B - 1; p >= 0; --p) {
            for (size_t ci = 0; ci < n; ++ci) {
                int x = (int)(ci % w), y = (int)(ci / w);
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph)
                        parent_sig = lsig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(lsig[oi], w, h, x, y, fc, dg);
                const std::vector<int32_t>* parent_cur = (pidx >= 0) ? &lcurmag[pidx] : nullptr;
                const std::vector<int32_t>* lmag = (luma_mag ? &(*luma_mag)[oi] : nullptr);
                if (lsig[oi][ci] == 0) {
                    bool becomes = (topbit[oi][ci] == p);
                    uint8_t bit = bits[k++];
                    LCFeat f; learned_features(lsig[oi], lcurmag[oi], parent_cur, pw, ph, lmag, w, h, x, y, p, 0, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                    p0vec.push_back(model.predict(f));
                    model.update(f, bit);
                    if (becomes) {
                        uint8_t sg = bits[k++];
                        LCFeat fs; learned_features(lsig[oi], lcurmag[oi], parent_cur, pw, ph, lmag, w, h, x, y, p, 1, s.level, fs);
                        fs.orient = (uint8_t)s.orient; fs.parent_sig = parent_sig ? 1 : 0; fs.fc = (uint8_t)fc; fs.dg = (uint8_t)dg;
                        p0vec.push_back(model.predict(fs));
                        model.update(fs, sg);
                        lsig[oi][ci] = 1; lcurmag[oi][ci] = (int32_t)(1 << p);
                    }
                } else {
                    uint8_t bit = bits[k++];
                    LCFeat f; learned_features(lsig[oi], lcurmag[oi], parent_cur, pw, ph, lmag, w, h, x, y, p, 2, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                    p0vec.push_back(model.predict(f));
                    model.update(f, bit);
                    if (bit) lcurmag[oi][ci] |= (int32_t)(1 << p);
                }
            }
        }
        BitplaneRans rans;
        streams[oi] = rans.encode(bits, p0vec);
    }

    R6CResult res;
    res.streams = std::move(streams);
    res.sub_maxbits = std::move(sub_maxbits);
    res.total_symbols = total;
    res.sp0 = used_sp0;
    return res;
}

std::vector<Subband> BitplaneCoder::decode_static_r6c(
    const std::vector<std::vector<uint8_t>>& streams,
    const std::vector<Subband>& layout,
    const std::vector<uint8_t>& sub_maxbits,
    uint32_t total_symbols,
    const std::vector<uint16_t>& sp0,
    const std::vector<std::vector<int32_t>>* luma_mag) const {
    int ml = 0;
    auto order = coding_order(layout, ml);
    auto parent = build_parent_map(layout, ml);
    size_t NS = layout.size();
    uint32_t K = r6c_K();
    if (sp0.size() != (size_t)K) {
        // Header/code mismatch guard: fall back to neutral backbone so decode
        // still terminates (caller must keep sp0 in sync with r6c_K()).
        std::vector<uint16_t> neutral(K, (uint16_t)(R6CAdaptiveModel::M / 2));
        for (uint32_t i = 0; i < sp0.size() && i < K; ++i) neutral[i] = sp0[i];
        return decode_static_r6c(streams, layout, sub_maxbits, total_symbols, neutral, luma_mag);
    }

    std::vector<Subband> out = layout;
    for (auto& s : out) s.coeffs.assign((size_t)s.w * s.h, 0);

    std::vector<std::vector<uint8_t>> sig(NS);
    std::vector<std::vector<int32_t>> value(NS);
    std::vector<std::vector<int8_t>> signv(NS);
    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = out[oi].coeffs.size();
        sig[oi].assign(n, 0); value[oi].resize(n, 0); signv[oi].assign(n, 1);
    }

    uint32_t idx = 0;
    for (size_t si = 0; si < order.size(); ++si) {
        size_t oi = order[si];
        const Subband& s = layout[oi];
        int w = s.w, h = s.h;
        int pidx = parent[oi];
        int pw = (pidx >= 0) ? layout[pidx].w : 0, ph = (pidx >= 0) ? layout[pidx].h : 0;
        int B = sub_maxbits[oi];
        // Per-subband model reset; orient/level are part of both the cluster id
        // and the EMA key, so subbands are disjoint and this stays deterministic.
        R6CAdaptiveModel model; model.init(K, sp0);
        BitplaneRans::Decoder d; d.init(streams[oi]);
        for (int p = B - 1; p >= 0; --p) {
            for (size_t ci = 0; ci < s.coeffs.size(); ++ci) {
                int x = (int)(ci % w), y = (int)(ci / w);
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph)
                        parent_sig = sig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(sig[oi], w, h, x, y, fc, dg);
                if (sig[oi][ci] == 0) {
                    LCFeat f; learned_features(sig[oi], value[oi], (pidx>=0?&value[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 0, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                    uint16_t dp0 = model.predict(f);
                    uint8_t bit = d.decode_symbol(dp0);
                    model.update(f, bit); ++idx;
                    if (bit) {
                        LCFeat fs; learned_features(sig[oi], value[oi], (pidx>=0?&value[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 1, s.level, fs);
                        fs.orient = (uint8_t)s.orient; fs.parent_sig = parent_sig ? 1 : 0; fs.fc = (uint8_t)fc; fs.dg = (uint8_t)dg;
                        uint16_t dp0s = model.predict(fs);
                        uint8_t sg = d.decode_symbol(dp0s);
                        model.update(fs, sg); ++idx;
                        sig[oi][ci] = 1; signv[oi][ci] = sg ? -1 : 1;
                        value[oi][ci] = (int32_t)(1 << p);
                    }
                } else {
                    LCFeat f; learned_features(sig[oi], value[oi], (pidx>=0?&value[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 2, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                    uint16_t dp0r = model.predict(f);
                    uint8_t rb = d.decode_symbol(dp0r);
                    model.update(f, rb); ++idx;
                    if (rb) value[oi][ci] |= (int32_t)(1 << p);
                }
            }
        }
    }

    if (total_symbols != 0 && idx != total_symbols)
        throw std::runtime_error("BitplaneCoder::decode_static_r6c: symbol count mismatch");

    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = out[oi].coeffs.size();
        for (size_t ci = 0; ci < n; ++ci)
            out[oi].coeffs[ci] = (int32_t)value[oi][ci] * signv[oi][ci];
    }
    return out;
}

} // namespace prism::codec
