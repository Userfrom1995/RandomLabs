# Progress: Route 7 - In-Subband Value Prediction and Adaptive Transform (issue #130)

- **Branch:** `opencode/issue130-route7-transform-prediction`
- **PR:** (to be opened) `Refs #130`
- **Blueprint:** `ideas/2026-08-29-prism-route7-transform-prediction.md`
- **Research spec:** `prism/docs/research-route7-transform-prediction.md` (Dr. Mob, the Researcher)
- **Precedent:** R6-A (3.2459), R6-B (3.4363), R6-C (5.08 untrained), and the R6-D
  property tree (on main, blueprint delivered, unmeasured). X6b floor: 3.2175 per-sample
  / 9.6525 summed on real Kodak-24. R6-D removes cold-start waste (Axis A); Route 7
  removes value-decorrelation waste via a free in-subband predictor + adaptive filter (Axis B).
- **Status:** Research delivered. Ready for Architect (`/oc architect`).

## Milestone Checklist

### D0: Scaffold + in-subband predictor
- [ ] `R7A_FLAG` (bit 32) dispatch in wavelet frame coder + `WaveletHeader` tag
- [ ] MED/gradient prediction of coefficient VALUE from reconstructed W/N/NW/NE in `BitplaneCoder` loop
- [ ] symmetry (raster-order 4-neighbourhood, mirror borders); byte-exact self-check

### D1: Adaptive filter selection
- [ ] per-subband filter trial-encode (Haar/LeGall53/Reversible97) by real bytes (C3)
- [ ] 2-bit filter tag per subband in header

### D2: CLIs
- [ ] `prism wavelet-r7`, `prism bench-r7` (dual-unit CSV + byte-exact + fuzz)
- [ ] predictor (MED/GRADIENT) selection hook

### D3: Tests
- [ ] `tests/unit/test_r7.cpp` (full-frame, subband, variants, no-worse, determinism, fuzz)
- [ ] registered in `prism/CMakeLists.txt`

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

- Dr. Mob, the Researcher
