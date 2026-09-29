// Route 3 ANS static-probability coder/decoder (rANS, 12-bit normalization).
// Spec: blueprint section 2.1.4, addendum 22.3.
//
// Single-state rANS with 12-bit precision (SCALE = 4096) for correctness.
// Per-cluster static probability tables (no online adaptation).
// Symbol-level coding: each symbol is coded with its cluster's CDF.

#include "prism/codec/ans_static.h"
#include <algorithm>
#include <cstring>
#include <stdexcept>

namespace prism::codec::r3 {

namespace {
// State lives in [L, M*L).  M = 2^12 = 4096 (precision).
// L = 2^22 = 4194304, so L/M = 2^10 = 1024.
constexpr uint32_t RANS_L = 1u << 22;
constexpr uint32_t RANS_M = 1u << 12;

using RansState = uint32_t;

static inline RansState RansEncRenorm(RansState x, uint8_t*& ptr,
                                       uint32_t freq) {
    // x_max = (L >> 12) * 8 * freq = 1024 * 8 * freq
    uint32_t x_max = ((RANS_L >> 12) << 8) * freq;
    if (x >= x_max) {
        do {
            *--ptr = static_cast<uint8_t>(x & 0xff);
            x >>= 8;
        } while (x >= x_max);
    }
    return x;
}

static inline void RansEncFlush(RansState r, uint8_t*& ptr) {
    ptr -= 4;
    ptr[0] = static_cast<uint8_t>(r >> 0);
    ptr[1] = static_cast<uint8_t>(r >> 8);
    ptr[2] = static_cast<uint8_t>(r >> 16);
    ptr[3] = static_cast<uint8_t>(r >> 24);
}

static inline RansState RansDecInit(uint8_t*& ptr) {
    uint32_t x;
    x  = static_cast<uint32_t>(ptr[0]);
    x |= static_cast<uint32_t>(ptr[1]) << 8;
    x |= static_cast<uint32_t>(ptr[2]) << 16;
    x |= static_cast<uint32_t>(ptr[3]) << 24;
    ptr += 4;
    return x;
}

static inline RansState RansDecAdvance(RansState x, uint8_t*& ptr,
                                        uint32_t start, uint32_t freq) {
    uint32_t mask = RANS_M - 1;
    x = freq * (x >> 12) + (x & mask) - start;
    if (x < RANS_L) {
        do x = (x << 8) | *ptr++; while (x < RANS_L);
    }
    return x;
}
} // namespace

void ANSStaticModel::build_from_histograms(const std::vector<Histogram>& hists) {
    tables.resize(hists.size());
    for (size_t c = 0; c < hists.size(); ++c) {
        const Histogram& h = hists[c];
        ClusterTable& t = tables[c];
        t.alphabet_size = h.alphabet_size;
        t.total = SCALE;

        auto freq = h.normalize_12bit();

        t.cum_freq[0] = 0;
        for (size_t i = 0; i < 64; ++i) {
            t.freq[i] = (i < h.alphabet_size) ? freq[i] : 0;
            t.cum_freq[i + 1] = t.cum_freq[i] + t.freq[i];
        }
        t.cum_freq[64] = SCALE;
    }
}

void ANSStaticModel::encode_symbol(
    uint32_t state[NUM_STATES],
    uint8_t*& ptr,
    const ClusterTable& table,
    uint32_t symbol) {
    if (symbol >= 64 || table.freq[symbol] == 0)
        throw std::runtime_error("ANSStaticModel::encode_symbol: invalid symbol");

    uint32_t x = state[0];
    uint32_t start = table.cum_freq[symbol];
    uint32_t freq = table.freq[symbol];

    x = RansEncRenorm(x, ptr, freq);
    x = ((x / freq) << 12) + (x % freq) + start;
    state[0] = x;
}

uint32_t ANSStaticModel::decode_symbol(
    uint32_t state[NUM_STATES],
    uint8_t*& ptr,
    const ClusterTable& table) {
    uint32_t x = state[0];
    uint32_t slot = x & (RANS_M - 1);

    uint32_t symbol = 0;
    for (uint32_t i = 0; i < 64; ++i) {
        if (table.cum_freq[i] <= slot && slot < table.cum_freq[i + 1]) {
            symbol = i;
            break;
        }
    }

    uint32_t start = table.cum_freq[symbol];
    uint32_t freq = table.freq[symbol];
    if (freq == 0)
        throw std::runtime_error("ANSStaticModel::decode_symbol: zero frequency");

    x = RansDecAdvance(x, ptr, start, freq);
    state[0] = x;

    return symbol;
}

std::vector<uint8_t> ANSStaticModel::encode(
    const int32_t* symbols,
    const uint16_t* cluster_ids,
    size_t count) const {
    if (tables.empty()) return {};

    std::vector<uint8_t> buf(count * 8 + 64, 0);
    uint8_t* ptr = buf.data() + buf.size();

    RansState state = RANS_L;

    // Encode in REVERSE order (LIFO).
    for (size_t i = count; i-- > 0; ) {
        uint32_t sym = (uint32_t)symbols[i];
        uint16_t cl = cluster_ids[i];
        if (cl >= tables.size())
            throw std::runtime_error("ANSStaticModel::encode: invalid cluster id");

        const ClusterTable& table = tables[cl];
        if (table.freq[sym] == 0)
            throw std::runtime_error("ANSStaticModel::encode: zero frequency symbol");

        uint32_t start = table.cum_freq[sym];
        uint32_t freq = table.freq[sym];

        state = RansEncRenorm(state, ptr, freq);
        state = ((state / freq) << 12) + (state % freq) + start;
    }

    RansEncFlush(state, ptr);

    return std::vector<uint8_t>(ptr, buf.data() + buf.size());
}

void ANSStaticModel::decode(
    const uint8_t* data, size_t data_len,
    int32_t* symbols,
    const uint16_t* cluster_ids,
    size_t count) const {
    if (data_len < 4)
        throw std::runtime_error("ANSStaticModel::decode: data too short");

    // rANS is LIFO: encoder writes bytes backward, then flushes state at the
    // front.  Decoder reads state from the front, then reads coded bytes forward.
    uint8_t* ptr = const_cast<uint8_t*>(data);

    RansState state = RansDecInit(ptr);

    // Decode FORWARD.
    for (size_t i = 0; i < count; ++i) {
        uint16_t cl = cluster_ids[i];
        if (cl >= tables.size())
            throw std::runtime_error("ANSStaticModel::decode: invalid cluster id");

        const ClusterTable& table = tables[cl];
        uint32_t slot = state & (RANS_M - 1);

        uint32_t symbol = 0;
        for (uint32_t j = 0; j < 64; ++j) {
            if (table.cum_freq[j] <= slot && slot < table.cum_freq[j + 1]) {
                symbol = j;
                break;
            }
        }

        uint32_t start = table.cum_freq[symbol];
        uint32_t freq = table.freq[symbol];
        if (freq == 0)
            throw std::runtime_error("ANSStaticModel::decode: zero frequency");

        state = RansDecAdvance(state, ptr, start, freq);
        symbols[i] = (int32_t)symbol;
    }
}

} // namespace prism::codec::r3
