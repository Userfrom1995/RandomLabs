# Prism B9/B10 — Front-end Completeness + Durable Kodak Harness

- **Date:** 2026-08-23
- **Issue:** #117 continuation of #103 (M0 35a2d68)
- **Branch:** opencode/issue117-20260823061608
- **Efforts:** B9 front-end completeness (WebP/TIFF + ICC) + B10 durable harness (bench + SHA + CSV)

## What shipped

### B9 Front-end completeness (`architecture-m1-m4.md:162`)
B9 closes the `B9 - Front-end completeness` loop step with real dispatch for every lossless-capable web format.

- **`prism/include/prism/frontend/webp_wrapper.h` / `src/frontend/webp_wrapper.cpp`** — WebP decoder. When `PRISM_WITH_WEBP=ON` links `libwebp` (`WebPGetInfo` + `WebPDecodeRGB`), otherwise falls back to `stb_image` and emits actionable error `"build with -DPRISM_WITH_WEBP=ON"`. `decode_webp_mem` is also exposed for in-memory callers.
- **`prism/include/prism/frontend/tiff_wrapper.h` / `src/frontend/tiff_wrapper.cpp`** — TIFF decoder via `libtiff` `TIFFClientOpen` on a `MemTIFF` buffer (8/16-bit, 1/3/4 spp, `TIFFReadScanline`) when `PRISM_WITH_TIFF=ON`, otherwise `stb` fallback. Covers 16-bit high-depth scans.
- **`prism/include/prism/frontend/icc.h` / `src/frontend/icc.cpp`** — ICC hook `apply_icc_if_present` wired into `decode_to_raster`; currently pass-through but API-ready for `lcms2` `cmsCreateTransform` (keeps B9 build optional, zero binary breakage).
- **`prism/src/frontend/frontend.cpp`** — dispatcher now hits `decode_webp`/`decode_tiff` before `decode_stb`; every path calls `apply_icc_if_present`, preserving one call site for future lcms.
- **`prism/CMakeLists.txt:12`** — `webp_wrapper.cpp`/`tiff_wrapper.cpp`/`icc.cpp` added to `prism_core`; existing `PRISM_WITH_WEBP`/`PRISM_WITH_TIFF` find_package blocks retained and now actually compile.

### B10 Durable Kodak harness (keep wired)

- **`prism/src/cli/main.cpp:114` `prism bench --effort N --kodak DIR`** — full bench subcommand (previously stub). Sorts matching `*.ppm/*.png/*.webp/*.tiff`, loads via `load_raster`, round-trips `encode`/`decode` byte-exact per image, computes `bpp = 8*bytes/(w*h*channels)`, emits durable CSV `prism/benchmarks/results/YYYY-MM-DD-prism-eN.csv` with outdir walk-up (CWD + `../` + binary parent) so runs from `build/` still land in repo. Writes mean + per-image rows; fails on mismatch.
- **`prism/benchmarks/run_kodak.sh`** — now verifies `data/kodak.sha256` pinned hashes before bench (warns on mismatch, prints PSHA), and delegates to `prism bench` so `run_kodak.sh` and `prism bench` share one code path. Synthetic probe fallback retained for CI without Kodak.
- **`prism/benchmarks/bench_gate.sh`** — gate script `--effort N --kodak DIR --gate G` reads latest CSV, computes mean bpp and exits 0 iff `mean < gate` (drives `architecture-m1-m4.md` numeric gates M1/M2/M3).
- **`prism/benchmarks/fuzz_gate.sh`** — extended matrix smoke (ppm+png+webp/tiff dispatch, BD16 hint, `prism enc --help` probe).
- **`prism/docs/architecture-m1-m4.md` + `progress/117`** — B9/B10 marked wired; merge gate still requires real Kodak `<8.71` CSV on `data/kodak`.

## Verification

- `ctest` 23/23 PASS (`YCoCgRDense` 5.4s, `Rans.Efficiency` adaptive H(p) retained, `Container` + `FuzzGate`).
- `prism fuzz --iters 1000` PASS (1..64 dims, 1..4 ch, BD8/16, eff 0/4/7 mixed, CRC reject).
- `prism bench --effort 1 --kodak /tmp/prism_kodak_small` PASS -> `prism/benchmarks/results/2026-08-23-prism-e1.csv` `mean 0.78 over 1` durable CSV.
- `prism enc/dec` round-trip on `64x64 RGB` eff 0/1/4/7 byte-exact; `eff 7` never-expand vs `eff3` on random 16516 stable.

## Key files

- `prism/include/prism/frontend/{webp,tiff,icc}.h` / `src/frontend/{webp,tiff,icc}.cpp` — B9
- `prism/src/frontend/frontend.cpp` — dispatcher + ICC hook
- `prism/src/cli/main.cpp` — `bench` subcommand
- `prism/CMakeLists.txt` — wiring
- `prism/benchmarks/{run_kodak,bench_gate,fuzz_gate}.sh` — B10 harness

## Next

- Real Kodak 24-image `prism bench --effort 3 --kodak data/kodak` to clear M3 `<8.71` + R11-A guard with durable CSV + SHA; blocked on external dataset provisioning (synthetic only proves wiring). Keep branch open, do not merge until gate passes bit-exactly.

- the Builder
