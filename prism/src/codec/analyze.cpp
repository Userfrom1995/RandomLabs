#include "prism/codec/analyze.h"
#include "prism/codec/color.h"
#include "prism/codec/predict.h"
#include <limits>
#include <algorithm>

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

AnalyzeResult analyze(const Raster& r, uint8_t effort) {
    AnalyzeResult res;
    res.cfl_scales.assign(std::max(0, (int)r.num_channels() - 1), 0);
    res.squeeze_levels.assign(r.num_channels(), 0);
    if (effort >= 7) {
        // Future: search squeeze levels (B7)
    }
    MATreeGroup g;
    g.group_id = 0;
    g.band_class = 0;
    g.tree = MATree::single_leaf();
    res.trees.push_back(g);

    // ---- B6: color transform search (16-bit widening now allows YCoCg-R on BD16) ----
    // Candidates: None, YCoCgR, SubtractGreen, YCoCgR_SubGreen, and Lift53 (effort>=2)
    // Strict-superset: we only switch if cost < current (s=0 identity never expands).
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
    // Only do full search at effort>=1; at effort 0 keep None (fast path)
    // YCoCg-R etc are BD8-only until 16-bit widening (B+1/B+2) is fully wired
    // with widened plane storage. For now keep the M0 gate: BD16 stays None.
    if (effort >= 1 && r.num_channels() >= 3 && r.bd == BitDepth::BD8) {
        try_ct(ColorTransform::YCoCgR);
        try_ct(ColorTransform::SubtractGreen);
        try_ct(ColorTransform::YCoCgR_SubGreen);
        if (effort >= 2) {
            try_ct(ColorTransform::Lift53);
        }
    } else if (effort >= 1 && r.num_channels() >= 3 && r.bd == BitDepth::BD16) {
        // BD16: only SubtractGreen is safe (no widening needed, just mask)
        // YCoCg-R would need 17/18-bit widening and would alias.
        try_ct(ColorTransform::SubtractGreen);
    }
    res.color_transform_id = static_cast<uint8_t>(best_ct);

    // ---- B6: CFL search per chroma plane (effort>=2) ----
    // ch' = ch - round(s*L/8), s in 0..7, searched per plane by summed |residual|
    // We greedily pick s per chroma that minimizes MED residual energy for that plane.
    // s=0 identity never expands (only chosen if it ties).
    // YCoCg-R already widens chroma to 9-10 bits; CFL on that widened domain needs
    // a 10-bit modulus (not 8-bit) and is deferred until widening is fully unified.
    // Gate CFL to non-YCoCg bases for B6.
    if (effort >= 2 && r.num_channels() >= 2 && best_ct != ColorTransform::Lift53
        && best_ct != ColorTransform::YCoCgR && best_ct != ColorTransform::YCoCgR_SubGreen) {
        // Start from best_raster (already applied base transform without CFL)
        // For each chroma, try s 0..7
        for (size_t ci = 1; ci < best_raster.num_channels(); ++ci) {
            if (best_raster.ch == Channels::RGBA && ci == 3) continue;
            if (best_raster.ch == Channels::GA && ci == 1) continue;
            size_t si = ci - 1;
            if (si >= res.cfl_scales.size()) continue;
            // baseline cost for this plane with current s=0
            uint64_t best_plane_cost = plane_residual_energy(best_raster.planes[ci], r.w, r.h, PredId::MED);
            uint8_t best_s = 0;
            for (uint8_t s = 1; s <= 7; ++s) {
                std::vector<uint8_t> test_scales = res.cfl_scales;
                test_scales[si] = s;
                // Apply CFL on top of best_raster's base (need to recompute from base)
                Raster tr = apply_color(r, best_ct, test_scales);
                uint64_t c = plane_residual_energy(tr.planes[ci], r.w, r.h, PredId::MED);
                if (c < best_plane_cost) {
                    best_plane_cost = c;
                    best_s = s;
                }
            }
            res.cfl_scales[si] = best_s;
        }
        // Recompute best_raster with final CFL for predictor search
        best_raster = apply_color(r, best_ct, res.cfl_scales);
    } else {
        // Keep zero scales
        res.cfl_scales.assign(std::max(0, (int)r.num_channels() - 1), 0);
    }

    // Predictor bank selection (B5/B6): evaluate P0..P8 summed |residual| across
    // the *transformed* planes (after color+CFL/Lift53), not the raw input.
    const Raster& eval_raster = best_raster;
    if (effort >= 1 && !eval_raster.planes.empty()) {
        PredId best = PredId::MED;
        uint64_t best_energy = std::numeric_limits<uint64_t>::max();
        for (int pid = 0; pid <= 8; ++pid) {
            PredId id = static_cast<PredId>(pid);
            uint64_t tot = 0;
            for (const auto& plane : eval_raster.planes) {
                tot += plane_residual_energy(plane, eval_raster.w, eval_raster.h, id);
                if (tot >= best_energy) break;
            }
            if (tot < best_energy) {
                best_energy = tot;
                best = id;
            }
        }
        res.predictor_mode = 0;
        res.global_pred_id = static_cast<uint8_t>(best);
    } else {
        res.predictor_mode = 0;
        res.global_pred_id = 3; // MED
    }
    return res;
}

} // namespace prism::codec
