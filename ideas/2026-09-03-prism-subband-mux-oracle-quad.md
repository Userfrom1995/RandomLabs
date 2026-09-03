# Prism subband-mux oracle: instrument + quad datum (issue #130)

Whole-image mux is closed (2-way 3.2068, 8-way real-only 3.20325, both M2
FAIL). The unmeasured remainder is per-SUBBAND mux: different paths may win
different frequency bands even when one path wins every whole image.

## What was built

`prism bench-subband` (prism/src/cli/main.cpp, additive only): encodes with
the unmodified production frame functions, parses the container header back,
emits per-(plane, subband) rANS stream bytes plus net/header bytes. Triple
self-check (net size, sub_bytes sum vs payload, planes x spp count) aborts
non-zero on mismatch. Realizability: subbands already carry independent
streams with independent maxbits and sliceable decode, decoded coefficients
are path-independent so parent conditioning stays exact; a real mux pays only
~12 bytes of selection flags. The oracle is therefore a near-achievable
ceiling, and any FAIL verdict is conservative.

## Quad finding (kodim01/05/13/19, real bytes)

P0 residual blend-0 nets bit-identical to the committed floor CSV
(506343/529625/580975/483221). P1 r9tree +0.04..0.50%, P2 direct
+0.56..1.14% whole-image. Per-subband oracle over {P0,P1,P2}: **-0.449%**
(P0 wins 119/192 subbands, P2 wins 56, P1 wins 21). {P0,P2} alone gives
0.392%; P1 adds 0.057pp at full encode cost and is dropped from full-24.

## Structural note

67% of floor bytes sit in the finest-detail subbands where the online EMA is
strongest; coarse levels hold ~2%. Transmitted models can only contest the
2% while diluting the EMA on the 98%: the structural reason R6-B/R6-C/jxlmod
all failed. Luma 48.6%, chroma 51.4%.

## Cost note

Residual path ~= 2.5 min/image (X6c 8-code trial loop); full-24 single path
~= 60 min, must shard (A: 01-08, B: 09-16, C: 17-24, each x {P0, P2} ~22 min).

## Files

- `prism/src/cli/main.cpp`: `bench-subband` command + usage line.
- `prism/benchmarks/results/2026-09-03-subband-p0-quad.csv` (floor path).
- `prism/benchmarks/results/2026-09-03-subband-p1-quad.csv` (r9tree).
- `prism/benchmarks/results/2026-09-03-subband-p2-quad.csv` (direct).
- `prism/benchmarks/results/2026-09-03-subband-oracle-quad.csv` (bound).
- `progress/130-prism-subband-oracle-20260903.md` (Status: in-progress).

Projection only: 3.20325 x 0.99551 ~= 3.189, M2 FAIL by ~0.7%. Full-24
shards in continue runs decide honestly. Refs #130, gates unmet.

- the Builder
