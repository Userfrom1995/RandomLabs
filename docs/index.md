# Automatarium — Terminal Cellular Automata Playground

**Automatarium** is a small, dependency-free Python CLI that renders classic
cellular automata live in the terminal. It runs on nothing but the Python
standard library — no external packages, no browser, no assets.

It supports three automata:

| Automaton | `--rule` value | What you see |
| --- | --- | --- |
| Elementary cellular automata | `30`, `110`, `rule90`, … any `0`–`255` | A scrolling 1D history. Rule 30 is the default. |
| Conway's Game of Life | `life` | A 2D toroidal grid evolving by birth/survival rules. |
| Langton's Ant | `ant` | A single ant painting a trail that self-organises into a highway. |

```text
$ python3 -m automatarium --rule 30
Rule 30 | generation 42 | 80x40
```█████.████...█████.....██████..█████..█
```

---

## Requirements

- Python 3.8 or newer
- A UTF-8 capable terminal for the default `█` cell glyph
  (use `--alive #` for plain ASCII terminals)

## Quick start

```bash
# Rule 30 scrolling animation (default)
python3 -m automatarium

# Conway's Game of Life, reproducible random grid
python3 -m automatarium --rule life --seed 42

# Langton's Ant, 5000 generations, fast-forwarded
python3 -m automatarium --rule ant --steps 5000 --fps 60

# Capture a fixed number of generations to a file
python3 -m automatarium --rule 30 --width 160 --height 80 --steps 80 > rule30.txt
```

The single file can also be run directly:

```bash
python3 automatarium/automatarium.py --rule life
```

Press `Ctrl-C` to stop an animated run. `python3 -m automatarium --help`
prints the full option reference with examples.

## Configuration options

| Option | Default | Description |
| --- | --- | --- |
| `--rule RULE` | `30` | Automaton to run: an elementary rule number `0`–`255` (`30`, `110`, `rule90`, …), `life`, or `ant`. Aliases (`game-of-life`, `gol`, `langton`, …) are accepted. |
| `--width N` | `80` | Grid width in cells, `1`–`1000`. |
| `--height N` | `40` | Grid height in cells, `1`–`1000`. |
| `--fps N` | `10` | Frames per second while animating. |
| `--steps N` | *(forever)* | Run exactly `N` generations then exit. `--steps 0` prints only the initial grid. |
| `--seed N` | *random* | Reproducible randomness; the chosen seed is printed to stderr when random. |
| `--density F` | per rule | Initial probability a cell is alive, `0.0`–`1.0`. Defaults: `0.5` elementary, `0.4` life, `0.0` ant. |
| `--alive CH` | `█` | Glyph for a live cell. |
| `--dead CH` | ` ` | Glyph for a dead cell. |
| `--ant CH` | `@` | Glyph marking Langton's ant. |
| `--version` | | Print version and exit. |

### Examples

```bash
# A wide, tall Rule 30 "triangle" dumped to a file
python3 -m automatarium --rule 30 --width 240 --height 120 --steps 120 > rule30.txt

# Game of Life on a small grid at a lazy 4 fps
python3 -m automatarium --rule life --width 50 --height 30 --fps 4

# Rule 110 (universal) with a custom live-cell glyph
python3 -m automatarium --rule rule110 --alive '#'

# A 2-second splash of the ant with an explicit seed
python3 -m automatarium --rule ant --seed 7 --steps 60 --fps 30
```

## Interactive vs captured output

- **Terminal (stdout is a TTY):** the automaton animates at `--fps`. The
  screen is cleared and redrawn each generation; the cursor is hidden during
  the run and restored afterwards. If the grid is wider or taller than your
  terminal, a warning is printed to stderr with a suggested size.
- **Piped / redirected stdout:** every generation is printed once, separated
  by a blank line and preceded by a header:

  ```
  Rule 30 | generation 12 | 80x40
  ...........#.....
  ```

  The per-frame delay is skipped in this mode, so large `--steps` runs finish
  almost instantly and are easy to grep, diff, or replay.

- If `--seed` is not provided, the seed actually used is written to stderr,
  e.g. `automatarium: seed = 1234567890 (pass --seed 1234567890 to replay)`.

## How each automaton works

### Elementary cellular automata

One-dimensional rules (Stephen Wolfram's "elementary" class). Each cell's
next state is a function of itself and its two neighbours — an 8-state lookup
table encoded by the rule number. Rule 30 (`0b00011110`) is the classic
chaos generator; Rule 110 is Turing-complete; Rule 90 is a fractal Sierpinski
triangle.

Implementation detail: the display is a **rolling window** `--height` rows
tall. Each generation is appended at the bottom and the oldest row scrolls
off the top, so long runs never overflow the screen. To capture a full
history, set `--height` to at least your `--steps` count. Borders are treated
as permanently dead, matching the classic definition.

### Conway's Game of Life

Standard rules: a live cell survives with 2 or 3 live neighbours; a dead cell
is born with exactly 3. The grid wraps at every edge (**toroidal**), so
border cells behave exactly like interior cells and there are no edge
artifacts. The initial grid is a random fill controlled by `--seed` and
`--density`.

### Langton's Ant

One ant starts at the centre facing north. On a dead (white) cell it turns
right and paints the cell alive (black); on a live (black) cell it turns left
and paints it dead. The ant's position is drawn with `--ant` (`@`). On an
all-white grid the trail is chaotic for a few hundred steps, then locks into
a repeating highway — a famously simple rule producing complex behaviour.
The grid wraps at the edges. `--density` > 0 seeds random black cells for a
varied start.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Normal completion, including a user `Ctrl-C`. |
| `2` | Invalid command-line arguments (argparse validation). |

## Project layout

```text
automatarium/
  automatarium.py     # the whole CLI — three automata + driver
  __main__.py         # enables `python -m automatarium`
  __init__.py         # package marker
  README.md           # tool-specific usage guide
  tests/
    test_automatarium.py
docs/
  index.md            # this page (source)
  index.html          # rendered documentation page
ideas/
  2026-08-08-automatarium-cellular-automata.md
```

## Development

```bash
python3 -m unittest discover -s automatarium/tests
```

The suite covers rule parsing and validation, the Rule 30 transition table,
Life's blinker and block patterns, the ant's 4-step return symmetry, seed
reproducibility, capture-mode framing, and CLI error handling.

## Design notes

- **Single file, zero dependencies** — the whole CLI is one Python module
  using only `argparse`, `random`, `shutil`, `sys`, `time`, and `typing`.
- **One interface, three automata** — every automaton exposes the same
  `step()` / `render()` / `name` contract, so the animation driver is shared.
- **Determinism** — every random draw goes through a `random.Random`
  instance seeded by `--seed`, so a given seed always reproduces the exact
  same frames.
- **Bounded display** — scrolling windows keep memory and screen usage
  constant regardless of run length.

## License

MIT — see [LICENSE](../LICENSE) in the repository root.
