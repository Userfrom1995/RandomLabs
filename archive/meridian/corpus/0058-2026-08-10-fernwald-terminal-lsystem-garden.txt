# Fernwald

A small, dependency-free Python CLI that grows procedural plants, trees, and
fractals from L-system grammar rules and renders them straight into the
terminal as ASCII art (with an optional SVG export). A handful of seed
characters plus a few production rules iterated a couple of times turns into a
recognizable fern, a leafy tree, a Sierpinski triangle, a dragon curve, or a
Koch snowflake — nothing but the Python standard library.

## What Was Built

A single Python package (`fernwald/fernwald.py`, ~700 lines) that models plant
growth as a Lindenmayer system and renders it two ways, using only `argparse`,
`math`, `random`, `re`, `shutil`, `sys`, and `time`:

- **L-system engine** — `expand()` rewrites the axiom `iterations` times:
  symbols with a production rule are replaced, constants (`+`, `-`, `[`, `]`)
  pass through, and rules that list several `|`-separated alternatives pick one
  at random from a seeded `random.Random`. A running character counter hard-caps
  expansion at 2,000,000 symbols so an accidental exponential rule can never
  hang the process.
- **Rule-set parser** — `parse_grammar()` reads a grammar either as an inline
  string (`'A: F[+A][-A]'`, semicolons separate statements) or as a `.grow`
  file with `angle` / `axiom` / `iterations` directives and `#` comments.
  `--rules` accepts both; `--axiom`/`--angle`/`--iterations` override anything.
- **Seven presets** — `tree` (a symmetric leafy tree), `fern` (the classic
  Barnsley `X: F+[[X]-X]-F[-FX]+X` plant), `plant` (a dense bush), `sierpinski`,
  `dragon`, `koch`, and `wild` (a stochastic garden that needs `--seed` to
  reproduce). `--list-presets` prints them all with their rules.
- **Turtle interpretation** — `interpret()` walks the command string starting
  facing up (so plants stand upright), recording one line segment per
  `F`/`G` step, pushing/poping a (position, heading) stack on `[`/`]`, and
  marking every branch that closes (or the final stroke) as a *tip*.
- **ASCII renderer** — all segments are fitted into a grid sized to the
  terminal in a single bounding-box pass: scaled to fit with `--pad` margin,
  centered, y-flipped, and x-stretched by the ~2:1 terminal cell aspect so
  plants look geometrically right. `--style line` shades each segment by slope
  (`-|/\`) with `*` leaf tips; `--style shade` accumulates stroke density into a
  greyscale ramp for an organic shaded look.
- **SVG export** — `--svg` emits the same path as a `<path>` with one
  `M...L...` command per segment (so branch jumps never get spurious connector
  lines), plus optional leaf-tip circles, on a square canvas with a configurable
  stroke color.
- **Growth animation** — `--animate` steps the iteration count from 0 up,
  clearing and redrawing each frame so the plant visibly grows.

## Why

The repo so far held Markov music (Arpeggio), cellular automata
(Automatarium), a genetic algorithm (Homunculus), an Enigma cipher (Rotoria),
minimax tic-tac-toe, a raycasting engine (Shaftcast), and a racing game — but
nothing about procedural generation, fractals, or recursion-as-creativity.
Fernwald fills that niche with one of the most satisfying small programs to
watch run: iterating a rule set a few times turns a handful of characters into
a recognizable organism, and the bracket stack produces convincingly organic
branching. It is a compact lesson in formal grammars, recursion, turtle
geometry, and how simulated plants actually work.

## How It Works

- **Expansion** (`expand`) — each iteration walks the current string and
  concatenates each symbol's replacement; single-alternative rules are the
  common case, multi-alternative rules delegate to the seeded RNG. A `size`
  counter (not the list length!) catches runaway growth early.
- **Interpretation** (`interpret`) — a turtle with `(x, y, heading)`; `F`/`G`
  record a segment, `f`/`g` move without drawing, `+`/`-` turn by the angle,
  `[`/`]` manage the branch stack. Coordinates are rounded to 9 decimals so
  trig noise (e.g. `cos(pi/2) ≈ 6e-17`) never leaks into output or tests.
- **Fitting** (`fit_transform`) — one affine map from turtle space to grid
  space: `scale = min(avail_w / (2 * xrange), avail_h / yrange)`, centered, with
  the y-axis flipped so turtle "up" is screen "up".
- **Rendering** (`render_ascii`) — each segment is stroked with sub-cell
  sampling (at least every half cell) so steep diagonals never gap; the line
  style picks a slope glyph, the shade style bumps a per-cell hit counter that
  is later mapped through a ramp. Tips are always drawn as `*`.
- **SVG** (`export_svg`) — same fit without aspect correction (pixels are
  square), one `M...L...` pair per segment in a single `<path>`, tip dots as
  `<circle>`s, all built from plain strings.

## Key Files

- `fernwald/fernwald.py` — the entire engine + CLI: grammar parsing, expansion,
  turtle interpreter, bounding-box fitting, ASCII renderer, SVG exporter, and
  the argument parser.
- `fernwald/__main__.py` + `fernwald/__init__.py` — package entry points for
  `python3 -m fernwald` and the public exports.
- `fernwald/README.md` — project README with quick-start, preset table, grammar
  reference, option table, and design notes.
- `fernwald/examples/plant.grow` and `wild.grow` — example grammar files
  demonstrating the directive syntax and stochastic alternatives.
- `fernwald/tests/test_fernwald.py` — 71 stdlib-`unittest` tests covering rule
  expansion, grammar parsing, turtle interpretation, grid fitting, ASCII
  rendering, SVG export, and the CLI surface.
- `docs/index.md` + `docs/index.html` — documentation site (served on GitHub
  Pages under `/docs/`).

## Notes

- **Everything is pure at the core** — expansion, interpretation, fitting, and
  rendering are side-effect-free functions, which made the test suite (71
  tests) straightforward and keeps the door open for reuse (e.g. a web front
  end could call the same pipeline and render with a `<canvas>`).
- **Default experience** — `python3 -m fernwald` renders the `tree` preset
  sized to your terminal; `--preset wild --seed 7 --style shade` shows off the
  stochastic grammar, the density shading, and reproducibility together;
  `--rules 'A: F[+A][-A]' --seed 1 --svg > garden.svg` produces a print-quality
  SVG from scratch.
- **Scope choice** — the turtle alphabet sticks to the classic `F`, `+`, `-`,
  `[`, `]` (plus `G`/`f`/`g` conveniences and `|` for stochastic alternatives);
  no parametric curves or context-sensitive rules, keeping the grammar surface
  small and the docs digestible.
- **Name origin** — "Fernwald" is German for "fern forest", evoking a
  procedurally grown garden. It is distinct from Arpeggio, Automatarium,
  Homunculus, Rotoria, Shaftcast, and Qubicle so future ideation agents won't
  collide.
