// Route 3 hybrid-uint tokenization (spec addendum 22.4).
// Replaces ZFF binarization for multi-pass ANS architecture.
//
// Token layout:
//   u = |r|   (absolute value; sign emitted separately, pin L-C5)
//   if u == 0: token = 0 (ZERO)
//   if 0 < u < T_ESC: token = u (direct)
//   if u >= T_ESC: token = T_ESC (escape), then:
//     m = u - T_ESC + 1   (m >= 1, pin D1)
//     q = bit_length(m) - 1   (unary quotient)
//     raw = low q bits of m   (uncoded bypass bits, pin D3)

#include "prism/codec/hybrid_uint.h"
#include <stdexcept>

namespace prism::codec::r3 {

int32_t HybridUintProfile::zigzag_fold(int32_t r) {
    return (int32_t)(((uint32_t)r << 1) ^ (uint32_t)(r >> 31));
}

int32_t HybridUintProfile::zigzag_unfold(int32_t u) {
    return (int32_t)((u >> 1) ^ (uint32_t)(-(int32_t)(u & 1)));
}

uint8_t HybridUintProfile::compute_alphabet(uint8_t T_ESC, int32_t max_residual) {
    if (max_residual <= 0) return T_ESC + 1;
    uint32_t u = (uint32_t)(max_residual < 0 ? -(int64_t)max_residual : (int64_t)max_residual);
    if (u < (uint32_t)T_ESC) return T_ESC + 1;
    uint32_t m = u - (uint32_t)T_ESC + 1;
    int bits = 32 - __builtin_clz(m);
    // alphabet = T_ESC + 1 (direct tokens) + bits (escape quotient unary)
    // Actually the alphabet for the histogram is just T_ESC + 1 for the token symbol.
    // The escape quotient and raw bits are separate coding events.
    return (uint8_t)(T_ESC + 1);
}

HybridUintProfile::Events HybridUintProfile::tokenize(int32_t residual) const {
    Events ev{};
    ev.token = 0;
    ev.has_sign = false;
    ev.sign_bit = false;
    ev.esc_quotient = 0;
    ev.esc_rawbits = 0;
    ev.raw_value = 0;

    // Pin D13: absolute value for the unsigned token ladder; the sample's
    // sign rides the dedicated SIGN bin right after each nonzero token
    // (L-C5 rule).
    int32_t u = residual < 0 ? -static_cast<int64_t>(residual)
                             : static_cast<int64_t>(residual);

    if (u == 0) {
        ev.token = 0;  // ZERO token
        return ev;
    }

    // Nonzero: emit sign after token (L-C5).
    ev.has_sign = true;
    ev.sign_bit = (residual < 0);

    if (u < (int32_t)T_ESC) {
        ev.token = (uint8_t)u;
        return ev;
    }

    // Escape path.
    ev.token = T_ESC;
    uint32_t m = (uint32_t)(u - (int32_t)T_ESC + 1);  // m >= 1 (pin D1)
    int q = 31 - __builtin_clz(m);                       // bit_length(m) - 1
    ev.esc_quotient = (uint8_t)q;

    // Low q bits of m (raw bypass, pin D3).
    uint32_t low = m & ((q >= 32) ? ~0u : ((1u << q) - 1u));
    ev.esc_rawbits = (uint8_t)q;
    ev.raw_value = low;

    return ev;
}

int32_t HybridUintProfile::detokenize(const Events& events) const {
    if (events.token == 0) return 0;

    if (events.token < T_ESC) {
        int32_t u = (int32_t)events.token;
        return events.sign_bit ? -u : u;
    }

    // Escape path.
    int q = events.esc_quotient;
    uint32_t m = (1u << q) | (events.raw_value & ((q >= 32) ? ~0u : ((1u << q) - 1u)));
    uint32_t u = (uint32_t)T_ESC - 1u + m;
    return events.sign_bit ? -(int32_t)u : (int32_t)u;
}

} // namespace prism::codec::r3
