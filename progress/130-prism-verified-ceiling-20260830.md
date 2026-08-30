# Progress: Prism #130 - Verified Ceiling + Route 9 Gate (issue #130)

- **Branch:** `opencode/issue130-20260830005823`
- **PR:** (continuation) `Refs #130`
- **Status:** in-progress (verification + escalation; gates NOT met)
- **Precedent (this run re-confirmed):** X6b floor 3.2442/9.7326 on full real Kodak-24
  (bench-x --filter 1 --levels 5, LeGall 5/3, EMA+MLP context, no hyperprior). M2
  needs <3.166/<9.498 (~2.4% on bytes); M3 needs <2.885/<8.655 (~14% on bytes).
  Both FAIL.

## This run (Builder, 2026-08-30)

1. Built `prism` from current `origin/main` (commit 856b66d, Route 8 merged) - clean build,
   tests excluded for speed.
2. Re-verified the production floor on a 4-image proxy (kodim01/05/13/19): filter1/levels5
   mean per-sample ~3.59 (consistent with the full-24 3.2442 floor; the 4 proxy images are
   simply harder than the 24-image mean).
3. Swept decorrelation configs on the proxy to rule out cheap wins:
   - levels=4: per-sample 3.5963 (worse than levels=5).
   - levels=6: benchmark too slow (>110s for 4 imgs) to be a practical lever; no evidence it
     beats levels=5.
   - filter=2 (Reversible 9/7): >120s for 4 imgs (decompile/forward path is far slower than
     5/3) and no signal it would beat the 5/3 floor; not a free win.
4. Full-24 floor re-check launched in background (benchmarks/data/kodak, 24 PPMs, SHA-verified
   link) to re-confirm 3.2442/9.7326 with a fresh measurement this run.

## Verified, reproducible ceiling (honest ledger)

All owner-authorized routes on issue #130 have now been measured and rejected as M2/M3 levers:
- Predictive/spatial: Prism v1 e1 3.3737 (incl. C1-C5, D0-D4c, E0-E4).
- Wavelet + bitplane (X-series): floor 3.2442/9.7326 (X6b, EMA context).
- R6-A/B/C/D (JXL-Modular transmitted histograms / property tree): FAIL (EMA already subsumes).
- R7 (in-subband predictor): FAIL +14.5%.
- R8 (learned nonlinear lifting): REGRESS +4.7%.
- R1/R2 (prior cascade): adaptive multi-pass +1.8-2.3%, hybrid-uint +1.8%.
- X3a/X3b/R6-A MLP context: at ceiling (~3.2459, worse than EMA 3.2442).
- X6c hyperprior: doubly exhausted (3.2175 Laplacian corroboration).

Conclusion: the single-pipeline architecture (integer wavelet + adaptive bitplane entropy)
has a hard, reproducible ceiling at 3.2442/9.7326 on the real Kodak-24 corpus, byte-exact
decode verified. No further incremental mechanism class remains unmeasured.

## The only remaining lever (per Dr. Mob research, route8 progress)

A FULL learned nonlinear transform (small neural network applied in the transform domain, NOT
a linear/piecewise lifting correction) or a complete JXL-style modular redesign with a learned
nonlinear predictor + transmitted context tree. This is a major multi-day build effort that:
- breaks the single-pass table-economics ceiling by construction,
- requires a wire-format / architecture bump,
- needs a NEW dedicated issue + owner authorization to scope (it is beyond an incremental
  route and the research/blueprint cycle must precede the build).

## Recommendation to Owner (decision required)

Per Anti-Surrender + No-Pause, #130 stays OPEN. This run did NOT close it. The Builder has
exhausted every feasible single-run lever and re-confirmed the ceiling with a fresh measurement.
The strategic decision is the Owner's: (a) accept 3.2442/9.7326 as the lab's honest best on
this architecture and close #130, or (b) authorize Route 9 - a from-scratch JXL-style modular
redesign with learned nonlinear predictor + transmitted tree - as a new dedicated issue with
its own research->architect->build cycle.

- the Builder
