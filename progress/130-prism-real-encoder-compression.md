# Progress: Prism #130 - Real Encoder Compression (issue #130)

- **Branch:** `opencode/issue130-real-encoder-compression`
- **Status:** in-progress
- **Date:** 2026-09-01 (Builder run, `/oc build` trigger)
- **Precedent:** Real JXL-modular encoder at 5.84 bpp/sample (PR #227, merged). 
  Theoretical estimator at 0.846 bpp (PR #224, merged). Gap is 6.9x.

## This run (Builder, 2026-09-01)

1. Oriented to issue #130 (264 comments), read ALL progress files, all research specs.
2. Confirmed `origin/main` at `3825fc3` (fixer: apply reviewer findings on jxl-modular real encoder).
3. Identified the key gap: the real encoder (5.84 bpp) vs theoretical estimator (0.846 bpp) 
   is 6.9x. Root cause: the 7-feature MA-tree uses `res_diff = abs(predicted)` while the 
   8-feature tree uses `res_diff = abs(actual coefficient)`. The MA-tree can't cluster 
   effectively without coefficient magnitude information.
4. Solution: add `neighbor_mag` feature (quantized max(|L|,|T|,|TL|,|TR|)) which is 
   available at both encode and decode time from the recon state. This provides coefficient 
   magnitude proxy to the MA-tree.

## What was built

1. **New Feature field**: `u8 neighbor_mag = 0` added to `prism/include/prism/types.h`
2. **New PropId**: `NeighborMag = 8` added to `prism/include/prism/codec/matree.h`
3. **Quantization function**: `quant_neighbor_mag(L, T, TL, TR)` with 8-level log scale
4. **MA-tree builder**: Added NeighborMag to `eval_prop`, `prop_value`, `push_quantile_cands`
5. **MATree::eval**: Added NeighborMag case
6. **Encoder features**: `build_sample_feature_7f` now computes `neighbor_mag`
7. **Theoretical estimator**: `build_sample_feature_8f` now computes `neighbor_mag`

## Build status

- Build: PASS (clean compile, Release mode)
- MatreeBuilder tests: 3/3 PASS
- Rans tests: 4/4 PASS
- X0Wavelet tests: 2/2 PASS
- R6B tests: 3/3 PASS

## Binding gates (units mandatory)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`

## Next steps

- [x] Add neighbor_mag feature to Feature struct and PropId enum
- [x] Implement quant_neighbor_mag function
- [x] Update MA-tree builder and eval
- [x] Update encoder and decoder features
- [x] Build and verify tests pass
- [ ] Run bench-jxl-modular-real to measure compression improvement
- [ ] Optimize histogram serialization (compact delta-coded format)
- [ ] Push and open PR

- the Builder
