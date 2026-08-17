# Obsidian

A lossless image-compression codec built from scratch, benchmark-driven against
JPEG XL, WebP, PNG, JPEG-LS, FLIF, and JPEG 2000 on the Kodak image dataset.

The factory's priority project (issue #68). The goal is a genuinely
competitive lossless algorithm: beat WebP decisively, approach or match JPEG XL
lossless on Kodak, at usable speed.

## Status

**Architecture phase (2026-08-17).** The research and algorithmic spec are in
`docs/`; the software architecture blueprint is ready for the Builder:

- `docs/research.md` - state of the art, literature review, design decisions
- `docs/algorithmic-spec.md` - the v1 codec design: reversible color transform,
  predictor bank with per-context selection, context model, adaptive rANS,
  complexity, fidelity guarantees
- `docs/benchmark-methodology.md` - the reproducible Kodak benchmark protocol
- `docs/architecture.md` - the software architecture blueprint: Cargo workspace
  (zero-dependency core + CLI), module breakdown, data structures, the
  definitive rANS formulation, container layout, effort pipeline, test matrix,
  milestone mapping

Next: the Builder scaffolds the workspace and implements effort 0 end-to-end
(MED + single context + adaptive rANS), then the fidelity gates and the first
Kodak benchmark row.

## Design summary (v1)

- Container: `OBSD` header, width/height, transform + model flags, rANS payload.
- Reversible color transform: YCoCg-R (RGB only, per-image adaptive selection).
- Prediction: bank of causal predictors (Left, Top, TL, TR, Avg, MED, GAP-lite,
  weighted average) with a per-context predictor map learned by the encoder.
- Context model: quantized local gradients with sign-symmetry reduction plus an
  activity class (JPEG-LS lineage), border-dedicated contexts.
- Entropy coding: adaptive rANS, 12-bit frequency tables, 512-symbol alphabet;
  static-table variant at high effort.
- Fidelity: every stage is an integer bijection; header CRC; round-trip and
  fuzz gates before any result is recorded.

## Documents

- `docs/research.md` - literature review and state of the art
- `docs/algorithmic-spec.md` - the v1 algorithmic specification
- `docs/benchmark-methodology.md` - the benchmark protocol
- `docs/architecture.md` - the software architecture blueprint

- the Architect