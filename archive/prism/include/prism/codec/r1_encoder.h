#pragma once
#include "prism/types.h"
#include "prism/codec/multipass.h"
#include "prism/codec/acoder.h"
#include <cstdint>
#include <vector>

namespace prism::codec::r1 {

// Route 1 adaptive encoder: multi-pass with ACoderV2 (adaptive per-leaf coding).
// Uses full v1 features (QG, band_class, activity, position) for MA-tree
// clustering with entropy-based splitting. The decoder recomputes leaf IDs
// from the MA-tree without storing them in the stream.

// Reuse FeatureR3 from multipass.h for feature vectors.
using FeatureR1 = r3::FeatureR3;

// MA-tree node for Route 1 (same layout as MATreeNodeR3).
using MATreeNodeR1 = r3::MATreeNodeR3;

struct MATreeR1 {
    uint8_t max_depth = 0;
    uint16_t num_leaves = 0;
    std::vector<MATreeNodeR1> nodes;

    uint16_t eval(const FeatureR1& f) const;
    std::vector<uint8_t> serialize() const;
    static MATreeR1 deserialize(const uint8_t* data, size_t len);

    // Entropy-based greedy MA-tree builder using all v1 features.
    static MATreeR1 build_greedy(
        const std::vector<FeatureR1>& features,
        const std::vector<int32_t>& residuals,
        uint16_t num_clusters,
        uint8_t max_depth);
};

struct R1PlaneAnalysis {
    std::vector<uint16_t> leaf_ids;
    MATreeR1 tree;
    uint32_t num_samples = 0;
};

struct R1Encoder {
    uint8_t effort = 5;
    uint16_t num_clusters = 32;
    uint8_t max_depth = 10;
    bool uniform_priors = false;

    struct AnalysisResult {
        std::vector<R1PlaneAnalysis> planes;
        uint8_t color_transform_id = 0;
        uint32_t width = 0;
        uint32_t height = 0;
        uint8_t num_channels = 0;
    };

    struct CodeResult {
        std::vector<uint8_t> payload;
        std::vector<uint8_t> model_blob;
        uint32_t payload_len = 0;
        uint32_t model_len = 0;
    };

    // Pass 1: analysis with full v1 features + entropy-based MA-tree.
    AnalysisResult analyze(
        const std::vector<std::vector<uint16_t>>& plane_pixels,
        const std::vector<std::vector<int32_t>>& plane_residuals,
        uint32_t w, uint32_t h, uint8_t num_channels,
        uint8_t bit_depth) const;

    // Pass 2: adaptive coding using ACoderV2 with pre-computed leaf IDs.
    CodeResult code(
        const std::vector<std::vector<int32_t>>& plane_residuals,
        const AnalysisResult& analysis) const;

    // Decode: recomputes leaf IDs from MA-tree (no leaf storage).
    std::vector<std::vector<int32_t>> decode(
        const uint8_t* payload, size_t payload_len,
        const uint8_t* model_blob, size_t model_len,
        uint32_t w, uint32_t h, uint8_t num_channels,
        const std::vector<uint16_t>& plane_bd_max) const;
};

} // namespace prism::codec::r1
