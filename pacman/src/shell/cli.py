"""Command line: honest flags only (every flag maps to working logic).

Headless verification, maze validation, the ghost-AI simulation report, and
renderer verification/benchmarks. Interactive play, audio, and menus land in
their own phases; no flag anticipates them.
"""

import argparse
import sys
import time

from engine import tuning
from engine.actors import DIRS, tile_of
from engine.game import Game
from engine.maze import Maze, WIDTH, HEIGHT, TUNNEL_ROW, PLAYER_START_TILE
from engine.replay import run_recording
from render.detect import KNOWN, detect_renderer
from render.manager import TieredRenderer
from render.scene import COLS, ROWS, paint, sprite_ids_in


def bfs_first_step(maze, start):
    """First step toward the nearest remaining pickup. Returns a direction."""
    from collections import deque
    seen = {start}
    queue = deque()
    for d in DIRS:
        nxt = (start[0] + d[0], start[1] + d[1])
        nx, ny = nxt
        if nx < 0 or nx >= WIDTH:
            if start[1] != TUNNEL_ROW:
                continue
            nx = WIDTH - 1 if nx < 0 else 0
            nxt = (nx, ny)
        if nxt in seen:
            continue
        if not maze.is_walkable(*nxt):
            continue
        seen.add(nxt)
        queue.append((nxt, d))
    while queue:
        (x, y), first = queue.popleft()
        i = y * WIDTH + x
        if maze.dots[i] or maze.energizers[i]:
            return first
        for d in DIRS:
            nxt = (x + d[0], y + d[1])
            nx, ny = nxt
            if nx < 0 or nx >= WIDTH:
                if y != TUNNEL_ROW:
                    continue
                nx = WIDTH - 1 if nx < 0 else 0
                nxt = (nx, ny)
            if nxt in seen:
                continue
            if not maze.is_walkable(*nxt):
                continue
            seen.add(nxt)
            queue.append((nxt, first))
    for d in DIRS:  # no pickup reachable: keep moving where possible
        nxt = (start[0] + d[0], start[1] + d[1])
        if maze.is_walkable(*nxt):
            return d
    return DIRS[0]


def autopilot_inputs(seed, ticks, level=1, replan_every=4):
    """Generate a deterministic input log from a greedy BFS autopilot."""
    game = Game(seed=seed, level=level)
    inputs = []
    want = None
    from engine import tuning
    for tick in range(int(ticks)):
        if tick % replan_every == 0:
            want = bfs_first_step(game.maze, tile_of(game.player.x, game.player.y))
            inputs.append((tick, want))
        game.set_want(want)
        game.step(tuning.STEP)
        if not game.running:
            break
    return inputs


def cmd_self_check(args):
    name = detect_renderer(args.renderer)
    ticks = args.ticks
    inputs = autopilot_inputs(args.seed, ticks, level=args.level)
    digest, events, game = run_recording(args.seed, inputs, ticks, level=args.level)
    dots = sum(1 for e in events if e == "dot")
    zaps = sum(1 for e in events if e == "energizer")
    eaten = sum(1 for e in events if e.startswith("ghost-eaten"))
    deaths = sum(1 for e in events if e == "death")
    print("renderer: %s" % name)
    print("seed: %d level: %d ticks: %d" % (args.seed, game.level, game.tick_count))
    print("score: %d lives: %d dots-eaten: %d energizers: %d" % (game.score, game.lives, dots, zaps))
    print("ghosts-eaten: %d deaths: %d fright: %s mode: %s" % (
        eaten, deaths, "active" if game.fright_active else "off", game.ghosts.wave_mode()))
    print("state: %s dots-left: %d" % (game.state, game.dots_left))
    print("hash: %s" % digest)
    return 0


def cmd_maze_check(_args):
    maze = Maze()
    errors = []
    if (WIDTH, HEIGHT) != (28, 31):
        errors.append("dimensions are %dx%d, want 28x31" % (WIDTH, HEIGHT))
    if maze.total_energizers != 4:
        errors.append("energizers: %d, want 4" % maze.total_energizers)
    if maze.total_dots < 200:
        errors.append("dots: %d, want >= 200" % maze.total_dots)
    reached = maze.reachable_dots_from(PLAYER_START_TILE)
    want = maze.total_dots + maze.total_energizers
    if reached != want:
        errors.append("reachable pickups %d != placed %d" % (reached, want))
    for edge, expect in ((0, True), (WIDTH - 1, True)):
        if not maze.is_walkable(edge, TUNNEL_ROW):
            errors.append("tunnel mouth (%d, %d) not walkable" % (edge, TUNNEL_ROW))
    if maze.is_walkable(*PLAYER_START_TILE) is not True:
        errors.append("player start not walkable")
    print("dots: %d energizers: %d reachable: %d/%d" % (
        maze.total_dots, maze.total_energizers, reached, want))
    if errors:
        for e in errors:
            print("FAIL: %s" % e)
        return 1
    print("maze OK")
    return 0


def cmd_render_check(args):
    game = Game(seed=args.seed, level=args.level)
    for _ in range(args.ticks):
        game.step(tuning.STEP)
        if not game.running:
            break
    fb = paint(game)
    sprites = sprite_ids_in(fb)
    renderer = TieredRenderer(preference=args.renderer)
    init_seq = renderer.init(COLS, ROWS)
    frame = renderer.present(fb, fb.dirty_cells())
    fb2 = paint(game)
    steady = renderer.present(fb2, fb2.dirty_cells())
    stats = renderer.stats()
    print("renderer: %s (choice: %s)" % (stats["backend"], stats["choice"]))
    print("frame: %dx%d sprites: %d (%s)" % (COLS, ROWS, len(sprites), ",".join(sprites)))
    print("init-bytes: %d full-frame-bytes: %d steady-frame-bytes: %d" % (
        len(init_seq), len(frame), len(steady)))
    if stats["degraded_from"]:
        print("degraded: %s" % "->".join(stats["degraded_from"] + [stats["backend"]]))
    for key in ("coalesced", "bytes_out"):
        if key in stats:
            print("%s: %s" % (key, stats[key]))
    print("render OK")
    return 0


def cmd_render_bench(args):
    from render.manager import make_backend
    frames = max(args.frames, 1)
    print("backend fps full-KB steady-B")
    for name in KNOWN:
        backend = make_backend(name)
        if name != "unicode" and not backend.available():
            print("%-7s unavailable (needs Pillow)" % name)
            continue
        game = Game(seed=args.seed, level=args.level)
        backend.init(COLS, ROWS)
        full_bytes, steady_bytes = 0, 0
        start = time.perf_counter()
        for n in range(frames):
            game.step(1.0 / 120.0)
            fb = paint(game)
            out = backend.present(fb, fb.dirty_cells())
            if n == 0:
                full_bytes = len(out)
            steady_bytes += len(out)
        elapsed = max(time.perf_counter() - start, 1e-9)
        print("%-7s %7.1f %7d %7d" % (
            name, frames / elapsed, full_bytes, steady_bytes // frames))
    print("bench OK")
    return 0


def build_parser():
    ap = argparse.ArgumentParser(prog="pacman", description="Pac-Man terminal arcade (headless engine)")
    ap.add_argument("--renderer", default=None,
                    help="renderer backend (%s); default auto-detect" % "/".join(KNOWN))
    ap.add_argument("--seed", type=int, default=1, help="master RNG seed")
    ap.add_argument("--level", type=int, default=1, help="starting level (>= 1)")
    ap.add_argument("--ticks", type=int, default=1200, help="self-check simulation length in ticks")
    ap.add_argument("--self-check", action="store_true",
                    help="run the headless autopilot and print the state hash")
    ap.add_argument("--maze-check", action="store_true",
                    help="validate maze dimensions, counts, and connectivity")
    ap.add_argument("--render-check", action="store_true",
                    help="paint one scene and present it through the tiered renderer")
    ap.add_argument("--render-bench", action="store_true",
                    help="benchmark present() throughput per available backend")
    ap.add_argument("--frames", type=int, default=60,
                    help="frames per backend for --render-bench")
    return ap


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        if args.renderer is not None:
            detect_renderer(args.renderer)  # fail fast on unknown names
        if args.level < 1:
            print("error: --level must be >= 1")
            return 2
        if args.ticks < 1:
            print("error: --ticks must be >= 1")
            return 2
        if args.maze_check:
            return cmd_maze_check(args)
        if args.render_check:
            return cmd_render_check(args)
        if args.render_bench:
            if args.frames < 1:
                print("error: --frames must be >= 1")
                return 2
            return cmd_render_bench(args)
        if args.self_check:
            return cmd_self_check(args)
        build_parser().print_help()
        return 0
    except ValueError as exc:
        print("error: %s" % exc)
        return 2
