"""Scene painter: game state -> FrameBuffer, one layout for every backend.

The painter is the parity anchor: the Kitty, Sixel, and Unicode backends all
consume the exact same FrameBuffer, so maze, entity, and HUD positions match
within one cell on every terminal. Cells carrying a `sprite` id are drawn as
images by the image backends and as their glyph by Unicode; every other cell
is text everywhere.

Layout: 28 columns x 34 rows. Rows 0-2 are the HUD (score, lives, mode);
rows 3-33 show the 28x31 maze. All glyphs are single-column characters so
placements and cursor addresses agree across backends.
"""

from engine.actors import LEFT, RIGHT, UP, DOWN, tile_of
from engine.fruit import FRUIT_TILE
from engine.maze import LAYOUT, WIDTH, HEIGHT
from . import effects as fx
from .framebuffer import Cell, FrameBuffer
from .themes import get as theme_get

HUD_ROWS = 3
COLS = WIDTH
ROWS = HEIGHT + HUD_ROWS

DOT_COLOR = (255, 184, 174)
WALL_FG = (33, 33, 222)
WALL_BG = (0, 0, 0)
CORRIDOR_BG = (0, 0, 0)
PLAYER_FG = (255, 255, 0)
TEXT_FG = (255, 255, 255)
FRIGHT_FG = (33, 33, 255)
FLASH_FG = (255, 255, 255)
EYES_FG = (255, 255, 255)

GHOST_FG = (
    (255, 0, 0),
    (255, 184, 255),
    (0, 255, 255),
    (255, 184, 82),
)

PLAYER_GLYPH = {LEFT: "<", RIGHT: ">", UP: "^", DOWN: "v"}
PLAYER_SPRITE = {LEFT: "player-left", RIGHT: "player-right",
                 UP: "player-up", DOWN: "player-down"}
PLAYER_SPRITE_CLOSED = {LEFT: "player-left-closed",
                        RIGHT: "player-right-closed",
                        UP: "player-up-closed",
                        DOWN: "player-down-closed"}
_DIR_NAME = {LEFT: "left", RIGHT: "right", UP: "up", DOWN: "down"}

# 4-neighbourhood (N, E, S, W wall presence) -> box glyph, per wall style.
# ascii is the legacy reference every test pins; double and round are
# original Unicode line-drawing variants (all single-column cells).
_WALL_GLYPH_ASCII = {
    (0, 0, 0, 0): "#",
    (1, 0, 0, 0): "|",
    (0, 1, 0, 0): "-",
    (0, 0, 1, 0): "|",
    (0, 0, 0, 1): "-",
    (1, 0, 1, 0): "|",
    (0, 1, 0, 1): "-",
    (1, 1, 0, 0): "+",
    (0, 1, 1, 0): "+",
    (0, 0, 1, 1): "+",
    (1, 0, 0, 1): "+",
    (1, 1, 1, 0): "+",
    (1, 0, 1, 1): "+",
    (1, 1, 0, 1): "+",
    (0, 1, 1, 1): "+",
    (1, 1, 1, 1): "#",
}

_WALL_GLYPH_DOUBLE = {
    (0, 0, 0, 0): "\u25a0",
    (1, 0, 0, 0): "\u2551",
    (0, 1, 0, 0): "\u2550",
    (0, 0, 1, 0): "\u2551",
    (0, 0, 0, 1): "\u2550",
    (1, 0, 1, 0): "\u2551",
    (0, 1, 0, 1): "\u2550",
    (1, 1, 0, 0): "\u2554",
    (0, 1, 1, 0): "\u2557",
    (0, 0, 1, 1): "\u255d",
    (1, 0, 0, 1): "\u255a",
    (1, 1, 1, 0): "\u2566",
    (1, 0, 1, 1): "\u2560",
    (1, 1, 0, 1): "\u2569",
    (0, 1, 1, 1): "\u2563",
    (1, 1, 1, 1): "\u256c",
}

_WALL_GLYPH_ROUND = {
    (0, 0, 0, 0): "\u25a0",
    (1, 0, 0, 0): "\u2502",
    (0, 1, 0, 0): "\u2500",
    (0, 0, 1, 0): "\u2502",
    (0, 0, 0, 1): "\u2500",
    (1, 0, 1, 0): "\u2502",
    (0, 1, 0, 1): "\u2500",
    (1, 1, 0, 0): "\u256d",
    (0, 1, 1, 0): "\u256e",
    (0, 0, 1, 1): "\u256f",
    (1, 0, 0, 1): "\u2570",
    (1, 1, 1, 0): "\u252c",
    (1, 0, 1, 1): "\u251c",
    (1, 1, 0, 1): "\u2534",
    (0, 1, 1, 1): "\u2524",
    (1, 1, 1, 1): "\u253c",
}

_WALL_GLYPHS = {"ascii": _WALL_GLYPH_ASCII,
                "double": _WALL_GLYPH_DOUBLE,
                "round": _WALL_GLYPH_ROUND}

# Backwards-compatible alias: the legacy table tests import.
_WALL_GLYPH = _WALL_GLYPH_ASCII


def _is_wall(maze, x, y):
    if not (0 <= x < WIDTH and 0 <= y < HEIGHT):
        return False
    return LAYOUT[y][x] == "#"


def wall_glyph(maze, x, y, style="ascii"):
    table = _WALL_GLYPHS.get(style, _WALL_GLYPH_ASCII)
    key = (_is_wall(maze, x, y - 1), _is_wall(maze, x + 1, y),
           _is_wall(maze, x, y + 1), _is_wall(maze, x - 1, y))
    return table[key]


def _text_row(fb, row, text, fg, bg):
    for i, ch in enumerate(text[:fb.cols]):
        fb.set(i, row, Cell(ch, fg, bg, None))


def paint(game, theme="classic", reduced_flash=False, effects=False):
    """Render the full scene (HUD + maze + actors) into a new FrameBuffer.

    Every backend consumes this exact buffer, so the theme and flash
    choices hold identically on Kitty, Sixel, and Unicode. With
    reduced_flash the energizers stay lit and frightened ghosts hold one
    steady color instead of blinking.

    With effects=True the painter animates from the live game counters:
    the player mouth opens and closes (glyph plus closed-mouth sprites),
    energizers pulse through three frames, fruit gently pulses, frightened
    ghosts shimmer while flashing, dying plays a four-frame sequence from
    state_t, and a clearing maze celebrates with rainbow walls. With
    effects=False (the default) the output is the legacy reference frame
    every parity test pins.
    """
    from engine import tuning as _tuning
    palette = theme_get(theme)
    wall_style = palette.get("wall_style", "ascii")
    WALL_FG, WALL_BG, CORRIDOR_BG = palette["wall_fg"], palette["wall_bg"], palette["corridor_bg"]
    DOT, PLAYER_FG, TEXT_FG = palette["dot"], palette["player"], palette["text"]
    FRIGHT_FG = palette["fright"]
    FLASH_FG = palette["flash"] if not reduced_flash else palette["fright"]
    EYES_FG, FRUIT_FG, GHOST_FG = palette["eyes"], palette["fruit"], palette["ghosts"]
    tick = int(getattr(game, "tick_count", 0))
    clearing = getattr(game, "state", "play") == "clearing"
    if effects and clearing:
        WALL_FG = fx.RAINBOW[(tick // 10) % len(fx.RAINBOW)]
    fb = FrameBuffer(COLS, ROWS)
    maze = game.maze

    score_txt = "SCORE %06d" % (game.score % 1000000,)
    level_txt = "LEVEL %02d" % min(game.level, 99)
    _text_row(fb, 0, score_txt + level_txt.rjust(COLS - len(score_txt)), TEXT_FG, CORRIDOR_BG)
    lives_txt = "LIVES %d " % max(game.lives, 0) + "o" * max(min(game.lives, 5), 0)
    if getattr(game, "mode", "classic") == "time-attack":
        right_txt = "TIME %d" % max(int(getattr(game, "time_left", 0.0)), 0)
    elif getattr(game, "mode", "classic") == "sprint":
        right_txt = "TIME %d" % int(getattr(game, "elapsed", 0.0))
    elif getattr(game, "fruit", None) is not None and game.fruit.active:
        right_txt = "FRUIT %d" % game.fruit.points
    else:
        right_txt = "DOTS %d" % game.dots_left
    _text_row(fb, 1, lives_txt + right_txt.rjust(COLS - len(lives_txt)), TEXT_FG, CORRIDOR_BG)
    mode = game.ghosts.wave_mode()
    if game.ghosts.fright_active:
        status, sfg = ("FRIGHT!", FRIGHT_FG)
    else:
        status, sfg = (mode.upper(), TEXT_FG)
    state_txt = "OVER" if game.state == "over" else ("READY" if game.tick_count < 60 else status)
    _text_row(fb, 2, state_txt, sfg, CORRIDOR_BG)

    blink_on = True if reduced_flash else (game.tick_count // 24) % 2 == 0
    for y in range(HEIGHT):
        base = y * WIDTH
        for x in range(WIDTH):
            ch = LAYOUT[y][x]
            ry = y + HUD_ROWS
            if ch == "#":
                fb.set(x, ry, Cell(wall_glyph(maze, x, y, wall_style), WALL_FG, WALL_BG, None))
            elif ch == "D":
                fb.set(x, ry, Cell("-", palette["text"], CORRIDOR_BG, None))
            elif ch == " ":
                fb.set(x, ry, Cell(" ", TEXT_FG, CORRIDOR_BG, None))
            else:
                i = base + x
                if maze.energizers[i]:
                    if effects:
                        glyph = fx.energizer_glyph(tick, reduced_flash)
                    else:
                        glyph = "O" if blink_on else " "
                    fb.set(x, ry, Cell(glyph, DOT, CORRIDOR_BG, None))
                elif maze.dots[i]:
                    fb.set(x, ry, Cell(".", DOT, CORRIDOR_BG, None))
                else:
                    fb.set(x, ry, Cell(" ", TEXT_FG, CORRIDOR_BG, None))

    if getattr(game, "fruit", None) is not None and game.fruit.active:
        fx_, fy = FRUIT_TILE
        fglyph = fx.fruit_glyph(tick) if effects else "F"
        fb.set(fx_, fy + HUD_ROWS, Cell(fglyph, FRUIT_FG, CORRIDOR_BG, None))

    pdir = game.player.dir if game.player.dir in PLAYER_GLYPH else LEFT
    pt = tile_of(game.player.x, game.player.y)
    if 0 <= pt[0] < WIDTH and 0 <= pt[1] < HEIGHT:
        if game.state == "dying":
            if effects:
                frame = fx.death_frame(getattr(game, "state_t", 0.0),
                                       _tuning.DEATH_SEQUENCE_S)
                pcell = Cell(fx.DEATH_GLYPHS[frame], TEXT_FG, CORRIDOR_BG, None)
            else:
                pcell = Cell("x", TEXT_FG, CORRIDOR_BG, None)
        elif effects and not fx.mouth_open(tick):
            pcell = Cell(fx.CLOSED_GLYPH, PLAYER_FG, CORRIDOR_BG,
                         PLAYER_SPRITE_CLOSED[pdir])
        else:
            pcell = Cell(PLAYER_GLYPH[pdir], PLAYER_FG, CORRIDOR_BG, PLAYER_SPRITE[pdir])
        fb.set(pt[0], pt[1] + HUD_ROWS, pcell)

    flashing = game.ghosts.fright_flashing and not reduced_flash
    for ghost in game.ghosts.ghosts:
        gt = tile_of(ghost.actor.x, ghost.actor.y)
        if not (0 <= gt[0] < WIDTH and 0 <= gt[1] < HEIGHT):
            continue
        if ghost.state == "eyes":
            cell = Cell("x", EYES_FG, CORRIDOR_BG, "ghost-eyes")
        elif game.ghosts.fright_active and ghost.state == "active":
            if flashing:
                fglyph = fx.fright_glyph(tick, True) if effects else "O"
                cell = Cell(fglyph, FLASH_FG, CORRIDOR_BG, "ghost-fright-flash")
            else:
                cell = Cell("O", FRIGHT_FG, CORRIDOR_BG, "ghost-fright")
        else:
            cell = Cell("M", GHOST_FG[ghost.index], CORRIDOR_BG, "ghost-%d" % ghost.index)
        fb.set(gt[0], gt[1] + HUD_ROWS, cell)
    return fb


def sprite_ids_in(fb):
    """Sorted sprite ids referenced by a painted frame (for transmit planning)."""
    return sorted({c.sprite for c in fb.cells if c.sprite is not None})
