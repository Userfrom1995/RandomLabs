// JXL-Modular ANS static-probability coder/decoder.
// 512-symbol alphabet, 12-bit precision rANS.
// LIFO encoding (encoder writes backward), FIFO decoding (decoder reads forward).

#include "prism/codec/jxl_modular_ans.h"
#include <cstring>
#include <stdexcept>
#include <algorithm>

namespace prism::codec {

namespace {
constexpr uint32_t RANS_L = 1u << 22;
constexpr uint32_t RANS_M = 1u << 12;
constexpr uint32_t RANS_MASK = RANS_M - 1;

static inline void renorm_enc(uint32_t& x, uint8_t*& ptr, uint32_t freq) {
    uint32_t x_max = ((RANS_L >> 12) << 8) * freq;
    while (x >= x_max) {
        *--ptr = static_cast<uint8_t>(x & 0xff);
        x >>= 8;
    }
}

static inline void flush_enc(uint32_t x, uint8_t*& ptr) {
    ptr -= 4;
    ptr[0] = (uint8_t)(x);
    ptr[1] = (uint8_t)(x >> 8);
    ptr[2] = (uint8_t)(x >> 16);
    ptr[3] = (uint8_t)(x >> 24);
}

static inline uint32_t init_dec(const uint8_t*& ptr) {
    uint32_t x;
    x  = (uint32_t)ptr[0];
    x |= (uint32_t)ptr[1] << 8;
    x |= (uint32_t)ptr[2] << 16;
    x |= (uint32_t)ptr[3] << 24;
    ptr += 4;
    return x;
}

static inline void advance_dec(uint32_t& x, const uint8_t*& ptr,
                                uint32_t start, uint32_t freq) {
    x = freq * (x >> 12) + (x & RANS_MASK) - start;
    while (x < RANS_L) {
        x = (x << 8) | *ptr++;
    }
}

// Linear search CDF for decode. For 512 symbols this is acceptable;
// the hot path is the entropy coding, not the CDF lookup.
static inline uint32_t lookup_symbol(const uint16_t* cum_freq, uint32_t slot) {
    for (uint32_t i = 0; i < JXLModularANS::ALPHABET; ++i) {
        if (cum_freq[i] <= slot && slot < cum_freq[i + 1])
            return i;
    }
    return 0;
}
} // namespace

uint32_t JXLModularANS::decode_init(const uint8_t*& ptr) {
    return init_dec(ptr);
}

uint32_t JXLModularANS::decode_one(uint32_t& state, const uint8_t*& ptr, uint16_t cluster_id) const {
    if (cluster_id >= (uint16_t)tables.size()) cluster_id = 0;
    const ClusterTable& t = tables[cluster_id];
    uint32_t slot = state & RANS_MASK;
    uint32_t sym = lookup_symbol(t.cum_freq.data(), slot);
    uint32_t start = t.cum_freq[sym];
    uint32_t freq = t.freq[sym];
    advance_dec(state, ptr, start, freq);
    return sym;
}

void JXLModularANS::build(
    const std::vector<std::array<uint32_t, ALPHABET>>& hists,
    const std::vector<uint32_t>& totals) {

    tables.resize(hists.size());
    for (size_t c = 0; c < hists.size(); ++c) {
        ClusterTable& t = tables[c];
        t.total = totals[c];
        if (totals[c] == 0) continue;

        // Normalize to SCALE (4096) using largest-remainder method.
        // Only nonzero symbols get freq > 0; zero-count symbols get freq=0
        // (the encoder remaps them to the escape symbol ALPHABET-1).
        uint32_t sum = 0;
        for (int s = 0; s < ALPHABET; ++s) {
            if (hists[c][s] == 0) { t.freq[s] = 0; continue; }
            uint32_t raw = (uint32_t)((uint64_t)hists[c][s] * SCALE / totals[c]);
            t.freq[s] = (uint16_t)std::max(1u, raw);
            sum += t.freq[s];
        }
        // Ensure escape symbol (ALPHABET-1) always has freq >= 1 so the
        // encoder can remap zero-count symbols to it.
        if (t.freq[ALPHABET - 1] == 0) {
            t.freq[ALPHABET - 1] = 1;
            sum += 1;
        }
        // Adjust largest frequencies to hit SCALE exactly.
        int32_t diff = (int32_t)SCALE - (int32_t)sum;
        if (diff > 0) {
            for (int s = 0; s < ALPHABET && diff > 0; ++s) {
                if (hists[c][s] > 0 && s != ALPHABET - 1) {
                    uint32_t add = std::min((uint32_t)diff, hists[c][s] / 2 + 1);
                    t.freq[s] += (uint16_t)add;
                    diff -= add;
                }
            }
            // If still have diff, distribute to escape symbol
            if (diff > 0) { t.freq[ALPHABET - 1] += (uint16_t)diff; diff = 0; }
        } else if (diff < 0) {
            for (int s = ALPHABET - 2; s >= 0 && diff < 0; --s) {
                if (t.freq[s] > 1) {
                    uint32_t sub = std::min((uint32_t)(-diff), (uint32_t)(t.freq[s] - 1));
                    t.freq[s] -= (uint16_t)sub;
                    diff += sub;
                }
            }
        }

        // Build CDF.
        t.cum_freq[0] = 0;
        for (int s = 0; s < ALPHABET; ++s) {
            t.cum_freq[s + 1] = t.cum_freq[s] + t.freq[s];
        }
    }
}

std::vector<uint8_t> JXLModularANS::encode(
    const uint32_t* symbols,
    const uint16_t* cluster_ids,
    size_t count) const {

    if (tables.empty() || count == 0) return {};

    std::vector<uint8_t> buf(count * 4 + 64, 0);
    uint8_t* ptr = buf.data() + buf.size();

    uint32_t state = RANS_L;

    for (size_t i = count; i-- > 0; ) {
        uint32_t sym = symbols[i];
        uint16_t cl = cluster_ids[i];
        if (cl >= (uint16_t)tables.size()) cl = 0;

        const ClusterTable& t = tables[cl];
        if (sym >= ALPHABET || t.freq[sym] == 0) {
            // Symbol not in table: remap to escape (symbol ALPHABET-1).
            sym = ALPHABET - 1;
        }

        uint32_t start = t.cum_freq[sym];
        uint32_t freq = t.freq[sym];

        renorm_enc(state, ptr, freq);
        state = (state / freq) * RANS_M + (state % freq) + start;
    }

    flush_enc(state, ptr);

    return std::vector<uint8_t>(ptr, buf.data() + buf.size());
}

void JXLModularANS::decode(
    const uint8_t* data, size_t data_len,
    uint32_t* symbols,
    const uint16_t* cluster_ids,
    size_t count) const {

    if (data_len < 4)
        throw std::runtime_error("JXLModularANS::decode: data too short");

    const uint8_t* ptr = data;
    uint32_t state = init_dec(ptr);

    for (size_t i = 0; i < count; ++i) {
        uint16_t cl = cluster_ids[i];
        if (cl >= (uint16_t)tables.size()) cl = 0;

        const ClusterTable& t = tables[cl];
        uint32_t slot = state & RANS_MASK;
        uint32_t sym = lookup_symbol(t.cum_freq.data(), slot);

        uint32_t start = t.cum_freq[sym];
        uint32_t freq = t.freq[sym];

        advance_dec(state, ptr, start, freq);
        symbols[i] = sym;
    }
}

} // namespace prism::codec
