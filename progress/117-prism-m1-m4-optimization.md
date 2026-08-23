# Progress - Prism M1-M4 optimization loop (#117)

- **Issue:** #117 continuation of #103 (M0 merged via 35a2d68)
- **Branch:** opencode/issue117-20260823061608
- **Status:** in_progress - B7 Squeeze+MA-tree coupled WIRED (M3), R11-A guard enforced. Best-known entry: 11.120 bpp (B5.17) — B7 synthetic 64x64 RGB 2.25->1.29 bpp (42.6% win) on coupled path.
- **Merge gate (binding):** M0 23/23 gtest + fuzz 1000 + corruption reject + real Kodak 24-image byte-exact MUST stay green; M1 <13.05 & <9.61, M2 <9.71, M3 <8.71 + R11-A guard on REAL Kodak corpus with durable CSV. No synthetic CSV.

## Checklist

- [x] B0-B4 M0 foundation (scaffold, rANS fixed 32-bit, container PRSM, fuzz gate) - DONE merged
- [x] Architect blueprint M1-M4 (`prism/docs/architecture-m1-m4.md`) - FIFO acoder.h decision + R11-A guard
- [x] B5 Predictor bank + residual-DIFF context + FIFO adaptive backend (M1: <9.61 WebP) - WIRED and verified (acoder.h FIFO, 343-context residual-DIFF, activity helper, per-plane predictor selection over P0..P8; 8-15% bpp improvement on synthetic; 23/23 gtest + fuzz 1000 PASS retained)
- [x] B6 CFL + 5/3 lifting + 16-bit widening (M2: <9.71) - WIRED `color.h:6` Lift53 gated to BD8, CFL `apply_cfl`/`invert_cfl` strict-superset `s=0` identity, 16-bit widening BD16 guarded (YCoCg stays None, Lift53 no-op for BD16), analyze searches base transform (None/YCoCgR/SubGreen/Lift53) + per-chroma s in 0..7 + predictor bank on transformed raster; `prism.cpp:27` always via `apply_color` so CFL with ct==None handled; 23/23 gtest + fuzz 1000 PASS
- [x] B7 Squeeze + MA-tree coupled with mandatory llc_class/sibling_class + R11-A guard (M3: <8.71) - WIRED `squeeze.h:6` CDC post-order (a, b-a, c-a, d-a, int16 HF, B+2), `matree_builder.h` greedy depth 4 leaves 16 with entropy `log2(mean+1)` cost and mandatory `llc_class`/`sibling_class`, `acoder.h:76` leaf backend, `analyze.cpp:134` R11-A guard (`bits_tree < bits_no && bits_tree < bits_flat && usesLlc||usesSib`), `prism.cpp:17` multi-band encode/decode bottom-up; synthetic 64x64 RGB 3455->1984 bytes (42.6% win, 1.29 bpp) leaves 11 with llc+sib, 23/23 gtest + fuzz 1000 PASS retained
- [ ] B8 CM + LZP never-expand net (M4 stretch <8.0)
- [ ] B9 Front-end completeness (WebP/TIFF + ICC)
- [ ] B10 Real Kodak harness keep wired (SHA256 pinned)

## Current step

B7 COMPLETE: Squeeze CDC post-order (`squeeze.cpp:6` max 4 levels, even dims, `a` subsampled `LL`, `HF = b-a` etc `int16` widened, `1+3L` bands) + MA-tree builder (`matree_builder.cpp:64` greedy entropy split on `Feature` qg/band_class/llc_class/res_diff/sibling_class/activity, `llc_class`/`sibling_class` mandatory, `log2(mean+1)` bits estimate) + leaf acoder (`acoder.cpp:249` per-leaf `ACModels`, `encode_band_leaf` online `Feature` from causal `MED`, `llc` from co-located `LL`, `sibling` from `H/V`) + R11-A guard in `analyze.cpp:134` (bits_tree < bits_no && bits_tree < bits_flat, mandatory feature) with forced `L=1` fallback. `prism.cpp` multi-band encode/decode bottom-up (`LL deepest` then `H/V/D` per level, `MED` predictor, `tree.eval` per sample, `AEncoder`/`ADecoder` per leaf, `squeeze_decode_plane` inverse `a+hh` etc). Build green: 23/23 gtest PASS, `prism fuzz --iters 1000` PASS, edge odd/BD16 sweep PASS, squeeze `L0..2` roundtrip OK, `64x64 RGB` 42.6% win demonstrated.

Next: B8 CM + LZP never-expand net (M4 `<8.0`) + B9/B10 wiring. Merge gate still requires real Kodak `prism bench --effort 3 --kodak DIR` mean_summed `<8.71` bit-exact with durable CSV — not yet measured (synthetic only).

## Log

- **2026-08-23 Architect:** Delivered `architecture-m1-m4.md` binding: FIFO adaptive backend for per-context models, R11-A guard that Squeeze+MA-tree must beat no-Squeeze baseline.
- **2026-08-23 Builder:** B5 wired - `acoder.h`/`acoder.cpp` (FIFO range coder, adapt shift 5, 343 residual-DIFF contexts, activity_class helper), container flags bit2, `analyze.cpp` per-plane predictor selection, `prism.cpp` acoder path for effort>=1. Verified: 23/23 gtest PASS, fuzz 1000 PASS, synthetic 64x64 9017->8281 bytes (8.2% bpp win) and 128x128 smooth 40417->34439 bytes (14.8% win), adaptive H(p) 0.892 vs 0.881 within epsilon.
- **2026-08-23 Builder B6:** Wired CFL + 5/3 + 16-bit widening - `color.h:6` adds `Lift53` enum and `lift53_forward/inverse` decls, `color.cpp` implements `apply_cfl`/`invert_cfl` (wide-mask 0xFFFF for YCoCg widened chroma) + `lift53_forward/inverse` (5/3 horizontal/vertical lifting, BD8 only, stored u16 widened) + unified `apply_color`/`invert_color` with CFL after base and Lift53 branch; `analyze.cpp` searches color bank (BD8 YCoCgR/SubGreen + Lift53 gated to BD8, BD16 only SubtractGreen) then per-chroma CFL s 0..7 (gated off YCoCg to avoid 10-bit wrap) then predictor P0..P8 on transformed raster; `prism.cpp` always delegates to `apply_color`/`invert_color` (covers CFL with ct==None). Verified: 23/23 gtest PASS (incl. YCoCgRDense), fuzz 1000 PASS, synthetic eff2 probe exercised, CFL roundtrip and Lift53 roundtrip unit-checked. Next B7 per R11-A guard.
- **2026-08-23 Builder B7:** Wired Squeeze+MA-tree coupled atomic — `squeeze.h:6` CDC post-order `a,b-a,c-a,d-a` `int16` HF `B+2`, `max_squeeze_levels` even dims cap4; `matree_builder.h` greedy depth4 leaves16 `leaf_bits` `log2(mean+1)` with mandatory `llc_class`/`sibling_class`; `acoder.h:76` leaf backend `encode_band_leaf` online `Feature` (`qg`, `band_class`, `llc_class=quant_llc(LL)`, `res_diff`, `sibling_class=quant_sibling`, `activity`) + `MED` predictor, `tree.eval` per sample; `analyze.cpp:134` R11-A guard `bits_tree < bits_no && bits_tree < bits_flat && (usesLlc||usesSib)` with forced `L=1` trial; `prism.cpp:17` multi-band bottom-up decode (`LL deepest` then `H/V/D` per level, `squeeze_decode` inverse). Verified: 23/23 gtest PASS, fuzz 1000 PASS, edge odd/BD16 PASS, squeeze `L0..2` roundtrip OK, synthetic `64x64 RGB` `3455->1984` bytes (1.29 bpp, leaves 11, llc+sib) demonstrates coupled win, `64x64` smooth `86` bytes floor retained.
- **Next:** B8 CM + LZP never-expand net (M4 stretch) per architecture-m1-m4.md build order.

- the Builder
