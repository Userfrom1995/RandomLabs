# Obsidian - Current architecture supplement (2026-08-20)

Addendum to the v1 blueprint (`architecture.md`, 2026-08-17). This document describes the **shipped code on `main`** at 9.5209 bpp (effort 4), not the v1 baseline. The v1 blueprint remains historically accurate for the initial end-to-end pipeline; this supplement lists only the deltas and the complete current module map so reviewers can verify the docs against the code.

## Crate layout (unchanged)

```
obsidian/Cargo.toml (workspace)
  crates/obsidian-core  (zero-dep, std only)
  crates/obsidian-cli   (depends on obsidian-core + `image` crate for I/O)
```

## Modules (current)

- `image.rs` - `Image {width, height, channels: Gray|Rgb|Rgba, planes: Vec<Vec<u8>>}` channel-major, `area()`, `raw_bytes()` for CRC.
- `header.rs` - `Header {flags, effort 0..7, width, height, crc32}`. `flags` bits 0..1 channels, bit2 transform, bit3 palette, bit4 ENTROPY_GR, bit5 GR_M2, bit6 GR_CM, bit7 GR_LZ. `HEADER_LEN=20`, LE ints except rANS trailing state BE. `read`/`write` validate magic `OBSD`, version 1, bit_depth 8.
- `crc32.rs` - IEEE 0xEDB88320 table, `crc32(data)`.
- `ppm.rs` - P6/P5 binary PPM/PGM reader/writer (canonical ground truth; byte-stable).
- `color.rs` - `TransformChoice {None, YCoCgR}`, `ycocgr_forward_planes`/`inverse`, `subtract_green_forward_planes`/`inverse_planes` (R'=R-G), `Palette {colors, indices}`, `try_build_palette` (<=256), `ColorCache` (LRU 512 for CARC_CACHE), `PlaneRange {min, max}`, `plane_ranges()`, `alphabet_sizes()`.
- `predict.rs` - `PredictorId` 20 ids (0 Left,1 Top,2 Tl,3 Tr,4 Avg,5 Med,6 GapLite,7 Weighted, 8 TrueMotion,9 LPlusHalfTLMinusT,10 Gradient2,11 AddLT,12 AddLTL,13 AddTLT,14 SubLTL,15 SubTLT,16 SubTTR,17 AdaptiveWeighted,18 WeightedTree,19 AdaptiveRecursive), `PREDICTOR_COUNT=20`, `neighbors()` with border zero rule, `WeightVec`, `default_weight_codebook()` (16 vectors, shift 4), `R8-A weighted_adaptive`, `R9-B weight_context` (3 gradients x3 tiers -> 27 raw -> 15 leaves), `predict_weighted_tree`, `solve_weighted_tree` (5x5 LS, ridge 8), `R13-A` (`R13_M=9, R13_DIM=10, R13_SHIFT=10, r13_properties, predict_recursive, adapt_recursive, solve_r13_least_squares, R13_NEUTRAL`), `R14 RCCT` (`RCCT_K=10, RCCT_DIM=11, RCCT_MAX_DEPTH=6, rcct_properties, rcct_predict, rcct_apply`), `R15 NRP` (`NRP_H=8, NRP_D=14, nrp_features, nrp_forward, nrp_apply, NrpNet`), `UNIT_LEAF`, `WC_LEAVES=15`, `WC_MIN_SAMPLES=64`.
- `context.rs` - `GRAD_THRESHOLDS [-16,-4,-1,0,1,4,16] -> 9 bins`, `quantize_gradient`, `SignSymmetryLut` 729->365, `ContextParams {base_shift:3, activity_classes:2, activity_scale:64}` -> interior 92 + 3 border = 95 contexts, `ContextModel::context_id()` (gradient) and `residual_context()` (R3-A, 365), `combined_ma_context()` (R11-D), `zigzag`/`unzigzag`, `Alphabet`, `quantize_residual`.
- `model.rs` - `PlaneModel {map: Vec<u8>, weight_index: u8}`, `ModelConfig {transform, cross_channel, palette, context, context_count, planes, weight_codebook, static_histograms, entropy_mode (GR=0,CAPPED=1,CARC=2,CARC_LZ=3,CARC_MIX=4,CARC_CACHE=6), capped_histograms, cmarc_priors, cmarc_residual_ctx, cmarc_run, cmarc_ma_context, cmarc_use_color_cache, weighted_wc_table: Option<Vec<Option<Vec<WLeaf>>>>, weighted_r13_table, squeeze_levels, transform_kind (Squeeze|Lift), cfl_scale, band_ranges, band_maps, band_wc_table, rcct, nrp}`, `NRP_EFFORT=255, RCCT_EFFORT=255` (gated OFF), `predictors_for(effort)`, `analyze()`, `analyze_bands()`, `build_nrp_nets()`, `build_rcct_trees()`, `write_model`/`read_model`.
- `rans.rs` - `BitWriter`/`BitReader`, `GrState {k}` (`GR_K_INIT=2`, `gr_write_symbol`/`gr_read_symbol`, `gr_adapt_bias`), `CmState`, `CAPPED_ALPHABET=64,CAPPED_SYMBOLS=65`, `RansEncoder`/`RansDecoder`/`RansTable`, `BinModel`/`RangeEnc`/`RangeDec` (CMARC, `range` u32, `low` u64, bound `(range>>12)*pm`, `shift_low`), `CarcCtx`, `cmarc_write_residual`/`cmarc_read_residual`, `CMARC_*_BIN`, `CMARC_RESIDUAL_CONTEXTS=365`, `lz_*`, `cmarc_lz_*`, `CMARC_RUN_*`, `CARC_CACHE_SIZE=512`, `EntropyMode` constants.
- `transforms.rs` - `TransformKind {Squeeze, Lift}`, `squeeze`/`unsqueeze`, `squeeze_band_layout`, `max_squeeze_levels`, `cfl_predict`, `Lift5_3` CDF 5/3.
- `encoder.rs` - `EncodeStats`, `EncodeOpts {capped, cmarc, carc_lz, carc_mix, cross_channel, cmarc_residual_ctx, cmarc_residual_ctx_auto (default true), cmarc_run, cmarc_ma_context, cmarc_ma_context_auto, carc_cache, cfl_scale, squeeze_levels, forced_predictor, transform_kind, nrp}`, `encode()` (production defaults: CMARC ON, residual-ctx auto ON, XCHAN auto ON when CMARC, NRP/RCCT OFF), `encode_with()`, `code_banded()`, never-expand net over 4 transform configs (plain/CFL/CFL+Squeeze/CFL+Lift) plus R14/R15 overlays, model-size guard `MODEL_SIZE_FRACTION=0.04`, `STATIC_MIN_PIXELS=200_000`.
- `decoder.rs` - mirrors encoder exactly, `decode()`, `decode_plane_into()`, verifies header+model CRC, `CodecError` on corruption.
- `error.rs` - `CodecError {InvalidImage, InvalidStream, CrcMismatch, Io}`.
- `lib.rs` - re-exports `encode, encode_with, decode, roundtrip, fuzz_gate`.

CLI crate:

- `cli.rs` - `run(args) -> i32`, subcommands `encode/decode/roundtrip/selftest/check/bench/bench-synth/help`, `parse_effort`, strict validation, exit codes 0/1/2/3.
- `image_io.rs` - `read_image`/`write_image` via `image` crate + PPM fast path, `supported_formats_hint()` lists `png, jpeg, gif, bmp, tiff, webp, ppm/pgm/pnm`.
- `bench.rs` - `cmd_bench`, `cmd_bench_synth` (synthetic gradient/noise probes).

## Container (current, byte-level)

```
[Header 20] magic OBSD | version 1 | flags u8 | bit_depth 8 | effort u8 | width u32 LE | height u32 LE | crc32 u32 LE
[Model section] u32 LE model_len | bytes (transform u8, ContextParams, per-plane maps, codebook, weighted tables, entropy_mode, capped histograms, squeeze_levels, transform_kind, cfl_scale, band_ranges, band_maps, rcct, nrp) | u32 LE model_crc
[Payload] per-band: u32 LE stream_len | bytes (GR bits or RangeEnc bytes or rANS bytes, depending on entropy_mode)
```

Model section is CRC32-protected; decode rejects mismatch. Payload lengths make the stream self-delimiting.

## Predictor inventory (20 ids)

See `predict.rs::PredictorId` for the authoritative list. `predictors_for(0)` = {Med}; `predictors_for(1..3)` = 7 fixed; `predictors_for(4..7)` = all 20 minus AdaptiveRecursive (which is gated by a 0.1% margin). `AdaptiveRecursive` is available only via `EncodeOpts::forced_predictor` / `roundtrip --predictor AdaptiveRecursive`.

## Context inventory (95 coding contexts)

- Gradient context: 92 interior (365 reduced by >>3 = 46 buckets x2 activity) + 3 border = 95. This is both the predictor-map size and the default CMARC coding context.
- Residual context (R3-A): 365 contexts keyed by quantized neighbor residuals.
- MA context (R11-D): 365 contexts keyed by `(rc + gb*41)%365`.

## Entropy inventory (current)

- GR (0): Golomb-Rice per context, `GrState` adaptive `k`.
- CAPPED (1): `M=4096, TBITS=12` rANS with capped alphabet 64 + escape to GR.
- CARC (2): binary range coder with `BinModel` per `(cid, bin)`, quotient/remainder Rice decomposition, `CMARC_RESIDUAL_CONTEXTS=365`. Production default.
- CARC_LZ (3), CARC_MIX (4), CARC_CACHE (6): CMARC extensions, gated OFF on Kodak.

R14 RCCT and R15 NRP are overlays `epsilon = r0 - f(phi)` that replace `r0` only when `rcct_for`/`nrp_for` is Some and the never-expand net accepts them; otherwise the path is byte-identical.

## Effort semantics (current)

All efforts produce the same container version; only encoder search differs. Decoder cost is identical.

## Fidelity

Every stage is an integer bijection; exhaustive property tests + `cargo test --lib` (148) + `fuzz_gate.sh` + `run_kodak.sh --effort 4` on 24 Kodak must all pass before any benchmark row is recorded.

- the Builder
