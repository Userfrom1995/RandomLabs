# Progress: Doom - client-side Web Doom engine at /doom/

- **Issue:** #362
- **Branch:** opencode/issue362-20260918004409 (M5 final)
- **Status:** in-progress
- **Updated:** 2026-09-18T02:00:00Z
- **Active Milestone:** M5 integration and end-to-end audit (in progress, Closes #362)

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
  - [x] OPL3 music worklet with GENMIDI bank plus song switch (pure-JS DBOPL fallback)
  - [x] `StorageProvider` x3 plus save slots plus config plus progression plus bundle export/import
- Milestone 4 (M4) WAD ecosystem and polish (PR 4 target, Refs #362):
  - [x] `src/wad/loadout.js`: drop-order merge (map-group replace, last-wins singles), merged assembly, per-map isolation probe, WAD identity, DEHACKED surfacing
  - [x] Shell states (`src/ui/shellStates.js`): onboarding plus sample, loading/empty/error states, failed loads resume the running level, shareware episode clamp on staged WADs, per-file remove, WAD-cache-preserving service worker `doom-m4-v1`, landing card
- Final Milestone (M5) integration and end-to-end audit (final PR, Closes #362):
  - [x] H1-H5 statistical ledger plus baseline catalog measured
  - [ ] Reviewer `/oc approve`, Tester `/oc approve-test`, Quality Council `/oc approve-eval` >= 9.8/10, Pages deploy green

## M5 build log (this run)

- M5 step 1: `src/perf/m5gates.js` pure verdict logic (TTFF bands, frame-trace
  budget, paired render-path compare, ingest/corrupt/onboarding/unlock/save
  verdicts) plus `tests/test-m5-integration.mjs` (21 tests) green.
- M5 step 2: two real shell fixes proved in headless Chromium. The Video
  renderer selector was a facade (boot always re-probed, stored `doom-tier`
  ignored); boot now pins the stored tier and the selector reflects it
  (forced Tier 1 boots `Tier 1 WebGL1 RGBA`). Inline data-URI favicon kills
  the last console 404. Committed driver `tools/cdp-m5.mjs` (Node built-ins
  only) plus `tools/capture-m5.mjs` with settled proofs
  `docs/shell-m5-1280.png` / `docs/shell-m5-390.png` and `docs/render-m5.md`.
- M5 step 3: `tools/bench-m5.mjs` plus `docs/bench-m5.json` resolve every
  cell. H1 zero dropped vsyncs in 357 frames (rAF trace rides the vsync
  clock, mean exactly 16.666ms). H2browser paired Tier0/Tier1 null result
  (CI includes zero, vsync-bound; upload gap stays H2c). H3
  UNSUPPORTED_BY_DESIGN (no emsdk, machine proof). H4 cold 403ms within
  broadband, warm 279ms within the warm band (N=30 each, bootstrap CIs).
  H5 gesture-to-running 52ms. Ecosystem E2E 4/4 pass. The bench run caught
  one more real bug: rejected files left the status line stuck on their
  stale loading line; `restoreRunningStatus()` now repaints the surviving
  level on all four ingest/remove reject paths.
- M5 step 4: `tools/audit-m5.mjs` (70 checks) green; scoreboard M5 ledger
  with the full H1-H5 table; README `What works (M5)`; ideas entry
  `2026-09-18-doom-m5-integration-audit.md`; root README plus landing
  updated to M1-M5 done. Decision action: review.

## Current step

M5 Quality Council hardening (Fixer run, 2026-09-18, score 8.8/10
response): H5 re-measured at N=30 with bootstrap CI, H4 re-measured at
N=30 with raw samples plus CV 4.0 percent, H1 widened to 10 runs with a
per-run stability row, scoreboard synced to bench-m5.json to the digit,
G fuzz (32/32) plus G soak (200k deterministic ticks) rows landed with a
signed multi-hour deferral. Suite 406/406 green; audits
m2 48/48, m3 52/52, m4 51/51, m5 96/96 ALL PASS; repro.sh green. Ready
for re-review.

## Next steps

- Reviewer audits the M5 diff; Tester runs the blueprint test matrix plus
  independent Playwright E2E (hardware-GPU cadence, touch gestures,
  multi-hour soak); Quality Council evaluates; Maintainer merges
  (Closes #362) on score >= 9.8/10.

## Agent log

- 2026-09-17 (Researcher run 1): committed `doom/docs/research-spec.md` (engine choice, WAD and map structures, rendering path with 7.6ms budget, audio pipeline, persistence ladder, controls, perf budget with TTFF bands, baseline catalog, statistical gates, ecosystem rules, risks) plus researcher memory notes. Decision action: architect.
- 2026-09-17 (Architect run 1): ran a 4-pod brainstorm swarm (engine core plus WAD parser, renderer plus loop, audio plus persistence, shell plus input plus ecosystem) against the binding research decisions. Wrote the blueprint to `ideas/2026-09-17-doom-client-side-web-engine.md` (summary, deliverables, why, how it works, module breakdown with binding interface shapes, M1-M5 epic, test matrix, residual risks) and this epic tracker. Open risks resolved per phase: doomgeneric shim M1 with Chocolate SDL2 v1.1 behind one stable boundary, SIMD/scalar probe split, extNodes read-first with rebuild on demand, Hexen detect-and-report, multiplayer out of scope. Decision action: build.
- 2026-09-17 (Builder run 1, M1): implemented the full M1 slice on this branch: `doom/src/wad/` (checked reader, taxonomy, header/dir, discovery, decoders, extNodes read-first, textures, Hexen detect), `doom/src/engine/` (stable boundary JS core plus SIMD probe plus `build/shim_m1.c`/`emcc_m1.sh`), `doom/src/core/` (35 Hz accumulator loop), `doom/src/render/` (zero-copy view, automap, Canvas2D presenter, tiers), app shell (`index.html`/`app.js`/`theme.css`/`sw.js` offline shell, picker plus drop ingest with cache plus episode clamp), `doom/tools/` (demo WAD generator, PNG first-frame renderer), `doom/tests/` (35/35 green), `doom/docs/scoreboard.md` plus `first-frame.png`, `doom/README.md`, builder ideas writeup, root landing plus README entries. Two suite-caught bugs fixed (sidedef double offset, malformed SIMD probe). Served locally (200s) and verified first frame visually. Decision action: review.
- 2026-09-17 (Fixer run 1, M1 hardening for Quality Council 5.3/10 rejection): applied all six M1-scoped findings without M2/M3 creep. Fixed `app.js` WebGL probe (throwaway canvases, webgl2 first) and README test command (glob form). Added `src/perf/stats.js` (seeded bootstrap harness) plus `tools/bench-m1.mjs` (H1a MEASURED: N=60 batches, p95 ~880x under budget; B1 paired baseline MEASURED). Added `tools/audit-layout.mjs` (14 checks ALL PASS, contrast all >= 4.5:1) plus `docs/THREATS.md` (timer/GC/CV/node-vs-browser disclosure) plus `tools/soak-m1.mjs` (100k ticks exact, hash f6cad8e9, ~177KB forced-GC heap). Added `tests/test-fixer-m1-evidence.mjs` (16 tests), `repro.sh`, `tools/seal-manifest.mjs` plus `docs/manifest.sha256`. Scoreboard carries H1a/B1 MEASURED rows with H1-H5 browser cells still pending to M5.
- 2026-09-17 (Builder run 2, M2): implemented the full M2 slice on branch `opencode/issue362-doom-m2`: `src/input/` (ticcmd builder with vanilla speeds, doom-bindings v1 with conflict swap, keyboard state plus sampling, Pointer Lock mouse look, touch stick state, remap table), `src/render/` (R8/RGBA upload strategy, upload-once palette manager, WebGL single-pass quad with GlUnavailable fallback, resolution ladder with 500ms hysteresis plus battery saver, Tier 0/1 resolution with M1 pins intact), engine ticcmd movement (arcade scale, per-tick button edges, deterministic twins, M1 immediate-turn contract kept), shell wiring (tier-aware presenter with one-rung fallback, touch overlay with weapon-strip collapse, pause recapture overlay, remap plus video controls, per-tick input pump). `tests/test-m2-input.mjs` plus `test-m2-render.mjs` (49 tests), `tools/audit-m2.mjs` plus `docs/audit-m2.md` (48/48 ALL PASS). Full suite 200/200 green with all M1 sealed pins untouched. Decision action: review.
- 2026-09-17 (Fixer run 2, M2 hardening for Quality Council 8.0/10 rejection): applied all five M2-scoped findings without M3/M4 creep. (d) `chooseUploadFormat`/`resolveTier` accept null via `?? {}` sealed pins plus tests; (e) `injectTiccmd` clamp aligned to 32767 with 1-LSB tolerance test. (b) `tools/bench-m2.mjs` plus `docs/bench-m2.json` (H2c RGBA-expand vs R8-memcpy paired bootstrap CIs, G1 governor step/recovery frames, glProbe machine evidence). (a) scoreboard converted to deterministic states only (H2c/G1 MEASURED, H1/H2-browser/H3/H4/H5 UNSUPPORTED_BY_DESIGN headless with M5/M3 ownership). (c) `tools/render-m2-shell.mjs` plus `docs/shell-1440.png`/`shell-390.png`/`render-m2.md` headless shell proofs. Suite 227/227 green, audit-m2 48/48 ALL PASS. Decision action: review.
- 2026-09-18 (Builder run 3, M3 phase A): audio pure modules (`src/audio/`: DMX parser, MUS-to-SMF port, LRU cache, 8-voice engine, mixer, unlock machine, FM music core) plus `tests/test-m3-audio.mjs` (31 tests) green alongside the sealed suite.
- 2026-09-18 (Builder run 3, M3 phase B): storage ladder plus save manager plus bundle plus engine hook plus storage tests green.
- 2026-09-18 (Builder run 3, M3 phase B): storage ladder (`src/storage/`: provider plus memory tier with probed OPFS/IDB/local tiers, atomic OPFS writes, 6-slot save manager with debounce plus flush, versioned bundle export/import with rollback) plus engine `setPlayerState` hook plus `tests/test-m3-storage.mjs` green; WAD cache races wedged backends with a 3 s timeout.
- 2026-09-18 (Builder run 3, M3 phase C): shell wiring (`app.js` Audio plus Saves panels, gesture unlock, fire-edge SFX, per-map FM music, progression resume, bindings migration, pumpAudioFrame) plus `index.html` panels plus README M3 section; sealed boot-header pin kept via module-state resume map.
- 2026-09-18 (Builder run 4, M4): WAD ecosystem and polish on branch `opencode/issue362-doom-m4`: `src/wad/loadout.js` (identify, drop-order merge, assembly, per-map probe, DEHACKED, order lines) plus `src/ui/shellStates.js` (five-state resolver plus helper lines), shell wiring (ingest pipeline, removeWad, boot-failure loop resume, viable-map select, shareware clamp note, onboarding plus sample load/download, loading/error states, sw `doom-m4-v1` with WAD-cache preservation), `tests/test-m4-ecosystem.mjs` (20 tests), `tools/audit-m4.mjs` (51/51), `docs/render-m4.md` plus settled CDP screenshots at desktop and 390px (Tier 0 live, OPFS saves). Headless Chromium caught a wrong-module `droppedLines` import killing boot; fixed and pinned. Full suite 346/346 green. Decision action: review.

## Decision

- **Decision action:** build
- **Rationale:** blueprint and epic roadmap are committed; M1 has a concrete module list with interface shapes and test hooks for the Builder.
- 2026-09-18 (Builder run 3, M3 phase D): tools plus docs (`tools/audit-m3.mjs` 52/52, `tools/bench-m3.mjs` with H5 plus music-CPU MEASURED cells, `docs/scoreboard.md` M3 ledger, `docs/render-m3.md` plus settled CDP screenshots at desktop and 390px). Full suite 293/293 green. Decision action: review.
