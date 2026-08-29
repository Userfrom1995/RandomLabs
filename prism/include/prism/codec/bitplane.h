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
    struct Result {
        // One independent rANS payload per input subband (indexed by the
        // subband's position in `subbands`, NOT coding order) so the container
        // can slice/concatenate them. Each subband keeps its own bitplane range
        // (EBCOT-style) so tiny AC bands are not forced to emit the global LL
        // bit-depth as wasted all-zero significance bits.
        std::vector<std::vector<uint8_t>> streams;
        std::vector<uint8_t> sub_maxbits; // per-subband B
        uint32_t total_symbols = 0;
    };

    // Encode all subbands of a plane TOGETHER (in forward() order) so the
    // parent-aware context (I28) and learned parent/level features are real:
    // when a child subband (e.g. HL) is coded, its parent (LL) has already been
    // coded and its running magnitude is available as a feature. Each subband
    // still gets its OWN rANS stream + its OWN bitplane range (see Result).
    // If maxbits_override > 0, force that bitplane count for every subband.
    Result encode(const std::vector<Subband>& subbands, int maxbits_override = 0) const;

    // Decode per-subband streams into subbands. `layout` carries the subband
    // table (orient/level/w/h, in forward() order) with empty coeffs;
    // `streams[oi]` / `sub_maxbits[oi]` are the per-subband payload and
    // bitplane range; `total_symbols` comes from the transmitted header (0 to
    // skip the strict count check). Returns subbands with coeffs filled, in the
    // same order as `layout` (consumable by inverse()).
    std::vector<Subband> decode(const std::vector<std::vector<uint8_t>>& streams,
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
};

} // namespace prism::codec
