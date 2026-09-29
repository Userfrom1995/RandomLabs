# Prism - Benchmark Methodology

Reproducible Kodak measurement protocol so the Architect and Builder stay aligned
with Obsidian's harness (issue #68) and the owner's JPEG XL target. The headline
metric is **mean bits-per-pixel (bpp) summed over all channels**, matching the
Obsidian harness where JPEG XL e7 = 8.7062. (Per-sample bpp, the issue's "~3.1",
is exactly one third of this; Prism reports both so the owner's intent is visible.)

## 1. Dataset: Kodak (PCD0992)

- 24 images at native Kodak resolution, 24-bit RGB, mixed orientation:
  18 landscape 768x512 and 6 portrait 512x768 (kodim04/09/10/17/18/19).
  Normalized to canonical PPM (P6 header `P6\n{w} {h}\n255\n`, interleaved
  RGB, no comments) AT NATIVE ORIENTATION - no rotation - and pinned by
  SHA-256 in `prism/benchmarks/data/kodak.sha256`. Re-derivation recipe,
  proven against the pins (2026-08-24): download the lossless PNGs from the
  Kodak-Lossless-True-Color-Image-Suite mirror (PhotoCD_PCD0992), convert
  each to RGB at its native size, write the exact P6 header above plus raw
  rows; all 24 pins must verify before any measurement.
- The PPMs are git-ignored (large) but committed-durable via the benchmark cache
  so every build measures the identical corpus (the Obsidian lesson: `data/kodak`
  absence made gates unmeasurable for many iterations).
- Reference toolchain pinned in `prism/benchmarks/toolchain.md`: cjxl 0.7.0,
  cwebp 1.3.2 (-z 9 -m 6), optipng -o7, pngcrush -brute, CharLS 2.4.2 (JPEG-LS),
  OpenJPEG 2.5.0 (JPEG 2000). These give the fixed comparison rows.

## 2. Metric definition (binding)

For an image of `W x H` pixels and `C` channels, compressed to `S` bytes:

```
bpp(image) = 8 * S / (W * H * C)          # summed over channels (harness convention)
bpp_per_sample = bpp(image) / C           # issue "~3.1" convention
mean_bpp = arithmetic_mean over 24 images of bpp(image)
geo_ratio = geometric_mean over 24 images of (prism_bytes / jxl_bytes)
```

`mean_bpp` is the headline; `geo_ratio` shows relative size vs JPEG XL (target
< 1.0 to beat JXL). A fidelity gate runs `decode -> re-encode neutral` not needed;
instead a **round-trip gate** decodes the Prism stream and `cmp`s the recovered
raster byte-for-byte against the canonical PPM.

## 3. Fidelity gate (hard, pre-benchmark)

`prism/benchmarks/fuzz_gate.sh`: randomized small images (sizes 1x1 .. 64x64,
all channel counts, 8/16-bit, synthetic smooth/noise/edge) round-trip at efforts
0/4/7; failure aborts the benchmark. Plus a deterministic corruption test
(flip a byte in the payload -> decoder must reject via CRC32, not emit garbage).

## 4. Run protocol

`prism/benchmarks/run_kodak.sh --effort N`:
1. Verify `kodak.sha256`.
2. For each reference codec: encode, decode, `cmp` fidelity gate, record bytes.
3. For Prism: encode at effort N, decode, `cmp` round-trip gate, record bytes.
4. Emit `prism/benchmarks/results/<date>-<version>-e<N>.csv` with per-image
   bytes, `mean_bpp`, `geo_ratio`, and the reference rows for that date.

`prism/benchmarks/aggregate.py` prints the headline table and the trend across
all dated CSVs so the milestone curve is visible iteration by iteration.

## 5. Milestone acceptance criteria (numeric gates, BOTH units)

Binding restatement per issue #130 (owner directive 2026-08-23). Every claim
must state its unit; the durable CSV from `prism bench` stores PER-SAMPLE bpp,
the historical harness convention was SUMMED bpp, and on Kodak-24
`summed = 3 * per-sample` exactly. Gates pass only if both units clear their
thresholds. `benchmarks/bench_gate.sh` prints both units and carries a
`--self-check` proving the gate fails on known-bad input.

| Gate | Target summed (bpp/img) | Target per-sample (bpp/sample) | Reference |
|---|---|---|---|
| M0 | round-trip exact, any bpp | round-trip exact | - |
| M2 | < 9.498 | < 3.166 | WebP lossless m6 (verified table) |
| M3 | < 8.655 | < 2.885 | JPEG XL -d0 -e9 (verified table) |
| M4 | < 8.0 | < 2.667 | stretch, CM mode |

Honest baselines in the same units: Prism e7 = 11.026 summed / 3.675
per-sample; Obsidian e7 = 9.52 summed / 3.174 per-sample (lab best).
The owner override: no merge until the binding gate is met bit-exactly on the
real Kodak corpus with a fresh reproducible measurement. Standing rule: no
success claim leaves the lab without a fresh measurement stated in both units.

## 6. Reproducibility notes

- Fixed random seeds for any stochastic model search (none by default; MA-tree
  build is deterministic given the image).
- Wall-clock and peak-RSS recorded per image so speed regressions (the Obsidian
  R11-A 45x trap) are caught: any single-image encode > 5x the prior best at the
  same effort is flagged.
- All results are committed as CSV (not just prose) so the Tester and Reviewer
  can diff numerically.
- In the ideal-probe CSVs (`benchmarks/results/*-ideal-probe*.csv`), TOTAL rows
  pool frequency histograms across images before entropy estimation, so they
  are joint-estimation figures and intentionally NOT sums of the per-image
  rows; audit per-image numbers on their own rows.

- Dr. Mob, the Researcher
