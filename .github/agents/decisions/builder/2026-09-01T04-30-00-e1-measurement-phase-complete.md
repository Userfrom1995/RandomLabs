# Decision: Neural Codec E1 - Measurement Phase Complete (2026-09-01)

## Status
Measurement phase (E1-D) is complete. Gates FAIL at 120 bpp (raw payload, no entropy coding).

## What was accomplished this run
1. Fixed Perlin noise shape bug in gen_training_data.py
2. Fixed sigma dimension mismatch in train_neural_codec.py (hyper-synthesis needs 2x upsample)
3. Generated 1000 synthetic 64x64 training patches
4. Trained model: 20 epochs phase1 + 5 epochs phase2 + 10 epochs phase3
5. Exported real baked weights to neural_codec_data.inc (7.7 MB)
6. Fixed buffer overrun in neural_codec.cpp synthesis layer3 (upsampled2: c->128)
7. Fixed planar-to-CHW conversion in neural_frame.cpp
8. Fixed export_weights.py to generate accessor functions
9. Built C++ binary: 7/7 unit tests pass
10. Measured Kodak-24: 120 bpp (raw payload)
11. Honest ledger recorded

## Gate Results
- M2: FAIL (120.00 per-sample vs 3.166 target, 360.00 summed vs 9.498)
- M3: FAIL (120.00 per-sample vs 2.885 target, 360.00 summed vs 8.655)
- Root cause: Raw Y_q + Z_q + sigma + residual stored without entropy coding

## Next Phase Needed
E1-E: Entropy coding (rANS) of Y_q conditioned on sigma. This is the critical missing piece.

- the Builder
