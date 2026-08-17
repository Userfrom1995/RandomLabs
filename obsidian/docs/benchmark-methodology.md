# Obsidian - Benchmark methodology

- **Issue:** #68
- **Author:** Dr. Mob, the Researcher
- **Date:** 2026-08-17

This document defines the single, reproducible measurement protocol for all
Obsidian iterations. Every meaningful version is benchmarked on the same
dataset, with results committed next to the code so the improvement curve is
traceable.

---

## 1. Dataset

**Kodak** (Kodak Lossless True Color Image Suite): 24 images, each
768x512, 24-bit RGB.

Acquisition (see also the issue body):

```bash
# Primary source (Kaggle mirror) as specified in issue #68:
curl -L -o ~/Downloads/kodak-dataset.zip \
  https://www.kaggle.com/api/v1/datasets/download/sherylmehta/kodak-dataset

# Alternative canonical source (same images, one PNG per image):
#   https://r0k.us/graphics/kodak/
```

Normalization (mandatory):
1. Convert every image to a canonical **P6 PPM** (24-bit RGB, binary, no
   color management) using a pinned conversion (e.g. ImageMagick
   `convert in.png -compress none out.ppm`). The PPM bytes are the ground
   truth for every codec, including Obsidian.
2. Store the normalized set under `obsidian/benchmarks/data/kodak/` (the
   folder is git-ignored; the byte-identity hashes are committed).
3. Record the SHA-256 of each normalized PPM in
   `obsidian/benchmarks/data/kodak.sha256` so any re-download is verified.

Secondary datasets (optional, for generalization): the extra sets used in the
2024 independent benchmark (e.g. UCID) may be added later; Kodak remains the
primary scoreboard.

## 2. Reference codecs and pinned commands

Version-pinned toolchain. Version numbers are recorded in every result row
and in `obsidian/benchmarks/toolchain.md`.

| Codec | Command (lossless) |
|---|---|
| JPEG XL | `cjxl -d 0 -e 7 --lossless_jpeg=0 in.png out.jxl` |
| WebP | `cwebp -lossless -z 9 -m 6 in.png -o out.webp` |
| PNG | `optipng -o7 -strip all in.png` (and `pngcrush -brute`) |
| JPEG-LS | CharLS CLI `charls -lossless` (or `cjls`) |
| FLIF | `flif -E in.png out.flif` (superseded, reference only) |
| JPEG 2000 lossless | `convert in.png -compress Lossless out.jp2` |
| MRP (stretch reference) | per Matsuda lab release, gray-only, documented speed |

Every baseline run uses a single pinned machine (CPU model, RAM, OS recorded)
and single-threaded execution where the tool allows. No SIMD is disabled, but
thread counts are fixed at 1 so encoder effort, not parallelism, is measured.

## 3. Metrics

Per image:
- compressed bytes `B`
- **bpp** `= 8 * B / (w * h)`
- encode wall time (ms), decode wall time (ms)
- peak RSS (kB), optional

Aggregates over the 24 Kodak images:
- arithmetic mean bpp (the headline number, matches the literature convention)
- total compressed bytes
- geometric mean of per-image size ratios vs each reference codec (so no
  single image dominates)

Format per image: `image, codec, bytes, bpp, enc_ms, dec_ms, tool_version`.
Stored as CSV in `obsidian/benchmarks/results/<date>-<version>.csv` and
rendered to markdown tables in `obsidian/benchmarks/README.md`.

## 4. Round-trip verification (hard gate)

Every benchmark run must first pass a fidelity gate:

```bash
# for each image:
obsidian decode out.obsd decoded.ppm
cmp decoded.ppm source.ppm          # must be byte-identical
```

Plus the fuzz gate from the spec: thousands of randomized small images
(all-zero, all-255, gradients, noise, flat-color, single-pixel, extreme
aspect ratios) round-tripped bit-exact. A single mismatch fails the run; the
version is not recorded as a valid result.

## 5. Procedure per iteration

1. Build the pinned toolchain once; commit `toolchain.md` with exact versions.
2. Compute and commit the **reference baseline** (JPEG XL, WebP, PNG, JPEG-LS,
   FLIF, J2K, MRP) on Kodak. This table never changes silently; any update
   (tool upgrade) is a separate documented row.
3. Implement/optimize Obsidian; run the fidelity gate; then run Obsidian on
   Kodak.
4. Record results (CSV + rendered table) and commit them in the same PR as
   the code change, with a one-line summary of what changed and why.
5. Compare against (a) the previous Obsidian row and (b) the reference
   baseline. Update `obsidian/benchmarks/README.md` with the trend.

## 6. Milestones tied to numbers

| Milestone | Criterion |
|---|---|
| M1 | Obsidian Kodak mean bpp < WebP lossless and < optipng PNG |
| M2 | Obsidian within 10% of JPEG XL lossless effort 7 |
| M3 | Obsidian within ~3% of JPEG XL, or beats it |

The numbers are recomputed against our own pinned baseline, never against
literature figures.

## 7. Reporting

Every result table ends with a codec-version attribution and links the issue
and the PR. Benchmark rows live in `obsidian/benchmarks/` and are reviewed as
part of each PR.

- Dr. Mob, the Researcher