# Progress: Neural Codec Training for Prism #130 (issue #130)

- **Branch:** `opencode/issue130-neural-codec-train`
- **Status:** MEASURED NEGATIVE - CPU training insufficient for M2/M3; escalate for GPU training infrastructure
- **Date:** 2026-09-02 (Builder run, `/oc build` trigger)
- **Precedent:** All single-pipeline mechanism classes exhausted (X6b floor 3.2175/9.6525).
  JXL-modular ceiling 3.291/9.872. Oracle 3.161/9.483. Neural codec architecture built
  (neural_codec.cpp, neural_entropy.cpp, neural_frame.cpp), byte-exact roundtrip verified,
  258 unit tests pass. Baked weights untrained (100.18 bpp). PyTorch NOW AVAILABLE.

## Binding gates (units mandatory)
- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)

## Training results (this run)

### Setup
- Generated 1132 synthetic 256x256 patches (Perlin noise, Voronoi, fractal, gradients)
- Used 24 Kodak PPMs as additional training images
- Extracted 300 random 128x128 crops per epoch with augmentation
- CPU-only training (PyTorch 2.14.0, 4 cores)

### Phase 1: MSE reconstruction (15 epochs, lr=5e-4, 300 crops x batch 4)
- Started at PSNR 20.2 dB, reached 23.6 dB
- Loss: 0.0478 -> 0.0091
- ~31s per epoch

### Phase 3: Joint rate-distortion (15 epochs, lambda=0.5, lr=2e-4)
- PSNR: 23.9 -> 24.4 dB
- Entropy: 0.85 -> 0.80 bits/element
- Loss: 0.484 -> 0.419

### Phase 1 continued: MSE (11+ epochs before timeout, lr=1e-3, 500 crops)
- PSNR plateaued at ~23-24 dB (oscillating, not converging)

### Eval on Kodak-24 (Python float32 Gaussian entropy model)
- **Per-sample: 18.27 bpp (FAIL, needs < 3.166 for M2)**
- Summed: 438.56 bpp (FAIL, needs < 9.498 for M2)
- Average MSE: 0.003477 (PSNR ~24.6 dB)
- Latent entropy: ~0.80 bits/element (decent)
- Residual dominates: ~15.5 bits/element (reconstruction too poor)

## Root cause of failure

Training a 1.8M-parameter neural codec from scratch on CPU with ~500 small crops
is fundamentally insufficient:

1. **PSNR ceiling at 24 dB**: The synthesis network hasn't learned to reconstruct
   images well enough. Residual R = X - g_s(Y_q) is huge, dominating total bpp.
2. **Data starvation**: Real neural codecs (Ballé, Minnen et al.) are trained on
   DIV2K+Flickr2K (~30K images, millions of 256x256 patches). We have 500 crops.
3. **Compute starvation**: Real training runs for millions of iterations on GPU.
   We get ~50 CPU epochs total (~25 minutes of training).
4. **The 18.27 bpp vs 3.166 target**: 5.8x gap. Even with perfect entropy coding
   of the latent (0 bpp), the residual alone exceeds M2.

## What's needed for M2/M3

The neural codec paradigm IS the right path (literature achieves 2.8-3.0 bpp on
Kodak lossless). But it requires:
1. **GPU training** (CUDA, at minimum RTX 3080-class)
2. **Large corpus** (DIV2K + Flickr2K, ~30K images, millions of patches)
3. **Extended training** (500K+ iterations, ~200 epochs on full dataset)
4. **Lambda tuning** (rate-distortion trade-off for lossless target)

This is a multi-day GPU effort, not a CI runner task.

## Saved artifacts
- `/tmp/neural_weights/p1_final.pt`: Phase 1 checkpoint (PSNR 23.6 dB, 7.2 MB)
- `/tmp/neural_weights/p3_final.pt`: Phase 3 checkpoint (PSNR 24.4 dB, 7.2 MB)
- `/tmp/neural_weights/kodak24_eval.csv`: Kodak-24 evaluation results

## Honest assessment

ALL mechanism classes in the single-pipeline design space are exhausted AND the
neural codec cannot be trained to parity within CI infrastructure. The honest
state of the art for this lab is:

| Configuration | Per-sample bpp | Summed bpp | M2 | M3 |
|---|---|---|---|---|
| X6b floor (wavelet+bitplane+EMA) | 3.2175 | 9.6525 | FAIL (+1.6%) | FAIL (+10.3%) |
| JXL-modular real encoder | 3.290 | 9.870 | FAIL (+3.9%) | FAIL (+14.1%) |
| Neural codec (CPU-trained) | 18.27 | 438.56 | FAIL | FAIL |
| Oracle (abs(actual_coeff)) | 3.161 | 9.483 | BARELY PASS | FAIL (+9.6%) |
| M2 gate | < 3.166 | < 9.498 | TARGET | - |
| M3 gate | < 2.885 | < 8.655 | - | TARGET |

The gap to M2 is structural: the oracle barely passes (3.161 vs 3.166), and the
only path to close it is a trained neural codec on GPU infrastructure.

## Escalation

Per builder.md: `{"action":"maintainer"}` - the neural codec is the ONLY remaining
paradigm, but training requires GPU infrastructure that does not exist in CI.
The lab needs either:
1. GPU training capability added to CI, OR
2. External GPU training run (DIV2K+Flickr2K, ~200 epochs) with weight export, OR
3. Owner-directed closure at achieved level (3.2175/9.6525, -8.21% vs baseline)

- the Builder
