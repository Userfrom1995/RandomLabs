#pragma once
#include <cstdint>
#include <vector>
#include <array>

namespace prism::codec::r3 {

// Per-cluster histogram for Route 3 multi-pass encoding.
// Accumulates token counts, smooths toward a pooled prior, and normalizes
// to 12-bit (sum = 4096) for ANS static-probability coding.
//
// Spec: blueprint section 2.1.3, addendum 22 (pinned constants).

struct Histogram {
    static constexpr size_t MAX_ALPHABET = 64;
    static constexpr uint32_t NORMALIZE_SUM = 4096;  // 12-bit normalization

    uint32_t counts[MAX_ALPHABET]{};
    uint32_t total = 0;
    uint8_t alphabet_size = 0;

    // Reset all counts to zero.
    void reset();

    // Add one token occurrence.
    void add(uint8_t token);

    // Smooth toward `prior` with pseudo-count weight `alpha` and geometric
    // decay `r`.  After smoothing, the histogram is re-normalized to sum
    // exactly NORMALIZE_SUM (12-bit).
    //
    // Formula (addendum 22.2):
    //   smoothed[i] = counts[i] + alpha * prior[i] * r^(alphabet-1-i)
    //   then normalize to 4096 via largest-remainder method.
    void smooth(const Histogram& prior, double alpha, double r);

    // Normalize counts to exactly NORMALIZE_SUM using the largest-remainder
    // method (ascending-id tie-break).  Result stored in the provided array.
    // No fractional counts; every symbol gets at least 1 when total > 0.
    std::array<uint16_t, MAX_ALPHABET> normalize_12bit() const;

    // Build cumulative frequency table for ANS coding.
    // cum_freq[i] = sum of freq[0..i-1], cum_freq[alphabet] = NORMALIZE_SUM.
    std::array<uint32_t, MAX_ALPHABET + 1> build_cdf(
        const std::array<uint16_t, MAX_ALPHABET>& freq) const;
};

// Hierarchical delta-coded histogram serializer.
// Layout: global prior (12-bit packed) + per-cluster delta-coded histograms.
struct HistogramSerializer {
    // Serialize: global prior + per-cluster deltas.
    // Returns byte vector; audit_counted receives total byte count.
    static std::vector<uint8_t> serialize(
        const Histogram& global,
        const std::vector<Histogram>& cluster_hists,
        size_t* audit_counted = nullptr);

    struct DeserializeResult {
        Histogram global;
        std::vector<Histogram> cluster_hists;
    };

    // Deserialize.  Throws on truncation or corruption.
    static DeserializeResult deserialize(
        const uint8_t* data, size_t len,
        uint16_t num_clusters, uint8_t alphabet_size);
};

} // namespace prism::codec::r3
