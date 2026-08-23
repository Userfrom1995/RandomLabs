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

AnalyzeResult analyze(const Raster& r, uint8_t effort) {
    AnalyzeResult res;
    // Color: B5 still None for stability; YCoCg-R gated to None at M0 is kept
    // until 16-bit widening is proven (B6). CFL search lands in B6.
    (void)effort;
    res.color_transform_id = 0; // ColorTransform::None
    res.cfl_scales.assign(std::max(0, (int)r.num_channels() - 1), 0);
    // Squeeze: B5-B6 remain 0; B7 searches 0..max_levels
    res.squeeze_levels.assign(r.num_channels(), 0);
    if (effort >= 7) {
        // Future: search squeeze levels (B7)
    }
    // Trees: one single-leaf tree per group/band at B5 (MA-tree lands in B7).
    // The residual-DIFF context is handled inside the entropy stage (acoder)
    // as an adaptive per-sample context even with a single leaf.
    MATreeGroup g;
    g.group_id = 0;
    g.band_class = 0;
    g.tree = MATree::single_leaf();
    res.trees.push_back(g);

    // Predictor bank selection (B5): evaluate P0..P8 summed |residual| across
    // all planes, pick cheapest global predictor. Zero signaled bytes when a
    // single global wins (predictor_mode 0). This already improves over fixed MED
    // on photographic and graphic content and is the scaffolding for per-leaf
    // selection in B7.
    if (effort >= 1 && !r.planes.empty()) {
        PredId best = PredId::MED;
        uint64_t best_energy = std::numeric_limits<uint64_t>::max();
        // Evaluate P0..P7 plus WEIGHTED (8). WEIGHTED fallback is still (L+T)/2 at B5
        // but included for stability; the true LS solver lands when the 6x6 path is wired.
        for (int pid = 0; pid <= 8; ++pid) {
            PredId id = static_cast<PredId>(pid);
            uint64_t tot = 0;
            for (const auto& plane : r.planes) {
                tot += plane_residual_energy(plane, r.w, r.h, id);
                if (tot >= best_energy) break; // early prune
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
