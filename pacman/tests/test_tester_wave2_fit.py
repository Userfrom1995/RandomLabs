"""Tester wave-2 regression pins (PR 579, issue #552 follow-up).

Durable black-box pins for the fullscreen-fit / text-clarity / level
/ packaging wave, written from live behavior (not implementation):
HUD renders once at 1x with no magnified-duplication artifacts, the
sy round-trip holds for large terminals, hostile dimensions never
raise, the too-small card (not a crash) answers tiny terminals, and
the CLI level/version contract holds end to end.
"""

import subprocess
import sys

import pytest

from engine import tuning
from engine.game import Game
from render import scale as scale_mod
from render.compose import cam_y, paint_full, paint_viewport
from render.scene import HUD_ROWS, paint as paint_scene
from shell.app import ShellState, canvas_layout

PACMAN = "pacman/pacman.py"


def live_game(seed=1, ticks=30):
    game = Game(seed=seed)
    for _ in range(ticks):
        game.step(tuning.STEP)
        if not game.running:
            break
    return game


def hud_text(frame, layout):
    rows = []
    for y in range(layout.maze_oy, layout.maze_oy + HUD_ROWS):
        rows.append("".join(
            frame.get(x, y).glyph
            for x in range(layout.maze_ox, layout.maze_ox + layout.maze_w)))
    return rows


# -- wave-2 core: HUD clarity --------------------------------------------

def test_tester_wave2_hud_exact_once_at_2x1():
    """100x44 (2x1): HUD text appears exactly once, never doubled."""
    game = live_game()
    lay = canvas_layout(100, 44, "auto")
    frame = paint_full(game, lay)
    rows = hud_text(frame, lay)
    assert any("SCORE" in r for r in rows)
    assert any("LEVEL" in r for r in rows)
    for r in rows:
        assert "SSCCOORREE" not in r
        assert "LLEEVVEELL" not in r
        assert "SCORESCORE" not in r


def test_tester_wave2_hud_exact_once_at_4x2():
    """200x80 (4x2): HUD still exact at 1x over the magnified playfield."""
    game = live_game()
    lay = canvas_layout(200, 80, "auto")
    frame = paint_full(game, lay)
    assert (frame.cols, frame.rows) == (200, 80)
    for r in hud_text(frame, lay):
        assert "SSCCOORREE" not in r
        assert "LLEEVVEELL" not in r


def test_tester_wave2_sy_roundtrip_large_terminal():
    """paint_full honors choose() at 200x80: full 4x2 box, not 31 rows."""
    from engine.maze import HEIGHT as _MAZE_H
    from render.scene import COLS
    picked = scale_mod.choose(200, 80, "auto")
    assert (picked.sx, picked.sy) == (4, 2)
    lay = canvas_layout(200, 80, "auto")
    assert (lay.maze_w, lay.maze_h) == (picked.maze_cols, picked.maze_rows)
    eff = (max(1, lay.maze_w // COLS),
           max(1, (lay.maze_h - HUD_ROWS) // _MAZE_H))
    assert eff == (picked.sx, picked.sy)
    frame = paint_full(live_game(), lay)
    ref = paint_scene(live_game())
    bottom_src = ref.get(0, HUD_ROWS + _MAZE_H - 1)
    got = frame.get(lay.maze_ox, lay.maze_oy + HUD_ROWS
                    + (_MAZE_H - 1) * eff[1])
    assert got.glyph == bottom_src.glyph


# -- wave-2 robustness ----------------------------------------------------

@pytest.mark.parametrize("bad", [float("inf"), float("nan"),
                                 None, "x", -5, 0.5, [], {}])
def test_tester_wave2_viewport_never_raises(bad):
    """Hostile dimensions coerce; paint_viewport always returns a frame."""
    game = live_game()
    for frame in (paint_viewport(game, bad, 24),
                  paint_viewport(game, 80, bad)):
        assert frame.cols >= 1
        assert frame.rows >= 1


def test_tester_wave2_cam_y_hostile():
    assert cam_y(float("inf"), float("inf")) == 0
    assert cam_y(None, None) == 0
    assert cam_y("x", "y") == 0


def test_tester_wave2_viewport_huge_dims_capped():
    """10**18 dims must not raise: the frame is ceiling-clamped."""
    from render.compose import MAX_VIEW_DIM
    game = live_game()
    wide = paint_viewport(game, 10 ** 18, 24)
    assert wide.rows == 24
    assert 1 <= wide.cols <= MAX_VIEW_DIM
    tall = paint_viewport(game, 80, 10 ** 18)
    assert tall.cols == 80
    assert 1 <= tall.rows <= MAX_VIEW_DIM


def test_tester_wave2_tiny_terminal_layout_not_full():
    """20x10 reports fits=False so the shell shows the too-small card."""
    lay = canvas_layout(20, 10, "auto")
    assert lay.fits is False
    assert lay.viewport is False


def test_tester_wave2_viewport_terminal_plays():
    """80x24 default resolves to the follow-cam viewport, not the card."""
    lay = canvas_layout(80, 24, "auto")
    assert lay.fits is True
    assert lay.viewport is True
    frame = paint_viewport(live_game(), 80, 24)
    assert frame.cols >= 1 and frame.rows >= 1


# -- wave-2 level + packaging contract ------------------------------------

def test_tester_wave2_cli_level_accept_and_reject():
    ok = subprocess.run(
        [sys.executable, PACMAN, "--level", "5",
         "--self-check", "--ticks", "10"],
        capture_output=True, text=True, timeout=60)
    assert ok.returncode == 0
    assert "level: 5" in ok.stdout
    bad = subprocess.run(
        [sys.executable, PACMAN, "--level", "0", "--self-check"],
        capture_output=True, text=True, timeout=60)
    assert bad.returncode != 0 or "must be >= 1" in (bad.stdout + bad.stderr)


def test_tester_wave2_cli_version():
    out = subprocess.run(
        [sys.executable, PACMAN, "--version"],
        capture_output=True, text=True, timeout=60)
    assert out.returncode == 0
    assert "1.0.0" in out.stdout


def test_tester_wave2_shell_state_level_defaults_sane():
    assert ShellState(level=1).level == 1


def test_tester_wave2_verify_matrix_green():
    out = subprocess.run(
        [sys.executable, PACMAN, "--verify"],
        capture_output=True, text=True, timeout=300)
    assert out.returncode == 0
    assert "verify: 106/106 passed" in out.stdout
