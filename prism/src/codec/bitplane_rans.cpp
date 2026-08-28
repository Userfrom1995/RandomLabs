// Per-context adaptive binary rANS (Route 4 bitplane backend).
//
// This is a verbatim port of the family of rANS in prism/src/codec/rans.cpp
// (the same one used by the production codec), which is known-good for a FIXED
// symbol probability. This backend makes the per-context EMA model ACTUALLY
// drive the coding: it is a LIFO-safe CAUSAL-adaptive binary rANS (I27: no
// transmitted tables, online-adapted, LIFO-safe).
//
// LIFO-safety argument (ryg analysis): rANS is a stack; the decoder recovers
// the last encoded symbol first, so the encoder emits symbols in REVERSE. To
// keep the adaptive model in sync, the encoder performs a FORWARD causal
// adaptation pass first, recording for every symbol k the model state as it
// stood AFTER symbols [0, k-1] (the "causal" state for symbol k). The encoder
// then emits symbols in reverse, feeding that precomputed probability to the
// rANS core. The decoder runs forward, and after recovering each symbol k its
// own model state equals exactly the causal state for symbol k+1, so the next
// decode uses the same probability the encoder used. No desync is possible.
//
// The 128 contexts (40 base + 40 sign + 48 refinement, see bitplane.cpp) fully
// separate statistics, so the per-context EMA needs no per-image side info.

#include "prism/codec/bitplane_rans.h"
#include <algorithm>
#include <stdexcept>
#include <vector>

namespace prism::codec {

namespace {
// Renormalization constants mirrored from rans.cpp (proven-good).
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

// Causal EMA update: p0 carries P(0)*M. A 0 bit raises p0 toward M, a 1 bit
// lowers it. shift-5 matches ACoderV2 (addendum 25). Clamped into (0, M) so the
// rANS frequency never degenerates.
inline void ema_update(uint8_t bit, BitplaneRans::BinaryModel& m) {
    if (bit == 0)
        m.p0 += (BitplaneRans::M - m.p0) >> BitplaneRans::EMA_SHIFT;
    else
        m.p0 -= m.p0 >> BitplaneRans::EMA_SHIFT;
    if (m.p0 < 1) m.p0 = 1;
    if (m.p0 > BitplaneRans::M - 1) m.p0 = BitplaneRans::M - 1;
}
}  // namespace

std::vector<uint8_t> BitplaneRans::encode(const std::vector<uint8_t>& bits,
                                           const std::vector<uint32_t>& ctx) const {
    const size_t n = bits.size();
    if (ctx.size() != n) throw std::invalid_argument("BitplaneRans::encode: bits/ctx size mismatch");

    // Forward causal adaptation pass: record the model state BEFORE each symbol
    // (i.e. after symbols [0, k-1]) and advance the model with bits[k].
    std::vector<BinaryModel> models(NUM_CONTEXTS);
    std::vector<uint16_t> prob0(n);
    for (size_t k = 0; k < n; ++k) {
        prob0[k] = models[ctx[k]].p0;
        ema_update(bits[k], models[ctx[k]]);
    }

    std::vector<uint8_t> buf(n * 4 + 32, 0);
    uint8_t* ptr = buf.data() + buf.size();
    RansState state;
    rans_enc_init(&state);
    // Reverse emission; each symbol uses its precomputed causal probability.
    for (size_t k = n; k-- > 0;) rans_enc_put(&state, &ptr, bits[k], prob0[k]);
    rans_enc_flush(&state, &ptr);
    return std::vector<uint8_t>(ptr, buf.data() + buf.size());
}

void BitplaneRans::Decoder::init(const std::vector<uint8_t>& bytes) {
    if (bytes.size() < 4) throw std::runtime_error("BitplaneRans::Decoder: stream too short");
    ptr_ = bytes.data();
    rans_dec_init(&state_, const_cast<uint8_t**>(&ptr_));
}

uint8_t BitplaneRans::Decoder::decode_symbol(uint32_t ctx) {
    BinaryModel& m = models_[ctx];
    uint16_t prob = m.p0;  // causal state before this symbol, mirrors encoder
    uint32_t slot = state_ & RANS_MASK;
    uint8_t bit = (slot >= prob) ? 1 : 0;
    uint32_t start = (bit ? prob : 0);
    uint32_t freq = (bit ? (RANS_M - prob) : prob);
    rans_dec_advance(&state_, const_cast<uint8_t**>(&ptr_), start, freq);
    ema_update(bit, m);  // advance the model with the recovered symbol
    return bit;
}

bool BitplaneRans::self_test(const std::vector<uint8_t>& bits,
                             const std::vector<uint32_t>& ctx) const {
    auto enc = encode(bits, ctx);
    Decoder dec;
    dec.init(enc);
    std::vector<uint8_t> out(bits.size(), 0);
    for (size_t k = 0; k < bits.size(); ++k) out[k] = dec.decode_symbol(ctx[k]);
    return out == bits;
}

}  // namespace prism::codec
