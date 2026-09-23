# Progress: Umbra - Shadow Fight-inspired WebGPU combat game at /umbra/

- **Issue:** #375
- **Branch:** opencode/issue375-umbra-m2 (M2 active)
- **Status:** in-progress
- **Updated:** 2026-09-23T04:15:00Z
- **Active Milestone:** M2 deterministic combat engine + universal input (Complete, ready for review; Refs #375)
- **Blueprint:** `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` (binding: WGSL first,
  WebGL2 second, Canvas2D third over one shared SceneDesc; deterministic headless 60 Hz combat
  core; universal keyboard/gamepad/touch input; 3 playable + 5 enemies + 3 phased bosses +
  6 weapons + 5 arenas; zero binary assets; zero-stub rule per milestone)

## Milestone roadmap

- Milestone 1 (M1) scaffold + render tiers + offline shell (PR 1 target, Refs #375):
  - [x] `umbra/index.html` boot + tier probe (WebGPU/WebGL2/Canvas2D) with cached choice + override (+ `?tier=`/`?screen=` hooks)
  - [x] Four-pass WGSL set (background, silhouette, rim-light, particles) + GLSL ports + Canvas2D painter over one shared `SceneDesc`
  - [x] Two idle fighters posing in arena 1 (moonlit temple) via data-driven pose solver
  - [x] Resolution ladder + battery saver + `sw.js` offline pass
  - [x] `umbra/docs/scoreboard.md` skeleton (G1-G7) + desktop + mobile screenshots (headless Chromium evidence in `umbra/docs/shot-*`)
- Milestone 2 (M2) deterministic combat engine + universal input (PR 2, Refs #375):
  - [x] Headless `combat/` core (state machine, fists frame data, hitboxes, block/parry/dodge, hit-stop, combos + scaling, seeded AI tier 1)
  - [x] Keyboard + gamepad + touch overlay with responsive contract + remapping UI + persisted bindings
  - [x] Playable versus bout (player vs AI) with KO/rounds/timer + determinism hash + input-script replay test
- Milestone 3 (M3) characters + story + levels (PR 3 target, Refs #375):
  - [ ] Full roster data (3 playable + 5 enemy archetypes, distinct rigs/stats)
  - [ ] Story act graph + dialogue/cutscene box + progression walker + 5 arenas (WGSL backgrounds + parallax + music themes)
  - [ ] Story mode flow (select > intro > fights > outro) + unlock triggers wired to profile
- Milestone 4 (M4) bosses + weapons + progression (PR 4 target, Refs #375):
  - [ ] 3 phased bosses with unique mechanics (summoner adds, duelist stance-switch, eclipse enrage timer)
  - [ ] 6 weapons (fists, sword, nunchaku, spear, staff, daggers) with frame-data + pose tracks + trails
  - [ ] Dojo training mode (dummy + frame-data display + combo trials) + shop/loot economy + upgrades + persistence v1 + export/import
- Final Milestone (M5) polish + product hardening (final PR, Closes #375 ONLY when all gates green):
  - [ ] VFX pass (hit sparks, dust, KO slow-mo) + SFX/adaptive-music mix + haptics tuning + onboarding tutorial bout
  - [ ] Accessibility audit + soak/fuzz ledger + G1-G7 scoreboard MEASURED + landing card + README/docs sync
  - [ ] Reviewer `/oc approve`, Tester `/oc approve-test`, Quality Council `/oc approve-eval` >= 9.8/10, Pages deploy green at `/umbra/`

## Current step

M2 build complete (Builder run 2, orchestrated): combat core + input via two
parallel subagents, app integration + fight shell + screenshots by the
Builder. 133/133 node:test green, desktop + mobile headless-Chromium
fight evidence in `umbra/docs/shot-m2-*`. Ready for review.

## Next steps

- Reviewer `/oc review` -> Tester `/oc test` -> Evaluator per milestone;
  intermediates use `Refs #375`, only the final verified M5 uses `Closes #375`
- M3 (next): characters + story + levels on a new milestone branch
  (`opencode/issue375-umbra-m3` from main after this PR merges)
- Landing card + root README sync deferred to M5 per blueprint (README
  "Live Projects" section is shipped-on-main only)

## Agent log

- 2026-09-23 (Fixer, M2 review findings): applied all 21 reviewer findings on
  `opencode/issue375-umbra-m2` across 4 modular commits (combat sim, input,
  shell, tests). Sim: combo advances on clean hits only (parry/block make
  contact without combo/whiff), double-buffered same-tick trades via
  pre-tick snapshots + defender merge, wantBlock guard-break, airborne KO,
  sim-level rising-edge gate + same-tick crouch sweep, anti-air height gate
  (uppercut exception), hashState pins didHit/phaseTick/frozenTicks/moves
  digest, bout-owned frozen move tables, per-side maxHp, side+move jitter.
  Engine rng deleted (AI keeps its own think stream). AI bands derive from
  the move table; combos share advanceCombo. Input: gamepad edge poller +
  all-index hot-plug, rebind uniqueness + validator, touch dash + reset,
  keyboard clear. Shell: pause from bindings, remap stopImmediatePropagation,
  edge drain on pause/over/screen-exit, HUD guards + freshest combo, aria
  fixes, touch dash button + CSS. Mirror test now tolerates side-separated
  jitter (damage-exact compare dropped, hp/x bounded); full suite 155/155
  green with replay/soak determinism intact. Decision action: review.
- 2026-09-23 (Builder run 2, M2): combat core subagent shipped
  `src/combat/` (types/moves/fighter/hitboxes/engine/combos/ai) + 32 tests
  (golden seed-375 bout `92028ae1`, 10k-tick soak); input subagent shipped
  `src/input/` (bindings/keyboard/gamepad/touch) + 26 tests. Builder added
  `combine.js` OR-merge, combat pose tracks (`attackDeltas`/`stateDeltas`/
  `combatAngles`, M1 goldens untouched), fight-driven SceneDesc +
  `flashShake`, full fight shell (HUD/pips/combo/banner/pause/result/remap/
  haptics/touch dock below canvas), SW umbra-v2, red-team test updated to
  the M2 screen contract, `test-fight-scene.mjs` (poses/flash/replay).
  133/133 green. Headless-Chromium desktop (WebGL2) + mobile portrait
  (Canvas2D + touch) verified; ideas M2 entry + scoreboard M2 rows written.
  Decision action: review.
- 2026-09-22 (M1 merged as PR #376): scaffold + render tiers + offline
  shell on main; M2 branched fresh as `opencode/issue375-umbra-m2`.

- 2026-09-22 (Fixer eval-hardening): NaN/Infinity tick clamp + clamped arena
  stored in SceneDesc (scene.js), G1 rejects negative p95 (gates.js),
  Canvas2D thin-edge rim + moon-halo/mote parity with GPU tiers (painter.js),
  390px pill/HUD/topbar hardening (theme.css), suite count refreshed to 63/63.

- 2026-09-22 (Architect run 1): wrote the binding blueprint to
  `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` (summary, deliverables, why, how it works
  with boot/frame/tick/render/pose/audio/input/persistence contracts, module breakdown with binding
  interface shapes, M1-M5 epic, test matrix with G1-G7 gates, residual risks) and this epic tracker.
  Key resolutions: plain ES-module JS with JSDoc types (zero-build Pages reliability, honoring the
  TypeScript-typed contract without a build step); one shared SceneDesc feeding all three render
  tiers; mulberry32 as the sim's only RNG; roster/weapons frozen at 3/5/6 for this epic.
- 2026-09-22 (Builder run 1a): pure modules (`src/rng.js`, `src/poses.js`,
  `src/arenas.js`, `src/render/scene.js`, `src/render/resolution.js`,
  `src/render/tiers.js`, `src/render/caps.js`, `src/storage/`, `src/perf/`)
- 2026-09-22 (Builder run 1b): app shell (`index.html`, `theme.css`,
  `app.js` with probe/cache/override + fixed-step loop + ladder + settings,
  `sw.js`, manifest, procedural icons, docs, README), `?tier=`/`?screen=`
  force hooks, 6 test files (36/36 green incl. golden hashes
  `5046b8f7`/`4cdd52dc`), headless-Chromium shots (WebGL2 desktop,
  Canvas2D desktop after rim-crescent + mote fixes, mobile portrait),
  `ideas/2026-09-22-umbra-m1-scaffold-render-tiers.md` writeup. M1
  checklist complete; landing + root README deferred to M5 per blueprint.
  Decision action: review.

## Decision

- **Decision action:** build
- **Rationale:** blueprint and epic roadmap are committed; M1 has a concrete module list with
  interface shapes and test hooks for the Builder.

- the Architect
