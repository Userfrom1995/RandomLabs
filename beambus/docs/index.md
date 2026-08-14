# Beambus: a retro arcade shooter in Zig

**Beambus** is a retro arcade shoot 'em up written in **Zig**, and the
factory's first Zig project. It pairs a deterministic, headless-testable game
core with an SDL2 platform layer: scripted `.beam` level files, six enemy
movement patterns, configurable enemy shot volleys, power-up weapon tiers and
one-hit shields, smart bombs, a combo scoring multiplier, bonus lives,
near-miss grazes, a procedural pixel-art renderer, and a
tiny subtractive audio synth. The core never allocates during a frame, so the
entire simulation is unit-testable without SDL.

## What it is

- **Deterministic core.** The game simulation lives in `src/core/`: a `Vec2`,
  `Rect`, a SplitMix64 `Rng`, a fixed-capacity (1024 slot) entity arena pool
  with a free list, circle collision, and the full game logic (waves, bosses,
  enemy bullets, collisions, scoring, lives, power-up weapon tiers and
  shields, smart bombs, combo multiplier, bonus lives, near-miss grazes,
  win/lose states). There is no
  allocator in the per-frame hot path and no SDL dependency, so the same seed
  and input stream always reproduce the same run.
- **Scripted levels.** A line/brace `.beam` format declares the player, enemy
  defs, waves, bosses, and power-up drops. Six movement patterns (sine, zigzag,
  swoop, drift, orbit, spiral) drive how enemies curve through the field. The
  parser is strict: unknown directives, bad numbers, unknown enemies, duplicate
  names, and malformed levels all fail with a clear error. Two levels ship with
  the game (`level1.beam`, `level2.beam`).
- **Procedural renderer.** A pure-Zig software renderer draws every frame into
  a `u32` pixel buffer at arena resolution (480x600): procedural sprites
  (triangle ship, circled enemies, bullet bolts, fading particles, pulsing
power-up diamonds), a 3x5 bitmap font, a seeded twinkling starfield, and a
    HUD with score, combo multiplier, lives, weapon tier, shield, bombs, grazes,
    a boss health bar, and level name.
  The buffer is uploaded to an SDL streaming texture and scaled to the window.
- **Procedural audio.** A subtractive-style synth with a fixed 12-voice pool
  synthesizes shoot, hit, explosion, player-hit, power-up, shield-break,
  bonus-life, bomb, graze, win, and lose effects. SDL is fed via `SDL_QueueAudio` (no
  callback, no threads); with no audio device it degrades to silence, so CI
  runs stay headless.
- **Three run modes.** Windowed play (fixed-timestep 60 Hz loop), a headless
  simulation that prints a summary, and a self-check mode that asserts core
  invariants and exits 0/1.

## Using it

```sh
cd beambus
zig build            # debug build
zig build test       # 68 headless tests (no SDL needed)
zig build check      # headless self-checks
zig build run        # play in an SDL window

./zig-out/bin/beambus                  # play in a window (480x600 x2)
./zig-out/bin/beambus --headless       # simulate, print a summary
./zig-out/bin/beambus --self-check     # run invariant checks
./zig-out/bin/beambus --level levels/level1.beam
./zig-out/bin/beambus --seed 42        # fixed seed, deterministic replay
./zig-out/bin/beambus --scale 3        # window scale factor (1-8)
./zig-out/bin/beambus --seconds 90     # headless run length
./zig-out/bin/beambus --help
```

Controls: arrow keys or WASD to move, Space/Z/X to fire, B/V to detonate a
smart bomb, P/Esc to pause, R to restart after a win/lose, Esc to quit.
Everything is passed on the command line; there is no interactive input.

## How it works

- **Entity pool.** All entities (player, enemies, player/enemy bullets,
  particles, power-up drops, floating score text) live in one fixed-capacity
  arena. A free list hands out slots in O(1); spawning never allocates, and
  the cull pass returns dead entities to the pool. The core loop is a single
  switch on an entity's `kind` (no vtables, no interface indirection).
- **Level script.** `name`, `background`, `player { ... }`, `enemy <name> {
  ... }`, `wave { ... }`, `boss { ... }`, and `powerup { ... }` directives are
  parsed line by line; `#` starts a comment (a `#` followed by whitespace, so
  hex colors like `#0b0e14` are not eaten). Waves spawn enemies one at a time
  on an interval; bosses and power-up drops enter on a timer. Every wave and
  boss references a defined enemy, enforced at parse time.
- **Movement patterns.** Each pattern is a small closed-form update: sine
  oscillates horizontally as the enemy falls, zigzag alternates direction
  every 80px, swoop arcs across, drift sways slowly, orbit is the boss sweep
  that holds altitude near the top, and spiral combines horizontal cosine with
  a damped vertical sine. Patterns are chosen per wave in the level script.
- **Simulation loop.** Each `step` advances time, updates the player from the
  input snapshot, spawns waves and bosses on their timers, moves enemies by
  their pattern, moves bullets, runs circle collisions, updates particles, and
  culls the pool. The player's input is normalized so diagonal movement is not
  boosted. Determinism comes from the seeded SplitMix64 PRNG and the absence
  of allocation or SDL state in the hot path.
- **Weapon tiers.** Touching a `spread` power-up drop raises the player's fire
  level: single -> twin -> triple spread (capped at 3). Dying resets the tier
  to single, so a level's drops pace the run.
- **Enemy shot volleys.** Enemy defs and bosses accept `shots` (bullets per
  trigger) and `spread` (fan angle in radians, centered on the player). A
  level can give any enemy a volley, from a two-shot burst to a wide five-way
  fan, without new code.
- **Shields.** A `shield` drop equips a one-hit bubble that absorbs the next
  hit instead of costing a life. The renderer draws it as a ring around the
  ship; a break triggers its own sound effect.
- **Combo scoring.** Every enemy destroyed without the player taking a hit
  increments a combo counter. The score multiplier climbs to x2 at 5 kills,
  x3 at 10, and x4 at 15 (capped). It is shown next to the score in the HUD and
  resets to x1 on any hit.
- **Bonus lives.** The `player { life_every N }` key awards an extra life each
  time the score crosses another N points (0 disables it). The classic arcade
  reward for a long, clean run.
- **Smart bombs.** The `player { bombs N }` key starts the player with N bombs.
  Detonating a bomb (B/V) clears every enemy bullet on screen and deals two
  points of damage to every enemy, with kills scoring through the combo
  multiplier. A white screen flash and a dedicated sound effect sell the
  detonation; the HUD tracks the remaining stock. `bombs 0` (the default)
  disables the mechanic, so a level opts in.
- **Grazing.** An enemy bullet that passes within a narrow band around the
  ship without hitting scores `50 * combo multiplier` points and rings a soft
  tick, rewarding close dodges - the classic bullet-hell risk/reward. Each
  bullet grazes at most once, and the HUD counts grazes.
- **Respawn invulnerability.** After a death the ship respawns with a two-second
  invulnerability window (the sprite blinks), so a fresh spawn is never killed
  instantly by a bullet crossing the spawn point. Enemy bullets and body
  contact are ignored while it lasts.
- **Renderer.** The renderer is pure Zig over a `u32` pixel buffer
  (0xAARRGGBB, ready for `SDL_PIXELFORMAT_ARGB8888`). Primitives (rect, circle,
  circle stroke, triangle) are hand-rolled; text uses a 3x5 bitmap glyph set.
  The starfield is seeded per run and scrolls downward with wrap.
- **Audio.** The synth keeps a fixed pool of voices, each with a wave (square,
  saw, noise), frequency, slide, amplitude, and a time-to-live that shapes the
  decay envelope. Effects are layered voice stacks (e.g. an explosion is a
  noise burst plus a dropping square). Output is deterministic and clamped to
  [-1, 1].
- **CLI.** A hand-rolled arg parser (no library) handles `--level`, `--seed`,
  `--scale`, `--seconds`, `--headless`, `--self-check`, `--version`, `--help`;
  unknown options and bad values produce a clear message and a non-zero exit.

## Design choices

- **Zig, and headless-first.** The core is deliberately SDL-free so every rule
  of the game is covered by 68 unit tests that run anywhere, with no window
  and no audio device. The platform layer is a thin typed wrapper over SDL.
- **No allocator in the hot path.** The entity arena is fixed at compile time,
  which makes the simulation deterministic, cache-friendly, and free of OOM
  states.
- **Deterministic by default.** Same seed, same input, same outcome. The
  windowed mode seeds from the clock unless `--seed` is given; headless and
  self-check modes use fixed seeds so replays are exact.
- **Scriptable levels.** Levels are data, not code: tuning waves, patterns,
  and bosses is a text edit, and the parser's strict errors catch mistakes at
  load time.
- **Self-verifying.** `zig build check` re-runs core invariants at runtime
  (bounded simulation, seed determinism, distinct-seed validity), and
  `zig build test` covers every SDL-free module.

## Level format

The `.beam` format is documented with a full grammar in
[`level-format.md`](level-format.md). A short example:

```text
name "The Drone Swarm"
background #0b0e14
player { speed 260 fire_rate 0.16 lives 3 life_every 10000 bombs 2 }
enemy grunt { hp 1 speed 90 points 100 radius 8 fire_rate 0.5 color #e8594f }
wave { at 2 kind grunt count 6 interval 0.4 pattern sine armed false }
boss { at 45 kind tank hp 80 speed 40 points 5000 fire_rate 0.8 color #ffd23f }
powerup { at 16 kind spread }
powerup { at 22 kind shield }
```

## Key files

- `beambus/src/core/vec.zig`, `rect.zig`, `rng.zig`: math and the SplitMix64 PRNG.
- `beambus/src/core/entity.zig`: entity kinds and the fixed-capacity arena pool.
- `beambus/src/core/level.zig`: `.beam` parser and level data model.
- `beambus/src/core/game.zig`: the deterministic simulation.
- `beambus/src/main.zig`: arg parsing, the fixed-timestep game loop, and the
  windowed/headless/self-check modes.
- `beambus/src/platform/render.zig`: the procedural software renderer.
- `beambus/src/platform/synth.zig`, `audio.zig`: the synth and SDL audio glue.
- `beambus/src/platform/sdl.zig`: the SDL window/renderer/input wrapper.
- `beambus/levels/level1.beam`: the sample level ("The Drone Swarm").
- `beambus/levels/level2.beam`: a second level ("The Nebula Empress").
- `beambus/frame_test.zig`: a standalone frame dump to PPM (dev tool).
- `beambus/build.zig`: build, run, check, and test steps.
- `beambus/README.md`: quickstart; `beambus/docs/`: this documentation.

## Source

The project lives in
[`beambus/`](https://github.com/Userfrom1995/Random/tree/main/beambus) with a
[README](https://github.com/Userfrom1995/Random/blob/main/beambus/README.md)
and a full writeup in
[`ideas/`](https://github.com/Userfrom1995/Random/blob/main/ideas/2026-08-14-beambus-retro-arcade-shooter.md).