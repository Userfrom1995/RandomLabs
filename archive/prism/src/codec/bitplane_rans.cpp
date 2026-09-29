// Per-symbol binary rANS (Route 4 bitplane backend).
//
// A verbatim port of the rANS family in prism/src/codec/rans.cpp (proven-good
// for a fixed symbol probability). This backend is a pure STATIC per-symbol coder:
// the probability P(0)*M for each symbol is supplied by the caller (the learned
// context model), so it carries no internal adaptive state and cannot desync.
//
// LIFO-safety argument (ryg analysis): rANS is a stack; the decoder recovers the
// last encoded symbol first, so the encoder emits symbols in REVERSE. The
// caller hands the encoder the per-symbol probability in forward order; the
// encoder records it and emits in reverse, and the decoder, walking forward,
// feeds the identical probability for each symbol. Round-trip is exact.

#include "prism/codec/bitplane_rans.h"
#include <algorithm>
#include <stdexcept>
#include <vector>

namespace prism::codec {

namespace {
constexpr uint32_t RANS_BYTE_L = 1u << 23;  // normalization lower bound
constexpr uint32_t RANS_M = 1u << 16;       // frequency denominator
constexpr uint32_t RANS_SCALE_BITS = 16;
constexpr uint32_t RANS_MASK = RANS_M - 1;

using RansState = uint32_t;

inline void rans_enc_init(RansState* r) { *r = RANS_BYTE_L; }

inline RansState rans_enc_renorm(RansState x, uint8_t** pptr, uint32_t freq, uint32_t sb) {
    uint32_t x_max = ((RANS_BYTE_L >> sb) << 8) * freq;
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

inline void rans_enc_put(RansState* r, uint8_t** pptr, uint8_t bit, uint16_t prob) {
    uint32_t start = (bit ? prob : 0);
    uint32_t freq = (bit ? (RANS_M - prob) : prob);
    RansState x = rans_enc_renorm(*r, pptr, freq, RANS_SCALE_BITS);
    *r = ((x / freq) << RANS_SCALE_BITS) + (x % freq) + start;
}

inline void rans_enc_flush(RansState* r, uint8_t** pptr) {
    uint32_t x = *r;
    uint8_t* ptr = *pptr;
    ptr -= 4;
    ptr[0] = static_cast<uint8_t>(x >> 0);
    ptr[1] = static_cast<uint8_t>(x >> 8);
    ptr[2] = static_cast<uint8_t>(x >> 16);
    ptr[3] = static_cast<uint8_t>(x >> 24);
    *pptr = ptr;
}

inline void rans_dec_init(RansState* r, uint8_t** pptr) {
    uint8_t* ptr = *pptr;
    uint32_t x = static_cast<uint32_t>(ptr[0]) | (static_cast<uint32_t>(ptr[1]) << 8) |
                 (static_cast<uint32_t>(ptr[2]) << 16) | (static_cast<uint32_t>(ptr[3]) << 24);
    ptr += 4;
    *pptr = ptr;
    *r = x;
}

inline void rans_dec_advance(RansState* r, uint8_t** pptr, uint32_t start, uint32_t freq) {
    uint32_t mask = (1u << RANS_SCALE_BITS) - 1;
    uint32_t x = *r;
    x = freq * (x >> RANS_SCALE_BITS) + (x & mask) - start;
    if (x < RANS_BYTE_L) {
        uint8_t* ptr = *pptr;
        do x = (x << 8) | *ptr++; while (x < RANS_BYTE_L);
        *pptr = ptr;
    }
    *r = x;
}
}  // namespace

std::vector<uint8_t> BitplaneRans::encode(const std::vector<uint8_t>& bits,
                                         const std::vector<uint16_t>& p0) const {
    const size_t n = bits.size();
    if (p0.size() != n) throw std::invalid_argument("BitplaneRans::encode: bits/p0 size mismatch");

    std::vector<uint8_t> buf(n * 4 + 32, 0);
    uint8_t* ptr = buf.data() + buf.size();
    RansState state;
    rans_enc_init(&state);
    // Reverse emission; each symbol uses its supplied probability.
    for (size_t k = n; k-- > 0;) rans_enc_put(&state, &ptr, bits[k], p0[k]);
    rans_enc_flush(&state, &ptr);
    return std::vector<uint8_t>(ptr, buf.data() + buf.size());
}

void BitplaneRans::Decoder::init(const std::vector<uint8_t>& bytes) {
    if (bytes.size() < 4) throw std::runtime_error("BitplaneRans::Decoder: stream too short");
    ptr_ = bytes.data();
    rans_dec_init(&state_, const_cast<uint8_t**>(&ptr_));
}

uint8_t BitplaneRans::Decoder::decode_symbol(uint16_t p0) {
    uint32_t slot = state_ & RANS_MASK;
    uint8_t bit = (slot >= p0) ? 1 : 0;
    uint32_t start = (bit ? p0 : 0);
    uint32_t freq = (bit ? (RANS_M - p0) : p0);
    rans_dec_advance(&state_, const_cast<uint8_t**>(&ptr_), start, freq);
    return bit;
}

bool BitplaneRans::self_test(const std::vector<uint8_t>& bits,
                             const std::vector<uint16_t>& p0) const {
    auto enc = encode(bits, p0);
    Decoder dec;
    dec.init(enc);
    std::vector<uint8_t> out(bits.size(), 0);
    for (size_t k = 0; k < bits.size(); ++k) out[k] = dec.decode_symbol(p0[k]);
    return out == bits;
}

}  // namespace prism::codec
