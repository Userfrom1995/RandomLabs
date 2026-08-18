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

---

# Benchmark harness + first Kodak row (Builder phase, 2026-08-17)

The codec core (effort 0-7, bit-exact, 46 lib tests) is merged via PR #76.
This phase (issue #77) delivered the measurement loop that makes the project
benchmark-driven:

- `benchmarks/toolchain.md` - pinned reference toolchain: cjxl 0.7.0, cwebp
  1.3.2, optipng 0.7.8, pngcrush 1.8.13, ImageMagick 6.9.12 (J2K via OpenJPEG
  2.5.0), and CharLS 2.4.2 built from pinned source with a small `cjls` PPM
  CLI (`benchmarks/tools/cjls.cpp`, built by `build_toolchain.sh`).
- `benchmarks/data/kodak.sha256` - the Kodak PCD0992 suite (24 images, 768x512,
  RGB) normalized to binary P6 PPM and pinned by hash; the PPMs are git-ignored
  and match both r0k.us and the Kaggle mirror byte-for-byte.
- `benchmarks/run_kodak.sh` - manifest check, then per codec a decode + `cmp`
  fidelity gate, then encode/decode timing, emitting
  `results/<date>-<version>.csv`.
- `benchmarks/fuzz_gate.sh` - randomized small-image round-trips at efforts
  0/4/7 as the pre-benchmark gate.
- `benchmarks/aggregate.py` - arithmetic mean bpp (headline) + geometric mean
  of per-image size ratios.
- `benchmarks/README.md` - headline table, per-image table, trend.

## Reference baseline (canonical PCD0992)

| Codec | Mean bpp |
|---|---|
| JPEG XL (cjxl 0.7.0, e7) | 8.7062 |
| JPEG-LS (CharLS 2.4.2, HP1) | 9.7113 |
| JPEG 2000 (OpenJPEG 2.5.0) | 9.5762 |
| WebP (cwebp 1.3.2, z9 m6) | 9.6130 |
| PNG (pngcrush -brute) | 12.9815 |
| PNG (optipng -o7) | 13.0518 |
| **Obsidian v1 (effort 4)** | **27.8226** |

These references match the independent WangXuan95 2024 lossless benchmark on
the same corpus within ~0.5%, confirming the harness measures the canonical
dataset correctly (the ~3-4 bpp figures in some papers are a downsampled
subset). Obsidian v1 is bit-exact but not yet competitive; the M1 (beat WebP +
PNG) / M2 (within 10% of JXL) / M3 (within ~3% of JXL) milestones are the
optimization loop, each recorded as a new trend row.

Next: milestone optimization (`/oc continue`).

- the Builder

---

## Architect v2 addendum - entropy-stage architecture (2026-08-18)

The first Obsidian Kodak row (effort 4) measured **27.82 bpp** (1.16x raw RGB),
a guaranteed expansion caused entirely by the entropy stage: a per-context
adaptive rANS over a 512-symbol alphabet cannot specialize its tables on a
768x512 image (each of ~285 contexts gets only ~4138 symbols vs the ~2048
increments needed). Prediction, YCoCg-R, the context model, and the container
are correct and preserved.

**Architectural fix:** make the entropy stage a replaceable backend behind a
stable container flag rather than a single hard-coded rANS coder. The full
blueprint is in `obsidian/docs/entropy-architecture.md`; summary:

- New header flag `ENTROPY_GR` (flags bit 4). When set, per-plane payloads are
  per-context adaptive Golomb-Rice (Design A) bitstreams; when clear, the legacy
  rANS path remains (and becomes Design B at M2/M3).
- GR needs **zero model bytes**: both sides adapt the per-context `k` from the
  symbols they decode, so `k` is mirrored, signaled state. The model section
  keeps only the predictor map / transform / palette; `static_histograms` is
  `None` for GR.
- New primitives live in `rans.rs`: `BitWriter`/`BitReader`, `GrState` (k + bias
  counter, JPEG-LS update), `map`/`unmap` (signed residual -> Rice codeword),
  `gr_write_symbol`/`gr_read_symbol`. The per-pixel loops in `encoder.rs`
  (`code_planes`) and `decoder.rs` swap the rANS table calls for GR calls; no
  dry-run/reverse coding is needed (GR is forward streaming).
- `model.rs::analyze` gains an `entropy_gr: bool` argument; when true it skips
  the static-histogram collection.
- M0 (blocker): GR as the default drops bpp below raw 24 and below optipng PNG
  13.05. M1: with the existing per-context predictor selection + YCoCg-R, below
  WebP 9.61. M2/M3: capped-and-escaped static rANS (Design B) and/or
  self-correcting weighted predictor, toward JPEG XL 8.71.

Only `encoder.rs`, `decoder.rs`, `rans.rs` (plus the `Header` flag and the
`analyze` signature) are in scope; the rest is preserved.

- the Architect