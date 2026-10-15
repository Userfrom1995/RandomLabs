"""Remediation pins (issue #552 reopen): frame clearing, layout, live ghosts.

These tests encode the three owner-reported real-terminal defects so they
can never regress to green-while-broken:
  B1. kitty stale image placements (sprite trails) are erased per move,
      and sprite cells always carry a text underlay for terminals that
      cannot render images;
  B2. the canvas frame matches the terminal size and the composer places
      the maze plus side regions at layout offsets (no corner-cramming,
      no dead canvas); resizes re-init the backends at the new dims
      (no stale placements at old offsets);
  B3. (ghost displacement lives in test_ghosts.py: active hunters must
      roam tiles, not quiver at spawn).
"""

from render import ansi
from render.framebuffer import Cell, FrameBuffer
from render.kitty import KittyBackend, delete_at_cursor
from render.manager import TieredRenderer
from render.scene import COLS, ROWS, paint
from render.sixel import SixelBackend
from render.unicode import UnicodeBackend

FG = (255, 255, 0)
BG = (0, 0, 0)


def tiny_fb(sprite_at=None, sprite_id="player-right", glyph=">"):
    fb = FrameBuffer(4, 2)
    for y in range(2):
        for x in range(4):
            fb.set(x, y, Cell(".", (200, 200, 200), BG, None))
    if sprite_at is not None:
        x, y = sprite_at
        fb.set(x, y, Cell(glyph, FG, BG, sprite_id))
    return fb


def painted_game(seed=1, ticks=240):
    from engine.game import Game
    from engine import tuning
    game = Game(seed=seed)
    for _ in range(ticks):
        game.step(tuning.STEP)
        if not game.running:
            break
    return game


# -- B1: kitty stale-placement erase ------------------------------------

def test_kitty_erase_sequence_shape():
    seq = delete_at_cursor()
    assert "a=d" in seq and "d=c" in seq and "q=2" in seq


def test_kitty_sprite_departure_erases_placement():
    be = KittyBackend()
    be.init(4, 2)
    be.present(tiny_fb(sprite_at=(1, 0)), list(range(8)))
    out = be.present(tiny_fb(sprite_at=(2, 0)), list(range(8)))
    assert ansi.cup(1, 2) in out  # old cell addressed ...
    assert "a=d" in out and "d=c" in out  # ... and its placement erased
    assert "a=p" in out  # new cell placed


def test_kitty_sprite_swap_erases_before_placing():
    be = KittyBackend()
    be.init(4, 2)
    be.present(tiny_fb(sprite_at=(1, 0), sprite_id="player-right"), list(range(8)))
    out = be.present(tiny_fb(sprite_at=(1, 0), sprite_id="ghost-0"), list(range(8)))
    assert out.index("d=c") < out.index("a=p")  # erase lands before the new place


def test_kitty_sprite_arrival_needs_no_erase():
    be = KittyBackend()
    be.init(4, 2)
    be.present(tiny_fb(), list(range(8)))
    out = be.present(tiny_fb(sprite_at=(1, 0)), list(range(8)))
    assert "a=p" in out
    assert "d=c" not in out  # nothing was displayed there before


def test_kitty_sprite_cell_carries_text_underlay():
    be = KittyBackend()
    be.init(4, 2)
    out = be.present(tiny_fb(sprite_at=(1, 0)), list(range(8)))
    # The glyph is drawn as text AND the image is placed: terminals without
    # graphics support still show the actor.
    assert ">" in out and "a=p" in out


def test_kitty_clear_wipes_visible_placements():
    be = KittyBackend()
    be.init(4, 2)
    seq = be.clear()
    assert "a=d" in seq  # delete-all-visible precedes the text clear


# -- B2: centering + resize ----------------------------------------------

def test_center_origin_math():
    assert TieredRenderer.center_origin(80, 40, COLS, ROWS) == (26, 3)
    assert TieredRenderer.center_origin(28, 34, COLS, ROWS) == (0, 0)
    assert TieredRenderer.center_origin(20, 10, COLS, ROWS) == (0, 0)  # clamped


def test_unicode_origin_shifts_cursor_addresses():
    be = UnicodeBackend()
    be.init(4, 2)
    be.set_origin(10, 5)
    out = be.present(tiny_fb(), list(range(8)))
    assert ansi.cup(6, 11) in out  # cell (0,0) lands at row 1+5, col 1+10


def test_kitty_origin_shifts_text_and_placements():
    be = KittyBackend()
    be.init(4, 2)
    be.set_origin(10, 5)
    out = be.present(tiny_fb(sprite_at=(1, 0)), list(range(8)))
    assert ansi.cup(6, 12) in out  # sprite cell (1,0) -> row 6, col 12


def test_sixel_origin_shifts_raster_anchor():
    be = SixelBackend(min_interval_s=0.0)
    be.init(4, 2)
    be.set_origin(10, 5)
    out = be.present(tiny_fb(), list(range(8)))
    assert ansi.cup(6, 11) in out


def test_manager_init_centers_and_tracks_term_size():
    renderer = TieredRenderer(preference="unicode", env={})
    renderer.init(COLS, ROWS, 100, 44)
    assert (renderer.ox, renderer.oy) == (36, 5)
    assert (renderer.term_cols, renderer.term_rows) == (100, 44)
    stats = renderer.stats()
    assert stats["origin"] == (36, 5) and stats["term"] == (100, 44)


def test_manager_resize_same_size_is_noop():
    renderer = TieredRenderer(preference="unicode", env={})
    renderer.init(COLS, ROWS, 100, 44)
    assert renderer.resize(100, 44) == ""


def test_manager_resize_reinits_and_repaints_fully():
    # Canvas contract: the frame follows the live terminal size, so the
    # composer (not the renderer origin) places the maze. After a resize
    # the backend is re-inited at the new terminal dims with origin (0,0).
    renderer = TieredRenderer(preference="unicode", env={})
    renderer.init(80, 40, 80, 40)
    assert (renderer.ox, renderer.oy) == (0, 0)
    seq = renderer.resize(120, 50)
    assert seq  # setup bytes must be written (clear + alt-screen re-enter)
    assert (renderer.cols, renderer.rows) == (120, 50)
    assert (renderer.ox, renderer.oy) == (0, 0)
    fb = FrameBuffer(120, 50)
    fb.set(0, 0, Cell("X", FG, BG, None))
    out = renderer.present(fb, fb.dirty_cells())
    assert ansi.cup(1, 1) in out  # canvas cell (0,0) at the top-left corner


def test_manager_degrade_cleans_up_old_tier():
    renderer = TieredRenderer(preference="kitty", env={})
    renderer.init(COLS, ROWS, 80, 40)
    assert renderer.backend_name == "kitty"
    game = painted_game()
    fb = paint(game)
    renderer.present(fb, fb.dirty_cells())
    seq = renderer._degrade()
    assert renderer.backend_name == "sixel"  # kitty -> sixel -> unicode chain
    assert "a=d" in seq  # kitty placements wiped before the tier switch
    seq2 = renderer._degrade()
    assert renderer.backend_name == "unicode"
    assert seq2  # sixel cleanup + unicode init still returns setup bytes


def test_app_loop_resizes_with_terminal():
    from shell.app import ShellState, run
    from shell.audio import NullAudio
    from shell.input import Keymap

    class MovingTerm:
        def __init__(self):
            self.size_now = (80, 40)
            self.n = 0

        def read_available(self):
            self.n += 1
            if self.n == 3:
                self.size_now = (120, 50)
            return b""

        def size(self):
            return self.size_now

    class FakeRenderer:
        def __init__(self):
            self.term_cols = 0
            self.term_rows = 0
            self.resizes = []

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
            return "<bye>"

    class FakeClock:
        def __init__(self):
            self.now = 1000.0

        def __call__(self):
            return self.now

        def sleep(self, seconds):
            self.now += seconds

    app = ShellState(seed=5, keymap=Keymap(), audio=NullAudio())
    term, renderer, out, clock = MovingTerm(), FakeRenderer(), [], FakeClock()
    run(app, term, renderer, out.append, fps=30,
        clock=clock, sleep=clock.sleep, max_frames=6)
    assert renderer.resizes == [(120, 50)]
    assert "<resize>" in "".join(out)
