# Pac-Man Terminal Arcade - Documentation

## Architecture

The system is split into a pure simulation and a string-based presentation layer, joined later by the interactive terminal loop. The simulation never imports presentation or OS modules, so replays, tests, and benchmarks run identically on every machine.

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
- `unicode.py` - the reference backend and guaranteed play path: alternate screen, hidden cursor, DEC 2026 synchronized output, only changed cells emitted. Every other backend matches its layout within one cell.
- `kitty.py` - transmit-once atlas framing (`a=T`, chunked, quiet mode) with per-frame placements (`a=p`); image encoding stays with the caller so the wire format is testable without Pillow.
- `sixel.py` - DCS framing with a genuine solid-rectangle encoder; full scene rasterization follows with the tiered renderer.
- `detect.py` - capability detection: explicit flag beats `PACMAN_RENDERER`, which beats environment heuristics, which fall through to Unicode. Image backends additionally require Pillow and degrade honestly without it.

### Command line (`src/shell/`)

Every flag maps to working logic: `--maze-check` validates dimensions, counts, and connectivity; `--self-check` runs a greedy BFS autopilot headlessly and prints the score line (now including ghosts eaten, deaths, fright and wave mode) plus the state hash; `--renderer`, `--seed`, `--level`, and `--ticks` parameterize both. Misuse exits non-zero with a clear error.

## Verification

Run `python3 -m pytest pacman/tests -q` (101 cases): maze symmetry and reachability, movement feel (buffering, reversal, wall halts, tunnel wrap, wall-collision fuzz), scoring and lives, ghost personalities with wave, fright, house-exit, tunnel, Elroy, eyes, and collision coverage plus a ghost wall-safety fuzz, cross-process determinism with golden stream values, tick-rate independence (30 Hz chunks converge with 120 Hz steps), protocol byte capture, and CLI behavior. The seed-1 self-check pin was resurveyed when ghost AI entered the simulation (170 dots in 2400 ticks, up from 167, with the autopilot outrunning every hunter).
