#include "prism/codec/analyze.h"
#include "prism/codec/color.h"
#include "prism/codec/predict.h"
#include "prism/codec/squeeze.h"
#include "prism/codec/acoder.h"
#include "prism/codec/matree_builder.h"
#include "prism/bitstream.h"
#include <limits>
#include <algorithm>
#include <cmath>
#include <iostream>

namespace prism::codec {

namespace {

// ----- C3 trial-bits decision engine (blueprint section 5) -----
// Every analyzer decision compares real AEncoder outputs of the exact stream
// production emits (v2 flat coder over residual-DIFF-343 contexts), never
// energy sums. The banned proxy class (estimate_bits / plane energy sums) is
// deleted from these paths; it survives only in the legacy coupled
// squeeze+tree guard at effort >= 3 with a chosen squeeze level, which C4
// replaces wholesale.

// Blueprint 5.1: pruning grid is every 4th row/column; below 64 px per side
// the full image IS the cheap grid and pruning stays exact.
uint32_t prune_step_for(const Raster& r) {
    return (r.w >= 64 && r.h >= 64) ? 4u : 1u;
}

// Argmin over finalist indices by FULL cost. Scans ascending and takes strict
// improvement, except an exact tie lets the identity candidate win.
template <typename FullCost>
size_t trial_pick(const std::vector<size_t>& finals, size_t identity_index, FullCost&& cost_of) {
    size_t best = SIZE_MAX;
    double best_c = 0.0;
    for (size_t idx : finals) {
        double c = cost_of(idx);
        if (best == SIZE_MAX || c < best_c || (c == best_c && idx == identity_index)) {
            best = idx;
            best_c = c;
        }
    }
    return best;
}

} // namespace

Raster decimate_raster(const Raster& r, uint32_t step) {
    if (r.w == 0 || r.h == 0) throw std::invalid_argument("decimate_raster: empty raster");
    if (step < 2) return r;
    uint32_t nw = (r.w + step - 1) / step;
    uint32_t nh = (r.h + step - 1) / step;
    Raster out(nw, nh, r.ch, r.bd);
    for (size_t c = 0; c < r.num_channels(); ++c) {
        for (uint32_t y = 0; y < nh; ++y) {
            for (uint32_t x = 0; x < nw; ++x) {
                out.planes[c][(size_t)y * nw + x] =
                    r.planes[c][(size_t)(y * step) * r.w + x * step];
            }
        }
    }
    return out;
}

size_t trial_flat_bits(const Raster& r, PredId pred) {
    size_t tot = 0;
    for (const auto& pl : r.planes) {
        auto res = compute_residuals(pl, r.w, r.h, pred);
        tot += acoder_encode_plane_v2(res, r.w, r.h, AC_V2_RESDIFF_CONTEXTS).size();
    }
    return tot;
}

std::vector<size_t> trial_finalists(const std::vector<double>& prune_costs,
                                    size_t k, size_t identity_index) {
    if (k == 0) k = 1;
    std::vector<size_t> order(prune_costs.size());
    for (size_t i = 0; i < order.size(); ++i) order[i] = i;
    std::stable_sort(order.begin(), order.end(), [&](size_t a, size_t b) {
        if (prune_costs[a] != prune_costs[b]) return prune_costs[a] < prune_costs[b];
        return a < b;
    });
    std::vector<size_t> finals;
    finals.reserve(k + 1);
    for (size_t i = 0; i < order.size() && finals.size() < k; ++i) finals.push_back(order[i]);
    const bool has_identity =
        identity_index < prune_costs.size() &&
        std::find(finals.begin(), finals.end(), identity_index) != finals.end();
    if (!has_identity && identity_index < prune_costs.size()) {
        // I4: the do-nothing plan always reaches the final round. When the
        // budget is full, the worst non-identity finalist gives up its seat.
        if (finals.size() < k) finals.push_back(identity_index);
        else finals.back() = identity_index;
    }
    std::sort(finals.begin(), finals.end());
    return finals;
}

ColorTrialResult choose_color_transform_trial(const Raster& r, uint8_t effort) {
    ColorTrialResult out;
    out.raster = apply_color(r, ColorTransform::None, {});
    if (!(effort >= 1 && r.num_channels() >= 3)) return out;
    // Candidate set identical to the legacy B6 search.
    std::vector<ColorTransform> cands{ColorTransform::None};
    if (r.bd == BitDepth::BD8) {
        cands.push_back(ColorTransform::YCoCgR);
        cands.push_back(ColorTransform::SubtractGreen);
        cands.push_back(ColorTransform::YCoCgR_SubGreen);
        if (effort >= 2) cands.push_back(ColorTransform::Lift53);
    } else {
        cands.push_back(ColorTransform::SubtractGreen);
    }
    // Pruning round: real coded bytes on the decimated grid, MED as the fixed
    // reference predictor for every candidate (fair A-B).
    const Raster pruned = decimate_raster(r, prune_step_for(r));
    std::vector<double> pcost(cands.size(), 0.0);
    for (size_t ci = 0; ci < cands.size(); ++ci)
        pcost[ci] = (double)trial_flat_bits(apply_color(pruned, cands[ci], {}), PredId::MED);
    // Final round: full-resolution encodes; None (= index 0) always present.
    const std::vector<size_t> finals = trial_finalists(pcost, 3, 0);
    const size_t win = trial_pick(finals, 0, [&](size_t i) {
        return (double)trial_flat_bits(apply_color(r, cands[i], {}), PredId::MED);
    });
    if (win < cands.size()) {
        out.ct = cands[win];
        out.raster = apply_color(r, out.ct, {});
    }
    return out;
}

// LEGACY coupled-path cost helpers (effort >= 3 with a chosen squeeze level).
// These still rank by energy/log-mean proxies; the whole path is replaced in
// C4 (true lifting + per-plane L by trial bits) and is inert on photos
// (research F1: squeeze levels (0,0,0) on 24/24). Not used by any C3 decision.
static uint64_t plane_residual_energy(const std::vector<uint16_t>& plane,
                                       uint32_t w, uint32_t h, PredId id) {
    auto res = compute_residuals(plane, w, h, id);
    uint64_t sum = 0;
    for (int32_t v : res) sum += (uint64_t)std::abs(v);
    return sum;
}
static double estimate_bits(size_t n, uint64_t sumAbs) {
    if (n==0) return 0;
    double mean = (double)sumAbs / (double)n;
    double bps;
    if (mean < 0.5) bps = 0.5;
    else if (mean < 1.0) bps = 0.8;
    else bps = std::log2(mean + 1.0) + 1.2;
    return (double)n * bps;
}
// Cost for squeezed bands: LL uses predictor residual, HF uses sum abs of signed diff
static uint64_t squeezed_band_cost(const SqueezeResult::Band& b, bool isLL) {
    if (isLL) {
        return plane_residual_energy(b.data, b.w, b.h, PredId::MED);
    } else {
        uint64_t s=0;
        for (uint16_t v : b.data) {
            int16_t sv = (int16_t)v;
            s += (uint64_t)std::abs((int)sv);
            if (sv != 0) s += 1; // sign overhead
        }
        return s;
    }
}
static uint64_t squeezed_plane_cost(const SqueezeResult& sr) {
    uint64_t tot=0;
    for (size_t i=0;i<sr.bands.size();++i) {
        bool isLL = (i==0);
        tot += squeezed_band_cost(sr.bands[i], isLL);
    }
    return tot;
}

namespace {
// C4: REAL coded bytes for one squeezed band, a byte-mirror of prism.cpp
// encode_band_generic's plain v2 path under a single-leaf tree (leaf ids
// identically zero): MED residual over the band's own domain (unsigned for
// LL, signed-reinterpreted for HF), causal JPEG-LS-style features, v2 coder.
// Decisions may only use quantities production would actually emit (P4).
size_t trial_band_bits_v2(const std::vector<uint16_t>& data, uint32_t w, uint32_t h,
                          uint8_t band_class, bool isLL,
                          const std::vector<uint16_t>* llSrc,
                          const std::vector<uint16_t>* sibSrc,
                          uint8_t bit_depth) {
    if (w == 0 || h == 0) { AEncoder enc; return enc.flush_and_emit().size(); }
    size_t n = (size_t)w * h;
    std::vector<int32_t> residuals; residuals.reserve(n);
    std::vector<uint16_t> leaf_ids(n, 0);
    std::vector<int32_t> resHist(n, 0);
    for (size_t idx = 0; idx < n; ++idx) {
        uint32_t x = (uint32_t)(idx % w), y = (uint32_t)(idx / w);
        int32_t L, T, TL;
        if (isLL) {
            L = (x > 0) ? (int32_t)data[idx - 1] : 0;
            T = (y > 0) ? (int32_t)data[idx - w] : 0;
            TL = (x > 0 && y > 0) ? (int32_t)data[idx - w - 1] : 0;
        } else {
            L = (x > 0) ? (int16_t)data[idx - 1] : 0;
            T = (y > 0) ? (int16_t)data[idx - w] : 0;
            TL = (x > 0 && y > 0) ? (int16_t)data[idx - w - 1] : 0;
        }
        int32_t pred;
        if (TL >= std::max(L, T)) pred = std::min(L, T);
        else if (TL <= std::min(L, T)) pred = std::max(L, T);
        else pred = L + T - TL;
        int32_t sample = isLL ? (int32_t)data[idx] : (int16_t)data[idx];
        int32_t e = sample - pred;
        resHist[idx] = e;
        residuals.push_back(e);
    }
    (void)band_class; (void)llSrc; (void)sibSrc; (void)bit_depth;
    // Single-leaf tree: every feature collapses to leaf 0, so the coded
    // stream depends only on the residuals above - kept explicit for parity.
    return acoder_encode_plane_leaves_v2(residuals, leaf_ids, 1).size();
}

// Real coded bytes for coding `plane` squeezed to `levels` with true CDC
// lifting, including every band payload exactly as production would emit it.
size_t trial_squeeze_bits(const std::vector<uint16_t>& plane, uint32_t w, uint32_t h,
                          uint8_t levels, uint8_t bit_depth) {
    SqueezeResult sr = squeeze_encode_plane(plane, w, h, levels, bit_depth, true);
    auto chain = squeeze_ll_chain(plane, w, h, sr.levels, true);
    size_t tot = 0;
    for (size_t bi = 0; bi < sr.bands.size(); ++bi) {
        const auto& band = sr.bands[bi];
        bool isLL = (bi == 0);
        uint8_t bc = band.band_class;
        uint8_t lvl = bc >> 2;
        const std::vector<uint16_t>* llSrc =
            (!isLL && lvl < chain.size()) ? &chain[lvl] : nullptr;
        const std::vector<uint16_t>* sibSrc = nullptr;
        if (!isLL && bi >= 1) {
            uint8_t type = bc & 3;
            if (type == 2 || type == 3) sibSrc = &sr.bands[bi - 1].data;
        }
        tot += trial_band_bits_v2(band.data, band.w, band.h, bc, isLL, llSrc, sibSrc, bit_depth);
    }
    return tot;
}
} // namespace

std::vector<uint8_t> encode_plane_tree_v2(const std::vector<uint16_t>& data,
                                          uint32_t w, uint32_t h,
                                          const MATree& tree, int num_leaves,
                                          uint8_t bit_depth) {
    // One implementation for trial-bits acceptance (analyze) and final
    // emission (prism.cpp), so the decision can never diverge from the bytes.
    (void)bit_depth; // lossless residual domain needs no range clamp here
    if (w==0||h==0) { AEncoder enc; return enc.flush_and_emit(); }
    size_t n=(size_t)w*h;
    std::vector<int32_t> residuals; residuals.reserve(n);
    std::vector<uint16_t> leaf_ids; leaf_ids.reserve(n);
    std::vector<int32_t> resHist(n,0);
    for(size_t idx=0; idx<n; ++idx){
        uint32_t x=(uint32_t)(idx % w); uint32_t y=(uint32_t)(idx / w);
        int32_t L=0,T=0,TL=0,TR=0;
        L=(x>0)?(int32_t)data[idx-1]:0; T=(y>0)?(int32_t)data[idx-w]:0; TL=(x>0&&y>0)?(int32_t)data[idx-w-1]:0; TR=(y>0&&x+1<w)?(int32_t)data[idx-w+1]:0;
        int32_t pred; if(TL>=std::max(L,T)) pred=std::min(L,T); else if(TL<=std::min(L,T)) pred=std::max(L,T); else pred=L+T-TL;
        int32_t e=(int32_t)data[idx]-pred; resHist[idx]=e;
        Feature f{}; f.band_class=0; f.qg=quant_qg(L,T,TL,TR);
        int32_t dL=0,dU=0,dUL=0; if(x>0) dL=resHist[idx-1]; if(y>0) dU=resHist[idx-w]; if(x>0&&y>0) dUL=resHist[idx-w-1]; f.res_diff=(uint16_t)residual_diff_context(dL,dU,dUL);
        int grad=std::abs(L-TL)+std::abs(T-TL); if(grad<4) f.activity=0; else if(grad<16) f.activity=1; else if(grad<64) f.activity=2; else f.activity=3;
        uint16_t leaf=tree.eval(f); if(leaf >= (uint16_t)num_leaves) leaf=0;
        residuals.push_back(e); leaf_ids.push_back(leaf);
    }
    // uniform_priors: leaf ids carry no residual-diff semantics, so every
    // state starts at the neutral midpoint (C2; decode selects the same rule
    // from container flags bit4).
    return acoder_encode_plane_leaves_v2(residuals, leaf_ids, num_leaves, true);
}

namespace {

// Causal raster walk shared by every plane-level tree coder (leaf-only and
// composite, encode and decode). Per sample it computes the MED prediction,
// the spatial feature vector, and the tree leaf from strictly causal data,
// then calls body(idx, pred, f, leaf, data) which must return the residual:
// encode bodies derive e from the source sample already in data[idx];
// decode bodies decode e and store the reconstructed sample into data[idx].
template <typename Body>
inline void walk_tree_plane(std::vector<uint16_t>& data, uint32_t w, uint32_t h,
                            const MATree& tree, int num_leaves, Body&& body) {
    if (w == 0 || h == 0) return;
    size_t n = (size_t)w * h;
    data.resize(n);
    std::vector<int32_t> resHist(n, 0);
    for (size_t idx = 0; idx < n; ++idx) {
        uint32_t x = (uint32_t)(idx % w);
        uint32_t y = (uint32_t)(idx / w);
        int32_t L = 0, T = 0, TL = 0, TR = 0;
        L = (x > 0) ? (int32_t)data[idx - 1] : 0;
        T = (y > 0) ? (int32_t)data[idx - w] : 0;
        TL = (x > 0 && y > 0) ? (int32_t)data[idx - w - 1] : 0;
        TR = (y > 0 && x + 1 < w) ? (int32_t)data[idx - w + 1] : 0;
        int32_t pred;
        if (TL >= std::max(L, T)) pred = std::min(L, T);
        else if (TL <= std::min(L, T)) pred = std::max(L, T);
        else pred = L + T - TL;
        Feature f{};
        f.band_class = 0;
        f.qg = quant_qg(L, T, TL, TR);
        int32_t dL = 0, dU = 0, dUL = 0;
        if (x > 0) dL = resHist[idx - 1];
        if (y > 0) dU = resHist[idx - w];
        if (x > 0 && y > 0) dUL = resHist[idx - w - 1];
        f.res_diff = (uint16_t)residual_diff_context(dL, dU, dUL);
        int grad = std::abs(L - TL) + std::abs(T - TL);
        if (grad < 4) f.activity = 0; else if (grad < 16) f.activity = 1;
        else if (grad < 64) f.activity = 2; else f.activity = 3;
        uint16_t leaf = tree.eval(f);
        if (num_leaves <= 0) num_leaves = 1;
        if (leaf >= (uint16_t)num_leaves) leaf = 0;
        resHist[idx] = body(idx, pred, f, leaf, data);
    }
}

} // namespace

MATree build_spatial_flat_tree(const Raster& raster) {
    // Verbatim feature collection previously inline in analyze(): one dataset
    // over all planes, MED residuals, band_class 0, no ll/sibling sources.
    std::vector<Feature> sfeats;
    std::vector<int32_t> sres;
    size_t totalSamples = 0;
    for (size_t pi = 0; pi < raster.planes.size(); ++pi)
        totalSamples += (size_t)raster.w * raster.h;
    sfeats.reserve(totalSamples);
    sres.reserve(totalSamples);
    for (size_t pi = 0; pi < raster.planes.size(); ++pi) {
        const auto& plane = raster.planes[pi];
        uint32_t w = raster.w, h = raster.h;
        size_t n = (size_t)w * h;
        std::vector<int32_t> resHist(n, 0);
        for (size_t idx = 0; idx < n; ++idx) {
            uint32_t x = (uint32_t)(idx % w), y = (uint32_t)(idx / w);
            int32_t L = (x > 0) ? (int32_t)plane[idx - 1] : 0;
            int32_t T = (y > 0) ? (int32_t)plane[idx - w] : 0;
            int32_t TL = (x > 0 && y > 0) ? (int32_t)plane[idx - w - 1] : 0;
            int32_t TR = (y > 0 && x + 1 < w) ? (int32_t)plane[idx - w + 1] : 0;
            int32_t pred;
            if (TL >= std::max(L, T)) pred = std::min(L, T);
            else if (TL <= std::min(L, T)) pred = std::max(L, T);
            else pred = L + T - TL;
            int32_t e = (int32_t)plane[idx] - pred;
            resHist[idx] = e;
            Feature f{};
            f.band_class = 0;
            f.qg = quant_qg(L, T, TL, TR);
            int32_t dL = 0, dU = 0, dUL = 0;
            if (x > 0) dL = resHist[idx - 1];
            if (y > 0) dU = resHist[idx - w];
            if (x > 0 && y > 0) dUL = resHist[idx - w - 1];
            f.res_diff = (uint16_t)residual_diff_context(dL, dU, dUL);
            int grad = std::abs(L - TL) + std::abs(T - TL);
            if (grad < 4) f.activity = 0; else if (grad < 16) f.activity = 1;
            else if (grad < 64) f.activity = 2; else f.activity = 3;
            sfeats.push_back(f);
            sres.push_back(e);
        }
    }
    MATree stree = MATree::single_leaf();
    if (!sfeats.empty()) stree = build_matree_greedy(sfeats, sres, MatreeBuildParams{});
    return stree;
}

std::vector<uint8_t> encode_plane_tree_composite_v2(const std::vector<uint16_t>& plane,
                                                    uint32_t w, uint32_t h,
                                                    const MATree& tree, int num_leaves,
                                                    uint8_t bit_depth) {
    (void)bit_depth; // lossless residual domain needs no range clamp here
    if (w == 0 || h == 0) { AEncoder enc; return enc.flush_and_emit(); }
    size_t n = (size_t)w * h;
    std::vector<int32_t> residuals(n, 0);
    ACModelsV2 models((num_leaves > 0 ? num_leaves : 1) * AC_V2_RESDIFF_CONTEXTS);
    AEncoder enc;
    std::vector<uint16_t> data = plane;
    walk_tree_plane(data, w, h, tree, num_leaves,
                    [&](size_t idx, int32_t pred, const Feature& f, uint16_t leaf,
                        std::vector<uint16_t>& dat) -> int32_t {
                        int32_t e = (int32_t)dat[idx] - pred;
                        residuals[idx] = e;
                        encode_residual_v2(enc, models,
                                           (int)leaf * AC_V2_RESDIFF_CONTEXTS + (int)f.res_diff, e);
                        return e;
                    });
    return enc.flush_and_emit();
}

std::vector<uint16_t> decode_plane_tree_composite_v2(const std::vector<uint8_t>& bytes,
                                                     uint32_t w, uint32_t h,
                                                     const MATree& tree, int num_leaves,
                                                     uint8_t bit_depth, uint16_t bd_max) {
    (void)bit_depth;
    if (w == 0 || h == 0) return {};
    if (bytes.empty()) throw DecodeError("empty composite tree payload");
    ACModelsV2 models((num_leaves > 0 ? num_leaves : 1) * AC_V2_RESDIFF_CONTEXTS);
    ADecoder dec;
    dec.init(bytes);
    std::vector<uint16_t> out;
    walk_tree_plane(out, w, h, tree, num_leaves,
                    [&](size_t idx, int32_t pred, const Feature& f, uint16_t leaf,
                        std::vector<uint16_t>& dat) -> int32_t {
                        (void)idx;
                        int32_t e = decode_residual_v2(dec, models,
                                                       (int)leaf * AC_V2_RESDIFF_CONTEXTS + (int)f.res_diff);
                        int32_t s = pred + e;
                        if (s < 0) s = 0;
                        if (s > bd_max) s = bd_max;
                        dat[idx] = (uint16_t)s;
                        return e;
                    });
    return out;
}

AnalyzeResult analyze(const Raster& r, uint8_t effort) {
    AnalyzeResult res;
    res.cfl_scales.assign(std::max(0, (int)r.num_channels() - 1), 0);
    res.squeeze_levels.assign(r.num_channels(), 0);
    MATreeGroup g;
    g.group_id = 0;
    g.band_class = 0;
    g.tree = MATree::single_leaf();
    res.trees.push_back(g);

    // ---- B6/C3: color transform by TRIAL BITS ----
    // Candidates are pruned on a decimated grid (real coded bytes) and the
    // finalists plus the identity (None) are fully encoded with the real v2
    // flat coder - the same bytes the pipeline will emit. Energy sums no
    // longer decide anything here (P4); ties keep None.
    std::vector<uint8_t> zero_cfl(res.cfl_scales.size(), 0);
    ColorTrialResult ctr = choose_color_transform_trial(r, effort);
    ColorTransform best_ct = ctr.ct;
    Raster best_raster = std::move(ctr.raster);
    res.color_transform_id = static_cast<uint8_t>(best_ct);

    // ---- B6/C3: CFL scales by TRIAL BITS (per channel, greedy) ----
    // Each scale touches only its own chroma channel, so per-channel greedy
    // is exact. Candidates s = 0..7 are pruned on decimated single-plane
    // coded bytes; s = 0 (identity) plus the two cheapest go to full-plane
    // encodes; ties keep 0.
    if (effort >= 2 && r.num_channels() >= 2 && best_ct != ColorTransform::Lift53
        && best_ct != ColorTransform::YCoCgR && best_ct != ColorTransform::YCoCgR_SubGreen) {
        const uint32_t pstep = prune_step_for(r);
        for (size_t ci = 1; ci < best_raster.num_channels(); ++ci) {
            if (best_raster.ch == Channels::RGBA && ci == 3) continue;
            if (best_raster.ch == Channels::GA && ci == 1) continue;
            size_t si = ci - 1;
            if (si >= res.cfl_scales.size()) continue;
            std::vector<double> pcost(8, 0.0);
            for (uint8_t s = 0; s <= 7; ++s) {
                std::vector<uint8_t> ts = res.cfl_scales;
                ts[si] = s;
                Raster tr = decimate_raster(apply_color(r, best_ct, ts), pstep);
                auto rv = compute_residuals(tr.planes[ci], tr.w, tr.h, PredId::MED);
                pcost[s] = (double)acoder_encode_plane_v2(rv, tr.w, tr.h, AC_V2_RESDIFF_CONTEXTS).size();
            }
            const std::vector<size_t> finals = trial_finalists(pcost, 3, 0);
            const size_t win = trial_pick(finals, 0, [&](size_t i) {
                std::vector<uint8_t> ts = res.cfl_scales;
                ts[si] = (uint8_t)i;
                Raster tr = apply_color(r, best_ct, ts);
                auto rv = compute_residuals(tr.planes[ci], tr.w, tr.h, PredId::MED);
                return (double)acoder_encode_plane_v2(rv, tr.w, tr.h, AC_V2_RESDIFF_CONTEXTS).size();
            });
            res.cfl_scales[si] = (uint8_t)win;
        }
        best_raster = apply_color(r, best_ct, res.cfl_scales);
    } else {
        res.cfl_scales.assign(std::max(0, (int)r.num_channels() - 1), 0);
    }

    // Predictor bank selection (B5/B6, C3): P0..P8 ranked by REAL coded
    // bytes. All nine ids are pruned on the decimated grid; the three
    // cheapest plus MED (the identity) go to full flat encodes - the exact
    // payload prism.cpp will emit for level-0 planes.
    const Raster& eval_raster = best_raster;
    PredId global_best = PredId::MED;
    if (effort >= 1 && !eval_raster.planes.empty()) {
        const Raster pruned = decimate_raster(eval_raster, prune_step_for(eval_raster));
        std::vector<double> pcost(9, 0.0);
        for (int pid = 0; pid <= 8; ++pid)
            pcost[pid] = (double)trial_flat_bits(pruned, static_cast<PredId>(pid));
        const std::vector<size_t> finals = trial_finalists(pcost, 3, (size_t)PredId::MED);
        const size_t win = trial_pick(finals, (size_t)PredId::MED, [&](size_t i) {
            return (double)trial_flat_bits(eval_raster, static_cast<PredId>((uint8_t)i));
        });
        global_best = static_cast<PredId>((uint8_t)win);
        res.predictor_mode = 0;
        res.global_pred_id = static_cast<uint8_t>(global_best);
    } else {
        res.predictor_mode = 0;
        res.global_pred_id = 3;
    }

    // ---- B7: Squeeze + MA-tree coupled (effort >=3) ----
    if (effort >= 3 && r.bd == BitDepth::BD8) {
        uint8_t bd_val = 8;
        // C4: per-plane squeeze levels chosen by REAL coded bytes of the
        // exact lifting-band payloads production would emit, against the
        // flat v2 baseline production does emit - never by energy proxies.
        // L=0 stays on ties (never-expand, I4).
        std::vector<uint8_t> chosen_levels(r.num_channels(), 0);
        uint64_t cost_no_squeeze = 0;
        PredId spred = static_cast<PredId>(res.global_pred_id);
        if ((uint8_t)spred > 8) spred = PredId::MED;
        for (size_t pi=0; pi<eval_raster.planes.size(); ++pi) {
            if (eval_raster.ch == Channels::RGBA && pi==3) { chosen_levels[pi]=0; continue; }
            uint32_t w = eval_raster.w, h = eval_raster.h;
            uint8_t maxL = max_squeeze_levels(w, h);
            const auto& plane = eval_raster.planes[pi];
            auto flatRes = compute_residuals(plane, w, h, spred);
            size_t bestC = acoder_encode_plane_v2(flatRes, w, h, AC_V2_RESDIFF_CONTEXTS).size();
            cost_no_squeeze += bestC;
            uint8_t bestL = 0;
            for (uint8_t L=1; L<=maxL; ++L) {
                size_t c = trial_squeeze_bits(plane, w, h, L, bd_val);
                if (c < bestC) { bestC = c; bestL = L; }
            }
            chosen_levels[pi] = bestL;
        }

        // ---- C2: MA-tree always-on (issue #130, blueprint section 4) ----
        // When the energy search chose no squeeze anywhere (the photo case,
        // research finding F1), the tree is built on SPATIAL residual
        // features of every plane - it can no longer be disabled by a
        // transform decision. Acceptance is trial-bits only (never-expand,
        // I4): tree payloads plus serialized model bytes must beat the flat
        // v2 coding of the same planes. The hasLevels guard is gone.
        bool anyLevel = false;
        for (uint8_t v : chosen_levels) if (v > 0) anyLevel = true;
        if (!anyLevel) {
            const uint8_t bd8 = 8;
            // One shared implementation for analyzer, acceptance trial, and
            // probe rail - the inline duplicate was removed (review F4) so
            // every consumer measures the same tree.
            MATree stree = build_spatial_flat_tree(eval_raster);
            if (stree.num_leaves > 1) {
                // Trial-bits acceptance on the FULL image with the real coder.
                PredId spred = static_cast<PredId>(res.global_pred_id);
                if ((uint8_t)spred > 8) spred = PredId::MED;
                size_t flat_total = 0, tree_total = 0;
                for (size_t pi=0; pi<eval_raster.planes.size(); ++pi) {
                    const auto& plane = eval_raster.planes[pi];
                    auto residuals = compute_residuals(plane, eval_raster.w, eval_raster.h, spred);
                    flat_total += acoder_encode_plane_v2(residuals, eval_raster.w, eval_raster.h, 343).size();
                    tree_total += encode_plane_tree_v2(plane, eval_raster.w, eval_raster.h,
                                                       stree, stree.num_leaves, bd8).size();
                }
                BitWriter tbw;
                stree.serialize(tbw);
                tree_total += tbw.flush().size(); // serialized model bytes count (I4)
                if (tree_total < flat_total) {
                    res.squeeze_levels.assign(r.num_channels(), 0);
                    res.trees.clear();
                    MATreeGroup gg; gg.group_id=0; gg.band_class=0; gg.tree=stree;
                    res.trees.push_back(gg);
                    res.predictor_mode = 0;
                    res.global_pred_id = static_cast<uint8_t>(global_best);
                    res.tree_on_flat = true;
                    return res;
                }
            }
            // Tree rejected or trivial: fall through with single leaf + zero levels.
            res.squeeze_levels.assign(r.num_channels(), 0);
            res.trees.clear();
            MATreeGroup gg; gg.group_id=0; gg.band_class=0; gg.tree=MATree::single_leaf();
            res.trees.push_back(gg);
            res.predictor_mode = 0;
            res.global_pred_id = static_cast<uint8_t>(global_best);
            return res;
        }

        // Legacy coupled path (some plane squeezes at this effort): the C4
        // transform (true CDC lifting) and trial-bits levels feed it; its
        // internal band-tree guard stays as documented until C5.
        // Build squeezed results for chosen levels to collect dataset for MA-tree
        struct PlaneSqueeze { SqueezeResult sr; std::vector<std::vector<uint16_t>> llPlanes; };
        std::vector<PlaneSqueeze> planeSqueezes;
        planeSqueezes.reserve(eval_raster.planes.size());
        uint64_t cost_squeeze_flat = 0;
        for (size_t pi=0; pi<eval_raster.planes.size(); ++pi) {
            if (eval_raster.ch == Channels::RGBA && pi==3) {
                SqueezeResult sr; SqueezeResult::Band b; b.w=eval_raster.w; b.h=eval_raster.h; b.data=eval_raster.planes[pi]; b.band_class=0; sr.bands.push_back(b); sr.levels=0;
                planeSqueezes.push_back({sr, {}});
                cost_squeeze_flat += squeezed_plane_cost(sr);
                continue;
            }
            uint8_t L = chosen_levels[pi];
            const auto& plane = eval_raster.planes[pi];
            SqueezeResult sr = squeeze_encode_plane(plane, eval_raster.w, eval_raster.h, L, bd_val, true);
            // per-level LL chain for llc features (lifting averages)
            std::vector<std::vector<uint16_t>> llPlanes =
                squeeze_ll_chain(plane, eval_raster.w, eval_raster.h, L, true);
            // llPlanes size == L, index 0 = LL1 (after lvl0), etc. For HF at lvl, its LL is llPlanes[lvl]
            // But our squeezed cost already includes HF raw, we have tot
            cost_squeeze_flat += squeezed_plane_cost(sr);
            planeSqueezes.push_back({sr, llPlanes});
        }

        // Collect dataset for MA-tree
        std::vector<Feature> feats;
        std::vector<int32_t> residuals;
        // estimate total samples
        size_t totalSamples=0;
        for (auto& ps: planeSqueezes) for(auto& b: ps.sr.bands) totalSamples+= b.data.size();
        feats.reserve(totalSamples);
        residuals.reserve(totalSamples);

        for (size_t pi=0; pi<planeSqueezes.size(); ++pi) {
            const auto& ps = planeSqueezes[pi];
            const auto& sr = ps.sr;
            const auto& llPlanes = ps.llPlanes;
            // (sr.levels used via band_class lvlTag)
            // For sibling, need to keep per level HF values
            // Build map level -> HF vectors for sibling lookup
            // sr bands post-order: [LL_L, HF_{L-1}H, HF_{L-1}V, HF_{L-1}D, ..., HF0H,HF0V,HF0D]
            // So to get sibling for band at position idx, we need level
            for (size_t bi=0; bi<sr.bands.size(); ++bi) {
                const auto& band = sr.bands[bi];
                uint32_t w = band.w, h = band.h;
                if (w==0||h==0) continue;
                bool isLL = (bi==0);
                uint8_t lvlTag = 0;
                uint8_t type = 0;
                if (!isLL) {
                    lvlTag = band.band_class >> 2;
                    type = band.band_class & 3;
                }
                // For this band, decode sibling source if HF
                const std::vector<uint16_t>* siblingSrc = nullptr;
                if (!isLL) {
                    if (type==2) { // V sibling is H at same level
                        // find H band at same level: predecessor is H
                        // Bands at same level are consecutive H,V,D in order emitted deepest first.
                        // So for this bi, H is bi-1
                        if (bi>=1) siblingSrc = &sr.bands[bi-1].data;
                    } else if (type==3) { // D sibling is V
                        if (bi>=1) siblingSrc = &sr.bands[bi-1].data;
                    }
                }
                // For llc, need level's LL
                const std::vector<uint16_t>* llSrc = nullptr;
                if (!isLL && lvlTag < llPlanes.size()) {
                    llSrc = &llPlanes[lvlTag];
                }
                // Iterate samples
                // Need residual neighbor history per band
                std::vector<int32_t> bandResiduals(w*h, 0);
                for (uint32_t y=0; y<h; ++y) {
                    for (uint32_t x=0; x<w; ++x) {
                        size_t idx = (size_t)y*w + x;
                        uint16_t sample = band.data[idx];
                        // compute predictor for residual: for LL, use MED on unsigned; for HF, predictor on signed? For dataset we use MED on the band's domain as stored (unsigned for LL, signed diff wrapped for HF). For HF, the raw diff values are already small, MED will predict ~0? We'll just use 0 predictor for HF to estimate, but use MED for uniform.
                        int32_t L = 0, T=0, TL=0, TR=0;
                        if (isLL) {
                            int32_t s = (int32_t)sample;
                            L = (x>0)? (int32_t)band.data[idx-1]:0;
                            T = (y>0)? (int32_t)band.data[idx-w]:0;
                            TL=(x>0&&y>0)?(int32_t)band.data[idx-w-1]:0;
                            TR=(y>0&&x+1<w)?(int32_t)band.data[idx-w+1]:0;
                            (void)s;
                        } else {
                            // HF signed values
                            int16_t sv = (int16_t)sample;
                            int16_t l = (x>0)? (int16_t)band.data[idx-1]:0;
                            int16_t t = (y>0)? (int16_t)band.data[idx-w]:0;
                            int16_t tl=(x>0&&y>0)?(int16_t)band.data[idx-w-1]:0;
                            int16_t tr=(y>0&&x+1<w)?(int16_t)band.data[idx-w+1]:0;
                            L=l; T=t; TL=tl; TR=tr;
                            (void)sv;
                        }
                        int32_t pred = 0;
                        // Use MED for both
                        if (TL >= std::max(L,T)) pred = std::min(L,T);
                        else if (TL <= std::min(L,T)) pred = std::max(L,T);
                        else pred = L + T - TL;

                        int32_t e;
                        if (isLL) e = (int32_t)sample - pred;
                        else {
                            int16_t sv = (int16_t)sample;
                            e = (int32_t)sv - pred;
                        }
                        bandResiduals[idx]=e;

                        Feature f{};
                        f.band_class = band.band_class;
                        // qg
                        f.qg = quant_qg(L,T,TL,TR);
                        // llc_class
                        if (!isLL && llSrc) {
                            uint16_t lv = (*llSrc)[idx];
                            f.llc_class = quant_llc(lv, bd_val);
                        } else f.llc_class = 0;
                        // res_diff
                        int32_t dL=0,dU=0,dUL=0;
                        if (x>0) dL = bandResiduals[idx-1];
                        if (y>0) dU = bandResiduals[idx-w];
                        if (x>0&&y>0) dUL = bandResiduals[idx-w-1];
                        f.res_diff = (uint16_t)residual_diff_context(dL,dU,dUL);
                        // sibling_class
                        if (siblingSrc) {
                            int16_t sv = (int16_t)(*siblingSrc)[idx];
                            f.sibling_class = quant_sibling(sv);
                        } else f.sibling_class = 0;
                        // activity
                        int grad = std::abs(L - TL) + std::abs(T - TL);
                        if (grad < 4) f.activity = 0;
                        else if (grad < 16) f.activity = 1;
                        else if (grad < 64) f.activity = 2;
                        else f.activity = 3;

                        feats.push_back(f);
                        residuals.push_back(e);
                    }
                }
            }
        }

        // Build MA-tree
        // Legacy coupled path keeps its historical caps (pre-C2 behavior).
        MatreeBuildParams params; params.max_depth = 4; params.max_leaves = 16; params.min_samples_per_leaf = 32;
        MATree tree = MATree::single_leaf();
        if (!feats.empty() && totalSamples >= 64) {
            tree = build_matree_greedy(feats, residuals, params);
        }
        // Estimate costs for guard using entropy estimate (log mean) rather than raw sum, so that leaf partitioning shows gain
        size_t n_no = 0;
        for (size_t c=0;c<eval_raster.num_channels();++c) {
            if (eval_raster.ch==Channels::RGBA && c==3) continue;
            n_no += (size_t)eval_raster.w * eval_raster.h;
        }
        double bits_no = estimate_bits(n_no, cost_no_squeeze);
        double bits_flat = estimate_bits(totalSamples, cost_squeeze_flat);
        double bits_tree = bits_flat;
        if (tree.num_leaves > 1) {
            std::vector<uint64_t> leafSum(tree.num_leaves, 0);
            std::vector<size_t> leafCnt(tree.num_leaves,0);
            for (size_t i=0;i<feats.size();++i) {
                uint16_t leaf = tree.eval(feats[i]);
                if (leaf >= tree.num_leaves) leaf=0;
                leafSum[leaf] += (uint64_t)std::abs(residuals[i]) + (residuals[i]!=0?1:0);
                leafCnt[leaf]++;
            }
            bits_tree = 0;
            for (size_t li=0; li<leafSum.size(); ++li) {
                bits_tree += estimate_bits(leafCnt[li], leafSum[li]);
            }
            bits_tree += (double)tree.nodes.size()*8; // overhead bits
        }

        auto evalGuard = [&](const MATree& t, double ct, double cf, double cn, const std::vector<uint8_t>& lv)->bool{
            bool gp = (ct < cn) && (ct < cf);
            bool hasLLC=false,hasSib=false;
            for(auto &n: t.nodes) if(!n.is_leaf){ if(n.prop==PropId::LlcClass) hasLLC=true; if(n.prop==PropId::SiblingClass) hasSib=true;}
            bool hasLevels=false; for(auto v: lv) if(v>0) hasLevels=true;
            if(hasLevels && t.num_leaves>1 && !hasLLC && !hasSib) gp=false;
            return gp && hasLevels;
        };
        bool guardPass = evalGuard(tree, bits_tree, bits_flat, bits_no, chosen_levels);
        if (guardPass) {
            res.squeeze_levels = chosen_levels;
            res.trees.clear();
            MATreeGroup gg; gg.group_id=0; gg.band_class=0; gg.tree = tree;
            res.trees.push_back(gg);
            res.predictor_mode = 0;
            res.global_pred_id = static_cast<uint8_t>(global_best);
        } else {
            // Fallback: try forcing 1 level where possible, rebuild dataset/tree and re-evaluate guard.
            // This attempts to make Squeeze non-inert when flat heuristic was too pessimistic.
            bool triedForce=false;
            std::vector<uint8_t> forced_levels(r.num_channels(),0);
            for(size_t pi=0; pi<eval_raster.planes.size(); ++pi){
                if(eval_raster.ch==Channels::RGBA && pi==3) continue;
                uint8_t maxL = max_squeeze_levels(eval_raster.w, eval_raster.h);
                if(maxL>0) { forced_levels[pi]=1; triedForce=true; }
            }
            if(triedForce){
                // Rebuild planeSqueezes for forced levels
                std::vector<PlaneSqueeze> fPlaneSqueezes;
                fPlaneSqueezes.reserve(eval_raster.planes.size());
                uint64_t f_cost_flat=0;
                uint64_t f_cost_no = cost_no_squeeze;
                for(size_t pi=0; pi<eval_raster.planes.size(); ++pi){
                    if(eval_raster.ch==Channels::RGBA && pi==3){
                        SqueezeResult sr; SqueezeResult::Band b; b.w=eval_raster.w; b.h=eval_raster.h; b.data=eval_raster.planes[pi]; b.band_class=0; sr.bands.push_back(b); sr.levels=0;
                        fPlaneSqueezes.push_back({sr, {}});
                        f_cost_flat += squeezed_plane_cost(sr);
                        continue;
                    }
                    uint8_t L = forced_levels[pi];
                    const auto& plane = eval_raster.planes[pi];
                    SqueezeResult sr = squeeze_encode_plane(plane, eval_raster.w, eval_raster.h, L, bd_val, true);
                    // per-level LL chain for llc features (lifting averages)
                    std::vector<std::vector<uint16_t>> llP =
                        squeeze_ll_chain(plane, eval_raster.w, eval_raster.h, L, true);
                    f_cost_flat += squeezed_plane_cost(sr);
                    fPlaneSqueezes.push_back({sr, llP});
                }
                // Collect dataset for forced
                std::vector<Feature> ffeats; std::vector<int32_t> fresids; ffeats.reserve(totalSamples); fresids.reserve(totalSamples);
                for(size_t pi=0; pi<fPlaneSqueezes.size(); ++pi){
                    const auto& ps=fPlaneSqueezes[pi]; const auto& sr=ps.sr; const auto& llP=ps.llPlanes;
                    for(size_t bi=0; bi<sr.bands.size(); ++bi){
                        const auto& band=sr.bands[bi]; uint32_t w=band.w,h=band.h; if(w==0||h==0) continue;
                        bool isLL=(bi==0); uint8_t lvlTag=0,type=0; if(!isLL){ lvlTag=band.band_class>>2; type=band.band_class&3; }
                        const std::vector<uint16_t>* sib=nullptr; if(!isLL){ if(type==2 && bi>=1) sib=&sr.bands[bi-1].data; else if(type==3 && bi>=1) sib=&sr.bands[bi-1].data; }
                        const std::vector<uint16_t>* llSrc=nullptr; if(!isLL && lvlTag<llP.size()) llSrc=&llP[lvlTag];
                        std::vector<int32_t> br(w*h,0);
                        for(uint32_t y=0;y<h;++y) for(uint32_t x=0;x<w;++x){
                            size_t idx=(size_t)y*w+x; uint16_t s=band.data[idx];
                            int32_t L=0,T=0,TL=0,TR=0;
                            if(isLL){ L=(x>0)?(int32_t)band.data[idx-1]:0; T=(y>0)?(int32_t)band.data[idx-w]:0; TL=(x>0&&y>0)?(int32_t)band.data[idx-w-1]:0; TR=(y>0&&x+1<w)?(int32_t)band.data[idx-w+1]:0; }
                            else { int16_t sv=(int16_t)s; int16_t l=(x>0)?(int16_t)band.data[idx-1]:0; int16_t t=(y>0)?(int16_t)band.data[idx-w]:0; int16_t tl=(x>0&&y>0)?(int16_t)band.data[idx-w-1]:0; int16_t tr=(y>0&&x+1<w)?(int16_t)band.data[idx-w+1]:0; L=l;T=t;TL=tl;TR=tr; (void)sv; }
                            int32_t pred; if(TL>=std::max(L,T)) pred=std::min(L,T); else if(TL<=std::min(L,T)) pred=std::max(L,T); else pred=L+T-TL;
                            int32_t e = isLL ? (int32_t)s - pred : (int32_t)(int16_t)s - pred; br[idx]=e;
                            Feature f{}; f.band_class=band.band_class; f.qg=quant_qg(L,T,TL,TR);
                            if(!isLL && llSrc) f.llc_class=quant_llc((*llSrc)[idx], bd_val); else f.llc_class=0;
                            int32_t dL=0,dU=0,dUL=0; if(x>0) dL=br[idx-1]; if(y>0) dU=br[idx-w]; if(x>0&&y>0) dUL=br[idx-w-1]; f.res_diff=(uint16_t)residual_diff_context(dL,dU,dUL);
                            if(sib){ int16_t sv=(int16_t)(*sib)[idx]; f.sibling_class=quant_sibling(sv);} else f.sibling_class=0;
                            int grad=std::abs(L-TL)+std::abs(T-TL); if(grad<4) f.activity=0; else if(grad<16) f.activity=1; else if(grad<64) f.activity=2; else f.activity=3;
                            ffeats.push_back(f); fresids.push_back(e);
                        }
                    }
                }
                MATree ftree = MATree::single_leaf();
                if(!ffeats.empty() && ffeats.size()>=64) ftree = build_matree_greedy(ffeats, fresids, params);
                double f_bits_flat = estimate_bits(ffeats.size(), f_cost_flat);
                double f_bits_no = estimate_bits(n_no, f_cost_no);
                double f_bits_tree = f_bits_flat;
                if(ftree.num_leaves>1){
                    std::vector<uint64_t> lsum(ftree.num_leaves,0); std::vector<size_t> lcnt(ftree.num_leaves,0);
                    for(size_t i=0;i<ffeats.size();++i){ uint16_t leaf=ftree.eval(ffeats[i]); if(leaf>=ftree.num_leaves) leaf=0; lsum[leaf]+= (uint64_t)std::abs(fresids[i]) + (fresids[i]!=0?1:0); lcnt[leaf]++; }
                    f_bits_tree=0; for(size_t li=0;li<lsum.size();++li) f_bits_tree+= estimate_bits(lcnt[li], lsum[li]);
                    f_bits_tree += (double)ftree.nodes.size()*8;
                }
                if(evalGuard(ftree, f_bits_tree, f_bits_flat, f_bits_no, forced_levels)){
                    res.squeeze_levels = forced_levels;
                    res.trees.clear(); MATreeGroup gg; gg.group_id=0; gg.band_class=0; gg.tree=ftree; res.trees.push_back(gg);
                    res.predictor_mode=0; res.global_pred_id=static_cast<uint8_t>(global_best);
                    return res;
                }
            }
            // No squeeze or inert -> fallback to single leaf, levels 0
            res.squeeze_levels.assign(r.num_channels(), 0);
            res.trees.clear();
            MATreeGroup gg; gg.group_id=0; gg.band_class=0; gg.tree = MATree::single_leaf();
            res.trees.push_back(gg);
            res.predictor_mode = 0;
            res.global_pred_id = static_cast<uint8_t>(global_best);
        }
    }
    return res;
}

} // namespace prism::codec
