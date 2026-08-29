# Ideas: Route 7 - In-Subband Value Prediction + Adaptive Transform

- **Project:** `prism` (codec)
- **Date:** 2026-08-29
- **Issue:** #130 (Refs, gates OPEN)
- **Author:** the Builder
- **What it is:** Route 7 adds the value-decorrelation axis (Axis B) to Prism's wavelet
  codec - the one mechanism class that structurally sidesteps the table-economics law
  (I12) because the prediction is recomputed from already-reconstructed neighbours with
  ZERO transmitted side-info.

## The idea

Prism's bitplane coder is a *context model* (it predicts P(0) of a coefficient bit from
neighbour magnitudes) but never forms a *scalar value predictor* of the coefficient and
codes the residual `r = c - c_hat`. JPEG XL's predictor transform (and LOCO-I / CALIC /
JPEG-LS before it) does exactly this inside each subband: `c_hat = MED(W, N, NW)` from
raster-causal same-subband neighbours, then the residual is entropy coded. The EMA
context model still runs on top of `r`, so the two are complementary and free of
transmitted tables.

Route 7 has two independent, stackable levers on this axis:

- **R7-A** - in-subband MED/gradient value predictor. `InSubbandPredictor` forms `c_hat`
  from the fully reconstructed W/N/NW/NE of the SAME subband; `r = c - c_hat` is
  bitplane-coded; on decode the identical `c_hat` is rebuilt from already-decoded
  neighbours, so `c = c_hat + r` is byte-exact. Mode (MED vs GRADIENT) is chosen per
  subband by real coded bytes (C3).
- **R7-B** - per-decomposition-level filter selection (Haar / 5/3 / 9/7) via
  `WaveletParams::per_level_filter`, winner per level by a greedy C3 trial-encoding on
  REAL rANS bytes (not an L1/energy proxy). A 2-bit/level tag lives in the header;
  overhead is a few bytes/image, far inside I29.

## How it works (key files)

- `prism/include/prism/codec/r7_predictor.h` + `prism/src/codec/r7_predictor.cpp` -
  `InSubbandPredictor` (MED / GRADIENT over same-subband raster neighbours).
- `prism/include/prism/codec/wavelet.h` - `WaveletParams::per_level_filter` + helper.
- `prism/src/codec/wavelet.cpp` - `forward`/`inverse` use `filter_for_level(lvl)`.
- `prism/include/prism/codec/wavelet_container.h` - `R7A_FLAG=32`, `R7B_FLAG=64`,
  overflow `static_assert`; `sub_r7a_pred`, `level_filter` header fields.
- `prism/src/codec/wavelet_container.cpp` - `frame_wavelet_encode_r7` + decode dispatch.
- `prism/src/cli/main.cpp` - `wavelet-r7` / `bench-r7` CLIs.

## Honest arithmetic (from research spec)

X6b floor 3.2175/sample / 9.6525 summed. R6-D (~-3 to -5%) + R7-A (~-3 to -4% marginal) +
R7-B (~-1.5 to -2% marginal) compose on disjoint entropy sources toward ~2.85-3.10.
M2 (summed < 9.498 AND per-sample < 3.166) expected to clear once R6-D + R7-A land; M3
at risk on the conservative line. Pre-registered R7-1 gate requires >= -1.5% NET vs X6b
before the full 24-image measurement; held-out kodim02/07/17/21 is binding.

## Notes / craftsmanship decisions

- Genuine JXL/LOCO-I MED = `med_predictor(W, N, NW)` (existing helper). The research spec
  lists the raster 4-neighbourhood (W, N, NW, NE); NE is available in raster order but the
  LOCO-I MED is defined on (W, N, NW), and the gradient variant is `W + N - NW`. NE is not
  part of either canonical predictor, so it is documented as "available, unused" rather
  than inventing a non-standard 4-input median.
- R7-A does NOT set the legacy residual bit (bit0); it is dispatched exclusively by
  `R7A_FLAG`, and the X5a cross-component luma reference is gated OFF under `R7A_FLAG`
  (R7 is a residual frame with no luma context, exactly like X6a), preserving encode/
  decode symmetry.
- Per-level filter selection is a greedy C3 (O(levels x 3) real rANS encodes per image):
  each level tries the three filters, completing coarser levels with the base filter,
  scores the produced subbands by real bytes, and locks the winner. This is honest (uses
  real bytes, not an energy proxy) and tractable.

- the Builder
