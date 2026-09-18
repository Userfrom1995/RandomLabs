# Doom scoreboard: H1-H5 statistical ledger (binding test matrix)

- **Issue:** #362
- **Updated:** 2026-09-18 (M4 ecosystem and polish)

Every quantitative claim requires N >= 30 runs, mean plus median plus p95/p99,
paired bootstrap 95 percent CIs (about 10k resamples), and CV below 5 percent.
Frame-time intervals are computed on frame times then converted, never averaged
as FPS. Cells resolve to MEASURED, SATURATION_COLLAPSE, UNSUPPORTED_BY_DESIGN,
or INVALID_SPECIFICATION (at most 3 attempts per cell). No bare `pending` rows
are allowed for M2-owned claims: browser-only cells resolve to
UNSUPPORTED_BY_DESIGN headless with M5 ownership and machine proof.

## M3 ledger (unit-gated, node:test, 2026-09-17)

Functional gates for the audio plus persistence milestone (46 new tests in
`tests/test-m3-audio.mjs` plus `tests/test-m3-storage.mjs`; full suite
291/291 green with all M1/M2 sealed pins untouched; `tools/audit-m3.mjs`
48/48 ALL PASS).

- wadAudio: DMX format 3 golden strip (playable span is length minus 32),
  u8 to f32 mapping (0 to -1, 128 to 0, 255 near 1), format-0 plus
  truncation plus vanilla-cap rejects.
- mus2mid: SMF Type 0 with paired note on/off plus end-of-track, drum
  channel 15 to MIDI 9, volume scale-not-clamp (two-pass 127/Vmax),
  byte-for-byte determinism, magic plus truncation rejects.
- SFX: lazy LRU cache with corrupt-skip prefetch; 8-voice pool with
  same-origin then quietest steal, 200/1200 distance curve with MAP08
  floor, separation pan, deterministic pitch jitter, duration release.
- Mixer: menu 0..15 linear map, mute flags, persisted doom.audio shape.
- Unlock: suspended start, pre-gesture schedules dropped and counted,
  running after one gesture (H5 headless cell below).
- Music: GENMIDI strict-magic parse with safe bounds, MIDI note extraction
  round-trip of mus2mid output, deterministic bounded FM render (silence
  when empty), song-switch counting with loop flag.
- Storage: memory round-trip plus copy semantics plus E_PATH; ladder
  fault-injection (OPFS throw plus IDB unavailable fall through to
  memory); OPFS/IDB unavailable headless is graceful fallback by design;
  local tier JSON/binary round-trip with save-slot refusal
  (E_SAVE_UNAVAILABLE); 6 slots save/load/list/delete with E_SLOT;
  debounce plus flush; engine snapshot twin-convergence (restore then
  identical input stays bit-exact); bundle export/import byte equality
  with atomic rollback on quota failure.

## M4 ledger (unit-gated, node:test, 2026-09-18)

Functional gates for the WAD ecosystem and polish milestone (20 new tests
in `tests/test-m4-ecosystem.mjs`; full suite 346/346 green with all
M1/M2/M3 sealed pins untouched; `tools/audit-m4.mjs` 51/51 ALL PASS).

- Load order: drop-order staging with same-name replace-in-place (no
  duplicates); map groups replace by marker (patched E1M1 start moves,
  E1M2 survives); standalone lumps last-wins (PLAYPAL override sticks);
  corrupt files isolate into `rejected[]` with E_CONTAINER.
- Assembly: single-file merge assembles byte-complete (24546 bytes,
  parses, probes identically); empty merge yields a valid mapless
  container; merged magic follows the base (PWAD for sets).
- Isolation: hostile E1M2 patch drops E1M2 and keeps E1M1; dropped lines
  keep taxonomy codes; DEHACKED surfaces as info, never boots as a map.
- Identity: demo reads doom1/E1-only/shareware-likely; MAPxx reads the
  doom2 family with a note; mapless reads unknown without throwing.
- Shell states: loading beats fatal beats onboarding; returning visitors
  see ready; drops escalate to ready-warnings; helper lines honest.
- Settled browser proofs (headless Chromium, SwiftShader, 20 s settle):
  `docs/shell-m4-1280.png` plus `docs/shell-m4-390.png` with the DOM dump
  in `docs/render-m4.md` (Tier 0 live, OPFS saves, empty load order,
  clamp note on staged WADs, onboarding first-visit). No new H-cells:
  ingest round-trips with real IWAD/PWAD pairs plus TTFF bands stay owned
  by M5 Playwright.

## M3 measured cells (headless, `doom/docs/bench-m3.json`, N=30, 10k resamples)

| Hypothesis | Claim | N | Result | State |
|---|---|---|---|---|
| H5 (M3 headless unlock) | Suspended-to-running on first gesture, zero scheduled events before unlock | deterministic state machine plus 46-test M3 suite | 2 pre-gesture trySchedule calls dropped and counted, 0 scheduled before running; 1 gesture transitions to running; browser AudioContext resume latency owned by M5 Playwright | MEASURED |
| M3 music CPU | MUS-to-MIDI conversion plus 1 s JS-FM render, 16-note song | 30 batches | conversion mean ~0.03ms; FM render mean ~5.4ms one-shot per song switch (looped buffer, never per frame; timing rows refresh run-to-run by design) | MEASURED |

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
