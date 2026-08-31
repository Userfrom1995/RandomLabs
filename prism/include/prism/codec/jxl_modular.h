#pragma once
#include "prism/codec/wavelet.h"
#include "prism/codec/matree.h"
#include "prism/codec/ans_static.h"
#include "prism/types.h"
#include <vector>
#include <cstdint>

namespace prism::codec {

// True JXL-Modular multi-pass encoder (issue #130, Owner directive
// 2026-08-27T08:19:10Z).
//
// Architectural difference from R6-B/D:
// - R6-B: per-(subband,class) static histograms, ~192 contexts (subband x class)
// - R6-D: baked property tree with per-leaf transmitted histograms
// - JXL-Modular (this): per-image MA-tree built from spatial features,
//   30-80 clusters, per-cluster transmitted histograms
//
// Pipeline:
//   Pass 1 (analysis, O(N)):
//     1. Apply color transform (YCoCg-R)
//     2. Apply wavelet transform (LeGall 5/3)
//     3. Compute coefficient predictor residuals
//     4. Build MA-tree over spatial features (production build_matree_greedy, 8 properties)
//     5. Partition samples into K clusters (K ~ 30-80)
//   6. Count residuals per cluster (alphabet 128 symbols, res_to_sym bijection)
//   7. Estimate ANS entropy per cluster (theoretical, no container/ANS stream)
//   8. Score candidate K by theoretical bits (ans_bits_for_hist + header overhead)
//
//   Pass 2 (coding, O(N)):
//     1. Re-apply color transform + wavelet + predictor
//     2. Re-compute MA-tree cluster assignments
//     3. Code residuals with ANS using cluster-specific static probabilities
//     4. Transmit: header + MA-tree + delta-coded histograms + ANS payload
//
//   Decode (single pass, O(N)):
//     1. Parse header, MA-tree, histograms
//     2. For each coefficient: resolve cluster, decode with ANS
//     3. Inverse wavelet + inverse color transform
//
// Table-economics (I12) is eliminated by construction: the MA-tree and
// histograms are transmitted as part of the format, not as payable side-info.
// The "table cost" is amortized over the entire cluster.

struct JXLModularResult {
    std::vector<uint8_t> encoded_bytes;
    size_t total_bytes = 0;
    int num_clusters = 0;
    float per_sample_bpp = 0.0f;
    float summed_bpp = 0.0f;
    bool byte_exact = false;
};

// Encode a raster image using the true JXL-Modular multi-pass architecture.
// k_target=0 means auto-sweep {8,16,32,48,64,128}; >0 means fixed K.
JXLModularResult jxl_modular_encode(const Raster& raster, int k_target = 0);

// Decode a JXL-Modular encoded stream back to a raster.
Raster jxl_modular_decode(const uint8_t* data, size_t len);

// Probe the JXL-Modular encoder on a set of images and report results.
// Returns per-image results and aggregate statistics.
struct JXLModularProbeResult {
    std::vector<JXLModularResult> per_image;
    float mean_per_sample_bpp = 0.0f;
    float mean_summed_bpp = 0.0f;
    bool all_byte_exact = true;
    int num_images = 0;
};

JXLModularProbeResult jxl_modular_probe_kodak(const std::string& kodak_dir);

} // namespace prism::codec
