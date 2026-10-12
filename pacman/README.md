# Pac-Man Terminal Arcade

A complete, polished Pac-Man arcade experience that runs directly in the terminal. Modern terminals (Kitty, Ghostty, WezTerm, Konsole) get sprite-grade visuals through the Kitty graphics protocol, Windows Terminal is covered via Sixel, and a half-block Unicode plus truecolor fallback guarantees the game plays everywhere, including headless CI and legacy consoles.

Clean-room rule: all code, art, audio, mazes, and tuning tables are originals written for this project. No ROMs, no ripped sprites, no copied sources.

## Quickstart

Requirements: Python 3.11 or newer. No install step; the guaranteed play path uses only the standard library. (`pip install Pillow` unlocks the optional image backends.)

```sh
python3 pacman/pacman.py --maze-check
python3 pacman/pacman.py --self-check --ticks 2400 --seed 2
```

## What works today

- Deterministic headless engine: original 28x31 symmetric maze with tunnel and ghost house, 282 dots plus 4 energizers (every pickup flood-fill verified reachable), tile-center movement with buffered turns and cornering assist, scoring with ghost-chain bonuses and extra life, lives with death and respawn sequences, endless level progression with a speed ramp.
- Seeded simulation with split RNG streams and replay hashes: identical inputs reproduce bit-identical state on any machine.
- Renderer protocol layer: string-in/string-out backends (Unicode reference with cell diff and synchronized output, Kitty transmit-once plus place framing, Sixel DCS framing) with capability detection (flag beats environment beats safe Unicode default) and honest degrade when Pillow is absent.
- Test suite: 45 pytest cases covering maze invariants, movement feel, scoring and lives, determinism, protocol bytes, and CLI behavior.

## What is next

Ghost personalities with scatter/chase waves and fright timing, the tiered renderer with sprite atlas, the interactive terminal loop with menus and audio, fruit and high scores with themes and extra modes; the Pages hub grows into instructions, controls, and the performance scoreboard as those land.

## Layout

- `pacman.py` - launcher (adds `src/` to the path, no install needed)
- `src/engine/` - pure simulation: `tuning`, `rng`, `maze`, `actors`, `game`, `replay`
- `src/render/` - output backends: `protocol`, `framebuffer`, `ansi`, `unicode`, `kitty`, `sixel`, `detect`
- `src/shell/` - command line: `cli`
- `tests/` - pytest suite (`python3 -m pytest pacman/tests -q`)
- `docs/` - unified product documentation
