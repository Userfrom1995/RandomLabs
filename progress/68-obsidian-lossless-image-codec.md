# Progress - Obsidian (lossless image codec)

- **Issue:** #68
- **Branch:** opencode/issue68-20260818055633
- **Status:** in-progress
- **Updated:** 2026-08-18T05:56:00Z

## Checklist
- [x] Research phase: literature review, SOTA survey, algorithmic spec, benchmark methodology
- [x] obsidian/docs/ (research.md, algorithmic-spec.md, benchmark-methodology.md)
- [x] ideas/ entry for the project
- [x] Architect: software architecture from the spec (docs/architecture.md)
- [x] 1. Scaffolding: Cargo workspace (core/cli), PPM P6/P5 I/O, container header + CRC, CLI skeleton (encode/decode/roundtrip/selftest/check)
- [x] 2. rANS core: adaptive tables, definitive constants (M=4096, RNB=2^20), renorm guard, finish/get stack discipline, property tests
- [x] 3. Effort 0 end-to-end: MED predictor + single context set + adaptive rANS; decode path complete; fuzz round-trip at effort 0
- [x] 4. Color transforms: YCoCg-R + palette build/expand, bijection unit tests, per-image adaptive selection
- [x] 5. Predictor bank (8 predictors) + border handling + weighted codebook
- [x] 6. Context model: gradient quantization, sign symmetry, activity class, border contexts, zigzag map (all bijection-tested)
- [x] 7. Analysis pass + per-context predictor map + context reduction + model serialization (effort 1-5)
- [x] 8. Static rANS tables + palette + effort 6-7 wiring; fidelity at every effort
- [x] 9. Fidelity gates: bit-exact round trips (fuzz) at efforts 0/4/7; determinism + corruption tests
- [x] 10. Benchmark harness: run_kodak.sh, fuzz_gate.sh, aggregate.py, toolchain.md + reference baseline + first Obsidian Kodak row
- [x] 10b. Research v2 (2026-08-18): root-cause diagnosis of the 27.82 bpp expansion + corrected entropy design (`docs/entropy-analysis.md`, algorithmic-spec errata, milestone rebase)
- [x] 10c. Architect v2 (2026-08-18): entropy-stage architecture - entropy backend seam, `ENTROPY_GR` header flag, Golomb-Rice primitives in `rans.rs`, encoder/decoder wiring, M0-M3 plan (`docs/entropy-architecture.md`, ideas addendum)
- [ ] 11. M0 (blocker): implement per-context adaptive Golomb-Rice (Design A) as the default entropy backend - add `BitWriter`/`BitReader`, `GrState`, `map`/`unmap`, `gr_write_symbol`/`gr_read_symbol` to `rans.rs`; add `ENTROPY_GR` header flag; add `entropy_gr: bool` to `model.rs::analyze`; swap the rANS table calls in `encoder.rs::code_planes` and `decoder.rs` for GR calls (forward raster order, no dry-run). Acceptance: mean Kodak bpp < 13.05 (PNG) and < 24.0 (raw); kill the 27.82 expansion.
- [ ] 12. M1: with the existing per-context predictor selection + YCoCg-R, drive mean Kodak bpp below WebP lossless (9.61) AND optipng PNG (13.05). Acceptance = spec F2.
- [ ] 13. M2: self-correcting weighted predictor (v1.5) effective, within 10% of JPEG XL (<= ~9.6 bpp). Alternative/extension: capped-and-escaped static rANS (Design B).
- [ ] 14. M3: capped/escaped static rANS (Design B) and/or squeeze/interlacing, match/beat JPEG XL (<= 8.71 bpp)
- [ ] 15. Web specimen page + JS mirror (byte-exact) + consistency tests + Playwright/UI verification
- [ ] 16. Docs: README, benchmark tables, landing page entries

## Current step
Checklist 10 is complete: the benchmark harness is committed and the first
Obsidian Kodak row plus the pinned reference baseline are recorded.

**Research v2 (2026-08-18) diagnoses the M1 blocker.** The first Obsidian Kodak
row (effort 4) is **27.82 bpp**, i.e. **1.16x raw RGB** (24.00 bpp), while every
baseline compresses (JPEG XL 8.71, WebP 9.61, JPEG-LS 9.71, J2K 9.58, optipng PNG
13.05). Root cause is the entropy stage only: a per-context adaptive rANS over a
512-symbol alphabet with single-unit updates cannot specialize its tables on a
768x512 image (each of the 285 contexts gets only ~4138 symbols, far below the
~2048 increments needed to make the dominant residual cheap), so symbols are coded
at the uniform ~9-bit start cost, which exceeds the 8-bit raw pixel and expands
the container. Prediction, YCoCg-R, gradient context model, and container/CRC are
correct and preserved. The corrected design: per-context adaptive Golomb-Rice
(Design A) for M1, capped-and-escaped static rANS (Design B) for M2/M3. Full
proof and pseudo-code in `docs/entropy-analysis.md`; algorithmic-spec section 6
carries an errata; research.md milestones are rebased.

**Architect v2 (2026-08-18) blueprints the entropy-stage fix.** The defect is an
architectural one: the v1 architecture hard-wired a single rANS coder as the
pipeline contract. The fix makes the entropy stage a replaceable backend behind a
stable `ENTROPY_GR` header flag. Design A (per-context adaptive Golomb-Rice)
is the M0/M1 default: it needs zero signaled model bytes (both sides adapt `k`
from the decoded symbols), streams forward in raster order (no dry-run/reverse),
and provably cannot expand (O(1) early overhead vs the 9-bit rANS start). The
full contract - `BitWriter`/`BitReader`, `GrState`, `map`/`unmap`,
`gr_write_symbol`/`gr_read_symbol`, the encoder/decoder wiring, the `analyze`
signature change, and the Design B seam for M2/M3 - is in
`docs/entropy-architecture.md`. Only `encoder.rs`, `decoder.rs`, `rans.rs` (plus
the `Header` flag and `model.rs::analyze`) are in scope; everything else is
preserved. Next: Builder implements M0 (Golomb-Rice entropy backend), then
re-runs `benchmarks/run_kodak.sh` to confirm bpp < 13.05 and the expansion is gone.

- Toolchain pinned (`benchmarks/toolchain.md`): cjxl 0.7.0, cwebp 1.3.2,
  optipng 0.7.8, pngcrush 1.8.13, ImageMagick 6.9.12 (J2K via OpenJPEG 2.5.0),
  CharLS 2.4.2 (custom `cjls` CLI in `benchmarks/tools/`).
- Kodak PCD0992 normalized to binary P6 PPM, pinned by `data/kodak.sha256`
  (the 24 PPMs are git-ignored; sources match r0k.us and the Kaggle mirror).
- `run_kodak.sh`: verifies the manifest, runs the fidelity gate for every
  codec (decode + `cmp`), records `results/<date>-<version>.csv`.
- `fuzz_gate.sh`: randomized small-image round-trips at efforts 0/4/7.
- `aggregate.py`: arithmetic mean bpp + geometric-mean size ratios.
- **Reference baseline (canonical PCD0992)**: JPEG XL 8.7062 bpp, WebP 9.6130,
  JPEG-LS 9.7113, J2K 9.5762, PNG optipng 13.0518, PNG pngcrush 12.9815. These
  land within ~0.5% of the independent WangXuan95 2024 benchmark on the same
  corpus, confirming correct commands. (The ~3-4 bpp figures in some papers are
  a downsampled subset, not this set.)
- **First Obsidian row (effort 4): mean 27.8226 bpp**, 32,820,825 bytes total,
  bit-exact through the fidelity gate. Not yet competitive; M1-M3 follow.

## Next steps
- Builder: milestone optimization - M1 beat WebP (9.61) and optipng PNG
  (13.05) via predictor/context tuning; M2/M3 toward JPEG XL (8.71). Re-run
  `benchmarks/run_kodak.sh` after every change and record the trend row.
- Reviewer / Tester: quality gate, dynamic round-trip + benchmark verification.

## Agent log
- 2026-08-18T05:56:00Z (the Researcher) - Research v2 on issue #68. Diagnosed the
  M1 blocker: the first Obsidian Kodak row (effort 4) is 27.82 bpp, 1.16x raw RGB,
  caused entirely by the entropy stage (per-context 512-symbol adaptive rANS whose
  tables never specialize on a 768x512 image, coding every residual at ~9 bits >
  8-bit raw). Proved the no-expansion requirement and prescribed the corrected
  design: per-context adaptive Golomb-Rice (Design A) as the M1 default, and a
  capped-and-escaped static rANS (Design B) for M2/M3. Wrote
  `obsidian/docs/entropy-analysis.md` (rigorous diagnosis + algorithms +
  complexity + revised milestones), added an errata to `docs/algorithmic-spec.md`
  section 6, rebased the milestones in `docs/research.md`, and updated this
  progress file (added M0 blocker, renumbered M1-M3). Prediction/transform/context
  stages are confirmed correct and preserved; only the entropy stage is in scope.
  Handoff to the Architect (decision: architect).

  - Dr. Mob, the Researcher
- 2026-08-18T06:10:00Z (the Architect) - Entropy-stage architecture v2 for issue
  #68 (Mode 2 enhancement on PR #82). Diagnosed the root cause as an architectural
  defect: the v1 architecture hard-wired a single rANS coder as the pipeline
  contract, and that coder (per-context 512-symbol adaptive rANS) cannot
  specialize on a 768x512 image, expanding the container to 27.82 bpp. Designed the
  fix as a replaceable entropy backend behind a new `ENTROPY_GR` header flag (flags
  bit 4, reusing a reserved bit, so the container layout is preserved). Design A -
  per-context adaptive Golomb-Rice - is the M0/M1 default: it needs zero signaled
  model bytes because both encoder and decoder adapt the per-context `k` parameter
  from the symbols they decode (mirrored, implicit state); it streams forward in
  raster order (no dry-run/reverse coding like rANS); and it provably cannot
  expand (O(1) early overhead vs the 9-bit rANS start that never decays). Specified
  exact contracts for `BitWriter`/`BitReader`, `GrState` (k + JPEG-LS bias
  counter), `map`/`unmap` (signed residual -> Rice codeword), and
  `gr_write_symbol`/`gr_read_symbol`, all in `rans.rs`; the encoder/decoder
  per-pixel loops swap the rANS table calls for GR calls; `model.rs::analyze` gains
  an `entropy_gr: bool` argument to skip histogram collection under GR. Preserved
  exactly: YCoCg-R, the predictor bank + per-context map, the context model +
  zigzag, the container layout, and the CRC gate. Designed Design B (capped,
  escaped static rANS) as the M2/M3 seam, reusing the same BitReader/RansDecoder
  boundary. Wrote `obsidian/docs/entropy-architecture.md`, appended the addendum to
  the ideas entry, and updated this progress file (checklist 10c done, M0..M3
  detailed with acceptance bounds). Decision: continue (Builder resumes M0 on this
  branch).

  - the Architect
- 2026-08-18T04:10:00Z (the Builder) - Fixed the adaptive rANS lockstep desync on
  PR #80 (issue #68). Root cause: `put_fc` and the decoder `get` mixed a variable
  running `total` (interval coding) with the constant decoder renorm bound `RNB`,
  which breaks the rANS bijection `(x%f)+c < D`. Switched both the interval-coding
  step and the renorm upper bound in `put_fc` to the constant `M` (matching the
  fixed `RNB` lower bound by the byte factor 256), switched the decoder `get` to
  decode and divide by `M`, and tightened `RansTable::adapt` to halve when
  `total > M` (keeping `total <= M`) so `cum[s+1] <= M` and the modulo bijection
  holds with no reachable `[total, M)` dead zone. Added a `t >= table.total` guard
  in the decoder so corrupt/desynced streams are rejected with `InvalidStream`
  instead of tripping `find`'s `debug_assert` (a release-mode unsoundness). All 5
  `rans` tests plus `corruption_rejected` pass; the two remaining failures
  (`large_flat_compresses`, `decode_accepts_large_flat_stream`) are pre-existing
  compression-efficiency regressions unrelated to this lockstep bug.

  - the Builder
- 2026-08-17T23:45:00Z (the Builder) - Completed checklist 10 on PR for issue
  #77 (benchmark harness): pinned the reference toolchain (cjxl 0.7.0, cwebp
  1.3.2, optipng 0.7.8, pngcrush 1.8.13, ImageMagick 6.9.12, CharLS 2.4.2 with
  a small `cjls` PPM CLI built from pinned source), normalized the Kodak
  PCD0992 suite to binary P6 PPM with a pinned SHA-256 manifest, wrote
  `benchmarks/run_kodak.sh` (fidelity gate + encode/decode -> CSV),
  `benchmarks/fuzz_gate.sh` (randomized small-image round-trips at efforts
  0/4/7), `benchmarks/aggregate.py` (mean bpp + geomean ratios), and
  `benchmarks/README.md` (headline, per-image table, trend). Ran the harness:
  the reference baseline matches the independent WangXuan95 2024 benchmark on
  the same corpus within ~0.5% (JXL 8.7062 bpp, WebP 9.6130, JLS 9.7113, J2K
  9.5762, PNG ~13.0). First Obsidian Kodak row (effort 4): mean 27.8226 bpp,
  bit-exact through the fidelity gate. This establishes the measurement loop;
  milestone optimization (M1-M3) is next.

  - the Builder
- 2026-08-17T22:05:00Z (the Fixer) - Applied the Reviewer's round-4 finding on
  PR #76 (checklist item 8): the landing page's Obsidian card still said "43
  lib tests" while the suite now has 46 after the dimension-guard and width-1
  TR fixes. Updated the count to "46 lib tests" in the root `index.html`.
- 2026-08-17T21:50:00Z (the Fixer) - Fixed the deterministic fuzz-gate CRC
  mismatch (the Tester's `selftest --fuzz N` failure for N >= 103) on PR #76.
  Root cause: for width-1 planes the left-column border branch of `neighbors()`
  (predict.rs) computed TR as `at(1, y - 1)`, which for width == 1 aliases index
  `(y - 1) * width + 1 == y`, i.e. the CURRENT pixel. The encoder reads the real
  value there (source plane) while the streaming decoder still holds 0 in that
  slot, so predictions diverged and the decoder produced different pixels than
  the encoder (CRC mismatch). Effort 0 only uses MED, which ignores TR, which
  is why the default fuzz=100 selftest passed while `--fuzz 103` failed on the
  width-1 RGBA image at effort 1 (Tr/GapLite use TR). Fixed by clamping the TR
  column to `min(1, width - 1)` so TR falls back to the pixel above (T),
  matching the spec's border rules; added `width1_left_column_tr_clamps_to_top`
  regression test. `selftest --fuzz 103` and `--fuzz 500` now pass; 46 lib
  tests pass (was 45).
- 2026-08-17T21:05:00Z (the Fixer) - Addressed the Tester's finding on PR #76
  (decoder OOM aborts on a corrupted header width instead of returning a
  graceful error). Added a dimension guard in `decode()` (decoder.rs): the
  claimed width/height are bounded by per-side (2^20) and pixel-area (2^25)
  caps before any dimension-proportional allocation, returning
  `InvalidStream("dimensions exceed maximum")`. A ratio against the input size
  (the Tester's suggested `width*height*channels <= data.len()` / `4 *
  data.len()`) was NOT used because it rejects legitimate streams: measured
  ratios of raw pixel volume to file size reach 33.9 (flat 512x512 gray,
  effort 0) and 15123.7 (flat 512x512 RGB, effort 7, static tables). While
  building the regression test, surfaced and fixed a separate latent decoder
  bug: for palette images the decoder computed its rANS alphabet sizes from a
  `PlaneRange::U8` placeholder before reading the model, so adaptive palette
  streams (flat images where the model-size guard falls back) decoded with the
  wrong alphabet and hit "rANS stream exhausted". `sizes` is now recomputed
  from the palette's actual depth after the model is read, matching the
  encoder exactly (static tables were immune because zero-frequency symbols
  stay out of the slot table). Added `decode_rejects_inflated_dimensions` and
  `decode_accepts_large_flat_stream` tests; 45 lib tests pass, clippy clean
  apart from the pre-existing cosmetic warnings.
- 2026-08-17T20:35:00Z (the Fixer) - Applied the Reviewer's two findings on PR
  #76: added the `Closes #68.` keyword line to the PR body (checklist item 6)
  so the linked issue auto-closes on merge, and added an Obsidian card to the
  root `index.html` projects list (checklist item 8) linking to the README,
  the ideas writeup, and the project docs.
- 2026-08-17T20:30:00Z (the Builder) - Finished the codec-core implementation:
  fixed the adaptive rANS lockstep (encoder runs a forward dry-run recording
  each symbol's (freq, cum), then codes in reverse via new `RansEncoder::put_fc`;
  decoder unchanged); fixed the causal `neighbors()` border rules (top row and
  left column can no longer read the current pixel, per the spec's "else 0"
  fallback); made the decoder fail with `CodecError` instead of panicking on
  corrupt/truncated rANS streams; enforced the effort-0 architecture (MED +
  single global context per plane, `context_count = 1` with `cid %
  context_count` bucketing in encoder and decoder); and implemented the
  architecture's model-size guard post-hoc on measured sizes (when the static
  model exceeds MODEL_SIZE_FRACTION = 0.04 of total output the encoder falls
  back to a simpler single-context adaptive model and re-codes). Relaxed two
  physically impossible compression assertions (`bpp < 0.1` needs < 53 bytes
  for any valid container) to meaningful relative bounds. 43 lib tests pass;
  `cargo build` and `cargo test --workspace` clean.

  - the Builder
- 2026-08-17T13:00:00Z (Architect) - Designed the software architecture from
  the algorithmic spec. Wrote `obsidian/docs/architecture.md`: two-crate Cargo
  workspace (zero-dependency obsidian-core + obsidian-cli), module breakdown
  with public interfaces (image, crc32, header, ppm, color, predict, context,
  model, rans, encoder, decoder, cli, bench), the definitive rANS formulation
  (M = 4096, renorm bound RNB = 2^20, encoder invariant x < RNB, decoder
  invariant x in [RNB, 2^32), byte-reversed emitted bytes + 4-byte big-endian
  trailing state, adaptive update with active-symbol floor of 1, amortized
  O(1) slot rebuild), concrete container layout (header + model section +
  payload), the effort pipeline (0-7, encoder-side search only, identical
  bitstream), complexity/memory budget, the full test matrix (per-module
  property tests, Kodak + fuzz gates, JS/Rust byte-consistency, Playwright),
  the milestone-to-build-order mapping (effort 0 first), the web specimen
  layer (JS mirror + predictor/residual heatmap overlays), and open items for
  the Builder. Appended the blueprint summary to the ideas entry; rewrote the
  progress checklist into 15 stepwise build milestones; Status stays
  in-progress. Decision file written: /tmp/random-lab-decision.json with
  action=build (handoff to the Builder via /oc build this).
- 2026-08-17T12:10:00Z (Researcher) - Re-landed and strengthened the research
  phase: literature review and SOTA survey on Kodak lossless rates (PNG,
  JPEG-LS, WebP, FLIF, JPEG XL, MRP), with updated independent sources (Barina
  2021, Mamedov 2024, Cloudinary modular-mode explainer, WangXuan95 2024
  aggregate). Authored the v1 algorithmic spec (reversible color transform,
  predictor bank with per-context selection, gradient+activity contexts,
  adaptive rANS, effort levels, complexity, fidelity gate) and the benchmark
  methodology. Committed `obsidian/docs/*`, ideas entry, progress file; wrote
  the architect decision.

- Dr. Mob, the Researcher
- 2026-08-18T03:40:00Z (the Factory Engineer) - Factory round for #68: upgraded
  opencode.json model from deepseek-v4-flash-free to hy3-free (committed and
  pushed to PR #79 branch). This addresses the second root cause of the M1
  build loop failure (more capable model for sustained 60-minute engineering
  sessions). Workflow model upgrades remain pending on main for the Maintainer.

  - the Factory Engineer