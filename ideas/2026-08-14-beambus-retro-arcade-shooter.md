# Beambus

A retro arcade shoot 'em up written from scratch in **Zig** - the factory's
first Zig project. A deterministic, headless-testable game core pairs with an
SDL2 platform layer: scripted `.beam` level files, six enemy movement
patterns, a procedural pixel-art renderer, and a tiny subtractive audio synth.
The core never allocates during a frame, so the entire simulation is
unit-testable without SDL.

## What Was Built

A self-contained arcade game (`beambus/`):

- **Deterministic core** (`src/core/`): `Vec2`, `Rect`, a SplitMix64 `Rng`, a
  fixed-capacity 1024-slot entity arena pool with a free list, circle
  collision, and the full game simulation: waves, bosses, player movement and
  firing, enemy bullets, collisions, scoring, lives, and win/lose states. No
  SDL, no allocator in the per-frame hot path; the same seed and input stream
  always reproduce the same run.
- **Scripted level format** (`src/core/level.zig`): a strict line/brace
  `.beam` script declaring the player, enemy defs, waves, and bosses, with six
  movement patterns (sine, zigzag, swoop, drift, orbit, spiral). Unknown
  directives, bad numbers, unknown enemies, duplicate names, and unclosed
  blocks all fail with clear errors.
- **Procedural renderer** (`src/platform/render.zig`): draws the game into a
  software `u32` pixel buffer (0xAARRGGBB, ready for
  `SDL_PIXELFORMAT_ARGB8888`): hand-rolled rect/circle/stroke/triangle
  primitives, procedural sprites (triangle ship, circled enemies, bullet
  bolts, fading particles), a 3x5 bitmap font, a seeded twinkling starfield,
  and a HUD with score, lives, and level name.
- **Procedural audio** (`src/platform/synth.zig`, `audio.zig`): a
  subtractive-style synth with a fixed 12-voice pool (square, saw, noise,
  frequency slide, TTL-shaped decay envelopes) synthesizing shoot, hit,
  explosion, player-hit, win, and lose effects. Fed to SDL via
  `SDL_QueueAudio` (no callback, no threads); degrades to silence with no
  audio device.
- **SDL platform layer** (`src/platform/sdl.zig`): window, renderer,
  streaming ARGB texture, and input mapping (arrows/WASD, space/Z/X, P/Esc,
  R).
- **Game loop** (`src/main.zig`): a fixed-timestep 60 Hz accumulator, audio
  triggers on game-state transitions, and three run modes: windowed play,
  `--headless` simulation summary, and `--self-check` invariant assertions.
  CLI args only: `--level`, `--seed`, `--scale`, `--seconds`, `--headless`,
  `--self-check`, `--version`, `--help`.
- **Sample level** (`levels/level1.beam`): "The Drone Swarm", a full script
  with three enemy archetypes and a boss.
- **Tests**: 41 unit tests across vec, rng, rect, entity, level, game, render,
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
  particles, floating score text) live in one fixed-capacity arena. A free
  list hands out slots in O(1); spawning never allocates; a cull pass returns
  dead entities. The core loop is a single switch on an entity's `kind` (no
  vtables, no interface indirection).
- **Level script.** `name`, `background`, `player { ... }`,
  `enemy <name> { ... }`, `wave { ... }`, and `boss { ... }` directives are
  parsed line by line; `#` starts a comment when followed by whitespace (so
  hex colors like `#0b0e14` survive). Waves spawn enemies one at a time on an
  interval; bosses enter on a timer. Every wave and boss references a defined
  enemy, enforced at parse time.
- **Movement patterns.** Each pattern is a small closed-form update: sine
  oscillates horizontally as the enemy falls, zigzag alternates direction
  every 80px, swoop arcs across, drift sways slowly, orbit is the boss sweep
  that holds altitude near the top, and spiral combines a horizontal cosine
  with a damped vertical sine. Patterns are chosen per wave in the script.
- **Simulation loop.** Each `step` advances time, updates the player from a
  normalized input snapshot (diagonals are not boosted), spawns waves and
  bosses on timers, moves enemies by their pattern, moves bullets, runs circle
  collisions, updates particles, and culls the pool. Determinism comes from
  the seeded SplitMix64 PRNG and the absence of allocation or SDL state in the
  hot path.
- **Renderer.** Pure Zig over a `u32` pixel buffer. Primitives (rect, circle,
  circle stroke, triangle) are hand-rolled; text uses a 3x5 bitmap glyph set;
  the starfield is seeded per run and scrolls downward with wrap. The buffer
  is uploaded to an SDL streaming texture and scaled to the window.
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
- `beambus/frame_test.zig`: a standalone frame dump to PPM (dev tool).
- `beambus/build.zig`: build, run, check, and test steps.
- `beambus/README.md`: quickstart; `beambus/docs/index.md` + `index.html`:
  documentation site; `beambus/docs/level-format.md`: the `.beam` grammar.

## Notes

- **Zig 0.15.2.** The build uses the current Build API (`root_module`,
  `b.addTest`), verified against the Zig 0.15.2 release and SDL2's C headers.
  The SDL2 C-import compiles cleanly under the new module system.
- **Headless-first.** `zig build test` runs 41 tests with no SDL and no audio
  device; the SDL glue is exercised only by the exe build. Everything in the
  core is plain data plus logic, which is what makes it exhaustively testable.
- **A real build fix.** While finalizing, the headless test step was silently
  only collecting 9 tests (the `--dep core` module boundary swallowed the
  per-file test blocks). Moving to relative-path imports so all modules live
  in one root made all 41 tests run.
- **Deterministic audio.** The synth renders deterministically for a given
  sequence of triggers, so audio behaviour is unit-testable too.
- **Name origin.** A "beam" is both the player's energy ray and the core
  mechanic of shooting down waves; the `.beam` level format doubles as the
  pun.