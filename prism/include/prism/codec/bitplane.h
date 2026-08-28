#pragma once
#include "prism/codec/wavelet.h"
#include "prism/codec/learned_ctx.h"
#include <vector>
#include <cstdint>

namespace prism::codec {

// EBCOT-style 3-pass bitplane coder over wavelet subbands, with the pinned
// fixed parent-aware context (invariant I28). Zero tables are transmitted: the
// context is a FIXED function of (orientation, parent significance, neighbour
// significance count), adapted online, so the table-economics law (I27) does
// not re-apply.
struct BitplaneCoder {
    // Context pool layout (addendum 25 section 2.1, pinned):
    //   ctx = ORIENT(2b) + PARENT_STATE(1b) + SIG_COUNT_BUCKET(3b)   -> 40 base
    // SIGN bits use base + 40; REFINEMENT bits use base + 80. Total < 128.
    static constexpr uint32_t X_CONTEXT_POOL_SIZE = 128;

    struct Result {
        std::vector<uint8_t> stream;   // single bitplane rANS payload
        uint32_t total_symbols = 0;
        uint8_t maxbits = 0;          // B, transmitted in the header
    };

    // Encode all subbands (in forward() order) into one bitplane stream. If
    // maxbits_override > 0, force that bitplane count for every subband.
    Result encode(const std::vector<Subband>& subbands, int maxbits_override = 0) const;

    // Decode a stream into subbands. `layout` carries the subband table
    // (orient/level/w/h, in forward() order) with empty coeffs; `sub_maxbits`
    // carries the per-subband bitplane range (EBCOT-style, one entry per layout
    // subband) and `total_symbols` comes from the transmitted header (0 to skip
    // the strict count check). Returns subbands with coeffs filled, in the same
    // order as `layout` (consumable by inverse()).
    std::vector<Subband> decode(const std::vector<uint8_t>& stream,
                                const std::vector<Subband>& layout,
                                const std::vector<uint8_t>& sub_maxbits,
                                uint32_t total_symbols) const;

    // Pinned context function (I28). Used by the VB-CONTEXT-DETERMINISM rail.
    static uint32_t context_id(Subband::Orient o, bool parent_sig, int four_conn, int diag);

    // Diagnostic: run the rANS round-trip on this subband set's own symbol
    // stream to confirm the entropy backend is faithful for the data.
    static bool probe_rans(const std::vector<Subband>& subbands, int maxbits_override = 0);

    // Diagnostic: build the exact (bits, p0) the encoder emits.
    static std::pair<std::vector<uint8_t>, std::vector<uint16_t>>
    generate_symbols(const std::vector<Subband>& subbands, int maxbits_override = 0);

    // Training support (X3a): walk the exact EBCOT coding order and emit one
    // LSample per symbol with its learned features, true bit, and coarse context.
    // This walk is byte-for-byte feature-identical to the encoder/decoder walk so
    // the trained model is symmetric at encode and decode time.
    static void collect_samples(const std::vector<Subband>& subbands,
                                std::vector<LSample>& out,
                                int maxbits_override = 0);

    // Diagnostic: return the exact ctx sequence the decoder walks (rANS symbols
    // drawn in that order). Mirrors decode() but records the context ids. If
    // out_bits is non-null, the decoded bits are appended too.
    std::vector<uint32_t> decode_trace(const std::vector<uint8_t>& stream,
                                       const std::vector<Subband>& layout,
                                       uint8_t maxbits, uint32_t total_symbols,
                                       std::vector<uint8_t>* out_bits = nullptr) const;
};

} // namespace prism::codec
