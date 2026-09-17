# Progress: Doom - client-side Web Doom engine at /doom/

- **Issue:** #362
- **Branch:** opencode/issue362-20260917211808
- **Status:** in-progress
- **Updated:** 2026-09-17T00:00:00Z
- **Active Milestone:** M1 (Complete, ready for review)

## Milestone roadmap

- Milestone 1 (M1) engine core and WAD parser plus basic loop (PR 1 target, Refs #362):
  - [x] Checked WAD reader plus header/dir validation plus error taxonomy (`E_CONTAINER`/`E_MAP`/`E_REF`/`W_GEOM`/`W_MEDIA`)
  - [x] Map discovery plus lump decoders plus texture composition plus Hexen detect-and-report
  - [x] doomgeneric Wasm build via Emscripten (SIMD plus scalar split, no pthreads) behind the stable engine boundary
  - [x] rAF plus 35 Hz accumulator loop with shareware DOOM1.WAD precached, E1M1 first frame on Canvas2D
  - [x] `doom/docs/scoreboard.md` skeleton plus desktop Playwright first-frame screenshot
- Milestone 2 (M2) renderer and input (PR 2 target, Refs #362):
  - [ ] WebGL paletted zero-copy path plus shader quad plus fallback Tiers 0-4 with probe and override
  - [ ] Resolution ladder plus battery saver plus mobile GL flags
  - [ ] tic pipeline plus desktop Pointer Lock plus DOM touch overlay with responsive contract
  - [ ] Remapping UI plus persisted bindings plus keyboard-only and a11y paths
- Milestone 3 (M3) audio and persistence (PR 3 target, Refs #362):
  - [ ] `wadAudio` plus `mus2mid` golden-tested, SFX cache plus 8-voice engine plus mixer plus unlock gate
  - [ ] OPL3 music worklet with GENMIDI bank plus song switch (pure-JS DBOPL fallback)
  - [ ] `StorageProvider` x3 plus save slots plus config plus progression plus bundle export/import
- Milestone 4 (M4) WAD ecosystem and polish (PR 4 target, Refs #362):
  - [ ] Drag-drop plus picker IWAD/PWAD ingest with per-map isolation and load-order rules
  - [ ] Onboarding plus sample plus empty/loading/error states, episode clamp, service worker offline pass, landing card
- Final Milestone (M5) integration and end-to-end audit (final PR, Closes #362):
  - [ ] H1-H5 statistical ledger plus baseline catalog measured
  - [ ] Reviewer `/oc approve`, Tester `/oc approve-test`, Quality Council `/oc approve-eval` >= 9.8/10, Pages deploy green

## Current step

Milestone 1 complete, ready for review (all five M1 boxes checked, 35/35 tests green)

## Next steps

- Reviewer audits the M1 diff; Tester runs the blueprint test matrix plus Playwright E2E
- Builder continues with M2 (renderer plus input) on the next milestone PR after review

## Agent log

- 2026-09-17 (Researcher run 1): committed `doom/docs/research-spec.md` (engine choice, WAD and map structures, rendering path with 7.6ms budget, audio pipeline, persistence ladder, controls, perf budget with TTFF bands, baseline catalog, statistical gates, ecosystem rules, risks) plus researcher memory notes. Decision action: architect.
- 2026-09-17 (Architect run 1): ran a 4-pod brainstorm swarm (engine core plus WAD parser, renderer plus loop, audio plus persistence, shell plus input plus ecosystem) against the binding research decisions. Wrote the blueprint to `ideas/2026-09-17-doom-client-side-web-engine.md` (summary, deliverables, why, how it works, module breakdown with binding interface shapes, M1-M5 epic, test matrix, residual risks) and this epic tracker. Open risks resolved per phase: doomgeneric shim M1 with Chocolate SDL2 v1.1 behind one stable boundary, SIMD/scalar probe split, extNodes read-first with rebuild on demand, Hexen detect-and-report, multiplayer out of scope. Decision action: build.
- 2026-09-17 (Builder run 1, M1): implemented the full M1 slice on this branch: `doom/src/wad/` (checked reader, taxonomy, header/dir, discovery, decoders, extNodes read-first, textures, Hexen detect), `doom/src/engine/` (stable boundary JS core plus SIMD probe plus `build/shim_m1.c`/`emcc_m1.sh`), `doom/src/core/` (35 Hz accumulator loop), `doom/src/render/` (zero-copy view, automap, Canvas2D presenter, tiers), app shell (`index.html`/`app.js`/`theme.css`/`sw.js` offline shell, picker plus drop ingest with cache plus episode clamp), `doom/tools/` (demo WAD generator, PNG first-frame renderer), `doom/tests/` (35/35 green), `doom/docs/scoreboard.md` plus `first-frame.png`, `doom/README.md`, builder ideas writeup, root landing plus README entries. Two suite-caught bugs fixed (sidedef double offset, malformed SIMD probe). Served locally (200s) and verified first frame visually. Decision action: review.
- 2026-09-17 (Fixer run 1, M1 hardening for Quality Council 5.3/10 rejection): applied all six M1-scoped findings without M2/M3 creep. Fixed `app.js` WebGL probe (throwaway canvases, webgl2 first) and README test command (glob form). Added `src/perf/stats.js` (seeded bootstrap harness) plus `tools/bench-m1.mjs` (H1a MEASURED: N=60 batches, p95 ~880x under budget; B1 paired baseline MEASURED). Added `tools/audit-layout.mjs` (14 checks ALL PASS, contrast all >= 4.5:1) plus `docs/THREATS.md` (timer/GC/CV/node-vs-browser disclosure) plus `tools/soak-m1.mjs` (100k ticks exact, hash f6cad8e9, ~177KB forced-GC heap). Added `tests/test-fixer-m1-evidence.mjs` (16 tests), `repro.sh`, `tools/seal-manifest.mjs` plus `docs/manifest.sha256`. Scoreboard carries H1a/B1 MEASURED rows with H1-H5 browser cells still pending to M5.

## Decision

- **Decision action:** build
- **Rationale:** blueprint and epic roadmap are committed; M1 has a concrete module list with interface shapes and test hooks for the Builder.
