# Progress: Prism #130 - JXL-Modular Multi-pass Measurement (issue #130)

- **Branch:** `opencode/issue130-jxl-modular-redesign`
- **Status:** in-progress; JXL-Modular measured, FAILS M2/M3
- **Precedent:** X6b floor 3.2175 per-sample / 9.6525 summed (full real Kodak-24)

## This run (Builder, 2026-08-31)

1. Oriented to issue #130 (170+ comments), read all progress files, the
   exhaustive negative ledger, and the JXL-Modular research specs.
2. Implemented true JXL-Modular multi-pass encoder in `prism/src/codec/jxl_modular.cpp`:
   - Per-image MA-tree built from spatial features (qg, activity, level,
     orient, position_y, position_x) - NOT baked/fixed like R6-D.
   - Per-cluster transmitted histograms (34-symbol alphabet).
   - Theoretical ANS-coded size estimation (entropy + header overhead).
   - K parameter sweep (8, 16, 32, 48) per image.
3. Added `bench-jxl-modular` CLI command.
4. Measured on full Kodak-24 (real PPMs, sha-pinned).

## Results (both units, honest)

| Metric | JXL-Modular | X6b floor | M2 gate | M3 gate |
|--------|-------------|-----------|---------|---------|
| Mean per-sample bpp | **3.272** | 3.2175 | < 3.166 | < 2.885 |
| Mean summed bpp | **9.816** | 9.6525 | < 9.498 | < 8.655 |
| vs X6b floor | +1.7% WORSE | baseline | - | - |
| vs M2 gate | **FAIL** (+3.27%) | - | PASS needed | - |
| vs M3 gate | **FAIL** (+13.4%) | - | - | PASS needed |

**JXL-Modular with MA-tree clustering is 1.7% WORSE than the X6b EMA floor.**

## Diagnosis

The JXL-Modular approach with spatial MA-tree clustering does NOT beat the
1.84M fine-context EMA. The reason:

1. **Clustering granularity**: The MA-tree clusters (32-48 leaves) are far
   less discriminative than the 1.84M fine EMA contexts. Each cluster
   aggregates ~12K-18K symbols, while a fine context sees ~200 symbols.
   The EMA's per-context adaptation is more precise.

2. **Spatial features are weak discriminators**: qg, activity, level, orient,
   position capture coarse image structure but NOT the fine-grained
   coefficient statistics that the EMA tracks (neighbour magnitude,
   significance state, parent-child relationship).

3. **Predictor bottleneck**: JXL-Modular achieves 2.885 bpp because its
   predictor creates much simpler residuals. Our predictor creates 3.2175 bpp
   residuals. Transmitted histograms cannot compensate for higher-entropy
   residuals - the entropy is in the residuals, not the coding model.

## Structural confirmation

This measurement CONFIRMS the exhaustive negative ledger finding:
"coarse clustering is less discriminative than the fine adaptive EMA even
when the fine context is starved."

The JXL-Modular architecture only works when:
1. The predictor creates much simpler residuals (< 2.885 bpp), AND
2. Transmitted histograms dominate the coding model.

Without improving the predictor (which every mechanism class has failed to
do), JXL-Modular cannot reach M2/M3.

## Gate status (unchanged)

- M2 (WebP): need < 3.166 per-sample -> **FAIL** (3.272, +3.27%)
- M3 (JXL): need < 2.885 per-sample -> **FAIL** (3.272, +13.4%)

## Recommendation

Per Anti-Surrender + No-Pause, #130 stays OPEN (no success claim). The
JXL-Modular multi-pass architecture has been measured and confirmed to NOT
beat the EMA floor. The predictor bottleneck is the fundamental barrier.

The strategic decision remains the Owner's: the only path to M3 requires
a fundamentally better predictor that creates < 2.885 bpp residuals. Every
predictor mechanism class has been measured and rejected. The honest floor
is 3.2175/9.6525 with no incremental path to M3.

- the Builder
