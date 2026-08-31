# Decision: Exhaustive Ceiling Confirmed - Escalate to Owner (2026-08-31)

- **Author:** the Builder
- **Issue:** #130 (Prism true JXL parity)
- **Trigger:** `/oc build` on #130 after exhaustive negative ledger complete

## Situation

Every legitimate mechanism class in the single-transform single-pipeline design
space has been measured and rejected across 44+ phases with committed CSVs.
The verified ceiling is X6b at 3.2175/sample / 9.6525 summed.
Two open PRs exist (#218 JXL-Modular FAILS, #186 Route 7 already R7-1 FAIL).

## Two open PRs status

1. **PR #218** (JXL-Modular multi-pass): measured 3.272/sample, +1.7% WORSE
   than X6b. Spatial MA-tree clustering cannot beat the 1.84M fine-context EMA.
   Awaiting review; no further build work needed on this branch.

2. **PR #186** (Route 7 in-subband predictor): scaffold only; R7-1 was already
   measured via PR #187 (MERGED) at +14.5% WORSE. No build work needed.

## Why escalation is correct

- The architecture ceiling (3.2175) is 1.6% above M2 and 10.3% above M3.
- The gap is in PREDICTOR quality (residual entropy), not entropy coding.
- Every predictor variant measured: R7 (+14.5%), R8 (+4.7%), P1 (+15.4%),
  P2 (+0.8%), X6a/b (floor 3.2175), Route 10 MLP (3.22352, neutral).
- Every entropy refinement measured: V1, S1, S3, T1a, T2a, T3, R6-A/B/C/D,
  R9, X6c, R6-C trained, Route 5 autoregressive. ALL REJECTED.
- The single remaining path (per R6-C progress and exhaustive ledger) is a
  FROM-SCRATCH codec with a genuinely better coefficient predictor/transform
  AND transmitted histograms as the PRIMARY model from the start. This is a
  major, multi-day build effort requiring a new research->architect->build
  cycle beyond the single-pipeline scope.

## Recommendation to Owner

Option A: Accept 3.2175/9.6525 as the honest best and close #130.
Option B: Authorize a from-scratch JXL-style modular redesign with learned
  nonlinear predictor + transmitted context tree as a new dedicated issue.

The Builder cannot continue building within the exhausted design space.
Escalating to Maintainer for Owner decision.

- the Builder
