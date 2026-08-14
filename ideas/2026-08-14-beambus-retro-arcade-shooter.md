# Beambus

A retro arcade shoot 'em up written from scratch in **Zig** - the factory's
first Zig project. A deterministic, headless-testable game core pairs with an
SDL2 platform layer: scripted `.beam` level files, seven enemy movement
patterns, configurable enemy shot volleys, boss enrage phases, power-up weapon
tiers and one-hit shields, bomb-refill drops, smart bombs, a combo scoring
multiplier, bonus lives, near-miss grazes, homing enemy shots, a focus mode
with a precise hitbox reticle, a performance-scaled rank difficulty meter, a
procedural pixel-art renderer, and a tiny subtractive audio synth. The core
never allocates during a frame, so the entire simulation is unit-testable
without SDL.

## What Was Built

A self-contained arcade game (`beambus/`):

- **Deterministic core** (`src/core/`): `Vec2`, `Rect`, a SplitMix64 `Rng`, a
  fixed-capacity 1024-slot entity arena pool with a free list, circle
  collision, and the full game simulation: waves, bosses, player movement and
  firing, enemy bullets, collisions, scoring, lives, power-up weapon tiers and
  shields, a combo multiplier, bonus lives, near-miss grazes, homing enemy
  shots, focus mode, the rank system, and win/lose states. No SDL, no
  allocator in the per-frame hot path; the same seed and input stream always
  reproduce the same run.
- **Scripted level format** (`src/core/level.zig`): a strict line/brace
  `.beam` script declaring the player, enemy defs, waves, bosses, and power-up
  drops, with seven movement patterns (sine, zigzag, swoop, drift, orbit,
  spiral, chase) and per-enemy `shots`/`spread` so any enemy can throw a fan
  volley, plus a `homing` key so enemies can fire curving shots. Boss defs
  carry a `rage_hp` threshold for enrage phases, and power-up drops come in
  three kinds (spread, shield, bomb). Unknown directives, bad numbers, unknown
  enemies, duplicate names, and unclosed blocks all fail with clear errors.
- **Procedural renderer** (`src/platform/render.zig`): draws the game into a
  software `u32` pixel buffer (0xAARRGGBB, ready for
  `SDL_PIXELFORMAT_ARGB8888`): hand-rolled rect/circle/stroke/triangle
  primitives, procedural sprites (triangle ship, circled enemies, bullet
  bolts, fading particles, pulsing power-up diamonds, an enraged-boss red
  aura, a focus hitbox reticle, a level-title intro banner), a 3x5 bitmap
  font, a two-layer seeded parallax starfield, a HUD with score, combo
  multiplier, lives, weapon tier, shield, bombs, grazes, rank, and level
  name, and a result screen with the final score, kills, grazes, rank, and
  time.
- **Procedural audio** (`src/platform/synth.zig`, `audio.zig`): a
  subtractive-style synth with a fixed 12-voice pool (square, saw, noise,
  frequency slide, TTL-shaped decay envelopes) synthesizing shoot, hit,
  explosion, player-hit, power-up, shield-break, bonus-life, bomb, graze,
  enrage, focus, win, and lose effects. Fed to SDL via `SDL_QueueAudio` (no
  callback, no threads); degrades to silence with no audio device.
- **SDL platform layer** (`src/platform/sdl.zig`): window, renderer,
  streaming ARGB texture, and input mapping (arrows/WASD, shift, space/Z/X,
  B/V, P/Esc, R).
- **Game loop** (`src/main.zig`): a fixed-timestep 60 Hz accumulator, audio
  triggers on game-state transitions, and three run modes: windowed play,
  `--headless` simulation summary, and `--self-check` invariant assertions.
  CLI args only: `--level`, `--seed`, `--scale`, `--seconds`, `--headless`,
  `--self-check`, `--version`, `--help`.
- **Sample levels** (`levels/level1.beam`, `levels/level2.beam`): "The Drone
  Swarm" and "The Nebula Empress", full scripts with four enemy archetypes
  (grunt, dart, tank, and a homing-firing seeker), timed power-up drops, and
  a boss each.
- **Tests**: 87 unit tests across vec, rng, rect, entity, level, game, render,
  and synth - all headless, no SDL required.

## Why

The factory's streak had been Python CLIs, WebGL, Go, C++, and Rust. Zig is
the natural next systems language: manual memory management with no GC, a
great test story, and deterministic compilation - ideal for a game whose core
is a hot simulation loop. Beambus showcases what makes Zig shine for games: a
headless, allocation-free core that is exhaustively unit-tested, with a thin
platform layer bolted on top. It is also the factory's first game with
procedural audio and a scripted level format, and its first project that runs
as a real windowed desktop application.

## How It Works

- **Entity pool.** All entities (player, enemies, player/enemy bullets,
  particles, power-up drops, floating score text) live in one fixed-capacity
  arena. A free list hands out slots in O(1); spawning never allocates; a cull
  pass returns dead entities. The core loop is a single switch on an entity's
  `kind` (no vtables, no interface indirection).
- **Level script.** `name`, `background`, `player { ... }`,
  `enemy <name> { ... }`, `wave { ... }`, `boss { ... }`, and
  `powerup { ... }` directives are parsed line by line; `#` starts a comment
  when followed by whitespace (so hex colors like `#0b0e14` survive). Waves
  spawn enemies one at a time on an interval; bosses and power-up drops enter
  on a timer. Every wave and boss references a defined enemy, enforced at
  parse time.
- **Movement patterns.** Each pattern is a small closed-form update: sine
  oscillates horizontally as the enemy falls, zigzag alternates direction
  every 80px, swoop arcs across, drift sways slowly, orbit is the boss sweep
  that holds altitude near the top, spiral combines a horizontal cosine with
  a damped vertical sine, and chase steers the enemy onto the player's column
  as a dive bomber. Patterns are chosen per wave in the script.
- **Simulation loop.** Each `step` advances time, updates the player from a
  normalized input snapshot (diagonals are not boosted), spawns waves and
  bosses on timers, moves enemies by their pattern, moves bullets, runs circle
  collisions, updates particles, and culls the pool. Determinism comes from
  the seeded SplitMix64 PRNG and the absence of allocation or SDL state in the
  hot path.
- **Scoring depth.** A combo counter climbs with every kill made while the
  player has not been hit, driving the score multiplier to x4 (shown in the
  HUD); any hit resets it. The `player { life_every N }` key awards a bonus
  life each time the score crosses another N points.
- **Enemy shot volleys.** Enemy defs and bosses carry `shots` and `spread`, so
  a level can hand any enemy a fan volley - a two-shot burst, a three-way
  spread, or a wide five-shot fan - without new code.
- **Boss enrage.** A `rage_hp` fraction on a boss def turns a fight into two
  acts: once the boss drops to that HP it enrages once, doubling its fire rate
  and adding two bullets per volley. The renderer glows it red and the synth
  growls, so the climax of a boss fight is unmistakable.
- **Power-up kinds.** Drops come in three kinds: `spread` (raise the weapon
  tier), `shield` (one-hit bubble), and `bomb` (refill one smart-bomb stock,
  drawn as a pinwheel). A level can spend bombs as a panic button and reward
  them as pickups.
- **Grazing.** An enemy bullet that passes within a narrow band around the
  ship without hitting scores `50 * combo multiplier` points and rings a soft
  tick. Each bullet grazes at most once and the HUD counts grazes, rewarding
  the risky close dodging that defines the genre.
- **Focus mode.** Holding Shift (either shift key) slows the ship to a
  fraction of its speed - the level's `focus_speed` key, default 0.5 - so a
  player can thread precise dodges through a bullet wall. The shot pattern
  tightens with it: twin shots converge into a beam and the triple spread
  narrows to a tight cone. A cyan reticle marks the ship's exact hitbox and a
  soft blip sounds on toggle, so the trade-off reads instantly.
- **Rank system.** A performance-scaled difficulty meter (0-100) rises by 2
  per kill and 1 per graze and drops by 25 when the player is hit. At rank 100
  enemy fire rate and bullet speed are 1.6x base, so a hot clean run plays
  faster and nastier while a struggling player gets a breather. The HUD colors
  it by heat.
- **Smart bombs.** With `player { bombs N }` the player carries a small stock
  of screen-clearing bombs: detonating one (B/V) clears every enemy bullet on
  screen, deals two points of damage to every enemy (kills score through the
  combo multiplier), flashes the screen white, and plays a dedicated sound.
  The HUD shows the remaining stock and a boss health bar appears while a boss
  is on screen.
- **Respawn invulnerability.** A fresh spawn gets a two-second invulnerability
  window (the ship blinks) in which enemy bullets and body contact are
  ignored, so a bullet crossing the spawn point can never kill the player
  instantly.
- **Shields.** A `shield` power-up drop equips a one-hit bubble drawn around
  the ship; when a hit lands the shield absorbs it instead of costing a life
  and fires its own break effect.
- **Renderer.** Pure Zig over a `u32` pixel buffer. Primitives (rect, circle,
  circle stroke, triangle) are hand-rolled; text uses a 3x5 bitmap glyph set;
  a two-layer parallax starfield (slow dim far stars, faster bright near
  stars) is seeded per run and scrolls downward with wrap. The buffer is
  uploaded to an SDL streaming texture and scaled to the window.
- **Audio.** The synth keeps a fixed pool of voices, each with a wave, base
  frequency, frequency slide, amplitude, and a TTL that shapes the decay
  envelope. Effects are layered voice stacks (e.g. an explosion is a noise
  burst plus a dropping square). Output is deterministic and clamped to
  [-1, 1].
- **CLI.** A hand-rolled arg parser (no library) handles all options; unknown
  options and bad values produce a clear message and a non-zero exit. There is
  no interactive input anywhere.

## Key Files

- `beambus/src/core/vec.zig`, `rect.zig`, `rng.zig`: math and the SplitMix64 PRNG.
- `beambus/src/core/entity.zig`: entity kinds and the fixed-capacity arena pool.
- `beambus/src/core/level.zig`: the `.beam` parser and level data model.
- `beambus/src/core/game.zig`: the deterministic game simulation.
- `beambus/src/main.zig`: arg parsing, the fixed-timestep game loop, and the
  windowed/headless/self-check modes.
- `beambus/src/platform/render.zig`: the procedural software renderer.
- `beambus/src/platform/synth.zig`, `audio.zig`: the synth and SDL audio glue.
- `beambus/src/platform/sdl.zig`: the SDL window/renderer/input wrapper.
- `beambus/levels/level1.beam`: the sample level, "The Drone Swarm".
- `beambus/levels/level2.beam`: a second level, "The Nebula Empress".
- `beambus/frame_test.zig`: a standalone frame dump to PPM (dev tool).
- `beambus/build.zig`: build, run, check, and test steps.
- `beambus/README.md`: quickstart; `beambus/docs/index.md` + `index.html`:
  documentation site; `beambus/docs/level-format.md`: the `.beam` grammar.

## Notes

- **Zig 0.15.2.** The build uses the current Build API (`root_module`,
  `b.addTest`), verified against the Zig 0.15.2 release and SDL2's C headers.
  The SDL2 C-import compiles cleanly under the new module system.
- **Headless-first.** `zig build test` runs 87 tests with no SDL and no audio
  device; the SDL glue is exercised only by the exe build. Everything in the
  core is plain data plus logic, which is what makes it exhaustively testable.
- **A real build fix.** While finalizing, the headless test step was silently
  only collecting 9 tests (the `--dep core` module boundary swallowed the
  per-file test blocks). Moving to relative-path imports so all modules live
  in one root made all 41 tests run, later grown to 87 by the power-up,
  shield, scoring, bomb, invulnerability, volley, graze, enrage, chase,
  bomb-refill, focus, rank, homing, and result-screen tests.
- **Deterministic audio.** The synth renders deterministically for a given
  sequence of triggers, so audio behaviour is unit-testable too.
- **Name origin.** A "beam" is both the player's energy ray and the core
  mechanic of shooting down waves; the `.beam` level format doubles as the
  pun.