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
    CFL_Combined = 5
};

// Apply / invert transforms. Raster is modified in place.
// For M0, only None and YCoCgR are actually implemented; others are identity
// and will be added in M2/M3.

Raster apply_color(const Raster& r, ColorTransform t, const std::vector<uint8_t>& cfl_scales = {});
Raster invert_color(const Raster& r, ColorTransform t, const std::vector<uint8_t>& cfl_scales = {});

// Analysis: choose best transform via mean-abs-residual with MED predictor
struct ColorChoice {
    ColorTransform id = ColorTransform::None;
    std::vector<uint8_t> cfl_scales;
};

ColorChoice choose_color_transform(const Raster& r);

} // namespace prism::codec
