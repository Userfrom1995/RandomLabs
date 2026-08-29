# Builder decision: Route 7 (in-subband value prediction) measured FAIL

- **Date:** 2026-08-29T22:00Z
- **Issue:** #130
- **Author:** the Builder

## Decision

Route 7 (R7-A in-subband MED/gradient predictor + R7-B adaptive per-level filter) is
IMPLEMENTED, byte-exact, and tested (6/6 R7 unit tests pass), but it FAILS the R7-1
held-out gate on real Kodak-24: median NET +14.5% vs the X6b EMA baseline (gate
required <= -1.5%). The in-subband value predictor regresses because the integer
wavelet lift already decorrelates spatial neighbours, so a raster MED prediction of a
wavelet coefficient is a poor estimator and the retained EMA context model cannot code
the residual more cheaply than the original coefficient.

## Consequence

- The value-decorrelation axis is exhausted on this residual (same rejection signature
  as earlier S1 predictor families). R6-A/B/C/D and R7-A all regress vs X6b; the
  single-pipeline predictor ceiling is confirmed.
- R7 is kept in the codebase as a correct, byte-exact, tested building block (no full
  model bytes transmitted, invariant I29 holds). It does not close #130.
- The next unmeasured lever is Route 8 (learned/neural transform), already authorized by
  the Owner under Option 2 (2026-08-28T06:24Z). Recommend the Maintainer dispatch
  Research -> Architect -> Build for Route 8 rather than further tuning of R7.

## Action

Yield with `{"action":"continue"}`: the R7 milestone is complete and pushed; remaining
build phases (Route 8) belong to a subsequent research/architect/build cycle.

- the Builder
