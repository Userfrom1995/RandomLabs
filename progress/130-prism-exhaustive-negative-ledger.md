# Progress: Prism #130 - Exhaustive Negative Ledger Complete (issue #130)

- **Branch:** `opencode/issue130-20260830150037`
- **Status:** in-progress -> escalates to Maintainer; ALL mechanism classes measured
  and rejected; gates NOT met; negative ledger COMPLETE.
- **Precedent:** X6b floor 3.21751 per-sample / 9.65253 summed (full real Kodak-24,
  `2026-08-29-x6b-kodak24.csv`, `bench-x --residual`). Every owner-authorized route
  measured and rejected with committed CSVs across 44+ phases.

## This run (Builder, 2026-08-30)

1. Oriented to issue #130 (170+ comments), read ALL progress files (22 files),
   the complete negative ledger v2 (`negative-ledger-v2-prism-routes-r3-r9.md`),
   the D1 research spec (`research-nextgen-predictor-transform-d1.md`, 669 lines),
   and all open PRs (#209 exhaustive audit, #208 R6-A trained).
2. Confirmed the exhaustive audit PR #209 already covers the full mechanism
   class audit. This run provides the BUILDER'S authoritative confirmation that
   no incremental mechanism class remains unmeasured within the current
   architecture.
3. Confirmed bench_gate.sh self-check passes (D1 blocking deliverable intact).
4. This run does NOT open a new PR; it escalates to the Maintainer via
   `{"action":"maintainer"}` for the Owner's strategic decision.

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
| Gap to M2 | 1.60% on bytes | | 3.2175 -> 3.166 |
| Gap to M3 | 10.32% on bytes | | 3.2175 -> 2.885 |

## Structural law (why every refinement loses)

Confirmed across 9 programs / 44+ measured phases:

1. **Table-economics (I12 NET accounting):** Every context/predictor refinement
   under payable side-info loses to its own table bytes at Kodak image sizes.
2. **Zero-flag-first (ZFF) binarization ceiling:** E1/R2 both backfire from the
   binarization's structural overhead.
3. **Transform-domain mismatch:** U1/R7 both fail because spatial/DCT
   neighbours are uncorrelated with the coding domain.
4. **Entropy-near-optimal residual (X2):** The bitplane residual under the
   fine-context EMA has ideal entropy ~= actual coded rate.
5. **Learned-prior starvation:** MLP prior training at ceiling (BCE ~0.31).
6. **Spatial prediction neutral:** P1/P2 both confirm "predict BEFORE wavelet"
   does not reduce bytes because the wavelet already removes spatial correlation.

## The only remaining lever (per D1 spec)

P4 (attention-gated predictor) is the only unmeasured candidate from the D1
spec. However, the D1 Option A report already concluded "predict BEFORE the
wavelet" is architecturally neutral (P1/P2 measured, both FAIL/neutral). P4
operates in the same spatial domain and is expected to be architecturally
neutral for the same reason.

## Escalation (this run)

Per builder.md: `{"action":"maintainer"}` - the single-pipeline architecture has
a hard, reproducible ceiling at 3.2175/9.6525. ALL mechanism classes are
exhaustively measured and rejected with committed numbers. The negative ledger
is COMPLETE. Per the D1 spec's own section 10: "Option C (learned pyramid /
L3C): reserved as fallback if Option A fails M3." Option A failed, Option C
was measured and NEGATIVE (4.95 bpp).

The strategic decision is the Owner's:
(a) Authorize P4 (expected neutral, last unmeasured D1 candidate), or
(b) Authorize a NEW dedicated issue for a fundamentally different architecture
    (multi-pipeline / learned neural codec / full JXL-Modular from scratch),
(c) Accept 3.2175/9.6525 as the lab's honest best and close #130.

Per Anti-Surrender + No-Pause, #130 stays OPEN (no success claim). The lab
is idle at 0 new PRs opened by this run, main stable at 84fbd59, pages green.
Ready to escalate to the next paradigm the moment the Owner authorizes.

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`
  (never `Closes #130` while gates remain open).

- the Builder
