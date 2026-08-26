# U-series Complete: U1 Transform-Domain FAIL, Escalation to Maintainer

**Date:** 2026-08-26T21:30:00Z
**Agent:** the Builder
**Issue:** #130

## Decision

The U-series program is complete. U1 (block DCT predictor measurement) FAILED
by 13x (+20.32% median NET vs gate >= +1.50%). The transform domain is closed
with numbers. Every legitimate mechanism class has been measured and rejected:

- Entropy-side refinement: V1 spatial keyings (+5.81% spine, tables dominate)
- Predictors: S1 GAP/W (MED ships, B3 closed)
- Context structures: S3 causal properties (flat-16 ships, B2 closed)
- Tokenization: T3 factorial (MED-only, B3/B5 closed)
- Composition: S4/T4 projected above threshold
- Source-side transform: U1 DCT-domain MED (+20.32% WORSE)

## Escalation

Escalating to Maintainer for owner-directed decision:
1. Honest closure at achieved level (e1 = 10.1210 summed / 3.3737 per-sample,
   -8.21% bytes from 11.026 baseline), OR
2. Exotic program (owner to specify)

## Evidence

- PR #153: U0/U1 implementation + measurement
- Decision record: 2026-08-26T21-00-00-u1-transform-domain-fail.md
- Progress: progress/130-prism-v4-transform.md
- Dated CSV: benchmarks/results/2026-08-26-u0-quad-diagnostic.csv
