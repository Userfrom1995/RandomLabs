"""Maze layout invariants: shape, counts, walkability, connectivity."""

from engine.maze import (
    Maze, WIDTH, HEIGHT, TUNNEL_ROW, LAYOUT, PLAYER_START_TILE,
    GHOST_DOOR_TILE, HOUSE_SLOTS,
)


def test_dimensions():
    assert (WIDTH, HEIGHT) == (28, 31)
    assert len(LAYOUT) == 31
    assert all(len(row) == 28 for row in LAYOUT)


def test_left_right_symmetry():
    for row in LAYOUT:
        assert row == row[::-1], "maze must be left-right symmetric: %r" % row


def test_pickup_counts():
    maze = Maze()
    assert maze.total_energizers == 4
    assert maze.total_dots >= 200


def test_every_pickup_reachable():
    maze = Maze()
    placed = maze.total_dots + maze.total_energizers
    assert maze.reachable_dots_from(PLAYER_START_TILE) == placed


def test_tunnel_mouths_walkable_and_wrap():
    maze = Maze()
    assert maze.is_walkable(0, TUNNEL_ROW)
    assert maze.is_walkable(WIDTH - 1, TUNNEL_ROW)
    assert maze.is_walkable(-1, TUNNEL_ROW)  # off-grid mouth
    assert maze.is_walkable(WIDTH, TUNNEL_ROW)
    assert not maze.is_walkable(-1, 0)
    assert not maze.is_walkable(5, 0)


def test_door_and_house_access_rules():
    maze = Maze()
    assert not maze.is_walkable(*GHOST_DOOR_TILE)  # player blocked by door
    assert maze.is_walkable(*GHOST_DOOR_TILE, for_ghost=True)
    for slot in HOUSE_SLOTS:
        assert not maze.is_walkable(*slot)
        assert maze.is_walkable(*slot, for_ghost=True)


def test_player_start_sane():
    maze = Maze()
    assert maze.is_walkable(*PLAYER_START_TILE)
    assert not maze.has_dot(*PLAYER_START_TILE)  # spawn tiles hold no dots


def test_eat_at_transitions():
    maze = Maze()
    assert maze.eat_at(*PLAYER_START_TILE) is None
    # find a dot tile and an energizer tile
    dot = next((x, y) for y in range(HEIGHT) for x in range(WIDTH) if maze.has_dot(x, y))
    assert maze.eat_at(*dot) == "dot"
    assert maze.eat_at(*dot) is None  # second eat is a no-op
    assert maze.dots_remaining == maze.total_dots - 1
