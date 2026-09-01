#pragma once
#include "prism/codec/matree.h"
#include <vector>
#include <cstddef>

namespace prism::codec {

// C2 caps (issue #130, architecture-jxl-parity.md section 4.1): the tree is
// always-on at effort >= 3, so the old depth-4/leaves-16 limits are raised
// and the implicit 32-sample split floor becomes an explicit parameter.
struct MatreeBuildParams {
    int max_depth = 10;
    int max_leaves = 256;
    int min_samples_per_leaf = 512;
};

// Induction subsample cap: greedy splitting scans every candidate over every
// current leaf sample, so trees are INDUCED on at most this many (strided,
// deterministic) samples. Acceptance is still decided by real trial-encoded
// bytes on the FULL image (never-expand invariant I4), so a subsample can
// only affect model quality, never soundness.
constexpr size_t MATREE_INDUCTION_CAP = 32768;

// Greedy entropy-split MA-tree builder over (Feature, residual) pairs.
// Must include llc_class (PropId 2) and sibling_class (PropId 4) in candidate set (R11-A guard).
// Returns a tree with up to max_leaves leaves. Single leaf if no split gives gain.
//
// Split thresholds (C2): for every property except BandClass (which keeps its
// equality semantics) the candidate set is taken at QUANTILE POINTS of the
// node's own value distribution (octiles, deduplicated) instead of the old
// fixed global list, so thresholds adapt to each node. Candidates are scanned
// in (property id, threshold ascending) order with strict gain improvement,
// which makes the chosen split fully deterministic for a given dataset.
// A split is rejected unless both children hold at least
// min_samples_per_leaf induction samples.
MATree build_matree_greedy(const std::vector<Feature>& feats,
                           const std::vector<int32_t>& residuals,
                           const MatreeBuildParams& params = {});

// Helpers to quantize values for llc_class / sibling_class
uint8_t quant_llc(uint16_t val, uint8_t bit_depth = 8);
uint8_t quant_sibling(int16_t val);
uint8_t quant_qg(int32_t L, int32_t T, int32_t TL, int32_t TR);
uint8_t quant_neighbor_mag(int32_t L, int32_t T, int32_t TL, int32_t TR);
uint8_t quant_prev_coeff_mag(int32_t val);

} // namespace prism::codec
