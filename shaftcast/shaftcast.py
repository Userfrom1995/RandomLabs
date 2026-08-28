#!/usr/bin/env python3
"""Shaftcast - a first-person raycasting engine in the terminal.

Shaftcast renders a pseudo-3D, Wolfenstein-style view from a 2D grid map using
nothing but the Python standard library. For every column of the terminal it
casts a ray through the grid with the Digital Differential Analyzer (DDA)
algorithm, finds the first wall hit, and scales the wall slice's height by the
ray length to fake depth perspective. Wall columns are shaded with a
distance-based luminance ramp, and a 2D minimap overlay and ceiling/floor
fills are available.

Usage::

    python3 -m shaftcast                  # interactive mode (needs a TTY)
    python3 -m shaftcast --frames 1       # render one frame and exit
    python3 -m shaftcast --maze 21x31     # generate a random maze
    python3 -m shaftcast --map my.map     # load a map from a text file

Run ``python3 -m shaftcast --help`` for the full option reference, or see the
README and the ``docs/`` folder for the detailed guide.
"""

from __future__ import annotations

import argparse
import math
import os
import random
import re
import shutil
import sys
import time
from typing import Dict, List, Optional, Sequence, Tuple

__version__ = "1.0.0"

# Characters that count as empty floor in a map file. Everything else (except
# the player spawn markers) is treated as a wall.
FLOOR_CHARS = frozenset(" .,-_")

# Player spawn markers: each sets the initial facing direction.
#   @  east   >  east   v  south   <  west   ^  north
PLAYER_CHARS = frozenset("@>^<v")
_PLAYER_DIRS: Dict[str, Tuple[float, float]] = {
    "@": (1.0, 0.0),
    ">": (1.0, 0.0),
    "v": (0.0, 1.0),
    "<": (-1.0, 0.0),
    "^": (0.0, -1.0),
}

# Distance-based luminance ramps, ordered from bright (near) to dark (far).
# ``#`` is the default wall texture; other wall characters can get their own
# ramp for a per-tile texturing effect.
DEFAULT_RAMP = "#%+~."
TEXTURES: Dict[str, str] = {
    "#": "#%+~.",
    "%": "%#@*+",
    "=": "=#%+-",
    "+": "+#%*.",
    "*": "*#@%+",
    "$": "$#%@*",
    "@": "#%+~.",  # '@' used as a wall in maps that reserve 'P' for the player
    "P": "#%+~.",
}
FILL_RAMP = ".,-~ "

MOVE_SPEED = 3.0      # grid cells per second
TURN_SPEED = 2.5      # radians per second
AUTOPILOT_SPEED = 0.4  # radians per second when nobody is steering
HELD_TIMEOUT = 0.15   # seconds before a key is considered released
MAX_DT = 0.1          # clamp frame delta to avoid tunneling on hiccups
DEFAULT_FOV = 66.0
DEFAULT_MAX_DIST = 12.0
DEFAULT_FPS = 20.0

_TERMIOS_AVAILABLE = True
try:
    import select
    import termios
    import tty
except ImportError:  # pragma: no cover - non-POSIX platforms
    _TERMIOS_AVAILABLE = False

_CLEAR = "\x1b[2J\x1b[H"
_HIDE_CURSOR = "\x1b[?25l"
_SHOW_CURSOR = "\x1b[?25h"

# Default maps. Each is a plain ASCII grid: '#' walls, '.' floor, spawn marker.
_BUILTIN_MAPS: Dict[str, str] = {
    "demo": """\
#####################
#@........#.........#
#.........#.........#
#...###...#...###...#
#...#.#...#...#.#...#
#...#.#...#...#.#...#
#...###...#...###...#
#.........#.........#
#.........#.........#
#...................#
#####################""",
    "fort": """\
##############
#............#
#.#####.######
#.#...#.#...##
#.#.#.#.#.#.##
#.#...#.#...##
#.#####.######
#............#
#...######...#
#...#....#...#
#...#..@.#...#
#...#....#...#
#...######...#
##############""",
    "castle": """\
##########################
#........................#
#.#####.#####.#####.######
#.#...#.#...#.#...#.#...##
#.#...#.#...#.#...#.#...##
#.#####.#####.#####.######
#........................#
#@.###..###..###..###....#
#..#.#..#.#..#.#..#.#....#
#..#.#..#.#..#.#..#.#....#
#..#.#..#.#..#.#..#.#....#
#..###..###..###..###....#
#........................#
##########################""",
}

_FACING_NAMES = {
    (1.0, 0.0): "east",
    (0.0, 1.0): "south",
    (-1.0, 0.0): "west",
    (0.0, -1.0): "north",
}


class MapError(ValueError):
    """Raised when a map file or built-in map cannot be parsed."""


class Map:
    """A rectangular 2D grid of cells.

    Coordinates are ``(x, y)`` with ``x`` the column and ``y`` the row. Cells
    outside the grid are always treated as walls, so rays terminate at the
    border and the player can never walk off the map.
    """

    __slots__ = ("rows", "name", "width", "height")

    def __init__(self, rows: List[List[str]], name: str = "<map>") -> None:
        self.rows = rows
        self.name = name
        self.height = len(rows)
        self.width = max((len(row) for row in rows), default=0)

    def is_wall(self, x: float, y: float) -> bool:
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            return True
        return self.rows[int(y)][int(x)] not in FLOOR_CHARS

    def at(self, x: int, y: int) -> str:
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            return "#"
        return self.rows[y][x]

    def char(self, x: int, y: int) -> str:
        return self.at(x, y)


def parse_map(text: str, name: str = "<string>") -> Tuple[Map, Tuple[int, int, str]]:
    """Parse a textual grid into a Map plus the player spawn.

    The grid is made rectangular by padding short rows with floor spaces.
    Exactly one player spawn marker is required.
    """
    raw = [line.rstrip("\r\n") for line in text.splitlines()]
    # Lines starting with "# " are comments (a wall row is all '#', never
    # '# '), and fully blank lines are ignored.
    raw = [
        line
        for line in raw
        if not line.lstrip().startswith("# ") and line.strip()
    ]
    if not raw:
        raise MapError("map is empty")
    width = max(len(line) for line in raw)
    rows = [list(line.ljust(width)) for line in raw]

    spawn: Optional[Tuple[int, int, str]] = None
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in PLAYER_CHARS:
                if spawn is not None:
                    raise MapError(
                        "map has more than one player spawn "
                        "(markers: %s)" % "".join(sorted(PLAYER_CHARS))
                    )
                spawn = (x, y, ch)
                row[x] = "."
    if spawn is None:
        raise MapError(
            "map has no player spawn - add one of: %s"
            % "".join(sorted(PLAYER_CHARS))
        )
    return Map(rows, name), spawn


def load_map_file(path: str) -> Tuple[Map, Tuple[int, int, str]]:
    """Load and parse a map from a text file."""
    try:
        with open(path, "r", encoding="utf-8") as handle:
            text = handle.read()
    except OSError as exc:
        raise MapError("cannot read map file %r: %s" % (path, exc))
    return parse_map(text, name=os.path.basename(path))


def _positive_int(name: str, minimum: int, maximum: int):
    """Argparse type for an integer within a fixed inclusive range."""

    def _check(value: str) -> int:
        try:
            number = int(value)
        except ValueError:
            raise argparse.ArgumentTypeError(f"{name} must be an integer, got {value!r}")
        if number < minimum or number > maximum:
            raise argparse.ArgumentTypeError(
                f"{name} must be between {minimum} and {maximum}, got {number}"
            )
        return number

    return _check


def _positive_float(name: str):
    """Argparse type for a strictly positive float."""

    def _check(value: str) -> float:
        try:
            number = float(value)
        except ValueError:
            raise argparse.ArgumentTypeError(f"{name} must be a number, got {value!r}")
        if number <= 0:
            raise argparse.ArgumentTypeError(f"{name} must be positive, got {number}")
        return number

    return _check


def _maze_size(value: str) -> Tuple[int, int]:
    """Argparse type for ``WIDTHxHEIGHT`` maze dimensions."""
    match = re.fullmatch(r"(\d+)x(\d+)", value.strip())
    if match is None:
        raise argparse.ArgumentTypeError(
            "maze size must look like WIDTHxHEIGHT, got %r" % value
        )
    width = int(match.group(1))
    height = int(match.group(2))
    if width < 5 or height < 5:
        raise argparse.ArgumentTypeError("maze must be at least 5x5, got %r" % value)
    return width, height


def generate_maze(width: int, height: int, seed: Optional[int]) -> Tuple[Map, Tuple[int, int, str]]:
    """Generate a perfect maze with a recursive-backtracking (DFS) carve.

    Odd dimensions are used so walls and corridors interleave cleanly. The
    player spawn is placed on a random open cell facing a random direction.
    """
    if seed is None:
        seed = random.SystemRandom().randint(0, 2 ** 31 - 1)
    rng = random.Random(seed)
    if width % 2 == 0:
        width += 1
    if height % 2 == 0:
        height += 1
    grid = [["#"] * width for _ in range(height)]

    def carve(x: int, y: int) -> None:
        grid[y][x] = "."
        directions = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        rng.shuffle(directions)
        for dx, dy in directions:
            nx, ny = x + dx * 2, y + dy * 2
            if 0 <= nx < width and 0 <= ny < height and grid[ny][nx] == "#":
                grid[y + dy][x + dx] = "."
                carve(nx, ny)

    carve(1, 1)
    text = "\n".join("".join(row) for row in grid)
    spawn: Optional[Tuple[int, int, str]] = None
    while spawn is None:
        sx = rng.randrange(0, width)
        sy = rng.randrange(0, height)
        if grid[sy][sx] != ".":
            continue
        # Face the player down an open corridor so the first view is not a wall.
        opens = []
        for marker, (dx, dy) in _PLAYER_DIRS.items():
            if marker == "@":
                marker = ">"
            nx, ny = sx + int(dx), sy + int(dy)
            if 0 <= nx < width and 0 <= ny < height and grid[ny][nx] == ".":
                opens.append(marker)
        if not opens:
            continue
        marker = rng.choice(opens)
        spawn = (sx, sy, marker)
    rows = [list(line) for line in text.splitlines()]
    rows[sy][sx] = marker
    text = "\n".join("".join(row) for row in rows)
    return parse_map(text, name="maze %dx%d (seed %d)" % (width, height, seed))


class Player:
    """A first-person camera: position plus direction and camera plane."""

    __slots__ = ("x", "y", "dir_x", "dir_y", "plane_x", "plane_y")

    def __init__(
        self,
        x: float,
        y: float,
        dir_x: float,
        dir_y: float,
        fov_degrees: float = DEFAULT_FOV,
    ) -> None:
        self.x = x + 0.5
        self.y = y + 0.5
        self.dir_x = dir_x
        self.dir_y = dir_y
        length = math.hypot(dir_x, dir_y)
        if length > 0:
            self.dir_x /= length
            self.dir_y /= length
        plane_len = math.tan(math.radians(fov_degrees) / 2.0)
        self.plane_x = -self.dir_y * plane_len
        self.plane_y = self.dir_x * plane_len

    def rotate(self, angle: float) -> None:
        cos_a = math.cos(angle)
        sin_a = math.sin(angle)
        dx, dy = self.dir_x, self.dir_y
        self.dir_x = dx * cos_a - dy * sin_a
        self.dir_y = dx * sin_a + dy * cos_a
        px, py = self.plane_x, self.plane_y
        self.plane_x = px * cos_a - py * sin_a
        self.plane_y = px * sin_a + py * cos_a

    def move(self, map_: Map, dx: float, dy: float) -> None:
        """Move with per-axis collision checks so the camera slides along walls."""
        if not map_.is_wall(self.x + dx, self.y):
            self.x += dx
        if not map_.is_wall(self.x, self.y + dy):
            self.y += dy

    def facing_name(self) -> str:
        angle = math.degrees(math.atan2(self.dir_y, self.dir_x))
        # Normalize to [-180, 180] and snap to the nearest cardinal direction.
        snapped = 45 * round(angle / 45.0)
        return _FACING_NAMES.get(
            (round(math.cos(math.radians(snapped))), round(math.sin(math.radians(snapped)))),
            "%.0f deg" % ((angle + 360.0) % 360.0),
        )


def cast_ray(
    map_: Map, player: Player, ray_dir_x: float, ray_dir_y: float
) -> Tuple[float, int, str, float]:
    """DDA ray cast through the grid.

    Returns ``(perp_distance, side, wall_char, wall_x)`` where ``side`` is 0
    for an x-side hit and 1 for a y-side hit, and ``wall_x`` is the exact
    fractional hit coordinate along the wall (0..1), which can be used for
    texturing.
    """
    map_x = int(player.x)
    map_y = int(player.y)
    delta_x = abs(1.0 / ray_dir_x) if ray_dir_x != 0 else math.inf
    delta_y = abs(1.0 / ray_dir_y) if ray_dir_y != 0 else math.inf

    if ray_dir_x < 0:
        step_x = -1
        side_x = (player.x - map_x) * delta_x
    else:
        step_x = 1
        side_x = (map_x + 1.0 - player.x) * delta_x
    if ray_dir_y < 0:
        step_y = -1
        side_y = (player.y - map_y) * delta_y
    else:
        step_y = 1
        side_y = (map_y + 1.0 - player.y) * delta_y

    side = 0
    max_steps = map_.width + map_.height + 2
    for _ in range(max_steps):
        if side_x < side_y:
            side_x += delta_x
            map_x += step_x
            side = 0
        else:
            side_y += delta_y
            map_y += step_y
            side = 1
        if map_.is_wall(map_x, map_y):
            break

    if side == 0:
        perp = side_x - delta_x
        wall_x = player.y + perp * ray_dir_y
    else:
        perp = side_y - delta_y
        wall_x = player.x + perp * ray_dir_x
    wall_x -= math.floor(wall_x)
    return max(perp, 1e-6), side, map_.char(map_x, map_y), wall_x


def shade_char(ramp: str, distance: float, max_dist: float, side: int) -> str:
    """Pick a luminance glyph for a wall at ``distance``.

    The ramp is ordered bright-to-dark, so a nearby wall maps to the bright
    end and a distant wall to the dark end. Side (y-axis) hits are dimmed.
    """
    factor = min(distance / max_dist, 1.0)
    if side == 1:
        factor = min(factor * 1.4, 1.0)  # push side walls toward the dark end
    factor = max(0.0, min(1.0, factor))
    index = int(round(factor * (len(ramp) - 1)))
    return ramp[index]


def _fill_glyph(y: int, height: int, max_dist: float, is_ceiling: bool) -> str:
    """Shade a floor/ceiling row based on its approximate row distance."""
    center = height / 2.0
    if is_ceiling:
        row_distance = center / max(center - (y + 0.5), 0.5)
    else:
        row_distance = center / max((y + 0.5) - center, 0.5)
    factor = min(row_distance / max_dist, 1.0)
    factor = max(0.0, min(1.0, factor))
    index = int(round(factor * (len(FILL_RAMP) - 1)))
    return FILL_RAMP[index]


def render_frame(
    map_: Map,
    player: Player,
    width: int,
    height: int,
    *,
    fill: str = "both",
    minimap: bool = False,
    textures: bool = True,
    max_dist: float = DEFAULT_MAX_DIST,
) -> List[str]:
    """Render a single frame as a list of strings (one per terminal row).

    This is a pure function with no terminal side effects, so it can be unit
    tested directly.
    """
    frame = [[" "] * width for _ in range(height)]
    fill_ceiling = fill in ("ceiling", "both")
    fill_floor = fill in ("floor", "both")

    for x in range(width):
        camera_x = 2.0 * x / width - 1.0
        ray_dir_x = player.dir_x + player.plane_x * camera_x
        ray_dir_y = player.dir_y + player.plane_y * camera_x
        perp, side, wall_char, _wall_x = cast_ray(map_, player, ray_dir_x, ray_dir_y)

        line_height = int(height / perp) if perp > 1e-6 else height
        line_height = max(1, min(line_height, height))
        draw_start = height // 2 - line_height // 2
        draw_end = draw_start + line_height

        ramp = TEXTURES.get(wall_char, DEFAULT_RAMP) if textures else DEFAULT_RAMP
        glyph = shade_char(ramp, perp, max_dist, side)

        for y in range(height):
            if y < draw_start:
                frame[y][x] = _fill_glyph(y, height, max_dist, True) if fill_ceiling else " "
            elif y >= draw_end:
                frame[y][x] = _fill_glyph(y, height, max_dist, False) if fill_floor else " "
            else:
                frame[y][x] = glyph

    if minimap:
        overlay_minimap(frame, map_, player)
    return ["".join(row) for row in frame]


def overlay_minimap(frame: List[List[str]], map_: Map, player: Player) -> None:
    """Draw a small 2D minimap in the bottom-left corner of the frame."""
    height = len(frame)
    width = len(frame[0])
    max_cells_w = max(8, min(20, width // 3))
    max_cells_h = max(4, min(12, height // 3))
    vp_w = min(map_.width, max_cells_w)
    vp_h = min(map_.height, max_cells_h)
    col0 = max(0, min(int(player.x) - vp_w // 2, map_.width - vp_w))
    row0 = max(0, min(int(player.y) - vp_h // 2, map_.height - vp_h))
    start_col = 1
    start_row = height - vp_h - 1
    if start_row < 0:
        return

    for vy in range(vp_h):
        for vx in range(vp_w):
            ch = map_.char(col0 + vx, row0 + vy)
            glyph = " " if ch in FLOOR_CHARS else ch
            frame[start_row + vy][start_col + vx] = glyph
    px = int(player.x) - col0
    py = int(player.y) - row0
    if 0 <= px < vp_w and 0 <= py < vp_h:
        frame[start_row + py][start_col + px] = "@"


def _arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="shaftcast",
        description=(
            "Shaftcast - a first-person raycasting engine in the terminal. "
            "Renders a pseudo-3D Wolfenstein-style view from a 2D grid map "
            "using DDA raycasting and ASCII shading. Standard library only."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  python3 -m shaftcast                interactive mode\n"
            "  python3 -m shaftcast --frames 1     render one frame and exit\n"
            "  python3 -m shaftcast --maze 21x31   generate a random maze\n"
            "  python3 -m shaftcast --map my.map   load a map file\n"
            "  python3 -m shaftcast --minimap --fill none\n"
        ),
    )
    source = parser.add_mutually_exclusive_group()
    source.add_argument(
        "--map",
        metavar="FILE",
        help="load a map from a text file (grid of '#', '.', spawn marker)",
    )
    source.add_argument(
        "--maze",
        metavar="WIDTHxHEIGHT",
        type=_maze_size,
        help="generate a random perfect maze, e.g. --maze 21x31",
    )
    source.add_argument(
        "--builtin",
        metavar="NAME",
        choices=sorted(_BUILTIN_MAPS),
        help="use a built-in map: %s" % ", ".join(sorted(_BUILTIN_MAPS)),
    )
    parser.add_argument(
        "--seed",
        metavar="N",
        type=int,
        default=None,
        help="RNG seed for --maze (reproducible mazes)",
    )
    parser.add_argument(
        "--width",
        metavar="N",
        type=_positive_int("width", 4, 400),
        default=None,
        help="render width in columns (default: terminal width, or 80)",
    )
    parser.add_argument(
        "--height",
        metavar="N",
        type=_positive_int("height", 4, 200),
        default=None,
        help="render height in rows (default: terminal height, or 24)",
    )
    parser.add_argument(
        "--fps",
        metavar="N",
        type=_positive_float("fps"),
        default=DEFAULT_FPS,
        help="frame rate target for the interactive loop (default: %g)" % DEFAULT_FPS,
    )
    parser.add_argument(
        "--fov",
        metavar="DEG",
        type=_positive_float("fov"),
        default=DEFAULT_FOV,
        help="horizontal field of view in degrees (default: %g)" % DEFAULT_FOV,
    )
    parser.add_argument(
        "--max-dist",
        metavar="N",
        type=_positive_float("max-dist"),
        default=DEFAULT_MAX_DIST,
        help="render distance in grid cells (default: %g)" % DEFAULT_MAX_DIST,
    )
    parser.add_argument(
        "--frames",
        metavar="N",
        type=_positive_int("frames", 1, 1000),
        default=None,
        help="render N frames and exit (non-interactive dump)",
    )
    parser.add_argument(
        "--fill",
        choices=("none", "ceiling", "floor", "both"),
        default="both",
        help="fill ceiling/floor rows (default: both)",
    )
    parser.add_argument(
        "--minimap",
        action="store_true",
        help="overlay a 2D minimap in the bottom-left corner",
    )
    parser.add_argument(
        "--no-textures",
        action="store_false",
        dest="textures",
        help="use the same shading ramp for every wall (disable per-tile textures)",
    )
    parser.add_argument(
        "--autopilot",
        action="store_true",
        help="rotate the camera automatically (no keyboard input needed)",
    )
    parser.add_argument(
        "--version",
        action="version",
        version="%(prog)s " + __version__,
    )
    parser.set_defaults(textures=True)
    return parser


def _resolve_source(args: argparse.Namespace) -> Tuple[Map, Tuple[int, int, str]]:
    if args.map:
        return load_map_file(args.map)
    if args.maze:
        width, height = args.maze
        return generate_maze(width, height, args.seed)
    return parse_map(_BUILTIN_MAPS[args.builtin or "demo"], name=args.builtin or "demo")


def _render_size(args: argparse.Namespace) -> Tuple[int, int]:
    width = args.width
    height = args.height
    if width is None or height is None:
        try:
            cols, rows = shutil.get_terminal_size()
        except OSError:
            cols, rows = 80, 24
        if width is None:
            width = max(4, cols)
        if height is None:
            height = max(4, rows - 1)
    return int(width), int(height)


class _KeyReader:
    """Incremental parser for raw-mode terminal input.

    Handles single characters plus escape sequences for the arrow keys, so a
    multi-byte sequence split across reads never corrupts the stream.
    """

    ARROWS = {"A": "up", "B": "down", "C": "right", "D": "left"}

    def __init__(self, fd: int) -> None:
        self.fd = fd
        self._buf = bytearray()

    def poll(self) -> List[Tuple[str, str]]:
        """Read any pending input and return a list of (kind, value) tuples."""
        if _TERMIOS_AVAILABLE:
            ready, _, _ = select.select([self.fd], [], [], 0.0)
            if ready:
                try:
                    self._buf += os.read(self.fd, 256)
                except OSError:
                    pass
        events: List[Tuple[str, str]] = []
        while self._buf:
            if self._buf[0] == 27:  # ESC
                if len(self._buf) == 1:
                    # A lone ESC: peek briefly for a following byte (arrow keys
                    # arrive as ESC [ X). If nothing arrives, it's ESC alone.
                    if self._await_more_bytes():
                        break
                    events.append(("char", "esc"))
                    del self._buf[:1]
                    continue
                if self._buf[1] == ord("["):
                    if len(self._buf) < 3:
                        break
                    code = chr(self._buf[2])
                    arrow = self.ARROWS.get(code, "")
                    events.append(("arrow", arrow) if arrow else ("char", "esc"))
                    del self._buf[:3]
                else:
                    events.append(("char", "esc"))
                    del self._buf[:1]
            elif self._buf[0] == 3:  # Ctrl-C
                events.append(("char", "ctrl-c"))
                del self._buf[:1]
            elif 32 <= self._buf[0] < 127:
                events.append(("char", chr(self._buf[0])))
                del self._buf[:1]
            else:
                del self._buf[:1]  # ignore other control bytes
        return events

    def _await_more_bytes(self) -> bool:
        """Wait very briefly for more input after a lone ESC.

        Returns True when more bytes are available (an arrow key is on its
        way), False when the ESC stands alone.
        """
        if not _TERMIOS_AVAILABLE:
            return False
        ready, _, _ = select.select([self.fd], [], [], 0.02)
        if not ready:
            return False
        try:
            self._buf += os.read(self.fd, 256)
        except OSError:
            pass
        return bool(self._buf)


def _action_of(kind: str, value: str) -> Optional[str]:
    if kind == "arrow":
        return {"up": "forward", "down": "back", "right": "turn-right", "left": "turn-left"}.get(value)
    if kind != "char":
        return None
    return {
        "w": "forward",
        "s": "back",
        "a": "left",
        "d": "right",
        "q": "turn-left",
        "e": "turn-right",
        "m": "toggle-minimap",
        "f": "toggle-fill",
        "t": "toggle-textures",
        "esc": "quit",
        "ctrl-c": "quit",
    }.get(value.lower())


def _draw(stdout, frame: List[str], status: str) -> None:
    lines = [_CLEAR, _HIDE_CURSOR]
    lines.extend(frame)
    lines.append(status)
    stdout.write("\n".join(lines) + "\n" + _SHOW_CURSOR)
    stdout.flush()


def run_interactive(
    map_: Map,
    player: Player,
    args: argparse.Namespace,
    width: int,
    height: int,
) -> int:
    """Real-time first-person loop with raw-mode keyboard input."""
    if not _TERMIOS_AVAILABLE:  # pragma: no cover - non-POSIX platforms
        sys.stderr.write("shaftcast: interactive mode needs a POSIX terminal; using autopilot\n")
        return run_autopilot(map_, player, args, width, height)
    fd = sys.stdin.fileno()
    old_attrs = termios.tcgetattr(fd)
    reader = _KeyReader(fd)
    minimap = args.minimap
    fill = args.fill
    textures = args.textures
    held: Dict[str, float] = {}
    frame_time = 1.0 / args.fps
    try:
        tty.setraw(fd)
        previous = time.monotonic()
        while True:
            now = time.monotonic()
            dt = min(now - previous, MAX_DT)
            previous = now

            for kind, value in reader.poll():
                action = _action_of(kind, value)
                if action is None:
                    continue
                if action == "quit":
                    return 0
                if action == "toggle-minimap":
                    minimap = not minimap
                    continue
                if action == "toggle-fill":
                    fill = "none" if fill == "both" else "both"
                    continue
                if action == "toggle-textures":
                    textures = not textures
                    continue
                held[action] = now

            move = MOVE_SPEED * dt
            turn = TURN_SPEED * dt
            for action, seen in list(held.items()):
                if now - seen > HELD_TIMEOUT:
                    del held[action]
                    continue
                if action == "forward":
                    player.move(map_, player.dir_x * move, player.dir_y * move)
                elif action == "back":
                    player.move(map_, -player.dir_x * move, -player.dir_y * move)
                elif action == "left":
                    player.move(map_, -player.dir_y * move, player.dir_x * move)
                elif action == "right":
                    player.move(map_, player.dir_y * move, -player.dir_x * move)
                elif action == "turn-left":
                    player.rotate(-turn)
                elif action == "turn-right":
                    player.rotate(turn)

            frame = render_frame(
                map_, player, width, height,
                fill=fill, minimap=minimap, textures=textures, max_dist=args.max_dist,
            )
            status = (
                "Shaftcast %s | map %s %dx%d | pos (%.2f, %.2f) %s | "
                "WASD move \xb7 Q/E or \u2190\u2192 turn \xb7 M minimap \xb7 F fill "
                "\xb7 ESC quit"
                % (
                    __version__,
                    map_.name,
                    map_.width,
                    map_.height,
                    player.x,
                    player.y,
                    player.facing_name(),
                )
            )
            _draw(sys.stdout, frame, status)
            elapsed = time.monotonic() - now
            if elapsed < frame_time:
                time.sleep(frame_time - elapsed)
    except KeyboardInterrupt:
        return 0
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old_attrs)
        sys.stdout.write(_SHOW_CURSOR)
        sys.stdout.flush()


def run_autopilot(
    map_: Map,
    player: Player,
    args: argparse.Namespace,
    width: int,
    height: int,
) -> int:
    """Animated loop that turns the camera on its own (no input needed)."""
    frame_time = 1.0 / args.fps
    try:
        previous = time.monotonic()
        while True:
            now = time.monotonic()
            dt = min(now - previous, MAX_DT)
            previous = now
            player.rotate(AUTOPILOT_SPEED * dt)
            frame = render_frame(
                map_, player, width, height,
                fill=args.fill, minimap=args.minimap, textures=args.textures,
                max_dist=args.max_dist,
            )
            status = (
                "Shaftcast %s | map %s %dx%d | autopilot (Ctrl-C to stop)"
                % (__version__, map_.name, map_.width, map_.height)
            )
            _draw(sys.stdout, frame, status)
            elapsed = time.monotonic() - now
            if elapsed < frame_time:
                time.sleep(frame_time - elapsed)
    except KeyboardInterrupt:
        return 0


def dump_frames(
    map_: Map,
    player: Player,
    args: argparse.Namespace,
    width: int,
    height: int,
) -> int:
    """Render ``--frames`` frames to stdout, one header + grid per frame."""
    for index in range(args.frames):
        frame = render_frame(
            map_, player, width, height,
            fill=args.fill, minimap=args.minimap, textures=args.textures,
            max_dist=args.max_dist,
        )
        print(
            "Shaftcast %s | frame %d/%d | %dx%d | map %s %dx%d | player (%.2f, %.2f) %s"
            % (
                __version__,
                index + 1,
                args.frames,
                width,
                height,
                map_.name,
                map_.width,
                map_.height,
                player.x,
                player.y,
                player.facing_name(),
            )
        )
        for line in frame:
            print(line)
        print()
    return 0


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = _arg_parser()
    args = parser.parse_args(argv)
    try:
        map_, spawn = _resolve_source(args)
    except MapError as exc:
        sys.stderr.write("shaftcast: %s\n" % exc)
        return 2
    x, y, marker = spawn
    dir_x, dir_y = _PLAYER_DIRS[marker]
    player = Player(x, y, dir_x, dir_y, fov_degrees=args.fov)
    width, height = _render_size(args)

    if args.frames is not None:
        return dump_frames(map_, player, args, width, height)
    interactive = (
        not args.autopilot
        and _TERMIOS_AVAILABLE
        and sys.stdin.isatty()
        and sys.stdout.isatty()
    )
    if interactive:
        return run_interactive(map_, player, args, width, height)
    if sys.stdout.isatty():
        return run_autopilot(map_, player, args, width, height)
    # Fully piped: render a single frame so the command produces output.
    args.frames = 1
    return dump_frames(map_, player, args, width, height)


if __name__ == "__main__":
    raise SystemExit(main())
