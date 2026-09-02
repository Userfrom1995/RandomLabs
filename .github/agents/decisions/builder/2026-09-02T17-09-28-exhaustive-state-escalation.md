# Decision: Exhaustive State Confirmation - All Mechanism Classes Exhausted

- **Date:** 2026-09-02 (Builder run, `/oc build` trigger)
- **Issue:** #130 (Prism true JXL parity)
- **Author:** the Builder
- **Decision:** `{"action":"maintainer"}`

## Context

Every legitimate mechanism class in the single-transform single-pipeline design
space has been exhaustively measured and rejected across 9+ programs / 44+ phases.
The honest floor is X6b at 3.2175 per-sample / 9.6525 summed on the full real
Kodak-24 corpus (byte-exact round-trip, fuzz clean).

- M2 needs 1.63% improvement (3.2175 -> 3.166)
- M3 needs 11.53% improvement (3.2175 -> 2.885)

The neural codec (Option 2, exotic beyond-predictive paradigm) was the last
attempt and achieved 18.71 bpp (5.9x above M2) due to fundamental architecture
mismatch (latent expansion 12x, fixed Gaussian entropy, no lossless training
objective).

## Owner-authorized cascade complete

1. Route 3 (Modular): FAIL
2. Route 1 (adaptive multi-pass): FAIL
3. Route 2 (hybrid-uint): FAIL
4. Option 2 (exotic beyond-predictive): FAIL (neural codec 18.71 bpp)

## Complete mechanism class audit

### Entropy/context refinement
- V1 (spatial keying): +5.81% best median (<+37.3 bar) - REJECTED
- S1 (GAP/W predictor families): -1.45%/-2.61% median - REJECTED
- S3 (causal properties): -8.09% median - REJECTED
- T1a (per-group-exact stacks): -32.76% (182-213KB tables) - REJECTED
- T2a (shrunk context tables): -13.09% - REJECTED
- T3 (joint predictor x tokenization) - REJECTED
- R6-A (deeper learned MLP context): 3.2459 (at ceiling) - REJECTED
- R6-B (coarse transmitted histogram): 3.4363 (+6%) - REJECTED
- R6-C (per-fine-context cluster): 5.08 (MLP zeros) / fair retest +2.2% - REJECTED
- R6-D (property tree): parity at W=0, worse with W>0 - REJECTED
- R9 (fixed tree-quantized EMA): +0.218% - REJECTED

### Predictors
- S1 GAP/W: -1.45%/-2.61% - REJECTED
- R7 (in-subband MED/gradient): +14.5% - REJECTED
- X6a (coefficient predictor): 3.25548 (worse than X6b) - REJECTED
- X6b (coefficient predictor + EMA blend): 3.2175 FLOOR
- R8 (learned piecewise lifting): +4.7% - REJECTED
- P1 (JXL adaptive spatial bank): +15.4% - REJECTED
- P2 (MLP spatial): +0.8% (neutral) - REJECTED
- P3 (cross-band): already in X6b - NOT NEW
- P4 (attention-gated predictor): +67% WORSE - REJECTED

### Tokenization/binarization
- E1 (bias cancellation): +19.85/+16.33 points - REJECTED
- R2 (hybrid-uint): +1.80% - REJECTED
- ZFF pathology: confirmed structural ceiling - REJECTED

### Source transform/multi-pass
- U1 (BlockDCT 8x8 frequency-domain MED): +20.32% - REJECTED
- R3 (MA-tree clustering): +2.27% median - REJECTED
- R1 (adaptive multi-pass): +2.27% median - REJECTED
- Route 5 (autoregressive rANS): +9.7% - REJECTED
- R10 (MLP lifting): 3.22352 (neutral) - REJECTED
- Option C (learned pyramid): 4.95 (1.5x worse) - REJECTED
- Neural codec: 18.71 (architecture mismatch) - REJECTED

### Wavelet filter
- LeGall 5/3 (filter=1): baseline, FLOOR
- Reversible 9/7 (filter=2): +11.2% - REJECTED
- Effort sweep: zero effect (entropy-near-optimal) - CONFIRMED

### Hyperprior
- X6c (Laplacian calibration): 3.21526 (-0.08%) - REJECTED
- X6c (factor code): 3.21784 (no gain) - REJECTED

## Escalation

The Owner must decide:
(a) Accept 3.2175/9.6525 as the honest best and close #130
(b) Authorize a fundamentally new architecture with proper training infrastructure
    (GPU, large corpus, learned entropy model)
(c) Relax the binding gates

Per Anti-Surrender + No-Pause, #130 stays OPEN (no success claim). The lab
is idle at 0 new PRs opened by this run, main stable at 8461c94, pages green.

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`
  (never `Closes #130` while gates remain open).

- the Builder
