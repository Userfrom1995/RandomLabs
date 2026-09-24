"""Unit and CLI tests for Automatarium.

Run from the repository root with::

    python -m unittest discover -s automatarium/tests
"""

import argparse
import os
import random
import subprocess
import sys
import unittest

from automatarium.automatarium import (
    ALIVE_CHAR,
    DEAD_CHAR,
    ANT_CHAR,
    ElementaryCellularAutomaton,
    GameOfLife,
    LangtonsAnt,
    parse_rule,
)

CHARS = (ALIVE_CHAR, DEAD_CHAR, ANT_CHAR)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _run_cli(*args):
    return subprocess.run(
        [sys.executable, "-m", "automatarium", "--alive", "#", "--dead", "."] + list(args),
        capture_output=True,
        text=True,
        cwd=ROOT,
    )


class ParseRuleTests(unittest.TestCase):
    def test_elementary_rule_spellings(self):
        for value, expected in [
            ("30", ("eca", 30)),
            ("110", ("eca", 110)),
            ("rule90", ("eca", 90)),
            ("Rule-30", ("eca", 30)),
            ("rule 30", ("eca", 30)),
            ("0", ("eca", 0)),
            ("255", ("eca", 255)),
        ]:
            with self.subTest(value=value):
                self.assertEqual(parse_rule(value), expected)

    def test_life_spellings(self):
        for value in ["life", "game-of-life", "gameoflife", "gol", "conway"]:
            with self.subTest(value=value):
                self.assertEqual(parse_rule(value), ("life", None))

    def test_ant_spellings(self):
        for value in ["ant", "langton", "langtons-ant", "langtonsant"]:
            with self.subTest(value=value):
                self.assertEqual(parse_rule(value), ("ant", None))

    def test_out_of_range_rule_rejected(self):
        for value in ["256", "999", "-1"]:
            with self.subTest(value=value):
                with self.assertRaises(argparse.ArgumentTypeError):
                    parse_rule(value)

    def test_garbage_rejected(self):
        with self.assertRaises(argparse.ArgumentTypeError):
            parse_rule("banana")


class ElementaryCellularAutomatonTests(unittest.TestCase):
    def test_rule30_lookup_matches_xor_or_definition(self):
        for left in (0, 1):
            for centre in (0, 1):
                for right in (0, 1):
                    index = (left << 2) | (centre << 1) | right
                    expected = left ^ (centre or right)
                    actual = (30 >> index) & 1
                    self.assertEqual(actual, expected)

    def test_step_applies_rule_with_fixed_zero_borders(self):
        ca = ElementaryCellularAutomaton(30, 5, 5, random.Random(0), 0.0, CHARS)
        ca._rows[-1] = [1, 0, 1, 1, 0]
        ca.step()
        top = [1, 0, 1, 1, 0]
        expected = []
        for col in range(5):
            left = top[col - 1] if col else 0
            centre = top[col]
            right = top[col + 1] if col < 4 else 0
            expected.append(left ^ (centre or right))
        self.assertEqual(ca._rows[-1], expected)

    def test_single_cell_seed_forms_the_rule30_triangle(self):
        ca = ElementaryCellularAutomaton(30, 5, 6, random.Random(0), 0.0, CHARS)
        ca._rows[-1] = [0, 0, 1, 0, 0]
        ca.step()
        self.assertEqual(ca._rows[-1], [0, 1, 1, 1, 0])
        ca.step()
        self.assertEqual(ca._rows[-1], [1, 1, 0, 0, 1])
        ca.step()
        self.assertEqual(ca._rows[-1], [1, 0, 1, 1, 1])

    def test_scrolling_window_is_bounded_and_counts_generations(self):
        ca = ElementaryCellularAutomaton(30, 5, 3, random.Random(1), 0.5, CHARS)
        for _ in range(10):
            ca.step()
        self.assertEqual(ca.generation, 10)
        self.assertEqual(len(ca._rows), 3)

    def test_density_zero_seed_is_all_dead(self):
        ca = ElementaryCellularAutomaton(30, 10, 3, random.Random(0), 0.0, CHARS)
        self.assertEqual(ca._rows[-1], [0] * 10)


class GameOfLifeTests(unittest.TestCase):
    def test_block_is_a_still_life(self):
        life = GameOfLife(4, 4, random.Random(0), 0.0, CHARS)
        life._grid = [
            [0, 0, 0, 0],
            [0, 1, 1, 0],
            [0, 1, 1, 0],
            [0, 0, 0, 0],
        ]
        life.step()
        self.assertEqual(life._grid[1], [0, 1, 1, 0])
        self.assertEqual(life._grid[2], [0, 1, 1, 0])

    def test_blinker_oscillates_with_period_two(self):
        life = GameOfLife(5, 5, random.Random(0), 0.0, CHARS)
        life._grid = [
            [0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0],
        ]
        life.step()
        self.assertEqual(life._grid[2], [0, 1, 1, 1, 0])
        life.step()
        self.assertEqual(life._grid[2], [0, 0, 1, 0, 0])
        life.step()
        self.assertEqual(life._grid[2], [0, 1, 1, 1, 0])

    def test_empty_grid_stays_empty(self):
        life = GameOfLife(6, 6, random.Random(0), 0.0, CHARS)
        before = life.render()
        life.step()
        self.assertEqual(life.render(), before)


class LangtonsAntTests(unittest.TestCase):
    def test_empty_grid_ant_returns_to_start_after_four_steps(self):
        ant = LangtonsAnt(5, 5, random.Random(0), 0.0, CHARS)
        self.assertEqual((ant._ant_row, ant._ant_col), (2, 2))
        for _ in range(4):
            ant.step()
        self.assertEqual((ant._ant_row, ant._ant_col), (2, 2))
        self.assertEqual(ant._grid[2][2], 1)

    def test_ant_flips_black_cell_and_turns_left(self):
        ant = LangtonsAnt(5, 5, random.Random(0), 0.0, CHARS)
        for _ in range(4):
            ant.step()  # back at origin, facing north, origin now black
        ant.step()
        self.assertEqual(ant._grid[2][2], 0)
        self.assertEqual(ant._direction, 3)
        self.assertEqual((ant._ant_row, ant._ant_col), (2, 1))

    def test_ant_render_marks_ant_position(self):
        ant = LangtonsAnt(3, 3, random.Random(0), 0.0, CHARS)
        self.assertIn(ANT_CHAR, ant.render())


class CliTests(unittest.TestCase):
    def test_steps_runs_and_exits_with_all_generations(self):
        proc = _run_cli("--rule", "30", "--steps", "2", "--width", "20", "--height", "10")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("generation 0", proc.stdout)
        self.assertIn("generation 2", proc.stdout)
        self.assertNotIn("\x1b[", proc.stdout)

    def test_seed_is_reproducible(self):
        args = ["--rule", "life", "--steps", "3", "--width", "20", "--height", "10", "--seed", "7"]
        first = _run_cli(*args)
        second = _run_cli(*args)
        self.assertEqual(first.returncode, 0)
        self.assertEqual(first.stdout, second.stdout)

    def test_steps_zero_dumps_initial_grid(self):
        proc = _run_cli("--rule", "life", "--steps", "0", "--width", "10", "--height", "4", "--seed", "3")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertEqual(proc.stdout.count("generation 0"), 1)

    def test_unknown_rule_fails_cleanly(self):
        proc = _run_cli("--rule", "nope")
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("unknown rule", proc.stderr)

    def test_invalid_density_fails_cleanly(self):
        proc = _run_cli("--rule", "30", "--density", "2")
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("density", proc.stderr)

    def test_negative_steps_fails_cleanly(self):
        proc = _run_cli("--rule", "30", "--steps", "-1")
        self.assertNotEqual(proc.returncode, 0)
        self.assertIn("steps", proc.stderr)

    def test_help_lists_rules_and_options(self):
        proc = subprocess.run(
            [sys.executable, "-m", "automatarium", "--help"],
            capture_output=True,
            text=True,
            cwd=ROOT,
        )
        self.assertEqual(proc.returncode, 0)
        self.assertIn("--rule", proc.stdout)
        self.assertIn("--steps", proc.stdout)
        self.assertIn("life", proc.stdout)
        self.assertIn("ant", proc.stdout)

    def test_version_flag(self):
        proc = subprocess.run(
            [sys.executable, "-m", "automatarium", "--version"],
            capture_output=True,
            text=True,
            cwd=ROOT,
        )
        self.assertEqual(proc.returncode, 0)
        self.assertIn("automatarium", proc.stdout)


if __name__ == "__main__":
    unittest.main()
