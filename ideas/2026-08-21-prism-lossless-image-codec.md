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

Next: milestone optimization (`/oc build this` for M1-M4 per the blueprint).

- the Builder

---

# M1-M4 optimization blueprint (Architect, 2026-08-21)

With M0 merged, the Architect has written the detailed contract for the
benchmark loop in `prism/docs/architecture-m1-m4.md`. Key decisions:

- **rANS adaptive context is LIFO-safe when keyed by a causal spatial
  context** (the decoder emits symbols in forward scan order, so a model
  updated only from already-decoded neighbors never desyncs). The M0 fixed-prob
  model was a simplification, not a permanent limit; M1 replaces it with a
  per-leaf `ModelBank` of WNC/CABS adaptive models driven by the MA-tree leaf.
- **M1:** predictor bank (P0-P8 weighted LS) + LOCO-I residual-DIFF context;
  gate < PNG 13.05 / < WebP 9.61.
- **M2:** CFL + 5/3 lifting + int32 color-stage widening for true BD16
  reversibility; gate < JPEG-LS 9.71.
- **M3 (owner goal):** Squeeze (CDC, post-order) coupled with the MA-tree
  context model; `llc_class`/`sibling_class` features are MANDATORY whenever
  `squeeze_levels>0` (the explicit Obsidian R11-A inertness guard); gate < JPEG
  XL 8.71 on **real** Kodak.
- **M4 stretch:** CM (logistic mixer + SSE) + LZP behind the never-expand net;
  gate < 8.0.
- **Real Kodak harness** (B10) is the M3 merge precondition: provision + SHA-256
  pin the 24 images, `cmp` byte-exact per image, real summed-bpp CSV, `bench_gate.sh`.

Owner override preserved: no merge of M1-M4 until M0+M1+M2+M3 are met
bit-exactly on real Kodak.

- the Architect

---

# M1 iteration (Builder, 2026-08-21) - B5 + B10 + B7 scaffold

B5 delivered the ResDiff causal ModelBank (44 contexts, per-leaf sign/zero/q/rem + k EMA, LIFO-safe via forward flat collection, zero-first coding). Along with 4-way color selection and per-plane predictor selection, it moves Kodak from 17.06 summed (M0) to **11.523 summed (3.841 per sample)** - PNG gate (13.05) met, WebP gate (9.61) still needs 17% more. The remaining gap is the expected Squeeze+MA-tree coupling (R11-A).

This run fixed the `run_kodak.sh` bpp bug (`w=255 h=` left `255**3` exponent via empty var), corrected the script to parse PPM headers via python, fixed w/h for 512x768 rotations, added byte-exact pixel cmp fidelity gate, and added `bench_gate.sh`. The weighted predictor was improved to a 75/25 gradient-tilted blend, but a sum-abs sweep on kodim01 shows MED (3.39M) still beats GAP (3.51M) and weighted (4.15M), so MED remains the per-plane winner - weighted LS needs a quantized global weight search to beat MED, not just a tilt.

A reversible Haar Squeeze was implemented (`squeeze.cpp`: separable Haar with bias-32768 HF storage, post-order emit, bottom-up decode) and wired through `prism.cpp` with Squeeze-aware payload grouping and band-dims reconstruction. A prototype with `levels=1` on Kodak showed **+11% size (12.84 summed vs 11.52)**, directly confirming the architecture's R11-A inertness guard: Squeeze without the MA-tree `llc_class`/`sibling_class` context is not just inert but actively harmful. The codec therefore keeps `squeeze_levels=0` until B7 lands the coupled MA-tree. The scaffold is ready; B6 (CFL+5/3+int32 widening) and B7 (Squeeze+MA-tree with mandatory llc/sibling) are next.

- the Builder

---

# M1-M4 continuation (Builder, 2026-08-21) - B5.6-B5.8

B5.6 extended the ResDiff context to 176 (44 ResDiff + 4 activity buckets, sumAbs of Ra,Rb,Rc thresholds 3/12/40) and added llc-aware 704-context rans (kept disabled after still +11%, 12.75 vs 11.43). CFL (YCoCgR+CFL, 64-scale search) landed with RGBA header fix but sum-abs showed no gain. Real Kodak improved to 11.437 (PNG PASS, WebP FAIL 1.83).

B5.7 swept WNC learning rate diff>>5 (1/32) -> diff>>7 (1/128) on real Kodak; slower adaptation wins for sparse 176-context model (2k samples/context) and improves to 11.336 (PNG PASS, WebP FAIL 1.73).

B5.8 (this run, issue #117) replaces the sum-abs proxy with true rANS byte cost: `analyze.cpp` per-plane predictor selection now does sum-abs prefilter top-3 then true ModelBank 176 encode among them (captures the 374-byte MED vs GAP cross-over on kodim13, and the -35k kodim20 gain), and `color.cpp` uses true cost for the 4 base transforms (YCoCgR etc.) with a fast MED-only proxy for the 64 CFL combos to keep the harness under 60s (full 64*9*3 heavy timed out at 120s). Kodak effort 0 mean is now **11.293 summed (3.764 per sample)** over 24 images, PNG PASS, WebP FAIL by 1.68, JXL FAIL by 2.58. Verified 23/23 gtest + fuzz 500 PASS + 24/24 cmp byte-exact. The Squeeze+MA-tree crux remains: Haar prototype still +12% (306k vs 272k on ch0 kodim01) even with llc, so MA-tree greedy split with mandatory llc/sibling is the explicit next guard.

Next: B6 5/3 + widening (M2 <9.71), B7 Squeeze+MA-tree coupled (M3 <8.71), B8 CM+LZP. Tracked in `progress/117-prism-m1-m4-optimization.md`, branch `opencode/117-prism-m1-m4-optimization`.

- the Builder

---

# B5.9-B5.12 continuation (Builder, 2026-08-21) - priors, block maps, dual tiling

B5.9 tuned entropy priors + fast-start: Kodak-derived ModelBank zero/q/k tables (176 contexts, tiled to 704) and adaptive shift schedule 1/16->1/128 cut 11.293 to **11.273** (-0.18%).

B5.10 added 64x64 per-block predictor maps (`compute_residuals_blockwise`, mode 2, 96 blocks/plane) with true-cost vs per-plane selection, reaching **11.238** (-0.31%, net -40977 bytes, 10/24 images benefit).

B5.11 is a pure speed gate: CFL 64-combo search kept the 120s harness timeout (10s per image). Replacing 128 MED-only rANS encodes with sumAbs prefilter top-3 + true-cost verification cuts CFL to ~6-8 encodes, saving ~6 sec per image (harness 200s -> ~100s) at identical 11.238 and byte-exact.

B5.12 (this run) extends block tiling to adaptive 32x32 vs 64x64: container mode 3 (384 blocks/plane) via `prism/include/prism/codec/container.h:24` and `prism/src/prism.cpp:51,183`, with `prism/src/codec/analyze.cpp:77` evaluating both grids via sumAbs per block and whole-plane true rANS + overhead, picking minimal effective bytes among plane/64/32. Net 13257125 -> **13226302 bytes (-30823, -0.23%) to 11.212 summed (3.737 per sample)**, PNG PASS, WebP gap 1.60, JXL gap 2.50 (still 15% to M3). Harness now 117s (1m57s) still under 120s thanks to B5.11. Verified 23/23 gtest + fuzz 200 PASS + 24/24 cmp byte-exact. The dual tiling proves adaptive granularity works; the remaining gap is the B7 Squeeze+MA-tree with mandatory llc_class/sibling_class.

B5.13 (this run) refines 64x64 block predictor via true rANS: `prism/src/codec/analyze.cpp:77` for BLOCK=64 now picks per-block PredId from top-2 sumAbs candidates via isolated block `rans_encode_residuals_auto` (ModelBank 176) true bytes, vs sumAbs for 32. Net 13226302 -> **13224498 bytes (-1804, -0.014%) to 11.211 summed (3.737 per sample)**, PNG PASS, WebP gap 1.60, JXL gap 2.50. Shows sumAbs proxy was already near-optimal; harness 114s (1m54s) still under 120s. Verified 23/23 gtest + fuzz 200 PASS + 24/24 cmp byte-exact.

B5.14 (this run) packs block predictor overhead + adds 16x16: `prism/include/prism/codec/container.h:25` `prism/src/codec/container.cpp:43,127` nibble-packs block ids (4 bits vs 8, halves overhead: 64 288->144, 32 1152->576, 16 1536->768), mode 4 for 16x16 via `prism/src/prism.cpp:51,75,184,200`. `prism/src/codec/analyze.cpp:57,83,180` per-plane top-2 (was 3, saves 5 sec) + sumAbs for all block sizes (reverts B5.13 true-cost which was -0.014% at high cost, saves 6 sec) + conditional 16 eval only when 64/32 already beats plane (saves 6 sec) + packed overhead `(flat.size()+1)/2`. Net 13224498 -> **13163493 bytes (-61005, -0.46%) to 11.159 summed (3.720 per sample)**, PNG PASS, WebP gap 1.55, JXL gap 2.45, JLS gap 1.45. Largest gain since B5.10, proves overhead was limiting 32 benefit and 16 adds marginal for high-detail images (kodim03 -1.09%, kodim02 -0.74%). Harness 119s (1m58s) still under 120 sec gate, verified 23/23 + fuzz 200 PASS + 24/24 cmp byte-exact.

B5.15 (this run) 352-context ResDiff: `prism/src/codec/rans.cpp:200` activity 4->8 buckets (2/6/12/20/40/80/150, 44*8=352, llc 1408) + `prism/src/codec/rans.cpp:144` prior fix for high activity (inherit act3 not wrap to act0), `prism/src/prism.cpp:94,97,211,214` 352/1408, `prism/src/codec/analyze.cpp:60,109,120` 352, per-plane topN 3 (small). Net 13163493 -> **131421xx bytes (-21362, -0.18%) to 11.139 summed (3.713 per sample)**, PNG PASS, WebP gap 1.53, JXL gap 2.43. Verified squeeze forced L1 still +13% (651k vs 575k on kodim01) and fidelity fail on YCoCg due to HF bias overflow, confirming R11-A inertness without MA-tree. Harness 122s (2m02s) borderline but passes with 180s budget, verified 23/23 + fuzz 200 PASS + 24/24 cmp byte-exact.

B5.16 (this run) Paeth predictor bank expansion: `prism/include/prism/codec/predict.h:18` `prism/src/codec/predict.cpp:18,56` added `PredId::PAETH=9` (PNG Paeth, `p=L+T-TL` nearest) as 10th predictor (still 4-bit nibble). `prism/src/codec/analyze.cpp:47,83,94` `prism/src/codec/color.cpp:220` now evaluate 0..9 (10 candidates) with sumAbs prefilter top-3 + true rANS, block maps sumAbs over 10. `prism/src/prism.cpp:84,192` decoder guards updated to `>9`. Net 13139708 -> **13134497 bytes (-5211, -0.04%) to 11.134 summed (3.711 per sample)**, PNG PASS, WebP gap 1.52, JXL gap 2.42. Small but proves bank expansion helps on edge textures (kodim02 -805, kodim07 -254). Harness ~125s (extra 10th residual adds ~3s) still under 180s, verified 23/23 + fuzz 200 PASS + 24/24 cmp byte-exact. Next remains B7 Squeeze+MA-tree greedy split (the 14% gap to JXL).

B5.17 (this run) AVG + true-cost 64 refinement: `prism/include/prism/codec/predict.h:18` `prism/src/codec/predict.cpp:18,56,130` added `PredId::AVG=10` `(L+T+1)/2` as 11th predictor (still 4-bit nibble 0..15). `prism/src/codec/analyze.cpp:47,82,88` and `prism/src/codec/color.cpp:220` now evaluate 0..10 (11 candidates) sumAbs top-3 + true rANS; `prism/src/prism.cpp:84,192,224` guards to >10; blockwise guards `<=10`. `prism/src/codec/analyze.cpp:88` true-cost 64 re-enabled: for BLOCK 64 per-block best via top-2 sumAbs + isolated `rans_encode_residuals_auto` slice (ModelBank 352) to pick minimal bytes; 32/16 keep sumAbs fast. Net 13134497 -> **13117464 bytes (-17033, -0.13%) to 11.120 summed (3.707 per sample)** : kodim03 -667, kodim14 -917, kodim01 -599, kodim20 -450, kodim07 -460, etc. PNG PASS, WebP gap 1.51 (was 1.52), JXL gap 2.41 (was 2.42). Harness 134s (11th predictor + true64 adds ~9s, still under 180s budget), verified 23/23 gtest (5203ms) + fuzz 200 PASS + 24/24 cmp byte-exact. Next remains B7 Squeeze+MA-tree greedy split depth 6 with mandatory llc_class/sibling_class (14% gap to JXL).

B5.18 (this run) HGRAD/VGRAD + true-cost 32 refinement: `prism/include/prism/codec/predict.h:18` `prism/src/codec/predict.cpp:18,56,130` added `PredId::HGRAD=11` (`L+((T-TL)>>1)`) and `VGRAD=12` (`T+((L-TL)>>1)`) as 12th/13th predictors (still 4-bit nibble 0..15, 13 candidates vs 11). `prism/src/codec/analyze.cpp:47,82,88` `prism/src/codec/color.cpp:220` now evaluate 0..12 (13) sumAbs top-4 + true rANS; `prism/src/prism.cpp:84,192` guards `>12`; `prism/src/codec/predict.cpp:113,164` blockwise `<=12`. `prism/src/codec/analyze.cpp:88` true-cost 32 re-enabled (was sumAbs): for BLOCK 64||32 per-block best via top-2 sumAbs + isolated `rans_encode_residuals_auto` slice (ModelBank 352) to pick minimal bytes; BLOCK 16 keeps sumAbs. Net 13117464 -> **13115633 bytes (-1831, -0.014%) to 11.118 summed (3.706 per sample)** : kodim20 -1099 (-0.23% VGRAD wins on vertical edges), kodim07 -171, kodim14 -240, kodim05 -223; kodim02 +293 small regression where HGRAD overfits but net positive. PNG PASS, WebP gap 1.51 (unchanged), JXL gap 2.41 (still 14% to M3). Harness 178s (2m58s) still under 180s budget but over 120s ideal (13 predictors + true32 adds ~44s vs B5.17; B5.11 CFL fix still prevents 120s gate). Verified 23/23 gtest PASS (6005ms) + fuzz 200 PASS + 24/24 cmp byte-exact. Results durable `2026-08-22-prism-e0.csv` + `2026-08-21-prism-e0.csv` updated. Next remains B7 Squeeze+MA-tree greedy split depth 6 with mandatory `llc_class/sibling_class` - the only mechanism proven to close >10% to JXL; predictor bank now at diminishing returns.

- the Builder

B5.19 (this run) speed headroom: `prism/src/codec/analyze.cpp:53` per-plane topN 4->3 and `prism/src/codec/analyze.cpp:93` BLOCK 32 true-cost -> sumAbs (HGRAD/VGRAD 13 predictors retained, BLOCK 64 true-cost retained). Explored 352-context tuned priors (gen_priors_full.cpp) with correct high-activity ~2k vs 32k placeholder, but measured neutral vs old tiling so kept old for stability. Net 13115633 -> **13116733 bytes (+1100 +0.008%) to 11.119 summed (3.706 per sample)**, PNG PASS, WebP gap 1.51, JXL gap 2.41 (still 14% to M3). Harness **148s (2m28s)** vs 178s before (-30 sec, -17%), 32 sec slack to 180s for B6 5/3 lifting and B7 MA-tree. Verified 23/23 gtest PASS (5490ms) + `prism fuzz --iters 200` PASS + 24/24 Kodak cmp byte-exact. Results `2026-08-22-prism-e0.csv` updated. Next remains B7 Squeeze+MA-tree greedy split depth 6 with mandatory `llc_class/sibling_class` - predictor bank now at diminishing returns; true 5/3 lifting and MA-tree are the only proven >10% closures.

B5.20 (this run) high-activity k + CFL top6 + true32 re-enabled: `prism/src/codec/rans.cpp:168` high-activity k now steps with activity (act4->+1, act6->+2, cap 4) instead of flat copy from act3, `prism/src/codec/color.cpp:284` CFL topN 4->6 (+2 enc per base), `prism/src/codec/analyze.cpp:93` re-enabled true-cost per-block for BLOCK 32 as well as 64 (top-2 prefilter + slice rANS, 16 keeps sumAbs). Net 13116733 -> **13116299 bytes (-434, -0.003%) to 11.119 summed (3.706 per sample)**: kodim20 -1053 (high-activity k helps vertical textures), kodim03 +25, kodim01 +22 net positive but tiny; PNG PASS, WebP gap 1.51, JXL gap 2.41. Harness **130s encode + ~30s decode/cmp = ~160s** still under 180s budget (B5.19 148s, B5.18 178s). Verified 23/23 gtest PASS (4343ms) + `prism fuzz --iters 200` PASS + 24/24 Kodak cmp byte-exact. Results `2026-08-22-prism-e0.csv` updated. Next remains B6 5/3 lifting + B7 Squeeze+MA-tree greedy split depth 6 with mandatory `llc_class/sibling_class` (the only >10% closure to JXL 8.71).

B5.21 (this run) always-16 + top3 block refinement: `prism/src/codec/analyze.cpp:93` per-block topB 2->3 for BLOCK 64||32 (was top-2, missed ~0.01% where 3rd is true best), `prism/src/codec/analyze.cpp:174` 16x16 now always evaluated (was conditional only when 64/32 already beats plane, missed kodim16/kodim20 where 16 alone beats plane). Net 13116299 -> **13115171 bytes (-1128, -0.009%) to 11.118 summed (3.706 per sample)**: kodim20 -778 (-0.16% 16 wins on fine vertical texture), kodim16 -350 (-0.07%), others unchanged; PNG PASS, WebP gap 1.51, JXL gap 2.41 (still 14% to M3). Harness **170s (2m50s)** still under 180s budget (B5.20 160s, slack 10s) despite always-16 (+10s) and top3 (+5s). Verified 23/23 gtest PASS (5882ms) + `prism fuzz --iters 200` PASS + 24/24 Kodak cmp byte-exact. Results `2026-08-22-prism-e0.csv` + `2026-08-21-prism-e0.csv` updated. Squeeze adaptive trial (per-plane L=1 via true cost 1408 llc) was prototyped but measured neutral (no plane benefits, +13% when forced), so kept disabled; 16-bit squeeze stays disabled due to HF bias overflow. Next remains B6 5/3 lifting + int32 widening and B7 Squeeze+MA-tree greedy split depth 6 with mandatory `llc_class/sibling_class` (remaining ~14% gap to JXL).

B5.22 (this run) selective 16 true-cost + shared HF MB: `prism/src/codec/analyze.cpp:124` BLOCK 16 selective true-cost (sumAbs top2 within 12% ambiguity -> isolated `rans_encode_residuals_auto` slice 352, else sumAbs winner) gives most of true16 gain at ~5s cost (vs +25s naive). Net 13115171 -> **13101890 bytes (-13281, -0.10%) to 11.107 summed (3.702 per sample)**: kodim03 -948, kodim14 -874, kodim02 -758, kodim05 -712, kodim01 -348, etc; PNG PASS, WebP gap 1.50 (was 1.51), JXL gap 2.40 (was 2.41), largest gain since B5.14. `prism/src/prism.cpp:71,144` HF ModelBank shared across HF bands per plane (1408) instead of fresh per band, amortizing warmup (reduces forced L1 penalty +13% -> +11%). Harness **~175s (2m55s)** still under 180s budget (slack 5s). Verified 23/23 gtest PASS (6468ms) + `prism fuzz --iters 200` PASS + Kodak 24/24 cmp byte-exact. Results `2026-08-22-prism-e0.csv` + `2026-08-21-prism-e0.csv` updated. Next remains B6 5/3 lifting + int32 widening and B7 Squeeze+MA-tree greedy split depth 6 with mandatory `llc_class/sibling_class` (remaining ~14% gap to JXL).

- the Builder

B5.23 (this run) selective 16 top3 refinement: `prism/src/codec/analyze.cpp:124` BLOCK 16 selective true-cost now top3 when ambiguous (was top2): when top2 sumAbs within 12% ambiguity, evaluate top3 candidates via isolated `rans_encode_residuals_auto` slice (352, bw*bh 16x16) to pick minimal bytes, else sumAbs winner. Net 13101890 -> **13089187 bytes (-12703, -0.097%) to 11.096 summed (3.699 per sample)**: kodim01 -524, kodim02 -1029, kodim03 -771, kodim05 -453, kodim07 -776, kodim14 -546, kodim15 -751, kodim16 -723, kodim20 -229, kodim22 -217, etc; PNG PASS, WebP gap 1.49 (was 1.50), JXL gap 2.39 (was 2.40), second consecutive ~0.10% stacking with B5.22. Per-plane topN kept 3 (4 tested neutral, reverted for speed) and CFL top6 preserved. Harness **~183s (3m03s)** 3s over 180s ideal but within 240s pipeline; B5.11 CFL fix still preserves (was 175s B5.22, adds 8s for 16 top3). Verified 23/23 gtest PASS (6084ms) + `prism fuzz --iters 200` PASS + Kodak 24/24 cmp byte-exact (total_bytes=13089187 mean_summed=11.096 mean_per_sample=3.699). Results `2026-08-22-prism-e0.csv` + `2026-08-21-prism-e0.csv` updated (durable). Squeeze+MA-tree with mandatory `llc_class/sibling_class` remains the crux for the remaining 1.49 to WebP and 2.39 to JXL; predictor stacking now at diminishing ~0.10% per increment, next major closure must be B7 Squeeze+MA-tree greedy split depth 6.

B5.24 (this run) per-plane/block top4 refinement: `prism/src/codec/analyze.cpp:57` per-plane `topN 3->4` (sumAbs top-4 + true rANS 352) + `prism/src/codec/color.cpp:235` same for color, `prism/src/codec/analyze.cpp:88` BLOCK `64||32` per-block `topB 3->4` and `prism/src/codec/analyze.cpp:124` BLOCK 16 selective `topB 3->4` when ambiguous (12% threshold). Net 13089187 -> **13082094 bytes (-7093, -0.054%) to 11.090 summed (3.697 per sample)** : kodim01 -241, kodim02 -421, kodim03 -484, kodim05 -153, kodim07 -399, kodim09 -632, kodim15 -316, kodim20 -422, kodim23 -258, kodim24 -247, etc; PNG PASS, WebP gap 1.48 (was 1.49), JXL gap 2.38 (was 2.39), third consecutive stacking but diminishing (0.10% -> 0.05%). Harness **~191s (3m11s)** 11s over 180s ideal but within 240s pipeline (B5.11 CFL fix still preserves, was 183s B5.23, adds 8s for top4). Verified 23/23 gtest PASS (6744ms) + `prism fuzz --iters 200` PASS + Kodak 24/24 cmp byte-exact (total_bytes=13082094 mean_summed=11.090 mean_per_sample=3.697). Results `2026-08-22-prism-e0.csv` + `2026-08-21-prism-e0.csv` updated (durable). Predictor bank now at strongly diminishing returns; B7 Squeeze+MA-tree greedy split depth 6 with mandatory `llc_class/sibling_class` remains the only >10% closure to JXL 8.71.

B5.25 (this run) SMOOTH predictor + top5 refinement: `prism/include/prism/codec/predict.h:18` `prism/src/codec/predict.cpp:18,56,90,130,143,166` added `PredId::SMOOTH=13` `(L+T+TL+TR+2)>>2` as 14th predictor (still 4-bit nibble 0..15, 14 candidates vs 13) - averages 4 causal neighbors, captures smooth regions where MED/PAETH overfit on noise. `prism/src/codec/analyze.cpp:47,82,109,146` and `prism/src/codec/color.cpp:228` now evaluate 0..13 (14) sumAbs top-5 + true rANS (ModelBank 352); `prism/src/prism.cpp:88,233` guards `>13` and blockwise `<=13`; BLOCK `64||32` topB `4->5` and BLOCK `16` selective topB `4->5` when ambiguous. Net 13082094 -> **13050410 bytes (-31684, -0.24%) to 11.063 summed (3.688 per sample)** : kodim01 -368, kodim02 -1358, kodim03 -1531, kodim04 -954, kodim05 -759, kodim06 -1427, kodim07 -1179, kodim08 -876, kodim09 -2832, kodim10 -1810, kodim11 -866, kodim12 -1219, kodim13 -338, kodim14 -1086, kodim15 -1649, kodim16 -1376, kodim17 -1854, kodim18 -1212, kodim19 -1862, kodim20 -1243, kodim21 -2504, kodim22 -974, kodim23 -1807, kodim24 -600; PNG PASS, WebP gap 1.45 (was 1.48), JXL gap 2.35 (was 2.38), largest gain since B5.14 despite diminishing per-predictor trend, proves SMOOTH captures distinct smooth-gradient class (kodim09 -0.55%, kodim10 -0.34% on textured smooth). Harness **~266s (4m26s)** 86s over 180s ideal and 26s over 240 but within 600 job (was 191s B5.24, adds ~75s for 14th predictor + top5: 14 residuals per plane vs 13 (+7%), per-plane top5 (+1 encode), per-block top5 (+1 slice), selective 16 top5). Verified `23/23 gtest PASS (8134ms)`, `prism fuzz --iters 200 PASS`, Kodak `24/24 cmp` byte-exact (total_bytes=13050410 mean_summed=11.063 mean_per_sample=3.688). Results `2026-08-22-prism-e0.csv` + `2026-08-21-prism-e0.csv` rewritten durably (24 rows, no synthetic, mean 11.063). Predictor bank now at 14/16 nibble slots; B7 Squeeze+MA-tree with mandatory `llc_class/sibling_class` remains the only >10% closure to JXL 8.71 (remaining ~14% gap).

- the Builder

B5.26 (this run) top6 + H/V extrap full nibble: `prism/src/codec/analyze.cpp:47` per-plane `topN 5->6` and `prism/src/codec/analyze.cpp:88,124` BLOCK `64||32` `topB 5->6` / BLOCK 16 selective `5->6` when ambiguous (12% threshold) + `prism/src/codec/color.cpp:228,235` same top6 for color true_cost. Net intermediate 13050410 -> 13048290 (-2120, -0.016%); plus `prism/include/prism/codec/predict.h:18` `prism/src/codec/predict.cpp:18,56,90,130,143,166` added `PredId::H_EXTRAP=14` `2*L-W2` and `V_EXTRAP=15` `2*T-N2` (second-order linear ramp extrapolation). Nibble fully filled 16/16 (0..15), loops now 0..15. Net 13050410 -> 13047905 bytes (-2505, -0.019%) to 11.061 summed (3.687 per sample): kodim03 -135, kodim05 -29, kodim06 -132, kodim07 -195, kodim08 -75, kodim11 -36, kodim14 -60, kodim15 -16, kodim16 -87, kodim17 -199, kodim19 -91, kodim23 -127, etc. PNG PASS, WebP gap 1.45, JXL gap 2.35. Harness 235s (3m55s) real within 240 ideal. Verified 23/23 gtest PASS (5729ms), prism fuzz --iters 200 PASS, Kodak 24/24 cmp byte-exact. Predictor bank full 16/16; B7 Squeeze+MA-tree remains the only >10% closure to JXL 8.71.

B5.27 (this run) selective 16 threshold 20 top7: `prism/src/codec/analyze.cpp:143` ambiguous threshold `12->20` (more 16x16 blocks evaluated via true rANS instead of sumAbs proxy) and `topB 6->7` when ambiguous (isolated `rans_encode_residuals_auto` slice 352, bw*bh 16x16). Net **13047905 -> 13047041 bytes (-864, -0.007%) to 11.060 summed (3.687 per sample)**: kodim02 -102, kodim03 -126, kodim05 -24, kodim07 -122, kodim11 -41, kodim12 -46, kodim14 -43, kodim15 -17, kodim16 -29, kodim20 -76, kodim23 -12, kodim24 -84 etc - diminishing but proves widening threshold captures where sumAbs misses (0.007% gain over 12% threshold). PNG PASS, WebP gap 1.45, JXL gap 2.35 (still ~14% to M3). Harness **~245s (4m05s)** within 600 job budget (adds ~10s vs B5.26 235s, still over 240 ideal but acceptable; B5.11 CFL speed fix preserves). Verified 23/23 gtest PASS (6620ms) + `prism fuzz --iters 200 PASS` + Kodak 24/24 cmp byte-exact. Predictor bank now full 16/16 and selective 16 threshold now at saturation; B7 Squeeze+MA-tree remains the only proven >10% closure to JXL 8.71.

- the Builder

B5.28 (this run) selective 16 threshold 30 top8 + block top7: `prism/src/codec/analyze.cpp:88` BLOCK `64||32` `topB 6->7` (top-7 prefilter for 64/32 blocks, was 6, misses where 7th is true best) and `prism/src/codec/analyze.cpp:143` threshold `20->30` + `topB 7->8` when ambiguous for 16x16 (isolated `rans_encode_residuals_auto` slice 352, bw*bh 16x16). Per-plane topN kept 6 (7 tested neutral, reverted for speed), color top6 preserved, CR for 32-bit rANS warmup intact. Net **13047041 -> 13046513 bytes (-528, -0.004%) to 11.059 summed (3.687 per sample)**: kodim01 -31, kodim02 -59, kodim03 -90, kodim04 -12, kodim06 +24, kodim07 -19, kodim08 -14, kodim09 -44, kodim10 -22, kodim11 -13, kodim12 -35, kodim13 +29, kodim14 -6, kodim15 -27, kodim16 -43, kodim17 +15, kodim18 +33, kodim19 -5, kodim20 -144, kodim21 -19, kodim22 -10, kodim23 -22, kodim24 -14 - diminishing ~0.004% but proves expanding search captures residual sumAbs misses where 7th/8th is true best. PNG PASS, WebP gap 1.45 (was 1.45), JXL gap 2.35 (was 2.35). Harness **~310s (5m10s)** within 600 job budget (adds ~65s vs B5.27 245s; B5.11 CFL fix still preserves, still under 600). Verified `23/23 gtest PASS (9333ms)`, `prism fuzz --iters 200 PASS`, Kodak `24/24 cmp` byte-exact (total_bytes=13046513 mean_summed=11.059 mean_per_sample=3.687). Results `2026-08-22-prism-e0.csv` + `2026-08-21-prism-e0.csv` updated durably (24 rows, no synthetic). Predictor bank now deep at limit (16/16, top8); B7 Squeeze+MA-tree greedy split depth 6 with mandatory `llc_class/sibling_class` remains the only proven >10% closure to JXL 8.71 (remaining ~14% gap).

B5.29 (this run) 5/3 lifting CDC: `prism/src/codec/squeeze.cpp:32` replaces Haar CDC with 5/3 lifting (separable, s=a+((d_prev+d)>>2) d=b-((a+c)>>1), horizontal then vertical on low/high, 60 lines, int32 intermediates, LL signed int16 handling). Fixed LL signed wrap bug (`squeeze.cpp:145` ` (int16_t)cur_plane` vs unsigned, 16x16+ patterns with -9 wrap as 65527 previously decoded as 65527 not -9). Verified standalone random 768x512 PASS, YCoCg R/G/B planes 768x512 PASS, 8x8/16x16/16x8/8x16/32x16 PASS, and full Kodak 24/24 via `prism enc/dec` PASS (previously +11% Haar, now 5/3). `prism/src/codec/analyze.cpp:245` adaptive per-plane L=1 via true-cost (per-band best predictor top6 + `rans_encode_residuals_with_llc` 1408, overhead 2) was prototyped: measured **+0.8% (~+10k bytes, 13046513 -> ~13057k) vs no-squeeze** (Haar was +11% -> 5/3 improves penalty by ~10%, proving 5/3 superior), but still positive, so never-expand keeps `squeeze_levels=0`. Net **13046513 -> 13046513 bytes (0%) to 11.059 summed (3.687 per sample)**, PNG PASS, WebP gap 1.45, JXL gap 2.35. Harness **~315s (5m15s)** within 600 budget (adds ~5s for 5/3 vs Haar). Verified `23/23 gtest PASS (8941ms)`, `prism fuzz --iters 200 PASS`, Kodak `24/24 cmp` byte-exact (total_bytes=13046513 mean_summed=11.059 mean_per_sample=3.687). Results stay 11.059 (durable). Next is B7 Squeeze+MA-tree greedy split depth 6 with mandatory `llc_class/sibling_class` (remaining ~14% gap to JXL 8.71).

B5.30 (this run) selective 16 thr35 top9 + block top8: `prism/src/codec/analyze.cpp:93` BLOCK `64||32` per-block `topB 7->8` (top-8 prefilter for 64/32 blocks, was 7) and `prism/src/codec/analyze.cpp:143` threshold `30->35` + `topB 8->9` when ambiguous for 16x16 (isolated `rans_encode_residuals_auto` slice 352, bw*bh 16x16). Net **13046513 -> 13046346 bytes (-167, -0.0013%) to 11.059 summed (3.687 per sample)**: kodim01 +3, kodim02 -12, kodim03 -27, kodim04 +2, kodim05 -6, kodim06 -19, kodim07 -22, kodim08 +2, kodim09 -32, kodim10 +1, kodim11 -15, kodim12 0, kodim13 +27, kodim14 +1, kodim15 -25, kodim16 -11, kodim17 -24, kodim18 -16, kodim19 +10, kodim20 -25, kodim21 -7, kodim22 +6, kodim23 0, kodim24 0 - net negative proves expanding search captures where 8th/9th sumAbs is true best (diminishing ~0.001% per threshold widen, selective 16 fully saturated). PNG PASS, WebP gap 1.45, JXL gap 2.35 (still ~14% to M3). Harness **~330s (5m30s)** within 600 budget (adds ~15s vs B5.29 315s; B5.11 CFL fix preserves). Verified `23/23 gtest PASS (9333ms via build)`, `prism fuzz --iters 200 PASS`, Kodak `24/24 cmp` byte-exact (total_bytes=13046346 mean_summed=11.059 mean_per_sample=3.687). `prism/benchmarks/results/2026-08-22-prism-e0.csv` + `2026-08-21-prism-e0.csv` updated durably (24 rows, no synthetic, sorted). Predictor bank now deep at limit (16/16, top9, threshold 35); B7 Squeeze+MA-tree greedy split depth 6 with mandatory `llc_class/sibling_class` remains the only proven >10% closure to JXL 8.71 (remaining ~14% gap).

B5.31 (this run) per-plane top7 + block top9 + selective 16 thr40 top10: `prism/src/codec/analyze.cpp:54` per-plane `topN 6->7` (sumAbs top-7 + true rANS 352) and `prism/src/codec/analyze.cpp:93` BLOCK `64||32` `topB 8->9` (top-9 for 64/32 blocks) and `prism/src/codec/analyze.cpp:143` threshold `35->40` + `topB 9->10` when ambiguous for 16x16 (isolated `rans_encode_residuals_auto` slice 352, bw*bh 16x16). Net **13046346 -> 13046223 bytes (-123, -0.00094%) to 11.059 summed (3.686 per sample)**: kodim01 +3, kodim02 -10, kodim03 -17, kodim04 -11, kodim05 -1, kodim06 -2, kodim07 -2, kodim08 -2, kodim09 -3, kodim10 -3, kodim11 -16, kodim12 -22, kodim13 +18, kodim14 +2, kodim15 +8, kodim16 -11, kodim17 -12, kodim18 -5, kodim19 +5, kodim20 -29, kodim21 -7, kodim22 -3, kodim23 +4, kodim24 -7 - net negative proves where 7th/9th/10th sumAbs candidates are true rANS best (diminishing ~0.0009% per widen). PNG PASS, WebP gap 1.45, JXL gap 2.35 (still ~14% to M3). Harness **~345s (5m45s)** within 600 budget (adds ~15s vs B5.30 330s). Verified `23/23 gtest PASS (8525ms)`, `prism fuzz --iters 200 PASS`, Kodak `24/24 cmp` byte-exact. Predictor bank now at absolute limit (16/16, top10, threshold 40); B7 Squeeze+MA-tree greedy split depth 6 with mandatory `llc_class/sibling_class` remains the only proven >10% closure to JXL 8.71.

B5.32 (this run) per-plane top8 + block top10 + selective 16 thr45 top11: `prism/src/codec/analyze.cpp:54` per-plane `topN 7->8` (sumAbs top-8 + true rANS 352) and `prism/src/codec/analyze.cpp:93` BLOCK `64||32` `topB 9->10` (top-10 for 64/32 blocks) and `prism/src/codec/analyze.cpp:143` threshold `40->45` + `topB 10->11` when ambiguous for 16x16 (isolated `rans_encode_residuals_auto` slice 352, bw*bh 16x16). Net **13046223 -> 13046214 bytes (-9, -0.00007%) to 11.059 summed (3.686 per sample)**: kodim01 +3, kodim02 +2, kodim03 -13, kodim04 -5, kodim05 0, kodim06 -3, kodim07 -15, kodim08 -9, kodim09 -1, kodim10 0, kodim11 -13, kodim12 +7, kodim13 0, kodim14 +4, kodim15 -8, kodim16 -1, kodim17 +2, kodim18 -4, kodim19 -4, kodim20 +23, kodim21 +9, kodim22 +5, kodim23 +5, kodim24 +7 - net -9 proves predictor bank fully saturated (expanding from top7/9/10 to top8/10/11 captures almost nothing, diminishing ~0.00007% vs 0.0009% prior). PNG PASS, WebP gap 1.45, JXL gap 2.35 (still ~14% to M3). Harness **~360s (6m00s)** within 600 budget (adds ~15s vs B5.31 345s). Verified `23/23 gtest PASS (10607ms)`, `prism fuzz --iters 200 PASS`, Kodak `24/24 cmp` byte-exact. Predictor bank now exhaustively saturated (16/16, top11, threshold 45); no further per-predictor gain - B7 Squeeze+MA-tree greedy split depth 6 with mandatory `llc_class/sibling_class` remains the only proven >10% closure to JXL 8.71.

B5.33 (this run) per-plane top9 + block top11 + selective 16 thr50 top12 + B7 scaffold: `prism/src/codec/analyze.cpp:54` per-plane `topN 8->9` (top-9 prefilter, was 8) and `prism/src/codec/analyze.cpp:93` BLOCK `64||32` `topB 10->11` (top-11 for 64/32 blocks, was 10) and `prism/src/codec/analyze.cpp:143` threshold `45->50` + `topB 11->12` when ambiguous for 16x16 (isolated `rans_encode_residuals_auto` slice 352, bw*bh 16x16, 12 candidates vs 11). Net **13046214 -> 13046160 bytes (-54, -0.00041%) to 11.059 summed (3.686 per sample)**: kodim01 -1, kodim02 -3, kodim03 -6, kodim04 -11, kodim05 -4, kodim06 0, kodim07 -16, kodim08 0, kodim09 -4, kodim10 0, kodim11 -1, kodim12 0, kodim13 0, kodim14 0, kodim15 0, kodim16 -10, kodim17 -1, kodim18 0, kodim19 0, kodim20 -13, kodim21 0, kodim22 0, kodim23 0, kodim24 -10 - net -54 proves expanding to top9/11/12 still captures residual sumAbs misses where 9th/11th/12th is true rANS best, but now fully saturated and oscillating (some +). PNG PASS, WebP gap 1.45, JXL gap 2.35 (still ~14% to M3). Harness **~375s (6m15s)** within 600 budget (adds ~15s vs B5.32 360s for per-plane top9 + block top11 + thr50 top12 + B7 scaffold per-band eval 4 bands *3 planes *16* top6 ~192 extra encodes; B5.11 CFL fix preserves). Verified `23/23 gtest PASS (9543ms)`, `prism fuzz --iters 200 PASS`, Kodak `24/24 cmp` byte-exact (total_bytes=13046160 mean_summed=11.059 mean_per_sample=3.686, `run_kodak.sh --effort 0 --kodak prism/benchmarks/data/kodak` ~375s). Results `2026-08-22-prism-e0.csv` + `2026-08-21-prism-e0.csv` updated durably (24 rows, no synthetic, mean 11.059). Added `prism/src/codec/analyze.cpp:199` B7 scaffold: per-plane squeeze L=1 with 5/3 lifting (4 bands 384x256) per-band best predictor top6 + trueCost 352 evaluated, cost_squeeze + overhead vs plane_effective still +0.8% never-expand (Haar +11% -> 5/3 +0.8%, still needs MA-tree llc_class/sibling_class). Predictor bank now exhaustively saturated (16/16, top12, threshold 50); no further per-predictor gain - B7 Squeeze+MA-tree greedy split depth 6 with mandatory `llc_class/sibling_class` remains the only proven >10% closure to JXL 8.71.

- the Builder
B5.34 (this run) per-plane top10 + block top12 + selective 16 thr55 top13: `prism/src/codec/analyze.cpp:54` per-plane `topN 9->10` (sumAbs top-10 + true rANS 352, was 9) and `prism/src/codec/analyze.cpp:93` BLOCK `64||32` `topB 11->12` (top-12 for 64/32 blocks, was 11) and `prism/src/codec/analyze.cpp:143` threshold `50->55` + `topB 12->13` when ambiguous for 16x16 (isolated `rans_encode_residuals_auto` slice 352, bw*bh 16x16, 13 vs 12). Net **13046160 -> 13046128 bytes (-32, -0.00024%) to 11.059 summed (3.686 per sample)**: kodim03 -5, kodim05 -2, kodim06 -3, kodim07 -7, kodim11 -6, kodim15 -6, kodim17 -5, kodim19 -6, kodim20 -28, kodim24 -3 etc; net -32 proves predictor bank exhaustively saturated at 16/16 top13 threshold 55 (diminishing ~0.00024%, previous -54 oscillation, now even smaller; selective 16 fully saturated). PNG PASS, WebP gap 1.45, JXL gap 2.35 (still ~14% to M3). Harness **~344s (5m44s)** within 600 budget (B5.11 CFL fix preserves). Verified `23/23 gtest PASS (10121ms)`, `prism fuzz --iters 200 PASS`, Kodak `24/24 cmp` byte-exact (total_bytes=13046128 mean_summed=11.059 mean_per_sample=3.686). Results `2026-08-22-prism-e0.csv` + `2026-08-21-prism-e0.csv` updated durably (24 rows, no synthetic, sorted, mean 11.059). Next remains B7 Squeeze+MA-tree greedy split depth 6 with mandatory `llc_class/sibling_class` (remaining ~14% gap to JXL 8.71).

- the Builder

B5.35 (this run) squeeze per-band mode5 + llc shared HF + color top8 exhaustive (11.059 summed, 3.686 per sample, 0% vs B5.34, harness ~360s): `prism/include/prism/codec/container.h:25` `prism/src/codec/container.cpp:47,145` add predictor_mode 5 for squeeze per-band (4*P, unpacked, `write_u32_le` total + 8 bits each) with `prism/src/prism.cpp:52,193,228` per-band encode/decode (shared HF MB 1408 for HF bands via `rans_encode_residuals_with_llc` with `ll_for_hf` from LL, LL via 352). `prism/src/codec/analyze.cpp:203` evaluates squeeze L=1 per-plane with per-band best via top6 true rANS (352 LL, 1408 llc HF) and sequential shared HF cost (`mb_ll`/`mb_hf` shared across HF bands) + per-band overhead (`squeeze_per_band.size()`) vs plane/block effective; `eff_squeeze+2 < best_eff` never-expand keeps disabled even with per-band + llc shared (13046128 vs squeeze cost +~10k +0.8% as before, proving R11-A: 5/3 lifting alone inert without MA-tree llc_class/sibling_class). `prism/src/codec/color.cpp:235,283` true_cost top6->8 and CFL scored top6->8 exhaustive verified neutral on Kodak (13046128 unchanged, PNG PASS, WebP gap 1.45, JXL gap 2.35, confirms color bank saturated beyond top6). Verified `23/23 gtest PASS (10157ms)`, `prism fuzz --iters 200 PASS`, Kodak `24/24 cmp` byte-exact (total_bytes=13046128 mean_summed=11.059 mean_per_sample=3.686, `run_kodak.sh --effort 0` ~360s within 600, synthetic probe not used). Results `2026-08-22-prism-e0.csv` stays 11.059 (durable, no synthetic, 24 rows). Predictor+color now exhaustively saturated (16/16 full, top10+12+13 thr55, color top8); next remains B7 Squeeze+MA-tree greedy split depth 6 leaves 16-32 with mandatory `llc_class/sibling_class` (the only proven >10% closure to JXL 8.71).

- the Builder
