#pragma once
#include "prism/types.h"
#include "prism/codec/histogram.h"
#include "prism/codec/hybrid_uint.h"
#include "prism/codec/ans_static.h"
#include <cstdint>
#include <vector>

namespace prism::codec::r3 {

// Route 3 two-pass encoder skeleton.
// Pass 1 (analysis): O(N), zero bits in stream - builds MA-tree, cluster
//   assignments, per-cluster histograms, global histogram.
// Pass 2 (coding): O(N) - ANS coding with per-cluster static tables.
//
// Spec: blueprint section 2.1.3, invariants I15-I17.

// Feature vector for MA-tree evaluation in Route 3.
// Extends prism::Feature with position features for spatially-varying clusters.
struct FeatureR3 {
    uint16_t qg = 0;
    uint8_t  band_class = 0;
    uint8_t  llc_class = 0;
    uint16_t res_diff = 0;
    uint8_t  sibling_class = 0;
    uint8_t  activity = 0;
    uint8_t  position_y = 0;  // normalized 0..255
    uint8_t  position_x = 0;  // normalized 0..255
};

// MA-tree node for Route 3 clustering.
struct MATreeNodeR3 {
    bool is_leaf = true;
    uint16_t leaf_id = 0;
    uint8_t prop_id = 0;       // 0=QG, 1=BandClass, 2=Activity, 3=PositionY, 4=PositionX
    uint16_t threshold = 0;
    int32_t left = -1;
    int32_t right = -1;
};

// MA-tree for Route 3 clustering.
struct MATreeR3 {
    uint8_t max_depth = 0;
    uint16_t num_leaves = 0;
    std::vector<MATreeNodeR3> nodes;

    // Evaluate feature to leaf id.
    uint16_t eval(const FeatureR3& f) const;

    // Serialize to bytes (model blob format).
    std::vector<uint8_t> serialize() const;

    // Deserialize from bytes.
    static MATreeR3 deserialize(const uint8_t* data, size_t len);

    // Build a greedy MA-tree from features and cluster assignments.
    // Features are indexed by sample position; cluster_ids are the target partition.
    static MATreeR3 build_greedy(
        const std::vector<FeatureR3>& features,
        uint16_t num_clusters,
        uint8_t max_depth);
};

struct MultiPassEncoder {
    // Configuration (pinned in addendum 22).
    uint8_t effort = 5;           // 0..7
    uint8_t T_ESC = 8;           // escape ladder for hybrid-uint
    uint16_t num_clusters = 32;   // K (typically 30-80)
    uint8_t max_depth = 10;       // MA-tree max depth

    // Pass 1 result: analysis of the image.
    struct AnalysisResult {
        std::vector<uint16_t> cluster_ids;     // per-sample cluster assignment
        std::vector<Histogram> cluster_hists;  // per-cluster residual histograms
        Histogram global_hist;                 // pooled image-global histogram
        MATreeR3 tree;                         // MA-tree built from features
        uint8_t color_transform_id = 0;       // trial-selected color transform
        uint8_t alphabet_size = 0;             // hybrid-uint alphabet size
        uint32_t num_samples = 0;              // total residual samples
        uint32_t width = 0;
        uint32_t height = 0;
    };

    // Pass 2 result: coded bitstream.
    struct CodeResult {
        std::vector<uint8_t> payload;          // ANS-coded residuals
        std::vector<uint8_t> model_blob;       // serialized tree + histograms + cluster_ids
        uint32_t payload_len = 0;
        uint32_t model_len = 0;
    };

    // Pass 1: analyze the raster and build per-cluster histograms.
    // Produces cluster assignments and histogram tables.
    AnalysisResult analyze(const std::vector<int32_t>& residuals,
                           uint32_t w, uint32_t h) const;

    // Pass 2: code residuals using ANS with per-cluster static tables.
    CodeResult code(const std::vector<int32_t>& residuals,
                    const AnalysisResult& analysis) const;

    // Decode: reconstruct residuals from coded payload + model blob.
    std::vector<int32_t> decode(
        const uint8_t* payload, size_t payload_len,
        const uint8_t* model_blob, size_t model_len,
        size_t num_samples) const;

    // Build feature vectors from residuals and spatial coordinates.
    static std::vector<FeatureR3> build_features(
        const std::vector<int32_t>& residuals,
        uint32_t w, uint32_t h);

    // Compute maximum residual magnitude for alphabet sizing.
    static int32_t max_residual(const std::vector<int32_t>& residuals);
};

} // namespace prism::codec::r3
