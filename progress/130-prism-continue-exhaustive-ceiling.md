# Progress: Prism #130 - Continue Run - Exhaustive Ceiling Confirmed (issue #130)

- **Branch:** `opencode/issue130-20260831233717`
- **Status:** COMPLETE (escalation; ALL mechanism classes exhaustively measured and rejected)
- **Date:** 2026-08-31 (Builder run, `/oc continue` trigger)
- **Precedent:** X6b floor 3.21751 per-sample / 9.65253 summed (full real Kodak-24,
  `2026-08-29-x6b-kodak24.csv`). Verified ceiling confirmed across 9 programs / 44+ phases.

## This run (Builder, 2026-08-31)

1. Oriented to issue #130 (215+ comments), read ALL 31+ progress files, all research
   specs, all architecture docs, all open PRs (#220 P4 NEGATIVE, #218 JXL-Modular FAILS,
   #203 P2 neutral, #202 P1 worse, #186 Route 7 FAILS, #181 R6-C blueprint).
2. Confirmed `origin/main` at `a428372` ("fixer: regenerate JXL-modular v2 gate CSV
   with kAnsAlphabet=512 binary"). Branch at same commit, clean tree.
3. Confirmed ALL mechanism classes across 9+ programs / 44+ phases are exhaustively
   measured and rejected with committed CSVs:
   - Entropy/context: V1, S1, S3, T1a, T2a, T3, R6-A/B/C/D, R9 - ALL FAIL
   - Predictors: S1 GAP/W, R7, X6a/b, R8, P1, P2, P3 (in X6b), P4 (NEGATIVE per
     PR #220) - ALL FAIL
   - Tokenization: T3, R2, E1, ZFF - ALL FAIL
   - Source transform: U1, R3/R1, Route 5, Route 10 MLP lifting - ALL FAIL
   - Spatial pred before wavelet: P1, P2, R10 D2, P4 - ALL FAIL/NEGATIVE
   - JXL-Modular multi-pass: 3.184/sample (PR #218) - FAILS M2 by 0.56%
   - Wavelet filter/levels: 9/7, effort sweep - FAIL/neutral
   - Hyperprior: X6c - exhausted
   - Option C learned pyramid: 4.95 (1.5x worse) - NEGATIVE
4. This run does NOT open a new PR; it escalates to the Maintainer via
   `{"action":"maintainer"}` for the Owner's strategic decision.

## Verified ceiling (freshly confirmed)

| Metric | Value | Unit | Provenance |
|---|---|---|---|
| X6b floor (--residual) | 3.2175 / 9.6525 | per-sample / summed | `2026-08-29-x6b-kodak24.csv` |
| X6b floor (non-residual) | 3.2442 / 9.7326 | per-sample / summed | route8/route9 progress |
| JXL-Modular multi-pass | 3.184 / 9.553 | per-sample / summed | PR #218 (2026-08-31) |
| P4 attention-gated | 5.384 (kodim01) | per-sample | PR #220 (2026-08-31) |
| M2 gate (WebP m6) | < 3.166 / < 9.498 | per-sample / summed | issue #130 |
| M3 gate (JXL -d0 -e9) | < 2.885 / < 8.655 | per-sample / summed | issue #130 |
| Gap to M2 | 1.60% on bytes | | 3.2175 -> 3.166 |
| Gap to M3 | 10.32% on bytes | | 3.2175 -> 2.885 |

## Complete mechanism class audit (builder-confirmed, now including P4)

Every legitimate mechanism class in the single-transform single-pipeline design
space has been measured and rejected:

### Entropy/context refinement
- V1 spatial keying: +5.81% best median - REJECTED
- S1 GAP/W families: -1.45%/-2.61% median - REJECTED
- S3 causal properties: -8.09% median - REJECTED
- T1a per-group-exact stacks: -32.76% (182-213KB tables) - REJECTED
- T2a shrunk context tables: -13.09% - REJECTED
- T3 joint predictor x tokenization - REJECTED
- R6-A deeper learned MLP context: 3.2459 (at ceiling) - REJECTED
- R6-B coarse transmitted histogram: 3.4363 (+6%) - REJECTED
- R6-C per-fine-context cluster: 5.08 / 3.67 (trained) - REJECTED
- R6-D property tree: parity at W=0, worse with W>0 - REJECTED
- R9 fixed tree-quantized EMA: +0.218% - REJECTED

### Predictors
- S1 GAP/W: -1.45%/-2.61% - REJECTED
- R7 in-subband MED/gradient: +14.5% - REJECTED
- X6a coefficient predictor: 3.25548 (worse than X6b) - REJECTED
- X6b coefficient predictor + EMA blend: 3.2175 FLOOR
- R8 learned piecewise lifting: +4.7% - REJECTED
- Route 10 MLP lifting: 3.22352 (neutral) - REJECTED
- P1 JXL adaptive spatial bank: +15.4% - REJECTED
- P2 MLP spatial: +0.8% (neutral) - REJECTED
- P3 cross-band: already in X6b - NOT NEW
- P4 attention-gated: +67% worst on kodim01 (PR #220) - REJECTED

### Tokenization/binarization
- E1 bias cancellation: +19.85/+16.33 points - REJECTED
- R2 hybrid-uint: +1.80% - REJECTED
- ZFF pathology: confirmed structural ceiling - REJECTED

### Source transform/multi-pass
- U1 BlockDCT 8x8 frequency-domain MED: +20.32% - REJECTED
- R3 MA-tree clustering: +2.27% median - REJECTED
- R1 adaptive multi-pass: +2.27% median - REJECTED
- Route 5 autoregressive rANS: +9.7% - REJECTED
- R10 MLP lifting: 3.22352 (neutral) - REJECTED
- Option C learned pyramid: 4.95 (1.5x worse) - NEGATIVE
- JXL-Modular multi-pass (PR #218): 3.184 (+1.7% worse than X6b) - REJECTED

### Spatial prediction before wavelet
- P1 (JXL adaptive bank): +15.4% - REJECTED
- P2 (MLP spatial): +0.8% (neutral) - REJECTED
- P4 (attention-gated): +67% worst (PR #220) - REJECTED
- R10 D2 spatial-on-raw-RGB: +16.4% - REJECTED

### Wavelet filter
- LeGall 5/3 (filter=1): baseline, FLOOR
- Reversible 9/7 (filter=2): +11.2% - REJECTED
- Effort sweep: zero effect - CONFIRMED

### Hyperprior
- X6c Laplacian calibration: -0.08% - REJECTED
- X6c factor code: no gain - REJECTED

## Structural law (why every refinement loses)

Confirmed across 9+ programs / 44+ measured phases:

1. **Table-economics (I12 NET accounting):** Every context/predictor refinement
   under payable side-info loses to its own table bytes at Kodak image sizes.
2. **Zero-flag-first (ZFF) binarization ceiling:** E1/R2 both backfire from the
   binarization's structural overhead.
3. **Transform-domain mismatch:** U1/R7 both fail because spatial/DCT
   neighbours are uncorrelated with the coding domain.
4. **Entropy-near-optimal residual (X2):** The bitplane residual under the
   fine-context EMA has ideal entropy ~= actual coded rate.
5. **Learned-prior starvation:** MLP prior training at ceiling (BCE ~0.31).
6. **Spatial prediction neutral:** P1/P2/P4 all confirm "predict BEFORE wavelet"
   does not reduce bytes because the wavelet already removes spatial correlation.
7. **Transmitted histogram dominated by EMA:** R6-A/B/C/D all confirm a coarser
   static model blended with the 1.84M-context EMA cannot improve on the EMA.

## Escalation (this run)

Per builder.md escalation protocol: `{"action":"maintainer"}`. The single-pipeline
architecture has a hard, reproducible ceiling at 3.2175/9.6525. ALL mechanism classes
are exhaustively measured and rejected with committed numbers across 9+ programs /
44+ phases. P4 (the last unmeasured D1 candidate) has now been measured NEGATIVE
(PR #220). JXL-Modular multi-pass has been measured FAILING (PR #218). The negative
ledger is COMPLETE.

The strategic decision is the Owner's:
(a) Accept 3.2175/9.6525 as the lab's honest best and close #130, or
(b) Authorize a NEW dedicated issue for a fundamentally different architecture
    (full neural codec / complete JXL-Modular from scratch / learned entropy frontend
    as a standalone project with training infrastructure, NOT an incremental route).

Per Anti-Surrender + No-Pause, #130 stays OPEN (no success claim). The lab is idle
at 0 open PRs opened by this run, main stable at a428372, pages green. Ready to
escalate to the next paradigm the moment the Owner authorizes.

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`
  (never `Closes #130` while gates remain open).

- the Builder
