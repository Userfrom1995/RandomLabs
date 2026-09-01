// Neural codec entropy coding (E1-E, issue #226).
//
// rANS-based entropy coding for Y_q (conditioned on sigma), Z_q (fixed model),
// and residual (existing rANS). sigma is NOT transmitted; it is re-derived from
// Z_q on decode via h_s.
//
// Coding scheme per symbol:
// - Sign bit: P(0) = 0.5 (32768/65536)
// - Magnitude: geometric code k zeros then a 1, P(0) = lambda
// - lambda = exp(-1/sigma_actual) for Y_q, fixed 0.5 for Z_q

#include "prism/codec/neural_entropy.h"
#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace prism::codec {

namespace {
constexpr uint32_t RANS_BYTE_L = 1u << 23;
constexpr uint32_t RANS_M = 1u << 16;
constexpr uint32_t RANS_SCALE_BITS = 16;
constexpr uint32_t RANS_MASK = RANS_M - 1;
constexpr int Q = 1024;

using RansState = uint32_t;

// rANS core encoder (same renormalization as rans.cpp / bitplane_rans.cpp).
inline void rans_enc_init(RansState* r) { *r = RANS_BYTE_L; }

inline RansState rans_enc_renorm(RansState x, uint8_t** pptr, uint32_t freq) {
    uint32_t x_max = ((RANS_BYTE_L >> RANS_SCALE_BITS) << 8) * freq;
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
    RansState x = rans_enc_renorm(*r, pptr, freq);
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

// rANS decoder with bounds checking.
struct DecoderState {
    RansState state;
    const uint8_t* ptr;
    const uint8_t* end;
};

inline void rans_dec_init(DecoderState* ds) {
    if (ds->ptr + 4 > ds->end) {
        throw std::runtime_error("neural_entropy: stream too short for init");
    }
    ds->state = static_cast<uint32_t>(ds->ptr[0]) |
                (static_cast<uint32_t>(ds->ptr[1]) << 8) |
                (static_cast<uint32_t>(ds->ptr[2]) << 16) |
                (static_cast<uint32_t>(ds->ptr[3]) << 24);
    ds->ptr += 4;
}

inline void rans_dec_advance(DecoderState* ds, uint32_t start, uint32_t freq) {
    uint32_t mask = (1u << RANS_SCALE_BITS) - 1;
    uint32_t x = ds->state;
    x = freq * (x >> RANS_SCALE_BITS) + (x & mask) - start;
    if (x < RANS_BYTE_L) {
        const uint8_t* ptr = ds->ptr;
        const uint8_t* end = ds->end;
        do {
            if (ptr >= end) {
                throw std::runtime_error("neural_entropy: stream underflow");
            }
            x = (x << 8) | *ptr++;
        } while (x < RANS_BYTE_L);
        ds->ptr = ptr;
    }
    ds->state = x;
}

inline uint8_t rans_dec_bit(DecoderState* ds, uint16_t prob) {
    uint32_t slot = ds->state & RANS_MASK;
    uint8_t bit = (slot >= prob) ? 1 : 0;
    uint32_t start = (bit ? prob : 0);
    uint32_t freq = (bit ? (RANS_M - prob) : prob);
    rans_dec_advance(ds, start, freq);
    return bit;
}

// Compute geometric coding lambda from sigma (Q=1024).
uint16_t sigma_to_lambda(int16_t sigma) {
    if (sigma <= 0) return 32768;  // uniform fallback
    float sigma_f = static_cast<float>(sigma) / Q;
    if (sigma_f < 0.01f) sigma_f = 0.01f;
    float lambda = std::exp(-1.0f / sigma_f);
    if (lambda < 0.01f) lambda = 0.01f;
    if (lambda > 0.99f) lambda = 0.99f;
    return static_cast<uint16_t>(lambda * RANS_M);
}

// Fixed lambda for Z_q (no hyperprior). lambda=0.5 is a conservative default.
constexpr uint16_t ZQ_LAMBDA = 32768;

// Maximum magnitude for geometric coding. int8_t range is [-128, 127],
// so |value| can be up to 128 (for -128).
constexpr int MAX_MAG = 128;

// Encode a single int8 symbol with geometric coding.
// rANS is LIFO: decoder pops in reverse of push order.
// Decoder decodes sign first, then magnitude bits (0,0,...,0,1).
// So encoder must push: stop bit, then magnitude zeros, then sign.
void enc_sym(RansState* st, uint8_t** pptr, int8_t value, uint16_t lambda_prob) {
    int mag = std::abs(static_cast<int>(value));

    // Push stop bit first (decoded last by LIFO).
    rans_enc_put(st, pptr, 1, lambda_prob);
    // Push magnitude zeros (decoded in reverse by LIFO).
    for (int k = 0; k < mag; ++k) {
        rans_enc_put(st, pptr, 0, lambda_prob);
    }
    // Push sign bit last (decoded first by LIFO).
    uint8_t sign = (value < 0) ? 1 : 0;
    rans_enc_put(st, pptr, sign, 32768);
}

// Decode a single int8 symbol with geometric coding.
int8_t dec_sym(DecoderState* ds, uint16_t lambda_prob) {
    uint8_t sign = rans_dec_bit(ds, 32768);
    int mag = 0;
    while (rans_dec_bit(ds, lambda_prob) == 0) {
        ++mag;
        if (mag > MAX_MAG) {
            throw std::runtime_error("neural_entropy: magnitude overflow");
        }
    }
    int result = sign ? -mag : mag;
    return static_cast<int8_t>(std::max(-128, std::min(127, result)));
}

} // namespace

// ---------------------------------------------------------------------------
// Encoder
// ---------------------------------------------------------------------------

std::vector<uint8_t> NeuralEntropyEncoder::encode_yq(
    const int8_t* yq, const int16_t* sigma, int n, int yh, int yw) {
    size_t count = static_cast<size_t>(n) * yh * yw;

    // Worst case: with small sigma (lambda_prob ~7), each bit costs ~2 bytes.
    // For mag=127: ~258 bytes. Use 256 bytes/symbol for safety.
    std::vector<uint8_t> buf(count * 256 + 64, 0);
    uint8_t* ptr = buf.data() + buf.size();
    RansState state;
    rans_enc_init(&state);

    // rANS LIFO: encode in reverse order.
    for (size_t i = count; i-- > 0; ) {
        uint16_t lambda = sigma_to_lambda(sigma[i]);
        enc_sym(&state, &ptr, yq[i], lambda);
    }
    rans_enc_flush(&state, &ptr);

    return std::vector<uint8_t>(ptr, buf.data() + buf.size());
}

std::vector<uint8_t> NeuralEntropyEncoder::encode_zq(
    const int8_t* zq, int m, int zh, int zw) {
    size_t count = static_cast<size_t>(m) * zh * zw;

    std::vector<uint8_t> buf(count * 256 + 64, 0);
    uint8_t* ptr = buf.data() + buf.size();
    RansState state;
    rans_enc_init(&state);

    for (size_t i = count; i-- > 0; ) {
        enc_sym(&state, &ptr, zq[i], ZQ_LAMBDA);
    }
    rans_enc_flush(&state, &ptr);

    return std::vector<uint8_t>(ptr, buf.data() + buf.size());
}

// ---------------------------------------------------------------------------
// Decoder
// ---------------------------------------------------------------------------

std::vector<int8_t> NeuralEntropyDecoder::decode_yq(
    const std::vector<uint8_t>& bytes,
    const int16_t* sigma, int n, int yh, int yw) {
    size_t count = static_cast<size_t>(n) * yh * yw;
    if (bytes.size() < 4) {
        throw std::runtime_error("neural_entropy: Y_q stream too short");
    }

    DecoderState ds;
    ds.ptr = bytes.data();
    ds.end = bytes.data() + bytes.size();
    rans_dec_init(&ds);

    std::vector<int8_t> result(count);
    for (size_t i = 0; i < count; ++i) {
        uint16_t lambda = sigma_to_lambda(sigma[i]);
        result[i] = dec_sym(&ds, lambda);
    }

    return result;
}

std::vector<int8_t> NeuralEntropyDecoder::decode_zq(
    const std::vector<uint8_t>& bytes, int m, int zh, int zw) {
    size_t count = static_cast<size_t>(m) * zh * zw;
    if (bytes.size() < 4) {
        throw std::runtime_error("neural_entropy: Z_q stream too short");
    }

    DecoderState ds;
    ds.ptr = bytes.data();
    ds.end = bytes.data() + bytes.size();
    rans_dec_init(&ds);

    std::vector<int8_t> result(count);
    for (size_t i = 0; i < count; ++i) {
        result[i] = dec_sym(&ds, ZQ_LAMBDA);
    }

    return result;
}

} // namespace prism::codec
