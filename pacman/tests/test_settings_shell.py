"""Phase 4 settings screen: menu entry, cycling, persistence, paint."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from types import SimpleNamespace

from shell import menus as menus_mod
from shell import screens, settings as settings_mod
from shell.app import ShellState
from shell.audio import NullAudio
from shell.config import Config


def _state(**kw):
    base = dict(theme="neon", mode="classic", scale_mode="auto",
                effects=True, reduced_flash=False)
    base.update(kw)
    return SimpleNamespace(**base)


def test_settings_sits_second_to_last_in_both_menus():
    title = menus_mod.title_menu().items
    assert title[0] == "start" and title[-1] == "quit"
    assert title[-2] == "settings"
    pause = menus_mod.pause_menu().items
    assert pause[0] == "resume" and pause[-1] == "quit"
    assert pause[-2] == "settings"
    assert menus_mod.label("settings") == "settings"


def test_title_settings_roundtrip():
    app = ShellState(seed=3, audio=NullAudio())
    for _ in range(4):  # down to settings
        app.on_action("down")
    assert app.title_menu.current() == "settings"
    app.on_action("confirm")
    assert app.screen == "settings"
    text = "\n".join(screens.flat_text(app.paint()))
    assert "SETTINGS" in text and "theme:" in text
    app.on_action("pause")
    assert app.screen == "title"


def test_pause_settings_roundtrip_and_help_from_settings():
    app = ShellState(seed=3, audio=NullAudio())
    app.on_action("confirm")
    app.on_action("pause")
    for _ in range(5):  # down to settings in the pause menu
        app.on_action("down")
    assert app.pause_menu.current() == "settings"
    app.on_action("confirm")
    assert app.screen == "settings"
    app.on_action("help")
    assert app.screen == "help"
    app.on_action("confirm")
    assert app.screen == "settings"  # help returns where it came from
    app.on_action("confirm")
    assert app.screen == "paused"  # back closes settings, run untouched
    assert app.game is not None


def test_settings_cycle_changes_live_values():
    app = ShellState(seed=3, audio=NullAudio(), theme="classic")
    app.screen = "settings"
    app.settings_index = 0  # theme row
    first = app.theme
    app.on_action("right")
    assert app.theme != first  # cycled to the next palette
    app.on_action("left")
    assert app.theme == first  # and back
    app.settings_index = 3  # effects row
    app.on_action("right")
    assert app.effects is False
    app.on_action("right")
    assert app.effects is True  # bool wraps


def test_settings_up_down_moves_and_wraps():
    app = ShellState(seed=3, audio=NullAudio())
    app.screen = "settings"
    app.on_action("up")
    assert app.settings_index == len(settings_mod.OPTIONS) - 1  # wraps
    app.on_action("down")
    assert app.settings_index == 0


def test_settings_persist_to_config_file(tmp_path):
    path = str(tmp_path / "config.json")
    app = ShellState(seed=3, audio=NullAudio(), theme="classic",
                     config=Config(path=path))
    app.screen = "settings"
    app.settings_index = 0
    app.on_action("right")
    assert app.theme != "classic"
    saved = Config(path=path)  # reload from disk
    assert saved.values["theme"] == app.theme
    assert saved.values["mode"] == "classic"


def test_settings_without_config_is_session_only():
    app = ShellState(seed=3, audio=NullAudio(), theme="classic")
    assert app.config is None
    app.screen = "settings"
    app.settings_index = 0
    app.on_action("right")  # must not raise with no config bound
    assert app.theme != "classic"


def test_mode_change_applies_to_next_run_only():
    app = ShellState(seed=3, audio=NullAudio(), mode="classic")
    app.on_action("confirm")
    assert app.game.mode == "classic"
    app.screen = "settings"
    app.settings_index = 1  # mode row
    app.on_action("right")
    assert app.mode != "classic"
    assert app.game.mode == "classic"  # live run keeps its ruleset
    app.start_run()
    assert app.game.mode == app.mode  # next run picks it up


def test_settings_paint_shows_live_values_and_honesty():
    fb = screens.paint_settings(_state(), selected=0)
    text = "\n".join(screens.flat_text(fb))
    assert "SETTINGS" in text
    assert "theme: neon" in text
    assert "applies to next run" in text
    assert "left/right: change" in text
    marked = [row for row in screens.flat_text(fb) if row.startswith("> ")]
    assert len(marked) == 1 and "theme: neon" in marked[0]
    fb2 = screens.paint_settings(_state(), selected=1)
    marked2 = [row for row in screens.flat_text(fb2) if row.startswith("> ")]
    assert len(marked2) == 1 and "mode: classic" in marked2[0]


def test_settings_paint_survives_sizes():
    for cols in (1, 2, 8, 28, 100):
        fb = screens.paint_settings(_state(), selected=2, cols=cols, rows=10)
        assert fb.cols >= 1 and fb.rows == 10
    fb = screens.paint_settings(_state(), selected=99, cols=28, rows=34)
    assert isinstance(screens.flat_text(fb), list)
    full = screens.paint_settings(_state(), selected=0, cols=100, rows=44)
    assert (full.cols, full.rows) == (100, 44)


def test_settings_matrix_all_pass():
    from shell import verify as verify_mod
    rows = verify_mod.settings_matrix(seed=1)
    assert len(rows) == 10
    failed = [(r["name"], r["detail"]) for r in rows if not r["passed"]]
    assert failed == []
