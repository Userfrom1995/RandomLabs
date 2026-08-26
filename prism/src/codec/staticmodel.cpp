// V0 sandbox clustered-static machinery (spec addendum 18.2 verbatim;
// structural pins D1-D13 from .github/agents/decisions/builder/
// 2026-08-25T16-20-00, as amended there BEFORE any measurement). FORMAT-
// UNWIRED: nothing here touches any container or production path. The
// interleaved-static rANS engine is a local port of the public-domain ryg
// rans_byte.h primitives already vendored in src/codec/rans.cpp (same
// constants, NS independent states); the delta stream compressor reuses
// rans_encode_bits/rans_decode_bits from rans.h; B-BAC reuses the
// production AEncoder/ADCoder with externally managed static probabilities.

#include "prism/codec/staticmodel.h"
#include "prism/codec/rans.h"
#include "prism/codec/acoder.h"
#include "prism/codec/predict.h"
#include "prism/crc32.h"
#include <algorithm>
#include <array>
#include <cmath>
#include <functional>
#include <stdexcept>
#include <cstring>
#include <cstdio>
#include <limits>
#include <unordered_map>

namespace prism::codec::sandbox {

// ----- Keying providers -----

int keying_cluster_count(KeyingId k) {
    switch (k) {
        case KeyingId::KSHARED: return 1;
        case KeyingId::KFLAT16: return 16;
        case KeyingId::KFLAT343: return 343;
        case KeyingId::KGRID128:
        case KeyingId::KTREE:
        case KeyingId::KGROUP64:
        case KeyingId::KGROUP128:
            // Image-derived counts: construct through the explicit-cluster
            // SandboxModel::init overload and a grid/tree/group ClusterMap.
            throw std::runtime_error(
                "keying_cluster_count: " + std::string(keying_name(k)) +
                " count derives from the image (use explicit-count init)");
    }
    throw std::runtime_error("keying_cluster_count: unknown keying");
}

bool keying_is_group(KeyingId k) {
    return k == KeyingId::KGROUP64 || k == KeyingId::KGROUP128;
}

uint32_t keying_group_px(KeyingId k) {
    if (k == KeyingId::KGROUP64) return GROUP_PX64;
    if (k == KeyingId::KGROUP128) return GROUP_PX128;
    throw std::runtime_error("keying_group_px: not a group keying");
}

uint32_t keying_cluster(KeyingId k, int cx) {
    switch (k) {
        case KeyingId::KSHARED: return 0;
        case KeyingId::KFLAT16:
            return ac_v2_prior_class(cx % AC_V2_RESDIFF_CONTEXTS);
        case KeyingId::KFLAT343:
            return (uint32_t)(cx % AC_V2_RESDIFF_CONTEXTS);
        case KeyingId::KGRID128:
        case KeyingId::KTREE:
        case KeyingId::KGROUP64:
        case KeyingId::KGROUP128:
            // Position/context-dependent ids resolve through ClusterMap.
            throw std::runtime_error(
                "keying_cluster: " + std::string(keying_name(k)) +
                " needs a ClusterMap");
    }
    throw std::runtime_error("keying_cluster: unknown keying");
}

bool parse_keying(const std::string& s, KeyingId& out) {
    if (s == "KSHARED") { out = KeyingId::KSHARED; return true; }
    if (s == "KFLAT16") { out = KeyingId::KFLAT16; return true; }
    if (s == "KFLAT343") { out = KeyingId::KFLAT343; return true; }
    if (s == "KGRID128") { out = KeyingId::KGRID128; return true; }
    if (s == "KTREE") { out = KeyingId::KTREE; return true; }
    if (s == "KGROUP64") { out = KeyingId::KGROUP64; return true; }
    if (s == "KGROUP128") { out = KeyingId::KGROUP128; return true; }
    return false;
}

const char* keying_name(KeyingId k) {
    switch (k) {
        case KeyingId::KSHARED: return "KSHARED";
        case KeyingId::KFLAT16: return "KFLAT16";
        case KeyingId::KFLAT343: return "KFLAT343";
        case KeyingId::KGRID128: return "KGRID128";
        case KeyingId::KTREE: return "KTREE";
        case KeyingId::KPROP: return "KPROP";
        case KeyingId::KGROUP64: return "KGROUP64";
        case KeyingId::KGROUP128: return "KGROUP128";
    }
    return "?";
}

// ----- Model shape -----

namespace {

constexpr int NK = 7;

// Local port of the vendored ryg rans_byte.h constants (src/codec/rans.cpp).
constexpr uint32_t RB_L = 1u << 23;            // renormalization lower bound
constexpr uint32_t RB_M = 1u << 16;            // frequency denominator

bool kind_used(TokProfile p, EvKind k) {
    switch (k) {
        case EvKind::ZERO_FLAG:
        case EvKind::QPOS:
        case EvKind::REM:
            return p == TokProfile::ZFFCTRL;
        case EvKind::ESCQ:
        case EvKind::TOKEN:
            return p != TokProfile::ZFFCTRL;
        case EvKind::SIGN:
            return true;
        case EvKind::RAWBITS:
            return false;                    // uncoded literal bits (pin D3)
    }
    return false;
}

size_t table_span(TokProfile p, int kind) {
    switch ((EvKind)kind) {
        case EvKind::ZERO_FLAG:
            return kind_used(p, EvKind::ZERO_FLAG) ? 1u : 0u;
        case EvKind::SIGN:
            return 1u;
        case EvKind::QPOS:
            return kind_used(p, EvKind::QPOS) ? (size_t)Q_POS_MAX : 0u;
        case EvKind::REM:
            return kind_used(p, EvKind::REM)
                ? (size_t)REM_L_MAX * (REM_L_MAX + 1) / 2 + REM_OVERFLOW_BINS
                : 0u;
        case EvKind::TOKEN:
            return kind_used(p, EvKind::TOKEN) ? (size_t)hyb_t_esc(p) + 1u
                                               : 0u;
        case EvKind::ESCQ:
            return kind_used(p, EvKind::ESCQ)
                ? (size_t)hyb_esc_contexts(p) * Q_POS_MAX : 0u;
        default:
            return 0u;                       // RAWBITS carries no entries
    }
}

} // namespace

size_t SandboxModel::init_stride(TokProfile p) {
    size_t t = 0;
    for (int k = 0; k < NK; ++k) t += table_span(p, k);
    return t;
}

void SandboxModel::init(TokProfile p, KeyingId kk) {
    profile = p;
    keying = kk;
    clusters = keying_cluster_count(kk);
    size_t per = init_stride(p);
    n0.assign((size_t)clusters * per, 0);
    n1.assign((size_t)clusters * per, 0);
    tok.assign((size_t)clusters * ((size_t)hyb_t_esc(p) + 1), 0);
    samples_per_cluster.assign((size_t)clusters, 0);
    raw_bits = 0;
}

void SandboxModel::init(TokProfile p, int nclusters) {
    // 16384 joint cells bound the GS64 quad worst case (pin P-T0-13:
    // kodim13-class geometry needs 288 groups x 16 classes = 4608 rows).
    if (nclusters <= 0 || nclusters > 16384)
        throw std::runtime_error("SandboxModel::init: bad cluster count");
    profile = p;
    keying = KeyingId::KSHARED;      // nominal only; ids come from the map
    clusters = nclusters;
    size_t per = init_stride(p);
    n0.assign((size_t)clusters * per, 0);
    n1.assign((size_t)clusters * per, 0);
    tok.assign((size_t)clusters * ((size_t)hyb_t_esc(p) + 1), 0);
    samples_per_cluster.assign((size_t)clusters, 0);
    raw_bits = 0;
}

// ----- Cluster resolution -----

uint32_t ClusterMap::raw_at(size_t idx,
                            const std::vector<int32_t>& hist) const {
    uint32_t x = (w == 0) ? 0 : (uint32_t)(idx % w);
    uint32_t y = (w == 0) ? 0 : (uint32_t)(idx / w);
    int32_t dL = 0, dU = 0, dUL = 0;
    if (x > 0) dL = hist[idx - 1];
    if (y > 0) dU = hist[idx - w];
    if (x > 0 && y > 0) dUL = hist[idx - w - 1];
    int cx = residual_diff_context(dL, dU, dUL);
    switch (keying) {
        case KeyingId::KSHARED:
        case KeyingId::KFLAT16:
        case KeyingId::KFLAT343:
            return keying_cluster(keying, cx);
        case KeyingId::KGRID128: {
            uint32_t tiles_x = (w + GRID_TILE - 1) / GRID_TILE;
            return (y / GRID_TILE) * tiles_x + (x / GRID_TILE);
        }
        case KeyingId::KGROUP64:
        case KeyingId::KGROUP128: {
            // Joint (group tile, class16) id: g * 16 + class (pin P-T0-1).
            const uint32_t gs = keying_group_px(keying);
            const uint32_t tiles_x = (w + gs - 1) / gs;
            const uint32_t g = (y / gs) * tiles_x + (x / gs);
            return g * 16u + ac_v2_prior_class(cx % AC_V2_RESDIFF_CONTEXTS);
        }
        case KeyingId::KTREE:
            if (!ctx_leaf || ctx_leaf->size() < (size_t)cx + 1)
                throw std::runtime_error("ClusterMap: missing tree map");
            return (*ctx_leaf)[(size_t)cx];
        case KeyingId::KPROP:
            if (!hasher)
                throw std::runtime_error("ClusterMap: missing prop hasher");
            return hasher->at(idx, hist);
    }
    throw std::runtime_error("ClusterMap: unknown keying");
}

uint32_t ClusterMap::at(size_t idx, const std::vector<int32_t>& hist) const {
    if (kind == Kind::EXPLICIT) {
        if (!explicit_map)
            throw std::runtime_error("ClusterMap: missing explicit map");
        return explicit_map[idx];
    }
    uint32_t raw = raw_at(idx, hist);
    if (merge && !merge->empty()) {
        if (merge->size() <= raw)
            throw std::runtime_error("ClusterMap: merge map too short");
        return (*merge)[raw];
    }
    return raw;
}

ClusterMap cluster_map_keyed(KeyingId k) {
    ClusterMap cm;
    cm.kind = ClusterMap::Kind::KEYED;
    cm.keying = k;
    return cm;
}

ClusterMap cluster_map_grid(uint32_t w) {
    ClusterMap cm = cluster_map_keyed(KeyingId::KGRID128);
    cm.w = w;
    return cm;
}

ClusterMap cluster_map_tree(const std::vector<uint32_t>& ctx_leaf,
                            const std::vector<uint32_t>& merge) {
    ClusterMap cm = cluster_map_keyed(KeyingId::KTREE);
    cm.ctx_leaf = &ctx_leaf;
    cm.merge = &merge;
    return cm;
}

ClusterMap cluster_map_prop(PropHasher* hasher, uint32_t w,
                            const std::vector<uint32_t>& merge) {
    ClusterMap cm = cluster_map_keyed(KeyingId::KPROP);
    cm.hasher = hasher;
    cm.w = w;
    cm.merge = &merge;
    return cm;
}

ClusterMap cluster_map_explicit(const uint32_t* per_sample) {
    ClusterMap cm;
    cm.kind = ClusterMap::Kind::EXPLICIT;
    cm.explicit_map = per_sample;
    return cm;
}

// ----- S3 extended causal properties (pins P-S3-1..P-S3-12) -----

namespace {

// e_max_prev bucket per 18.4 verbatim edge table (pin P-S3-5).
uint32_t emax_bucket(int32_t a) {
    uint32_t m = (uint32_t)std::abs((long long)a);
    if (m <= 3) return m;                 // [0],[1],[2],[3]
    if (m <= 5) return 4;                 // [4-5]
    if (m <= 7) return 5;                 // [6-7]
    if (m <= 11) return 6;                // [8-11]
    if (m <= 15) return 7;                // [12-15]
    if (m <= 23) return 8;                // [16-23]
    if (m <= 31) return 9;                // [24-31]
    if (m <= 63) return 10;               // [32-63]
    return 11;                            // [64+]
}

} // namespace

PropHasher::PropHasher(uint32_t w, uint32_t h, uint32_t plane_id,
                       const PropSpec& spec, int k_raw, int bd_shift)
    : w_(w), h_(h), plane_id_(plane_id), spec_(spec), k_raw_(k_raw),
      bd_shift_(bd_shift) {
    if (!spec_.any())
        throw std::runtime_error("PropHasher: empty property set");
    if (k_raw_ <= 0)
        throw std::runtime_error("PropHasher: bad cluster count");
    for (int c = 0; c < 4; ++c) {
        for (int v = 0; v < 7; ++v) counts_[c][v] = 0;
        totals_[c] = 0;
    }
}

uint32_t PropHasher::octile_bucket(int which, int32_t v) {
    // Edge k = smallest value whose cumulative count reaches k/8 of the
    // total-so-far, evaluated exactly as cum * 8 >= total * k, deduped
    // ascending (pin P-S3-6). Bucket of v = #{deduped edges <= v}.
    const uint64_t total = totals_[which];
    if (total == 0) return 0;
    uint32_t bucket = 0;
    int prev_edge = -1;
    uint64_t cum = 0;
    size_t vi = 0;
    for (int k = 1; k <= 7; ++k) {
        while (vi < 7 && cum * 8 < total * (uint64_t)k)
            cum += counts_[which][vi++];
        const int edge = vi - 1;
        if (edge == prev_edge) continue;   // duplicate octile value
        prev_edge = edge;
        if (edge <= v) ++bucket;
        else break;                        // later edges are larger
    }
    return bucket;
}

uint32_t PropHasher::at(size_t idx, const std::vector<int32_t>& hist) {
    const uint32_t x = (w_ == 0) ? 0u : (uint32_t)(idx % w_);
    const uint32_t y = (w_ == 0) ? 0u : (uint32_t)(idx / w_);
    auto at_or_zero = [&](int dx, int dy) -> int32_t {
        // Quotient coordinates use the production context border rule:
        // missing primaries read 0 (pin P-S3-2). Off-plane reads 0.
        long long cx = (long long)x + dx;
        long long cy = (long long)y + dy;
        if (cx < 0 || cy < 0 || cx >= w_ || cy >= h_) return 0;
        return hist[(size_t)(cy * w_ + cx)];
    };
    const int32_t rW = at_or_zero(-1, 0), rN = at_or_zero(0, -1);
    const int32_t rNW = at_or_zero(-1, -1), rNE = at_or_zero(1, -1);

    // CALIC gradient pair on the residual stream under amendment A4 with
    // the P-S1-2 replicated-edge derivation (pin P-S3-3): WW replicates W
    // when x <= 1, NN replicates N when y <= 1.
    const int32_t rWW = (x > 1) ? at_or_zero(-2, 0) : rW;
    const int32_t rNN = (y > 1) ? at_or_zero(0, -2) : rN;
    const int64_t dh = std::abs((long long)rW - rWW) +
                       std::abs((long long)rN - rNW) +
                       std::abs((long long)rNE - rN);
    const int64_t dv = std::abs((long long)rNW - rW) +
                       std::abs((long long)rN - rNN) +
                       std::abs((long long)rN - rNE);

    const int q[4] = {quant_residual(rW), quant_residual(rN),
                      quant_residual(rNW), quant_residual(rNE)};
    const bool is_q[4] = {spec_.qW, spec_.qN, spec_.qNW, spec_.qNE};

    uint32_t h = 2166136261u;   // FNV-1a word variant (pin P-S3-7)
    auto mix = [&](uint32_t v) { h = (h ^ v) * 16777619u; };
    for (int c = 0; c < 4; ++c) {
        if (!is_q[c]) continue;
        mix(octile_bucket(c, q[c]));
    }
    if (spec_.gbW) mix(bias_bucket(dh, bd_shift_));
    if (spec_.gbN) mix(bias_bucket(dv, bd_shift_));
    if (spec_.plane) mix(plane_id_);
    if (spec_.emax) mix(emax_bucket(x > 0 ? hist[idx - 1] : 0));

    // Update causal histograms AFTER hashing (strictly past samples only).
    for (int c = 0; c < 4; ++c) {
        if (!is_q[c]) continue;
        ++counts_[c][q[c]];
        ++totals_[c];
    }
    return h % (uint32_t)k_raw_;
}

size_t SandboxModel::span(int kind) const { return table_span(profile, kind); }

size_t SandboxModel::stride() const { return init_stride(profile); }

void count_plane(SandboxModel& m, TokProfile p, const ClusterMap& cm,
                 const std::vector<int32_t>& res,
                 std::vector<TaggedEvent>* events_out) {
    const size_t stride = SandboxModel::init_stride(p);
    std::vector<TokEvent> evs;
    for (size_t i = 0; i < res.size(); ++i) {
        uint32_t cl = cm.at(i, res);
        evs.clear();
        tokenize_sample(p, res[i], evs);
        m.samples_per_cluster[cl]++;
        for (const TokEvent& e : evs) {
            if (events_out) events_out->push_back({cl, e});
            switch (e.kind) {
            case EvKind::RAWBITS:
                m.raw_bits += e.key;
                break;
            case EvKind::TOKEN:
                m.tok[(size_t)cl * m.tok_syms() + e.value]++;
                break;
            default: {
                size_t off = 0;
                for (int kk = 0; kk < (int)e.kind; ++kk)
                    off += table_span(p, kk);
                size_t idx = (size_t)cl * stride + off + e.key;
                if (e.value) m.n1[idx]++;
                else m.n0[idx]++;
                break;
            }
            }
        }
    }
}

void count_plane(SandboxModel& m, TokProfile p, KeyingId k,
                 const std::vector<int32_t>& res, uint32_t w,
                 std::vector<TaggedEvent>* events_out) {
    ClusterMap cm = (k == KeyingId::KGRID128) ? cluster_map_grid(w)
                                              : cluster_map_keyed(k);
    cm.w = w;    // context computation needs the position even for flats
    count_plane(m, p, cm, res, events_out);
}

// ----- Cluster budget (pins D4/D9) -----

namespace {

void merge_cluster(SandboxModel& m, uint32_t dst, uint32_t src) {
    size_t per = SandboxModel::init_stride(m.profile);
    for (size_t i = 0; i < per; ++i) {
        m.n0[dst * per + i] += m.n0[src * per + i];
        m.n1[dst * per + i] += m.n1[src * per + i];
        m.n0[src * per + i] = 0;
        m.n1[src * per + i] = 0;
    }
    for (size_t i = 0; i < m.tok_syms(); ++i) {
        m.tok[dst * m.tok_syms() + i] += m.tok[src * m.tok_syms() + i];
        m.tok[src * m.tok_syms() + i] = 0;
    }
    m.samples_per_cluster[dst] += m.samples_per_cluster[src];
    m.samples_per_cluster[src] = 0;
}

} // namespace

std::vector<uint32_t> apply_cluster_budget(SandboxModel& m, bool enforce) {
    std::vector<uint32_t> final_of_raw((size_t)m.clusters);
    for (int c = 0; c < m.clusters; ++c) final_of_raw[(size_t)c] = (uint32_t)c;
    if (!enforce || m.clusters <= 1) return final_of_raw;
    // Floor (addendum 18.2): lowest-id NONEMPTY cluster under the floor
    // merges into its NEAREST NONEMPTY sibling (ties: lower id), looping
    // until legal. Every merge strictly shrinks the active set, so the
    // loop terminates; empty slots are not clusters.
    auto absorb = [&](uint32_t dst, uint32_t victim) {
        merge_cluster(m, dst, victim);
        for (auto& f : final_of_raw)
            if (f == victim) f = dst;
    };
    for (;;) {
        int victim = -1;
        for (int c = 1; c < m.clusters; ++c)
            if (m.samples_per_cluster[c] > 0 &&
                m.samples_per_cluster[c] < (uint64_t)MIN_SAMPLES_PER_CLUSTER) {
                victim = c;
                break;
            }
        if (victim < 0) break;
        int dst = -1;
        for (int d = 1; d < m.clusters && dst < 0; ++d) {
            if (victim - d >= 0 && m.samples_per_cluster[victim - d] > 0) {
                dst = victim - d;               // lower id wins the tie
                break;
            }
            if (victim + d < m.clusters &&
                m.samples_per_cluster[victim + d] > 0)
                dst = victim + d;
        }
        if (dst < 0) break;                     // single active cluster left
        absorb((uint32_t)dst, (uint32_t)victim);
    }
    // Cap (pin D9): adjacent active pair with the smallest combined sample
    // count merges repeatedly, keeping the lower id, until at most K_MAX.
    auto active_count = [&] {
        int n = 0;
        for (int c = 0; c < m.clusters; ++c)
            if (m.samples_per_cluster[c] > 0) ++n;
        return n;
    };
    while (active_count() > K_MAX) {
        int best = -1;
        uint64_t best_sum = ~0ull;
        for (int c = 0; c + 1 < m.clusters; ++c) {
            if (m.samples_per_cluster[c] == 0 ||
                m.samples_per_cluster[c + 1] == 0) continue;
            uint64_t s = m.samples_per_cluster[c] +
                         m.samples_per_cluster[c + 1];
            if (s < best_sum) { best_sum = s; best = c; }
        }
        if (best < 0) break;
        absorb((uint32_t)best, (uint32_t)(best + 1));
    }
    return final_of_raw;
}

void enforce_cluster_budget(SandboxModel& m, bool enforce) {
    apply_cluster_budget(m, enforce);
}

// ----- Smoothing + normalization -----

namespace {
constexpr uint64_t kPseudo = 32;
} // namespace

// Integer pseudo counts summing EXACTLY to PSEUDO=32 over n keys under
// uniform weights (largest-remainder assignment, ascending id tie order).
std::vector<uint64_t> smoothing_pseudo_uniform(uint64_t n) {
    std::vector<uint64_t> v(n, 0);
    if (n == 0) return v;
    uint64_t base = kPseudo / n, rem = kPseudo % n;
    for (uint64_t k = 0; k < n; ++k) v[(size_t)k] = base + (k < rem ? 1u : 0u);
    return v;
}

// Geometric prior ratio r = 15/16 falling away from zero over quotient
// positions: w_j proportional to (15/16)^j realized on an integer ladder
// (exact arithmetic; deterministic largest-remainder assignment).
std::vector<uint64_t> smoothing_pseudo_geometric(size_t n) {
    std::vector<uint64_t> w(n, 0);
    __uint128_t W = 0;
    uint64_t cur = 1ull << 40;
    for (size_t j = 0; j < n; ++j) {
        w[j] = cur;
        W += cur;
        cur = cur * 15 / 16;                 // integer monotone decay
    }
    std::vector<uint64_t> v(n, 0), frac(n, 0);
    uint64_t used = 0;
    for (size_t j = 0; j < n; ++j) {
        __uint128_t num = (__uint128_t)kPseudo * w[j];
        v[j] = (uint64_t)(num / W);
        frac[j] = (uint64_t)(num % W);
        used += v[j];
    }
    uint64_t leftover = kPseudo - used;
    std::vector<size_t> order(n);
    for (size_t j = 0; j < n; ++j) order[j] = j;
    std::sort(order.begin(), order.end(), [&](size_t a, size_t b) {
        if (frac[a] != frac[b]) return frac[a] > frac[b];
        return a < b;                        // ascending id tie order
    });
    for (uint64_t i = 0; i < leftover && i < (uint64_t)n; ++i)
        v[order[(size_t)i]]++;
    return v;
}

// Normalize integer counts to EXACTLY 4096 twelve-bit frequencies: every
// key keeps support >= 1 (both coders stay legal), the remaining budget is
// distributed by floor division plus largest-remainder with ascending-id
// ties (addendum 18.2 normalization line; support-floor reading pinned as
// D11 in the decision record, before any measurement).
void normalize_counts_4096(const std::vector<uint64_t>& cp,
                           std::vector<uint16_t>& out) {
    const uint64_t N = 4096;
    const size_t n = cp.size();
    out.assign(n, 1);
    if (n == 0) return;
    const uint64_t budget = N - (uint64_t)n;
    __uint128_t sum = 0;
    for (uint64_t c : cp) sum += c;
    std::vector<uint64_t> frac(n, 0);
    if (sum == 0) {
        uint64_t base = budget / n, rem = budget % n;
        for (size_t k = 0; k < n; ++k)
            out[k] = (uint16_t)(1 + base + (k < rem ? 1 : 0));
        return;
    }
    uint64_t used = 0;
    for (size_t k = 0; k < n; ++k) {
        __uint128_t num = (__uint128_t)cp[k] * budget;
        uint64_t q = (uint64_t)(num / sum);
        frac[k] = (uint64_t)(num % sum);
        out[k] += (uint16_t)q;
        used += q;
    }
    uint64_t leftover = budget - used;
    std::vector<size_t> order(n);
    for (size_t k = 0; k < n; ++k) order[k] = k;
    std::sort(order.begin(), order.end(), [&](size_t a, size_t b) {
        if (frac[a] != frac[b]) return frac[a] > frac[b];
        return a < b;
    });
    for (uint64_t i = 0; i < leftover && i < (uint64_t)n; ++i)
        out[order[(size_t)i]]++;
}

void smoothing_normalize_to_4096(const std::vector<uint64_t>& cp,
                                 std::vector<uint16_t>& out) {
    normalize_counts_4096(cp, out);
}

namespace {

// One binary bin's 12-bit P(bit==0): smoothed count ratio rounded to
// nearest integer, clamped into [1, 4095] so both outcomes stay codable.
// Pin D15 (decision record, BEFORE any measurement): every binary key is an
// independent bin; its pseudo count joins that bin's total support; the
// 2^12 normalization applies WITHIN each bin over its two outcomes. TOKEN
// alphabets are the one multi-outcome unit and normalize jointly.
uint16_t norm_bin_p0(uint64_t c0, uint64_t c1, uint64_t ps) {
    __uint128_t num = (__uint128_t)(c0 + ps) * 4096u;
    __uint128_t den = (__uint128_t)c0 + (__uint128_t)c1 + (__uint128_t)ps;
    if (den == 0) return 2048;
    uint64_t q = (uint64_t)(num / den);
    uint64_t r = (uint64_t)(num % den);
    int pv = (int)q + ((2 * r >= den) ? 1 : 0);
    if (pv < 1) pv = 1;
    if (pv > 4095) pv = 4095;
    return (uint16_t)pv;
}

void smooth_binary_group(const SandboxModel& m, uint32_t cl, int kind,
                         std::vector<uint16_t>& out) {
    EvKind k = (EvKind)kind;
    size_t span = table_span(m.profile, kind);
    out.assign(span, 2048);
    if (span == 0) return;
    std::vector<uint64_t> ps =
        (k == EvKind::QPOS || k == EvKind::ESCQ)
            ? smoothing_pseudo_geometric(span)
            : smoothing_pseudo_uniform(span);
    size_t stride = SandboxModel::init_stride(m.profile);
    size_t off = 0;
    for (int kk = 0; kk < kind; ++kk) off += table_span(m.profile, kk);
    for (size_t key = 0; key < span; ++key) {
        size_t idx = (size_t)cl * stride + off + key;
        out[key] = norm_bin_p0(m.n0[idx], m.n1[idx], ps[key]);
    }
}

void smooth_token_group(const SandboxModel& m, uint32_t cl,
                        std::vector<uint64_t>& cp) {
    size_t span = m.tok_syms();
    // Even pseudo over the whole TOKEN alphabet (pin D7).
    std::vector<uint64_t> ps = smoothing_pseudo_uniform(span);
    cp.assign(span, 0);
    for (size_t s = 0; s < span; ++s)
        cp[s] = m.tok[(size_t)cl * span + s] + ps[s];
}

} // namespace


void build_tables(const SandboxModel& mm, bool apply_caps_floors,
                  SmoothedTables& out) {
    SandboxModel m = mm;                       // working copy for merging
    apply_cluster_budget(m, apply_caps_floors);
    build_tables_enforced(m, out);
}

void build_tables_enforced(const SandboxModel& m, SmoothedTables& out) {
    out.profile = m.profile;
    out.clusters = m.clusters;
    const size_t stride = SandboxModel::init_stride(m.profile);

    // Image-level prior: counts pooled across all (merged) clusters.
    SandboxModel pooled;
    pooled.profile = m.profile;
    pooled.keying = m.keying;
    pooled.clusters = 1;
    pooled.n0.assign(stride, 0);
    pooled.n1.assign(stride, 0);
    pooled.tok.assign(m.tok_syms(), 0);
    pooled.samples_per_cluster.assign(1, 0);
    for (int c = 0; c < m.clusters; ++c) {
        for (size_t i = 0; i < stride; ++i) {
            pooled.n0[i] += m.n0[(size_t)c * stride + i];
            pooled.n1[i] += m.n1[(size_t)c * stride + i];
        }
        for (size_t s = 0; s < m.tok_syms(); ++s)
            pooled.tok[s] += m.tok[(size_t)c * m.tok_syms() + s];
    }

    out.p.assign((size_t)m.clusters * stride, 0);
    out.prior.assign(stride, 0);
    std::vector<uint64_t> cp;
    std::vector<uint16_t> norm;
    for (int k = 0; k < NK; ++k) {
        size_t span = table_span(m.profile, k);
        if (span == 0 || (EvKind)k == EvKind::TOKEN) continue;
        size_t off = 0;
        for (int kk = 0; kk < k; ++kk) off += table_span(m.profile, kk);
        smooth_binary_group(pooled, 0, k, norm);
        for (size_t key = 0; key < span; ++key)
            out.prior[off + key] = norm[key];
        for (int c = 0; c < m.clusters; ++c) {
            smooth_binary_group(m, (uint32_t)c, k, norm);
            for (size_t key = 0; key < span; ++key)
                out.p[(size_t)c * stride + off + key] = norm[key];
        }
    }
    {   // TOKEN symbol tables (even pseudo over the alphabet, pin D7).
        // Skipped entirely when the profile has no TOKEN table span
        // (ZFFCTRL): writing there would fall past the row and corrupt the
        // next cluster's leading bins (found by the V0 fidelity discipline
        // BEFORE any measurement; regression-tested in test_staticmodel.cpp).
        const size_t tspan = table_span(m.profile, (int)EvKind::TOKEN);
        if (tspan > 0) {
            size_t span = m.tok_syms();
            size_t off = 0;
            for (int kk = 0; kk < (int)EvKind::TOKEN; ++kk)
                off += table_span(m.profile, kk);
            smooth_token_group(pooled, 0, cp);
            normalize_counts_4096(cp, norm);
            for (size_t s = 0; s < span; ++s) out.prior[off + s] = norm[s];
            for (int c = 0; c < m.clusters; ++c) {
                smooth_token_group(m, (uint32_t)c, cp);
                normalize_counts_4096(cp, norm);
                for (size_t s = 0; s < span; ++s)
                    out.p[(size_t)c * stride + off + s] = norm[s];
            }
        }
    }
    out.delta.resize(out.p.size());
    const size_t pstride = out.prior.size();
    for (size_t i = 0; i < out.p.size(); ++i)
        out.delta[i] = (uint16_t)(int16_t)(
            (int)out.p[i] - (int)out.prior[i % pstride]);
}

size_t SmoothedTables::span(int kind) const {
    return table_span(profile, kind);
}
size_t SmoothedTables::stride() const { return SandboxModel::init_stride(profile); }

uint16_t SmoothedTables::at(uint32_t cl, int kind, uint32_t key) const {
    size_t off = 0;
    for (int kk = 0; kk < kind; ++kk) off += span(kk);
    return p[(size_t)cl * stride() + off + key];
}

// ----- Little-endian byte helpers -----

namespace {

void put_u32(std::vector<uint8_t>& b, uint32_t v) {
    b.push_back((uint8_t)v);
    b.push_back((uint8_t)(v >> 8));
    b.push_back((uint8_t)(v >> 16));
    b.push_back((uint8_t)(v >> 24));
}
uint32_t get_u32(const std::vector<uint8_t>& b, size_t& pos) {
    if (pos + 4 > b.size()) throw std::runtime_error("staticmodel: truncated");
    uint32_t v = (uint32_t)b[pos] | ((uint32_t)b[pos + 1] << 8) |
                 ((uint32_t)b[pos + 2] << 16) | ((uint32_t)b[pos + 3] << 24);
    pos += 4;
    return v;
}
void put_u16(std::vector<uint8_t>& b, uint16_t v) {
    b.push_back((uint8_t)v);
    b.push_back((uint8_t)(v >> 8));
}
uint16_t get_u16(const std::vector<uint8_t>& b, size_t& pos) {
    if (pos + 2 > b.size()) throw std::runtime_error("staticmodel: truncated");
    uint16_t v = (uint16_t)(b[pos] | ((uint16_t)b[pos + 1] << 8));
    pos += 2;
    return v;
}

// Plane-rANS delta compressor (pin D6): ONE application over the delta
// bytes, 8 MSB-first bit planes, static per-plane models built two-pass
// from the delta bytes themselves.
std::vector<uint8_t> plane_rans_compress(const std::vector<uint8_t>& raw) {
    std::vector<uint8_t> out;
    put_u32(out, (uint32_t)raw.size());
    for (int b = 0; b < 8; ++b) {
        std::vector<uint8_t> bits(raw.size());
        uint64_t ones = 0;
        for (size_t i = 0; i < raw.size(); ++i) {
            bits[i] = (raw[i] >> (7 - b)) & 1u;   // MSB-first position
            ones += bits[i];
        }
        double f = raw.empty()
            ? 0.5
            : (double)(raw.size() - ones) / (double)raw.size();  // P(bit==0)
        long pv = lround(f * 65536.0);
        pv = std::max(1L, std::min(65535L, pv));
        std::vector<uint8_t> coded = rans_encode_bits(bits, (uint16_t)pv);
        put_u16(out, (uint16_t)pv);
        put_u32(out, (uint32_t)coded.size());
        out.insert(out.end(), coded.begin(), coded.end());
    }
    return out;
}

std::vector<uint8_t> plane_rans_decompress(const std::vector<uint8_t>& blob,
                                           size_t& pos, uint32_t nbytes) {
    std::vector<uint8_t> raw(nbytes, 0);
    for (int b = 0; b < 8; ++b) {
        uint16_t prob = get_u16(blob, pos);
        uint32_t plen = get_u32(blob, pos);
        if (pos + plen > blob.size())
            throw std::runtime_error("staticmodel: truncated");
        std::vector<uint8_t> sub(blob.begin() + (long)pos,
                                 blob.begin() + (long)(pos + plen));
        pos += plen;
        std::vector<uint8_t> bits = rans_decode_bits(sub, nbytes, prob);
        for (size_t i = 0; i < nbytes; ++i)
            raw[i] |= (uint8_t)((bits[i] & 1u) << (7 - b));
    }
    return raw;
}

} // namespace

// ----- Serialization -----

std::vector<uint8_t> serialize_tables(const SmoothedTables& t,
                                      size_t* audit_counted) {
    size_t counted = 0;

    std::vector<uint8_t> prior_bytes(t.prior.size() * 2);
    for (size_t i = 0; i < t.prior.size(); ++i) {
        prior_bytes[2 * i] = (uint8_t)t.prior[i];
        prior_bytes[2 * i + 1] = (uint8_t)(t.prior[i] >> 8);
    }
    std::vector<uint8_t> delta_raw(t.delta.size() * 2);
    for (size_t i = 0; i < t.delta.size(); ++i) {
        delta_raw[2 * i] = (uint8_t)t.delta[i];
        delta_raw[2 * i + 1] = (uint8_t)(t.delta[i] >> 8);
    }
    std::vector<uint8_t> coded = plane_rans_compress(delta_raw);

    std::vector<uint8_t> blob;
    blob.push_back('S'); blob.push_back('B');
    blob.push_back('M'); blob.push_back('1');
    counted += 4;
    put_u32(blob, (uint32_t)t.profile); counted += 4;
    put_u32(blob, (uint32_t)t.clusters); counted += 4;
    put_u32(blob, (uint32_t)t.prior.size()); counted += 4;
    blob.insert(blob.end(), prior_bytes.begin(), prior_bytes.end());
    counted += prior_bytes.size();
    put_u32(blob, (uint32_t)coded.size()); counted += 4;
    blob.insert(blob.end(), coded.begin(), coded.end());
    counted += coded.size();
    uint32_t crc = prism::crc32(prior_bytes);
    crc = prism::crc32_combine(crc, delta_raw.data(), delta_raw.size());
    put_u32(blob, crc); counted += 4;

    if (audit_counted) *audit_counted = counted;
    return blob;
}

SmoothedTables deserialize_tables(const std::vector<uint8_t>& blob,
                                  const SmoothedTables* expect) {
    if (blob.size() < 20 || blob[0] != 'S' || blob[1] != 'B' ||
        blob[2] != 'M' || blob[3] != '1')
        throw std::runtime_error("staticmodel: bad magic or truncated");
    size_t pos = 4;
    SmoothedTables t;
    uint32_t prof = get_u32(blob, pos);
    if (prof > 3) throw std::runtime_error("staticmodel: bad profile");
    t.profile = (TokProfile)prof;
    t.clusters = (int)get_u32(blob, pos);
    uint32_t nprior = get_u32(blob, pos);
    if (t.clusters <= 0 || nprior != (uint32_t)t.stride())
        throw std::runtime_error("staticmodel: bad table shape");
    t.prior.resize(nprior);
    for (uint32_t i = 0; i < nprior; ++i) t.prior[i] = get_u16(blob, pos);
    uint32_t coded_len = get_u32(blob, pos);
    if (pos + (size_t)coded_len + 4 > blob.size())
        throw std::runtime_error("staticmodel: truncated");
    std::vector<uint8_t> coded(blob.begin() + (long)pos,
                               blob.begin() + (long)(pos + coded_len));
    pos += coded_len;
    uint32_t stored_crc = get_u32(blob, pos);
    if (pos != blob.size())
        throw std::runtime_error("staticmodel: trailing bytes");

    if (coded.size() < 4) throw std::runtime_error("staticmodel: truncated");
    uint32_t nbytes = (uint32_t)coded[0] | ((uint32_t)coded[1] << 8) |
                      ((uint32_t)coded[2] << 16) |
                      ((uint32_t)coded[3] << 24);
    if (nbytes % 2 != 0 ||
        nbytes / 2 != nprior * (size_t)t.clusters)
        throw std::runtime_error("staticmodel: bad delta length");
    size_t cpos = 4;                        // skip the u32 byte count prefix
    std::vector<uint8_t> delta_raw =
        plane_rans_decompress(coded, cpos, nbytes);

    std::vector<uint8_t> prior_bytes(nprior * 2);
    for (uint32_t i = 0; i < nprior; ++i) {
        prior_bytes[2 * i] = (uint8_t)t.prior[i];
        prior_bytes[2 * i + 1] = (uint8_t)(t.prior[i] >> 8);
    }
    uint32_t crc = prism::crc32(prior_bytes);
    crc = prism::crc32_combine(crc, delta_raw.data(), delta_raw.size());
    if (crc != stored_crc)
        throw std::runtime_error("staticmodel: CRC mismatch");

    t.delta.resize(delta_raw.size() / 2);
    for (size_t i = 0; i < t.delta.size(); ++i)
        t.delta[i] = (uint16_t)(delta_raw[2 * i] |
                                ((uint16_t)delta_raw[2 * i + 1] << 8));
    t.p.assign(t.delta.size(), 0);
    const size_t pstride = t.prior.size();
    for (size_t i = 0; i < t.delta.size(); ++i) {
        int v = (int)t.prior[i % pstride] + (int16_t)t.delta[i];
        // 4096 is legal for single-entry groups (certain outcome); both
        // coders clamp the scaled probability into their open interval.
        if (v < 1 || v > 4096)
            throw std::runtime_error("staticmodel: probability out of range");
        t.p[i] = (uint16_t)v;
    }
    if (expect &&
        (expect->p != t.p || expect->prior != t.prior ||
         expect->profile != t.profile || expect->clusters != t.clusters))
        throw std::runtime_error("staticmodel: deserialized table mismatch");
    return t;
}

// ----- TOKEN binary decision tree -----
//
// Heap layout: children of node n at 2n+1 (left, lower symbols) and 2n+2.
// Node masses derive deterministically from the transmitted 12-bit symbol
// table on both sides; every parent mass is exactly 4096, so a child's mass
// IS its 12-bit probability.

namespace {

struct TokenTree {
    struct Node { uint32_t lo, hi; };
    std::vector<Node> nodes;
    explicit TokenTree(uint32_t m) { build(0, 0, m ? m : 1); }
    void build(uint32_t idx, uint32_t lo, uint32_t hi) {
        if (nodes.size() <= (size_t)idx) nodes.resize((size_t)idx + 1, {0, 0});
        nodes[(size_t)idx] = {lo, hi};
        if (hi - lo <= 1) return;
        uint32_t mid = lo + (hi - lo) / 2;
        build(2 * idx + 1, lo, mid);
        build(2 * idx + 2, mid, hi);
    }
};

uint16_t token_right_mass(const SmoothedTables& t, uint32_t cl,
                          const TokenTree& tree, uint32_t node) {
    const TokenTree::Node& nd = tree.nodes[node];
    uint32_t mid = nd.lo + (nd.hi - nd.lo) / 2;
    size_t off = 0;
    for (int kk = 0; kk < (int)EvKind::TOKEN; ++kk) off += t.span(kk);
    uint64_t right = 0;
    for (uint32_t s = mid; s < nd.hi; ++s)
        right += t.p[(size_t)cl * t.stride() + off + s];
    return (uint16_t)right;
}

inline uint16_t p12_to_p16(uint16_t p12) {
    uint32_t p16 = (uint32_t)p12 << 4;
    if (p16 < 16) p16 = 16;                  // rare-outcome escape hatch
    if (p16 > 65535) p16 = 65535;            // certain-outcome escape hatch
    return (uint16_t)p16;
}

} // namespace

// ----- Pinned fixed-point cost LUT + context tree (pins V-P2/V-P4) -----
//
// cost12[p] = round(-4096 * log2(p / 4096)): the price of one observation
// of a 12-bit-probability outcome, in 1/4096-bit units. Built once from
// libm; every downstream comparison sums these integers, so tree-builder
// gains and oracle assignments stay deterministic byte-for-byte.

namespace {

struct Cost12Lut {
    int32_t v[4096];
    Cost12Lut() {
        v[0] = 0;                            // never priced (operator[] clamps)
        for (int f = 1; f < 4096; ++f)
            v[f] = (int32_t)llround(-4096.0 * std::log2((double)f / 4096.0));
    }
    int32_t operator[](uint16_t p) const {
        if (p < 1) return v[1];
        if (p > 4095) return v[4095];
        return v[p];
    }
};
const Cost12Lut kCost12;

constexpr int CTX_COUNT = AC_V2_RESDIFF_CONTEXTS;   // 343

inline int ctx_component(int cx, int prop) {
    switch (prop) {
        case 0: return cx / 49;              // qL
        case 1: return (cx / 7) % 7;         // qU
        default: return cx % 7;              // qUL
    }
}

// Ideal cost (cost12 units) of coding a context set's pooled counts under
// the pinned smoothing arithmetic - the tree-builder gain currency.
double pooled_set_cost12(TokProfile p, const SandboxModel& flat,
                         const std::vector<uint32_t>& members) {
    const size_t stride = SandboxModel::init_stride(p);
    const size_t nsyms = (size_t)hyb_t_esc(p) + 1;
    std::vector<uint64_t> c0(stride, 0), c1(stride, 0), tk(nsyms, 0);
    for (uint32_t cx : members) {
        const size_t base = (size_t)cx * stride;
        for (size_t i = 0; i < stride; ++i) {
            c0[i] += flat.n0[base + i];
            c1[i] += flat.n1[base + i];
        }
        const size_t tb = (size_t)cx * nsyms;
        for (size_t s = 0; s < nsyms; ++s) tk[s] += flat.tok[tb + s];
    }
    double bits = 0;
    for (int k = 0; k < NK; ++k) {
        size_t span = table_span(p, k);
        if (span == 0 || (EvKind)k == EvKind::TOKEN) continue;
        std::vector<uint64_t> ps =
            ((EvKind)k == EvKind::QPOS || (EvKind)k == EvKind::ESCQ)
                ? smoothing_pseudo_geometric(span)
                : smoothing_pseudo_uniform(span);
        size_t off = 0;
        for (int kk = 0; kk < k; ++kk) off += table_span(p, kk);
        for (size_t key = 0; key < span; ++key) {
            uint16_t p0 = norm_bin_p0(c0[off + key], c1[off + key], ps[key]);
            bits += (double)c0[off + key] * (double)kCost12[p0];
            bits += (double)c1[off + key] *
                    (double)kCost12[(uint16_t)(4096u - (uint32_t)p0)];
        }
    }
    if (table_span(p, (int)EvKind::TOKEN) > 0 && !tk.empty()) {
        // TOKEN alphabet priced through the SAME heap decision tree the
        // coders walk: each node codes one bin whose two outcomes carry
        // their clamped masses.
        struct Frame { uint32_t lo, hi; };
        std::vector<Frame> stack{{0, (uint32_t)tk.size()}};
        while (!stack.empty()) {
            Frame f = stack.back();
            stack.pop_back();
            if (f.hi - f.lo <= 1) continue;
            uint32_t mid = f.lo + (f.hi - f.lo) / 2;
            uint64_t lm = 0, rm = 0;
            for (uint32_t s = f.lo; s < mid; ++s) lm += tk[s];
            for (uint32_t s = mid; s < f.hi; ++s) rm += tk[s];
            uint64_t tot = lm + rm;
            if (tot == 0) continue;
            uint16_t lmass = (uint16_t)((__uint128_t)lm * 4096u / tot);
            uint16_t rmass = (uint16_t)(4096u - (uint32_t)lmass);
            bits += (double)lm * (double)kCost12[lmass];
            bits += (double)rm * (double)kCost12[rmass];
            stack.push_back({f.lo, mid});
            stack.push_back({mid, f.hi});
        }
    }
    return bits;
}

// Deterministic preorder partition replay shared by serialization and its
// inverse: walks the context space applying stored splits.
template <typename FnInternal, typename FnLeaf>
void tree_walk(const ContextTree& t, FnInternal&& internal, FnLeaf&& leaf) {
    std::vector<uint32_t> root((size_t)CTX_COUNT);
    for (int c = 0; c < CTX_COUNT; ++c) root[(size_t)c] = (uint32_t)c;
    size_t ni = 0;
    std::function<void(std::vector<uint32_t>&)> rec =
        [&](std::vector<uint32_t>& mem) {
            if (ni < t.nodes.size()) {
                const ContextTree::Node nd = t.nodes[ni++];
                internal(nd);
                std::vector<uint32_t> left, right;
                for (uint32_t cx : mem) {
                    if ((uint32_t)ctx_component((int)cx, nd.prop) <= nd.thr)
                        left.push_back(cx);
                    else
                        right.push_back(cx);
                }
                rec(left);
                rec(right);
            } else {
                leaf(mem);
            }
        };
    rec(root);
}

} // namespace

ContextTree build_context_tree(TokProfile p, const SandboxModel& flat) {
    if (flat.clusters < CTX_COUNT)
        throw std::runtime_error(
            "build_context_tree: induction model must be KFLAT343-counted");
    ContextTree out;
    out.leaf_of_context.assign((size_t)CTX_COUNT, 0);
    uint32_t next_leaf = 0;
    std::vector<ContextTree::Node> nodes;

    std::function<void(std::vector<uint32_t>&&, int)> rec =
        [&](std::vector<uint32_t>&& mem, int depth) {
            int best_prop = -1;
            uint32_t best_thr = 0;
            double best_gain = 0.0;          // strict improvement only
            if (depth < 10 && next_leaf + 1 <= (uint32_t)K_MAX) {
                const double parent = pooled_set_cost12(p, flat, mem);
                uint64_t total_samples = 0;
                for (uint32_t cx : mem)
                    total_samples += flat.samples_per_cluster[cx];
                for (int prop = 0; prop < 3; ++prop) {
                    // Weighted octile thresholds (pin V-P2): smallest value
                    // v whose cumulative sample weight reaches k/8 of the
                    // node total, deduplicated ascending.
                    std::vector<std::pair<int, uint64_t>> vals;
                    vals.reserve(mem.size());
                    for (uint32_t cx : mem)
                        vals.push_back({ctx_component((int)cx, prop),
                                        flat.samples_per_cluster[cx]});
                    std::sort(vals.begin(), vals.end(),
                              [](const auto& a, const auto& b) {
                                  return a.first < b.first;
                              });
                    uint32_t thr_seen[7];
                    int nthr = 0;
                    uint64_t cum = 0;
                    size_t idx = 0;
                    for (int kk = 1; kk <= 7; ++kk) {
                        long double target =
                            (long double)total_samples * kk / 8.0L;
                        while (idx < vals.size() &&
                               (long double)cum < target)
                            cum += vals[idx++].second;
                        if (idx == 0 || idx > vals.size()) continue;
                        int v = vals[idx - 1].first;
                        if (nthr == 0 ||
                            thr_seen[nthr - 1] != (uint32_t)v)
                            thr_seen[nthr++] = (uint32_t)v;
                    }
                    for (int ti = 0; ti < nthr; ++ti) {
                        const uint32_t thr = thr_seen[ti];
                        std::vector<uint32_t> left, right;
                        uint64_t lsamp = 0, rsamp = 0;
                        for (uint32_t cx : mem) {
                            if ((uint32_t)ctx_component((int)cx, prop) <=
                                thr) {
                                left.push_back(cx);
                                lsamp += flat.samples_per_cluster[cx];
                            } else {
                                right.push_back(cx);
                                rsamp += flat.samples_per_cluster[cx];
                            }
                        }
                        if (left.empty() || right.empty()) continue;
                        if (lsamp < (uint64_t)MIN_SAMPLES_PER_CLUSTER ||
                            rsamp < (uint64_t)MIN_SAMPLES_PER_CLUSTER)
                            continue;        // floor binds both sides
                        const double gain =
                            parent - pooled_set_cost12(p, flat, left) -
                            pooled_set_cost12(p, flat, right);
                        if (gain > best_gain) {  // first among equals wins
                            best_gain = gain;
                            best_prop = prop;
                            best_thr = thr;
                        }
                    }
                }
            }
            if (best_prop < 0) {
                for (uint32_t cx : mem) out.leaf_of_context[cx] = next_leaf;
                ++next_leaf;
                return;
            }
            std::vector<uint32_t> left, right;
            for (uint32_t cx : mem) {
                if ((uint32_t)ctx_component((int)cx, best_prop) <= best_thr)
                    left.push_back(cx);
                else
                    right.push_back(cx);
            }
            nodes.push_back({(uint8_t)best_prop, (uint8_t)best_thr});
            rec(std::move(left), depth + 1);
            rec(std::move(right), depth + 1);
        };

    std::vector<uint32_t> root((size_t)CTX_COUNT);
    for (int c = 0; c < CTX_COUNT; ++c) root[(size_t)c] = (uint32_t)c;
    rec(std::move(root), 0);
    out.nodes = std::move(nodes);
    out.leaves = next_leaf;
    return out;
}

// Tree blob 'SBT1': magic, u32 leaves, u16 record count, preorder records
// (internal: 0x80 | prop<<5 | thr; leaf: 0x00), CRC32 over everything
// before it. The decoder replays the partition over the fixed context
// space; it never needs induction data.

namespace {

constexpr char TREE_MAGIC[4] = {'S', 'B', 'T', '1'};
constexpr char MERGE_MAGIC[4] = {'S', 'B', 'P', '1'};
constexpr uint8_t TREE_INTERNAL_FLAG = 0x80;

} // namespace

std::vector<uint8_t> serialize_tree(const ContextTree& t,
                                    size_t* audit_counted) {
    std::vector<uint8_t> body;
    size_t records = 0;
    tree_walk(
        t,
        [&](const ContextTree::Node& nd) {
            body.push_back((uint8_t)(TREE_INTERNAL_FLAG |
                                     (uint8_t)(nd.prop << 5) |
                                     (uint8_t)(nd.thr & 0x1f)));
            ++records;
        },
        [&](const std::vector<uint32_t>&) {
            body.push_back(0x00);
            ++records;
        });
    std::vector<uint8_t> blob;
    blob.insert(blob.end(), TREE_MAGIC, TREE_MAGIC + 4);
    put_u32(blob, t.leaves);
    put_u16(blob, (uint16_t)records);
    blob.insert(blob.end(), body.begin(), body.end());
    put_u32(blob, prism::crc32(blob));
    if (audit_counted) *audit_counted = blob.size();
    return blob;
}

ContextTree deserialize_tree(const std::vector<uint8_t>& blob) {
    if (blob.size() < 14 || memcmp(blob.data(), TREE_MAGIC, 4) != 0)
        throw std::runtime_error("staticmodel: bad tree magic");
    size_t pos = 4;
    ContextTree t;
    t.leaves = get_u32(blob, pos);
    uint16_t records = get_u16(blob, pos);
    if (records == 0 || pos + (size_t)records + 4 > blob.size())
        throw std::runtime_error("staticmodel: truncated tree");
    const uint8_t* body = blob.data() + pos;
    const size_t body_end = pos + (size_t)records;
    size_t crc_at = body_end;
    uint32_t stored_crc = get_u32(blob, crc_at);   // advances crc_at by 4
    if (body_end + 4 != blob.size() ||
        prism::crc32(blob.data(), body_end) != stored_crc)
        throw std::runtime_error("staticmodel: tree CRC mismatch");

    uint32_t next_leaf = 0;
    std::vector<std::vector<uint32_t>> stack(1);
    auto& root = stack.back();
    root.resize((size_t)CTX_COUNT);
    for (int c = 0; c < CTX_COUNT; ++c) root[(size_t)c] = (uint32_t)c;
    t.leaf_of_context.assign((size_t)CTX_COUNT, 0);
    for (uint16_t r = 0; r < records; ++r) {
        uint8_t b = body[r];
        if (stack.empty())
            throw std::runtime_error("staticmodel: bad tree shape");
        std::vector<uint32_t> mem = std::move(stack.back());
        stack.pop_back();
        if (b & TREE_INTERNAL_FLAG) {
            ContextTree::Node nd{(uint8_t)((b >> 5) & 3),
                                 (uint8_t)(b & 0x1f)};
            if (nd.prop > 2 || nd.thr > 6)
                throw std::runtime_error("staticmodel: bad tree node");
            std::vector<uint32_t> left, right;
            for (uint32_t cx : mem) {
                if ((uint32_t)ctx_component((int)cx, nd.prop) <= nd.thr)
                    left.push_back(cx);
                else
                    right.push_back(cx);
            }
            t.nodes.push_back(nd);
            stack.push_back(std::move(right));   // LIFO: left resumes first
            stack.push_back(std::move(left));
        } else {
            for (uint32_t cx : mem) t.leaf_of_context[cx] = next_leaf;
            ++next_leaf;
        }
    }
    if (!stack.empty() || next_leaf != t.leaves || t.leaves == 0 ||
        t.leaves > (uint32_t)K_MAX + 1u)
        throw std::runtime_error("staticmodel: inconsistent tree");
    return t;
}

std::vector<uint8_t> serialize_merge_map(uint32_t raw_clusters,
                                         const std::vector<uint32_t>& merge,
                                         size_t* audit_counted) {
    if (raw_clusters == 0 || raw_clusters > 4096)
        throw std::runtime_error("staticmodel: bad raw cluster count");
    std::vector<uint8_t> body(raw_clusters, 0);
    for (uint32_t c = 0; c < raw_clusters; ++c) {
        uint32_t dst = (c < merge.size()) ? merge[c] : c;
        if (dst >= raw_clusters)
            throw std::runtime_error("staticmodel: merge id out of range");
        body[c] = (uint8_t)dst;
    }
    std::vector<uint8_t> blob;
    blob.insert(blob.end(), MERGE_MAGIC, MERGE_MAGIC + 4);
    put_u16(blob, (uint16_t)raw_clusters);
    blob.insert(blob.end(), body.begin(), body.end());
    put_u32(blob, prism::crc32(blob));
    if (audit_counted) *audit_counted = blob.size();
    return blob;
}

std::vector<uint32_t> deserialize_merge_map(const std::vector<uint8_t>& blob,
                                            uint32_t raw_clusters) {
    if (raw_clusters == 0 || raw_clusters > 4096 ||
        blob.size() != (size_t)raw_clusters + 10 ||
        memcmp(blob.data(), MERGE_MAGIC, 4) != 0)
        throw std::runtime_error("staticmodel: bad merge map");
    size_t pos = 4;
    uint16_t n = get_u16(blob, pos);
    if ((uint32_t)n != raw_clusters)
        throw std::runtime_error("staticmodel: merge map size mismatch");
    size_t crc_pos = pos + raw_clusters;
    uint32_t stored_crc = get_u32(blob, crc_pos);
    if (prism::crc32(blob.data(), blob.size() - 4) != stored_crc)
        throw std::runtime_error("staticmodel: merge map CRC mismatch");
    std::vector<uint32_t> out(raw_clusters);
    for (uint32_t c = 0; c < raw_clusters; ++c) {
        uint32_t dst = blob[pos + c];
        if (dst >= raw_clusters)
            throw std::runtime_error("staticmodel: merge id out of range");
        out[c] = dst;
    }
    return out;
}

// ----- T-series group machinery (addendum 20; pins 2026-08-26T08-05-00) -----

namespace {

constexpr char MERGE16_MAGIC[4] = {'S', 'B', 'P', '2'};
constexpr char CODEBOOK_MAGIC[4] = {'S', 'B', 'C', '1'};
constexpr char SHRUNK_MAGIC[4] = {'S', 'B', 'D', '1'};
// GROUP_CLASS_AXIS comes from the shared header (pins P-T0-1).
// Symmetric chi-square distance (pin P-T0-2): bins flatten to the
// interleaved (n0, n1) outcome counts of every (class, kind off + key)
// cell in ascending cell order; term = floor(((X'-P')^2 << 16)/(X'+P'))
// with add-one smoothing; accumulated in unsigned 128-bit and clamped for
// the int64 argmin comparison only.
int64_t stack_dist128(const uint64_t* xa, const uint64_t* xb,
                      const uint64_t* ya, const uint64_t* yb,
                      size_t ncells) {
    unsigned __int128 acc = 0;
    constexpr unsigned __int128 kSat =
        (unsigned __int128)std::numeric_limits<int64_t>::max();
    for (size_t i = 0; i < ncells; ++i) {
        const uint64_t pair[2][2] = {
            {xa[i], xb[i]}, {ya[i], yb[i]}};
        for (int o = 0; o < 2; ++o) {
            uint64_t xp = pair[0][o] + 1, yp = pair[1][o] + 1;
            uint64_t diff = (xp > yp) ? xp - yp : yp - xp;
            acc += ((unsigned __int128)(diff * diff) << 16) / (xp + yp);
            if (acc > kSat) return std::numeric_limits<int64_t>::max();
        }
    }
    return (acc > kSat) ? std::numeric_limits<int64_t>::max()
                        : (int64_t)acc;
}

} // namespace

CodebookFit lloyd_cluster(const SandboxModel& gj, int k_want) {
    // gj: joint model clusters = G * 16 rows (row id g * 16 + c), counted
    // under ZFFCTRL. K > G clamps to G (addendum 20.2).
    if (gj.clusters % GROUP_CLASS_AXIS != 0 || gj.profile != TokProfile::ZFFCTRL)
        throw std::runtime_error("lloyd_cluster: need joint ZFFCTRL model");
    const int G = gj.clusters / GROUP_CLASS_AXIS;
    if (G <= 0) throw std::runtime_error("lloyd_cluster: no groups");
    if (k_want <= 0) throw std::runtime_error("lloyd_cluster: bad K");
    const int K = std::min(k_want, G);
    const size_t stride = SandboxModel::init_stride(gj.profile);
    const size_t block = (size_t)GROUP_CLASS_AXIS * stride;

    auto row_at = [&](int g, int c) -> size_t {
        return (size_t)g * block + (size_t)c * stride;
    };
    auto total_events = [&](int g) {
        uint64_t t = 0;
        for (int c = 0; c < GROUP_CLASS_AXIS; ++c) {
            size_t base = row_at(g, c);
            for (size_t i = 0; i < stride; ++i)
                t += gj.n0[base + i] + gj.n1[base + i];
        }
        return t;
    };

    // Farthest-point seeding among distinct groups (pins P-T0-3). The
    // metric flattens the FULL joint block - every (class, bin) cell of the
    // group stack in ascending cell order, pin P-T0-2 - so ncells here is
    // the whole per-group block, never a single class row.
    std::vector<int> center_of_proto;
    std::vector<char> chosen((size_t)G, 0);
    {
        auto block_dist = [&](int a, int b) -> int64_t {
            return stack_dist128(
                &gj.n0[row_at(a, 0)], &gj.n1[row_at(a, 0)],
                &gj.n0[row_at(b, 0)], &gj.n1[row_at(b, 0)], block);
        };
        int first = 0;
        uint64_t best = total_events(0);
        for (int g = 1; g < G; ++g) {
            uint64_t t = total_events(g);
            if (t > best) { best = t; first = g; }   // strict: lowest id ties
        }
        chosen[(size_t)first] = 1;
        center_of_proto.push_back(first);
        while ((int)center_of_proto.size() < K) {
            int next = -1;
            int64_t best_min = -1;
            for (int g = 0; g < G; ++g) {
                if (chosen[(size_t)g]) continue;
                int64_t mind = std::numeric_limits<int64_t>::max();
                for (int p : center_of_proto) {
                    int64_t d = block_dist(g, p);
                    if (d < mind) mind = d;
                }
                if (mind > best_min) { best_min = mind; next = g; }
            }
            if (next < 0) break;               // every group already chosen
            chosen[(size_t)next] = 1;
            center_of_proto.push_back(next);
        }
    }
    const int Kseed = (int)center_of_proto.size();

    // Assign/update to convergence or the pinned cap. The first centers ARE
    // the seeded groups' stacks (addendum 20.2 "first center = the group
    // stack ..."): centroids start as copies of them, never zero, so the
    // initial assignment is measured against real prototypes.
    SandboxModel centroids;
    centroids.init(TokProfile::ZFFCTRL, Kseed * GROUP_CLASS_AXIS);
    for (int p = 0; p < Kseed; ++p) {
        const int src = center_of_proto[(size_t)p];
        for (int c = 0; c < GROUP_CLASS_AXIS; ++c) {
            size_t s = row_at(src, c), d = row_at(p, c);
            for (size_t i = 0; i < stride; ++i) {
                centroids.n0[d + i] = gj.n0[s + i];
                centroids.n1[d + i] = gj.n1[s + i];
            }
        }
    }
            }
        }
    }
    std::vector<uint32_t> assign((size_t)G, 0);
    int iters = 0;
    auto proto_block_sum = [&](SandboxModel& dst) {
        // Centroids = per-bin SUMS of member stacks (n0/n1 independent).
        std::fill(dst.n0.begin(), dst.n0.end(), 0);
        std::fill(dst.n1.begin(), dst.n1.end(), 0);
        std::fill(dst.samples_per_cluster.begin(),
                  dst.samples_per_cluster.end(), 0);
        for (int g = 0; g < G; ++g) {
            const int p = (int)assign[(size_t)g];
            for (int c = 0; c < GROUP_CLASS_AXIS; ++c) {
                size_t src = row_at(g, c), dsti = row_at(p, c);
                for (size_t i = 0; i < stride; ++i) {
                    dst.n0[dsti + i] += gj.n0[src + i];
                    dst.n1[dsti + i] += gj.n1[src + i];
                }
            }
            dst.samples_per_cluster[(size_t)p] += 1;   // groups, not samples
        }
    };
    for (; iters < LLOYD_ITER_CAP; ++iters) {
        bool changed = false;
        for (int g = 0; g < G; ++g) {
            int best_p = 0;
            int64_t best_d = std::numeric_limits<int64_t>::max();
            for (int p = 0; p < Kseed; ++p) {
                int64_t d = stack_dist128(
                    &gj.n0[row_at(g, 0)], &gj.n1[row_at(g, 0)],
                    &centroids.n0[row_at(p, 0)],
                    &centroids.n1[row_at(p, 0)], block);
                if (d < best_d) { best_d = d; best_p = p; }  // lowest id ties
            }
            if ((uint32_t)best_p != assign[(size_t)g]) changed = true;
            assign[(size_t)g] = (uint32_t)best_p;
        }
        if (!changed && iters > 0) break;
        proto_block_sum(centroids);   // seed iteration builds from assigns
    }

    // One-shot empty-prototype drop (pin P-T0-3): survivors keep relative
    // order, renumber ascending; EVERY group reassigned to its nearest
    // surviving prototype; centroids NOT recomputed afterwards.
    std::vector<int> survivor_proto;      // old proto id per new id
    for (int p = 0; p < Kseed; ++p) {
        bool occupied = false;
        for (int g = 0; g < G && !occupied; ++g)
            occupied = (assign[(size_t)g] == (uint32_t)p);
        if (occupied) survivor_proto.push_back(p);
    }
    const int Kout = std::max(1, (int)survivor_proto.size());
    CodebookFit fit;
    fit.k_transmitted = Kout;
    fit.iterations = iters;
    fit.centroids.init(TokProfile::ZFFCTRL, Kout * GROUP_CLASS_AXIS);
    for (int np = 0; np < Kout; ++np) {
        const int op = survivor_proto[(size_t)np];
        for (int c = 0; c < GROUP_CLASS_AXIS; ++c) {
            size_t src = row_at(op, c), dsti = row_at(np, c);
            for (size_t i = 0; i < stride; ++i) {
                fit.centroids.n0[dsti + i] = centroids.n0[src + i];
                fit.centroids.n1[dsti + i] = centroids.n1[src + i];
            }
        }
    }
    fit.proto_of_group.assign((size_t)G, 0);
    for (int g = 0; g < G; ++g) {
        int best_np = 0;
        int64_t best_d = std::numeric_limits<int64_t>::max();
        for (int np = 0; np < Kout; ++np) {
            int64_t d = stack_dist128(
                &gj.n0[row_at(g, 0)], &gj.n1[row_at(g, 0)],
                &fit.centroids.n0[row_at(np, 0)],
                &fit.centroids.n1[row_at(np, 0)], block);
            if (d < best_d) { best_d = d; best_np = np; }
        }
        fit.proto_of_group[(size_t)g] = (uint32_t)best_np;
    }
    return fit;
}

// ----- 'SBP2' wide merge map (pin P-T0-7) -----

std::vector<uint8_t> serialize_merge_map16(uint32_t raw_clusters,
                                           const std::vector<uint32_t>& merge,
                                           size_t* audit_counted) {
    if (raw_clusters == 0 || raw_clusters > 65536)
        throw std::runtime_error("staticmodel: bad raw cluster count");
    std::vector<uint8_t> blob;
    blob.insert(blob.end(), MERGE16_MAGIC, MERGE16_MAGIC + 4);
    put_u16(blob, (uint16_t)raw_clusters);
    size_t counted = blob.size();
    for (uint32_t c = 0; c < raw_clusters; ++c) {
        uint32_t dst = (c < merge.size()) ? merge[c] : c;
        if (dst >= raw_clusters)
            throw std::runtime_error("staticmodel: merge id out of range");
        put_u16(blob, (uint16_t)dst);
        counted += 2;
    }
    put_u32(blob, prism::crc32(blob));
    counted += 4;
    if (audit_counted) *audit_counted = counted;
    return blob;
}

std::vector<uint32_t> deserialize_merge_map16(
    const std::vector<uint8_t>& blob, uint32_t raw_clusters) {
    if (raw_clusters == 0 || raw_clusters > 65536 ||
        blob.size() != (size_t)raw_clusters * 2u + 10u ||
        memcmp(blob.data(), MERGE16_MAGIC, 4) != 0)
        throw std::runtime_error("staticmodel: bad wide merge map");
    size_t pos = 4;
    uint16_t n = get_u16(blob, pos);
    if ((uint32_t)n != raw_clusters)
        throw std::runtime_error("staticmodel: merge map size mismatch");
    std::vector<uint32_t> out(raw_clusters);
    for (uint32_t c = 0; c < raw_clusters; ++c) {
        out[c] = get_u16(blob, pos);
        if (out[c] >= raw_clusters)
            throw std::runtime_error("staticmodel: merge id out of range");
    }
    uint32_t stored_crc = get_u32(blob, pos);
    if (prism::crc32(blob.data(), blob.size() - 4) != stored_crc)
        throw std::runtime_error("staticmodel: merge map CRC mismatch");
    return out;
}

// ----- Assignment-word symbol rANS (single state; pin P-T0-4) -----

namespace {

constexpr uint32_t SYM_SCALE_BITS = 12;          // M = 4096
constexpr uint32_t SYM_M = 1u << SYM_SCALE_BITS;

struct SymFreqs {
    std::vector<uint32_t> cum;                   // [K+1]
    void init(const std::vector<uint16_t>& ctx) {
        cum.assign(ctx.size() + 1, 0);
        for (size_t s = 0; s < ctx.size(); ++s)
            cum[s + 1] = cum[s] + ctx[s];        // support >= 1 guaranteed
    }
};

void sym_encode(std::vector<uint8_t>& out, uint32_t& x, const SymFreqs& f,
                uint32_t sym) {
    if (sym + 1 >= f.cum.size())
        throw std::runtime_error("staticmodel: bad assignment symbol");
    const uint32_t freq = f.cum[sym + 1] - f.cum[sym];
    const uint32_t x_max = ((RB_L >> SYM_SCALE_BITS) << 8) * freq;
    while (x >= x_max) { out.push_back((uint8_t)(x & 0xff)); x >>= 8; }
    x = ((x / freq) << SYM_SCALE_BITS) + (x % freq) + f.cum[sym];
}

void sym_flush(std::vector<uint8_t>& out, uint32_t x) {
    for (int i = 0; i < 4; ++i) {                // big-endian u32 state
        out.push_back((uint8_t)(x >> 24));
        x <<= 8;
    }
}

struct SymDecoder {
    const uint8_t* ptr;
    const uint8_t* end;
    uint32_t x;
    void init(const uint8_t* src, const uint8_t* src_end) {
        ptr = src;
        end = src_end;
        if (end - ptr < 4)
            throw std::runtime_error("staticmodel: truncated words");
        x = ((uint32_t)ptr[0] << 24) | ((uint32_t)ptr[1] << 16) |
            ((uint32_t)ptr[2] << 8) | (uint32_t)ptr[3];
        ptr += 4;
    }
    uint32_t sym(const SymFreqs& f) {
        if (f.cum.empty()) throw std::runtime_error("staticmodel: no ctx");
        const uint32_t slot = x & (SYM_M - 1);
        uint32_t lo = 0, hi = (uint32_t)f.cum.size() - 1;
        while (lo + 1 < hi) {                    // cum[lo] <= slot < cum[hi]
            uint32_t mid = (lo + hi) / 2;
            if (f.cum[mid] <= slot) lo = mid; else hi = mid;
        }
        const uint32_t freq = f.cum[lo + 1] - f.cum[lo];
        x = freq * (x >> SYM_SCALE_BITS) + slot - f.cum[lo];
        while (x < RB_L) {
            if (ptr >= end)
                throw std::runtime_error("staticmodel: truncated words");
            x = (x << 8) | *ptr++;
        }
        return lo;
    }
};

} // namespace

// ----- 'SBC1' codebook serialization (pin P-T0-5) -----

std::vector<uint8_t> serialize_codebook(const SmoothedTables& protos,
                                        const std::vector<uint32_t>& words,
                                        size_t* audit_counted,
                                        size_t* words_bytes) {
    // Shape (addendum 20.2 verbatim): ONE image-global prior table
    // (SmoothedTables' one-cluster layout, pooled across prototypes per
    // pin P-T0-1) plus a per-joint-row s16 delta stream (proto_u12 -
    // prior_u12) covering all K * 16 joint rows. The u32 stride field
    // carries 16 x profile stride per pin P-T0-5.
    const uint32_t prof_stride = (uint32_t)protos.stride();
    const int K = protos.clusters / GROUP_CLASS_AXIS;
    if (K <= 0 || (size_t)K * GROUP_CLASS_AXIS != (size_t)protos.clusters ||
        protos.prior.empty() || protos.delta.size() != protos.p.size() ||
        protos.prior.size() != (size_t)prof_stride ||
        protos.p.size() != (size_t)K * GROUP_CLASS_AXIS * prof_stride)
        throw std::runtime_error("staticmodel: bad prototype shape");
    const uint32_t stride_field = prof_stride * GROUP_CLASS_AXIS;

    std::vector<uint8_t> prior_bytes(protos.prior.size() * 2);
    for (size_t i = 0; i < protos.prior.size(); ++i) {
        prior_bytes[2 * i] = (uint8_t)protos.prior[i];
        prior_bytes[2 * i + 1] = (uint8_t)(protos.prior[i] >> 8);
    }
    std::vector<uint8_t> delta_raw(protos.delta.size() * 2);
    for (size_t i = 0; i < protos.delta.size(); ++i) {
        delta_raw[2 * i] = (uint8_t)protos.delta[i];
        delta_raw[2 * i + 1] = (uint8_t)(protos.delta[i] >> 8);
    }
    // Assignment context: 4096-normalized word histogram over alphabet K
    // (support floor 1 by the standard pass).
    std::vector<uint64_t> wc((size_t)K, 0);
    for (uint32_t w : words) {
        if (w >= (uint32_t)K)
            throw std::runtime_error("staticmodel: word out of range");
        wc[w]++;
    }
    std::vector<uint16_t> ctx;
    normalize_counts_4096(wc, ctx);
    std::vector<uint8_t> ctx_raw(ctx.size() * 2);
    for (size_t i = 0; i < ctx.size(); ++i) {
        ctx_raw[2 * i] = (uint8_t)ctx[i];
        ctx_raw[2 * i + 1] = (uint8_t)(ctx[i] >> 8);
    }

    // ONE plane-rANS application over delta_raw ++ ctx_raw.
    std::vector<uint8_t> comp_input = delta_raw;
    comp_input.insert(comp_input.end(), ctx_raw.begin(), ctx_raw.end());
    std::vector<uint8_t> coded = plane_rans_compress(comp_input);
    // CRC over the WHOLE uncompressed span (prior ++ delta ++ ctx) computed
    // as one true crc32 pass: the shipped crc32_combine helper is a
    // single-buffer CRC that ignores its running argument (see A-T0-1d),
    // so multi-segment chains would silently reduce to a CRC of the last
    // segment only. This blob is new with zero rows in the world, so it
    // gets the honest whole-span form.
    std::vector<uint8_t> crc_span;
    crc_span.reserve(prior_bytes.size() + delta_raw.size() +
                     ctx_raw.size());
    crc_span.insert(crc_span.end(), prior_bytes.begin(), prior_bytes.end());
    crc_span.insert(crc_span.end(), delta_raw.begin(), delta_raw.end());
    crc_span.insert(crc_span.end(), ctx_raw.begin(), ctx_raw.end());

    std::vector<uint8_t> blob;
    blob.insert(blob.end(), CODEBOOK_MAGIC, CODEBOOK_MAGIC + 4);
    put_u32(blob, (uint32_t)K);
    put_u32(blob, stride_field);
    put_u32(blob, (uint32_t)protos.profile);
    size_t counted = blob.size();
    blob.insert(blob.end(), prior_bytes.begin(), prior_bytes.end());
    counted += prior_bytes.size();
    put_u32(blob, (uint32_t)coded.size());
    counted += 4;
    blob.insert(blob.end(), coded.begin(), coded.end());
    counted += coded.size();
    put_u32(blob, prism::crc32(crc_span));
    counted += 4;
    // Words tail: symbol-rANS stream under the carried context. Renorm
    // bytes collect in push order, but the decoder consumes the buffer
    // forward with the flushed state FIRST (vendored-port layout: state
    // word, then renorm bytes last-pushed-first), so the tail is composed
    // as [u32 nwords][u32 len][state BE][renorm bytes reversed].
    put_u32(blob, (uint32_t)words.size());
    counted += 4;
    SymFreqs freqs;
    freqs.init(ctx);
    std::vector<uint8_t> pushed, wbytes;
    uint32_t x = RB_L;
    for (size_t i = words.size(); i-- > 0;)       // reverse raster order
        sym_encode(pushed, x, freqs, words[i]);
    sym_flush(wbytes, x);
    for (size_t i = pushed.size(); i-- > 0;)
        wbytes.push_back(pushed[(size_t)i]);
    put_u32(blob, (uint32_t)wbytes.size());
    counted += 4;
    blob.insert(blob.end(), wbytes.begin(), wbytes.end());
    counted += wbytes.size();
    if (words_bytes) *words_bytes = 8 + wbytes.size();

    if (audit_counted) *audit_counted = counted;
    return blob;
}

DecodedCodebook deserialize_codebook(const std::vector<uint8_t>& blob,
                                     const SmoothedTables* expect_tabs,
                                     const std::vector<uint32_t>* expect_words) {
    if (blob.size() < 20 || memcmp(blob.data(), CODEBOOK_MAGIC, 4) != 0)
        throw std::runtime_error("staticmodel: bad codebook magic");
    size_t pos = 4;
    DecodedCodebook out;
    const uint32_t K = get_u32(blob, pos);
    const uint32_t stride = get_u32(blob, pos);
    uint32_t prof = get_u32(blob, pos);
    if (prof > 3) throw std::runtime_error("staticmodel: bad profile");
    out.tabs.profile = (TokProfile)prof;
    if (K == 0 || stride % GROUP_CLASS_AXIS != 0 ||
        stride != SandboxModel::init_stride(out.tabs.profile) *
                      GROUP_CLASS_AXIS)
        throw std::runtime_error("staticmodel: bad codebook shape");
    out.tabs.clusters = (int)(K * GROUP_CLASS_AXIS);
    // ONE image-global prior row per bin (addendum 20.2); deltas follow
    // per joint row.
    const uint32_t prof_stride = stride / GROUP_CLASS_AXIS;
    out.tabs.prior.resize(prof_stride);
    for (uint32_t i = 0; i < prof_stride; ++i)
        out.tabs.prior[i] = get_u16(blob, pos);
    const size_t ndelta = (size_t)K * stride;
    uint32_t coded_len = get_u32(blob, pos);
    if (pos + (size_t)coded_len + 4 > blob.size())
        throw std::runtime_error("staticmodel: truncated");
    std::vector<uint8_t> coded(blob.begin() + (long)pos,
                               blob.begin() + (long)(pos + coded_len));
    pos += coded_len;
    uint32_t stored_crc = get_u32(blob, pos);
    const uint32_t nwords = get_u32(blob, pos);
    uint32_t wlen = get_u32(blob, pos);
    if (pos + wlen != blob.size())
        throw std::runtime_error("staticmodel: trailing bytes");
    if (coded.size() < 4) throw std::runtime_error("staticmodel: truncated");
    uint32_t nbytes = (uint32_t)coded[0] | ((uint32_t)coded[1] << 8) |
                      ((uint32_t)coded[2] << 16) |
                      ((uint32_t)coded[3] << 24);
    if (nbytes % 2 != 0 || nbytes / 2 != ndelta + (size_t)K)
        throw std::runtime_error("staticmodel: bad compressed length");
    size_t cpos = 4;
    std::vector<uint8_t> raw = plane_rans_decompress(coded, cpos, nbytes);

    std::vector<uint8_t> prior_bytes(out.tabs.prior.size() * 2);
    for (size_t i = 0; i < out.tabs.prior.size(); ++i) {
        prior_bytes[2 * i] = (uint8_t)out.tabs.prior[i];
        prior_bytes[2 * i + 1] = (uint8_t)(out.tabs.prior[i] >> 8);
    }
    // Whole uncompressed span (prior ++ decompressed deltas ++ ctx), the
    // exact encoder form - see serialize_codebook for why this is a single
    // crc32 pass rather than a combine chain.
    std::vector<uint8_t> crc_span;
    crc_span.reserve(prior_bytes.size() + raw.size());
    crc_span.insert(crc_span.end(), prior_bytes.begin(), prior_bytes.end());
    crc_span.insert(crc_span.end(), raw.begin(), raw.end());
    if (prism::crc32(crc_span) != stored_crc)
        throw std::runtime_error("staticmodel: CRC mismatch");

    // Split raw into deltas ++ ctx (deltas lead by construction).
    out.tabs.delta.resize(ndelta);
    out.assign_ctx.resize(K);
    for (size_t i = 0; i < ndelta; ++i)
        out.tabs.delta[i] = (uint16_t)(raw[2 * i] |
                                       ((uint16_t)raw[2 * i + 1] << 8));
    for (uint32_t i = 0; i < (uint32_t)K; ++i) {
        size_t o = (ndelta + (size_t)i) * 2;
        out.assign_ctx[i] = (uint16_t)(raw[o] | ((uint16_t)raw[o + 1] << 8));
    }
    out.tabs.p.assign(ndelta, 0);
    for (int cl = 0; cl < (int)K * GROUP_CLASS_AXIS; ++cl)
        for (uint32_t j = 0; j < prof_stride; ++j) {
            const size_t i = (size_t)cl * prof_stride + j;
            int v = (int)out.tabs.prior[j] + (int16_t)out.tabs.delta[i];
            if (v < 1 || v > 4096)
                throw std::runtime_error(
                    "staticmodel: probability out of range");
            out.tabs.p[i] = (uint16_t)v;
        }

    SymFreqs freqs;
    freqs.init(out.assign_ctx);
    SymDecoder dec;
    dec.init(blob.data() + pos, blob.data() + blob.size());
    out.words.resize(nwords);
    for (uint32_t i = 0; i < nwords; ++i)
        out.words[i] = dec.sym(freqs);
    for (uint32_t w : out.words)
        if (w >= K) throw std::runtime_error("staticmodel: word out of range");
    if (expect_tabs &&
        (expect_tabs->p != out.tabs.p || expect_tabs->prior != out.tabs.prior))
        throw std::runtime_error("staticmodel: codebook table mismatch");
    if (expect_words && *expect_words != out.words)
        throw std::runtime_error("staticmodel: codebook words mismatch");
    return out;
}

// ----- Shrinkage estimator + 'SBD1' (addendum 20.3; pin P-T0-8/P-T0-9) -----

size_t ShrunkTables::stride() const {
    return SandboxModel::init_stride(profile);
}

ShrunkTables shrink_child_tables(TokProfile p, const SandboxModel& flat343,
                                 const SmoothedTables& class16_tabs, int a_c) {
    if (flat343.clusters != AC_V2_RESDIFF_CONTEXTS ||
        flat343.profile != TokProfile::ZFFCTRL || a_c < 0)
        throw std::runtime_error("shrink_child_tables: bad inputs");
    // a_c = 0 is legal (pin P-T0-8 limit: reproduces child ML
    // normalization); only negative pseudo-counts are malformed.
    if (class16_tabs.profile != TokProfile::ZFFCTRL ||
        class16_tabs.clusters != GROUP_CLASS_AXIS ||
        class16_tabs.p.size() != (size_t)GROUP_CLASS_AXIS * class16_tabs.stride())
        throw std::runtime_error("shrink_child_tables: bad parent tables");

    ShrunkTables out;
    out.profile = p;
    const size_t stride = out.stride();
    out.class16 = class16_tabs.p;                 // shipped pooled u12 rows
    out.child_delta.assign((size_t)AC_V2_RESDIFF_CONTEXTS * stride, 0);
    out.p.assign((size_t)AC_V2_RESDIFF_CONTEXTS * stride, 0);

    std::vector<uint64_t> cp(2);
    std::vector<uint16_t> norm;
    for (int cq = 0; cq < AC_V2_RESDIFF_CONTEXTS; ++cq) {
        const uint32_t par_cls =
            keying_cluster(KeyingId::KFLAT16, cq);   // shipped reduction
        const size_t par_base = (size_t)par_cls * stride;
        const size_t base = (size_t)cq * stride;
        for (size_t i = 0; i < stride; ++i) {
            const uint16_t par0 = out.class16[par_base + i];
            const uint32_t par1 = 4096u - (uint32_t)par0;
            // cp_bin = n_bin * 4096 + a_c * parent_u12(bin); the standard
            // normalize_counts_4096 pass does everything else verbatim
            // (support floor 1, largest remainder, ascending-id ties).
            cp[0] = (uint64_t)flat343.n0[(size_t)cq * stride + i] * 4096ull +
                    (uint64_t)a_c * (uint64_t)par0;
            cp[1] = (uint64_t)flat343.n1[(size_t)cq * stride + i] * 4096ull +
                    (uint64_t)a_c * (uint64_t)par1;
            normalize_counts_4096(cp, norm);
            const uint16_t child0 = norm[0];
            out.p[base + i] = child0;
            out.child_delta[base + i] =
                (int16_t)((int)child0 - (int)out.class16[par_base + i]);
        }
    }
    return out;
}

std::vector<uint8_t> serialize_shrunk(const ShrunkTables& t,
                                      size_t* audit_counted) {
    if (t.profile != TokProfile::ZFFCTRL ||
        t.class16.size() != (size_t)GROUP_CLASS_AXIS * t.stride() ||
        t.child_delta.size() !=
            (size_t)AC_V2_RESDIFF_CONTEXTS * t.stride())
        throw std::runtime_error("staticmodel: bad shrunk tables");
    const uint32_t stride = (uint32_t)t.stride();

    std::vector<uint8_t> pmap((size_t)AC_V2_RESDIFF_CONTEXTS);
    for (int cq = 0; cq < AC_V2_RESDIFF_CONTEXTS; ++cq)
        pmap[(size_t)cq] = (uint8_t)keying_cluster(KeyingId::KFLAT16, cq);
    std::vector<uint8_t> cls_bytes(t.class16.size() * 2);
    for (size_t i = 0; i < t.class16.size(); ++i) {
        cls_bytes[2 * i] = (uint8_t)t.class16[i];
        cls_bytes[2 * i + 1] = (uint8_t)(t.class16[i] >> 8);
    }
    std::vector<uint8_t> delta_raw(t.child_delta.size() * 2);
    for (size_t i = 0; i < t.child_delta.size(); ++i) {
        delta_raw[2 * i] = (uint8_t)t.child_delta[i];
        delta_raw[2 * i + 1] = (uint8_t)((uint16_t)t.child_delta[i] >> 8);
    }
    std::vector<uint8_t> coded = plane_rans_compress(delta_raw);

    uint32_t crc = prism::crc32(pmap);
    crc = prism::crc32_combine(crc, cls_bytes.data(), cls_bytes.size());
    crc = prism::crc32_combine(crc, delta_raw.data(), delta_raw.size());

    std::vector<uint8_t> blob;
    blob.insert(blob.end(), SHRUNK_MAGIC, SHRUNK_MAGIC + 4);
    put_u32(blob, (uint32_t)AC_V2_RESDIFF_CONTEXTS);
    put_u32(blob, stride);
    put_u32(blob, (uint32_t)t.profile);
    size_t counted = blob.size();
    blob.insert(blob.end(), pmap.begin(), pmap.end());
    counted += pmap.size();
    blob.insert(blob.end(), cls_bytes.begin(), cls_bytes.end());
    counted += cls_bytes.size();
    put_u32(blob, (uint32_t)coded.size());
    counted += 4;
    blob.insert(blob.end(), coded.begin(), coded.end());
    counted += coded.size();
    put_u32(blob, crc);
    counted += 4;

    if (audit_counted) *audit_counted = counted;
    return blob;
}

ShrunkTables deserialize_shrunk(const std::vector<uint8_t>& blob,
                                const ShrunkTables* expect) {
    if (blob.size() < 24 || memcmp(blob.data(), SHRUNK_MAGIC, 4) != 0)
        throw std::runtime_error("staticmodel: bad shrunk magic");
    size_t pos = 4;
    ShrunkTables out;
    uint32_t nchildren = get_u32(blob, pos);
    uint32_t stride32 = get_u32(blob, pos);
    uint32_t prof = get_u32(blob, pos);
    if (prof > 3) throw std::runtime_error("staticmodel: bad profile");
    out.profile = (TokProfile)prof;
    if (nchildren != (uint32_t)AC_V2_RESDIFF_CONTEXTS ||
        stride32 != SandboxModel::init_stride(out.profile))
        throw std::runtime_error("staticmodel: bad shrunk shape");
    const size_t stride = stride32;

    if (pos + (size_t)AC_V2_RESDIFF_CONTEXTS + GROUP_CLASS_AXIS * stride * 2 +
            4 > blob.size())
        throw std::runtime_error("staticmodel: truncated");
    std::vector<uint8_t> pmap(
        blob.begin() + (long)pos,
        blob.begin() + (long)(pos + AC_V2_RESDIFF_CONTEXTS));
    for (int cq = 0; cq < AC_V2_RESDIFF_CONTEXTS; ++cq)
        if (pmap[(size_t)cq] >= GROUP_CLASS_AXIS)
            throw std::runtime_error("staticmodel: bad parent id");
    pos += (size_t)AC_V2_RESDIFF_CONTEXTS;

    out.class16.resize(GROUP_CLASS_AXIS * stride);
    for (size_t i = 0; i < out.class16.size(); ++i)
        out.class16[i] = get_u16(blob, pos);
    uint32_t coded_len = get_u32(blob, pos);
    if (pos + (size_t)coded_len + 4 > blob.size())
        throw std::runtime_error("staticmodel: truncated");
    std::vector<uint8_t> coded(blob.begin() + (long)pos,
                               blob.begin() + (long)(pos + coded_len));
    pos += coded_len;
    uint32_t stored_crc = get_u32(blob, pos);
    if (pos != blob.size())
        throw std::runtime_error("staticmodel: trailing bytes");

    if (coded.size() < 4) throw std::runtime_error("staticmodel: truncated");
    uint32_t nbytes = (uint32_t)coded[0] | ((uint32_t)coded[1] << 8) |
                      ((uint32_t)coded[2] << 16) |
                      ((uint32_t)coded[3] << 24);
    if (nbytes % 2 != 0 ||
        nbytes / 2 != (size_t)AC_V2_RESDIFF_CONTEXTS * stride)
        throw std::runtime_error("staticmodel: bad shrunk delta length");
    size_t cpos = 4;
    std::vector<uint8_t> delta_raw = plane_rans_decompress(coded, cpos, nbytes);

    uint32_t crc = prism::crc32(pmap);
    // class16 bytes span backwards from the coded section start.
    const size_t cls_off = 4 + 12 + (size_t)AC_V2_RESDIFF_CONTEXTS;
    crc = prism::crc32_combine(
        crc, blob.data() + cls_off, GROUP_CLASS_AXIS * stride * 2);
    crc = prism::crc32_combine(crc, delta_raw.data(), delta_raw.size());
    if (crc != stored_crc)
        throw std::runtime_error("staticmodel: CRC mismatch");

    out.child_delta.resize(delta_raw.size() / 2);
    for (size_t i = 0; i < out.child_delta.size(); ++i)
        out.child_delta[i] =
            (int16_t)(delta_raw[2 * i] | ((uint16_t)delta_raw[2 * i + 1] << 8));
    // Rebuild each child row against ITS OWN blob-carried parent (the
    // shipped class16 reduction, pin P-T0-9): child cq's parent row is
    // pmap[cq], never the positional i % 16 fallback.
    out.p.resize(out.child_delta.size());
    for (int cq = 0; cq < AC_V2_RESDIFF_CONTEXTS; ++cq) {
        const size_t pbase = (size_t)pmap[(size_t)cq] * stride;
        const size_t base = (size_t)cq * stride;
        for (size_t j = 0; j < stride; ++j) {
            int v = (int)out.class16[pbase + j] +
                    (int)out.child_delta[base + j];
            if (v < 1 || v > 4096)
                throw std::runtime_error(
                    "staticmodel: probability out of range");
            out.p[base + j] = (uint16_t)v;
        }
    }
    if (expect &&
        (expect->p != out.p || expect->class16 != out.class16 ||
         expect->child_delta != out.child_delta))
        throw std::runtime_error("staticmodel: deserialized shrunk mismatch");
    return out;
}

// ----- Oracle-map pass (V1a; pin V-P4) -----

namespace {

// Pinned cost (cost12 units) of coding one event under table row cl.
int64_t event_cost12(TokProfile p, const SmoothedTables& t, uint32_t cl,
                     const TokEvent& e, TokenTree& tree) {
    (void)p;
    switch (e.kind) {
        case EvKind::RAWBITS:
            return (int64_t)e.key << 12;     // identical across clusters
        case EvKind::TOKEN: {
            uint32_t sym = e.value;
            uint32_t node = 0;
            int64_t cost = 0;
            for (;;) {
                const TokenTree::Node& nd = tree.nodes[node];
                if (nd.hi - nd.lo <= 1) break;
                uint32_t mid = nd.lo + (nd.hi - nd.lo) / 2;
                uint16_t right = token_right_mass(t, cl, tree, node);
                uint16_t left = (uint16_t)(4096u - (uint32_t)right);
                bool bit = sym >= mid;
                cost += kCost12[bit ? left : right];
                node = bit ? 2 * node + 2 : 2 * node + 1;
            }
            return cost;
        }
        default: {
            uint16_t p0 = t.at(cl, (int)e.kind, e.key);
            return kCost12[e.value ? (uint16_t)(4096u - (uint32_t)p0) : p0];
        }
    }
}

void append_signature(std::string& sig, const TokEvent& e) {
    uint8_t rec[8];
    rec[0] = (uint8_t)e.kind;
    rec[1] = 0;
    rec[2] = (uint8_t)(e.key & 0xff);
    rec[3] = (uint8_t)((e.key >> 8) & 0xff);
    uint32_t v = e.value;
    rec[4] = (uint8_t)v;
    rec[5] = (uint8_t)(v >> 8);
    rec[6] = (uint8_t)(v >> 16);
    rec[7] = (uint8_t)(v >> 24);
    sig.append(reinterpret_cast<const char*>(rec), sizeof(rec));
}

} // namespace

std::vector<std::vector<uint32_t>> oracle_assign(
    TokProfile p, const SandboxModel& source, const SmoothedTables& t,
    const std::vector<std::vector<int32_t>>& plane_residuals) {
    std::vector<uint32_t> pool;
    for (int c = 0; c < source.clusters; ++c)
        if (source.samples_per_cluster[c] > 0) pool.push_back((uint32_t)c);
    std::vector<std::vector<uint32_t>> maps(plane_residuals.size());
    if (pool.empty()) return maps;
    TokenTree tree((uint32_t)t.tok_syms());
    std::unordered_map<std::string, uint32_t> memo;
    std::vector<TokEvent> evs;
    std::string sig;
    for (size_t pi = 0; pi < plane_residuals.size(); ++pi) {
        const auto& res = plane_residuals[pi];
        maps[pi].resize(res.size());
        for (size_t i = 0; i < res.size(); ++i) {
            evs.clear();
            sig.clear();
            tokenize_sample(p, res[i], evs);
            for (const TokEvent& e : evs) append_signature(sig, e);
            auto it = memo.find(sig);
            if (it == memo.end()) {
                constexpr int64_t kCostInf = std::numeric_limits<int64_t>::max();
                int64_t best_cost = kCostInf;
                uint32_t best_cl = pool[0];
                for (uint32_t cl : pool) {
                    int64_t cost = 0;
                    for (const TokEvent& e : evs)
                        cost += event_cost12(p, t, cl, e, tree);
                    if (cost < best_cost) {  // strict: lowest id wins ties
                        best_cost = cost;
                        best_cl = cl;
                    }
                }
                it = memo.emplace(sig, best_cl).first;
            }
            maps[pi][i] = it->second;
        }
    }
    return maps;
}

// ----- Backend scoring helpers -----

double table_ideal_bits(TokProfile, const std::vector<TaggedEvent>& ev,
                        const SmoothedTables& t) {
    static const double kScale = 65536.0;
    double bits = 0;
    TokenTree tree((uint32_t)t.tok_syms());
    for (const TaggedEvent& te : ev) {
        switch (te.ev.kind) {
        case EvKind::RAWBITS:
            // Unmodeled (pin D3) but not unpaid: the escaped magnitude's
            // low q bits cost exactly q literal bits in every backend, so
            // the oracle bracket carries them too (it must BOUND the real
            // coders, which count these bytes fully).
            bits += (double)te.ev.key;
            break;
        case EvKind::TOKEN: {
            uint32_t sym = te.ev.value;
            uint32_t node = 0;
            for (;;) {
                const TokenTree::Node& nd = tree.nodes[node];
                if (nd.hi - nd.lo <= 1) break;
                uint32_t mid = nd.lo + (nd.hi - nd.lo) / 2;
                uint16_t right = token_right_mass(t, te.cluster, tree, node);
                // Same clamp as the coders (p12_to_p16) so the ideal and
                // the real engines price outcomes identically.
                double p0 = (double)(int)p12_to_p16(
                                (uint16_t)(4096u - (uint32_t)right)) / kScale;
                double p1 = (double)(int)p12_to_p16(right) / kScale;
                if (sym >= mid) {
                    bits -= std::log2(p1);
                    node = 2 * node + 2;
                } else {
                    bits -= std::log2(p0);
                    node = 2 * node + 1;
                }
            }
            break;
        }
        default: {
            uint16_t p16 = p12_to_p16(t.at(te.cluster, (int)te.ev.kind,
                                            te.ev.key));
            double pw = te.ev.value ? (kScale - (double)p16) / kScale
                                    : (double)p16 / kScale;
            bits -= std::log2(pw);
            break;
        }
        }
    }
    return bits;
}

double ml_ideal_bits(const SandboxModel& m) {
    // Fixed-index-order accumulation (deterministic; no anchor contract).
    double bits = 0;
    const size_t stride = m.stride();
    for (int k = 0; k < NK; ++k) {
        size_t span = table_span(m.profile, k);
        if (span == 0) continue;
        size_t off = 0;
        for (int kk = 0; kk < k; ++kk) off += table_span(m.profile, kk);
        for (int c = 0; c < m.clusters; ++c)
            for (size_t key = 0; key < span; ++key) {
                uint64_t n0 = m.n0[(size_t)c * stride + off + key];
                uint64_t n1 = m.n1[(size_t)c * stride + off + key];
                uint64_t n = n0 + n1;
                if (!n) continue;
                double p0 = (double)n0 / (double)n;
                if (n0) bits -= (double)n0 * std::log2(p0);
                if (n1) bits -= (double)n1 * std::log2(1.0 - p0);
            }
    }
    for (int c = 0; c < m.clusters; ++c) {
        uint64_t tot = 0;
        for (size_t s = 0; s < m.tok_syms(); ++s)
            tot += m.tok[(size_t)c * m.tok_syms() + s];
        if (!tot) continue;
        for (size_t s = 0; s < m.tok_syms(); ++s) {
            uint64_t cs = m.tok[(size_t)c * m.tok_syms() + s];
            if (cs) bits -= (double)cs * std::log2((double)cs / (double)tot);
        }
    }
    return bits;
}

// ----- Coded-bin planning (shared by both real backends) -----

namespace {

struct BinReq {
    uint16_t p16;     // P(bit==0) scaled 2^16
    bool bit;
};

// Walk the tagged event stream emitting binary decisions (TOKEN expands to
// its decision-tree path) plus the packed raw-literal region (pin D3).
void plan_bins(const std::vector<TaggedEvent>& ev, const SmoothedTables& t,
               std::vector<BinReq>& bins, std::vector<uint8_t>& raw_packed,
               uint64_t& raw_total) {
    bins.clear();
    raw_packed.clear();
    raw_total = 0;
    TokenTree tree((uint32_t)t.tok_syms());
    for (const TaggedEvent& te : ev) {
        uint32_t cl = te.cluster;
        switch (te.ev.kind) {
        case EvKind::RAWBITS: {
            uint32_t q = te.ev.key;
            for (uint32_t b = 0; b < q; ++b) {
                uint32_t bit = (te.ev.value >> (q - 1 - b)) & 1u;
                if ((raw_total & 7) == 0) raw_packed.push_back(0);
                raw_packed.back() |= (uint8_t)(bit << (7 - (raw_total & 7)));
                raw_total++;
            }
            break;
        }
        case EvKind::TOKEN: {
            uint32_t sym = te.ev.value;
            uint32_t node = 0;
            for (;;) {
                const TokenTree::Node& nd = tree.nodes[node];
                if (nd.hi - nd.lo <= 1) break;
                uint32_t mid = nd.lo + (nd.hi - nd.lo) / 2;
                uint16_t right = token_right_mass(t, cl, tree, node);
                uint16_t left = (uint16_t)(4096u - (uint32_t)right);
                bool bit = sym >= mid;      // prob carries P(bit==0) = left
                bins.push_back({p12_to_p16(left), bit});
                node = bit ? 2 * node + 2 : 2 * node + 1;
            }
            break;
        }
        default: {
            uint16_t p12 = t.at(cl, (int)te.ev.kind, te.ev.key);
            bins.push_back({p12_to_p16(p12), te.ev.value != 0});
            break;
        }
        }
    }
}

// Cluster resolution on the decode side goes through the transmitted
// artifacts: keyed lookups, the 'SBP1' merge map, or an explicit oracle
// assignment - all carried by ClusterMap (see header).

constexpr char RANS_MAGIC[4] = {'S', 'B', 'R', '1'};
constexpr char BAC_MAGIC[4] = {'S', 'B', 'B', '1'};

} // namespace

// ----- B-RANS (interleaved-static, NS = 4 states) -----

std::vector<uint8_t> rans_encode_events(TokProfile,
                                        const std::vector<TaggedEvent>& ev,
                                        const SmoothedTables& t) {
    std::vector<BinReq> bins;
    std::vector<uint8_t> raw_packed;
    uint64_t raw_total = 0;
    plan_bins(ev, t, bins, raw_packed, raw_total);

    // Interleaved states: global bin g handled by state g % NS; each state
    // codes ITS OWN subsequence in reverse (rANS LIFO), so forward pops on
    // decode reproduce ascending g.
    struct RState {
        uint32_t x;
        std::vector<uint8_t> buf;          // grows downward from the end
        size_t head;                       // current write position
        void init(size_t cap) {
            buf.assign(cap, 0);
            head = cap;
            x = RB_L;
        }
        void put(uint16_t prob, bool bit) {
            uint32_t start = bit ? prob : 0;
            uint32_t freq = bit ? (RB_M - prob) : prob;
            uint32_t x_max = ((RB_L >> 16) << 8) * freq;
            while (x >= x_max) { buf[--head] = (uint8_t)(x & 0xff); x >>= 8; }
            x = ((x / freq) << 16) + (x % freq) + start;
        }
        void flush() {
            head -= 4;
            uint32_t v = x;
            buf[head + 0] = (uint8_t)v;
            buf[head + 1] = (uint8_t)(v >> 8);
            buf[head + 2] = (uint8_t)(v >> 16);
            buf[head + 3] = (uint8_t)(v >> 24);
        }
    };

    std::vector<RState> st(RANS_NS);
    size_t per_state = bins.size() / RANS_NS + 1;
    for (auto& s : st) s.init(per_state * 4 + 64);   // >= 3 B/bin worst case
    for (size_t g = bins.size(); g-- > 0;) {
        RState& s = st[g % RANS_NS];
        s.put(bins[g].p16, bins[g].bit);
    }
    for (auto& s : st) s.flush();

    std::vector<uint8_t> out;
    out.insert(out.end(), RANS_MAGIC, RANS_MAGIC + 4);
    put_u32(out, (uint32_t)bins.size());
    for (auto& s : st) put_u32(out, (uint32_t)(s.buf.size() - s.head));
    for (auto& s : st)
        out.insert(out.end(), s.buf.begin() + (long)s.head, s.buf.end());
    put_u32(out, (uint32_t)raw_packed.size());
    out.insert(out.end(), raw_packed.begin(), raw_packed.end());
    return out;
}

std::vector<int32_t> rans_decode_events(TokProfile p, KeyingId kk,
                                        uint32_t w, size_t nres,
                                        const std::vector<uint8_t>& bytes,
                                        const SmoothedTables& t) {
    ClusterMap cm = (kk == KeyingId::KGRID128) ? cluster_map_grid(w)
                                               : cluster_map_keyed(kk);
    cm.w = w;    // context computation needs the position even for flats
    return rans_decode_events(p, cm, nres, bytes, t);
}

std::vector<int32_t> rans_decode_events(TokProfile p, const ClusterMap& cm,
                                        size_t nres,
                                        const std::vector<uint8_t>& bytes,
                                        const SmoothedTables& t) {
    if (bytes.size() < 4 + 4 + 4 * RANS_NS + 4 ||
        memcmp(bytes.data(), RANS_MAGIC, 4) != 0)
        throw std::runtime_error("sandbox: bad rANS payload");
    size_t pos = 4;
    uint32_t nbins = get_u32(bytes, pos);
    std::vector<uint32_t> lens(RANS_NS);
    for (auto& l : lens) l = get_u32(bytes, pos);
    struct DState {
        uint32_t x;
        const uint8_t* ptr;
        void init(const uint8_t* src) {
            x = (uint32_t)src[0] | ((uint32_t)src[1] << 8) |
                ((uint32_t)src[2] << 16) | ((uint32_t)src[3] << 24);
            ptr = src + 4;
        }
        bool get(uint16_t prob) {               // prob carries P(bit==0)
            bool bit = (x & (RB_M - 1)) >= prob;
            uint32_t start = bit ? prob : 0;
            uint32_t freq = bit ? (RB_M - prob) : prob;
            uint32_t xm = freq * (x >> 16) + (x & (RB_M - 1)) - start;
            while (xm < RB_L) xm = (xm << 8) | *ptr++;
            x = xm;
            return bit;
        }
    };

    std::vector<DState> dst(RANS_NS);
    for (uint32_t s = 0; s < RANS_NS; ++s) {
        if (pos + lens[s] > bytes.size())
            throw std::runtime_error("sandbox: truncated rANS payload");
        dst[s].init(bytes.data() + pos);
        pos += lens[s];
    }
    uint32_t rawlen = get_u32(bytes, pos);
    if (pos + rawlen > bytes.size())
        throw std::runtime_error("sandbox: truncated raw region");
    const uint8_t* rawp = bytes.data() + pos;

    TokenTree tree((uint32_t)t.tok_syms());
    uint32_t gi = 0;                        // next expected global bin
    uint64_t rawpos = 0;
    auto getbin = [&](uint16_t p16) -> bool {
        if (gi >= nbins) throw std::runtime_error("sandbox: bin overrun");
        bool bit = dst[gi % RANS_NS].get(p16);
        ++gi;
        return bit;
    };
    auto graw = [&](uint32_t qbits) -> uint32_t {
        uint32_t v = 0;
        for (uint32_t b = 0; b < qbits; ++b, ++rawpos)
            v |= (uint32_t)((rawp[rawpos >> 3] >> (7 - (rawpos & 7))) & 1u)
                 << (qbits - 1 - b);
        return v;
    };

    std::vector<int32_t> out;
    out.reserve(nres);
    const uint32_t cap = Q_POS_MAX - 1;
    for (size_t i = 0; i < nres; ++i) {
        uint32_t cl = cm.at(i, out);
        auto bg = [&](int kind, uint32_t key) -> bool {
            return getbin(p12_to_p16(t.at(cl, kind, key)));
        };
        switch (p) {
        case TokProfile::ZFFCTRL: {
            if (bg((int)EvKind::ZERO_FLAG, 0)) { out.push_back(0); break; }
            bool neg = bg((int)EvKind::SIGN, 0);
            int L = 0;
            while (!bg((int)EvKind::QPOS,
                       (uint32_t)L < cap ? (uint32_t)L : cap))
                ++L;
            uint32_t mag = 1u << L;
            for (int pp = 0; pp < L; ++pp) {
                uint32_t key = (L <= REM_L_MAX)
                    ? (uint32_t)(L * (L - 1) / 2 + pp)
                    : (uint32_t)REM_L_MAX * (REM_L_MAX + 1) / 2;
                mag |= (bg((int)EvKind::REM, key) ? 1u : 0u)
                       << (L - 1 - pp);
            }
            out.push_back(neg ? -(int32_t)mag : (int32_t)mag);
            break;
        }
        case TokProfile::HYB_A:
        case TokProfile::HYB_B:
        case TokProfile::HYB_C: {
            int t_esc = hyb_t_esc(p);
            // TOKEN symbol via the decision tree (masses from the
            // transmitted symbol histogram; P(bit==0) = left mass).
            uint32_t node = 0, sym = 0;
            for (;;) {
                const TokenTree::Node& nd = tree.nodes[node];
                if (nd.hi - nd.lo <= 1) { sym = nd.lo; break; }
                uint32_t mid = nd.lo + (nd.hi - nd.lo) / 2;
                uint16_t right = token_right_mass(t, cl, tree, node);
                uint16_t left = (uint16_t)(4096u - (uint32_t)right);
                bool bit = getbin(p12_to_p16(left));
                node = bit ? 2 * node + 2 : 2 * node + 1;
            }
            if (sym == 0) { out.push_back(0); break; }
            bool neg = bg((int)EvKind::SIGN, 0);
            if (sym < (uint32_t)t_esc) {
                out.push_back(neg ? -(int32_t)sym : (int32_t)sym);
                break;
            }
            // Escape: continuation positions visit context min(pos, T_ESC-1)
            // progressively (D2 as amended); the terminator codes in
            // context min(q, T_ESC-1); low bits ride the raw region (D3).
            int q = 0;
            for (;;) {
                uint32_t ectx = (uint32_t)
                    ((p == TokProfile::HYB_A)
                         ? 0
                         : (q < t_esc ? q : t_esc - 1));
                bool term = bg((int)EvKind::ESCQ,
                               ectx * Q_POS_MAX +
                                   ((uint32_t)q < cap ? (uint32_t)q : cap));
                if (term) break;   // continuations code 0, terminator 1
                ++q;
            }
            uint32_t u = (uint32_t)t_esc - 1u +
                         ((1u << q) | graw((uint32_t)q));
            out.push_back(neg ? -(int32_t)u : (int32_t)u);
            break;
        }
        default:
            throw std::runtime_error("rans_decode_events: unknown profile");
        }
    }
    if (gi != nbins) throw std::runtime_error("sandbox: bin count mismatch");
    return out;
}

// ----- B-BAC (binary arithmetic, static probabilities) -----

std::vector<uint8_t> bac_encode_events(TokProfile,
                                       const std::vector<TaggedEvent>& ev,
                                       const SmoothedTables& t) {
    std::vector<BinReq> bins;
    std::vector<uint8_t> raw_packed;
    uint64_t raw_total = 0;
    plan_bins(ev, t, bins, raw_packed, raw_total);
    AEncoder enc;
    for (const BinReq& b : bins) enc.put_bin_raw(b.p16, b.bit);
    std::vector<uint8_t> body = enc.flush_and_emit();
    std::vector<uint8_t> out;
    out.insert(out.end(), BAC_MAGIC, BAC_MAGIC + 4);
    put_u32(out, (uint32_t)bins.size());
    put_u32(out, (uint32_t)body.size());
    out.insert(out.end(), body.begin(), body.end());
    put_u32(out, (uint32_t)raw_packed.size());
    out.insert(out.end(), raw_packed.begin(), raw_packed.end());
    return out;
}

std::vector<int32_t> bac_decode_events(TokProfile p, KeyingId kk, uint32_t w,
                                       size_t nres,
                                       const std::vector<uint8_t>& bytes,
                                       const SmoothedTables& t) {
    ClusterMap cm = (kk == KeyingId::KGRID128) ? cluster_map_grid(w)
                                               : cluster_map_keyed(kk);
    cm.w = w;    // context computation needs the position even for flats
    return bac_decode_events(p, cm, nres, bytes, t);
}

std::vector<int32_t> bac_decode_events(TokProfile p, const ClusterMap& cm,
                                       size_t nres,
                                       const std::vector<uint8_t>& bytes,
                                       const SmoothedTables& t) {
    if (bytes.size() < 16 || memcmp(bytes.data(), BAC_MAGIC, 4) != 0)
        throw std::runtime_error("sandbox: bad BAC payload");
    size_t pos = 4;
    uint32_t nbins = get_u32(bytes, pos);
    uint32_t blen = get_u32(bytes, pos);
    if (pos + blen + 4 > bytes.size())
        throw std::runtime_error("sandbox: truncated BAC payload");
    ADecoder dec;
    dec.init(bytes.data() + pos, blen);
    pos += blen;
    uint32_t rawlen = get_u32(bytes, pos);
    if (pos + rawlen > bytes.size())
        throw std::runtime_error("sandbox: truncated raw region");
    const uint8_t* rawp = bytes.data() + pos;

    uint32_t gi = 0;
    uint64_t rawpos = 0;
    TokenTree tree((uint32_t)t.tok_syms());
    std::vector<int32_t> out;
    out.reserve(nres);
    const uint32_t cap = Q_POS_MAX - 1;
    auto bg = [&](uint32_t cl, int kind, uint32_t key,
                  uint16_t p16) -> bool {
        if (gi >= nbins) throw std::runtime_error("sandbox: bin overrun");
        ++gi;
        return dec.get_bin_raw(p16);
    };
    auto btab = [&](uint32_t cl, int kind, uint32_t key) -> bool {
        return bg(cl, kind, key, p12_to_p16(t.at(cl, kind, key)));
    };
    for (size_t i = 0; i < nres; ++i) {
        uint32_t cl = cm.at(i, out);
        auto bnd = [&](int kind, uint32_t key) { return btab(cl, kind, key); };
        switch (p) {
        case TokProfile::ZFFCTRL: {
            if (bnd((int)EvKind::ZERO_FLAG, 0)) { out.push_back(0); break; }
            bool neg = bnd((int)EvKind::SIGN, 0);
            int L = 0;
            while (!bnd((int)EvKind::QPOS,
                        (uint32_t)L < cap ? (uint32_t)L : cap))
                ++L;
            uint32_t mag = 1u << L;
            for (int pp = 0; pp < L; ++pp) {
                uint32_t key = (L <= REM_L_MAX)
                    ? (uint32_t)(L * (L - 1) / 2 + pp)
                    : (uint32_t)REM_L_MAX * (REM_L_MAX + 1) / 2;
                mag |= (bnd((int)EvKind::REM, key) ? 1u : 0u)
                       << (L - 1 - pp);
            }
            out.push_back(neg ? -(int32_t)mag : (int32_t)mag);
            break;
        }
        case TokProfile::HYB_A:
        case TokProfile::HYB_B:
        case TokProfile::HYB_C: {
            int t_esc = hyb_t_esc(p);
            // TOKEN symbol via the decision tree (masses from the
            // transmitted symbol histogram; P(bit==0) = left mass).
            uint32_t node = 0, sym = 0;
            for (;;) {
                const TokenTree::Node& nd = tree.nodes[node];
                if (nd.hi - nd.lo <= 1) { sym = nd.lo; break; }
                uint32_t mid = nd.lo + (nd.hi - nd.lo) / 2;
                uint16_t right = token_right_mass(t, cl, tree, node);
                uint16_t left = (uint16_t)(4096u - (uint32_t)right);
                bool bit = bg(cl, (int)EvKind::TOKEN, node,
                              p12_to_p16(left));
                node = bit ? 2 * node + 2 : 2 * node + 1;
            }
            if (sym == 0) { out.push_back(0); break; }
            bool neg = bnd((int)EvKind::SIGN, 0);
            if (sym < (uint32_t)t_esc) {
                out.push_back(neg ? -(int32_t)sym : (int32_t)sym);
                break;
            }
            int q = 0;
            for (;;) {
                uint32_t ectx = (uint32_t)
                    ((p == TokProfile::HYB_A)
                         ? 0
                         : (q < t_esc ? q : t_esc - 1));
                bool term = bnd((int)EvKind::ESCQ,
                                ectx * Q_POS_MAX +
                                    ((uint32_t)q < cap ? (uint32_t)q : cap));
                if (term) break;   // continuations code 0, terminator 1
                ++q;
            }
            uint32_t v = 0;
            for (uint32_t b = 0; b < (uint32_t)q; ++b, ++rawpos) {
                uint32_t bit = (rawp[rawpos >> 3] >> (7 - (rawpos & 7))) & 1u;
                v |= bit << ((uint32_t)q - 1 - b);
            }
            uint32_t u = (uint32_t)t_esc - 1u + ((1u << q) | v);
            out.push_back(neg ? -(int32_t)u : (int32_t)u);
            break;
        }
        default:
            throw std::runtime_error("bac_decode_events: unknown profile");
        }
    }
    if (gi != nbins) throw std::runtime_error("sandbox: bin count mismatch");
    return out;
}

bool parse_backend(const std::string& s, int& out) {
    if (s == "B-IDEAL") { out = 0; return true; }
    if (s == "B-RANS") { out = 1; return true; }
    if (s == "B-BAC") { out = 2; return true; }
    if (s == "B-ADAPT") { out = 3; return true; }
    return false;
}

const char* backend_name(int b) {
    switch (b) {
        case 0: return "B-IDEAL";
        case 1: return "B-RANS";
        case 2: return "B-BAC";
        case 3: return "B-ADAPT";
    }
    return "?";
}

} // namespace prism::codec::sandbox
