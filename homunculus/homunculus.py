#!/usr/bin/env python3
"""Homunculus - a genetic-algorithm CLI that evolves random strings into a target phrase.

A tiny, dependency-free Python CLI that demonstrates evolution in action: it
grows a population of random strings and, over successive generations of
selection, crossover, and mutation, hammers them into an exact target phrase
(Richard Dawkins' "weasel" demonstration).

Run with `--help` for the full option reference, or see the README and the
`docs/` folder for detailed usage.
"""

from __future__ import annotations

import argparse
import random
import string
import sys
from typing import List, Optional, Sequence, TextIO, Tuple

__version__ = "1.0.0"

DEFAULT_POPULATION_SIZE = 200
DEFAULT_MUTATION_RATE = 0.05
DEFAULT_ELITE = 2
DEFAULT_MAX_GENERATIONS = 1000
DEFAULT_EVERY = 1
DEFAULT_KEEP = 10
DEFAULT_TOURNAMENT_SIZE = 3
DEFAULT_ALPHABET = string.ascii_lowercase + " "
DEFAULT_TARGET = "methinks it is like a weasel"

MAX_POPULATION = 100000
MAX_GENERATIONS_CAP = 1000000

SELECTIONS = ("truncation", "tournament")

# Exit codes
EXIT_OK = 0
EXIT_NOT_CONVERGED = 1
EXIT_USAGE = 2

_ANSI_RED = "\x1b[31m"
_ANSI_RESET = "\x1b[0m"


def fitness(individual: str, target: str) -> int:
    """Number of positions in ``individual`` that match ``target``.

    Equivalent to ``len(target) - hamming_distance``, so higher is better and
    a perfect match scores ``len(target)``.
    """
    if len(individual) != len(target):
        raise ValueError(
            f"individual length {len(individual)} != target length {len(target)}"
        )
    return sum(a == b for a, b in zip(individual, target))


def random_individual(rng: random.Random, length: int, alphabet: str) -> str:
    """A uniformly random string of ``length`` characters over ``alphabet``."""
    return "".join(rng.choice(alphabet) for _ in range(length))


def uniform_crossover(rng: random.Random, parent_a: str, parent_b: str) -> str:
    """Single offspring from two same-length parents via uniform crossover.

    Every position is inherited from either parent with equal probability.
    """
    if len(parent_a) != len(parent_b):
        raise ValueError(
            f"parents differ in length: {len(parent_a)} != {len(parent_b)}"
        )
    return "".join(rng.choice((a, b)) for a, b in zip(parent_a, parent_b))


def mutate(rng: random.Random, individual: str, alphabet: str, mutation_rate: float) -> str:
    """Return a copy of ``individual`` with each position independently
    replaced by a random alphabet character with probability ``mutation_rate``.
    """
    return "".join(
        rng.choice(alphabet) if rng.random() < mutation_rate else char
        for char in individual
    )


def tournament_pick(
    rng: random.Random,
    population: Sequence[str],
    fitnesses: Sequence[int],
    size: int,
) -> str:
    """Pick one parent by running a ``size``-way tournament.

    ``size`` random members of the population compete and the fittest wins, so
    the pressure towards fitter parents scales with the tournament size.
    """
    contenders = rng.sample(range(len(population)), min(size, len(population)))
    best = max(contenders, key=lambda index: fitnesses[index])
    return population[best]


def _ranked(
    population: Sequence[str], fitnesses: Sequence[int]
) -> List[Tuple[str, int]]:
    """Population zipped with fitness, sorted best-first (stable)."""
    return sorted(
        zip(population, fitnesses), key=lambda pair: pair[1], reverse=True
    )


def _print_gen(
    generation: int,
    max_generations: int,
    score: int,
    target_len: int,
    best: str,
    prev_best: Optional[str],
    verbose: bool,
    average: float,
    population_size: int,
    out: TextIO,
    highlight: bool,
) -> None:
    """Print one generation's best individual, diffed against the previous."""
    header = f"gen {generation}/{max_generations} | score {score}/{target_len}"
    if verbose:
        header += f" | avg {average:.2f} | pop {population_size}"
    out.write(header + "\n")
    if highlight and prev_best is not None:
        out.write("  " + _colorize_changes(best, prev_best) + "\n")
    else:
        out.write("  " + best + "\n")
    if prev_best is not None:
        markers = "".join("^" if a != b else " " for a, b in zip(prev_best, best))
        out.write("  " + markers + "\n")
    out.flush()


def _colorize_changes(best: str, prev_best: str) -> str:
    """Best string with positions changed since the previous generation in red."""
    return "".join(
        (_ANSI_RED + char + _ANSI_RESET) if prev != char else char
        for prev, char in zip(prev_best, best)
    )


def evolve(
    rng: random.Random,
    target: str,
    alphabet: str,
    population_size: int,
    mutation_rate: float,
    elite: int,
    max_generations: int,
    selection: str,
    keep: int,
    tournament_size: int,
    every: int,
    verbose: bool,
    out: TextIO,
    highlight: bool,
) -> Optional[int]:
    """Run the genetic algorithm until the target is reached.

    Returns the generation at which the target was reached, or ``None`` if the
    ``max_generations`` cap was hit first. The initial population is generation
    0; each loop iteration evolves one more generation.
    """
    target_len = len(target)
    population = [
        random_individual(rng, target_len, alphabet) for _ in range(population_size)
    ]
    fitnesses = [fitness(individual, target) for individual in population]

    prev_best: Optional[str] = None
    generation = 0
    while True:
        ranked = _ranked(population, fitnesses)
        best, best_score = ranked[0]

        if generation % every == 0:
            average = sum(fitnesses) / len(fitnesses)
            _print_gen(
                generation,
                max_generations,
                best_score,
                target_len,
                best,
                prev_best,
                verbose,
                average,
                population_size,
                out,
                highlight,
            )
        prev_best = best

        if best_score == target_len:
            return generation

        if generation >= max_generations:
            return None

        next_population = [individual for individual, _ in ranked[:elite]]
        if selection == "truncation":
            pool = [individual for individual, _ in ranked[:keep]]
        else:
            pool = population
        while len(next_population) < population_size:
            if selection == "truncation":
                parent_a = rng.choice(pool)
                parent_b = rng.choice(pool)
            else:
                parent_a = tournament_pick(rng, pool, fitnesses, tournament_size)
                parent_b = tournament_pick(rng, pool, fitnesses, tournament_size)
            child = uniform_crossover(rng, parent_a, parent_b)
            child = mutate(rng, child, alphabet, mutation_rate)
            next_population.append(child)

        population = next_population
        fitnesses = [fitness(individual, target) for individual in population]
        generation += 1


def _positive_int(name: str, maximum: Optional[int] = None):
    """Argparse type validating a strictly positive integer with an optional cap."""

    def _check(value: str) -> int:
        try:
            number = int(value)
        except ValueError:
            raise argparse.ArgumentTypeError(f"{name} must be an integer, got {value!r}")
        if number < 1:
            raise argparse.ArgumentTypeError(f"{name} must be positive, got {number}")
        if maximum is not None and number > maximum:
            raise argparse.ArgumentTypeError(f"{name} must be at most {maximum}, got {number}")
        return number

    return _check


def _non_negative_int(value: str) -> int:
    """Argparse type validating a non-negative integer."""
    try:
        number = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError(f"elite must be an integer, got {value!r}")
    if number < 0:
        raise argparse.ArgumentTypeError(f"elite must be non-negative, got {number}")
    return number


def _mutation_rate(value: str) -> float:
    """Argparse type validating a mutation rate in the open interval (0, 1]."""
    try:
        number = float(value)
    except ValueError:
        raise argparse.ArgumentTypeError(f"mutation rate must be a number, got {value!r}")
    if not 0.0 < number <= 1.0:
        raise argparse.ArgumentTypeError(
            f"mutation rate must be greater than 0 and at most 1, got {number}"
            " (a rate of 0 prevents any evolution)"
        )
    return number


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="homunculus",
        description="Evolve a population of random strings into an exact target "
        "phrase with selection, crossover, and mutation.",
        epilog=(
            "examples:\n"
            "  homunculus\n"
            "  homunculus --target 'to be or not to be' --seed 42\n"
            "  homunculus --target HELLO --alphabet 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' \\\n"
            "    --population-size 400 --mutation-rate 0.1\n"
            "  homunculus --target 'methinks it is like a weasel' --selection tournament \\\n"
            "    --tournament-size 5 --elite 4 --max-generations 500\n"
            "\n"
            "Each generation prints the fittest individual; '^' marks positions that\n"
            "changed since the previous generation. When stdout is a terminal, changed\n"
            "positions are also highlighted in red."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--target",
        default=DEFAULT_TARGET,
        metavar="PHRASE",
        help=f"phrase to evolve (default: {DEFAULT_TARGET!r})",
    )
    parser.add_argument(
        "--population-size",
        type=_positive_int("population size", MAX_POPULATION),
        default=DEFAULT_POPULATION_SIZE,
        metavar="N",
        help=f"number of individuals per generation (default: {DEFAULT_POPULATION_SIZE})",
    )
    parser.add_argument(
        "--mutation-rate",
        type=_mutation_rate,
        default=DEFAULT_MUTATION_RATE,
        metavar="F",
        help=f"per-character mutation probability, 0 < F <= 1 (default: {DEFAULT_MUTATION_RATE})",
    )
    parser.add_argument(
        "--elite",
        type=_non_negative_int,
        default=DEFAULT_ELITE,
        metavar="N",
        help=f"best individuals carried into the next generation unchanged, N < population "
        f"size (default: {DEFAULT_ELITE})",
    )
    parser.add_argument(
        "--max-generations",
        type=_positive_int("max generations", MAX_GENERATIONS_CAP),
        default=DEFAULT_MAX_GENERATIONS,
        metavar="N",
        help=f"hard cap on generations before giving up (default: {DEFAULT_MAX_GENERATIONS})",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        metavar="N",
        help="random seed for reproducible runs (default: random, printed to stderr)",
    )
    parser.add_argument(
        "--alphabet",
        default=DEFAULT_ALPHABET,
        metavar="CHARS",
        help=f"characters the population may use (default: lowercase letters + space)",
    )
    parser.add_argument(
        "--selection",
        choices=SELECTIONS,
        default="truncation",
        help="parent-selection scheme: 'truncation' picks from the top --keep, "
        "'tournament' runs --tournament-size-way tournaments (default: truncation)",
    )
    parser.add_argument(
        "--keep",
        type=_positive_int("keep"),
        default=DEFAULT_KEEP,
        metavar="N",
        help=f"truncation pool: parents are drawn from the top N individuals "
        f"(default: {DEFAULT_KEEP})",
    )
    parser.add_argument(
        "--tournament-size",
        type=_positive_int("tournament size"),
        default=DEFAULT_TOURNAMENT_SIZE,
        metavar="N",
        help=f"number of contenders per tournament pick, >= 2 "
        f"(default: {DEFAULT_TOURNAMENT_SIZE})",
    )
    parser.add_argument(
        "--every",
        type=_positive_int("every"),
        default=DEFAULT_EVERY,
        metavar="N",
        help=f"print every Nth generation (default: {DEFAULT_EVERY})",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="also print the population average fitness each printed generation",
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"%(prog)s {__version__}",
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = make_parser()
    args = parser.parse_args(argv)
    out = sys.stdout
    highlight = out.isatty()

    if not args.alphabet:
        parser.error("alphabet must not be empty")
    alphabet = args.alphabet
    target = args.target
    if not target:
        parser.error("target must not be empty")
    missing = sorted(set(target) - set(alphabet))
    if missing:
        parser.error(
            f"target contains characters not in the alphabet: {''.join(missing)}"
        )
    if args.elite >= args.population_size:
        parser.error(
            f"elite ({args.elite}) must be smaller than population size "
            f"({args.population_size})"
        )
    if args.keep > args.population_size:
        parser.error(
            f"keep ({args.keep}) must be at most population size ({args.population_size})"
        )
    if args.tournament_size < 2:
        parser.error(f"tournament size must be at least 2, got {args.tournament_size}")
    if args.tournament_size > args.population_size:
        parser.error(
            f"tournament size ({args.tournament_size}) must be at most population "
            f"size ({args.population_size})"
        )

    if args.seed is None:
        seed = random.randrange(1 << 32)
        print(
            f"homunculus: seed = {seed} (pass --seed {seed} to replay)",
            file=sys.stderr,
        )
    else:
        seed = args.seed
    rng = random.Random(seed)

    reached = evolve(
        rng,
        target,
        alphabet,
        args.population_size,
        args.mutation_rate,
        args.elite,
        args.max_generations,
        args.selection,
        args.keep,
        args.tournament_size,
        args.every,
        args.verbose,
        out,
        highlight,
    )

    if reached is None:
        print(
            f"homunculus: target not reached in {args.max_generations} generations",
            file=sys.stderr,
        )
        return EXIT_NOT_CONVERGED
    print(f"homunculus: converged to {target!r} in {reached} generations")
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
