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
struct RansModel {
    // Reserved for M1 causal/adaptive models. Kept for API compatibility.
    uint16_t prob = 32768; // P(0) * 65536
};

// Higher-level: encode/decode a full residual plane. Each residual is coded as
// 1 sign bit + 16 magnitude bits with a fixed probability (correct, bounded).
// num_contexts is reserved for M1 per-leaf context models.
std::vector<uint8_t> rans_encode_plane(const std::vector<int32_t>& residuals, int num_contexts = 1);
std::vector<int32_t> rans_decode_plane(const std::vector<uint8_t>& bytes, size_t num_residuals, int num_contexts = 1);

// Raw binary rANS: encode/decode a bit vector with one fixed probability
// `prob` (default 0.5). Used by the H(p)+epsilon efficiency gate test and
// available for raw-mode payloads. Pass the true P(0)*M to approach entropy.
std::vector<uint8_t> rans_encode_bits(const std::vector<uint8_t>& bits, uint16_t prob = 32768);
std::vector<uint8_t> rans_decode_bits(const std::vector<uint8_t>& bytes, size_t num_bits, uint16_t prob = 32768);

} // namespace prism::codec
