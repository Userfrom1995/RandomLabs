"""Phase 3 tiered renderer: atlas, scene parity, backend conformance, watchdog."""

import pytest

from engine.game import Game
from render import ansi
from render.atlas import (
    KNOWN_SPRITES, SIZE_PX, image_id, png_for,
)
from render.framebuffer import Cell, FrameBuffer
from render.kitty import KittyBackend, place_image
from render.manager import TieredRenderer, make_backend
from render.scene import COLS, ROWS, paint, sprite_ids_in, wall_glyph
from render.sixel import SixelBackend, dcs_wrap, encode_indexed


def red_cell(glyph, sprite=None):
    return Cell(glyph, (255, 0, 0), (0, 0, 0), sprite)


def painted_game(seed=1, ticks=0):
    game = Game(seed=seed)
    for _ in range(ticks):
        game.step(1.0 / 120.0)
    return game


# -- atlas ------------------------------------------------------------

def test_atlas_deterministic_and_cached():
    a = png_for("ghost-0")
    b = png_for("ghost-0")
    assert a == b and a[:8] == b"\x89PNG\r\n\x1a\n"
    assert png_for("ghost-0") is png_for("ghost-0")  # cache hit, same object
    assert png_for("ghost-1") != png_for("ghost-0")
    assert png_for("player-left") != png_for("player-right")


def test_atlas_rejects_unknown_and_tiny():
    with pytest.raises(ValueError):
        png_for("mario")
    with pytest.raises(ValueError):
        image_id("mario")
    with pytest.raises(ValueError):
        png_for("ghost-0", size_px=4)
    assert len({image_id(s) for s in KNOWN_SPRITES}) == len(KNOWN_SPRITES)


def test_atlas_needs_pillow_says_so(monkeypatch):
    import render.atlas as atlas_mod
    monkeypatch.setattr(atlas_mod, "available", lambda: False)
    assert not atlas_mod.available()
    # draw path without Pillow raises an actionable error
    import builtins
    real_import = builtins.__import__

    def no_pil(name, *args, **kwargs):
        if name == "PIL" or name.startswith("PIL."):
            raise ImportError("No module named 'PIL'")
        return real_import(name, *args, **kwargs)

    atlas_mod.clear_cache()
    monkeypatch.setattr(builtins, "__import__", no_pil)
    try:
        with pytest.raises(RuntimeError):
            png_for("ghost-2")
    finally:
        atlas_mod.clear_cache()


# -- scene ------------------------------------------------------------

def test_scene_dims_and_hud():
    fb = paint(painted_game())
    assert (fb.cols, fb.rows) == (COLS, ROWS) == (28, 34)
    top = "".join(fb.get(x, 0).glyph for x in range(COLS))
    assert top.startswith("SCORE 000000") or top.startswith("SCORE")
    assert "LEVEL 01" in top
    row2 = "".join(fb.get(x, 2).glyph for x in range(COLS))
    assert "READY" in row2  # tick 0 warmup banner


def test_scene_dots_match_maze():
    from engine.actors import tile_of
    game = painted_game()
    fb = paint(game)
    occupied = {tile_of(game.player.x, game.player.y)}
    for ghost in game.ghosts.ghosts:
        occupied.add(tile_of(ghost.actor.x, ghost.actor.y))
    covered_dots = sum(1 for (x, y) in occupied if game.maze.has_dot(x, y))
    maze_cells = [fb.cells[(y + 3) * COLS + x] for y in range(31) for x in range(COLS)]
    dots = sum(1 for c in maze_cells if c.glyph == ".")
    # actors paint over the maze, so covered uneaten dots are hidden exactly
    assert dots == game.maze.dots_remaining - covered_dots
    energizers = sum(1 for c in maze_cells if c.glyph == "O" and c.sprite is None)
    assert energizers <= game.maze.energizers_remaining  # blink may hide them


def test_scene_sprites_known_and_parity_positions():
    game = painted_game(seed=3, ticks=240)
    fb = paint(game)
    for sid in sprite_ids_in(fb):
        assert sid in KNOWN_SPRITES
    # every backend sees the same sprite cells at the same indices
    sprite_idx = {i for i, c in enumerate(fb.cells) if c.sprite is not None}
    assert sprite_idx  # player plus at least one ghost
    unicode_be, kitty_be = make_backend("unicode"), make_backend("kitty")
    unicode_be.init(COLS, ROWS)
    kitty_be.init(COLS, ROWS)
    fb_a, fb_b = paint(game), paint(game)
    u_out = unicode_be.present(fb_a, fb_a.dirty_cells())
    k_out = kitty_be.present(fb_b, fb_b.dirty_cells())
    for i in sprite_idx:
        x, y = i % COLS, i // COLS
        assert ansi.cup(y + 1, x + 1) in k_out  # kitty anchors at the same cell
    # glyph cells land on the same cursor addresses in both backends
    sample = next(i for i, c in enumerate(fb.cells) if c.sprite is None and c.glyph == ".")
    x, y = sample % COLS, sample // COLS
    assert ansi.cup(y + 1, x + 1) in u_out
    assert ansi.cup(y + 1, x + 1) in k_out


def test_scene_wall_glyphs_deterministic():
    game = painted_game()
    assert paint(game).cells == paint(game).cells
    assert wall_glyph(game.maze, 0, 0) == wall_glyph(game.maze, 0, 0)
    walls = [c for c in paint(game).cells if c.fg == (33, 33, 222)]
    assert walls and all(c.glyph in "#|-+" for c in walls)


def test_scene_fright_and_eyes_cells():
    game = painted_game(seed=1)
    game.ghosts.start_fright(6.0)
    fb = paint(game)
    fright = [c for c in fb.cells if c.sprite in ("ghost-fright", "ghost-fright-flash")]
    assert fright  # active ghosts render blue while frightened


# -- kitty conformance ------------------------------------------------

def test_kitty_full_backend_conformance():
    be = KittyBackend()
    assert be.available()
    assert be.name == "kitty"
    assert ansi.ALT_ENTER in be.init(COLS, ROWS)
    fb = paint(painted_game())
    first = be.present(fb, fb.dirty_cells())
    assert first.count("a=T") == len(sprite_ids_in(paint(painted_game())))
    assert "a=p" in first
    fb2 = paint(painted_game())
    second = be.present(fb2, fb2.dirty_cells())
    assert "a=T" not in second  # transmit-once: steady frames place only
    assert ansi.SYNC_BEGIN in second and ansi.SYNC_END in second
    with pytest.raises(ValueError):
        be.present(FrameBuffer(1, 1), [0])
    shut = be.shutdown()
    assert ansi.ALT_EXIT in shut and shut.count("a=d") >= 1


def test_kitty_place_is_cursor_anchored_and_deterministic():
    assert place_image(1, 2, 3) == place_image(1, 2, 3)
    be = KittyBackend()
    be.init(4, 4)
    be.transmit_atlas(b"\x89PNG-fake", 3, 16, 16)
    seq = be.place(3, 2, 1)
    assert "a=p" in seq and "i=3" in seq
    assert ansi.cup(2, 3) in seq
    with pytest.raises(ValueError):
        be.place(99, 0, 0)


# -- sixel conformance ------------------------------------------------

class FakeClock:
    def __init__(self):
        self.t = 1000.0

    def __call__(self):
        return self.t


def test_encode_indexed_roundtrip_shape():
    palette = [(0, 0, 0), (255, 255, 255)]
    pixels = [0, 1, 0, 1, 1, 0] * 2  # 6 cols x 2 rows
    payload = encode_indexed(pixels, 6, 2, palette)
    assert payload.startswith("#0;2;0;0;0#1;2;100;100;100")
    assert payload.endswith("\x1b\\") is False  # unwrapped payload
    assert "#" in payload and "!" in payload  # palette plus RLE runs


def test_sixel_backend_fps_cap_and_framing():
    clock = FakeClock()
    be = SixelBackend(min_interval_s=0.1, clock=clock, cell_px=4)
    assert be.available() and be.name == "sixel"
    be.init(6, 4)
    fb = FrameBuffer(6, 4)
    fb.set(0, 0, red_cell("X"))
    first = be.present(fb, fb.dirty_cells())
    assert first.startswith(ansi.SYNC_BEGIN)
    assert "\x1bPq" in first and first.endswith(ansi.SYNC_END)
    assert be.frames == 1
    fb.set(1, 0, red_cell("Y"))
    assert be.present(fb, fb.dirty_cells()) == ""  # capped: coalesced
    assert be.coalesced == 1
    clock.t += 0.2
    fb.set(2, 0, red_cell("Z"))
    third = be.present(fb, fb.dirty_cells())
    assert "\x1bPq" in third and be.frames == 2
    with pytest.raises(ValueError):
        be.present(FrameBuffer(2, 2), [0])
    assert dcs_wrap("ab") == "\x1bPqab\x1b\\"


def test_sixel_backend_renders_sprites_without_pillow_error():
    clock = FakeClock()
    be = SixelBackend(min_interval_s=0, clock=clock, cell_px=6)
    be.init(COLS, ROWS)
    fb = paint(painted_game(seed=5, ticks=60))
    out = be.present(fb, fb.dirty_cells())
    assert "\x1bPq" in out and len(out) > 1000


# -- manager / watchdog -----------------------------------------------

def test_make_backend_vocabulary():
    assert make_backend("kitty").name == "kitty"
    assert make_backend("sixel").name == "sixel"
    assert make_backend("unicode").name == "unicode"
    with pytest.raises(ValueError):
        make_backend("curses")


def test_manager_prefers_override_and_falls_back():
    r = TieredRenderer(preference="unicode")
    assert r.choice == "unicode"
    init_seq = r.init(COLS, ROWS)
    assert ansi.ALT_ENTER in init_seq
    assert r.backend_name == "unicode"
    fb = paint(painted_game())
    assert ansi.SYNC_BEGIN in r.present(fb, fb.dirty_cells())
    assert r.stats()["errors"] == 0


def test_manager_degrades_on_backend_error():
    from render import manager as manager_mod

    class Flaky:
        name = "kitty"
        attempts = 0

        def available(self):
            return True

        def init(self, cols, rows):
            return "init"

        def present(self, fb, dirty):
            type(self).attempts += 1
            raise RuntimeError("terminal said no")

    real_make = manager_mod.make_backend

    def fake_make(name, clock=None):
        if name == "kitty":
            return Flaky()
        return real_make(name, clock=clock)

    import unittest.mock as mock
    with mock.patch.object(manager_mod, "make_backend", side_effect=fake_make):
        r = TieredRenderer(preference="kitty")
        r.init(COLS, ROWS)
        assert r.backend_name == "kitty"
        fb = paint(painted_game())
        out = r.present(fb, fb.dirty_cells())  # must not raise
        assert r.backend_name in ("sixel", "unicode")
        assert r.degraded_from == ["kitty"]
        assert r.stats()["errors"] == 1


def test_manager_slow_frame_watchdog():
    from render import manager as manager_mod

    class Slow:
        name = "kitty"

        def __init__(self, clock):
            self._clock = clock

        def available(self):
            return True

        def init(self, cols, rows):
            self.cols, self.rows = cols, rows
            return "init"

        def present(self, fb, dirty):
            self._clock.t += 1.0  # every frame looks slow
            return "slow-frame"

    clock = FakeClock()
    real_make = manager_mod.make_backend

    def fake_make(name, clock=None):
        if name == "kitty":
            return Slow(clock or time_monotonic())
        return real_make(name, clock=clock)

    def time_monotonic():
        return clock()

    import time as time_mod
    import unittest.mock as mock
    with mock.patch.object(manager_mod, "make_backend", side_effect=fake_make):
        r = TieredRenderer(preference="kitty", clock=clock)
        manager_mod.time.monotonic = clock
        try:
            r.init(COLS, ROWS)
            fb = paint(painted_game())
            r.present(fb, fb.dirty_cells())
            assert r.backend_name == "kitty"  # one strike is not enough
            r.present(fb, fb.dirty_cells())
            assert r.backend_name in ("sixel", "unicode")
            assert r.degraded_from == ["kitty"]
        finally:
            manager_mod.time.monotonic = time_mod.monotonic


def test_manager_present_before_init_rejected():
    with pytest.raises(ValueError):
        TieredRenderer(preference="unicode").present(FrameBuffer(2, 2), [0])


# -- CLI ---------------------------------------------------------------

def test_render_check_reports_bytes(capsys):
    from shell.cli import main
    assert main(["--render-check", "--renderer", "unicode", "--ticks", "60"]) == 0
    out = capsys.readouterr().out
    assert "renderer: unicode" in out and "render OK" in out
    assert "full-frame-bytes:" in out and "steady-frame-bytes:" in out


def test_render_bench_table(capsys):
    from shell.cli import main
    assert main(["--render-bench", "--frames", "4"]) == 0
    out = capsys.readouterr().out
    assert "unicode" in out and "fps" in out and "bench OK" in out


def test_render_check_honors_renderer_override(capsys):
    from shell.cli import main
    assert main(["--render-check", "--renderer", "kitty", "--ticks", "30"]) == 0
    assert "renderer: kitty" in capsys.readouterr().out
