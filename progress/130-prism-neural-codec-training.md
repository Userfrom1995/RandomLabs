# Progress: Neural Codec Training for Prism #130 (issue #130)

- **Branch:** `opencode/issue130-neural-codec-train`
- **Status:** in-progress
- **Date:** 2026-09-02 (Builder run, `/oc build` trigger)
- **Precedent:** All single-pipeline mechanism classes exhausted (X6b floor 3.2175/9.6525).
  JXL-modular ceiling 3.291/9.872. Oracle 3.161/9.483. Neural codec architecture built
  (neural_codec.cpp, neural_entropy.cpp, neural_frame.cpp), byte-exact roundtrip verified,
  258 unit tests pass. Baked weights untrained (100.18 bpp). PyTorch NOW AVAILABLE.

## Binding gates (units mandatory)
- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)

## This run

### Step 1: Generate training data
- [ ] Run gen_training_data.py to produce ~10K 256x256 uint16 PPM patches
- [ ] Also use Kodak-24 images (leave-one-out training) for photorealistic content

### Step 2: Train neural codec
- [ ] Phase 1: Pre-train g_a + g_s on MSE reconstruction (h_a, h_s frozen)
- [ ] Phase 2: Train h_a + h_s on entropy model (g_a, g_s frozen)
- [ ] Phase 3: Joint fine-tune all networks with L = MSE + lambda * H(Y_q)

### Step 3: Export weights
- [ ] Run export_weights.py to produce int16 Q=1024 baked weights
- [ ] Regenerate neural_codec_data.inc with new weights

### Step 4: Build + test
- [ ] Build C++ project with cmake
- [ ] Run unit tests (258 must pass)
- [ ] Byte-exact roundtrip on all 24 Kodak images

### Step 5: Measure
- [ ] bench_gate.sh on Kodak-24
- [ ] CSV with both units (summed and per-sample)
- [ ] Gate check: M2 and M3

## Honest assessment
The neural codec is the ONLY remaining paradigm that can close the 1.6% gap to M2
and 10.3% gap to M3. Literature shows Ballé-style hyperprior achieves 2.8-3.0 bpp
on Kodak lossless. Training requires significant epochs on CPU but PyTorch is now
available in this environment.

- the Builder
