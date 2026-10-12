"""Tile-center movement with buffered turns and cornering assist.

Positions are continuous, in tile units: tile (tx, ty) spans
[tx, tx+1) x [ty, ty+1) and its center is (tx+0.5, ty+0.5).

Rules (arcade feel, authored):
  - Reversing is instant, anywhere.
  - Perpendicular turns latch at the next tile center: the buffered want
    executes when the actor comes within TURN_WINDOW_TILES of the center
    and the exit is walkable, with a small corner cut (snap to center).
  - Blocked movement halts exactly on the tile center, never inside a wall.
  - The tunnel row wraps horizontally past both edges.
"""

from . import tuning

UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)
DIRS = (UP, LEFT, DOWN, RIGHT)  # fixed priority order for ties


def opposite(d):
    return (-d[0], -d[1])


def tile_of(x, y):
    return (int(x // 1), int(y // 1))


def center_of(tx, ty):
    return (tx + 0.5, ty + 0.5)


class Actor:
    __slots__ = ("x", "y", "dir", "want", "speed")

    def __init__(self, x, y, direction, speed):
        self.x = float(x)
        self.y = float(y)
        self.dir = direction
        self.want = direction
        self.speed = float(speed)

    @property
    def tile(self):
        return tile_of(self.x, self.y)

    def state_tuple(self):
        return (round(self.x, 4), round(self.y, 4), self.dir[0], self.dir[1])


def step_actor(maze, actor, dt, for_ghost=False):
    """Advance one actor by dt seconds. Never enters a wall, never NaNs.

    Invariant: the actor rests either on a tile center (blocked) or inside
    a walkable tile. Strides are capped at 0.1 tiles so boundary crossings
    are examined one tile at a time.
    """
    from .maze import TUNNEL_ROW, WIDTH
    remaining = max(0.0, actor.speed * dt)
    window = tuning.TURN_WINDOW_TILES
    guard = 0
    while remaining > 1e-9 and guard < 256:
        guard += 1
        tx, ty = tile_of(actor.x, actor.y)
        cx, cy = center_of(tx, ty)
        dx, dy = actor.dir

        # Instant reversal anywhere.
        if actor.want == opposite(actor.dir):
            actor.dir = actor.want
            dx, dy = actor.dir

        # Buffered perpendicular turn near the tile center.
        if actor.want != actor.dir and actor.want != opposite(actor.dir):
            wx, wy = actor.want
            near = abs(cx - actor.x) + abs(cy - actor.y) <= window
            if near and maze.is_walkable(tx + wx, ty + wy, for_ghost):
                actor.x, actor.y = cx, cy
                actor.dir = actor.want
                dx, dy = actor.dir
                tx, ty = tile_of(actor.x, actor.y)
                cx, cy = center_of(tx, ty)

        stride = min(remaining, 0.1)
        nx, ny = actor.x + dx * stride, actor.y + dy * stride

        # Tunnel mouth: leaving the grid on the tunnel row wraps around.
        if (ty + dy) == TUNNEL_ROW and not 0 <= (tx + dx) < WIDTH \
                and maze.is_walkable(tx + dx, ty + dy, for_ghost):
            actor.x = nx + WIDTH if nx < 0 else nx - WIDTH
            actor.y = ny
            remaining -= stride
            continue

        # Blocked exit: glide to the center if it lies ahead, then halt.
        if not maze.is_walkable(tx + dx, ty + dy, for_ghost):
            if dx > 0 and actor.x < cx:
                actor.x = min(nx, cx)
            elif dx < 0 and actor.x > cx:
                actor.x = max(nx, cx)
            elif dy > 0 and actor.y < cy:
                actor.y = min(ny, cy)
            elif dy < 0 and actor.y > cy:
                actor.y = max(ny, cy)
            remaining = 0.0
            continue

        actor.x, actor.y = nx, ny
        remaining -= stride
