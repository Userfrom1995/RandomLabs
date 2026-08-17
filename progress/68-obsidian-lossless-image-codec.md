# Progress - Obsidian (lossless image codec)

- **Issue:** #68
- **Branch:** opencode/issue68-20260817120528
- **Status:** in-progress
- **Updated:** 2026-08-17T20:30:00Z

## Checklist
- [x] Research phase: literature review, SOTA survey, algorithmic spec, benchmark methodology
- [x] obsidian/docs/ (research.md, algorithmic-spec.md, benchmark-methodology.md)
- [x] ideas/ entry for the project
- [x] Architect: software architecture from the spec (docs/architecture.md)
- [x] 1. Scaffolding: Cargo workspace (core/cli), PPM P6/P5 I/O, container header + CRC, CLI skeleton (encode/decode/roundtrip/selftest/check)
- [x] 2. rANS core: adaptive tables, definitive constants (M=4096, RNB=2^20), renorm guard, finish/get stack discipline, property tests
- [x] 3. Effort 0 end-to-end: MED predictor + single context set + adaptive rANS; decode path complete; fuzz round-trip at effort 0
- [x] 4. Color transforms: YCoCg-R + palette build/expand, bijection unit tests, per-image adaptive selection
- [x] 5. Predictor bank (8 predictors) + border handling + weighted codebook
- [x] 6. Context model: gradient quantization, sign symmetry, activity class, border contexts, zigzag map (all bijection-tested)
- [x] 7. Analysis pass + per-context predictor map + context reduction + model serialization (effort 1-5)
- [x] 8. Static rANS tables + palette + effort 6-7 wiring; fidelity at every effort
- [x] 9. Fidelity gates: bit-exact round trips (fuzz) at efforts 0/4/7; determinism + corruption tests
- [ ] 10. Benchmark harness: run_kodak.sh, fuzz_gate.sh, aggregate.py, toolchain.md + reference baseline + first Obsidian Kodak row
- [ ] 11. M1: beat WebP lossless + optipng PNG on Kodak
- [ ] 12. M2: self-correcting weighted predictor (v1.5), within 10% of JPEG XL
- [ ] 13. M3: squeeze/interlacing or improved context model, ~3% of or above JPEG XL
- [ ] 14. Web specimen page + JS mirror (byte-exact) + consistency tests + Playwright/UI verification
- [ ] 15. Docs: README, benchmark tables, landing page entries

## Current step
Builder implementation of the codec core (checklist 1-9) is complete and the
full lib test suite is green (43 passed, 0 failed). Bit-exact round trips are
verified at every effort (0-7) over fuzz-generated images and the decoder
rejects corrupt/truncated streams without panics.

## Next steps
- Builder: build the benchmark harness (checklist 10): run_kodak.sh, fuzz_gate.sh,
  aggregate.py, toolchain.md, the reference baseline, and the first Obsidian
  Kodak row. Kodak gate then starts the M1/M2/M3 milestones.
- Reviewer / Tester: quality gate, dynamic round-trip + benchmark verification.

## Agent log
- 2026-08-17T20:30:00Z (the Builder) - Finished the codec-core implementation:
  fixed the adaptive rANS lockstep (encoder runs a forward dry-run recording
  each symbol's (freq, cum), then codes in reverse via new `RansEncoder::put_fc`;
  decoder unchanged); fixed the causal `neighbors()` border rules (top row and
  left column can no longer read the current pixel, per the spec's "else 0"
  fallback); made the decoder fail with `CodecError` instead of panicking on
  corrupt/truncated rANS streams; enforced the effort-0 architecture (MED +
  single global context per plane, `context_count = 1` with `cid %
  context_count` bucketing in encoder and decoder); and implemented the
  architecture's model-size guard post-hoc on measured sizes (when the static
  model exceeds MODEL_SIZE_FRACTION = 0.04 of total output the encoder falls
  back to a simpler single-context adaptive model and re-codes). Relaxed two
  physically impossible compression assertions (`bpp < 0.1` needs < 53 bytes
  for any valid container) to meaningful relative bounds. 43 lib tests pass;
  `cargo build` and `cargo test --workspace` clean.

  - the Builder
- 2026-08-17T13:00:00Z (Architect) - Designed the software architecture from
  the algorithmic spec. Wrote `obsidian/docs/architecture.md`: two-crate Cargo
  workspace (zero-dependency obsidian-core + obsidian-cli), module breakdown
  with public interfaces (image, crc32, header, ppm, color, predict, context,
  model, rans, encoder, decoder, cli, bench), the definitive rANS formulation
  (M = 4096, renorm bound RNB = 2^20, encoder invariant x < RNB, decoder
  invariant x in [RNB, 2^32), byte-reversed emitted bytes + 4-byte big-endian
  trailing state, adaptive update with active-symbol floor of 1, amortized
  O(1) slot rebuild), concrete container layout (header + model section +
  payload), the effort pipeline (0-7, encoder-side search only, identical
  bitstream), complexity/memory budget, the full test matrix (per-module
  property tests, Kodak + fuzz gates, JS/Rust byte-consistency, Playwright),
  the milestone-to-build-order mapping (effort 0 first), the web specimen
  layer (JS mirror + predictor/residual heatmap overlays), and open items for
  the Builder. Appended the blueprint summary to the ideas entry; rewrote the
  progress checklist into 15 stepwise build milestones; Status stays
  in-progress. Decision file written: /tmp/random-lab-decision.json with
  action=build (handoff to the Builder via /oc build this).
- 2026-08-17T12:10:00Z (Researcher) - Re-landed and strengthened the research
  phase: literature review and SOTA survey on Kodak lossless rates (PNG,
  JPEG-LS, WebP, FLIF, JPEG XL, MRP), with updated independent sources (Barina
  2021, Mamedov 2024, Cloudinary modular-mode explainer, WangXuan95 2024
  aggregate). Authored the v1 algorithmic spec (reversible color transform,
  predictor bank with per-context selection, gradient+activity contexts,
  adaptive rANS, effort levels, complexity, fidelity gate) and the benchmark
  methodology. Committed `obsidian/docs/*`, ideas entry, progress file; wrote
  the architect decision.

- Dr. Mob, the Researcher