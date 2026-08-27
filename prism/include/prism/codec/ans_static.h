#pragma once
#include "prism/codec/histogram.h"
#include <cstdint>
#include <vector>
#include <array>

namespace prism::codec::r3 {

// ANS static-probability coder/decoder for Route 3 multi-pass encoding.
// Single-state rANS with 12-bit precision (sum = 4096) for R0 harness.
// Interleaving (16-way) deferred to R1 per addendum 22.3.
// Static probabilities derived from transmitted histograms; no
// epsilon-adaptation in the R-series (addendum 22.3).
//
// The coder processes symbol streams in LIFO order (rANS is a stack).
// For multi-pass encoding, symbols are processed in reverse order during
// encoding and forward order during decoding.

struct ANSStaticModel {
    static constexpr int NUM_STATES = 1;  // R0: single-state rANS (interleave deferred to R1)
    static constexpr int PRECISION = 12;       // 12-bit normalization
    static constexpr uint32_t SCALE = 1 << PRECISION;  // 4096

    // Per-cluster probability table.
    struct ClusterTable {
        uint8_t alphabet_size = 0;
        std::array<uint32_t, 65> cum_freq{};   // cumulative frequencies (0..64)
        std::array<uint32_t, 64> freq{};       // symbol frequencies
        uint32_t total = SCALE;
    };

    std::vector<ClusterTable> tables;  // one per cluster

    // Build from histograms (smoothed and normalized).
    void build_from_histograms(const std::vector<Histogram>& hists);

    // Encode a symbol stream with per-cluster assignments.
    // residuals[i] is coded using tables[cluster_ids[i]].
    // The coder processes in REVERSE (LIFO) and produces a byte stream.
    std::vector<uint8_t> encode(
        const int32_t* symbols,
        const uint16_t* cluster_ids,
        size_t count) const;

    // Decode a byte stream, recovering symbols and cluster assignments.
    // The caller must provide the cluster_ids array (reconstructed from
    // the MA-tree on the decode side).
    void decode(
        const uint8_t* data, size_t data_len,
        int32_t* symbols,
        const uint16_t* cluster_ids,
        size_t count) const;

    // Encode a single symbol under a given cluster table.
    // State in/out via the interleaved rANS state array.
    static void encode_symbol(
        uint32_t state[NUM_STATES],
        uint8_t*& ptr,
        const ClusterTable& table,
        uint32_t symbol);

    // Decode a single symbol under a given cluster table.
    static uint32_t decode_symbol(
        uint32_t state[NUM_STATES],
        uint8_t*& ptr,
        const ClusterTable& table);
};

} // namespace prism::codec::r3
