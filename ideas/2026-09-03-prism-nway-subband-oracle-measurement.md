# Prism N-way subband mux oracle + R6B desync fix (measurement milestone, issue #130)

- **Date:** 2026-09-03. **Type:** honest negative result + production bug fix.
- **Question:** does per-subband muxing over ALL wavelet paths (not just
  {P0, P2}) stack enough to threaten M2 (3.166/sample, 9.498 summed)? And is
  every committed benchmark command actually byte-exact as claimed?

## What was built

1. `prism bench-subband` now accepts `--r6b`, `--r6c [--kb N]`, `--r7`,
   `--route5` (exactly-one-path enforced) and verifies raster round-trip for
   every path. Additive only; no production encode path modified.
2. Fixed a real desync: `BitplaneCoder::encode_static` built its static P(0)
   backbone from unclamped counts while the wire clamps to 16 bits, so R6B
   streams were undecodable on every real Kodak image (unit tests green only
   because synthetic images stay under 65535). Encoder now derives P(0) from
   clamped counts, bit-identical to the decoder. Zero format change.

## Key files

- `prism/src/cli/main.cpp` (bench-subband N-way flags + round-trip check)
- `prism/src/codec/bitplane.cpp` (R6B clamp fix)
- `prism/benchmarks/results/2026-09-03-subband-{r7,route5,r6b-fixed,r6c}-quad.csv`
- `prism/benchmarks/results/2026-09-03-subband-nway-oracle-quad.csv`
- `progress/130-prism-nway-subband-oracle-20260903.md`

## Numbers (both units wherever a gate is evaluated)

- Quad {P0,P2} oracle 0.3921% reproduces the committed value exactly.
- Quad N-way stream oracle: 0.7215% (R6C contributes +0.33pp with 50 subband
  wins; R7 wins 0/192; R5 2 wins; R6B 17 wins).
- Full-24 projection: 0.72% off the 3.21843/9.65529 floor gives ~3.195/sample
  (~9.59 summed), M2 FAIL by ~0.9% on both units, M3 far. Headers push the
  realizable figure further from the gates (R6C +19KB/image vs 1.7KB saving).
- Realizable mux ({P0,P2} only) unchanged: 3.20664/9.61993, M2 FAIL by 1.3%.
- R6B-fixed kodim01: 3.658/sample (+6.5% vs P0), rejection corroborated.

## Why it matters

The mux lever is now closed at every granularity (whole-image 2/8-way,
per-plane 0.0000%, per-subband 2-way full-24, per-subband N-way quad) and the
lab's shipped R6B path is byte-exact again. Standing rule kept: every number
states its unit, every exclusion has a written reason, no success claimed.

- the Builder
