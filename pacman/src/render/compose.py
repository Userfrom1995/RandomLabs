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
from render import effects as fx
from render.scene import COLS, ROWS, paint
from render.themes import get as theme_get

TITLE_TEXT = "PAC-MAN TERMINAL ARCADE"

PANEL_FG = (255, 255, 0)
PANEL_DIM = (150, 150, 150)

CHROME_GLYPHS = {"dots": ".", "grid": "+"}


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


def _content_dy(rect):
    """Vertical centering offset for panel content on tall (scaled) panels."""
    return max(0, (rect.h - ROWS) // 2)


def paint_right_panel(fb, game, rect, palette, top=None):
    """Live run dashboard: score, level, lives, mode, progress, best."""
    fg, dim, bg = palette["text"], PANEL_DIM, palette["corridor_bg"]
    _border(fb, rect, dim, bg)
    x, y, w = rect.x + 2, rect.y + 1 + _content_dy(rect), rect.w - 4
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
    x, y, w = rect.x + 2, rect.y + 1 + _content_dy(rect), rect.w - 4
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


def _chrome_cell(x, y, palette):
    """Themed background cell for non-game canvas areas.

    flat renders solid corridor color (the legacy look); dots and grid
    add a subtle dim pattern so wide terminals feel dressed instead of
    empty. Never raises.
    """
    bg = palette["corridor_bg"]
    dim = palette.get("dim", PANEL_DIM)
    try:
        pattern = palette.get("chrome", "flat")
    except AttributeError:
        pattern = "flat"
    if pattern == "dots" and x % 4 == 0 and y % 2 == 0:
        return Cell(".", dim, bg, None)
    if pattern == "grid" and x % 6 == 0 and y % 3 == 0:
        return Cell("+", dim, bg, None)
    return Cell(" ", palette["text"], bg, None)


def _paint_chrome(fb, palette):
    """Fill the whole frame with the themed background pattern."""
    for y in range(fb.rows):
        for x in range(fb.cols):
            fb.cells[y * fb.cols + x] = _chrome_cell(x, y, palette)
    fb._dirty = set(range(fb.cols * fb.rows))


def _blit_magnified(fb, scene_fb, ox, oy, sx, sy):
    """Blit the 28x34 scene scaled sx by sy into the canvas frame.

    Each scene cell covers an sx by sy block: the block origin carries
    the full cell (glyph plus sprite) and fillers repeat the text
    underlay without a sprite. Sprite origins are recorded in
    fb.spans so image backends place one sx by sy image per block
    instead of tiling. Text backends simply draw every cell.
    """
    spans = {}
    for sy_ in range(ROWS):
        for sx_ in range(COLS):
            cell = scene_fb.get(sx_, sy_)
            for dy in range(sy):
                for dx in range(sx):
                    xx, yy = ox + sx_ * sx + dx, oy + sy_ * sy + dy
                    if dx == 0 and dy == 0:
                        fb.set(xx, yy, cell)
                        if cell.sprite is not None and (sx, sy) != (1, 1):
                            fb.spans[yy * fb.cols + xx] = (sx, sy)
                    else:
                        fb.set(xx, yy, Cell(cell.glyph, cell.fg, cell.bg, None))
    return spans


def _paint_sparkles(scene_fb, game):
    """Ring the active fruit with deterministic tick sparkles.

    Only empty corridor cells (" ") gain a sparkle so dots, walls, and
    actors are never overwritten. Pure overlay on the 1x scene buffer,
    magnified with everything else by the blit.
    """
    from engine.maze import LAYOUT, WIDTH, HEIGHT
    from engine.fruit import FRUIT_TILE
    tick = int(getattr(game, "tick_count", 0))
    palette_dim = (150, 150, 150)
    fx0, fy0 = FRUIT_TILE
    for dx, dy in fx.sparkle_offsets(tick):
        tx, ty = fx0 + dx, fy0 + dy
        if not (0 <= tx < WIDTH and 0 <= ty < HEIGHT):
            continue
        if LAYOUT[ty][tx] == "#":
            continue
        i = ty * WIDTH + tx
        if game.maze.dots[i] or game.maze.energizers[i]:
            continue
        cell = scene_fb.get(tx, ty + 3)
        if cell.glyph != " " or cell.sprite is not None:
            continue
        scene_fb.cells[(ty + 3) * COLS + tx] = Cell(
            "*", palette_dim, cell.bg, None)
        scene_fb._dirty.add((ty + 3) * COLS + tx)


def paint_full(game, layout, theme="classic", reduced_flash=False,
               keymap=None, scores=None, hint=None, effects=False):
    """Render the whole terminal window: maze plus live side regions.

    The maze blit magnifies the 28x34 scene painter to the layout's
    maze box (1x1 on small windows, 2x1 wide or 2x2 full on roomy
    ones), so the Kitty, Sixel, and Unicode backends keep the parity
    they already had at a larger size; only the surrounding chrome is
    new. hint is the status-bar text (the shell supplies per-screen
    hints); scores feeds the BEST line. With effects=True the scene
    animates (mouth, pulse, sparkles, death and clearing sequences).
    """
    palette = theme_get(theme)
    bg = palette["corridor_bg"]
    fb = FrameBuffer(layout.frame_cols, layout.frame_rows,
                     Cell(" ", palette["text"], bg, None))
    _paint_chrome(fb, palette)
    scene_fb = paint(game, theme=theme, reduced_flash=reduced_flash,
                     effects=effects)
    if effects and getattr(game, "fruit", None) is not None \
            and game.fruit.active:
        _paint_sparkles(scene_fb, game)
    sx = max(1, layout.maze_w // COLS)
    sy = max(1, layout.maze_h // ROWS)
    _blit_magnified(fb, scene_fb, layout.maze_ox, layout.maze_oy, sx, sy)
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
