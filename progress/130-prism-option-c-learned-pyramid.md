# Progress: Prism #130 - Option C Learned Pyramid Codec (issue #130)

- **Branch:** `opencode/issue130-option-c-learned-codec`
- **Status:** in-progress (M1-M4 COMPLETE; gates FAIL)
- **Date:** 2026-08-30 (Builder run)

## Milestone Checklist

### M0: Scaffold + PR [DONE]
- [x] progress + ideas entry
- [x] branch push
- [x] PR opened `Refs #130` (PR #206)

### M1: Integer Reversible Analysis/Synthesis Transform [DONE]
- [x] Per-scale reversible lifting with learned predict step (3 scales)
- [x] Integer MLP predict: 2->16->1 (like Route 10, but with level context)
- [x] Byte-exact roundtrip verification (10/10 tests pass, incl. 768x512 Kodak-size)
- [x] Unit tests (symmetry, roundtrip, non-power-of-2, negative values, constants)

### M2: Frame Encode/Decode via Bitplane Coder [DONE]
- [x] OptionCSubband -> wavelet Subband conversion (level inversion handled)
- [x] BitplaneCoder::encode for all channels
- [x] Multi-channel metadata storage (orient/level/w/h for all planes)
- [x] Full frame roundtrip verified (4 tests: 16x16, 128x128, 32x32 RGB, 768x512)

### M3: Wire Format (via Wavelet Container) [DONE]
- [x] Reused existing wavelet container format (filter_id=10)
- [x] Per-subband metadata in container header
- [x] Byte-exact roundtrip on all test sizes

### M4: CLI Integration [DONE]
- [x] `prism enc --option-c` (encode single image)
- [x] `prism dec` (auto-detect Option C via filter_id=10)
- [x] `prism bench-x --option-c` (Kodak-24 measurement)

### M5: Measurement [DONE - GATES FAIL]
- [x] Full Kodak-24 measurement with bench-x
- [ ] M2 gate: summed <9.498 AND per-sample <3.166 -- **FAIL (17.23/5.74)**
- [ ] M3 gate: summed <8.655 AND per-sample <2.885 -- **FAIL (17.23/5.74)**

## Kodak-24 Results

| Pipeline | Summed bpp | Per-sample bpp | M2 gate | M3 gate |
|---|---|---|---|---|
| Wavelet (LeGall5/3) | 9.733 | 3.244 | FAIL (summed +2.5%) | FAIL |
| **Option C (learned)** | **17.23** | **5.74** | **FAIL (2x)** | **FAIL (2x)** |

**Root cause:** The 3-scale learned lifting transform with baked MLP weights
does NOT generalize to real Kodak images. Transform INCREASES coefficient entropy.

## Next Steps (requires Maintainer decision)
1. Retrain with real image statistics (MLP weights trained on synthetic random data)
2. Hybrid: use Option C only where it helps, fall back to wavelet
3. Abandon Option C if learned transform cannot match wavelet decorrelation
