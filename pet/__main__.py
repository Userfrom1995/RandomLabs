"""Desktop Pet command line (stdlib only, never blocks on input()).

Usage:
  python -m pet run [--ticks N] [--seed S] [--name NAME] [--realtime]
      [--character ID]
  python -m pet gui [--scale F] [--alpha A] [--no-topmost] [--name NAME]
      [--character ID]
  python -m pet characters (list|show ID|switch ID)
  python -m pet talk "hello there" [--character ID] [--seed S]
  python -m pet settings [--set field=value ...]
  python -m pet startup (on|off|status)
  python -m pet notify --message TEXT [--title TEXT]
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
    print("headlessly in your terminal, `talk` chats with it offline,")
    print("and `selftest` verifies state,")
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
    run_p.add_argument("--character", type=str, default=None,
                       help="run as this character (saved unless --no-save)")
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
    gui_p.add_argument("--character", type=str, default=None,
                       help="open the window as this character (saved unless --no-save)")
    set_p = sub.add_parser("settings", help="show or change saved settings")
    set_p.add_argument("--set", action="append", default=[],
                       metavar="field=value",
                       help="change a setting (repeatable): wander, "
                            "play_invites, sleep_schedule, dialogue, "
                            "topmost, alpha, scale, bedtime, wake")
    set_p.add_argument("--save", type=str, default=None,
                       help="settings file path (default: user-data dir)")
    start_p = sub.add_parser("startup", help="launch-at-login integration")
    start_p.add_argument("mode", nargs="?", default="status",
                         choices=("on", "off", "status"),
                         help="on, off, or status (default)")
    notify_p = sub.add_parser("notify", help="post an OS notification")
    notify_p.add_argument("--message", type=str, required=True,
                          help="notification body text")
    notify_p.add_argument("--title", type=str, default="Desktop Pet",
                          help="notification title")
    sub.add_parser("help", help="print usage")
    sub.add_parser("version", help="print version")
    chars_p = sub.add_parser("characters", help="list, show, or switch pet characters")
    chars_p.add_argument("action", nargs="?", default="list",
                         choices=("list", "show", "switch"),
                         help="list, show, or switch (default: list)")
    chars_p.add_argument("character_id", nargs="?", default=None,
                         help="character id for show/switch")
    chars_p.add_argument("--save", type=str, default=None,
                         help="save file path (default: platform user-data dir)")
    talk_p = sub.add_parser("talk", aliases=["converse"],
                            help="chat with the pet (offline conversation)")
    talk_p.add_argument("text", nargs="?", default=None,
                        help="what to say to the pet")
    talk_p.add_argument("--character", type=str, default=None,
                        help="answer in this character voice (saved)")
    talk_p.add_argument("--save", type=str, default=None,
                        help="save file path (default: platform user-data dir)")
    talk_p.add_argument("--no-save", action="store_true",
                        help="do not write the save file")
    talk_p.add_argument("--seed", type=int, default=None,
                        help="RNG seed for a deterministic reply")
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
    if args.character is not None:
        from .pet_core import catalog as catalog_mod

        record, char_notice = catalog_mod.get(args.character)
        if char_notice:
            print("[pet] %s" % char_notice)
        state.character_id = record["id"]
    personality = Personality(name=args.name or state.name,
                              seed=args.seed,
                              character_id=state.character_id)
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
                           seed=args.seed, name=args.name,
                           character_id=args.character,
                           settings_path=os.path.join(
                               os.path.dirname(unused), "settings.json"))
    return open_window(alpha=alpha, scale=scale, topmost=not args.no_topmost,
                       save_path=args.save, seed=args.seed, name=args.name,
                       character_id=args.character)


def cmd_settings(args: argparse.Namespace) -> int:
    from .pet_app import settings as settings_mod

    current, notice = settings_mod.load_settings(args.save)
    if notice and "no settings file yet" not in notice:
        print("[pet] %s" % notice)
    updated = current
    for raw in args.set or []:
        if "=" not in raw:
            print("error: --set needs field=value, got %r" % raw,
                  file=sys.stderr)
            return 2
        field, _, value = raw.partition("=")
        try:
            parsed = settings_mod.parse_setting_value(field.strip(),
                                                      value.strip())
            updated = settings_mod.with_field(updated, field.strip(), parsed)
        except ValueError as exc:
            print("error: %s" % exc, file=sys.stderr)
            return 2
    if args.set:
        try:
            settings_mod.save_settings(updated, args.save)
        except OSError as exc:
            print("error: could not save settings (%s)" % exc, file=sys.stderr)
            return 1
        print("[pet] settings saved")
    print(updated.describe())
    return 0


def cmd_startup(args: argparse.Namespace) -> int:
    from .pet_app import shells as shells_mod

    if args.mode == "status":
        state = "on" if shells_mod.is_startup_enabled() else "off"
        print("[pet] start at login: %s" % state)
        print("[pet] %s" % shells_mod.platform_notes())
        return 0
    ok, note = shells_mod.set_startup(args.mode == "on")
    print("[pet] %s" % note)
    return 0 if ok else 1


def cmd_notify(args: argparse.Namespace) -> int:
    from .pet_app import shells as shells_mod

    if not args.message.strip():
        print("error: --message must not be empty", file=sys.stderr)
        return 2
    ok, note = shells_mod.notify(args.title, args.message)
    print("[pet] %s" % note)
    return 0 if ok else 1


def cmd_characters(args: argparse.Namespace) -> int:
    from .pet_core import catalog as catalog_mod

    save_path = args.save or default_save_path()
    if args.action == "list":
        try:
            current_state, list_notice = load(save_path)
        except Exception:
            current_state, list_notice = None, None
        if list_notice and "starting fresh" not in list_notice and "migrated" not in list_notice:
            print("[pet] %s" % list_notice)
        for record in catalog_mod.list_characters():
            marker = ""
            if current_state is not None and current_state.character_id == record["id"]:
                marker = " (active)"
            print("%-10s %-12s [%s] %s%s" % (
                record["id"], record["name"], record["body_plan"],
                record["tagline"], marker))
        return 0
    if args.character_id is None:
        print("error: characters %s needs a character id" % args.action,
              file=sys.stderr)
        return 2
    record, notice = catalog_mod.get(args.character_id)
    if notice and args.action == "show":
        print("[pet] %s" % notice)
    if args.action == "show":
        print("%s (%s, %s)" % (record["name"], record["species"],
                               record["body_plan"]))
        print(record["tagline"])
        print("signature: %s" % record["signature"])
        print("walk speed: %.1f px/s" % record["traits"]["walk_speed"])
        return 0
    # switch: persist the selection atomically beside pet.json.
    state, load_notice = load(save_path)
    if load_notice and "starting fresh" not in load_notice and "migrated" not in load_notice:
        print("[pet] %s" % load_notice)
    if notice:
        print("[pet] %s" % notice)
    state.character_id = record["id"]
    try:
        save(state, save_path)
    except OSError as exc:
        print("error: could not save character (%s)" % exc, file=sys.stderr)
        return 1
    print("[pet] switched to %s (%s)" % (record["name"], record["id"]))
    return 0


def cmd_talk(args: argparse.Namespace) -> int:
    from .pet_core import catalog as catalog_mod
    from .pet_core.converse import Converser

    if args.text is None or not str(args.text).strip():
        print("error: talk needs something to say, e.g. "
              'python -m pet talk "hello"', file=sys.stderr)
        return 2
    save_path = args.save or default_save_path()
    state, notice = load(save_path)
    if notice:
        print("[pet] %s" % notice)
    if args.character is not None:
        record, char_notice = catalog_mod.get(args.character)
        if char_notice:
            print("[pet] %s" % char_notice)
        state.character_id = record["id"]
    talker = Converser(character_id=state.character_id, name=state.name,
                       seed=args.seed)
    reply, _hint = talker.reply(
        args.text, mood=state.mood, hunger=state.hunger,
        energy=state.energy)
    print("%s: %s" % (state.name, reply))
    if args.character is not None and not args.no_save:
        try:
            save(state, save_path)
        except OSError as exc:
            print("error: could not save character (%s)" % exc,
                  file=sys.stderr)
            return 1
    return 0


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
    if args.command == "settings":
        return cmd_settings(args)
    if args.command == "startup":
        return cmd_startup(args)
    if args.command == "notify":
        return cmd_notify(args)
    if args.command == "characters":
        return cmd_characters(args)
    if args.command in ("talk", "converse"):
        return cmd_talk(args)
    if args.command == "selftest":
        return cmd_selftest()
    if args.command == "version":
        return cmd_version()
    return cmd_help()


if __name__ == "__main__":
    raise SystemExit(main())
