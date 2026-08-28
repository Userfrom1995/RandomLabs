# Shaftcast

A first-person raycasting engine that renders a pseudo-3D, Wolfenstein-style
view straight into the terminal — a small, dependency-free Python CLI that
builds the classic "fake 3D" from a 2D grid map using nothing but the Python
standard library. DDA ray casting per screen column, distance-based ASCII
shading, first-person WASD movement, per-tile textures, a minimap overlay,
built-in maps, a maze generator, and a simple text-file map format for
hand-rolled levels.

## What Was Built

A single-file Python package (`shaftcast/shaftcast.py`) that renders a
first-person view directly to the terminal, using only `argparse`, `math`,
`random`, `shutil`, `sys`, and `time` (plus `termios`/`tty`/`select` on POSIX
for raw keyboard input):

- **DDA raycasting** — for every screen column a ray is cast through the grid
  using the Digital Differential Analyzer: at each step it advances whichever
  DDA axis distance is smaller, jumping from one grid line to the next until a
  wall cell is entered. The perpendicular wall distance drives the wall slice's
  height (`lineHeight = height / perp`), which is what sells the depth.
- **ASCII shading** — wall columns are drawn glyph-per-row from a
  bright-to-dark ramp (`#%+~.`), so nearby walls are bright and far walls fade.
  Walls hit on their y-axis are dimmed for a subtle directional cue. Each wall
  character can carry its own ramp, giving per-tile textures that are as simple
  as picking a new character in the map file.
- **First-person movement** — WASD to walk/strafe, arrow keys or Q/E to turn.
  Movement checks the X and Y axes independently so the camera slides along
  walls; turning rotates the direction vector and camera plane together. The
  frame loop is paced with `time.monotonic` and sized to the terminal via
  `shutil.get_terminal_size`.
- **Map editor convenience** — maps are plain text files (one char per cell,
  one row per line) with comment support and automatic row padding. A built-in
  `--maze WIDTHxHEIGHT` generator carves a random perfect maze with a
  recursive-backtracking DFS and a `--seed` flag for reproducible layouts.
- **Minimap overlay** — an optional 2D top-down view of the world grid is
  drawn into the bottom-left corner, centered on the player, reusing the map's
  own characters.
- **Three run modes** — interactive raw-mode loop (TTY), autopilot animation
  (no input), and a `--frames N` non-interactive dump that is trivial to pipe
  or diff and makes the engine fully testable headlessly.

## Why

Pseudo-3D from a 2D grid is one of the most satisfying graphics tricks that
needs no GPU and no math library — a few integer DDA steps plus simple
trigonometry. It fills the "retro FPS / raycasting" niche in this repo, which
so far held terminal cellular automata, an Enigma simulator, a genetic
algorithm, and browser games, but no interactive first-person view. It is
compact enough for a single session, fun to watch, and a great teaching piece
for how real games faked 3D before GPUs existed.

## How It Works

- **DDA core** (`cast_ray`) — computes per-axis DDA deltas, steps the grid
  cell-by-cell, records which side the wall was hit on, and returns the
  perpendicular distance plus the exact fractional hit coordinate for
  texturing.
- **Rendering** (`render_frame`) — a pure function: for each column it casts a
  ray, computes the wall slice bounds from `height / perp`, fills ceiling and
  floor rows with a row-distance gradient, and draws the wall with the ramp
  glyph. The minimap is a pure post-process overlay over the frame grid, so
  everything is unit-testable without a terminal.
- **Camera** (`Player`) — position plus a unit direction vector and a
  perpendicular camera plane whose length encodes the FOV (`tan(fov/2)`); all
  movement and rotation math reduces to vector ops.
- **Input** (`_KeyReader`) — an incremental escape-sequence parser so arrow
  keys split across reads never corrupt the stream; held keys use a short
  timeout so movement stops cleanly on release.

## Key Files

- `shaftcast/shaftcast.py` — the entire engine + CLI: map parsing, maze
  generator, DDA raycaster, shading, rendering, input, and the three run modes.
- `shaftcast/__main__.py` + `shaftcast/__init__.py` — package entry points for
  `python3 -m shaftcast` and the public exports.
- `shaftcast/README.md` — project README with quick-start, controls, option
  table, and map format reference.
- `shaftcast/examples/small-room.map` and `courtyard.map` — example maps
  demonstrating the text format, textures, and comment syntax.
- `shaftcast/tests/test_shaftcast.py` — 49 stdlib-`unittest` tests covering
  parsing, maze connectivity, camera math, ray distances, shading, rendering,
  and the CLI surface.
- `docs/index.md` + `docs/index.html` — documentation site (served on GitHub
  Pages under `/docs/`).

## Notes

- **Everything is pure at the core** — parsing, casting, shading, and frame
  rendering are side-effect-free functions, which made the test suite (49
  tests) straightforward and keeps the door open for reuse (e.g. a web
  front-end could call the same renderer).
- **Default view** — `--builtin demo` starts in a little brick room facing a
  corridor; `--maze 21x31` produces a bigger explorable labyrinth;
  `--map shaftcast/examples/courtyard.map --minimap` shows off textures and
  the overlay together.
- **Headless-friendly** — with stdout fully piped the CLI renders one frame
  and exits instead of hanging, so it composes with scripts and CI.
- **Scope choice** — walls are drawn solid glyph columns (no horizontal
  texture sampling on wall slices), keeping the code and shading crisp and the
  frame dump stable; a full textured-wall renderer with per-column texel
  sampling would be a natural future upgrade.
