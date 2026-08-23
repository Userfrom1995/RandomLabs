#pragma once
#include "prism/codec/matree.h"
#include <vector>

namespace prism::codec {

struct MatreeBuildParams {
    int max_depth = 4;
    int max_leaves = 16;
};

// Greedy entropy-split MA-tree builder over (Feature, residual) pairs.
// Must include llc_class (PropId 2) and sibling_class (PropId 4) in candidate set (R11-A guard).
// Returns a tree with up to max_leaves leaves. Single leaf if no split gives gain.
MATree build_matree_greedy(const std::vector<Feature>& feats,
                           const std::vector<int32_t>& residuals,
                           const MatreeBuildParams& params = {});

// Helpers to quantize values for llc_class / sibling_class
uint8_t quant_llc(uint16_t val, uint8_t bit_depth = 8);
uint8_t quant_sibling(int16_t val);
uint8_t quant_qg(int32_t L, int32_t T, int32_t TL, int32_t TR);

} // namespace prism::codec
