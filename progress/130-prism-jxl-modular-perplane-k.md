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
3. Implemented three incremental improvements to the JXL-modular real encoder:
   a. Per-plane K estimation: sweep K independently for Y/Co/Cg planes
   b. NW/NE diagonal neighbor magnitude features (PropId 12, 13) for better tree splitting
   c. Increased MA-tree quantile resolution from 8 to 16 for finer-grained thresholds
4. Built, tested (7/7 Matree tests pass, 24/24 byte-exact Kodak roundtrip), measured.

## Results (all three improvements stacked)

| Metric | Before (PR #231) | After (this run) | Change | M2 gate |
|--------|------------------|------------------|--------|---------|
| Mean per_sample bpp | 3.295 | 3.291 | -0.12% | FAIL (3.291 > 3.166) |
| Mean summed bpp | 9.886 | 9.872 | -0.14% | FAIL (9.872 > 9.498) |

Improvements are real but small (~0.1%). The per-plane K estimation found K=8 or 16
is optimal for most planes. The NW/NE features and 16-quantile thresholds provide
marginal additional discriminative power.

## Root cause of the remaining gap

The theoretical estimator achieves 3.161 bpp/sample (barely passes M2 at 3.166) using
`res_diff = abs(actual_coeff)` as the MA-tree's primary split feature. The real encoder
uses `res_diff = abs(c_hat)` (predicted value, available at decode time). This 4% gap is
ENTIRELY due to the feature quality difference:
- abs(actual_coeff) perfectly groups coefficients by magnitude
- abs(c_hat) is a noisy proxy (prediction error varies per sample)

Every mechanism class for improving the predictor or the features has been measured and
rejected across 7 programs (28 phases). The structural ceiling is at ~3.29 bpp with the
current MLP predictor (32-hidden-unit per-orientation, 16-feature input).

## Durable CSV
`prism/benchmarks/results/2026-09-01-jxl-modular-final-kodak24.csv` committed.

## Binding gates (units mandatory)
- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`

- the Builder
