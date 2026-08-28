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
    // LEGACY candidate set exactly as shipped before D4c. The D4c rotation
    // family is NOT trialed here: this function's metric is MED-coded flat
    // bits of the bare transform, which cannot see the anchor's downstream
    // advantages (CFL composition, predictor-bank fit). A combined list was
    // measured regressing kodim18 +0.25 percent of final file size. Stage 2
    // lives at the END of analyze() instead, where the anchor's production
    // raster and decided predictor already exist.
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

// (The legacy coupled-path energy proxies - plane_residual_energy,
// estimate_bits, squeezed_band_cost, squeezed_plane_cost - were retired with
// the path itself in C5; acceptance now lives only in the trial-bits engine.)

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
                          uint8_t bit_depth,
                          const int8_t* xb_w3 = nullptr) {
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
        // C5: same pure linear LL-gradient model production applies.
        if (!isLL && xb_w3 && llSrc) {
            uint8_t xb_type = band_class & 3u;
            int8_t wb = xb_w3[xb_type - 1];
            if (wb != 0) pred = xband_apply(xband_gradient(*llSrc, w, h, x, y, xb_type), wb);
        }
        int32_t sample = isLL ? (int32_t)data[idx] : (int16_t)data[idx];
        int32_t e = sample - pred;
        resHist[idx] = e;
        residuals.push_back(e);
    }
    (void)sibSrc; (void)bit_depth;
    // Single-leaf tree: every feature collapses to leaf 0, so the coded
    // stream depends only on the residuals above - kept explicit for parity.
    return acoder_encode_plane_leaves_v2(residuals, leaf_ids, 1).size();
}

// C5: real coded bytes for coding `plane` squeezed to `levels` with true CDC
// lifting and a per-type cross-band weight search. Band payloads are
// independent (sibling sources are transform outputs, not decoded data), so
// minimizing each band type's summed cost over its candidate weights
// minimizes the plane total exactly. The +3 header bytes every squeezing
// plane costs under bit6 are included, so acceptance accounting is
// end-to-end fair.
struct XBandTrial { size_t total = 0; int8_t w[3] = {0, 0, 0}; };

XBandTrial trial_squeeze_bits_xband(const std::vector<uint16_t>& plane, uint32_t w, uint32_t h,
                                    uint8_t levels, uint8_t bit_depth) {
    XBandTrial out;
    SqueezeResult sr = squeeze_encode_plane(plane, w, h, levels, bit_depth, true);
    auto chain = squeeze_ll_chain(plane, w, h, sr.levels, true);
    // LL band first (post-order), no cross-band term.
    if (!sr.bands.empty()) {
        const auto& llb = sr.bands[0];
        out.total += trial_band_bits_v2(llb.data, llb.w, llb.h, llb.band_class, true,
                                        nullptr, nullptr, bit_depth, nullptr);
    }
    // Per HF band type (H, V, D): exact joint minimum over one shared weight,
    // because each band's payload depends only on its own weight.
    static constexpr int8_t kCandidates[4] = {4, -4, 12, -12};
    for (size_t ti = 0; ti < 3; ++ti) {
        bool any = false;
        for (size_t bi = 1; bi < sr.bands.size(); ++bi)
            if ((sr.bands[bi].band_class & 3u) == (uint8_t)(ti + 1)) { any = true; break; }
        if (!any) continue;
        int8_t bw = 0;
        size_t bestT = SIZE_MAX;
        int8_t cands[5] = {0, kCandidates[0], kCandidates[1], kCandidates[2], kCandidates[3]};
        for (int8_t cand : cands) {
            size_t sum = 0;
            for (size_t bi = 1; bi < sr.bands.size(); ++bi) {
                const auto& band = sr.bands[bi];
                if ((band.band_class & 3u) != (uint8_t)(ti + 1)) continue;
                uint8_t lvl = band.band_class >> 2;
                const std::vector<uint16_t>* llSrc =
                    (lvl < chain.size()) ? &chain[lvl] : nullptr;
                const std::vector<uint16_t>* sibSrc = nullptr;
                uint8_t type = band.band_class & 3u;
                if ((type == 2 || type == 3) && bi >= 1) sibSrc = &sr.bands[bi - 1].data;
                int8_t tri[3] = {0, 0, 0};
                tri[ti] = cand;
                sum += trial_band_bits_v2(band.data, band.w, band.h, band.band_class, false,
                                          llSrc, sibSrc, bit_depth, tri);
            }
            if (sum < bestT) { bestT = sum; bw = cand; }
        }
        out.total += bestT;
        out.w[ti] = bw;
    }
    out.total += 3; // header bytes for this squeezing plane under bit6
    return out;
}

} // namespace

SqueezeXBandPlan choose_squeeze_plan_xband(const std::vector<uint16_t>& plane,
                                           uint32_t w, uint32_t h, uint8_t bit_depth,
                                           PredId flat_pred) {
    SqueezeXBandPlan best;
    auto flatRes = compute_residuals(plane, w, h, flat_pred);
    best.total_bytes = acoder_encode_plane_v2(flatRes, w, h, AC_V2_RESDIFF_CONTEXTS).size();
    uint8_t maxL = max_squeeze_levels(w, h);
    for (uint8_t L = 1; L <= maxL; ++L) {
        XBandTrial t = trial_squeeze_bits_xband(plane, w, h, L, bit_depth);
        if (t.total < best.total_bytes) {
            best.total_bytes = t.total;
            best.levels = L;
            best.weights[0] = t.w[0];
            best.weights[1] = t.w[1];
            best.weights[2] = t.w[2];
        }
    }
    return best;
}

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
        && !is_color_rotation(best_ct)
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
    auto predictor_trial = [&](const Raster& eval) {
        PredId global_best = PredId::MED;
        if (effort >= 1 && !eval.planes.empty()) {
            const Raster pruned = decimate_raster(eval, prune_step_for(eval));
            std::vector<double> pcost(9, 0.0);
            for (int pid = 0; pid <= 8; ++pid)
                pcost[pid] = (double)trial_flat_bits(pruned, static_cast<PredId>(pid));
            const std::vector<size_t> finals = trial_finalists(pcost, 3, (size_t)PredId::MED);
            const size_t win = trial_pick(finals, (size_t)PredId::MED, [&](size_t i) {
                return (double)trial_flat_bits(eval, static_cast<PredId>((uint8_t)i));
            });
            global_best = static_cast<PredId>((uint8_t)win);
        }
        res.predictor_mode = 0;
        res.global_pred_id = static_cast<uint8_t>(global_best);
        return global_best;
    };
    PredId global_best = predictor_trial(eval_raster);

    // ---- D4c stage 2: rotation family vs the anchor's PRODUCTION flat cost
    // (spec section 13). Runs AFTER the anchor's CFL and predictor decisions
    // exist so both sides are compared on what production would actually emit
    // for level-0 planes: the anchor side is its final raster (CFL applied
    // where eligible) under its decided predictor; a rotation may displace it
    // only on a STRICT full-resolution win under that same predictor. Ties
    // and losses keep the legacy plan byte-for-byte (I4). Rotations never
    // compose with CFL; on adoption the predictor trial re-runs on the new
    // raster so downstream stages see its own best bank pick.
    if (effort >= 1 && r.bd == BitDepth::BD8 && r.num_channels() >= 3) {
        static const ColorTransform kRots[] = {
            ColorTransform::ROT_LOCO, ColorTransform::ROT_GRB,
            ColorTransform::ROT_GBR,  ColorTransform::ROT_BRG,
            ColorTransform::ROT_RBG}; // bgr measured FAIL offline; excluded
        const PredId pid = global_best;
        const double anchor_cost =
            (double)trial_flat_bits(eval_raster, pid);
        const Raster pruned = decimate_raster(r, prune_step_for(r));
        std::vector<double> pcost(std::size(kRots), 0.0);
        for (size_t ci = 0; ci < std::size(kRots); ++ci)
            pcost[ci] = (double)trial_flat_bits(apply_color(pruned, kRots[ci], {}), pid);
        std::vector<size_t> order(std::size(kRots));
        for (size_t i = 0; i < order.size(); ++i) order[i] = i;
        std::stable_sort(order.begin(), order.end(), [&](size_t a, size_t b) {
            if (pcost[a] != pcost[b]) return pcost[a] < pcost[b];
            return a < b;
        });
        ColorTransform current_ct = static_cast<ColorTransform>(res.color_transform_id);
        ColorTransform best_rot = current_ct;
        double best_cost = anchor_cost;
        for (size_t k = 0; k < 3 && k < order.size(); ++k) {
            const ColorTransform cand = kRots[order[k]];
            const double c = (double)trial_flat_bits(apply_color(r, cand, {}), pid);
            if (c < best_cost) { best_cost = c; best_rot = cand; }
        }
        if (best_rot != current_ct) {
            best_ct = best_rot;
            best_raster = apply_color(r, best_rot, {});
            res.color_transform_id = static_cast<uint8_t>(best_rot);
            // Rotations are CFL-excluded: drop any scales the legacy plan
            // decided, then re-decide the predictor bank on the new raster.
            res.cfl_scales.assign(std::max(0, (int)r.num_channels() - 1), 0);
            predictor_trial(best_raster);
        }
    }

    // ---- B7: Squeeze + MA-tree coupled (effort >=3) ----
    if (effort >= 3 && r.bd == BitDepth::BD8) {
        uint8_t bd_val = 8;
        // C4+C5: per-plane squeeze plans (levels AND cross-band weights)
        // chosen by REAL coded bytes of the exact lifting-band payloads
        // production would emit, against the flat v2 baseline production
        // does emit - never by energy proxies. L=0 stays on ties
        // (never-expand, I4).
        std::vector<uint8_t> chosen_levels(r.num_channels(), 0);
        std::vector<int8_t> chosen_weights((size_t)r.num_channels() * 3, 0);
        PredId spred = static_cast<PredId>(res.global_pred_id);
        if ((uint8_t)spred > 8) spred = PredId::MED;
        for (size_t pi=0; pi<eval_raster.planes.size(); ++pi) {
            if (eval_raster.ch == Channels::RGBA && pi==3) { chosen_levels[pi]=0; continue; }
            SqueezeXBandPlan plan = choose_squeeze_plan_xband(
                eval_raster.planes[pi], eval_raster.w, eval_raster.h, bd_val, spred);
            chosen_levels[pi] = plan.levels;
            if (plan.levels > 0) {
                chosen_weights[3*pi+0] = plan.weights[0];
                chosen_weights[3*pi+1] = plan.weights[1];
                chosen_weights[3*pi+2] = plan.weights[2];
            }
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

        // C5 modern multi-band regime: some plane squeezes with a real,
        // byte-verified gain, so production emits plain-v2 lifting bands with
        // per-plane cross-band weights (CM/LZP candidates are compared in
        // prism.cpp on top of exactly these payloads). The legacy coupled
        // estimator path is retired with C5; acceptance lives in the trials
        // above alone.
        res.squeeze_levels = chosen_levels;
        res.xband_weights.clear();
        for (size_t pi = 0; pi < chosen_levels.size(); ++pi) {
            if (chosen_levels[pi] == 0) continue;
            res.xband_weights.push_back(chosen_weights[3*pi+0]);
            res.xband_weights.push_back(chosen_weights[3*pi+1]);
            res.xband_weights.push_back(chosen_weights[3*pi+2]);
        }
        res.trees.clear();
        MATreeGroup gg; gg.group_id=0; gg.band_class=0; gg.tree=MATree::single_leaf();
        res.trees.push_back(gg);
        res.predictor_mode = 0;
        res.global_pred_id = static_cast<uint8_t>(global_best);
    }
    return res;
}

} // namespace prism::codec
