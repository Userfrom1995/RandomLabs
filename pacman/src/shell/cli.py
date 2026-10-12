"""Command line: honest flags only (every flag maps to working logic).

Phase scope: headless verification and maze validation. Interactive play,
audio, menus, and replays land in their own phases; no flag anticipates
them.
"""

import argparse
import sys

from engine.actors import DIRS, tile_of
from engine.game import Game
from engine.maze import Maze, WIDTH, HEIGHT, TUNNEL_ROW, PLAYER_START_TILE
from engine.replay import run_recording
from render.detect import KNOWN, detect_renderer


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
    print("renderer: %s" % name)
    print("seed: %d level: %d ticks: %d" % (args.seed, game.level, game.tick_count))
    print("score: %d lives: %d dots-eaten: %d energizers: %d" % (game.score, game.lives, dots, zaps))
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
        if args.self_check:
            return cmd_self_check(args)
        build_parser().print_help()
        return 0
    except ValueError as exc:
        print("error: %s" % exc)
        return 2
