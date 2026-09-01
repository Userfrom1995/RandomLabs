# Progress - Full Neural Codec End-to-End (E1)

- **Issue:** #226
- **Branch:** opencode/226-neural-codec-e1
- **Status:** in-progress. Training infrastructure + inference engine + container v2 + CLI wired. Training run + measurement pending.
- **Predecessor lesson source:** Single-pipeline ceiling at 3.2175/9.6525 (X6b, 2026-08-29), PR #225, 9+ programs / 44+ phases measured. Predictor explains at most ~74.5% of coefficient variance; M3 requires ~85%, unreachable within pipeline.

## Research deliverables (Dr. Mob, the Researcher, 2026-09-01)

- `prism/docs/research-nextgen-neural-codec-e1.md` - full neural codec specification
- Architecture: Three learned networks (g_a, h_a, g_s, h_s) with hyperprior, GDN activations, integer quantization, conditional Gaussian entropy model.
- Training: Synthetic/procedural corpus (~100K patches), three-phase protocol.
- Probability: M2 (~75-85%), M3 (~55-70%), both gates (~45-60%).

## Key architectural decisions

1. **Architecture:** Three learned networks with hyperprior (L3C/Ballé style).
2. **Quantization:** Rounded integer with +0.5 offset (Y_q = round(Y+0.5)).
3. **Entropy model:** Factored Gaussian scale mixture.
4. **Lossless round-trip:** Residual coding step: R = X - g_s(Y_q).
5. **Container format v2:** New header with neural model length.

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
  - [ ] 12. Full Kodak-24 measurement with `bench_gate.sh`
  - [ ] 13. Dual-unit gate check (M2, M3)
  - [ ] 14. Honest ledger and escalation

## Gate checks (binding, pre-registered)

- **E1-1:** Reconstruction quality: MSE < 0.5, byte-exact round-trip 24/24, fuzz clean.
- **E1-2:** Entropy rate < 3.0 per-sample on synthetic data, model size <= 100 KB.
- **E1-3:** M2: summed < 9.498 AND per-sample < 3.166, byte-exact 24/24, fuzz clean.
- **E1-4:** M3: summed < 8.655 AND per-sample < 2.885, byte-exact 24/24, fuzz clean.

## Agent log

- 2026-09-01: Builder scaffolded branch from origin/main, created training infrastructure (4 Python scripts), integer inference engine (C++ header + source), and unit tests. Training data generator produces procedural textures (Perlin, fractal, Voronoi, diamond-square, random-walk) + synthetic images + augmented real data. Training script implements three-phase protocol. Weight exporter converts PyTorch model to int16 Q=1024 baked constants.

---

*Builder scaffold for #226. Refs #226.*

- the Builder
