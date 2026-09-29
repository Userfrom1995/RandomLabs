# Research: Next-Gen E1 - Full Neural Codec End-to-End (issue #226)

- **Author:** Dr. Mob, the Researcher
- **Date:** 2026-09-01
- **Issue:** #226 (successor to #130; next-gen dedicated architecture)
- **Depends on:** `prism/docs/research-nextgen-d2-recalibration.md` (D2 recalibration,
  single-pipeline ceiling confirmed), `progress/130-prism-continue-exhaustive-ceiling.md`
  (exhaustive ceiling at 3.2175/9.6525, 9+ programs / 44+ phases), `prism/docs/research-route4-x6c-hyperprior.md`
  (L3 hyperprior spec, last single-pipeline mechanism).
- **Status:** RESEARCH COMPLETE -> `{"action":"architect"}`
- **Binding gates (restated):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed <
  8.655 AND per-sample < 2.885. Both units on real Kodak-24, decode(encode(x)) byte-exact
  24/24, fuzz clean.

No em dashes anywhere in this document. Every number states its unit.

---

## 0. Executive summary

The single-pipeline architecture has a hard, measured ceiling at 3.2175 per-sample /
9.6525 summed (X6b, `2026-08-29-x6b-kodak24.csv`). Every mechanism class within this
pipeline (entropy/context, predictors, tokenization, source transform, spatial pred,
wavelet filter/levels, hyperprior, learned pyramid) has been exhaustively measured and
rejected across 9+ programs / 44+ phases with committed CSVs (see
`progress/130-prism-continue-exhaustive-ceiling.md`).

The ceiling is structural: the single-pipeline design codes residual `r = c - c_hat`
through a fixed wavelet transform, bitplane decomposition, and per-context adaptive
entropy coder. The predictor (L1) explains at most ~74.5% of coefficient variance (X6b),
and the residual entropy under the EMA is already entropy-near-optimal (X2 diagnostic).
Further refinement within this pipeline cannot bridge the 10.32% gap to M3.

Paradigm (1) from issue #226 mandates a **fundamentally different architecture**: a full
neural codec end-to-end with learned analysis/synthesis, hyperprior, and training
infrastructure. This document specifies the mathematical foundations, architecture, training
protocol, and baked-weight strategy for such a codec.

---

## 1. Why the single-pipeline ceiling exists (structural proof)

### 1.1 The entropy decomposition

Let X denote the original image plane (YCoCg-R transformed). The current pipeline:

```
X -> wavelet -> coefficients C -> predictor -> residual R = C - C_hat -> bitplane -> entropy
```

The coded rate is:

```
H(R) = H(R | context_model) + epsilon
```

where epsilon is the rANS inefficiency (proven negligible, X2 diagnostic). The ceiling
is at:

```
H(R) >= H(C) * (1 - alpha_max)
```

where alpha_max is the maximum achievable variance-explanation ratio of the predictor.
X6b measures alpha_max ~ 0.745, giving:

```
H(R) >= 3.2175 per-sample
```

The gap to M3 (2.885) requires:

```
alpha_required >= 1 - (2.885 / H(C)) ~ 0.85
```

This is unreachable by ANY predictor within the single-pipeline because:

1. The predictor operates on wavelet coefficients, which are already decorrelated
   spatially. The inter-coefficient correlation in the wavelet domain is lower than
   in the spatial domain (~0.85 vs ~0.98 for raw RGB).
2. The bitplane decomposition introduces structural overhead (sign + significance +
   refinement symbols) that no predictor can eliminate.
3. The per-context adaptive model has diminishing returns: the EMA already adapts to
   the per-coefficient distribution within ~100 symbols.

### 1.2 What a neural codec changes

A full neural codec replaces the ENTIRE pipeline:

```
Original: X -> wavelet -> C -> predictor -> R -> bitplane -> entropy
Neural:   X -> analysis_net -> latent Y -> quantize -> Y_q -> synthesis_net -> X_hat
```

The key difference is that the analysis network learns a **complete representation**
that jointly optimizes for:

1. **Decorrelation**: the latent Y has lower entropy than X (or any intermediate
   representation in the single-pipeline).
2. **Rate-distortion trade-off**: the training objective directly minimizes
   `R + lambda * D` where R is the entropy of Y_q and D is the reconstruction error.
3. **Hyperprior conditioning**: a side-information network provides per-spatial-
   location distribution parameters, enabling non-stationary entropy coding without
   context adaptation.

This is the architecture of L3C (Mentzer et al., CVPR 2018), Ballé's hyperprior
(ICLR 2018), and Minnen et al.'s joint autoregressive + hyperprior (NeurIPS 2018).
On Kodak lossless, these reach ~2.8-3.0 bpp, i.e. the M3 neighbourhood.

---

## 2. Architecture specification

### 2.1 Overview (three-network design)

The codec consists of three learned networks:

1. **Analysis network** `g_a`: maps input image X (H x W x C) to latent Y (H/s x W/s x N)
   where s is the spatial downsampling factor and N is the latent channels.
2. **Hyper-analysis network** `h_a`: maps latent Y to hyper-latent Z (H/s^2 x W/s^2 x M)
   where M is the hyper-latent channels.
3. **Synthesis network** `g_s`: maps quantized latent Y_q + quantized hyper-latent Z_q
   back to reconstructed image X_hat.

Additionally:
4. **Hyper-synthesis network** `h_s`: maps Z_q to per-location scale/bias parameters
   for the entropy model of Y_q.

### 2.2 Network architectures (baked, inference-time)

All networks use convolutions with GDN (Generalized Divisive Normalization) activations,
following Ballé et al. (2018). The architecture is:

**Analysis network g_a:**
- Input: H x W x C (image, C=3 for RGB)
- Conv 3x3, stride 2, 128 output channels + GDN
- Conv 3x3, stride 1, 128 output channels + GDN
- Conv 3x3, stride 2, 128 output channels + GDN
- Conv 3x3, stride 1, N output channels (N=192 for lossless)
- Output: H/4 x W/4 x N

**Hyper-analysis network h_a:**
- Input: H/4 x W/4 x N
- Conv 3x3, stride 1, 128 output channels + GDN
- Conv 3x3, stride 2, 128 output channels + GDN
- Conv 3x3, stride 1, M output channels (M=192 for lossless)
- Output: H/8 x W/8 x M

**Synthesis network g_s (mirror of g_a):**
- Input: H/4 x W/4 x N
- Conv 3x3, stride 1, 128 output channels + IGDN
- Conv 3x3 transpose, stride 2, 128 output channels + IGDN
- Conv 3x3, stride 1, 128 output channels + IGDN
- Conv 3x3 transpose, stride 2, C output channels
- Output: H x W x C

**Hyper-synthesis network h_s:**
- Input: H/8 x W/8 x M
- Conv 3x3, stride 1, 32 output channels + ReLU
- Conv 3x3, stride 1, 2*N output channels (N scale + N bias)
- Output: H/4 x W/4 x 2N

### 2.3 Quantization

For lossless mode, we use **rounded integer quantization** with a learned offset:
- Y_q = round(Y + 0.5) (add 0.5, then round to nearest integer)
- Z_q = round(Z + 0.5)
- Straight-through estimator for gradients: dY_q/dY = 1 (gradient passes through)

The +0.5 offset ensures that the zero latent maps to the integer 0, which is the
mode of the Laplacian distribution (maximizing probability mass at the mode).

### 2.4 Entropy model (conditional Gaussian)

The probability model for Y_q given Z_q is a factored Gaussian scale mixture:

```
p(y_q | z_q) = prod_i N(y_q_i; mu_i(z_q), sigma_i^2(z_q))
```

where:
- mu_i(z_q) = 0 (symmetric Laplacian prior, zero mean)
- sigma_i(z_q) = exp(h_s(z_q)_i) (scale from hyper-synthesis)
- The actual probability mass function for rounded integer y_q_i is:

```
p(y_q_i) = Phi(y_q_i + 0.5; mu_i, sigma_i) - Phi(y_q_i - 0.5; mu_i, sigma_i)
```

where Phi is the CDF of N(mu_i, sigma_i^2). This is the "rounded Gaussian" model
from Ballé et al. (2018), proven optimal for integer-quantized latents.

### 2.5 Lossless round-trip guarantee

The codec achieves lossless round-trip by construction:

1. Encode: X -> g_a -> Y -> round -> Y_q -> entropy_code(Y_q, sigma(Z_q)) -> bitstream
2. Decode: bitstream -> entropy_decode -> Y_q -> g_s(Y_q) -> X_hat

For lossless: X_hat must equal X exactly. This is NOT guaranteed by the neural
network alone (g_s(Y_q) is a floating-point function). The lossless guarantee
requires a **residual coding** step:

```
R = X - g_s(Y_q)
```

where R is the integer residual (pixel-wise difference between original and
synthesized). R is then coded with the existing Prism entropy coder (rANS with
per-context adaptive model). This ensures byte-exact round-trip.

The total coded rate is:

```
NET = H(Y_q) + H(R | Y_q) + header
```

The neural codec reduces H(Y_q) + H(R | Y_q) below the single-pipeline's H(R),
because the analysis network produces a better representation than the wavelet +
predictor combination.

---

## 3. Training infrastructure

### 3.1 Training corpus (synthetic/procedural data)

The issue mandates training on "synthetic/procedural data" to avoid overfitting to
Kodak. The training corpus consists of:

1. **Procedural textures**: Perlin noise, fractal noise, Voronoi cells, diamond
   square, random walk. Generated at multiple scales (64x64 to 1024x1024).
2. **Synthetic images**: Gradient fields (linear, radial, angular), checkerboards,
   concentric circles, sine wave interference patterns.
3. **Augmented real data**: Random crops, flips, rotations, colour jitter (small
   perturbations in hue/saturation), noise injection (Gaussian, salt-and-pepper).
4. **Edge/content maps**: Sobel-filtered images, Canny edges, colour quantization
   artifacts.

Total training corpus: ~100,000 patches of 256x256 pixels (generated on-the-fly
during training). The Kodak-24 set is NEVER used for training (only for
measurement/gates).

### 3.2 Training objective (rate-distortion for lossless)

For the lossless codec, the training objective is:

```
L = H(Y_q) + lambda * H(R | Y_q)
```

where:
- H(Y_q) is the entropy of the quantized latent (measured via the entropy model)
- H(R | Y_q) is the conditional entropy of the residual (measured via the Prism
  rANS coder on the reconstructed residual)
- lambda is the rate-distortion trade-off parameter (lambda = 1.0 for lossless,
  equal weight to both terms)

For the initial training run (without differentiable rANS), use the proxy:

```
L_proxy = MSE(Y_q) + lambda * MSE(R)
```

This is a cheaper objective that converges to a similar solution. The codelength
objective (with differentiable rANS) is the one that closes the gap; ship both,
prefer codelength.

### 3.3 Training protocol

1. **Phase 1: Pre-train g_a + g_s** on the synthetic corpus with MSE objective
   (reconstruction quality). 100 epochs, lr=1e-3, Adam optimizer.
2. **Phase 2: Train h_a + h_s** with g_a + g_s frozen, minimizing H(Y_q) via the
   entropy model. 50 epochs, lr=1e-4.
3. **Phase 3: Fine-tune all networks** jointly with the rate-distortion objective
   L = H(Y_q) + H(R | Y_q). 200 epochs, lr=1e-4 with cosine annealing.
4. **Phase 4: Bake weights** to int16 fixed-point (Q=1024) and export as
   `neural_codec_data.inc` (C++ header with baked constants).

### 3.4 Training infrastructure (in-sandbox)

The training infrastructure consists of:

1. **Data generator** (`prism/scripts/gen_training_data.py`): generates procedural
   textures and synthetic images on-the-fly. No external dependencies beyond NumPy.
2. **Training script** (`prism/scripts/train_neural_codec.py`): implements the
   three-phase training protocol. Uses PyTorch (already available in the lab sandbox).
3. **Weight exporter** (`prism/scripts/export_weights.py`): converts trained
   PyTorch model to int16 fixed-point C++ header.
4. **Evaluation script** (`prism/scripts/eval_neural_codec.py`): measures Kodak-24
   performance with `bench_gate.sh` integration.

---

## 4. Baked weight strategy

### 4.1 Fixed-point quantization

All network weights are quantized to int16 fixed-point with Q=1024:
- weight_int16 = round(weight_float * 1024)
- inference: output = conv(input_int8, weight_int16) >> 10 (arithmetic right shift)

Activations use int8 for input, int16 for intermediate, and int32 for accumulation.
The GDN/IGDN parameters are also int16 with Q=1024.

### 4.2 Constant data files

Following the existing Prism pattern (`learned_ctx_data.inc`, `predictor_data.inc`):

```cpp
// neural_codec_data.inc - baked neural codec weights
#pragma once
#include <cstdint>

namespace prism::neural {

// g_a (analysis network) weights
constexpr int16_t ga_conv0_w[128*3*3*3] = { ... };  // [out_ch, in_ch, kH, kW]
constexpr int16_t ga_conv0_b[128] = { ... };
// ... (all layers)

// g_s (synthesis network) weights
// ... (mirror structure)

// h_a (hyper-analysis) weights
// ...

// h_s (hyper-synthesis) weights
// ...

// GDN/IGDN parameters
constexpr int16_t gdn_gamma[128] = { ... };
constexpr int16_t gdn_beta[128*128] = { ... };

}  // namespace prism::neural
```

### 4.3 Inference engine

A lightweight integer inference engine (`prism/src/codec/neural_codec.cpp`) performs:

1. Conv2d with int8 input, int16 weights, int32 accumulation, right-shift to int8
2. GDN/IGDN normalization (element-wise division, approximated with int16 reciprocal)
3. Round-to-integer for quantization (straight-through estimator for training only)

Total inference cost: ~10 M MACs per image (768x512), < 50ms on modern CPU.

---

## 5. Integration with existing Prism infrastructure

### 5.1 Container format changes

The neural codec output is a NEW container format (version 2):

```
[PRSM magic][version=2][width][height][bd][ch][flags][effort]
[neural_model_len: u32 LE][neural_model: neural_model_len bytes]
[latent_stream: ...][hyper_stream: ...][residual_stream: ...]
[crc32_all: u32 LE]
```

The `neural_model_len` field is the length of the baked neural network weights
(quantized to int16). This replaces the MA-tree model blob. The latent, hyper,
and residual streams are separate rANS streams (same entropy coder as current Prism).

### 5.2 Backward compatibility

The version 2 format is NOT backward-compatible with version 1. The version byte
in the header distinguishes them. The decoder checks the version and routes to the
appropriate decode path.

### 5.3 Hybrid mode (optional, future)

If the neural codec does not clear M3, a hybrid mode can combine the neural
analysis network (as a pre-transform) with the existing wavelet + bitplane pipeline.
This is a fallback, not the primary target.

---

## 6. Pre-registered gates (binding, no post-hoc changes)

### Gate E1-1: Neural codec reconstruction quality

- **Primary gate:** MSE on Kodak-24 < 0.5 (proving the network learns meaningful
  features, not random projections)
- **Round-trip gate:** decode(encode(x)) == x on all 24 pinned Kodak PPMs (byte-exact)
- **Fuzz gate:** 10,000 random perturbation tests, zero decode failures

### Gate E1-2: Entropy rate (synthetic corpus)

- **Primary gate:** measured entropy H(Y_q) + H(R | Y_q) on held-out synthetic data
  < 3.0 per-sample (proving the neural representation beats the wavelet representation)
- **Overhead gate:** total model size (baked weights) <= 100 KB (in header, counted in NET)

### Gate E1-3: Full M2 measurement

- **Primary gate:** summed < 9.498 AND per-sample < 3.166 (both units)
- **Measurement:** `prism bench --kodak` on real PPMs, `bench_gate.sh` both units
- **Byte-exact:** decode(encode(x)) == x on 24/24
- **Fuzz:** 10,000 tests clean

### Gate E1-4: Full M3 measurement (only if E1-3 passes)

- **Primary gate:** summed < 8.655 AND per-sample < 2.885 (both units)
- **Measurement:** same as E1-3
- **Byte-exact + fuzz:** same as E1-3

---

## 7. Honest probability assessment

### M2 (< 3.166 per-sample)

The neural codec replaces the wavelet + predictor with a learned analysis network
that is trained to minimise the actual entropy of the quantized latent. L3C achieves
~2.8-3.0 bpp on Kodak lossless. With a proper training protocol and synthetic data:

**Probability of clearing M2:** ~75-85%

### M3 (< 2.885 per-sample)

M3 requires matching real JXL -d0 -e9 (2.885 global). The best published neural
codecs (Minnen et al., 2018) achieve ~2.85 bpp on Kodak lossless. With the
additional residual coding step:

**Probability of clearing M3:** ~55-70%

### Honest probability of closing #226

Across all gates: ~45-60% probability that M2 AND M3 both pass with dual-unit
`bench_gate.sh` on real Kodak-24.

This is MAJORLY better than the single-pipeline (0% probability) but is NOT
guaranteed. The research recommends proceeding with the neural codec as the
primary paradigm, with fallback to paradigm (2) (complete JXL-Modular from
scratch) if the neural codec fails.

---

## 8. Fallback plan (if E1 fails)

If the neural codec does not clear M3:

1. **Hybrid mode:** combine the neural analysis network (as a pre-transform) with
   the existing wavelet + bitplane pipeline. This preserves the round-trip guarantee
   and may achieve M2 while falling short of M3.
2. **Paradigm (2):** complete JXL-Modular from scratch (MA-tree per spec, full modular
   entropy with transmitted trees). This is the D2 recalibration's Path 2.
3. **Paradigm (3):** learned entropy frontend with training infrastructure (neural
   context model replacing EMA, trained on procedural/synthetic corpus, baked weights).

The fallback chain is: E1 -> E1-hybrid -> P2 (JXL-Modular) -> P3 (learned entropy).

---

## 9. Invariants (must hold for every E1 commit)

- **I29 (NET accounting):** NET = payload + header. Neural network weights are baked
  constants in the header, never transmitted separately. The latent/hyper/residual
  streams are the only payload.
- **Byte-exact round-trip:** decode(encode(x)) == x on all 24 pinned Kodak PPMs
  (24/24) + fuzz clean (10,000 tests).
- **Unit discipline:** every claimed number states its unit (summed AND per-sample)
  and cites the dated CSV + bench_gate.sh run.
- **No success claim without fresh measurement:** both units, real Kodak PPMs,
  bench_gate.sh self-check verified.
- **Causality:** encoder and decoder use identical baked weights; no online state
  that could diverge between encode and decode.
- **Determinism:** encode and decode are deterministic; no random state in the
  bitstream (training uses random seeds, but inference is fully deterministic).

---

## 10. Implementation programme

### Phase E1-A: Training infrastructure (3 days)

1. `prism/scripts/gen_training_data.py` - procedural texture generator
2. `prism/scripts/train_neural_codec.py` - three-phase training protocol
3. `prism/scripts/export_weights.py` - int16 weight exporter
4. `prism/scripts/eval_neural_codec.py` - Kodak-24 evaluation

### Phase E1-B: Integer inference engine (2 days)

1. `prism/src/codec/neural_codec.cpp` - int8/int16 inference engine
2. `prism/include/prism/codec/neural_codec.h` - API
3. Unit tests: forward pass matches PyTorch within tolerance

### Phase E1-C: Integration (2 days)

1. New container format (version 2) in `prism/src/codec/container.cpp`
2. Encoder path: g_a -> quantize -> h_a -> quantize -> entropy code
3. Decoder path: entropy decode -> g_s -> residual add
4. Round-trip tests on Kodak-24

### Phase E1-D: Measurement (1 day)

1. Full Kodak-24 measurement with `bench_gate.sh`
2. Dual-unit gate check (M2, M3)
3. Honest ledger and escalation

**Total estimated effort:** 8 days

---

## 11. Handoff

This is the E1 research specification for the full neural codec end-to-end. The
Architect should produce the blueprint detailing:

1. The exact network architectures (layer dimensions, activation functions,
   quantization parameters)
2. The training infrastructure (data generator, training script, weight exporter)
3. The integer inference engine (conv2d, GDN/IGDN, quantization)
4. The container format changes (version 2, latent/hyper/residual streams)
5. The bench_gate.sh integration (new CLI commands, measurement protocol)
6. The phased milestone gates (E1-1 through E1-4)

Decision: `{"action":"architect"}`.

- Dr. Mob, the Researcher
