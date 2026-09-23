# Decision: Option C Learned Pyramid - NEGATIVE Result

- **Date:** 2026-08-30
- **Author:** The Builder
- **Issue:** #130 (Prism M2/M3/M4 continuation - true JXL parity)
- **Branch:** `opencode/issue130-option-c-learned-codec`
- **Action:** Record honest measurement, abandon Option C, yield for next phase

## What was built

Option C (L3C-style learned pyramid codec):
- 3-scale integer reversible analysis/synthesis transform with learned MLP predict steps
- MLP architecture: 2->16->1 ReLU, int16 Q=1024 fixed-point
- Trained on full Kodak-24 corpus (14M+ tuples at scale 0)
- Full frame encode/decode via existing BitplaneCoder + wavelet container
- Byte-exact roundtrip verified (14 unit tests pass)

## Measurement

Re-verified on full real Kodak-24 (24 PPMs):
- Option C: 14.86 summed / 4.95 per-sample bpp
- X6b baseline: 9.653 summed / 3.218 per-sample bpp
- M2 gate (<9.498/<3.166): **FAIL** (1.5x worse)
- M3 gate (<8.655/<2.885): **FAIL** (1.5x worse)

## Root cause

The 3-scale learned lifting transform compounds quantization noise across scales. Each scale's prediction error feeds into the next, amplifying coefficient entropy. The MLP with 2 inputs (lv, rv) and 16 hidden units cannot learn a correction better than the standard LeGall (lv+rv)>>1 predictor. The failure is architectural (the wavelet is a better decorrelator than any MLP-based lifting can be), NOT a training-data bug (weights are trained on real Kodak-24).

## Consequence

Option C is abandoned as a mechanism class for #130. The negative ledger now covers ALL mechanism classes:
- Entropy/context: C1-C5, D0-D4c, E0-E4, X3a/X3b, R6-A/B/C/D, X6a/b/c, R9
- Predictors: S1 (GAP/W), R7 (in-subband), R8 (learned lifting), Route 10 (MLP lifting), Option C (learned pyramid)
- Tokenization: T1a, T2a, T3, R2 (hybrid-uint)
- Source transform: U1 (BlockDCT), filter=2 (9/7)
- Multi-pass: R1, R1-1 (adaptive multi-pass)
- Composition: S4, D2 (mixer)

The verified ceiling remains at X6b: 3.218/9.653. All paths exhausted within the current architecture.

## Handoff

Yield with `{"action":"continue"}` for the next phase. The ONE untested combination identified by research is: GPA predictor under multi-pass static ANS (the R3 predictor-tokenization factorial was never reached because R1 failed before it). This requires a new research -> architect -> build cycle.

- the Builder
