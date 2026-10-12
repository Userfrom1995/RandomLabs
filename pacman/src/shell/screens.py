"""Menu screens painted as framebuffers for every renderer backend.

Title, pause, game-over, and too-small screens are real FrameBuffers in the
same COLSxROWS geometry as gameplay, so the Kitty/Sixel/Unicode backends
present them unchanged. Pause and game-over overlay the live game frame;
title and too-small paint standalone cards.
"""

from render.framebuffer import BLANK, Cell, FrameBuffer
from render.scene import COLS, ROWS

TITLE_FG = (255, 255, 0)
TEXT_FG = (255, 255, 255)
DIM_FG = (150, 150, 150)
CARD_BG = (0, 0, 120)
OVER_FG = (255, 60, 60)


def put_text(fb, y, text, fg=TEXT_FG, bg=None):
    """Center one text line, clipped to the frame. Returns chars drawn."""
    text = str(text)
    if not (0 <= y < fb.rows):
        return 0
    start = max(0, (fb.cols - len(text)) // 2)
    drawn = 0
    for i, ch in enumerate(text):
        x = start + i
        if x >= fb.cols:
            break
        base = fb.get(x, y)
        fb.set(x, y, Cell(ch, fg, base.bg if bg is None else bg, None))
        drawn += 1
    return drawn


def _card(cols=COLS, rows=ROWS):
    fb = FrameBuffer(cols, rows, Cell(" ", TEXT_FG, (0, 0, 0), None))
    for x in range(cols):
        fb.set(x, 0, Cell("-", DIM_FG, (0, 0, 0), None))
        fb.set(x, rows - 1, Cell("-", DIM_FG, (0, 0, 0), None))
    return fb


def _overlay(base):
    clone = FrameBuffer(base.cols, base.rows)
    clone.cells = list(base.cells)
    return clone


def paint_title(keymap=None):
    fb = _card()
    mid = ROWS // 2
    put_text(fb, mid - 6, "P A C - M A N", TITLE_FG)
    put_text(fb, mid - 4, "TERMINAL ARCADE", TEXT_FG)
    put_text(fb, mid - 1, "arrows / WASD: move    P: pause    R: restart", DIM_FG)
    put_text(fb, mid, "ENTER: start    Q: quit", DIM_FG)
    put_text(fb, mid + 2, "eat every dot - dodge the ghosts", TEXT_FG)
    if keymap is not None:
        custom = ",".join(keymap.bindings("up")) or "arrows"
        put_text(fb, mid + 4, "move keys: %s" % custom, DIM_FG)
    return fb


def paint_pause(base):
    fb = _overlay(base)
    mid = ROWS // 2
    put_text(fb, mid - 1, "  PAUSED  ", TITLE_FG, CARD_BG)
    put_text(fb, mid + 1, "P / ENTER: resume    R: restart    Q: quit", TEXT_FG, CARD_BG)
    return fb


def paint_over(base, score):
    fb = _overlay(base)
    mid = ROWS // 2
    put_text(fb, mid - 2, "  GAME OVER  ", OVER_FG, CARD_BG)
    put_text(fb, mid, "score: %d" % int(score), TEXT_FG, CARD_BG)
    put_text(fb, mid + 2, "ENTER: play again    Q: quit", TEXT_FG, CARD_BG)
    return fb


def paint_too_small(message):
    fb = _card()
    put_text(fb, ROWS // 2 - 1, "PAC-MAN needs a bigger window", OVER_FG)
    put_text(fb, ROWS // 2 + 1, message, DIM_FG)
    put_text(fb, ROWS // 2 + 3, "resize, or Q to quit", DIM_FG)
    return fb


def flat_text(fb):
    """Row strings for tests: the readable content of a painted screen."""
    return ["".join(fb.get(x, y).glyph for x in range(fb.cols)).strip() for y in range(fb.rows)]
