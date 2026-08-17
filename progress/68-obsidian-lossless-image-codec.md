# Progress - Obsidian (lossless image codec)

- **Issue:** #68
- **Branch:** opencode/issue68-20260817120528
- **Status:** in-progress
- **Updated:** 2026-08-17T12:10:00Z

## Checklist
- [x] Research phase: literature review, SOTA survey, algorithmic spec, benchmark methodology
- [x] obsidian/docs/ (research.md, algorithmic-spec.md, benchmark-methodology.md)
- [x] ideas/ entry for the project
- [x] Architect: software architecture from the spec (docs/architecture.md)
- [ ] 1. Scaffolding: Cargo workspace (core/cli), PPM P6/P5 I/O, container header + CRC, CLI skeleton (encode/decode/roundtrip/selftest/check)
- [ ] 2. rANS core: adaptive tables, definitive constants (M=4096, RNB=2^20), renorm guard, finish/get stack discipline, property tests
- [ ] 3. Effort 0 end-to-end: MED predictor + single context set + adaptive rANS; decode path complete; Kodak + fuzz round-trip at effort 0
- [ ] 4. Color transforms: YCoCg-R + palette build/expand, bijection unit tests, per-image adaptive selection
- [ ] 5. Predictor bank (8 predictors) + border handling + weighted codebook
- [ ] 6. Context model: gradient quantization, sign symmetry, activity class, border contexts, zigzag map (all bijection-tested)
- [ ] 7. Analysis pass + per-context predictor map + context reduction + model serialization (effort 1-5)
- [ ] 8. Static rANS tables + palette + effort 6-7 wiring; fidelity at every effort
- [ ] 9. Fidelity gates: bit-exact round trips (Kodak + fuzz) at efforts 0/4/7; determinism + corruption tests
- [ ] 10. Benchmark harness: run_kodak.sh, fuzz_gate.sh, aggregate.py, toolchain.md + reference baseline + first Obsidian Kodak row
- [ ] 11. M1: beat WebP lossless + optipng PNG on Kodak
- [ ] 12. M2: self-correcting weighted predictor (v1.5), within 10% of JPEG XL
- [ ] 13. M3: squeeze/interlacing or improved context model, ~3% of or above JPEG XL
- [ ] 14. Web specimen page + JS mirror (byte-exact) + consistency tests + Playwright/UI verification
- [ ] 15. Docs: README, benchmark tables, landing page entries

## Current step
Architecture phase complete. The software architecture blueprint is committed
in `obsidian/docs/architecture.md`: two-crate Cargo workspace (zero-dependency
obsidian-core + obsidian-cli), per-module responsibilities and interfaces, the
definitive rANS formulation (TBITS=12, M=4096, renorm bound RNB=2^20,
byte-reversed stack emission + 4-byte BE trailing state), concrete container
layout (header + model section + payload), effort pipeline (0-7,
encoder-side model search only, identical bitstream), complexity budget
(<= 2 MiB tables, O(n) time), the full test matrix (per-module property tests,
Kodak + fuzz gates, JS/Rust byte-consistency, UI), and the milestone-to-build
order (effort 0 first, then predictors/contexts/effort levels, then M1/M2/M3).
The ideas entry and README are updated. Ready for the Builder.

## Next steps
- Builder: scaffold the Cargo workspace (obsidian-core, obsidian-cli), PPM I/O,
  container header + CRC, and the CLI skeleton; implement rANS (adaptive) with
  property tests; get effort 0 (MED + single context) end-to-end and
  fuzz-verified; then add color transforms, the predictor bank, the context
  model, the analysis pass, and effort levels 0-7; run the fidelity gates;
  compute the reference baseline and the first Obsidian Kodak row.
- Reviewer / Tester: quality gate, dynamic round-trip + benchmark verification.

## Agent log
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