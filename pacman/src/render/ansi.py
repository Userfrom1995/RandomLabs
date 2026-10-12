"""Minimal ANSI escape-sequence builders (pure string functions)."""

ESC = "\x1b"
CSI = ESC + "["


def cup(row, col):
    """Cursor position, 1-based."""
    return "%s%d;%dH" % (CSI, row, col)


def sgr(*codes):
    return "%s%sm" % (CSI, ";".join(str(c) for c in codes))


def fg_true(r, g, b):
    return sgr(38, 2, r, g, b)


def bg_true(r, g, b):
    return sgr(48, 2, r, g, b)


def reset():
    return sgr(0)


HIDE_CURSOR = CSI + "?25l"
SHOW_CURSOR = CSI + "?25h"
ALT_ENTER = CSI + "?1049h"
ALT_EXIT = CSI + "?1049l"
SYNC_BEGIN = ESC + "P=1s" + ESC + "\\"
SYNC_END = ESC + "P=2s" + ESC + "\\"
CLEAR = CSI + "2J"


def clamp8(v):
    return max(0, min(255, int(v)))
