"""Phase 3: thoughtful controls, navigable menus, session mute, help.

Menus are pure (shell.menus), paints clip safely at any size (shell.screens),
and every item drives a real shell transition (shell.app): no stubs, no
no-op flags. Mute genuinely silences event sounds; help/scores round-trip
back to the screen they came from.
"""

import pytest

from shell import menus as menus_mod
from shell import screens
from shell.app import ShellState
from shell.audio import NullAudio
from shell.input import ACTIONS, Keymap, decode_stream, parse_binds


def test_mute_help_are_first_class_actions():
    assert "mute" in ACTIONS and "help" in ACTIONS
    assert Keymap().bindings("mute") == ("m",)
    assert Keymap().bindings("help") == ("?",)
    text = Keymap().describe()
    assert "mute" in text and "help" in text


def test_mute_help_decode_and_remap():
    actions, leftover = decode_stream(b"m?", Keymap())
    assert (actions, leftover) == (["mute", "help"], b"")
    remapped = Keymap(parse_binds(["mute=x", "help=z", "up=k"]))
    actions, _ = decode_stream(b"xz", remapped)
    assert actions == ["mute", "help"]
    actions, _ = decode_stream(b"m", remapped)
    assert actions == []


def test_mute_help_conflict_with_existing_binds_rejected():
    with pytest.raises(ValueError):
        Keymap({"mute": ["q"]})  # q already quits
    with pytest.raises(ValueError):
        Keymap({"help": ["w"]})  # w already moves up


def test_menu_model_wraps_and_resets():
    menu = menus_mod.title_menu()
    assert menu.current() == "start"  # ENTER starts, as before
    menu.move(1)
    assert menu.current() == "help"
    menu.move(-1)
    assert menu.current() == "start"
    menu.move(-1)
    assert menu.current() == "quit"  # wraps off the top
    menu.reset()
    assert menu.current() == "start"
    assert menus_mod.pause_menu().current() == "resume"
    assert menus_mod.over_menu().current() == "play-again"
    with pytest.raises(ValueError):
        menus_mod.Menu("empty", [])


def test_menu_labels_are_live():
    assert "OFF" in menus_mod.label("sound", muted=True)
    assert "ON" in menus_mod.label("sound", muted=False)
    assert "ENTER" in menus_mod.label("start")
    assert menus_mod.label("bogus-id") == "bogus-id"


def test_title_menu_navigation_and_activation():
    app = ShellState(seed=3, audio=NullAudio())
    app.on_action("down")
    assert app.title_menu.current() == "help"
    app.on_action("confirm")
    assert app.screen == "help"
    app.on_action("confirm")
    assert app.screen == "title"  # back where it came from
    app.on_action("down")  # from help (index 1) to sound (index 3)
    app.on_action("down")
    assert app.title_menu.current() == "sound"
    app.on_action("confirm")
    assert app.muted  # sound toggle keeps the menu open
    assert app.screen == "title"


def test_title_menu_scores_roundtrip():
    app = ShellState(seed=3, audio=NullAudio())
    app.on_action("down")
    app.on_action("down")
    assert app.title_menu.current() == "scores"
    app.on_action("confirm")
    assert app.screen == "scores"
    text = "\n".join(screens.flat_text(app.paint()))
    assert "HIGH SCORES" in text
    app.on_action("pause")
    assert app.screen == "title"


def test_title_menu_quit_exits():
    app = ShellState(seed=3, audio=NullAudio())
    for _ in range(5):  # start/help/scores/sound/settings, then quit
        app.on_action("down")
    assert app.title_menu.current() == "quit"
    app.on_action("confirm")
    assert app.exited


def test_help_from_playing_freezes_and_resumes():
    app = ShellState(seed=3, audio=NullAudio())
    app.on_action("confirm")
    app.step_play(1.0 / 120.0)
    ticks = app.game.tick_count
    app.on_action("help")
    assert app.screen == "help"
    assert app.game.tick_count == ticks  # run loop skips stepping off PLAYING
    app.on_action("pause")
    assert app.screen == "playing"


def test_help_card_shows_live_bindings():
    keymap = Keymap(parse_binds(["mute=x"]))
    fb = screens.paint_help(keymap)
    text = "\n".join(screens.flat_text(fb))
    assert "HOW TO PLAY" in text
    assert "x" in text  # remapped mute key shown live
    assert "ENTER" in text or "back" in text
    for row in screens.flat_text(fb):
        assert len(row) <= 28


def test_pause_menu_resume_restart_sound_title_quit():
    app = ShellState(seed=3, audio=NullAudio())
    app.on_action("confirm")
    first = app.game
    app.on_action("pause")
    app.on_action("down")  # restart
    app.on_action("confirm")
    assert app.screen == "playing" and app.game is not first
    app.on_action("pause")
    app.on_action("down")
    app.on_action("down")  # sound
    app.on_action("confirm")
    assert app.screen == "paused" and app.muted
    app.on_action("pause")
    assert app.screen == "playing"  # hotkey always resumes
    app.on_action("pause")
    for _ in range(4):  # quit-to-title
        app.on_action("down")
    app.on_action("confirm")
    assert app.screen == "title" and not app.exited
    app.on_action("confirm")  # menu reset: ENTER starts again
    assert app.screen == "playing"


def test_mute_hotkey_silences_every_event():
    played = []

    class Rec:
        def play(self, event):
            played.append(event)

    app = ShellState(seed=3, audio=Rec())
    app.on_action("confirm")
    app.on_action("mute")
    assert app.muted
    for event in ("dot", "energizer", "ghost:200", "death", "level-clear"):
        app.game.tick_count += 100
        app._ingest(event)
    assert played == []
    app.on_action("mute")
    app.game.tick_count += 100
    app._ingest("ghost:200")
    assert played == ["ghost"]


def test_over_menu_play_again_and_title():
    app = ShellState(seed=3, audio=NullAudio())
    app.on_action("confirm")
    app.game.state = "over"
    app.step_play(1.0 / 120.0)
    assert app.screen == "over"
    app.on_action("down")  # quit-to-title
    app.on_action("confirm")
    assert app.screen == "title"
    app.on_action("confirm")
    assert app.screen == "playing"
    app.game.state = "over"
    app.step_play(1.0 / 120.0)
    app.on_action("confirm")  # default is play-again
    assert app.screen == "playing"


def test_menu_paints_fit_legacy_frame_and_full_canvas():
    from render.layout import compute
    app = ShellState(seed=3, audio=NullAudio())
    legacy = app.paint()
    assert (legacy.cols, legacy.rows) == (28, 34)
    assert any("MENU" in row for row in screens.flat_text(legacy))
    app.on_action("confirm")
    app.on_action("pause")
    paused = app.paint(compute(100, 44))
    assert (paused.cols, paused.rows) == (100, 44)
    text = "\n".join(screens.flat_text(paused))
    assert "PAUSED" in text and "resume" in text
    app.on_action("help")
    help_fb = app.paint(compute(100, 44))
    assert (help_fb.cols, help_fb.rows) == (100, 44)
    assert "HOW TO PLAY" in "\n".join(screens.flat_text(help_fb))


def test_left_right_do_not_move_menus():
    app = ShellState(seed=3, audio=NullAudio())
    app.on_action("left")
    app.on_action("right")
    assert app.title_menu.current() == "start"
    assert app.screen == "title"


def test_quit_from_help_and_scores_exits():
    app = ShellState(seed=3, audio=NullAudio())
    app.on_action("help")
    app.on_action("quit")
    assert app.exited
    app2 = ShellState(seed=3, audio=NullAudio())
    app2.on_action("down")
    app2.on_action("down")
    app2.on_action("confirm")
    assert app2.screen == "scores"
    app2.on_action("quit")
    assert app2.exited


def test_controls_matrix_all_pass():
    from shell import verify as verify_mod
    rows = verify_mod.controls_matrix(seed=1)
    assert len(rows) == 12
    failed = [(r["name"], r["detail"]) for r in rows if not r["passed"]]
    assert failed == []
