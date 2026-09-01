# Architectural Blueprint: Full Neural Codec End-to-End (E1)

**Issue:** #226  
**Date:** 2026-09-01  
**Author:** The Architect  
**Status:** Draft  

---

## Summary

The single-pipeline architecture (wavelet + predictor + bitplane + entropy) has a hard, measured ceiling at 3.2175 per-sample / 9.6525 summed on Kodak-24. The predictor explains at most ~74.5% of coefficient variance, and the residual entropy is already entropy-near-optimal. Reaching M3 requires ~85% variance explanation, which is unreachable within this pipeline.

This blueprint designs a full neural codec end-to-end architecture (E1) with three learned networks (analysis, hyper-analysis, synthesis/hyper-synthesis), GDN activations, integer quantization, and a conditional Gaussian entropy model. The architecture replaces the entire pipeline and is trained on synthetic/procedural data (100K patches) to avoid overfitting to Kodak. The codec achieves lossless round-trip via a residual coding step (R = X - g_s(Y_q)), coded with the existing Prism entropy coder.

The target is to clear M2 (< 3.166 per-sample) with 75-85% probability and M3 (< 2.885 per-sample) with 55-70% probability, both on real Kodak-24 with byte-exact round-trip and fuzz clean.

---

## Deliverables

1. **Training infrastructure** (4 scripts): procedural data generator, three-phase training script, weight exporter, Kodak evaluation script.
2. **Integer inference engine** (2 files): C++ int8/int16 inference engine with GDN/IGDN, unit tests.
3. **Container format v2** (encoder/decoder integration): new Prism container with latent/hyper/residual streams.
4. **Bench integration**: extend `bench_gate.sh` for neural codec measurement, dual-unit gate checks.
5. **Documentation**: architecture spec, training guide, integration guide.

---

## Why

- **Structural ceiling:** The single-pipeline cannot reach M3. Neural codecs (L3C, Ballé) achieve ~2.8-3.0 bpp on Kodak lossless, matching M3.
- **Proven architecture:** The three-network design with hyperprior is a mature, published architecture (Ballé et al., 2018) with known training recipes.
- **Round-trip guarantee:** Residual coding ensures byte-exact lossless round-trip, preserving Prism's core invariant.
- **Fallback chain:** If E1 fails, hybrid mode, JXL-Modular, or learned entropy follow.

---

## How It Works

### Core Pipeline

```
Encode: X -> g_a -> Y -> round(Y+0.5) -> Y_q -> h_a -> Z -> round(Z+0.5) -> Z_q
        -> entropy_code(Y_q, sigma(Z_q)) -> bitstream

Decode: bitstream -> entropy_decode -> Y_q -> g_s(Y_q) -> X_hat
        -> residual coding: R = X - X_hat -> entropy_code(R)
```

**Lossless round-trip:** X_hat = g_s(Y_q). The residual R = X - X_hat is coded with Prism's rANS, ensuring byte-exact reconstruction.

### Network Architectures

| Network | Input | Output | Layers |
|---------|-------|--------|--------|
| g_a (analysis) | HxWxC | H/4 x W/4 x N | Conv3x3 s2 128 + GDN, Conv3x3 s1 128 + GDN, Conv3x3 s2 128 + GDN, Conv3x3 s1 N (N=192) |
| h_a (hyper-analysis) | H/4 x W/4 x N | H/8 x W/8 x M | Conv3x3 s1 128 + GDN, Conv3x3 s2 128 + GDN, Conv3x3 s1 M (M=192) |
| g_s (synthesis) | H/4 x W/4 x N | HxWxC | Conv3x3 s1 128 + IGDN, ConvTranspose s2 128 + IGDN, Conv3x3 s1 128 + IGDN, ConvTranspose s2 C |
| h_s (hyper-synthesis) | H/8 x W/8 x M | H/4 x W/4 x 2N | Conv3x3 s1 32 + ReLU, Conv3x3 s1 2N (scale+bias) |

**Quantization:** Y_q = round(Y + 0.5), Z_q = round(Z + 0.5). Straight-through estimator for gradients.

**Entropy model:** Factored Gaussian scale mixture: p(y_q|z_q) = prod_i N(y_q_i; 0, sigma_i^2(z_q)), sigma_i = exp(h_s(z_q)_i). Rounded Gaussian CDF for integer probability mass.

### Training Infrastructure

1. **Data generator** (`prism/scripts/gen_training_data.py`): procedural textures (Perlin, fractal, Voronoi), synthetic images (gradients, checkerboards), augmented real data. Generates 100K 256x256 patches on-the-fly.
2. **Training script** (`prism/scripts/train_neural_codec.py`): three-phase protocol:
   - Phase 1: Pre-train g_a + g_s on MSE (100 epochs, lr=1e-3).
   - Phase 2: Train h_a + h_s with g_a + g_s frozen, minimize H(Y_q) (50 epochs, lr=1e-4).
   - Phase 3: Fine-tune all networks jointly with L = H(Y_q) + H(R|Y_q) (200 epochs, lr=1e-4 cosine annealing).
3. **Weight exporter** (`prism/scripts/export_weights.py`): convert PyTorch model to int16 fixed-point (Q=1024) C++ header (`neural_codec_data.inc`).
4. **Evaluation script** (`prism/scripts/eval_neural_codec.py`): Kodak-24 measurement with `bench_gate.sh` integration.

### Integer Inference Engine

- **File:** `prism/src/codec/neural_codec.cpp` + header.
- **Operations:** Conv2d (int8 input, int16 weights, int32 accumulation, right-shift), GDN/IGDN (element-wise division with int16 reciprocal), round-to-integer.
- **Performance:** ~10 M MACs per image (768x512), < 50ms on modern CPU.

### Container Format v2

```
[PRSM magic][version=2][width][height][bd][ch][flags][effort]
[neural_model_len: u32 LE][neural_model: neural_model_len bytes]
[latent_stream: ...][hyper_stream: ...][residual_stream: ...]
[crc32_all: u32 LE]
```

- `neural_model_len` = baked neural network weights (int16). Replaces MA-tree model blob.
- Latent/hyper/residual streams are separate rANS streams.
- Backward incompatible: version byte distinguishes v1 (wavelet) and v2 (neural).

---

## Module Breakdown

| Module | Description | Files |
|--------|-------------|-------|
| Training Data Generator | Procedural texture synthesis | `prism/scripts/gen_training_data.py` |
| Training Script | Three-phase training protocol | `prism/scripts/train_neural_codec.py` |
| Weight Exporter | PyTorch to int16 fixed-point | `prism/scripts/export_weights.py` |
| Evaluation Script | Kodak-24 measurement | `prism/scripts/eval_neural_codec.py` |
| Inference Engine | Integer inference (conv, GDN) | `prism/src/codec/neural_codec.cpp`, `prism/include/prism/codec/neural_codec.h` |
| Container Encoder | Neural codec encode path | `prism/src/codec/container.cpp` (extend) |
| Container Decoder | Neural codec decode path | `prism/src/codec/container.cpp` (extend) |
| Bench Integration | Gate measurement | `prism/scripts/bench_gate.sh` (extend) |
| Baked Weights | C++ header with constants | `prism/src/codec/neural_codec_data.inc` |

---

## Test Matrix

### Unit Tests

1. **Forward pass validation:** Compare integer inference engine output with PyTorch within tolerance (max absolute error < 1e-3).
2. **GDN/IGDN round-trip:** Verify GDN followed by IGDN reconstructs input (within quantization error).
3. **Quantization round-trip:** Verify round(Y+0.5) and entropy decode reconstruct Y_q exactly.

### Integration Tests

1. **Encode-decode round-trip:** On Kodak-24 PPMs, verify decode(encode(x)) == x (byte-exact) 24/24.
2. **Container format v2:** Verify decoder rejects v1 streams, accepts v2 streams.
3. **Fuzz testing:** 10,000 random perturbation tests (random images, random crops, noise), zero decode failures.

### Performance Tests

1. **Entropy rate measurement:** On synthetic corpus, measure H(Y_q) + H(R|Y_q) < 3.0 per-sample.
2. **Model size:** Baked weights <= 100 KB (counted in header).
3. **Inference speed:** < 50ms per 768x512 image on modern CPU.

### Gate Checks (binding, pre-registered)

1. **E1-1:** Reconstruction quality: MSE < 0.5, byte-exact round-trip 24/24, fuzz clean.
2. **E1-2:** Entropy rate < 3.0 per-sample on synthetic data, model size <= 100 KB.
3. **E1-3:** M2: summed < 9.498 AND per-sample < 3.166, byte-exact 24/24, fuzz clean.
4. **E1-4:** M3: summed < 8.655 AND per-sample < 2.885, byte-exact 24/24, fuzz clean.

---

## Implementation Milestones

| Phase | Days | Deliverables |
|-------|------|--------------|
| E1-A: Training infrastructure | 3 | gen_training_data.py, train_neural_codec.py, export_weights.py, eval_neural_codec.py |
| E1-B: Integer inference engine | 2 | neural_codec.cpp/h, unit tests |
| E1-C: Integration | 2 | Container v2 encoder/decoder, round-trip tests |
| E1-D: Measurement | 1 | Kodak-24 bench, dual-unit gate check, honest ledger |
| **Total** | **8** | |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Neural codec fails to clear M3 | Fallback chain: hybrid mode, JXL-Modular, learned entropy |
| Training overfits to synthetic data | Use diverse procedural corpus, validate on Kodak (never train on Kodak) |
| Integer inference precision loss | Careful rounding, tolerance tests, comparison with PyTorch |
| Container v2 breaks existing tools | Version byte, separate decode path, backward-compatible decoder |

---

## Next Steps

1. **Builder:** Scaffold project tree, implement training data generator and training script.
2. **Training:** Run Phase 1-3 on synthetic corpus, export baked weights.
3. **Inference:** Implement integer inference engine, validate against PyTorch.
4. **Integration:** Extend container encoder/decoder, implement residual coding path.
5. **Measurement:** Run full Kodak-24 measurement, check gates E1-1 through E1-4.

---

*Blueprint for #226. Refs #226.*

- the Architect
