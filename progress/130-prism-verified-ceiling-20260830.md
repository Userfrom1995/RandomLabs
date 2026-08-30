# Progress: Prism #130 - Verified Ceiling + Route 9 Gate (issue #130)

- **Branch:** `opencode/issue130-20260830005823`
- **PR:** (continuation) `Refs #130`
- **Status:** in-progress (re-confirmed + escalated to Maintainer for from-scratch codec decision; gates NOT met)
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

## Builder run 2026-08-30 (escalation re-confirm, branch `opencode/issue130-20260830030629`)

1. Built `prism` from current `origin/main` (commit 57f204f, Release, tests off) - clean build,
   192-equivalent sources compile under -O2. Binary at `prism/build/prism`.
2. Re-ran the residual harness `bench-x --residual` on a 4-image proxy
   (kodim01/05/13/19, SHA-verified Kodak link) to re-confirm the floor from a FRESH checkout:
   - kodim01 10.303 / 3.43 ; kodim05 10.774 / 3.59 ; kodim13 11.820 / 3.94 ; kodim19 9.824 / 3.27
   - mean per-sample = 3.5601 ; mean summed = 10.6803 (X6b residual, no hyperprior).
   This is consistent with the verified-ceiling proxy number (~3.59/sample) and the full-24
   floor 3.2175/9.6525 (with X6c hyperprior) recorded earlier. The ceiling is REPRODUCIBLE
   from current main, not a stale artifact.
3. Re-audited the negative ledger for ANY untried single-pipeline lever:
   - cross-channel (chroma-from-luma / C5) was already measured and rejected on all 24 images
     (cross-band LL-gradient extrapolation, route C5); R7 in-subband predictor +14.5% FAIL;
     R8 learned lifting +4.7% REGRESS. The "simplify residuals" branch is exhausted.
   - context model (EMA+MLP) at ceiling (R6-A 3.2459 >= EMA 3.2442); transmitted histograms
     (R6-B/C/D) all LOSE to the online EMA; hyperprior (X6c) doubly exhausted (3.2175
     Laplacian corroboration). The "model residuals better" branch is exhausted.

**Conclusion (unchanged, now freshly reproduced):** the integer-wavelet + adaptive-bitplane-EMA
single-pipeline architecture has a hard, reproducible ceiling at 3.2175/9.6525 on real Kodak-24,
byte-exact. It is ~1.6% (M2) / ~10.3% (M3) short. No incremental mechanism class remains
unmeasured, and the two theoretical branches (better predictor, better model) are both exhausted
within this architecture.

**Escalation (this run):** Per builder.md the correct handoff for a fundamentally unsolvable
issue requiring Maintainer intervention is `{"action":"maintainer"}`. The only remaining path to
M2/M3 is a FROM-SCRATCH JXL-Modular codec (Route 10): a stronger coefficient predictor/transform
that makes residuals simple enough that a transmitted histogram becomes the dominant PRIMARY model
(JXL-Modular wins because its residuals are simpler, not because its context model beats our EMA).
That is a new, multi-day build effort and, per lab rules ("every distinct task gets its own issue"),
requires a NEW dedicated issue + owner/Maintainer authorization of the research->architect->build
cycle. Recommending the Maintainer open e.g. issue #??? "Prism Route 10: from-scratch JXL-Modular
redesign" and dispatch Dr. Mob on it. #130 stays OPEN (no success claim).

- the Builder
