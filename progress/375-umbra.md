# Progress: Umbra - Shadow Fight-inspired WebGPU combat game at /umbra/

- **Issue:** #375
- **Branch:** opencode/issue375-20260922160615 (M1 active)
- **Status:** in-progress
- **Updated:** 2026-09-22T16:10:00Z
- **Active Milestone:** M1 scaffold + render tiers + offline shell (PR 1 target, Refs #375)
- **Blueprint:** `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` (binding: WGSL first,
  WebGL2 second, Canvas2D third over one shared SceneDesc; deterministic headless 60 Hz combat
  core; universal keyboard/gamepad/touch input; 3 playable + 5 enemies + 3 phased bosses +
  6 weapons + 5 arenas; zero binary assets; zero-stub rule per milestone)

## Milestone roadmap

- Milestone 1 (M1) scaffold + render tiers + offline shell (PR 1 target, Refs #375):
  - [ ] `umbra/index.html` boot + tier probe (WebGPU/WebGL2/Canvas2D) with cached choice + override
  - [ ] Four-pass WGSL set (background, silhouette, rim-light, particles) + GLSL ports + Canvas2D painter over one shared `SceneDesc`
  - [ ] Two idle fighters posing in arena 1 (moonlit temple) via data-driven pose solver
  - [ ] Resolution ladder + battery saver + `sw.js` offline pass
  - [ ] `umbra/docs/scoreboard.md` skeleton (G1-G7) + desktop + mobile Playwright screenshots
- Milestone 2 (M2) deterministic combat engine + universal input (PR 2 target, Refs #375):
  - [ ] Headless `combat/` core (state machine, fists frame data, hitboxes, block/parry/dodge, hit-stop, combos + scaling, seeded AI tier 1)
  - [ ] Keyboard + gamepad + touch overlay with responsive contract + remapping UI + persisted bindings
  - [ ] Playable versus bout (player vs AI) with KO/rounds/timer + determinism hash + input-script replay test
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

Ready for initial build (Milestone 1)

## Next steps

- Builder to implement Milestone 1 with real code and zero stubs (menu shows only title + versus-demo + settings; later-milestone features omitted from UI entirely)
- Then review -> test -> eval per milestone; intermediates use `Refs #375`, only the final verified M5 uses `Closes #375`

## Agent log

- 2026-09-22 (Architect run 1): wrote the binding blueprint to
  `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` (summary, deliverables, why, how it works
  with boot/frame/tick/render/pose/audio/input/persistence contracts, module breakdown with binding
  interface shapes, M1-M5 epic, test matrix with G1-G7 gates, residual risks) and this epic tracker.
  Key resolutions: plain ES-module JS with JSDoc types (zero-build Pages reliability, honoring the
  TypeScript-typed contract without a build step); one shared SceneDesc feeding all three render
  tiers; mulberry32 as the sim's only RNG; roster/weapons frozen at 3/5/6 for this epic.
  Decision action: build.

## Decision

- **Decision action:** build
- **Rationale:** blueprint and epic roadmap are committed; M1 has a concrete module list with
  interface shapes and test hooks for the Builder.

- the Architect
