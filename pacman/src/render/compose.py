"""Fullscreen composer: game state plus layout -> full-terminal FrameBuffer.

The composer owns every region the layout engine places: it blits the
28x34 scene (the unchanged parity anchor every backend shares) at the
layout's maze origin, then fills the rest of the window with live regions
instead of dead space: a stats dashboard on the right, controls and legend
on the left, a title strip on top, and a hints status bar at the bottom.

Every region shows live data from the game object, the keymap, and the
score table: there are no placeholder panels. When the window is too small
for side panels the composer degrades to the bare centered maze, which is
cell-identical to scene.paint, so small terminals play exactly as before.
"""

from render.framebuffer import BLANK, Cell, FrameBuffer
from render.scene import COLS, ROWS, paint
from render.themes import get as theme_get

TITLE_TEXT = "PAC-MAN TERMINAL ARCADE"

PANEL_FG = (255, 255, 0)
PANEL_DIM = (150, 150, 150)


def _line(fb, x, y, text, fg, bg, max_w=None):
    """Write one clipped text line. Returns chars drawn."""
    if not (0 <= y < fb.rows):
        return 0
    width = fb.cols if max_w is None else min(max_w, fb.cols - x)
    drawn = 0
    for i, ch in enumerate(str(text)[:max(0, width)]):
        xx = x + i
        if xx < 0 or xx >= fb.cols:
            continue
        base = fb.get(xx, y)
        fb.set(xx, y, Cell(ch, fg, base.bg if bg is None else bg, None))
        drawn += 1
    return drawn


def _border(fb, rect, fg, bg):
    """Thin ASCII border around a panel rect (matches the maze aesthetic)."""
    x, y, w, h = rect.x, rect.y, rect.w, rect.h
    if w < 3 or h < 3:
        return
    for i in range(w):
        for yy in (y, y + h - 1):
            glyph = "+" if i in (0, w - 1) else "-"
            _line(fb, x + i, yy, glyph, fg, bg)
    for j in range(1, h - 1):
        _line(fb, x, y + j, "|", fg, bg)
        _line(fb, x + w - 1, y + j, "|", fg, bg)


def _bar(used, total, width):
    """ASCII progress bar; clamps over/under-fill so it never lies."""
    width = max(4, int(width))
    if total <= 0:
        filled = 0
    else:
        filled = min(width, max(0, int(round(width * used / total))))
    return "[" + "#" * filled + "-" * (width - filled) + "]"


def _move_keys(keymap):
    """Compact 'WASD/arrows' style label for the bound movement keys."""
    if keymap is None:
        return "arrows/WASD"
    parts = []
    for action in ("up", "down", "left", "right"):
        try:
            binds = keymap.bindings(action)
        except ValueError:
            continue
        shown = [b.upper() if len(b) == 1 and b.isalpha() else b for b in binds]
        parts.append("/".join(shown))
    arrows = "arrows"
    keys = ",".join(p for p in parts if p)
    return "%s%s" % (arrows, " or %s" % keys if keys else "")


def paint_right_panel(fb, game, rect, palette, top=None):
    """Live run dashboard: score, level, lives, mode, progress, best."""
    fg, dim, bg = palette["text"], PANEL_DIM, palette["corridor_bg"]
    _border(fb, rect, dim, bg)
    x, y, w = rect.x + 2, rect.y + 1, rect.w - 4
    if w < 8:
        return
    _line(fb, x, y, "SCORE", PANEL_FG, bg, w)
    _line(fb, x, y + 1, "%06d" % (game.score % 1000000,), fg, bg, w)
    _line(fb, x, y + 3, "LEVEL %02d  LIVES %d" % (
        min(game.level, 99), max(game.lives, 0)), fg, bg, w)
    _line(fb, x, y + 4, "MODE %s" % getattr(game, "mode", "classic"), fg, bg, w)
    total = game.maze.total_dots + game.maze.total_energizers
    left = game.dots_left
    _line(fb, x, y + 6, "DOTS %d/%d" % (total - left, total), fg, bg, w)
    _line(fb, x, y + 7, _bar(total - left, total, w), fg, bg, w)
    row = y + 9
    if getattr(game, "mode", "classic") == "time-attack":
        _line(fb, x, row, "TIME %ds" % max(int(getattr(game, "time_left", 0.0)), 0),
              fg, bg, w)
        row += 1
    if game.fruit.active:
        _line(fb, x, row, "FRUIT %d pts" % game.fruit.points, fg, bg, w)
        row += 1
    if game.ghosts.fright_active:
        _line(fb, x, row, "FRIGHT %.0fs" % max(game.ghosts.fright_t, 0.0),
              palette["fright"], bg, w)
        row += 1
    else:
        _line(fb, x, row, game.ghosts.wave_mode().upper(), dim, bg, w)
        row += 1
    if top is not None:
        _line(fb, x, row + 1, "BEST %s %d" % (
            top["name"], top["score"]), PANEL_FG, bg, w)


def paint_left_panel(fb, rect, palette, keymap=None):
    """Controls cheat-sheet plus glyph legend, both clipped to the panel."""
    fg, dim, bg = palette["text"], PANEL_DIM, palette["corridor_bg"]
    _border(fb, rect, dim, bg)
    x, y, w = rect.x + 2, rect.y + 1, rect.w - 4
    if w < 8:
        return
    _line(fb, x, y, "CONTROLS", PANEL_FG, bg, w)
    _line(fb, x, y + 1, "move: arrows", fg, bg, w)
    _line(fb, x, y + 2, _move_keys(keymap)[:w], dim, bg, w)
    controls = [("pause", "P"), ("restart", "R"), ("quit", "Q"),
                ("start", "ENTER")]
    if keymap is not None:
        controls = [("pause", "/".join(keymap.bindings("pause")) or "P"),
                    ("restart", "/".join(keymap.bindings("restart")) or "R"),
                    ("quit", "/".join(keymap.bindings("quit")) or "Q"),
                    ("start", "ENTER")]
    for i, (label, keys) in enumerate(controls):
        _line(fb, x, y + 4 + i, "%s: %s" % (label, keys), fg, bg, w)
    base = y + 9
    _line(fb, x, base, "LEGEND", PANEL_FG, bg, w)
    for i, legend in enumerate(("<>^v you", "M ghost", "O frightened",
                                "x eyes", ". dot", "O energizer",
                                "F fruit", "- ghost door")):
        _line(fb, x, base + 1 + i, legend, dim, bg, w)
    tip_row = base + 10
    if tip_row + 2 < rect.y + rect.h - 1:
        _line(fb, x, tip_row, "TIP", PANEL_FG, bg, w)
        _line(fb, x, tip_row + 1, "energizer, then", dim, bg, w)
        _line(fb, x, tip_row + 2, "hunt the blue!", dim, bg, w)


def paint_full(game, layout, theme="classic", reduced_flash=False,
               keymap=None, scores=None, hint=None):
    """Render the whole terminal window: maze plus live side regions.

    The maze blit is verbatim scene.paint output, so the Kitty, Sixel,
    and Unicode backends keep the parity they already had; only the
    surrounding chrome is new. hint is the status-bar text (the shell
    supplies per-screen hints); scores feeds the BEST line.
    """
    palette = theme_get(theme)
    bg = palette["corridor_bg"]
    fb = FrameBuffer(layout.frame_cols, layout.frame_rows,
                     Cell(" ", palette["text"], bg, None))
    scene_fb = paint(game, theme=theme, reduced_flash=reduced_flash)
    for sy in range(ROWS):
        for sx in range(COLS):
            fb.set(layout.maze_ox + sx, layout.maze_oy + sy,
                   scene_fb.get(sx, sy))
    if layout.title_y is not None:
        modeline = "%s   %s   %s" % (
            TITLE_TEXT, getattr(game, "mode", "classic"), theme)
        _line(fb, 0, layout.title_y, modeline.center(layout.frame_cols)[:layout.frame_cols],
              PANEL_DIM, bg)
    if layout.left is not None:
        paint_left_panel(fb, layout.left, palette, keymap=keymap)
    entries = getattr(scores, "entries", None) if scores is not None else None
    top = entries[0] if entries else None
    if layout.right is not None:
        paint_right_panel(fb, game, layout.right, palette, top=top)
    if layout.status_y is not None:
        text = hint if hint is not None else _default_hint()
        _line(fb, 0, layout.status_y,
              text.center(layout.frame_cols)[:layout.frame_cols], PANEL_DIM, bg)
    return fb


def _default_hint():
    return "arrows/WASD move   P pause   R restart   Q quit"


def blank_frame(layout, palette=None):
    """Background fill frame for tests and transitions (no game needed)."""
    from render.themes import get as _get
    bg = (_get("classic") if palette is None else palette)["corridor_bg"]
    return FrameBuffer(layout.frame_cols, layout.frame_rows,
                       Cell(" ", (255, 255, 255), bg, None))
