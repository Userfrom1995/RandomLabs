# Shaftcast

A first-person raycasting engine that renders a pseudo-3D,
Wolfenstein-style view straight into your terminal. For every screen column
Shaftcast casts a ray through a 2D grid map using the Digital Differential
Analyzer (DDA) algorithm, finds the first wall it hits, and scales that wall
slice's height by the ray length to fake depth perspective. Wall columns are
shaded with a distance-based luminance ramp, per-tile textures are supported,
and a 2D minimap overlay can be drawn in the corner.

Nothing but the Python standard library (`argparse`, `math`, `random`,
`shutil`, `sys`, `time`, plus `termios`/`tty`/`select` on POSIX) — no external
packages, no assets, no GPU.

- **DDA raycasting** — a ray per screen column steps cell-by-cell through the
  grid (choosing the shorter axis at each step) until it meets a wall; the
  perpendicular distance gives the wall slice's on-screen height.
- **ASCII shading** — walls fade with distance through a bright-to-dark ramp
  (`#%+~.` style), side (y-axis) walls are dimmed, and different wall
  characters get their own ramp for a per-tile texturing effect.
- **First-person movement** — WASD to walk/strafe, arrow keys or Q/E to turn,
  with wall collision and wall sliding. Runs at a fixed grid sized to your
  terminal via `shutil.get_terminal_size`, paced by a `time`-based frame loop.
- **Map editor convenience** — load any map from a small text file, pick a
  built-in map, or generate a random perfect maze (`--maze WIDTHxHEIGHT`,
  reproducible with `--seed`). Optional 2D minimap overlay.
- **Three run modes** — interactive raw-mode keyboard loop (needs a TTY),
  autopilot animation (no input needed), and a non-interactive frame dump
  (`--frames N`) that is easy to pipe, diff, or test.

## Quick start

```bash
# Interactive first-person mode (needs a real terminal)
python3 -m shaftcast

# Render one frame and exit
python3 -m shaftcast --frames 1

# Generate a random perfect maze (deterministic with --seed)
python3 -m shaftcast --maze 21x31 --seed 42

# Load a map file with a minimap overlay
python3 -m shaftcast --map shaftcast/examples/courtyard.map --minimap
```

The single file also runs directly:

```bash
python3 shaftcast/shaftcast.py --frames 1
```

## Controls (interactive mode)

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

## Options

| Option | Default | Description |
| --- | --- | --- |
| `--map FILE` | | Load a map from a text file. |
| `--maze WIDTHxHEIGHT` | | Generate a random perfect maze (min `5x5`, odd dimensions preferred). |
| `--builtin NAME` | `demo` | Use a built-in map: `demo`, `fort`, `castle`. |
| `--seed N` | random | RNG seed for `--maze` (reproducible mazes). |
| `--width N` | terminal width | Render width in columns (4–400). |
| `--height N` | terminal height | Render height in rows (4–200). |
| `--fps N` | `20` | Frame rate target for the interactive/autopilot loop. |
| `--fov DEG` | `66` | Horizontal field of view in degrees. |
| `--max-dist N` | `12` | Render distance in grid cells. |
| `--frames N` | | Render N frames and exit (non-interactive dump). |
| `--fill MODE` | `both` | Ceiling/floor fills: `none`, `ceiling`, `floor`, `both`. |
| `--minimap` | off | Overlay a 2D minimap in the bottom-left corner. |
| `--no-textures` | off | Use the same ramp for every wall (disable per-tile textures). |
| `--autopilot` | off | Rotate the camera automatically, no keyboard needed. |
| `--version` | | Print the version and exit. |

### Run modes

- **Interactive** — used automatically when stdin and stdout are TTYs. Reads
  raw keypresses with `termios`, clears and redraws each frame, and hides the
  cursor for the duration.
- **Autopilot** — `--autopilot` (or stdout-is-a-TTY but stdin-is-not) slowly
  turns the camera so the world can be watched hands-free; `Ctrl-C` stops it.
- **Frame dump** — `--frames N` renders N frames to stdout, each preceded by
  a header line (`Shaftcast 1.0.0 | frame 1/2 | 80x24 | ...`). When output is
  fully piped, one frame is dumped automatically so the command never hangs.

## Map format

A map is a plain-text grid. One character per cell, one row per line:

```
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
| `%`, `=`, `+`, `*`, `$`, `@`, `P`, ... | Wall with its own per-tile shading ramp. |
| `.`, ` `, `,`, `-`, `_` | Empty floor. |
| `@` / `>` | Player spawn, facing east. |
| `<` | Player spawn, facing west. |
| `^` | Player spawn, facing north. |
| `v` | Player spawn, facing south. |

Notes:

- A map must contain **exactly one** player spawn marker.
- Rows are padded to a common width with floor cells, so ragged edges are
  fine; cells outside the grid are treated as walls.
- Lines starting with `# ` (and fully blank lines) are ignored, so maps can
  carry comments. A wall row such as `####` is never mistaken for a comment.
- Any character that is neither floor nor a spawn marker becomes a wall, so
  experimenting with new texture characters is a one-character change.

Two example maps ship in `shaftcast/examples/`: `small-room.map` and
`courtyard.map`.

## Development

```bash
python3 -m unittest discover -s shaftcast/tests
```

The 49 tests cover map parsing (padding, comments, spawn markers, error
cases), maze generation (dimensions, determinism, full connectivity), the
camera (rotation, plane/FOV math, collision sliding), DDA ray casting
(distances, first-hit, texture coordinates), shading, frame rendering
(dimensions, fills, minimap, determinism), and the CLI surface (version, help,
dumps, maze output, error handling).

## Design notes

- **Pure core** — map parsing, ray casting, shading, and frame rendering are
  pure functions with no terminal side effects, so they are trivially testable
  and reusable (e.g. a web front end could reuse the renderer).
- **Per-axis movement** — movement checks the X and Y axes independently, so
  the camera slides along walls instead of jamming into them; turning rotates
  both the direction vector and the camera plane together.
- **Aspect-aware** — line heights are computed against the render height
  directly; on a typical 2:1 character cell the view reads as a wide
  first-person FOV, and `--fov`/`--width`/`--height` can re-shape it.
- **Robust input** — the key reader is an incremental escape-sequence parser,
  so arrow keys split across reads never corrupt the stream; held keys use a
  timeout so movement stops cleanly when the key is released.
