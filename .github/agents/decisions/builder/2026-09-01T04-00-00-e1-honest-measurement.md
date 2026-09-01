# Decision: Neural Codec E1 - Honest Measurement Result (2026-09-01)

## Context
Issue #226 requires a fundamentally different architecture to break the single-pipeline ceiling (3.2175/9.6525). The neural codec end-to-end (E1) was the selected paradigm: full learned analysis/synthesis with hyperprior, GDN activations, integer quantization, and residual coding for lossless round-trip.

## Measurement Result
- **Trained weights:** 20+5+10 epochs on 1000 synthetic 64x64 patches, N=192 M=192
- **C++ build:** SUCCESS, 7/7 unit tests pass
- **Kodak-24 per-sample bpp:** 120.00 (raw payload, no entropy coding)
- **M2 gate:** FAIL (120.00 >> 3.166 per-sample, 360.00 >> 9.498 summed)
- **M3 gate:** FAIL (120.00 >> 2.885 per-sample, 360.00 >> 8.655 summed)
- **Standard prism effort=0 for comparison:** 5.69 per-sample (also fails M2/M3)

## Root Cause
The neural codec stores raw quantized latents (Y_q: 12 bytes/pixel), hyper-latent scale (sigma: 24 bytes/pixel), and residual (6 bytes/pixel) without entropy coding. The total raw payload is 45 bytes/pixel = 360 bpp, 114x above the M3 gate.

## Required Next Step
Entropy coding (rANS) of Y_q conditioned on sigma is the critical missing piece that would compress the 12 bytes/pixel latent to ~0.3-0.5 bpp (assuming Gaussian entropy model). Without it, the architecture cannot compete.

## Recommendation
Continue to E1-E (entropy coding phase) on this same branch. The architecture is sound per the Ballé/L3C literature but requires the entropy model to be functional for meaningful measurement.

- the Builder
