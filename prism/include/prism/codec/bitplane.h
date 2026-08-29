#pragma once
#include "prism/codec/wavelet.h"
#include "prism/codec/learned_ctx.h"
#include <vector>
#include <cstdint>

namespace prism::codec {

// R6-B (Route 6, lever B): transmitted-histogram backbone.
//
// The adaptive EMA's residual cost is cold-start: a fine context's first few
// symbols are coded near p=0.5 before the EMA converges. With ~10^4 effective
// contexts/subband most see few symbols, so warm-up waste dominates. R6-B is a
// TWO-PASS design (JXL-Modular's actual mechanism): pass 1 counts, per
// subband, a joint histogram over (symtype x bitplane-bucket) classes; pass 2
// codes every symbol with a probability BLENDED from the transmitted static
// class histogram (weight 1-alpha) and the per-context adaptive EMA (weight
// alpha = n/(n+K)). For rare contexts alpha->0 so the static prior removes
// cold-start entirely; for rich contexts the EMA still corrects. The histogram
// is transmitted as a tiny per-subband header (overhead << 0.01 bpp, see spec
// research-route6-learned-histogram-fusion.md section 3). No full model is
// transmitted, so the NET stays payload + header (invariant I29); the rANS
// stream round-trips byte-exact because both passes share the identical walk
// and the static table is constant at encode and decode.
static constexpr int R6B_CLASSES = 12; // 3 symtypes x 4 bitplane buckets

// Per-subband, per-class symbol counts (cnt0/cnt1) for the transmitted
// histogram. cnt[oi] holds R6B_CLASSES*2 uint32: [c0_0,c1_0, c0_1,c1_1, ...].
struct StaticHist {
    std::vector<std::vector<uint32_t>> cnt; // [subband][R6B_CLASSES*2]
};

struct StaticBitplaneResult {
    std::vector<std::vector<uint8_t>> streams;
    std::vector<uint8_t> sub_maxbits;
    uint32_t total_symbols = 0;
    StaticHist hist;
};

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
    // `luma_mag` (optional) is the co-located LUMA subband magnitudes indexed by
    // the SAME subband index `oi` as `subbands`; when non-null it supplies the
    // X5a cross-component context feature for chroma subbands (luma subbands
    // themselves are passed nullptr). Symmetric at encode/decode, so the rANS
    // stream round-trips exactly.
    // `sub_scale` (optional, X6c hyperprior) is a per-subband probability-scale
    // factor indexed by the SAME subband index `oi`; it multiplies the learned
    // model's predicted P(0) so a per-subband (or per-plane) calibration gain is
    // transmitted as a tiny side code (invariant I29 still holds: no full model
    // is sent, only a scalar multiplier). Applied identically at encode/decode.
    Result encode(const std::vector<Subband>& subbands, int maxbits_override = 0,
                  const std::vector<std::vector<int32_t>>* luma_mag = nullptr,
                  const std::vector<float>* sub_scale = nullptr) const;

    // Decode per-subband streams into subbands. `layout` carries the subband
    // table (orient/level/w/h, in forward() order) with empty coeffs;
    // `streams[oi]` / `sub_maxbits[oi]` are the per-subband payload and
    // bitplane range; `total_symbols` comes from the transmitted header (0 to
    // skip the strict count check). Returns subbands with coeffs filled, in the
    // same order as `layout` (consumable by inverse()). `sub_scale` mirrors
    // encode (X6c hyperprior), indexed by subband.
    std::vector<Subband> decode(const std::vector<std::vector<uint8_t>>& streams,
                                const std::vector<Subband>& layout,
                                const std::vector<uint8_t>& sub_maxbits,
                                uint32_t total_symbols,
                                const std::vector<std::vector<int32_t>>* luma_mag = nullptr,
                                const std::vector<float>* sub_scale = nullptr) const;

    // Pinned context function (I28). Used by the VB-CONTEXT-DETERMINISM rail.
    static uint32_t context_id(Subband::Orient o, bool parent_sig, int four_conn, int diag);

    // Diagnostic: run the rANS round-trip on this subband set's own symbol
    // stream to confirm the entropy backend is faithful for the data.
    static bool probe_rans(const std::vector<Subband>& subbands, int maxbits_override = 0);

    // Diagnostic: build the exact (bits, p0) the encoder emits. With `sub_scale`
    // (X6c) the returned p0 already includes the per-subband calibration factor.
    static std::pair<std::vector<uint8_t>, std::vector<uint16_t>>
    generate_symbols(const std::vector<Subband>& subbands, int maxbits_override = 0,
                     const std::vector<std::vector<int32_t>>* luma_mag = nullptr,
                     const std::vector<float>* sub_scale = nullptr);

    // R6-B two-pass transmitted-histogram coder (Route 6 lever B). Pass 1 counts
    // per-subband (symtype x bitplane-bucket) histograms; pass 2 blends the
    // transmitted static class prior with the per-context adaptive EMA and emits
    // one rANS stream per subband. `hist` in the result carries the transmitted
    // counts (already aggregated, ready to serialize). Symmetric at decode time
    // via decode_static(). `luma_mag` mirrors encode() (X5a cross-component).
    StaticBitplaneResult encode_static(const std::vector<Subband>& subbands,
                                       int maxbits_override = 0,
                                       const std::vector<std::vector<int32_t>>* luma_mag = nullptr) const;

    // Decode per-subband streams produced by encode_static, using the transmitted
    // per-subband StaticHist as the static backbone. `layout`, `sub_maxbits`,
    // `total_symbols` mirror decode(); `hist` is the transmitted histogram.
    // The blend (static x (1-alpha) + adaptive EMA x alpha) evolves identically
    // to encode_static, so the rANS stream round-trips byte-exact.
    std::vector<Subband> decode_static(const std::vector<std::vector<uint8_t>>& streams,
                                       const std::vector<Subband>& layout,
                                       const std::vector<uint8_t>& sub_maxbits,
                                       uint32_t total_symbols,
                                       const StaticHist& hist,
                                       const std::vector<std::vector<int32_t>>* luma_mag = nullptr) const;

    // Training support (X3a): walk the exact EBCOT coding order and emit one
    // LSample per symbol with its learned features, true bit, and coarse context.
    // This walk is byte-for-byte feature-identical to the encoder/decoder walk so
    // the trained model is symmetric at encode and decode time. `luma_mag` (optional)
    // supplies the X5a cross-component feature (see encode). `sub_scale` (X6c)
    // applies the per-subband calibration factor to the emitted p0.
    static void collect_samples(const std::vector<Subband>& subbands,
                                std::vector<LSample>& out,
                                int maxbits_override = 0,
                                const std::vector<std::vector<int32_t>>* luma_mag = nullptr,
                                const std::vector<float>* sub_scale = nullptr);
};

} // namespace prism::codec
