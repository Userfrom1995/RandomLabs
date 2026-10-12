"""Shell: raw terminal safety, screens, flows, and the play loop."""

import io
import os

import pytest

from render.scene import COLS, ROWS
from shell import screens
from shell.app import OVER, PAUSED, PLAYING, TITLE, ShellState, run
from shell.audio import NullAudio
from shell.cli import main
from shell.input import Keymap
from shell.terminal import RawTerminal, TerminalError, check_size


class FakeStream:
    def __init__(self, tty=True):
        self._tty = tty

    def isatty(self):
        return self._tty

    def fileno(self):
        return 7


class FakeTermios:
    TCSADRAIN = 1

    def __init__(self, fail_restore=False):
        self.saved = ["attrs"]
        self.restored_with = None
        self.fail_restore = fail_restore

    def tcgetattr(self, fd):
        return list(self.saved)

    def tcsetattr(self, fd, how, attrs):
        if self.fail_restore:
            raise OSError("tty gone")
        self.restored_with = (fd, how, list(attrs))


class FakeTty:
    def __init__(self):
        self.raw_fds = []

    def setraw(self, fd):
        self.raw_fds.append(fd)


def test_raw_terminal_restores_on_crash():
    termios, tty = FakeTermios(), FakeTty()
    term = RawTerminal(stream_in=FakeStream(), termios_mod=termios, tty_mod=tty)
    with pytest.raises(RuntimeError):
        with term:
            assert term.active and tty.raw_fds == [7]
            raise RuntimeError("boom")
    assert not term.active
    assert termios.restored_with == (7, 1, ["attrs"])
    assert term.restore_errors == 0


def test_raw_terminal_counts_restore_failure_without_masking():
    termios = FakeTermios(fail_restore=True)
    term = RawTerminal(stream_in=FakeStream(), termios_mod=termios, tty_mod=FakeTty())
    with pytest.raises(RuntimeError, match="boom"):
        with term:
            raise RuntimeError("boom")
    assert term.restore_errors == 1


def test_raw_terminal_refuses_non_tty():
    term = RawTerminal(stream_in=FakeStream(tty=False))
    with pytest.raises(TerminalError):
        term.__enter__()


def test_raw_terminal_refuses_missing_posix():
    term = RawTerminal(stream_in=FakeStream(), termios_mod=None, tty_mod=None)
    with pytest.raises(TerminalError):
        term.__enter__()


def test_raw_terminal_restores_real_pty():
    import pty
    import termios as real_termios
    master, slave = pty.openpty()
    try:
        before = real_termios.tcgetattr(slave)
        stream = os.fdopen(os.dup(slave), "rb", buffering=0)
        try:
            with RawTerminal(stream_in=stream):
                pass
        finally:
            stream.close()
        assert real_termios.tcgetattr(slave) == before
    finally:
        os.close(master)
        os.close(slave)


def test_check_size_message_is_honest():
    assert check_size(COLS, ROWS, COLS, ROWS) is None
    msg = check_size(20, 10, COLS, ROWS)
    assert "20x10" in msg and "%dx%d" % (COLS, ROWS) in msg


def test_title_pause_over_screens_readable():
    title = screens.flat_text(screens.paint_title(Keymap()))
    assert any("P A C - M A N" in row for row in title)
    assert any("ENTER" in row for row in title)
    from engine.game import Game
    base = screens.paint_title()
    paused = screens.flat_text(screens.paint_pause(base))
    assert any("PAUSED" in row for row in paused)
    over = screens.flat_text(screens.paint_over(base, 1230))
    assert any("GAME OVER" in row for row in over)
    assert any("1230" in row for row in over)
    small = screens.flat_text(screens.paint_too_small("terminal too small: have 1x1"))
    assert any("1x1" in row for row in small)


def test_menu_cards_fit_frame_without_clipped_hints():
    from render.framebuffer import Cell, FrameBuffer
    from shell.terminal import check_size
    blank = FrameBuffer(COLS, ROWS, Cell(" ", (255, 255, 255), (0, 0, 0), None))
    title = screens.paint_title(Keymap())
    pause = screens.paint_pause(blank)
    over = screens.paint_over(blank, 1230)
    small = screens.paint_too_small(check_size(20, 10, COLS, ROWS))
    for name, fb in (("title", title), ("pause", pause),
                     ("over", over), ("small", small)):
        for row in screens.flat_text(fb):
            assert len(row) <= COLS, "%s row overflows: %r" % (name, row)
    rows = screens.flat_text(title)
    assert any("R: restart" in row for row in rows)
    assert any("Q: quit" in row for row in rows)
    assert any("dodge ghosts" in row for row in rows)
    rows = screens.flat_text(pause)
    assert any("resume" in row for row in rows)
    assert any("R: restart" in row for row in rows)
    assert any("Q: quit" in row for row in rows)
    rows = screens.flat_text(over)
    assert any("Q: quit" in row for row in rows)
    rows = screens.flat_text(small)
    assert any("20x10" in row for row in rows)
    assert any("28x34" in row for row in rows)
    assert any("Q to quit" in row for row in rows)


def test_flow_title_pause_restart_gameover_quit():
    app = ShellState(seed=3, audio=NullAudio())
    assert app.screen == TITLE
    app.on_action("confirm")
    assert app.screen == PLAYING and app.game is not None
    first = app.game
    app.on_action("up")
    app.on_action("pause")
    assert app.screen == PAUSED
    app.on_action("pause")
    assert app.screen == PLAYING
    app.on_action("pause")
    app.on_action("restart")
    assert app.screen == PLAYING and app.game is not first
    app.game.state = "over"
    app.step_play(1.0 / 120.0)
    assert app.screen == OVER
    app.on_action("confirm")
    assert app.screen == PLAYING
    app.on_action("quit")
    assert app.exited


def test_pause_freezes_the_simulation():
    app = ShellState(seed=3, audio=NullAudio())
    app.on_action("confirm")
    app.step_play(1.0 / 120.0)
    ticks = app.game.tick_count
    app.on_action("pause")
    assert app.screen == PAUSED  # run() skips step_play while paused
    assert app.game.tick_count == ticks


def test_dot_sounds_throttled_ghost_sounds_pass():
    played = []

    class Rec:
        def play(self, event):
            played.append(event)

    app = ShellState(seed=3, audio=Rec())
    app.on_action("confirm")
    for _ in range(30):
        app._ingest("dot")
    assert played.count("dot") <= 3
    app._ingest("ghost:200")
    assert played[-1] == "ghost"


class ScriptTerminal:
    def __init__(self, chunks, size=None):
        self._chunks = list(chunks)
        self._size = size or (COLS, ROWS)

    def read_available(self):
        return self._chunks.pop(0) if self._chunks else b""

    def size(self):
        return self._size


class FakeRenderer:
    def __init__(self):
        self.frames = []

    def init(self, cols, rows):
        return "<init>"

    def present(self, fb, dirty):
        self.frames.append((fb.cols, fb.rows))
        return "<frame>"

    def shutdown(self):
        return "<bye>"


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now

    def sleep(self, seconds):
        self.now += seconds


def drive(chunks, size=None, audio=None, max_frames=12):
    app = ShellState(seed=5, audio=audio or NullAudio())
    term = ScriptTerminal(chunks, size)
    renderer = FakeRenderer()
    out = []
    clock = FakeClock()
    frames = run(app, term, renderer, out.append, fps=30,
                 clock=clock, sleep=clock.sleep, max_frames=max_frames)
    return app, renderer, "".join(out), frames


def test_headless_playthrough_steps_paints_tears_down():
    chunks = [b"\r", b"", b"w", b"", b"", b"q"]
    app, renderer, out, frames = drive(chunks)
    assert out.startswith("<init>") and out.endswith("<bye>")
    assert out.count("<frame>") == frames and frames > 3
    assert app.game is not None and app.game.tick_count > 0
    assert all(dim == (COLS, ROWS) for dim in renderer.frames)
    assert app.exited


def test_too_small_screen_blocks_play_but_quit_works():
    app, renderer, out, frames = drive([b"\r", b"q"], size=(20, 10), max_frames=4)
    assert app.game is None  # confirm was swallowed by the size guard
    assert app.exited and frames == 2


def test_loop_shutdown_runs_on_crash():
    class BoomRenderer(FakeRenderer):
        def present(self, fb, dirty):
            raise RuntimeError("gpu melted")

    app = ShellState(seed=5, audio=NullAudio())
    out = []
    clock = FakeClock()
    with pytest.raises(RuntimeError):
        run(app, ScriptTerminal([b"\r"]), BoomRenderer(), out.append,
            fps=30, clock=clock, sleep=clock.sleep, max_frames=3)
    assert out[-1] == "<bye>"


def test_keys_flag_prints_bindings(capsys):
    assert main(["--keys"]) == 0
    out = capsys.readouterr().out
    assert "up" in out and "quit" in out


def test_keys_flag_with_remap(capsys):
    assert main(["--keys", "--bind", "up=k"]) == 0
    assert "k" in capsys.readouterr().out


def test_bad_bind_rejected(capsys):
    assert main(["--keys", "--bind", "fly=x"]) == 2
    assert "error" in capsys.readouterr().out.lower()


def test_play_without_tty_is_honest_error(capsys, monkeypatch):
    monkeypatch.setattr("sys.stdin", io.StringIO(""))
    assert main(["--play"]) == 2
    assert "tty" in capsys.readouterr().out.lower()


def test_bad_fps_rejected(capsys):
    assert main(["--play", "--fps", "0"]) == 2
    assert "error" in capsys.readouterr().out.lower()


def test_bad_audio_choice_rejected():
    with pytest.raises(SystemExit) as exc:
        main(["--play", "--audio", "orchestra"])
    assert exc.value.code == 2
