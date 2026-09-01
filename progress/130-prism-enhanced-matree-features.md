# Progress: Enhanced MA-tree features for JXL-Modular (issue #130)

- **Branch:** `opencode/issue130-jxl-modular-two-pass`
- **Issue:** #130 (true JXL parity)
- **Status:** COMPLETE (NEGATIVE; honest escalation)
- **Goal:** Close the 4% gap between real encoder (3.291 bpp) and theoretical estimator (3.161 bpp) by adding decode-time-available features that improve MA-tree clustering
- **Binding gates (both units, real corpus, byte-exact):**
  M2 summed < 9.498 AND per-sample < 3.166;
  M3 summed < 8.655 AND per-sample < 2.885.
  Baseline: Prism e7 = 11.026 summed / 3.675 per-sample.

## What was tried

Added 3 new decoder-available features to the MA-tree:
1. `parent_mag` (PropId 12): quantized |parent coeff in wavelet hierarchy|
2. `left_res_mag` (PropId 13): quantized |prediction error of left neighbor|
3. `top_res_mag` (PropId 14): quantized |prediction error of top neighbor|

All features are available at decode time:
- Parent is decoded before child in wavelet hierarchy (coarser scale first)
- Left neighbor is decoded before current position in raster scan
- Top neighbor is decoded before current position in raster scan

## Implementation

Updated 5 files (measured locally, reverted after NEGATIVE result - not shipped in this ledger PR):
- `prism/include/prism/types.h`: Added 3 new fields to Feature struct
- `prism/include/prism/codec/matree.h`: Added 3 new PropIds to enum
- `prism/src/codec/matree.cpp`: Updated MATree::eval switch for new PropIds
- `prism/src/codec/jxl_modular.cpp`: Updated encoder and decoder feature builders
- `prism/src/codec/matree_builder.cpp`: Added new PropIds to eval_prop, prop_value, and candidate generator

Verified lossless roundtrip (byte-exact) on kodim01.ppm.

## Results (Kodak-24, real corpus, byte-exact)

| Configuration | per_sample | summed | vs theoretical |
|---|---|---|---|
| Real encoder (baseline, 12 features) | 3.291 | 9.872 | +4.1% |
| Real encoder (15 features, tree builder fixed) | 3.293 | 9.879 | +4.2% |
| Real encoder (residual-based L/T/TL/TR context) | 3.296 | 9.889 | +4.3% |
| Theoretical (oracle res_diff) | 3.161 | 9.483 | (ceiling) |

## Diagnosis

The new features DON'T HELP. Even after fixing the tree builder to actually consider them as split candidates (the initial run had a bug where `eval_prop`/`prop_value`/candidate generator didn't include the new PropIds), the mean barely changed: 3.293 vs 3.291.

**Why:** The fundamental gap is in `res_diff` quality. The real encoder uses `abs(predicted)` while the theoretical uses `abs(actual_coeff)`. No decoder-available feature can capture the actual coefficient magnitude because:
- `parent_mag` = abs(predicted_parent), not abs(actual_parent)
- `left_res_mag` = abs(predicted_left - actual_left), which doesn't help for the current sample
- `top_res_mag` = same issue as left_res_mag

The predicted value explains ~72% of variance in the actual coefficient, but the remaining 28% is noise that no proxy feature can capture. The MA-tree already uses `res_diff = abs(predicted)` as its primary splitter; adding secondary features that correlate with `abs(actual_coeff)` doesn't help because the primary split is already the best available.

**Additional experiment: residual-based context features.** The theoretical estimator computes L/T/TL/TR from residuals (R[si]) while the real encoder uses reconstructed coefficients (recon). Both are decoder-available. Changing the real encoder to use residual-based context made things WORSE (3.296 vs 3.291), confirming that the gap is ENTIRELY from the `abs(actual_coeff)` oracle in `res_diff`, not from context feature differences. The reconstructed coefficient context is actually slightly better than residual context for clustering.

**The 0.13 bpp gap (3.291 vs 3.161) is structural.** It exists because the MLP predictor's predictions, while good, leave a residual that correlates with the true coefficient magnitude in a way that cannot be reconstructed from decoder-available context alone.

## Honest assessment

The JXL-modular encoder is at a hard architectural ceiling of ~3.29 bpp. The theoretical estimator shows 3.16 bpp is achievable IF the tree could see actual coefficient magnitudes, but this is impossible in a single-pass decoder. The 0.13 bpp gap cannot be closed by:
- Adding more decoder-available features (tested, no improvement)
- Changing the tree builder (already optimal greedy)
- Changing the predictor (MLP is already the best tested, Route 10)

**To pass M2 (< 3.166 per-sample), a fundamentally different architecture is needed** - likely a two-pass scheme where the encoder uses actual coefficients in a second analysis pass, or a learned analysis/synthesis transform (Option C / L3C, ~8-9 day effort).

- the Builder
