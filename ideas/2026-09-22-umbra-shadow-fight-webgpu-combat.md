# Umbra: Shadow Fight-inspired WebGPU combat game at `/umbra/` (architectural blueprint)

Date: 2026-09-22. Issue: #375. Owner request 2026-09-22T15:43:10Z on #70 (via Maintainer dispatch 2026-09-22T16:05:47Z).
No prior research spec exists; this blueprint is self-contained and binding for the Builder.

## Summary

Umbra is a static-only browser fighting game hosted at `/umbra/index.html` (GitHub Pages, zero server
runtime, zero runtime CDN, same-origin assets only, offline-capable after first load via a scoped service
worker). The aesthetic is Shadow Fight silhouette: fighters render as dark animated rigs with glowing
rim-light edges and weapon highlights, over shader-driven parallax arenas (moonlit temple, ember forge,
storm bridge, void sanctum, eclipse rooftop). Rendering probes `navigator.gpu` first (WGSL silhouette +
rim-light + particle + background shaders), falls back to WebGL2 (GLSL ports of the same passes), then to
a Canvas2D last-resort tier, with a 60 FPS tier ladder and manual override. All combat simulation lives in
a deterministic headless core (fixed 60 Hz timestep, seeded RNG, no DOM) so unit tests, fuzzing, and AI
bouts run in plain `node:test`. Input is universal: desktop keyboard (WASD/arrows + JKL + Space dash +
gamepad API polling) and mobile touch (dynamic-origin joystick + punch/kick/block/special buttons +
`navigator.vibrate` haptics + responsive portrait/landscape layouts). Content ships as a complete game:
original lore with dialogue/cutscene scaffolding, 3 playable characters, 5+ enemy archetypes, 5 arenas,
3 phased bosses, 6 weapons with distinct movesets, dojo training, shop/loot economy, and OPFS/IndexedDB/
localStorage persistence. Audio is 100 percent synthesized WebAudio (SFX + adaptive music), so the game
has zero binary asset weight.

## Deliverables (what the Builder ships across milestones)

- `umbra/` static app: `index.html` entry (canvas `#umbra-canvas`, overlay roots `#touch-ui`, `#hud`,
  `#menu`, `#dialogue`), `manifest.webmanifest`, `sw.js` service worker (scope `/umbra/`, versioned
  cache, offline-first shell), `app.js` boot plus tier probe, `src/` modules below, `assets/` (icons,
  lore text as JSON, no binary art).
- `umbra/docs/` retained: `architecture.md` (slim pointer to this blueprint) and `scoreboard.md`
  (G1-G7 binding-gate ledger per milestone: FPS tiers, TTFF bands, input latency, determinism hash,
  persistence round-trip, audit counts).
- Every milestone feature backed by a working engine (anti-facade rule: no coming-soon buttons, no
  disabled controls, no mock dialogs; unimplemented capabilities are omitted from UI entirely until
  their milestone).
- Headless visual loop: `umbra/` served locally, Playwright screenshots at desktop (1280x800) and
  mobile (390x844 portrait plus landscape) per milestone, iterated before marking complete.
- Root `index.html` landing card linking to `/umbra/` plus root `README.md` Umbra entry, without
  removing the Random landing page or breaking `pages.yml` PR previews (relative paths only).
- Sequential milestone PRs each with `Refs #375`; the final hardening PR uses `Closes #375` ONLY after
  all 7 binding gates are green (Reviewer APPROVE, Tester approve-test, Evaluator approve-eval >= 9.8/10,
  Pages deploy green at `/umbra/`).

## Why

A Canvas2D-only brawler cannot deliver the "stunning WebGPU graphics" the Owner asked for, and a
WebGPU-only build would be unplayable on most mobile browsers and CI hardware today. The chosen path
(WebGPU WGSL first, WebGL2 GLSL second, Canvas2D third, one shared scene description feeding all three)
gives shader spectacle where available and guaranteed playability everywhere. The fatal risk in fighting
games is not rendering but feel: dropped inputs, non-deterministic combat, and facade UI. This blueprint
pins exactly one correct behavior per case (fixed-timestep sim decoupled from rAF, input consumed once
per tick, hit-stop as sim-time freeze, deterministic seeded AI) so the Builder never guesses, and the
Tester can replay any bout byte-for-byte.

## How It Works

1. Boot: `app.js` probes capabilities (WebGPU via `navigator.gpu.requestAdapter`, WebGL2 context,
   Wasm not required), resolves a render tier (cached with manual override in settings), registers
   `sw.js`, loads lore/character/weapon data JSON plus persisted profile, and enters the title state.
   Cold TTFF reported banded (broadband 0.8-2.0s, solid 4G 2.5-5s, warm < 0.8s), never as a point value.
2. Frame: rAF driver plus 60 Hz fixed-step accumulator (`step = 16.667ms`, `acc += min(dt,100ms)`,
   cap 3 ticks, render every frame with `alpha` pose interpolation; simulation state never
   interpolates). Input listeners set flags plus per-tick edge queues; each tick consumes them once
   into a `CombatInput` struct. Hit-stop freezes sim ticks (not rendering) for 60-120ms on heavy hits;
   screen shake and hit-flash are presentation-only overlays driven by sim events.
3. Combat tick (headless, see module breakdown): advance timers, sample AI, integrate movement,
   evaluate attack frame data (startup/active/recovery), test hitbox-vs-hurtbox overlap in facing
   space, resolve block/parry/dodge windows, apply damage/knockback/stun with seeded jitter, emit an
   event list (`hit`, `blocked`, `parried`, `ko`, `round`) consumed by renderer/audio/UI. Determinism
   contract: same seed plus same input script yields identical event stream and final hash.
4. Rendering: one shared `SceneDesc` per frame (fighter joint angles from the pose solver, weapon
   polyline, arena layer offsets, particle buffer, hit-flash uniform). Tier 0 WebGPU executes four
   WGSL passes (background gradient + parallax + moon/glow, silhouette capsule fill from joint
   segments, rim-light edge pass, additive particle points). Tier 1 WebGL2 runs GLSL ports of the same
   four passes. Tier 2 Canvas2D draws capsules/arcs/gradients with identical poses. Resolution ladder
   (1280x720, 960x540, 640x360, 426x240 emergency) switches at most every 500ms on EWMA frame time;
   battery-saver lock available in settings.
5. Fighters: 2D skeletal rigs (pelvis, torso, head, upper/lower arms x2, upper/lower legs x2 = 11
   segments) posed by animation keyframes blended per state (idle bob, walk cycle, per-move attack
   poses with easing, hit recoil, knockdown). Poses are data (JSON keyframes), not code, so new
   characters and weapons reuse the solver. Bodies fill near-black (`#05060a`); rim light samples the
   segment-normal direction toward the arena key light; weapons draw as bright gradient strokes with
   motion trails (last N tip positions as fading ribbon).
6. Audio: pure WebAudio synthesis, no assets. SFX engine (punch thump = filtered noise burst + sine
   drop, sword ring = metallic FM partials, block clack, parry chime, crowd-less arena ambience per
   level). Music engine: per-arena generative loop (minor-scale bass pulse + taiko pattern + sparse
   koto-like plucks via Karplus-Strong) with intensity layers crossfaded by fight state
   (intro < neutral < player-losing < boss-phase-2). Mixer buses (master/SFX/music) with persisted
   gains; context created/resumed only inside a user gesture with an autoplay-probe overlay.
7. Input: desktop uses `e.code` (KeyW/A/S/D plus arrows for move/crouch/jump, J punch, K kick,
   L block, U/I/O or J+K chords for weapon special, Space dash, Esc pause) with a remapping table.
   Gamepad polled per tick (axes move, buttons mapped, standard mapping assumed, hot-plug tolerated).
   Touch is a DOM overlay (Pointer Events, per-`pointerId`, 56px targets, dynamic-origin left
   joystick, right PUNCH/KICK/BLOCK/SPECIAL buttons, swipe-up jump, coarse-pointer only, portrait
   bottom-dock vs landscape translucent overlay, safe-area insets, throttled haptics on hit/hit-taken).
   Full keyboard-only and screen-reader paths (focus trap, `aria-live` status, reduced-motion disables
   shake/flash/parallax).
8. Persistence: all state flows through a `StorageProvider` (OPFS primary with tmp-write plus atomic
   rename and debounced 500ms writes flushed on `visibilitychange`/`pagehide`; IndexedDB `umbra-store`
   secondary; localStorage config-only last resort). Profile holds story progress, unlocked characters/
   weapons, currency, settings, bindings. Export builds a versioned JSON bundle as a Blob download;
   import validates format plus version and applies atomically or rejects whole.

## Module Breakdown (domain decoupled from presentation)

Domain (headless, no DOM; unit-testable in Node):

- `umbra/src/combat/`: `types.js` (JSDoc typedefs: `Fighter`, `CombatInput`, `MoveDef`, `FightEvent`),
  `moves.js` (per-weapon frame-data tables: startup/active/recovery, range, damage, knockback, stun,
  cancel windows), `fighter.js` (state machine: idle/walk/crouch/jump/attack/block/parry/hit/stun/
  knockdown/down/ko plus stamina/block-chip rules), `hitboxes.js` (capsule-vs-capsule in facing space),
  `engine.js` (`stepFight(state, p1Input, p2Input)` pure tick plus `createFight` plus `hashState`),
  `combos.js` (cancel graph + hit-counter + damage scaling), `ai.js` (seeded FSM: neutral/approach/
  punish/retreat/zone plus per-archetype aggression + difficulty tiers + boss phase hooks), `rng.js`
  (mulberry32 seeded stream; the ONLY randomness source in the sim).
- `umbra/src/roster.js`: character/enemy/weapon defs as DATA (stats, move lists, palette accents,
  unlock rules). `umbra/src/story.js`: act/scene graph plus dialogue lines plus unlock triggers
  (pure, headless-testable progression walker).
- `umbra/src/poses.js`: rig definition plus keyframe blending plus per-move pose tracks (pure math,
  headless golden-tested against fixture hashes).
- `umbra/src/economy.js`: currency awards, shop prices, loot tables (seeded), upgrade curves (pure).
- `umbra/src/storage/`: `provider.js` (interface), `storage-opfs.js`, `storage-idb.js`,
  `storage-local.js`, `profile.js` (schema v1 + migrations), `bundle.js` (export/import).
  Paths: `umbra/profile.json`, `umbra/config.json`, `umbra/bindings.json`.
- `umbra/src/audio/`: `sfx.js` (synth voices, no assets), `music.js` (generative sequencer),
  `mixer.js` (buses + persisted gains), `unlock.js` (gesture gate state machine).
- `umbra/src/perf/`: `stats.js` (mean/median/p95, bootstrap CI), `gates.js` (G1-G7 assertions).

Platform (browser services, no tool UI):

- `umbra/src/render/`: `scene.js` (sim state to `SceneDesc`), `tiers.js` + `caps.js` (probe + cached
  choice + override), `webgpu/` (`silhouette.wgsl`, `rimlight.wgsl`, `background.wgsl`,
  `particles.wgsl`, pipeline setup), `webgl2/` (GLSL ports + quad scaffolding), `canvas2d/` (fallback
  painter with identical poses), `resolution.js` (ladder + hysteresis + battery saver).
- `umbra/src/input/`: `keyboard.js`, `gamepad.js` (per-tick poll), `touch.js` (overlay state),
  `bindings.js` (versioned `umbra-bindings` v1 + conflict swap), `remap-ui.js` data hooks.
- `umbra/sw.js`, `umbra/manifest.webmanifest`, `umbra/boot/` (profile load, tier pin).

Presentation (shell plus overlay; lazy-loads nothing heavy since there are no assets):

- `umbra/index.html`, `umbra/app.js`, `umbra/ui/`: `screens.js` (title, select, story, fight, dojo,
  shop, settings, gameover/victory), `hud.js` (health/stamina/special bars, timer, combo counter,
  round pips), `dialogue.js` (typewriter cutscene box + skip), `touch-overlay` (clusters per
  responsive contract), `theme.css` (design tokens, 4.5:1 text contrast, solid backdrops, visible
  focus rings).

Public interface sketch (binding shapes; Builder expands):

```js
// CombatInput: one tick of intent per fighter. Buttons are edges consumed once.
interface CombatInput { move: -1|0|1; crouch: boolean; jump: boolean;
  punch: boolean; kick: boolean; block: boolean; special: boolean; dash: -1|0|1; }
// MoveDef: frame data. All times in ticks at 60 Hz.
interface MoveDef { id: string; startup: number; active: number; recovery: number;
  range: number; damage: number; chip: number; knockback: number; stun: number;
  cancelInto: string[]; pose: string; sfx: string; }
// FightEvent: presentation consumes these; sim never touches DOM/audio.
interface FightEvent { t: "hit"|"blocked"|"parried"|"whiff"|"ko"|"round"|"phase";
  tick: number; side: 0|1; move: string|null; damage: number; }
// StorageProvider: OPFS primary, IDB secondary, localStorage config-only.
interface StorageProvider { readJSON(p: string): Promise<unknown>;
  writeJSON(p: string, o: unknown): Promise<void>; remove(p: string): Promise<void>; }
// SceneDesc: single shared frame description feeding all three render tiers.
interface SceneDesc { tick: number; fighters: RigPose[2]; weapons: Trail[2];
  arena: number; layers: number[]; particles: Particle[]; flash: number; shake: number; }
```

## Milestone epic (binding; sequential PRs, each `Refs #375` except the final `Closes #375`)

- M1 scaffold + render tiers + offline shell (PR 1, `Refs #375`): `umbra/index.html` boot, tier
  probe (WebGPU/WebGL2/Canvas2D) with cached choice + override, four-pass WGSL set + GLSL ports +
  Canvas2D painter over one `SceneDesc`, two idle fighters posing in arena 1 (moonlit temple),
  resolution ladder + battery saver, `sw.js` offline pass, `scoreboard.md` skeleton, desktop +
  mobile Playwright screenshots. Zero-stub rule: menu shows only title + versus-demo + settings.
- M2 deterministic combat engine + universal input (PR 2, `Refs #375`): headless `combat/` core
  (state machine, frame data for fists, hitboxes, block/parry/dodge, hit-stop, combos + scaling,
  seeded AI tier 1), keyboard + gamepad + touch overlay with responsive contract, remapping UI +
  persisted bindings, first playable versus bout (player vs AI) with KO/rounds/timer, determinism
  hash + input-script replay test, desktop + mobile screenshots of live fight.
- M3 characters + story + levels (PR 3, `Refs #375`): full roster data (3 playable + 5 enemy
  archetypes with distinct rigs/stats), story act graph + dialogue/cutscene box + progression walker,
  5 arenas with distinct WGSL backgrounds + parallax + music themes, story mode flow (select > intro
  > fights > outro), unlock triggers wired to profile.
- M4 bosses + weapons + progression (PR 4, `Refs #375`): 3 phased bosses with unique mechanics
  (summoner adds, duelist stance-switch, eclipse enrage timer), 6 weapons (fists, sword, nunchaku,
  spear, staff, daggers) with per-weapon frame-data + pose tracks + trails, dojo training mode
  (dummy + frame-data display + combo trials), shop/loot economy + upgrades + persistence v1 +
  export/import.
- M5 polish + product hardening (final PR, `Closes #375` ONLY when all gates green): VFX pass (hit
  sparks, dust, KO slow-mo), SFX + adaptive music mix pass, haptics tuning, onboarding + tutorial
  bout, accessibility audit (contrast, focus, reduced-motion, screen-reader), soak + fuzz ledger,
  G1-G7 scoreboard MEASURED, landing card + README/docs sync, Reviewer APPROVE + Tester approve-test
  + Evaluator approve-eval >= 9.8/10 + Pages deploy green at `/umbra/`.

## Test Matrix (binding for the Tester; Builder runs first)

- Combat unit (`node:test`, no browser): golden bout replay (fixed seed + scripted inputs yields
  byte-identical event stream + `hashState`); frame-data table invariants (startup/active/recovery
  positive, cancel targets exist); hitbox symmetry fuzz (mirror bout equality, 10k random-tick soak
  with seeded RNG, no NaN/undefined states); block/parry window edge tests; combo scaling monotonicity.
- Pose/economy/story unit: pose solver golden hashes per move; shop/loot seeded determinism; story
  walker reaches every boss node and no dead-end scene.
- Render/headless: `forceTier` scene render per tier (no-throw + pixel-diff sanity vs Canvas2D
  reference); tier-probe matrix (WebGPU absent means WebGL2/Canvas2D path, never crash);
  accumulator determinism (`stepManual` N ticks exact); resolution hysteresis (no oscillation within
  500ms); battery-saver lock.
- Audio unit: synth voice state model without audible output (envelope/gain shapes finite);
  unlock state machine (suspended before gesture, running after); mixer gain map.
- Persistence: golden profile round-trip; reload persistence; export-to-fresh-import equality; fault
  injection (`getDirectory` throw means IDB path; quota error means toast without crash).
- E2E Playwright (`data-testid`: `canvas`, `btn-punch`, `btn-kick`, `btn-block`, `btn-special`,
  `joystick`, `hud-health-*`, `dialogue-box`, `pause-overlay`, `shop-buy-*`): desktop 1280x800
  (boot, versus KO flow, remap flow, story first scene, shop buy with fresh profile), mobile 390x844
  portrait (touch bout completable, controls never cover fighter center) plus landscape. TTFF banded
  assertions cold vs warm; p95 frame below 16.667ms at 960x540 on Tier 1, N>=30.
- Baselines/gates G1-G7: G1 60 FPS tier ladder (p95 per tier documented); G2 TTFF bands; G3 input
  latency (key/touch edge to sim consumption <= 2 ticks); G4 determinism (replay hash equality);
  G5 persistence round-trip; G6 a11y audit (contrast >= 4.5:1, keyboard-only bout completable);
  G7 Pages deploy green + offline reload with network disabled.

## Risks (residual; owned by milestone)

- WebGPU availability in CI/headless: owned by M1 probe matrix; Tier 1/2 must be fully playable so
  a missing adapter never blocks testing or play.
- WGSL/GLSL visual parity drift: owned per milestone by the Canvas2D reference screenshots; poses
  are shared data so drift is confined to shading.
- Touch feel on small screens: owned by M2 responsive contract + M5 haptics tuning; portrait
  bottom-dock geometry is asserted in E2E, not eyeballed.
- Scope creep (more fighters/weapons): frozen at 3/5/6 for this epic; additions need a new issue.
- No binary assets policy: all art procedural, all audio synthesized; any committed binary outside
  icons/manifest art is rejected in review.

- the Architect
