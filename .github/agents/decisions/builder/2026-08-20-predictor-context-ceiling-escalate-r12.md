# Builder decision: Obsidian predictor is at its context-refinement ceiling (escalate for R12 blueprint)

- **Issue:** #68 (Obsidian lossless codec)
- **Branch:** opencode/issue68-20260818070512
- **Date:** 2026-08-20
- **Builder:** the Builder

## Status of the JPEG XL gate

Full real-Kodak effort-4 mean = **9.5208 bpp**. Gates: PNG 13.05 MET, WebP 9.61
MET, **JPEG XL 8.71 NOT MET (gap +0.81 bpp)**. The owner override forbids merge
until all three are beaten bit-exactly, so the build is NOT complete.

## What was tried this run (empirical, not theoretical)

I attempted a concrete, safe predictor refinement: deepen the R9-B `WeightedTree`
weight context from 15 leaves (the old code hashed 27 raw gradient combos into 15
via a modulo, which is itself a collision) to a finer 64-leaf 4-tier magnitude
partition (`predict.rs::weight_context`, `WC_LEAVES=64`).

Measured on the full 24-image Kodak set (release build, effort 4):

| config                     | mean bpp |
|----------------------------|----------|
| baseline (15 leaves)       | 9.5208   |
| 64-leaf finer partition    | 9.5262   |

The finer context **regressed** (+0.0054 bpp). Reverted.

## Why this matters (third confirming data point)

This is now the **third** independent axis that confirms the R11-D finding
("context refinement alone cannot close the ~0.81 bpp JPEG XL gap; the gap is the
predictor, not the entropy backend or context model"):

1. R11-D combined gradient+residual MA context (`OBSIDIAN_CARC_MA_CTX`) - wash.
2. R11-A cross-band in-loop predictor (per-band `wLL`) - wash + 45x slowdown.
3. This run: finer `WeightedTree` weight-context partition (15 -> 64 leaves) - wash/regress.

All three refine the *context granularity* of an already-near-optimal per-leaf
least-squares weighted predictor and the already `H(p)+epsilon` CMARC entropy
backend. None move the needle. The conclusion is robust: the residual-energy
floor is set by the **predictor's functional form**, not by how finely we partition
its context.

## What is actually needed (Architect territory)

JPEG XL (8.71) beats us by ~8.5% on this corpus. Its decisive, still-absent
levers in Obsidian are architectural, not tunable from the Builder seat:

- **A genuinely adaptive weighted predictor learned PER SQUEEZE BAND** (JPEG XL
  fits the property-tree weights in the subsampled LL domain where the residuals
  are smooth and the linear fit is far more accurate; Obsidian solves one weight
  table on the full-res plane and reuses it for every band).
- **A true MA-tree entropy context** that conditions the coder on the predictor's
  own local gradient/activity properties across a richer (hundreds-deep) context,
  adapted per band - distinct from the "combined gradient+residual" context tried
  in R11-D (which only widened the existing context, not its semantics).
- Possibly **per-pixel multi-channel copy / 2D LZ77** (R6-C/D) re-evaluated AFTER
  the predictor shrinks residuals, since matches only win once the residual
  distribution is small enough.

These are blueprint-scale designs (new model-section fields, per-band analysis
passes, possibly a new entropy-mode). They require an Architect blueprint, not
Builder tuning. The R11-D commit already recommended escalating for one.

## Decision

Escalate to the Maintainer to dispatch an **Architect blueprint for R12: the
adaptive per-band weighted predictor + MA-tree entropy context** (the JPEG XL
class predictor). The Builder will resume implementation once the blueprint
lands. The branch is left clean (regression reverted); the codec still measures
9.5208 bpp and all 138 lib tests pass.

- the Builder
