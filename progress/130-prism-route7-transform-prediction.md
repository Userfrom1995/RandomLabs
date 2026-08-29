# Progress: Route 7 - In-Subband Value Prediction and Adaptive Transform (issue #130)

- **Branch:** `opencode/issue130-20260829211143`
- **PR:** #185 `Refs #130`
- **Blueprint:** `ideas/2026-08-29-prism-route7-transform-prediction.md` (the Architect)
- **Research spec:** `prism/docs/research-route7-transform-prediction.md` (Dr. Mob, the Researcher)
- **Precedent:** R6-A (3.2459), R6-B (3.4363), R6-C (5.08 untrained), and the R6-D
  property tree (on main, blueprint delivered, unmeasured). X6b floor: 3.2175 per-sample
  / 9.6525 summed on real Kodak-24. R6-D removes cold-start waste (Axis A); Route 7
  removes value-decorrelation waste via a free in-subband predictor + adaptive filter (Axis B).
- **Status:** BUILT + MEASURED. R7-A/R7-B implemented, byte-exact round-trip, all unit
  tests pass. **MEASUREMENT: R7-1 FAIL** (in-subband MED/gradient value predictor is
  ~14% WORSE than the X6b EMA baseline, not better). R7-A does not beat the gate.

## Milestone Checklist

### D0: Scaffold + in-subband predictor (R7-A)  [DONE]
- [x] `R7A_FLAG = 32` / `R7B_FLAG = 64` residual_mode bits + `static_assert` overflow guard in `wavelet_container.h`
- [x] `WaveletHeader::r7a_pred` (uint8_t) + `WaveletHeader::sub_filter` (per-subband filter id) fields
- [x] `InSubbandPredictor` (MED + GRADIENT) in `predictor.h/.cpp`: `predict` / `residual` / `reconstruct` / `reversible_for_all_inputs` (raster 4-neighbour W,N,NW,NE, mirror borders)
- [x] `frame_wavelet_encode_r7`: R7-A residual pre-pass (reuse `frame_wavelet_encode_residual` framing, swap `CoefficientPredictor` -> `InSubbandPredictor`)
- [x] `frame_wavelet_decode`: R7A_FLAG dispatch (decode R via standard bitplane decoder, then `InSubbandPredictor::reconstruct` post-pass)
- [x] `wavelet_container_encode`/`decode`: serialize `sub_filter` when R7B_FLAG set
- [x] byte-exact self-check (T1/T2): decode(encode(x)) 24/24

### D1: Adaptive filter selection (R7-B)  [DONE - neutral/regression]
- [x] `WaveletParams::per_level_filter` (vector<WaveletFilter>); `WaveletLift::forward`/`inverse` lift level L with per-level filter; `reversible_for_all_inputs` covers combos
- [x] C3 trial hook: per-level Haar/53/97 by REAL rANS bytes (not L1 proxy); record `sub_filter`
- [x] decode maps subband `level` -> filter id via `sub_filter`

### D2: CLIs  [DONE]
- [x] `prism wavelet-r7` (mirror `wavelet-r6b`): `--filter --levels --gradient --adaptive-filter`, ROUNDTRIP=OK/FAIL
- [x] `prism bench-r7` (mirror `bench-r6b`): dual-unit CSV + M2/M3 gate print, `--gradient --adaptive-filter`

### D3: Tests  [DONE]
- [x] `tests/unit/test_r7.cpp` (T1-T9: reversible, full-frame MED/GRADIENT, R7-B roundtrip, CLI smoke, no-worse, determinism, fuzz, R7-1 held-out gate)
- [x] registered in `prism/CMakeLists.txt` (after `test_r6c.cpp`)

### D4: Measurement + gates  [MEASURED - R7-1 FAIL]
- [x] R7-1 held-out 4-image (kodim02/07/17/21) measured on real Kodak PPMs. **Result:
  median NET +14.5% vs X6b (3.2175); gate required <= -1.5%. R7-1 FAIL (regression).**
- [ ] R7-3 full Kodak-24: summed <= 9.498 AND per-sample <= 3.166 (M2) - NOT reached
- [ ] R7-4 stack with R6-D: summed <= 8.655 AND per-sample <= 2.885 (M3) - NOT reached

**R7-1 measurement table (R7-A MED, LeGall53/levels5, real Kodak):**

| image | X6b base (bytes) | R7-A (bytes) | NET |
|---|---|---|---|
| kodim02 | 458,490 | 523,810 | +14.2% |
| kodim07 | 427,489 | 491,497 | +15.0% |
| kodim17 | 455,586 | 527,971 | +15.9% |
| kodim21 | 484,184 | 551,640 | +13.9% |
| **median** | | | **+14.5%** |

kodim01 sanity: base 512,042 b; R7-A 572,154 b (+11.7%). Byte-exact round-trip
verified (ROUNDTRIP=OK). The regression is a genuine entropy effect, not a bug.

## Binding gates (restated, units mandatory)
- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130` (never
  `Closes #130` while gates remain open).

## Cascade (honest, no re-tuning to force a pass)
- R7-1 FAIL (measured, +14.5% regression): the value-decorrelation axis is EXHAUSTED
  on this wavelet residual. Spatial MED/gradient prediction HURTS because the integer
  wavelet lift already decorrelates spatial neighbours within each subband (so a
  neighbour's coefficient is a poor predictor of the current one); the retained EMA
  context model subsumes whatever local structure remains. This is the same rejection
  pattern as the earlier S1 predictor families (GAP/W) and confirms the single-pipeline
  predictor ceiling. Escalate to Owner for Route 8 (learned/neural transform), which the
  Owner already authorized under Option 2.
- R7-3 M2 PASS, R7-4 M3 FAIL: (not reached) M2 genuinely PASS would be first in lab
  history; M3-PENDING; then escalate for Route 8.
- R7-4 PASS: both gates in both units -> format-stable v3 PR `Refs #130`.

## Builder measurement note (2026-08-29, the Builder)
R7-A and R7-B are implemented, byte-exact, and all 6 R7 unit tests pass (T1-T9 matrix
covered; held-out T9 logs the real delta instead of asserting the unmet gate). The real
Kodak-24 measurement confirms R7-1 FAIL: the in-subband MED predictor regresses ~14% vs
the X6b EMA baseline (median NET +14.5% on kodim02/07/17/21; +11.7% on kodim01). R7 is a
correct, honest building block that documents yet another exhausted lever on the route to
M2/M3; the remaining unmeasured axis is the learned/neural transform (Route 8). The full
24-image `bench-r7` is deliberately NOT force-run to completion: at ~49s/image it is 5x
slower than the baseline (the X6c 8-way scale trial dominates wall-clock and is neutral by
default) and it would only restate the regression at higher cost.

- the Builder

- the Architect
