#include "prism/codec/analyze.h"
#include "prism/codec/color.h"
#include "prism/codec/predict.h"
#include "prism/codec/rans.h"
#include "prism/codec/squeeze.h"
#include <algorithm>

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
            PredId id = static_cast<PredId>(pid);
            auto resids = compute_residuals(tr.planes[c], tr.w, tr.h, id);
            uint64_t s = 0; for (int32_t v : resids) s += (uint64_t)(v < 0 ? -v : v);
            cands.push_back({pid, s});
        }
        std::sort(cands.begin(), cands.end(), [](const Cand& a, const Cand& b){return a.sum < b.sum;});
        size_t topN = std::min<size_t>(6, cands.size());
        uint64_t best_cost = UINT64_MAX;
        uint8_t best_pred = cands[0].pid;
        for (size_t t = 0; t < topN; ++t) {
            uint8_t pid = cands[t].pid;
            PredId id = static_cast<PredId>(pid);
            auto resids = compute_residuals(tr.planes[c], tr.w, tr.h, id);
            ModelBank mb = ModelBank::create(352, 16);
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
            std::vector<std::vector<int32_t>> all_resids(16);
            for(uint8_t pid=0; pid<=15; ++pid){
                all_resids[pid] = compute_residuals(tr.planes[c], tr.w, tr.h, static_cast<PredId>(pid));
            }
            std::vector<uint8_t> block_preds;
            block_preds.reserve((size_t)nbX*nbY);
            for(uint32_t by=0; by<nbY; ++by){
                for(uint32_t bx=0; bx<nbX; ++bx){
                    uint32_t x0=bx*BLOCK, y0=by*BLOCK;
                    uint32_t x1=std::min(x0+BLOCK,tr.w), y1=std::min(y0+BLOCK,tr.h);
                    uint8_t best_pid=3;
                    if (BLOCK == 64 || BLOCK == 32) {
                        // B5.30 top-8 prefilter for 64/32 blocks (was top-7, diminishing ~0.004% but still captures where 8th is true best)
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
                        size_t topB = std::min<size_t>(8, bcands.size());
                        uint64_t best_cost = UINT64_MAX;
                        for(size_t t=0; t<topB; ++t){
                            uint8_t pid = bcands[t].pid;
                            uint32_t bw = x1 - x0, bh = y1 - y0;
                            std::vector<int32_t> slice; slice.reserve((size_t)bw*bh);
                            for(uint32_t y=y0; y<y1; ++y){
                                size_t row=(size_t)y*tr.w;
                                for(uint32_t x=x0; x<x1; ++x) slice.push_back(all_resids[pid][row+x]);
                            }
                            ModelBank mb = ModelBank::create(352,16);
                            std::vector<uint8_t> out; rans_encode_residuals_auto(slice, bw, bh, mb, out);
                            uint64_t cost = out.size();
                            if(cost < best_cost){ best_cost=cost; best_pid=pid; }
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
                        // if top2 within 35% (ambiguous) do true-cost top9, else sumAbs winner (B5.30: widen 30->35 and top8->9)
                        uint64_t s0 = bc16[0].sum;
                        uint64_t s1 = bc16.size()>1 ? bc16[1].sum : s0;
                        bool ambiguous = (s0==0) ? (s1==0) : (s1 - s0) * 100 < s0 * 35;
                        if (ambiguous && bc16.size()>=2) {
                            uint64_t best_cost = UINT64_MAX;
                            size_t topB = std::min<size_t>(9, bc16.size());
                            for(size_t t=0; t<topB; ++t){
                                uint8_t pid = bc16[t].pid;
                                uint32_t bw = x1 - x0, bh = y1 - y0;
                                std::vector<int32_t> slice; slice.reserve((size_t)bw*bh);
                                for(uint32_t y=y0; y<y1; ++y){
                                    size_t row=(size_t)y*tr.w;
                                    for(uint32_t x=x0; x<x1; ++x) slice.push_back(all_resids[pid][row+x]);
                                }
                                ModelBank mb = ModelBank::create(352,16);
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
            ModelBank mb = ModelBank::create(352,16);
            std::vector<uint8_t> out; rans_encode_residuals_auto(block_resids,tr.w,tr.h,mb,out);
            out_cost += out.size();
        }
    };

    uint64_t plane_total_cost = 0;
    for (size_t c=0;c<tr.planes.size();++c){
        if (tr.ch == Channels::RGBA && c==3) { continue; }
        PredId id = static_cast<PredId>(per_plane_best[c]);
        auto resids = compute_residuals(tr.planes[c], tr.w, tr.h, id);
        ModelBank mb = ModelBank::create(352,16);
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

    // Choose best among plane, 64, 32, 16 (all block modes now nibble-packed, B5.14)
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
