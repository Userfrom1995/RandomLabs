# Progress: Prism Route 10 D2 - Spatial on Raw RGB (issue #130)

- **Branch:** `opencode/issue130-20260830153433`
- **Status:** in-progress
- **Date:** 2026-08-30 (Builder run, R10 D2 implementation)
- **Blueprint:** `ideas/2026-08-30-architect-route10-d2.md` (PR #212)
- **Research:** D2 recalibration (PR #211)

## Architecture

Pipeline reorder: spatial predictor on RAW RGB BEFORE colour transform.

```
FAILED (D1):  Raw RGB -> YCoCg-R -> Spatial pred -> Wavelet -> EMA
CORRECTED (D2): Raw RGB -> Spatial pred -> YCoCg-R -> Wavelet -> Transmitted histogram
```

## Phases

- [x] R10-1: Spatial predictor harness on raw RGB (P1) - DONE
- [x] R10-2: P1 on raw RGB measurement - DONE (no colour transform variant)
- [ ] R10-3: P2 MLP training (if P1 fails)
- [ ] R10-4: YCoCg-R on residuals for cross-channel decorrelation (BLOCKED - see below)
- [ ] R10-5: Full Kodak-24 M2 measurement
- [ ] R10-6: Full Kodak-24 M3 measurement
- [ ] R10-7: P3/P4 additional predictor (if M3 fails)
- [ ] R10-8: Stabilisation

## Binding gates
- M2: summed < 9.498 AND per-sample < 3.166
- M3: summed < 8.655 AND per-sample < 2.885
- `bench_gate.sh` dual-unit check is the only acceptance authority.
- `Refs #130` (never `Closes #130` while gates remain open).

## This run (Builder, 2026-08-30)

### R10-1: Spatial predictor on raw RGB (DONE)
- Added `SPATIAL_RAW_RGB_FLAG = 0x200` (bit 9, v2 container)
- Created `frame_wavelet_encode_route10()` - spatial P1 on raw RGB -> wavelet -> X6b coeff pred -> bitplane coder
- Modified `frame_wavelet_decode()` to handle `SPATIAL_RAW_RGB_FLAG` (raw_residuals buffer to avoid uint16_t truncation)
- Added `wavelet-r10` and `bench-r10` CLI subcommands
- Fixed FPE crash: decoded int32 wavelet output was being truncated to uint16_t before spatial reconstruction
- Fixed BD16 decode regression: inverse YCoCg-R must only run when it was applied on encode
- 239/242 tests pass (3 R7 pre-existing failures, not ours)
- **All roundtrips pass**

### R10-2: P1 on raw RGB measurement (DONE)
No-colour-transform variant (R10-1 pipeline: raw RGB -> P1 -> wavelet -> X6b):

| Image    | per-sample | summed |
|----------|-----------|--------|
| 64x64    | 1.416     | 4.248  |
| kodim01  | 5.657     | 16.970 |
| kodim02  | 4.570     | 13.710 |
| kodim03  | 4.011     | 12.034 |

**Result:** No colour transform on residuals -> far above M2 gate. Cross-channel decorrelation is essential.
Previous X6b baseline: 3.2175 per-sample / 9.6525 summed.

### BLOCKED: YCoCg-R on residuals
The D2 blueprint specifies: Raw RGB -> Spatial pred -> YCoCg-R on residuals -> Wavelet -> X6b

Without colour decorrelation, each RGB channel is encoded independently, wasting ~40% of the bit budget on inter-channel redundancy. Need to implement R10-4 (YCoCg-R on signed int32 residuals) before M2 is achievable.

### Next steps
- R10-4: Implement signed-aware YCoCg-R on spatial residuals
- R10-5: Full Kodak-24 M2 measurement after colour transform
- Compare against X6b baseline (3.2175 per-sample) and NG baseline (3.3737 per-sample)
