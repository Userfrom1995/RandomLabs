# D2 verdict: logistic mixer + SSE rejected offline (gate FAIL by 3.3x)

- **Date:** 2026-08-24
- **Role:** the Builder
- **Phase:** re-scope D2 (collection efficiency, L2 lever)
- **Verdict:** REJECTED offline per the STOP rule. Zero format work spent:
  no FEATURE_EXT byte, no container change, no acoder wiring.

## What was built and measured

- Library core `prism/include/prism/codec/mixer.h` + `src/codec/mixer.cpp`:
  integer stretch/squash pair (33-knot piecewise logistic, exact-inverse
  construction), `MixerCore` (K bounded 16.16 weights, P-domain logistic-loss
  training, one interpolated APM stage, frozen sentinels for ablation).
  Format-unwired. 6 unit tests; suite 80/80 green.
- Harness extension `bench-ideal --mixer`: sequential scorer replaying the
  exact `encode_residual_v2` bin sequence over K=4 adaptive dual-rate
  estimators - E1 production hierarchical ctx+cls, E2 class-pooled, E3
  activity-keyed, E4 qg-sum-keyed (demoted C1 sum key). Anchor invariant:
  bits_v2 must reproduce measured v2 payload bytes within +-0.5 percent.

## Results (durable CSV: benchmarks/results/2026-08-24-ideal-mixer-d2.csv)

All four images sha256-pin verified pre-measurement; anchor holds on every
row (worst -0.042 percent):

| preset (best per family) | kodim01 | kodim13 | kodim05 | kodim20 | aggregate |
|---|---|---|---|---|---|
| mix4-sse-lr8 (mix only)   | -0.69 | -0.71 | -0.91 | -1.36 | **-0.90 pct** |
| mix4-cxsse-r11 (+cx SSE)  | +14.0 | +12.3 | +13.1 | +12.1 | +12.9 pct |
| mix4-frozen (ablation)    | -0.32 | -0.41 | -0.50 | -0.65 | -0.46 pct |
| mix4-adversarial          | +0.22 | +0.19 | +0.23 | +0.25 | +0.22 pct |

Gate: >= 3.0 percent projected payload on kodim01 AND kodim13, direction
confirmed on unseen kodim05/kodim20. Best candidate aggregates -0.90
percent: consistent sign, but **3.3x under the bar**. STOP rule fired.

## Negative findings worth keeping

1. **The ~7-point "collection headroom" is not reachable online.** The D0
   conditional-ideal brackets (-11.5 to -12.6 percent vs v0) are static ML
   entropies fitted over the whole stream, i.e. they use future information.
   Four causal estimators mixed with adapted weights collect only ~0.9
   percent of real payload. The headroom framing that motivated D2 was
   optimistic by roughly an order of magnitude.
2. **SSE/APM re-pooling destroys context resolution.** Both a coarse
   activity-keyed stage and a full 343-context-keyed stage measured HARMFUL
   at every adaptation rate tried (rates 5 through 12): committing slots to
   extreme probabilities costs more on nonstationary shifts than it gains on
   stationary stretches. Consistent with C2b ("contexts are noisy experts")
   and with the A2 instrumented-oracle saturation finding.
3. **Training contract matters more than rates.** Stretch-unit training
   targets diverged (+137.9 percent on kodim01 plane 0); probability-unit
   (lpaq-style) training is what made the mixer viable at all. Per-class
   weight sets beat one-shared-set-per-kind (+30 percent divergence -> -0.54).
   These calibrations are pinned in spec section 12 so any future mixer work
   starts from the stable point.

## Consequence: owner decision point

With D1 (predictor blending) and D2 (estimator mixing + SSE) both closed by
measurement, BOTH levers of the Architect re-scope are exhausted. Remaining
untried directions are the stretch stack (D4: extended banks, zero-run mode,
color rotations, squeeze re-test under mixing) whose individual projections
are <= 1-3 percent each against an M3 gap of -15.9 percent, or MANIAC-grade
meta-adaptation whose expectations our own C2/C2b/C5 negatives constrain
severely. Per re-scope section 1 this decision belongs to the owner:
continue into D4 stretch work knowing M3 likely stays open, or close #130
honestly at the achieved gate level (e1 = 10.2904 summed / 3.4301
per-sample, -6.7 percent bytes vs the e7 baseline, five research directions
closed with byte-exact evidence).

Handoff written as {"action":"maintainer"}: Mae surfaces the decision point.

- the Builder
