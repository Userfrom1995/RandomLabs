# Obsidian - lossless image-compression codec (Kodak-benchmarked)

The factory's priority project (issue #68, owner-directed, 2026-08-16T08:17Z).
A lossless image codec that competes with, and ideally outperforms, JPEG XL and
WebP lossless on the Kodak dataset. No new ideas or projects are started until
this is achieved or shown unviable.

## What it is

A from-scratch lossless codec: encoder + decoder, bit-exact reversible, with a
rigorous benchmark loop on Kodak (24 images, 768x512, 24-bit RGB). The design
marries the two proven ideas that make JPEG XL the practical lossless leader:

- **Per-pixel-quality prediction**: a bank of causal predictors (Left, Top,
  TL, TR, Avg, MED, GAP-lite, weighted average) where the encoder learns a
  per-context predictor map, plus a self-correcting weighted predictor as the
  v1.5 upgrade.
- **Context-modeled rANS entropy coding**: quantized-gradient contexts with
  sign symmetry and an activity class, coded with adaptive rANS (12-bit
  tables), giving fractional-bit coding that Huffman-based WebP structurally
  cannot reach.

Plus a reversible YCoCg-R color transform, an optional palette transform, and
a per-image adaptive selection between all of the above. Complexity is O(pixels)
in time for encode and decode, with a few MB of context tables.

## Realistic trajectory (from the literature review)

Kodak mean bpp, literature ranges: PNG optimized ~4.2, JPEG-LS ~3.7, WebP
lossless ~3.4-3.5, FLIF ~3.1, JPEG XL lossless ~3.1-3.3, MRP/context-mixing
~2.6-2.8 (impractical speed). An independent 2024 aggregate benchmark confirms
JPEG XL smallest, WebP ~7.5% larger, optipng PNG ~28% larger, and a 2021 study
(Barina) confirms FLIF narrowly ahead of JPEG XL only at a heavy decode-speed
cost. The direction is clearly viable: the building blocks are published
science and the gap from a clean implementation to the practical SOTA is small.

Milestones: M1 beat WebP + PNG; M2 within 10% of JPEG XL; M3 within ~3% of or
above JPEG XL. Every iteration records a benchmark row.

## Why the factory

- **Researcher** (this entry): literature review + algorithmic spec + benchmark
  methodology (see `obsidian/docs/`).
- **Architect**: software architecture for the encoder/decoder + benchmark CLI.
- **Builder / Fixer**: benchmark-driven implementation, iteration by iteration.
- **Reviewer / Tester**: quality gate and dynamic verification (bit-exact
  round trips, Kodak comparisons, speed).
- **Maintainer**: tracks the milestone curve; resumes via `/oc continue` until
  the goal is met or evidence shows it is not.

## Deliverables (research phase)

- `obsidian/docs/research.md` - literature review and SOTA survey on Kodak
  lossless rates, with design conclusions.
- `obsidian/docs/algorithmic-spec.md` - v1 codec specification: container,
  YCoCg-R transform, predictor bank + per-context map, gradient + activity
  contexts, adaptive rANS, effort levels, complexity, fidelity guarantees.
- `obsidian/docs/benchmark-methodology.md` - reproducible Kodak protocol:
  pinned toolchain, canonical PPM ground truth, metrics, fidelity gate,
  milestone criteria.

## Handoff

Next pipeline step: Architect (`/oc architect`).

- Dr. Mob, the Researcher

---

# Architecture (blueprint phase, 2026-08-17)

## Summary

A Cargo workspace for the codec: a zero-dependency `obsidian-core` library
(container, PPM I/O, YCoCgR + palette, predictor bank, gradient/activity
contexts, adaptive/static rANS, encoder/decoder), a `obsidian-cli` crate
(encode/decode/roundtrip/selftest/bench/check), and a dependency-free JS mirror
plus an interactive specimen page (`obsidian/web`) that reproduces the codec
byte-for-byte in the browser (the factory's proven Meridian pattern, no wasm).
The rANS formulation is pinned with concrete constants (M = 4096, renorm bound
2^20, byte-wise stack renorm) so the Builder implements the correct variant
first try; correctness is enforced by per-stage property tests.

## Why it is shaped this way

- **Milestone-first build order:** effort 0 (MED + single context + adaptive
  rANS) end-to-end and fuzz-verified before predictors, contexts, and effort
  levels accumulate. Each milestone (M1/M2/M3) maps to a build step with a
  numeric gate.
- **rANS only:** one entropy coder keeps encode/decode symmetric; adaptive by
  default, static at effort >= 6, property-tested against pathological tables.
- **Effort = encoder-side model search:** identical bitstream for all efforts,
  one decoder path for the Tester to verify.
- **Per-stage bijection property tests** plus the Kodak + fuzz fidelity gates
  and the header CRC: fidelity is machine-checked, not asserted.
- **JS mirror over wasm:** dependency-free, statically hostable, byte-exact
  consistency-tested against the Rust core (Meridian precedent).

## How it works

Two-pass encode for effort >= 1 (analysis pass builds the per-context predictor
map, context reduction, weight codebook, and static tables; coding pass emits
residuals through per-context rANS, pushed in reverse raster order). Decode is a
single pass: header, model section, residual reconstruction, inverse transform,
palette expand, CRC cross-check. All stages are integer bijections on the
`[0, 255]` plane space.

## Module breakdown

- `crates/obsidian-core`: header/crc32, image, ppm, color, predict, context,
  model, rans, encoder, decoder.
- `crates/obsidian-cli`: cli (subcommands) + bench (Kodak runner, fuzz gate).
- `benchmarks/`: pinned toolchain, kodak.sha256, run_kodak.sh, fuzz_gate.sh,
  aggregate.py, results/ CSV + trend tables.
- `web/`: index.html, style.css, js/codec.js (mirror), js/ui.js, samples/.
- `tests/`: consistency.test.mjs (JS vs Rust byte-exact), ui.test.mjs (DOM).

## Test matrix

Per-module unit tests (known vectors, exhaustive small inputs, property tests);
integration round-trip on Kodak + fuzz at efforts 0/4/7; determinism and
corruption tests; JS/Rust byte-consistency suite; Playwright/UI checks for the
specimen page. Full matrix in `obsidian/docs/architecture.md` section 11.

## Deliverables

- `obsidian/docs/architecture.md` - the software architecture blueprint
  (workspace, modules, data structures, definitive rANS, container layout,
  effort pipeline, complexity budget, test matrix, milestone mapping).

Next pipeline step: Builder (`/oc build this`).

- the Architect