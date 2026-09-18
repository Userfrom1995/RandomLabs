# Progress: Doom - client-side Web Doom engine at /doom/

- **Issue:** #362
- **Branch:** opencode/issue362-20260917235314
- **Status:** in-progress
- **Updated:** 2026-09-18T00:00:00Z
- **Active Milestone:** M3 (In progress, phase A landed)

## Milestone roadmap

- Milestone 1 (M1) engine core and WAD parser plus basic loop (PR 1 target, Refs #362):
  - [x] Checked WAD reader plus header/dir validation plus error taxonomy (`E_CONTAINER`/`E_MAP`/`E_REF`/`W_GEOM`/`W_MEDIA`)
  - [x] Map discovery plus lump decoders plus texture composition plus Hexen detect-and-report
  - [x] doomgeneric Wasm build via Emscripten (SIMD plus scalar split, no pthreads) behind the stable engine boundary
  - [x] rAF plus 35 Hz accumulator loop with shareware DOOM1.WAD precached, E1M1 first frame on Canvas2D
  - [x] `doom/docs/scoreboard.md` skeleton plus desktop Playwright first-frame screenshot
- Milestone 2 (M2) renderer and input (PR 2 target, Refs #362):
  - [x] WebGL paletted zero-copy path plus shader quad plus fallback Tiers 0-4 with probe and override
  - [x] Resolution ladder plus battery saver plus mobile GL flags
  - [x] tic pipeline plus desktop Pointer Lock plus DOM touch overlay with responsive contract
  - [x] Remapping UI plus persisted bindings plus keyboard-only and a11y paths
- Milestone 3 (M3) audio and persistence (PR 3 target, Refs #362):
  - [x] `wadAudio` plus `mus2mid` golden-tested, SFX cache plus 8-voice engine plus mixer plus unlock gate
  - [ ] OPL3 music worklet with GENMIDI bank plus song switch (pure-JS DBOPL fallback)
  - [ ] `StorageProvider` x3 plus save slots plus config plus progression plus bundle export/import
- Milestone 4 (M4) WAD ecosystem and polish (PR 4 target, Refs #362):
  - [ ] Drag-drop plus picker IWAD/PWAD ingest with per-map isolation and load-order rules
  - [ ] Onboarding plus sample plus empty/loading/error states, episode clamp, service worker offline pass, landing card
- Final Milestone (M5) integration and end-to-end audit (final PR, Closes #362):
  - [ ] H1-H5 statistical ledger plus baseline catalog measured
  - [ ] Reviewer `/oc approve`, Tester `/oc approve-test`, Quality Council `/oc approve-eval` >= 9.8/10, Pages deploy green

## Current step

Milestone 3 phase A landed (audio pure modules plus 31 headless tests green); phases B-D (storage, shell, tools/docs) follow on this branch.

## Next steps

- Land M3 phases B-D, then Reviewer audits the M3 diff; Tester runs the blueprint test matrix plus Playwright E2E
- Builder continues with M4 (WAD ecosystem and polish) on the next milestone PR after review

## Agent log

- 2026-09-17 (Researcher run 1): committed `doom/docs/research-spec.md` (engine choice, WAD and map structures, rendering path with 7.6ms budget, audio pipeline, persistence ladder, controls, perf budget with TTFF bands, baseline catalog, statistical gates, ecosystem rules, risks) plus researcher memory notes. Decision action: architect.
- 2026-09-17 (Architect run 1): ran a 4-pod brainstorm swarm (engine core plus WAD parser, renderer plus loop, audio plus persistence, shell plus input plus ecosystem) against the binding research decisions. Wrote the blueprint to `ideas/2026-09-17-doom-client-side-web-engine.md` (summary, deliverables, why, how it works, module breakdown with binding interface shapes, M1-M5 epic, test matrix, residual risks) and this epic tracker. Open risks resolved per phase: doomgeneric shim M1 with Chocolate SDL2 v1.1 behind one stable boundary, SIMD/scalar probe split, extNodes read-first with rebuild on demand, Hexen detect-and-report, multiplayer out of scope. Decision action: build.
- 2026-09-17 (Builder run 1, M1): implemented the full M1 slice on this branch: `doom/src/wad/` (checked reader, taxonomy, header/dir, discovery, decoders, extNodes read-first, textures, Hexen detect), `doom/src/engine/` (stable boundary JS core plus SIMD probe plus `build/shim_m1.c`/`emcc_m1.sh`), `doom/src/core/` (35 Hz accumulator loop), `doom/src/render/` (zero-copy view, automap, Canvas2D presenter, tiers), app shell (`index.html`/`app.js`/`theme.css`/`sw.js` offline shell, picker plus drop ingest with cache plus episode clamp), `doom/tools/` (demo WAD generator, PNG first-frame renderer), `doom/tests/` (35/35 green), `doom/docs/scoreboard.md` plus `first-frame.png`, `doom/README.md`, builder ideas writeup, root landing plus README entries. Two suite-caught bugs fixed (sidedef double offset, malformed SIMD probe). Served locally (200s) and verified first frame visually. Decision action: review.
- 2026-09-17 (Fixer run 1, M1 hardening for Quality Council 5.3/10 rejection): applied all six M1-scoped findings without M2/M3 creep. Fixed `app.js` WebGL probe (throwaway canvases, webgl2 first) and README test command (glob form). Added `src/perf/stats.js` (seeded bootstrap harness) plus `tools/bench-m1.mjs` (H1a MEASURED: N=60 batches, p95 ~880x under budget; B1 paired baseline MEASURED). Added `tools/audit-layout.mjs` (14 checks ALL PASS, contrast all >= 4.5:1) plus `docs/THREATS.md` (timer/GC/CV/node-vs-browser disclosure) plus `tools/soak-m1.mjs` (100k ticks exact, hash f6cad8e9, ~177KB forced-GC heap). Added `tests/test-fixer-m1-evidence.mjs` (16 tests), `repro.sh`, `tools/seal-manifest.mjs` plus `docs/manifest.sha256`. Scoreboard carries H1a/B1 MEASURED rows with H1-H5 browser cells still pending to M5.
- 2026-09-17 (Builder run 2, M2): implemented the full M2 slice on branch `opencode/issue362-doom-m2`: `src/input/` (ticcmd builder with vanilla speeds, doom-bindings v1 with conflict swap, keyboard state plus sampling, Pointer Lock mouse look, touch stick state, remap table), `src/render/` (R8/RGBA upload strategy, upload-once palette manager, WebGL single-pass quad with GlUnavailable fallback, resolution ladder with 500ms hysteresis plus battery saver, Tier 0/1 resolution with M1 pins intact), engine ticcmd movement (arcade scale, per-tick button edges, deterministic twins, M1 immediate-turn contract kept), shell wiring (tier-aware presenter with one-rung fallback, touch overlay with weapon-strip collapse, pause recapture overlay, remap plus video controls, per-tick input pump). `tests/test-m2-input.mjs` plus `test-m2-render.mjs` (49 tests), `tools/audit-m2.mjs` plus `docs/audit-m2.md` (48/48 ALL PASS). Full suite 200/200 green with all M1 sealed pins untouched. Decision action: review.
- 2026-09-17 (Fixer run 2, M2 hardening for Quality Council 8.0/10 rejection): applied all five M2-scoped findings without M3/M4 creep. (d) `chooseUploadFormat`/`resolveTier` accept null via `?? {}` sealed pins plus tests; (e) `injectTiccmd` clamp aligned to 32767 with 1-LSB tolerance test. (b) `tools/bench-m2.mjs` plus `docs/bench-m2.json` (H2c RGBA-expand vs R8-memcpy paired bootstrap CIs, G1 governor step/recovery frames, glProbe machine evidence). (a) scoreboard converted to deterministic states only (H2c/G1 MEASURED, H1/H2-browser/H3/H4/H5 UNSUPPORTED_BY_DESIGN headless with M5/M3 ownership). (c) `tools/render-m2-shell.mjs` plus `docs/shell-1440.png`/`shell-390.png`/`render-m2.md` headless shell proofs. Suite 227/227 green, audit-m2 48/48 ALL PASS. Decision action: review.
- 2026-09-18 (Builder run 3, M3 phase A): audio pure modules (`src/audio/`: DMX parser, MUS-to-SMF port, LRU cache, 8-voice engine, mixer, unlock machine, FM music core) plus `tests/test-m3-audio.mjs` (31 tests) green alongside the sealed suite.
- 2026-09-18 (Builder run 3, M3 phase B): storage ladder (`src/storage/`: provider plus memory tier with probed OPFS/IDB/local tiers, atomic OPFS writes, 6-slot save manager with debounce plus flush, versioned bundle export/import with rollback) plus engine `setPlayerState` hook plus `tests/test-m3-storage.mjs` green; WAD cache races wedged backends with a 3 s timeout. audio pure modules (`src/audio/`: DMX parser, MUS-to-SMF port, LRU cache, 8-voice engine, mixer, unlock machine, FM music core) plus `tests/test-m3-audio.mjs` (31 tests) green alongside the sealed suite.

## Decision

- **Decision action:** build
- **Rationale:** blueprint and epic roadmap are committed; M1 has a concrete module list with interface shapes and test hooks for the Builder.
