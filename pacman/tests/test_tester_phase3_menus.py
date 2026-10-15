"""Tester-owned Phase 3 regression: menus, session mute, live help card.

Red-team probes against the shipped shell (menus/app/screens/input):
remapped live labels, empty-binding fallbacks, tiny-width clipping,
mute gating every event voice, help round-trips, menu wrap extremes,
and hostile bind rejection. Pure headless, no Pillow/tty required.
"""

import pytest

from shell import menus as menus_mod
from shell import screens
from shell.app import ShellState
from shell.audio import NullAudio
from shell.input import Keymap, decode_stream, parse_binds


def _remapped():
    return Keymap({"mute": ["x"], "help": ["z"], "restart": ["y"],
                   "quit": ["t"], "pause": ["o"], "up": ["k"]})


def test_tester_live_labels_follow_remaps():
    km = _remapped()
    assert "[x]" in menus_mod.label("sound", muted=True, keymap=km)
    assert "OFF" in menus_mod.label("sound", muted=True, keymap=km)
    assert "[x]" in menus_mod.label("sound", muted=False, keymap=km)
    assert "[z]" in menus_mod.label("help", keymap=km)
    assert "[y]" in menus_mod.label("restart", keymap=km)
    assert "[t]" in menus_mod.label("quit", keymap=km)
    assert "[o]" in menus_mod.label("resume", keymap=km)
    assert "k" in menus_mod.label("resume", keymap=km)


def test_tester_legacy_exact_defaults_without_keymap():
    assert menus_mod.label("sound", muted=False) == "sound: ON [M]"
    assert menus_mod.label("sound", muted=True) == "sound: OFF [M]"
    assert menus_mod.label("help") == "how to play [?]"
    assert menus_mod.label("restart") == "restart [R]"
    assert menus_mod.label("quit") == "quit [Q]"
    assert menus_mod.label("start") == "start game [ENTER]"
    assert menus_mod.label("bogus-id") == "bogus-id"


def test_tester_empty_move_binding_never_renders_blank():
    km = Keymap()

    class NoUp:
        def bindings(self, action):
            if action == "up":
                return ()
            return km.bindings(action)

    label = menus_mod.label("resume", keymap=NoUp())
    assert "move: )" not in label
    assert "move: W" in label


def test_tester_help_card_survives_tiny_widths():
    km = _remapped()
    for cols in (1, 2, 6, 7, 8, 28, 100):
        fb = screens.paint_help(keymap=km, cols=cols, rows=10)
        assert fb.cols >= 1
        assert fb.rows == 10
    fb = screens.paint_help(keymap=None, cols=28, rows=34)
    text = "\n".join(screens.flat_text(fb))
    assert "HOW TO PLAY" in text
    assert "M: mute" in text


def test_tester_help_card_shows_remapped_keys():
    fb = screens.paint_help(keymap=_remapped(), cols=60, rows=34)
    text = "\n".join(screens.flat_text(fb))
    assert "x" in text and "z" in text


def test_tester_menu_wrap_extremes():
    menu = menus_mod.title_menu()
    for _ in range(17):
        menu.move(1)
    assert menu.current() == "scores"
    menu.move(-100)
    assert menu.current() in ("start", "help", "scores", "sound", "quit")
    menu.reset()
    assert menu.current() == "start"
    pause = menus_mod.pause_menu()
    pause.move(-1)
    assert pause.current() == "quit"
    with pytest.raises(ValueError):
        menus_mod.Menu("empty", [])


def test_tester_mute_silences_every_event_voice():
    events = ["dot", "energizer", "ghost:0", "fruit:cherry", "death",
              "extra-life", "game-over", "time-up", "sprint-clear:1",
              "maze-refill", "level:2"]

    class Rec:
        def __init__(self):
            self.got = []

        def play(self, event):
            self.got.append(event)

    rec = Rec()
    app = ShellState(seed=1, audio=rec)
    app.muted = True
    for event in events:
        app.game = type("G", (), {"tick_count": 100, "events": []})()
        app._last_dot_tick = 0
        app._ingest(event)
    assert rec.got == []
    app.muted = False
    app.game = type("G", (), {"tick_count": 100, "events": []})()
    app._last_dot_tick = 0
    app._ingest("death")
    assert rec.got == ["death"]


def test_tester_mute_hotkey_toggles_from_any_screen():
    for screen in ("title", "playing", "paused", "over"):
        app = ShellState(seed=1, audio=NullAudio())
        if screen != "title":
            app.start_run()
            app.screen = screen
        assert not app.muted
        app.on_action("mute")
        assert app.muted
        assert app.screen == screen  # toggle never navigates
        app.on_action("mute")
        assert not app.muted


def test_tester_help_roundtrips_from_every_screen():
    for screen in ("title", "playing", "paused", "over"):
        app = ShellState(seed=1, audio=NullAudio())
        if screen != "title":
            app.start_run()
            app.screen = screen
        app.on_action("help")
        assert app.screen == "help"
        assert app.help_from == screen
        app.on_action("confirm")
        assert app.screen == screen


def test_tester_pause_menu_sound_toggle_and_quit_to_title():
    app = ShellState(seed=1, audio=NullAudio())
    app.start_run()
    app.screen = "paused"
    app.pause_menu.reset()
    app.pause_menu.move(2)  # resume -> restart -> sound
    assert app.pause_menu.current() == "sound"
    app.on_action("confirm")
    assert app.muted and app.screen == "paused"
    for _ in range(2):  # sound -> help -> quit-to-title
        app.pause_menu.move(1)
    assert app.pause_menu.current() == "quit-to-title"
    app.on_action("confirm")
    assert app.screen == "title"


def test_tester_over_menu_play_again_and_title():
    app = ShellState(seed=1, audio=NullAudio())
    app.start_run()
    app.screen = "over"
    app.on_action("confirm")  # play-again selected by default
    assert app.screen == "playing"
    app.screen = "over"
    app.over_menu.move(1)
    assert app.over_menu.current() == "quit-to-title"
    app.on_action("confirm")
    assert app.screen == "title"


def test_tester_left_right_never_move_menus():
    app = ShellState(seed=1, audio=NullAudio())
    before = app.title_menu.current()
    app.on_action("left")
    app.on_action("right")
    assert app.title_menu.current() == before


def test_tester_conflicting_binds_rejected():
    with pytest.raises(ValueError):
        Keymap({"mute": ["q"]})
    with pytest.raises(ValueError):
        Keymap({"help": ["w"]})
    remapped = Keymap(parse_binds(["mute=x", "help=z"]))
    actions, _ = decode_stream(b"xz", remapped)
    assert actions == ["mute", "help"]
    actions, _ = decode_stream(b"m", remapped)
    assert actions == []


def test_tester_menu_rows_clip_safely_at_tiny_widths():
    from render.framebuffer import Cell, FrameBuffer
    for cols in (1, 4, 10, 28):
        fb = FrameBuffer(cols, 34, Cell(" ", (255, 255, 255), (0, 0, 0), None))
        drawn = screens.paint_menu_items(
            fb, 5, menus_mod.pause_menu().items,
            selected=5, muted=True, keymap=_remapped())
        assert drawn == 6
