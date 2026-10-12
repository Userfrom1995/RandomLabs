"""Original maze layout, dot field, tunnel, and walkability queries.

The layout below is authored for this project: an orthogonal, left-right
symmetric maze on a 28x31 grid with a side tunnel and a central ghost house.
It is inspired by the genre, not copied from any existing map.

Legend (one character per tile):
  '#'  wall
  '.'  corridor with a dot
  '*'  corridor with an energizer (power pellet)
  '-'  corridor without a dot (tunnel row, door apron)
  'D'  ghost-house door (ghosts and eyes only)
  ' '  ghost-house interior (ghosts only; holds no dots)
"""

LAYOUT = (
    "############################",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#*####.#####.##.#####.####*#",
    "#.####.#####.##.#####.####.#",
    "#..........................#",
    "#.####.##.########.##.####.#",
    "#.####.##.########.##.####.#",
    "#......##....##....##......#",
    "######.#####.##.#####.######",
    "######.#####.##.#####.######",
    "######.##..........##.######",
    "######.##.###DD###.##.######",
    "######.##.#      #.##.######",
    "------....#      #....------",
    "######.##.#      #.##.######",
    "######.##.########.##.######",
    "######.##..........##.######",
    "######.##.########.##.######",
    "######.##.########.##.######",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#.####.#####.##.#####.####.#",
    "#*..##.......--.......##..*#",
    "###.##.##.########.##.##.###",
    "###.##.##.########.##.##.###",
    "#......##....##....##......#",
    "#.##########.##.##########.#",
    "#.##########.##.##########.#",
    "#..........................#",
    "############################",
)

WIDTH = 28
HEIGHT = 31
TUNNEL_ROW = 14

WALL = "#"
DOT = "."
ENERGIZER = "*"
PLAIN = "-"
DOOR = "D"
HOUSE = " "

# Tiles the player may ever occupy.
_PLAYER_OK = {DOT, ENERGIZER, PLAIN}
# Ghosts may additionally cross the door and wait inside the house.
_GHOST_OK = _PLAYER_OK | {DOOR, HOUSE}

PLAYER_START_TILE = (13, 23)
GHOST_DOOR_TILE = (13, 12)
GHOST_OUTSIDE_TILE = (13, 11)
HOUSE_SLOTS = ((11, 14), (13, 14), (15, 14))

SCATTER_CORNERS = ((1, 1), (26, 1), (1, 29), (26, 29))

for _row in LAYOUT:  # fail fast at import if a row is malformed
    if len(_row) != WIDTH:
        raise ValueError("maze row has wrong width: %r" % (_row,))
if len(LAYOUT) != HEIGHT:
    raise ValueError("maze has wrong height: %d" % len(LAYOUT))


class Maze:
    """Parsed maze plus the mutable per-level dot field."""

    def __init__(self):
        self.grid = [list(row) for row in LAYOUT]
        self.dots = bytearray(WIDTH * HEIGHT)       # 1 where a dot stands
        self.energizers = bytearray(WIDTH * HEIGHT)  # 1 where one stands
        self.total_dots = 0
        self.total_energizers = 0
        for y in range(HEIGHT):
            for x in range(WIDTH):
                ch = self.grid[y][x]
                i = y * WIDTH + x
                if ch == DOT:
                    self.dots[i] = 1
                    self.total_dots += 1
                elif ch == ENERGIZER:
                    self.energizers[i] = 1
                    self.total_energizers += 1
        self.dots_remaining = self.total_dots
        self.energizers_remaining = self.total_energizers
        self.dots_eaten = 0

    # -- queries ------------------------------------------------------
    def in_bounds(self, tx, ty):
        return 0 <= tx < WIDTH and 0 <= ty < HEIGHT

    def tile(self, tx, ty):
        if not self.in_bounds(tx, ty):
            raise IndexError("tile out of bounds: (%d, %d)" % (tx, ty))
        return self.grid[ty][tx]

    def is_walkable(self, tx, ty, for_ghost=False):
        """Walkability with the tunnel wrapping off-grid horizontally."""
        if ty == TUNNEL_ROW and (tx < 0 or tx >= WIDTH):
            return True  # the tunnel mouth: wrapping handled by movement
        if not self.in_bounds(tx, ty):
            return False
        allowed = _GHOST_OK if for_ghost else _PLAYER_OK
        return self.grid[ty][tx] in allowed

    def is_tunnel(self, tx, ty):
        return ty == TUNNEL_ROW and self.in_bounds(tx, ty) and self.grid[ty][tx] == PLAIN \
            and (tx < 8 or tx >= WIDTH - 8)

    # -- dot field ----------------------------------------------------
    def eat_at(self, tx, ty):
        """Eat whatever pickup stands on a tile. Returns 'dot', 'energizer', or None."""
        if not self.in_bounds(tx, ty):
            return None
        i = ty * WIDTH + tx
        if self.energizers[i]:
            self.energizers[i] = 0
            self.energizers_remaining -= 1
            self.dots_eaten += 1
            return "energizer"
        if self.dots[i]:
            self.dots[i] = 0
            self.dots_remaining -= 1
            self.dots_eaten += 1
            return "dot"
        return None

    def has_dot(self, tx, ty):
        return bool(self.dots[ty * WIDTH + tx]) if self.in_bounds(tx, ty) else False

    def dot_bytes(self):
        return bytes(self.dots) + bytes(self.energizers)

    # -- connectivity -------------------------------------------------
    def reachable_dots_from(self, start):
        """Flood fill over player-walkable tiles; returns count of dots reachable."""
        sx, sy = start
        if not self.is_walkable(sx, sy):
            return 0
        seen = bytearray(WIDTH * HEIGHT)
        stack = [(sx, sy)]
        seen[sy * WIDTH + sx] = 1
        reached = 0
        while stack:
            x, y = stack.pop()
            if self.dots[y * WIDTH + x] or self.energizers[y * WIDTH + x]:
                reached += 1
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if nx < 0 or nx >= WIDTH:  # tunnel wrap inside the fill
                    if y == TUNNEL_ROW:
                        nx = WIDTH - 1 if nx < 0 else 0
                    else:
                        continue
                if not self.in_bounds(nx, ny) or seen[ny * WIDTH + nx]:
                    continue
                if not self.is_walkable(nx, ny):
                    continue
                seen[ny * WIDTH + nx] = 1
                stack.append((nx, ny))
        return reached
