"""Protocol-agnostic cell grid with dirty-set tracking.

A Cell is (glyph, fg, bg, sprite): glyph is one printable character, fg/bg
are (r, g, b) triples, sprite is an optional atlas id for image backends
(None means "draw the glyph"). diff() emits only changed cells, so per-frame
encode cost is O(dirty), not O(screen).
"""

from collections import namedtuple

Cell = namedtuple("Cell", ("glyph", "fg", "bg", "sprite"))

BLANK = Cell(" ", (255, 255, 255), (0, 0, 0), None)


class FrameBuffer:
    def __init__(self, cols, rows, fill=BLANK):
        if cols < 1 or rows < 1:
            raise ValueError("framebuffer needs positive dimensions")
        self.cols = int(cols)
        self.rows = int(rows)
        self.cells = [fill] * (self.cols * self.rows)
        self._dirty = set(range(self.cols * self.rows))

    def _idx(self, x, y):
        if not (0 <= x < self.cols and 0 <= y < self.rows):
            raise IndexError("cell out of bounds: (%d, %d)" % (x, y))
        return y * self.cols + x

    def set(self, x, y, cell):
        i = self._idx(x, y)
        if self.cells[i] != cell:
            self.cells[i] = cell
            self._dirty.add(i)

    def get(self, x, y):
        return self.cells[self._idx(x, y)]

    def fill(self, cell):
        self.cells = [cell] * (self.cols * self.rows)
        self._dirty = set(range(self.cols * self.rows))

    def dirty_cells(self):
        return sorted(self._dirty)

    def clear_dirty(self):
        self._dirty = set()

    def diff(self, other):
        """Indices where this buffer differs from other (same size required)."""
        if self.cols != other.cols or self.rows != other.rows:
            raise ValueError("framebuffer size mismatch")
        return [i for i, (a, b) in enumerate(zip(self.cells, other.cells)) if a != b]
