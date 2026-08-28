#pragma once
#include "prism/types.h"
#include <string>

namespace prism::codec {

// Color transform ids matching container header
enum class ColorTransform : uint8_t {
    None = 0,
    YCoCgR = 1,
    SubtractGreen = 2,
    YCoCgR_SubGreen = 3,
    CFL = 4,
    CFL_Combined = 5,
    Lift53 = 6,
    // D4c reversible rotation family (spec section 13; adopted offline via
    // the pre-registered CR-fmt gate, decision record 2026-08-24T21-45-00).
    // Full-byte header signaling: zero container cost. Like the YCoCg-R
    // family, rotations never compose with CFL.
    ROT_LOCO = 7,   // (G, R-G, B-((R+G)>>1))
    ROT_GRB = 8,    // butterfly on (G, R, B)
    ROT_GBR = 9,    // butterfly on (G, B, R)
    ROT_BRG = 10,   // butterfly on (B, R, G)
    ROT_RBG = 11    // butterfly on (R, B, G)
};

// True for the D4c rotation ids (7..11). These behave like the YCoCg family:
// BD8 RGB only, biased chroma planes (pi 1/2 window 1023), no CFL composition.
inline bool is_color_rotation(ColorTransform t) {
    return t >= ColorTransform::ROT_LOCO && t <= ColorTransform::ROT_RBG;
}

// Apply / invert transforms. Raster is modified in place.
// B6: CFL (ch' = ch - round(s*L/8)) is available for any base transform; scales
// length = num_chroma, s=0 identity. 5/3 lifting (Lift53) is an alternative
// single-level spatial decorrelator (B6) selected only when it shrinks bytes.

Raster apply_color(const Raster& r, ColorTransform t, const std::vector<uint8_t>& cfl_scales = {});
Raster invert_color(const Raster& r, ColorTransform t, const std::vector<uint8_t>& cfl_scales = {});

// 5/3 integer lifting (horizontal + vertical, one level per plane)
// Exposed for B6 search; also used by container when transform == Lift53.
// These operate per-plane with full reversibility on both 8- and 16-bit.
std::vector<uint16_t> lift53_forward_plane(const std::vector<uint16_t>& plane,
                                           uint32_t w, uint32_t h, uint16_t bd_max);
std::vector<uint16_t> lift53_inverse_plane(const std::vector<uint16_t>& data,
                                           uint32_t w, uint32_t h, uint16_t bd_max);

// Analysis: choose best transform via mean-abs-residual with MED predictor
struct ColorChoice {
    ColorTransform id = ColorTransform::None;
    std::vector<uint8_t> cfl_scales;
};

ColorChoice choose_color_transform(const Raster& r);

// --- D4c reversible color rotation family (spec section 13) ---
//
// Offline harness candidates beyond the shipped YCoCg-R trial set. Library
// level only: nothing here is signaled by the container or touched by any
// format path. Format wiring stays behind the pre-registered CR-fmt gate
// (docs/algorithmic-spec.md section 13.3).
namespace colorrot {

inline constexpr int kYcocgrId = 0;   // shipped transform, anchor equivalence
inline constexpr int kLocoId = 6;     // JPEG-LS/CALIC family
inline constexpr int kCount = 7;

// Name of candidate `id` ("ycocgr", "rct-grb", ...); throws std::out_of_range
// beyond [0, kCount).
const char* name(int id);

// Parse a candidate name to its id; returns -1 when unknown.
int id_of(const std::string& name);

// Forward / inverse for candidate `id`. BD8 RGB-only by contract (the shipped
// trial set is BD8-gated too); any other input throws std::invalid_argument.
// id 0 is byte-equivalent to apply_color(r, ColorTransform::YCoCgR) - tested.
Raster apply(const Raster& r, int id);
Raster invert(const Raster& r, int id);

} // namespace colorrot

} // namespace prism::codec
