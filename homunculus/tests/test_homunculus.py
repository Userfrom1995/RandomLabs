"""Unit and CLI tests for Homunculus.

Run from the repository root with::

    python -m unittest discover -s homunculus/tests
"""

import argparse
import io
import os
import random
import re
import subprocess
import sys
import unittest

from homunculus.homunculus import (
    evolve,
    fitness,
    mutate,
    random_individual,
    tournament_pick,
    uniform_crossover,
)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SCORE_RE = re.compile(r"^gen (\d+)/\d+ \| score (\d+)/\d+", re.MULTILINE)


def _run_cli(*args):
    return subprocess.run(
        [sys.executable, "-m", "homunculus"] + list(args),
        capture_output=True,
        text=True,
        cwd=ROOT,
    )


class FitnessTests(unittest.TestCase):
    def test_perfect_match_scores_full_length(self):
        self.assertEqual(fitness("hello", "hello"), 5)

    def test_no_match_scores_zero(self):
        self.assertEqual(fitness("abcde", "vwxyz"), 0)

    def test_partial_matches_count_correctly(self):
        self.assertEqual(fitness("haxxo", "hello"), 2)

    def test_single_character(self):
        self.assertEqual(fitness("a", "a"), 1)
        self.assertEqual(fitness("a", "b"), 0)

    def test_length_mismatch_raises(self):
        with self.assertRaises(ValueError):
            fitness("short", "a longer target")


class RandomIndividualTests(unittest.TestCase):
    def test_has_expected_length(self):
        rng = random.Random(0)
        self.assertEqual(len(random_individual(rng, 7, "abc")), 7)

    def test_only_uses_alphabet_characters(self):
        rng = random.Random(1)
        for _ in range(50):
            individual = random_individual(rng, 20, "xy")
            self.assertTrue(set(individual) <= {"x", "y"})

    def test_single_character_alphabet_is_deterministic(self):
        rng = random.Random(2)
        self.assertEqual(random_individual(rng, 5, "a"), "aaaaa")


class UniformCrossoverTests(unittest.TestCase):
    def test_child_has_valid_length(self):
        rng = random.Random(3)
        child = uniform_crossover(rng, "abcdef", "uvwxyz")
        self.assertEqual(len(child), 6)

    def test_each_position_inherits_from_a_parent(self):
        rng = random.Random(4)
        parent_a, parent_b = "abcde", "vwxyz"
        child = uniform_crossover(rng, parent_a, parent_b)
        for position, (from_a, from_b) in enumerate(zip(parent_a, parent_b)):
            self.assertIn(child[position], (from_a, from_b), msg=f"position {position}")

    def test_length_mismatch_raises(self):
        rng = random.Random(5)
        with self.assertRaises(ValueError):
            uniform_crossover(rng, "abcd", "abcde")


class MutateTests(unittest.TestCase):
    def test_zero_rate_never_changes_anything(self):
        for seed in range(20):
            rng = random.Random(seed)
            self.assertEqual(mutate(rng, "abcde", "abcde", 0.0), "abcde")

    def test_mutated_characters_come_from_alphabet(self):
        rng = random.Random(6)
        for _ in range(50):
            result = mutate(rng, "aaaaaa", "bc", 0.5)
            self.assertTrue(set(result) <= {"a", "b", "c"})

    def test_mutation_resamples_about_the_expected_fraction(self):
        length = 2000
        rng = random.Random(1234)
        original = "a" * length
        result = mutate(rng, original, "ab", 0.5)
        # A position visibly changes only when it is mutated AND the redraw
        # lands on the other symbol, so the expected fraction is
        # mutation_rate * (1 - 1/len(alphabet)) = 0.5 * 0.5 = 0.25.
        changed = sum(a != b for a, b in zip(original, result))
        self.assertGreaterEqual(changed, int(length * 0.22))
        self.assertLessEqual(changed, int(length * 0.28))

    def test_rate_one_resamples_every_position(self):
        length = 2000
        rng = random.Random(5678)
        result = mutate(rng, "a" * length, "ab", 1.0)
        survivors = sum(char == "a" for char in result)
        self.assertGreaterEqual(survivors, int(length * 0.45))
        self.assertLessEqual(survivors, int(length * 0.55))


class TournamentPickTests(unittest.TestCase):
    def test_returns_a_population_member(self):
        population = ["aaa", "bbb", "ccc"]
        fitnesses = [1, 2, 3]
        for seed in range(20):
            picked = tournament_pick(random.Random(seed), population, fitnesses, 2)
            self.assertIn(picked, population)

    def test_deterministic_for_a_given_seed(self):
        population = ["aaa", "bbb", "ccc"]
        fitnesses = [1, 2, 3]
        first = tournament_pick(random.Random(9), population, fitnesses, 2)
        second = tournament_pick(random.Random(9), population, fitnesses, 2)
        self.assertEqual(first, second)

    def test_larger_tournaments_bias_towards_the_best(self):
        population = ["a"] * 90 + ["b"]
        fitnesses = [1] * 90 + [2]
        rng = random.Random(2024)
        picks = {tournament_pick(rng, population, fitnesses, 3) for _ in range(200)}
        self.assertEqual(picks, {"a", "b"})


class EvolutionTests(unittest.TestCase):
    def _run(self, **kwargs):
        defaults = dict(
            target="hello",
            alphabet="abcdefghijklmnopqrstuvwxyz ",
            population_size=200,
            mutation_rate=0.05,
            elite=2,
            max_generations=100,
            selection="truncation",
            keep=10,
            tournament_size=3,
            every=1,
            verbose=False,
            highlight=False,
        )
        defaults.update(kwargs)
        out = io.StringIO()
        reached = evolve(
            random.Random(defaults.pop("seed")), out=out, **defaults
        )
        return reached, out.getvalue()

    def test_converges_to_target_with_a_fixed_seed(self):
        reached, _ = self._run(seed=42)
        self.assertIsNotNone(reached)
        self.assertLessEqual(reached, 100)

    def test_best_score_never_decreases(self):
        _, output = self._run(seed=7, max_generations=30)
        scores = [int(score) for _, score in SCORE_RE.findall(output)]
        self.assertEqual(scores, sorted(scores))
        self.assertGreater(len(scores), 1)

    def test_all_reported_individuals_match_target_length(self):
        _, output = self._run(seed=11, max_generations=10)
        lines = output.splitlines()
        caret = re.compile(r"^[\^ ]*$")
        bests = [
            line.strip()
            for line in lines
            if line.startswith("  ") and not caret.fullmatch(line)
        ]
        self.assertTrue(bests)
        for best in bests:
            self.assertEqual(len(best), 5, msg=best)

    def test_elite_carries_the_best_forward_until_improved(self):
        target = "hello"
        out = io.StringIO()
        evolve(
            random.Random(3),
            target,
            "abcdefghijklmnopqrstuvwxyz ",
            100,
            0.05,
            3,
            20,
            "truncation",
            10,
            3,
            1,
            False,
            out,
            False,
        )
        scores = [int(score) for _, score in SCORE_RE.findall(out.getvalue())]
        self.assertGreaterEqual(len(scores), 2)
        for previous, current in zip(scores, scores[1:]):
            self.assertGreaterEqual(current, previous)

    def test_every_n_prints_only_every_nth_generation(self):
        _, output = self._run(seed=5, every=5, max_generations=30)
        generations = [int(gen) for gen, _ in SCORE_RE.findall(output)]
        self.assertTrue(all(gen % 5 == 0 for gen in generations), generations)
        self.assertIn(0, generations)

    def test_verbose_reports_average_fitness(self):
        _, output = self._run(seed=5, verbose=True, max_generations=5)
        self.assertRegex(output, r"avg \d+\.\d{2}")

    def test_returns_none_when_cap_is_reached(self):
        reached, _ = self._run(seed=1, max_generations=2)
        self.assertIsNone(reached)


class CliTests(unittest.TestCase):
    def test_converges_and_reports_generation_count(self):
        proc = _run_cli("--target", "hello", "--seed", "42", "--max-generations", "100")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("converged to 'hello' in", proc.stdout)

    def test_seed_is_reproducible(self):
        args = ["--target", "hello", "--seed", "7", "--max-generations", "50"]
        first = _run_cli(*args)
        second = _run_cli(*args)
        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertEqual(first.stdout, second.stdout)

    def test_random_seed_is_printed_to_stderr(self):
        proc = _run_cli("--target", "hello", "--max-generations", "50")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertRegex(proc.stderr, r"homunculus: seed = \d+ \(pass --seed \d+ to replay\)")

    def test_not_converged_exits_with_code_one(self):
        proc = _run_cli(
            "--target", "methinks it is like a weasel",
            "--max-generations", "2", "--population-size", "50", "--seed", "7",
        )
        self.assertEqual(proc.returncode, 1)
        self.assertIn("target not reached in 2 generations", proc.stderr)

    def test_zero_mutation_rate_rejected(self):
        proc = _run_cli("--mutation-rate", "0")
        self.assertEqual(proc.returncode, 2)
        self.assertIn("prevents any evolution", proc.stderr)

    def test_negative_mutation_rate_rejected(self):
        proc = _run_cli("--mutation-rate", "-0.5")
        self.assertEqual(proc.returncode, 2)

    def test_over_100_percent_mutation_rate_rejected(self):
        proc = _run_cli("--mutation-rate", "1.5")
        self.assertEqual(proc.returncode, 2)

    def test_empty_alphabet_rejected(self):
        proc = _run_cli("--alphabet", "")
        self.assertEqual(proc.returncode, 2)
        self.assertIn("alphabet must not be empty", proc.stderr)

    def test_empty_target_rejected(self):
        proc = _run_cli("--target", "")
        self.assertEqual(proc.returncode, 2)
        self.assertIn("target must not be empty", proc.stderr)

    def test_target_char_not_in_alphabet_rejected(self):
        proc = _run_cli("--target", "Hello", "--alphabet", "abcdefghijklmnopqrstuvwxyz ")
        self.assertEqual(proc.returncode, 2)
        self.assertIn("not in the alphabet", proc.stderr)

    def test_elite_greater_than_or_equal_to_population_rejected(self):
        proc = _run_cli("--elite", "5", "--population-size", "5")
        self.assertEqual(proc.returncode, 2)
        self.assertIn("elite", proc.stderr)

    def test_keep_greater_than_population_rejected(self):
        proc = _run_cli("--keep", "9", "--population-size", "5")
        self.assertEqual(proc.returncode, 2)
        self.assertIn("keep", proc.stderr)

    def test_tournament_size_one_rejected(self):
        proc = _run_cli("--selection", "tournament", "--tournament-size", "1")
        self.assertEqual(proc.returncode, 2)
        self.assertIn("at least 2", proc.stderr)

    def test_tournament_size_greater_than_population_rejected(self):
        proc = _run_cli(
            "--selection", "tournament", "--tournament-size", "9",
            "--population-size", "5",
        )
        self.assertEqual(proc.returncode, 2)

    def test_unknown_selection_rejected(self):
        proc = _run_cli("--selection", "rank")
        self.assertEqual(proc.returncode, 2)

    def test_non_integer_population_rejected(self):
        proc = _run_cli("--population-size", "many")
        self.assertEqual(proc.returncode, 2)

    def test_zero_max_generations_rejected(self):
        proc = _run_cli("--max-generations", "0")
        self.assertEqual(proc.returncode, 2)

    def test_tournament_selection_converges(self):
        proc = _run_cli(
            "--target", "hello", "--seed", "9", "--selection", "tournament",
            "--tournament-size", "5", "--max-generations", "200",
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("converged", proc.stdout)

    def test_help_lists_options(self):
        proc = _run_cli("--help")
        self.assertEqual(proc.returncode, 0)
        for option in ("--target", "--population-size", "--mutation-rate", "--elite",
                       "--max-generations", "--seed", "--alphabet", "--selection",
                       "--verbose"):
            self.assertIn(option, proc.stdout)

    def test_version_flag(self):
        proc = _run_cli("--version")
        self.assertEqual(proc.returncode, 0)
        self.assertIn("homunculus", proc.stdout)


if __name__ == "__main__":
    unittest.main()
