#pragma once
#include <cstdint>
#include <vector>

namespace prism::codec {

// 32-bit rANS with fixed (non-accumulating) binary probability models.
//
// The state lives in [RANS_L, 2^32). Each binary decision is coded with a
// 16-bit cumulative frequency where `prob` carries P(0)*M (symbol 1 maps to
// cdf range [prob, M), symbol 0 to [0, prob)). The coder is a true rANS:
// coded length approaches the entropy bound H(p) for a source whose bit
// probability matches `prob` (see the EfficiencyVsEntropy gate).
//
// IMPORTANT (LIFO / correctness): rANS is a LIFO coder. To keep a lossless
// round-trip, the per-bin probability MUST be FIXED (not accumulated from a
// single running model): with rANS the decoder recovers bins in the reverse of
// the encode order, so a single adaptive model would be updated in the reverse
// sequence on decode and desync. Online adaptation via a CAUSAL context (e.g.
// probabilities derived from already-decoded spatial neighbours) is scheduled
// for M1 and is LIFO-safe. For M0 each bin uses one fixed probability.
// For M1, adaptation is via ModelBank keyed by causal spatial context (decoder
// emits symbols forward, so models update in identical forward order).
struct RansModel {
    // Reserved for M1 causal/adaptive models. Kept for API compatibility.
    uint16_t prob = 32768; // P(0) * 65536
};

// M1: per-leaf adaptive binary model (WNC/CABS style) with fast start.
struct AdaptiveModel {
    uint16_t prob = 32768; // P(0)*M, start 0.5 (overridden by Kodak priors)
    uint16_t cnt = 0;      // number of updates, for fast-start schedule
    inline void update(bool bit) {
        int32_t target = bit ? 0 : 65535;
        int32_t diff = target - (int32_t)prob;
        // Fast-start: 1/16 for first 16 samples, 1/32 next 48, then 1/128
        int shift = 7;
        if (cnt < 16) shift = 4;
        else if (cnt < 64) shift = 5;
        else if (cnt < 128) shift = 6;
        prob = (uint16_t)((int32_t)prob + (diff >> shift));
        if (prob == 0) prob = 1;
        if (prob >= 65535) prob = 65534;
        if (cnt < 65535) ++cnt;
    }
};

// Per-leaf model bank for M1. Indexed by MA-tree leaf_id or ResDiff bucket.
struct ModelBank {
    // One model per leaf/context for each bin type.
    std::vector<AdaptiveModel> sign;      // P(sign==0)  (sign bit where 0=positive)
    std::vector<AdaptiveModel> zero;      // P(isZero==1) for zero flag (1 means a==0)
    std::vector<AdaptiveModel> q;         // quotient unary continuation
    std::vector<std::vector<AdaptiveModel>> rem; // rem[ctx][kbit]
    std::vector<uint8_t> k;               // per-ctx Rice shift (EMA of |e|)
    size_t nctx() const { return sign.size(); }
    static ModelBank create(size_t nctx, size_t rem_bits = 16);
};

// Higher-level: encode/decode a full residual plane. Each residual is coded as
// 1 sign bit + 16 magnitude bits with a fixed probability (correct, bounded).
// num_contexts is reserved for M1 per-leaf context models.
std::vector<uint8_t> rans_encode_plane(const std::vector<int32_t>& residuals, int num_contexts = 1);
std::vector<int32_t> rans_decode_plane(const std::vector<uint8_t>& bytes, size_t num_residuals, int num_contexts = 1);

// M1: causal-context residual coding with ModelBank.
void rans_encode_residuals(const std::vector<int32_t>& residuals,
                           const std::vector<uint16_t>& cx_of,
                           ModelBank& models,
                           std::vector<uint8_t>& out);
void rans_decode_residuals(const std::vector<uint8_t>& in, size_t n,
                           const std::vector<uint16_t>& cx_of,
                           ModelBank& models,
                           std::vector<int32_t>& out);

// Auto-context variants: compute ResDiff context causally from residuals themselves.
// Encoder computes cx from full residuals; decoder recomputes incrementally.
void rans_encode_residuals_auto(const std::vector<int32_t>& residuals,
                                uint32_t w, uint32_t h,
                                ModelBank& models,
                                std::vector<uint8_t>& out);
void rans_decode_residuals_auto(const std::vector<uint8_t>& in, size_t n,
                                uint32_t w, uint32_t h,
                                ModelBank& models,
                                std::vector<int32_t>& out);

// Helper: compute ResDiff context id per sample (LOCO-I style) from causal residuals.
std::vector<uint16_t> compute_resdiff_context(const std::vector<int32_t>& residuals, uint32_t w, uint32_t h);
std::vector<uint16_t> compute_resdiff_context_with_llc(const std::vector<int32_t>& residuals, uint32_t w, uint32_t h, const std::vector<uint16_t>& ll_plane);

// Squeeze-aware: encode/decode with llc_class (HF bands)
void rans_encode_residuals_with_llc(const std::vector<int32_t>& residuals,
                                    uint32_t w, uint32_t h,
                                    const std::vector<uint16_t>& ll_plane,
                                    ModelBank& models,
                                    std::vector<uint8_t>& out);
void rans_decode_residuals_with_llc(const std::vector<uint8_t>& in, size_t n,
                                    uint32_t w, uint32_t h,
                                    const std::vector<uint16_t>& ll_plane,
                                    ModelBank& models,
                                    std::vector<int32_t>& out);

// Raw binary rANS: encode/decode a bit vector with one fixed probability
// `prob` (default 0.5). Used by the H(p)+epsilon efficiency gate test and
// available for raw-mode payloads. Pass the true P(0)*M to approach entropy.
std::vector<uint8_t> rans_encode_bits(const std::vector<uint8_t>& bits, uint16_t prob = 32768);
std::vector<uint8_t> rans_decode_bits(const std::vector<uint8_t>& bytes, size_t num_bits, uint16_t prob = 32768);

} // namespace prism::codec
