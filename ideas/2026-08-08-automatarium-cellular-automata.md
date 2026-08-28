# Automatarium

A terminal playground for cellular automata — a small, dependency-free Python
CLI that renders classic automata live in the terminal as ASCII/Unicode
frames.

## What Was Built

A single-file Python CLI (`automatarium/automatarium.py`) that animates three
classic automata straight to stdout:

- **Elementary cellular automata** — Rule 30 by default, but any Wolfram rule
  0–255 (Rule 90's Sierpinski triangle, Rule 110, …) via `--rule`.
- **Conway's Game of Life** — on a fixed-size toroidal grid.
- **Langton's Ant** — one ant painting a trail that self-organises into a
  highway.

It uses nothing but the Python standard library (`argparse`, `random`,
`shutil`, `sys`, `time`, `typing`) — no external deps, no browser, no assets.

## Why

A self-contained animation/visualization showcase that is tiny enough for one
session and visually satisfying without any assets. The repo's web app had
already covered the browser; Automatarium fills the pure-terminal niche and
doubles as a compact, dependency-free demonstration of classic
complexity-from-simplicity ideas (rule 30's chaos, Game of Life's
self-organising patterns, and the ant's emergent highway).

## How It Works

- Every automaton implements a tiny shared contract — `step()`, `render()`,
  and a `name` — so one animation driver serves all three.
- **Animated mode** (stdout is a terminal): the screen is cleared with ANSI
  escapes and redrawn each generation at `--fps` (default 10). The cursor is
  hidden during the run and restored on exit; `Ctrl-C` stops cleanly.
- **Capture mode** (stdout is piped/redirected): each generation is printed
  once, preceded by a header line and separated by a blank line, and the
  per-frame delay is skipped so large `--steps` runs finish almost instantly.
- **Reproducibility**: every random draw flows through a `random.Random`
  instance seeded by `--seed`; when no seed is given, the chosen seed is
  printed to stderr so any run can be replayed exactly.
- **Bounded display**: 1D rules use a rolling window of `--height` rows, so a
  long run never overflows the screen or memory.
- **Validation**: rules, grid sizes, `--steps`, `--fps`, and `--density` are
  all validated up front, with clear argparse errors and exit code 2. If the
  grid is larger than the terminal, the user is warned with a suggested size.

## Key Files

- `automatarium/automatarium.py` — the entire CLI: three automata classes,
  argument parsing, and the animation/capture driver.
- `automatarium/README.md` — tool-specific usage guide and option reference.
- `automatarium/tests/test_automatarium.py` — 24 stdlib-`unittest` tests.
- `docs/index.md` + `docs/index.html` — documentation site (served on GitHub
  Pages under `/docs/`).

## Notes

- Rule 30 was implemented as the general elementary-automata engine (any rule
  0–255) rather than a hardcoded case, which is both cleaner and more useful.
- Life and the ant use toroidal wrapping so border cells behave like interior
  cells with no edge artifacts.
- The ant's position is marked with `@` so the walker stays visible in
  monochrome output; `--alive`/`--dead`/`--ant` let users pick glyphs
  (default `█` requires a UTF-8 terminal; `--alive #` works everywhere).
- Verified with 24 unit/integration tests covering the Rule 30 transition
  table, the Life blinker/block patterns, the ant's 4-step return symmetry,
  seed reproducibility, and CLI error handling.
