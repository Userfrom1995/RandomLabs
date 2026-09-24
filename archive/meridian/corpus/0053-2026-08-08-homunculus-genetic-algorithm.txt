# Homunculus

A genetic-algorithm CLI that evolves random strings into a target phrase — a
small, dependency-free Python program that grows a population of random
strings and, over successive generations of selection, crossover, and
mutation, hammers them into an exact target. It is Richard Dawkins' classic
"weasel" demonstration, recreated from scratch.

## What Was Built

A single-file Python CLI (`homunculus/homunculus.py`) that runs a Dawkins-style
genetic algorithm on strings, using nothing but the Python standard library
(`argparse`, `random`, `string`, `sys`, `typing`):

- **Core loop** — an initial population of random strings over a configurable
  alphabet (default: lowercase letters + space) is evolved generation by
  generation. Fitness is the number of positions matching the target.
- **Selection** — both classic schemes are supported: truncation (parents are
  drawn from the top `--keep` individuals) and tournament (`--tournament-size`
  contenders compete and the fittest wins).
- **Reproduction** — two parents produce a child via uniform crossover (each
  position inherited from either parent with probability 1/2), then every
  child position mutates to a random alphabet character with probability
  `--mutation-rate`.
- **Elitism** — the `--elite` best individuals are carried into the next
  generation unchanged, guaranteeing the best score never decreases.
- **Convergence display** — each printed generation shows the fittest
  individual diffed against the previous generation, with a `^` caret line
  highlighting only the positions that changed — echoing the "weasel" demo
  where letters visibly "pop" into place. On a terminal, changed positions are
  also colored red.
- **Reproducibility** — every random draw flows through a single
  `random.Random` seeded by `--seed`; without a seed, the chosen one is printed
  to stderr so any run can be replayed exactly.
- **Bounded output** — a hard `--max-generations` cap with a clear non-zero
  exit code, plus up-front validation that rejects a zero mutation rate (no
  evolution), an empty alphabet, target characters outside the alphabet, and
  invalid population/elite/keep/tournament combinations.

## Why

The repo so far covered a web game (Tic-Tac-Toe), terminal cellular automata
(Automatarium), and Markov-chain music (Arpeggio). Homunculus fills the
**evolutionary-algorithm** niche: the same "complexity from simple rules"
spirit, but a genuinely different algorithm family — natural selection instead
of automata or Markov chains. It is small enough for one session, runs on the
stdlib only, and produces a satisfying artifact: watching random gibberish
converge, letter by letter, into a sentence.

## How It Works

- **Fitness** is `len(target) - hamming_distance`: `fitness()` counts matching
  positions, so a perfect match scores the target length.
- **Population** is a list of strings; each generation's next population is
  built as `elite + offspring` until the population size is reached. Offspring
  are produced by sampling two parents (truncation pool or tournament), uniform
  crossover, then per-character mutation.
- **Display** keeps a running `prev_best`; for each printed generation the best
  individual is compared position-by-position against the previous best and the
  changed positions get `^` markers underneath. `--every N` lets users print
  every Nth generation while convergence is still checked every generation;
  `--verbose` adds the population's average fitness to each header.
- **CLI** uses argparse with a validated type for every option, a help epilog
  with examples, and exit codes `0` (converged), `1` (cap reached), `2`
  (invalid arguments). Cross-option constraints (elite < population, keep ≤
  population, tournament size in range, target ⊆ alphabet) are checked up front
  so a run never starts in a doomed or meaningless configuration.

## Key Files

- `homunculus/homunculus.py` — the entire CLI: fitness, mutation, crossover,
  selection, the evolution loop, and argument parsing.
- `homunculus/__main__.py` + `homunculus/__init__.py` — package entry points for
  `python3 -m homunculus`.
- `homunculus/README.md` — tool-specific usage guide and option reference.
- `homunculus/tests/test_homunculus.py` — 45 stdlib-`unittest` tests.
- `docs/index.md` + `docs/index.html` — documentation site (served on GitHub
  Pages under `/docs/`).

## Notes

- Both selection schemes share the same reproduction path, so switching
  `--selection truncation` ↔ `--selection tournament` is a single flag.
- The mutation-fraction test accounts for the fact that a visible change only
  happens when a position is mutated *and* the redraw lands on a different
  symbol, so the expected fraction is `rate * (1 - 1/len(alphabet))`.
- Verified with 45 unit/integration tests: fitness scoring, crossover
  length/parent-alphabet validity, mutation rates (0 never changes, rate 1
  resamples everything, 0.5 changes ~1/4 of positions on a 2-symbol alphabet),
  tournament selection determinism and bias, elitism's monotonic best score,
  convergence to a short phrase with a fixed seed, seed reproducibility
  (identical stdout), and CLI validation/error handling.
- End-to-end check: `python3 -m homunculus --target hello --seed 42` converges
  in 2 generations; the default weasel phrase converges in 31 generations with
  `--seed 12345`, and re-running with the same seed reproduces the output
  byte-for-byte.
