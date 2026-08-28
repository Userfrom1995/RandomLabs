// EBCOT-style bitplane coder with the pinned parent-aware context (I28).
//
// Codec structure: for each subband in coding order (LL first, then HL/LH/HH
// coarse-to-fine), and for each bitplane from MSB down to LSB, each
// coefficient emits one SIGNIFICANCE (or REFINEMENT) bit; on the bitplane
// where a coefficient first becomes significant an extra SIGN bit follows. The
// context for every symbol is a fixed function of orientation, parent
// significance (spatial orientation tree) and the count of significant
// 8-neighbours (I27: no transmitted tables, online-adapted, LIFO-safe).

#include "prism/codec/bitplane.h"
#include "prism/codec/bitplane_rans.h"
#include <algorithm>
#include <stdexcept>
#include <vector>

namespace prism::codec {

namespace {

int floor_log2(uint32_t v) {
    if (v == 0) return -1;
    return 31 - __builtin_clz(v);
}

// Build the coding order: LL(level 0) first, then level 1..maxlevel HL,LH,HH.
// Only subbands actually present in `subs` are emitted (so a single-subband
// decode layout does not produce invalid -1 entries).
std::vector<int> coding_order(const std::vector<Subband>& subs, int& maxlevel) {
    int ml = 0;
    for (const auto& s : subs) if (s.level > ml) ml = s.level;
    maxlevel = ml;
    // map (orient, level) -> original index
    std::vector<int> map(4 * (ml + 1), -1);
    for (int i = 0; i < (int)subs.size(); ++i) {
        int orient = (int)subs[i].orient;
        map[orient * (ml + 1) + subs[i].level] = i;
    }
    std::vector<int> order;
    order.reserve(subs.size());
    if (map[0 * (ml + 1) + 0] >= 0) order.push_back(map[0 * (ml + 1) + 0]); // LL
    for (int L = 1; L <= ml; ++L) {
        for (int o = 1; o <= 3; ++o) {
            int idx = map[o * (ml + 1) + L];
            if (idx >= 0) order.push_back(idx);
        }
    }
    return order;
}

// parentMap[origIdx] = parent subband original index (or -1 for LL).
std::vector<int> build_parent_map(const std::vector<Subband>& subs, int ml) {
    std::vector<int> map(4 * (ml + 1), -1);
    for (int i = 0; i < (int)subs.size(); ++i)
        map[(int)subs[i].orient * (ml + 1) + subs[i].level] = i;
    std::vector<int> parent(subs.size(), -1);
    for (int i = 0; i < (int)subs.size(); ++i) {
        const Subband& s = subs[i];
        if (s.level == 0) parent[i] = -1;
        else if (s.level == 1) parent[i] = map[0 * (ml + 1) + 0]; // LL
        else parent[i] = map[(int)s.orient * (ml + 1) + (s.level - 1)];
    }
    return parent;
}

// Count significant 4-connected (fc) and diagonal (dg) neighbours of (x,y) in
// the current subband significance map `sig`. Splitting the 8-neighbour
// significance STATE into the 4-connected vs diagonal pattern is the EBCOT
// significance-propagation context: the *shape* of the significance field around
// a coefficient is far more predictive than a single total count (which the
// original count-bucket context collapsed to). This is the "full parent-aware
// bitplane context" the X2 gate requires.

} // namespace

inline void neighbor_counts(const std::vector<uint8_t>& sig, int w, int h, int x, int y,
                            int& fc, int& dg) {
    fc = 0;
    dg = 0;
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

uint32_t BitplaneCoder::context_id(Subband::Orient o, bool parent_sig, int fc, int dg) {
    uint32_t orient = (uint32_t)o;          // 0..3  (2 bits)
    uint32_t ps = parent_sig ? 1u : 0u;     // 1 bit
    uint32_t f = (fc > 4) ? 4u : (uint32_t)fc;  // 0..4 (3 bits)
    uint32_t d = (dg > 4) ? 4u : (uint32_t)dg;  // 0..4 (3 bits)
    // base context id in [0, 199]; sign/refine pools are offset (see encode).
    return orient + ps * 4u + f * 8u + d * 40u;
}

BitplaneCoder::Result BitplaneCoder::encode(const std::vector<Subband>& subbands,
                                            int maxbits_override) const {
    int ml = 0;
    auto order = coding_order(subbands, ml);
    auto parent = build_parent_map(subbands, ml);

    // Global maxbits B.
    int B = 1;
    for (const auto& s : subbands)
        for (int32_t c : s.coeffs) {
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            int b = (m == 0) ? 0 : floor_log2(m) + 1;
            if (b > B) B = b;
        }
    if (maxbits_override > 0) B = maxbits_override;

    // Per-subband significance + ground-truth magnitude/sign.
    std::vector<std::vector<uint8_t>> sig(order.size());
    std::vector<std::vector<int32_t>> magv(order.size());
    std::vector<std::vector<uint8_t>> sgn(order.size());
    std::vector<std::vector<int>> topbit(order.size());
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si];
        const Subband& s = subbands[oi];
        size_t n = s.coeffs.size();
        sig[si].assign(n, 0);
        magv[si].resize(n);
        sgn[si].resize(n);
        topbit[si].assign(n, -1);
        for (size_t ci = 0; ci < n; ++ci) {
            int32_t c = s.coeffs[ci];
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            magv[si][ci] = (int32_t)m;
            sgn[si][ci] = (c < 0) ? 1 : 0;
            topbit[si][ci] = (m == 0) ? -1 : floor_log2(m);
        }
    }

    // Count total symbols: one per coeff per bitplane, plus one sign per
    // non-zero coefficient.
    uint32_t total = 0;
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si];
        size_t n = subbands[oi].coeffs.size();
        total += (uint32_t)(n * (size_t)B);
        for (size_t ci = 0; ci < n; ++ci)
            if (magv[si][ci] > 0) ++total;
    }

    std::vector<uint8_t> bits(total);
    std::vector<uint32_t> ctx(total);
    uint32_t idx = 0;

    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si];
        const Subband& s = subbands[oi];
        int w = s.w, h = s.h;
        int pidx = parent[oi];
        for (int p = B - 1; p >= 0; --p) {
            for (int ci = 0; ci < (int)s.coeffs.size(); ++ci) {
                int x = ci % w, y = ci / w;
                // Context from current significance state (before this symbol).
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pw = subbands[pidx].w, ph = subbands[pidx].h;
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph)
                        parent_sig = sig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(sig[si], w, h, x, y, fc, dg);
                uint32_t base = context_id(s.orient, parent_sig, fc, dg);
                if (sig[si][ci] == 0) {
                    bool becomes = (topbit[si][ci] == p);
                    bits[idx] = becomes ? 1 : 0;
                    ctx[idx] = base;
                    ++idx;
                    if (becomes) {
                        bits[idx] = sgn[si][ci];
                        ctx[idx] = base + 200; // SIGN pool
                        ++idx;
                        sig[si][ci] = 1;
                    }
                } else {
                    bits[idx] = (magv[si][ci] >> p) & 1;
                    ctx[idx] = base + 400; // REFINEMENT pool
                    ++idx;
                }
            }
        }
    }

    BitplaneRans rans;
    Result res;
    res.stream = rans.encode(bits, ctx);
    res.total_symbols = total;
    res.maxbits = (uint8_t)B;
    return res;
}

std::pair<std::vector<uint8_t>, std::vector<uint32_t>>
BitplaneCoder::generate_symbols(const std::vector<Subband>& subbands, int maxbits_override) {
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
    std::vector<std::vector<uint8_t>> sgn(order.size());
    std::vector<std::vector<int>> topbit(order.size());
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si];
        size_t n = subbands[oi].coeffs.size();
        sig[si].assign(n, 0); magv[si].resize(n); sgn[si].resize(n); topbit[si].assign(n, -1);
        for (size_t ci = 0; ci < n; ++ci) {
            int32_t c = subbands[oi].coeffs[ci];
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            magv[si][ci] = (int32_t)m; sgn[si][ci] = (c < 0) ? 1 : 0;
            topbit[si][ci] = (m == 0) ? -1 : floor_log2(m);
        }
    }
    uint32_t total = 0;
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si];
        size_t n = subbands[oi].coeffs.size();
        total += (uint32_t)(n * (size_t)B);
        for (size_t ci = 0; ci < n; ++ci) if (magv[si][ci] > 0) ++total;
    }
    std::vector<uint8_t> bits(total); std::vector<uint32_t> ctx(total); uint32_t idx = 0;
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si]; const Subband& s = subbands[oi];
        int w = s.w, h = s.h; int pidx = parent[oi];
        for (int p = B - 1; p >= 0; --p) {
            for (int ci = 0; ci < (int)s.coeffs.size(); ++ci) {
                int x = ci % w, y = ci / w;
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pw = subbands[pidx].w, ph = subbands[pidx].h;
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph) parent_sig = sig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(sig[si], w, h, x, y, fc, dg);
                uint32_t base = context_id(s.orient, parent_sig, fc, dg);
                if (sig[si][ci] == 0) {
                    bool becomes = (topbit[si][ci] == p);
                    bits[idx] = becomes ? 1 : 0; ctx[idx] = base; ++idx;
                    if (becomes) {                     bits[idx] = sgn[si][ci]; ctx[idx] = base + 200; ++idx; sig[si][ci] = 1; }
                } else {
                    bits[idx] = (magv[si][ci] >> p) & 1; ctx[idx] = base + 400; ++idx;
                }
            }
        }
    }
    return {bits, ctx};
}

std::vector<Subband> BitplaneCoder::decode(const std::vector<uint8_t>& stream,
                                            const std::vector<Subband>& layout,
                                            const std::vector<uint8_t>& sub_maxbits,
                                            uint32_t total_symbols) const {
    int ml = 0;
    auto order = coding_order(layout, ml);
    auto parent = build_parent_map(layout, ml);

    std::vector<Subband> out = layout; // copy orientation/level/w/h
    for (auto& s : out) s.coeffs.assign(s.w * s.h, 0);

    std::vector<std::vector<uint8_t>> sig(order.size());
    std::vector<std::vector<int32_t>> value(order.size());
    std::vector<std::vector<int8_t>> signv(order.size());
    for (size_t si = 0; si < order.size(); ++si) {
        size_t n = out[order[si]].coeffs.size();
        sig[si].assign(n, 0);
        value[si].resize(n, 0);
        signv[si].assign(n, 1);
    }

    BitplaneRans::Decoder dec;
    dec.init(stream);

    uint32_t idx = 0;
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si];
        const Subband& s = layout[oi];
        int w = s.w, h = s.h;
        int pidx = parent[oi];
        int B = (int)sub_maxbits[si];
        for (int p = B - 1; p >= 0; --p) {
            for (int ci = 0; ci < (int)s.coeffs.size(); ++ci) {
                int x = ci % w, y = ci / w;
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pw = layout[pidx].w, ph = layout[pidx].h;
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph)
                        parent_sig = sig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(sig[si], w, h, x, y, fc, dg);
                uint32_t base = context_id(s.orient, parent_sig, fc, dg);
                if (sig[si][ci] == 0) {
                    uint8_t bit = dec.decode_symbol(base);
                    ++idx;
                    if (bit) {
                        uint8_t sg = dec.decode_symbol(base + 200);
                        ++idx;
                        sig[si][ci] = 1;
                        signv[si][ci] = sg ? -1 : 1;
                        value[si][ci] = (int32_t)(1 << p);
                    }
                } else {
                    uint8_t rb = dec.decode_symbol(base + 400);
                    ++idx;
                    if (rb) value[si][ci] |= (int32_t)(1 << p);
                }
            }
        }
    }

    if (total_symbols != 0 && idx != total_symbols)
        throw std::runtime_error("BitplaneCoder::decode: symbol count mismatch");

    // Assemble reconstructed subbands in original order.
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si];
        size_t n = out[oi].coeffs.size();
        for (size_t ci = 0; ci < n; ++ci)
            out[oi].coeffs[ci] = (int32_t)value[si][ci] * signv[si][ci];
    }
    return out;
}

std::vector<uint32_t> BitplaneCoder::decode_trace(const std::vector<uint8_t>& stream,
                                                  const std::vector<Subband>& layout,
                                                  uint8_t maxbits, uint32_t total_symbols,
                                                  std::vector<uint8_t>* out_bits) const {
    int ml = 0;
    auto order = coding_order(layout, ml);
    auto parent = build_parent_map(layout, ml);
    int B = maxbits;
    std::vector<std::vector<uint8_t>> sig(order.size());
    std::vector<std::vector<int8_t>> signv(order.size());
    std::vector<std::vector<int32_t>> value(order.size());
    for (size_t si = 0; si < order.size(); ++si) {
        size_t n = layout[order[si]].coeffs.size();
        sig[si].assign(n, 0); value[si].resize(n, 0); signv[si].assign(n, 1);
    }
    BitplaneRans::Decoder dec;
    dec.init(stream);
    std::vector<uint32_t> used;
    used.reserve(total_symbols + 16);
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si];
        const Subband& s = layout[oi];
        int w = s.w, h = s.h;
        int pidx = parent[oi];
        for (int p = B - 1; p >= 0; --p) {
            for (int ci = 0; ci < (int)s.coeffs.size(); ++ci) {
                int x = ci % w, y = ci / w;
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pw = layout[pidx].w, ph = layout[pidx].h;
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph)
                        parent_sig = sig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(sig[si], w, h, x, y, fc, dg);
                uint32_t base = context_id(s.orient, parent_sig, fc, dg);
                if (sig[si][ci] == 0) {
                    used.push_back(base);
                    uint8_t bit = dec.decode_symbol(base);
                    if (out_bits) out_bits->push_back(bit);
                    if (bit) {
                        used.push_back(base + 200);
                        uint8_t sg = dec.decode_symbol(base + 200);
                        if (out_bits) out_bits->push_back(sg);
                        sig[si][ci] = 1;
                        signv[si][ci] = sg ? -1 : 1;
                        value[si][ci] = (int32_t)(1 << p);
                    }
                } else {
                    used.push_back(base + 400);
                    uint8_t rb = dec.decode_symbol(base + 400);
                    if (out_bits) out_bits->push_back(rb);
                    if (rb) value[si][ci] |= (int32_t)(1 << p);
                }
            }
        }
    }
    (void)total_symbols;
    return used;
}

bool BitplaneCoder::probe_rans(const std::vector<Subband>& subbands, int maxbits_override) {
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
    std::vector<std::vector<uint8_t>> sgn(order.size());
    std::vector<std::vector<int>> topbit(order.size());
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si];
        size_t n = subbands[oi].coeffs.size();
        sig[si].assign(n, 0); magv[si].resize(n); sgn[si].resize(n); topbit[si].assign(n, -1);
        for (size_t ci = 0; ci < n; ++ci) {
            int32_t c = subbands[oi].coeffs[ci];
            uint32_t m = (uint32_t)(c < 0 ? -c : c);
            magv[si][ci] = (int32_t)m; sgn[si][ci] = (c < 0) ? 1 : 0;
            topbit[si][ci] = (m == 0) ? -1 : floor_log2(m);
        }
    }
    uint32_t total = 0;
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si];
        size_t n = subbands[oi].coeffs.size();
        total += (uint32_t)(n * (size_t)B);
        for (size_t ci = 0; ci < n; ++ci) if (magv[si][ci] > 0) ++total;
    }
    std::vector<uint8_t> bits(total); std::vector<uint32_t> ctx(total); uint32_t idx = 0;
    for (size_t si = 0; si < order.size(); ++si) {
        int oi = order[si]; const Subband& s = subbands[oi];
        int w = s.w, h = s.h; int pidx = parent[oi];
        for (int p = B - 1; p >= 0; --p) {
            for (int ci = 0; ci < (int)s.coeffs.size(); ++ci) {
                int x = ci % w, y = ci / w;
                bool parent_sig = false;
                if (pidx >= 0) {
                    int pw = subbands[pidx].w, ph = subbands[pidx].h;
                    int pcx = x >> 1, pcy = y >> 1;
                    if (pcx < pw && pcy < ph) parent_sig = sig[pidx][(size_t)pcy * pw + pcx] != 0;
                }
                int fc = 0, dg = 0;
                neighbor_counts(sig[si], w, h, x, y, fc, dg);
                uint32_t base = context_id(s.orient, parent_sig, fc, dg);
                if (sig[si][ci] == 0) {
                    bool becomes = (topbit[si][ci] == p);
                    bits[idx] = becomes ? 1 : 0; ctx[idx] = base; ++idx;
                    if (becomes) {                     bits[idx] = sgn[si][ci]; ctx[idx] = base + 200; ++idx; sig[si][ci] = 1; }
                } else {
                    bits[idx] = (magv[si][ci] >> p) & 1; ctx[idx] = base + 400; ++idx;
                }
            }
        }
    }
    BitplaneRans r;
    auto enc = r.encode(bits, ctx);
    BitplaneRans::Decoder d; d.init(enc);
    std::vector<uint8_t> out(total);
    for (uint32_t k = 0; k < total; ++k) out[k] = d.decode_symbol(ctx[k]);
    return out == bits;
}

} // namespace prism::codec
