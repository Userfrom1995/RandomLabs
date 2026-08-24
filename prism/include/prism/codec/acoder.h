#pragma once
#include <cstdint>
#include <vector>
#include <cstddef>

namespace prism::codec {

// FIFO adaptive binary range coder (Section 0, B5+).
// Resolves the M0 LIFO/adaptive deferral: rANS is LIFO and cannot round-trip
// a running adaptive model (decoder pops reverse). This coder is FIFO -
// decoder reads bins in the same order encoder wrote them, so per-context
// adaptive 16-bit probabilities stay synchronized.
//
// Each bin uses a 16-bit probability P0 = prob/65536 (prob in 1..65535).
// After coding the bin the prob is adapted toward the observed bit with a
// JXL WNC-style learning rate (shift 5, clamped to open interval). The
// binary decomposition of a residual is the same Elias-gamma family as rANS
// (sign + zero-flag + unary length + remainder bits), so the format stays
// comparable.

struct ACModels {
    std::vector<uint16_t> sign;
    std::vector<uint16_t> zero;
    std::vector<uint16_t> q;   // unary quotient bits
    std::vector<uint16_t> rem; // remainder bits
    explicit ACModels(int n = 1) {
        sign.assign(n, 32768);
        zero.assign(n, 32768);
        q.assign(n, 32768);
        rem.assign(n, 32768);
    }
    void ensure(int n) {
        if ((int)sign.size() < n) {
            sign.resize(n, 32768);
            zero.resize(n, 32768);
            q.resize(n, 32768);
            rem.resize(n, 32768);
        }
    }
};

// ----- Backend v2 (issue #130, blueprint C1) -----
// Binarization is strictly zero-flag -> sign -> magnitude, so zeros never pay
// a sign bin (research F3/V1: 3.4-5.1 percent of the file). Each residual-DIFF
// context set is INITIALIZED from one of 16 compile-time class priors keyed on
// the causal context id, and adapts at two rates: fast shift
// AC_V2_FAST_SHIFT (6) and slow shift AC_V2_SLOW_SHIFT (9); the coded
// probability mixes the two equally (ac_v2_mix), then mixes with the shared
// class estimate 8/8 (ac_v2_mix2). This fixes the adaptation dilution that
// kept the real-coder context benefit
// at 0.9 percent against a ~6 percent conditional-entropy oracle (F3).
// Every constant here is a codec constant mirrored on the decoder side
// (architecture-jxl-parity.md invariant I2); nothing is data-dependent state.

constexpr int AC_V2_N_PRIORS = 16;
// Dual-rate adaptation shifts (C1 offline retune, 2026-08-23): slower EMAs beat
// the original shift-4/6 pair on every probe image (kodim01 v2 -5.18 -> -6.40
// percent of v0, kodim13 -3.45 -> -4.79, kodim05/kodim20 confirmed); faster
// rates were tried and rejected (oscillation risk, risk register R-D1).
constexpr int AC_V2_FAST_SHIFT = 6;
constexpr int AC_V2_SLOW_SHIFT = 9;
// Hierarchical sharing (P2): the coded probability mixes the per-context
// dual-rate estimate with the shared CLASS-level dual-rate estimate (16
// classes). Weights are out of 16 and mirrored on both sides (I2). The class
// models see ~74x more samples than an average context, so rare contexts lean
// on them instead of re-learning from scratch - this is what converts the
// static prior into live statistical sharing. Equal 8/8 won the offline sweep;
// tilting toward either side regressed (contexts are noisy experts, not starved
// ones - count-weighted trust was also tried and rejected).
constexpr int AC_V2_MIX_CTX_W = 8; // out of 16
constexpr int AC_V2_MIX_CLS_W = 8; // out of 16

class AEncoder;
class ADecoder;

// Each table entry is the INITIAL probability, stored in 1..65535, that a bin
// codes as 0 under this model's convention (prob estimates P(bit == 0)):
//   ZERO: bit 1 signals a zero residual, so the entry holds P(nonzero).
//   SIGN: bit 1 signals a negative residual (coded only for nonzero samples),
//         so the entry holds P(non-negative | nonzero).
//   Q:    quotient continuation bits are 0 and the terminator is 1, so the
//         entry holds P(continue).
//   REM:  MSB-first remainder bits, mildly biased toward 0.
extern const uint16_t AC_V2_PRIOR_ZERO[AC_V2_N_PRIORS];
extern const uint16_t AC_V2_PRIOR_SIGN[AC_V2_N_PRIORS];
extern const uint16_t AC_V2_PRIOR_Q[AC_V2_N_PRIORS];
extern const uint16_t AC_V2_PRIOR_REM[AC_V2_N_PRIORS];

// Deterministic coarse class (0..15) for a residual-DIFF context id (0..342).
// Encoder and decoder recompute it from the same causal context, so it needs
// no side channel. Class = 3*min(max(qL,qU,qUL),4) + orientation, where
// qL/qU/qUL are the JPEG-LS residual quantizers recovered from the context id
// and orientation is 0 (horizontal-edge dominant), 1 (vertical-edge dominant),
// or 2 (balanced). The old sum-key merged horizontal and vertical edges into
// one class; the directional key beat it on every probe image.
uint8_t ac_v2_prior_class(int cx);

// Coded probability: integer mix of the fast and slow EMAs, clamped so the
// range-coder split always lands strictly inside the current interval.
inline uint16_t ac_v2_mix(uint16_t pf, uint16_t ps) {
    uint32_t m = ((uint32_t)pf + ps) >> 1;
    if (m < 1) m = 1;
    if (m > 65534) m = 65534;
    return (uint16_t)m;
}

// Hierarchical mix of one per-context estimate and one shared class estimate.
inline uint16_t ac_v2_mix2(uint16_t p_ctx, uint16_t p_cls) {
    uint32_t m = (uint32_t)(AC_V2_MIX_CTX_W * p_ctx + AC_V2_MIX_CLS_W * p_cls) >> 4;
    if (m < 1) m = 1;
    if (m > 65534) m = 65534;
    return (uint16_t)m;
}

// Dual-rate update toward the observed bit (mirrored exactly on both sides).
void ac_v2_adapt(uint16_t& pf, uint16_t& ps, bool bit);

struct BinModelV2 {
    std::vector<uint16_t> p_fast;
    std::vector<uint16_t> p_slow;
};

// One bin kind = per-context states (residual-DIFF ids) plus shared per-class
// states (AC_V2_N_PRIORS entries). Both sides mirror the split exactly.
struct KindModelsV2 {
    BinModelV2 ctx;   // indexed by residual-DIFF context id
    BinModelV2 cls;   // indexed by ac_v2_prior_class(cx), shared
};

struct ACModelsV2 {
    KindModelsV2 sign, zero, q, rem;
    explicit ACModelsV2(int n = 1, bool uniform_priors = false) { init(n, uniform_priors); }
    // (Re)size to n contexts, initializing every slot from its class prior
    // (or from the neutral 32768 midpoint when uniform_priors - used for MA
    // tree LEAF contexts whose ids carry no residual-diff semantics).
    void init(int n, bool uniform_priors = false);
    // Grow to n contexts; existing adapted state is preserved, new slots come
    // from their own class priors. Class states always cover 16 classes.
    void ensure(int n);
};

void encode_residual_v2(AEncoder& enc, ACModelsV2& m, int cx, int32_t e);
int32_t decode_residual_v2(ADecoder& dec, ACModelsV2& m, int cx);

class AEncoder {
public:
    AEncoder();
    // Code one bin with an externally managed probability; the caller owns
    // any adaptation (backend v2 mixes fast/slow states before the call).
    void put_bin_raw(uint16_t prob, bool bit);
    // Code one bin and adapt `prob` with the legacy single-rate update.
    void put_bin(uint16_t& prob, bool bit);
    void encode_residual(ACModels& m, int cx, int32_t e);
    std::vector<uint8_t> flush_and_emit();
private:
    uint32_t low_;
    uint32_t high_;
    int pending_;
    // bit writer (LSB-first, matches BitWriter)
    std::vector<uint8_t> out_;
    size_t bit_pos_ = 0;
    void ensure_bits(size_t extra);
    void write_bit(bool b);
};

class ADecoder {
public:
    void init(const uint8_t* data, size_t len);
    void init(const std::vector<uint8_t>& d) { init(d.data(), d.size()); }
    // Decode one bin with an externally managed probability (no adaptation).
    bool get_bin_raw(uint16_t prob);
    // Decode one bin and adapt `prob` with the legacy single-rate update.
    bool get_bin(uint16_t& prob);
    int32_t decode_residual(ACModels& m, int cx);
private:
    uint32_t low_ = 0;
    uint32_t high_ = 0xFFFFFFFF;
    uint32_t code_ = 0;
    // bit reader (LSB-first)
    const uint8_t* data_ = nullptr;
    size_t len_ = 0;
    size_t bit_pos_ = 0;
    bool read_bit();
};

// High-level plane helpers (FIFO, adaptive, context = residual-DIFF)
std::vector<uint8_t> acoder_encode_plane(const std::vector<int32_t>& residuals,
                                         uint32_t w, uint32_t h,
                                         int num_contexts = 1);
std::vector<int32_t> acoder_decode_plane(const std::vector<uint8_t>& bytes,
                                         size_t num_residuals,
                                         uint32_t w, uint32_t h,
                                         int num_contexts = 1);

// Backend-v2 plane helpers (flags bit3 streams). num_contexts <= 0 selects the
// production residual-DIFF-343 causal contexts; 1 selects a single shared
// context (probe reference for context inertness); values > 1 fold the
// resdiff id modulo the count (deterministic on both sides).
std::vector<uint8_t> acoder_encode_plane_v2(const std::vector<int32_t>& residuals,
                                            uint32_t w, uint32_t h,
                                            int num_contexts = 0);
std::vector<int32_t> acoder_decode_plane_v2(const std::vector<uint8_t>& bytes,
                                            size_t num_residuals,
                                            uint32_t w, uint32_t h,
                                            int num_contexts = 0);

// Leaf-context helpers for B7 Squeeze+MA-tree (mandatory llc_class/sibling_class)
std::vector<uint8_t> acoder_encode_plane_leaves(const std::vector<int32_t>& residuals,
                                                const std::vector<uint16_t>& leaf_ids,
                                                int num_leaves);
std::vector<int32_t> acoder_decode_plane_leaves(const std::vector<uint8_t>& bytes,
                                                size_t num_residuals,
                                                const std::vector<uint16_t>& leaf_ids,
                                                int num_leaves);
// decoder that recomputes leaf ids on the fly from features is handled in prism.cpp;
// this helper is for testing with precomputed leaf sequences
std::vector<int32_t> acoder_decode_plane_leaves_stream(const std::vector<uint8_t>& bytes,
                                                       size_t num_residuals,
                                                       int num_leaves,
                                                       const std::vector<uint16_t>& leaf_seq);

// Backend-v2 leaf-context helpers (flags bit3 streams), same contracts as the
// v1 leaf helpers above. uniform_priors starts every leaf state at the
// neutral midpoint instead of the residual-diff class priors (C2: leaf ids
// are not residual-diff ids); encoder and decoder must agree on it.
std::vector<uint8_t> acoder_encode_plane_leaves_v2(const std::vector<int32_t>& residuals,
                                                   const std::vector<uint16_t>& leaf_ids,
                                                   int num_leaves,
                                                   bool uniform_priors = false);
std::vector<int32_t> acoder_decode_plane_leaves_v2(const std::vector<uint8_t>& bytes,
                                                   size_t num_residuals,
                                                   const std::vector<uint16_t>& leaf_ids,
                                                   int num_leaves,
                                                   bool uniform_priors = false);

// ----- Backend v2 composite contexts (C2b, issue #130) -----
// The tree REFINES the causal context instead of replacing it: the model id is
// `leaf * 343 + resdiff`, where resdiff is the exact JPEG-LS residual-DIFF
// context recomputed causally from the residual history on both sides. Class
// priors and shared class states are keyed on the resdiff PART (cx % 343), so
// flat streams (ids < 343) are bit-for-bit unaffected and composite slots
// inherit their resdiff-part prior - the hierarchy absorbs the sparsity that
// a leaves*343 partition would otherwise suffer. Composite coding lives at
// the plane level (analyze.cpp encode/decode_plane_tree_composite_v2) because
// the decoder must interleave leaf recomputation with sample reconstruction.
constexpr int AC_V2_RESDIFF_CONTEXTS = 343;

// Bit-level helpers for the H(p)+epsilon gate (adaptive, not fixed)
std::vector<uint8_t> acoder_encode_bits_adaptive(const std::vector<uint8_t>& bits);
std::vector<uint8_t> acoder_decode_bits_adaptive(const std::vector<uint8_t>& bytes, size_t n);

// Fixed-prob raw helpers (for comparison, not used by adaptive path)
std::vector<uint8_t> acoder_encode_bits(const std::vector<uint8_t>& bits, uint16_t prob);
std::vector<uint8_t> acoder_decode_bits(const std::vector<uint8_t>& bytes, size_t n, uint16_t prob);

// Residual-DIFF quantization (JPEG-LS residual_context)
int quant_residual(int32_t r);
int residual_diff_context(int32_t dL, int32_t dU, int32_t dUL); // 0..342
uint8_t activity_class(uint32_t w, uint32_t h, size_t idx,
                       const std::vector<uint16_t>& plane,
                       int32_t pred);

} // namespace prism::codec
