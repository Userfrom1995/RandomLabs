// Route 3 two-pass encoder skeleton.
// Spec: blueprint section 2.1.3, invariants I15-I17.
//
// R0 implementation: simple spatial cluster assignment as a placeholder
// for the MA-tree. The real MA-tree builder will replace assign_clusters_simple
// when R2 wires it in.

#include "prism/codec/multipass.h"
#include <algorithm>
#include <cstring>
#include <stdexcept>

namespace prism::codec::r3 {

std::vector<uint16_t> MultiPassEncoder::assign_clusters_simple(
    uint32_t w, uint32_t h, uint16_t num_clusters) {
    // Simple spatial tiling: divide the raster into K tiles.
    // Each pixel gets cluster = tile_id, where tiles are arranged in a grid.
    size_t n = (size_t)w * h;
    std::vector<uint16_t> ids(n);

    // Compute tile grid dimensions.
    uint16_t cols = 1, rows = 1;
    while (cols * rows < num_clusters) {
        if (cols <= rows) cols++;
        else rows++;
    }

    uint32_t tile_w = (w + cols - 1) / cols;
    uint32_t tile_h = (h + rows - 1) / rows;

    for (uint32_t y = 0; y < h; ++y) {
        for (uint32_t x = 0; x < w; ++x) {
            uint16_t tx = (uint16_t)(x / tile_w);
            uint16_t ty = (uint16_t)(y / tile_h);
            uint16_t tid = (uint16_t)(ty * cols + tx);
            if (tid >= num_clusters) tid = 0;
            ids[(size_t)y * w + x] = tid;
        }
    }
    return ids;
}

int32_t MultiPassEncoder::max_residual(const std::vector<int32_t>& residuals) {
    int32_t mx = 0;
    for (int32_t r : residuals) {
        int32_t a = r < 0 ? -(int64_t)r : (int64_t)r;
        if (a > mx) mx = a;
    }
    return mx;
}

MultiPassEncoder::AnalysisResult MultiPassEncoder::analyze(
    const std::vector<int32_t>& residuals, uint32_t w, uint32_t h) const {
    AnalysisResult result;
    size_t n = residuals.size();
    result.num_samples = (uint32_t)n;

    // Compute alphabet size from max residual.
    int32_t mx = max_residual(residuals);
    result.alphabet_size = HybridUintProfile::compute_alphabet(T_ESC, mx);

    // Assign clusters (placeholder: spatial tiling).
    result.cluster_ids = assign_clusters_simple(w, h, num_clusters);

    // Build per-cluster histograms.
    result.cluster_hists.resize(num_clusters);
    for (auto& h : result.cluster_hists) {
        h.alphabet_size = result.alphabet_size;
        h.reset();
    }
    result.global_hist.alphabet_size = result.alphabet_size;
    result.global_hist.reset();

    HybridUintProfile profile;
    profile.T_ESC = T_ESC;

    for (size_t i = 0; i < n; ++i) {
        auto ev = profile.tokenize(residuals[i]);
        uint8_t tok = ev.token;
        uint16_t cl = result.cluster_ids[i];

        result.cluster_hists[cl].add(tok);
        result.global_hist.add(tok);
    }

    return result;
}

MultiPassEncoder::CodeResult MultiPassEncoder::code(
    const std::vector<int32_t>& residuals,
    const AnalysisResult& analysis) const {
    CodeResult result;

    // Build ANS model from histograms.
    ANSStaticModel model;
    model.build_from_histograms(analysis.cluster_hists);

    // Tokenize residuals into symbols.
    HybridUintProfile profile;
    profile.T_ESC = T_ESC;

    std::vector<int32_t> symbols(residuals.size());
    for (size_t i = 0; i < residuals.size(); ++i) {
        auto ev = profile.tokenize(residuals[i]);
        symbols[i] = (int32_t)ev.token;
    }

    // Encode with per-cluster ANS.
    result.payload = model.encode(
        symbols.data(), analysis.cluster_ids.data(), symbols.size());
    result.payload_len = (uint32_t)result.payload.size();

    // Serialize model blob (histograms).
    result.model_blob = HistogramSerializer::serialize(
        analysis.global_hist, analysis.cluster_hists, nullptr);
    result.model_len = (uint32_t)result.model_blob.size();

    return result;
}

std::vector<int32_t> MultiPassEncoder::decode(
    const uint8_t* payload, size_t payload_len,
    const uint8_t* model_blob, size_t model_len,
    size_t num_samples) const {
    // Deserialize model blob.
    // Read header to get cluster count and alphabet size.
    if (model_len < 3)
        throw std::runtime_error("MultiPassEncoder::decode: model too short");

    uint8_t alphabet = model_blob[0];
    uint16_t nc = (uint16_t)model_blob[1] | ((uint16_t)model_blob[2] << 8);

    auto deser = HistogramSerializer::deserialize(
        model_blob, model_len, nc, alphabet);

    // Build ANS model from deserialized histograms.
    ANSStaticModel model;
    model.build_from_histograms(deser.cluster_hists);

    // Decode symbols.
    std::vector<int32_t> symbols(num_samples);
    // For decoding we need cluster_ids.  In R0 with simple spatial tiling,
    // these are recomputed from the header dimensions.  For now, use a
    // placeholder: decode assumes the caller provides the cluster_ids.
    // TODO: store cluster assignments in model blob for R1+.
    std::vector<uint16_t> cluster_ids(num_samples, 0);

    model.decode(payload, payload_len, symbols.data(),
                 cluster_ids.data(), num_samples);

    // Detokenize symbols back to residuals.
    HybridUintProfile profile;
    profile.T_ESC = alphabet - 1;  // T_ESC = alphabet_size - 1 for hybrid

    std::vector<int32_t> residuals(num_samples);
    for (size_t i = 0; i < num_samples; ++i) {
        HybridUintProfile::Events ev{};
        ev.token = (uint8_t)symbols[i];
        ev.has_sign = false;
        ev.sign_bit = false;
        ev.esc_quotient = 0;
        ev.esc_rawbits = 0;
        ev.raw_value = 0;
        // For full decode, the escape bits would be in the raw payload.
        // R0 skeleton: token-only decode (direct tokens only).
        residuals[i] = profile.detokenize(ev);
    }

    return residuals;
}

} // namespace prism::codec::r3
