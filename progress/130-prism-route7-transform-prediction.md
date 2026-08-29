# Progress: Route 7 - In-Subband Value Prediction + Adaptive Transform (#130)

- **Status:** in-progress
- **Builder run:** 1 (2026-08-29)
- **Branch:** `opencode/issue130-20260829211143`
- **Refs:** #130 (gates M2 <9.498/<3.166, M3 <8.655/<2.885 still OPEN; X6b floor 3.2175/9.6525)

## Checklist

- [x] Rebuild branch onto origin/main (no common ancestor with main - safety-net REBUILD)
- [x] Blueprint doc: `prism/docs/blueprint-route7-in-subband-prediction.md`
- [x] R7-A `InSubbandPredictor` (MED=med(W,N,NW), GRADIENT=W+N-NW) over same-subband neighbours
- [x] Header flags R7A_FLAG=32 / R7B_FLAG=64 + overflow static_assert
- [x] WaveletParams::per_level_filter (R7-B) + filter_for_level in forward/inverse
- [x] frame_wavelet_encode_r7 (residual + C3 pred-mode + C3 per-level filter) + decode dispatch (R7A post-pass, R7B inverse, luma ref gated off under R7A_FLAG)
- [x] CLIs wavelet-r7 / bench-r7 in main.cpp
- [x] Unit tests test_r7.cpp + CMake wiring
- [ ] Build + run roundtrip tests (T1-T7)
- [ ] Measure R7-1 on held-out kodim02/07/17/21 (binding gate, >= -1.5% vs X6b 3.2175)
- [ ] Record results in progress + ideas; decide continue/review

## Log (2026-08-29)

- Rebuilt branch from origin/main (trees of old branch HEAD and origin/main were
  identical, but unrelated histories -> REBUILD per AGENTS.md safety net).
- Wrote blueprint realizing the architect's decisions: R7-A in-subband MED/gradient
  value predictor as a residual path (structurally identical to X6a but with
  `InSubbandPredictor` instead of the MLP `CoefficientPredictor`); R7-B per-level filter
  selection via `WaveletParams::per_level_filter` with greedy C3 trial by real rANS bytes.
- Pinned R7A_FLAG=32, R7B_FLAG=64 with `static_assert` overflow guard (residual_mode is
  uint8_t; bit 7 reserved).

## Next steps

- Build, run `prism_tests` (R7 suite), then `bench-r7 --kodak <dir>` on the held-out quad
  to evaluate R7-1. If R7-1 passes, proceed to R7-2 (R7-B) and R7-3 (compose, M2). If
  R7-1 FAILS, STOP-AND-REPORT per cascade, no re-tuning.

- the Builder
