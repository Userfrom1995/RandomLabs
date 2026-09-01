# Progress - Full Neural Codec End-to-End (E1)

- **Issue:** #226
- **Branch:** opencode/226-neural-codec-e1
- **Status:** in-progress. E1-E entropy coding wired. Re-measurement pending.
- **Predecessor lesson source:** Single-pipeline ceiling at 3.2175/9.6525 (X6b, 2026-08-29), PR #225, 9+ programs / 44+ phases measured. Predictor explains at most ~74.5% of coefficient variance; M3 requires ~85%, unreachable within pipeline.

## Research deliverables (Dr. Mob, the Researcher, 2026-09-01)

- `prism/docs/research-nextgen-neural-codec-e1.md` - full neural codec specification
- Architecture: Three learned networks (g_a, h_a, g_s, h_s) with hyperprior, GDN activations, integer quantization, conditional Gaussian entropy model.
- Training: Synthetic/procedural corpus (~100K patches), three-phase protocol.
- Probability: M2 (~75-85%), M3 (~55-70%), both gates (~45-60%).

## Key architectural decisions

1. **Architecture:** Three learned networks with hyperprior (L3C/Balle style).
2. **Quantization:** Rounded integer with +0.5 offset (Y_q = round(Y+0.5)).
3. **Entropy model:** Factored Gaussian scale mixture.
4. **Lossless round-trip:** Residual coding step: R = X - g_s(Y_q). Residual uses int32 (not int16) to avoid overflow with untrained weights.
5. **Container format v2:** New header with neural model length.
6. **Entropy coding:** rANS with geometric coding per symbol. Y_q conditioned on sigma (re-derived from Z_q on decode). Z_q with fixed Laplacian lambda=0.5. sigma NOT transmitted (saves 2 bytes per latent value).

## Implementation milestones (binding gates)

- **E1-A: Training infrastructure (3 days)**
  - [x] 1. `prism/scripts/gen_training_data.py` - procedural texture generator
  - [x] 2. `prism/scripts/train_neural_codec.py` - three-phase training protocol
  - [x] 3. `prism/scripts/export_weights.py` - int16 weight exporter
  - [x] 4. `prism/scripts/eval_neural_codec.py` - Kodak-24 evaluation
- **E1-B: Integer inference engine (2 days)**
  - [x] 5. `prism/include/prism/codec/neural_codec.h` - API
  - [x] 6. `prism/src/codec/neural_codec.cpp` - int8/int16 inference engine
  - [x] 7. Unit tests: forward pass matches PyTorch within tolerance
- **E1-C: Integration (2 days)**
  - [x] 8. New container format (version 2) via wavelet_container + NEURAL_FILTER_ID
  - [x] 9. Encoder path: g_a -> quantize -> h_a -> quantize -> entropy code
  - [x] 10. Decoder path: entropy decode -> g_s -> residual add
  - [x] 11. CLI integration (--neural flag)
- **E1-D: Measurement (1 day)**
  - [x] 12. Full Kodak-24 measurement with `bench_gate.sh`
  - [x] 13. Dual-unit gate check (M2, M3)
  - [x] 14. Honest ledger and escalation
- **E1-E: Correctness fixes + entropy coding (1 day)**
  - [x] 15. Fix synthesis GDN -> IGDN (run_conv_norm with NormType enum)
  - [x] 16. Fix conv2d padding: kernel-size-aware `(k-1)/2` instead of hardcoded PAD=1
  - [x] 17. Fix GDN/IGDN fixed-point: int64 x_q domain, proper Q scaling
  - [x] 18. Add 2x nearest-neighbor upsample to hyper-synthesis (match PyTorch training)
  - [x] 19. Fix container decode: bounds checks, filter_id validation
  - [x] 20. Restore architect blueprint in ideas/2026-09-01-neural-codec-e1.md
  - [x] 21. rANS entropy coding of Y_q|sigma and Z_q (geometric coding per symbol)
  - [x] 22. Wire sigma out of payload (re-derive from Z_q on decode)
  - [x] 23. Fix int32 residual for lossless round-trip (int16 overflow with untrained weights)
  - [x] 24. Fix rANS LIFO bit ordering within symbols (stop bit must be pushed first)
  - [x] 25. Fix MAX_MAG for int8 -128 (|value| can be 128)

## Honest Measurement Ledger (2026-09-01)

### Trained weights produced
- 20 epochs phase 1 + 5 epochs phase 2 + 10 epochs phase 3 on 1000 synthetic 64x64 patches
- Model: N=192, M=192, ~1.8M parameters
- Phase 3 best loss: 0.828 (MSE=0.014, rate=0.814)
- Exported to `neural_codec_data.inc` (7.7 MB, int16 Q=1024)

### C++ binary build
- Build: SUCCESS (cmake --build, Release mode)
- Unit tests: 10/10 PASS (original 7 + EntropyYqRoundTrip, EntropyZqRoundTrip, EntropyYqCompression)
- Frame round-trip: BYTE-EXACT on 16x16, 32x32 test images

### Entropy coding (E1-E)
- rANS geometric coding per symbol with bounds-checked decoder
- Y_q conditioned on sigma (sigma re-derived from Z_q on decode via h_s)
- Z_q with fixed Laplacian lambda=0.5 (32768/65536)
- Residual via existing rans_encode_plane (int32, Elias-gamma magnitude)
- sigma NOT transmitted (saves 2 bytes per latent value)
- Payload layout: [yh/yw/zh/zw headers][zq_size/yq_size/res_size][Z_q rANS stream][Y_q rANS stream][Residual rANS stream]

### Previous measurement (raw payload, pre-entropy)
- **Neural codec (raw payload):** 120.00 bpp per-sample, 360.00 bpp summed
- **Standard prism effort=0:** 5.69 bpp per-sample, 17.06 bpp summed

### Measurement pending
- Re-measurement needed with entropy-coded payload
- Expected: significant reduction from 120 bpp due to entropy coding of Y_q|sigma, Z_q, and residual

### Gate results (BINDING)
| Gate | Target (per-sample) | Target (summed) | Neural codec (raw) | Standard prism e0 |
|------|-------------------|-----------------|-------------|-------------------|
| M2   | < 3.166           | < 9.498         | 120.00 FAIL | 5.69 FAIL         |
| M3   | < 2.885           | < 8.655         | 360.00 FAIL | 17.06 FAIL        |

### Root cause of previous failure
The raw payload stored Y_q, Z_q, sigma, and residual without any entropy coding. With N=192 latent channels, this was 45 bytes/pixel = 360 bpp. Entropy coding now compresses each stream with context-adaptive rANS.

## Gate checks (binding, pre-registered)

- **E1-1:** Reconstruction quality: MSE < 0.5, byte-exact round-trip 24/24, fuzz clean.
- **E1-2:** Entropy rate < 3.0 per-sample on synthetic data, model size <= 100 KB.
- **E1-3:** M2: summed < 9.498 AND per-sample < 3.166, byte-exact 24/24, fuzz clean.
- **E1-4:** M3: summed < 8.655 AND per-sample < 2.885, byte-exact 24/24, fuzz clean.

## Agent log

- 2026-09-01 (run 1): Builder scaffolded branch from origin/main, created training infrastructure (4 Python scripts), integer inference engine (C++ header + source), and unit tests. Training data generator produces procedural textures (Perlin, fractal, Voronoi, diamond-square, random-walk) + synthetic images + augmented real data. Training script implements three-phase protocol. Weight exporter converts PyTorch model to int16 Q=1024 baked constants.
- 2026-09-01 (run 2): Trained model (20+5+10 epochs on 64x64 patches), exported real baked weights to C++ header (7.7 MB), fixed buffer overrun in synthesis layer3, fixed planar-to-CHW conversion, built C++ binary, verified 7/7 unit tests pass, measured Kodak-24 at 120 bpp (raw payload, no entropy coding). M2/M3 gates FAIL. Honest ledger written.
- 2026-09-01 (run 3, E1-E): Fixed 7 reviewer findings from strict audit of PR #230. (1) Synthesis GDN->IGDN: added NormType enum to run_conv_norm, all 3 synthesis layers now call neural_igdn. (2) Conv2d padding: changed from hardcoded NeuralCodecParams::PAD to kernel-size-aware `(k-1)/2` formula. (3) Fixed-point scaling: GDN/IGDN now compute x_q = x * Q in int64, x^2 in Q domain properly. (4) Hyper-synthesis: added 2x nearest-neighbor upsample before conv layers to match PyTorch training. (5) Container decode: added bounds checks for stream length, filter_id validation. (6) Restored architect blueprint in ideas/2026-09-01-neural-codec-e1.md (was overwritten by builder summary). (7) Updated builder doc to reflect real baked weights. All 250 tests pass (7/7 neural codec). Raw payload still 120 bpp - rANS entropy coding is the next blocking item.
- 2026-09-01 (run 4, E1-E continue): Implemented rANS entropy coding. Created neural_entropy.h/cpp with geometric coding per symbol. Fixed rANS LIFO bit ordering (stop bit pushed first). Fixed MAX_MAG=128 for int8 -128. Fixed int32 residual to prevent overflow with untrained weights. Sigma NOT transmitted (re-derived from Z_q on decode). Added3 new unit tests (EntropyYqRoundTrip, EntropyZqRoundTrip, EntropyYqCompression). All 253 tests pass. Frame round-trip byte-exact on test images. Payload layout updated with zq_size/yq_size/res_size headers. Ready for Kodak-24 re-measurement.

---

*Builder measurement for #226. Refs #226.*

- the Builder
