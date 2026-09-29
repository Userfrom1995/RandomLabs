#pragma once
#include <cstdint>
#include <string>
#include <vector>

namespace prism::codec::sandbox {

// V0 sandbox tokenization (spec addendum 17 = algorithmic-spec.md section 18,
// implemented VERBATIM; structural readings pinned in the Builder decision
// record 2026-08-25T16-20-00 before any measurement).
//
// Two profile families, both FORMAT-UNWIRED (zero container bytes until a V4
// PASS):
//   ZFFCTRL - replays the shipped zero-flag-first binarization sequence
//             (zero flag -> sign -> unary quotient -> MSB-first remainder),
//             the anchor control whose static brackets must reproduce the
//             committed bench-ideal references bit-for-bit;
//   HYB     - research stage 3: zigzag fold to u >= 0, ZERO token t = 0
//             exclusively for r = 0, direct tokens t = u for 0 < u < T_ESC,
//             escape token t = T_ESC followed by the escaped magnitude
//             m = u - T_ESC + 1 (pin D1: m >= 1 guaranteed) coded as
//             q = bit_length(m) - 1 unary over a dedicated escape context
//             (pin D2: context id = min(q, T_ESC - 1) for ESC-B/C, one shared
//             context for ESC-A) plus the low q bits of m RAW and unmodeled
//             (pin D3: they cost exactly q bits and carry no table entries).
//
// Sign ordering (L-C5): the sign bit is emitted immediately after each
// nonzero token; no sign-before-zero ordering may ever appear.

enum class TokProfile : uint8_t {
    ZFFCTRL = 0,   // shipped zero-flag-first control (anchor)
    HYB_A = 1,     // T_ESC = 4, one shared escape unary context
    HYB_B = 2,     // T_ESC = 8, per-token escape contexts
    HYB_C = 3      // T_ESC = 16, per-token escape contexts
};

// Ladder table pinned in addendum 18.3.
inline int hyb_t_esc(TokProfile p) {
    switch (p) {
        case TokProfile::HYB_A: return 4;
        case TokProfile::HYB_B: return 8;
        case TokProfile::HYB_C: return 16;
        default: return 0;   // ZFFCTRL has no escape ladder
    }
}

// Number of dedicated escape unary contexts (pin D2).
inline int hyb_esc_contexts(TokProfile p) {
    return p == TokProfile::HYB_A ? 1 : hyb_t_esc(p);
}

constexpr int Q_POS_MAX = 18;      // pin D5: unary supports capped (BD16 quotients are <= 15 deep, +3 slack)
constexpr int REM_L_MAX = 15;      // pin D5: REM triangular indexing over L in 1..REM_L_MAX ...
constexpr int REM_OVERFLOW_BINS = 1; // pin D5: ... plus one overflow bucket for L >= 16

// Zigzag fold: int32 residual -> u >= 0 (0 -> 0, -1 -> 1, 1 -> 2, ...).
// Defined only on the sandbox magnitude range; extremes saturate per the
// dense-lattice contract tested in test_tokenize.cpp.
int32_t zigzag_fold(int32_t r);
int32_t zigzag_unfold(int32_t u);

// One tokenization EVENT: the atomic unit a backend codes. Binary backends
// code every event as one bin against a per-(cluster, event key) table entry;
// the raw low bits of escaped HYB magnitudes bypass tables entirely (pin D3).
enum class EvKind : uint8_t {
    ZERO_FLAG = 0,  // ZFFCTRL: single zero-flag bin (bit set = zero residual)
    SIGN = 1,       // sign bit of a nonzero residual (both profiles)
    QPOS = 2,       // ZFFCTRL unary quotient position (key carries position)
    REM = 3,        // ZFFCTRL remainder bit (key carries (L, pos) triangular id)
    TOKEN = 4,      // HYB token symbol (value carries the token id 0..T_ESC)
    ESCQ = 5,       // HYB escape unary position (key carries (ctx, position))
    RAWBITS = 6     // HYB escaped magnitude's literal low bits: key = count q,
                    // value = the bits themselves; uncoded, payload bypass
};

struct TokEvent {
    EvKind kind;
    uint32_t key;     // event sub-key inside its (kind, cluster) table
    uint32_t value;   // bit value for binary kinds, symbol/count for TOKEN/RAWBITS
    bool operator==(const TokEvent& o) const {
        return kind == o.kind && key == o.key && value == o.value;
    }
};

// Number of distinct table keys per kind for a profile (table-shape contract
// shared by counting, smoothing, serialization and both coders).
size_t kind_key_count(TokProfile p, EvKind k);

// Tokenize ONE residual under a profile, appending events in emission order.
// ZFFCTRL mirrors the production walk exactly (same causal resdiff context
// consumption happens in the caller; this function only shapes the sample).
void tokenize_sample(TokProfile p, int32_t r, std::vector<TokEvent>& out);

// Rebuild the residual from a decoded event sequence (round-trip contract).
// Consumes events produced by decode-side reconstruction; returns the sample.
int32_t detokenize_sample(TokProfile p, const std::vector<TokEvent>& events,
                          size_t& pos);

// Profile id helpers shared with the CLI.
bool parse_profile(const std::string& s, TokProfile& out);
const char* profile_name(TokProfile p);

} // namespace prism::codec::sandbox
