"""Phase 5: fruit, modes, themes, scores, config, and name entry."""

import os

import pytest

from engine import modes, tuning
from engine.fruit import FRUIT_TILE, Fruit
from engine.game import Game
from engine.maze import Maze
from engine.replay import run_recording
from render import themes
from render.scene import COLS, ROWS, paint
from shell import screens
from shell.app import ENTER_NAME, OVER, PLAYING, ShellState
from shell.audio import EVENTS, render_event
from shell.cli import autopilot_inputs, main
from shell.config import Config
from shell.scores import ScoreTable, clean_name


# -- fruit ------------------------------------------------------------

def test_fruit_tile_walkable():
    assert Maze().is_walkable(*FRUIT_TILE)


def test_fruit_spawns_at_thresholds_with_tier_points():
    fruit = Fruit(level=3)
    assert fruit.notify_dots(69) is False
    assert fruit.notify_dots(70) is True
    assert fruit.active and fruit.points == tuning.fruit_points(3) == 500
    assert fruit.notify_dots(170) is True  # second fruit re-arms
    assert fruit.active


def test_fruit_expiry_exactly_once():
    fruit = Fruit(level=1)
    fruit.notify_dots(70)
    assert fruit.step(tuning.FRUIT_LIFETIME_S - 0.01) is False
    assert fruit.step(0.02) is True
    assert fruit.active is False
    assert fruit.step(1.0) is False


def test_fruit_eat_only_on_its_tile():
    fruit = Fruit(level=1)
    fruit.notify_dots(70)
    assert fruit.try_eat((1, 1)) == 0
    assert fruit.active is True
    assert fruit.try_eat(FRUIT_TILE) == 100
    assert fruit.active is False


def test_game_fruit_events_and_death_clears():
    from engine.actors import center_of
    game = Game(seed=2)
    game.fruit.notify_dots(70)  # arm deterministically, like 70 eaten dots
    cx, cy = center_of(*FRUIT_TILE)
    game.player.x, game.player.y = cx, cy
    game.step(tuning.STEP)
    assert any(e == "fruit:100" for e in game.events)
    assert game.score >= 100
    game.fruit.active = True
    game.kill_player()
    for _ in range(int(1.5 / tuning.STEP) + 2):
        game.step(tuning.STEP)
        if game.state == "play":
            break
    assert game.fruit.active is False  # respawn clears uneaten fruit


def test_autopilot_eats_fruit_headless():
    inputs = autopilot_inputs(2, 2400)
    _digest, events, game = run_recording(2, inputs, 2400)
    fruits = [e for e in events if e.startswith("fruit:")]
    assert fruits, "seed-2 autopilot should reach a fruit in 2400 ticks"
    assert game.score >= sum(int(e.split(":")[1]) for e in fruits)


# -- modes ------------------------------------------------------------

def test_modes_reject_unknown():
    with pytest.raises(ValueError):
        modes.check("marathon")
    with pytest.raises(ValueError):
        Game(mode="marathon")


def test_sprint_one_life_no_fright():
    game = Game(seed=1, mode="sprint")
    assert game.lives == 1
    game._last_tile = (1, 3)  # energizer tile
    game._eat_current_tile()
    assert "energizer" in game.events
    assert game.fright_active is False


def test_frenzy_quadruples_fright_and_slows_ghosts():
    classic = Game(seed=1)
    classic._last_tile = (1, 3)
    classic._eat_current_tile()
    frenzy = Game(seed=1, mode="fright-frenzy")
    frenzy._last_tile = (1, 3)
    frenzy._eat_current_tile()
    assert frenzy.ghosts.fright_t == pytest.approx(classic.ghosts.fright_t * 4.0)
    assert frenzy.ghosts._speed_for is not None
    assert (modes.ghost_speed_multiplier("fright-frenzy")
            < modes.ghost_speed_multiplier("classic"))


def test_time_attack_refills_instead_of_advancing():
    game = Game(seed=1, mode="time-attack")
    game.maze.dots_remaining = 0
    game.maze.energizers_remaining = 0
    game.step(tuning.STEP)
    assert "maze-refill" in game.events
    assert game.level == 1 and game.state == "play"
    assert game.dots_left > 0


def test_time_attack_timeout_ends_run():
    game = Game(seed=1, mode="time-attack")
    # Isolate the timeout path: pin every ghost in the house (huge counters,
    # idle release disabled) so the stationary player survives the full
    # 120 s. With live hunters roaming, the run would end in defeat first -
    # that collision path is covered by test_collision_kills_player_*.
    for ghost in game.ghosts.ghosts:
        ghost.state = "house"
        ghost.counter = 10 ** 9
    game.ghosts.idle_t = -10 ** 9
    # The idle timer also walks ghosts out once the player stops eating, so
    # bar the door as well: the timeout path must not depend on hunters.
    game.ghosts._start_leaving = lambda ghost: None
    for _ in range(400):  # step() clamps to 0.5 s per call by design
        game.step(1.0)
        if game.state == "over":
            break
    assert game.state == "over" and game.over_reason == "timeout"
    assert "time-up" in game.events


def test_sprint_clear_wins_with_par_bonus():
    game = Game(seed=1, mode="sprint")
    game.elapsed = 60.0
    game.maze.dots_remaining = 0
    game.maze.energizers_remaining = 0
    before = game.score
    game.step(tuning.STEP)
    assert game.state == "over" and game.over_reason == "cleared"
    assert game.score == before + modes.sprint_bonus(game.elapsed) > before


def test_replay_mode_param_deterministic():
    inputs = autopilot_inputs(7, 600, mode="sprint")
    first, _, _ = run_recording(7, inputs, 600, mode="sprint")
    second, _, _ = run_recording(7, inputs, 600, mode="sprint")
    assert first == second
    other, _, _ = run_recording(7, inputs, 600, mode="classic")
    assert first != other


def test_level_summary_ramp_sane_to_endless():
    first = tuning.level_summary(1)
    deep = tuning.level_summary(25)
    assert first["fruit"] == 100 and deep["fruit"] == 5000
    assert deep["player_speed"] >= first["player_speed"]
    assert deep["fright_s"] == 0.0


# -- themes -----------------------------------------------------------

def test_themes_validate_and_paint_all():
    assert themes.get("neon")["wall_fg"] != themes.get("classic")["wall_fg"]
    with pytest.raises(ValueError):
        paint(Game(seed=1), theme="hyperdrive")
    for name in themes.THEMES:
        fb = paint(Game(seed=1), theme=name)
        assert (fb.cols, fb.rows) == (COLS, ROWS)
        assert "neon" in themes.describe() and "amber" in themes.describe()


def test_reduced_flash_holds_steady():
    game = Game(seed=1)
    for _ in range(30):
        game.step(tuning.STEP)
    blinking = paint(game)
    steady = paint(game, reduced_flash=True)
    from engine.maze import ENERGIZER
    spots = [(x, y) for y in range(31) for x in range(28)
             if game.maze.energizers[y * 28 + x]]
    assert spots
    steady_glyphs = {steady.get(x, y + 3).glyph for x, y in spots}
    assert steady_glyphs == {"O"}
    blinking_glyphs = {blinking.get(x, y + 3).glyph for x, y in spots}
    assert blinking_glyphs == {" "}  # tick>=24 lands in the dark half


def test_time_attack_and_sprint_hud_show_clock():
    ta = Game(seed=1, mode="time-attack")
    row = "".join(paint(ta).get(x, 1).glyph for x in range(COLS))
    assert "TIME 120" in row
    sp = Game(seed=1, mode="sprint")
    sprow = "".join(paint(sp).get(x, 1).glyph for x in range(COLS))
    assert "TIME 0" in sprow


# -- scores and config ------------------------------------------------

def test_scores_roundtrip_and_rank(tmp_path):
    table = ScoreTable(path=str(tmp_path / "scores.json"))
    assert table.format() == ["no scores yet - play a run!"]
    assert table.qualifies(0) is False
    assert table.add("ada", 500, level=2, mode="sprint") == 1
    assert table.add("BO", 900, level=1, mode="classic") == 1
    assert table.entries[0]["name"] == "BO"
    again = ScoreTable(path=str(table.path))
    assert [e["score"] for e in again.entries] == [900, 500]
    assert "ADA" in again.format()[1]


def test_scores_survive_corrupt_files(tmp_path):
    bad = tmp_path / "bad.json"
    bad.write_text("{not json", encoding="utf-8")
    assert ScoreTable(path=str(bad)).entries == []
    wrong = tmp_path / "wrong.json"
    wrong.write_text('{"a": 1}', encoding="utf-8")
    assert ScoreTable(path=str(wrong)).entries == []


def test_clean_name_caps_and_falls_back():
    assert clean_name("  ada lovelace  ") == "ADA LOVELA"
    assert clean_name("!!!") == "!!!"
    assert clean_name("") == "ACE"


def test_config_validates_and_roundtrips(tmp_path):
    path = str(tmp_path / "config.json")
    config = Config(path=path)
    assert config.values["theme"] == "classic"
    config.update({"theme": "neon", "fps": 999, "mode": "bogus",
                   "audio": "loud", "binds": {"up": ["k"], "nope": ["z"]},
                   "name": "ada"})
    assert config.values["theme"] == "neon"
    assert config.values["fps"] == 240
    assert config.values["mode"] == "classic"
    assert config.values["audio"] == "auto"
    assert config.values["binds"] == {"up": ["k"]}
    assert config.save() is True
    assert Config(path=path).values["theme"] == "neon"


# -- name entry and screens -------------------------------------------

def test_name_entry_typing_save_and_skip(tmp_path):
    scores = ScoreTable(path=str(tmp_path / "s.json"))
    app = ShellState(scores=scores)
    app.start_run()
    app.game.score = 750
    app.screen = ENTER_NAME
    app.handle_entry_bytes(b"ada")
    app.handle_entry_bytes(b"\x7fX\r")
    assert app.screen == OVER
    assert scores.entries and scores.entries[0]["name"] == "ADX"
    assert scores.entries[0]["score"] == 750


def test_name_entry_esc_skips_ctrl_c_quits(tmp_path):
    scores = ScoreTable(path=str(tmp_path / "s.json"))
    app = ShellState(scores=scores)
    app.start_run()
    app.game.score = 750
    app.screen = ENTER_NAME
    app.handle_entry_bytes(b"ada\x1b")
    assert app.screen == OVER and scores.entries == []
    app.screen = ENTER_NAME
    app.handle_entry_bytes(b"\x03")
    assert app.exited is True


def test_game_over_routes_to_entry_only_when_qualifying(tmp_path):
    scores = ScoreTable(path=str(tmp_path / "s.json"))
    scores.add("TOP", 100000, level=9)
    for _ in range(10 - len(scores.entries)):
        scores.add("FILL", 50000 - _, level=1)
    app = ShellState(scores=scores)
    app.start_run()
    app.game.score = 5
    app.game.lives = 0
    app.game.state = "dying"
    app.game.state_t = tuning.DEATH_SEQUENCE_S
    app.step_play(tuning.STEP)
    assert app.screen == OVER  # 5 points cannot crack a stacked table


def test_over_reasons_and_entry_cards_render():
    game = Game(seed=1)
    over = screens.paint_over(paint(game), 123, reason="timeout")
    assert any("TIME UP!" in row for row in screens.flat_text(over))
    cleared = screens.paint_over(paint(game), 123, reason="cleared")
    assert any("MAZE CLEARED!" in row for row in screens.flat_text(cleared))
    entry = screens.paint_name_entry(paint(game), "ADA", 750)
    assert any("ADA" in row for row in screens.flat_text(entry))
    card = screens.paint_scores([{"name": "ADA", "score": 750,
                                  "level": 2, "mode": "sprint"}])
    assert any("ADA" in row for row in screens.flat_text(card))


def test_title_shows_mode_and_best():
    fb = screens.paint_title(mode="sprint", theme="neon",
                             top={"name": "ADA", "score": 750,
                                  "level": 2, "mode": "sprint"})
    rows = screens.flat_text(fb)
    assert any("sprint" in row for row in rows)
    assert any("750" in row for row in rows)


# -- audio and CLI ----------------------------------------------------

def test_fruit_sound_renders():
    assert "fruit" in EVENTS
    assert len(render_event("fruit")) > 1000


def test_cli_lists_and_scores_flags(tmp_path, capsys):
    scores_file = str(tmp_path / "s.json")
    assert main(["--modes"]) == 0
    assert "fright-frenzy" in capsys.readouterr().out
    assert main(["--themes"]) == 0
    assert "neon" in capsys.readouterr().out
    assert main(["--levels", "3"]) == 0
    assert "fright-s" in capsys.readouterr().out
    assert main(["--scores", "--scores-file", scores_file]) == 0
    assert "no scores yet" in capsys.readouterr().out


def test_cli_save_config_roundtrip(tmp_path):
    config_file = str(tmp_path / "c.json")
    assert main(["--theme", "amber", "--mode", "sprint", "--no-reduced-flash",
                 "--config-file", config_file, "--save-config"]) == 0
    assert Config(path=config_file).values["theme"] == "amber"
    assert Config(path=config_file).values["mode"] == "sprint"


def test_cli_self_check_reports_mode_and_fruit(capsys):
    assert main(["--self-check", "--ticks", "2400", "--seed", "2",
                 "--mode", "classic"]) == 0
    out = capsys.readouterr().out
    assert "fruit-eaten:" in out and "mode: classic" in out
