#include "prism/codec/analyze.h"
#include "prism/codec/color.h"

namespace prism::codec {

AnalyzeResult analyze(const Raster& r, uint8_t effort) {
    AnalyzeResult res;
    // Color: M0 always None to guarantee roundtrip; YCoCg-R re-enabled after fixing 16-bit overflow (M2)
    (void)r;
    res.color_transform_id = 0; // ColorTransform::None
    res.cfl_scales.assign(std::max(0, (int)r.num_channels() - 1), 0);
    // Squeeze: M0 always 0
    res.squeeze_levels.assign(r.num_channels(), 0);
    if (effort >= 7) {
        // Future: search squeeze levels
    }
    // Trees: one single-leaf tree per group/band
    // For M0, one tree group 0 band 0
    MATreeGroup g;
    g.group_id = 0;
    g.band_class = 0;
    g.tree = MATree::single_leaf();
    res.trees.push_back(g);
    res.predictor_mode = 0;
    res.global_pred_id = 3; // MED
    return res;
}

} // namespace prism::codec
