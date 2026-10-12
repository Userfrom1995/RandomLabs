"""Fixer regression: tunnel wrap polarity + two-way transit (Evaluator FIX 8.4/10).

Blocking findings on Phase 1 re-eval (head e52cbdfb):
1. maze.py flood-fill wrap polarity inverted (mapped each edge onto itself).
2. actors.py tunnel transit gated on tile exit (tx+dx) instead of continuous
   nx, breaking rightward travel and stranding actors in off-grid limbo.
"""

from engine import tuning
from engine.actors import Actor, LEFT, RIGHT, center_of, step_actor, tile_of
from engine.maze import HEIGHT, TUNNEL_ROW, WIDTH, Maze


def test_flood_fill_traverses_tunnel_wrap():
    # Isolate the two mouths: everything else is a wall, so the left mouth
    # can only reach the right mouth via the wrap edge. With inverted
    # polarity the fill maps each edge onto itself and finds 1; fixed it
    # finds 2.
    maze = Maze()
    maze.grid = [list("#" * WIDTH) for _ in range(HEIGHT)]
    maze.grid[TUNNEL_ROW][0] = "."
    maze.grid[TUNNEL_ROW][WIDTH - 1] = "."
    maze.dots = bytearray(WIDTH * HEIGHT)
    maze.energizers = bytearray(WIDTH * HEIGHT)
    maze.dots[TUNNEL_ROW * WIDTH + 0] = 1
    maze.dots[TUNNEL_ROW * WIDTH + WIDTH - 1] = 1
    assert maze.reachable_dots_from((0, TUNNEL_ROW)) == 2


def _run_tunnel(tile, direction, steps=3000, speed=6.0):
    maze = Maze()
    cx, cy = center_of(*tile)
    actor = Actor(cx, cy, direction, speed)
    actor.want = direction
    wrapped = False
    for _ in range(steps):
        step_actor(maze, actor, tuning.STEP)
        assert 0 <= actor.x < WIDTH, "off-grid x=%r" % (actor.x,)
        assert 0 <= actor.y < HEIGHT, "off-grid y=%r" % (actor.y,)
        tx, ty = tile_of(actor.x, actor.y)
        assert maze.in_bounds(tx, ty), "off-grid tile %r" % ((tx, ty),)
        assert maze.is_walkable(tx, ty), "inside wall at %r" % ((tx, ty),)
        assert ty == TUNNEL_ROW
        if direction == LEFT and actor.x > WIDTH - 2:
            wrapped = True
        if direction == RIGHT and actor.x < 2:
            wrapped = True
    return actor, wrapped


def test_tunnel_transit_left_stays_in_bounds_and_wraps():
    _, wrapped = _run_tunnel((1, TUNNEL_ROW), LEFT)
    assert wrapped, "leftward run never reached the far side"


def test_tunnel_transit_right_stays_in_bounds_and_wraps():
    _, wrapped = _run_tunnel((WIDTH - 2, TUNNEL_ROW), RIGHT)
    assert wrapped, "rightward run never reached the far side"
