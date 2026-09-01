# Decision: E1-E Correctness Fixes (2026-09-01)

- **Issue:** #226
- **PR:** #230
- **Date:** 2026-09-01
- **Author:** The Builder

## Context

Reviewer `33473526628` routed as `/oc continue` (not `fix`): project incomplete, not a Fixer loop. 8 blocking findings identified.

## Fixes Applied

1. **Synthesis GDN->IGDN**: Added `NormType` enum to `run_conv_norm()`. Analysis and hyper-analysis use `NormType::GDN`, synthesis uses `NormType::IGDN`, hyper-synthesis uses `NormType::NONE`.
2. **Conv2d padding**: Changed from hardcoded `NeuralCodecParams::PAD` (always 1) to kernel-size-aware `(k-1)/2`. Correct for both 1x1 and 3x3 kernels.
3. **GDN/IGDN fixed-point**: Uses `int64_t` for x_q computation to avoid overflow. x scaled to Q domain before squaring, consistent with beta being in Q domain.
4. **Hyper-synthesis 2x upsample**: Added nearest-neighbor 2x upsample before conv layers, matching `train_neural_codec.py:165-167` (`F.interpolate(scale_factor=2)`).
5. **Container decode bounds checks**: Added `bytes.size() < 19` check, filter_id validation. Main.cpp: changed `bytes.size() > 16` to `bytes.size() > 18`.
6. **Architect blueprint restored**: `ideas/2026-09-01-neural-codec-e1.md` restored to full architect version. Builder doc kept as separate `-builder.md`.
7. **Docs**: Research spec already contains full documentation. No separate entry needed.

## What Remains

- **rANS entropy coding** of Y_q|sigma and Z_q (root cause of 120 bpp raw payload)
- Wire sigma/residual out of raw payload
- Training on larger corpus (GPU, thousands of epochs)
- Full Kodak-24 re-measurement after entropy coding

## Test Results

All 250 tests pass (7/7 neural codec). Build clean.

- the Builder
