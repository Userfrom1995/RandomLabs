# Beambus: a retro arcade shooter in Zig

A deterministic, headless-testable shoot 'em up: scripted `.beam` level files,
seven enemy movement patterns, configurable enemy shot volleys, boss enrage
phases, power-up weapon upgrades and one-hit shields, bomb-refill drops, smart
bombs, a combo scoring multiplier, bonus lives, near-miss grazes, a focus mode
with a precise hitbox reticle, a performance-scaled rank difficulty meter, a
procedural pixel-art renderer, and a tiny subtractive audio synth. The game
core is pure Zig with no allocator in the per-frame hot path, so the whole
simulation is unit-testable without SDL.

## Build

```sh
cd beambus
zig build            # debug build
zig build test       # 79 headless tests (no SDL needed)
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
| Shift | Focus: slow precise movement, tighter shot, hitbox reticle |
| Space / Z / X | Fire |
| B / V | Detonate a smart bomb |
| P / Esc | Pause |
| R | Restart after a win/lose |
| Esc | Quit |

## What's inside

- **Deterministic core** (`src/core/`): `Vec2`, `Rect`, SplitMix64 `Rng`, a
  fixed-capacity 1024-slot entity arena pool with a free list, circle
  collision, and the full game simulation (waves, bosses, enemy bullets,
  collisions, scoring, lives, power-up weapon tiers and shields, combo
  multiplier, bonus lives, win/lose). No SDL, no allocation during a step.
- **Scripted levels** (`levels/*.beam`): a line/brace format declaring the
  player, enemy defs, waves, bosses, and power-up drops, with seven movement
  patterns: sine, zigzag, swoop, drift, orbit, spiral, chase. Strict
  validation with clear errors. Ships with two levels (`level1.beam`,
  `level2.beam`).
- **Weapon upgrades**: touching a `spread` drop raises the fire level from
  single to twin to triple spread (capped at 3). Dying resets the tier to
  single.
- **Enemy volleys**: enemy defs and bosses accept `shots` and `spread`, so a
  level can hand any enemy a fan volley (e.g. a dart firing a two-shot burst,
  a boss throwing a five-way spread). Defaults stay single-shot.
- **Boss enrage**: a `rage_hp` fraction on a boss def makes it enter an enrage
  phase once it drops to that HP level - double fire rate, +2 bullets per
  volley, a red pulsing aura, and a growling sound. A boss fight gets a
  climactic second half.
- **Shields**: a `shield` drop equips a one-hit bubble that absorbs the next
  hit instead of costing a life, drawn as a ring around the ship.
- **Bomb refills**: a `bomb` power-up drop restores one smart-bomb stock
  (rendered as a pinwheel), so levels can reward bombs as well as spend them.
- **Combo scoring**: consecutive kills without taking a hit build a multiplier
  (x2 at 5, x3 at 10, capped at x4) shown next to the score. Any hit resets it.
- **Bonus lives**: the player's `life_every N` key awards an extra life each
  time the score crosses another N points.
- **Smart bombs**: with `bombs N` in the player block, B/V detonates a bomb
  that clears every enemy bullet and deals two points of damage to every enemy
  (kills score through the combo multiplier), with a white screen flash and a
  dedicated sound effect. `bombs 0` (default) disables the mechanic.
- **Grazing**: an enemy bullet that misses the ship by a hair scores points
  (scaled by the combo multiplier) and rings a soft tick, rewarding close
  dodging. The HUD shows the graze count.
- **Focus mode**: holding Shift slows the ship to a fraction of its speed (the
  level's `focus_speed` key, default 0.5) for precise dodging, tightens the
  shot pattern into a converging beam, and draws a cyan reticle on the ship's
  true hitbox. A soft blip sounds on toggle.
- **Rank system**: a performance-scaled difficulty meter (0-100, shown in the
  HUD) that rises with kills and grazes and drops when you are hit. At max rank
  enemies fire up to 60% faster and their bullets fly up to 60% faster, so a
  hot clean run gets harder while a struggling player gets a breather.
- **Respawn invulnerability**: a fresh spawn gets a two-second blink window in
  which enemy bullets and body contact are ignored.
- **Procedural renderer** (`src/platform/render.zig`): draws the game into a
  software `u32` pixel buffer (procedural sprites, 3x5 bitmap font, two-layer
  parallax starfield, level-title intro banner, HUD with score/combo/lives/
  weapon tier/shield/bombs/graze/rank/boss bar) which SDL scales to the window.
  Pure Zig, no SDL.
- **Audio synth** (`src/platform/synth.zig`, `audio.zig`): a deterministic
  subtractive-style synth with a fixed 12-voice pool, fed to SDL via
  `SDL_QueueAudio` (no callback, no threads). Shoot/hit/explosion/player-hit/
  power-up/shield-break/bonus-life/bomb/graze/enrage/focus/win/lose effects.
  Degrades to silent with no audio device.
- **Platform layer** (`src/platform/sdl.zig`): window, renderer, streaming
  ARGB texture, and input mapping.
- **Game loop** (`src/main.zig`): fixed-timestep 60 Hz accumulator, audio
  triggers on game-state transitions, and windowed/headless/self-check modes.

See [docs/](docs/) for the full documentation, the `.beam` level format, and
the design rationale.

MIT licensed.