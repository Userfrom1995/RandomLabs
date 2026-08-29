#pragma once
#include "prism/types.h"
#include <vector>
#include <cstdint>

namespace prism::codec {

// Reversible integer wavelet lifting (Route 4 beyond-predictive paradigm).
//
// All three filters are exactly reversible: lift_inv(lift(x)) == x for every
// integer input in the coded range (invariant I26). This is the explicit guard
// against the U1 non-reversible-DCT trap (U1 was |fwd(inv(x))-x| <= 1, NOT
// byte-exact). The transforms operate on a full plane (NOT 8x8 blocks), giving
// multiresolution decorrelation unlike U1.
//
// Border handling is symmetric (mirror/reflect) so the lift is lossless at the
// plane edges and identical on encode and decode.

enum class WaveletFilter : uint8_t {
    Haar = 0,        // Baseline control (low compaction)
    LeGall53 = 1,    // PRIMARY: J2K lossless standard, best balance
    Reversible97 = 2, // Sweep candidate (best compaction, higher rounding cost)
    Learned = 3     // Route 8: learned nonlinear lifting (baked context LUT)
};

constexpr int X_FILTER_ID_HAAR = 0;
constexpr int X_FILTER_ID_53 = 1;
constexpr int X_FILTER_ID_97 = 2;
constexpr int X_FILTER_ID_LEARNED = 3;
constexpr WaveletFilter X_DEFAULT_FILTER = WaveletFilter::LeGall53;
constexpr int X_DEFAULT_LEVELS = 5;

// Route 8 learned nonlinear lifting (issue #130).
//
// The integer Le Gall 5/3 predict/update steps are linear:
//   predict: odd[k]  =  odd[k]  - ((even[k] + even[k+1]) >> 1)
//   update:  even'[k] = even[k] + ((odd'[k-1] + odd'[k]) >> 1)
// This learned variant adds a SMALL per-context integer offset (a piecewise
// constant correction) to each linear base, trained offline on real Kodak to
// minimise the prediction residual energy. The correction is a deterministic
// function of already-coded neighbours, so the lift stays EXACTLY reversible
// (invariant I26) for every integer input. With all offsets = 0 the filter is
// bit-identical to Le Gall 5/3, so it degrades gracefully.
struct LearnedLift {
    static constexpr int kCtx = 16;   // predict contexts
    static constexpr int kUpdCtx = 16; // update contexts
    int16_t pred_lut[kCtx] = {0};
    int16_t upd_lut[kUpdCtx] = {0};
};
const LearnedLift& learned_lift();
void set_learned_lift(const LearnedLift& ll);

// Training support (Route 8): while a collection sink is active, forward_learned
// accumulates the per-context prediction / update residuals so an offline trainer
// can fit the LUT offsets by least squares (mean residual per context).
struct LearnedLiftStats {
    int64_t pred_err[LearnedLift::kCtx] = {0};
    int64_t pred_cnt[LearnedLift::kCtx] = {0};
    int64_t upd_err[LearnedLift::kUpdCtx] = {0};
    int64_t upd_cnt[LearnedLift::kUpdCtx] = {0};
};
void learned_lift_collect_begin(LearnedLiftStats* sink);
void learned_lift_collect_end();

struct WaveletParams {
    WaveletFilter filter = X_DEFAULT_FILTER;
    int levels = X_DEFAULT_LEVELS;
    // R7-B: per decomposition level filter selection (index by level 1..levels).
    // Empty means "use a single `filter` for every level" (legacy behaviour).
    // When non-empty it must hold `levels` entries (index 0 == LL, unused).
    std::vector<WaveletFilter> per_level_filter;
};

// A single subband of integer coefficients.
struct Subband {
    enum class Orient : uint8_t { LL = 0, HL = 1, LH = 2, HH = 3 };
    Orient orient = Orient::LL;
    int level = 0; // 0 = coarsest LL; 1..levels for detail bands
    int w = 0, h = 0;
    std::vector<int32_t> coeffs; // signed integer coefficients, raster order
};

// Reversible integer wavelet lift for one plane.
struct WaveletLift {
    // Forward: plane -> LL (level 0) + (HL,LH,HH) per level, as int32 subbands.
    std::vector<Subband> forward(const std::vector<int32_t>& plane,
                                 uint32_t w, uint32_t h,
                                 const WaveletParams& p) const;

    // Inverse: subbands -> reconstructed plane (byte-exact under reversibility).
    std::vector<int32_t> inverse(const std::vector<Subband>& subbands,
                                 uint32_t w, uint32_t h,
                                 const WaveletParams& p) const;

    // VB rail target: returns false on ANY mismatched round-trip pixel.
    bool reversible_for_all_inputs(const WaveletParams& p) const;

private:
    // In-place 2D lift of a w x h buffer (rows then columns) / inverse.
    static void lift_rows_cols(std::vector<int32_t>& buf, uint32_t w, uint32_t h,
                               WaveletFilter f);
    static void unlift_rows_cols(std::vector<int32_t>& buf, uint32_t w, uint32_t h,
                                 WaveletFilter f);
};

} // namespace prism::codec
