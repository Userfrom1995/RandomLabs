#pragma once
#include "prism/types.h"
namespace prism::frontend {
// ICC linearization: if raster carries ICC profile, linearize to sRGB before codec.
// Current implementation is pass-through with hook for lcms2 integration.
// When built with PRISM_WITH_LCMS, this applies the profile transform.
void apply_icc_if_present(Raster& r, const uint8_t* icc_data, size_t icc_len);
}
