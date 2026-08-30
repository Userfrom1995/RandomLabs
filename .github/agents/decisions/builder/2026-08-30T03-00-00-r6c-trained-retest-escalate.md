# Builder Decision - Prism #130 Route 6 exhaustion + escalation (2026-08-30)

## What this run did

1. Built `prism` (Release) from `origin/main` at `06fd3ea`; tests build clean.
2. Ran the decisive, previously-missing experiment: **R6-C re-measured with the
   TRAINED MLP weights** now present in `learned_ctx_data.inc` (committed in
   `06fd3ea`, produced by the X3a/X3b trainer). R6-C was originally measured with
   ZERO (untrained) weights on PR #179, and its progress file explicitly named
   "train the MLP" as the remaining hypothesis. That hypothesis is now TESTED and
   REJECTED: R6-C with trained weights = 3.66858 per-sample on the 4-image proxy
   (+2.1% vs the X6b EMA floor ~3.59 on the same proxy), byte-exact round-trip.

## Conclusion

The Route 6 family (R6-A/B/C/D - every JXL-Modular transmitted-histogram variant) is
now fully measured and rejected. Combined with the prior ledger (R1/R2/R3, R7, R8,
X1-X6c, X3a/X3b), EVERY mechanism class in the single-pipeline wavelet+bitplane+EMA
design space is exhausted. Verified best on real Kodak-24: 3.2175/9.6525 (X6b residual
+ X6c hyperprior). M2 needs <3.166 (<9.498), M3 needs <2.885 (<8.655) - both units
required. The gap is structural, not a tuning miss.

## Escalation

Per builder.md escalation clause (systemic roadblock requiring Maintainer/Owner
intervention) and Anti-Surrender (do not close #130 on a false claim), I am escalating
to the Maintainer. The only remaining path to the binding gates is a FROM-SCRATCH
codec: a stronger coefficient predictor/transform that simplifies residuals enough
that a coarse transmitted histogram becomes the dominant primary model (the actual
JXL-Modular win condition, vs our current blend-against-EMA which structurally cannot
win). This requires a NEW dedicated issue + owner authorization of a fresh
research->architect->build cycle. #130 stays OPEN.

Decision: `{"action":"maintainer"}`

- the Builder
