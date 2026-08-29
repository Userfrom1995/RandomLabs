# Builder decision: Route 7 exhausted, escalate for Route 8 (issue #130)

- **Run branch:** `opencode/issue130-20260829221108`
- **Date:** 2026-08-29T22:30Z
- **Action:** `maintainer` (escalate for Route 8 authorization + research/architect dispatch)

## What this run found

The harness handed this Builder a stale branch base (`3b2074d`, R6-D only). On
fetching `origin/main` the current tip is `5c18b23` - PR #187 already implemented and
measured **Route 7 (R7-A in-subband MED/GRADIENT value predictor)** and confirmed
**R7-1 FAIL**: MED is ~+15% NET worse than the X6b EMA floor (3.2175/sample), GRADIENT
~+29% worse, on the pinned held-out quad (kodim02/07/17/21). The implementation is
byte-exact, all unit tests pass, and the negative result is honest and reproducible.

I did NOT re-push the duplicate R7 code; instead I aligned this branch to `origin/main`
(`5c18b23`) so the lab state is coherent, and I escalate.

## Mechanism-class ledger status (all single-pipeline mechanisms now measured + rejected)

- Entropy-side refinement: V1 (+5.81% median).
- Predictors: S1 GAP/W (-1.45%/-2.61%), X6a MLP residual (helps only when variance
  explained > ~85%, still above EMA), R7-A in-subband MED/GRADIENT (+15%/+29%).
- Context structures: S3 causal (-8.09%), T1a per-group (-32.76%), T2a shrunk (-13.09%),
  R6-A MLP cluster (3.2459), R6-B transmitted hist (3.4363), R6-C cluster (5.08
  untrained), R6-D property tree (3.4105) - all at or above the EMA floor.
- Tokenization: T3 joint factorial, U1 freq-domain MED (+20.32%).
- Source transform: U1 BlockDCT failed.
- In-subband value decorrelation: R7-A (this run) +15%/+29%.

Root cause (consistent across every attempt): Prism's adaptive bitplane coder conditions
its P(0) model on RAW neighbour magnitudes, which already captures the spatial/value
structure that any predictor, context tree, or histogram would remove. Adding a refinement
starves the EMA of its most discriminative feature, so rate rises. The EMA is a near-ceiling
context model for THIS wavelet-residual source; no single-pipeline mechanism can beat it,
hence M2 (3.166) and M3 (2.885) remain out of reach within the current architecture.

## Recommendation to the Maintainer / Owner

The only untested mechanism class is **Route 8 (neural/learned transform)** - replace the
fixed integer wavelet lift with a learned, reversible transform that decorrelates the
source more aggressively than LeGall53 (the lever JPEG-XL / learned-codec literature uses to
beat classical wavelets). The owner already authorized the "Exotic Beyond-Predictive
Paradigm / Option 2" (learned neural context models or integer wavelet lifting, 2026-08-28).
Per the Route 7 blueprint cascade ("R7-1 FAIL -> escalate to Owner for Route 8 on
authorization only"), this is the authorized next dispatch.

Requested action: dispatch Dr. Mob (`/oc research`) on #130 for a Route 8 spec, then the
Architect, then Builder - a full neural/learned-transform cycle. Do NOT tune R7-B or any
further predictor/context refinement: the law says it cannot close the gap.

Issue #130 stays OPEN (gates not met). No `Closes #130`.

- the Builder
