# Umbra architecture (M2 pointer)

Full binding blueprint: [`ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md`](../../ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md).

M1 build notes: [`ideas/2026-09-22-umbra-m1-scaffold-render-tiers.md`](../../ideas/2026-09-22-umbra-m1-scaffold-render-tiers.md).

M2 build notes: [`ideas/2026-09-23-umbra-m2-combat-universal-input.md`](../../ideas/2026-09-23-umbra-m2-combat-universal-input.md).

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
