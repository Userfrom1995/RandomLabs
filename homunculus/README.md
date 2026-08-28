# Homunculus

A tiny, dependency-free Python CLI that demonstrates evolution in action: it
grows a population of random strings and, over successive generations of
selection, crossover, and mutation, hammers them into an exact target phrase —
Richard Dawkins' "weasel" demonstration. Nothing but the Python standard
library.

- **Dawkins-style genetic algorithm** — truncation or tournament selection,
  uniform crossover, per-character mutation, and elitism.
- **Convergence display** — every printed generation shows the fittest
  individual diffed against the previous one, with `^` marking the positions
  that just changed (echoing the classic "weasel" demo).
- **Reproducible** — all randomness flows through a single `random.Random`
  seeded by `--seed`; without a seed the chosen one is printed to stderr so
  any run can be replayed exactly.

`python3 --version` >= 3.8 is all you need.

## Quick start

```bash
# Evolve the classic weasel phrase (default)
python3 -m homunculus

# A custom phrase with a fixed seed
python3 -m homunculus --target "to be or not to be" --seed 42

# Harder: uppercase alphabet, bigger population, more mutation
python3 -m homunculus --target HELLO WORLD --alphabet " ABCDEFGHIJKLMNOPQRSTUVWXYZ" \
  --population-size 400 --mutation-rate 0.1

# Tournament selection with a sparser printout
python3 -m homunculus --selection tournament --tournament-size 5 --every 10
```

Or run the single file directly:

```bash
python3 homunculus/homunculus.py --target hello
```

## What the output looks like

```text
gen 0/1000 | score 3/28
  eeeeteeke iegeesew e ssee
gen 1/1000 | score 4/28
  eeeeteek  iegeesew e ssee
              ^       ^
...
homunculus: converged to 'methinks it is like a weasel' in 31 generations
```

Each `gen` line prints the generation, the fitness of the best individual
(`score A/B`, where B is the target length), and the best string itself. The
`^` line below it marks every position that changed since the previous printed
generation. When stdout is a terminal the changed positions are also shown in
red.

## Options

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
| `--help` | | Print full help, including examples. |

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Target reached; the generation count is printed on stdout. |
| `1` | Target not reached within `--max-generations`. |
| `2` | Invalid command-line arguments (argparse). |

## How the algorithm works

1. **Initial population** — `--population-size` random strings over the
   alphabet, all the same length as the target.
2. **Fitness** — number of positions matching the target (higher is better;
   a perfect match scores the target length).
3. **Selection** — parents come from either the top `--keep` individuals
   (truncation) or from `--tournament-size`-way tournaments (tournament).
4. **Crossover** — two parents produce one child via uniform crossover (each
   position inherited from either parent with probability 1/2).
5. **Mutation** — every child position is replaced with a random alphabet
   character with probability `--mutation-rate`.
6. **Elitism** — the `--elite` best individuals are copied into the next
   generation unchanged, so the best score never decreases.
7. **Convergence** — the run stops the first time a generation's best
   individual matches the target exactly.

## Development

```bash
# Run the test suite (standard library only)
python3 -m unittest discover -s homunculus/tests
```

The 45 tests cover fitness scoring, crossover and mutation behavior (including
the expected mutation fraction), tournament selection, elitism's
never-decreases guarantee, seed reproducibility, convergence on a short phrase
with a fixed seed, and CLI validation/error handling.

## Further reading

- [`docs/`](../docs/) — rendered documentation site (also served on GitHub
  Pages under `/docs/`).
- [`ideas/2026-08-08-homunculus-genetic-algorithm.md`](../ideas/2026-08-08-homunculus-genetic-algorithm.md)
  — the writeup for this build.
