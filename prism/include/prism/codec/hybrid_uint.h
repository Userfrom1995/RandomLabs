#pragma once
#include <cstdint>
#include <vector>

namespace prism::codec::r3 {

// Route 3 hybrid-uint tokenization profile.
// Replaces ZFF binarization for the multi-pass ANS architecture.
// Residual r -> zigzag fold to u >= 0 -> token t = min(u, T_ESC) + escape bits.
//
// Spec: blueprint section 2.1.5, addendum 22.4 (pinned constants).
//   HYB_T_ESC_R3 = 8 (escape ladder)
//   HYB_SIGN_AFTER_NONZERO = yes (L-C5 rule)
//   HYB_ZERO_TOKEN = 0 (dedicated zero token)
//   HYB_ZIGZAG_FOLD = yes (signed -> unsigned mapping)

struct HybridUintProfile {
    uint8_t T_ESC = 8;          // escape ladder (pinned: 4, 8, or 16)
    uint8_t alphabet_size = 0;  // T_ESC + ceil(log2(max_residual)) + 1

    // Tokenize a single residual into component events.
    struct Events {
        uint8_t token;        // 0 = ZERO, 1..T_ESC-1 = direct, T_ESC = escape
        bool has_sign;        // true if nonzero (sign bit follows)
        bool sign_bit;        // true = negative (only valid if has_sign)
        uint8_t esc_quotient; // unary quotient of escape magnitude (only if escape)
        uint8_t esc_rawbits;  // raw low bits below escape ladder (only if escape)
        uint32_t raw_value;   // the raw low bits value
    };

    // Tokenize a residual.  Events are emitted in coding order.
    Events tokenize(int32_t residual) const;

    // Detokenize from component events back to residual.
    int32_t detokenize(const Events& events) const;

    // Compute alphabet size for a given max_residual.
    static uint8_t compute_alphabet(uint8_t T_ESC, int32_t max_residual);

    // Zigzag fold: signed residual -> unsigned (0 -> 0, -1 -> 1, 1 -> 2, ...).
    static int32_t zigzag_fold(int32_t r);

    // Zigzag unfold: unsigned -> signed (inverse of fold).
    static int32_t zigzag_unfold(int32_t u);
};

} // namespace prism::codec::r3
