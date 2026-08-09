# Shaftcast — A First-Person Raycasting Engine in the Terminal

**Shaftcast** is a small, dependency-free Python CLI that renders a pseudo-3D,
Wolfenstein-style view straight into your terminal. It casts a ray through a
2D grid map for every screen column using the **Digital Differential Analyzer
(DDA)** algorithm, finds the first wall each ray hits, and scales the wall
slice's height by the ray length to fake depth perspective. Walls are shaded
with a distance-based luminance ramp, per-tile textures and ceiling/floor
fills are optional, and a 2D minimap overlay can be drawn in the corner.

It runs on nothing but the Python standard library (`argparse`, `math`,
`random`, `shutil`, `sys`, `time`, plus `termios`/`tty`/`select` on POSIX) —
no external packages, no assets, no GPU.

```text
WASD move · Q/E or ←→ turn · M minimap · F fill · T textures · ESC quit
```

---

## What it is

- **DDA raycasting** — one ray per screen column. Each ray steps through the
  grid cell-by-cell, always advancing along the shorter DDA axis, until it
  crosses a wall. The perpendicular wall distance is used to compute the wall
  slice's on-screen height, producing convincing depth.
- **ASCII shading** — wall columns fade with distance through a bright-to-dark
  ramp such as `#%+~.`; nearby walls are bright, far walls fade away. Walls hit
  on their y-axis are dimmed, and each distinct wall character can carry its
  own ramp for a per-tile texturing effect.
- **First-person movement** — WASD to walk and strafe, arrow keys or Q/E to
  turn, with per-axis collision checking so the camera slides along walls.
  The render grid is sized to your terminal via `shutil.get_terminal_size`
  and paced by a `time`-based frame loop.
- **Map editor convenience** — load any map from a small text file (with
  comment support and automatic padding), choose a built-in map, or generate a
  random perfect maze with `--maze WIDTHxHEIGHT` (deterministic via `--seed`).
  An optional 2D minimap overlay shows the world around the player.
- **Three run modes** — interactive raw-mode keyboard loop (needs a TTY),
  autopilot animation (no input needed), and a non-interactive frame dump
  (`--frames N`) that is easy to pipe, diff, or test.

## Running it

Shaftcast is a Python package in `shaftcast/`. Python 3.8+ is all you need.

```bash
# Interactive first-person mode (needs a real terminal)
python3 -m shaftcast

# Render one frame and exit
python3 -m shaftcast --frames 1

# Generate a random perfect maze (deterministic with --seed)
python3 -m shaftcast --maze 21x31 --seed 42

# Load a map file with a minimap overlay
python3 -m shaftcast --map shaftcast/examples/courtyard.map --minimap

# Autopilot: let the camera turn itself while you watch
python3 -m shaftcast --autopilot
```

The single file also runs directly: `python3 shaftcast/shaftcast.py --frames 1`.

### Controls (interactive mode)

| Key | Action |
| --- | --- |
| `W` / `↑` | Walk forward |
| `S` / `↓` | Walk backward |
| `A` | Strafe left |
| `D` | Strafe right |
| `Q` / `←` | Turn left |
| `E` / `→` | Turn right |
| `M` | Toggle the minimap overlay |
| `F` | Toggle ceiling/floor fills |
| `T` | Toggle per-tile textures |
| `ESC` / `Ctrl-C` | Quit |

### Run modes

- **Interactive** — selected automatically when stdin and stdout are TTYs. It
  reads raw keypresses with `termios`, clears and redraws each frame, and
  hides the cursor for the duration.
- **Autopilot** — `--autopilot` (or when stdout is a TTY but stdin is not)
  slowly turns the camera so the world can be watched hands-free; `Ctrl-C`
  stops it.
- **Frame dump** — `--frames N` renders N frames to stdout, each preceded by a
  header line (`Shaftcast 1.0.0 | frame 1/2 | 80x24 | ...`). When output is
  fully piped, one frame is dumped automatically so the command never hangs.

### Running the tests

```bash
python3 -m unittest discover -s shaftcast/tests
```

The 49 tests cover map parsing, maze generation, camera math, DDA ray casting,
shading, frame rendering, and the full CLI surface.

## Configuration

| Option | Default | Description |
| --- | --- | --- |
| `--map FILE` | | Load a map from a text file. |
| `--maze WIDTHxHEIGHT` | | Generate a random perfect maze (min `5x5`). |
| `--builtin NAME` | `demo` | Built-in map: `demo`, `fort`, `castle`. |
| `--seed N` | random | RNG seed for `--maze` (reproducible mazes). |
| `--width N` | terminal | Render width in columns (4–400). |
| `--height N` | terminal | Render height in rows (4–200). |
| `--fps N` | `20` | Frame rate target for interactive/autopilot. |
| `--fov DEG` | `66` | Horizontal field of view in degrees. |
| `--max-dist N` | `12` | Render distance in grid cells. |
| `--frames N` | | Render N frames and exit (non-interactive dump). |
| `--fill MODE` | `both` | Ceiling/floor fills: `none`, `ceiling`, `floor`, `both`. |
| `--minimap` | off | Overlay a 2D minimap in the bottom-left corner. |
| `--no-textures` | off | Use the same ramp for every wall. |
| `--autopilot` | off | Rotate the camera automatically. |

### Map format

A map is a plain-text grid, one character per cell, one row per line:

```text
###########
#.........#
#...###...#
#...#.#...#
#...###...#
#....>....#
#.........#
###########
```

| Character | Meaning |
| --- | --- |
| `#` | Wall with the default brick ramp. |
| `%`, `=`, `+`, `*`, `$`, `@`, `P`, ... | Wall with its own per-tile ramp. |
| `.`, ` `, `,`, `-`, `_` | Empty floor. |
| `@` / `>` | Player spawn, facing east. |
| `<` | Player spawn, facing west. |
| `^` | Player spawn, facing north. |
| `v` | Player spawn, facing south. |

Rules: exactly one player spawn is required; rows are padded to a common width
automatically; cells outside the grid are walls; lines starting with `# ` (and
blank lines) are comments. Any character that is neither floor nor a spawn
marker becomes a wall, so adding a new texture is a one-character change. Two
example maps ship in `shaftcast/examples/`: `small-room.map` and
`courtyard.map`.

## How it works

### 1. The DDA ray cast

For each screen column `x`, the ray direction is the camera direction plus the
camera plane scaled by `2*x/width - 1` (so the left and right edges of the
screen spread the field of view). The ray then marches through the grid using
the DDA: at every step it advances whichever of `sideX`/`sideY` is smaller,
jumping from one grid line to the next, until the cell it enters is a wall.
The perpendicular distance to that wall (`perp = side - delta` on the hit
axis) is what produces the depth effect: `lineHeight = height / perp`, drawn
centered around the horizon.

### 2. ASCII shading

Wall columns are drawn one glyph per row between `drawStart` and `drawEnd`.
The glyph comes from a luminance ramp (`#` bright → `.` dark) indexed by the
normalized distance `distance / max_dist`; y-side hits are pushed toward the
dark end. Per-tile textures give each wall character its own ramp, and the
`--no-textures` flag collapses everything to the default ramp.

Ceiling and floor rows are filled (unless `--fill none`) with a subtle
gradient whose intensity follows an approximate row distance, computed from
how far the row is above or below the screen center.

### 3. Movement and collision

WASD and arrow/Q-E input map to world deltas via the camera's direction and
perpendicular vectors. Movement checks the X and Y axes independently:
`move(map, dx, dy)` only commits an axis if the target cell is not a wall, so
the camera slides along walls instead of sticking. Turning rotates both the
direction vector and the camera plane together by the same angle.

### 4. Input handling

A small incremental parser (`_KeyReader`) reads raw bytes and assembles
multi-byte escape sequences, so arrow keys split across reads are never
corrupted. Held keys are tracked with a short timeout: a key that stops
arriving is considered released, so movement stops cleanly.

### 5. Minimap overlay

The minimap draws a viewport of the world grid (centered on the player,
clipped to at most a third of the screen) into the bottom-left corner of the
frame, with `@` for the player and the map's own characters for walls and
floor. It is purely a post-process over the rendered frame, so it stays a
pure, testable operation.

## Project layout

```text
shaftcast/
  shaftcast.py         # the whole engine + CLI
  __main__.py          # enables `python -m shaftcast`
  __init__.py          # package marker / public exports
  README.md            # project quick-start and option reference
  examples/
    small-room.map     # minimal example map
    courtyard.map      # a little fort, complete with comment syntax
  tests/
    test_shaftcast.py  # 49 stdlib-unittest tests
docs/
  index.md             # this documentation page (source)
  index.html           # rendered documentation page
ideas/
  2026-08-09-shaftcast-terminal-raycasting.md
```

## Design notes

- **Pure core** — map parsing, ray casting, shading, and frame rendering are
  pure functions with no terminal side effects, so they are trivially
  testable and reusable.
- **Per-axis movement** — sliding along walls falls out naturally from
  checking each movement axis independently.
- **Robust input** — incremental escape-sequence parsing and held-key
  timeouts make the interactive loop reliable in real terminals.
- **Reproducible mazes** — `--seed` makes every generated maze repeatable,
  which also keeps tests deterministic.
