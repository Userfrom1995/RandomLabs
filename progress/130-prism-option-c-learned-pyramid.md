# Progress: Prism #130 - Option C Learned Pyramid Codec (issue #130)

- **Branch:** `opencode/issue130-option-c-learned-codec`
- **Status:** complete (NEGATIVE result; gates FAIL; Option C abandoned)
- **Date:** 2026-08-30 (Builder run, re-verification + fresh measurement)

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

### M5: Measurement [DONE - GATES FAIL, RE-VERIFIED]
- [x] Full Kodak-24 measurement with bench-x (re-verified by Builder 2026-08-30)
- [ ] M2 gate: summed <9.498 AND per-sample <3.166 -- **FAIL (14.86/4.95)**
- [ ] M3 gate: summed <8.655 AND per-sample <2.885 -- **FAIL (14.86/4.95)**

## Kodak-24 Results

| Pipeline | Summed bpp | Per-sample bpp | M2 gate | M3 gate |
|---|---|---|---|---|
| X6b (LeGall5/3 + EMA) | 9.653 | 3.218 | FAIL (+1.6% summed) | FAIL |
| Wavelet (LeGall5/3) | 9.733 | 3.244 | FAIL (summed +2.5%) | FAIL |
| **Option C (learned)** | **14.86** | **4.95** | **FAIL (1.5x)** | **FAIL (1.5x)** |

**Root cause (confirmed):** The 3-scale learned lifting transform with baked MLP
weights (2->16->1, int16 Q=1024) compounds quantization noise across scales.
Each scale's prediction error feeds into the next, amplifying entropy. The
MLP cannot learn a correction better than the standard LeGall (lv+rv)>>1
predictor from just 2 inputs, and the integer quantization adds noise.
Option C is structurally WORSE than the wavelet by ~52% on bytes.

**Note:** The weights in `option_c_data.inc` ARE trained on real Kodak-24
(14M+ tuples, all 3 scales), NOT on synthetic data. The failure is
architectural, not a training-data bug.

## Conclusion
Option C (learned pyramid) is a measured NEGATIVE result. The learned
lifting transform cannot match the wavelet's decorrelation. This closes
Option C as a mechanism class for issue #130.

## Next Steps
Option C is abandoned. The verified ceiling remains at X6b: 3.218/9.653.
All mechanism classes are now exhaustively measured and rejected. The
remaining path to M2/M3 requires a fundamentally new architecture that
has NOT been tested: GPA predictor under multi-pass static ANS (the R3
predictor-tokenization factorial was never reached because R1 failed
before it). This requires a new research -> architect -> build cycle.
