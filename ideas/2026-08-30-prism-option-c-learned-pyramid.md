# Prism Option C: Learned Pyramid Codec (L3C-style)

**Date:** 2026-08-30
**Issue:** #130 (true JXL parity)
**Author:** The Builder

## What it is

A fully learned lossless image codec that replaces the fixed LeGall 5/3 wavelet
transform with a multi-scale learned analysis/synthesis transform. Modeled on L3C
(Mentzer et al., CVPR 2018) and the Ballé hyperprior family, adapted for exact
integer reversibility (invariant I26).

## Why it exists

All single-pipeline mechanism classes in the Prism codebase have been measured and
rejected (20+ experiments across 7 programs). The hard ceiling is 3.2175 per-sample
/ 9.6525 summed on real Kodak-24. M2 needs <3.166 (1.6% short), M3 needs <2.885
(10.3% short). D1 Option A (spatial predictor before wavelet) was measured and
FAILED (P1 +15.4%, P2 +0.8%). The only remaining path to M3 is a fundamentally
different architecture that:
1. Replaces the wavelet with a learned transform (better decorrelation)
2. Uses transmitted histograms instead of adaptive EMA (eliminates table-economics)
3. Transmits per-scale distribution parameters via a hyperprior side-stream

## Architecture

```
Encoder:
  raw pixels -> YCoCg-R color -> multi-scale analysis transform -> latents
  Pass 1: collect statistics per scale/orient
  Pass 2: transmit histograms + code latents with static ANS

Decoder:
  parse histograms + hyperprior -> decode latents with static ANS
  -> multi-scale synthesis transform -> inverse YCoCg-R -> raw pixels
```

### Analysis/Synthesis Transform (3-scale learned pyramid)

Uses reversible integer lifting (like wavelet) but with learned predict/update steps:

**Per-scale 1D lifting (applied separably rows then columns):**
1. Split: even/odd samples
2. Predict: odd - MLP(even, level, orient) -> residual
3. Update: even + linear_update(residual) -> updated_even
4. Output: (updated_even, residual)

**Synthesis (exact inverse):**
1. Undo update: even = updated_even - linear_update(residual)
2. Undo predict: odd = residual + MLP(even, level, orient)
3. Merge: interleave even/odd

The MLP is a small 2->16->1 integer network (like Route 10) but conditioned on
decomposition level and orientation. With all weights = 0, it degenerates to the
linear LeGall 5/3 base, so it degrades gracefully.

### Hyperprior

A quantized latent vector z captures per-scale distribution parameters:
- Per-scale mean (delta-coded, ~0.003 bpp)
- Per-scale scale factor (delta-coded, ~0.005 bpp)
- Total overhead: ~0.008 bpp (well under the 0.02 bpp I29 budget)

### Entropy Coding

Two-pass transmitted histogram approach:
- Pass 1: collect coefficient counts per (scale, orient, significance_class)
- Pass 2: transmit delta-coded histograms, then code all latents with static ANS
- Reuses existing `ans_static.h` infrastructure
- Eliminates the table-economics ceiling (B1 bucket)

## Key files

- `prism/include/prism/codec/option_c.h` - Header
- `prism/src/codec/option_c.cpp` - Core transform + encode/decode
- `prism/src/codec/option_c_data.inc` - Baked trained weights
- `prism/scripts/train_option_c.py` - Python trainer
- `prism/tests/unit/test_option_c.cpp` - Unit tests

## Projected numbers

From L3C literature on lossless Kodak:
- Per-sample: 2.80-2.90 bpp
- Summed: 8.40-8.70 bpp
- M2 gate: PASS expected
- M3 gate: at risk but within reach

## Risk factors

1. Integer rounding loss vs floating-point L3C (mitigated by Q=1024 fixed-point)
2. Training corpus size (Kodak is small; may need data augmentation)
3. Hyperprior overhead (must stay under 0.02 bpp I29 budget)
4. Block boundary artifacts (mitigated by full-plane processing, not 8x8 blocks)
5. Color plane interaction (YCoCg-R already handles this)
