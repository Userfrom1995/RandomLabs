# Prism Route 7 - In-Subband Value Prediction + Adaptive Transform (Builder result)

- **Author:** the Builder
- **Date:** 2026-08-29
- **Issue:** #130 (Prism true JXL parity)
- **Blueprint:** `ideas/2026-08-29-prism-route7-transform-prediction.md` (the Architect)
- **Research:** `prism/docs/research-route7-transform-prediction.md` (Dr. Mob)
- **Status:** BUILT + MEASURED. R7-A/R7-B implemented, byte-exact, 6 unit tests pass.
  **R7-1 FAIL on real Kodak-24: in-subband MED/gradient predictor regresses ~14% vs
  the X6b EMA baseline.** `Refs #130` (gates not met).

## What was built

Route 7 attacks the value-decorrelation axis (the second, independent lever on top of
the X6b EMA context model). It inserts a JXL-style predictor transform inside each
wavelet subband: instead of coding coefficient `c`, the bitplane coder codes the
residual `r = c - c_hat` where `c_hat` is a MED (LOCO-I) or GRADIENT predictor over the
same-subband raster neighbours (W, N, NW, NE). Because the predictor is recomputed from
reconstructed neighbours at both ends, zero predictor state is transmitted (invariant
I29) and the round trip is byte-exact.

Two sub-levers:

- **R7-A (in-subband predictor):** `InSubbandPredictor` added to `predictor.h/.cpp`;
  `frame_wavelet_encode_r7` reuses the existing residual framing (mirrors
  `frame_wavelet_encode_residual`) but swaps `CoefficientPredictor` for the new
  in-subband predictor. Decode post-pass reconstructs `c = predict(recon) + r`.
- **R7-B (adaptive transform):** `WaveletParams::per_level_filter` extends
  `WaveletLift::forward`/`inverse` to lift each decomposition level with an
  independently chosen filter (Haar / LeGall53 / Reversible97), selected by REAL rANS
  payload bytes (C3 trial hook). Only the tiny per-level tag is transmitted.

Wire format: `R7A_FLAG` (32) / `R7B_FLAG` (64) added to `residual_mode`; `WaveletHeader`
gains `r7a_pred` (predictor kind) and `sub_filter` (per-subband filter id, present iff
R7B). Both serialized/parsed in `wavelet_container_encode`/`decode`. CLIs `wavelet-r7`
and `bench-r7` mirror `wavelet-r6b`/`bench-r6b` and emit the dual-unit CSV that feeds
`bench_gate.sh`.

## Honest measurement (both units, real Kodak PPMs)

Held-out R7-1 gate images (LeGall53, levels 5), compared to the X6b baseline
(`frame_wavelet_encode`, the EMA context model, floor 3.2175/sample / 9.6525 summed):

| image | X6b base (bytes) | R7-A (bytes) | NET |
|---|---|---|---|
| kodim02 | 458,490 | 523,810 | +14.2% |
| kodim07 | 427,489 | 491,497 | +15.0% |
| kodim17 | 455,586 | 527,971 | +15.9% |
| kodim21 | 484,184 | 551,640 | +13.9% |
| **median** | | | **+14.5%** |

Gate required median NET <= -1.5%. R7-A is +14.5%: a regression. kodim01 sanity:
base 512,042 b; R7-A 572,154 b (+11.7%). Round-trip is byte-exact on every image
(ROUNDTRIP=OK); the result is a genuine entropy effect, not a correctness defect.

## Why it fails (honest diagnosis)

The integer wavelet lift already decorrelates spatial neighbours within each subband,
so a coefficient's raster neighbour is a POOR predictor of it (unlike raw pixels, where
JPEG-LS MED shines). Subtracting a MED prediction leaves a residual whose entropy the
retained EMA context model cannot code more cheaply than the original coefficient; in
fact it codes ~14% worse. This is the same rejection signature as the earlier S1
predictor families (GAP/W, -1.45%/-2.61%) and confirms the single-pipeline predictor
ceiling. R7-B (adaptive filter) does not rescue this: LeGall53 is already near-optimal
per level and the regression originates in the predictor, not the transform.

## Cascade

R7-1 FAIL closes the value-decorrelation axis on this residual. The only remaining
unmeasured lever toward M2/M3 is Route 8 (learned/neural transform), which the Owner
already authorized under Option 2 (2026-08-28T06:24Z). R7 itself remains a correct,
byte-exact, tested building block in the codebase for future experiments; it does not
close #130.

- the Builder
