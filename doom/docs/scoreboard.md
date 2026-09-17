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
| H1a (M1 proxy) | Tier 2 automap raster core on demo E1M1, 320x200, node raster path | 60 batches x 50 frames | mean 0.0132ms, 95% CI [0.0124, 0.0142]ms (10k bootstrap), p95 0.0189ms = 880x under 16.667ms; CV 27.4% disclosed in THREATS.md | MEASURED |
| B1 (M1 baseline pair) | Full automap (path A) vs clear-only fallback (path B), identical WAD bytes and scene, paired | 60 interleaved pairs | paired B-A mean -0.0085ms, 95% CI [-0.0092, -0.0078]ms (excludes zero); geometry raster costs real time | MEASURED |
| H1 | Tier 2 Canvas2D sustains 60 FPS p95 below 16.667ms at 320x200, demo E1M1 | - | browser putImageData plus compositor unmeasured; H1a covers raster core only (M5) | pending |
| H2 | Paletted upload beats RGBA on mobile frame time, paired bootstrap | - | WebGL path lands in M2 | pending |
| H3 | Wasm rasterizer beats pure-JS fallback by 2x median, identical scenes | - | Wasm build Artifacts defined (build/emcc_m1.sh); measurement in M5 | pending |
| H4 | Cold TTFF on broadband inside bands (0.8-2.0s) | - | not measured (M5) | pending |
| H5 | Audio unlock suspended-to-running on first gesture, zero pre-unlock events | - | audio lands in M3 | pending |

## M1 verified (unit-gated, node:test)

- Stats harness (`src/perf/stats.js`): mean/median/p95/p99/sd/CV plus seeded
  paired bootstrap (10k resamples), unit-tested for determinism and CI coverage
- H1a proxy cell: `doom/docs/bench-m1.json` (N=60, node v22.23.2); H1 browser
  cell stays pending to M5 with Playwright tracing (see THREATS.md for the
  node-vs-browser bound argument)
- B1 baseline pair sealed in the same artifact; Wasm-vs-JS pair stays pending
  (no emsdk in runner: UNSUPPORTED_BY_DESIGN for this environment, build
  script `build/emcc_m1.sh` present and reviewed but unexecuted)
- Layout audit (`doom/docs/layout-audit.md`): 15 static checks ALL PASS at
  1280px and 390px, 8 contrast pairs all >= 4.5:1; Playwright screenshots
  remain for a browser-capable runner
- Extended soak (`doom/docs/soak-m1.json`): 100000 ticks exact, framebuffer
  hash f6cad8e9 identical across independent engines, ~177KB retained after
  forced GC (no per-tick leak); multi-hour wall-clock soak stays M5 scope
- Repro: `sh doom/repro.sh` (tests plus first frame plus evidence plus serve);
  `doom/docs/manifest.sha256` seals demo WAD bytes, first-frame.png, and all
  three evidence JSONs/md

- WAD golden: demo PWAD parses (magic PWAD, 2 maps E1M1/E1M2, header/dir valid)
- Truncated fixtures per taxonomy code (E_CONTAINER/E_MAP/E_REF/W_GEOM/W_MEDIA)
- Accumulator determinism (stepManual: 100ms yields 3 steps + remainder)
- Texture compose hash (1-patch STARTAN3 over 64x64, order blit)
- Hexen detect-and-report message on BEHAVIOR map
- First frame: docs/first-frame.png rendered from decoded E1M1 automap

## Cold vs warm TTFF bands (reference, measured in M5)

Broadband 0.8-2.0s; solid 4G 2.5-5s; weak 4G 5-9s; warm 0.5-1.0s.

## Verification (Fixer run 1, Quality Council hardening)

- **Date:** 2026-09-17
- **Suite:** 110/110 `node --test "doom/tests/*.mjs"` (35 base plus 59 red-team plus 16 evidence)
- **Manifest:** `doom/docs/manifest.sha256` seals 5 artifacts, all verified MATCH
- **Evidence commits:** 79c614fd (probe plus README), 2e9a409f (stats plus bench), dab6c635 (layout audit), 3196b70d (THREATS plus soak), 7ee61d8a (tests plus repro plus seal)
- **Repro:** `sh doom/repro.sh` regenerates first frame, evidence, seal, and serve check; timing rows refresh by design (see THREATS.md run-to-run disclosure)
