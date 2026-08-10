# Fernwald — A Terminal L-System Fractal Garden

**Fernwald** is a small, dependency-free Python CLI that grows procedural
plants, trees, and fractals from **L-system grammar rules** and renders them
straight into the terminal as ASCII art (with an optional **SVG export**).

Lindenmayer systems model plant growth as string rewriting: a seed string (the
*axiom*) is rewritten a fixed number of times by a set of production *rules*,
and the resulting command string is walked by a turtle that translates symbols
into drawing commands (`F` = forward, `+`/`-` = turn, `[`/`]` = push/pop the
branch stack). The same tiny engine draws a leafy tree, a Barnsley-style fern,
a Sierpinski triangle, a dragon curve, or a Koch snowflake simply by swapping
rule sets.

It runs on nothing but the Python standard library (`argparse`, `math`,
`random`, `re`, `shutil`, `sys`, `time`) — no dependencies, no build step.

```text
python3 -m fernwald --preset fern --iterations 5
python3 -m fernwald --preset wild --seed 7 --style shade
```

---

## What it is

- **Rule-set parser** — reads a grammar as an inline string or a `.grow` file:
  production rules (`F: F[+F][-F]F`) plus `angle`, `axiom`, and `iterations`
  directives, with `#` comments and `;`-separated statements.
- **Preset grammar library** — `tree`, `fern`, `plant`, `sierpinski`,
  `dragon`, `koch`, and the stochastic `wild` garden, all overridable with
  `--axiom` / `--angle` / `--iterations`.
- **ASCII renderer** — the turtle path is stroked into a character grid sized
  to your terminal with `--style line` (slope-shaded `-|/\` with `*` leaf
  tips) or `--style shade` (stroke-density greyscale ramp).
- **SVG export** — `--svg` emits the same path as a `<path>` of line segments
  with optional leaf-tip dots, built from plain strings.
- **Reproducible gardens** — `--seed` seeds the stochastic rule choices, and
  `--animate` steps the iteration count up so the plant visibly grows.

## Running it

Fernwald is a Python package in `fernwald/`. Python 3.8+ is all you need.

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

### Running the tests

```bash
python3 -m unittest discover -s fernwald/tests
```

The 71 tests cover rule expansion (determinism, seeding, the expansion cap),
grammar parsing (inline, files, directives, comments, alternatives, error
cases), turtle interpretation (bracket stack, tips, turns, movement), grid
fitting (bounds, aspect, y-flip), ASCII rendering (dimensions, glyphs, styles),
SVG export (structure, y-flip, leaf dots), and the CLI surface (presets,
errors, seeding, clamping).

## Presets

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

## Configuration

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

### Grammar file format

A `.grow` file is a list of statements — a production rule or a directive per
line. `;`-separated statements work too, and `#` starts a comment.

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

| Symbol | Meaning |
| --- | --- |
| `F`, `G` | Move forward one unit and draw a line. |
| `f`, `g` | Move forward one unit without drawing. |
| `+` | Turn left (counter-clockwise) by the angle. |
| `-` | Turn right by the angle. |
| `[` | Push the current position and heading (start a branch). |
| `]` | Pop the saved position and heading (back to the branch point). |
| other letters | Variables — rewritten by rules if they have one, otherwise ignored. |

A rule may list alternatives separated with `|` for stochastic growth:

```
F: F[+F][-F]F | F[+F]F[-F] | FF[+F][-F]
```

Choices are made with the RNG seeded by `--seed`, so the same seed always
grows the same garden.

## How it works

### 1. Expansion

`expand(axiom, rules, iterations)` rewrites the axiom in place, replacing every
symbol that has a production rule and passing constants (`+`, `-`, `[`, `]`)
through unchanged. Rules with several alternatives pick one via a seeded
`random.Random`. A running character count guards against runaway growth:
grammars are capped at 2,000,000 symbols and 20 iterations.

### 2. Turtle interpretation

`interpret(sequence, angle)` walks the command string. The turtle starts at
`(0, 0)` facing up so plants stand upright. `F`/`G` record a line segment,
`[`/`]` push and pop a (position, heading) stack, and `+`/`-` turn by the
angle. The endpoint of every branch that closes (`]`) or the final stroke
becomes a *tip* — the leaf dots in both output modes.

### 3. Fitting and ASCII rendering

All segments are collected, their bounding box computed, and a single affine
mapping is built that scales the drawing to fit the grid with `--pad` cells of
margin, centers it, flips Y (turtle up = screen up), and stretches the X axis
by the terminal cell aspect ratio so unit lengths read the same in both
directions. Each segment is then stroked with sub-cell sampling so steep
diagonals never show gaps. In `line` style a glyph is chosen from the segment's
slope; in `shade` style a per-cell stroke counter is mapped through a greyscale
ramp. Tips are always painted `*`.

### 4. SVG export

`export_svg` repeats the same bbox fitting (pixels are square, so no aspect
correction) and emits one `M...L...` command per segment inside a single
`<path>` — this avoids the spurious connector lines a single `<polyline>` would
draw across branch jumps. Leaf tips become small filled circles unless
`--no-leaves` is given.

## Project layout

```text
fernwald/
  fernwald.py         # the whole engine + CLI
  __main__.py         # enables `python -m fernwald`
  __init__.py         # package marker / public exports
  README.md           # project quick-start and option reference
  examples/
    plant.grow        # a leafy bush grammar file
    wild.grow         # a stochastic garden grammar file
  tests/
    test_fernwald.py  # 71 stdlib-unittest tests
docs/
  index.md            # this documentation page (source)
  index.html          # rendered documentation page
ideas/
  2026-08-10-fernwald-terminal-lsystem-garden.md
```

## Design notes

- **Pure core** — expansion, interpretation, fitting, and rendering are pure
  functions with no terminal side effects, so they are trivially testable and
  reusable.
- **One pass, one fit** — the whole turtle path is fitted into the grid in a
  single bounding-box pass before stroking, so output is always exactly the
  requested size.
- **Terminal-aware aspect** — the ~2:1 cell aspect is folded into the fit, so
  plants look geometrically correct rather than squashed.
- **Reproducible gardens** — every stochastic choice flows through a seeded
  `random.Random`; the same `--seed` always grows the same plant.
