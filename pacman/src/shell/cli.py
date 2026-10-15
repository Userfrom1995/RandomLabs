"""Command line: honest flags only (every flag maps to working logic).

Headless verification, maze validation, the ghost-AI simulation report,
renderer verification/benchmarks, and the interactive play shell with
audio selection and key remapping.
"""

import argparse
import os
import sys
import time

from engine import tuning
from engine import modes as game_modes
from engine.actors import DIRS, tile_of
from engine.game import Game
from engine.maze import Maze, WIDTH, HEIGHT, TUNNEL_ROW, PLAYER_START_TILE
from engine.replay import run_recording
from render import themes as game_themes
from render.detect import KNOWN, detect_renderer
from render.manager import TieredRenderer
from render.scene import COLS, ROWS, paint, sprite_ids_in
from shell.config import Config
from shell.scores import ScoreTable


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


def autopilot_inputs(seed, ticks, level=1, replan_every=4, mode="classic"):
    """Generate a deterministic input log from a greedy BFS autopilot."""
    game = Game(seed=seed, level=level, mode=mode)
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


def resolve_settings(args):
    """Merge CLI flags over the config file. Returns (settings, config)."""
    from shell.input import Keymap, parse_binds
    config = Config(path=args.config_file)
    file_binds = dict(config.values["binds"])
    try:
        cli_binds = parse_binds(args.bind)
    except ValueError as exc:
        raise ValueError(str(exc))
    file_binds.update(cli_binds)
    try:
        keymap = Keymap(file_binds)
    except ValueError as exc:
        raise ValueError(str(exc))
    settings = {
        "keymap": keymap,
        "binds": file_binds,
        "audio": args.audio or config.values["audio"],
        "fps": args.fps if args.fps is not None else config.values["fps"],
        "mode": args.mode or config.values["mode"],
        "theme": args.theme or config.values["theme"],
        "reduced_flash": (config.values["reduced_flash"] if args.reduced_flash is None
                          else args.reduced_flash),
        "name": args.name or config.values["name"],
        "scores_file": args.scores_file,
        "scale": (config.values.get("scale", "auto") if args.scale is None
                  else args.scale),
        "effects": (config.values.get("effects", True) if args.effects is None
                    else args.effects),
    }
    game_modes.check(settings["mode"])
    game_themes.check(settings["theme"])
    from render import scale as scale_mod
    scale_mod.check(settings["scale"])
    return settings, config


def cmd_self_check(args):
    settings, _config = resolve_settings(args)
    name = detect_renderer(args.renderer, env=dict(os.environ))
    ticks = args.ticks
    inputs = autopilot_inputs(args.seed, ticks, level=args.level, mode=settings["mode"])
    digest, events, game = run_recording(args.seed, inputs, ticks,
                                         level=args.level, mode=settings["mode"])
    dots = sum(1 for e in events if e == "dot")
    zaps = sum(1 for e in events if e == "energizer")
    eaten = sum(1 for e in events if e.startswith("ghost-eaten"))
    deaths = sum(1 for e in events if e == "death")
    fruits = [e for e in events if e.startswith("fruit:")]
    fruit_points = sum(int(e.split(":")[1]) for e in fruits)
    print("renderer: %s" % name)
    print("mode: %s theme: %s" % (settings["mode"], settings["theme"]))
    print("seed: %d level: %d ticks: %d" % (args.seed, game.level, game.tick_count))
    print("score: %d lives: %d dots-eaten: %d energizers: %d" % (game.score, game.lives, dots, zaps))
    print("ghosts-eaten: %d deaths: %d fright: %s mode: %s" % (
        eaten, deaths, "active" if game.fright_active else "off", game.ghosts.wave_mode()))
    print("fruit-eaten: %d fruit-points: %d over: %s" % (
        len(fruits), fruit_points, game.over_reason or "-"))
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
    renderer = TieredRenderer(preference=args.renderer, env=dict(os.environ))
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
        if getattr(backend, "min_interval", None):
            backend.min_interval = 0.0  # bench raster cost, not the fps throttle
        game = Game(seed=args.seed, level=args.level)
        backend.init(COLS, ROWS)
        full_bytes, steady_bytes = 0, 0
        start = time.perf_counter()
        for n in range(frames):
            game.step(tuning.STEP)
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


def cmd_verify(args):
    from shell import verify as verify_mod
    total = 0
    failed = 0
    for section, rows in verify_mod.full_matrix(seed=args.seed):
        print("== %s ==" % section)
        for row in rows:
            total += 1
            if not row["passed"]:
                failed += 1
            print("%s %s - %s" % ("PASS" if row["passed"] else "FAIL",
                                  row["name"], row["detail"]))
    print("verify: %d/%d passed" % (total - failed, total))
    return 0 if failed == 0 else 1


def cmd_input_bench(_args):
    from shell import verify as verify_mod
    bench = verify_mod.input_bench()
    print("decoded-keys: %d" % bench["keys_decoded"])
    print("decode: %.0f keys/s (%.0f ns/key)" % (
        bench["decode_keys_per_s"], bench["decode_ns_per_key"]))
    print("sim-tick: %.1f us/tick (%d ticks, %.0f ticks/s)" % (
        bench["sim_us_per_tick"], bench["sim_ticks"], bench["sim_ticks_per_s"]))
    print("input-bench OK")
    return 0


def cmd_layout_check(args):
    """Report the responsive canvas layout for a terminal size."""
    from render import layout as layout_mod
    from render import scale as scale_mod
    from shell.app import canvas_layout
    import shutil
    spec = (args.layout_check or "").strip()
    if spec:
        try:
            cols_s, rows_s = spec.lower().split("x")
            size = (int(cols_s), int(rows_s))
        except ValueError:
            print("error: --layout-check wants COLSxROWS (e.g. 120x40)")
            return 2
        sizes = [size]
    else:
        try:
            sh = shutil.get_terminal_size()
            live = (int(sh.columns), int(sh.lines))
        except Exception:
            live = (80, 24)
        sizes = [live, (28, 34), (80, 24), (80, 50), (120, 40), (160, 60)]
    for cols, rows in sizes:
        picked = scale_mod.choose(cols, rows, getattr(args, "scale", None) or "auto")
        print(scale_mod.describe(picked))
        print(layout_mod.describe(canvas_layout(cols, rows, picked.mode)))
        print("")
    print("layout OK")
    return 0


def cmd_scoreboard(args):
    import platform
    from shell import verify as verify_mod
    try:
        import PIL  # noqa: F401
        pillow = "present (%s)" % getattr(PIL, "__version__", "?")
    except ImportError:
        pillow = "missing (image backends degrade to unicode)"
    print("pacman perf scoreboard")
    print("machine: %s %s / python %s / pillow %s" % (
        platform.system(), platform.machine(), platform.python_version(), pillow))
    render = verify_mod.render_bench(frames=max(args.frames, 1), seed=args.seed)
    print("backend fps(full-scene present, headless) full-bytes")
    for name in ("kitty", "sixel", "unicode"):
        info = render[name]
        if not info["available"]:
            print("%-7s unavailable (needs Pillow)" % name)
        else:
            print("%-7s %7.1f %10d" % (name, info["fps"], info["full_bytes"]))
    bench = verify_mod.input_bench()
    print("input-decode: %.0f keys/s (%.0f ns/key)" % (
        bench["decode_keys_per_s"], bench["decode_ns_per_key"]))
    print("sim-step: %.1f us/tick (%.0f ticks/s, 120 Hz needs <8333 us)" % (
        bench["sim_us_per_tick"], bench["sim_ticks_per_s"]))
    canvas = verify_mod.canvas_bench(frames=max(args.frames, 1), seed=args.seed)
    print("canvas-compose: %.0f fps (%dx%d frame, %dx%d maze, effects on)" % (
        canvas["fps"], canvas["frame"][0], canvas["frame"][1],
        canvas["maze"][0], canvas["maze"][1]))
    print("parity: one 28x34 scene painter plus the fullscreen composer feeds every backend; run --verify")
    print("scoreboard OK")
    return 0


def cmd_keys(args):
    from shell.input import Keymap, parse_binds
    try:
        keymap = Keymap(parse_binds(args.bind))
    except ValueError as exc:
        print("error: %s" % exc)
        return 2
    print(keymap.describe())
    return 0


def cmd_save_config(args):
    """Persist the effective CLI-over-config settings and report the path."""
    try:
        settings, config = resolve_settings(args)
    except ValueError as exc:
        print("error: %s" % exc)
        return 2
    config.update({"binds": settings["binds"], "audio": settings["audio"],
                   "fps": settings["fps"], "mode": settings["mode"],
                   "theme": settings["theme"],
                   "reduced_flash": settings["reduced_flash"],
                   "name": settings["name"], "scale": settings["scale"],
                   "effects": settings["effects"]})
    if not config.save():
        print("error: could not write %s" % config.path)
        return 1
    print("saved config to %s" % config.path)
    return 0


def cmd_play(args):
    from shell.app import ShellState, run
    from shell.audio import select_audio
    from shell.terminal import RawTerminal, TerminalError
    if not sys.stdin.isatty():
        print("error: --play needs an interactive terminal (stdin is not a tty)")
        return 2
    try:
        settings, config = resolve_settings(args)
    except ValueError as exc:
        print("error: %s" % exc)
        return 2
    if args.save_config:
        code = cmd_save_config(args)
        if code != 0:
            return code
    try:
        audio = select_audio(settings["audio"])
    except ValueError as exc:
        print("error: %s" % exc)
        return 2
    scores = ScoreTable(path=settings["scores_file"])
    app = ShellState(seed=args.seed, level=args.level, keymap=settings["keymap"],
                     audio=audio, mode=settings["mode"], theme=settings["theme"],
                     reduced_flash=settings["reduced_flash"], scores=scores,
                     player_name=settings["name"],
                     scale_mode=settings["scale"],
                     effects=settings["effects"], config=config)
    renderer = TieredRenderer(preference=args.renderer, env=dict(os.environ))
    chunks = []

    def write_out(text):
        if text:
            chunks.append(text)
            try:
                sys.stdout.write(text)
                sys.stdout.flush()
            except BrokenPipeError:
                app.exited = True

    try:
        with RawTerminal() as term:
            run(app, term, renderer, write_out, fps=settings["fps"])
    except TerminalError as exc:
        print("error: %s" % exc)
        return 2
    except BrokenPipeError:
        pass
    stats = renderer.stats()
    print("played %s on %s (audio: %s)" % (app.mode, stats["backend"], audio.stats()["backend"]))
    if app.game is not None:
        print("final score: %d level: %d" % (app.game.score, app.game.level))
    return 0


def cmd_scores(args):
    table = ScoreTable(path=args.scores_file)
    for line in table.format():
        print(line)
    return 0


def cmd_themes(_args):
    from render import themes
    print(themes.describe())
    return 0


def cmd_modes(_args):
    for mode in game_modes.MODES:
        print(game_modes.describe(mode))
    return 0


def cmd_levels(args):
    count = max(int(args.levels), 1)
    print("lvl speed fright-s fruit house-counters")
    for level in range(1, count + 1):
        row = tuning.level_summary(level)
        print("%3d %5.2f %7.1f %5d %s" % (
            row["level"], row["player_speed"], row["fright_s"],
            row["fruit"], "/".join(str(c) for c in row["house"])))
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
    ap.add_argument("--verify", action="store_true",
                    help="run the full gameplay/size/capability/parity matrix")
    ap.add_argument("--input-bench", action="store_true",
                    help="benchmark input decoding and simulation step cost")
    ap.add_argument("--scoreboard", action="store_true",
                    help="print the published perf scoreboard (renderers + input)")
    ap.add_argument("--layout-check", nargs="?", const="", metavar="COLSxROWS",
                    help="report the responsive canvas layout (default: live size plus samples)")
    ap.add_argument("--frames", type=int, default=60,
                    help="frames per backend for --render-bench")
    ap.add_argument("--play", action="store_true",
                    help="start the interactive terminal game (needs a tty)")
    ap.add_argument("--audio", default=None,
                    choices=("auto", "null", "bell", "synth"),
                    help="sound backend for --play (default from config file)")
    ap.add_argument("--mode", default=None, choices=list(game_modes.MODES),
                    help="ruleset for --play and --self-check (default from config)")
    ap.add_argument("--theme", default=None, choices=list(game_themes.THEMES),
                    help="palette for --play (default from config)")
    ap.add_argument("--scale", default=None,
                    choices=("auto", "classic", "wide", "full"),
                    help="maze magnification for --play (default from config)")
    ap.add_argument("--effects", dest="effects", action="store_true",
                    default=None, help="animated mouth, pulse, sparkles (default on)")
    ap.add_argument("--no-effects", dest="effects", action="store_false",
                    help="steady legacy sprites (overrides config)")
    ap.add_argument("--reduced-flash", dest="reduced_flash", action="store_true",
                    default=None, help="steady energizers and fright (no blinking)")
    ap.add_argument("--no-reduced-flash", dest="reduced_flash", action="store_false",
                    help="restore blinking (overrides config)")
    ap.add_argument("--name", default=None,
                    help="pilot name for high scores (default from config)")
    ap.add_argument("--scores", action="store_true",
                    help="print the high-score table and exit")
    ap.add_argument("--scores-file", default=None,
                    help="high-score file (default XDG data dir)")
    ap.add_argument("--config-file", default=None,
                    help="config file (default XDG config dir)")
    ap.add_argument("--save-config", action="store_true",
                    help="persist the effective settings to the config file")
    ap.add_argument("--themes", action="store_true",
                    help="list the visual themes and exit")
    ap.add_argument("--modes", action="store_true",
                    help="list the game modes and exit")
    ap.add_argument("--levels", type=int, default=0, metavar="N",
                    help="print the difficulty ramp for levels 1..N and exit")
    ap.add_argument("--bind", action="append", default=[],
                    help="remap a key: action=char (repeatable, e.g. --bind up=k; needs an action flag such as --play, --keys, or --save-config)")
    ap.add_argument("--keys", action="store_true",
                    help="print the active key bindings and exit")
    ap.add_argument("--fps", type=int, default=None,
                    help="frame pacing for --play, 1..240 (default from config)")
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
        if args.fps is not None and not 1 <= args.fps <= 240:
            print("error: --fps must be 1..240")
            return 2
        if args.keys:
            return cmd_keys(args)
        if args.save_config and not args.play:
            return cmd_save_config(args)
        if args.scores:
            return cmd_scores(args)
        if args.themes:
            return cmd_themes(args)
        if args.modes:
            return cmd_modes(args)
        if args.levels:
            if args.levels < 1:
                print("error: --levels must be >= 1")
                return 2
            return cmd_levels(args)
        if args.play:
            return cmd_play(args)
        if args.maze_check:
            return cmd_maze_check(args)
        if args.render_check:
            return cmd_render_check(args)
        if args.render_bench:
            if args.frames < 1:
                print("error: --frames must be >= 1")
                return 2
            return cmd_render_bench(args)
        if args.verify:
            return cmd_verify(args)
        if args.input_bench:
            return cmd_input_bench(args)
        if args.scoreboard:
            if args.frames < 1:
                print("error: --frames must be >= 1")
                return 2
            return cmd_scoreboard(args)
        if args.layout_check is not None:
            return cmd_layout_check(args)
        if args.self_check:
            return cmd_self_check(args)
        if args.bind:
            print("warning: --bind needs an action flag "
                  "(e.g. --play, --keys, or --save-config); showing help")
        build_parser().print_help()
        return 0
    except ValueError as exc:
        print("error: %s" % exc)
        return 2
