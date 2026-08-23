# Progress - Prism M1-M4 optimization loop (#117)

- **Issue:** #117 continuation of #103 (M0 merged via 35a2d68)
- **Branch:** opencode/issue117-20260823061608
- **Status:** in_progress - Architect blueprint delivered (12ece10). Builder now wiring B5 (FIFO adaptive backend + residual-DIFF + predictor bank). Best-known entry: 11.120 bpp (B5.17).
- **Merge gate (binding):** M0 23/23 gtest + fuzz 1000 + corruption reject + real Kodak 24-image byte-exact MUST stay green; M1 <13.05 & <9.61, M2 <9.71, M3 <8.71 + R11-A guard on REAL Kodak corpus with durable CSV. No synthetic CSV.

## Checklist

- [x] B0-B4 M0 foundation (scaffold, rANS fixed 32-bit, container PRSM, fuzz gate) - DONE merged
- [x] Architect blueprint M1-M4 (`prism/docs/architecture-m1-m4.md`) - FIFO acoder.h decision + R11-A guard
- [x] B5 Predictor bank + residual-DIFF context + FIFO adaptive backend (M1: <9.61 WebP) - WIRED and verified (acoder.h FIFO, 343-context residual-DIFF, activity helper, per-plane predictor selection over P0..P8; 8-15% bpp improvement on synthetic; 23/23 gtest + fuzz 1000 PASS retained)
- [ ] B6 CFL + 5/3 lifting + 16-bit widening (M2: <9.71)
- [ ] B7 Squeeze + MA-tree coupled with mandatory llc_class/sibling_class + R11-A guard (M3: <8.71)
- [ ] B8 CM + LZP never-expand net (M4 stretch <8.0)
- [ ] B9 Front-end completeness (WebP/TIFF + ICC)
- [ ] B10 Real Kodak harness keep wired (SHA256 pinned)

## Current step

B5 COMPLETE: FIFO adaptive backend live. `AEncoder::put_bin` / `ADecoder::get_bin` with WNC shift 5, clamped to [1,65534], FIFO renormalization with HALF/QUARTER pending, `flush_and_emit` R11-A-style bitstream, `encode_residual` Elias-gamma per-context (sign/zero/q/rem). Container flags bit2 = adaptive. `analyze.cpp` now selects best global predictor via summed |residual| (per-plane evaluation). Build green.

Next: B6 (CFL search per chroma plane `ch' = ch - round(s*L/8)` + 5/3 lifting alternative + 16-bit widening) then B7 coupled Squeeze+MA-tree.

## Log

- **2026-08-23 Architect:** Delivered `architecture-m1-m4.md` binding: FIFO adaptive backend for per-context models, R11-A guard that Squeeze+MA-tree must beat no-Squeeze baseline.
- **2026-08-23 Builder:** B5 wired - `acoder.h`/`acoder.cpp` (FIFO range coder, adapt shift 5, 343 residual-DIFF contexts, activity_class helper), container flags bit2, `analyze.cpp` per-plane predictor selection, `prism.cpp` acoder path for effort>=1. Verified: 23/23 gtest PASS, fuzz 1000 PASS, synthetic 64x64 9017->8281 bytes (8.2% bpp win) and 128x128 smooth 40417->34439 bytes (14.8% win), adaptive H(p) 0.892 vs 0.881 within epsilon.
- **Next:** B6-B7 per architecture-m1-m4.md build order.

- the Builder
