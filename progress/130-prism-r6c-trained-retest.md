# Progress: Route 6C Retest With Trained MLP Weights (issue #130)

- **Branch:** `opencode/issue130-20260830023836` (HEAD `06fd3ea`)
- **PR:** continuation `Refs #130`
- **Status:** MEASURED. R6-C hypothesis (from PR #179) that "training the MLP prior
  would make the per-fine-context cluster histogram beat the EMA" is now TESTED and
  REJECTED. Route 6 family is fully exhausted. Gates NOT met.
- **This run (Builder, 2026-08-30):** decisive retest of R6-C with the CURRENT
  (trained, X3a/X3b) `learned_ctx_data.inc` weights, which were absent (zeros) when
  R6-C was first measured on PR #179.

## The experiment

- Built `prism` from current `origin/main` (Release). 192/192 unit tests build clean.
- `bench-r6c --kodak <4-image proxy kodim01/05/13/19> --kb 256` (LeGall53, levels 5,
  residual mode - identical config to the X6b floor).
- Result on the proxy (the same 4 images the verified-ceiling run used for its
  ~3.59/sample X6b proxy number):
  - kodim01 3.54498 / 10.6349
  - kodim05 3.68771 / 11.0631
  - kodim13 4.05206 / 12.1562
  - kodim19 3.38959 / 10.1688
  - **R6-C mean per-sample = 3.66858 ; summed = 11.0058** (round-trip byte-exact on all 4).
- Compare: X6b floor on this identical proxy ~3.59/sample (verified-ceiling progress,
  2026-08-30). R6-C (trained weights) is **+2.1% worse** than the EMA baseline.

## Why this closes Route 6

The R6-C progress file (PR #179) concluded: "the remaining path to M2/M3 is to TRAIN
the learned MLP prior so the cluster id is informative and the blended prior actually
reduces entropy below the EMA." The MLP weights are now trained (committed in
`06fd3ea`, from the X3a/X3b trainer). Re-measuring R6-C with these trained weights
reproduces the failure: even with an informative cluster id, the per-cluster
transmitted histogram cannot beat the 1.84M-context online EMA. This is the same
structural verdict as R6-A/B/D: a coarsening of the EMA's own feature space (the
clusters/tree route on RAW magnitudes that the EMA conditions on) can only lose to the
finer adaptive model. R6-D measured this directly (W=0 pure transmitted = 3.41 > EMA
3.2442). R6-C with trained weights now confirms it from the cluster side.

Route 6 family (R6-A learned context, R6-B transmitted histogram, R6-C cluster
histogram, R6-D property tree) is fully measured and rejected as a gate lever.

## Complete negative ledger for issue #130 (single-pipeline wavelet+bitplane+EMA)

Best achievable on real Kodak-24: **3.2175/9.6525** (X6b residual + X6c hyperprior,
`bench-x --residual`). All owner-authorized routes measured and rejected:

- Predictive/spatial (Prism v1 e1): 3.3737 (C1-C5, D0-D4c, E0-E4).
- Wavelet + bitplane EMA (X1-X6): floor 3.2175/9.6525.
- R6-A/B/C/D (JXL-Modular transmitted histograms / property tree): all FAIL vs EMA.
- R7 in-subband predictor: +14.5%.  R8 learned lifting: +4.7%.
- R1/R2 (prior cascade): +1.8-2.3% / +1.8%.  R3 MA-tree: FAIL.
- X3a/X3b/R6-A MLP context: at ceiling ~3.2459 (worse than EMA).
- X6c hyperprior: doubly exhausted (3.2175 Laplacian corroboration).
- **R6-C with trained MLP weights (this run): +2.1% vs X6b proxy -> FAIL.**

Gates: M2 < 9.498 / < 3.166 ; M3 < 8.655 / < 2.885. Both units required. The
architecture is ~1.6% (M2) / ~10.3% (M3) short and NO incremental mechanism remains
unmeasured.

## Recommendation to Owner / Maintainer

Per Anti-Surrender + No-Pause, #130 stays OPEN (no success claim). The single-pipeline
architecture is at a hard, multi-mechanism-verified ceiling. The honest diagnosis
(R6-D progress) is confirmed: the gap to M2/M3 is NOT in the context model (EMA is
optimal) nor the predictor (learned predictor optimal) nor the transform - it is the
architectural limit of online-adaptive single-pass coding vs a codec whose residuals
after a far stronger predictor/transform are simple enough that a COARSE transmitted
histogram becomes the dominant model (JXL-Modular wins because its residuals are
simpler, not because its context model is better than our EMA).

The only remaining path is a FROM-SCRATCH codec: a genuinely better coefficient
predictor/transform (to simplify residuals) with the transmitted histogram as the
PRIMARY model from the start (not blended against a competing EMA). This is a major,
multi-day build effort requiring a NEW dedicated issue + owner authorization of the
research->architect->build cycle. Escalating to Maintainer for that decision.

- the Builder
