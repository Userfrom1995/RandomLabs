"""Movement feel: buffering, reversal, walls, corners, tunnel."""

from engine import tuning
from engine.actors import Actor, UP, DOWN, LEFT, RIGHT, center_of, step_actor, tile_of
from engine.maze import Maze, PLAYER_START_TILE, TUNNEL_ROW, WIDTH


def make_actor(tile, direction, speed=8.5):
    cx, cy = center_of(*tile)
    return Actor(cx, cy, direction, speed)


def test_straight_run_stays_on_row():
    maze = Maze()
    actor = make_actor(PLAYER_START_TILE, LEFT)
    actor.want = LEFT
    for _ in range(120):
        step_actor(maze, actor, tuning.STEP)
    assert tile_of(actor.x, actor.y)[1] == PLAYER_START_TILE[1]
    assert actor.x < PLAYER_START_TILE[0] + 0.5  # moved left


def test_instant_reversal():
    maze = Maze()
    actor = make_actor(PLAYER_START_TILE, LEFT)
    actor.want = LEFT
    step_actor(maze, actor, 0.2)
    x_before = actor.x
    actor.want = RIGHT  # reverse mid-corridor
    step_actor(maze, actor, tuning.STEP)
    assert actor.dir == RIGHT
    assert actor.x > x_before


def test_wall_halts_on_center():
    maze = Maze()
    actor = make_actor((1, 1), LEFT)  # col 0 is a wall
    actor.want = LEFT
    for _ in range(240):
        step_actor(maze, actor, tuning.STEP)
    tx, ty = tile_of(actor.x, actor.y)
    assert maze.is_walkable(tx, ty)
    cx, cy = center_of(tx, ty)
    assert abs(actor.x - cx) < 1e-6 and abs(actor.y - cy) < 1e-6


def test_buffered_turn_executes_at_intersection():
    maze = Maze()
    # Run left along row 23, buffer UP before the col-6 vertical shaft.
    actor = make_actor((9, 23), LEFT)
    actor.want = UP
    turned = False
    for _ in range(600):
        step_actor(maze, actor, tuning.STEP)
        if actor.dir == UP:
            turned = True
            break
    assert turned, "buffered UP never executed (ended at %s)" % (actor.tile,)
    assert actor.tile[0] == 6


def test_corner_cut_snaps_to_center():
    maze = Maze()
    actor = make_actor((9, 23), LEFT)
    actor.want = UP
    for _ in range(600):
        step_actor(maze, actor, tuning.STEP)
        if actor.dir == UP:
            break
    # After the turn the actor sits on the shaft (col 6 center x).
    assert abs(actor.x - 6.5) < 0.36


def test_tunnel_wraps():
    maze = Maze()
    actor = make_actor((1, TUNNEL_ROW), LEFT, speed=6.0)
    actor.want = LEFT
    for _ in range(1200):
        step_actor(maze, actor, tuning.STEP)
        if actor.x > WIDTH - 2:
            break
    assert actor.x > WIDTH - 2, "never wrapped (x=%s)" % actor.x
    assert tile_of(actor.x, actor.y)[1] == TUNNEL_ROW


def test_never_enters_walls_random_walk():
    import random
    rng = random.Random(7)
    maze = Maze()
    actor = make_actor(PLAYER_START_TILE, LEFT)
    dirs = [UP, DOWN, LEFT, RIGHT]
    for _ in range(3000):
        actor.want = rng.choice(dirs)
        step_actor(maze, actor, tuning.STEP)
        tx, ty = tile_of(actor.x, actor.y)
        assert maze.is_walkable(tx, ty), "inside wall at %s" % ((tx, ty),)
        assert actor.x == actor.x and actor.y == actor.y  # no NaN
