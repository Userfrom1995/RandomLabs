// Prism rANS entropy coder (32-bit, byte-aligned).
//
// Verbatim port of Fabian 'ryg' Giesen's public-domain rans_byte.h (the
// "before-put / after-advance" renormalization). We use a FIXED per-bin
// probability model: a single running adaptive model cannot round-trip with
// rANS LIFO decoding, because the decoder's model-update order is the reverse
// of the encoder's and the two desync. Fixed per-context probabilities are
// LIFO-safe; online adaptation (causal context from already-decoded data) is
// scheduled for M1. See prism/docs or the reviewer thread for the analysis.
//
// rANS is a stack: the decoder recovers the last encoded symbol first. The
// encoder therefore processes symbols in REVERSE (last symbol first) and the
// decoder processes them forward. Residuals are modelled with an Elias-gamma
// magnitude (compact for small values, correct for any int32) plus a sign bit.

#include "prism/codec/rans.h"
#include <algorithm>
#include <stdexcept>
#include <vector>

namespace prism::codec {

namespace {
constexpr uint32_t RANS_BYTE_L = 1u << 23;   // normalization lower bound
constexpr uint32_t RANS_M = 1u << 16;        // frequency denominator (M = 2^16)
constexpr uint32_t RANS_SCALE_BITS = 16;
constexpr uint32_t RANS_MASK = RANS_M - 1;

using RansState = uint32_t;

static inline void RansEncInit(RansState* r) { *r = RANS_BYTE_L; }

static inline RansState RansEncRenorm(RansState x, uint8_t** pptr, uint32_t freq, uint32_t scale_bits) {
    uint32_t x_max = ((RANS_BYTE_L >> scale_bits) << 8) * freq;
    if (x >= x_max) {
        uint8_t* ptr = *pptr;
        do {
            *--ptr = static_cast<uint8_t>(x & 0xff);
            x >>= 8;
        } while (x >= x_max);
        *pptr = ptr;
    }
    return x;
}

static inline void RansEncPut(RansState* r, uint8_t** pptr, uint32_t start, uint32_t freq, uint32_t scale_bits) {
    RansState x = RansEncRenorm(*r, pptr, freq, scale_bits);
    *r = ((x / freq) << scale_bits) + (x % freq) + start;
}

static inline void RansEncFlush(RansState* r, uint8_t** pptr) {
    uint32_t x = *r;
    uint8_t* ptr = *pptr;
    ptr -= 4;
    ptr[0] = static_cast<uint8_t>(x >> 0);
    ptr[1] = static_cast<uint8_t>(x >> 8);
    ptr[2] = static_cast<uint8_t>(x >> 16);
    ptr[3] = static_cast<uint8_t>(x >> 24);
    *pptr = ptr;
}

static inline void RansDecInit(RansState* r, uint8_t** pptr) {
    uint32_t x;
    uint8_t* ptr = *pptr;
    x  = static_cast<uint32_t>(ptr[0] << 0);
    x |= static_cast<uint32_t>(ptr[1] << 8);
    x |= static_cast<uint32_t>(ptr[2] << 16);
    x |= static_cast<uint32_t>(ptr[3] << 24);
    ptr += 4;
    *pptr = ptr;
    *r = x;
}

static inline void RansDecAdvance(RansState* r, uint8_t** pptr, uint32_t start, uint32_t freq, uint32_t scale_bits) {
    uint32_t mask = (1u << scale_bits) - 1;
    uint32_t x = *r;
    x = freq * (x >> scale_bits) + (x & mask) - start;
    if (x < RANS_BYTE_L) {
        uint8_t* ptr = *pptr;
        do x = (x << 8) | *ptr++; while (x < RANS_BYTE_L);
        *pptr = ptr;
    }
    *r = x;
}

// Fixed probability for the residual streams in M0 (single context). The bins
// are coded at 0.5 -> 1 bit/bin, which is correct and bounded; context-modelled
// probabilities arrive with M1.
constexpr uint16_t RESIDUAL_PROB = 32768;

static inline void put_bin(RansState* st, uint8_t** pptr, uint8_t bit, uint16_t prob) {
    uint32_t start = (bit ? prob : 0);
    uint32_t freq = (bit ? (RANS_M - prob) : prob);
    RansEncPut(st, pptr, start, freq, RANS_SCALE_BITS);
}

static inline uint8_t get_bin(RansState* st, uint8_t** pptr, uint16_t prob) {
    uint32_t slot = *st & RANS_MASK;
    bool bit = (slot >= prob);
    uint32_t start = (bit ? prob : 0);
    uint32_t freq = (bit ? (RANS_M - prob) : prob);
    RansDecAdvance(st, pptr, start, freq, RANS_SCALE_BITS);
    return bit ? 1 : 0;
}

} // namespace

std::vector<uint8_t> rans_encode_bits(const std::vector<uint8_t>& bits, uint16_t prob) {
    if (prob == 0) prob = 1;
    if (prob >= RANS_M) prob = RANS_M - 1;
    std::vector<uint8_t> buf(bits.size() * 8 + 32, 0);
    uint8_t* ptr = buf.data() + buf.size();
    RansState state;
    RansEncInit(&state);
    for (size_t i = bits.size(); i-- > 0; ) {
        uint8_t b = bits[i];
        uint32_t start = (b ? prob : 0);
        uint32_t freq = (b ? (RANS_M - prob) : prob);
        RansEncPut(&state, &ptr, start, freq, RANS_SCALE_BITS);
    }
    RansEncFlush(&state, &ptr);
    return std::vector<uint8_t>(ptr, buf.data() + buf.size());
}

std::vector<uint8_t> rans_decode_bits(const std::vector<uint8_t>& bytes, size_t num_bits, uint16_t prob) {
    if (prob == 0) prob = 1;
    if (prob >= RANS_M) prob = RANS_M - 1;
    if (bytes.size() < 4) throw std::runtime_error("rans_decode_bits: too short");
    uint8_t* d = const_cast<uint8_t*>(bytes.data());
    RansState state;
    RansDecInit(&state, &d);
    std::vector<uint8_t> out(num_bits, 0);
    for (size_t c = 0; c < num_bits; ++c) {
        uint32_t slot = state & RANS_MASK;
        bool bit = (slot >= prob);
        uint32_t start = (bit ? prob : 0);
        uint32_t freq = (bit ? (RANS_M - prob) : prob);
        RansDecAdvance(&state, &d, start, freq, RANS_SCALE_BITS);
        out[c] = bit ? 1 : 0;
    }
    return out;
}

std::vector<uint8_t> rans_encode_plane(const std::vector<int32_t>& residuals, int /*num_contexts*/) {
    std::vector<uint8_t> buf(residuals.size() * 64 + 32, 0);
    uint8_t* ptr = buf.data() + buf.size();
    RansState state;
    RansEncInit(&state);
    for (size_t i = residuals.size(); i-- > 0; ) {
        bool sign = residuals[i] < 0;
        uint32_t m = static_cast<uint32_t>(std::abs(residuals[i]));
        std::vector<uint8_t> seq;
        seq.push_back(sign ? 1 : 0);                 // sign bit
        if (m == 0) {
            seq.push_back(0);                        // zero flag
        } else {
            seq.push_back(1);                        // nonzero flag
            int L = 31 - __builtin_clz(m);           // floor(log2(m))
            for (int k = 0; k < L; ++k) seq.push_back(0);
            seq.push_back(1);                        // unary stop
            uint32_t rem = m - (1u << L);
            for (int k = L - 1; k >= 0; --k) seq.push_back((rem >> k) & 1u);
        }
        for (size_t j = seq.size(); j-- > 0; )       // emit reversed (LIFO)
            put_bin(&state, &ptr, seq[j], RESIDUAL_PROB);
    }
    RansEncFlush(&state, &ptr);
    return std::vector<uint8_t>(ptr, buf.data() + buf.size());
}

std::vector<int32_t> rans_decode_plane(const std::vector<uint8_t>& bytes, size_t num_residuals, int /*num_contexts*/) {
    if (bytes.size() < 4) throw std::runtime_error("rans_decode_plane: too short");
    uint8_t* d = const_cast<uint8_t*>(bytes.data());
    RansState state;
    RansDecInit(&state, &d);
    std::vector<int32_t> out(num_residuals, 0);
    for (size_t c = 0; c < num_residuals; ++c) {
        bool sign = get_bin(&state, &d, RESIDUAL_PROB);
        uint8_t nonzero = get_bin(&state, &d, RESIDUAL_PROB);
        uint32_t m = 0;
        if (nonzero) {
            int L = 0;
            while (get_bin(&state, &d, RESIDUAL_PROB) == 0) ++L;   // unary prefix
            uint32_t rem = 0;
            for (int k = 0; k < L; ++k)                             // suffix bits MSB-first
                rem = (rem << 1) | get_bin(&state, &d, RESIDUAL_PROB);
            m = (1u << L) + rem;
        }
        out[c] = sign ? -static_cast<int32_t>(m) : static_cast<int32_t>(m);
    }
    return out;
}

} // namespace prism::codec
