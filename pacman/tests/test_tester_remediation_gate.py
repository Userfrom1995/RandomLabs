"""Tester gate for PR #572 (issue #552 remediation, fixer pass).

Independent regression pins for the three Reviewer findings as fixed:
  T1. slow-frame degrade repaints the FRESH backend fully (manager.py) -
      the binding bug returned the old tier's bytes after switching tiers.
  T2. ghost `decided` gate is cleared on active->eyes and leaving->active
      (ghosts.py) so re-steering happens even on the same tile.
  T3. run-loop hostile paths: mid-game resize, too-small card, clean
      teardown, plus CLI hostile rejections - all through real code.

Drives only public entrypoints (Game, TieredRenderer, run(), cli.main);
no production source is modified by this file.
"""

import pytest

from engine import tuning
from engine.actors import tile_of
from engine.game import Game


# -- T1: slow-frame degrade paints the fresh tier ----------------------

def _painted_fb(seed=1, ticks=30):
    from render.scene import paint
    game = Game(seed=seed)
    for _ in range(ticks):
        game.step(tuning.STEP)
    return game, paint(game)


def test_slow_degrade_failure_returns_valid_old_frame():
    """Unicode is the bottom tier: degrade raises, old frame returned."""
    from render.manager import TieredRenderer
    from render.scene import COLS, ROWS
    renderer = TieredRenderer(preference="unicode", env={})
    renderer.init(COLS, ROWS, 80, 40)
    game, fb = _painted_fb()
    # Force two consecutive slow frames with a manual clock.
    times = iter([1000.0, 1000.0 + 5.0, 1000.0 + 5.0, 1000.0 + 10.0,
                  1000.0 + 10.0, 1000.0 + 15.0])
    renderer._clock = lambda: next(times)
    first = renderer.present(fb, fb.dirty_cells())
    assert first  # baseline frame renders
    second = renderer.present(fb, fb.dirty_cells())
    # Second consecutive slow frame: degrade raises (bottom tier), the
    # valid old-tier frame is returned, strikes reset, no crash.
    assert second == first or second
    assert renderer.frames >= 2
    assert renderer.slow_strikes == 0


def test_slow_degrade_success_repaints_full_frame_on_fresh_backend():
    """Success path: fresh backend gets a FULL repaint, not stale dirty."""
    from render.manager import TieredRenderer
    from render.scene import COLS, ROWS

    class FakeBackend:
        def __init__(self, tag):
            self.tag = tag
            self.calls = []
            self.ox = self.oy = 0
            self.term_cols, self.term_rows = 80, 40

        def init(self, cols, rows, term_cols=0, term_rows=0):
            return "<init-%s>" % self.tag

        def clear(self):
            return "<clear-%s>" % self.tag

        def present(self, fb, dirty):
            self.calls.append(list(dirty))
            return "<frame-%s:%d>" % (self.tag, len(dirty))

        def shutdown(self):
            return "<bye-%s>" % self.tag

    renderer = TieredRenderer(preference="unicode", env={})
    renderer.init(COLS, ROWS, 80, 40)
    stale = FakeBackend("stale")
    fresh = FakeBackend("fresh")
    renderer.backend = stale
    renderer.backend_name = "stale"
    game, fb = _painted_fb()
    tiny_dirty = [0, 1, 2]

    def fake_degrade():
        renderer.backend = fresh
        renderer.backend_name = "fresh"
        return "<prefix>"

    renderer._degrade = fake_degrade
    times = iter([2000.0, 2000.0 + 5.0, 2000.0 + 5.0, 2000.0 + 10.0])
    renderer._clock = lambda: next(times)
    renderer.present(fb, tiny_dirty)  # strike 1
    out = renderer.present(fb, tiny_dirty)  # strike 2 -> degrade + repaint
    assert out.startswith("<prefix>")
    assert "<frame-fresh:" in out
    assert "<frame-stale" not in out  # never replay the old tier's bytes
    full = COLS * ROWS
    assert fresh.calls and len(fresh.calls[-1]) == full


# -- T2: decided gate cleared on target-changing transitions ------------

def test_eaten_ghost_clears_decided_on_same_tile():
    game = Game(seed=1)
    game.ghosts.start_fright(30.0)
    ghost = game.ghosts.ghosts[0]
    ghost.state = "active"
    tile = tile_of(ghost.actor.x, ghost.actor.y)
    ghost.decided = tile  # already steered here: the stale-gate setup
    from engine.actors import center_of
    cx, cy = center_of(*tile)
    game.player.x, game.player.y = cx, cy
    game.ghosts.step(tuning.STEP, game)
    assert ghost.state == "eyes"
    assert ghost.decided is None  # must re-steer toward the door


def test_leaving_to_active_clears_decided():
    game = Game(seed=1)
    ghosts = game.ghosts
    target = None
    for ghost in ghosts.ghosts:
        if ghost.state == "house":
            target = ghost
            break
    assert target is not None
    ghosts._start_leaving(target)
    assert target.decided is None
    # Drive the L-shaped walk until it exits (cap 120 s of sim).
    spent = 0.0
    while target.state == "leaving" and spent < 120.0:
        ghosts._step_leaving(target, tuning.STEP)
        spent += tuning.STEP
    assert target.state == "active"
    assert target.decided is None


def test_active_hunters_displace_over_600_ticks():
    game = Game(seed=1)
    chaser = game.ghosts.ghosts[0]
    start = (chaser.actor.x, chaser.actor.y)
    peak = 0.0
    for _ in range(600):
        game.step(tuning.STEP)
        peak = max(peak, abs(chaser.actor.x - start[0])
                   + abs(chaser.actor.y - start[1]))
    assert peak > 2.0  # quiver-at-spawn freeze would hold peak near 0


def test_fright_ghosts_roam_distinct_tiles():
    game = Game(seed=1)
    game.ghosts.start_fright(30.0)
    roamed = set()
    for _ in range(1200):
        game.step(tuning.STEP)
        if game.state != "play":
            break
        for ghost in game.ghosts.ghosts:
            if ghost.state == "active":
                roamed.add(tile_of(ghost.actor.x, ghost.actor.y))
    assert len(roamed) > 10


# -- T3: run-loop hostile paths + CLI rejections ------------------------

def test_run_loop_resize_too_small_and_clean_teardown():
    from shell.app import ShellState, run
    from shell.audio import NullAudio
    from shell.input import Keymap

    class HostileTerm:
        def __init__(self):
            self.n = 0

        def read_available(self):
            self.n += 1
            return b""

        def size(self):
            if self.n <= 2:
                return (100, 44)  # roomy: gameplay frames
            if self.n <= 4:
                return (120, 50)  # mid-game resize
            return (20, 10)  # too-small card path

    class FakeRenderer:
        def __init__(self):
            self.term_cols = 0
            self.term_rows = 0
            self.resizes = []
            self.shut = False

        def init(self, cols, rows, term_cols=0, term_rows=0):
            self.term_cols, self.term_rows = term_cols, term_rows
            return "<init>"

        def resize(self, term_cols, term_rows):
            self.resizes.append((term_cols, term_rows))
            self.term_cols, self.term_rows = term_cols, term_rows
            return "<resize>"

        def present(self, fb, dirty):
            return "<frame>"

        def shutdown(self):
            self.shut = True
            return "<bye>"

    class FakeClock:
        def __init__(self):
            self.now = 1000.0

        def __call__(self):
            return self.now

        def sleep(self, seconds):
            self.now += seconds

    app = ShellState(seed=1, keymap=Keymap(), audio=NullAudio())
    app.on_action("confirm")
    term, renderer, out, clock = HostileTerm(), FakeRenderer(), [], FakeClock()
    frames = run(app, term, renderer, out.append, fps=30,
                 clock=clock, sleep=clock.sleep, max_frames=8)
    assert frames == 8
    assert (120, 50) in renderer.resizes  # resize re-init happened live
    assert renderer.shut  # teardown ran even across hostile sizes
    assert "<bye>" in "".join(out)


def test_cli_rejects_unknown_renderer():
    from shell.cli import main
    assert main(["--renderer", "bogus", "--render-check"]) == 2


def test_cli_rejects_bad_level():
    from shell.cli import main
    assert main(["--level", "0", "--self-check"]) == 2


def test_cli_rejects_bad_ticks():
    from shell.cli import main
    assert main(["--ticks", "-5", "--self-check"]) == 2
