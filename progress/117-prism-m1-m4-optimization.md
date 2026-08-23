# Progress - Prism M1-M4 optimization loop (#117)

- **Issue:** #117 continuation of #103 (M0 merged via 35a2d68)
- **Branch:** opencode/issue117-20260823061608
- **Status:** in_progress - B8 CM+LZP never-expand WIRED (M4 stretch net). Best-known entry: 11.120 bpp (B5.17) — B7 42.6% win + B8 32% LZP win on patterned 64x64 (1984->1340) while random never-expands.
- **Merge gate (binding):** M0 23/23 gtest + fuzz 1000 + corruption reject + real Kodak 24-image byte-exact MUST stay green; M1 <13.05 & <9.61, M2 <9.71, M3 <8.71 + R11-A guard on REAL Kodak corpus with durable CSV. No synthetic CSV.

## Checklist

- [x] B0-B4 M0 foundation (scaffold, rANS fixed 32-bit, container PRSM, fuzz gate) - DONE merged
- [x] Architect blueprint M1-M4 (`prism/docs/architecture-m1-m4.md`) - FIFO acoder.h decision + R11-A guard
- [x] B5 Predictor bank + residual-DIFF context + FIFO adaptive backend (M1: <9.61 WebP) - WIRED and verified (acoder.h FIFO, 343-context residual-DIFF, activity helper, per-plane predictor selection over P0..P8; 8-15% bpp improvement on synthetic; 23/23 gtest + fuzz 1000 PASS retained)
- [x] B6 CFL + 5/3 lifting + 16-bit widening (M2: <9.71) - WIRED `color.h:6` Lift53 gated to BD8, CFL `apply_cfl`/`invert_cfl` strict-superset `s=0` identity, 16-bit widening BD16 guarded (YCoCg stays None, Lift53 no-op for BD16), analyze searches base transform (None/YCoCgR/SubGreen/Lift53) + per-chroma s in 0..7 + predictor bank on transformed raster; `prism.cpp:27` always via `apply_color` so CFL with ct==None handled; 23/23 gtest + fuzz 1000 PASS
- [x] B7 Squeeze + MA-tree coupled with mandatory llc_class/sibling_class + R11-A guard (M3: <8.71) - WIRED `squeeze.h:6` CDC post-order (a, b-a, c-a, d-a, int16 HF, B+2), `matree_builder.h` greedy depth 4 leaves 16 with entropy `log2(mean+1)` cost and mandatory `llc_class`/`sibling_class`, `acoder.h:76` leaf backend, `analyze.cpp:134` R11-A guard (`bits_tree < bits_no && bits_tree < bits_flat && usesLlc||usesSib`), `prism.cpp:17` multi-band encode/decode bottom-up; synthetic 64x64 RGB 3455->1984 bytes (42.6% win, 1.29 bpp) leaves 11 with llc+sib, 23/23 gtest + fuzz 1000 PASS retained
- [x] B8 CM + LZP never-expand net (M4 stretch <8.0) - WIRED `cm.h`/`lzp.h` global never-expand (flags bit0 CM/ bit1 LZP, effort>=4/7, trial encode picks min total, plain fallback; CM expanded leaves `leaf*4+activity` up to 64, LZP hash `leaf/activity/q(dL)` 4K table with flag stream, both wrapped around acoder leaf backend, never-expands vs plain)
- [ ] B9 Front-end completeness (WebP/TIFF + ICC)
- [ ] B10 Real Kodak harness keep wired (SHA256 pinned)

## Current step

B8 COMPLETE: CM+LZP never-expand net wired (`prism/include/prism/codec/cm.h` CM_FLAG 0x01 expanded leaves `leaf*4+activity`, `prism/include/prism/codec/lzp.h` LZP_FLAG 0x02 hash `lzh(leaf,act,q(dL))` 12-bit 4K table + adaptive flag prob, `prism/src/prism.cpp:26` `encode_band_generic`/`decode_band_generic` with optional CM/LZP, global candidate trial (plain/CM/LZP/CM+LZP total bytes, pick min) gated `effort>=4` CM `effort>=7` LZP and `hasSqueeze`. `prism/src/codec/cm.cpp`/`lzp.cpp` stubs, `CMakeLists:12` linked. Verified: 23/23 gtest PASS, `prism fuzz --iters 1000` PASS, edge odd/BD16 PASS, synthetic 32x32 788->570 bytes (27% LZP win) 64x64 1984->1340 bytes (32% LZP win), random 64x64 16516 stable (never-expand), smooth 114 stable.

Next: B9/B10 wiring. Merge gate still requires real Kodak `prism bench --effort 3 --kodak DIR` mean_summed `<8.71` bit-exact with durable CSV — not yet measured (synthetic only).

## Log

- **2026-08-23 Architect:** Delivered `architecture-m1-m4.md` binding: FIFO adaptive backend for per-context models, R11-A guard that Squeeze+MA-tree must beat no-Squeeze baseline.
- **2026-08-23 Builder:** B5 wired - `acoder.h`/`acoder.cpp` (FIFO range coder, adapt shift 5, 343 residual-DIFF contexts, activity_class helper), container flags bit2, `analyze.cpp` per-plane predictor selection, `prism.cpp` acoder path for effort>=1. Verified: 23/23 gtest PASS, fuzz 1000 PASS, synthetic 64x64 9017->8281 bytes (8.2% bpp win) and 128x128 smooth 40417->34439 bytes (14.8% win), adaptive H(p) 0.892 vs 0.881 within epsilon.
- **2026-08-23 Builder B6:** Wired CFL + 5/3 + 16-bit widening - `color.h:6` adds `Lift53` enum and `lift53_forward/inverse` decls, `color.cpp` implements `apply_cfl`/`invert_cfl` (wide-mask 0xFFFF for YCoCg widened chroma) + `lift53_forward/inverse` (5/3 horizontal/vertical lifting, BD8 only, stored u16 widened) + unified `apply_color`/`invert_color` with CFL after base and Lift53 branch; `analyze.cpp` searches color bank (BD8 YCoCgR/SubGreen + Lift53 gated to BD8, BD16 only SubtractGreen) then per-chroma CFL s 0..7 (gated off YCoCg to avoid 10-bit wrap) then predictor P0..P8 on transformed raster; `prism.cpp` always delegates to `apply_color`/`invert_color` (covers CFL with ct==None). Verified: 23/23 gtest PASS (incl. YCoCgRDense), fuzz 1000 PASS, synthetic eff2 probe exercised, CFL roundtrip and Lift53 roundtrip unit-checked. Next B7 per R11-A guard.
- **2026-08-23 Builder B7:** Wired Squeeze+MA-tree coupled atomic — `squeeze.h:6` CDC post-order `a,b-a,c-a,d-a` `int16` HF `B+2`, `max_squeeze_levels` even dims cap4; `matree_builder.h` greedy depth4 leaves16 `leaf_bits` `log2(mean+1)` with mandatory `llc_class`/`sibling_class`; `acoder.h:76` leaf backend `encode_band_leaf` online `Feature` (`qg`, `band_class`, `llc_class=quant_llc(LL)`, `res_diff`, `sibling_class=quant_sibling`, `activity`) + `MED` predictor, `tree.eval` per sample; `analyze.cpp:134` R11-A guard `bits_tree < bits_no && bits_tree < bits_flat && (usesLlc||usesSib)` with forced `L=1` trial; `prism.cpp:17` multi-band bottom-up decode (`LL deepest` then `H/V/D` per level, `squeeze_decode` inverse). Verified: 23/23 gtest PASS, fuzz 1000 PASS, edge odd/BD16 PASS, squeeze `L0..2` roundtrip OK, synthetic `64x64 RGB` `3455->1984` bytes (1.29 bpp, leaves 11, llc+sib) demonstrates coupled win, `64x64` smooth `86` bytes floor retained.
- **2026-08-23 Builder B8:** Wired CM+LZP never-expand net — `cm.h`/`lzh` `cm_expanded_leaves` `cm_context` + `lzp.h` `LZP_TABLE 4K` `lzp_hash`, `prism.cpp` `encode_band_generic`/`decode_band_generic` (CM leaf*4+activity upto 64, LZP flag+table on residual stream, combined CM+LZP), global min-total never-expand (plain/CM/LZP/CM+LZP all trial-encoded, smallest wins, flags bit0/1 via `ContainerHeader:15`, `hasSqueeze` gated, effort>=4/7). Verified: 23/23 gtest PASS, fuzz 1000 PASS, edge odd/BD16 PASS, synthetic 32x32 788->570 (LZP 27% win, flags 0x06), 64x64 1984->1340 (32% win), random incompressible stable.
- **Next:** B9/B10 wiring per architecture-m1-m4.md build order.

- the Builder
