"""Desktop Pet command line (stdlib only, never blocks on input()).

Usage:
  python -m pet run [--ticks N] [--seed S] [--name NAME] [--realtime]
  python -m pet gui [--scale F] [--alpha A] [--no-topmost] [--name NAME]
  python -m pet selftest
  python -m pet help
  python -m pet version
"""

from __future__ import annotations

import argparse
import sys
import time

from . import __version__
from .pet_core import Personality, PetState, default_save_path, load, save
from .pet_core.brain import TICK_HZ, Brain


def cmd_version() -> int:
    print("desktop-pet %s" % __version__)
    return 0


def cmd_help() -> int:
    print(__doc__.strip())
    print("")
    print("The `gui` command opens the on-screen companion window: a")
    print("borderless always-on-top pet with drag-carry, speech bubble,")
    print("and right-click menu. `run` drives the same behavior brain")
    print("headlessly in your terminal, and `selftest` verifies state,")
    print("needs, dialogue, persistence, sprite poses, and brain.")
    return 0


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m pet",
        description="Desktop Pet companion: behavior brain plus on-screen window.",
    )
    sub = parser.add_subparsers(dest="command")
    run_p = sub.add_parser("run", help="run the behavior brain headlessly")
    run_p.add_argument("--ticks", type=int, default=200,
                       help="brain ticks to simulate (10 per second of pet time)")
    run_p.add_argument("--seed", type=int, default=None,
                       help="RNG seed for a deterministic run")
    run_p.add_argument("--name", type=str, default=None,
                       help="rename the pet for this run")
    run_p.add_argument("--save", type=str, default=None,
                       help="save file path (default: platform user-data dir)")
    run_p.add_argument("--no-save", action="store_true",
                       help="do not write the save file at the end")
    run_p.add_argument("--realtime", action="store_true",
                       help="sleep 0.1 s per tick like the live window does")
    run_p.add_argument("--dt", type=float, default=0.1,
                       help="simulated seconds per tick")
    sub.add_parser("selftest", help="run the headless verification suite")
    gui_p = sub.add_parser("gui", help="open the on-screen companion window")
    gui_p.add_argument("--scale", type=float, default=1.0,
                       help="window scale factor 0.5..3.0 (DPI-aware)")
    gui_p.add_argument("--alpha", type=float, default=1.0,
                       help="window opacity 0.3..1.0")
    gui_p.add_argument("--no-topmost", action="store_true",
                       help="do not keep the window always on top")
    gui_p.add_argument("--name", type=str, default=None,
                       help="rename the pet for this run")
    gui_p.add_argument("--save", type=str, default=None,
                       help="save file path (default: platform user-data dir)")
    gui_p.add_argument("--no-save", action="store_true",
                       help="do not write the save file (window still loads it)")
    gui_p.add_argument("--seed", type=int, default=None,
                       help="RNG seed for a deterministic run")
    sub.add_parser("help", help="print usage")
    sub.add_parser("version", help="print version")
    return parser


def cmd_run(args: argparse.Namespace) -> int:
    if args.ticks is None or args.ticks <= 0:
        print("error: --ticks must be a positive integer", file=sys.stderr)
        return 2
    if args.ticks > 100000:
        print("error: --ticks capped at 100000", file=sys.stderr)
        return 2
    try:
        dt = float(args.dt)
    except (TypeError, ValueError):
        print("error: --dt must be a number", file=sys.stderr)
        return 2
    if not 0.01 <= dt <= 1.0:
        print("error: --dt must be between 0.01 and 1.0", file=sys.stderr)
        return 2

    save_path = args.save or default_save_path()
    state, notice = load(save_path)
    if notice:
        print("[pet] %s" % notice)
    personality = Personality(name=args.name or state.name,
                              seed=args.seed)
    if args.name:
        state.name = personality.name
    brain = Brain(state=state, personality=personality, seed=args.seed)

    print("[pet] %s wakes up (energy=%.0f hunger=%.0f affection=%.0f)" % (
        state.name, state.energy, state.hunger, state.affection))
    print("[pet] %s" % personality.line_for_event("greet"))

    last_activity = state.activity
    for tick in range(args.ticks):
        events = brain.tick(dt)
        if state.activity != last_activity:
            print("[pet] now %s (mood: %s)" % (state.activity.value, state.mood))
            last_activity = state.activity
        for event in events:
            print("[pet] %s" % event.text)
        if args.realtime:
            time.sleep(1.0 / TICK_HZ)
        if (tick + 1) % 300 == 0 and not args.no_save:
            save(state, save_path)
    if not args.no_save:
        save(state, save_path)
        print("[pet] saved to %s" % save_path)
    print("[pet] done after %d ticks at (%.0f, %.0f)" % (
        args.ticks, state.x, state.y))
    return 0


def cmd_gui(args: argparse.Namespace) -> int:
    from .pet_app import clamp_alpha, clamp_scale
    from .pet_app import launch as open_window

    try:
        scale = clamp_scale(args.scale)
    except (TypeError, ValueError):
        print("error: --scale must be a number", file=sys.stderr)
        return 2
    try:
        alpha = clamp_alpha(args.alpha)
    except (TypeError, ValueError):
        print("error: --alpha must be a number", file=sys.stderr)
        return 2
    if args.no_save:
        import tempfile
        import os
        unused = os.path.join(tempfile.mkdtemp(prefix="desktop-pet-"), "pet.json")
        return open_window(alpha=alpha, scale=scale,
                           topmost=not args.no_topmost, save_path=unused,
                           seed=args.seed, name=args.name)
    return open_window(alpha=alpha, scale=scale, topmost=not args.no_topmost,
                       save_path=args.save, seed=args.seed, name=args.name)


def cmd_selftest() -> int:
    """Run the headless suite plus wiring checks without unittest CLI."""
    import unittest

    from .tests import suite as make_suite

    runner = unittest.TextTestRunner(verbosity=1)
    result = runner.run(make_suite())
    if not result.wasSuccessful():
        return 1
    # Wiring gate: brain reaches every activity on a seeded soak.
    brain = Brain(seed=1234)
    seen = set()
    for _ in range(4000):
        brain.tick(0.1)
        seen.add(brain.state.activity.value)
        if len(seen) == 5:
            break
    missing = {"idle", "walk", "play", "sleep", "react"} - seen
    if missing:
        print("SELFTEST FAIL: activities never reached: %s" % sorted(missing))
        return 1
    print("SELFTEST PASS: all 5 activities reached; pools=%s" % (
        brain.personality.pool_sizes(),))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    if args.command == "run":
        return cmd_run(args)
    if args.command == "gui":
        return cmd_gui(args)
    if args.command == "selftest":
        return cmd_selftest()
    if args.command == "version":
        return cmd_version()
    return cmd_help()


if __name__ == "__main__":
    raise SystemExit(main())
