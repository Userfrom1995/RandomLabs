#pragma once
#include <vector>
#include <cstdint>
#include <array>
#include <cstddef>

namespace prism::codec {

// Per-context adaptive binary rANS for the Route 4 bitplane coder.
//
// X-series requirement (addendum 25 section 3): a PER-CONTEXT ADAPTIVE binary
// rANS with 128 contexts and EMA shift-5 adaptation, reusing the same
// renorm/flush core as rans.cpp. The v1 fixed-prob rans.cpp is NOT modified.
//
// LIFO-safety (invariant I27 / ryg analysis): each symbol is coded at a
// FIXED probability derived from a FORWARD (causal) adaptation pass, so the
// stream round-trips exactly under rANS LIFO decode. The decoder recomputes
// the identical per-symbol probability by running the same causal adaptation
// over the symbols it has already recovered.
struct BitplaneRans {
    static constexpr int NUM_CONTEXTS = 128;
    static constexpr int EMA_SHIFT = 5;          // shift-5, matches ACoderV2
    static constexpr uint32_t M = 1u << 16;      // RANS_M, reuse rans.cpp core

    // One adaptive binary model per context. Causal: the context is derived
    // from already-coded/decoded significance, so encode and decode update in
    // the same (forward) order and never desync. Baked-in model = 0 per-image
    // NET (I29); no probability table is ever transmitted.
    struct BinaryModel {
        uint16_t p0 = M / 2; // P(0) * M, EMA-updated
    };

    // Encode a full symbol sequence whose context for symbol k is ctx[k].
    // Probability for symbol k is the model state at k under a forward causal
    // adaptation pass; symbols are emitted in reverse so decode recovers them
    // in forward order. Returns the rANS byte stream.
    std::vector<uint8_t> encode(const std::vector<uint8_t>& bits,
                                const std::vector<uint32_t>& ctx) const;

    // Streaming decoder: decode one bit at a time (in forward order) with the
    // context supplied by the caller. Each call reads the correct bin and
    // updates the per-context model, mirroring the encoder's adaptation pass.
    struct Decoder {
        void init(const std::vector<uint8_t>& bytes);
        // Decode one bit with the given context. Probability is taken from the
        // current model state for `ctx` and the model is EMA-updated after.
        uint8_t decode_symbol(uint32_t ctx);

    private:
        using RansState = uint32_t;
        std::array<BinaryModel, NUM_CONTEXTS> models_{};
        RansState state_ = 0;
        const uint8_t* ptr_ = nullptr;
    };

    // VB-ANS-FIDELITY rail: adaptive rANS coding/decoding is bit-exact.
    bool self_test(const std::vector<uint8_t>& bits,
                   const std::vector<uint32_t>& ctx) const;
};

} // namespace prism::codec
