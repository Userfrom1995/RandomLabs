"""Responsive layout engine: terminal size -> fullscreen canvas regions.

The engine is pure (no I/O, no terminal access) so it is unit-testable and
the verify matrix can pin it headlessly. Given the live terminal size it
decides which regions exist and where the 28x34 maze composition sits:

- The maze frame (28x34, HUD plus maze) always renders at full size; it is
  never squeezed or scaled here (scaling is a later visual-effects wave).
- A right dashboard (live score, run, and progress data) appears once the
  maze fits with room to spare; a left controls-and-legend panel appears
  once both fit. The whole composition stays centered as one block.
- Tall windows gain a title strip on top and a hints status bar at the
  bottom instead of dead space.
- Below 28x34 the layout reports fits=False and the shell shows the
  too-small card instead of a game frame.

Thresholds live here next to the geometry they guard so the CLI
--layout-check report, the composer, and the tests share one source.
"""

from collections import namedtuple

from .scene import COLS, ROWS

RIGHT_WIDTH = 26
LEFT_WIDTH = 22
GAP = 2

# Maze (28) + gap + right panel (26): the dashboard joins past this width.
RIGHT_MIN_COLS = COLS + GAP + RIGHT_WIDTH
# Right composition + gap + left panel (22): full chrome past this width.
LEFT_MIN_COLS = RIGHT_MIN_COLS + GAP + LEFT_WIDTH
# Maze (34) + gap + status bar: hints strip past this height.
STATUS_MIN_ROWS = ROWS + GAP
# Status composition + title strip and spacing: full height chrome past here.
TITLE_MIN_ROWS = ROWS + 6

Rect = namedtuple("Rect", ("x", "y", "w", "h"))


class Layout:
    """Placed regions for one terminal size. Rects are (x, y, w, h) cells."""

    __slots__ = ("term_cols", "term_rows", "fits", "frame_cols",
                 "frame_rows", "maze_ox", "maze_oy", "maze_w", "maze_h",
                 "left", "right", "status_y", "title_y")

    def __init__(self, term_cols, term_rows, fits, frame_cols, frame_rows,
                 maze_ox, maze_oy, left, right, status_y, title_y,
                 maze_w=COLS, maze_h=ROWS):
        self.term_cols = term_cols
        self.term_rows = term_rows
        self.fits = fits
        self.frame_cols = frame_cols
        self.frame_rows = frame_rows
        self.maze_ox = maze_ox
        self.maze_oy = maze_oy
        self.maze_w = maze_w
        self.maze_h = maze_h
        self.left = left
        self.right = right
        self.status_y = status_y
        self.title_y = title_y

    def __eq__(self, other):
        if not isinstance(other, Layout):
            return NotImplemented
        return all(getattr(self, name) == getattr(other, name)
                   for name in self.__slots__)

    def __repr__(self):
        return ("Layout(%dx%d fits=%s maze=%dx%d@(%d,%d) left=%s right=%s "
                "status=%s title=%s)" % (
                    self.term_cols, self.term_rows, self.fits,
                    self.maze_w, self.maze_h, self.maze_ox, self.maze_oy,
                    self.left, self.right,
                    self.status_y, self.title_y))


def compute(term_cols, term_rows):
    """Map a terminal size to placed canvas regions. Never raises."""
    return compute_scaled(term_cols, term_rows, COLS, ROWS)


def compute_scaled(term_cols, term_rows, mw=COLS, mh=ROWS):
    """Map a terminal size to regions for a magnified maze box.

    mw/mh is the maze composition size in terminal cells (28x34 at 1x,
    56x34 at wide 2x1, 56x68 at full 2x2). Panel thresholds scale with
    the maze: the right dashboard joins past mw + gap + 26, the left
    panel past that plus gap + 22, strips past mh + gaps. Below the maze
    box the layout reports fits=False and the shell shows the too-small
    card. Never raises.
    """
    try:
        cols, rows = int(term_cols), int(term_rows)
    except (TypeError, ValueError):
        cols, rows = 0, 0
    cols, rows = max(0, cols), max(0, rows)
    try:
        mw, mh = max(1, int(mw)), max(1, int(mh))
    except (TypeError, ValueError):
        mw, mh = COLS, ROWS
    if cols < mw or rows < mh:
        return Layout(cols, rows, False, max(cols, 1), max(rows, 1),
                      0, 0, None, None, None, None, mw, mh)
    right_min = mw + GAP + RIGHT_WIDTH
    left_min = right_min + GAP + LEFT_WIDTH
    status_min = mh + GAP
    title_min = mh + 6
    right = cols >= right_min
    left = right and cols >= left_min
    total_w = mw + (GAP + RIGHT_WIDTH if right else 0)
    if left:
        total_w += GAP + LEFT_WIDTH
    base_ox = (cols - total_w) // 2
    maze_ox = base_ox + (GAP + LEFT_WIDTH if left else 0)
    status_y = (rows - 1) if rows >= status_min else None
    title_y = 0 if rows >= title_min else None
    top_reserved = 2 if title_y is not None else 0
    bottom_reserved = 2 if status_y is not None else 0
    maze_oy = top_reserved + (rows - top_reserved - bottom_reserved - mh) // 2
    left_rect = Rect(base_ox, maze_oy, LEFT_WIDTH, mh) if left else None
    right_rect = (Rect(maze_ox + mw + GAP, maze_oy, RIGHT_WIDTH, mh)
                  if right else None)
    return Layout(cols, rows, True, cols, rows, maze_ox, maze_oy,
                  left_rect, right_rect, status_y, title_y, mw, mh)


def describe(layout):
    """Human-readable region report for --layout-check and debugging."""
    lines = ["canvas %dx%d: %s" % (
        layout.term_cols, layout.term_rows,
        "fits" if layout.fits else "too small (need %dx%d)" % (COLS, ROWS))]
    if not layout.fits:
        return "\n".join(lines)
    lines.append("maze %dx%d at (%d,%d)" % (
        layout.maze_w, layout.maze_h, layout.maze_ox, layout.maze_oy))
    lines.append("left panel: %s" % (
        "%dx%d at (%d,%d)" % (layout.left.w, layout.left.h,
                              layout.left.x, layout.left.y)
        if layout.left is not None else "hidden (need %d cols)" % (
            layout.maze_w + GAP + RIGHT_WIDTH + GAP + LEFT_WIDTH)))
    lines.append("right panel: %s" % (
        "%dx%d at (%d,%d)" % (layout.right.w, layout.right.h,
                              layout.right.x, layout.right.y)
        if layout.right is not None else "hidden (need %d cols)" % (
            layout.maze_w + GAP + RIGHT_WIDTH)))
    lines.append("title strip: %s" % (
        "row 0" if layout.title_y is not None
        else "hidden (need %d rows)" % (layout.maze_h + 6)))
    lines.append("status bar: %s" % (
        "row %d" % layout.status_y if layout.status_y is not None
        else "hidden (need %d rows)" % (layout.maze_h + GAP)))
    return "\n".join(lines)
