"""Magnification engine: terminal size plus mode to integer pixel scale.

The scene painter draws a fixed 28x34 composition (COLS=28, ROWS=34 in
render/scene.py: HUD rows plus maze). This module answers the next
question: how many terminal cells should each scene cell cover. It is
pure (no I/O, never raises) so layout code, the composer, and tests
can share one source of truth.

Modes:
- classic: always 1x1, the reference 28x34 frame.
- wide: 2x horizontal only, when the terminal fits 56x34.
- full: independent axes, 2x horizontal when width fits 56 plus 2x
  vertical when height fits 68, so narrow-tall and wide-short
  terminals each gain what they can.
- auto: full when it yields 2x2, else wide when it yields 2x
  horizontal, else classic.

check() is the raising validator for CLI input. choose() is the
total function used at runtime: bad dimensions coerce to (0,0) which
selects classic, and unknown modes fall back to classic without
raising. Scales clamp to 1..2 per axis; larger factors stay a later
visual-effects decision, not a silent surprise here.
"""

BASE_COLS = 28
BASE_ROWS = 34

MODES = ("auto", "classic", "wide", "full")


def _clamp_factor(value):
    """Coerce an axis factor to int clamped to 1..2. Never raises."""
    try:
        v = int(value)
    except (TypeError, ValueError):
        return 1
    if v < 1:
        return 1
    if v > 2:
        return 2
    return v


def _coerce_dim(value):
    """Coerce a terminal dimension to a non-negative int. Never raises."""
    try:
        v = int(value)
    except (TypeError, ValueError):
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
        self.maze_rows = self.sy * BASE_ROWS

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


def _wide_factors(cols, rows):
    """Wide factors for coerced dims: 2x horizontal iff 56x34 fits."""
    sx = 2 if (cols >= BASE_COLS * 2 and rows >= BASE_ROWS) else 1
    return sx, 1


def _full_factors(cols, rows):
    """Full factors for coerced dims: independent axes (56 cols, 68 rows)."""
    sx = 2 if cols >= BASE_COLS * 2 else 1
    sy = 2 if rows >= BASE_ROWS * 2 else 1
    return sx, sy


def choose(term_cols, term_rows, mode="auto"):
    """Pick a Scale for a terminal size and mode. Never raises.

    Bad dimensions coerce to (0,0), which selects classic 1x1.
    Unknown modes fall back to classic without raising (check() is
    the raising validator for CLI input).
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
        sx, sy = _wide_factors(cols, rows)
    elif m == "full":
        sx, sy = _full_factors(cols, rows)
    else:  # auto: full 2x2 wins, else wide 2x, else classic
        fx, fy = _full_factors(cols, rows)
        if fx == 2 and fy == 2:
            sx, sy = fx, fy
        else:
            wx, wy = _wide_factors(cols, rows)
            if wx == 2:
                sx, sy = wx, wy
            else:
                sx, sy = 1, 1
    return Scale(m, sx, sy)


def fits(term_cols, term_rows, sx, sy):
    """True when the scaled maze box fits the terminal. Never raises."""
    cols = _coerce_dim(term_cols)
    rows = _coerce_dim(term_rows)
    fx = _clamp_factor(sx)
    fy = _clamp_factor(sy)
    try:
        return (fx * BASE_COLS <= cols) and (fy * BASE_ROWS <= rows)
    except Exception:
        return False


def describe(scale):
    """One-line human report, e.g. scale auto: 2x1 (maze 56x34)."""
    try:
        return "scale %s: %dx%d (maze %dx%d)" % (
            scale.mode, scale.sx, scale.sy, scale.maze_cols, scale.maze_rows)
    except Exception:
        return "scale classic: 1x1 (maze %dx%d)" % (BASE_COLS, BASE_ROWS)
