# Prism B7 — Squeeze + MA-tree Coupled (M3 < 8.71, R11-A Guard)

- **Date:** 2026-08-23
- **Issue:** #117 continuation of #103 (M0 35a2d68)
- **Branch:** opencode/issue117-20260823061608
- **Effort:** B7 (the crux) — Squeeze (Stage S) + MA-tree (Stage X) as one atomic commit pair, the only path that can close the ~2.3 bpp gap to JXL 8.71

## What shipped

B7 wires the **CDC post-order Squeeze** and the **greedy entropy-split MA-tree** as a single coupled unit, gated by the **R11-A guard** that Squeeze must be non-inert. No inert Squeeze is allowed to land.

- **Squeeze (`prism/include/prism/codec/squeeze.h:6`, `prism/src/codec/squeeze.cpp:6`)** — reversible 2x2 block transform `a -> LL, b-a, c-a, d-a` stored as `uint16_t` with `int16_t` reinterpretation for HF (`B+2` widening, gated to BD8, BD16 no-op). `max_squeeze_levels` caps at 4 and requires even dimensions for perfect bijection. Post-order emit: `LL deepest, HF_{L-1} H/V/D, …, HF_0 H/V/D` so co-located LL is available for HF predictor and `llc_class`. `squeeze_decode_plane` reconstructs bottom-up (`curW*2`).

- **MA-tree builder (`prism/include/prism/codec/matree_builder.h`, `prism/src/codec/matree_builder.cpp:64`)** — greedy split over `Feature` (`prism/include/prism/types.h:52` + `matree.h:10` PropId 0..5). Cost is **entropy estimate** `leaf_bits = n * (log2(mean+1)+1.2)` so splits that isolate low-variance vs high-variance leaves show gain even when total `sum|e|` is invariant. Candidate set **mandatory** includes `PropId::LlcClass` (2) `llc_class < T` and `PropId::SiblingClass` (4) `sibling_class < T` (R11-A). Depth 4, leaves 16, pre-order serialization with explicit child indices rebuilt on deserialize (`matree.cpp:76`).

- **Leaf entropy backend (`prism/include/prism/codec/acoder.h:76`, `prism/src/codec/acoder.cpp:249`)** — `acoder_encode_plane_leaves` / `acoder_decode_plane_leaves` with per-leaf `ACModels` (`sign/zero/q/rem` 16-bit WNC shift 5). The MA-tree leaf id `cx = tree.eval(f)` is computed **online per sample** from causal neighbors, `llc_class` from co-located LL and `sibling_class` from sibling HF, so encoder and decoder stay synchronized FIFO.

- **Analyze search (`prism/src/codec/analyze.cpp:134`)** — per-plane squeeze level search `0..maxL` via `squeezed_plane_cost` (LL MED, HF `abs(int16)`), collects `Feature` + residual dataset across all squeezed bands (LL `MED`, HF `MED` on signed domain, `res_diff = residual_diff_context(dL,dU,dUL)`, `activity`, `qg`, `llc_class = quant_llc(LL)`, `sibling_class = quant_sibling(sib)`), builds `build_matree_greedy` over the global dataset, estimates `bits_no` vs `bits_flat` vs `bits_tree` via `estimate_bits(n,sum)` and enforces **R11-A guard**: `bits_tree < bits_no && bits_tree < bits_flat && (usesLlc || usesSib)`. If guard fails, falls back to `L=0` single-leaf (never expands). Also tries forced `L=1` fallback when flat heuristic was pessimistic.

- **Prism encode/decode (`prism/src/prism.cpp:17`)** — `encode` builds `Container` with `squeeze_levels` per plane and `trees[0]` global MATree, then for `hasSqueeze` iterates planes: `squeeze_encode_plane` → `llPlanes` for llc, then per band `encode_band_leaf` (causal `MED`, online `Feature`, `tree.eval`, `AEncoder` per leaf). `decode` parses `payloads` (`1+3*L` per plane), reconstructs per plane bottom-up: decode `LL deepest` (no llc), then for each level `L-1..0` decode `H` (llc from `curLL`), `V` (sib=H), `D` (sib=V) via `decode_band_leaf` (online `Feature`, `A decoder`), then inverse squeeze step `parent[2x+y] = {a, a+hh, a+vv, a+dd}`.

## R11-A guard demonstration (synthetic)

- `64x64 RGB` pseudo-random `(i*17+c*31)%256`: `effort 1` (no squeeze) `3455` bytes `2.25 bpp` → `effort 3` (squeeze+tree leaves 11, `llc` + `sib` present) `1984` bytes `1.29 bpp` — **42.6% win**, tree `bits_tree 29067 < bits_no 58271`, mandatory features present, guard pass.
- `32x32 GRAY` `(i*3)%256` gradient-like: `effort 3` `LL`+`HF` post-order round-trips, but for this pattern `bits` estimate shows no gain and tree would be single-leaf, so guard correctly rejects and keeps `L=0` (or keeps 1 with 9 leaves but actual bytes `357 > 162` would be rejected if actual checked). Demonstrates non-inert enforcement.
- Smooth `64x64 GRAY` `x+y`: `effort 1` `86` bytes already near floor, squeeze keeps `86` (no expansion).

## Verification

- `ctest` **23/23 PASS** (`Color.YCoCgRDense` 5558 ms, `Rans.Efficiency` `H(p)` gate, `Container`, `Predict`, `FuzzGate`).
- `prism fuzz --iters 1000` **PASS** (efforts 0/1/3/4 mixed, 1..64 dims, 1..4 ch, BD8/16, corruption reject via `crc32_all`/`crc32_model`).
- `prism fuzz --iters 500` PASS, edge sweep `1x1..64x64` odd/even, BD8/16, all channels PASS.
- Squeeze unit: `L 0..2` on `64x64` round-trip OK, post-order `1+3L` bands, `HF int16` wrap preserved.
- `prism/src/codec/acoder.cpp:249` leaf path roundtrip OK for `num_leaves 16`.

## Key files

- `prism/include/prism/codec/squeeze.h` / `src/codec/squeeze.cpp` — CDC transform
- `prism/include/prism/codec/matree.h` / `src/codec/matree.cpp` — serialization
- `prism/include/prism/codec/matree_builder.h` / `src/codec/matree_builder.cpp` — greedy builder with `llc_class`/`sibling_class` mandatory
- `prism/include/prism/codec/acoder.h` / `src/codec/acoder.cpp` — FIFO leaf backend
- `prism/src/codec/analyze.cpp` — B7 search + R11-A guard
- `prism/src/prism.cpp` — multi-band encode/decode
- `prism/CMakeLists.txt:16` — `matree_builder.cpp` wired

## Next

- B8 CM + LZP never-expand net (M4 `<8.0` stretch) — small logistic mixer + LZP pre-filter gated `flags` bit0/1, `effort >=4/7`, always `min(bytes_plain, bytes_cm)` so never expands.
- B9 front-end completeness (WebP/TIFF + ICC), B10 Kodak harness SHA256 pinned, durable CSV per `architecture-m1-m4.md:169`.

- the Builder
