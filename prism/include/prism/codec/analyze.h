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
};
AnalyzeResult analyze(const Raster& r, uint8_t effort);
} // namespace prism::codec
