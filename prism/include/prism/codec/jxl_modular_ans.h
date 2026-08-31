#pragma once
// JXL-Modular ANS static-probability coder/decoder (rANS, 12-bit precision).
// 512-symbol alphabet for the res_to_sym bijection.
// Per-cluster static probability tables; no online adaptation.
// Encoder writes LIFO (reverse), decoder reads FIFO (forward).

#include <cstdint>
#include <vector>
#include <array>

namespace prism::codec {

struct JXLModularANS {
    static constexpr int PRECISION = 12;
    static constexpr uint32_t SCALE = 1u << PRECISION;
    static constexpr int ALPHABET = 512;

    struct ClusterTable {
        uint32_t total = 0;
        std::array<uint16_t, ALPHABET + 1> cum_freq{};
        std::array<uint16_t, ALPHABET> freq{};
    };

    std::vector<ClusterTable> tables;

    // Build from raw cluster histograms (counts[cluster][symbol]).
    void build(const std::vector<std::array<uint32_t, ALPHABET>>& hists,
               const std::vector<uint32_t>& totals);

    // LIFO encode. Returns byte stream (state flush + coded bytes).
    std::vector<uint8_t> encode(
        const uint32_t* symbols,
        const uint16_t* cluster_ids,
        size_t count) const;

    // FIFO decode all at once (cluster_ids precomputed).
    void decode(
        const uint8_t* data, size_t data_len,
        uint32_t* symbols,
        const uint16_t* cluster_ids,
        size_t count) const;

    // Initialize decoder state from byte stream. Returns initial rANS state + advancing ptr.
    static uint32_t decode_init(const uint8_t*& ptr);

    // Decode a single symbol given the current state and cluster ID.
    // Advances the state in place and returns the decoded symbol.
    uint32_t decode_one(uint32_t& state, const uint8_t*& ptr, uint16_t cluster_id) const;
};

} // namespace prism::codec
