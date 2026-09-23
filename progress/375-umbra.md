# Progress: Umbra - Shadow Fight-inspired WebGPU combat game at /umbra/

- **Issue:** #375
- **Branch:** opencode/issue375-umbra-m5 (M5 active, final)
- **Status:** in-progress
- **Updated:** 2026-09-23T16:00:00Z
- **Active Milestone:** M5 polish + product hardening (Complete, ready for review; Refs #375 - eval >= 9.8 and Pages deploy land via the review pipeline)
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
  - [x] Full roster data (3 playable + 5 enemy archetypes, distinct rigs/stats)
  - [x] Story act graph + dialogue/cutscene box + progression walker + 5 arenas (WGSL backgrounds + parallax + music themes)
  - [x] Story mode flow (select > intro > fights > outro) + unlock triggers wired to profile
- Milestone 4 (M4) bosses + weapons + progression (PR 4 target, Refs #375):
  - [x] 3 phased bosses with unique mechanics (vex summoner adds, ruin duelist stance-switch, dusk eclipse enrage timer; story + versus)
  - [x] 6 weapons (fists/sword/nunchaku/spear/staff/daggers) with frame-data tables + per-side bout tables + power scales + trail ribbons on all 3 tiers
  - [x] Dojo training mode (200-hp dummy + live frame-data table + 6 combo trials with rewards) + shop/loot economy (awards/jackpot/weapons/upgrades) + export/import bundles + additive profile fields (version stays 2)
  - [x] Shell UI: weapon picker, shop/dojo screens, boss banners, awards, export/import + sw v4 + ember pill
  - [x] Scoreboard M4 rows + ideas entry + README/architecture sync + 4 headless-Chromium screenshots (zero pageerrors)
- Final Milestone (M5) polish + product hardening (final PR, Closes #375 ONLY when all gates green):
  - [ ] VFX pass (hit sparks, dust, KO slow-mo) + SFX/adaptive-music mix + haptics tuning + onboarding tutorial bout
  - [ ] Accessibility audit + soak/fuzz ledger + G1-G7 scoreboard MEASURED + landing card + README/docs sync
  - [ ] Reviewer `/oc approve`, Tester `/oc approve-test`, Quality Council `/oc approve-eval` >= 9.8/10, Pages deploy green at `/umbra/`

## Current step

M5 integration complete (Builder run 5b): three parallel tracks landed as
new pure modules (audio 27 tests, vfx+haptics 28, tutorial 33) and the
shell wires them all: per-event SFX + adaptive arena music + mute setting,
hit sparks on all 3 tiers (Canvas2D strokes, GPU spare-particle slots),
flash overlay + shake (both gated off under reduced motion), KO slow-mo in
the fixed-step clock, tutorial dojo-gate screen + bout + 25-ember
graduation, focus placement + modal Tab trap + single live region + OS
motion default + haptics-under-reduced-motion skip, SW umbra-v5.
455/455 node:test green (355 baseline + 88 track + 12 integration).

M5 browser pass (Builder run 5c): `?bench=N` hook + CDP wall-clock
reads - Canvas2D render p95 0.5 ms at 960x540, WebGL2 submit p95
0.6 ms (SwiftShader presentation stalls excluded with reason, ladder
governor proven 960x540 to 426x240), 52-file 399 KB shell for G2 bands,
SW v5 offline reload verified with the server killed. Screenshot review
caught hidden phone fighter names (`.fname{display:none}`) - restored as
ellipsized names, re-shot. Landing card + root README + umbra README +
scoreboard MEASURED + ideas M5 entry + architecture sync done.
M4 shipped (runs 4/4b/4a + Fixer/Tester hardening, merged to main):

shell UI (shop/dojo/versus weapons, boss banners + stance AI, awards,
export/import), sw v4, ember pill, trail-width bug found by screenshots
and fixed (arena units + validator
cap + scene clamp), scoreboard M4 rows, ideas entry, README/architecture
sync, 4 headless-Chromium screenshots with zero pageerrors. 337/337
node:test green across 81 suites (M2 golden e9ef3be3 intact). Fixer
hardening for the Evaluator gate (canonical shop cost, owned/frozen
weapon tables with copy-out reads, award/currency caps, boss phase and
param guards, wisp cap, finite frame rows, HUD/footer/frames craft).
Ready for re-review.

## Next steps

- Reviewer `/oc review` -> Tester `/oc test` -> Evaluator per milestone;
  intermediates use `Refs #375`, only the final verified M5 uses `Closes #375`
- M5 (next): polish + product hardening on a new milestone branch
  (`opencode/issue375-umbra-m5` from main after this PR merges)
- Landing card + root README sync deferred to M5 per blueprint (README
  "Live Projects" section is shipped-on-main only)

## Agent log

- 2026-09-23 (Builder run 4b, M4 shell): shop/dojo/versus-weapon UI +
  boss banners + stance AI + awards + export/import, sw v4, ember pill,
  frame-table CSS, meta nowrap fix. Headless-Chromium evidence (shop,
  dojo, spear-trail harness, mobile portrait, WebGL2; zero pageerrors).
  Screenshot review caught a screen-filling trail blob (subagent widths
  were pixel units): fixed to arena units + validator cap 0.1 + scene
  clamp. Scoreboard M4 rows, ideas entry, README/architecture sync.
  300/300 green. Decision action: review.
- 2026-09-23 (Builder run 4a, M4 engine): weapons + economy/bundle via 2
  parallel subagents (17 + 29 tests), bosses + dojo + engine integration
  direct (22 tests): per-side movesB, power/dmgScale, boss sim with
  phases/wisps/stances/enrage, conditional hash parts (M2 golden
  intact). 295/295 green. Decision action: continue (shell UI next).
- 2026-09-23 (Builder run 3, M3): roster + story + dialogue + profile v2
  as pure modules with 26 new tests; rig multipliers on the pose solver
  (identity bit-exact, goldens pinned); scene rigs passthrough
  (presentation-only); select/story-map/dialogue/versus screens with
  unlock gating wired to profile v2; named bouts with per-side hp and
  enemy AI temperaments; story win banks progress via Continue, loss
  earns nothing; SW umbra-v3; scoreboard M3 rows; 6 headless-Chromium
  screenshots (zero pageerrors); ideas M3 entry. 199/199 green.
  Decision action: review.
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
