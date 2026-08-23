# Prism B8 — CM + LZP Never-Expand Net (M4 < 8.0 stretch)

- **Date:** 2026-08-23
- **Issue:** #117 continuation of #103 (M0 35a2d68)
- **Branch:** opencode/issue117-20260823061608
- **Effort:** B8 — context-mixing (logistic-like expanded leaves) + LZP pre-filter, both never-expand.

## What shipped

B8 wires the **never-expand** CM+LZP net on top of B7's Squeeze+MA-tree, gated `effort>=4` (CM) / `effort>=7` (LZP), global min-total selection per the `architecture-m1-m4.md:148` binding (flags bit0 CM / bit1 LZP, `bypass if not smaller`).

- **CM (`prism/include/prism/codec/cm.h`, `src/codec/cm.cpp`)** — expanded leaf contexts `leaf*4 + activity` (activity bucket 0..3 from `abs(L-TL)+abs(T-TL)`), up to 64 contexts. Same per-leaf `ACModels` WNC adapt (shift 5) but with finer granularity; the global MA-tree already splits on activity, CM further isolates low-vs-high variance residuals inside a leaf. Selected only when the expanded-context encoding is smaller than plain (never-expand).

- **LZP (`prism/include/prism/codec/lzp.h`, `src/codec/lzp.cpp`)** — 12-bit 4096-entry table hashed from `leaf/activity/q(dL)` (`q` quantizes previous residual magnitude). Each residual position emits an adaptive flag bit (`flagProb` 16-bit, WNC) `hit = table[hash]==e`; on `hit==1` no literal is emitted (decoder reuses prediction), on `0` the literal is coded via `encode_residual` with the (optionally expanded) context. Table updated with the true residual for the next occurrence. Flag+literal share one `AEncoder`/`ADecoder` so FIFO stays synchronized. `CM+LZP` combines both: flag stream + expanded contexts for misses.

- **Prism wiring (`prism/src/prism.cpp:26`)** — `encode_band_generic` / `decode_band_generic` implement the four modes `plain / CM / LZP / CM+LZP` (both `isLL` unsigned MED and HF signed paths, online `Feature` with `llc/sibling/res_diff/activity`, `tree.eval` per sample, causal `resHist`). `encode()` performs a **global trial**: for `hasSqueeze` images it trial-encodes all squeezed bands under each candidate (plain, CM, LZP, CM+LZP) and sums bytes, picks the minimal total, sets `hdr.flags` bit0/1 accordingly (`ContainerHeader:15`), then does the real encode with the winning mode. `decode()` branches on `flags & CM_FLAG/LZP_FLAG` and calls `decode_band_generic` with matching `useCM/useLZP`. Non-squeezed planes (BD16 / odd dims) stay plain acoder; never-expand therefore guarantees `effort 7` never exceeds `effort 3` by more than header delta.

- **Build integration (`prism/CMakeLists.txt:12`)** — `cm.cpp`/`lzp.cpp` linked into `prism_core`.

## Verification

- `ctest` 23/23 PASS (incl. `Color.YCoCgRDense`, `Rans.Efficiency` H(p) gate, `Container`, `FuzzGate`).
- `prism fuzz --iters 1000` PASS (1..64 dims, 1..4 ch, BD8/16, efforts 0/1/4/7 mixed, corruption reject via `crc32_all`/`crc32_model`).
- Edge sweep odd/even 1..64 BD8/16 1..4 ch eff 0/1/4/7 PASS.
- Synthetic: `32x32 RGB (i*17+c*31)%256` eff3 788 bytes -> eff7 570 bytes **27.6% win** flags `0x06` (LZP), `64x64 RGB` 3455/1984 -> 1340 **32.5% win** via LZP; `smooth 64x64 (x+y)%256` 114 stable; random `64x64` incompressible 16516 stable (eff4/eff7 equal, never-expand holds); BD16 random 32x32 7752 round-trip OK.
- Never-expand invariant checked: worst-case random band trial picks plain (bit0/1 not set), `eff7 total == eff3 total`.

## Key files

- `prism/include/prism/codec/cm.h` / `src/codec/cm.cpp` — CM expanded leaves
- `prism/include/prism/codec/lzp.h` / `src/codec/lzp.cpp` — LZP hash/table
- `prism/src/prism.cpp` — generic band helpers + global min-total never-expand
- `prism/CMakeLists.txt` — build wiring

## Next

- B9 front-end completeness (WebP/TIFF + ICC), B10 Kodak harness SHA256 pinned, durable CSV per `architecture-m1-m4.md:169`.

- the Builder
