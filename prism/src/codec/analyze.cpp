#include "prism/codec/analyze.h"
#include "prism/codec/color.h"
#include "prism/codec/predict.h"
#include "prism/codec/rans.h"
#include "prism/codec/squeeze.h"
#include <algorithm>
#include <cmath>

namespace prism::codec {

AnalyzeResult analyze(const Raster& r, uint8_t effort) {
    AnalyzeResult res;
    // Color: B5 enables YCoCg-R for BD8 (verified reversible dense lattice). BD16 stays None until M2 widening.
    if (r.num_channels() >= 3 && r.bd == BitDepth::BD8) {
        ColorChoice cc = choose_color_transform(r);
        res.color_transform_id = static_cast<uint8_t>(cc.id);
        res.cfl_scales = cc.cfl_scales;
        if (res.cfl_scales.empty()) res.cfl_scales.assign(std::max(0, (int)r.num_channels() - 1), 0);
    } else {
        res.color_transform_id = 0;
        res.cfl_scales.assign(std::max(0, (int)r.num_channels() - 1), 0);
    }
    // Squeeze placeholder: will be overwritten after predictor selection (B6)
    res.squeeze_levels.assign(r.num_channels(), 0);
    (void)effort;
    (void)max_squeeze_levels;

    // Trees: one single-leaf tree per group/band
    MATreeGroup g;
    g.group_id = 0;
    g.band_class = 0;
    g.tree = MATree::single_leaf();
    res.trees.push_back(g);
    // Predictor: B5 selects best predictor per plane (global fallback if all same)
    Raster tr = r;
    ColorTransform ct = static_cast<ColorTransform>(res.color_transform_id);
    if (ct != ColorTransform::None && r.num_channels() >= 3) tr = apply_color(r, ct, res.cfl_scales);
    // B5.45 cache all 16 residuals per plane to avoid recomputing 4x (per-plane + 64/32/16 + leaf/squeeze)
    std::vector<std::vector<std::vector<int32_t>>> all_cache(tr.planes.size());
    for (size_t c = 0; c < tr.planes.size(); ++c) {
        all_cache[c].resize(16);
        if (tr.ch == Channels::RGBA && c == 3) continue;
        for (uint8_t pid = 0; pid <= 15; ++pid) {
            all_cache[c][pid] = compute_residuals(tr.planes[c], tr.w, tr.h, static_cast<PredId>(pid));
        }
    }
    std::vector<uint8_t> per_plane_best;
    per_plane_best.reserve(tr.planes.size());
    for (size_t c = 0; c < tr.planes.size(); ++c) {
        if (tr.ch == Channels::RGBA && c == 3) {
            per_plane_best.push_back(3);
            continue;
        }
        struct Cand { uint8_t pid; uint64_t sum; };
        std::vector<Cand> cands;
        cands.reserve(16);
        for (uint8_t pid = 0; pid <= 15; ++pid) {
            const auto &resids = all_cache[c][pid];
            uint64_t s = 0; for (int32_t v : resids) s += (uint64_t)(v < 0 ? -v : v);
            cands.push_back({pid, s});
        }
        std::sort(cands.begin(), cands.end(), [](const Cand& a, const Cand& b){return a.sum < b.sum;});
        size_t topN = std::min<size_t>(4, cands.size());
        uint64_t best_cost = UINT64_MAX;
        uint8_t best_pred = cands[0].pid;
        for (size_t t = 0; t < topN; ++t) {
            uint8_t pid = cands[t].pid;
            const auto &resids = all_cache[c][pid];
            ModelBank mb = ModelBank::create(11264, 16);
            std::vector<uint8_t> out;
            rans_encode_residuals_auto(resids, tr.w, tr.h, mb, out);
            uint64_t cost = out.size();
            if (cost < best_cost) { best_cost = cost; best_pred = pid; }
        }
        per_plane_best.push_back(best_pred);
    }
    // B5.10/B5.12: evaluate per-block predictor maps (64x64 and 32x32) vs per-plane
    // For each block size, compute per-block best via sumAbs per block, then measure true combined cost
    auto evaluate_block_size = [&](uint32_t BLOCK, std::vector<uint8_t>& out_flat, uint64_t& out_cost) {
        uint32_t nbX = (tr.w + BLOCK - 1) / BLOCK;
        uint32_t nbY = (tr.h + BLOCK - 1) / BLOCK;
        out_flat.clear();
        out_flat.reserve(tr.planes.size() * (size_t)nbX * nbY);
        out_cost = 0;
        for (size_t c=0;c<tr.planes.size();++c){
            if (tr.ch == Channels::RGBA && c==3) {
                for (size_t k=0;k<(size_t)nbX*nbY;++k) out_flat.push_back(3);
                continue;
            }
            const auto &all_resids = all_cache[c];
            std::vector<uint8_t> block_preds;
            block_preds.reserve((size_t)nbX*nbY);
            for(uint32_t by=0; by<nbY; ++by){
                for(uint32_t bx=0; bx<nbX; ++bx){
                    uint32_t x0=bx*BLOCK, y0=by*BLOCK;
                    uint32_t x1=std::min(x0+BLOCK,tr.w), y1=std::min(y0+BLOCK,tr.h);
                    uint8_t best_pid=3;
                    if (BLOCK == 64 || BLOCK == 32) {
                        // B5.48 selective true-cost for 64/32 (re-enables true-cost only when ambiguous, saves ~200s vs full true-cost but recovers -0.02% vs pure sumAbs)
                        struct BCand{uint8_t pid; uint64_t sum;};
                        std::vector<BCand> bcands; bcands.reserve(16);
                        for(uint8_t pid=0; pid<=15; ++pid){
                            uint64_t bsum=0;
                            for(uint32_t y=y0; y<y1; ++y){
                                size_t row = (size_t)y*tr.w;
                                for(uint32_t x=x0; x<x1; ++x){
                                    int32_t v = all_resids[pid][row+x];
                                    bsum += (v<0?-v:v);
                                }
                            }
                            bcands.push_back({pid, bsum});
                        }
                        std::sort(bcands.begin(), bcands.end(), [](const BCand& a, const BCand& b){return a.sum<b.sum;});
                        uint64_t s0 = bcands[0].sum;
                        uint64_t s1 = bcands.size()>1 ? bcands[1].sum : s0;
                        bool ambiguous = (s0==0) ? (s1==0) : (s1 - s0) * 100 < s0 * 55;
                        if (ambiguous && bcands.size()>=2) {
                            uint64_t best_cost = UINT64_MAX;
                            size_t topB = std::min<size_t>(4, bcands.size());
                            for(size_t t=0; t<topB; ++t){
                                uint8_t pid = bcands[t].pid;
                                uint32_t bw = x1 - x0, bh = y1 - y0;
                                std::vector<int32_t> slice; slice.reserve((size_t)bw*bh);
                                for(uint32_t yy=y0; yy<y1; ++yy){
                                    size_t row=(size_t)yy*tr.w;
                                    for(uint32_t xx=x0; xx<x1; ++xx) slice.push_back(all_resids[pid][row+xx]);
                                }
                                ModelBank mb = ModelBank::create(11264,16);
                                std::vector<uint8_t> out; rans_encode_residuals_auto(slice, bw, bh, mb, out);
                                if(out.size() < best_cost){ best_cost=out.size(); best_pid=pid; }
                            }
                        } else {
                            best_pid = bcands[0].pid;
                        }
                    } else {
                        // B5.25 selective true-cost for 16x16: only for ambiguous blocks where top2 sumAbs close
                        struct BCand16{uint8_t pid; uint64_t sum;};
                        std::vector<BCand16> bc16; bc16.reserve(16);
                        for(uint8_t pid=0; pid<=15; ++pid){
                            uint64_t bsum=0;
                            for(uint32_t y=y0; y<y1; ++y){
                                size_t row = (size_t)y*tr.w;
                                for(uint32_t x=x0; x<x1; ++x){
                                    int32_t v = all_resids[pid][row+x];
                                    bsum += (v<0?-v:v);
                                }
                            }
                            bc16.push_back({pid, bsum});
                        }
                        std::sort(bc16.begin(), bc16.end(), [](const BCand16& a, const BCand16& b){return a.sum<b.sum;});
                        // if top2 within 55% (ambiguous) do true-cost top4, else sumAbs winner (B5.40 tune to stay under 600s)
                        uint64_t s0 = bc16[0].sum;
                        uint64_t s1 = bc16.size()>1 ? bc16[1].sum : s0;
                        bool ambiguous = (s0==0) ? (s1==0) : (s1 - s0) * 100 < s0 * 55;
                        if (ambiguous && bc16.size()>=2) {
                            uint64_t best_cost = UINT64_MAX;
                            size_t topB = std::min<size_t>(4, bc16.size());
                            for(size_t t=0; t<topB; ++t){
                                uint8_t pid = bc16[t].pid;
                                uint32_t bw = x1 - x0, bh = y1 - y0;
                                std::vector<int32_t> slice; slice.reserve((size_t)bw*bh);
                                for(uint32_t y=y0; y<y1; ++y){
                                    size_t row=(size_t)y*tr.w;
                                    for(uint32_t x=x0; x<x1; ++x) slice.push_back(all_resids[pid][row+x]);
                                }
                                ModelBank mb = ModelBank::create(11264,16);
                                std::vector<uint8_t> out; rans_encode_residuals_auto(slice, bw, bh, mb, out);
                                uint64_t cost = out.size();
                                if(cost < best_cost){ best_cost=cost; best_pid=pid; }
                            }
                        } else {
                            best_pid = bc16[0].pid;
                        }
                    }
                    block_preds.push_back(best_pid);
                    out_flat.push_back(best_pid);
                }
            }
            auto block_resids = compute_residuals_blockwise(tr.planes[c], tr.w, tr.h, block_preds, BLOCK);
            ModelBank mb = ModelBank::create(11264,16);
            std::vector<uint8_t> out; rans_encode_residuals_auto(block_resids,tr.w,tr.h,mb,out);
            out_cost += out.size();
        }
    };

    uint64_t plane_total_cost = 0;
    for (size_t c=0;c<tr.planes.size();++c){
        if (tr.ch == Channels::RGBA && c==3) { continue; }
        PredId id = static_cast<PredId>(per_plane_best[c]);
        auto resids = compute_residuals(tr.planes[c], tr.w, tr.h, id);
        ModelBank mb = ModelBank::create(11264,16);
        std::vector<uint8_t> out; rans_encode_residuals_auto(resids,tr.w,tr.h,mb,out);
        plane_total_cost += out.size();
    }
    bool all_same = true;
    for (size_t i = 1; i < per_plane_best.size(); ++i) if (per_plane_best[i] != per_plane_best[0]) all_same = false;
    uint64_t plane_overhead = all_same ? 1 : per_plane_best.size();
    uint64_t plane_effective = plane_total_cost + plane_overhead;

    // Evaluate 64 (nibble-packed overhead, B5.14)
    std::vector<uint8_t> flat64; uint64_t cost64=0;
    evaluate_block_size(64, flat64, cost64);
    uint32_t nb64 = (tr.w+63)/64 * ((tr.h+63)/64);
    (void)nb64;
    uint64_t eff64 = cost64 + (flat64.size() + 1) / 2;
    // Evaluate 32
    std::vector<uint8_t> flat32; uint64_t cost32=0;
    evaluate_block_size(32, flat32, cost32);
    uint64_t eff32 = cost32 + (flat32.size() + 1) / 2;
    // B5.21: always evaluate 16 (previously conditional to save 6s, but misses cases where 16 beats plane while 64/32 do not)
    std::vector<uint8_t> flat16; uint64_t cost16=0; uint64_t eff16 = UINT64_MAX;
    evaluate_block_size(16, flat16, cost16); eff16 = cost16 + (flat16.size() + 1) / 2;

    // B5.35: evaluate squeeze L=1 with per-band predictor and llc-aware HF (5/3 lifting, shared HF MB)
    // For each plane, 5/3 L=1 yields 4 bands (LL 384x256 + 3 HF 384x256 for 768x512). Per-band best predictor top6+trueCost with correct llc.
    uint64_t cost_squeeze = 0;
    bool squeeze_ok = true;
    std::vector<uint8_t> squeeze_per_band; // 4 per plane for L=1
    squeeze_per_band.reserve(tr.planes.size()*4);
    for (size_t c = 0; c < tr.planes.size(); ++c) {
        SqueezeResult sr = squeeze_encode_plane(tr.planes[c], tr.w, tr.h, 1, 8);
        if (sr.levels != 1 || sr.bands.size() != 4) { squeeze_ok = false; break; }
        // Find per-band best predictor via top6 true cost (llc-aware for HF)
        std::vector<uint8_t> per_band_best;
        per_band_best.reserve(4);
        std::vector<uint16_t> ll_for_hf = sr.bands[0].data;
        for (size_t bi=0; bi<sr.bands.size(); ++bi) {
            auto &band = sr.bands[bi];
            std::vector<uint64_t> sums(16, 0);
            for (uint8_t pid = 0; pid <= 15; ++pid) {
                auto rr = compute_residuals(band.data, band.w, band.h, static_cast<PredId>(pid));
                uint64_t s = 0; for (auto v : rr) s += (v<0?-v:v);
                sums[pid] = s;
            }
            std::vector<uint8_t> order(16); for (int i=0;i<16;++i) order[i]=i;
            std::sort(order.begin(), order.end(), [&](uint8_t a, uint8_t b){return sums[a] < sums[b];});
            size_t topN_b = std::min<size_t>(6, order.size());
            uint64_t best_c = UINT64_MAX; uint8_t best_p = order[0];
            for (size_t t=0; t<topN_b; ++t) {
                uint8_t pid = order[t];
                auto rr = compute_residuals(band.data, band.w, band.h, static_cast<PredId>(pid));
                ModelBank mb;
                std::vector<uint8_t> out;
                if (band.band_class == 0) {
                    mb = ModelBank::create(11264, 16);
                    rans_encode_residuals_auto(rr, band.w, band.h, mb, out);
                } else {
                    mb = ModelBank::create(1408, 16);
                    rans_encode_residuals_with_llc(rr, band.w, band.h, ll_for_hf, mb, out);
                }
                if (out.size() < best_c) { best_c = out.size(); best_p = pid; }
            }
            per_band_best.push_back(best_p);
        }
        // Now compute true sequential cost with shared HF MB and chosen preds
        ModelBank mb_ll = ModelBank::create(11264, 16);
        ModelBank mb_hf = ModelBank::create(1408, 16);
        uint64_t plane_squeeze_cost = 0;
        for (size_t bi=0; bi<sr.bands.size(); ++bi) {
            auto &band = sr.bands[bi];
            uint8_t pid = per_band_best[bi];
            auto rr = compute_residuals(band.data, band.w, band.h, static_cast<PredId>(pid));
            std::vector<uint8_t> out;
            if (band.band_class == 0) {
                ModelBank mb = mb_ll;
                rans_encode_residuals_auto(rr, band.w, band.h, mb, out);
                mb_ll = mb;
            } else {
                rans_encode_residuals_with_llc(rr, band.w, band.h, ll_for_hf, mb_hf, out);
            }
            plane_squeeze_cost += out.size();
        }
        for (auto p : per_band_best) squeeze_per_band.push_back(p);
        cost_squeeze += plane_squeeze_cost;
    }
    uint64_t squeeze_overhead = 0;
    if (squeeze_ok) squeeze_overhead = squeeze_per_band.size(); // per-band preds (squeeze_levels already in header, not per-image overhead)
    // header squeeze_levels already counted in container header (P bytes) for both modes, so only per-band pred overhead matters vs block modes
    uint64_t eff_squeeze = squeeze_ok ? cost_squeeze + squeeze_overhead : UINT64_MAX;
    // Choose best among plane, 64, 32, 16, squeeze (all block modes now nibble-packed, B5.14)
    uint64_t best_eff = plane_effective;
    int best_mode = all_same ? 0 : 1; // 0 global, 1 per-plane
    std::vector<uint8_t> best_flat = per_plane_best;
    // For mode 0, best_flat not used but keep per_plane_best[0] as global
    uint32_t nbX64 = (tr.w + 64 -1)/64, nbY64=(tr.h+64-1)/64;
    uint32_t nbX32 = (tr.w + 32 -1)/32, nbY32=(tr.h+32-1)/32;
    uint32_t nbX16 = (tr.w + 16 -1)/16, nbY16=(tr.h+16-1)/16;
    bool use64 = (nbX64*nbY64 > 4 && eff64 < best_eff);
    bool use32 = (nbX32*nbY32 > 4 && eff32 < best_eff);
    bool use16 = (nbX16*nbY16 > 4 && eff16 < best_eff);
    // Among block sizes, pick minimal effective cost
    uint64_t best_block_eff = UINT64_MAX;
    int best_block_mode = -1;
    std::vector<uint8_t> *best_block_flat = nullptr;
    if (use64 && eff64 < best_block_eff) { best_block_eff = eff64; best_block_mode = 2; best_block_flat = &flat64; }
    if (use32 && eff32 < best_block_eff) { best_block_eff = eff32; best_block_mode = 3; best_block_flat = &flat32; }
    if (use16 && eff16 < best_block_eff) { best_block_eff = eff16; best_block_mode = 4; best_block_flat = &flat16; }
    if (best_block_mode != -1) {
        best_eff = best_block_eff; best_mode = best_block_mode; best_flat = *best_block_flat;
    }
    // B5.35: squeeze L=1 with per-band predictor - never-expand, disabled for B5.42 (11264 LL makes small-image cost estimate noisy; keep R11-A guard until MA-tree)
    bool use_squeeze = false; (void)squeeze_ok; (void)eff_squeeze; // disabled: (squeeze_ok && eff_squeeze + 2 < best_eff)
    if (use_squeeze) {
        best_eff = eff_squeeze;
        best_mode = 5;
        best_flat = squeeze_per_band;
    }
    // B5.47 leaf-activity 16 leaves (finer) : evaluate per-plane 16-leaf predictor map (was 8, doubled granularity 2/4/7/11/16/22/30/40/55/75/100/130/165/210/270)
    uint64_t cost_leaf = UINT64_MAX; std::vector<uint8_t> flat_leaf;
    {
        const size_t LEAVES = 16;
        flat_leaf.reserve(tr.planes.size()*LEAVES);
        uint64_t total_leaf_cost = 0;
        std::vector<std::vector<uint8_t>> per_plane_leaf_maps;
        per_plane_leaf_maps.reserve(tr.planes.size());
        for (size_t c=0;c<tr.planes.size();++c){
            if (tr.ch == Channels::RGBA && c==3) { std::vector<uint8_t> m(LEAVES,3); per_plane_leaf_maps.push_back(m); for(auto v:m) flat_leaf.push_back(v); continue; }
            const auto &all_resids = all_cache[c];
            // B5.47 leaves via sumAbs 2/4/7/11/16/22/30/40/55/75/100/130/165/210/270 (16 buckets, finer than 8-bucket 3/8/15/25/50/100/180)
            auto leaves = compute_leaves_activity(tr.planes[c], tr.w, tr.h);
            // for each leaf, find best pid via sumAbs then true cost top3
            std::vector<uint8_t> best_per_leaf(LEAVES,3);
            for(size_t lv=0; lv<LEAVES; ++lv){
                struct Cand{uint8_t pid; uint64_t sum;};
                std::vector<Cand> cands; cands.reserve(16);
                for(uint8_t pid=0; pid<=15; ++pid){
                    uint64_t s=0;
                    for(size_t i=0;i<leaves.size();++i) if(leaves[i]==lv) s += (all_resids[pid][i]<0? -all_resids[pid][i] : all_resids[pid][i]);
                    cands.push_back({pid,s});
                }
                std::sort(cands.begin(), cands.end(), [](const Cand& a, const Cand& b){return a.sum<b.sum;});
                // B5.48: top4 true-cost per leaf slice (was top3) to capture where 4th sumAbs is true rANS best, with 11264 contexts
                size_t topN = std::min<size_t>(4, cands.size());
                uint64_t best_cost = UINT64_MAX; uint8_t best_pid = cands[0].pid;
                for(size_t t=0;t<topN;++t){
                    uint8_t pid = cands[t].pid;
                    std::vector<int32_t> slice; slice.reserve(leaves.size()/LEAVES+8);
                    for(size_t i=0;i<leaves.size();++i) if(leaves[i]==lv) slice.push_back(all_resids[pid][i]);
                    if(slice.empty()){ best_pid=pid; break; }
                    ModelBank mb = ModelBank::create(11264,16);
                    std::vector<uint8_t> out; rans_encode_residuals_auto(slice, (uint32_t)slice.size(), 1, mb, out);
                    if(out.size()<best_cost){ best_cost=out.size(); best_pid=pid; }
                }
                best_per_leaf[lv]=best_pid;
            }
            per_plane_leaf_maps.push_back(best_per_leaf);
            for(auto v:best_per_leaf) flat_leaf.push_back(v);
        }
        // global true cost with leaf-specific residuals
        uint64_t leaf_total = 0;
        for(size_t c=0;c<tr.planes.size();++c){
            if (tr.ch == Channels::RGBA && c==3) continue;
            auto mixed = compute_residuals_leaves(tr.planes[c], tr.w, tr.h, per_plane_leaf_maps[c]);
            ModelBank mb = ModelBank::create(11264,16);
            std::vector<uint8_t> out; rans_encode_residuals_auto(mixed, tr.w, tr.h, mb, out);
            leaf_total += out.size();
        }
        uint64_t leaf_overhead = (flat_leaf.size()+1)/2; // nibble-packed
        cost_leaf = leaf_total + leaf_overhead;
    }
    bool use_leaf = (cost_leaf + 2 < best_eff);
    if (use_leaf) { best_eff = cost_leaf; best_mode = 6; best_flat = flat_leaf; }

    if (best_mode == 0) {
        res.predictor_mode = 0;
        res.global_pred_id = per_plane_best[0];
    } else if (best_mode == 1) {
        res.predictor_mode = 1;
        res.global_pred_id = per_plane_best[0];
        res.per_leaf_pred = per_plane_best;
    } else if (best_mode == 2) {
        res.predictor_mode = 2;
        res.global_pred_id = per_plane_best[0];
        res.per_leaf_pred = flat64;
    } else if (best_mode == 3) {
        res.predictor_mode = 3;
        res.global_pred_id = per_plane_best[0];
        res.per_leaf_pred = flat32;
    } else if (best_mode == 5) {
        res.predictor_mode = 5;
        res.global_pred_id = per_plane_best[0];
        res.per_leaf_pred = squeeze_per_band;
        res.squeeze_levels.assign(r.num_channels(), 1);
        (void)max_squeeze_levels;
        return res;
    } else if (best_mode == 6) {
        res.predictor_mode = 6;
        res.global_pred_id = per_plane_best[0];
        res.per_leaf_pred = flat_leaf;
    } else {
        res.predictor_mode = 4;
        res.global_pred_id = per_plane_best[0];
        res.per_leaf_pred = flat16;
    }
    res.squeeze_levels.assign(r.num_channels(), 0);
    // B6 5/3 lifting is implemented in squeeze.cpp (CDC 5/3 vs Haar) and verified bit-exact (standalone 768x512 PASS).
    // Adaptive per-plane L=1 via true cost was prototyped: measured on Kodak with 5/3 enabled per-plane true-cost
    // (per-band best predictor top6 + 1408 llc) shows +~1.2% on average (LL negative wrap and HF bias overhead),
    // and specific plane 0 failure was due to LL signed wrap handling (fixed via int16 interpretation, now PASS).
    // However, with correct handling, per-plane 5/3 L=1 still +0.8% vs no-squeeze on Kodak BD8 (similar to Haar +11% -> +0.8% with 5/3),
    // so never-expand keeps levels=0 for now. This is expected per R11-A: Squeeze without MA-tree (llc_class/sibling_class)
    // remains near-inert; the 5/3 is ready for B7 when MA-tree lands. Keep disabled.
    (void)max_squeeze_levels;
    return res;
}

} // namespace prism::codec
