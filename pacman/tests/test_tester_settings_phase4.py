"""Tester hostile regression suite for Phase 4 in-game settings (issue #552).

Black-box contract pins independent of the builder's own suites: every
settings row cycles legally in both directions under endurance load, the
mode change honestly defers to the next run (live run untouched),
persistence round-trips field-identically through a bound config file
and fails soft without one, hostile values are rejected with state
untouched, hand-corrupted state recovers deterministically, and the
shipped verify settings matrix stays all-pass.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from shell import settings as settings_mod
from shell.app import ShellState
from shell.audio import NullAudio
from shell.config import Config


def _app(**kw):
    args = dict(seed=7, audio=NullAudio())
    args.update(kw)
    return ShellState(**args)


def _to_settings(app, origin="title"):
    if origin == "pause":
        app.on_action("confirm")  # start run
        app.on_action("pause")
        for _ in range(5):
            app.on_action("down")
        assert app.pause_menu.current() == "settings"
        app.on_action("confirm")
    else:
        for _ in range(4):
            app.on_action("down")
        assert app.title_menu.current() == "settings"
        app.on_action("confirm")
    assert app.screen == "settings"


def test_verify_settings_matrix_all_pass():
    from shell import verify as verify_mod
    rows = verify_mod.settings_matrix(seed=1)
    assert len(rows) >= 10, "settings matrix must hold the 10-row section"
    bad = [r for r in rows if not r["passed"]]
    assert not bad, "failing verify rows: %s" % bad


def test_every_row_cycles_legally_both_directions():
    for opt in settings_mod.OPTIONS:
        app = _app()
        _to_settings(app)
        app.settings_index = list(settings_mod.OPTIONS).index(opt)
        before = settings_mod.get(app, opt)
        app.on_action("right")
        fwd = settings_mod.get(app, opt)
        assert fwd in settings_mod.choices(opt)
        app.on_action("left")
        back = settings_mod.get(app, opt)
        assert back in settings_mod.choices(opt)
        assert back == before, "left must undo right for %s" % opt


def test_endurance_three_full_cycles_never_illegal():
    app = _app()
    _to_settings(app)
    for _ in range(3):
        for i in range(len(settings_mod.OPTIONS)):
            app.settings_index = i
            app.on_action("right")
            app.on_action("left")
            app.on_action("left")
            app.on_action("right")
            assert settings_mod.get(app, settings_mod.OPTIONS[i]) in \
                settings_mod.choices(settings_mod.OPTIONS[i])
    assert app.screen == "settings"  # endurance never escapes the screen


def test_mode_cycle_defers_live_run_ruleset():
    app = _app()
    _to_settings(app, origin="pause")
    assert app.game is not None
    live_mode = app.game.mode
    app.settings_index = list(settings_mod.OPTIONS).index("mode")
    app.on_action("right")
    assert settings_mod.get(app, "mode") in settings_mod.choices("mode")
    assert app.game.mode == live_mode, "live run keeps its ruleset"
    assert app.screen == "settings"
    assert settings_mod.note("mode") == "applies to next run"


def test_bound_config_persists_and_reloads_field_identical(tmp_path):
    path = str(tmp_path / "settings.json")
    cfg = Config(path=path)
    app = _app(config=cfg)
    _to_settings(app)
    app.settings_index = 0
    app.on_action("right")  # cycle theme, persists via bound config
    saved = settings_mod.snapshot(app)
    reloaded = Config(path=path)
    assert reloaded.values["theme"] == saved["theme"]
    assert reloaded.values["mode"] == saved["mode"]
    assert reloaded.values.get("scale", "auto") == saved["scale"]
    assert reloaded.values.get("effects", True) == saved["effects"]
    assert reloaded.values["reduced_flash"] == saved["reduced_flash"]


def test_session_only_settings_never_crash_without_config():
    app = _app(config=None)  # headless probe, no config bound
    _to_settings(app)
    for i in range(len(settings_mod.OPTIONS)):
        app.settings_index = i
        app.on_action("right")
        app.on_action("left")
    app.on_action("pause")
    assert app.screen == "title"


def test_help_round_trips_through_settings_from_pause():
    app = _app()
    _to_settings(app, origin="pause")
    app.on_action("help")
    assert app.screen == "help"
    app.on_action("confirm")
    assert app.screen == "settings"
    app.on_action("pause")
    assert app.screen == "paused"  # back to the pause origin, run untouched
    assert app.game is not None


def test_hostile_values_rejected_state_untouched():
    from types import SimpleNamespace
    st = SimpleNamespace(theme="classic", mode="classic", scale_mode="auto",
                         effects=True, reduced_flash=False)
    before = settings_mod.snapshot(st)
    for opt, val in (("theme", "NOPE"), ("mode", "NOPE"), ("scale", "NOPE"),
                     ("effects", "maybe"), ("reduced_flash", ""),
                     ("theme", 123), ("mode", None), ("bogus", "x")):
        try:
            settings_mod.set_value(st, opt, val)
        except (ValueError, TypeError):
            pass
        else:
            raise AssertionError("accepted hostile %r=%r" % (opt, val))
    assert settings_mod.snapshot(st) == before


def test_hand_corrupted_state_recovers_to_legal_choice():
    app = _app()
    app.theme = "CORRUPT-THEME"
    assert settings_mod.cycle(app, "theme", 1) in settings_mod.choices("theme")
    app.mode = "CORRUPT-MODE"
    assert settings_mod.cycle(app, "mode", -1) in settings_mod.choices("mode")


def test_quit_stays_last_in_both_menus():
    from shell import menus as menus_mod
    for menu in (menus_mod.title_menu(), menus_mod.pause_menu()):
        assert menu.items[-1] == "quit"
        assert menu.items[-2] == "settings"


def test_effects_toggle_roundtrip_changes_paint_input():
    app = _app()
    _to_settings(app)
    app.settings_index = list(settings_mod.OPTIONS).index("effects")
    first = settings_mod.get(app, "effects")
    app.on_action("right")
    assert settings_mod.get(app, "effects") != first
    app.on_action("right")
    assert settings_mod.get(app, "effects") == first
