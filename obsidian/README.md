# Obsidian

A lossless image-compression codec built from scratch, benchmark-driven against
JPEG XL, WebP, PNG, JPEG-LS, FLIF, and JPEG 2000 on the Kodak image dataset.

The lab's priority project (issue #68). The goal is a genuinely
competitive lossless algorithm: beat WebP decisively, approach or match JPEG XL
lossless on Kodak, at usable speed.

## Status

**Benchmark harness + first Kodak row (2026-08-17).** The codec core is
implemented and green (46 lib tests, bit-exact round trips at every effort);
the benchmark harness now pins the reference toolchain, verifies the Kodak
manifest, runs the fidelity gate, and records the reference baseline plus the
first Obsidian Kodak row:

- **Obsidian v1 (effort 4): mean 27.82 bpp** (32,820,825 bytes total)
- References (pinned, canonical PCD0992): JPEG XL 8.71 bpp, WebP 9.61 bpp,
  JPEG-LS 9.71 bpp, J2K 9.58 bpp, PNG ~13.0 bpp

**M0 (2026-08-18): entropy backend swapped to per-context adaptive
Golomb-Rice (Design A, `ENTROPY_GR` flag).** This kills the 27.82 bpp expansion:
the new backend is the default at every effort and the 53 lib tests stay green
and bit-exact. The true Kodak row is pending (`data/kodak` PPMs and the
reference toolchain are git-ignored / not installed in the build env, so
`benchmarks/run_kodak.sh` cannot run here). A synthetic photographic probe
(768x512 RGB, smooth gradient plus mild noise) measures **11.6 bpp at effort 4**
and **15.6 bpp at effort 0**, both far below the raw 24.0 bpp and below the PNG
13.05 gate; real Kodak residuals are smaller after MED prediction, so the Kodak
mean will sit lower. The M1 gate is beating WebP 9.61, still open.

The Obsidian row is bit-exact (fidelity gate passed); the M1/M2/M3 milestones
are the optimization loop. Full tables and trend in `benchmarks/README.md`.

- `docs/research.md` - state of the art, literature review, design decisions
- `docs/algorithmic-spec.md` - the v1 codec design: reversible color transform,
  predictor bank with per-context selection, context model, adaptive rANS,
  complexity, fidelity guarantees
- `docs/benchmark-methodology.md` - the reproducible Kodak benchmark protocol
- `docs/architecture.md` - the software architecture blueprint: Cargo workspace
  (zero-dependency core + CLI), module breakdown, data structures, the
  definitive rANS formulation, container layout, effort pipeline, test matrix,
  milestone mapping
- `benchmarks/` - pinned toolchain, Kodak manifest, `run_kodak.sh`,
  `fuzz_gate.sh`, `aggregate.py`, results CSV + trend tables

Next: milestone optimization - beat WebP and PNG (M1), then approach JPEG XL
(M2/M3), re-running `benchmarks/run_kodak.sh` after every change.

## Design summary (v1)

- Container: `OBSD` header, width/height, transform + model flags, rANS payload.
- Reversible color transform: YCoCg-R (RGB only, per-image adaptive selection).
- Prediction: bank of causal predictors (Left, Top, TL, TR, Avg, MED, GAP-lite,
  weighted average) with a per-context predictor map learned by the encoder.
- Context model: quantized local gradients with sign-symmetry reduction plus an
  activity class (JPEG-LS lineage), border-dedicated contexts.
- Entropy coding: per-context adaptive Golomb-Rice (default, `ENTROPY_GR` flag,
  bit 4) with an integer-EMA divisor exponent per context; the adaptive rANS
  backend remains selectable via the same flag bit being clear. GR is the M0
  fix for the 27.82 bpp expansion.
- Fidelity: every stage is an integer bijection; header CRC; round-trip and
  fuzz gates before any result is recorded.

## Documents

- `docs/research.md` - literature review and state of the art
- `docs/algorithmic-spec.md` - the v1 algorithmic specification
- `docs/benchmark-methodology.md` - the benchmark protocol
- `docs/architecture.md` - the software architecture blueprint

- the Architect