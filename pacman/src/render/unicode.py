"""Unicode reference backend: half-block-ready truecolor text rendering.

This is the guaranteed play path (works on every terminal, including
headless CI) and the parity reference: every other backend must match its
maze, entity, and HUD layout within one cell. Output is wrapped in DEC 2026
synchronized output and uses the alternate screen with a hidden cursor.
Only dirty cells are emitted per frame.
"""

from . import ansi
from .framebuffer import FrameBuffer
from .protocol import RenderBackend


class UnicodeBackend(RenderBackend):
    name = "unicode"

    def __init__(self):
        self.cols = 0
        self.rows = 0
        self.ox = 0
        self.oy = 0
        self._last = None

    def set_origin(self, ox, oy):
        """Shift every cursor address by (ox, oy) for terminal centering."""
        self.ox = max(0, int(ox))
        self.oy = max(0, int(oy))

    def available(self):
        return True

    def init(self, cols, rows):
        self.cols, self.rows = int(cols), int(rows)
        self._last = FrameBuffer(self.cols, self.rows)
        return ansi.ALT_ENTER + ansi.HIDE_CURSOR + ansi.CLEAR + ansi.cup(1, 1)

    def present(self, fb, dirty):
        if fb.cols != self.cols or fb.rows != self.rows:
            raise ValueError("framebuffer size does not match init")
        out = [ansi.SYNC_BEGIN]
        last_fg = last_bg = None
        for i in dirty:
            want = fb.cells[i]
            have = self._last.cells[i]
            if want == have:
                continue
            x, y = i % self.cols, i // self.cols
            out.append(ansi.cup(y + 1 + self.oy, x + 1 + self.ox))
            if want.fg != last_fg:
                out.append(ansi.fg_true(*want.fg))
                last_fg = want.fg
            if want.bg != last_bg:
                out.append(ansi.bg_true(*want.bg))
                last_bg = want.bg
            out.append(want.glyph)
            self._last.cells[i] = want
        out.append(ansi.reset() + ansi.SYNC_END)
        fb.clear_dirty()
        return "".join(out)

    def clear(self):
        if self._last is not None:
            self._last = FrameBuffer(self.cols, self.rows)
        return ansi.CLEAR + ansi.cup(1, 1)

    def shutdown(self):
        return ansi.reset() + ansi.SHOW_CURSOR + ansi.ALT_EXIT
