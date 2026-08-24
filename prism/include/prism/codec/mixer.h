#pragma once
#include <cstdint>
#include <cstddef>
#include <vector>

namespace prism::codec {

// ----- D2 logistic mixer + SSE core (issue #130, spec section 12) -----
//
// Collection-efficiency machinery: mix K adaptive probability estimates in a
// signed log-odds ("stretch") domain with bounded adapted integer weights,
// then optionally pass the mixed estimate through one interpolated SSE/APM
// stage keyed on a coarse causal context class. Arithmetic is pinned bit-
// exact in docs/algorithmic-spec.md section 12; every constant below is a
// mirrored codec constant (invariant I2).
//
// FORMAT STATUS: library-level only. Nothing in the container or any format
// path references this code until the D2 offline gate (>= 3 percent
// projected payload on the committed bench-ideal harness) passes. Rejected
// mechanisms stay unwired, exactly like the D1 blend.

constexpr int MIX_STRETCH_MAX = 2047; // stretch domain bound
constexpr int MIX_P12_MIN = 1;
constexpr int MIX_P12_MAX = 4094;

// squash: piecewise-linear inverse of stretch over d in [-2047, 2047],
// returning p12 in [1, 4094] (probability of P(bit == 0) scaled to 12 bits).
int mix_squash(int d);

// Initialize the 4096-entry stretch lookup (exact inverse of mix_squash).
// Idempotent and single-threaded by contract; called implicitly by
// mix_stretch().
void mix_stretch_init();

// stretch(p12) for p12 in [0, 4095], clamped to [-2047, 2047]. Monotone.
int mix_stretch(int p12);

// p16 (range-coder domain, P(bit == 0)) -> p12 -> stretch in one step.
inline int mix_stretch_p16(uint16_t p16) {
    int p12 = p16 >> 4;
    if (p12 < MIX_P12_MIN) p12 = MIX_P12_MIN;
    if (p12 > MIX_P12_MAX) p12 = MIX_P12_MAX;
    return mix_stretch(p12);
}

// post-SSE stretch -> coded 16-bit probability (P(bit == 0)).
inline uint16_t mix_p16_from_stretch(int s) {
    if (s < -MIX_STRETCH_MAX) s = -MIX_STRETCH_MAX;
    if (s > MIX_STRETCH_MAX) s = MIX_STRETCH_MAX;
    int p12 = mix_squash(s);
    int p16 = p12 << 4;
    if (p16 < 1) p16 = 1;
    if (p16 > 65534) p16 = 65534;
    return (uint16_t)p16;
}

struct MixerConfig {
    int K = 4;               // estimator count
    int lr_shift = 6;        // weight-update rate (spec 12.2); -1 freezes
    int w_init = 16384;      // per-weight init; sum of K defaults to 1.0
    int w_min = -131072;     // weight clamp (-2x)
    int w_max = 786432;      // weight clamp (+12x)
    bool use_sse = true;     // enable the APM stage
    int sse_rate_shift = 5;  // APM adaptation rate; -1 freezes the table
    int sse_classes = 4;     // coarse context classes feeding the APM
};

// One mixer instance owns the weights for ONE bin kind of ONE plane.
// Usage per bin (offline scoring AND a future decoder share the shape):
//   s_out = filter(st, cls);  cost with mix_p16_from_stretch(s_out);
//   update(bit, st, cls);
class MixerCore {
public:
    explicit MixerCore(const MixerConfig& cfg = MixerConfig());
    // Forward pass only: returns s_out (post-SSE when enabled).
    int filter(const int32_t* st, int sse_class) const;
    // Train weights (pre-SSE error) and the APM slot on the observed bit.
    void update(bool bit, const int32_t* st, int sse_class);
    // Exposed for tests/diagnostics; not part of the coding path.
    int32_t weight(size_t k) const { return w_[k]; }
    int64_t sse_slot(int sse_class, size_t slot) const {
        return sse_[(size_t)sse_class * 33 + slot];
    }
private:
    MixerConfig cfg_;
    std::vector<int32_t> w_;    // K weights, 16.16
    std::vector<int64_t> sse_;  // sse_classes * 33 slots, 16.16 stretch units
};

} // namespace prism::codec
