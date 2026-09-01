# Prism #130 - JXL-Modular Per-Plane K + Diagonal Features

- **Date:** 2026-09-01
- **Author:** the Builder
- **Issue:** #130 (Prism true JXL parity)

## What was built

Incremental improvements to the JXL-Modular real encoder (`jxl_modular_encode_real`):

1. **Per-plane K estimation**: Instead of using a single K (cluster count) for all
   color planes, each plane (Y, Co, Cg) gets its own optimal K via the existing
   `find_optimal_K` function. This allocates more clusters to higher-entropy planes
   (luma) and fewer to lower-entropy planes (chroma), reducing header overhead.

2. **NW/NE diagonal neighbor magnitude features**: Added two new reconstructible
   features (PropId 12: NWMag, PropId 13: NEMag) as full u16 values. These provide
   additional spatial context for the MA-tree beyond the existing L, T, TL, TR
   neighbors, helping the tree discriminate based on diagonal correlations.

## Results

| Metric | Before (PR #231) | After | Change |
|--------|------------------|-------|--------|
| Mean per_sample bpp | 3.295 | 3.293 | -0.06% |
| Mean summed bpp | 9.886 | 9.878 | -0.08% |

Both M2 and M3 gates still FAIL.

## Why the gap remains

The theoretical estimator (same architecture, but uses `abs(actual_coeff)` instead of
`abs(predicted)` for the MA-tree's res_diff feature) achieves 3.161 bpp per-sample,
barely passing M2 (target 3.166). The real encoder at 3.293 is 4% away, entirely due
to the res_diff feature quality.

The MA-tree with 14 features and the current MLP predictor (32-hidden-unit per-orientation)
has hit its structural ceiling. Closing the remaining gap requires either:
1. A better predictor (reduces base residual entropy below 3.16 bpp)
2. Multi-pass architecture where pass-1 analyzes actual residuals (not predicted)
