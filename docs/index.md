# Homunculus — Genetic-Algorithm Phrase Evolver

**Homunculus** is a small, dependency-free Python CLI that demonstrates
evolution in action: it grows a population of random strings and, over
successive generations of selection, crossover, and mutation, hammers them
into an exact target phrase. It runs on nothing but the Python standard
library — no external packages, no assets.

- A **Dawkins-style genetic algorithm**: truncation or tournament selection,
  uniform crossover, per-character mutation, and elitism.
- Every printed generation is **diffed against the previous one**, with `^`
  marking the positions that just changed.
- All randomness flows through a **single seeded `random.Random`**, so any run
  can be replayed exactly.

```text
$ python3 -m homunculus --target hello --seed 42
gen 0/1000 | score 1/5
  hdmlo
gen 1/1000 | score 3/5
  hdllo
    ^
gen 2/1000 | score 5/5
  hello
   ^^
homunculus: converged to 'hello' in 2 generations
```

---

## Requirements

- Python 3.8 or newer.
- Nothing else — no external packages, no network.

## Quick start

```bash
# Evolve the classic weasel phrase (default)
python3 -m homunculus

# A custom phrase with a fixed seed
python3 -m homunculus --target "to be or not to be" --seed 42

# Harder: uppercase alphabet, bigger population, more mutation
python3 -m homunculus --target "HELLO WORLD" \
  --alphabet " ABCDEFGHIJKLMNOPQRSTUVWXYZ" --population-size 400 --mutation-rate 0.1

# Tournament selection, printing every 10th generation
python3 -m homunculus --selection tournament --tournament-size 5 --every 10
```

The single file can also be run directly:

```bash
python3 homunculus/homunculus.py --target hello
```

`python3 -m homunculus --help` prints the full option reference with examples.

## Configuration options

| Option | Default | Description |
| --- | --- | --- |
| `--target PHRASE` | `methinks it is like a weasel` | Phrase to evolve. |
| `--population-size N` | `200` | Individuals per generation (1–100000). |
| `--mutation-rate F` | `0.05` | Per-character mutation probability, `0 < F <= 1`. A rate of 0 is rejected — no mutation, no evolution. |
| `--elite N` | `2` | Best individuals copied unchanged into the next generation (`0 <= N < population size`). |
| `--max-generations N` | `1000` | Hard cap on generations before giving up (1–1000000). |
| `--seed N` | *random* | Random seed for reproducible runs; the chosen seed is printed to stderr when random. |
| `--alphabet CHARS` | `abcdefghijklmnopqrstuvwxyz ` | Characters the population may use. Must not be empty and must cover every target character. |
| `--selection SCHEME` | `truncation` | Parent selection: `truncation` (draw from the top `--keep`) or `tournament` (`--tournament-size`-way tournaments). |
| `--keep N` | `10` | Truncation pool: parents are drawn from the top N individuals. |
| `--tournament-size N` | `3` | Contenders per tournament pick (2–population size). |
| `--every N` | `1` | Print every Nth generation; convergence is still checked each generation. |
| `--verbose` | off | Also print the population's average fitness each printed generation. |
| `--version` | | Print the version and exit. |

### Examples

```bash
# Converge "to be or not to be" deterministically
python3 -m homunculus --target "to be or not to be" --seed 2024

# Watch letters pop into place every 5 generations
python3 -m homunculus --every 5 --seed 7

# Include digits for a longer, harder target
python3 -m homunculus --target "evolve 42" --alphabet " abcdefghijklmnopqrstuvwxyz0123456789"

# Tournament selection with a small population, verbose stats
python3 -m homunculus --selection tournament --tournament-size 4 \
  --population-size 50 --verbose --seed 3
```

## How it works

### 1. Initialize

The first population is `--population-size` random strings over the alphabet,
all the same length as the target. Generation 0 is printed before any
evolution happens.

### 2. Score

Fitness is the number of positions matching the target (higher is better; a
perfect match scores the target length). Because the `--elite` best
individuals are copied into the next generation unchanged, the best score
never decreases.

### 3. Select

Parents are chosen by one of two schemes:

- **Truncation** — draw uniformly from the top `--keep` individuals.
- **Tournament** — pick `--tournament-size` random contenders and keep the
  fittest; larger tournaments put more pressure towards fitter parents.

### 4. Reproduce and mutate

Two parents produce a child via uniform crossover (each position is inherited
from either parent with probability 1/2), then every child position is
replaced with a random alphabet character with probability `--mutation-rate`.
Offspring are generated until the population is full again.

### 5. Converge

The run stops the first time a generation's best individual matches the target
exactly and prints the generation count. If `--max-generations` is reached
first, the run gives up with exit code 1.

## Reproducibility

All randomness flows through a single `random.Random` seeded by `--seed`. The
same seed, target, and parameters always produce byte-identical output:

```bash
python3 -m homunculus --target hello --seed 42 --max-generations 100 > one.txt
python3 -m homunculus --target hello --seed 42 --max-generations 100 > two.txt
diff one.txt two.txt   # identical
```

When no seed is given, the one actually used is printed to stderr, e.g.
`homunculus: seed = 2600470316 (pass --seed 2600470316 to replay)`.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Target reached; the generation count is printed on stdout. |
| `1` | Target not reached within `--max-generations`. |
| `2` | Invalid command-line arguments (argparse). |

## Project layout

```text
homunculus/
  homunculus.py       # the whole CLI — fitness, GA operators, evolution loop
  __main__.py         # enables `python -m homunculus`
  __init__.py         # package marker
  README.md           # tool-specific usage guide
  tests/
    test_homunculus.py
docs/
  index.md            # this page (source)
  index.html          # rendered documentation page
ideas/
  2026-08-08-homunculus-genetic-algorithm.md
```

## Development

```bash
python3 -m unittest discover -s homunculus/tests
```

The 45 tests cover fitness scoring, crossover and mutation behavior (including
the expected mutation fraction), tournament selection, elitism's
never-decreases guarantee, seed reproducibility, convergence on a short phrase
with a fixed seed, and CLI validation/error handling.

## Design notes

- **Single file, zero dependencies** — the whole CLI is one Python module
  using only `argparse`, `random`, `string`, `sys`, and `typing`.
- **Two selection schemes, one reproduction path** — switching
  `--selection truncation` ↔ `--selection tournament` is a single flag.
- **Determinism** — every random draw goes through a single seeded
  `random.Random`, so a given seed always reproduces the exact same run.
- **Bounded output** — a hard `--max-generations` cap, a `--every` print
  throttle, and up-front validation of every option (including the fail-fast
  rejection of a zero mutation rate and alphabet/target mismatches).

## License

MIT — see [LICENSE](../LICENSE) in the repository root.
