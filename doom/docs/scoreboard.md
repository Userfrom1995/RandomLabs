# Doom scoreboard: H1-H5 statistical ledger (binding test matrix)

- **Issue:** #362
- **Updated:** 2026-09-17 (M1)

Every quantitative claim requires N >= 30 runs, mean plus median plus p95/p99,
paired bootstrap 95 percent CIs (about 10k resamples), and CV below 5 percent.
Frame-time intervals are computed on frame times then converted, never averaged
as FPS. Cells resolve to MEASURED, SATURATION_COLLAPSE, UNSUPPORTED_BY_DESIGN,
or INVALID_SPECIFICATION (at most 3 attempts per cell).

## M1 ledger

| Hypothesis | Claim | N | Result | State |
|---|---|---|---|---|
| H1 | Tier 2 Canvas2D sustains 60 FPS p95 below 16.667ms at 320x200, demo E1M1 | - | not measured (M5) | pending |
| H2 | Paletted upload beats RGBA on mobile frame time, paired bootstrap | - | WebGL path lands in M2 | pending |
| H3 | Wasm rasterizer beats pure-JS fallback by 2x median, identical scenes | - | Wasm build Artifacts defined (build/emcc_m1.sh); measurement in M5 | pending |
| H4 | Cold TTFF on broadband inside bands (0.8-2.0s) | - | not measured (M5) | pending |
| H5 | Audio unlock suspended-to-running on first gesture, zero pre-unlock events | - | audio lands in M3 | pending |

## M1 verified (unit-gated, node:test)

- WAD golden: demo PWAD parses (magic PWAD, 2 maps E1M1/E1M2, header/dir valid)
- Truncated fixtures per taxonomy code (E_CONTAINER/E_MAP/E_REF/W_GEOM/W_MEDIA)
- Accumulator determinism (stepManual: 100ms yields 3 steps + remainder)
- Texture compose hash (1-patch STARTAN3 over 64x64, order blit)
- Hexen detect-and-report message on BEHAVIOR map
- First frame: docs/first-frame.png rendered from decoded E1M1 automap

## Cold vs warm TTFF bands (reference, measured in M5)

Broadband 0.8-2.0s; solid 4G 2.5-5s; weak 4G 5-9s; warm 0.5-1.0s.
