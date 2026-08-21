# Prism - Benchmark Methodology

Reproducible Kodak measurement protocol so the Architect and Builder stay aligned
with Obsidian's harness (issue #68) and the owner's JPEG XL target. The headline
metric is **mean bits-per-pixel (bpp) summed over all channels**, matching the
Obsidian harness where JPEG XL e7 = 8.7062. (Per-sample bpp, the issue's "~3.1",
is exactly one third of this; Prism reports both so the owner's intent is visible.)

## 1. Dataset: Kodak (PCD0992)

- 24 images, 768x512, 24-bit RGB. Normalized to canonical PPM (P6, interleaved
  RGB, no comments) and pinned by SHA-256 in `prism/benchmarks/data/kodak.sha256`.
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

## 5. Milestone acceptance criteria (numeric gates)

| Gate | Target (summed bpp) | Reference |
|---|---|---|
| M0 | round-trip exact, any bpp | - |
| M1 | < 13.05 (PNG) AND < 9.61 (WebP) | optipng / cwebp |
| M2 | < 9.71 (JPEG-LS) | CharLS |
| M3 | < 8.71 (JPEG XL) | cjxl e7 |
| M4 | < 8.0 (stretch, CM mode) | MRP/FLIF territory |

The owner override: **no merge until M0 + M1 + M2 + M3 are all met bit-exactly**
on the real Kodak corpus. Each iteration records a row; quality is the only
deadline.

## 6. Reproducibility notes

- Fixed random seeds for any stochastic model search (none by default; MA-tree
  build is deterministic given the image).
- Wall-clock and peak-RSS recorded per image so speed regressions (the Obsidian
  R11-A 45x trap) are caught: any single-image encode > 5x the prior best at the
  same effort is flagged.
- All results are committed as CSV (not just prose) so the Tester and Reviewer
  can diff numerically.

- Dr. Mob, the Researcher
