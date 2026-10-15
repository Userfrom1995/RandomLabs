# Pac-Man Terminal Arcade

A complete, polished Pac-Man arcade experience that runs directly in the terminal. The game treats the window as a full-screen canvas: the maze plus live dashboards, controls, and hints fill whatever terminal size you give it, from a bare 28x34 maze on small windows to a full stats-and-legend cockpit on wide ones. Modern terminals (Kitty, Ghostty, WezTerm, Konsole) get sprite-grade visuals through the Kitty graphics protocol, Windows Terminal is covered via Sixel, and a half-block Unicode plus truecolor fallback guarantees the game plays everywhere, including headless CI and legacy consoles.

Clean-room rule: all code, art, audio, mazes, and tuning tables are originals written for this project. No ROMs, no ripped sprites, no copied sources.

## Quickstart

Requirements: Python 3.11 or newer. No install step; the guaranteed play path uses only the standard library. (`pip install Pillow` unlocks the optional image backends.)

```sh
python3 pacman/pacman.py --maze-check
python3 pacman/pacman.py --self-check --ticks 2400 --seed 2
python3 pacman/pacman.py --self-check --mode fright-frenzy --ticks 2400
python3 pacman/pacman.py --render-check --renderer kitty
python3 pacman/pacman.py --render-bench --frames 60
python3 pacman/pacman.py --verify
python3 pacman/pacman.py --scoreboard --frames 60
python3 pacman/pacman.py --modes --themes --levels 8
python3 pacman/pacman.py --layout-check 120x50
python3 pacman/pacman.py --keys
python3 pacman/pacman.py --play --mode classic --theme neon --audio auto --fps 30
```

## What works today

- Deterministic headless engine: original 28x31 symmetric maze with tunnel and ghost house, 282 dots plus 4 energizers (every pickup flood-fill verified reachable), tile-center movement with buffered turns and cornering assist, bonus fruit ripening twice per level under the ghost house with tier points and a fixed expiry window, scoring with ghost-chain bonuses and extra life, lives with death and respawn sequences, endless level progression with a speed ramp (`--levels N` prints it).
- Four ghost personalities with distinct chase styles (direct pursuit, ahead-ambush, pincer-mirror, shy retreat), alternating scatter/chase waves with about-face reversals, power-pellet fright with flashing warning and 200-400-800-1600 chains, eye returns that revive at the house door, dot-counter plus idle-timeout house exits, tunnel slowdown, and a late-level leader enrage that pins chase.
- Seeded simulation with split RNG streams and replay hashes: identical inputs reproduce bit-identical state on any machine.
- Tiered renderer: one scene painter feeds every backend, so maze, entity, and HUD positions match within one cell everywhere. The Kitty backend transmits a cached original sprite atlas once and places per frame with cursor-anchored text fallback; the Sixel backend rasterizes dirty regions with a bounded palette and caps itself at 10 fps; the Unicode reference backend emits only changed cells inside synchronized output. A watchdog steps down one tier on backend errors or repeated slow frames and never raises out of `present`.
- Responsive fullscreen canvas: a pure layout engine maps the live terminal size to regions (maze composition plus optional side dashboards, title strip, and hints status bar) and a composer paints one frame that always matches the terminal dimensions, so every cell of the window is intentional. Narrow windows play the bare maze exactly as before; 56+ column windows gain a live score/run/progress dashboard; 80+ column windows add a controls-and-legend panel; tall windows gain title and hint strips. Resizes re-layout and repaint from a clean slate on every backend, and `--layout-check` reports the regions for any size.
- Interactive shell: title, pause/resume, restart, and game-over flows around the live simulation, played at a paced 30 fps with a fixed 120 Hz timestep. Keys are remappable (`--bind up=k`, arrows and Esc/Ctrl-C/Enter always work, `--keys` prints the table); slow-terminal partial escape sequences are held, never misread. Audio is pluggable (`--audio null|bell|synth|auto`): original synthesized voices through a real system player when one exists, terminal bell otherwise, with dot chirps throttled so the mix stays intelligible. Raw mode always restores the terminal on exit, even on crashes, and undersized windows get an honest too-small screen instead of a garbled maze.
- Four honest rulesets (`--mode classic|time-attack|sprint|fright-frenzy`): the standard loop, 120 seconds on a refilling maze, a one-life no-fright race against the clock with a par-time bonus, and 4x fright windows with slower ghosts. Every mode replays deterministically and reports through `--self-check`.
- Three original visual themes (`--theme classic|neon|amber`) over the one scene painter, so parity holds on every backend, plus `--reduced-flash` for steady energizers and fright. Settings persist in an XDG config file (`--save-config` writes the effective setup; every field validated on load).
- Persistent top-10 high scores with in-terminal pilot-name entry (type A-Z 0-9, Enter saves, Esc skips); `--scores` prints the table.
- Test suite: 334 pytest cases covering maze invariants, movement feel, scoring and lives, ghost personalities and wave/fright/house/Elroy behavior with displacement regression pins, fruit and all four modes, theme painting with flash steadiness, score and config persistence, name entry, determinism, atlas determinism, scene parity across backends, kitty stale-placement erases with text underlays, the responsive canvas (layout thresholds, verbatim maze blits, live dashboards, full-terminal play-loop drives, mid-run resizes), protocol byte capture with transmit-once and fps-cap proofs, watchdog degradation, key decoding with partial-escape holds and remap validation, synth voice rendering with honest audio degrade, terminal teardown on real and fake ttys, menu flows with a scripted headless playthrough, the 57-row gameplay/size/layout/capability/input/parity verification matrix, input-latency and sim-tick benchmarks, and CLI behavior.

## Verification and scoreboard

`--verify` runs the full 57-row matrix (gameplay transitions, collisions, power-ups, game-over, restart, terminal sizes, responsive-layout regions, renderer capabilities, input methods, fallback parity) with a non-zero exit on any failure. `--input-bench` reports key-decode throughput and per-tick simulation cost; `--scoreboard` prints the published renderer/input scoreboard for your machine (reference numbers: unicode ~1,118 fps, kitty ~694 fps, sixel ~94 fps headless; decode ~2.1M keys/s; sim ~14 us/tick against the 8,333 us 120 Hz budget). Full writeups live in `docs/verification.md` and `docs/scoreboard.md`.

## What is next

The game is complete and verified: every owner-spec item (modern terminal graphics with fallback, full mechanics, menus, scores, modes, themes, published scoreboard) is implemented, tested, and documented.

## Layout

- `pacman.py` - launcher (adds `src/` to the path, no install needed)
- `src/engine/` - pure simulation: `tuning`, `rng`, `maze`, `actors`, `ghosts`, `game`, `replay`
- `src/render/` - output backends: `protocol`, `framebuffer`, `ansi`, `unicode`, `kitty`, `sixel`, `detect`, `atlas`, `scene`, `layout` (responsive regions), `compose` (fullscreen canvas), `manager`
- `src/shell/` - interactive play: `cli`, `input` (decoding plus keymap), `terminal` (raw mode plus size guard), `screens` (full-size title/pause/over cards), `app` (flows plus canvas frame loop), `audio` (null/bell/synth), `verify` (gameplay/size/layout/capability/input/parity matrices plus input and render benches)
- `tests/` - pytest suite (`python3 -m pytest pacman/tests -q`)
- `docs/` - unified product documentation (`verification.md`, `scoreboard.md`)
