"""Tester regression suite for Phase 2 scaled visuals (issue #552).

Durable black-box pins authored by the Tester: magnification selection,
tick animation determinism, six-theme registry, scale/effects CLI and
config wiring, and the shipped entrypoints. Headless only (no tty);
play-loop drives use the real shell/renderer path with scripted
terminals. Distinct from the builder's test_scale_visuals.py: this
suite pins the contract from the consumer/CLI side plus hostile
inputs.
"""

import pytest

from engine import tuning
from engine.game import Game
from render import effects as fx
from render import scale as scale_mod
from render import themes
from render.compose import paint_full
from render.layout import compute_scaled
from render.scene import COLS, ROWS, paint as paint_scene
from render.scene import sprite_ids_in
from shell import verify as verify_mod
from shell.app import ShellState, run
from shell.audio import NullAudio
from shell.config import Config
from render.manager import TieredRenderer


def live_game(seed=3, ticks=30):
    game = Game(seed=seed)
    for _ in range(ticks):
        game.step(tuning.STEP)
        if not game.running:
            break
    return game


# -- shipped CLI: scale/effects wiring --------------------------------------

def test_tester_cli_layout_check_scale_aware(capsys):
    from shell.cli import main
    assert main(["--layout-check", "120x50"]) == 0
    auto_out = capsys.readouterr().out
    assert "scale auto: 2x1" in auto_out and "maze 56x34" in auto_out
    assert main(["--layout-check", "120x50", "--scale", "classic"]) == 0
    classic_out = capsys.readouterr().out
    assert "scale classic: 1x1" in classic_out
    # Wide also doubles on this roomy size; effects flag must not break it.
    assert main(["--layout-check", "120x50", "--scale", "wide",
                 "--no-effects"]) == 0
    wide_out = capsys.readouterr().out
    assert "scale wide: 2x1" in wide_out and "layout OK" in wide_out


def test_tester_cli_rejects_bad_scale_and_theme():
    from shell.cli import main
    with pytest.raises(SystemExit) as exc:
        main(["--layout-check", "120x50", "--scale", "hologram"])
    assert exc.value.code == 2
    with pytest.raises(SystemExit) as exc2:
        main(["--self-check", "--theme", "hologram"])
    assert exc2.value.code == 2


def test_tester_cli_themes_lists_six(capsys):
    from shell.cli import main
    assert main(["--themes"]) == 0
    out = capsys.readouterr().out
    for name in ("classic", "neon", "amber", "midnight", "forest", "ember"):
        assert name in out


def test_tester_cli_verify_and_scoreboard_pass(capsys):
    from shell.cli import main
    assert main(["--verify"]) == 0
    out = capsys.readouterr().out
    assert "verify: 82/82 passed" in out
    assert main(["--scoreboard", "--frames", "5"]) == 0
    board = capsys.readouterr().out
    assert "scoreboard OK" in board and "canvas-compose" in board


# -- scale engine: black-box contract ----------------------------------------

def test_tester_scale_ladder_pins():
    assert (scale_mod.choose(28, 34, "auto").sx,
            scale_mod.choose(28, 34, "auto").sy) == (1, 1)
    assert (scale_mod.choose(120, 50, "auto").sx,
            scale_mod.choose(120, 50, "auto").sy) == (2, 1)
    assert (scale_mod.choose(200, 80, "auto").sx,
            scale_mod.choose(200, 80, "auto").sy) == (2, 2)
    assert scale_mod.choose(80, 50, "wide").sx == 2
    assert scale_mod.choose(40, 40, "wide").sx == 1
    assert scale_mod.choose(120, 50, "hologram").sx == 1
    with pytest.raises(ValueError):
        scale_mod.check("hologram")


def test_tester_scale_survives_hostile_dims():
    for bad in [(None, None), ("x", "y"), (-5, -5), (0, 0),
                ([28], [34]), (28.9, 33.7),
                (float("nan"), float("nan")), (-10**18, -10**18)]:
        picked = scale_mod.choose(*bad)
        assert (picked.sx, picked.sy) == (1, 1)


@pytest.mark.xfail(reason="choose(float('inf'),...) raises OverflowError; "
                          "int(inf) escapes the (TypeError, ValueError) "
                          "guard. Unreachable via real terminal sizes.")
def test_tester_scale_survives_infinite():
    picked = scale_mod.choose(float("inf"), float("inf"))
    assert (picked.sx, picked.sy) == (1, 1)


# -- wide blit: verbatim magnification ----------------------------------------

def test_tester_wide_blit_doubles_cells_with_spans():
    game = live_game()
    ref = paint_scene(game)
    lay = compute_scaled(120, 50, 56, 34)
    wide = paint_full(game, lay)
    assert (wide.cols, wide.rows) == (120, 50)
    for y in range(ROWS):
        for x in range(COLS):
            assert wide.get(lay.maze_ox + x * 2, lay.maze_oy + y) == \
                ref.get(x, y)
            assert wide.get(lay.maze_ox + x * 2 + 1,
                            lay.maze_oy + y).glyph == ref.get(x, y).glyph
    sprites = [i for i, c in enumerate(ref.cells) if c.sprite is not None]
    assert sprites, "expected sprite cells in a live frame"
    for i in sprites:
        idx = (lay.maze_oy + i // COLS) * wide.cols + lay.maze_ox + \
            (i % COLS) * 2
        assert wide.spans.get(idx) == (2, 1)


def test_tester_kitty_multisize_placements():
    pytest.importorskip("PIL")
    game = live_game()
    lay = compute_scaled(120, 50, 56, 34)
    wide = paint_full(game, lay)
    kitty = TieredRenderer(preference="kitty", env={})
    kitty.init(120, 50)
    out = kitty.present(wide, wide.dirty_cells())
    assert "c=2" in out and "a=p" in out


# -- effects: deterministic animation ------------------------------------------

def test_tester_mouth_toggles_and_legacy_has_no_closed():
    fresh = Game(seed=1)
    played = live_game(ticks=30)
    assert fx.mouth_open(fresh.tick_count) != fx.mouth_open(played.tick_count)
    from shell.verify import player_scene_xy
    opened = paint_scene(fresh, effects=True)
    shut = paint_scene(played, effects=True)
    assert opened.get(*player_scene_xy(fresh)).glyph != \
        shut.get(*player_scene_xy(played)).glyph
    assert "player-left-closed" in sprite_ids_in(shut)
    assert not any(s.endswith("-closed")
                   for s in sprite_ids_in(paint_scene(played)))


def test_tester_effect_frames_deterministic():
    assert len({fx.energizer_glyph(t) for t in range(48)}) == 3
    assert all(fx.energizer_glyph(t, True) == "O" for t in range(48))
    assert fx.fright_glyph(0, False) == "O"
    assert {fx.fright_glyph(t, True) for t in range(32)} == {"O", "0"}
    game = live_game()
    lay = compute_scaled(28, 34, 28, 34)
    assert paint_full(game, lay, effects=True).cells == \
        paint_full(game, lay, effects=True).cells
    for bad in (None, "x", float("nan")):
        assert isinstance(fx.mouth_open(bad), bool)
        assert fx.energizer_glyph(bad) in ("O", "o", "*")


def test_tester_death_and_clearing_frames():
    game = Game(seed=1)
    game.kill_player()
    game.step(0.05)
    assert fx.death_frame(game.state_t, tuning.DEATH_SEQUENCE_S) == 0
    game.step(0.8)
    assert fx.death_frame(game.state_t,
                          tuning.DEATH_SEQUENCE_S) in (1, 2, 3)
    ref = live_game()
    clearing = Game(seed=1)
    for y in range(31):
        for x in range(28):
            clearing.maze.eat_at(x, y)
    clearing._dots_seen = clearing.maze.dots_eaten
    clearing.step(tuning.STEP)
    assert clearing.state == "clearing"
    assert paint_scene(clearing, effects=True).get(0, 3).fg != \
        paint_scene(ref).get(0, 3).fg


# -- themes and config ----------------------------------------------------------

def test_tester_six_themes_paint_same_grid():
    assert themes.THEMES == ("classic", "neon", "amber",
                             "midnight", "forest", "ember")
    game = live_game()
    for name in themes.THEMES:
        fb = paint_scene(game, theme=name)
        assert (fb.cols, fb.rows) == (COLS, ROWS)
    with pytest.raises(ValueError):
        themes.check("hologram")
    # Effects-off legacy path stays whole on every theme.
    for name in themes.THEMES:
        fb = paint_scene(game, theme=name, effects=False)
        assert (fb.cols, fb.rows) == (COLS, ROWS)


def test_tester_config_validates_scale_and_effects(tmp_path):
    cfg = Config(path=str(tmp_path / "config.json"),
                 values={"scale": "hologram", "effects": "yes",
                         "theme": "hologram", "mode": "hologram"})
    assert cfg.values["scale"] == "auto"
    assert cfg.values["theme"] == "classic"
    assert cfg.values["mode"] == "classic"
    cfg2 = Config(path=str(tmp_path / "c2.json"),
                  values={"scale": "wide", "effects": False})
    assert cfg2.values["scale"] == "wide"
    assert cfg2.values["effects"] is False
    assert cfg2.save()
    reloaded = Config(path=str(tmp_path / "c2.json"))
    assert reloaded.values["scale"] == "wide"
    assert reloaded.values["effects"] is False


# -- play-loop wiring with scale/effects -----------------------------------------

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


def _drive(app, sizes, chunks, max_frames=4):
    term = _ScriptTerminal(chunks, sizes)
    renderer = TieredRenderer(preference="unicode", env={})
    out, clock = [], _FakeClock()
    frames = run(app, term, renderer, out.append, fps=30,
                 clock=clock, sleep=clock.sleep, max_frames=max_frames)
    return renderer, "".join(out), frames


def test_tester_play_loop_wide_and_effects_off():
    app = ShellState(seed=5, audio=NullAudio(), scale_mode="wide",
                     effects=False)
    renderer, _out, frames = _drive(app, [(120, 50)] * 6,
                                    [b"\r", b"", b"", b"q"])
    assert frames > 0 and (renderer.cols, renderer.rows) == (120, 50)
    app2 = ShellState(seed=5, audio=NullAudio(), scale_mode="classic",
                      effects=True)
    renderer2, _out2, frames2 = _drive(app2, [(120, 50)] * 6,
                                       [b"\r", b"", b"", b"q"])
    assert frames2 > 0 and (renderer2.cols, renderer2.rows) == (120, 50)
    with pytest.raises(ValueError):
        ShellState(seed=1, audio=NullAudio(), scale_mode="hologram")


# -- matrices stay green ----------------------------------------------------------

def test_tester_visual_matrix_thirteen_green():
    rows = verify_mod.visual_matrix(seed=1)
    assert len(rows) == 13
    assert [r for r in rows if not r["passed"]] == []


def test_tester_full_matrix_eighty_two_green():
    total, failed = 0, []
    for _section, rows in verify_mod.full_matrix(seed=1):
        for row in rows:
            total += 1
            if not row["passed"]:
                failed.append(row["name"])
    assert total == 82, "matrix grew; update this pin, got %d" % total
    assert failed == []
