# Umbra architecture

Full binding blueprint: [`ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md`](../../ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md).

## Module map

- `index.html` / `app.js` / `theme.css`: boot, tier probe, screens (title,
  story select, fight, versus, shop, dojo, settings, result), fixed-step
  ambient loop, ladder, SW registration, fight lifecycle + per-tick input
  gather + AI sample, HUD/pips/combo/banner, pause/result, remap capture,
  shop/dojo/versus-weapon screens, boss banners + stance AI override, ember
  awards + career stats, trial claims, export/import, per-event SFX/haptics,
  adaptive music, flash/shake overlays (motion-gated), KO slow-mo clock,
  tutorial gate + 25-ember graduation, focus placement + Tab trap,
  `?bench=N` G1/G2 hook, SW v5 registration.
- `src/poses.js`: rig + idle solver + `hashRig` golden hook; attack/state
  deltas and combat angles (idle solver pinned by golden hashes).
- `src/rng.js`: mulberry32 (the sim's only RNG) + hash helpers.
- `src/arenas.js`: 5 arena defs as data (arena 0 is the ambient tableau).
- `src/roster.js`: 3 playables + 5 enemies as data (hp, AI, rig, accent,
  ratings, story unlocks) + `validateRoster`.
- `src/story.js`: 17-node Ashen Veil graph + pure progression walker +
  unlock application. `src/dialogue.js`: typewriter model.
- `src/weapons.js`: 6 weapon defs + per-weapon frame-data tables (canonical
  5 move ids, fists identity) + `movesForWeapon` + `validateWeapons`.
- `src/bosses.js`: vex/ruin/dusk defs (summoner/duelist/eclipse) +
  `bossPhaseIndex`. `src/dojo.js`: 6 trials + `checkTrial` + `frameRows`.
- `src/economy.js`: ember awards + upgrade tracks/costs/effects + shop
  mutations.
- `src/combat/`: `types.js` (JSDoc contracts), `moves.js` (FISTS frame-data
  + cancel graph + `validateMoves`), `fighter.js` (12-state machine + parry
  window + chip/stamina/guard-break), `hitboxes.js` (facing-space capsule
  tests), `engine.js` (`createFight`/`stepFight`/`sanitizeInput`/`hashState`,
  intro + hitstop + round flow), `combos.js` (counter + 0.35-floor scaling +
  90-tick window), `ai.js` (seeded FSM: neutral/approach/punish/retreat x
  brawler/turtle/zoner x 3 difficulties), per-side `movesB` + `power` scales
  via `dmgScale`, and the boss sim (phases, wisps, stances, enrage) with
  golden-safe conditional hash parts; AI reads the foe's own table.
- `src/input/`: `bindings.js` (v1 table + conflict-swap rebind + persist),
  `keyboard.js` (`codesToInput` pure + edge-queue driver), `gamepad.js`
  (standard-map poll + 0.35 deadzone), `touch.js` (overlay state + joystick
  quantize + 80 ms haptic throttle), `combine.js` (OR-merge for one tick),
  `haptics.js` (per-kind patterns + 90 ms throttle).
- `src/render/scene.js`: shared `SceneDesc` builder + `flattenSegments`,
  `fight`-driven scene descriptions (sim x/facing/y, state poses,
  `flashShake` events), `weaponTrail` ribbons + per-side tables/weapons.
- `src/render/tiers.js` + `caps.js`: probe, cached choice, override,
  fallback chain. `src/render/webgpu/`: 4 WGSL passes + pipeline.
  `src/render/webgl2/`: GLSL ports + renderer.
  `src/render/canvas2d/painter.js`: fallback painter, identical poses.
  `src/render/resolution.js`: ladder + EWMA + 500 ms hysteresis + battery
  lock. Particle passes: `opts.sparks` points on all 3 tiers (Canvas2D
  additive, GPU spare-particle slots, dimmed under reduced motion).
- `src/audio/`: `sfx.js` (11 pure descriptor voices) + `music.js` (5 arena
  patterns x calm/fight/boss) + `engine.js` (gesture-unlocked WebAudio
  wrapper, mute via injected callbacks).
- `src/vfx.js`: deterministic bursts + `sparkPoints` + `slowMoFor`.
- `src/tutorial.js`: 6-step pure lesson machine.
- `src/storage/`: provider interface + local provider + profile schema v1
  with additive economy fields (version stays 2) + versioned bundle
  export/import.
- `src/perf/`: stats + G1-G7 gate assertions.
- `sw.js` + `manifest.webmanifest`: offline shell + install metadata.
