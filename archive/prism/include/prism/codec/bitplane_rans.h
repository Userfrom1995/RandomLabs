#pragma once
#include <vector>
#include <cstdint>
#include <array>
#include <cstddef>

namespace prism::codec {

// Per-symbol adaptive binary rANS for the Route 4 bitplane coder.
//
// X-series requirement (addendum 25 section 3): a per-symbol binary rANS reusing
// the same renorm/flush core as rans.cpp. The probability for symbol k is
// supplied by the caller (the learned context model, LearnedModel) as P(0)*M.
// LIFO-safety (invariant I27 / ryg analysis): the encoder receives the
// probability for every symbol up front, emits symbols in REVERSE order, and the
// decoder recovers them in forward order, feeding the identical per-symbol
// probability. No per-context state lives in the coder, so no desync is possible.
struct BitplaneRans {
    static constexpr uint32_t M = 1u << 16;  // RANS_M, reuse rans.cpp core

    // Encode a full symbol sequence whose probability (P(0)*M) for symbol k is
    // p0[k]. Symbols are emitted in reverse so decode recovers them forward.
    std::vector<uint8_t> encode(const std::vector<uint8_t>& bits,
                                const std::vector<uint16_t>& p0) const;

    // Streaming decoder: decode one bit at a time (in forward order) with the
    // probability (P(0)*M) supplied by the caller.
    struct Decoder {
        void init(const std::vector<uint8_t>& bytes);
        uint8_t decode_symbol(uint16_t p0);

    private:
        using RansState = uint32_t;
        RansState state_ = 0;
        const uint8_t* ptr_ = nullptr;
    };

    // VB-ANS-FIDELITY rail: coding/decoding is bit-exact for arbitrary bits/p0.
    bool self_test(const std::vector<uint8_t>& bits,
                   const std::vector<uint16_t>& p0) const;
};

} // namespace prism::codec
