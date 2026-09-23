# Umbra M2: deterministic combat engine + universal input

Date: 2026-09-23. Issue: #375. Milestone branch: `opencode/issue375-umbra-m2`
(`Refs #375`). Builds on merged M1 (PR #376).

## What was built

The first playable bout: you vs Echo (seeded brawler AI, difficulty 1),
best of 3 rounds with intro cards, 60-second timer, KO/timeout round flow,
hit-stop freeze, pause/result overlays, and rematch. Everything runs on a
deterministic headless core at a fixed 60 Hz, decoupled from rAF.

**Combat core (`umbra/src/combat/`, pure ES, no DOM, mulberry32-only RNG):**
- `types.js`: JSDoc contracts (CombatInput, MoveDef, FighterState x12,
  FightState, FightEvent) matching the Architect's binding shapes.
- `moves.js`: FISTS table (jab/cross/kick/sweep/uppercut, tick frame data,
  jab->cross->uppercut + kick->sweep cancel graph) with `validateMoves()`.
- `fighter.js`: 12-state machine (idle/walk/crouch/jump/attack/block/parry/
  hit/stun/knockdown/down/ko), 6-tick parry on block rising edge, chip +
  stamina drain + guard break, knockdown launches, dash/jump physics.
- `hitboxes.js`: facing-space capsule-vs-capsule tests.
- `engine.js`: `createFight`/`stepFight`/`sanitizeInput`/`hashState`
  (FNV-1a 8-hex, 1e-3 quantization), 60-tick intro, hitstop (freezes
  fighters, tick + timer run), auto-facing, round/match flow.
- `combos.js`: counter + `max(0.35, 1-0.12*(hits-1))` scaling, 90-tick window.
- `ai.js`: seeded FSM (neutral/approach/punish/retreat) x brawler/turtle/
  zoner x difficulties (reaction 18/10/5, aggression 0.25/0.5/0.8).

**Universal input (`umbra/src/input/`):**
- `bindings.js` v1 (WASD + arrows, J/K punch/kick, L block-hold, U special,
  Space dash, Esc pause) with conflict-swap `rebind`, versioned
  serialize/load, `describeBindings` UI hook; persisted to `bindings.json`.
- `keyboard.js` (edge queue, block held), `gamepad.js` (standard map,
  0.35 deadzone, hot-plug null), `touch.js` (overlay state, 12 px joystick
  quantize, swipe-up jump, 80 ms haptic throttle), `combine.js` (OR-merge).
- Settings remap UI: click a binding, press a key, conflict swaps, persists.

**Presentation:** sim-driven `SceneDesc` (fighter x/facing/y, strike/guard/
hit/crumple pose tracks in `poses.js`, hit-flash + KO shake from events);
fight HUD (health/stamina/pips/timer/combo), ROUND/K.O. banners, pause +
result overlays; touch dock in-flow below the canvas (never covers the
fighter plane); haptics (40 ms hurt / 15 ms landed); auto-pause on hide.

## Why

Fighting-game feel lives or dies on determinism and input integrity, so the
sim owns fixed ticks, single-consumption edges, and seeded AI, while rAF
only renders. Poses stay data (angle deltas on the idle base) so M4 weapons
reuse the solver. M1 golden hashes untouched.

## How it works

Per accumulator tick in `app.js`: keyboard.consumeTick + touch.consumeTick
+ gamepad poll OR-merge into one CombatInput (G3: edges land in <= 2 ticks
by construction), AI samples the foe through the bout RNG, `stepFight`
advances, fresh events drive banners/haptics, HUD repaints. Same seed +
same input log replays byte-identical (G4 test records 600 AI-vs-AI ticks
and replays from the log).

## Key files

`umbra/app.js`, `umbra/index.html`, `umbra/theme.css`, `umbra/sw.js`
(v2), `umbra/src/combat/*.js`, `umbra/src/input/*.js`,
`umbra/src/poses.js` (+combat tracks), `umbra/src/render/scene.js`
(+fight mode), tests `test-combat/test-ai/test-input/test-fight-scene`,
`umbra/docs/shot-m2-fight-{desktop,mobile}.png`.

## Notes

- Keyboard dash with no held direction defaults to forward (never a no-op).
- Mirrored-bout symmetry holds because hit jitter is a stateless
  `hash01(seed, tick)`, not stream consumption.
- M1 red-team DOM-id test updated to the M2 screen contract (demo retired).
- Deferred to M3/M4/M5: roster/story/arenas, weapons/bosses/economy,
  SFX/music, browser-measured G1/G2/G7, full a11y audit.

- the Builder
