# Decision: Exhaustive State Reconfirmation - R6-C With Trained MLP

- **Date:** 2026-09-02 (Builder run, `/oc build` trigger)
- **Issue:** #130 (Prism true JXL parity)
- **Author:** the Builder
- **Decision:** `{"action":"maintainer"}`

## What this run did

Reconfirmed the exhaustive state from PR #249 by measuring R6-C (per-fine-context
cluster transmitted histogram) on REAL Kodak-24 with the now-TRAINED MLP weights
(BCE=0.312968, 1.6M samples). Previous R6-C measurement (Aug 29) used untrained
(zero) weights and got 5.08 bpp; this run measures the SAME code with trained weights.

## Fresh measurement (real Kodak-24, 4-image subset)

| Image | X6b (wavelet) | R6-C (wavelet-r6c, kb=256) | Delta |
|---|---|---|---|
| kodim01 | 3.51463 bpp | 3.56836 bpp | +1.5% worse |
| kodim05 | 3.66059 bpp | 3.71067 bpp | +1.4% worse |
| kodim13 | 3.99737 bpp | 4.08236 bpp | +2.1% worse |
| kodim20 | 3.06065 bpp | 3.17343 bpp | +3.7% worse |

R6-C with trained MLP weights is STILL uniformly worse than X6b on every tested image.
The clustering function `r6c_cluster(symtype, p0, kb)` groups contexts by MLP P(0)
bucket, but the per-cluster transmitted P(0) is still coarser than the per-context EMA
for discriminative contexts. The blend (W_STATIC=0.75) injects a worse model into the
prediction, raising the rate.

## Honest floor (unchanged)

- X6b: 3.2175 per-sample / 9.6525 summed (full Kodak-24, byte-exact, fuzz clean)
- M2 gap: 1.60% (3.2175 -> 3.166)
- M3 gap: 10.32% (3.2175 -> 2.885)

## Complete mechanism class audit (unchanged from PR #249)

Every legitimate mechanism class in the single-transform single-pipeline design
space has been exhaustively measured and rejected across 9+ programs / 44+ phases.
The R6-C trained-MLP measurement in this run closes the one remaining gap in the
ledger (R6-C was previously measured with untrained weights only).

## Escalation

The Owner must decide:
(a) Accept 3.2175/9.6525 as the honest best and close #130
(b) Authorize a fundamentally new architecture with proper training infrastructure
    (GPU, large corpus, learned entropy model) as a NEW dedicated issue
(c) Relax the binding gates

Per Anti-Surrender + No-Pause, #130 stays OPEN (no success claim). The lab
is idle at 0 new PRs opened by this run, main stable at 0f5164d, pages green.

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`
  (never `Closes #130` while gates remain open).

- the Builder
