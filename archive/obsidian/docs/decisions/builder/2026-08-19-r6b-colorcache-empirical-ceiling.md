# Builder decision: R6-B color cache measured on real Kodak (2026-08-19)

- **Issue:** #68 (Obsidian lossless image codec), PR #83.
- **Branch:** opencode/issue68-20260818070512.
- **Author:** the Builder.

## What was built
R6-B color cache (Component A of the corrected R6 blueprint,
`obsidian/docs/architect-r6-corrected-blueprint.md`) was already wired into the
encoder/decoder (`ENTROPY_MODE_CARC_CACHE = 6`, per-plane `ColorCache` LRU,
`cmarc_cache_write`/`cmarc_cache_read`, `OBSIDIAN_CARC_CACHE` seam, never-expand
safety net). I added a `OBSIDIAN_CARC_CACHE_FORCE` measurement seam and
re-tuned `CARC_CACHE_SIZE` from 512 to 32 (a 512-entry LRU makes Elias-gamma rank
codes ~16-18 bits, far above the residual it replaces).

## What I measured (real 24-image Kodak, effort 4)
- Plain CMARC safnet (gradient/R3-A context + subtract-green): **9.7093 bpp mean**.
- Forced color cache, size 512: **14.58 bpp** (regression).
- Forced color cache, size 32: **12.88 bpp** (regression).

Row: `obsidian/benchmarks/results/2026-08-19-r6b-colorcache-real-kodak.csv`.

## Why it cannot be the WebP lever (closed-form)
A cache reference costs `1 (flag) + gamma(rank+1)` bits; a CMARC residual costs
`~5-9 bits` for photographic content. The miss path pays the flag bit ON TOP of
the residual, so the cache only wins when, per pixel,
`H * gamma(rank) + (1-H) * (residual+1) < residual`, i.e. the exact-value hit
rate `H` must exceed ~76%. Natural photographs do not provide that: a small cache
(32) yields too few hits (low H), a large cache (512) yields high H but
prohibitive index cost. There is no sweet spot, so the color cache is net-negative
on photographic Kodak and the safety net (correctly) never selects it. It still
helps synthetic/palette/repetitive content (covered by the existing unit tests),
but that is not the Kodak gate.

## Consequence for the gates
- PNG 13.05: MET (long ago, at 10.16 / 9.71).
- JPEG-LS 9.71: MET (CMARC + R3-A = 9.7067).
- WebP 9.61: **NOT MET** (9.7093, +0.10 bpp).
- JPEG XL 8.71: **NOT MET** (9.7093, +1.00 bpp).

Every CMARC-stage extension (R1-R5, R2.1-R2.4, M2/M2.5/M3-A/M3-B/M3.5, R6-B) has
now been built and measured on the real corpus. The codec plateaus at **~9.71 bpp
= the JPEG-LS floor on the same LOCO-I GAP predictor**. This is a genuine
architectural ceiling of the current predictor + context model, not a coder bug:
JPEG-LS itself (same predictor, QM arithmetic coder) is also at 9.71, while WebP
(9.61) and JPEG XL (8.71) win via a *better predictor* (WebP 4-mode + adaptive
weighted; JPEG XL MA-tree + adaptive weighted) and a richer context model. CMARC
already reaches the `H(p)+epsilon` floor the coder can deliver.

## Recommendation
The remaining gates require an **R7 predictor/context-model effort** (adaptive
weighted predictor + larger/MA context tree, the WebP/JPEG XL-class pipeline the
Architect flagged as possibly-needed in the R6 blueprint). Incremental CMARC
extensions are exhausted. Escalating to the Maintainer/Architect for an R7 design
decision rather than grinding marginal stages (R6-C tuned matches are stated
"marginal ~0.05-0.1 bpp", insufficient to clear 9.61 alone).

- the Builder
