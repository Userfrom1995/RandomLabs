#pragma once
#include "prism/types.h"

namespace prism::codec {

// Color transform ids matching container header
enum class ColorTransform : uint8_t {
    None = 0,
    YCoCgR = 1,
    SubtractGreen = 2,
    YCoCgR_SubGreen = 3,
    CFL = 4,
    CFL_Combined = 5,
    Lift53 = 6
};

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

} // namespace prism::codec
