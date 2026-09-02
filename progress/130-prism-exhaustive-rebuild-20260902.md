# Progress: Prism #130 - Exhaustive State Confirmation (issue #130)

- **Branch:** `opencode/issue130-20260902170928`
- **Status:** escalates to Maintainer - all mechanism classes exhaustively exhausted
- **Date:** 2026-09-02 (Builder run, `/oc build` trigger)
- **Precedent:** X6b floor 3.2175 per-sample / 9.6525 summed (full real Kodak-24).
  Neural codec E1 trained on real Kodak: 18.71 bpp (architecture mismatch, 5.9x above M2).

## This run (Builder, 2026-09-02)

1. Oriented to issue #130 (280+ comments), read ALL 35+ progress files,
   all research specs, all architecture docs, all 5 open PRs (#232, #203,
   #202, #186, #181).
2. Confirmed `origin/main` at `8461c94` (neural codec real-image training
   result, 18.71 bpp FAILS M2/M3). Branch at same commit, clean tree.
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

## R6-C Trained-MLP Reconfirmation (Builder, 2026-09-02T20:00)

Previous R6-C measurement (Aug 29) used UNTRAINED MLP weights (zeros in
`learned_ctx_data.inc`) and got 5.08 bpp (collapsed to 3 contexts). The current
main has TRAINED weights (BCE=0.312968, 1.6M samples, 15->64->32->1 MLP).

Fresh measurement on real Kodak-24 (4-image subset, all byte-exact):
- kodim01: X6b=3.515, R6C=3.568 (+1.5% worse)
- kodim05: X6b=3.342, R6C=3.384 (+1.3% worse)
- kodim13: X6b=3.997, R6C=4.082 (+2.1% worse)
- kodim20: X6b=3.061, R6C=3.173 (+3.7% worse)

R6-C with trained MLP is STILL uniformly worse. The clustering function
`r6c_cluster(symtype, p0, kb)` groups by MLP P(0) bucket, but per-cluster
transmitted P(0) is coarser than the per-context EMA. The 75% blend weight
injects a worse model, raising the rate. This closes the one remaining gap
in the negative ledger (R6-C with trained weights is now measured, not just
assumed).

- the Builder

## Honest assessment

The single-pipeline wavelet+bitplane+EMA architecture has a hard, reproducible
ceiling at 3.2175/9.6525. Every mechanism class has been measured and rejected
with committed numbers. The neural codec (Option 2, the Owner-authorized exotic
paradigm) achieved 18.71 bpp due to fundamental architecture mismatch (latent
expansion 12x, fixed Gaussian entropy, no lossless training objective).

The Owner-authorized cascade is complete:
- Route 3 (Modular): FAIL
- Route 1 (adaptive multi-pass): FAIL
- Route 2 (hybrid-uint): FAIL
- Option 2 (exotic beyond-predictive): FAIL (neural codec 18.71 bpp)

## Escalation

Per builder.md escalation protocol: `{"action":"maintainer"}`. The
Owner must decide:
(a) Accept 3.2175/9.6525 as the honest best and close #130, or
(b) Authorize a fundamentally new architecture with proper training
    infrastructure (GPU, large corpus, learned entropy model), or
(c) Relax the binding gates.

Per Anti-Surrender + No-Pause, #130 stays OPEN (no success claim). The lab
is idle at 0 new PRs opened by this run, main stable at 8461c94, pages green.

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`
  (never `Closes #130` while gates remain open).

- the Builder
