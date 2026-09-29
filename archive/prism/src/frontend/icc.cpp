#include "prism/frontend/icc.h"
namespace prism::frontend {
void apply_icc_if_present(Raster& , const uint8_t* , size_t ){
    // Hook: when PRISM_WITH_LCMS is enabled, use lcms2 cmsCreateTransform
    // to convert from embedded profile to sRGB. Current stub is no-op
    // but preserves API and call site for B9 completeness.
}
}
