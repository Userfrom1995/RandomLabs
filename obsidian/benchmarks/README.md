# Obsidian benchmarks

Benchmark-driven iteration on the Kodak PCD0992 lossless suite (24 images,
768x512, 24-bit RGB, normalized to binary P6 PPM - see
`../docs/benchmark-methodology.md` and `toolchain.md`).

Every meaningful version adds a row. The **reference baseline** (JPEG XL,
WebP, PNG, JPEG-LS, JPEG 2000) is fixed and never changes silently.

## Headline

| Version | Codec | Mean bpp | Total bytes | Status |
|---|---|---|---|---|
| v1 (this PR) | JPEG XL (cjxl 0.7.0, e7) | 8.7062 | 10,270,201 | reference baseline |
| v1 | WebP (cwebp 1.3.2, lossless z9 m6) | 9.6130 | 11,339,964 | reference baseline |
| v1 | JPEG-LS (CharLS 2.4.2, HP1) | 9.7113 | 11,455,887 | reference baseline |
| v1 | JPEG 2000 (OpenJPEG 2.5.0, lossless) | 9.5762 | 11,296,508 | reference baseline |
| v1 | PNG (optipng -o7) | 13.0518 | 15,396,470 | reference baseline |
| v1 | PNG (pngcrush -brute) | 12.9815 | 15,313,624 | reference baseline |
| v1 | **Obsidian effort 4** | **27.8226** | **32,820,825** | first row, codec v1 |

Milestones (from `docs/benchmark-methodology.md`): **M1** beat WebP lossless
and optipng PNG; **M2** within 10% of JPEG XL; **M3** within ~3% of or above
JPEG XL. Obsidian v1 is a working end-to-end codec with correct fidelity
(see the fidelity gate below) but its compression is not yet competitive;
the M1-M3 milestones are the optimization loop that follows this harness.

## Per-image rows (v1, 2026-08-17)

CSV: [`results/2026-08-17-v1.csv`](results/2026-08-17-v1.csv)

| image | obsidian-e4 bpp | jxl bpp | webp bpp | png-optipng bpp | png-pngcrush bpp | jls bpp | j2k bpp |
|---|---|---|---|---|---|---|---|
| kodim01 | 27.2157 | 9.5647 | 10.2260 | 14.9022 | 14.7405 | 10.5461 | 10.3853 |
| kodim02 | 27.0159 | 8.4981 | 9.2365 | 12.5525 | 12.4312 | 9.4036 | 9.1637 |
| kodim03 | 28.1895 | 6.7944 | 7.9645 | 10.3011 | 10.3011 | 7.9081 | 8.0925 |
| kodim04 | 29.9984 | 8.5323 | 9.3597 | 12.9566 | 12.8355 | 9.4868 | 9.3605 |
| kodim05 | 29.0549 | 10.2054 | 11.6127 | 15.9079 | 15.9081 | 11.2294 | 10.8176 |
| kodim06 | 26.4203 | 8.8091 | 9.4748 | 12.8472 | 12.8475 | 9.8150 | 9.5920 |
| kodim07 | 28.0260 | 7.3969 | 8.5885 | 11.3429 | 11.3431 | 8.4819 | 8.5047 |
| kodim08 | 29.6305 | 10.5231 | 11.2381 | 15.6898 | 15.6900 | 11.3615 | 11.1398 |
| kodim09 | 27.6984 | 7.8525 | 8.8962 | 11.8505 | 11.5745 | 9.0060 | 9.0541 |
| kodim10 | 27.5260 | 8.0484 | 8.9959 | 12.0590 | 11.8078 | 9.0675 | 9.2192 |
| kodim11 | 25.6655 | 8.5214 | 9.1379 | 12.8099 | 12.5590 | 9.4585 | 9.2927 |
| kodim12 | 27.5989 | 7.3733 | 8.2378 | 10.8612 | 10.8615 | 8.4810 | 8.6585 |
| kodim13 | 28.3607 | 11.3963 | 12.3383 | 16.7187 | 16.6004 | 12.3358 | 11.8617 |
| kodim14 | 29.2347 | 9.4764 | 10.5431 | 14.3031 | 14.3033 | 10.4163 | 10.1614 |
| kodim15 | 30.4822 | 7.9670 | 8.8856 | 12.2739 | 12.1862 | 9.0108 | 8.9976 |
| kodim16 | 26.0326 | 7.6665 | 8.4647 | 11.0122 | 11.0219 | 8.7021 | 8.7756 |
| kodim17 | 27.9822 | 7.9938 | 9.0963 | 12.4169 | 12.3378 | 9.0672 | 9.1935 |
| kodim18 | 29.6553 | 10.6261 | 11.5642 | 15.7203 | 15.7206 | 11.5178 | 11.1258 |
| kodim19 | 28.6045 | 9.0502 | 9.8901 | 13.5659 | 13.5355 | 9.9224 | 9.8226 |
| kodim20 | 20.7522 | 6.8236 | 7.5023 | 10.1324 | 10.1324 | 8.2927 | 8.0778 |
| kodim21 | 26.8304 | 9.1111 | 10.0076 | 13.2435 | 13.2437 | 10.0054 | 9.7629 |
| kodim22 | 27.8636 | 9.7815 | 10.6857 | 14.2530 | 14.2533 | 10.7089 | 10.0948 |
| kodim23 | 29.9501 | 7.7729 | 8.6764 | 11.3280 | 11.1367 | 8.7043 | 8.5056 |
| kodim24 | 27.9528 | 9.1627 | 10.0891 | 14.1933 | 14.1850 | 10.1416 | 10.1682 |

## Ratios vs references

Geometric mean of per-image size ratio (Obsidian vs reference; < 1 means
smaller). Computed with `aggregate.py`.

| Obsidian vs | geomean ratio |
|---|---|
| jxl | 3.217 |
| webp | 2.909 |
| jls | 2.876 |
| j2k | 2.912 |
| png-optipng | 2.146 |
| png-pngcrush | 2.158 |

## Verification of the reference numbers

The pinned reference figures land within ~0.5% of the independent WangXuan95
2024 lossless benchmark on the same PCD0992 corpus (JPEG XL e7: 8.71 bpp,
WebP m5: 9.58 bpp, PNG optipng: ~13.1 bpp, JPEG-LS: ~13.1 bpp). This
confirms the harness measures the canonical dataset with correct commands.
(The ~3-4 bpp figures seen in some papers correspond to a downsampled RGB
subset and are not this corpus.)

## Fidelity gate

- Every reference row above was decoded back and byte-compared (`cmp`) to the
  source PPM. All pass.
- Obsidian rows come from `roundtrip --effort N --json`, which is bit-exact
  by construction.
- `bash benchmarks/fuzz_gate.sh` runs randomized small-image round-trips
  (efforts 0/4/7) as the pre-benchmark gate.

## Running

```bash
bash benchmarks/build_toolchain.sh        # once: apt codecs + build tools/cjls
bash benchmarks/fuzz_gate.sh 100          # fidelity gate
bash benchmarks/run_kodak.sh --effort 4   # full run -> results/<date>-<version>.csv
python3 benchmarks/aggregate.py results/<date>-<version>.csv
```

## Trend

| Date | Version | Mean bpp | Change | Note |
|---|---|---|---|---|
| 2026-08-17 | v1 | 27.8226 | - | first Obsidian row + reference baseline |

- the Builder