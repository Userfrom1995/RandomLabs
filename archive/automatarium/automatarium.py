#!/usr/bin/env python3
"""Automatarium - a terminal playground for cellular automata.

Render classic cellular automata live in your terminal using nothing but the
Python standard library: no dependencies, no browser, no assets.

Supported automata:
  * elementary cellular automata (Rule 30, Rule 90, Rule 110, ... any 0-255)
  * Conway's Game of Life
  * Langton's Ant

Run with `--help` for the full option reference, or see the README and the
`docs/` folder for detailed usage.
"""

from __future__ import annotations

import argparse
import random
import shutil
import sys
import time
from typing import Dict, List, Optional, Sequence, TextIO, Tuple

__version__ = "1.0.0"

DEFAULT_FPS = 10.0
DEFAULT_WIDTH = 80
DEFAULT_HEIGHT = 40
MAX_SIDE = 1000
MAX_ECA_RULE = 255

# Default initial "alive" probability per automaton kind when --density is
# not given explicitly.
DEFAULT_DENSITY: Dict[str, float] = {"eca": 0.5, "life": 0.4, "ant": 0.0}

ALIVE_CHAR = "\u2588"  # full block
DEAD_CHAR = " "
ANT_CHAR = "@"

_CLEAR = "\x1b[2J\x1b[H"
_HIDE_CURSOR = "\x1b[?25l"
_SHOW_CURSOR = "\x1b[?25h"

_LIFE_ALIASES = frozenset(
    {"life", "game-of-life", "gameoflife", "gol", "conway", "conways-game-of-life"}
)
_ANT_ALIASES = frozenset({"ant", "langton", "langtons-ant", "langtonsant"})


def _make_positive_int(name: str, maximum: Optional[int] = None):
    """Argparse type validating a strictly positive integer with an optional cap."""

    def _check(value: str) -> int:
        try:
            number = int(value)
        except ValueError:
            raise argparse.ArgumentTypeError(f"{name} must be an integer, got {value!r}")
        if number <= 0:
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
        raise argparse.ArgumentTypeError(f"steps must be an integer, got {value!r}")
    if number < 0:
        raise argparse.ArgumentTypeError(f"steps must be non-negative, got {number}")
    return number


def _positive_float(value: str) -> float:
    """Argparse type validating a strictly positive number."""
    try:
        number = float(value)
    except ValueError:
        raise argparse.ArgumentTypeError(f"fps must be a number, got {value!r}")
    if number <= 0:
        raise argparse.ArgumentTypeError(f"fps must be positive, got {number}")
    return number


def _density(value: str) -> float:
    """Argparse type validating a probability in the closed range [0, 1]."""
    try:
        number = float(value)
    except ValueError:
        raise argparse.ArgumentTypeError(f"density must be a number, got {value!r}")
    if not 0.0 <= number <= 1.0:
        raise argparse.ArgumentTypeError(f"density must be between 0 and 1, got {number}")
    return number


def parse_rule(value: str) -> Tuple[str, Optional[int]]:
    """Resolve a --rule value into a ``(kind, value)`` pair.

    Kinds are ``"eca"`` (value: rule number 0-255), ``"life"`` and ``"ant"``.
    Accepts the canonical names, common aliases, and ``rule<N>`` spelling for
    elementary rules.
    """
    token = str(value).strip().lower().replace("_", "-").replace(" ", "-")
    if token in _LIFE_ALIASES:
        return ("life", None)
    if token in _ANT_ALIASES:
        return ("ant", None)
    if token.startswith("rule"):
        token = token[4:].lstrip("-")
    if token.isdigit():
        number = int(token)
        if 0 <= number <= MAX_ECA_RULE:
            return ("eca", number)
    raise argparse.ArgumentTypeError(
        f"unknown rule {value!r}; choose 'life', 'ant', '30', or any elementary"
        f" rule number 0-{MAX_ECA_RULE}"
    )


class _Automaton:
    """Common interface shared by every automaton."""

    name = "automaton"

    def __init__(self, width: int, height: int, chars: Sequence[str]) -> None:
        if width < 1 or height < 1:
            raise ValueError("grid must be at least 1x1")
        self.width = width
        self.height = height
        self.alive, self.dead, self.ant = chars
        self.generation = 0

    def step(self) -> None:
        raise NotImplementedError

    def render(self) -> str:
        raise NotImplementedError


class ElementaryCellularAutomaton(_Automaton):
    """A one-dimensional elementary cellular automaton (Wolfram rules).

    State is a single row of ``width`` cells evolving through the rule's
    8-state lookup table. The picture is a rolling window of ``height`` rows:
    each generation is appended at the bottom and the oldest row scrolls off
    the top, so a long run never overflows the terminal.
    """

    def __init__(
        self,
        rule: int,
        width: int,
        height: int,
        rng: random.Random,
        density: float,
        chars: Sequence[str],
    ) -> None:
        super().__init__(width, height, chars)
        self.rule = rule
        self.name = f"Rule {rule}"
        # lookup[i] is the next-state for neighbourhood 3-bit index i.
        self._lookup: Tuple[int, ...] = tuple((rule >> i) & 1 for i in range(8))
        self._rows: List[List[int]] = [
            [0] * width for _ in range(height - 1)
        ] + [self._random_row(rng, density)]

    def _random_row(self, rng: random.Random, density: float) -> List[int]:
        return [1 if rng.random() < density else 0 for _ in range(self.width)]

    def step(self) -> None:
        top = self._rows[-1]
        width = self.width
        lookup = self._lookup
        next_row = [0] * width
        for col in range(width):
            left = top[col - 1] if col else 0
            right = top[col + 1] if col < width - 1 else 0
            index = (left << 2) | (top[col] << 1) | right
            next_row[col] = lookup[index]
        self._rows.pop(0)
        self._rows.append(next_row)
        self.generation += 1

    def render(self) -> str:
        return "\n".join(
            "".join(self.alive if cell else self.dead for cell in row)
            for row in self._rows
        )


class GameOfLife(_Automaton):
    """Conway's Game of Life on a fixed-size toroidal grid.

    The grid wraps around at every edge, so cells near the border behave
    exactly like cells in the middle of the (torus) plane.
    """

    name = "Game of Life"

    def __init__(
        self,
        width: int,
        height: int,
        rng: random.Random,
        density: float,
        chars: Sequence[str],
    ) -> None:
        super().__init__(width, height, chars)
        self._grid: List[List[int]] = [
            [1 if rng.random() < density else 0 for _ in range(width)]
            for _ in range(height)
        ]

    def step(self) -> None:
        grid = self._grid
        height, width = self.height, self.width
        next_grid = [[0] * width for _ in range(height)]
        for row in range(height):
            row_above = (row - 1) % height
            row_below = (row + 1) % height
            for col in range(width):
                col_left = (col - 1) % width
                col_right = (col + 1) % width
                neighbours = (
                    grid[row_above][col_left]
                    + grid[row_above][col]
                    + grid[row_above][col_right]
                    + grid[row][col_left]
                    + grid[row][col_right]
                    + grid[row_below][col_left]
                    + grid[row_below][col]
                    + grid[row_below][col_right]
                )
                alive = grid[row][col]
                if alive:
                    next_grid[row][col] = 1 if neighbours in (2, 3) else 0
                else:
                    next_grid[row][col] = 1 if neighbours == 3 else 0
        self._grid = next_grid
        self.generation += 1

    def render(self) -> str:
        return "\n".join(
            "".join(self.alive if cell else self.dead for cell in row)
            for row in self._grid
        )


class LangtonsAnt(_Automaton):
    """Langton's Ant on a toroidal grid.

    A single ant walks the grid flipping the colour of every cell it visits:
    on a white (dead) cell it turns right and paints it black (alive); on a
    black cell it turns left and paints it white. The resulting chaotic trail
    eventually self-organises into a repeating highway pattern.
    """

    name = "Langton's Ant"

    # (row, col) deltas for north, east, south, west.
    _DIRS = ((-1, 0), (0, 1), (1, 0), (0, -1))

    def __init__(
        self,
        width: int,
        height: int,
        rng: random.Random,
        density: float,
        chars: Sequence[str],
    ) -> None:
        super().__init__(width, height, chars)
        self._grid: List[List[int]] = [
            [1 if rng.random() < density else 0 for _ in range(width)]
            for _ in range(height)
        ]
        self._ant_row = height // 2
        self._ant_col = width // 2
        self._direction = 0  # north

    def step(self) -> None:
        grid = self._grid
        row, col = self._ant_row, self._ant_col
        if grid[row][col] == 0:
            self._direction = (self._direction + 1) % 4
            grid[row][col] = 1
        else:
            self._direction = (self._direction + 3) % 4
            grid[row][col] = 0
        drow, dcol = self._DIRS[self._direction]
        self._ant_row = (row + drow) % self.height
        self._ant_col = (col + dcol) % self.width
        self.generation += 1

    def render(self) -> str:
        ant_row, ant_col = self._ant_row, self._ant_col
        lines: List[str] = []
        for row in range(self.height):
            chars = [
                self.ant
                if (row == ant_row and col == ant_col)
                else (self.alive if cell else self.dead)
                for col, cell in enumerate(self._grid[row])
            ]
            lines.append("".join(chars))
        return "\n".join(lines)


def build_automaton(
    kind: str,
    value: Optional[int],
    width: int,
    height: int,
    density: float,
    rng: random.Random,
    chars: Sequence[str],
) -> _Automaton:
    if kind == "eca":
        return ElementaryCellularAutomaton(value, width, height, rng, density, chars)
    if kind == "life":
        return GameOfLife(width, height, rng, density, chars)
    if kind == "ant":
        return LangtonsAnt(width, height, rng, density, chars)
    raise ValueError(f"unknown automaton kind {kind!r}")


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="automatarium",
        description="Render classic cellular automata live in your terminal.",
        epilog=(
            "examples:\n"
            "  automatarium --rule 30\n"
            "  automatarium --rule life --seed 42\n"
            "  automatarium --rule ant --steps 5000 --fps 60\n"
            "  automatarium --rule 30 --width 160 --height 60 --steps 60 > rule30.txt\n"
            "\n"
            "When stdout is a terminal the automaton animates at --fps until you press\n"
            "Ctrl-C. When stdout is redirected, each frame is printed once, separated by\n"
            "a blank line, so runs can be captured to a file. Pass --steps N to run\n"
            "exactly N generations and then exit."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--rule",
        type=parse_rule,
        default=("eca", 30),
        metavar="RULE",
        help=(
            f"automaton to run: '30' (or any elementary rule 0-{MAX_ECA_RULE}), 'life',"
            " or 'ant' (default: 30)"
        ),
    )
    parser.add_argument(
        "--width",
        type=_make_positive_int("width", MAX_SIDE),
        default=DEFAULT_WIDTH,
        metavar="N",
        help=f"grid width in cells (default: {DEFAULT_WIDTH})",
    )
    parser.add_argument(
        "--height",
        type=_make_positive_int("height", MAX_SIDE),
        default=DEFAULT_HEIGHT,
        metavar="N",
        help=f"grid height in cells (default: {DEFAULT_HEIGHT})",
    )
    parser.add_argument(
        "--fps",
        type=_positive_float,
        default=DEFAULT_FPS,
        metavar="N",
        help=f"frames per second in animated mode (default: {DEFAULT_FPS})",
    )
    parser.add_argument(
        "--steps",
        type=_non_negative_int,
        default=None,
        metavar="N",
        help="run N generations then exit (default: run until interrupted)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        metavar="N",
        help="random seed for reproducible grids (default: random)",
    )
    parser.add_argument(
        "--density",
        type=_density,
        default=None,
        metavar="F",
        help=(
            "probability a cell starts alive, 0-1 (default: 0.5 for elementary rules,"
            " 0.4 for life, 0.0 for ant)"
        ),
    )
    parser.add_argument(
        "--alive",
        default=ALIVE_CHAR,
        metavar="CH",
        help="character for a live cell (default: full block)",
    )
    parser.add_argument(
        "--dead",
        default=DEAD_CHAR,
        metavar="CH",
        help="character for a dead cell (default: space)",
    )
    parser.add_argument(
        "--ant",
        default=ANT_CHAR,
        metavar="CH",
        help="character marking Langton's ant (default: '@')",
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"%(prog)s {__version__}",
    )
    return parser


def run(
    automaton: _Automaton,
    fps: float,
    steps: Optional[int],
    out: TextIO,
    interactive: bool,
) -> None:
    """Drive the animation loop until ``steps`` is reached or interrupted."""
    delay = 1.0 / fps
    generation = 0
    while True:
        header = (
            f"{automaton.name} | generation {generation} | "
            f"{automaton.width}x{automaton.height}"
        )
        frame = automaton.render()
        if interactive:
            out.write(_CLEAR + header + "\n" + frame)
        else:
            out.write(header + "\n" + frame + "\n")
        out.flush()
        if steps is not None and generation >= steps:
            return
        automaton.step()
        generation += 1
        if interactive:
            time.sleep(delay)


def _warn_if_oversized(automaton: _Automaton) -> None:
    columns, lines = shutil.get_terminal_size()
    if automaton.width > columns:
        print(
            f"automatarium: grid width {automaton.width} exceeds terminal width {columns};"
            f" rows will wrap (try --width {columns})",
            file=sys.stderr,
        )
    if automaton.height + 2 > lines:
        print(
            f"automatarium: grid height {automaton.height} exceeds terminal height"
            f" {lines}; the animation may not fit (try --height {max(1, lines - 2)})",
            file=sys.stderr,
        )


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = make_parser()
    args = parser.parse_args(argv)
    out = sys.stdout
    interactive = out.isatty()

    if args.seed is None:
        seed = random.randrange(1 << 32)
        print(
            f"automatarium: seed = {seed} (pass --seed {seed} to replay)",
            file=sys.stderr,
        )
    else:
        seed = args.seed
    rng = random.Random(seed)

    density = args.density if args.density is not None else DEFAULT_DENSITY[args.rule[0]]
    chars = (args.alive, args.dead, args.ant)
    automaton = build_automaton(
        args.rule[0],
        args.rule[1],
        args.width,
        args.height,
        density,
        rng,
        chars,
    )

    if interactive:
        _warn_if_oversized(automaton)
    elif args.steps is None:
        print(
            "automatarium: stdout is not a terminal; this run will loop forever and flood"
            " the stream - pass --steps N to limit the number of generations",
            file=sys.stderr,
        )

    try:
        if interactive:
            out.write(_HIDE_CURSOR)
            out.flush()
        run(automaton, args.fps, args.steps, out, interactive)
    except KeyboardInterrupt:
        print("automatarium: interrupted", file=sys.stderr)
    finally:
        if interactive:
            out.write(_SHOW_CURSOR)
            out.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main())
