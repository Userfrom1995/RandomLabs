"""Tester-authored hostile regression suite for Phase 3 tiered renderer.

Adversarial angle: the Builder/Fixer suites prove the happy path; these
tests attack the never-raises contract, the CLI error surface, and the
coalescing path with a reused buffer (the exact shape that dropped pixels
before the fix). All drive the real entrypoint/backends, not mocks.
"""

import subprocess
import sys

import pytest

from render.framebuffer import Cell
from render.manager import TieredRenderer
from render.scene import COLS, ROWS, paint
from render.sixel import SixelBackend
from engine import tuning
from engine.game import Game


def live_cli(*argv):
    """Run the shipped launcher exactly as an end user would."""
    return subprocess.run(
        [sys.executable, "pacman/pacman.py"] + list(argv),
        capture_output=True, text=True, timeout=120,
    )


def test_cli_render_check_default_unicode():
    proc = live_cli("--render-check", "--ticks", "20")
    assert proc.returncode == 0, proc.stderr
    assert "render OK" in proc.stdout
    assert "renderer: unicode" in proc.stdout


def test_cli_render_check_kitty_under_env():
    import os
    env = dict(os.environ, KITTY_WINDOW_ID="1234")
    proc = subprocess.run(
        [sys.executable, "pacman/pacman.py", "--render-check", "--ticks", "20"],
        capture_output=True, text=True, timeout=120, env=env,
    )
    assert proc.returncode == 0, proc.stderr
    assert "choice: kitty" in proc.stdout


def test_cli_hostile_unknown_renderer_exits_2_no_traceback():
    proc = live_cli("--render-check", "--renderer", "bogus")
    assert proc.returncode == 2
    assert "traceback" not in proc.stderr.lower()
    assert "unknown renderer" in proc.stdout.lower()


def test_cli_hostile_bad_flags_exit_2():
    for argv in (["--self-check", "--level", "0"],
                 ["--self-check", "--ticks", "0"],
                 ["--render-bench", "--frames", "0"]):
        proc = live_cli(*argv)
        assert proc.returncode == 2, argv
        assert "traceback" not in proc.stderr.lower()


def test_cli_bench_reports_real_raster_bytes():
    proc = live_cli("--render-bench", "--frames", "5")
    assert proc.returncode == 0, proc.stderr
    assert "bench OK" in proc.stdout
    # unthrottled bench must rasterize: sixel full frame is tens of KB,
    # a throttled ''-coalesced bench would print near-zero steady bytes.
    for line in proc.stdout.splitlines():
        if line.startswith("sixel"):
            steady = int(line.split()[-1])
            assert steady > 1000, "sixel bench looks throttled: %r" % line


def test_hostile_present_before_init_raises_valueerror():
    r = TieredRenderer(preference="unicode")
    with pytest.raises(ValueError):
        r.present(None, [])


def test_hostile_faulty_clock_never_raises():
    r = TieredRenderer(preference="unicode")
    r.init(COLS, ROWS)
    r._clock = lambda: 1 / 0
    game = Game(seed=1)
    game.step(tuning.STEP)
    fb = paint(game)
    assert r.present(fb, fb.dirty_cells()) == ""
    assert r.errors >= 1 and r.dropped >= 1


def test_hostile_unicode_chain_is_terminal():
    assert TieredRenderer(preference="unicode").chain == ["unicode"]
    assert TieredRenderer(preference="sixel").chain[-1] == "unicode"
    assert TieredRenderer(preference="kitty").chain[-1] == "unicode"


def test_hostile_coalesced_pixels_survive_on_reused_buffer():
    t = [0.0]
    backend = SixelBackend(clock=lambda: t[0])
    backend.min_interval = 10.0
    game = Game(seed=7)
    game.step(tuning.STEP)
    fb = paint(game)
    backend.init(COLS, ROWS)
    assert len(backend.present(fb, fb.dirty_cells())) > 1000
    fb.set(1, 1, Cell("@", (255, 0, 0), (0, 0, 0), None))
    assert backend.present(fb, fb.dirty_cells()) == ""
    assert len(fb.dirty_cells()) > 0  # dirty must be kept, not wiped
    t[0] += 99
    assert len(backend.present(fb, fb.dirty_cells())) > 1000
    assert backend._last.cells[1 * COLS + 1] == fb.cells[1 * COLS + 1]
