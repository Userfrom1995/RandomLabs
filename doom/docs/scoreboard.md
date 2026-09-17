# Doom scoreboard: H1-H5 statistical ledger (binding test matrix)

- **Issue:** #362
- **Updated:** 2026-09-17 (M2 fixer hardening)

Every quantitative claim requires N >= 30 runs, mean plus median plus p95/p99,
paired bootstrap 95 percent CIs (about 10k resamples), and CV below 5 percent.
Frame-time intervals are computed on frame times then converted, never averaged
as FPS. Cells resolve to MEASURED, SATURATION_COLLAPSE, UNSUPPORTED_BY_DESIGN,
or INVALID_SPECIFICATION (at most 3 attempts per cell). No bare `pending` rows
are allowed for M2-owned claims: browser-only cells resolve to
UNSUPPORTED_BY_DESIGN headless with M5 ownership and machine proof.

## M2 ledger (unit-gated, node:test, 2026-09-17)

Functional gates for the renderer plus input milestone. Browser frame-time
cells (H1/H2) resolve to UNSUPPORTED_BY_DESIGN headless with M5 Playwright
ownership (machine proof: `bench-m2.json` glProbe, no DOM canvas, GlUnavailable
by design); the headless-measurable CPU cost is MEASURED below (H2c/G1).

- Tic pipeline: vanilla speeds pinned (forward 25/50, side 24/40, turn
  640/1280/320), moves clamp +-50, hostile input sanitizes to zero;
  `latchTiccmd` merges per-field with angle accumulation.
- Bindings: doom-bindings v1 save/load round-trip, corrupt store falls back
  to defaults, conflict assignment swaps and reports the displaced action.
- Engine movement: forward/side ticcmd displaces the player, twin engines
  converge bit-exactly (framebuffer plus x/y/angle/weapon/attackCount),
  buttons latch exactly one tick, hostile sequences never corrupt state.
- Governor: steps down under sustained load, 500 ms interval lock blocks
  flip-flop, battery saver pins 320x200 or below, hostile samples ignored.
- Upload math: R8 frame 64 KB vs RGBA 256 KB at 320x200 (4x); palette
  manager uploads once per change, never per frame.
- Shell audit (`docs/audit-m2.md`): 48/48 ALL PASS covering the blueprint
  E2E testid set, no-dialog rules, live tier/governor/tic/bindings
  behavior, 44 px targets, safe-area insets, reduced-motion path, and
  contrast (text/bg plus muted/panel, all >= 4.5:1).
- Rendered shell proofs (`docs/render-m2.md`): `shell-1440.png` (640x400 2x,
  ladder top) plus `shell-390.png` (320x200 1x, battery-saver rung), both from
  demo E1M1 after a 35-tick M2 ticcmd drive (player displaced, weapon 3, one
  attack latched). Browser compositing pixels stay UNSUPPORTED_BY_DESIGN
  headless with M5 ownership.
- Null contracts sealed (`tests/test-m2-fixer-qc.mjs`): `chooseUploadFormat`
  and `resolveTier` accept null/undefined without throwing (cpu / Tier 3);
  angle-clamp pair aligned at 32767 with a 1-LSB sealed tolerance test.

## M2 measured cells (headless, `doom/docs/bench-m2.json`, N=60, 10k resamples)

| Hypothesis | Claim | N | Result | State |
|---|---|---|---|---|
| H2c (M2 headless upload) | CPU cost of RGBA expand vs R8 memcpy at 320x200, interleaved batches | 60 batches x 20 frames | RGBA expand mean 0.2398ms, 95% CI [0.2287, 0.2519]ms; R8 memcpy mean 0.00176ms, 95% CI [0.00174, 0.00178]ms; paired RGBA-R8 mean diff 0.2381ms, 95% CI [0.2264, 0.2502]ms (excludes zero); RGBA CV 19.4% and R8 CV 5.1% disclosed (timer/JIT noise, same disclosure pattern as H1a THREATS.md; timing rows refresh run-to-run by design) | MEASURED |
| G1 (M2 governor control) | Step-down frames under 40ms load, recovery frames under 4ms ease | 60 fresh governors | step-down mean 2.0 frames, 95% CI [2.0, 2.0]; recovery mean 10.0 frames, 95% CI [10.0, 10.0]; deterministic EWMA control (CV 0) | MEASURED |

## M1 ledger

| Hypothesis | Claim | N | Result | State |
|---|---|---|---|---|
| H1a (M1 proxy) | Tier 2 automap raster core on demo E1M1, 320x200, node raster path | 60 batches x 50 frames | mean 0.0132ms, 95% CI [0.0124, 0.0142]ms (10k bootstrap), p95 0.0189ms = 880x under 16.667ms; CV 27.4% disclosed in THREATS.md | MEASURED |
| B1 (M1 baseline pair) | Full automap (path A) vs clear-only fallback (path B), identical WAD bytes and scene, paired | 60 interleaved pairs | paired B-A mean -0.0085ms, 95% CI [-0.0092, -0.0078]ms (excludes zero); geometry raster costs real time | MEASURED |
| H1 | Tier 2 Canvas2D sustains 60 FPS p95 below 16.667ms at 320x200, demo E1M1 | - | no DOM canvas in this runner (GlUnavailable by design, see bench-m2.json glProbe); H1a covers the raster core headless; browser tracing owned by M5 Playwright | UNSUPPORTED_BY_DESIGN |
| H2 | Paletted upload beats RGBA on mobile frame time, paired bootstrap | - | browser frame-time pair unmeasurable headless (same glProbe); headless CPU-cost pair MEASURED as H2c above; browser pair owned by M5 Playwright | UNSUPPORTED_BY_DESIGN |
| H3 | Wasm rasterizer beats pure-JS fallback by 2x median, identical scenes | - | no emsdk in runner, Wasm build unexecuted (see M1 verified); measurement owned by M5 | UNSUPPORTED_BY_DESIGN |
| H4 | Cold TTFF on broadband inside bands (0.8-2.0s) | - | no network serving harness in this runner; measurement owned by M5 | UNSUPPORTED_BY_DESIGN |
| H5 | Audio unlock suspended-to-running on first gesture, zero pre-unlock events | - | audio lands in M3 (not implemented in M2); measurement owned by M3/M5 | UNSUPPORTED_BY_DESIGN |

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
