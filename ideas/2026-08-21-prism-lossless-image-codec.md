# Prism - next-gen lossless image codec (C++17, Kodak-target: beat JPEG XL)

The lab's priority project (issue #103, owner-directed, 2026-08-21). Prism is
the C++17 successor to Obsidian (issue #68), which plateaued at 9.5208 bpp on
Kodak. The gap to JPEG XL (8.71 harness) is a *redundancy-class* gap: Obsidian's
per-pixel CMARC coder was already at H(p)+epsilon yet still plateaued, because
the missing pieces are multi-resolution Squeeze (JPEG XL CDC) coupled with a
meta-adaptive MA-tree context model. Prism couples both.

## What it is

A from-scratch lossless codec in C++17: encoder + decoder, bit-exact reversible,
with a rigorous benchmark loop on Kodak (24 images, 768x512, 24-bit RGB). The
design marries the two proven ideas that make JPEG XL the practical lossless
leader and adds the differentiator Obsidian lacked:

- **Format-agnostic front-end**: PNG/JPEG/BMP/TGA/HDR via stb_image, PPM
  (P5/P6/PPM16), raw with explicit dimensions/bit-depth, and WebP/TIFF behind
  CMake options, all normalized to a canonical raster.
- **Reversible color decorrelation set**: YCoCg-R, subtract-green, CFL, and a
  5/3 lifting wavelet, selected per image. (M0 ships a verified-reversible
  YCoCg-R after the original transform's modular-bias bug was fixed.)
- **Mandatory Squeeze** (JPEG XL CDC, post-order emit) with LLC/sibling MA-tree
  feature classes, so Squeeze is never inert (the Obsidian R11-A lesson).
- **Predictor bank + weighted least-squares**: Left/Top/TL/TR/Avg/MED/GAP plus a
  self-correcting weighted predictor.
- **MA-tree context model (Stage X, the differentiator)**: a meta-adaptive
  context tree whose leaf is selected by Squeeze-derived features
  (`llc_class`/`sibling_class`); single-leaf at M0, capped depth/leaf count as it
  grows.
- **Context-modeled rANS entropy** with binary adaptation (logistic mixer + SSE)
  and LZP high-effort modes, behind a stable `PRSM` container with `crc32_model`
  and `crc32_all` gates. M0 ships a correct 32-bit rANS (ryg port) with a fixed
  per-bin model + Elias-gamma magnitudes and the H(p)+epsilon efficiency gate;
  adaptive context modeling is deferred to M1.

Complexity is O(pixels) in time for encode and decode, with a few MB of context
tables.

## Realistic trajectory (from the literature review)

Kodak mean bpp, literature ranges: PNG optimized ~4.2, JPEG-LS ~3.7, WebP
lossless ~3.4-3.5, FLIF ~3.1, JPEG XL lossless ~3.1-3.3. Obsidian measured
9.5208 at its plateau (a 27.82 bpp early expansion was its own Golomb-Rice bug).
The direction is viable: the building blocks are published science and the
redundancy-class coupling (Squeeze + MA-tree) is the proven JPEG XL mechanism
that Obsidian never implemented. M0's bit-exact round-trip + corruption-rejection
fuzz gate is the hard invariant; M1-M4 are the optimization loop, each recorded
as a benchmark row.

- M0 (blocker): bit-exact round-trip at efforts 0/4/7 + corruption rejection.
- M1: beat PNG (13.05) + WebP (9.61).
- M2: beat JPEG-LS (9.71).
- M3 (owner goal): beat JPEG XL (8.71 harness) - requires Squeeze + MA-tree.
- M4 (stretch): CM mode + LZP toward < 8.0.

## Why the lab

- **Researcher (Dr. Mob)**: literature review + algorithmic spec + benchmark
  methodology (see `prism/docs/`).
- **Architect**: software architecture for the encoder/decoder + container byte
  format + MA-tree serialization (see `prism/docs/architecture.md`).
- **Builder / Fixer**: benchmark-driven implementation, iteration by iteration.
- **Reviewer / Tester**: quality gate and dynamic verification (bit-exact
  round trips, Kodak comparisons, speed).
- **Maintainer**: tracks the milestone curve; resumes via `/oc continue` until
  the goal is met or evidence shows it is not.

## Deliverables (research + architecture phase)

- `prism/docs/research.md` - literature review and SOTA survey; the redundancy-class diagnosis.
- `prism/docs/algorithmic-spec.md` - full algorithm contract: front-end, color set, Squeeze, predictor bank, MA-tree, rANS, container, milestone map.
- `prism/docs/architecture.md` - the binding build contract: C++ module layout, exact container byte format, MA-tree pre-order serialization, build order B0-B9 gated on M0.
- `prism/docs/benchmark-methodology.md` - reproducible Kodak protocol with the explicit (summed) bpp definition, fuzz + corruption fidelity gates, numeric milestone acceptance.

## Handoff

Next pipeline step: Builder (`/oc build this`) implements `prism/` per the
architecture contract, gated on M0 (bit-exact round-trip + corruption rejection)
before any optimization.

- Dr. Mob, the Researcher

---

# Architecture (blueprint phase, 2026-08-21)

## Summary

A CMake C++17 project for the codec: a `prism` library (container, front-end,
color, predict, rans, matree, squeeze, analyze), a CLI (`prism enc/dec/fuzz/
info`), and a unit-test suite (gtest, vendored). The `PRSM` container is a 4-byte
magic (`PRSM`), LE header, bit-packed model blob with `crc32_model`, post-order
payload per band, and a `crc32_all` footer so corruption is hard-rejected. The
MA-tree is serialized pre-order with implicit child pairing.

## Why it is shaped this way

- **M0 first, optimization never before it**: the build order B0-B9 ships a
  bit-exact, fuzz-gated codec before any Squeeze/MA-tree tuning, so every later
  milestone is measured against a correct baseline.
- **Stable container, swappable entropy**: the byte format is fixed at version 1
  so the entropy backend (fixed-prob rANS + gamma at M0, adaptive at M1) can be
  upgraded without breaking the decodability contract.
- **Squeeze is mandatory with MA-tree feature classes** so it is never inert.
- **Machine-checked fidelity**: unit tests for color reversal, rANS
  H(p)+epsilon, container corruption rejection, and a fuzz gate enforce the
  bit-exact invariant rather than asserting it.

## Module breakdown

- `prism/include/prism/*.h` - public types, codec headers.
- `prism/src/common` - crc32, bitstream.
- `prism/src/codec` - color, predict, rans, matree, squeeze, container, analyze.
- `prism/src/frontend` - ppm, stb_image, frontend.
- `prism/src/cli` - main.cpp.
- `prism/tests/unit` - gtest cases.
- `prism/benchmarks` - kodak harness, fuzz gate, aggregate.

## Test matrix

Per-module unit tests (color dense-lattice reversal, rANS efficiency vs entropy,
container corruption rejection, bitstream round-trip, CRC32 vectors, fuzz gate);
CLI end-to-end PPM round-trip; `prism fuzz` randomized small-image round-trips
with corruption injection. Full matrix in `prism/docs/architecture.md`.

## Deliverables

- `prism/docs/architecture.md` - the software architecture blueprint (modules,
  container byte format, MA-tree serialization, build order, milestone mapping).

Next pipeline step: Builder (`/oc build this`).

- the Architect

---

# M0 codec (Builder + Fixer phases, 2026-08-21)

The M0 codec is merged via PR #104: a bit-exact, fuzz-gated C++17 codec that
builds clean (`cmake` + `g++`), passes 23/23 gtests, byte-exact PPM round-trips,
and passes `prism fuzz --iters 500` with corruption rejection.

- The original YCoCg-R was **lossy** (a `1<<(bd-1)` bias with a plain `& mask`
  wrap collided signed values). Fixed to a reversible transform with `bias=512`
  and verified over a dense 8-bit RGB lattice (`Color.YCoCgRDenseRoundtrip`).
- The original entropy coder was **not rANS**: dead `RansEncoder`/`RansDecoder`
  stubs plus naive one-bit-per-`put_bin` packing. Replaced with a faithful
  32-bit rANS (ryg `rans_byte.h` port) with a fixed per-bin model + Elias-gamma
  magnitudes; `Rans.EfficiencyVsEntropy` proves coded length -> H(p) within
  epsilon. Adaptive context modeling is deferred to M1 (the progress file says so).
- `prism.cpp` now rejects a `payloads.size() != expected` band mismatch instead
  of silently dropping bands.

M0 gate recorded honestly in `progress/103-prism-next-gen-lossless-codec.md`.
M1-M4 remain as the optimization loop (Squeeze + MA-tree `llc_class`/
`sibling_class`, then adaptive CM + LZP).

Next: milestone optimization (`/oc continue`).

- the Builder
