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
#include <algorithm>
#include <stdexcept>
#include <vector>

namespace prism::codec {

namespace {

int floor_log2(uint32_t v) {
    if (v == 0) return -1;
    return 31 - __builtin_clz(v);
}

int mag_bucket(int32_t v) {
    if (v <= 0) return 0;
    return (int)std::min(7, floor_log2((uint32_t)v));
}

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
                                            const std::vector<std::vector<int32_t>>* luma_mag) const {
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
                    p0.push_back(model.predict(f)); bits.push_back(bit); model.update(f, bit);
                    if (becomes) {
                        uint8_t sg = sgn[oi][ci];
                        LCFeat fs; learned_features(sig[oi], curmag[oi], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 1, s.level, fs);
                        fs.orient = (uint8_t)s.orient; fs.parent_sig = parent_sig ? 1 : 0; fs.fc = (uint8_t)fc; fs.dg = (uint8_t)dg;
                        p0.push_back(model.predict(fs)); bits.push_back(sg); model.update(fs, sg);
                        sig[oi][ci] = 1; curmag[oi][ci] = (int32_t)(1 << p);
                    }
                } else {
                    uint8_t bit = (uint8_t)((magv[oi][ci] >> p) & 1);
                    LCFeat f; learned_features(sig[oi], curmag[oi], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 2, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                    p0.push_back(model.predict(f)); bits.push_back(bit); model.update(f, bit);
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

    uint32_t idx = 0;
    // One shared predictor per plane (matches encode and training EMA evolution).
    LearnedModel model;
    for (size_t si = 0; si < order.size(); ++si) {
        size_t oi = order[si];
        const Subband& s = layout[oi];
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
                    uint8_t bit = d.decode_symbol(model.predict(f)); model.update(f, bit); ++idx;
                    if (bit) {
                        LCFeat fs; learned_features(sig[oi], value[oi], (pidx>=0?&value[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 1, s.level, fs);
                        fs.orient = (uint8_t)s.orient; fs.parent_sig = parent_sig ? 1 : 0; fs.fc = (uint8_t)fc; fs.dg = (uint8_t)dg;
                        uint8_t sg = d.decode_symbol(model.predict(fs)); model.update(fs, sg); ++idx;
                        sig[oi][ci] = 1; signv[oi][ci] = sg ? -1 : 1;
                        value[oi][ci] = (int32_t)(1 << p);
                    }
                } else {
                    LCFeat f; learned_features(sig[oi], value[oi], (pidx>=0?&value[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 2, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc = (uint8_t)fc; f.dg = (uint8_t)dg;
                    uint8_t rb = d.decode_symbol(model.predict(f)); model.update(f, rb); ++idx;
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
                                 const std::vector<std::vector<int32_t>>* luma_mag) {
    int ml = 0;
    auto order = coding_order(subbands, ml);
    auto parent = build_parent_map(subbands, ml);
    int B = 1;
    for (const auto& s : subbands)
        for (int32_t c : s.coeffs) {
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            int b = (m == 0) ? 0 : floor_log2(m) + 1;
            if (b > B) B = b;
        }
    if (maxbits_override > 0) B = maxbits_override;
    std::vector<std::vector<uint8_t>> sig(order.size());
    std::vector<std::vector<int32_t>> magv(order.size());
    std::vector<std::vector<int32_t>> curmag(order.size());
    std::vector<std::vector<uint8_t>> sgn(order.size());
    std::vector<std::vector<int>> topbit(order.size());
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si]; size_t n = subbands[oi].coeffs.size();
        sig[si].assign(n, 0); magv[si].resize(n); curmag[si].assign(n, 0);
        sgn[si].resize(n); topbit[si].assign(n, -1);
        for (size_t ci = 0; ci < n; ++ci) {
            int32_t c = subbands[oi].coeffs[ci];
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            magv[si][ci] = (int32_t)m; sgn[si][ci] = (c < 0) ? 1 : 0;
            topbit[si][ci] = (m == 0) ? -1 : floor_log2(m);
        }
    }
    std::vector<uint8_t> bits; std::vector<uint16_t> p0;
    LearnedModel model;
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si]; const Subband& s = subbands[oi];
        int w = s.w, h = s.h; int pidx = parent[oi];
        int pw = (pidx >= 0) ? subbands[pidx].w : 0, ph = (pidx >= 0) ? subbands[pidx].h : 0;
        for (int p = B - 1; p >= 0; --p) {
            for (size_t ci = 0; ci < s.coeffs.size(); ++ci) {
                int x = (int)(ci % w), y = (int)(ci / w);
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph) parent_sig = sig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(sig[si], w, h, x, y, fc, dg);
                if (sig[si][ci] == 0) {
                    bool becomes = (topbit[si][ci] == p);
                    uint8_t bit = becomes ? 1 : 0;
                    LCFeat f; learned_features(sig[si], curmag[si], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 0, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc=(uint8_t)fc; f.dg=(uint8_t)dg;
                    p0.push_back(model.predict(f)); bits.push_back(bit); model.update(f, bit);
                    if (becomes) {
                        uint8_t sg = sgn[si][ci];
                        LCFeat fs; learned_features(sig[si], curmag[si], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 1, s.level, fs);
                        fs.orient = (uint8_t)s.orient; fs.parent_sig = parent_sig ? 1 : 0; fs.fc=(uint8_t)fc; fs.dg=(uint8_t)dg;
                        p0.push_back(model.predict(fs)); bits.push_back(sg); model.update(fs, sg);
                        sig[si][ci] = 1; curmag[si][ci] = (int32_t)(1 << p);
                    }
                } else {
                    uint8_t bit = (uint8_t)((magv[si][ci] >> p) & 1);
                    LCFeat f; learned_features(sig[si], curmag[si], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 2, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc=(uint8_t)fc; f.dg=(uint8_t)dg;
                    p0.push_back(model.predict(f)); bits.push_back(bit); model.update(f, bit);
                    if (bit) curmag[si][ci] |= (int32_t)(1 << p);
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
                                    const std::vector<std::vector<int32_t>>* luma_mag) {
    int ml = 0;
    auto order = coding_order(subbands, ml);
    auto parent = build_parent_map(subbands, ml);
    int B = 1;
    for (const auto& s : subbands)
        for (int32_t c : s.coeffs) {
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            int b = (m == 0) ? 0 : floor_log2(m) + 1;
            if (b > B) B = b;
        }
    if (maxbits_override > 0) B = maxbits_override;

    std::vector<std::vector<uint8_t>> sig(order.size());
    std::vector<std::vector<int32_t>> magv(order.size());
    std::vector<std::vector<int32_t>> curmag(order.size());
    std::vector<std::vector<uint8_t>> sgn(order.size());
    std::vector<std::vector<int>> topbit(order.size());
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si]; size_t n = subbands[oi].coeffs.size();
        sig[si].assign(n, 0); magv[si].resize(n); curmag[si].assign(n, 0);
        sgn[si].resize(n); topbit[si].assign(n, -1);
        for (size_t ci = 0; ci < n; ++ci) {
            int32_t c = subbands[oi].coeffs[ci];
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            magv[si][ci] = (int32_t)m; sgn[si][ci] = (c < 0) ? 1 : 0;
            topbit[si][ci] = (m == 0) ? -1 : floor_log2(m);
        }
    }
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si]; const Subband& s = subbands[oi];
        int w = s.w, h = s.h; int pidx = parent[oi];
        int pw = (pidx >= 0) ? subbands[pidx].w : 0, ph = (pidx >= 0) ? subbands[pidx].h : 0;
        for (int p = B - 1; p >= 0; --p) {
            for (int ci = 0; ci < (int)s.coeffs.size(); ++ci) {
                int x = ci % w, y = ci / w;
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph) parent_sig = sig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(sig[si], w, h, x, y, fc, dg);
                uint32_t base = context_id(s.orient, parent_sig, fc, dg);
                if (sig[si][ci] == 0) {
                    bool becomes = (topbit[si][ci] == p);
                    LCFeat f; learned_features(sig[si], curmag[si], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 0, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc=(uint8_t)fc; f.dg=(uint8_t)dg;
                    out.push_back({f, becomes ? 1 : 0, coarse_ctx(base, 0)});
                    if (becomes) {
                        LCFeat fs; learned_features(sig[si], curmag[si], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 1, s.level, fs);
                        fs.orient = (uint8_t)s.orient; fs.parent_sig = parent_sig ? 1 : 0; fs.fc=(uint8_t)fc; fs.dg=(uint8_t)dg;
                        out.push_back({fs, sgn[si][ci], coarse_ctx(base, 1)});
                        sig[si][ci] = 1; curmag[si][ci] = (int32_t)(1 << p);
                    }
                } else {
                    uint8_t bit = (uint8_t)((magv[si][ci] >> p) & 1);
                    LCFeat f; learned_features(sig[si], curmag[si], (pidx>=0?&curmag[pidx]:nullptr), pw, ph, (luma_mag ? &(*luma_mag)[oi] : nullptr), w, h, x, y, p, 2, s.level, f);
                    f.orient = (uint8_t)s.orient; f.parent_sig = parent_sig ? 1 : 0; f.fc=(uint8_t)fc; f.dg=(uint8_t)dg;
                    out.push_back({f, bit, coarse_ctx(base, 2)});
                    if (bit) curmag[si][ci] |= (int32_t)(1 << p);
                }
            }
        }
    }
}

} // namespace prism::codec
