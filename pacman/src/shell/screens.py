"""Menu screens painted as framebuffers for every renderer backend.

Title, pause, game-over, name-entry, scores, settings, and too-small
screens render at full terminal size (the layout engine decides the
frame; the composer owns gameplay chrome). Cards center their content
on whatever frame they get, so narrow windows look exactly as before
while wide windows use the whole canvas. The settings card lists one
row per shell.settings OPTIONS entry (live row_label values, dim mode
honesty note, change/back footer) with the same centering and clipping
as the help card. Pause, game-over, and name-entry overlay the live game
frame; title, scores, settings, and too-small paint standalone cards.
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
    cols, rows = max(1, int(cols)), max(1, int(rows))
    fb = FrameBuffer(cols, rows, Cell(" ", TEXT_FG, (0, 0, 0), None))
    for x in range(cols):
        fb.set(x, 0, Cell("-", DIM_FG, (0, 0, 0), None))
        fb.set(x, rows - 1, Cell("-", DIM_FG, (0, 0, 0), None))
    return fb


def _overlay(base):
    clone = FrameBuffer(base.cols, base.rows)
    clone.cells = list(base.cells)
    return clone


def paint_menu_items(fb, top_y, items, selected=0, muted=False, keymap=None):
    """Draw navigable menu rows centered; returns rows drawn. Clips safely."""
    from shell import menus as menus_mod
    drawn = 0
    for i, item in enumerate(items):
        y = top_y + i
        if not (0 <= y < fb.rows):
            continue
        marker = "> " if i == selected else "  "
        text = marker + menus_mod.label(item, muted=muted, keymap=keymap)
        if len(text) > fb.cols:
            text = text[:fb.cols - 1] + ">"
        start = max(0, (fb.cols - len(text)) // 2)
        fg = TITLE_FG if i == selected else TEXT_FG
        for j, ch in enumerate(text):
            x = start + j
            if x >= fb.cols:
                break
            base = fb.get(x, y)
            fb.set(x, y, Cell(ch, fg, base.bg, None))
        drawn += 1
    return drawn


def paint_help(keymap=None, cols=COLS, rows=ROWS):
    """Fullscreen help card: live bindings, goal, ghost legend, back hint."""
    fb = _card(cols, rows)
    mid = rows // 2
    put_text(fb, mid - 9, "HOW TO PLAY", TITLE_FG)
    put_text(fb, mid - 7, "eat every dot - dodge the ghosts", TEXT_FG)
    put_text(fb, mid - 6, "energizer, then hunt the blue!", DIM_FG)
    if keymap is not None:
        move = "arrows/" + ("/".join(keymap.bindings("up")) or "WASD")
        lines = [
            "move: %s" % move[:max(0, cols - 8)],
            "pause: %s  restart: %s" % (
                "/".join(keymap.bindings("pause")) or "P",
                "/".join(keymap.bindings("restart")) or "R"),
            "mute: %s  help: %s  quit: %s" % (
                "/".join(keymap.bindings("mute")) or "M",
                "/".join(keymap.bindings("help")) or "?",
                "/".join(keymap.bindings("quit")) or "Q"),
            "menus: up/down moves - ENTER picks",
        ]
    else:
        lines = ["move: arrows/WASD", "P: pause  R: restart",
                 "M: mute  ?: help  Q: quit",
                 "menus: up/down moves - ENTER picks"]
    for i, line in enumerate(lines):
        put_text(fb, mid - 4 + i, line[:cols], TEXT_FG if i == 0 else DIM_FG)
    put_text(fb, mid + 1, "M ghost  O frightened  x eyes", DIM_FG)
    put_text(fb, mid + 2, ". dot  O energizer  F fruit", DIM_FG)
    put_text(fb, mid + 4, "P / ENTER: back", TEXT_FG, CARD_BG)
    put_text(fb, mid + 5, "Q: quit", TEXT_FG, CARD_BG)
    return fb


def paint_settings(state, selected=0, cols=COLS, rows=ROWS):
    """Fullscreen settings card: one row per option, change/back hints."""
    from shell import settings as settings_mod
    fb = _card(cols, rows)
    mid = rows // 2
    sel = int(selected)
    opts = list(settings_mod.OPTIONS)
    put_text(fb, mid - 8, "SETTINGS", TITLE_FG)
    for i, opt in enumerate(opts):
        y = mid - 5 + i
        if not (0 <= y < fb.rows):
            continue
        marker = "> " if i == sel else "  "
        label = str(settings_mod.row_label(state, opt))[:max(0, cols - 8)]
        text = marker + label
        if len(text) > fb.cols:
            text = text[:fb.cols - 1] + ">"
        start = max(0, (fb.cols - len(text)) // 2)
        fg = TITLE_FG if i == sel else TEXT_FG
        for j, ch in enumerate(text):
            x = start + j
            if x >= fb.cols:
                break
            base = fb.get(x, y)
            fb.set(x, y, Cell(ch, fg, base.bg, None))
    honesty = settings_mod.note("mode") or "mode applies to next run"
    put_text(fb, mid + 1, str(honesty)[:cols], DIM_FG)
    if 0 <= sel < len(opts):
        detail = str(settings_mod.describe(opts[sel]))[:max(0, cols - 8)]
        put_text(fb, mid + 2, detail, DIM_FG)
    put_text(fb, mid + 4, "left/right: change   P / ENTER: back", TEXT_FG, CARD_BG)
    return fb


def paint_title(keymap=None, mode="classic", theme="classic", top=None,
                cols=COLS, rows=ROWS, menu=None, menu_index=0, muted=False):
    fb = _card(cols, rows)
    mid = rows // 2
    put_text(fb, mid - 7, "P A C - M A N", TITLE_FG)
    put_text(fb, mid - 5, "TERMINAL ARCADE", TEXT_FG)
    put_text(fb, mid - 3, "arrows / WASD: move", DIM_FG)
    put_text(fb, mid - 2, "P: pause  R: restart", DIM_FG)
    put_text(fb, mid - 1, "ENTER: start    Q: quit", DIM_FG)
    put_text(fb, mid + 1, "eat the dots - dodge ghosts", TEXT_FG)
    modeline = "mode: %s  theme: %s" % (mode, theme)
    put_text(fb, mid + 2, modeline[:cols], DIM_FG)
    if top is not None:
        best = "best: %s %d" % (top["name"], top["score"])
        put_text(fb, mid + 3, best[:cols], TITLE_FG)
    if keymap is not None:
        custom = ",".join(keymap.bindings("up")) or "arrows"
        line = "move keys: %s" % custom
        if len(line) > cols:
            line = line[:cols - 1] + ">"
        put_text(fb, mid + 5, line, DIM_FG)
    if menu is not None:
        put_text(fb, mid + 7, "MENU: up/down + ENTER", DIM_FG)
        paint_menu_items(fb, mid + 8, list(menu), selected=menu_index,
                         muted=muted, keymap=keymap)
    return fb


def paint_pause(base, menu=None, menu_index=0, muted=False, keymap=None):
    fb = _overlay(base)
    mid = base.rows // 2
    put_text(fb, mid - 1, "  PAUSED  ", TITLE_FG, CARD_BG)
    put_text(fb, mid + 1, "P / ENTER: resume", TEXT_FG, CARD_BG)
    put_text(fb, mid + 2, "R: restart  Q: quit", TEXT_FG, CARD_BG)
    if menu is not None:
        paint_menu_items(fb, mid + 4, list(menu), selected=menu_index,
                         muted=muted, keymap=keymap)
    return fb


def paint_over(base, score, reason=None, menu=None, menu_index=0,
               muted=False, keymap=None):
    fb = _overlay(base)
    mid = base.rows // 2
    if reason == "timeout":
        headline = "  TIME UP!  "
    elif reason == "cleared":
        headline = "  MAZE CLEARED!  "
    else:
        headline = "  GAME OVER  "
    put_text(fb, mid - 3, headline, OVER_FG, CARD_BG)
    put_text(fb, mid - 1, "score: %d" % int(score), TEXT_FG, CARD_BG)
    put_text(fb, mid + 1, "ENTER: play again    Q: quit", TEXT_FG, CARD_BG)
    if menu is not None:
        paint_menu_items(fb, mid + 3, list(menu), selected=menu_index,
                         muted=muted, keymap=keymap)
    return fb


def paint_name_entry(base, buffer, score):
    """High-score entry overlay: live pilot-name typing with a cursor."""
    fb = _overlay(base)
    mid = base.rows // 2
    put_text(fb, mid - 3, "  NEW HIGH SCORE!  ", TITLE_FG, CARD_BG)
    put_text(fb, mid - 1, "score: %d" % int(score), TEXT_FG, CARD_BG)
    put_text(fb, mid + 1, "NAME: %s_" % str(buffer)[:10], TEXT_FG, CARD_BG)
    put_text(fb, mid + 3, "type A-Z 0-9, ENTER saves", DIM_FG, CARD_BG)
    return fb


def paint_scores(entries, cols=COLS, rows=ROWS):
    """Standalone high-score card (title-screen size, all backends)."""
    fb = _card(cols, rows)
    mid = rows // 2
    put_text(fb, mid - 8, "HIGH SCORES", TITLE_FG)
    if not entries:
        put_text(fb, mid - 5, "no scores yet - play a run!", TEXT_FG)
    for rank, entry in enumerate(list(entries)[:10], 1):
        line = "%2d. %-10s %6d  L%02d %s" % (
            rank, entry["name"], entry["score"], entry["level"], entry["mode"])
        put_text(fb, mid - 6 + rank, line[:cols], TEXT_FG)
    put_text(fb, mid + 6, "--play to set one", DIM_FG)
    return fb


def paint_too_small(message, cols=COLS, rows=ROWS):
    fb = _card(cols, rows)
    mid = rows // 2
    put_text(fb, mid - 1, "PAC-MAN needs bigger window", OVER_FG)
    lines = _wrap(str(message), cols, 2)
    if len(lines) > 0:
        put_text(fb, mid + 1, lines[0], DIM_FG)
    if len(lines) > 1:
        put_text(fb, mid + 2, lines[1], DIM_FG)
    put_text(fb, mid + 3, "resize, or Q to quit", DIM_FG)
    return fb


def _wrap(text, width, max_lines):
    """Word-wrap one message into at most max_lines rows of width chars."""
    words, lines, current = text.split(), [], ""
    for word in words:
        while len(word) > width:
            if current:
                lines.append(current)
                current = ""
            lines.append(word[:width])
            word = word[width:]
        candidate = word if not current else current + " " + word
        if len(candidate) <= width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines[:max_lines] if lines else [""]


def flat_text(fb):
    """Row strings for tests: the readable content of a painted screen."""
    return ["".join(fb.get(x, y).glyph for x in range(fb.cols)).strip() for y in range(fb.rows)]
