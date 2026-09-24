# Automatarium

A small, dependency-free Python CLI that renders classic cellular automata
live in your terminal — nothing but ASCII/Unicode frames and the Python
standard library.

- **Elementary cellular automata** — Rule 30 by default, but any Wolfram rule
  0–255 (e.g. Rule 90, Rule 110).
- **Conway's Game of Life** — on a fixed-size toroidal grid.
- **Langton's Ant** — one ant, infinite pattern.

No external packages, no browser, no assets. `python3 --version` >= 3.8 is all
you need.

## Quick start

```bash
# Rule 30 scrolling animation (default)
python3 -m automatarium

# Conway's Game of Life, reproducible random grid
python3 -m automatarium --rule life --seed 42

# Langton's Ant, 5000 generations, faster
python3 -m automatarium --rule ant --steps 5000 --fps 60

# Dump a fixed number of generations to a file (no animation)
python3 -m automatarium --rule 30 --width 160 --height 80 --steps 80 > rule30.txt
```

Or run the single file directly:

```bash
python3 automatarium/automatarium.py --rule 30
```

Press `Ctrl-C` at any time to stop an animated run.

## How it behaves

- **stdout is a terminal** — the automaton animates at `--fps` frames per
  second. The screen is cleared and redrawn each generation; the cursor is
  hidden for the duration of the run and restored on exit.
- **stdout is redirected / piped** — every generation is printed once as a
  plain frame, separated by a blank line. The per-frame animation delay is
  skipped, so large `--steps` runs finish almost instantly. Each frame is
  preceded by a header line:

  ```
  Rule 30 | generation 12 | 80x40
  ...........##...#
  ```

- If a random `--seed` is not given, a seed is chosen and printed to stderr so
  any run can be replayed exactly: `automatarium: seed = 1234567890 (pass
  --seed 1234567890 to replay)`.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `--rule RULE` | `30` | Automaton to run. Elementary rule number `0`–`255` (or `rule<N>`), `life`, or `ant`. Aliases like `game-of-life`, `gol`, `langton` also work. |
| `--width N` | `80` | Grid width in cells (1–1000). |
| `--height N` | `40` | Grid height in cells (1–1000). For elementary rules this is the rolling window height. |
| `--fps N` | `10` | Frames per second in animated mode. |
| `--steps N` | *(forever)* | Run exactly `N` generations then exit. `--steps 0` prints just the initial grid. |
| `--seed N` | *random* | Random seed for reproducible grids. |
| `--density F` | per rule | Initial probability a cell is alive (`0.0`–`1.0`). Defaults: `0.5` elementary rules, `0.4` life, `0.0` ant. |
| `--alive CH` | `█` | Character used for a live cell. |
| `--dead CH` | ` ` | Character used for a dead cell. |
| `--ant CH` | `@` | Character used to mark Langton's ant. |
| `--version` | | Print the version and exit. |
| `--help` | | Print full help, including examples. |

For elementary rules `--density` controls the random starting row; for life it
controls the random fill; for ant it controls the initial random black cells
(0 keeps the classic all-white grid).

## The automata

### Elementary rules (`--rule 30`, `--rule 110`, …)

One-dimensional rules from Stephen Wolfram's elementary cellular automata. A
row of cells evolves one generation at a time using the rule's 8-state lookup
table; each cell's next state depends on itself and its two neighbours. The
display is a rolling window `--height` rows tall: each generation appears at
the bottom and the oldest row scrolls off the top, so long runs never
overflow the screen.

Borders are treated as permanently dead, matching the classic definition.

### Conway's Game of Life (`--rule life`)

Two-dimensional cellular automaton with the standard birth/survival rules:
a live cell survives with 2 or 3 live neighbours, a dead cell is born with
exactly 3. The grid wraps around at every edge (a torus), so border cells
behave identically to interior cells.

### Langton's Ant (`--rule ant`)

A single ant walks the grid. On a dead (white) cell it turns right and paints
the cell alive (black); on a live (black) cell it turns left and paints it
dead. The ant's current position is drawn with the `--ant` character. On an
empty grid the ant's path is chaotic for a few hundred steps and then
self-organises into a repeating "highway". The grid wraps at the edges.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Normal completion (including `Ctrl-C`). |
| `2` | Invalid command-line arguments (argparse). |

## Development

```bash
# Run the test suite (standard library only)
python3 -m unittest discover -s automatarium/tests
```

Tests cover rule parsing and validation, the Rule 30 transition table, the
blinker/block Life patterns, the ant's 4-step symmetry, seed reproducibility,
and CLI error handling.

## Further reading

- [`docs/`](../docs/) — rendered documentation site (also served on GitHub
  Pages under `/docs/`).
- [`ideas/2026-08-08-automatarium-cellular-automata.md`](../ideas/2026-08-08-automatarium-cellular-automata.md)
  — the writeup for this build.
