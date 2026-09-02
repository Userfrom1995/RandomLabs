# Progress: Cross-Subband MA-Tree Features (issue #130)

- **Branch:** `opencode/issue130-cross-subband-features`
- **Status:** in-progress
- **Date:** 2026-09-02 (Builder run, `/oc build this` trigger)
- **Precedent:** JXL-modular oracle at 3.161 per-sample (barely passes M2 at 3.166)
  uses `abs(actual_coeff)` vs real encoder at 3.291 uses `abs(predicted)`. The oracle/real
  gap is ~4%. Cross-subband features (parent/grandparent wavelet coefficient magnitude)
  are genuinely new and unexplored in the MA-tree.

## Objective

Add parent and grandparent wavelet coefficient magnitude as features to the MA-tree
used by the JXL-modular two-pass encoder. These features are available at both encode
and decode time because coarser wavelet levels are decoded before finer levels (coarse-to-fine
coding order).

## Milestone Checklist

### C0: Feature struct + PropId extension
- [x] Add `parent_mag` (u8) and `grandparent_mag` (u8) to `Feature` struct in `types.h`
- [x] Add `PropId::ParentMag = 14` and `PropId::GrandparentMag = 15` to `matree.h`

### C1: MA-tree evaluator + builder updates
- [x] Handle new PropIds in `MATree::eval()` (matree.cpp)
- [x] Handle new PropIds in `matree_builder.cpp` tree splitting
- [x] Handle new PropIds in `matree_builder.cpp` feature value extraction

### C2: JXL-modular feature computation
- [x] Pass parent/grandparent subband coefficients to feature builders
- [x] Update `build_sample_feature_8f` and `build_sample_feature_7f` in `jxl_modular.cpp`

### C3: Build + test + measure
- [x] Build and verify all tests pass
- [x] Run JXL-modular on Kodak-24 and compare with baseline (3.291 oracle, 3.291 real)
- [x] Record dual-unit results

## Binding gates (restated, units mandatory)
- M2: summed < 9.498 AND per-sample < 3.166 (vs WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `Refs #130` (never `Closes #130` while gates remain open)

## Key insight
The parent coefficient at a coarser wavelet level encodes structural information about
the local image content that is NOT captured by same-subband spatial neighbors. For
example, a large parent magnitude at level L-1 indicates the region has strong edges or
texture at scale L, which predicts the distribution of child coefficients at level L.
Grandparent magnitude provides a two-scale context. Both are deterministic functions of
already-coded state, so they are perfectly symmetric at encode/decode and add zero
transmitted bytes.

## Measurement result (2026-09-02, Kodak-24, real encoder)
- JXL-modular real encoder WITH cross-subband features: **3.290 bpp/sample, 9.870 summed**
- JXL-modular real encoder WITHOUT cross-subband features (baseline): **3.291 bpp/sample, 9.872 summed**
- Delta: **-0.001 bpp** (noise, effectively unchanged)
- M2 gate: per-sample < 3.166: **FAIL** (3.290), summed < 9.498: **FAIL** (9.870)
- M3 gate: per-sample < 2.885: **FAIL** (3.290), summed < 8.655: **FAIL** (9.870)

**Conclusion:** Cross-subband features (parent/grandparent magnitude) in the MA-tree
do NOT improve the JXL-modular real encoder. The MA-tree's spatial neighbor features
(QG, neighbor_mag, etc.) already capture similar local context information. The parent
magnitude adds marginal value that does not change the tree structure meaningfully.

**Honest result:** negative. The cross-subband features are correctly implemented and
symmetric at encode/decode, but do not close the gap to M2 (3.166) or M3 (2.885).

- the Builder

- the Builder
