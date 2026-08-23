#pragma once
#include "prism/types.h"
#include "prism/codec/matree.h"
#include "prism/codec/predict.h"
namespace prism::codec {
struct AnalyzeResult {
    uint8_t color_transform_id = 0;
    std::vector<uint8_t> cfl_scales;
    std::vector<uint8_t> squeeze_levels;
    std::vector<MATreeGroup> trees;
    uint8_t predictor_mode = 0;
    uint8_t global_pred_id = 3;
    std::vector<uint8_t> per_leaf_pred;
    // C2 (issue #130): true when the serialized MA-tree applies to planes
    // coded at squeeze level 0 (spatial leaf contexts). Signaled by container
    // flags bit4; decode mirrors via decode_band_generic(isLL=true).
    bool tree_on_flat = false;
};
AnalyzeResult analyze(const Raster& r, uint8_t effort);

// Trial/final encoder for a full plane through MA-tree leaf contexts with the
// v2 backend (flags bit3): identical feature computation to the LL branch of
// prism.cpp's encode_band_generic with band_class 0 and no ll/sibling sources.
// Used BOTH for the trial-bits acceptance decision in analyze() and for the
// final payload emission in prism.cpp, so there is exactly one implementation.
std::vector<uint8_t> encode_plane_tree_v2(const std::vector<uint16_t>& plane,
                                          uint32_t w, uint32_t h,
                                          const MATree& tree, int num_leaves,
                                          uint8_t bit_depth);
} // namespace prism::codec
