# Umbra architecture (M4 pointer)

Full binding blueprint: [`ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md`](../../ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md).

M1 build notes: [`ideas/2026-09-22-umbra-m1-scaffold-render-tiers.md`](../../ideas/2026-09-22-umbra-m1-scaffold-render-tiers.md).

M2 build notes: [`ideas/2026-09-23-umbra-m2-combat-universal-input.md`](../../ideas/2026-09-23-umbra-m2-combat-universal-input.md).

M3 build notes: [`ideas/2026-09-23-umbra-m3-roster-story-arenas.md`](../../ideas/2026-09-23-umbra-m3-roster-story-arenas.md).

M4 build notes: [`ideas/2026-09-23-umbra-m4-bosses-weapons-progression.md`](../../ideas/2026-09-23-umbra-m4-bosses-weapons-progression.md).

M5 build notes: [`ideas/2026-09-23-umbra-m5-polish-product-hardening.md`](../../ideas/2026-09-23-umbra-m5-polish-product-hardening.md).

Epic tracker: [`progress/375-umbra.md`](../../progress/375-umbra.md).

## M1 module map

- `index.html` / `app.js` / `theme.css`: boot, tier probe, screens
  (title + versus-demo + settings), fixed-step ambient loop, ladder, SW registration.
- `src/poses.js`: rig + idle solver + `hashRig` golden hook.
- `src/rng.js`: mulberry32 (sim's only RNG) + hash helpers.
- `src/arenas.js`: 5 arena defs as data (M1 renders arena 0).
- `src/render/scene.js`: shared `SceneDesc` builder + `flattenSegments`.
- `src/render/tiers.js` + `caps.js`: probe, cached choice, override, fallback chain.
- `src/render/webgpu/`: 4 WGSL passes + pipeline.
- `src/render/webgl2/`: GLSL ports + renderer.
- `src/render/canvas2d/painter.js`: fallback painter, identical poses.
- `src/render/resolution.js`: ladder + EWMA + 500 ms hysteresis + battery lock.
- `src/storage/`: provider interface + local provider + profile schema v1.
- `src/perf/`: stats + G1-G7 gate assertions.
- `sw.js` + `manifest.webmanifest`: offline shell + install metadata.
- `src/combat/` (M2): `types.js` (JSDoc contracts), `moves.js` (FISTS
  frame-data + cancel graph + `validateMoves`), `fighter.js` (12-state
  machine + parry window + chip/stamina/guard-break), `hitboxes.js`
  (facing-space capsule tests), `engine.js` (`createFight`/`stepFight`/
  `sanitizeInput`/`hashState`, intro + hitstop + round flow), `combos.js`
  (counter + 0.35-floor scaling + 90-tick window), `ai.js` (seeded FSM:
  neutral/approach/punish/retreat x brawler/turtle/zoner x 3 difficulties).
- `src/input/` (M2): `bindings.js` (v1 table + conflict-swap rebind +
  persist), `keyboard.js` (`codesToInput` pure + edge-queue driver),
  `gamepad.js` (standard-map poll + 0.35 deadzone), `touch.js` (overlay
  state + joystick quantize + 80 ms haptic throttle), `combine.js`
  (OR-merge for one tick).
- `src/poses.js` (M2 adds): `attackDeltas`/`stateDeltas`/`combatAngles`
  (M1 `idleAngles`/`solveRig` untouched, golden hashes hold).
- `src/render/scene.js` (M2 adds): `fight`-driven SceneDesc (sim x/facing/y,
  state poses, `flashShake` from events); ambient tableau unchanged.
- `app.js` (M2): fight lifecycle + per-tick input gather + AI sample +
  HUD/pips/combo/banner + pause/result + haptics + remap capture UI.
- `src/roster.js` (M3): 3 playables + 5 enemies as data (hp, AI, rig,
  accent, ratings, story unlocks) + `validateRoster`.
- `src/story.js` (M3): 17-node Ashen Veil graph + pure progression
  walker + unlock application. `src/dialogue.js` (M3): typewriter model.
- `src/weapons.js` (M4): 6 weapon defs + per-weapon frame-data tables
  (canonical 5 move ids, fists identity) + `movesForWeapon` +
  `validateWeapons`.
- `src/bosses.js` (M4): vex/ruin/dusk defs (summoner/duelist/eclipse) +
  `bossPhaseIndex`. `src/dojo.js` (M4): 6 trials + `checkTrial` +
  `frameRows`.
- `src/economy.js` (M4): ember awards + upgrade tracks/costs/effects +
  shop mutations. `src/storage/bundle.js` (M4): versioned
  export/import. `src/storage/profile.js` (M4): additive economy fields
  (version stays 2).
- `src/combat/` (M4): per-side `movesB`, `power` scales via `dmgScale`,
  boss sim (phases, wisps, stances, enrage) with golden-safe conditional
  hash parts; AI reads the foe's own table.
- `src/render/scene.js` (M4): `weaponTrail` ribbons + per-side
  tables/weapons; all three tiers draw trails (Canvas2D strokes, GPU
  tiers ride spare particle slots).
- `app.js` (M4): shop/dojo/versus-weapon screens, boss banners + stance
  AI override, ember awards + career stats, trial claims, export/import.
- `src/audio/` (M5): `sfx.js` (11 pure descriptor voices) + `music.js`
  (5 arena patterns x calm/fight/boss) + `engine.js` (gesture-unlocked
  WebAudio wrapper, mute via injected callbacks).
- `src/vfx.js` (M5): deterministic bursts + `sparkPoints` + `slowMoFor`.
  `src/input/haptics.js` (M5): per-kind patterns + 90 ms throttle.
  `src/tutorial.js` (M5): 6-step pure lesson machine.
- Renderers (M5): `opts.sparks` points on all 3 tiers (Canvas2D
  additive, GPU spare-particle slots, dimmed under reduced motion).
- `app.js` (M5): per-event SFX/haptics, adaptive music, flash/shake
  overlays (motion-gated), KO slow-mo clock, tutorial gate + 25-ember
  graduation, focus placement + Tab trap, `?bench=N` G1/G2 hook, SW v5.
