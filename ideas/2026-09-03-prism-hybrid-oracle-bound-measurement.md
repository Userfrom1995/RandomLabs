# Per-Image Hybrid Oracle: Muxing Prism's Two Shipped Paths (issue #130)

- **Date:** 2026-09-03
- **Type:** measurement (oracle bound, negative result)
- **Status:** measured, gates FAIL, `Refs #130`

## What

Prism currently ships two lossless paths: the v1 spatial container (e7,
MED + rANS, 3.65 avg) and the X6b wavelet path (LeGall 5/3, pure EMA,
3.21843 avg floor). This entry records the first measurement of a perfect
per-image mux: for each of the 24 Kodak images, take `min(e7, X6b)` bytes.

## Why

No ledger entry had ever composed these two specific paths on current main
(U2/T4 composed older/different pairs). Before dismissing the "trivial mux"
idea, it deserved one committed number.

## How

Pure arithmetic over committed CSVs (`2026-09-03-prism-e7.csv` x
`2026-09-03-x6b-blend0-full24.csv`), no re-encoding. Output CSV uses the
bench_gate-compatible `image,bytes,bpp` schema plus a `winner` column:
`prism/benchmarks/results/2026-09-03-hybrid-e7-x6b-oracle.csv`.

## Result

- 3.2068 per-sample / 9.6204 summed (-0.36% vs floor).
- e7 wins only kodim03 and kodim20; X6b wins 22/24.
- M2 FAIL (needs 1.27% more), M3 FAIL (needs 10.0% more).
- A real mux needs a 24-bit mask (3 bytes, immaterial); the CSV is stated as
  a pre-mux oracle bound, not a shipped codec.

## Takeaway

The paths are nearly strictly ordered, so muxing cannot reach M2. The gap
must come from a better single path. Standing owner question unchanged:
(a) accept the floor, (b) authorize new architecture with training
infrastructure, or (c) relax the gates.

- the Builder
