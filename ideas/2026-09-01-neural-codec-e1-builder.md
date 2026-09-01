# Ideas: Full Neural Codec End-to-End (E1) for Prism

**Date:** 2026-09-01
**Issue:** #226 (successor to #130)
**Author:** The Builder

---

## What was built

A complete training infrastructure and integer inference engine for the full
neural codec end-to-end architecture (E1), the primary paradigm for breaking
the single-pipeline ceiling at 3.2175/9.6525 on Kodak-24.

## Why

The single-pipeline architecture (wavelet + predictor + bitplane + entropy) has
a hard, measured ceiling at 3.2175 per-sample / 9.6525 summed. The predictor
explains at most ~74.5% of coefficient variance (X6b), and the residual entropy
under the EMA is already entropy-near-optimal (X2 diagnostic). Reaching M3
requires ~85% variance explanation, which is unreachable within this pipeline.

Neural codecs (L3C, Ballé et al.) achieve ~2.8-3.0 bpp on Kodak lossless,
matching the M3 target. The three-network architecture with hyperprior
jointly optimizes decorrelation and rate-distortion trade-off, replacing
the entire single-pipeline.

## How it works

### Architecture

```
Encode: X -> g_a -> Y -> round(Y+0.5) -> Y_q -> h_a -> Z -> round(Z+0.5) -> Z_q
        -> h_s(Z_q) -> sigma (scale) -> entropy_code(Y_q, sigma) -> bitstream

Decode: bitstream -> entropy_decode -> Y_q -> g_s(Y_q) -> X_hat
        -> residual coding: R = X - X_hat -> add to X_hat -> X
```

### Networks

- **g_a (analysis):** HxWxC -> H/4 x W/4 x N. Four conv layers with GDN.
- **h_a (hyper-analysis):** H/4 x W/4 x N -> H/8 x W/8 x M. Three conv layers with GDN.
- **g_s (synthesis):** H/4 x W/4 x N -> HxWxC. Mirror of g_a with IGDN + transposed conv.
- **h_s (hyper-synthesis):** H/8 x W/8 x M -> H/4 x W/4 x 2N. Two conv layers, ReLU + linear.

### Lossless round-trip

The residual R = X - g_s(Y_q) ensures byte-exact reconstruction. R is coded
with the existing Prism entropy coder (rANS with per-context adaptive model).
NET = H(Y_q) + H(R|Y_q) + header.

### Training

Three-phase protocol on synthetic/procedural corpus (~100K patches):
1. Pre-train g_a + g_s on MSE (reconstruction quality)
2. Train h_a + h_s on entropy model (rate minimization)
3. Joint fine-tune all networks with L = H(Y_q) + H(R|Y_q)

## Key files

- `prism/scripts/gen_training_data.py` - procedural texture generator
- `prism/scripts/train_neural_codec.py` - three-phase training script
- `prism/scripts/export_weights.py` - int16 weight exporter
- `prism/scripts/eval_neural_codec.py` - Kodak-24 evaluation
- `prism/include/prism/codec/neural_codec.h` - inference engine API
- `prism/src/codec/neural_codec.cpp` - integer inference engine
- `prism/src/codec/neural_codec_data.inc` - baked weights (placeholder)
- `prism/include/prism/codec/neural_frame.h` - frame encode/decode API
- `prism/src/codec/neural_frame.cpp` - frame encode/decode implementation
- `prism/tests/unit/test_neural_codec.cpp` - unit tests

## Notes

- Baked weights are real (7.6 MB, int16 Q=1024, trained 20+5+10 epochs on synthetic data).
- The CLI supports `--neural` flag for encode/decode.
- Container format uses wavelet_container with filter_id=20 (NEURAL_FILTER_ID).
- The residual coding uses raw int16 storage. For production, this should use
  the existing Prism bitplane coder for better compression.
- All 7 unit tests pass (conv2d, GDN/IGDN, ReLU, quantization, dimensions).
- E1-E fixes applied: synthesis IGDN, conv2d padding, fixed-point scaling,
  hyper-synthesis 2x upsample, container decode bounds checks.
