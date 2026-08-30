# Progress: Prism Route 10 D2 - Spatial on Raw RGB (issue #130)

- **Branch:** `opencode/issue130-r10-p2-spatial-mlp`
- **Status:** in-progress
- **Date:** 2026-08-30 (Builder run, R10-3 P2 MLP implementation)
- **Blueprint:** `ideas/2026-08-30-architect-route10-d2.md` (PR #212)
- **Research:** D2 recalibration (PR #211)
- **Previous:** R10-1/R10-2 P1 on raw RGB (PR #214, merged `729d07d`)

## Architecture

Pipeline reorder: spatial predictor on RAW RGB BEFORE colour transform.

```
FAILED (D1):  Raw RGB -> YCoCg-R -> Spatial pred -> Wavelet -> EMA
CORRECTED (D2): Raw RGB -> Spatial pred -> YCoCg-R -> Wavelet -> Transmitted histogram
```

## Phases

- [x] R10-1: Spatial predictor harness on raw RGB (P1) - DONE
- [x] R10-2: P1 on raw RGB measurement - DONE (3.667 bpp avg on held-out quad)
- [x] R10-3: P2 MLP training and measurement - DONE (see below)
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

## R10-3: P2 MLP spatial predictor (DONE, FAIL)

### What was built
- P2 MLP: 17-feature causal neighbourhood -> 16 hidden -> 8 hidden -> 1 output
- Features: R/G/B at W/N/NW/NE/WW + x_norm + y_norm
- Trained on Kodak-24 (500K subset, 60 epochs per channel)
- Baked int16 fixed-point weights (Q=1024) for 3-channel integer inference
- Combined encode/decode functions to avoid 3x redundant feature extraction

### Performance
| Image  | P1 bpp/sample | P2 bpp/sample |
|--------|--------------|--------------|
| kodim02| 3.691        | 3.691        |
| kodim07| 3.455        | 3.500        |
| kodim17| 3.663        | 3.888        |
| kodim21| 3.858        | 4.220        |
| **AVG**| **3.667**    | **3.825**    |

**Result: P2 (3.825) is WORSE than P1 (3.667) by +0.158 bpp/sample.**

### Analysis
- MLP integer MSE ~128 per channel (prediction error ~11 pixels avg)
- P2 lacks the local online adaptivity of P1's median/gradient/slope banks
- Wavelet pipeline is the speed bottleneck (0.19ms/pixel), not MLP inference
- MLP adds <1% overhead to overall encode+decode

### Speed
- MLP inference: ~408 MACs/pixel/channel (17*16 + 16*8 + 8)
- Wavelet pipeline: ~0.19ms/pixel (dominates both P1 and P2 equally)
- 768x512 Kodak image: ~75s encode, ~150s total roundtrip

## R10-4: YCoCg-R on residuals (BLOCKED)
The D2 blueprint specifies: Raw RGB -> Spatial pred -> YCoCg-R on residuals -> Wavelet -> X6b

Currently implemented: YCoCg-R on signed int32 residuals IS active in the Route 10 encode/decode path (line 1287 in wavelet_container.cpp: `hdr.residual_mode = residual_mode` which includes both SPATIAL_RGB_FLAG and SPATIAL_P2_FLAG). The colour transform runs on the spatial residuals BEFORE wavelet transform.

## Next steps
- R10-3 FAIL: P2 MLP does not beat P1. Need alternative approach.
- Options: (a) larger MLP with better features, (b) different predictor architecture (conv, attention), (c) combine P1+P2, (d) move to R10-5+ without P2 improvement
