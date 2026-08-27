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
        uint8_t color_transform_id = 0;       // trial-selected color transform
        uint8_t alphabet_size = 0;             // hybrid-uint alphabet size
        uint32_t num_samples = 0;              // total residual samples
    };

    // Pass 2 result: coded bitstream.
    struct CodeResult {
        std::vector<uint8_t> payload;          // ANS-coded residuals
        std::vector<uint8_t> model_blob;       // serialized tree + histograms
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

    // Simple cluster assignment: round-robin assignment based on spatial
    // position (placeholder for MA-tree; the real MA-tree will be wired
    // in a later phase).
    static std::vector<uint16_t> assign_clusters_simple(
        uint32_t w, uint32_t h, uint16_t num_clusters);

    // Compute maximum residual magnitude for alphabet sizing.
    static int32_t max_residual(const std::vector<int32_t>& residuals);
};

} // namespace prism::codec::r3
