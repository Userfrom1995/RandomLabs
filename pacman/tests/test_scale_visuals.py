"""Scaled visuals (issue #552 canvas wave Phase 2): magnification, effects, themes.

Pins the fullscreen-magnification contract headlessly: integer scale
selection, magnified blits with image-backend spans, tick-driven
animation frames, and the six-theme registry with wall styles.
"""

import pytest

from engine import tuning
from engine.game import Game
from render import effects as fx
from render import scale as scale_mod
from render import themes
from render.atlas import KNOWN_SPRITES, image_id, png_for
from render.compose import paint_full
from render.layout import compute, compute_scaled
from render.scene import COLS, HUD_ROWS, ROWS, PLAYER_SPRITE_CLOSED
from render.scene import paint as paint_scene
from render.scene import sprite_ids_in, wall_glyph
from shell import verify as verify_mod
from shell.app import ShellState, canvas_layout
from shell.audio import NullAudio


def live_game(seed=1, ticks=30):
    game = Game(seed=seed)
    for _ in range(ticks):
        game.step(tuning.STEP)
        if not game.running:
            break
    return game


# -- scale engine --------------------------------------------------------

def test_scale_modes_pinned():
    assert (scale_mod.choose(28, 34, "classic").sx,
            scale_mod.choose(28, 34, "classic").sy) == (1, 1)
    assert (scale_mod.choose(200, 80, "classic").sx,
            scale_mod.choose(200, 80, "classic").sy) == (1, 1)
    assert scale_mod.choose(80, 50, "wide").sx == 2
    assert scale_mod.choose(40, 40, "wide").sx == 1
    assert (scale_mod.choose(40, 80, "full").sx,
            scale_mod.choose(40, 80, "full").sy) == (1, 2)
    assert (scale_mod.choose(200, 80, "auto").sx,
            scale_mod.choose(200, 80, "auto").sy) == (4, 2)
    assert (scale_mod.choose(120, 50, "auto").sx,
            scale_mod.choose(120, 50, "auto").sy) == (2, 1)


def test_scale_never_raises_and_check_validates():
    assert scale_mod.choose(None, None).sx == 1
    assert scale_mod.choose("wide", -5, "wide").sx == 1
    assert scale_mod.choose(120, 50, "hologram").sx == 1
    assert scale_mod.describe(scale_mod.choose(120, 50, "auto")).startswith(
        "scale auto: 2x1")
    with pytest.raises(ValueError):
        scale_mod.check("hologram")
    assert scale_mod.check("wide") == "wide"
    assert scale_mod.fits(120, 50, 2, 1)
    assert not scale_mod.fits(40, 40, 2, 1)


def test_scaled_layout_centers_magnified_maze():
    lay = compute_scaled(120, 50, 56, 34)
    assert lay.fits and (lay.maze_ox, lay.maze_oy) == (30, 8)
    assert lay.right is not None and lay.left is not None
    assert compute_scaled(28, 34, 28, 34) == compute(28, 34)
    overflow = compute_scaled(28, 34, 56, 34)
    assert overflow.viewport and overflow.fits


def test_canvas_layout_helper_picks_scale():
    assert (canvas_layout(28, 34, "auto").maze_w,
            canvas_layout(28, 34, "auto").maze_h) == (28, 34)
    assert (canvas_layout(120, 50, "auto").maze_w,
            canvas_layout(120, 50, "auto").maze_h) == (56, 34)
    assert (canvas_layout(120, 50, "classic").maze_w,
            canvas_layout(120, 50, "classic").maze_h) == (28, 34)


# -- magnification blit --------------------------------------------------

def test_wide_blit_preserves_cells_and_records_spans():
    game = live_game()
    ref = paint_scene(game)
    lay = compute_scaled(120, 50, 56, 34)
    wide = paint_full(game, lay)
    assert (wide.cols, wide.rows) == (120, 50)
    hx = lay.maze_ox + (56 - COLS) // 2
    for r in range(HUD_ROWS):  # HUD text stays 1x: no duplicated letters
        for x in range(COLS):
            assert wide.get(hx + x, lay.maze_oy + r) == ref.get(x, r)
    for my in range(ROWS - HUD_ROWS):  # only the maze playfield magnifies
        for mx in range(COLS):
            origin = wide.get(lay.maze_ox + mx * 2, lay.maze_oy + HUD_ROWS + my)
            assert origin == ref.get(mx, my + HUD_ROWS)
            filler = wide.get(lay.maze_ox + mx * 2 + 1,
                              lay.maze_oy + HUD_ROWS + my)
            assert filler.glyph == ref.get(mx, my + HUD_ROWS).glyph
            assert filler.sprite is None
    for i, cell in enumerate(ref.cells):
        if cell.sprite is not None and i >= HUD_ROWS * COLS:
            idx = ((lay.maze_oy + HUD_ROWS + i // COLS - HUD_ROWS)
                   * wide.cols + lay.maze_ox + (i % COLS) * 2)
            assert wide.spans.get(idx) == (2, 1)


def test_kitty_emits_multisize_placements_for_wide_frame():
    pytest.importorskip("PIL")
    from render.manager import make_backend
    game = live_game()
    lay = compute_scaled(120, 50, 56, 34)
    wide = paint_full(game, lay)
    kitty = make_backend("kitty")
    kitty.init(120, 50)
    out = kitty.present(wide, wide.dirty_cells())
    assert "c=2" in out and "a=p" in out
    steady = kitty.present(paint_full(game, lay), [])
    assert "a=p" not in steady


def test_sixel_and_unicode_present_wide_frames():
    from render.manager import make_backend
    game = live_game()
    lay = compute_scaled(100, 44, 56, 34)
    uni = make_backend("unicode")
    uni.init(100, 44)
    out = uni.present(paint_full(game, lay), paint_full(game, lay).dirty_cells())
    assert out != ""
    sixel = make_backend("sixel")
    if not sixel.available():
        pytest.skip("sixel needs Pillow")
    sixel.min_interval = 0.0
    sixel.init(100, 44)
    fb = paint_full(game, lay)
    assert sixel.present(fb, fb.dirty_cells()) != ""


# -- effects -------------------------------------------------------------

def test_mouth_animation_toggles_glyph_and_sprite():
    game = live_game(ticks=30)
    assert not fx.mouth_open(game.tick_count)
    shut = paint_scene(game, effects=True)
    from shell.verify import player_scene_xy
    assert shut.get(*player_scene_xy(game)).glyph == "o"
    assert "player-left-closed" in sprite_ids_in(shut)
    fresh = Game(seed=1)
    assert fx.mouth_open(fresh.tick_count)
    opened = paint_scene(fresh, effects=True)
    assert opened.get(*player_scene_xy(fresh)).glyph == "<"
    legacy = paint_scene(game)
    assert "player-left-closed" not in sprite_ids_in(legacy)


def test_energizer_pulse_and_reduced_flash():
    assert len({fx.energizer_glyph(t) for t in range(48)}) == 3
    assert all(fx.energizer_glyph(t, True) == "O" for t in range(48))


def test_death_sequence_frames_advance():
    game = Game(seed=1)
    game.kill_player()
    game.step(0.05)
    assert fx.death_frame(game.state_t, tuning.DEATH_SEQUENCE_S) == 0
    game.step(0.8)
    frame = fx.death_frame(game.state_t, tuning.DEATH_SEQUENCE_S)
    assert frame in (1, 2, 3) and frame != 0
    assert fx.death_frame(-1.0, tuning.DEATH_SEQUENCE_S) == 0
    assert fx.death_frame(0.5, 0.0) == 0


def test_clearing_tints_walls_rainbow():
    game = live_game()
    clearing = Game(seed=1)
    for y in range(31):
        for x in range(28):
            clearing.maze.eat_at(x, y)
    clearing._dots_seen = clearing.maze.dots_eaten
    clearing.step(tuning.STEP)
    assert clearing.state == "clearing"
    assert paint_scene(clearing, effects=True).get(0, 3).fg != \
        paint_scene(game).get(0, 3).fg


def test_fruit_sparkle_is_deterministic():
    game = Game(seed=1)
    for y in range(31):
        for x in range(28):
            if abs(x - 13) + abs(y - 17) <= 2:
                game.maze.eat_at(x, y)
    game._dots_seen = game.maze.dots_eaten
    game.fruit.notify_dots(70)
    assert game.fruit.active
    lay = compute_scaled(28, 34, 28, 34)
    first = paint_full(game, lay, effects=True)
    second = paint_full(game, lay, effects=True)
    assert first.cells == second.cells
    assert any(c.glyph == "*" for c in first.cells)


def test_fright_glyph_and_shimmer():
    assert fx.fright_glyph(0, False) == "O"
    assert {fx.fright_glyph(t, True) for t in range(32)} == {"O", "0"}
    assert fx.ghost_shimmer(0) and not fx.ghost_shimmer(8)


# -- atlas and themes ----------------------------------------------------

def test_closed_sprites_keep_old_image_ids_stable():
    assert image_id("player-left") == 100024
    assert image_id("ghost-eyes") == 1100024
    assert image_id("player-left-closed") == 1200024
    assert len(KNOWN_SPRITES) == 15
    assert set(PLAYER_SPRITE_CLOSED.values()) <= set(KNOWN_SPRITES)


def test_closed_sprites_render_pngs():
    pytest.importorskip("PIL")
    for sprite_id in ("player-left-closed", "player-right-closed",
                      "player-up-closed", "player-down-closed"):
        assert png_for(sprite_id)[:8] == (
            b"\x89PNG\r\n\x1a\n")


def test_six_themes_paint_and_wall_styles_differ():
    assert themes.THEMES == ("classic", "neon", "amber",
                             "midnight", "forest", "ember")
    game = live_game()
    for name in themes.THEMES:
        fb = paint_scene(game, theme=name)
        assert (fb.cols, fb.rows) == (COLS, ROWS)
    with pytest.raises(ValueError):
        themes.check("hologram")
    corner = next((x, y) for y in range(31) for x in range(28)
                  if wall_glyph(game.maze, x, y) == "+")
    assert len({wall_glyph(game.maze, corner[0], corner[1], style=s)
                for s in ("ascii", "double", "round")}) == 3


def test_chrome_patterns_fill_background():
    game = live_game()
    lay = compute_scaled(120, 50, 56, 34)
    neon = paint_full(game, lay, theme="neon")
    classic = paint_full(game, lay, theme="classic")
    assert "." in [neon.get(x, 2).glyph for x in range(30)]
    outside = [classic.get(x, 2).glyph for x in range(30)]
    assert set(outside) == {" "}  # flat chrome leaves margins blank


# -- shell wiring ----------------------------------------------------------

def test_shell_state_carries_scale_and_effects():
    app = ShellState(seed=1, audio=NullAudio(), scale_mode="wide",
                     effects=False)
    assert app.scale_mode == "wide" and app.effects is False
    with pytest.raises(ValueError):
        ShellState(seed=1, audio=NullAudio(), scale_mode="hologram")


def test_play_loop_uses_canvas_layout():
    from shell.app import run
    from render.manager import TieredRenderer

    class ScriptTerminal:
        def __init__(self):
            self.n = 0

        def read_available(self):
            self.n += 1
            return b"q" if self.n > 1 else b"\r"

        def size(self):
            return (120, 50)

    class FakeClock:
        def __init__(self):
            self.now = 1000.0

        def __call__(self):
            return self.now

        def sleep(self, seconds):
            self.now += seconds

    app = ShellState(seed=5, audio=NullAudio())
    term, renderer, out, clock = ScriptTerminal(), TieredRenderer(
        preference="unicode", env={}), [], FakeClock()
    frames = run(app, term, renderer, out.append, fps=30,
                 clock=clock, sleep=clock.sleep, max_frames=4)
    assert frames > 0 and (renderer.cols, renderer.rows) == (120, 50)


def test_visual_matrix_all_pass():
    failed = [row for row in verify_mod.visual_matrix(seed=1)
              if not row["passed"]]
    assert failed == []
    assert len(verify_mod.visual_matrix(seed=1)) == 13
