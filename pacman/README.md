# Pac-Man Terminal Arcade

A complete, polished Pac-Man arcade experience that runs directly in the terminal. The game treats the window as a full-screen canvas: the maze playfield magnifies to fill whatever terminal size you give it (up to 4x per axis on roomy windows), HUD text always renders crisp at native size, live dashboards dress the margins, and short windows (including the 80x24 default) play through a follow-cam viewport that tracks the player. Modern terminals (Kitty, Ghostty, WezTerm, Konsole) get sprite-grade visuals through the Kitty graphics protocol, Windows Terminal is covered via Sixel, and a truecolor Unicode text fallback guarantees the game plays everywhere, including headless CI and legacy consoles.

Clean-room rule: all code, art, audio, mazes, and tuning tables are originals written for this project. No ROMs, no ripped sprites, no copied sources.

## Quickstart

Requirements: Python 3.11 or newer. No install step is required (the guaranteed play path uses only the standard library), or install it as a real package: `pip install ./pacman` (add `[images]` for `Pillow`, which unlocks the Kitty/Sixel sprite backends), then run `pacman-terminal-arcade --play`. `pacman-terminal-arcade --version` prints the installed version.

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
python3 pacman/pacman.py --play --level 5
python3 pacman/pacman.py --version
```

## What works today

- Deterministic headless engine: original 28x31 symmetric maze with tunnel and ghost house, 282 dots plus 4 energizers (every pickup flood-fill verified reachable), tile-center movement with buffered turns and cornering assist, bonus fruit ripening twice per level under the ghost house with tier points and a fixed expiry window, scoring with ghost-chain bonuses and extra life, lives with death and respawn sequences, endless level progression with a speed ramp (`--levels N` prints it). Clearing a maze advances to the next level; the starting level is user-selectable (`--level N`, the in-game settings screen cycles 1..32, persisted to the config file).
- Four ghost personalities with distinct chase styles (direct pursuit, ahead-ambush, pincer-mirror, shy retreat), alternating scatter/chase waves with about-face reversals, power-pellet fright with flashing warning and 200-400-800-1600 chains, eye returns that revive at the house door, dot-counter plus idle-timeout house exits, tunnel slowdown, and a late-level leader enrage that pins chase.
- Seeded simulation with split RNG streams and replay hashes: identical inputs reproduce bit-identical state on any machine.
- Tiered renderer: one scene painter feeds every backend, so maze, entity, and HUD positions match within one cell everywhere. The Kitty backend transmits a cached original sprite atlas once and places per frame with cursor-anchored text fallback; the Sixel backend rasterizes dirty regions with a bounded palette and caps itself at 10 fps; the Unicode reference backend emits only changed cells inside synchronized output. A watchdog steps down one tier on backend errors or repeated slow frames and never raises out of `present`.
- Responsive fullscreen canvas: a pure layout engine maps the live terminal size to regions and a composer paints one frame that always matches the terminal dimensions, so every cell of the window is intentional. A magnification engine grows the maze playfield to fill the window (up to 4x per axis; single-tall windows cap width at 2x so the side chrome fills the rest instead of stretching glyphs), while the HUD text rows always render at native size centered over the maze, so letters stay crisp at every magnification (`--scale auto|classic|wide|full`, `--layout-check` reports the choice). Image backends place one multi-cell sprite per maze block and text backends draw the magnified playfield, so all three stay in agreement. Roomy windows gain a live score/run/progress dashboard plus the controls-and-legend panel and title/hint strips; short windows down to 28x16 (including the 80x24 default) play through a follow-cam viewport that tracks the player with the camera resting at the maze edges. Resizes re-layout and repaint from a clean slate on every backend.
- Animated visuals with six original themes: the player mouth opens and closes (glyph plus closed-mouth sprites), energizers pulse, fruit sparkles, dying plays a four-frame sequence, and cleared mazes celebrate with rainbow walls (`--effects`/`--no-effects`, steady mode via `--reduced-flash`). Themes (`--theme classic|neon|amber|midnight|forest|ember`) each bring a wall-drawing style and a margin chrome pattern over the one scene painter, so parity holds on every backend. Settings persist in an XDG config file (`--save-config` writes the effective setup; every field validated on load).
- Interactive shell: navigable title, pause, and game-over menus (up/down plus ENTER, every item does real work: start, resume, restart, session mute toggle, help, scores, settings, quit to title, quit), a live help card showing the true bindings, and the full flows around the live simulation, played at a paced 30 fps with a fixed 120 Hz timestep. Keys are remappable (`--bind up=k`, arrows and Esc/Ctrl-C/Enter always work, `M` mutes, `?` opens help, `--keys` prints the table); slow-terminal partial escape sequences are held, never misread. An in-game settings screen (title and pause menus) cycles theme, ruleset, starting level, magnification, animation, and flash live with left/right, persists every change to the config file, and honestly defers the ruleset and level to the next run. Audio is pluggable (`--audio null|bell|synth|auto`): original synthesized voices through a real system player when one exists, terminal bell otherwise, with dot chirps throttled so the mix stays intelligible. Raw mode always restores the terminal on exit, even on crashes, and undersized windows get an honest too-small screen instead of a garbled maze.
- Four honest rulesets (`--mode classic|time-attack|sprint|fright-frenzy`): the standard loop, 120 seconds on a refilling maze, a one-life no-fright race against the clock with a par-time bonus, and 4x fright windows with slower ghosts. Every mode replays deterministically and reports through `--self-check`.
- Persistent top-10 high scores with in-terminal pilot-name entry (type A-Z 0-9, Enter saves, Esc skips); `--scores` prints the table.
- Test suite: 495 pytest cases covering maze invariants, movement feel, scoring and lives, ghost personalities and wave/fright/house/Elroy behavior with displacement regression pins, fruit and all four modes, theme painting with flash steadiness, score and config persistence, name entry, determinism, atlas determinism, scene parity across backends, kitty stale-placement erases with text underlays, the responsive canvas (layout thresholds, 1x-verbatim frames, live dashboards, full-terminal play-loop drives, mid-run resizes), magnification (fill-to-space scale selection up to 4x with the aspect cap, HUD-at-1x blits with image spans, multi-cell kitty placements), the follow-cam viewport (camera clamps, 28x16 floor, player visibility), user-selectable starting levels, installable packaging (pyproject metadata plus console-script entry), tick animation frames (mouth, pulse, death, rainbow, sparkles), six-theme registry with wall styles, protocol byte capture with transmit-once and fps-cap proofs, watchdog degradation, key decoding with partial-escape holds and remap validation, navigable menus with session mute, live help, an in-game settings screen with config-file persistence, plus quit-to-title flows, synth voice rendering with honest audio degrade, terminal teardown on real and fake ttys, menu flows with a scripted headless playthrough, true-pty tours across sizes and backends, the 106-row gameplay/size/layout/visual/capability/input/controls/settings/fullscreen/parity verification matrix, input-latency and sim-tick benchmarks, and CLI behavior.

## Verification and scoreboard

`--verify` runs the full 106-row matrix (gameplay transitions, collisions, power-ups, game-over, restart, terminal sizes, responsive-layout regions, scaled visuals and effects, renderer capabilities, input methods, thoughtful controls and menus, custom settings, fullscreen clarity/fill/viewport/smoothness, fallback parity) with a non-zero exit on any failure. `--input-bench` reports key-decode throughput and per-tick simulation cost; `--scoreboard` prints the published renderer/input/canvas scoreboard for your machine (reference numbers: unicode ~1508 fps, kitty ~687 fps, sixel ~109 fps headless; canvas compose ~239 fps for a 120x50 effects-on frame; decode ~2.9M keys/s; sim ~10 us/tick against the 8,333 us 120 Hz budget). Full writeups live in `docs/verification.md` and `docs/scoreboard.md`.

## What is next

The game is complete and verified: every owner-spec item (modern terminal graphics with fallback, full mechanics, menus, scores, modes, themes, published scoreboard) is implemented, tested, and documented.

## Layout

- `pacman.py` - launcher (adds `src/` to the path, no install needed)
- `pyproject.toml` - installable packaging (`pip install ./pacman`, `pacman-terminal-arcade` console script)
- `src/engine/` - pure simulation: `tuning`, `rng`, `maze`, `actors`, `ghosts`, `game`, `replay`
- `src/render/` - output backends: `protocol`, `framebuffer`, `ansi`, `unicode`, `kitty`, `sixel`, `detect`, `atlas`, `scene`, `scale` (fill-to-space magnification), `effects` (tick animation frames), `layout` (responsive regions plus viewport floor), `compose` (fullscreen canvas plus follow-cam viewport), `manager`
- `src/shell/` - interactive play: `cli`, `input` (decoding plus keymap), `menus` (pure title/pause/over/settings navigation), `settings` (pure option model plus cycling, incl. starting level), `terminal` (raw mode plus size guard), `screens` (full-size title/pause/over/help/scores/settings cards), `app` (menu flows plus canvas frame loop), `audio` (null/bell/synth), `verify` (gameplay/size/layout/visual/capability/input/controls/settings/fullscreen/parity matrices plus input, render, and canvas benches)
- `tests/` - pytest suite (`python3 -m pytest pacman/tests -q`)
- `docs/` - unified product documentation (`verification.md`, `scoreboard.md`)
