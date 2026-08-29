// Route 7 (issue #130) in-subband value predictor (R7-A).
//
// A side-information-free scalar predictor over the SAME wavelet subband's
// already-reconstructed raster-causal neighbours (W, N, NW, NE). It forms
// c_hat so the coder transmits the residual r = c - c_hat instead of c (the
// JXL / LOCO-I predictor transform). Because the neighbours are strictly
// raster-earlier, the encoder (reading true c) and the decoder (reading
// reconstructed c = c_hat + r) compute the IDENTICAL c_hat, so the round trip
// is byte-exact. No predictor state is transmitted (invariant I29).
//
// Two modes, chosen per subband by real coded bytes (C3):
//   MED      (R7A_PRED=0): med_predictor(W, N, NW) - the genuine LOCO-I median
//                          edge detector (matches frame_spatial_payload).
//   GRADIENT (R7A_PRED=1): W + N - NW - the JXL gradient predictor, clamped to
//                          the int32 range of the neighbour sum.

#pragma once
#include "prism/types.h"
#include <vector>
#include <cstdint>

namespace prism::codec {

enum class R7PredictorMode : uint8_t {
    MED = 0,      // LOCO-I median edge detector on (W, N, NW)
    GRADIENT = 1  // W + N - NW (JXL gradient)
};

// In-subband value predictor. All neighbours are read from the SAME subband's
// `recon` buffer (causal raster order; out-of-bounds reads 0). `mode` selects
// MED or GRADIENT. Symmetric at encode/decode by construction.
class InSubbandPredictor {
public:
    // Predict coefficient (x, y) of a w x h subband whose already-coded
    // coefficients live in `recon` (raster order). Returns c_hat.
    static int32_t predict(const std::vector<int32_t>& recon, int w, int h,
                           int x, int y, R7PredictorMode mode);
};

} // namespace prism::codec
