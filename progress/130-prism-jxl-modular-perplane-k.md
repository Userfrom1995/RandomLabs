# Progress: Prism #130 - JXL-Modular Per-Plane K + NW/NE Features (issue #130)

- **Branch:** `opencode/issue130-20260901155159`
- **Status:** complete (NEGATIVE result for M2; improvements are real but gap remains)
- **Date:** 2026-09-01 (Builder run, `/oc build` trigger)
- **Precedent:** Real JXL-modular encoder at 3.295 bpp/sample, 9.886 summed (PR #231).
  Theoretical estimator at 3.161 bpp/sample (same container, cheat feature `abs(actual_coeff)`).
  M2 gate: per-sample < 3.166 AND summed < 9.498.
  M3 gate: per-sample < 2.885 AND summed < 8.655.

## This run (Builder, 2026-09-01)

1. Oriented to issue #130 (264+ comments), read ALL progress files, all research specs.
2. Confirmed `origin/main` at `415a43b` (builder: fix test_neural_codec API mismatch).
3. Implemented two incremental improvements to the JXL-modular real encoder:
   a. Per-plane K estimation: sweep K independently for Y/Co/Cg planes
   b. NW/NE diagonal neighbor magnitude features (PropId 12, 13) for better tree splitting
4. Built, tested (7/7 Matree tests pass, 24/24 byte-exact Kodak roundtrip), measured.

## Results

| Metric | Before (PR #231) | After (this run) | Change | M2 gate |
|--------|------------------|------------------|--------|---------|
| Mean per_sample bpp | 3.295 | 3.293 | -0.06% | FAIL (3.293 > 3.166) |
| Mean summed bpp | 9.886 | 9.878 | -0.08% | FAIL (9.878 > 9.498) |

The improvement is real but small (~0.07%). The per-plane K estimation found that K=8 or 16
is optimal for most planes (auto-sweep confirms). The NW/NE features provide marginal
additional discriminative power for the MA-tree.

## Root cause of the remaining gap

The theoretical estimator achieves 3.161 bpp/sample (barely passes M2 at 3.166) using
`res_diff = abs(actual_coeff)` as the MA-tree's primary split feature. The real encoder
uses `res_diff = abs(c_hat)` (predicted value, available at decode time). This4% gap is
ENTIRELY due to the feature quality difference:
- abs(actual_coeff) perfectly groups coefficients by magnitude
- abs(c_hat) is a noisy proxy (prediction error varies per sample)

Every mechanism class for improving the predictor or the features has been measured and
rejected across 7 programs (28 phases). The structural ceiling is at ~3.29 bpp with the
current MLP predictor (32-hidden-unit per-orientation, 16-feature input).

## What would close the gap to M2

1. A better predictor that reduces residual entropy below 3.16 bpp (needs ~4% improvement)
2. Multi-pass with transmitted histograms + ANS static probabilities (the unmeasured path
   that breaks single-pass ceiling) - but R3/R6-A/B/C/D all failed to beat the EMA
3. Full JXL-Modular redesign with MA-tree clustering over FULL coefficient magnitudes
   (requires a two-pass encoder where pass-1 analyzes actual residuals, pass-2 codes
   with tree assignments known to decoder) - THIS is the JXL-Modular architecture

Option 3 is what the theoretical estimator already proves works (3.161 bpp). The blocker
is implementing a REAL two-pass encoder where the tree is built from actual residuals
in pass-1, then the residuals are coded in pass-2 with the SAME tree assignments at
decode time (the decoder must reconstruct the tree from the same features).

The chicken-and-egg problem: the decoder doesn't have access to actual coefficients
(d they're being decoded), so it can't build the same tree. JXL solves this by
transmitting the tree as side information, which is exactly what we do.

**Key insight**: The theoretical estimator DOES transmit the tree and histograms.
The only "cheat" is that it builds the tree from `abs(actual_coeff)` instead of
`abs(predicted)`. If we can make the real encoder's features approximate
`abs(actual_coeff)` well enough, we can close the gap.

## Durable CSV
`prism/benchmarks/results/2026-09-01-jxl-modular-perplane-kodak24.csv` committed.

## Binding gates (units mandatory)
- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`

- the Builder
