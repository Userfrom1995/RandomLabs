# Progress: Route 7 - In-Subband Value Prediction and Adaptive Transform (issue #130)

- **Branch:** `opencode/issue130-20260829211143`
- **PR:** #185 `Refs #130`
- **Blueprint:** `ideas/2026-08-29-prism-route7-transform-prediction.md` (the Architect)
- **Research spec:** `prism/docs/research-route7-transform-prediction.md` (Dr. Mob, the Researcher)
- **Precedent:** R6-A (3.2459), R6-B (3.4363), R6-C (5.08 untrained), and the R6-D
  property tree (on main, blueprint delivered, unmeasured). X6b floor: 3.2175 per-sample
  / 9.6525 summed on real Kodak-24. R6-D removes cold-start waste (Axis A); Route 7
  removes value-decorrelation waste via a free in-subband predictor + adaptive filter (Axis B).
- **Status:** in-progress (blueprint delivered; ready for initial Builder pass)

## Milestone Checklist

### D0: Scaffold + in-subband predictor (R7-A)
- [ ] `R7A_FLAG = 32` / `R7B_FLAG = 64` residual_mode bits + `static_assert` overflow guard in `wavelet_container.h`
- [ ] `WaveletHeader::r7a_pred` (uint8_t) + `WaveletHeader::sub_filter` (per-subband filter id) fields
- [ ] `InSubbandPredictor` (MED + GRADIENT) in `predictor.h/.cpp`: `predict` / `residual` / `reconstruct` / `reversible_for_all_inputs` (raster 4-neighbour W,N,NW,NE, mirror borders)
- [ ] `frame_wavelet_encode_r7`: R7-A residual pre-pass (reuse `frame_wavelet_encode_residual` framing, swap `CoefficientPredictor` -> `InSubbandPredictor`)
- [ ] `frame_wavelet_decode`: R7A_FLAG dispatch (decode R via standard bitplane decoder, then `InSubbandPredictor::reconstruct` post-pass)
- [ ] `wavelet_container_encode`/`decode`: serialize `sub_filter` when R7B_FLAG set
- [ ] byte-exact self-check (T1/T2): decode(encode(x)) 24/24

### D1: Adaptive filter selection (R7-B)
- [ ] `WaveletParams::per_level_filter` (vector<WaveletFilter>); `WaveletLift::forward`/`inverse` lift level L with per-level filter; `reversible_for_all_inputs` covers combos
- [ ] C3 trial hook: per-level Haar/53/97 by REAL rANS bytes (not L1 proxy); record `sub_filter`
- [ ] decode maps subband `level` -> filter id via `sub_filter`

### D2: CLIs
- [ ] `prism wavelet-r7` (mirror `wavelet-r6b`): `--filter --levels --gradient --adaptive-filter`, ROUNDTRIP=OK/FAIL
- [ ] `prism bench-r7` (mirror `bench-r6b`): dual-unit CSV + M2/M3 gate print, `--gradient --adaptive-filter`

### D3: Tests
- [ ] `tests/unit/test_r7.cpp` (T1-T9: reversible, full-frame MED/GRADIENT, R7-B roundtrip, CLI smoke, no-worse, determinism, fuzz, R7-1 held-out gate)
- [ ] registered in `prism/CMakeLists.txt` (after `test_r6c.cpp`)

### D4: Measurement + gates
- [ ] R7-1 held-out 4-image (kodim02/07/17/21) median NET <= -1.5% vs X6b (3.2175) BEFORE full run
- [ ] R7-3 full Kodak-24: summed <= 9.498 AND per-sample <= 3.166 (M2), byte-exact, fuzz clean
- [ ] R7-4 stack with R6-D: summed <= 8.655 AND per-sample <= 2.885 (M3)

## Binding gates (restated, units mandatory)
- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130` (never
  `Closes #130` while gates remain open).

## Cascade (honest, no re-tuning to force a pass)
- R7-1 FAIL: value-decorrelation axis exhausted -> STOP-AND-REPORT, escalate to Owner for
  Route 8 (neural/learned transform) on authorization only.
- R7-3 M2 PASS, R7-4 M3 FAIL: M2 genuinely PASS (first in lab history); M3-PENDING;
  attempt R7-C stacking + R6-D composition, then escalate for Route 8.
- R7-4 PASS: both gates in both units -> format-stable v3 PR `Refs #130`.

- the Architect
