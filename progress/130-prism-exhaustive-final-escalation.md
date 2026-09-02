# Progress: Prism #130 - Final Exhaustive Escalation (issue #130)

- **Branch:** opencode/issue130-20260902221628
- **Status:** escalates to Maintainer - ALL mechanism classes exhaustively exhausted
- **Date:** 2026-09-02 (Builder run, `/oc build` trigger)
- **Precedent:** X6b floor 3.2175 per-sample / 9.6525 summed (full real Kodak-24).
  Neural codec CPU-trained: 18.71 bpp (needs GPU). Oracle: 3.161/9.483 (barely passes M2).

## This run (Builder, 2026-09-02)

1. Oriented to issue #130 (280+ comments), read ALL 35+ progress files,
   all research specs, all architecture docs, all 6 open PRs (#251, #232,
   #203, #202, #186, #181).
2. Confirmed `origin/main` at `492bd72` (neural codec needs GPU, single
   squashed commit). Branch at same commit, clean tree.
3. Confirmed ALL mechanism classes across 9+ programs / 44+ phases are
   exhaustively measured and rejected with committed CSVs:
   - Entropy/context: V1, S1, S3, T1a, T2a, T3, R6-A/B/C/D, R9 - ALL FAIL
   - Predictors: S1 GAP/W, R7, X6a/b, R8, P1, P2, P3, P4 - ALL FAIL
   - Tokenization/binarization: E1, R2, ZFF - ALL FAIL
   - Source transform/multi-pass: U1, R3/R1, Route 5, R10 MLP, Option C,
     JXL-Modular - ALL FAIL
   - Spatial pred before wavelet: P1, P2, P4, R10 D2 - ALL FAIL
   - Wavelet filter: LeGall 5/3, 9/7, effort sweep - ALL FAIL
   - Hyperprior: X6c - exhausted
   - Neural codec: E1 - 18.71 (architecture mismatch, latent expansion 12x)
4. Confirmed honest floor: 3.2175/9.6525 (X6b). M2 gap: 1.63%. M3 gap: 11.53%.
5. No new mechanism class identified that could close the gap within the
   current architecture or any feasible extension of it.

## Complete mechanism class audit (builder-confirmed)

Every legitimate mechanism class in the single-transform single-pipeline design
space has been measured and rejected:

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

### Wavelet filter
- LeGall 5/3 (filter=1): baseline, FLOOR
- Reversible 9/7 (filter=2): +11.2% - REJECTED
- Effort sweep: zero effect (entropy-near-optimal) - CONFIRMED

### Hyperprior
- X6c (Laplacian calibration): 3.21526 (-0.08%) - REJECTED
- X6c (factor code): 3.21784 (no gain) - REJECTED

## Verified ceiling (freshly confirmed)

| Metric | Value | Unit | Provenance |
|---|---|---|---|
| X6b floor (--residual) | 3.2175 / 9.6525 | per-sample / summed | `2026-08-29-x6b-kodak24.csv` |
| X6b floor (non-residual) | 3.2442 / 9.7326 | per-sample / summed | route8/route9 progress |
| M2 gate (WebP m6) | < 3.166 / < 9.498 | per-sample / summed | issue #130 |
| M3 gate (JXL -d0 -e9) | < 2.885 / < 8.655 | per-sample / summed | issue #130 |
| Gap to M2 | 1.63% on bytes | | 3.2175 -> 3.166 |
| Gap to M3 | 11.53% on bytes | | 3.2175 -> 2.885 |
| Oracle (abs(coeff)) | 3.161 / 9.483 | per-sample / summed | BARELY passes M2 |

## Honest assessment

The single-pipeline wavelet+bitplane+EMA architecture has a hard, reproducible
ceiling at 3.2175/9.6525. Every mechanism class has been measured and rejected
with committed numbers. The neural codec (Option 2, the Owner-authorized exotic
paradigm) achieved 18.71 bpp due to fundamental architecture mismatch (latent
expansion 12x, fixed Gaussian entropy, no lossless training objective on CPU).

The Owner-authorized cascade is complete:
- Route 3 (Modular): FAIL
- Route 1 (adaptive multi-pass): FAIL
- Route 2 (hybrid-uint): FAIL
- Option 2 (exotic beyond-predictive): FAIL (neural codec 18.71 bpp)

Structural law (why every refinement loses):
1. Table-economics (I12 NET accounting): every context/predictor refinement
   under payable side-info loses to its own table bytes at Kodak image sizes.
2. Zero-flag-first (ZFF) binarization ceiling: E1/R2 both backfire.
3. Transform-domain mismatch: U1/R7 both fail.
4. Entropy-near-optimal residual (X2): bitplane residual under fine-context
   EMA has ideal entropy ~= actual coded rate.
5. Learned-prior starvation: MLP prior training at ceiling (BCE ~0.31).

## Escalation

Per builder.md escalation protocol: `{"action":"maintainer"}`. The
Owner must decide:
(a) Accept 3.2175/9.6525 as the honest best and close #130, or
(b) Authorize a fundamentally new architecture with proper training
    infrastructure (GPU, large corpus, learned entropy model), or
(c) Relax the binding gates.

Per Anti-Surrender + No-Pause, #130 stays OPEN (no success claim). The lab
is idle at 0 new PRs opened by this run, main stable at 492bd72, pages green.

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`
  (never `Closes #130` while gates remain open).

- the Builder
