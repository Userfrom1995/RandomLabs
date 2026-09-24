# Fernwald

A small, dependency-free Python CLI that grows procedural plants, trees, and
fractals from **L-system grammar rules** and renders them straight into the
terminal as ASCII art (with an optional **SVG export**).

A Lindenmayer system models plant growth as string rewriting: a seed string
(the *axiom*) is rewritten a fixed number of times by a set of production
*rules*, and the resulting command string is walked by a turtle that translates
symbols into drawing commands (`F` = forward, `+`/`-` = turn, `[`/`]` = push /
pop the branch stack). The same tiny engine draws a leafy tree, a
Barnsley-style fern, a Sierpinski triangle, a dragon curve, or a Koch snowflake
simply by swapping rule sets.

Nothing but the Python standard library (`argparse`, `math`, `random`, `re`,
`shutil`, `sys`, `time`) — no dependencies, no build step.

## Quick start

```bash
# A leafy tree (the default preset)
python3 -m fernwald

# The Barnsley-style fern
python3 -m fernwald --preset fern --iterations 5

# Print all built-in grammars
python3 -m fernwald --list-presets

# A custom grammar inline, exported as print-quality SVG
python3 -m fernwald --rules 'A: F[+A][-A]' --seed 1 --svg > garden.svg

# A reproducible stochastic garden, shaded by stroke density
python3 -m fernwald --preset wild --seed 7 --style shade

# Watch the plant grow step by step (needs a TTY)
python3 -m fernwald --preset plant --animate
```

The single file also runs directly: `python3 fernwald/fernwald.py --preset koch`.

## Presets

`--list-presets` prints every built-in grammar with its rules:

| Preset | Axiom | Angle | Iterations | What you get |
| --- | --- | --- | --- | --- |
| `tree` | `F` | 30° | 5 | A symmetric leafy tree with a trunk. |
| `fern` | `X` | 25° | 5 | The classic Barnsley-style branching plant. |
| `plant` | `X` | 20° | 6 | A dense leafy bush. |
| `sierpinski` | `F-G-G` | 120° | 5 | The Sierpinski triangle. |
| `dragon` | `FX` | 90° | 12 | The Heighway dragon curve. |
| `koch` | `F++F++F` | 60° | 4 | The Koch snowflake. |
| `wild` | `F` | 22.5° | 6 | A stochastic garden — needs `--seed` to reproduce. |

`--axiom`, `--angle`, and `--iterations` override any part of the chosen
grammar: `python3 -m fernwald --preset koch --angle 60 --iterations 5`.

## Custom grammars

`--rules` accepts either an **inline string** or the **path to a `.grow` file**
(detected by checking whether the value names an existing file).

### Inline

```bash
python3 -m fernwald --rules 'A: F[+A][-A]' --angle 25.7 --iterations 6
```

Multiple rules are separated with `;`:

```bash
python3 -m fernwald --rules 'F: F-F++F-F; angle 60; axiom F++F++F; iterations 4'
```

### Grammar files

A `.grow` file is a list of statements — one production rule or one
directive per line, `;`-separated statements also work, `#` starts a comment:

```
# fernwald/examples/plant.grow
angle 20
axiom X
iterations 6
X: F[+X][-X]FX
F: FF
```

```bash
python3 -m fernwald --rules fernwald/examples/plant.grow
```

Directives: `angle DEG` (turn angle, 0 < angle ≤ 360), `axiom TEXT`, and
`iterations N`. Any value you omit falls back to the flag or built-in default;
if no axiom is given, the left-hand side of the first rule is used.

### The grammar alphabet

| Symbol | Meaning |
| --- | --- |
| `F`, `G` | Move forward one unit and draw a line. |
| `f`, `g` | Move forward one unit without drawing. |
| `+` | Turn left (counter-clockwise) by the angle. |
| `-` | Turn right by the angle. |
| `[` | Push the current position and heading (start a branch). |
| `]` | Pop the saved position and heading (back to the branch point). |
| other letters | Variables. Rewritten by rules if they have one, otherwise ignored by the turtle. |

### Stochastic rules

A rule may list several alternatives separated with `|`; Fernwald picks one at
random for every symbol during expansion:

```
F: F[+F][-F]F | F[+F]F[-F] | FF[+F][-F]
```

The choice is made with the RNG seeded by `--seed`, so the same seed always
grows the same garden. `--preset wild` is a ready-made stochastic grammar.

## Rendering

### ASCII

The turtle path is stroked into a character grid sized to your terminal
(override with `--width`/`--height`), scaled to fit with a blank-cell padding
(`--pad`) and corrected for the ~2:1 terminal cell aspect so plants look
geometrically right.

- `--style line` (default) shades each segment by its slope (`-`, `|`, `/`,
  `\`) and draws `*` at leaf tips — clean line art.
- `--style shade` accumulates stroke density per cell and maps it through a
  greyscale ramp (`.`, `:`, `=`, `#`, `@`, ...) for an organic, shaded look.

### SVG

`--svg` emits the same path as an SVG `<path>` (one `M...L...` command per
segment, so branch jumps never get spurious connector lines), scaled to fit a
square canvas (`--svg-width`/`--svg-height`, default 800×800) with leaf-tip
dots (`--no-leaves` to drop them). Customize the stroke with `--stroke`.

```bash
python3 -m fernwald --preset fern --svg --stroke '#1e7d46' > fern.svg
```

### Animation

`--animate` steps the iteration count from 0 up to `--iterations`, clearing and
redrawing each frame so the plant visibly grows (paced by `--delay`, default
0.4 s). Needs a TTY for the screen clears; piped output just prints every frame
sequentially.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `--preset NAME` | `tree` | Built-in grammar: `tree`, `fern`, `plant`, `sierpinski`, `dragon`, `koch`, `wild`. |
| `--rules TEXT` | | Custom grammar as inline text or a `.grow` file path. |
| `--axiom TEXT` | | Override the axiom. |
| `--angle DEG` | | Override the turn angle (0 < angle ≤ 360). |
| `--iterations N` | | Override the rewrite count (0–20). |
| `--seed N` | random | Seed for stochastic grammars (`wild`). |
| `--width COLS` | terminal | Render width (4–400). |
| `--height ROWS` | terminal−1 | Render height (4–400). |
| `--pad N` | `1` | Blank cells left around the drawing. |
| `--style` | `line` | `line` (slope-shaded) or `shade` (density ramp). |
| `--svg` | off | Emit SVG instead of ASCII. |
| `--svg-width` / `--svg-height` | `800` | SVG canvas size in pixels. |
| `--stroke COLOR` | `#2f9e63` | SVG stroke color. |
| `--no-leaves` | off | Omit the SVG leaf-tip dots. |
| `--animate` | off | Step the iteration count up so the plant grows. |
| `--delay SECS` | `0.4` | Seconds between `--animate` frames. |
| `--list-presets` | | Print the built-in grammars and exit. |
| `--version` | | Print the version and exit. |

Safety: grammars are capped at `_MAX_EXPANSION` = 2,000,000 symbols and
`_MAX_ITERATIONS` = 20, so an accidental exponential rule can never hang the
process.

## Development

```bash
python3 -m unittest discover -s fernwald/tests
```

The 71 tests cover rule expansion (determinism, seeding, the expansion cap),
grammar parsing (inline, files, directives, comments, alternatives, error
cases), turtle interpretation (bracket stack, tips, turns, movement), grid
fitting (bounds, aspect, y-flip), ASCII rendering (dimensions, glyphs, styles),
SVG export (structure, y-flip, leaf dots), and the CLI surface (presets,
errors, seeding, clamping).

## Design notes

- **Pure core** — expansion, interpretation, fitting, and rendering are pure
  functions with no terminal side effects, so they are trivially testable and
  reusable (e.g. a web front end could reuse the same pipeline).
- **One pass, one fit** — the whole turtle path is captured as line segments,
  fitted into the grid in a single bounding-box pass, and then stroked with
  sub-cell sampling so no gaps appear on steep diagonals.
- **Terminal-aware aspect** — horizontal turtle extents are stretched by the
  cell aspect ratio before scaling, so a unit step reads the same length
  whether it points up or sideways.
- **Reproducible gardens** — every stochastic choice flows through a seeded
  `random.Random`; the same `--seed` always grows the same plant.
