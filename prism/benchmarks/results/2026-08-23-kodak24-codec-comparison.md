# Kodak-24 codec comparison - Prism vs Obsidian vs classic codecs (max effort)

Date: 2026-08-23. Independent measurement on real Kodak-24
(kodim01..kodim24, 768x512 RGB, from the Kodak-Lossless-True-Color-Image-Suite
repository), run outside the lab harness with this directory's
`bench_vs_codecs.py`. Every (codec, image) pair was pixel-compared after a
full round trip: all results below are verified lossless.

Machine: local Linux box, release builds of both lab codecs.

| Codec | Total KB | Avg KB/img | bpp | Ratio | Enc ms/img | Dec ms/img | Lossless |
|---|---|---|---|---|---|---|---|
| JPEG XL (-d0 -e9) | 9,971 | 415 | 2.885 | 36.1% | 2431 | 50 | 24/24 |
| WebP lossless m6 | 10,940 | 456 | 3.166 | 39.6% | 6589 | 1 | 24/24 |
| Obsidian e7 | 10,968 | 457 | 3.174 | 39.7% | 682 | 96 | 24/24 |
| **Prism e7** | 12,702 | 529 | 3.675 | 45.9% | 1565 | 87 | 24/24 |
| Prism X3a (wavelet + learned-ctx) | 11,224 | 468 | 3.2477 | 40.6% | n/a | n/a | 24/24 |
| JPEG-LS (ffmpeg) | 15,016 | 626 | 4.345 | 54.3% | 190 | 188 | 24/24 |
| PNG optimize | 15,439 | 643 | 4.467 | 55.8% | 103 | 0 | 24/24 |
| JPEG2000 lossless | 15,500 | 646 | 4.485 | 56.1% | 154 | 0 | 24/24 |

Raw baseline: 28,311,552 bytes (24 x 768 x 512 x 3). Ratio = compressed /
raw RGB. Efforts: Prism e7 and Obsidian e7 are their maximums (verified:
no code path exists above e7 in either codec; higher `--effort` values only
rewrite Prism's header byte). Classics at max: cjxl effort 9, WebP method 6,
PNG optimize.

## Observations

- Obsidian is ratio-tied with WebP lossless (3.174 vs 3.166 bpp) while
  encoding about 10x faster (rayon parallelism).
- Prism beats every classic codec but sits 16% behind Obsidian and 27%
  behind JPEG XL on total bytes. Closing that gap to JXL/WebP is exactly
  the M1-M3 gate work tracked in issue #117 / PR #121 (Squeeze + MA-tree).
- Encoder speed ranking (slowest first): WebP m6 > JPEG XL > Prism >
  Obsidian > classics.
- Both lab codecs: bit-exact round trip 24/24 at max effort.

## Reproduce

```bash
# fetch kodak into benchmarks/data/kodak (kodim01..kodim24), then:
python3 prism/benchmarks/bench_vs_codecs.py --kodak prism/benchmarks/data/kodak \
    --obsidian-bin obsidian/target/release/obsidian_cli
```
