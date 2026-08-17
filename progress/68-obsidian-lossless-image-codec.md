# Progress - Obsidian (lossless image codec)

- **Issue:** #68
- **Branch:** opencode/issue68-20260817120528
- **Status:** in-progress
- **Updated:** 2026-08-17T12:10:00Z

## Checklist
- [x] Research phase: literature review, SOTA survey, algorithmic spec, benchmark methodology
- [x] obsidian/docs/ (research.md, algorithmic-spec.md, benchmark-methodology.md)
- [x] ideas/ entry for the project
- [ ] Architect: software architecture from the spec (docs/architecture.md)
- [ ] 1. Scaffolding: Cargo workspace (core/cli/web), PPM P6 I/O, container header + CRC, CLI skeleton
- [ ] 2. Color transforms: YCoCg-R + palette, bijection unit tests
- [ ] 3. Predictor bank (8 predictors) + border handling + per-context predictor map (analysis pass)
- [ ] 4. Context model: gradient quantization, sign symmetry, activity class, border contexts, zigzag map
- [ ] 5. rANS: adaptive (12-bit) + static tables, renorm guard, stream finalization, property tests
- [ ] 6. Effort levels 0-7 wiring, decode path complete, effort 0 end-to-end first
- [ ] 7. Fidelity gates: bit-exact round trips (Kodak + fuzz) at every effort
- [ ] 8. Benchmark harness: run_kodak.sh, fuzz_gate.sh, aggregate.py, toolchain.md + reference baseline
- [ ] 9. M1: beat WebP lossless + optipng PNG on Kodak
- [ ] 10. M2: self-correcting weighted predictor (v1.5), within 10% of JPEG XL
- [ ] 11. M3: squeeze/interlacing or improved context model, ~3% of or above JPEG XL
- [ ] 12. Web specimen page + wasm bindings + Playwright verification
- [ ] 13. Docs: README, architecture reference, benchmark tables

## Current step
Research phase complete. The literature review, v1 algorithmic specification,
and benchmark methodology are committed in `obsidian/docs/`. The reference
landscape on Kodak is established (PNG ~4.2, JPEG-LS ~3.7, WebP ~3.4-3.5,
FLIF ~3.1, JPEG XL ~3.1-3.3 bpp), the milestones M1/M2/M3 are defined against
a pinned baseline, and the design decisions (predictor bank + per-context
selection, gradient + activity contexts, adaptive rANS, YCoCg-R, effort
levels) are specified. Ready for the Architect.

## Next steps
- Architect: design the software architecture from the spec (Cargo workspace,
  module breakdown, public API, data structures, effort pipeline, test matrix,
  milestone mapping).
- Builder: scaffold the Cargo workspace, PPM I/O, container header + CRC, and
  the CLI skeleton; implement color transforms and the predictor/context/rANS
  stack bottom-up (effort 0 first); run the fidelity gates; compute the
  reference baseline and the first Obsidian Kodak row.
- Reviewer / Tester: quality gate, dynamic round-trip + benchmark verification.

## Agent log
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