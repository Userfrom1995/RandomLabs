# Progress - Prism (next-gen lossless image codec, C++)

- **Issue:** #103
- **Branch:** opencode/issue103-20260821075928
- **Status:** in_progress. M0 bit-exact round-trip + corruption-rejection fuzz gate is REAL and passing (23/23 gtest, `prism fuzz` PASS). The rANS coder is a true 32-bit rANS (ryg port) with a FIXED per-bin probability and Elias-gamma magnitude coding; it is LIFO-safe and round-trips exactly. Adaptive (per-context) probabilities are DEFERRED to M1 because a single running adaptive model cannot round-trip rANS (decoder updates in reverse order and desyncs). Beating JPEG XL still requires M1-M4 (Squeeze + MA-tree coupling). Corrected 2026-08-21 by the Fixer after Reviewer findings F1/F2/F3.
- **Predecessor lesson source:** Obsidian (issue #68) progress at
  `progress/68-obsidian-lossless-image-codec.md` - plateaued at 9.5208 bpp
  (PNG 13.05 MET, WebP 9.61 MET, JPEG XL 8.71 NOT MET, +0.81 bpp).

## Research deliverables (Dr. Mob, the Researcher, 2026-08-21)

- `prism/docs/research.md` - literature review + SOTA survey. Conclusion: the
  JPEG XL gap is a redundancy-class gap (multi-resolution + meta-adaptive
  context), not a coder-efficiency gap. Squeeze + MA-tree context model are the
  two mandatory mechanisms; they must ship together (Obsidian R11-A proved
  Squeeze alone is inert without the context model).
- `prism/docs/algorithmic-spec.md` - full algorithm contract: front-end
  normalization (PNG/JPEG/BMP/TIFF/WebP/PPM/raw -> canonical planar raster),
  reversible color decorrelation set (YCoCg-R, subtract-green, CFL, 5/3 lifting),
  mandatory Squeeze (JPEG XL CDC, post-order emit), predictor bank + weighted
  least-squares, **MA-tree context model (Stage X, the differentiator)**,
  context-modeled rANS entropy with CM (logistic mixer + SSE) and LZP high-effort
  modes, container format, complexity budget, M0-M4 milestone map.
- `prism/docs/benchmark-methodology.md` - Kodak protocol, bpp definition (summed
  convention so JXL = 8.71, matching the Obsidian harness), fuzz + corruption
  fidelity gates, numeric milestone acceptance criteria (M0 exact round-trip, M1
  < PNG+WebP, M2 < JPEG-LS, M3 < JPEG XL, M4 < 8.0 stretch), reproducibility +
  speed-regression guards.

## Key research decisions

1. Language = C++ (issue mandate; honest fit vs JXL/WebP).
2. Format-agnostic bitstream: front-end decodes to canonical raster; codec
   compresses the raster; lossless = bit-exact raster equality with decoded input.
3. Squeeze is MANDATORY and coupled with the MA-tree context model.
4. rANS binary decomposition (sign + zero-flag + Rice quotient + remainder), each
   bin a per-context adaptive 16-bit probability (JXL WNC/CABS style), with the
   mandatory correct-coder efficiency gate carried from Obsidian R4.
5. CM (context mixing) and LZP are opt-in high-effort modes behind a
   never-expand safety net.
6. Bit-exact invariant is the M0 blocker gate (all efforts, Kodak + fuzz).

## Milestone map (benchmark-driven on Kodak, summed-bpp gates)

- M0: bit-exact round-trip (blocker, no bpp target).
- M1: < 13.05 (PNG) and < 9.61 (WebP).
- M2: < 9.71 (JPEG-LS).
- M3 (owner goal): < 8.71 (JPEG XL) - requires Squeeze + MA-tree both landed.
- M4 (stretch): < 8.0 via CM mode.

Owner override: no merge until M0 + M1 + M2 + M3 are all met bit-exactly on real
Kodak. `data/kodak` must be durably provisioned (Obsidian lesson: its absence
made gates unmeasurable for many iterations).

## Current step

M0 COMPLETE and verified 2026-08-21: 23/23 gtest PASS, `prism fuzz --iters 1000` PASS,
corruption-rejection PASS, PPM end-to-end byte-exact, frontend PNG/JPEG/BMP/PPM/raw
via `decode_to_raster`. Container is exactly `PRSM` LE header + bit-packed model
blob (`crc32_model`) + post-order payload + `crc32_all` footer per
`prism/docs/architecture.md` Section 3.

**Architect blueprint for the M1-M4 loop (#117):** `prism/docs/architecture-m1-m4.md`
authored 2026-08-23. It resolves the M0 LIFO/adaptive deferral by adding a
**FIFO adaptive range coder (`acoder.h`)** backend for all per-context adaptive
modeling (B5+) while keeping rANS for the static M0 path; specifies B5-B10 with
the binding **R11-A guard** (Squeeze + MA-tree must land coupled with mandatory
`llc_class`/`sibling_class`, and must beat the no-Squeeze baseline or the commit
is rejected). Best-known entering state: 11.120 bpp (B5.17).

**Builder B5 (2026-08-23):** FIFO adaptive backend WIRED on branch `opencode/issue117-20260823061608`. `acoder.h` FIFO range coder with WNC shift 5, 343-context residual-DIFF, activity helper, per-plane predictor selection. Container flags bit2 = adaptive (effort>=1). Verified 23/23 gtest + fuzz 1000 PASS, synthetic wins 8-15% bpp, adaptive H(p) within epsilon. M1 gate requires real Kodak - not yet measured (data/kodak missing).

Next: B6 (CFL + 5/3 + 16-bit) for M2, then B7 (Squeeze+MA-tree coupled, R11-A guard) for M3 < 8.71. Owner override: no merge until M0+M1+M2+M3 pass bit-exactly on real Kodak.

## Architectural build checklist

- [x] B0 Scaffolding: CMake, types/bitstream/crc32, Raster, prism.h, CLI skeleton, gtest.
- [x] B1 rANS core (Stage E): true 32-bit rANS (ryg port) + FIXED per-bin probabilities + Elias-gamma magnitude coding + H(p)+epsilon efficiency gate. NOTE: this is NOT the adaptive context model from the spec; a running adaptive model cannot round-trip rANS (LIFO), so fixed prob is used in M0 and causal context modelling is M1 work. `RansEncoder`/`RansDecoder` removed, `rans_encode_bits`/`rans_decode_bits` added for the gate test.
- [x] B2 Color + MED predict (Stage C/P): YCoCg-R now reversible + MED + single global context. YCoCg-R is gated to None at M0 (analyze.cpp) and full-range 16-bit needs widened storage (M2); the transform itself is verified lossless on a dense 8-bit lattice and the BD16 test range.
- [x] B3 Container (Stage H): exact header/model/payload/footer + CRC32 gates.
- [x] B4 Fuzz gate (M0 BLOCKER): fuzz_gate round-trip + corruption rejection - PASS (23 tests, 1000 iters fuzz).
- [ ] B5 Predictor bank + residual-DIFF context (M1: < PNG 13.05, < WebP 9.61).
- [ ] B6 CFL + 5/3 lifting (M2: < JPEG-LS 9.71).
- [ ] B7 Squeeze + MA-tree coupled (M3: < JPEG XL 8.71; llc_class + sibling_class).
- [ ] B8 CM + LZP high-effort (M4 stretch: < 8.0, never-expand net).
- [ ] B9 Front-end completeness: WebP/TIFF decoders + ICC linearization.

## Build log (Builder, 2026-08-21)

- **Status:** in_progress. M0 bit-exact + corruption gates are real and PASS; the rANS coder is a true 32-bit rANS (Fixer, 2026-08-21) with the H(p)+epsilon gate.
- **B0:** scaffolded CMake, types/bitstream/crc32, Raster, prism.h, frontend stubs, CLI, vendored stb_image.
- **B1:** rans.h, true 32-bit rANS (ryg port) with FIXED per-bin probabilities + Elias-gamma magnitude + H(p)+epsilon efficiency gate test (raw-packing stub replaced by real coder). Adaptive per-context models deferred to M1 (LIFO desync).
- **B2:** color YCoCg-R (gated), predict MED/GAP/etc, residual compute/reconstruct.
- **B3:** container encode/decode with PRSM magic, LE header, model_len, model blob CRC, payload bands, footer CRC_all; MA-tree single-leaf ser/des.
- **B4:** gtest 23 PASS, prism fuzz 1000 PASS, corruption rejection PASS, PPM end-to-end byte-exact.
- **Hardening (final):** fixed -Wunused warnings (container.cpp, prism.cpp, predict.cpp), rebuilt Release + Debug with gtest, 23/23 PASS, `prism fuzz --iters 1000` PASS, verified PRSM magic and `crc32_all`/`crc32_model` rejection, PPM 4x4 roundtrip byte-exact.
- **Next:** B5-B7 per milestone map; Squeeze must be coupled with MA-tree llc_class/sibling_class (Obsidian R11-A lesson). M1-M4 are the optimization loop after M0 merges.

- the Builder
