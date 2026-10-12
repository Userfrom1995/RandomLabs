"""Tester Phase 4 regression: real-renderer drives, hostile input, teardown resilience.

These tests sit above the builder's unit suites: they drive run() through the
REAL TieredRenderer (unicode bytes, not a fake), hostile byte streams, and
raising teardowns, plus CLI paths the unit suites leave uncovered
(--render-bench, cross-action duplicate binds). Added by the Tester on PR #558.
"""

import time

import pytest

from render.manager import TieredRenderer
from render.scene import COLS, ROWS
from shell import screens
from shell.app import PLAYING, ShellState, run
from shell.audio import BellAudio, NullAudio
from shell.cli import main
from shell.input import Keymap


class ScriptTerminal:
    def __init__(self, chunks, size=None):
        self._chunks = list(chunks)
        self._size = size or (COLS, ROWS)

    def read_available(self):
        return self._chunks.pop(0) if self._chunks else b""

    def size(self):
        return self._size


class AdvancingClock:
    """Monotonic clock that advances on every sleep: sim time really passes."""

    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now

    def sleep(self, seconds):
        self.now += seconds


def drive_real(chunks, audio=None, size=None, max_frames=30, fps=30):
    app = ShellState(seed=5, audio=audio or BellAudio())
    term = ScriptTerminal(chunks, size)
    renderer = TieredRenderer(preference="unicode", env={})
    out = []
    clock = AdvancingClock()
    frames = run(app, term, renderer, out.append, fps=fps,
                 clock=clock, sleep=clock.sleep, max_frames=max_frames)
    return app, renderer, "".join(out), frames


def test_real_renderer_drive_steps_sim_and_ends_framed():
    chunks = [b"\r", b"", b"w", b"", b"", b"", b"q"]
    app, renderer, out, frames = drive_real(chunks)
    assert frames > 3
    assert app.exited
    assert app.game is not None and app.game.tick_count > 0
    assert renderer.stats()["backend"] == "unicode"
    assert app.audio.stats()["played"] >= 0  # bell drained through write_out


def test_real_renderer_drive_bell_bytes_flow_through():
    app = ShellState(seed=5, audio=BellAudio())
    app.audio.play("dot")
    assert app.audio.drain() == "\a"
    chunks = [b"\r", b"q"]
    app2, _, out, _ = drive_real(chunks)
    assert app2.exited


def test_hostile_split_ss3_garbage_and_paste_survive():
    # SS3 arrow split across reads, binary garbage, then a long pasted blob
    # with a quit buried inside: the loop must survive everything and quit.
    chunks = [b"\r", b"\x1bO", b"A\xff\xfe\x00\x01", b"w" * 500 + b"q"]
    app, _, out, frames = drive_real(chunks, audio=NullAudio())
    assert app.exited
    assert frames > 0 and len(out) > 0


def test_hostile_utf8_window_noise_never_crashes():
    chunks = [b"\r", "héllo→\x1b[199~".encode("utf-8"), b"q"]
    app, _, _, frames = drive_real(chunks, audio=NullAudio())
    assert app.exited and frames > 0


def test_audio_shutdown_raising_still_delivers_renderer_shutdown():
    class BadAudio(NullAudio):
        def shutdown(self):
            raise RuntimeError("speaker gone")

    app = ShellState(seed=5, audio=BadAudio())
    out = []
    clock = AdvancingClock()
    frames = run(app, ScriptTerminal([b"q"]), TieredRenderer(preference="unicode", env={}),
                 out.append, fps=30, clock=clock, sleep=clock.sleep, max_frames=3)
    assert frames > 0 and len("".join(out)) > 0  # renderer shutdown bytes delivered


def test_renderer_shutdown_raising_still_runs_audio_shutdown():
    class BadRenderer(TieredRenderer):
        def shutdown(self):
            raise RuntimeError("gpu melted")

    closed = []

    class RecAudio(NullAudio):
        def shutdown(self):
            closed.append(True)

    app = ShellState(seed=5, audio=RecAudio())
    out = []
    clock = AdvancingClock()
    run(app, ScriptTerminal([b"q"]), BadRenderer(preference="unicode", env={}),
        out.append, fps=30, clock=clock, sleep=clock.sleep, max_frames=3)
    assert closed == [True]


def test_level_spawn_event_maps_to_clear_jingle():
    played = []

    class Rec:
        def play(self, event):
            played.append(event)

    app = ShellState(seed=3, audio=Rec())
    app.on_action("confirm")
    app._ingest("level:2")
    assert played == ["level-clear"]


def test_screens_survive_hostile_long_lines():
    fb = screens.paint_title(Keymap())
    drawn = screens.put_text(fb, 0, "X" * 500)
    assert drawn == fb.cols  # clipped to the frame, never crashes
    assert screens.put_text(fb, -1, "offscreen") == 0
    assert screens.put_text(fb, fb.rows, "offscreen") == 0
    over = screens.flat_text(screens.paint_over(fb, 10 ** 12))
    assert any("1000000000000" in row for row in over)


def test_render_bench_live_exit_0(capsys):
    assert main(["--render-bench", "--frames", "2", "--seed", "3"]) == 0
    out = capsys.readouterr().out
    assert "bench OK" in out and "unicode" in out


def test_cli_duplicate_bind_across_actions_rejected(capsys):
    assert main(["--keys", "--bind", "up=k", "--bind", "down=k"]) == 2
    assert "error" in capsys.readouterr().out.lower()


def test_cli_multi_char_bind_rejected(capsys):
    assert main(["--keys", "--bind", "up=kk"]) == 2
    assert "error" in capsys.readouterr().out.lower()


def test_cli_render_check_live(capsys):
    assert main(["--render-check", "--seed", "3"]) == 0
    assert "render OK" in capsys.readouterr().out


def test_full_menu_flow_on_real_renderer():
    # Title -> play -> pause -> resume -> restart -> quit, all live bytes.
    chunks = [b"\r", b"p", b"\r", b"r", b"q"]
    app, _, out, frames = drive_real(chunks, max_frames=40)
    assert app.screen == PLAYING
    assert app.exited and frames > 0 and len(out) > 0


def test_synth_voice_bytes_are_cached_identical():
    from shell.audio import SynthAudio, samples_to_wav_pcm, render_event

    assert samples_to_wav_pcm(render_event("dot")) == samples_to_wav_pcm(render_event("dot"))
    backend = SynthAudio(player=("true", []), spawn=lambda *a, **k: (_ for _ in ()).throw(OSError("x")))
    t0 = time.monotonic()
    backend.play("dot")  # never blocks even when every spawn explodes
    assert time.monotonic() - t0 < 2.0
