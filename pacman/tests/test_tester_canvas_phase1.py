"""Tester regression suite for Phase 1 fullscreen canvas (issue #552).

Durable pins authored by the Tester: the responsive-canvas contract must
hold from a black-box point of view across sizes, hostile inputs, and the
shipped CLI. Headless only (no tty needed); the play-loop drives use the
real shell/renderer path with scripted terminals.
"""

import re

import pytest

from engine import tuning
from engine.game import Game
from render.compose import _bar, paint_full
from render.layout import (LEFT_MIN_COLS, RIGHT_MIN_COLS, STATUS_MIN_ROWS,
                           TITLE_MIN_ROWS, compute, describe)
from render.manager import TieredRenderer
from render.scene import COLS, ROWS, paint as paint_scene
from shell import verify as verify_mod
from shell.app import ShellState, run
from shell.audio import NullAudio
from shell.input import Keymap
from shell.scores import ScoreTable


def live_game(seed=7, ticks=90):
    game = Game(seed=seed)
    for _ in range(ticks):
        game.step(tuning.STEP)
        if not game.running:
            break
    return game


# -- contract thresholds (black-box pins) ------------------------------------

def test_tester_exact_minimum_plays_as_before():
    lay = compute(COLS, ROWS)
    assert lay.fits
    assert (lay.maze_ox, lay.maze_oy) == (0, 0)
    assert lay.left is None and lay.right is None
    assert lay.status_y is None and lay.title_y is None


def test_tester_one_cell_short_is_too_small():
    assert not compute(COLS - 1, ROWS).fits
    assert not compute(COLS, ROWS - 1).fits
    assert not compute(20, 10).fits


def test_tester_documented_panel_thresholds():
    assert compute(RIGHT_MIN_COLS - 1, 40).right is None
    assert compute(RIGHT_MIN_COLS, 40).right is not None
    assert compute(RIGHT_MIN_COLS, 40).left is None
    assert compute(LEFT_MIN_COLS - 1, 50).left is None
    full = compute(LEFT_MIN_COLS, 50)
    assert full.left is not None and full.right is not None
    assert full.left.w == 22 and full.right.w == 26


def test_tester_documented_strip_thresholds():
    assert compute(60, STATUS_MIN_ROWS - 1).status_y is None
    assert compute(60, STATUS_MIN_ROWS).status_y == STATUS_MIN_ROWS - 1
    assert compute(60, TITLE_MIN_ROWS - 1).title_y is None
    assert compute(60, TITLE_MIN_ROWS).title_y == 0


def test_tester_reference_sizes_pin_origins():
    assert (compute(120, 50).maze_ox, compute(120, 50).maze_oy) == (44, 8)
    assert (compute(100, 44).maze_ox, compute(100, 44).maze_oy) == (34, 5)
    narrow = compute(40, 40)
    assert narrow.fits and narrow.left is None and narrow.right is None
    assert narrow.status_y == 39 and narrow.title_y == 0


def test_tester_composition_centered_and_inside_frame():
    for size in [(40, 40), (60, 40), (80, 50), (100, 44), (120, 50),
                 (160, 60), (200, 70), (999, 999)]:
        lay = compute(*size)
        assert lay.fits
        assert 0 <= lay.maze_ox <= size[0] - COLS
        assert 0 <= lay.maze_oy <= size[1] - ROWS
        for rect in (r for r in (lay.left, lay.right) if r is not None):
            assert 0 <= rect.x and rect.x + rect.w <= size[0]
            assert rect.y == lay.maze_oy and rect.h == ROWS


# -- hostile layout inputs (realistic garbage space) --------------------------

def test_tester_compute_survives_realistic_garbage():
    for bad in [(None, None), ("x", "y"), ("", ""), (-5, -5), (0, 0),
                (28, None), (None, 34), ([28], [34]), (-10**18, -10**18),
                (28.9, 33.7), (float("nan"), float("nan")),
                (True, True)]:
        lay = compute(*bad)
        assert not lay.fits


def test_tester_compute_coerces_numeric_strings():
    # int() coercion is the documented behavior: digit strings and digit
    # bytes that parse to >= 28x34 fit; this pins the coercion explicitly
    # instead of misfiling it as garbage.
    assert compute("28", "34").fits
    assert compute(b"28", b"34").fits
    assert not compute("x", "y").fits


@pytest.mark.xfail(reason="compute(float('inf')) raises OverflowError; "
                          "int(inf) is outside the caught (TypeError, "
                          "ValueError). Unreachable via real terminal sizes "
                          "(OS reports small ints) but the 'never raises' "
                          "docstring would want OverflowError caught too.")
def test_tester_compute_survives_infinite_size():
    lay = compute(float("inf"), float("inf"))
    assert not lay.fits


# -- composer verbatim parity --------------------------------------------------

def test_tester_minimum_frame_is_cell_identical_to_scene():
    game = live_game()
    ref = paint_scene(game)
    full = paint_full(game, compute(28, 34))
    assert (full.cols, full.rows) == (COLS, ROWS)
    assert [c for c in full.cells] == [c for c in ref.cells]


def test_tester_maze_blit_verbatim_on_every_chrome_size():
    game = live_game()
    ref = paint_scene(game)
    for size in [(40, 40), (60, 40), (80, 50), (100, 44), (120, 50)]:
        lay = compute(*size)
        full = paint_full(game, lay)
        assert (full.cols, full.rows) == size
        for y in range(ROWS):
            for x in range(COLS):
                assert full.get(lay.maze_ox + x, lay.maze_oy + y) == ref.get(x, y)


def test_tester_composer_survives_hostile_game_state():
    game = live_game()
    game.score = 10 ** 12
    game.level = 999
    game.lives = -5
    game.ghosts.start_fright(30.0)
    for theme in ("classic", "neon", "amber"):
        for flash in (False, True):
            for size in [(28, 34), (60, 40), (120, 50)]:
                lay = compute(*size)
                full = paint_full(game, lay, theme=theme,
                                  reduced_flash=flash, keymap=None,
                                  scores=None, hint=None)
                assert (full.cols, full.rows) == size
    ref = paint_scene(game)
    minimum = paint_full(game, compute(28, 34))
    assert [c for c in minimum.cells] == [c for c in ref.cells]


def test_tester_dashboard_shows_live_data_not_placeholders():
    game = live_game()
    game.score = 42420
    scores = ScoreTable()
    scores.entries.append({"name": "TST", "score": 7777, "level": 1,
                           "mode": "classic"})
    full = paint_full(game, compute(120, 50), keymap=Keymap(), scores=scores)
    text = "\n".join("".join(full.get(x, y).glyph for x in range(full.cols))
                      for y in range(full.rows))
    assert "042420" in text
    assert "BEST TST 7777" in text
    assert "CONTROLS" in text and "LEGEND" in text
    assert "PAC-MAN TERMINAL ARCADE" in text


def test_tester_progress_bar_never_lies():
    assert _bar(5, 10, 10) == "[#####-----]"
    assert _bar(-5, 10, 10) == "[----------]"
    assert _bar(15, 10, 10) == "[##########]"
    assert _bar(5, 0, 10) == "[----------]"


# -- shipped CLI: happy plus hostile paths -------------------------------------

def test_tester_cli_layout_check_reference_size(capsys):
    from shell.cli import main
    assert main(["--layout-check", "120x50"]) == 0
    out = capsys.readouterr().out
    assert "maze 28x34 at (44,8)" in out and "layout OK" in out


def test_tester_cli_layout_check_too_small(capsys):
    from shell.cli import main
    assert main(["--layout-check", "20x10"]) == 0
    out = capsys.readouterr().out
    assert "too small" in out and "layout OK" in out


def test_tester_cli_layout_check_rejects_garbage(capsys):
    from shell.cli import main
    assert main(["--layout-check", "huge"]) == 2
    assert "error" in capsys.readouterr().out.lower()
    assert main(["--layout-check", "0x0"]) == 0
    assert "too small" in capsys.readouterr().out


def test_tester_layout_matrix_all_green():
    failed = [row for row in verify_mod.layout_matrix(seed=1)
              if not row["passed"]]
    assert failed == []


def test_tester_describe_names_regions():
    report = describe(compute(120, 50))
    assert "maze 28x34 at (44,8)" in report
    assert "left panel" in report and "right panel" in report


# -- play-loop wiring: full frames, resize, too-small ---------------------------

class _ScriptTerminal:
    def __init__(self, chunks, sizes):
        self._chunks = list(chunks)
        self._sizes = list(sizes)

    def read_available(self):
        if len(self._sizes) > 1:
            self._sizes.pop(0)
        return self._chunks.pop(0) if self._chunks else b""

    def size(self):
        return self._sizes[0]


class _FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now

    def sleep(self, seconds):
        self.now += seconds


def _drive(chunks, sizes, max_frames=6):
    app = ShellState(seed=5, audio=NullAudio())
    term = _ScriptTerminal(chunks, sizes)
    renderer = TieredRenderer(preference="unicode", env={})
    out, clock = [], _FakeClock()
    frames = run(app, term, renderer, out.append, fps=30,
                 clock=clock, sleep=clock.sleep, max_frames=max_frames)
    return app, renderer, "".join(out), frames


def test_tester_wide_run_serves_full_terminal_frames():
    app, renderer, out, frames = _drive([b"\r", b"", b"", b"q"],
                                        [(100, 44)] * 8)
    assert frames > 3 and app.exited
    assert (renderer.cols, renderer.rows) == (100, 44)
    assert (renderer.ox, renderer.oy) == (0, 0)
    # Backends address every cell, so words never appear contiguously in
    # raw output; strip ANSI/DCS escapes first (same as the builder suite).
    screen = re.sub(r"\x1bP.*?\x1b\\\\", "", out)
    screen = re.sub(r"\x1b\[[0-9;?]*[A-Za-z]", "", screen)
    screen = re.sub(r"\x1b\(B", "", screen)
    assert "SCORE" in screen and "000000" in screen
    assert "CONTROLS" in screen


def test_tester_mid_run_resize_relayouts():
    app, renderer, out, frames = _drive(
        [b"\r", b"", b"", b"", b"q"],
        [(80, 40), (80, 40), (120, 50), (120, 50), (120, 50), (120, 50)])
    assert (renderer.cols, renderer.rows) == (120, 50)
    assert renderer.stats()["frame"] == (120, 50)


def test_tester_too_small_run_exits_cleanly():
    app, renderer, out, frames = _drive([b"\r", b"q"], [(20, 10)] * 4,
                                        max_frames=4)
    assert app.game is None and app.exited
    assert (renderer.cols, renderer.rows) == (20, 10)
