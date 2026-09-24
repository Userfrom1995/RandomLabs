# Obsidian benchmarks

Benchmark-driven iteration on the Kodak PCD0992 lossless suite (24 images, 768x512, 24-bit RGB, normalized to binary P6 PPM - see `../docs/benchmark-methodology.md` and `toolchain.md`).

Every meaningful version adds a row. The **reference baseline** (JPEG XL, WebP, PNG, JPEG-LS, JPEG 2000) is fixed and never changes silently.

## Headline (current, 2026-08-20, effort 4)

| Codec | Version | Mean bpp | Total bytes | Status |
|---|---|---|---|---|
| JPEG XL | libjxl 0.7.0, `-d 0 -e 7` | 8.7062 | 10,270,201 | reference baseline |
| WebP | libwebp 1.3.2, `-lossless -z 9 -m 6` | 9.6130 | 11,339,964 | reference baseline |
| JPEG 2000 | OpenJPEG 2.5.0, `convert -compress Lossless` | 9.5762 | 11,296,508 | reference baseline |
| JPEG-LS | CharLS 2.4.2, HP1 | 9.7113 | 11,455,887 | reference baseline |
| PNG (optipng) | optipng 0.7.8, `-o7` | 13.0518 | 15,396,470 | reference baseline |
| PNG (pngcrush) | pngcrush 1.8.13, `-brute` | 12.9815 | 15,313,624 | reference baseline |
| **Obsidian** | **current (CMARC + WeightedTree + CFL), effort 4** | **9.5209** | **11,231,359** | **beats WebP, JPEG-LS, J2K, PNG; +0.81 to JPEG XL** |

CSV: [`results/2026-08-20-r15-baseline.csv`](results/2026-08-20-r15-baseline.csv) (Obsidian) and [`results/reference-baseline-2026-08-17.csv`](results/reference-baseline-2026-08-17.csv) (references).

Milestones (from `docs/benchmark-methodology.md`): **M1** beat WebP and optipng PNG - MET; **M2** within 10% of JPEG XL - MET (9.52 is 9.3% above 8.71); **M3** within ~3% or beat JPEG XL - NOT MET (+0.81 bpp).

## Per-image rows (current, 2026-08-20, effort 4)

| image | Obsidian bpp | JXL bpp | WebP bpp | PNG bpp | JLS bpp | J2K bpp |
|---|---|---|---|---|---|---|
| kodim01 | 10.1167 | 9.5647 | 10.2260 | 14.9022 | 10.5461 | 10.3853 |
| kodim02 | 9.2736 | 8.4981 | 9.2365 | 12.5525 | 9.4036 | 9.1637 |
| kodim03 | 7.6243 | 6.7944 | 7.9645 | 10.3011 | 7.9081 | 8.0925 |
| kodim04 | 9.3995 | 8.5323 | 9.3597 | 12.9566 | 9.4868 | 9.3605 |
| kodim05 | 11.2982 | 10.2054 | 11.6127 | 15.9079 | 11.2294 | 10.8176 |
| kodim06 | 9.4612 | 8.8091 | 9.4748 | 12.8472 | 9.8150 | 9.5920 |
| kodim07 | 8.4427 | 7.3969 | 8.5885 | 11.3429 | 8.4819 | 8.5047 |
| kodim08 | 11.2747 | 10.5231 | 11.2381 | 15.6898 | 11.3615 | 11.1398 |
| kodim09 | 8.5944 | 7.8525 | 8.8962 | 11.8505 | 9.0060 | 9.0541 |
| kodim10 | 8.9404 | 8.0484 | 8.9959 | 12.0590 | 9.0675 | 9.2192 |
| kodim11 | 9.2280 | 8.5214 | 9.1379 | 12.8099 | 9.4585 | 9.2927 |
| kodim12 | 8.0910 | 7.3733 | 8.2378 | 10.8612 | 8.4810 | 8.6585 |
| kodim13 | 12.1440 | 11.3963 | 12.3383 | 16.7187 | 12.3358 | 11.8617 |
| kodim14 | 10.3672 | 9.4764 | 10.5431 | 14.3031 | 10.4163 | 10.1614 |
| kodim15 | 8.8611 | 7.9670 | 8.8856 | 12.2739 | 9.0108 | 8.9976 |
| kodim16 | 8.3927 | 7.6665 | 8.4647 | 11.0122 | 8.7021 | 8.7756 |
| kodim17 | 8.7577 | 7.9938 | 9.0963 | 12.4169 | 9.0672 | 9.1935 |
| kodim18 | 11.5267 | 10.6261 | 11.5642 | 15.7203 | 11.5178 | 11.1258 |
| kodim19 | 9.7194 | 9.0502 | 9.8901 | 13.5659 | 9.9224 | 9.8226 |
| kodim20 | 7.6050 | 6.8236 | 7.5023 | 10.1324 | 8.2927 | 8.0778 |
| kodim21 | 9.8287 | 9.1111 | 10.0076 | 13.2435 | 10.0054 | 9.7629 |
| kodim22 | 10.7654 | 9.7815 | 10.6857 | 14.2530 | 10.7089 | 10.0948 |
| kodim23 | 8.6553 | 7.7729 | 8.6764 | 11.3280 | 8.7043 | 8.5056 |
| kodim24 | 10.1348 | 9.1627 | 10.0891 | 14.1933 | 10.1416 | 10.1682 |
| **mean** | **9.5209** | **8.7062** | **9.6130** | **13.0518** | **9.7113** | **9.5762** |

Obsidian wins on 16/24 images vs WebP, 17/24 vs JPEG-LS, 14/24 vs J2K, 0/24 vs JPEG XL. Hardest images: kodim13 (12.14 bpp, high texture) and kodim05/kodim08 (portraits with fine grain). Easiest: kodim20 (7.61 bpp, near-flat sky).

## Ratios vs references (current)

Geometric mean of per-image size ratio (Obsidian vs reference; < 1 means smaller).

| Obsidian vs | geomean ratio |
|---|---|
| JPEG XL (8.7062) | 1.095 |
| WebP (9.6130) | 0.990 |
| JPEG 2000 (9.5762) | 0.991 |
| JPEG-LS (9.7113) | 0.979 |
| PNG optipng (13.0518) | 0.731 |
| PNG pngcrush (12.9815) | 0.736 |

Interpretation: Obsidian is ~0.99x WebP and ~0.98x JPEG-LS - decisively beating PNG (0.73x) but 9.5% larger than JPEG XL overall.

## Verification of the reference numbers

The pinned reference figures land within ~0.5% of the independent WangXuan95 2024 lossless benchmark on the same PCD0992 corpus (JPEG XL e7: 8.71 bpp, WebP m5: 9.58 bpp, PNG optipng: ~13.1 bpp). This confirms the harness measures the canonical dataset with correct commands. (~3-4 bpp figures in some papers correspond to a downsampled RGB subset and are not this corpus.)

## Fidelity gate

- Every reference row was decoded back and byte-compared (`cmp`) to the source PPM. All pass.
- Obsidian rows come from `obsidian_cli roundtrip --effort N --json`, which is bit-exact by construction (header CRC + model CRC; any mismatch is a hard error).
- `bash benchmarks/fuzz_gate.sh 100` runs randomized small-image round-trips (efforts 0/1/4/7) as the pre-benchmark gate. A single mismatch fails the run.
- `cargo test` enforces 148 lib tests including `corruption_rejected`, `range_coder_skew_efficiency`, and all round-trip property tests.

## Running

```bash
bash benchmarks/build_toolchain.sh        # once: apt codecs + build tools/cjls
bash benchmarks/fuzz_gate.sh 100          # fidelity gate (efforts 0/1/4/7)
bash benchmarks/run_kodak.sh --effort 4   # full Kodak -> results/<date>-<version>.csv
python3 benchmarks/aggregate.py results/<date>-<version>.csv
# bench a specific binary:
OBSIDIAN_BIN=obsidian/target/release/obsidian_cli bash benchmarks/run_kodak.sh --effort 4
```

Data: `benchmarks/data/kodak/` (git-ignored PPMs), `benchmarks/data/kodak.sha256` pins the bytes. Tools: `benchmarks/tools/` or system `cjxl/cwebp/optipng/convert/cjls`.

## Trend

| Date | Version | Mean bpp | Delta | Note |
|---|---|---|---|---|
| 2026-08-17 | v1 | 27.8226 | - | first end-to-end row (proved a PPM bug + entropy startup defect) |
| 2026-08-18 | v1-corrected | 10.0906 | -17.73 | PPM fix + per-context Golomb-Rice (GR) |
| 2026-08-19 | R5-quotient-fix | 9.7094 | -0.38 | CMARC binary range coder (H(p)+epsilon) |
| 2026-08-19 | R9-B | 9.6678 | -0.04 | context-tree WeightedTree (per-leaf LS) |
| 2026-08-19 | R10 (current) | 9.5209 | -0.15 | CFL chroma-from-luma (Squeeze measured inert) |
| 2026-08-20 | R15 | 9.5209 | 0.00 | NRP neural overlay net-negative, gated OFF (halt trigger) |

Each row is `run_kodak.sh --effort 4` on the same 24-image Kodak with `data/kodak.sha256` verified. Intermediate synthetic-only rows (e.g. `2026-08-18-m3a-synth-proxy.csv`) are not Kodak and are not in this trend.

- the Builder
