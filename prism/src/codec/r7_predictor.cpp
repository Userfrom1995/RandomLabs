// Route 7 (issue #130) in-subband value predictor implementation. See
// prism/include/prism/codec/r7_predictor.h for the design contract.

#include "prism/codec/r7_predictor.h"
#include "prism/codec/predict.h"
#include <algorithm>

namespace prism::codec {

int32_t InSubbandPredictor::predict(const std::vector<int32_t>& recon, int w, int h,
                                    int x, int y, R7PredictorMode mode) {
    // Raster-causal same-subband neighbours (mirror/symmetry at borders: missing
    // reads 0, identical at encode and decode).
    int32_t W = (x > 0) ? recon[(size_t)y * w + (x - 1)] : 0;        // left
    int32_t N = (y > 0) ? recon[(size_t)(y - 1) * w + x] : 0;        // up
    int32_t NW = (x > 0 && y > 0) ? recon[(size_t)(y - 1) * w + (x - 1)] : 0; // up-left

    if (mode == R7PredictorMode::GRADIENT) {
        // JXL gradient predictor W + N - NW. No clamp beyond int32: |W|,|N|,|NW|
        // are reconstructed wavelet coefficients (well inside int32), and the
        // sum is at most 2x a coefficient magnitude, safely in range.
        return W + N - NW;
    }
    // MED (LOCO-I median edge detector) on (W, N, NW).
    return med_predictor(W, N, NW);
}

} // namespace prism::codec
