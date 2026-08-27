#pragma once
#include "prism/types.h"
#include "prism/codec/histogram.h"
#include "prism/codec/hybrid_uint.h"
#include "prism/codec/ans_static.h"
#include <cstdint>
#include <vector>

namespace prism::codec::r3 {

// Route 1 multi-pass encoder: transmitted histograms + static ANS + MA-tree
// clustering, retaining Prism v1's MED prediction and ZFF binarization.
//
// Cascade from Route 3 R1 FAIL: position-only features fail to capture
// residual statistics; combined stream dilutes per-plane statistics.
// Route 1 fixes both by using full v1 features and per-plane encoding.

struct FeatureR3 {
    uint16_t qg = 0;
    uint8_t  band_class = 0;
    uint8_t  llc_class = 0;
    uint16_t res_diff = 0;
    uint8_t  sibling_class = 0;
    uint8_t  activity = 0;
    uint8_t  position_y = 0;
    uint8_t  position_x = 0;
};

struct MATreeNodeR3 {
    bool is_leaf = true;
    uint16_t leaf_id = 0;
    uint8_t prop_id = 0;
    uint16_t threshold = 0;
    int32_t left = -1;
    int32_t right = -1;
};

struct MATreeR3 {
    uint8_t max_depth = 0;
    uint16_t num_leaves = 0;
    std::vector<MATreeNodeR3> nodes;

    uint16_t eval(const FeatureR3& f) const;
    std::vector<uint8_t> serialize() const;
    static MATreeR3 deserialize(const uint8_t* data, size_t len);
    static MATreeR3 build_greedy(
        const std::vector<FeatureR3>& features,
        uint16_t num_clusters,
        uint8_t max_depth);
};

struct PlaneAnalysis {
    std::vector<uint16_t> cluster_ids;
    std::vector<Histogram> cluster_hists;
    Histogram global_hist;
    MATreeR3 tree;
    uint8_t alphabet_size = 0;
    uint32_t num_samples = 0;
};

struct MultiPassEncoder {
    uint8_t effort = 5;
    uint8_t T_ESC = 8;
    uint16_t num_clusters = 32;
    uint8_t max_depth = 10;
    bool use_full_features = true;

    struct AnalysisResult {
        std::vector<PlaneAnalysis> planes;
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

    // Per-plane analyze with pixel data for full v1 features (Route 1).
    AnalysisResult analyze(
        const std::vector<std::vector<uint16_t>>& plane_pixels,
        const std::vector<std::vector<int32_t>>& plane_residuals,
        uint32_t w, uint32_t h, uint8_t num_channels,
        uint8_t bit_depth) const;

    // Per-plane analyze with residual-based features.
    AnalysisResult analyze(
        const std::vector<std::vector<int32_t>>& plane_residuals,
        uint32_t w, uint32_t h, uint8_t num_channels) const;

    // Backward-compatible single-stream analyze (wraps to 1-channel per-plane).
    AnalysisResult analyze(const std::vector<int32_t>& residuals,
                           uint32_t w, uint32_t h) const;

    // Per-plane ANS coding.
    CodeResult code(
        const std::vector<std::vector<int32_t>>& plane_residuals,
        const AnalysisResult& analysis) const;

    // Backward-compatible single-stream code (wraps to 1 channel).
    CodeResult code(const std::vector<int32_t>& residuals,
                    const AnalysisResult& analysis) const;

    // Per-plane decode.
    std::vector<std::vector<int32_t>> decode(
        const uint8_t* payload, size_t payload_len,
        const uint8_t* model_blob, size_t model_len,
        uint32_t w, uint32_t h, uint8_t num_channels) const;

    // Legacy single-stream decode (R3 format backward compatibility).
    std::vector<int32_t> decode_legacy(
        const uint8_t* payload, size_t payload_len,
        const uint8_t* model_blob, size_t model_len,
        size_t num_samples, uint32_t w, uint32_t h) const;

    static std::vector<FeatureR3> build_features(
        const std::vector<uint16_t>& pixels,
        uint32_t w, uint32_t h,
        uint8_t band_class, uint8_t bit_depth);

    static std::vector<FeatureR3> build_features_residuals(
        const std::vector<int32_t>& residuals,
        uint32_t w, uint32_t h);

    static int32_t max_residual(const std::vector<int32_t>& residuals);

    static int32_t med_predict(const std::vector<uint16_t>& pixels,
                               uint32_t w, uint32_t x, uint32_t y);
};

} // namespace prism::codec::r3
