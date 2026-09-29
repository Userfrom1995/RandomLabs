// Route 5: truly autoregressive learned rANS entropy frontend (issue #130).
//
// Replaces the Route-4 per-bitplane adaptive binary coder with a hybrid-uint
// tokenization coded by a multi-symbol (categorical) rANS. For each coefficient
// the baked neural net emits a full categorical distribution over tokens
// {zero, |c|=1..7, escape} from a 2D-causal neighbour window; the chosen token
// is coded near its entropy bound. Escapes fall back to Elias-gamma at a fixed
// 0.5 probability on the same rANS.
//
// LIFO-safety (ryg analysis, same as BitplaneRans): the rANS stream is
// reverse-emitted at encode and reverse-recovered at decode, so the net/EMA
// distribution - a PURE function of already-decoded neighbour magnitudes - is
// reproduced exactly on both sides. A per-fine-context categorical EMA adapts in
// forward order on both sides and stays byte-exact.

#include "prism/codec/route5.h"
#include <algorithm>
#include <cmath>
#include <cstring>
#include <stdexcept>
#include <vector>

namespace prism::codec {

namespace {

constexpr uint32_t RANS_L = 1u << 23;
constexpr uint32_t RANS_M = 1u << 16;
constexpr uint32_t RANS_SCALE = 16;
constexpr uint32_t RANS_MASK = RANS_M - 1;
const uint16_t R5_HALF = (uint16_t)(RANS_M >> 1);
using St = uint32_t;

inline void enc_init(St* r) { *r = RANS_L; }
inline St enc_renorm(St x, uint8_t** p, uint32_t freq) {
    uint32_t xmax = ((RANS_L >> RANS_SCALE) << 8) * freq;
    if (x >= xmax) {
        uint8_t* ptr = *p;
        do { *--ptr = (uint8_t)(x & 0xff); x >>= 8; } while (x >= xmax);
        *p = ptr;
    }
    return x;
}
inline void enc_put(St* r, uint8_t** p, uint32_t start, uint32_t freq) {
    St x = enc_renorm(*r, p, freq);
    *r = ((x / freq) << RANS_SCALE) + (x % freq) + start;
}
inline void enc_flush(St* r, uint8_t** p) {
    uint8_t* ptr = *p;
    ptr -= 4;
    ptr[0] = (uint8_t)(*r >> 0);
    ptr[1] = (uint8_t)(*r >> 8);
    ptr[2] = (uint8_t)(*r >> 16);
    ptr[3] = (uint8_t)(*r >> 24);
    *p = ptr;
}
inline void dec_init(St* r, uint8_t** p) {
    uint8_t* ptr = *p;
    *r = (uint32_t)ptr[0] | ((uint32_t)ptr[1] << 8) |
         ((uint32_t)ptr[2] << 16) | ((uint32_t)ptr[3] << 24);
    ptr += 4;
    *p = ptr;
}
inline void dec_advance(St* r, uint8_t** p, uint32_t start, uint32_t freq) {
    uint32_t mask = (1u << RANS_SCALE) - 1;
    uint32_t x = *r;
    x = freq * (x >> RANS_SCALE) + (x & mask) - start;
    if (x < RANS_L) {
        uint8_t* ptr = *p;
        do x = (x << 8) | *ptr++; while (x < RANS_L);
        *p = ptr;
    }
    *r = x;
}

int floor_log2(uint32_t v) {
    if (v == 0) return -1;
    return 31 - __builtin_clz(v);
}
int mag_bucket(int32_t v) {
    if (v <= 0) return 0;
    return (int)std::min(7, floor_log2((uint32_t)v));
}

// Cumulative starts from a frequency table (size A), summing to RANS_M.
void cumulate(const uint16_t freqs[], int A, uint32_t starts[]) {
    uint32_t acc = 0;
    for (int i = 0; i < A; ++i) { starts[i] = acc; acc += freqs[i]; }
}

// Build the coding order: LL first, then HL/LH/HH coarse-to-fine (mirrors Route 4).
std::vector<int> coding_order(const std::vector<Subband>& subs, int& ml) {
    int m = 0;
    for (const auto& s : subs) if (s.level > m) m = s.level;
    ml = m;
    std::vector<int> map(4 * (m + 1), -1);
    for (int i = 0; i < (int)subs.size(); ++i)
        map[(int)subs[i].orient * (m + 1) + subs[i].level] = i;
    std::vector<int> order;
    if (map[0] >= 0) order.push_back(map[0]);
    for (int L = 1; L <= m; ++L)
        for (int o = 1; o <= 3; ++o) {
            int idx = map[o * (m + 1) + L];
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

void neighbor_counts(const std::vector<uint8_t>& sig, int w, int h, int x, int y,
                     int& fc, int& dg) {
    fc = 0; dg = 0;
    auto at = [&](int nx, int ny) {
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

// Build the 13 normalized net features from the causal window (aligned with the
// Route-4 learned_norm layout; symtype/ppos set 0 because Route 5 has no bitplane).
void r5_norm(const R5Feat& f, float out[13]) {
    out[0] = 0.0f;                  // symtype (unused)
    out[1] = f.orient / 3.0f;
    out[2] = f.parent_sig ? 1.0f : 0.0f;
    out[3] = f.fc / 4.0f;
    out[4] = f.dg / 4.0f;
    out[5] = f.nbsig / 8.0f;
    out[6] = f.nmag / 7.0f;
    out[7] = f.pmag / 7.0f;
    out[8] = f.ownmag / 7.0f;
    out[9] = 0.0f;                  // ppos (unused)
    out[10] = f.lc_mag / 7.0f;
    out[11] = f.lc_sig ? 1.0f : 0.0f;
    out[12] = f.level / 5.0f;
}

} // namespace

float r5_net_token_logit(int i, const float x[13]) {
#include "route5_data.inc"
    constexpr int LH1 = 32, LH2 = 16;
    float h1[LH1];
    for (int j = 0; j < LH1; ++j) {
        float acc = R5TOK_Lb1[j];
        for (int k = 0; k < 13; ++k) acc += R5TOK_LW1[j][k] * x[k];
        h1[j] = acc > 0.0f ? acc : 0.0f;
    }
    float h2[LH2];
    for (int j = 0; j < LH2; ++j) {
        float acc = R5TOK_Lb2[j];
        for (int k = 0; k < LH1; ++k) acc += R5TOK_LW2[j][k] * h1[k];
        h2[j] = acc > 0.0f ? acc : 0.0f;
    }
    float acc = R5TOK_Lb3;
    for (int k = 0; k < LH2; ++k) acc += R5TOK_LW3[i][k] * h2[k];
    return acc;
}

float Route5Model::g_blend = 1.0f;

Route5Model::Route5Model() {
    ema_.assign((size_t)FINE_POOL * R5_ALPHA, 1.0f / (float)R5_ALPHA);
    count_.assign(FINE_POOL, 0);
}

void Route5Model::predict(const R5Feat& f, uint16_t freqs[R5_ALPHA]) const {
    float x[13];
    r5_norm(f, x);
    // Net logits -> softmax probabilities (stable).
    float net_p[R5_ALPHA];
    float mx = -1e30f;
    for (int i = 0; i < R5_ALPHA; ++i) { net_p[i] = r5_net_token_logit(i, x); if (net_p[i] > mx) mx = net_p[i]; }
    float sum = 0.0f;
    for (int i = 0; i < R5_ALPHA; ++i) { net_p[i] = std::exp(net_p[i] - mx); sum += net_p[i]; }
    for (int i = 0; i < R5_ALPHA; ++i) net_p[i] /= sum;

    uint32_t c = fine_ctx(f);
    const float* e = &ema_[(size_t)c * R5_ALPHA];
    uint32_t n = count_[c];
    float alpha = (float)n / (float)(n + K_PSEUDO);
    float w_net = (1.0f - alpha) * blend();
    float w_ema = 1.0f - w_net;
    double acc = 0.0;
    uint16_t tmp[R5_ALPHA];
    for (int i = 0; i < R5_ALPHA; ++i) {
        float p = w_ema * e[i] + w_net * net_p[i];
        if (p < 0.0f) p = 0.0f;
        acc += p;
        tmp[i] = (uint16_t)(p * RANS_M);
    }
    // Clamp each to >= 1 and renormalize to sum exactly RANS_M.
    uint32_t total = 0;
    for (int i = 0; i < R5_ALPHA; ++i) {
        if (tmp[i] < 1) tmp[i] = 1;
        total += tmp[i];
    }
    if (total != RANS_M) {
        // Scale down/up proportionally to hit RANS_M exactly.
        uint32_t adj = 0;
        for (int i = 0; i < R5_ALPHA; ++i) {
            uint32_t v = (uint32_t)((uint64_t)tmp[i] * RANS_M / total);
            if (v < 1) v = 1;
            freqs[i] = (uint16_t)v;
            adj += freqs[i];
        }
        // Fix rounding remainder on the largest bucket.
        int bimax = 0; for (int i = 1; i < R5_ALPHA; ++i) if (freqs[i] > freqs[bimax]) bimax = i;
        int64_t diff = (int64_t)RANS_M - (int64_t)adj;
        freqs[bimax] = (uint16_t)((int64_t)freqs[bimax] + diff);
    } else {
        for (int i = 0; i < R5_ALPHA; ++i) freqs[i] = tmp[i];
    }
}

void Route5Model::update(const R5Feat& f, uint8_t token) {
    uint32_t c = fine_ctx(f);
    float* e = &ema_[(size_t)c * R5_ALPHA];
    // Categorical EMA: nudge the token's probability up, the rest down.
    const float lr = 0.05f;
    for (int i = 0; i < R5_ALPHA; ++i) e[i] *= (1.0f - lr);
    e[token] += lr;
    // Renormalise to a probability distribution.
    float s = 0.0f;
    for (int i = 0; i < R5_ALPHA; ++i) s += e[i];
    for (int i = 0; i < R5_ALPHA; ++i) e[i] /= s;
    if (count_[c] < 0xFFFFu) ++count_[c];
}

Route5Coder::Result Route5Coder::encode(const std::vector<Subband>& subbands) const {
    int ml = 0;
    auto order = coding_order(subbands, ml);
    auto parent = build_parent_map(subbands, ml);
    size_t NS = subbands.size();

    std::vector<std::vector<uint8_t>> sig(NS), csig(NS);
    std::vector<std::vector<int32_t>> mag(NS), cmag(NS);
    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = subbands[oi].coeffs.size();
        sig[oi].assign(n, 0); mag[oi].assign(n, 0);
    }

    Result res;
    res.streams.resize(NS);

    for (size_t si = 0; si < order.size(); ++si) {
        size_t oi = order[si];
        const Subband& s = subbands[oi];
        int w = s.w, h = s.h;
        size_t n = (size_t)w * h;
        int pidx = parent[oi];
        int pw = (pidx >= 0) ? subbands[pidx].w : 0;
        int ph = (pidx >= 0) ? subbands[pidx].h : 0;
        Route5Model model;

        // Assemble events in assembly order, then reverse-emit.
        struct Ev { uint8_t sym; uint16_t start; uint16_t freq; bool is_token; };
        std::vector<Ev> evs;
        evs.reserve(n * 3 / 2);

        for (size_t ci = 0; ci < n; ++ci) {
            int x = (int)(ci % w), yy = (int)(ci / w);
            bool parent_sig = false;
            if (pidx >= 0) {
                int pcx = x >> 1, pcy = yy >> 1;
                if (pcx < pw && pcy < ph)
                    parent_sig = mag[pidx][(size_t)pcy * pw + pcx] != 0;
            }
            int fc = 0, dg = 0;
            neighbor_counts(sig[oi], w, h, x, yy, fc, dg);
            int nm = 0;
            auto nm_at = [&](int nx, int ny) {
                if (nx >= 0 && nx < w && ny >= 0 && ny < h && sig[oi][(size_t)ny * w + nx])
                    nm = std::max(nm, (int)mag[oi][(size_t)ny * w + nx]);
            };
            nm_at(x - 1, yy); nm_at(x + 1, yy); nm_at(x, yy - 1); nm_at(x, yy + 1);
            nm_at(x - 1, yy - 1); nm_at(x + 1, yy - 1); nm_at(x - 1, yy + 1); nm_at(x + 1, yy + 1);
            int pm = 0;
            if (pidx >= 0) {
                int pcx = x >> 1, pcy = yy >> 1;
                if (pcx < pw && pcy < ph) pm = (int)mag[pidx][(size_t)pcy * pw + pcx];
            }
            R5Feat f;
            f.orient = (uint8_t)s.orient; f.level = (uint8_t)s.level;
            f.parent_sig = parent_sig ? 1 : 0;
            f.fc = (uint8_t)std::min(4, fc); f.dg = (uint8_t)std::min(4, dg);
            f.nbsig = (uint8_t)(fc + dg);
            f.nmag = (uint8_t)mag_bucket(nm); f.pmag = (uint8_t)mag_bucket(pm);
            f.ownmag = 0; f.ppos = 0; f.lc_mag = 0; f.lc_sig = 0;

            uint16_t tfreq[R5_ALPHA];
            model.predict(f, tfreq);
            uint32_t tstart[R5_ALPHA];
            cumulate(tfreq, R5_ALPHA, tstart);

            int32_t c = subbands[oi].coeffs[ci];
            uint8_t tok = coeff_token(c);
            evs.push_back({tok, (uint16_t)tstart[tok], tfreq[tok], true});

            // Direct nonzero token: emit a separate sign bit. Escape: sign bit then
            // Elias-gamma magnitude, all on the same rANS at 0.5.
            if (tok >= 1 && tok < R5_T_ESC) {
                uint8_t sign = (c < 0) ? 1 : 0;
                evs.push_back({sign, sign ? R5_HALF : (uint16_t)0, R5_HALF, false});
            } else if (tok == R5_T_ESC) {
                uint8_t sign = (c < 0) ? 1 : 0;
                evs.push_back({sign, sign ? R5_HALF : (uint16_t)0, R5_HALF, false});
                uint32_t m = (uint32_t)(c < 0 ? -c : c);
                int q = floor_log2(m);
                for (int k = 0; k < q; ++k)
                    evs.push_back({(uint16_t)0, (uint16_t)0, R5_HALF, false});
                evs.push_back({(uint16_t)1, R5_HALF, R5_HALF, false});
                uint32_t rem = m - (1u << q);
                for (int k = q - 1; k >= 0; --k) {
                    uint8_t bit = (uint8_t)((rem >> k) & 1u);
                    evs.push_back({bit, bit ? R5_HALF : (uint16_t)0, R5_HALF, false});
                }
            }
            model.update(f, tok);
            int32_t ac = std::abs(c);
            sig[oi][ci] = (ac != 0) ? 1 : 0;
            mag[oi][ci] = ac;
        }

        // Reverse-emit so decode recovers assembly order.
        std::vector<uint8_t> buf(evs.size() * 4 + 32, 0);
        uint8_t* ptr = buf.data() + buf.size();
        St state; enc_init(&state);
        for (size_t k = evs.size(); k-- > 0;) {
            const Ev& e = evs[k];
            enc_put(&state, &ptr, e.start, e.freq);
        }
        enc_flush(&state, &ptr);
        res.streams[oi] = std::vector<uint8_t>(ptr, buf.data() + buf.size());
    }
    return res;
}

std::vector<Subband> Route5Coder::decode(const std::vector<std::vector<uint8_t>>& streams,
                                         const std::vector<Subband>& layout) const {
    int ml = 0;
    auto order = coding_order(layout, ml);
    auto parent = build_parent_map(layout, ml);
    size_t NS = layout.size();

    std::vector<Subband> out = layout;
    for (auto& s : out) s.coeffs.assign((size_t)s.w * s.h, 0);

    std::vector<std::vector<uint8_t>> sig(NS);
    std::vector<std::vector<int32_t>> mag(NS);
    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = out[oi].coeffs.size();
        sig[oi].assign(n, 0); mag[oi].assign(n, 0);
    }

    for (size_t si = 0; si < order.size(); ++si) {
        size_t oi = order[si];
        const Subband& s = layout[oi];
        int w = s.w, h = s.h;
        size_t n = (size_t)w * h;
        int pidx = parent[oi];
        int pw = (pidx >= 0) ? layout[pidx].w : 0;
        int ph = (pidx >= 0) ? layout[pidx].h : 0;
        Route5Model model;

        std::vector<uint8_t> bytes = streams[oi];
        uint8_t* d = bytes.data();
        St state; dec_init(&state, &d);

        for (size_t ci = 0; ci < n; ++ci) {
            int x = (int)(ci % w), yy = (int)(ci / w);
            bool parent_sig = false;
            if (pidx >= 0) {
                int pcx = x >> 1, pcy = yy >> 1;
                if (pcx < pw && pcy < ph)
                    parent_sig = mag[pidx][(size_t)pcy * pw + pcx] != 0;
            }
            int fc = 0, dg = 0;
            neighbor_counts(sig[oi], w, h, x, yy, fc, dg);
            int nm = 0;
            auto nm_at = [&](int nx, int ny) {
                if (nx >= 0 && nx < w && ny >= 0 && ny < h && sig[oi][(size_t)ny * w + nx])
                    nm = std::max(nm, (int)mag[oi][(size_t)ny * w + nx]);
            };
            nm_at(x - 1, yy); nm_at(x + 1, yy); nm_at(x, yy - 1); nm_at(x, yy + 1);
            nm_at(x - 1, yy - 1); nm_at(x + 1, yy - 1); nm_at(x - 1, yy + 1); nm_at(x + 1, yy + 1);
            int pm = 0;
            if (pidx >= 0) {
                int pcx = x >> 1, pcy = yy >> 1;
                if (pcx < pw && pcy < ph) pm = (int)mag[pidx][(size_t)pcy * pw + pcx];
            }
            R5Feat f;
            f.orient = (uint8_t)s.orient; f.level = (uint8_t)s.level;
            f.parent_sig = parent_sig ? 1 : 0;
            f.fc = (uint8_t)std::min(4, fc); f.dg = (uint8_t)std::min(4, dg);
            f.nbsig = (uint8_t)(fc + dg);
            f.nmag = (uint8_t)mag_bucket(nm); f.pmag = (uint8_t)mag_bucket(pm);
            f.ownmag = 0; f.ppos = 0; f.lc_mag = 0; f.lc_sig = 0;

            uint16_t tfreq[R5_ALPHA];
            model.predict(f, tfreq);
            uint32_t tstart[R5_ALPHA];
            cumulate(tfreq, R5_ALPHA, tstart);

            // Decode token.
            uint32_t slot = state & RANS_MASK;
            uint8_t tok = 0;
            while (tok + 1 < R5_ALPHA && slot >= tstart[tok] + tfreq[tok]) ++tok;
            dec_advance(&state, &d, tstart[tok], tfreq[tok]);

            int32_t c = 0;
            if (tok >= 1 && tok < R5_T_ESC) {
                uint32_t slot = state & RANS_MASK;
                uint8_t sign = (slot >= R5_HALF) ? 1 : 0;
                dec_advance(&state, &d, sign ? R5_HALF : (uint16_t)0, RANS_M / 2);
                c = sign ? -(int32_t)tok : (int32_t)tok;
            } else if (tok == R5_T_ESC) {
                uint32_t slot = state & RANS_MASK;
                uint8_t sign = (slot >= R5_HALF) ? 1 : 0;
                dec_advance(&state, &d, sign ? R5_HALF : (uint16_t)0, RANS_M / 2);
                int q = 0;
                while (true) {
                    uint32_t s2 = state & RANS_MASK;
                    uint8_t b = (s2 >= R5_HALF) ? 1 : 0;
                    dec_advance(&state, &d, b ? R5_HALF : (uint16_t)0, RANS_M / 2);
                    if (b == 1) break;
                    ++q;
                }
                uint32_t rem = 0;
                for (int k = 0; k < q; ++k) {
                    uint32_t s2 = state & RANS_MASK;
                    uint8_t b = (s2 >= R5_HALF) ? 1 : 0;
                    dec_advance(&state, &d, b ? R5_HALF : (uint16_t)0, RANS_M / 2);
                    rem = (rem << 1) | b;
                }
                uint32_t m = (1u << q) | rem;
                c = sign ? -(int32_t)m : (int32_t)m;
            }
            model.update(f, tok);
            int32_t ac = std::abs(c);
            sig[oi][ci] = (ac != 0) ? 1 : 0;
            mag[oi][ci] = ac;
            out[oi].coeffs[ci] = c;
        }
    }
    return out;
}

void Route5Coder::collect_samples(const std::vector<Subband>& subs,
                                    const std::vector<std::vector<int32_t>>& residuals,
                                    std::vector<Sample>& out) {
    int ml = 0;
    auto order = coding_order(subs, ml);
    auto parent = build_parent_map(subs, ml);
    size_t NS = subs.size();
    std::vector<std::vector<uint8_t>> sig(NS);
    std::vector<std::vector<int32_t>> mag(NS);
    for (size_t oi = 0; oi < NS; ++oi) {
        size_t n = subs[oi].coeffs.size();
        sig[oi].assign(n, 0); mag[oi].assign(n, 0);
    }
    for (size_t si = 0; si < order.size(); ++si) {
        size_t oi = order[si];
        const Subband& s = subs[oi];
        int w = s.w, h = s.h;
        size_t n = (size_t)w * h;
        int pidx = parent[oi];
        int pw = (pidx >= 0) ? subs[pidx].w : 0;
        int ph = (pidx >= 0) ? subs[pidx].h : 0;
        for (size_t ci = 0; ci < n; ++ci) {
            int x = (int)(ci % w), yy = (int)(ci / w);
            bool parent_sig = false;
            if (pidx >= 0) {
                int pcx = x >> 1, pcy = yy >> 1;
                if (pcx < pw && pcy < ph)
                    parent_sig = mag[pidx][(size_t)pcy * pw + pcx] != 0;
            }
            int fc = 0, dg = 0;
            neighbor_counts(sig[oi], w, h, x, yy, fc, dg);
            int nm = 0;
            auto nm_at = [&](int nx, int ny) {
                if (nx >= 0 && nx < w && ny >= 0 && ny < h && sig[oi][(size_t)ny * w + nx])
                    nm = std::max(nm, (int)mag[oi][(size_t)ny * w + nx]);
            };
            nm_at(x - 1, yy); nm_at(x + 1, yy); nm_at(x, yy - 1); nm_at(x, yy + 1);
            nm_at(x - 1, yy - 1); nm_at(x + 1, yy - 1); nm_at(x - 1, yy + 1); nm_at(x + 1, yy + 1);
            int pm = 0;
            if (pidx >= 0) {
                int pcx = x >> 1, pcy = yy >> 1;
                if (pcx < pw && pcy < ph) pm = (int)mag[pidx][(size_t)pcy * pw + pcx];
            }
            R5Feat f;
            f.orient = (uint8_t)s.orient; f.level = (uint8_t)s.level;
            f.parent_sig = parent_sig ? 1 : 0;
            f.fc = (uint8_t)std::min(4, fc); f.dg = (uint8_t)std::min(4, dg);
            f.nbsig = (uint8_t)(fc + dg);
            f.nmag = (uint8_t)mag_bucket(nm); f.pmag = (uint8_t)mag_bucket(pm);
            f.ownmag = 0; f.ppos = 0; f.lc_mag = 0; f.lc_sig = 0;
            int32_t c = residuals[oi][ci];
            out.push_back({f, coeff_token(c)});
            int32_t ac = std::abs(c);
            sig[oi][ci] = (ac != 0) ? 1 : 0;
            mag[oi][ci] = ac;
        }
    }
}

} // namespace prism::codec
