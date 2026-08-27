// Route 3 histogram accumulator, smoothing, normalization, serialization.
// Spec: blueprint section 2.1.3, addendum 22 (pinned constants).

#include "prism/codec/histogram.h"
#include <algorithm>
#include <cmath>
#include <cstring>
#include <stdexcept>

namespace prism::codec::r3 {

// ---- Histogram ----

void Histogram::reset() {
    std::fill(counts, counts + MAX_ALPHABET, 0u);
    total = 0;
    alphabet_size = 0;
}

void Histogram::add(uint8_t token) {
    if (token >= MAX_ALPHABET)
        throw std::out_of_range("Histogram::add: token >= MAX_ALPHABET");
    counts[token]++;
    total++;
    if (token >= alphabet_size) alphabet_size = token + 1;
}

std::array<uint16_t, Histogram::MAX_ALPHABET> Histogram::normalize_12bit() const {
    std::array<uint16_t, MAX_ALPHABET> freq{};
    if (total == 0) {
        // Uniform: each symbol gets NORMALIZE_SUM / alphabet_size.
        uint16_t base = (uint16_t)(NORMALIZE_SUM / (alphabet_size > 0 ? alphabet_size : 1));
        for (size_t i = 0; i < alphabet_size; ++i) freq[i] = base;
        return freq;
    }

    // Largest-remainder method (ascending-id tie-break).
    // Multiply each count by NORMALIZE_SUM, divide by total.
    uint32_t remaining = NORMALIZE_SUM;
    for (size_t i = 0; i < alphabet_size; ++i) {
        uint64_t product = (uint64_t)counts[i] * NORMALIZE_SUM;
        uint16_t base = (uint16_t)(product / total);
        freq[i] = base;
        remaining -= base;
    }

    // Distribute remainders in order of fractional part (descending).
    // For ties, ascending index wins (ascending-id tie-break).
    struct Entry { size_t idx; uint64_t frac; };
    std::vector<Entry> entries;
    entries.reserve(alphabet_size);
    for (size_t i = 0; i < alphabet_size; ++i) {
        uint64_t product = (uint64_t)counts[i] * NORMALIZE_SUM;
        uint64_t base = product / total;
        uint64_t frac = product - base * total;
        entries.push_back({i, frac});
    }
    std::sort(entries.begin(), entries.end(), [](const Entry& a, const Entry& b) {
        if (a.frac != b.frac) return a.frac > b.frac;
        return a.idx < b.idx;
    });

    // Floor every entry to at least 1 when there are samples.
    for (size_t i = 0; i < alphabet_size; ++i) {
        if (freq[i] < 1) freq[i] = 1;
    }
    // Re-check sum after floor.
    uint32_t sum = 0;
    for (size_t i = 0; i < alphabet_size; ++i) sum += freq[i];
    // If sum exceeds NORMALIZE_SUM due to floors, reduce largest entries.
    while (sum > NORMALIZE_SUM && alphabet_size > 0) {
        // Find the entry with the largest count that has freq > 1.
        size_t best = 0;
        for (size_t i = 1; i < alphabet_size; ++i) {
            if (freq[i] > freq[best]) best = i;
        }
        if (freq[best] > 1) {
            freq[best]--;
            sum--;
        } else {
            break;  // all at 1, cannot reduce further
        }
    }

    // Distribute remaining slots (if any) via largest remainders.
    uint32_t deficit = NORMALIZE_SUM - sum;
    for (size_t k = 0; k < deficit && k < entries.size(); ++k) {
        freq[entries[k].idx]++;
    }

    return freq;
}

std::array<uint32_t, Histogram::MAX_ALPHABET + 1> Histogram::build_cdf(
    const std::array<uint16_t, MAX_ALPHABET>& freq) const {
    std::array<uint32_t, MAX_ALPHABET + 1> cum{};
    cum[0] = 0;
    for (size_t i = 0; i < MAX_ALPHABET; ++i) {
        cum[i + 1] = cum[i] + freq[i];
    }
    // Ensure last entry equals NORMALIZE_SUM (may differ by 1 due to rounding).
    cum[MAX_ALPHABET] = NORMALIZE_SUM;
    return cum;
}

void Histogram::smooth(const Histogram& prior, double alpha, double r) {
    if (alphabet_size == 0) return;

    // Geometric decay: r^(alphabet-1-i), so the first symbol (index 0) gets
    // the highest prior weight, and the last gets the lowest.
    double total_smoothed = 0;
    for (size_t i = 0; i < alphabet_size; ++i) {
        double decay = std::pow(r, (double)(alphabet_size - 1 - i));
        double smooth = (double)counts[i] + alpha * (double)prior.counts[i] * decay;
        counts[i] = (uint32_t)std::max(0.0, smooth);
        total_smoothed += (double)counts[i];
    }
    total = (uint32_t)total_smoothed;

    // Re-normalize to NORMALIZE_SUM via the largest-remainder method.
    auto norm = normalize_12bit();
    // Overwrite counts with normalized values (they serve as the 12-bit freq
    // representation after smoothing; total is set to NORMALIZE_SUM).
    for (size_t i = 0; i < MAX_ALPHABET; ++i) {
        counts[i] = norm[i];
    }
    total = NORMALIZE_SUM;
}

// ---- HistogramSerializer ----

// Internal layout (little-endian):
//   u8  alphabet_size
//   u16 num_clusters
//   [global_prior]: ceil(alphabet * 12 / 8) bytes, 12-bit packed
//   For each cluster 0..K-1:
//     u16 delta_len (byte length of this cluster's delta)
//     delta_bytes (s16 delta from global prior)

namespace {
// Pack an array of 12-bit values into bytes (LSB-first).
std::vector<uint8_t> pack_12bit(const uint16_t* vals, size_t count) {
    std::vector<uint8_t> out;
    out.reserve((count * 12 + 7) / 8);
    uint32_t buf = 0;
    int bits = 0;
    for (size_t i = 0; i < count; ++i) {
        buf |= (uint32_t)(vals[i] & 0xFFF) << bits;
        bits += 12;
        while (bits >= 8) {
            out.push_back((uint8_t)(buf & 0xFF));
            buf >>= 8;
            bits -= 8;
        }
    }
    if (bits > 0) {
        out.push_back((uint8_t)(buf & 0xFF));
    }
    return out;
}

// Unpack 12-bit values from bytes.
void unpack_12bit(const uint8_t* data, size_t data_len, uint16_t* vals, size_t count) {
    size_t byte_idx = 0;
    int bit_shift = 0;
    uint32_t buf = 0;
    for (size_t i = 0; i < count; ++i) {
        while (bit_shift < 12 && byte_idx < data_len) {
            buf |= (uint32_t)data[byte_idx] << bit_shift;
            bit_shift += 8;
            byte_idx++;
        }
        vals[i] = (uint16_t)(buf & 0xFFF);
        buf >>= 12;
        bit_shift -= 12;
    }
}
} // namespace

std::vector<uint8_t> HistogramSerializer::serialize(
    const Histogram& global,
    const std::vector<Histogram>& cluster_hists,
    size_t* audit_counted) {
    std::vector<uint8_t> out;
    uint8_t alphabet = global.alphabet_size;
    uint16_t num_clusters = (uint16_t)cluster_hists.size();

    // Header
    out.push_back(alphabet);
    out.push_back((uint8_t)(num_clusters & 0xFF));
    out.push_back((uint8_t)((num_clusters >> 8) & 0xFF));

    // Global prior: 12-bit packed
    auto global_norm = global.normalize_12bit();
    auto packed = pack_12bit(global_norm.data(), alphabet);
    out.insert(out.end(), packed.begin(), packed.end());

    // Per-cluster deltas (from normalized 12-bit values, not raw counts)
    for (uint16_t c = 0; c < num_clusters; ++c) {
        const Histogram& ch = cluster_hists[c];
        auto ch_norm = ch.normalize_12bit();
        // Compute s16 deltas from global prior (both normalized).
        std::vector<int16_t> deltas(alphabet);
        for (uint8_t i = 0; i < alphabet; ++i) {
            int32_t delta = (int32_t)ch_norm[i] - (int32_t)global_norm[i];
            // Clamp to s16 range.
            delta = std::max(-32768, std::min(32767, delta));
            deltas[i] = (int16_t)delta;
        }
        // Serialize deltas as raw bytes.
        size_t delta_bytes = alphabet * sizeof(int16_t);
        out.push_back((uint8_t)(delta_bytes & 0xFF));
        out.push_back((uint8_t)((delta_bytes >> 8) & 0xFF));
        const uint8_t* raw = reinterpret_cast<const uint8_t*>(deltas.data());
        out.insert(out.end(), raw, raw + delta_bytes);
    }

    if (audit_counted) *audit_counted = out.size();
    return out;
}

HistogramSerializer::DeserializeResult HistogramSerializer::deserialize(
    const uint8_t* data, size_t len,
    uint16_t num_clusters, uint8_t alphabet_size) {
    if (len < 3)
        throw std::runtime_error("HistogramSerializer::deserialize: truncated header");

    size_t pos = 0;
    uint8_t alphabet = data[pos++];
    if (alphabet != alphabet_size)
        throw std::runtime_error("HistogramSerializer::deserialize: alphabet mismatch");

    uint16_t nc = (uint16_t)data[pos] | ((uint16_t)data[pos + 1] << 8);
    pos += 2;
    if (nc != num_clusters)
        throw std::runtime_error("HistogramSerializer::deserialize: cluster count mismatch");

    // Unpack global prior.
    size_t packed_len = (alphabet * 12 + 7) / 8;
    if (pos + packed_len > len)
        throw std::runtime_error("HistogramSerializer::deserialize: truncated global prior");

    Histogram global{};
    global.alphabet_size = alphabet;
    std::array<uint16_t, Histogram::MAX_ALPHABET> global_norm{};
    unpack_12bit(data + pos, packed_len, global_norm.data(), alphabet);
    pos += packed_len;

    for (uint8_t i = 0; i < alphabet; ++i) {
        global.counts[i] = global_norm[i];
    }
    global.total = Histogram::NORMALIZE_SUM;

    // Deserialize per-cluster deltas.
    std::vector<Histogram> cluster_hists(num_clusters);
    for (uint16_t c = 0; c < num_clusters; ++c) {
        if (pos + 2 > len)
            throw std::runtime_error("HistogramSerializer::deserialize: truncated delta length");
        uint16_t delta_len = (uint16_t)data[pos] | ((uint16_t)data[pos + 1] << 8);
        pos += 2;
        if (pos + delta_len > len)
            throw std::runtime_error("HistogramSerializer::deserialize: truncated delta data");
        if (delta_len != alphabet * sizeof(int16_t))
            throw std::runtime_error("HistogramSerializer::deserialize: unexpected delta length");

        Histogram& ch = cluster_hists[c];
        ch.alphabet_size = alphabet;
        const int16_t* deltas = reinterpret_cast<const int16_t*>(data + pos);
        uint32_t sum = 0;
        for (uint8_t i = 0; i < alphabet; ++i) {
            int32_t val = (int32_t)global_norm[i] + (int32_t)deltas[i];
            val = std::max(0, std::min((int32_t)Histogram::NORMALIZE_SUM, val));
            ch.counts[i] = (uint32_t)val;
            sum += ch.counts[i];
        }
        ch.total = sum;
        pos += delta_len;
    }

    return {global, cluster_hists};
}

} // namespace prism::codec::r3
