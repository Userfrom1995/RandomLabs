"""Magnification engine: terminal size plus mode to integer pixel scale.

The scene painter draws a fixed 28-column composition (COLS=28 in
render/scene.py): 3 HUD text rows plus a 28x31 maze playfield. This module
answers the next question: how many terminal cells should each maze cell
cover. It is pure (no I/O, never raises) so layout code, the composer, and
tests can share one source of truth.

Geometry note: only the maze playfield magnifies. The 3 HUD text rows
always render at 1x, centered over the magnified maze (magnifying text
duplicates every letter, the shatter bug). So the maze box is
``28*sx`` wide and ``3 + 31*sy`` tall.

Modes:
- classic: always 1x1, the reference 28x34 frame.
- wide: horizontal stretch only (sx fills, sy stays 1).
- full/auto: independent axes fill the window, capped at 4 per axis,
  with one aspect guard: when the window only fits one row of maze
  cells (sy == 1), sx caps at 2, because beyond 2-wide glyphs distort
  and the dashboard/legend chrome fills the sides better. auto and
  full currently agree; auto stays as the stable default name.

check() is the raising validator for CLI input. choose() is the
total function used at runtime: bad dimensions coerce to (0,0) which
selects 1x1, and unknown modes fall back to classic without raising.
"""

BASE_COLS = 28
MAZE_ROWS = 31
HUD_ROWS = 3

MAX_FACTOR = 4

MODES = ("auto", "classic", "wide", "full")


def _clamp_factor(value):
    """Coerce an axis factor to int clamped to 1..MAX_FACTOR. Never raises."""
    try:
        v = int(value)
    except (TypeError, ValueError, OverflowError):
        return 1
    if v < 1:
        return 1
    if v > MAX_FACTOR:
        return MAX_FACTOR
    return v


def _coerce_dim(value):
    """Coerce a terminal dimension to a non-negative int. Never raises."""
    try:
        v = int(value)
    except (TypeError, ValueError, OverflowError):
        return 0
    if v < 0:
        return 0
    return v


class Scale:
    """Chosen magnification: mode plus integer factors and maze box."""

    __slots__ = ("mode", "sx", "sy", "maze_cols", "maze_rows")

    def __init__(self, mode="classic", sx=1, sy=1):
        try:
            m = str(mode)
        except Exception:
            m = "classic"
        if m not in MODES:
            m = "classic"
        self.mode = m
        self.sx = _clamp_factor(sx)
        self.sy = _clamp_factor(sy)
        self.maze_cols = self.sx * BASE_COLS
        self.maze_rows = HUD_ROWS + self.sy * MAZE_ROWS

    def __eq__(self, other):
        if not isinstance(other, Scale):
            return NotImplemented
        return (self.mode == other.mode and self.sx == other.sx
                and self.sy == other.sy
                and self.maze_cols == other.maze_cols
                and self.maze_rows == other.maze_rows)

    def __repr__(self):
        return "Scale(mode=%r, sx=%d, sy=%d)" % (self.mode, self.sx, self.sy)


def check(mode):
    """Validate a mode name against MODES. Raises ValueError otherwise."""
    if mode not in MODES:
        raise ValueError("unknown scale mode: %r (expected one of %s)"
                         % (mode, ", ".join(MODES)))
    return mode


def _fill_factors(cols, rows):
    """Largest 1..4 factors whose maze box fits cols x rows. Never raises."""
    sx = _clamp_factor(cols // BASE_COLS)
    room = rows - HUD_ROWS
    sy = _clamp_factor(room // MAZE_ROWS if room > 0 else 0)
    return sx, sy


def _cap_stretch(sx, sy):
    """Aspect guard: single-tall rows cap width at 2x. Never raises."""
    try:
        fx, fy = int(sx), int(sy)
    except (TypeError, ValueError, OverflowError):
        return 1, 1
    if fy <= 1 and fx > 2:
        return 2, fy
    return fx, fy


def choose(term_cols, term_rows, mode="auto"):
    """Pick a Scale for a terminal size and mode. Never raises.

    Bad dimensions coerce to (0,0), which selects 1x1. Unknown modes
    fall back to classic without raising (check() is the raising
    validator for CLI input). When the picked box still does not fit,
    the layout engine falls back to the follow-cam viewport, so tiny
    windows (down to 28x16) still play.
    """
    cols = _coerce_dim(term_cols)
    rows = _coerce_dim(term_rows)
    try:
        m = str(mode)
    except Exception:
        m = "classic"
    if m not in MODES:
        m = "classic"
    if m == "classic":
        sx, sy = 1, 1
    elif m == "wide":
        # Horizontal stretch only, capped like auto's single-tall rows:
        # beyond 2-wide the dashboard and legend chrome fill the window
        # better than fatter glyphs (120x50 stays 2x1 with full chrome).
        sx, _sy = _fill_factors(cols, rows)
        sx, sy = _cap_stretch(sx, 1)
    else:  # auto / full: fill both axes with the stretch cap
        sx, sy = _cap_stretch(*_fill_factors(cols, rows))
    return Scale(m, sx, sy)


def fits(term_cols, term_rows, sx, sy):
    """True when the scaled maze box fits the terminal. Never raises."""
    cols = _coerce_dim(term_cols)
    rows = _coerce_dim(term_rows)
    fx = _clamp_factor(sx)
    fy = _clamp_factor(sy)
    try:
        return (fx * BASE_COLS <= cols
                and HUD_ROWS + fy * MAZE_ROWS <= rows)
    except Exception:
        return False


def describe(scale):
    """One-line human report, e.g. scale auto: 2x1 (maze 56x34)."""
    try:
        return "scale %s: %dx%d (maze %dx%d)" % (
            scale.mode, scale.sx, scale.sy, scale.maze_cols, scale.maze_rows)
    except Exception:
        return "scale classic: 1x1 (maze %dx%d)" % (BASE_COLS, HUD_ROWS + MAZE_ROWS)
