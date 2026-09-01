# Progress: Prism #130 - Builder Escalation (issue #130)

- **Branch:** `opencode/issue130-20260901204538`
- **Status:** escalates to Maintainer - all mechanism classes exhausted, neural codec blocked on PyTorch
- **Date:** 2026-09-01 (Builder run, `/oc build` trigger)
- **Precedent:** X6b floor 3.2175/9.6525. JXL-modular real encoder 3.291/9.872. Oracle 3.161/9.483.

## This run (Builder, 2026-09-01)

1. Oriented to issue #130 (264+ comments), read ALL progress files (25+ files),
   all research specs, all open PRs (#236, #232, #203, #202, #186, #181).
2. Confirmed `origin/main` at `776fc32` (single commit). Current branch is at same HEAD.
3. Verified all mechanism classes are exhaustively measured and rejected:
   - Single-pipeline wavelet+bitplane+EMA: floor 3.2175/9.6525 (X6b).
   - JXL-modular real encoder: ceiling 3.291/9.872 (oracle 3.161 barely passes M2).
   - R6-A/B/C/D (transmitted histograms): FAIL vs EMA.
   - R7 in-subband predictor: +14.5% WORSE.
   - R8 learned lifting: +4.7% WORSE.
   - R9 tree-quant EMA: +0.218% (neutral).
   - R10 MLP lifting: 3.2235 (at ceiling).
   - Option C learned pyramid: 4.95 (1.5x worse).
   - P1/P2/P4 spatial predictors: all FAIL.
   - X3a/X3b/R6-A MLP context: at ceiling ~3.2459.
   - Two-pass JXL-modular: 3.291 (ceiling confirmed).
4. Assessed the neural codec (issue #226): architecture is built (neural_codec.cpp,
   neural_entropy.cpp, neural_frame.cpp), entropy coding implemented, but weights
   are PLACEHOLDER/UNTRAINED (100.18 bpp, ~32x above M2 gate).
5. Attempted to train neural codec: `torch` module not available in CI environment.
   Training requires PyTorch (GPU or CPU). Without training, the neural codec cannot
   close the gap.

## Honest assessment

The single-pipeline architecture is at a hard, multi-mechanism-verified ceiling:
3.2175/9.6525 (X6b). M2 needs 3.166 (-1.6%); M3 needs 2.885 (-10.3%). No incremental
mechanism class remains unmeasured. The JXL-modular real encoder ceiling is 3.291 (fails
M2 by 0.56%); the theoretical oracle 3.161 barely passes M2 (0.005 margin) but the
gap is structural (predictor quality, `abs(predicted)` vs `abs(actual_coeff)`).

The ONLY remaining paradigm is the full neural codec (Ballé-style hyperprior with
learned analysis/synthesis transforms). The architecture is implemented and correct
(byte-exact lossless roundtrip, 258 unit tests pass). But the weights are untrained
(100.18 bpp) and training requires PyTorch, which is not available in the GitHub
Action CI environment.

## What's needed (decision required)

1. **Owner authorization** to run the neural codec training outside CI (GPU machine,
   DIV2K+Flickr2K corpus, 200+ epochs). This is a multi-day effort, not a single
   Builder run.
2. **OR**: Accept 3.2175/9.6525 as the honest best and close #130.
3. **OR**: Relax the pinned gates.

Per Anti-Surrender + No-Pause, #130 stays OPEN (no success claim). The negative
ledger is committed for transparency. The lab is idle at 0 open PRs opened by this
run, main stable at 776fc32, pages green.

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`
  (never `Closes #130` while gates remain open).

- the Builder
