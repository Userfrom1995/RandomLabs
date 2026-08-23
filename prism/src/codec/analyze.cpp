#include "prism/codec/analyze.h"
#include "prism/codec/color.h"
#include "prism/codec/predict.h"
#include "prism/codec/squeeze.h"
#include "prism/codec/acoder.h"
#include "prism/codec/matree_builder.h"
#include <limits>
#include <algorithm>
#include <cmath>
#include <iostream>

namespace prism::codec {

static uint64_t plane_residual_energy(const std::vector<uint16_t>& plane,
                                       uint32_t w, uint32_t h, PredId id) {
    auto res = compute_residuals(plane, w, h, id);
    uint64_t sum = 0;
    for (int32_t v : res) sum += (uint64_t)std::abs(v);
    return sum;
}

static uint64_t raster_cost_med(const Raster& rr) {
    uint64_t tot = 0;
    for (size_t c = 0; c < rr.num_channels(); ++c) {
        if (rr.ch == Channels::RGBA && c == 3) continue;
        const auto& pl = rr.planes[c];
        auto res = compute_residuals(pl, rr.w, rr.h, PredId::MED);
        for (int32_t v : res) tot += (uint64_t)std::abs(v);
    }
    return tot;
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
[[maybe_unused]] static std::vector<uint8_t> encode_band_leaf_for_cost(const std::vector<uint16_t>& data, uint32_t w, uint32_t h,
                                              uint8_t band_class, bool isLL,
                                              const std::vector<uint16_t>* llSrc,
                                              const std::vector<uint16_t>* siblingSrc,
                                              const MATree& tree, int num_leaves,
                                              uint8_t bit_depth) {
    if (w==0||h==0) { AEncoder enc; return enc.flush_and_emit(); }
    size_t n=(size_t)w*h;
    std::vector<int32_t> residuals; residuals.reserve(n);
    std::vector<uint16_t> leaf_ids; leaf_ids.reserve(n);
    std::vector<int32_t> resHist(n,0);
    for(size_t idx=0; idx<n; ++idx){
        uint32_t x=(uint32_t)(idx % w); uint32_t y=(uint32_t)(idx / w);
        int32_t L=0,T=0,TL=0,TR=0;
        if(isLL){
            L=(x>0)?(int32_t)data[idx-1]:0; T=(y>0)?(int32_t)data[idx-w]:0; TL=(x>0&&y>0)?(int32_t)data[idx-w-1]:0; TR=(y>0&&x+1<w)?(int32_t)data[idx-w+1]:0;
            int32_t pred; if(TL>=std::max(L,T)) pred=std::min(L,T); else if(TL<=std::min(L,T)) pred=std::max(L,T); else pred=L+T-TL;
            int32_t e=(int32_t)data[idx]-pred; resHist[idx]=e;
            Feature f{}; f.band_class=band_class; f.qg=quant_qg(L,T,TL,TR);
            if(llSrc) f.llc_class=quant_llc((*llSrc)[idx], bit_depth); else f.llc_class=0;
            int32_t dL=0,dU=0,dUL=0; if(x>0) dL=resHist[idx-1]; if(y>0) dU=resHist[idx-w]; if(x>0&&y>0) dUL=resHist[idx-w-1]; f.res_diff=(uint16_t)residual_diff_context(dL,dU,dUL);
            if(siblingSrc){ int16_t sv=(int16_t)(*siblingSrc)[idx]; f.sibling_class=quant_sibling(sv);} else f.sibling_class=0;
            int grad=std::abs(L-TL)+std::abs(T-TL); if(grad<4) f.activity=0; else if(grad<16) f.activity=1; else if(grad<64) f.activity=2; else f.activity=3;
            uint16_t leaf=tree.eval(f); if(leaf >= (uint16_t)num_leaves) leaf=0;
            residuals.push_back(e); leaf_ids.push_back(leaf);
        } else {
            int16_t sv=(int16_t)data[idx]; int16_t l=(x>0)?(int16_t)data[idx-1]:0; int16_t t=(y>0)?(int16_t)data[idx-w]:0; int16_t tl=(x>0&&y>0)?(int16_t)data[idx-w-1]:0; int16_t tr=(y>0&&x+1<w)?(int16_t)data[idx-w+1]:0;
            L=l; T=t; TL=tl; TR=tr;
            int32_t pred; if(TL>=std::max(L,T)) pred=std::min(L,T); else if(TL<=std::min(L,T)) pred=std::max(L,T); else pred=L+T-TL;
            int32_t e=(int32_t)sv - pred; resHist[idx]=e;
            Feature f{}; f.band_class=band_class; f.qg=quant_qg(L,T,TL,TR);
            if(llSrc) f.llc_class=quant_llc((*llSrc)[idx], bit_depth); else f.llc_class=0;
            int32_t dL=0,dU=0,dUL=0; if(x>0) dL=resHist[idx-1]; if(y>0) dU=resHist[idx-w]; if(x>0&&y>0) dUL=resHist[idx-w-1]; f.res_diff=(uint16_t)residual_diff_context(dL,dU,dUL);
            if(siblingSrc){ int16_t ssv=(int16_t)(*siblingSrc)[idx]; f.sibling_class=quant_sibling(ssv);} else f.sibling_class=0;
            int grad=std::abs(L-TL)+std::abs(T-TL); if(grad<4) f.activity=0; else if(grad<16) f.activity=1; else if(grad<64) f.activity=2; else f.activity=3;
            uint16_t leaf=tree.eval(f); if(leaf >= (uint16_t)num_leaves) leaf=0;
            residuals.push_back(e); leaf_ids.push_back(leaf);
        }
    }
    return acoder_encode_plane_leaves(residuals, leaf_ids, num_leaves);
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

AnalyzeResult analyze(const Raster& r, uint8_t effort) {
    AnalyzeResult res;
    res.cfl_scales.assign(std::max(0, (int)r.num_channels() - 1), 0);
    res.squeeze_levels.assign(r.num_channels(), 0);
    MATreeGroup g;
    g.group_id = 0;
    g.band_class = 0;
    g.tree = MATree::single_leaf();
    res.trees.push_back(g);

    // ---- B6: color transform search ----
    ColorTransform best_ct = ColorTransform::None;
    std::vector<uint8_t> zero_cfl(res.cfl_scales.size(), 0);
    Raster best_raster = apply_color(r, best_ct, zero_cfl);
    uint64_t best_cost = raster_cost_med(best_raster);
    auto try_ct = [&](ColorTransform t) {
        Raster tr = apply_color(r, t, zero_cfl);
        uint64_t c = raster_cost_med(tr);
        if (c < best_cost) {
            best_cost = c;
            best_ct = t;
            best_raster = tr;
        }
    };
    if (effort >= 1 && r.num_channels() >= 3 && r.bd == BitDepth::BD8) {
        try_ct(ColorTransform::YCoCgR);
        try_ct(ColorTransform::SubtractGreen);
        try_ct(ColorTransform::YCoCgR_SubGreen);
        if (effort >= 2) try_ct(ColorTransform::Lift53);
    } else if (effort >= 1 && r.num_channels() >= 3 && r.bd == BitDepth::BD16) {
        try_ct(ColorTransform::SubtractGreen);
    }
    res.color_transform_id = static_cast<uint8_t>(best_ct);

    // ---- B6: CFL search ----
    if (effort >= 2 && r.num_channels() >= 2 && best_ct != ColorTransform::Lift53
        && best_ct != ColorTransform::YCoCgR && best_ct != ColorTransform::YCoCgR_SubGreen) {
        for (size_t ci = 1; ci < best_raster.num_channels(); ++ci) {
            if (best_raster.ch == Channels::RGBA && ci == 3) continue;
            if (best_raster.ch == Channels::GA && ci == 1) continue;
            size_t si = ci - 1;
            if (si >= res.cfl_scales.size()) continue;
            uint64_t best_plane_cost = plane_residual_energy(best_raster.planes[ci], r.w, r.h, PredId::MED);
            uint8_t best_s = 0;
            for (uint8_t s = 1; s <= 7; ++s) {
                std::vector<uint8_t> test_scales = res.cfl_scales;
                test_scales[si] = s;
                Raster tr = apply_color(r, best_ct, test_scales);
                uint64_t c = plane_residual_energy(tr.planes[ci], r.w, r.h, PredId::MED);
                if (c < best_plane_cost) { best_plane_cost = c; best_s = s; }
            }
            res.cfl_scales[si] = best_s;
        }
        best_raster = apply_color(r, best_ct, res.cfl_scales);
    } else {
        res.cfl_scales.assign(std::max(0, (int)r.num_channels() - 1), 0);
    }

    // Predictor bank selection (B5/B6): evaluate P0..P8 summed |residual| across transformed planes
    const Raster& eval_raster = best_raster;
    PredId global_best = PredId::MED;
    if (effort >= 1 && !eval_raster.planes.empty()) {
        uint64_t best_energy = std::numeric_limits<uint64_t>::max();
        for (int pid = 0; pid <= 8; ++pid) {
            PredId id = static_cast<PredId>(pid);
            uint64_t tot = 0;
            for (const auto& plane : eval_raster.planes) {
                tot += plane_residual_energy(plane, eval_raster.w, eval_raster.h, id);
                if (tot >= best_energy) break;
            }
            if (tot < best_energy) { best_energy = tot; global_best = id; }
        }
        res.predictor_mode = 0;
        res.global_pred_id = static_cast<uint8_t>(global_best);
    } else {
        res.predictor_mode = 0;
        res.global_pred_id = 3;
    }

    // ---- B7: Squeeze + MA-tree coupled (effort >=3) ----
    if (effort >= 3 && r.bd == BitDepth::BD8) {
        uint8_t bd_val = 8;
        // per-plane squeeze level search via residual energy
        std::vector<uint8_t> chosen_levels(r.num_channels(), 0);
        uint64_t cost_no_squeeze = 0;
        for (size_t pi=0; pi<eval_raster.planes.size(); ++pi) {
            if (eval_raster.ch == Channels::RGBA && pi==3) { chosen_levels[pi]=0; continue; }
            uint32_t w = eval_raster.w, h = eval_raster.h;
            uint8_t maxL = max_squeeze_levels(w, h);
            const auto& plane = eval_raster.planes[pi];
            // baseline no squeeze cost
            SqueezeResult sr0 = squeeze_encode_plane(plane, w, h, 0, bd_val);
            uint64_t bestC = squeezed_plane_cost(sr0);
            cost_no_squeeze += bestC;
            uint8_t bestL = 0;
            for (uint8_t L=1; L<=maxL; ++L) {
                SqueezeResult sr = squeeze_encode_plane(plane, w, h, L, bd_val);
                uint64_t c = squeezed_plane_cost(sr);
                if (c < bestC) { bestC = c; bestL = sr.levels; }
            }
            chosen_levels[pi] = bestL;
        }
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
            SqueezeResult sr = squeeze_encode_plane(plane, eval_raster.w, eval_raster.h, L, bd_val);
            // also capture intermediate LLs for llc feature: need per level LL
            // Recompute LLs for this plane for feature use (same as inside squeeze)
            std::vector<std::vector<uint16_t>> llPlanes;
            {
                std::vector<uint16_t> cur = plane;
                uint32_t curW = eval_raster.w, curH = eval_raster.h;
                for (uint8_t lvl=0; lvl<L; ++lvl) {
                    if ((curW &1)||(curH&1)) break;
                    uint32_t w2=curW/2, h2=curH/2;
                    std::vector<uint16_t> ll(w2*h2);
                    for (uint32_t y=0;y<h2;++y) for(uint32_t x=0;x<w2;++x){ size_t i00=(size_t)(y*2)*curW+(x*2); ll[y*w2+x]=cur[i00];}
                    llPlanes.push_back(ll);
                    // update cur to ll for next iter
                    cur = ll; curW=w2; curH=h2;
                }
            }
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
        MatreeBuildParams params; params.max_depth = 4; params.max_leaves = 16;
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
                    SqueezeResult sr = squeeze_encode_plane(plane, eval_raster.w, eval_raster.h, L, bd_val);
                    std::vector<std::vector<uint16_t>> llP;
                    {
                        std::vector<uint16_t> cur=plane; uint32_t cw=eval_raster.w,ch=eval_raster.h;
                        for(uint8_t lvl=0; lvl<L; ++lvl){ if((cw&1)||(ch&1)) break; uint32_t w2=cw/2,h2=ch/2; std::vector<uint16_t> ll(w2*h2); for(uint32_t y=0;y<h2;++y) for(uint32_t x=0;x<w2;++x) ll[y*w2+x]=cur[(size_t)(y*2)*cw+(x*2)]; llP.push_back(ll); cur=ll; cw=w2; ch=h2; }
                    }
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
