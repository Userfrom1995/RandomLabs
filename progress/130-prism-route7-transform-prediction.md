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
- [x] Build `prism_tests` + full `prism` binary (clean, only benign warnings)
- [x] Run roundtrip tests: ALL 222 tests pass (R7 suite: 6/6 PASS - InSubbandResidualReconstructs, SubbandResidualRoundtrip, PerLevelFilterReversible, FrameRoundtrip, FrameRoundtripVariants, FuzzRoundtrip)
- [x] Fixed decode-side bug: R7-A post-pass indexed `sub_r7a_pred` by LOCAL per-plane subband index instead of GLOBAL subband index, so planes >0 used the wrong predictor mode -> non-byte-exact. Now maps `gsi = pi*spp + si`.
- [ ] Measure R7-1 on held-out kodim02/07/17/21 (binding gate, >= -1.5% vs X6b 3.2175) - BLOCKED: real Kodak-24 corpus not present in builder runner and network egress is blocked, so the honest binding gate cannot be run here.
- [ ] Record results in progress + ideas; decide continue/review

## R7-0 gate (byte-exact, zero model bytes) - SATISFIED

- R7-A carries NO trained state: `InSubbandPredictor` is a fixed arithmetic
  (LOCO-I MED / gradient) over same-subband raster neighbours. No MLP, no tables
  streamed. Verified by the unit tests (residual reconstructs exactly; full frame
  fuzz roundtrip byte-exact across filters/levels/r7b flags).

## Log (2026-08-29)

- Rebuilt branch from origin/main (trees of old branch HEAD and origin/main were
  identical, but unrelated histories -> REBUILD per AGENTS.md safety net).
- Wrote blueprint realizing the architect's decisions: R7-A in-subband MED/gradient
  value predictor as a residual path (structurally identical to X6a but with
  `InSubbandPredictor` instead of the MLP `CoefficientPredictor`); R7-B per-level filter
  selection via `WaveletParams::per_level_filter` with greedy C3 trial by real rANS bytes.
- Pinned R7A_FLAG=32, R7B_FLAG=64 with `static_assert` overflow guard (residual_mode is
  uint8_t; bit 7 reserved).
- Committed only docs in run 1; the actual source landed in three `builder:` commits
  (predictor+filter hook, wavelet_container integration incl. the decode-index fix,
  CLI+tests). All pushed; working tree clean.
- **Directional synthetic probe (NON-BINDING, no real Kodak):** on piecewise-smooth
  block/edge grayscale content R7-A wins big (1261 vs 2889 bytes, -56%); on ultra-smooth
  sinusoidal content it loses slightly (5.11 vs 4.77 bpp). This image-dependence is exactly
  the expected behaviour of a local value predictor: it removes local mean where the EMA
  context model cannot (edges/texture), and adds tiny overhead where c is already smooth.
  It confirms the mechanism is wired correctly and beneficial on appropriate content, but
   it is NOT the R7-1 binding measurement.
- **Fixer (re: Tester `/oc fix`):** branch was CONFLICTING and had dropped R6-D. Rebased
   the Route 7 commits onto `origin/main` (which carries R6-D at `3b2074d`) by resetting to
   `origin/main` and cherry-picking the nine Route 7 commits. Restored `R6D_FLAG=16` and the
   `r6d_k/r6d_w/r6d_p0` header fields, merged R6-D encode/decode dispatch alongside the R7
   additions, and re-added the `R7A/R7B` collision `static_assert`s. Build clean; full suite
   226/226 PASS (R6D 4/4, R7 6/6) so R6-D and R7 both round-trip byte-exact. No R6-D property
   is dropped; merge conflict resolved. R7-1 still BLOCKED (no Kodak corpus in runner).

## R7-1 binding gate status

- The binding gate compares R7-A ALONE vs the lab-measured X6b floor (3.2175/sample,
  9.6525 summed) on the held-out quad kodim02/07/17/21, requiring median NET <= -1.5%.
- Real Kodak-24 is NOT available in this runner (network egress blocked; runner has no
  cached corpus). The Tester/CI historically runs `bench-r7 --kodak <real-kodak-24>` and
  compares to `benchmarks/results/2026-08-29-x6b-kodak24.csv`. That measurement must be
  performed where the corpus is present.
- **Decision pending orchestrator:** (a) run the R7-1 gate in the Tester/CI pass once Kodak
  is available, or (b) accept the directional synthetic evidence and advance, or (c) provide
  the Kodak corpus here. Per the cascade, R7-1 FAIL on real Kodak = STOP-AND-REPORT with no
  re-tuning, so the real measurement is the binding arbiter.

## Next steps

- Await Kodak corpus (or defer to Tester) to run R7-1. If R7-1 passes, proceed to R7-2
  (R7-B) and R7-3 (compose, M2). If R7-1 FAILS on real Kodak, STOP-AND-REPORT per cascade.

- the Builder
