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
4. Solution: add 4 new features providing coefficient magnitude proxy to the MA-tree,
   entropy-based tree splitting, compact histogram serialization, and full u16 res_diff.

## What was built

1. **4 new Feature fields** (in `prism/include/prism/types.h`):
   - `u8 neighbor_mag = 0` (PropId 8): quantized max(|L|,|T|,|TL|,|TR|) - 8 log-scale levels
   - `u8 prev_coeff_mag = 0` (PropId 9): quantized |previous coeff in same subband| - 8 log-scale levels
   - `u16 left_mag = 0` (PropId 10): abs(L) in full u16 range
   - `u8 prev_res_mag = 0` (PropId 11): quantized |previous residual in same subband| - 8 log-scale levels
2. **4 new PropIds** in `prism/include/prism/codec/matree.h`: NeighborMag(8), PrevCoeffMag(9), LeftMag(10), PrevResMag(11)
3. **4 quantization functions** in `prism/src/codec/matree_builder.cpp`:
   - `quant_neighbor_mag(L, T, TL, TR)` - 8-level log scale
   - `quant_prev_coeff_mag(val)` - 8-level log scale
   - (left_mag and prev_res_mag use raw u16 / 8-level quantized respectively)
4. **MA-tree builder**: Added all 4 new properties to `eval_prop`, `prop_value`, `push_quantile_cands` (lines 120-123, 139-142, 218-221)
5. **MATree::eval**: Added NeighborMag, PrevCoeffMag, LeftMag, PrevResMag cases
6. **Encoder features** (`build_sample_feature_7f`): computes all 4 new features
7. **Decoder features** (progressive recon): computes all 4 new features at decode time from recon state
8. **Entropy-based tree splitting**: replaced crude mean-based `leaf_bits` heuristic with actual entropy computation (-sum(p*log2(p))) in `matree_builder.cpp:63-106`
9. **Compact histogram serialization**: delta-coded symbol indices instead of fixed 4 bytes per entry (`jxl_modular.cpp:538-623`)
10. **Full u16 range for res_diff**: no clamp to 255 (`jxl_modular.cpp:122`)

## Results

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Mean per-sample bpp | 5.84 | 3.295 | -44% |
| Mean summed bpp | 17.52 | 9.886 | -44% |

Byte-exact roundtrip verified on all tested Kodak images.

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

- [x] Add 4 new Feature fields and PropIds (8-11)
- [x] Implement quantization functions for new features
- [x] Update MA-tree builder and eval for all 4 new properties
- [x] Update encoder and decoder features (progressive recon)
- [x] Replace mean-based leaf_bits with entropy computation
- [x] Implement compact delta-coded histogram serialization
- [x] Full u16 range for res_diff
- [x] Build and verify tests pass
- [x] Open PR #231 with all changes
- [ ] Run bench-jxl-modular-real to verify gate status
- [ ] Per-plane K estimation, shared CDFs, or cluster assignment to close gap to theoretical 0.846 bpp

- the Fixer
