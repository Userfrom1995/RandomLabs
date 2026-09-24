"""Fernwald - grow procedural plants and fractals from L-system grammars.

Fernwald is a small, dependency-free Python CLI that models plant growth as a
Lindenmayer system: a seed string (the *axiom*) is rewritten a fixed number of
times by a set of production *rules*, and the resulting command string is then
walked by a turtle that translates symbols into drawing commands (``F`` =
forward, ``+``/``-`` = turn, ``[``/``]`` = push/pop the branch stack). The same
tiny engine draws a leafy tree, a Barnsley-style fern, a Sierpinski triangle, a
dragon curve, or a Koch snowflake simply by swapping rule sets.

Two output modes are supported:

* **ASCII** - the turtle path is stroked into a character grid sized to your
  terminal. The default ``line`` style shades each segment by its slope
  (``-/|\\``) with ``*`` for leaf tips; the ``shade`` style accumulates stroke
  density and maps it through a greyscale ramp for a shaded, organic look.
* **SVG** - the same path is emitted as a ``<path>`` of line segments (with
  optional leaf-tip dots) for print-quality output, built from plain strings.

Everything runs on the Python standard library only (``argparse``, ``math``,
``random``, ``re``, ``shutil``, ``sys``, ``time``).

Run ``python3 -m fernwald --help`` for the full option list.
"""

from __future__ import annotations

__version__ = "1.0.0"

import argparse
import math
import os
import random
import re
import shutil
import sys
import time

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Symbols the turtle understands. Anything else left over after expansion is
# simply ignored (variables such as X/A/B that were not fully rewritten).
_FORWARD_DRAW = frozenset("FG")  # move forward and draw a line
_FORWARD_MOVE = frozenset("fg")  # move forward without drawing
_TURN_LEFT = "+"
_TURN_RIGHT = "-"
_PUSH = "["
_POP = "]"
# ``|`` separates stochastic alternatives inside a rule (see README).
_ALT = "|"

# Characters that can never be the left-hand side of a production rule.
_RESERVED_LHS = frozenset("+-|[];:(){} \t\n")
# Every symbol the turtle reads (drawing + movement). Used for validation.
_TURTLE_READ = frozenset("FGfg")

# A terminal cell is roughly twice as tall as it is wide, so a turtle step of
# unit length must span two columns to appear the same length as a vertical one.
_CELL_ASPECT = 2.0

# Hard limits so a huge grammar can never hang the process or eat all memory.
_MAX_EXPANSION = 2_000_000
_MAX_ITERATIONS = 20

_MIN_DIM = 4
_MAX_DIM = 400

_DEFAULT_PAD = 1
_DEFAULT_DELAY = 0.4

# Density ramp used by the ``shade`` style (dark -> bright).
_SHADE_RAMP = " .:-=+*#%@"

# Preset grammars. Each is a dict with the keys the grammar builder consumes:
# axiom, rules, angle, iterations. The stochastic ``wild`` garden needs a seed.
PRESETS = {
    "tree": {
        "axiom": "F",
        "rules": {"F": ["F[+F][-F]F"]},
        "angle": 30.0,
        "iterations": 5,
    },
    "fern": {
        "axiom": "X",
        "rules": {"X": ["F+[[X]-X]-F[-FX]+X"], "F": ["FF"]},
        "angle": 25.0,
        "iterations": 5,
    },
    "plant": {
        "axiom": "X",
        "rules": {"X": ["F[+X][-X]FX"], "F": ["FF"]},
        "angle": 20.0,
        "iterations": 6,
    },
    "sierpinski": {
        "axiom": "F-G-G",
        "rules": {"F": ["F-G+F+G-F"], "G": ["GG"]},
        "angle": 120.0,
        "iterations": 5,
    },
    "dragon": {
        "axiom": "FX",
        "rules": {"X": ["X+YF+"], "Y": ["-FX-Y"]},
        "angle": 90.0,
        "iterations": 12,
    },
    "koch": {
        "axiom": "F++F++F",
        "rules": {"F": ["F-F++F-F"]},
        "angle": 60.0,
        "iterations": 4,
    },
    "wild": {
        "axiom": "F",
        "rules": {
            "F": [
                "F[+F][-F]F",
                "F[+F]F[-F]",
                "FF[+F][-F]",
                "F[++F][--F]F",
            ]
        },
        "angle": 22.5,
        "iterations": 6,
    },
}


class FernwaldError(Exception):
    """Raised for any user-facing problem (bad grammar, unbalanced stack, ...)."""


class ExpansionError(FernwaldError):
    """Raised when a grammar grows past the configured safety cap."""


class GrammarError(FernwaldError):
    """Raised when a grammar file or inline grammar string is malformed."""


# ---------------------------------------------------------------------------
# Grammar parsing
# ---------------------------------------------------------------------------


def parse_grammar(
    text,
    default_angle,
    default_axiom,
    default_iterations,
):
    """Parse a grammar description into ``(axiom, rules, angle, iterations)``.

    ``text`` may be the contents of a grammar file or an inline string; both use
    the same statement format. Statements are separated by newlines or ``;``
    and ``#`` starts a comment. A statement is either a production rule
    (``A: F[+A][-A]``) or a directive (``angle 25.7``, ``axiom A``,
    ``iterations 5``). A rule's right-hand side may list several alternatives
    separated by ``|``; Fernwald then picks one at random per expansion (see
    ``expand``) - this is what powers the stochastic ``wild`` garden.

    Values not given in ``text`` fall back to the supplied defaults.
    """
    statements = [
        statement.strip()
        for chunk in re.split(r"[;\n]", text)
        for statement in chunk.split("#", 1)[:1]
    ]
    rules = {}
    axiom = None
    angle = None
    iterations = None
    for statement in statements:
        if not statement:
            continue
        if ":" in statement:
            lhs, rhs = statement.split(":", 1)
            lhs = lhs.strip()
            rhs = rhs.strip()
            if len(lhs) != 1:
                raise GrammarError(
                    "rule left-hand side must be a single symbol: %r" % statement
                )
            if lhs in _RESERVED_LHS:
                raise GrammarError(
                    "rule left-hand side %r is a reserved symbol" % lhs
                )
            if not rhs:
                raise GrammarError("rule %r has an empty right-hand side" % statement)
            alternatives = [alt.strip() for alt in rhs.split(_ALT)]
            alternatives = [alt for alt in alternatives if alt]
            if not alternatives:
                raise GrammarError("rule %r has an empty right-hand side" % statement)
            if lhs in rules:
                raise GrammarError("duplicate rule for symbol %r" % lhs)
            rules[lhs] = alternatives
        else:
            key, _, value = statement.partition(" ")
            key = key.strip()
            value = value.strip()
            if key == "angle":
                angle = _parse_positive_float(value, "angle")
            elif key == "axiom":
                if not value:
                    raise GrammarError("axiom must not be empty")
                axiom = value
            elif key == "iterations":
                iterations = _parse_non_negative_int(value, "iterations")
            else:
                raise GrammarError("unknown directive %r" % key)
    if not rules:
        raise GrammarError("no production rules found in grammar")
    if axiom is None:
        # A bare ``A: F[+A][-A]`` grammar implies axiom ``A``.
        axiom = default_axiom if default_axiom is not None else next(iter(rules))
    if angle is None:
        angle = default_angle
    if iterations is None:
        iterations = default_iterations
    return axiom, rules, angle, iterations


def _parse_positive_float(value, name):
    try:
        number = float(value)
    except ValueError:
        raise GrammarError("%s must be a number, got %r" % (name, value))
    if not math.isfinite(number) or number <= 0:
        raise GrammarError("%s must be a positive number, got %r" % (name, value))
    return number


def _parse_non_negative_int(value, name):
    try:
        number = int(value)
    except ValueError:
        raise GrammarError("%s must be an integer, got %r" % (name, value))
    if number < 0:
        raise GrammarError("%s must not be negative, got %r" % (name, value))
    return number


def read_grammar(source):
    """Read grammar text from ``source``.

    If ``source`` names an existing file its contents are read; otherwise
    ``source`` itself is treated as an inline grammar string. This is what lets
    ``--rules`` accept both ``fernwald/examples/plant.grow`` and
    ``'A: F[+A][-A]'``.
    """
    if os.path.isfile(source):
        try:
            with open(source, "r", encoding="utf-8") as handle:
                return handle.read()
        except OSError as exc:
            raise GrammarError("cannot read grammar file %r: %s" % (source, exc))
    return source


# ---------------------------------------------------------------------------
# Expansion
# ---------------------------------------------------------------------------


def expand(axiom, rules, iterations, rng=None):
    """Rewrite ``axiom`` ``iterations`` times using ``rules``.

    ``rules`` maps a symbol to a list of alternative right-hand sides. When a
    rule has more than one alternative the choice is made with ``rng`` (a
    :class:`random.Random`); pass a seeded RNG for reproducible gardens or
    ``None`` for a freshly seeded one. Symbols without a rule pass through
    unchanged, so constants like ``+ - [ ]`` survive until the turtle reads
    them. Raises :class:`ExpansionError` if the string would grow past
    ``_MAX_EXPANSION`` symbols.
    """
    if iterations < 0:
        raise ValueError("iterations must be >= 0")
    if iterations > _MAX_ITERATIONS:
        raise ExpansionError(
            "iterations %d exceeds the supported maximum of %d"
            % (iterations, _MAX_ITERATIONS)
        )
    if rng is None:
        rng = random.Random()
    current = axiom
    for _ in range(iterations):
        out = []
        size = 0
        for symbol in current:
            alternatives = rules.get(symbol)
            if alternatives is None:
                out.append(symbol)
                size += 1
            elif len(alternatives) == 1:
                out.append(alternatives[0])
                size += len(alternatives[0])
            else:
                chosen = rng.choice(alternatives)
                out.append(chosen)
                size += len(chosen)
            if size > _MAX_EXPANSION:
                raise ExpansionError(
                    "grammar grew past the %d-symbol safety cap; reduce "
                    "--iterations or simplify the rules" % _MAX_EXPANSION
                )
        current = "".join(out)
    return current


# ---------------------------------------------------------------------------
# Turtle interpretation
# ---------------------------------------------------------------------------


class TurtleError(FernwaldError):
    """Raised when a command string is structurally invalid (e.g. bad stack)."""


def interpret(sequence, angle_deg):
    """Walk ``sequence`` with a turtle and return ``(segments, tips)``.

    * ``segments`` - list of ``(x1, y1, x2, y2)`` floats in turtle space,
      one per drawing step (``F``/``G``).
    * ``tips`` - list of ``(x, y)`` points where a branch ends: the endpoint of
      the last drawn segment before a ``]`` (pop) or before the end of the
      string. These become leaf dots.

    The turtle starts at ``(0, 0)`` facing "up" (the positive Y axis, i.e. a
    90-degree heading) so that plants and trees grow upright. ``+`` turns left
    (counter-clockwise) by ``angle_deg``, ``-`` turns right. ``[`` pushes the
    current position and heading, ``]`` pops them back. ``f``/``g`` move
    without drawing. Unbalanced brackets raise :class:`TurtleError`.
    """
    angle = math.radians(angle_deg)
    x = y = 0.0
    heading = math.pi / 2.0  # start facing up so trees/ferns stand upright
    stack = []
    segments = []
    tips = []
    last_draw_end = None
    for symbol in sequence:
        if symbol in _FORWARD_DRAW:
            step_x = math.cos(heading)
            step_y = math.sin(heading)
            nx = round(x + step_x, 9)
            ny = round(y + step_y, 9)
            segments.append((x, y, nx, ny))
            x, y = nx, ny
            last_draw_end = (x, y)
        elif symbol in _FORWARD_MOVE:
            step_x = math.cos(heading)
            step_y = math.sin(heading)
            x, y = round(x + step_x, 9), round(y + step_y, 9)
            last_draw_end = None
        elif symbol == _TURN_LEFT:
            heading += angle
        elif symbol == _TURN_RIGHT:
            heading -= angle
        elif symbol == _PUSH:
            stack.append((x, y, heading))
            last_draw_end = None
        elif symbol == _POP:
            if not stack:
                raise TurtleError(
                    "unbalanced ']' in the command string; the grammar produces "
                    "more pops than pushes"
                )
            if last_draw_end is not None:
                tips.append(last_draw_end)
            x, y, heading = stack.pop()
            last_draw_end = None
        # Any other symbol is a variable that has no turtle meaning; ignore it.
    if last_draw_end is not None:
        tips.append(last_draw_end)
    return segments, tips


def bounding_box(segments):
    """Return ``(minx, miny, maxx, maxy)`` over every segment endpoint."""
    minx = miny = float("inf")
    maxx = maxy = float("-inf")
    for x1, y1, x2, y2 in segments:
        minx = min(minx, x1, x2)
        maxx = max(maxx, x1, x2)
        miny = min(miny, y1, y2)
        maxy = max(maxy, y1, y2)
    if minx > maxx or miny > maxy:
        raise FernwaldError("the drawing is empty; nothing to render")
    return minx, miny, maxx, maxy


def fit_transform(segments, cols, rows, pad):
    """Build a turtle-space -> grid-space mapping for a ``cols`` x ``rows`` grid.

    Returns a callable ``fit(x, y) -> (c, r)`` producing fractional grid
    coordinates. The drawing is scaled to fit the available area with
    ``pad`` blank cells on every side, centered both ways, and *vertically
    flipped* (turtle "up" becomes grid "up"). Because terminal cells are
    roughly twice as tall as wide, horizontal turtle extents are stretched by
    ``_CELL_ASPECT`` so lengths look equal on screen.
    """
    minx, miny, maxx, maxy = bounding_box(segments)
    xrange = max(maxx - minx, 1e-9)
    yrange = max(maxy - miny, 1e-9)
    avail_w = max(cols - 2 * pad, 1)
    avail_h = max(rows - 2 * pad, 1)
    scale = min(avail_w / (_CELL_ASPECT * xrange), avail_h / yrange)
    offset_c = pad + (avail_w - _CELL_ASPECT * xrange * scale) / 2.0
    offset_r = pad + (avail_h - yrange * scale) / 2.0

    def fit(x, y):
        c = offset_c + (x - minx) * _CELL_ASPECT * scale
        r = offset_r + (maxy - y) * scale
        return c, r

    return fit


# ---------------------------------------------------------------------------
# ASCII rendering
# ---------------------------------------------------------------------------


def _line_glyph(dx, dy):
    """Pick a glyph for a segment given its grid-space delta (``\\`` for like
    signs, ``/`` for opposite signs; ``-``/``|`` for axis-aligned runs)."""
    adx = abs(dx)
    ady = abs(dy)
    if adx < ady * 0.5:
        return "|"
    if ady < adx * 0.5:
        return "-"
    return "\\" if (dx > 0) == (dy > 0) else "/"


def _shade_glyph(hits):
    """Map a stroke-density count onto the greyscale ramp."""
    index = hits if hits < len(_SHADE_RAMP) else len(_SHADE_RAMP) - 1
    return _SHADE_RAMP[index]


def _stroke_line(grid, hits, p1, p2, style):
    """Paint one straight segment into ``grid`` with sub-cell sampling.

    Every cell within ~half a cell of the segment is painted; ``hits`` counts
    passes per cell so the ``shade`` style can accumulate density. Cells are
    overwritten in the ``line`` style (last stroke wins).
    """
    (x1, y1), (x2, y2) = p1, p2
    dx, dy = x2 - x1, y2 - y1
    span = max(abs(dx), abs(dy))
    steps = max(1, int(math.ceil(span * 2.0)))
    rows = len(grid)
    cols = len(grid[0]) if rows else 0
    for i in range(steps + 1):
        t = i / steps
        c = int(round(x1 + dx * t))
        r = int(round(y1 + dy * t))
        if 0 <= r < rows and 0 <= c < cols:
            grid[r][c] = _line_glyph(dx, dy) if style == "line" else " "
            hits[r][c] += 1


def _finalize_shade(grid, hits):
    """Replace the per-cell density counts with ramp glyphs."""
    for r in range(len(grid)):
        for c in range(len(grid[r])):
            if hits[r][c]:
                grid[r][c] = _shade_glyph(hits[r][c])


def render_ascii(segments, tips, cols, rows, style="line", pad=_DEFAULT_PAD):
    """Render ``segments``/``tips`` into a ``cols`` x ``rows`` ASCII grid.

    ``style`` is ``"line"`` (slope-shaded line art) or ``"shade"`` (density
    ramp). Leaf tips are always drawn as ``*``. Returns the artwork as a string
    with rows joined by newlines; empty columns/rows at the edges are kept so
    the output always has exactly ``rows`` lines.
    """
    cols = max(int(cols), _MIN_DIM)
    rows = max(int(rows), _MIN_DIM)
    if style not in ("line", "shade"):
        raise ValueError("unknown style %r" % style)
    grid = [[" "] * cols for _ in range(rows)]
    hits = [[0] * cols for _ in range(rows)]
    fit = fit_transform(segments, cols, rows, pad)
    for x1, y1, x2, y2 in segments:
        _stroke_line(grid, hits, fit(x1, y1), fit(x2, y2), style)
    if style == "shade":
        _finalize_shade(grid, hits)
    for tx, ty in tips:
        c, r = fit(tx, ty)
        cell_c = int(round(c))
        cell_r = int(round(r))
        if 0 <= cell_r < rows and 0 <= cell_c < cols:
            grid[cell_r][cell_c] = "*"
    return "\n".join("".join(row) for row in grid)


# ---------------------------------------------------------------------------
# SVG export
# ---------------------------------------------------------------------------


def _fmt(number):
    """Format a float compactly for SVG output."""
    return "%g" % round(number, 2)


def export_svg(
    segments,
    tips,
    width=800,
    height=800,
    stroke="#2f9e63",
    leaves=True,
    pad=20,
):
    """Export the turtle path as an SVG document string.

    Pixels are square in SVG space so no aspect correction is applied; the
    drawing is scaled to fit, centered, and vertically flipped. The path is
    emitted as one ``<path>`` containing an ``M ... L ...`` command per
    segment, which avoids spurious connector lines across branch jumps. Leaf
    tips become small filled circles when ``leaves`` is true.
    """
    minx, miny, maxx, maxy = bounding_box(segments)
    xrange = max(maxx - minx, 1e-9)
    yrange = max(maxy - miny, 1e-9)
    avail_w = max(width - 2 * pad, 1)
    avail_h = max(height - 2 * pad, 1)
    scale = min(avail_w / xrange, avail_h / yrange)
    offset_x = pad + (avail_w - xrange * scale) / 2.0
    offset_y = pad + (avail_h - yrange * scale) / 2.0

    def sx(x):
        return offset_x + (x - minx) * scale

    def sy(y):
        return offset_y + (maxy - y) * scale

    commands = []
    for x1, y1, x2, y2 in segments:
        commands.append(
            "M%s %s L%s %s" % (_fmt(sx(x1)), _fmt(sy(y1)), _fmt(sx(x2)), _fmt(sy(y2)))
        )
    stroke_width = max(0.75, scale * 0.08)
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" '
        'viewBox="0 0 %d %d">' % (width, height, width, height),
        '<path d="%s" fill="none" stroke="%s" stroke-width="%g" '
        'stroke-linecap="round"/>' % (" ".join(commands), stroke, stroke_width),
    ]
    if leaves:
        radius = max(1.5, scale * 0.12)
        for tx, ty in tips:
            parts.append(
                '<circle cx="%s" cy="%s" r="%g" fill="%s"/>'
                % (_fmt(sx(tx)), _fmt(sy(ty)), radius, stroke)
            )
    parts.append("</svg>")
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _terminal_size():
    try:
        cols, rows = shutil.get_terminal_size((80, 24))
    except Exception:
        cols, rows = 80, 24
    return cols, rows


def _clamp(value, low, high):
    return max(low, min(high, value))


def build_parser():
    """Build the command-line argument parser."""
    parser = argparse.ArgumentParser(
        prog="fernwald",
        description=(
            "Grow procedural plants and fractals from L-system grammar rules "
            "and render them in the terminal (or as SVG)."
        ),
        epilog=(
            "example: python3 -m fernwald --preset fern --iterations 5\n"
            "example: python3 -m fernwald --rules 'A: F[+A][-A]' --seed 1 --svg"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--preset",
        metavar="NAME",
        default=None,
        help=(
            "built-in grammar to use: %s (default: tree). Overridden by "
            "--rules." % ", ".join(sorted(PRESETS))
        ),
    )
    parser.add_argument(
        "--rules",
        metavar="TEXT",
        default=None,
        help=(
            "custom grammar as an inline string (e.g. 'A: F[+A][-A]') or the "
            "path to a .grow grammar file. Replaces --preset."
        ),
    )
    parser.add_argument(
        "--axiom",
        metavar="TEXT",
        default=None,
        help="override the axiom (seed string) of the grammar.",
    )
    parser.add_argument(
        "--angle",
        metavar="DEG",
        type=float,
        default=None,
        help="override the turn angle in degrees (0 < angle <= 360).",
    )
    parser.add_argument(
        "--iterations",
        metavar="N",
        type=int,
        default=None,
        help="override the number of rewrite iterations (0..%d)." % _MAX_ITERATIONS,
    )
    parser.add_argument(
        "--seed",
        metavar="N",
        type=int,
        default=None,
        help=(
            "seed for stochastic grammars (e.g. --preset wild) so a garden "
            "is reproducible; also seeds --animate."
        ),
    )
    parser.add_argument(
        "--width",
        metavar="COLS",
        type=int,
        default=None,
        help="render width in columns (%d..%d); default: terminal width."
        % (_MIN_DIM, _MAX_DIM),
    )
    parser.add_argument(
        "--height",
        metavar="ROWS",
        type=int,
        default=None,
        help="render height in rows (%d..%d); default: terminal height - 1."
        % (_MIN_DIM, _MAX_DIM),
    )
    parser.add_argument(
        "--pad",
        metavar="N",
        type=int,
        default=_DEFAULT_PAD,
        help="blank cells left around the drawing (default: %d)." % _DEFAULT_PAD,
    )
    parser.add_argument(
        "--style",
        choices=("line", "shade"),
        default="line",
        help=(
            "ASCII rendering style: 'line' shades each segment by slope with "
            "* leaf tips (default), 'shade' accumulates stroke density into a "
            "greyscale ramp."
        ),
    )
    parser.add_argument(
        "--svg",
        action="store_true",
        help="emit an SVG document instead of ASCII art (pipe to a .svg file).",
    )
    parser.add_argument(
        "--svg-width",
        metavar="PX",
        type=int,
        default=800,
        help="SVG canvas width in pixels (default: 800).",
    )
    parser.add_argument(
        "--svg-height",
        metavar="PX",
        type=int,
        default=800,
        help="SVG canvas height in pixels (default: 800).",
    )
    parser.add_argument(
        "--stroke",
        metavar="COLOR",
        default="#2f9e63",
        help="SVG stroke color (default: #2f9e63, a forest green).",
    )
    parser.add_argument(
        "--no-leaves",
        action="store_true",
        help="omit the leaf-tip dots in SVG output.",
    )
    parser.add_argument(
        "--animate",
        action="store_true",
        help=(
            "step the iteration count from 0 up to --iterations, redrawing "
            "each frame so the plant visibly grows (needs a TTY for the clear)."
        ),
    )
    parser.add_argument(
        "--delay",
        metavar="SECS",
        type=float,
        default=_DEFAULT_DELAY,
        help="seconds between --animate frames (default: %g)." % _DEFAULT_DELAY,
    )
    parser.add_argument(
        "--list-presets",
        action="store_true",
        help="print the available built-in grammars and exit.",
    )
    parser.add_argument(
        "--version",
        action="version",
        version="fernwald %s" % __version__,
    )
    return parser


def _describe_preset(name, preset):
    rules = "; ".join(
        "%s: %s" % (symbol, " | ".join(alts)) for symbol, alts in preset["rules"].items()
    )
    return "%s\n  axiom: %s\n  angle: %g degrees\n  iterations: %d\n  rules: %s" % (
        name,
        preset["axiom"],
        preset["angle"],
        preset["iterations"],
        rules,
    )


def list_presets():
    """Return a human-readable listing of the built-in grammars."""
    lines = ["built-in grammars (--preset NAME):", ""]
    for name in sorted(PRESETS):
        lines.append(_describe_preset(name, PRESETS[name]))
        lines.append("")
    return "\n".join(lines).rstrip()


def resolve_grammar(args):
    """Resolve ``args`` into a ``(axiom, rules, angle, iterations)`` tuple.

    ``--rules`` wins over ``--preset``; ``--axiom``/``--angle``/``--iterations``
    always override the resolved grammar.
    """
    if args.rules is not None:
        if args.preset is not None:
            raise FernwaldError("--rules and --preset are mutually exclusive")
        text = read_grammar(args.rules)
        axiom, rules, angle, iterations = parse_grammar(text, 22.5, None, 5)
    else:
        preset = args.preset if args.preset is not None else "tree"
        if preset not in PRESETS:
            raise FernwaldError(
                "unknown preset %r; choose one of: %s"
                % (preset, ", ".join(sorted(PRESETS)))
            )
        spec = PRESETS[preset]
        axiom = spec["axiom"]
        rules = spec["rules"]
        angle = spec["angle"]
        iterations = spec["iterations"]
    if args.axiom is not None:
        axiom = args.axiom
    if args.angle is not None:
        angle = args.angle
    if args.iterations is not None:
        iterations = args.iterations
    _validate_grammar(axiom, angle, iterations)
    return axiom, rules, angle, iterations


def _validate_grammar(axiom, angle, iterations):
    if not axiom:
        raise FernwaldError("the axiom must not be empty")
    if _ALT in axiom:
        raise FernwaldError("the axiom must not contain the alternative marker %r" % _ALT)
    if not (0.0 < angle <= 360.0):
        raise FernwaldError("angle must be in (0, 360] degrees, got %r" % angle)
    if not (0 <= iterations <= _MAX_ITERATIONS):
        raise FernwaldError(
            "iterations must be in 0..%d, got %d" % (_MAX_ITERATIONS, iterations)
        )


def _output_size(args):
    cols, rows = _terminal_size()
    width = args.width if args.width is not None else cols
    height = args.height if args.height is not None else max(rows - 1, _MIN_DIM)
    width = _clamp(int(width), _MIN_DIM, _MAX_DIM)
    height = _clamp(int(height), _MIN_DIM, _MAX_DIM)
    return width, height


def _render_frame(axiom, rules, angle, iterations, rng, args, width, height):
    sequence = expand(axiom, rules, iterations, rng)
    segments, tips = interpret(sequence, angle)
    if args.svg:
        return export_svg(
            segments,
            tips,
            width=args.svg_width,
            height=args.svg_height,
            stroke=args.stroke,
            leaves=not args.no_leaves,
        )
    return render_ascii(
        segments,
        tips,
        width,
        height,
        style=args.style,
        pad=args.pad,
    )


def run(args, out=None, err=None):
    """Execute the CLI for parsed ``args``; return an exit code."""
    out = out if out is not None else sys.stdout
    err = err if err is not None else sys.stderr
    if args.list_presets:
        out.write(list_presets() + "\n")
        return 0
    try:
        axiom, rules, angle, iterations = resolve_grammar(args)
        width, height = _output_size(args)
        rng = random.Random(args.seed)
        if args.svg and args.animate:
            raise FernwaldError("--animate is only supported for ASCII output")
        if args.animate:
            frames = iterations + 1
            isatty = hasattr(out, "isatty") and out.isatty()
            for step in range(frames):
                frame = _render_frame(
                    axiom, rules, angle, step, rng, args, width, height
                )
                if isatty:
                    out.write("\x1b[2J\x1b[H")
                out.write(frame)
                if step < frames - 1:
                    out.write("\n")
                    out.flush()
                    time.sleep(max(args.delay, 0.0))
            out.flush()
        else:
            out.write(_render_frame(axiom, rules, angle, iterations, rng, args, width, height))
            out.write("\n")
        return 0
    except FernwaldError as exc:
        err.write("fernwald: error: %s\n" % exc)
        return 2
    except KeyboardInterrupt:
        err.write("\nfernwald: interrupted\n")
        return 130


def main(argv=None):
    """Entry point used by ``python3 -m fernwald``."""
    parser = build_parser()
    args = parser.parse_args(argv)
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
