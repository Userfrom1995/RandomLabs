# Beambus: a retro arcade shooter in Zig

A deterministic, headless-testable shoot 'em up: scripted `.beam` level files,
six enemy movement patterns, a procedural pixel-art renderer, and a tiny
subtractive audio synth. The game core is pure Zig with no allocator in the
per-frame hot path, so the whole simulation is unit-testable without SDL.

## Build

```sh
cd beambus
zig build            # debug build
zig build test       # 41 headless tests (no SDL needed)
zig build check      # headless self-checks, exit 0/1
zig build run        # play in an SDL window
```

Requires Zig 0.15.2+ and SDL2 dev headers
(`libsdl2-dev` on Debian/Ubuntu, `sdl2-devel` on Fedora).

## Usage

```sh
./zig-out/bin/beambus                 # play in a window (default 480x600 x2)
./zig-out/bin/beambus --headless      # simulate, print a summary
./zig-out/bin/beambus --self-check    # run invariant checks
./zig-out/bin/beambus --level levels/level1.beam
./zig-out/bin/beambus --seed 42       # fixed RNG seed (deterministic replays)
./zig-out/bin/beambus --scale 3       # window scale factor (1-8)
./zig-out/bin/beambus --seconds 90    # headless run length
./zig-out/bin/beambus --help
```

Everything comes from the command line; there is no interactive input.

### Controls

| Key | Action |
| --- | --- |
| Arrow keys / WASD | Move the ship |
| Space / Z / X | Fire |
| P / Esc | Pause |
| R | Restart after a win/lose |
| Esc | Quit |

## What's inside

- **Deterministic core** (`src/core/`): `Vec2`, `Rect`, SplitMix64 `Rng`, a
  fixed-capacity 1024-slot entity arena pool with a free list, circle
  collision, and the full game simulation (waves, bosses, enemy bullets,
  collisions, scoring, lives, win/lose). No SDL, no allocation during a step.
- **Scripted levels** (`levels/*.beam`): a line/brace format declaring the
  player, enemy defs, waves, and bosses, with six movement patterns: sine,
  zigzag, swoop, drift, orbit, spiral. Strict validation with clear errors.
- **Procedural renderer** (`src/platform/render.zig`): draws the game into a
  software `u32` pixel buffer (procedural sprites, 3x5 bitmap font, seeded
  starfield, HUD) which SDL scales to the window. Pure Zig, no SDL.
- **Audio synth** (`src/platform/synth.zig`, `audio.zig`): a deterministic
  subtractive-style synth with a fixed 12-voice pool, fed to SDL via
  `SDL_QueueAudio` (no callback, no threads). Degrades to silent with no
  audio device.
- **Platform layer** (`src/platform/sdl.zig`): window, renderer, streaming
  ARGB texture, and input mapping.
- **Game loop** (`src/main.zig`): fixed-timestep 60 Hz accumulator, audio
  triggers on game-state transitions, and windowed/headless/self-check modes.

See [docs/](docs/) for the full documentation, the `.beam` level format, and
the design rationale.

MIT licensed.