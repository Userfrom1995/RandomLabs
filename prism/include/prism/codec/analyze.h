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

// Build the C2 spatial MA-tree over every plane's MED-residual features
// (band_class 0, no ll/sibling sources). One implementation shared by the
// analyze() acceptance trial and the probe rail, so both measure exactly the
// model production would ship.
MATree build_spatial_flat_tree(const Raster& raster);

// Trial/final encoder for a full plane through MA-tree leaf contexts with the
// v2 backend (flags bit3): identical feature computation to the LL branch of
// prism.cpp's encode_band_generic with band_class 0 and no ll/sibling sources.
// Used BOTH for the trial-bits acceptance decision in analyze() and for the
// final payload emission in prism.cpp, so there is exactly one implementation.
std::vector<uint8_t> encode_plane_tree_v2(const std::vector<uint16_t>& plane,
                                          uint32_t w, uint32_t h,
                                          const MATree& tree, int num_leaves,
                                          uint8_t bit_depth);

// ----- C2b composite plane coders (issue #130) -----
// The tree refines the exact causal context instead of replacing it:
// model id = leaf * 343 + resdiff. Encode and decode are exact mirrors; the
// decoder interleaves leaf/feature recomputation with sample reconstruction,
// which is why these live at the plane level rather than as bare acoder
// helpers. Used by the acceptance trial, final emission, and decode dispatch.
std::vector<uint8_t> encode_plane_tree_composite_v2(const std::vector<uint16_t>& plane,
                                                    uint32_t w, uint32_t h,
                                                    const MATree& tree, int num_leaves,
                                                    uint8_t bit_depth);
std::vector<uint16_t> decode_plane_tree_composite_v2(const std::vector<uint8_t>& bytes,
                                                     uint32_t w, uint32_t h,
                                                     const MATree& tree, int num_leaves,
                                                     uint8_t bit_depth, uint16_t bd_max);
} // namespace prism::codec
