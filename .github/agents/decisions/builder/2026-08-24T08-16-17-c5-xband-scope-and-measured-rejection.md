# Decision: C5 scope - xband realization, legacy path retirement, measured rejection

- **Agent:** the Builder
- **When:** 2026-08-24T08:16Z (continuation run 7 on PR #131, issue #130)
- **Context:** blueprint section 7 (C5 cross-band prediction) after four
  straight static-transform rejections (F2 ideal-level, C2, C2b, C4).

## Decisions made and why

1. **Band-local weights instead of a global `PredId::XBAND`.** The global
   predictor bank ranks ids for FLAT planes via `compute_residuals`, which has
   no LL domain; a global enum id could never be selected honestly there.
   The cross-band predictor therefore ships as a band-local mechanism keyed
   by container bit6 + per-plane weights. The algorithmic-spec addendum and
   blueprint section 7.1 document the deviation.
2. **Pure linear model, not additive-on-MED.** First implementation added
   `w*g` on top of MED. Measured in a scratch harness during development:
   when HF structure is dominated by `w*g`, MED of band neighbors predicts
   the neighbor's dominant term and ADDS noise (`med(hf)` ~= `w*g(x+/-1)`),
   making weighted coding WORSE than zero-weight (236 vs 142 bytes in the
   probe). The shipped model is `pred = floor(w*g/16)`, replacing MED only
   when the weight is nonzero; weight 0 keeps byte-exact legacy behavior.
   Unit test `XbandSelector.FindsCrossBandWinOnConstructedPlane` pins a
   decisive win under this form (445 vs 954 flat bytes).
3. **Header accounting: +3 bytes per squeezing plane, always under bit6.**
   Simplest rule that keeps trial accounting exact end-to-end (the chooser's
   totals include it), avoids any cross-plane cost coupling, and lets the
   decoder infer the count from squeeze_levels with no extra header field.
4. **Legacy coupled estimator path retired.** When any plane squeezes at
   effort >= 3, production now takes the modern plain-v2 multiband regime
   directly (CM/LZP candidate comparison still happens in prism.cpp). The
   old block was the last home of energy proxies (`estimate_bits`,
   `squeezed_band_cost`, `evalGuard`) which the Reviewer flagged as
   tolerated-until-C5 only. On the photo corpus the block was dead code
   (squeeze rejected 24/24 since C2); fuzz exercises the replacement.
5. **Weight candidate set {0, +/-4, +/-12} (1/16 units).** Small enough to
   keep e>=3 wall-clock flat (measured: identical inputs encode marginally
   faster than pre-C5 because the deleted legacy block offset the search),
   wide enough to capture the constructed-correlation win exactly.

## Measured outcome (honest)

- Mechanism: proven by unit tests (adoption when correlation is real,
  never-expand otherwise).
- Reality: REJECTED on every plane of all 24 pinned images at e3/e7;
  e1/e3/e7 corpus CSVs reproduced byte-identically to pre-C5.
- M3 checkpoint FAILS in both units (10.2861 / 3.4287 vs < 8.655 / < 2.885),
  as expected for an all-reject phase. No parity claim.

## Consequence

Per the progress tracker's own rule: next phase re-scopes with the Architect
before any C6 work. Static spatial-transform directions are closed by
measurement; remaining parity levers are elsewhere (e.g., color-space
modeling, backend mixing), to be re-derived rather than assumed.

- the Builder
