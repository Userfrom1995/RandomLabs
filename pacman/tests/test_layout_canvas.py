"""Responsive canvas (issue #552 canvas wave): layout engine plus composer.

Pins the fullscreen-canvas contract headlessly and through scripted
play-loop drives (no tty needed): regions appear as the window grows, the
maze blit is verbatim scene output, side panels show live data, small
windows play exactly as before, and resizes re-layout mid-run.
"""

import pytest

import re

from engine import tuning
from engine.game import Game
from render import ansi
from render.compose import _bar, paint_full
from render.framebuffer import FrameBuffer
from render.layout import (LEFT_MIN_COLS, RIGHT_MIN_COLS, STATUS_MIN_ROWS,
                           TITLE_MIN_ROWS, compute, describe)
from render.manager import TieredRenderer
from render.scene import COLS, ROWS, paint as paint_scene
from shell import verify as verify_mod
from shell.app import ShellState, run
from shell.audio import NullAudio
from shell.input import Keymap
from shell.scores import ScoreTable


def live_game(seed=3, ticks=120):
    game = Game(seed=seed)
    for _ in range(ticks):
        game.step(tuning.STEP)
        if not game.running:
            break
    return game


def visible_text(out):
    """Strip ANSI/DCS escapes: backends address every cell, so words like
    SCORE never appear contiguously in raw output."""
    text = re.sub(r"\x1bP.*?\x1b\\\\", "", out)
    text = re.sub(r"\x1b\[[0-9;?]*[A-Za-z]", "", text)
    return re.sub(r"\x1b\(B", "", text)


# -- layout engine thresholds -----------------------------------------------

def test_too_small_reports_minimum():
    lay = compute(20, 10)
    assert not lay.fits
    assert (lay.frame_cols, lay.frame_rows) == (20, 10)


def test_exact_fit_is_bare_centered_maze():
    lay = compute(28, 34)
    assert lay.fits
    assert lay.left is None and lay.right is None
    assert lay.status_y is None and lay.title_y is None
    assert (lay.maze_ox, lay.maze_oy) == (0, 0)


def test_panels_appear_at_documented_thresholds():
    assert compute(RIGHT_MIN_COLS - 1, 40).right is None
    assert compute(RIGHT_MIN_COLS, 40).right is not None
    assert compute(RIGHT_MIN_COLS, 40).left is None
    assert compute(LEFT_MIN_COLS - 1, 50).left is None
    full = compute(LEFT_MIN_COLS, 50)
    assert full.left is not None and full.right is not None


def test_strips_appear_at_documented_thresholds():
    assert compute(60, STATUS_MIN_ROWS - 1).status_y is None
    assert compute(60, STATUS_MIN_ROWS).status_y == STATUS_MIN_ROWS - 1
    assert compute(60, TITLE_MIN_ROWS - 1).title_y is None
    assert compute(60, TITLE_MIN_ROWS).title_y == 0


def test_composition_stays_centered_and_inside():
    for size in [(40, 40), (60, 40), (80, 50), (100, 44), (120, 50), (200, 70)]:
        lay = compute(*size)
        assert lay.fits
        assert 0 <= lay.maze_ox <= size[0] - COLS
        assert 0 <= lay.maze_oy <= size[1] - ROWS
        for rect in (r for r in (lay.left, lay.right) if r is not None):
            assert 0 <= rect.x and rect.x + rect.w <= size[0]
            assert rect.y == lay.maze_oy and rect.h == ROWS
            assert rect.x + rect.w <= lay.maze_ox or rect.x >= lay.maze_ox + COLS


def test_compute_never_raises_on_garbage():
    for bad in [(None, None), ("x", "y"), (-5, -5), (0, 0)]:
        lay = compute(*bad)
        assert not lay.fits


def test_describe_names_regions_and_thresholds():
    report = describe(compute(60, 40))
    assert "maze 28x34" in report and "hidden" in report
    assert str(LEFT_MIN_COLS) in report  # the hidden left panel says what it needs


# -- composer -----------------------------------------------------------------

def test_progress_bar_shape_and_clamps():
    assert _bar(5, 10, 10) == "[#####-----]"
    assert _bar(0, 10, 6) == "[------]"
    assert _bar(10, 10, 6) == "[######]"
    assert _bar(99, 10, 4) == "[####]"  # over-fill clamps, never lies
    assert _bar(0, 0, 4) == "[----]"


def test_minimum_canvas_is_cell_identical_to_scene():
    game = live_game()
    ref = paint_scene(game)
    full = paint_full(game, compute(28, 34))
    assert (full.cols, full.rows) == (COLS, ROWS)
    assert [c for c in full.cells] == [c for c in ref.cells]


def test_wide_canvas_blits_maze_verbatim_and_fills_frame():
    game = live_game()
    lay = compute(120, 50)
    ref = paint_scene(game)
    full = paint_full(game, lay)
    assert (full.cols, full.rows) == (120, 50)
    for y in range(ROWS):
        for x in range(COLS):
            assert full.get(lay.maze_ox + x, lay.maze_oy + y) == ref.get(x, y)


def test_dashboard_reflects_live_run_data():
    game = live_game()
    game.score = 12340
    scores = ScoreTable()
    scores.entries.append({"name": "ADA", "score": 9999, "level": 2, "mode": "classic"})
    full = paint_full(game, compute(120, 50), keymap=Keymap(), scores=scores)
    text = "\n".join("".join(full.get(x, y).glyph for x in range(full.cols))
                      for y in range(full.rows))
    assert "012340" in text  # zero-padded live score, not a placeholder
    assert "BEST ADA 9999" in text
    assert "CONTROLS" in text and "LEGEND" in text
    assert "PAC-MAN TERMINAL ARCADE" in text  # title strip on tall windows


def test_narrow_canvas_has_no_panels_but_keeps_hud():
    game = live_game()
    full = paint_full(game, compute(40, 40))
    assert (full.cols, full.rows) == (40, 40)
    text = "".join(c.glyph for c in full.cells)
    assert "SCORE" in text and "CONTROLS" not in text


def test_title_status_and_hints_are_per_screen():
    game = live_game()
    lay = compute(100, 44)
    app = ShellState(seed=3, audio=NullAudio())
    app.on_action("confirm")
    playing = app.paint(lay)
    app.on_action("pause")
    paused = app.paint(lay)
    assert (playing.cols, playing.rows) == (100, 44)
    assert (paused.cols, paused.rows) == (100, 44)
    flat = lambda fb: "\n".join("".join(fb.get(x, y).glyph for x in range(fb.cols))
                                for y in range(fb.rows))
    assert "PAUSED" in flat(paused) and "PAUSED" not in flat(playing)
    status_row = lay.status_y
    status = "".join(playing.get(x, status_row).glyph for x in range(playing.cols))
    assert "pause" in status.lower()


def test_title_card_uses_full_frame():
    app = ShellState(seed=3, audio=NullAudio())
    fb = app.paint(compute(100, 44))
    assert (fb.cols, fb.rows) == (100, 44)
    text = "\n".join("".join(fb.get(x, y).glyph for x in range(fb.cols))
                     for y in range(fb.rows))
    assert "P A C - M A N" in text


# -- play-loop wiring -----------------------------------------------------------

class ScriptTerminal:
    def __init__(self, chunks, sizes):
        self._chunks = list(chunks)
        self._sizes = list(sizes)

    def read_available(self):
        self._sizes.pop(0) if len(self._sizes) > 1 else None
        return self._chunks.pop(0) if self._chunks else b""

    def size(self):
        return self._sizes[0]


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now

    def sleep(self, seconds):
        self.now += seconds


def drive(chunks, sizes, max_frames=6):
    app = ShellState(seed=5, audio=NullAudio())
    term = ScriptTerminal(chunks, sizes)
    renderer = TieredRenderer(preference="unicode", env={})
    out, clock = [], FakeClock()
    frames = run(app, term, renderer, out.append, fps=30,
                 clock=clock, sleep=clock.sleep, max_frames=max_frames)
    return app, renderer, "".join(out), frames


def test_wide_run_presents_full_terminal_frames():
    app, renderer, out, frames = drive([b"\r", b"", b"", b"q"], [(100, 44)] * 8)
    assert frames > 3 and app.exited
    assert (renderer.cols, renderer.rows) == (100, 44)
    assert (renderer.ox, renderer.oy) == (0, 0)
    screen = visible_text(out)
    # Note: space cells equal BLANK so backends skip them; words read
    # without their blanks ("SCORE000000"), which still proves the HUD
    # and dashboard travel through the real backend path.
    assert "SCORE" in screen and "000000" in screen
    assert ansi.cup(1, 1) in out  # canvas addresses stay inside the window
    # Wide auto magnification: the 56-wide maze plus dashboard fills 100
    # cols, so the left legend panel (needs 108 cols at 2x) stays hidden.
    from shell.app import canvas_layout
    assert (canvas_layout(100, 44, "auto").maze_w,
            canvas_layout(100, 44, "auto").maze_h) == (56, 34)
    # Full chrome keeps the legend panel on roomy terminals.
    _app2, _, out2, _ = drive([b"\r", b"", b"", b"q"], [(120, 50)] * 8)
    assert "CONTROLS" in visible_text(out2)  # legend panel text through the backend


def test_mid_run_resize_relayouts_to_new_terminal():
    app, renderer, out, frames = drive(
        [b"\r", b"", b"", b"", b"q"],
        [(80, 40), (80, 40), (120, 50), (120, 50), (120, 50), (120, 50)])
    assert (renderer.cols, renderer.rows) == (120, 50)
    assert renderer.stats()["frame"] == (120, 50)


def test_too_small_card_reports_live_terminal_size():
    app, renderer, out, frames = drive([b"\r", b"q"], [(20, 10)] * 4,
                                       max_frames=4)
    assert app.game is None and app.exited
    assert (renderer.cols, renderer.rows) == (20, 10)


def test_layout_matrix_all_pass():
    failed = [row for row in verify_mod.layout_matrix(seed=1)
              if not row["passed"]]
    assert failed == []


def test_cli_layout_check_reports_regions(capsys):
    from shell.cli import main
    assert main(["--layout-check", "120x50"]) == 0
    out = capsys.readouterr().out
    assert "maze 56x34 at (30,8)" in out and "layout OK" in out


def test_cli_layout_check_rejects_garbage(capsys):
    from shell.cli import main
    assert main(["--layout-check", "huge"]) == 2
    assert "error" in capsys.readouterr().out.lower()
