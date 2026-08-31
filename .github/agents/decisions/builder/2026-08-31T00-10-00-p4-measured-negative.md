# Decision: P4 Attention-Gated Spatial Predictor - MEASURED NEGATIVE

- **Date:** 2026-08-31
- **Author:** the Builder
- **Issue:** #130
- **Branch:** opencode/issue130-p4-attention-predictor

## What was implemented

P4 attention-gated spatial predictor: a 5-feature attention network that blends
MED and gradient sub-predictors per-pixel based on local content (variance,
gradient magnitude, edge direction, texture energy).

- Baked attention weights (not trained, initial values)
- Causal feature extraction (W, N, NW, NE, WW only)
- Fixed-point softmax with temperature=2.0
- Byte-exact roundtrip verified

## Measurement (honest, untrained weights)

| Image | P4 bpp | X6b floor | Delta |
|-------|--------|-----------|-------|
| kodim01 | 5.384 | 3.2175 | +67% WORSE |
| kodim02 | 4.147 | ~3.2 | +30% WORSE |
| kodim03 | 3.714 | ~3.2 | +16% WORSE |

Encode time: ~5 minutes per 768x512 image (per-pixel attention + softmax).

## Root cause

The exhaustive audit (progress/130-prism-exhaustive-negative-ledger.md) correctly
predicted this: spatial prediction before the wavelet is architecturally neutral
because the wavelet already removes spatial correlation. P1 (adaptive bank with
LMS weight adaptation) was measured and found neutral. P4 with untrained baked
weights is architecturally equivalent to P1 with random initial weights, which
is worse by construction.

## Consequence

P4 is the last unmeasured candidate from the D1 spec. With this measurement,
EVERY mechanism class in the single-transform single-pipeline design space has
been measured and rejected:

- Entropy/context refinement: V1, S1, S3, T1a, T2a, T3, R6-A/B/C/D, R9
- Predictors: S1 GAP/W, R7, X6a/b, R8, P1, P2, **P4**
- Tokenization/binarization: E1, R2, ZFF pathology
- Source transform/multi-pass: U1, R3, R1, Route 5, R10, Option C
- Wavelet filter: LeGall 5/3, Reversible 9/7, effort sweep
- Hyperprior: X6c Laplacian, X6c factor code

## Honest closure

The single-pipeline architecture has a hard, reproducible ceiling at
3.2175/9.6525. The gap to M2 (1.60%) and M3 (10.32%) cannot be closed
within this design space. The remaining gap is architectural (single-pass
vs multi-pass coding with transmitted histograms), not incremental.

Per Anti-Surrender + No-Pause, #130 stays OPEN. Escalating to Maintainer
for Owner-directed decision.

- the Builder
