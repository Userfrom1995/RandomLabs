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
    Reversible97 = 2 // Sweep candidate (best compaction, higher rounding cost)
};

constexpr int X_FILTER_ID_HAAR = 0;
constexpr int X_FILTER_ID_53 = 1;
constexpr int X_FILTER_ID_97 = 2;
constexpr WaveletFilter X_DEFAULT_FILTER = WaveletFilter::LeGall53;
constexpr int X_DEFAULT_LEVELS = 5;

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
