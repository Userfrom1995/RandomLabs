# Progress: Prism #130 - Fair Re-Measurement of Route 6 (issue #130)

- **Branch:** `opencode/issue130-20260830025449`
- **PR:** (continuation) `Refs #130`
- **Status:** in-progress (fair measurement + escalation; gates NOT met)
- **Precedent:** the previous ledger (`progress/130-prism-verified-ceiling-20260830.md`,
  `progress/130-prism-route6-r6c-cluster-histogram.md`) concluded "Route 6 exhausted" but
  rested on a **measurement-integrity defect**: R6-C was measured on 192x128 DOWNSCALED
  stand-in images (5.08 bpp) and compared against the FULL-image X6b baseline (3.2442), an
  apples-to-oranges comparison. This run re-measures R6-C and R6-D on the SAME REAL corpus
  (pinned quad kodim01/05/13/19, 768x512 PPMs, SHA-verified) as the baseline, to settle the
  question honestly.

## This run (Builder, 2026-08-30)

1. Built `prism` from current `origin/main` (commit 06fd3ea, Route 9 merged) - clean Release
   build, CLI only (tests OFF for speed; prior runs left 220 gtests green).
2. Ran a FAIR, same-corpus comparison on the pinned quad (real 768x512). Per-sample bpp:
   - **baseline (X6b = `frame_wavelet_encode`, full path w/ X6c hyperprior):** 3.473 / 3.627 /
     3.961 / 3.304  -> mean **3.591**/sample (10.774 summed).
   - **R6-C (--kb 256, transmitted per-cluster histogram):** 3.545 / 3.688 / 4.052 / 3.390 ->
     mean **3.669**/sample (+2.2% vs baseline). Byte-exact round-trip OK.
   - **R6-D (property tree, W=0 = pure EMA parity):** 3.622 / 3.779 / 4.128 / 3.462 -> mean
     **3.748**/sample (+4.4% vs baseline). R6-D omits the X6c per-subband hyperprior that the
     baseline applies, which is worth ~6% on this quad (3.748 -> ~3.59 at parity).
   - **R6-D (W=0.7, transmitted per-leaf histogram on):** 4.962 / 5.162 / 5.665 / 4.880 -> mean
     **5.167**/sample (+44%). Transmitted histograms HURT.
3. All runs byte-exact decode (ROUNDTRIP=OK). Dated CSV:
   `prism/benchmarks/results/2026-08-30-fair-r6-quad.csv`.

## Corrected findings (honest ledger)

- **The "R6-C = 5.08 FAIL" was a measurement artifact**, not a real 56% regression. On the
  same real corpus R6-C regresses only ~+2.2%. The prior run compared downscaled R6-C against
  full-image baseline.
- **R6-D (the genuine JXL-Modular property tree + transmitted per-leaf histograms) at best
  reaches PARITY with the baseline** (W=0, once the omitted hyperprior is accounted for), and
  any W>0 is strictly worse. This matches the R6-D progress diagnosis: the adaptive EMA
  (LearnedModel) is already a finer, stronger context model than the coarser transmitted static
  tree; blending in a coarser static model can only hurt.
- **The context-model family (R6-A/B/C/D, X3a/X3b, R9) is genuinely exhausted** with correct,
  same-corpus measurements. The transmitted-histogram / MA-tree / property-tree lever cannot
  beat the EMA on this residual.
- **The ~2.4% gap to M2 (3.591 quad / 3.244 full -> 3.166) lives in the COEFFICIENT
  PREDICTOR / TRANSFORM, not the context model** (per the X2 entropy diagnostic: bitplane
  quantization is entropy-near-optimal, so the residual to the gate is in the probability model
  AND the residual magnitude; R6-D's own honest diagnosis pins it to the predictor). The wavelet
  + bitplane-EMA pipeline already exploits neighbor correlation via the EMA; a separate linear
  in-subband predictor (R7) regressed +14.5% because it is redundant with / worse than the EMA.

## Standing rule / honest status

- M2: summed < 9.498 AND per-sample < 3.166 (WebP m6). Quad baseline 10.774 / 3.591 -> FAIL.
- M3: summed < 8.655 AND per-sample < 2.885 (JXL -d0 -e9). FAIL.
- Both units required on `prism bench --kodak` real PPMs; `Refs #130` (never `Closes #130`).

## Recommendation to Owner / Maintainer (decision required)

The owner-authorized "true JXL-Modular multi-pass architecture (adaptive context clustering and
transmitted trees)" was built as R6-D and MEASURED to fail: transmitted static trees cannot beat
the already-strong adaptive EMA in THIS codec. The real remaining lever is a **STRONGER
COEFFICIENT PREDICTOR** (JXL-Modular wins via its adaptive spatial predictor + transmitted
per-context histograms; here the predictor is the wavelet itself and the EMA already does the
context work). To close the 2.4% gap to M2 / 14% to M3, the lab needs a **from-scratch
predictor redesign** - either (a) a JXL-style adaptive spatial predictor (per-pixel, learned
weights per property-tree context) replacing the wavelet+EMA path, or (b) a learned nonlinear
transform - each a multi-day research->architect->build effort scoped as its OWN dedicated issue
(as the Anti-Surrender doctrine and prior blueprints require). Continuing to bolt transmitted
histograms onto the existing EMA decoder will not pass the gates.

Per Anti-Surrender the lab does not close #130, but the correct next build is a NEW predictor
redesign issue, not another R6 variant. Escalating to Maintainer for owner-directed scoping.

- the Builder
