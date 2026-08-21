# Obsidian

A lossless image-compression codec written from scratch in Rust, benchmarked on the Kodak PCD0992 dataset against JPEG XL, WebP, PNG, JPEG-LS and JPEG 2000.

The factory priority project (issue #68). Goal: a genuinely competitive lossless algorithm - beat WebP decisively, approach JPEG XL lossless on Kodak at usable speed, bit-exact fidelity.

## Status (2026-08-20, effort 4, 24-image Kodak)

**Current measured Kodak mean (real, durable `data/kodak`, `run_kodak.sh --effort 4`):**

| Codec | Mean bpp | Total bytes | vs Obsidian |
|---|---|---|---|
| **Obsidian (current, CMARC + R9-B WeightedTree + CFL)** | **9.5209** | **11,231,359** | - |
| JPEG XL (libjxl 0.7.0, `-d 0 -e 7`) | 8.7062 | 10,270,201 | -0.81 bpp |
| WebP (libwebp 1.3.2, `-lossless -z 9 -m 6`) | 9.6130 | 11,339,964 | +0.09 bpp (Obs wins) |
| JPEG-LS (CharLS 2.4.2) | 9.7113 | 11,455,887 | +0.19 bpp (Obs wins) |
| JPEG 2000 (OpenJPEG 2.5.0) | 9.5762 | 11,296,508 | +0.06 bpp (Obs wins) |
| PNG (optipng 0.7.8 `-o7`) | 13.0518 | 15,396,470 | +3.53 bpp (Obs wins) |

- **Gate status:** PNG 13.05 MET, WebP 9.61 MET (+0.09 bpp margin), JPEG-LS 9.71 MET, J2K 9.58 MET, **JPEG XL 8.71 NOT MET (+0.81 bpp)**.
- **Historical note (not current):** the very first v1 row (2026-08-17) measured 27.82 bpp due to a PPM interleaved-planar bug plus an entropy-stage startup defect. Both are fixed. The 27.82 value is kept only in the archived results CSV for provenance; it is not the current codec.
- **Exhausted axes:** 10 predictor/transform/context levers (Squeeze, LF lifting, per-band weighted, RCCT, NRP, R13-A/B, etc.) have been built and measured net-negative or inert on this corpus under the never-expand safety net. The +0.81 bpp to JPEG XL is a structural ceiling of the current single-pixel pipeline; details in `docs/` research and progress file. Gated experiments (R14 RCCT, R15 NRP) ship OFF by default and are available only via measurement seams.

Full per-image rows and trend: `benchmarks/README.md` and `benchmarks/results/2026-08-20-r15-baseline.csv` (current) vs `benchmarks/results/reference-baseline-2026-08-17.csv` (references).

- **Tests:** 148 lib tests pass (0 failed, 2 ignored), fuzz gate at efforts 0/1/4/7, bit-exact round-trip on full Kodak, corruption rejection, model-CRC hardening.
- **Speed:** encode ~0.14 s/image (effort 4, 768x512 RGB, single-threaded, release), decode ~0.12 s/image. R15 (neural overlay) is ~30 s/image when forced and is gated OFF.

## What it does

- **Lossless, bit-exact:** every stage is an integer bijection. The container carries a CRC32 over the raw channel planes; `decode(encode(image)) == image` byte-identical, verified by `roundtrip` and the fuzz gate.
- **Supported channels:** Gray (1 plane), RGB (3), RGBA (4). 8-bit depth. Arbitrary dimensions > 0.
- **Input/output formats (CLI):** PNG, JPEG, GIF, BMP, TIFF, WebP, PPM/PGM/PNM. Extension selects format; `.obsd` is the codec container. PPM/PGM via `obsidian_core::ppm` stays byte-identical to the reference path.
- **Benchmark-driven:** every meaningful iteration is re-measured on the same normalized Kodak PPMs (`benchmarks/data/kodak.sha256`, 24 images) with a pinned reference toolchain (`benchmarks/toolchain.md`). Results are committed as CSV plus a rendered trend.

## Design summary (current)

- **Container:** `OBSD` header (20 bytes: magic, version 1, flags, bit_depth 8, effort 0..7, width/height u32 LE, CRC32 u32 LE), variable model section (u32 LE length prefix), payload (per-plane lengths + coded streams). Model section is CRC32-protected.
- **Color:** per-image adaptive selection among `{None, YCoCg-R, subtract-green (R'=R-G,G'=G,B'=B-G), subtract-green+YCoCg-R}` plus optional palette (<=256 distinct RGB triples, effort >=7). Selection is by MED residual cost; choice signaled in `ModelConfig {transform, cross_channel, palette}` so decoder mirrors without env. Alpha is a separate plane.
- **Group transforms (R10):** recursive Squeeze (quincunx split into LL/HL/LH/HH, post-order so LL precedes HF) and chroma-from-luma CFL (`chroma -= round(s*luma/8)`, s 0..7, scale 0 = identity). Both signaled per plane (`squeeze_levels`, `cfl_scale`, `transform_kind` Squeeze/Lift) and gated by a never-expand net - Squeeze is currently inert on photographic Kodak and never ships, CFL is the source of the 9.67 -> 9.52 gain. Lift (CDF 5/3) is a measure-only alternative.
- **Prediction:** 20 causal predictors (spec section 4): `Left, Top, TL, TR, Avg, MED, GAP-lite, Weighted` (codebook of 16 vectors), plus R2.2 expansion `TrueMotion, LPlusHalfTLMinusT, Gradient2, AddLT, AddLTL, AddTLT, SubLTL, SubTLT, SubTTR`, plus `AdaptiveWeighted` (R8-A, deterministic inverse-gradient convex blend, zero model bytes), plus `WeightedTree` (R9-B, per-fine-leaf least-squares `WLeaf = (wL,wT,wTL,wTR,bias,shift)` over `WC_LEAVES=15` leaves keyed by `weight_context`, ~90 bytes/plane, strict superset), plus `AdaptiveRecursive` (R13-A, 9-property recursive LMS, gated by a 0.1% margin and currently excluded from auto-select). Per-context best predictor map (`map[cid]`) is learned in `analyze`. Border handling clamps to nearest valid or zero on the top row.
- **Context model:** quantized gradients (`GRAD_THRESHOLDS = [-16,-4,-1,0,1,4,16]` -> 9 bins) with sign-symmetry LUT (729 -> 365), `base_shift=3`, `activity_classes=2`, `activity_scale=64` -> ~95 contexts plus 3 border contexts. Signed zigzag `r -> (r>=0 ? 2r : 2|r|-1)` makes symbol distribution peaked. Additional contexts: R3-A residual-DIFF context (`residual_context` over quantized neighbor residuals, 365 contexts, sign-symmetric) and R11-D MA-tree-lite (`combined_ma_context(rc, gb) = (rc + gb*41) % 365`). R3-A is auto-selected per image (gradient vs residual context, keep smaller; never-expand), R11-D gated by `OBSIDIAN_CARC_MA_CTX`.
- **Entropy coding:** selector `entropy_mode` in the model section (not header flags, so legacy streams stay decodable):
  - `GR (0)`: per-context adaptive Golomb-Rice (default fallback, `ENTROPY_GR` flag bit 4 plus M2 bias/run bits 5..7 for legacy rANS). Cost `O(1)` startup, cannot expand on small images.
  - `CAPPED (1)`: capped-and-escaped static rANS (`CAPPED_ALPHABET=64`, escape symbol 65), signaled per-context histograms, small alphabet specializes fast.
  - `CARC (2)` **(production default)**: context-modeled adaptive binary range coder (CMARC). Each residual coded bit-by-bit through per-`(cid, bin)` `BinModel` with a byte-oriented LZMA-style `RangeEnc`/`RangeDec` (32-bit range, 64-bit low, `ShiftLow` renormalization, `bound = (range>>12)*pm`). Cost is `H(p)+epsilon` per bin; on Kodak this is ~0.57 bpp better than GR alone (10.09 -> 9.52). Selected via `OBSIDIAN_CARC` (default ON; `OBSIDIAN_CARC=0` to force GR). Never-expand safety net guarantees CMARC only ships when it is byte-smaller than the best GR candidate on that image.
  - `CARC_LZ (3)`, `CARC_MIX (4)`, `CARC_CACHE (6)`: CMARC re-woven with LZ77 match layer (2D distance, `MIN_MATCH=2`), logistic mixing, and a per-plane color-cache LRU (512 entries). All measured net-negative/inert on photographic Kodak and gated OFF.
  - **Gated research overlays (not production):** R14 RCCT (residual-conditioned context tree, depth up to 6, 10-property MA leaf, `RCCT_EFFORT=255`) and R15 NRP (1-hidden-layer integer MLP `NRP_H=8, NRP_D=14`, `OBSIDIAN_R15_FORCE`), both pure `r0 -> epsilon = r0 - f(phi)` overlays on the base predictor `P0`, superset (zero net = byte-identical), net-negative on Kodak and therefore never shipped. See `docs/architect-r14-rcct-ma-blueprint.md` and `docs/architect-r15-nrp-blueprint.md` for the halt-trigger analysis.
- **Model section:** `transform`, `cross_channel`, `palette`, `ContextParams`, per-plane `PlaneModel {map, weight_index}`, weight codebook, `weighted_wc_table` / `weighted_r13_table`, `entropy_mode`, `capped_histograms`, `squeeze_levels`, `transform_kind`, `cfl_scale`, `band_ranges`, `band_maps`/`band_wc_table`, `rcct`, `nrp`. Per-band maps/tables only when Squeeze present; sparse signaling keeps the model to a few hundred bytes. Guard: if model bytes exceed ~4% of total, fallback to simpler model and re-measure.
- **Never-expand safety net:** every optional transform/predictor/entropy choice is a strict superset (scale 0 / level 0 / zero net = identity). The encoder codes candidates and keeps the smallest container (model + payload + headers) per image; a non-winning candidate costs zero bytes. No optional feature can regress the file.
- **Fidelity:** integer bijections + header CRC + model CRC; decode rejects truncated/corrupt streams with `CodecError`, never panics.

## Using the codec

### Build

```bash
cargo build --release --manifest-path obsidian/Cargo.toml
# binary at obsidian/target/release/obsidian_cli
cargo test --manifest-path obsidian/Cargo.toml   # 148 lib + fuzz
```

### CLI

```
obsidian encode <in-image> <out.obsd> [--effort N] [--json]
obsidian decode <in.obsd> <out-image>
obsidian roundtrip <in-image> [--effort N] [--json] [--predictor <NAME>] [--transform lift|squeeze] [--nrp]
obsidian selftest [--fuzz N]
obsidian check <in.obsd>
obsidian bench <image-dir> [--effort N] [--json]
obsidian bench-synth [--effort N] [--count N] [--size N] [--seed N]
obsidian help
```

- `<in-image>/<out-image>` may be any of `png, jpeg, gif, bmp, tiff, webp, ppm/pgm/pnm` (extension selects format); `.obsd` is the codec container.
- `--effort N` in `0..=7` (default 4). Effort only changes encoder search; the bitstream decodes identically at all efforts and decodes at the same speed.
- `--json` emits `{"bytes":..., "bpp":..., "encode_ms":..., "decode_ms":..., "fidelity":"ok"}` for tooling.
- `--predictor <NAME>` (roundtrip only) forces a single predictor for measurement: `Left, Top, TL, TR, Avg, MED, GAP-lite, Weighted, TrueMotion, L+(TL-T)/2, Grad2, Add(L,T), Add(L,TL), Add(TL,T), Sub(L,TL), Sub(TL,T), Sub(T,TR), AdaptiveWeighted, WeightedTree, AdaptiveRecursive`.
- `--transform lift|squeeze` (roundtrip only) forces the group-transform kind.
- `--nrp` (roundtrip only) enables the gated R15 neural overlay in the never-expand net.
- `check` validates header/model and CRC without writing an image file.

### Effort pipeline

| effort | analysis | predictor map | codebook/table | palette | entropy |
|---|---|---|---|---|---|
| 0 | none | fixed MED, 1 context | none | no | adaptive GR |
| 1-3 | per-context best predictor (7-17 ids) | per-context map | none | no | adaptive GR or CMARC |
| 4-5 | + weighted codebook + WeightedTree | per-context map incl. WeightedTree | 16-vector codebook + per-plane WLeaf table (15 leaves) | no | CMARC (default) |
| 6-7 | + palette test + static rANS histograms | full | full | yes | CMARC / CAPPED when selected |

### Environment seams (measurement / tuning; production defaults are optimal)

- `OBSIDIAN_CARC=0` disable CMARC (force GR).
- `OBSIDIAN_CARC_RESIDUAL_CTX=0` disable per-image residual-context auto-selection.
- `OBSIDIAN_CARC_MA_CTX=1` enable MA-tree-lite context fold.
- `OBSIDIAN_XCHAN=0|1` force cross-channel subtract-green off/on (default auto when CMARC on).
- `OBSIDIAN_CAPPED=1`, `OBSIDIAN_CM=1`, `OBSIDIAN_LZ=0|1`, `OBSIDIAN_M3_WP=1` legacy GR seams.
- `OBSIDIAN_CFL_FORCE=1`, `OBSIDIAN_SQ_FORCE=1`, `OBSIDIAN_LIFT_FORCE=1` force group transforms for measurement.
- `OBSIDIAN_R14_FORCE=1` / `OBSIDIAN_R15_FORCE=1` (+ `OBSIDIAN_R14_SHIP=1` / `OBSIDIAN_R15_SHIP=1` to bypass the byte-size gate) force the gated RCCT/NRP overlays for isolated bench. See `encoder.rs` for the full list (`CAR C_LZ_FORCE`, `CARC_MIX_FORCE`, `M3_WP`, etc.) - all are test-only and bypass the safety net intentionally.

### Benchmarking

```bash
bash benchmarks/build_toolchain.sh        # once: apt codecs + build tools/cjls
bash benchmarks/fuzz_gate.sh 100          # fidelity gate
bash benchmarks/run_kodak.sh --effort 4   # full Kodak -> results/<date>-<version>.csv
python3 benchmarks/aggregate.py results/<date>-<version>.csv
```

Kodak PPMs live at `benchmarks/data/kodak/` (git-ignored), `benchmarks/data/kodak.sha256` pins the bytes. Reference toolchain and commands are pinned in `benchmarks/toolchain.md`. Run with `OBSIDIAN_BIN=...` to bench a specific binary.

## Project layout

```
obsidian/
  Cargo.toml
  crates/obsidian-core/src/  color.rs context.rs crc32.rs decoder.rs encoder.rs
                             error.rs header.rs image.rs lib.rs model.rs ppm.rs
                             predict.rs rans.rs transforms.rs
  crates/obsidian-cli/src/   cli.rs bench.rs image_io.rs main.rs
  benchmarks/                run_kodak.sh fuzz_gate.sh aggregate.py toolchain.md
                             data/kodak.sha256 results/*.csv README.md
  docs/                      research.md algorithmic-spec.md benchmark-methodology.md
                             architecture.md entropy-*.md decisions/ archive/
```

Core crate is zero-dependency (`std` only); `image`-crate I/O lives only in the CLI.

## Documents

- `docs/research.md` - literature review and design rationale (current, with historical M0/M1 erratum).
- `docs/algorithmic-spec.md` - v1 algorithmic specification (with encoder/decoder pseudo-code; superseded entropy section flagged).
- `docs/benchmark-methodology.md` - reproducible Kodak protocol.
- `docs/architecture.md` - software blueprint (v1, with notes on current deltas).
- `docs/entropy-analysis.md` / `docs/entropy-architecture.md` - diagnosis of the rANS expansion and the GR fix.
- `benchmarks/toolchain.md` - pinned tool versions and commands.
- `benchmarks/README.md` - headline table, per-image rows, ratios, trend.
- Archived blueprints: `docs/archive/` (R3..R15 per-iteration blueprints, historical; not current spec).

## Benchmark history (headline)

| Date | Version | Mean bpp | Note |
|---|---|---|---|
| 2026-08-17 | v1 | 27.8226 | first row (bug: planar/interleaved PPM + rANS startup) |
| 2026-08-18 | v1-corrected | 10.0906 | GR backend + PPM fix |
| 2026-08-18 | R4-CMARC | 9.7094 | CMARC binary range coder (H(p)+epsilon) |
| 2026-08-19 | R9-B | 9.6678 | context-tree WeightedTree |
| 2026-08-19 | R10 | 9.5209 | **current** (CFL; Squeeze inert; WebP cleared) |
| 2026-08-20 | R15 | 9.5209 | NRP net-negative, gated OFF (halt trigger) |

See `benchmarks/results/` for the full CSVs.

## Fidelity & testing

- Every stage is an integer bijection; exhaustive property tests cover color, zigzag, rANS, predictors, context symmetry.
- `cargo test` (148 pass), `obsidian selftest --fuzz N`, and `benchmarks/fuzz_gate.sh` enforce bit-exact round-trips.
- `obsidian check` rejects corrupt streams; container carries header + model CRCs.

---

- the Builder
