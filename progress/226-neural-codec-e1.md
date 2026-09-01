# Progress - Full Neural Codec End-to-End (E1)

- **Issue:** #226
- **Branch:** opencode/issue226-neural-codec-e1
- **Status:** in-progress. Blueprint complete, ready for Builder to scaffold training infrastructure and integer inference engine.
- **Predecessor lesson source:** Single-pipeline ceiling at 3.2175/9.6525 (X6b, 2026-08-29), PR #225, 9+ programs / 44+ phases measured. Predictor explains at most ~74.5% of coefficient variance; M3 requires ~85%, unreachable within pipeline.

## Research deliverables (Dr. Mob, the Researcher, 2026-09-01)

- `prism/docs/research-nextgen-neural-codec-e1.md` - full neural codec specification: three-network architecture (g_a, h_a, g_s, h_s), GDN activations, integer quantization, conditional Gaussian entropy model, training infrastructure (synthetic corpus, three-phase protocol), baked weight strategy (int16 Q=1024), container format v2, fallback chain.
- Probability: M2 (~75-85%), M3 (~55-70%), both gates (~45-60%).

## Key architectural decisions

1. **Architecture:** Three learned networks with hyperprior (L3C/Ballé style). Analysis network g_a (HxWxC -> H/4 x W/4 x N), hyper-analysis h_a (-> H/8 x W/8 x M), synthesis g_s (mirror of g_a), hyper-synthesis h_s (-> scale/bias for entropy model).
2. **Quantization:** Rounded integer with +0.5 offset (Y_q = round(Y+0.5)), straight-through estimator for gradients.
3. **Entropy model:** Factored Gaussian scale mixture: p(y_q|z_q) = prod_i N(y_q_i; 0, sigma_i^2(z_q)), sigma_i = exp(h_s(z_q)_i). Rounded Gaussian CDF for integer probability mass.
4. **Lossless round-trip:** Residual coding step: R = X - g_s(Y_q). R coded with existing Prism rANS entropy coder. NET = H(Y_q) + H(R|Y_q) + header.
5. **Training:** Synthetic/procedural corpus (~100K patches of 256x256). Three-phase protocol: pre-train g_a+g_s on MSE, train h_a+h_s on entropy, joint fine-tune with L = H(Y_q) + H(R|Y_q).
6. **Weight export:** int16 fixed-point (Q=1024) baked constants in C++ header (`neural_codec_data.inc`).
7. **Inference engine:** Integer conv2d (int8 input, int16 weights, int32 accumulation), GDN/IGDN with int16 reciprocal.
8. **Container format v2:** New header with neural model length, separate latent/hyper/residual rANS streams. Version byte distinguishes v1 (wavelet) and v2 (neural).

## Implementation milestones (binding gates)

- **E1-A: Training infrastructure (3 days)**
  - [ ] 1. `prism/scripts/gen_training_data.py` - procedural texture generator
  - [ ] 2. `prism/scripts/train_neural_codec.py` - three-phase training protocol
  - [ ] 3. `prism/scripts/export_weights.py` - int16 weight exporter
  - [ ] 4. `prism/scripts/eval_neural_codec.py` - Kodak-24 evaluation
- **E1-B: Integer inference engine (2 days)**
  - [ ] 5. `prism/src/codec/neural_codec.cpp` - int8/int16 inference engine
  - [ ] 6. `prism/include/prism/codec/neural_codec.h` - API
  - [ ] 7. Unit tests: forward pass matches PyTorch within tolerance
- **E1-C: Integration (2 days)**
  - [ ] 8. New container format (version 2) in `prism/src/codec/container.cpp`
  - [ ] 9. Encoder path: g_a -> quantize -> h_a -> quantize -> entropy code
  - [ ] 10. Decoder path: entropy decode -> g_s -> residual add
  - [ ] 11. Round-trip tests on Kodak-24
- **E1-D: Measurement (1 day)**
  - [ ] 12. Full Kodak-24 measurement with `bench_gate.sh`
  - [ ] 13. Dual-unit gate check (M2, M3)
  - [ ] 14. Honest ledger and escalation

## Gate checks (binding, pre-registered)

- **E1-1:** Reconstruction quality: MSE < 0.5, byte-exact round-trip 24/24, fuzz clean.
- **E1-2:** Entropy rate < 3.0 per-sample on synthetic data, model size <= 100 KB.
- **E1-3:** M2: summed < 9.498 AND per-sample < 3.166, byte-exact 24/24, fuzz clean.
- **E1-4:** M3: summed < 8.655 AND per-sample < 2.885, byte-exact 24/24, fuzz clean.

## Risks

- Neural codec fails to clear M3 -> fallback chain: hybrid mode, JXL-Modular, learned entropy.
- Training overfits to synthetic data -> diverse procedural corpus, validate on Kodak (never train on Kodak).
- Integer inference precision loss -> careful rounding, tolerance tests, comparison with PyTorch.
- Container v2 breaks existing tools -> version byte, separate decode path, backward-compatible decoder.

## Next steps

- Builder to scaffold project tree and implement training data generator and training script.
- Training: run Phase 1-3 on synthetic corpus, export baked weights.
- Inference: implement integer inference engine, validate against PyTorch.
- Integration: extend container encoder/decoder, implement residual coding path.
- Measurement: run full Kodak-24 measurement, check gates E1-1 through E1-4.

---

*Blueprint for #226. Refs #226.*

- the Architect
