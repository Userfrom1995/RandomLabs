#pragma once
#include "prism/types.h"
#include <cstdint>

namespace prism::codec {

// Predictor ids P0..P7 + Weighted (8)
enum class PredId : uint8_t {
    LEFT = 0,
    TOP = 1,
    TL = 2,
    MED = 3,
    GAP = 4,
    GRAD = 5,
    TRUE_MOTION = 6,
    CLAMPED = 7,
    WEIGHTED = 8
};

// Predict sample at (x,y) in plane data[w*h], using causal neighbors.
// For HF bands, llc is the co-located LL sample (0 if not available).
int32_t predict_sample(const uint16_t* plane, uint32_t w, uint32_t x, uint32_t y,
                       PredId id, int32_t llc = 0);

// MED (LOCO-I median) helper
inline int32_t med_predictor(int32_t a, int32_t b, int32_t c) {
    // a=L, b=T, c=TL
    if (c >= std::max(a, b)) return std::min(a, b);
    if (c <= std::min(a, b)) return std::max(a, b);
    return a + b - c;
}

// GAP predictor
int32_t gap_predictor(int32_t W, int32_t WW, int32_t N, int32_t NW, int32_t NE, int32_t NN, int32_t NNE);

// Compute residual plane: e = sample - predict(sample)
std::vector<int32_t> compute_residuals(const std::vector<uint16_t>& plane, uint32_t w, uint32_t h, PredId id);

// Reconstruct plane from residuals
std::vector<uint16_t> reconstruct_plane(const std::vector<int32_t>& residuals, uint32_t w, uint32_t h, PredId id, uint16_t bd_max);

// ----- C5 cross-band prediction (issue #130, blueprint section 7) -----
// HF-band prediction term from the co-located LL band: a central difference
// of the LL along the band's orientation (H=horizontal, V=vertical,
// D=diagonal), scaled by one signaled quantized weight per band type.
// Weights live in 1/16 units as int8 (effective multiplier weight/16);
// weight 0 is the exact identity, so bit6 streams with zero weights code
// byte-identically to plain lifting streams. One implementation serves the
// analyzer trial, encode_band_generic, and decode_band_generic.

// Central LL difference at (x,y) along band_type's orientation; borders fall
// back to one-sided differences, and 0 where no difference exists.
int32_t xband_gradient(const std::vector<uint16_t>& ll, uint32_t w, uint32_t h,
                       uint32_t x, uint32_t y, uint8_t band_type);

// floor(grad * weight / 16) with explicit floor semantics on negatives;
// deterministic and identical on both coder sides. |grad| <= 65535 and
// |weight| <= 128 keep the product far inside int32 range.
int32_t xband_apply(int32_t grad, int8_t weight);

// ----- D1 adaptive blended prediction (issue #130, re-scope section D1) -----
// JXL-modular-style per-sample integer weight blending over four causal bases
// (L, T, TL, L+T-TL). Weights adapt causally per sample from the prediction
// error with an energy-normalized integer LMS update; the whole state is a
// pure function of decoded history, so the decoder mirrors it exactly with
// zero side channel. Arithmetic contract is pinned bit-exact in
// docs/algorithmic-spec.md section 11.2; this code is that contract.

struct BlendConfig {
    int lr_shift = 5;       // weight increment = (err * b_k << lr_shift) / den
    int energy_shift = 11;  // den = (E >> energy_shift) + 1; lr+energy = frac_bits
    int frac_bits = 16;     // weight fixed-point unit = 1/65536 (mu = 1/32)
    int init_w = 16384;     // per-weight init (quarter scale)
    int w_min = 0;          // weight clamp range
    int w_max = 131072;
    // false: value bases {L, T, TL, L+T-TL}, uniform quarter-scale init.
    // true:  MED-anchored correction bases {MED, L-TL, T-TL, TR-TL},
    //        init {65536, 0, 0, 0} so the very first prediction IS plain MED
    //        (identity at init); corrections learn small deviations.
    bool med_anchor = false;
};

// Residual plane under the adaptive blend: e = sample - blend_pred(sample),
// where the blend state evolves causally exactly as the decoder will mirror
// it. O(1) per sample, no allocation beyond the output vector.
std::vector<int32_t> compute_residuals_blend(const std::vector<uint16_t>& plane,
                                             uint32_t w, uint32_t h,
                                             const BlendConfig& cfg);

// Exact inverse walk: rebuilds the plane from blend residuals by replaying the
// identical weight evolution. reconstruct(compute(plane)) == plane is a hard
// property tested at BD8/BD16 extremes and all border shapes.
std::vector<uint16_t> reconstruct_plane_blend(const std::vector<int32_t>& residuals,
                                              uint32_t w, uint32_t h,
                                              const BlendConfig& cfg,
                                              uint16_t bd_max);

// ----- E1 CALIC-class bias cancellation (issue #130, E-series blueprint) -----
// Per-CONTEXT slow aggregation (64 gradient-pair cells) instead of per-sample
// fast tracking: pred' = med + b[ctx], optionally followed by a multiplicative
// gain G[ctx] (mechanism b). Constants are pinned in docs/algorithmic-spec.md
// addenda 14.3 and 16 - this code is that contract, mirrored exactly by the
// decoder side because every input is decoded history (I2).

struct BiasConfig {
    bool additive = true;   // mechanism (a): integer bias table b[64]
    bool gain = false;      // mechanism (b): 16.16 gain table G[64] on top
    bool off() const { return !additive && !gain; }
};

// Gradient bucket shared with the harness's property machinery: count of
// thresholds {0,1,2,4,8,16,32} << bd_shift strictly below |g|, capped at 7
// (addendum 14.2). One implementation serves BiasModel and bench-ideal.
int bias_bucket(int64_t g, int bd_shift);

class BiasModel {
public:
    BiasModel(uint8_t bd, const BiasConfig& cfg);
    void reset();   // fresh state per plane (production scoping)
    // Full prediction chain for cell `ctx`: med + b[ctx], then gain when active.
    int32_t predict(int ctx, int32_t med) const;

    // Pinned update order (b first, then G), both from err = actual -
    // pred_final. The model recomputes its own prediction chain from (med,
    // current state) so encode and decode sides share one code path for
    // prediction AND error derivation (addendum 16.1).
    void update(int ctx, int32_t med, int32_t actual);

    // Test/harness observability only.
    int32_t bias_at(int ctx) const { return b_[ctx]; }
    int64_t gain_at(int ctx) const { return g_[ctx]; }

private:
    BiasConfig cfg_;
    int32_t bmax_;
    int32_t b_[64];
    int64_t g_[64];
};

// Residual plane under MED + bias cancellation: e = sample - corrected_pred,
// where the model state evolves causally exactly as the decoder will mirror
// it. The off() configuration produces byte-identical residuals to plain
// compute_residuals(MED) (BIAS-anchor contract).
std::vector<int32_t> compute_residuals_bias(const std::vector<uint16_t>& plane,
                                            uint32_t w, uint32_t h,
                                            uint8_t bd, const BiasConfig& cfg);

// Exact inverse walk: replays the identical model evolution. Hard bijection
// property at BD8/BD16 and all border shapes.
std::vector<uint16_t> reconstruct_plane_bias(const std::vector<int32_t>& residuals,
                                             uint32_t w, uint32_t h,
                                             uint8_t bd, const BiasConfig& cfg,
                                             uint16_t bd_max);

} // namespace prism::codec
