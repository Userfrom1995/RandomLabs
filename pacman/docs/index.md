# Pac-Man Terminal Arcade - Documentation

## Architecture

The system is split into a pure simulation, a string-based presentation layer, and the interactive shell that joins them. The simulation never imports presentation or OS modules, so replays, tests, and benchmarks run identically on every machine.

### Simulation (`src/engine/`)

- `tuning.py` - the single home for every gameplay number: speeds, wave clock, fright curve, scoring chains, fruit tiers, house counters, Elroy stages. All tables are authored originals with provenance comments.
- `rng.py` - seeded mulberry32 with forkable named streams, so visual-only changes can never shift simulation hashes. Name mixing uses SHA-256 (never the salted builtin hash), keeping streams identical across processes.
- `maze.py` - the original 28x31 symmetric layout: walls, 282 dots, 4 energizers, a side tunnel row with horizontal wrap, and a central ghost house with a ghosts-only door. Walkability is queried per actor kind; a flood fill proves every pickup is reachable from spawn.
- `actors.py` - continuous tile-unit positions with tile-center movement: instant reversal, buffered perpendicular turns that latch near tile centers with a corner cut, exact halts on tile centers against walls, and tunnel wrapping.
- `game.py` - the fixed 120 Hz state machine: dot and energizer pickup, scoring with ghost chains and a one-time extra life, death and respawn sequences, game over, and endless level transitions with maze regeneration. Exposes `state_hash()` over a canonical snapshot for determinism proofs.
- `ghosts.py` - the four ghost roles (direct chaser, ahead ambusher, pincer flanker, shy drifter) with per-corner scatter targets, the scatter/chase wave clock with about-face reversals, fright timing with flashing warning and chain scoring, eye returns that revive at the door, dot-counter plus idle-timeout house exits with a scripted walk-out, tunnel slowdown, and Elroy enrage stages. Collision resolution lives here: frightened hunters are eaten for chain points, active ones cost a life, eyes pass through.
- `replay.py` - input logs plus state hashes: re-running a recording must reproduce the hash bit-for-bit.

### Presentation (`src/render/`)

- `protocol.py` - the `RenderBackend` interface: `init`, `present`, `clear`, `shutdown`, all pure functions returning the exact bytes to write. Tests capture those strings, so terminal behavior is verified without a terminal.
- `framebuffer.py` - the cell grid (glyph plus truecolor fg/bg plus optional sprite id) with dirty-set tracking; per-frame encode cost is O(dirty).
- `scene.py` - the parity anchor: paints HUD (score, lives, mode), maze (box-drawn walls, dots, blinking energizers), and actors (directional player, per-personality ghosts, fright/flash/eyes states) into one 28x34 FrameBuffer every backend shares.
- `atlas.py` - the original sprite raster source: Pillow-drawn disc bodies with wedge mouths and dot eyes, cached by id, PNG-encoded for transmit; raises an actionable error without Pillow instead of guessing.
- `unicode.py` - the reference backend and guaranteed play path: alternate screen, hidden cursor, DEC 2026 synchronized output, only changed cells emitted. Every other backend matches its layout within one cell.
- `kitty.py` - the image backend: atlas transmit once (`a=T`, chunked, quiet mode), cursor-anchored placements (`a=p`) per dirty sprite cell, truecolor text for glyph cells so parity holds.
- `sixel.py` - the raster backend: dirty-region bounding box rasterized (glyphs via the built-in font, sprites pasted from the atlas), quantized to a bounded palette, emitted as band data with run-length compression; a minimum frame interval coalesces faster callers and `present` never sleeps.
- `detect.py` - capability detection: explicit flag beats `PACMAN_RENDERER`, which beats environment heuristics, which fall through to Unicode. Image backends additionally require Pillow and degrade honestly without it.
- `manager.py` - the tier: backend factory plus `TieredRenderer`, which chains the detected choice over the remaining tiers with Unicode always last and steps down on backend errors or two consecutive slow frames. `present` never raises; drops are counted, not hidden.

### Command line (`src/shell/`)

Every flag maps to working logic: `--maze-check` validates dimensions, counts, and connectivity; `--self-check` runs a greedy BFS autopilot headlessly and prints the score line (now including ghosts eaten, deaths, fright and wave mode) plus the state hash; `--render-check` paints one scene and presents it through the tiered renderer with byte counts; `--render-bench` prints per-backend present() throughput; `--play` starts the interactive game (refuses cleanly without a tty); `--audio` picks the sound backend with honest synth-to-bell degrade; `--bind` remaps keys with validation and `--keys` prints the table; `--fps` paces the frame loop; `--renderer`, `--seed`, `--level`, `--ticks`, and `--frames` parameterize them. Misuse exits non-zero with a clear error.

### Interactive shell (`src/shell/`)

- `input.py` - the key decoder: arrow keys (CSI and SS3), WASD/vim defaults, Esc for pause, Ctrl-C for quit, Enter/Space for confirm, R for restart. Single-char bindings remap through a validated `Keymap` (unknown actions, multi-char keys, and duplicates rejected); trailing partial escape sequences are held for the next read so slow terminals never turn an arrow into a pause.
- `terminal.py` - `RawTerminal`: raw mode on entry, guaranteed restore of the saved attributes on exit (restore failures counted, never masking the loop's exception), non-blocking reads, current-size queries, and a pure minimum-size check that routes undersized windows to a too-small card.
- `screens.py` - title, pause, game-over, and too-small cards painted as FrameBuffers in the shared 28x34 geometry, so every backend presents them unchanged; pause and game-over overlay the live game frame.
- `app.py` - the flow machine (title, playing, pause, restart, game-over) plus the frame loop: fixed 120 Hz simulation steps under paced display frames, pause genuinely freezing the sim, sounds following real game events with throttled dot chirps, renderer shutdown plus audio shutdown in a `finally` that survives loop crashes.
- `audio.py` - pluggable sound: null (counts, silent), bell (BEL chars drained into the frame stream), and synth (original PCM voices rendered with the stdlib and handed to a real system player on a daemon thread, never blocking; spawn failures counted, never raised). Selection degrades synth to bell when no player exists.

## Verification

Run `python3 -m pytest pacman/tests -q` (188 cases): maze symmetry and reachability, movement feel (buffering, reversal, wall halts, tunnel wrap, wall-collision fuzz), scoring and lives, ghost personalities with wave, fright, house-exit, tunnel, Elroy, eyes, and collision coverage plus a ghost wall-safety fuzz, cross-process determinism with golden stream values, tick-rate independence (30 Hz chunks converge with 120 Hz steps), atlas determinism with cache proofs, scene parity across backends with transmit-once and fps-cap proofs, watchdog degradation on errors and slow frames, protocol byte capture, key decoding with partial-escape holds and remap validation, synth voice rendering with honest audio degrade, terminal teardown on real and fake ttys, menu flows with a scripted headless playthrough, and CLI behavior. The seed-1 self-check pin was resurveyed when ghost AI entered the simulation (170 dots in 2400 ticks, up from 167, with the autopilot outrunning every hunter). Image-backend tests need Pillow; without it they fail honestly (the Unicode path always plays).
