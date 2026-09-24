"""Unit and CLI tests for Shaftcast.

Run from the repository root with::

    python3 -m unittest discover -s shaftcast/tests
"""

import os
import subprocess
import sys
import unittest

from shaftcast.shaftcast import (
    DEFAULT_FOV,
    DEFAULT_RAMP,
    FILL_RAMP,
    TEXTURES,
    Map,
    MapError,
    Player,
    _BUILTIN_MAPS,
    _KeyReader,
    _action_of,
    cast_ray,
    generate_maze,
    parse_map,
    render_frame,
    shade_char,
)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _run_cli(*args):
    return subprocess.run(
        [sys.executable, "-m", "shaftcast"] + list(args),
        capture_output=True,
        text=True,
        cwd=ROOT,
    )


SIMPLE_MAP = """\
########
#......#
#..@...#
#......#
########
"""

CORRIDOR = """\
##########
#........#
#@.......#
#........#
##########
"""


class ParseMapTests(unittest.TestCase):
    def test_dims_and_player(self):
        map_, spawn = parse_map(SIMPLE_MAP, name="simple")
        self.assertEqual(map_.width, 8)
        self.assertEqual(map_.height, 5)
        self.assertEqual(spawn, (3, 2, "@"))
        self.assertEqual(map_.name, "simple")

    def test_player_spawn_replaced_by_floor(self):
        map_, _ = parse_map(SIMPLE_MAP)
        self.assertFalse(map_.is_wall(3, 2))

    def test_padding_short_rows(self):
        map_, spawn = parse_map("##\n#@\n", name="pad")
        self.assertEqual(map_.width, 2)
        self.assertEqual(map_.height, 2)
        self.assertFalse(map_.is_wall(1, 1))

    def test_comment_lines_are_ignored(self):
        map_, spawn = parse_map(
            "# a comment line\n#   more comment\n####\n#@..\n####"
        )
        self.assertEqual(map_.height, 3)
        self.assertEqual(spawn, (1, 1, "@"))

    def test_out_of_bounds_is_wall(self):
        map_, _ = parse_map(SIMPLE_MAP)
        self.assertTrue(map_.is_wall(-1, 0))
        self.assertTrue(map_.is_wall(0, -1))
        self.assertTrue(map_.is_wall(8, 0))
        self.assertTrue(map_.is_wall(0, 5))

    def test_wall_and_floor_detection(self):
        map_, _ = parse_map(SIMPLE_MAP)
        self.assertTrue(map_.is_wall(0, 0))
        self.assertTrue(map_.is_wall(0, 1))
        self.assertFalse(map_.is_wall(1, 1))

    def test_missing_player_raises(self):
        with self.assertRaises(MapError):
            parse_map("####\n#..#\n####")

    def test_multiple_players_raise(self):
        with self.assertRaises(MapError):
            parse_map("####\n#@<#\n####")

    def test_empty_map_raises(self):
        with self.assertRaises(MapError):
            parse_map("   \n   \n")

    def test_spawn_direction_markers(self):
        for marker, expected in [("@", (1, 0)), (">", (1, 0)), ("v", (0, 1)), ("<", (-1, 0)), ("^", (0, -1))]:
            with self.subTest(marker=marker):
                map_, spawn = parse_map("###\n#%s#\n###" % marker)
                self.assertEqual(spawn[2], marker)

    def test_all_builtin_maps_are_valid_and_rectangular(self):
        for name, text in _BUILTIN_MAPS.items():
            with self.subTest(name=name):
                map_, spawn = parse_map(text, name=name)
                self.assertEqual(spawn[2], "@")
                for row in map_.rows:
                    self.assertEqual(len(row), map_.width)

    def test_tile_texture_chars_are_walls(self):
        map_, _ = parse_map("####\n#%=@#\n####")
        self.assertTrue(map_.is_wall(1, 1))
        self.assertTrue(map_.is_wall(2, 1))


class MazeTests(unittest.TestCase):
    def test_maze_dims(self):
        map_, spawn = generate_maze(21, 15, seed=1)
        self.assertEqual(map_.width, 21)
        self.assertEqual(map_.height, 15)
        self.assertIn(spawn[2], "@>^<v")

    def test_maze_rectangular(self):
        for w, h in [(9, 9), (12, 10), (25, 13)]:
            map_, _ = generate_maze(w, h, seed=42)
            for row in map_.rows:
                self.assertEqual(len(row), map_.width)

    def test_maze_deterministic_with_seed(self):
        a, _ = generate_maze(21, 15, seed=7)
        b, _ = generate_maze(21, 15, seed=7)
        self.assertEqual(a.rows, b.rows)

    def test_maze_is_connected(self):
        map_, _ = generate_maze(21, 15, seed=3)
        visited = set()
        start = next(
            (x, y) for y in range(map_.height) for x in range(map_.width)
            if not map_.is_wall(x, y)
        )
        stack = [start]
        while stack:
            x, y = stack.pop()
            if (x, y) in visited:
                continue
            visited.add((x, y))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if not map_.is_wall(nx, ny) and (nx, ny) not in visited:
                    stack.append((nx, ny))
        floor_cells = [(x, y) for y in range(map_.height) for x in range(map_.width) if not map_.is_wall(x, y)]
        self.assertEqual(len(visited), len(floor_cells))

    def test_maze_player_on_open_cell(self):
        map_, spawn = generate_maze(15, 15, seed=5)
        self.assertFalse(map_.is_wall(spawn[0], spawn[1]))


class PlayerTests(unittest.TestCase):
    def test_spawn_center_and_facing(self):
        p = Player(3, 2, 1.0, 0.0)
        self.assertEqual(p.x, 3.5)
        self.assertEqual(p.y, 2.5)
        self.assertEqual(p.dir_x, 1.0)
        self.assertEqual(p.dir_y, 0.0)

    def test_plane_perpendicular_and_fov(self):
        p = Player(0, 0, 1.0, 0.0, fov_degrees=90.0)
        self.assertAlmostEqual(p.plane_x, 0.0)
        self.assertAlmostEqual(p.plane_y, 1.0)  # tan(45 deg) = 1
        p2 = Player(0, 0, 1.0, 0.0, fov_degrees=DEFAULT_FOV)
        self.assertAlmostEqual(p2.plane_y, math_tan_33())

    def test_rotate_quarter_turn(self):
        p = Player(0, 0, 1.0, 0.0)
        p.rotate(math_pi() / 2)
        self.assertAlmostEqual(p.dir_x, 0.0, places=9)
        self.assertAlmostEqual(p.dir_y, 1.0, places=9)
        self.assertAlmostEqual(p.plane_x, -math_tan_33(), places=9)
        self.assertAlmostEqual(p.plane_y, 0.0, places=9)

    def test_move_and_collision(self):
        map_, _ = parse_map(CORRIDOR)
        p = Player(1, 2, 1.0, 0.0)
        p.move(map_, 0.4, 0.0)
        self.assertAlmostEqual(p.x, 1.9)
        self.assertAlmostEqual(p.y, 2.5)
        # Walk into the right wall: x should stop at the wall edge.
        p.move(map_, 10.0, 0.0)
        self.assertLess(p.x, 9.0)
        # Walk into the top wall: y should be blocked.
        p.y = 1.0
        p.move(map_, 0.0, -10.0)
        self.assertGreaterEqual(p.y, 1.0)

    def test_facing_name(self):
        p = Player(0, 0, 1.0, 0.0)
        self.assertEqual(p.facing_name(), "east")
        p = Player(0, 0, 0.0, 1.0)
        self.assertEqual(p.facing_name(), "south")
        p = Player(0, 0, -1.0, 0.0)
        self.assertEqual(p.facing_name(), "west")
        p = Player(0, 0, 0.0, -1.0)
        self.assertEqual(p.facing_name(), "north")


class RaycastTests(unittest.TestCase):
    def test_straight_ahead_distance(self):
        # Player at (1,2) facing east in a 10-wide corridor: the wall is at x=9.
        map_, _ = parse_map(CORRIDOR)
        p = Player(1, 2, 1.0, 0.0)
        perp, side, wall_char, wall_x = cast_ray(map_, p, p.dir_x, p.dir_y)
        self.assertAlmostEqual(perp, 8.0 - 0.5)  # 9 - player.x
        self.assertEqual(side, 0)
        self.assertEqual(wall_char, "#")

    def test_wall_x_in_unit_range(self):
        map_, _ = parse_map(CORRIDOR)
        p = Player(1, 2, 1.0, 0.0)
        _, _, _, wall_x = cast_ray(map_, p, p.dir_x, p.dir_y)
        self.assertGreaterEqual(wall_x, 0.0)
        self.assertLess(wall_x, 1.0)

    def test_ray_hits_nearby_wall_first(self):
        # Put a pillar in front of the player: the ray must stop there.
        grid = """\
##########
#..##....#
#@..##...#
#........#
##########
"""
        map_, _ = parse_map(grid)
        p = Player(1, 2, 1.0, 0.0)
        perp, _, _, _ = cast_ray(map_, p, p.dir_x, p.dir_y)
        self.assertAlmostEqual(perp, 3.0 - 0.5)  # pillar face at x=3


class ShadingTests(unittest.TestCase):
    def test_near_wall_is_bright(self):
        self.assertEqual(shade_char(DEFAULT_RAMP, 0.5, 12.0, 0), "#")
        self.assertEqual(shade_char(DEFAULT_RAMP, 0.1, 12.0, 0), "#")

    def test_far_wall_is_dim(self):
        self.assertEqual(shade_char(DEFAULT_RAMP, 12.0, 12.0, 0), ".")

    def test_side_wall_darker_than_front(self):
        front = shade_char(DEFAULT_RAMP, 3.0, 12.0, 0)
        side = shade_char(DEFAULT_RAMP, 3.0, 12.0, 1)
        self.assertGreaterEqual(DEFAULT_RAMP.index(front), 0)
        self.assertGreaterEqual(DEFAULT_RAMP.index(side), DEFAULT_RAMP.index(front))

    def test_clamped_at_extremes(self):
        self.assertEqual(shade_char(DEFAULT_RAMP, -5.0, 12.0, 0), "#")
        self.assertEqual(shade_char(DEFAULT_RAMP, 999.0, 12.0, 0), ".")


class RenderTests(unittest.TestCase):
    def test_frame_dimensions(self):
        map_, spawn = parse_map(SIMPLE_MAP)
        p = Player(spawn[0], spawn[1], 1.0, 0.0)
        frame = render_frame(map_, p, 40, 12)
        self.assertEqual(len(frame), 12)
        for row in frame:
            self.assertEqual(len(row), 40)

    def test_wall_visible_straight_ahead(self):
        map_, _ = parse_map(CORRIDOR)
        p = Player(1, 2, 1.0, 0.0)
        frame = render_frame(map_, p, 40, 12, fill="none")
        middle = frame[6]
        self.assertTrue(any(ch in DEFAULT_RAMP for ch in middle))

    def test_no_textures_uses_default_ramp(self):
        map_, _ = parse_map("####\n#%=@#\n####")
        p = Player(1, 1, 1.0, 0.0)
        textured = render_frame(map_, p, 40, 12, textures=True)
        plain = render_frame(map_, p, 40, 12, textures=False)
        self.assertNotEqual(textured, plain)

    def test_fill_none_leaves_blank_sky(self):
        map_, _ = parse_map(SIMPLE_MAP)
        p = Player(1, 2, 1.0, 0.0)
        frame = render_frame(map_, p, 40, 12, fill="none")
        self.assertIn(" ", frame[0])

    def test_minimap_overlay(self):
        map_, _ = parse_map(SIMPLE_MAP)
        p = Player(1, 2, 1.0, 0.0)
        frame = render_frame(map_, p, 40, 12, minimap=True)
        joined = "\n".join(frame)
        self.assertIn("@", joined)
        self.assertIn("#", joined)

    def test_frame_is_deterministic(self):
        map_, spawn = parse_map(SIMPLE_MAP)
        p1 = Player(spawn[0], spawn[1], 1.0, 0.0)
        p2 = Player(spawn[0], spawn[1], 1.0, 0.0)
        self.assertEqual(
            render_frame(map_, p1, 40, 12), render_frame(map_, p2, 40, 12)
        )


class MapFileTests(unittest.TestCase):
    def test_load_map_file(self):
        import tempfile

        from shaftcast.shaftcast import load_map_file

        with tempfile.NamedTemporaryFile("w", suffix=".map", delete=False) as handle:
            handle.write(SIMPLE_MAP)
            path = handle.name
        try:
            map_, spawn = load_map_file(path)
            self.assertEqual(map_.name, os.path.basename(path))
            self.assertEqual(spawn, (3, 2, "@"))
        finally:
            os.remove(path)


class KeyReaderTests(unittest.TestCase):
    def _reader(self, payload):
        import os
        read_fd, write_fd = os.pipe()
        os.write(write_fd, payload)
        os.close(write_fd)
        reader = _KeyReader(read_fd)
        return reader, read_fd

    def test_plain_chars(self):
        reader, fd = self._reader(b"wasd")
        events = reader.poll()
        os.close(fd)
        self.assertEqual([v for _, v in events], ["w", "a", "s", "d"])

    def test_arrow_keys(self):
        reader, fd = self._reader(b"\x1b[A\x1b[B\x1b[C\x1b[D")
        events = reader.poll()
        os.close(fd)
        self.assertEqual(
            events, [("arrow", "up"), ("arrow", "down"), ("arrow", "right"), ("arrow", "left")]
        )

    def test_arrow_sequence_split_across_polls(self):
        import os
        read_fd, write_fd = os.pipe()
        reader = _KeyReader(read_fd)
        os.write(write_fd, b"\x1b[")
        self.assertEqual(reader.poll(), [])  # incomplete: waits
        os.write(write_fd, b"C")
        os.close(write_fd)
        events = reader.poll()
        os.close(read_fd)
        self.assertEqual(events, [("arrow", "right")])

    def test_lone_esc_and_ctrl_c(self):
        reader, fd = self._reader(b"\x1b\x03")
        events = reader.poll()
        os.close(fd)
        kinds = [kind for kind, _ in events]
        self.assertIn("char", kinds)  # esc becomes a char event

    def test_action_mapping(self):
        self.assertEqual(_action_of("char", "w"), "forward")
        self.assertEqual(_action_of("char", "s"), "back")
        self.assertEqual(_action_of("char", "a"), "left")
        self.assertEqual(_action_of("char", "d"), "right")
        self.assertEqual(_action_of("char", "q"), "turn-left")
        self.assertEqual(_action_of("char", "e"), "turn-right")
        self.assertEqual(_action_of("char", "m"), "toggle-minimap")
        self.assertEqual(_action_of("char", "f"), "toggle-fill")
        self.assertEqual(_action_of("char", "t"), "toggle-textures")
        self.assertEqual(_action_of("char", "esc"), "quit")
        self.assertEqual(_action_of("char", "ctrl-c"), "quit")
        self.assertEqual(_action_of("arrow", "up"), "forward")
        self.assertEqual(_action_of("arrow", "down"), "back")
        self.assertEqual(_action_of("arrow", "right"), "turn-right")
        self.assertEqual(_action_of("arrow", "left"), "turn-left")
        self.assertIsNone(_action_of("char", "z"))


class CliTests(unittest.TestCase):
    def test_version(self):
        result = _run_cli("--version")
        self.assertEqual(result.returncode, 0)
        self.assertIn("shaftcast", result.stdout)

    def test_help(self):
        result = _run_cli("--help")
        self.assertEqual(result.returncode, 0)
        self.assertIn("--maze", result.stdout)
        self.assertIn("--minimap", result.stdout)

    def test_frames_dump(self):
        result = _run_cli("--frames", "2", "--width", "30", "--height", "10", "--builtin", "demo")
        self.assertEqual(result.returncode, 0)
        lines = result.stdout.splitlines()
        self.assertIn("frame 1/2", result.stdout)
        self.assertIn("frame 2/2", result.stdout)
        # Two frames, each 10 rows, separated by a blank line + headers.
        self.assertGreaterEqual(len(lines), 2 * 10 + 2)

    def test_maze_frame_dump(self):
        result = _run_cli("--frames", "1", "--maze", "21x15", "--seed", "9", "--width", "30", "--height", "10")
        self.assertEqual(result.returncode, 0)
        self.assertIn("maze 21x15 (seed 9)", result.stdout)

    def test_minimap_flag(self):
        result = _run_cli("--frames", "1", "--minimap", "--width", "30", "--height", "10")
        self.assertEqual(result.returncode, 0)
        self.assertIn("@", result.stdout)

    def test_missing_map_file_exits_nonzero(self):
        result = _run_cli("--map", "/nonexistent/nope.map")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("cannot read", result.stderr)

    def test_invalid_maze_size(self):
        result = _run_cli("--maze", "banana")
        self.assertNotEqual(result.returncode, 0)

    def test_bad_fill_choice(self):
        result = _run_cli("--fill", "banana")
        self.assertNotEqual(result.returncode, 0)


def math_pi():
    import math
    return math.pi


def math_tan_33():
    import math
    return math.tan(math.radians(33.0))


if __name__ == "__main__":
    unittest.main()
