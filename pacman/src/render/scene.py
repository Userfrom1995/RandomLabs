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
from engine.maze import LAYOUT, WIDTH, HEIGHT
from .framebuffer import Cell, FrameBuffer

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

# 4-neighbourhood (N, E, S, W wall presence) -> double-line box glyph.
_WALL_GLYPH = {
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


def _is_wall(maze, x, y):
    if not (0 <= x < WIDTH and 0 <= y < HEIGHT):
        return False
    return LAYOUT[y][x] == "#"


def wall_glyph(maze, x, y):
    key = (_is_wall(maze, x, y - 1), _is_wall(maze, x + 1, y),
           _is_wall(maze, x, y + 1), _is_wall(maze, x - 1, y))
    return _WALL_GLYPH[key]


def _text_row(fb, row, text, fg=TEXT_FG, bg=CORRIDOR_BG):
    for i, ch in enumerate(text[:fb.cols]):
        fb.set(i, row, Cell(ch, fg, bg, None))


def paint(game):
    """Render the full scene (HUD + maze + actors) into a new FrameBuffer."""
    fb = FrameBuffer(COLS, ROWS)
    maze = game.maze

    score_txt = "SCORE %06d" % (game.score % 1000000,)
    level_txt = "LEVEL %02d" % min(game.level, 99)
    _text_row(fb, 0, score_txt + level_txt.rjust(COLS - len(score_txt)))
    lives_txt = "LIVES %d " % max(game.lives, 0) + "o" * max(min(game.lives, 5), 0)
    dots_txt = "DOTS %d" % game.dots_left
    _text_row(fb, 1, lives_txt + dots_txt.rjust(COLS - len(lives_txt)))
    mode = game.ghosts.wave_mode()
    if game.ghosts.fright_active:
        status, sfg = ("FRIGHT!", FRIGHT_FG)
    else:
        status, sfg = (mode.upper(), TEXT_FG)
    state_txt = "OVER" if game.state == "over" else ("READY" if game.tick_count < 60 else status)
    _text_row(fb, 2, state_txt, fg=sfg)

    blink_on = (game.tick_count // 24) % 2 == 0
    for y in range(HEIGHT):
        base = y * WIDTH
        for x in range(WIDTH):
            ch = LAYOUT[y][x]
            ry = y + HUD_ROWS
            if ch == "#":
                fb.set(x, ry, Cell(wall_glyph(maze, x, y), WALL_FG, WALL_BG, None))
            elif ch == "D":
                fb.set(x, ry, Cell("-", (255, 184, 255), CORRIDOR_BG, None))
            elif ch == " ":
                fb.set(x, ry, Cell(" ", TEXT_FG, CORRIDOR_BG, None))
            else:
                i = base + x
                if maze.energizers[i]:
                    glyph = "O" if blink_on else " "
                    fb.set(x, ry, Cell(glyph, DOT_COLOR, CORRIDOR_BG, None))
                elif maze.dots[i]:
                    fb.set(x, ry, Cell(".", DOT_COLOR, CORRIDOR_BG, None))
                else:
                    fb.set(x, ry, Cell(" ", TEXT_FG, CORRIDOR_BG, None))

    pdir = game.player.dir if game.player.dir in PLAYER_GLYPH else LEFT
    pt = tile_of(game.player.x, game.player.y)
    if 0 <= pt[0] < WIDTH and 0 <= pt[1] < HEIGHT:
        if game.state == "dying":
            pcell = Cell("x", TEXT_FG, CORRIDOR_BG, None)
        else:
            pcell = Cell(PLAYER_GLYPH[pdir], PLAYER_FG, CORRIDOR_BG, PLAYER_SPRITE[pdir])
        fb.set(pt[0], pt[1] + HUD_ROWS, pcell)

    flashing = game.ghosts.fright_flashing()
    for ghost in game.ghosts.ghosts:
        gt = tile_of(ghost.actor.x, ghost.actor.y)
        if not (0 <= gt[0] < WIDTH and 0 <= gt[1] < HEIGHT):
            continue
        if ghost.state == "eyes":
            cell = Cell("x", EYES_FG, CORRIDOR_BG, "ghost-eyes")
        elif game.ghosts.fright_active and ghost.state == "active":
            if flashing:
                cell = Cell("O", FLASH_FG, CORRIDOR_BG, "ghost-fright-flash")
            else:
                cell = Cell("O", FRIGHT_FG, CORRIDOR_BG, "ghost-fright")
        else:
            cell = Cell("M", GHOST_FG[ghost.index], CORRIDOR_BG, "ghost-%d" % ghost.index)
        fb.set(gt[0], gt[1] + HUD_ROWS, cell)
    return fb


def sprite_ids_in(fb):
    """Sorted sprite ids referenced by a painted frame (for transmit planning)."""
    return sorted({c.sprite for c in fb.cells if c.sprite is not None})
