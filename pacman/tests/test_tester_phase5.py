"""Tester adversarial suite for Pac-Man Phase 5 (Refs #552).

Hostile red-team coverage for the four Round-1 review repairs plus the new
Phase 5 surface (fruit, modes, themes, scores, config, name entry, CLI).
Complements test_phase5.py; every case here must hold on the fixed head.
"""

import json

import pytest

from engine import modes, tuning
from engine.fruit import FRUIT_TILE, Fruit
from engine.game import Game
from render import themes
from render.scene import COLS, ROWS, paint
from shell.app import ENTER_NAME, OVER, PLAYING, ShellState
from shell.audio import EVENTS, render_event
from shell.cli import main
from shell.config import Config
from shell.scores import MAX_ENTRIES, ScoreTable, clean_name


# -- Finding 2: sprint stays one life under hostile scoring ----------------

def test_tester_sprint_never_gains_extra_life_even_at_50k():
    game = Game(seed=1, mode="sprint")
    game._add_score(50000)
    assert game.lives == 1
    assert game.extra_life_given is False
    assert "extra-life" not in game.events


def test_tester_sprint_extra_life_boundary_exactly_at_threshold():
    game = Game(seed=1, mode="sprint")
    game.score = tuning.EXTRA_LIFE_AT - 1
    game._add_score(1)
    assert game.score == tuning.EXTRA_LIFE_AT
    assert game.lives == 1  # threshold crossing must not award in sprint


def test_tester_classic_still_awards_extra_life_once():
    game = Game(seed=1, mode="classic")
    game._add_score(tuning.EXTRA_LIFE_AT + 5000)
    assert game.lives == tuning.START_LIVES + 1
    assert "extra-life" in game.events
    before = game.lives
    game._add_score(50000)
    assert game.lives == before  # awarded exactly once


# -- Finding 3: fright-frenzy never collapses at deep levels ----------------

@pytest.mark.parametrize("level", [11, 12, 15, 25])
def test_tester_frenzy_hunts_at_deep_levels(level):
    game = Game(seed=1, level=level, mode="fright-frenzy")
    game._last_tile = (1, 3)
    game._eat_current_tile()
    assert game.ghosts.fright_t == pytest.approx(
        max(tuning.fright_duration(level), tuning.FRENZY_FLOOR_S) * 4.0)
    assert game.ghosts.fright_t >= 4.0


def test_tester_classic_deep_levels_honestly_have_no_fright():
    game = Game(seed=1, level=12)
    game._last_tile = (1, 3)
    game._eat_current_tile()
    assert game.ghosts.fright_t == 0.0


def test_tester_frenzy_floor_constant_sane():
    assert tuning.FRENZY_FLOOR_S == 1.0
    assert tuning.fright_duration(25) == 0.0  # floor is what saves the hunt


# -- Finding 1: save-config routing -----------------------------------------

def test_tester_save_config_guard_routes_play_to_cmd_play():
    import inspect
    from shell import cli as cli_mod
    src = inspect.getsource(cli_mod.main)
    assert "if args.save_config and not args.play:" in src


def test_tester_save_config_alone_still_saves_and_exits(tmp_path):
    cfg = str(tmp_path / "alone.json")
    assert main(["--theme", "neon", "--config-file", cfg, "--save-config"]) == 0
    assert Config(path=cfg).values["theme"] == "neon"


def test_tester_play_without_tty_fails_clean_not_hang():
    # Non-tty stdin must error (exit 2), never block or crash.
    assert main(["--play", "--seed", "1", "--ticks", "10"]) == 2


# -- Finding 4: fallback game keeps the active mode --------------------------

def test_tester_fallback_paint_keeps_mode_without_game():
    scores = ScoreTable(path="/tmp/tester-fb-scores.json")
    app = ShellState(seed=3, mode="sprint", scores=scores)
    app.game = None
    app.screen = OVER
    fb = app.paint()  # must not raise, must render sprint HUD clock
    row = "".join(fb.get(x, 1).glyph for x in range(COLS))
    assert "TIME" in row


def test_tester_title_and_paint_follow_mode():
    scores = ScoreTable(path="/tmp/tester-mode-scores.json")
    for mode in ("sprint", "time-attack"):
        app = ShellState(seed=1, mode=mode, scores=scores)
        app.start_run()
        assert app.game.mode == mode


# -- Fruit hostility ----------------------------------------------------------

def test_tester_fruit_second_threshold_rearms_but_third_does_not_double():
    fruit = Fruit(level=1)
    assert fruit.notify_dots(70) is True
    assert fruit.notify_dots(71) is False  # already active: no double arm
    fruit.try_eat(FRUIT_TILE)
    assert fruit.notify_dots(170) is True  # eaten: re-arms at next tier


def test_tester_fruit_expiry_idempotent_and_eat_after_expiry_zero():
    fruit = Fruit(level=1)
    fruit.notify_dots(70)
    assert fruit.step(tuning.FRUIT_LIFETIME_S + 5.0) is True
    assert fruit.step(10.0) is False  # exactly once
    assert fruit.try_eat(FRUIT_TILE) == 0


def test_tester_fruit_tier_points_monotonic():
    pts = [tuning.fruit_points(lv) for lv in (1, 2, 3, 5, 8)]
    assert pts == sorted(pts) and len(set(pts)) > 1


def test_tester_fruit_state_covered_by_canonical_hash():
    idle = Game(seed=9)
    armed = Game(seed=9)
    armed.fruit.notify_dots(70)
    assert idle.canonical() != armed.canonical()
    assert idle.state_hash() != armed.state_hash()


# -- Mode hostility ------------------------------------------------------------

def test_tester_unknown_mode_rejected_everywhere():
    with pytest.raises(ValueError):
        modes.check("marathon")
    with pytest.raises(ValueError):
        Game(mode="marathon")
    with pytest.raises(ValueError):
        modes.fright_multiplier("marathon")
    with pytest.raises(ValueError):
        modes.ghost_speed_multiplier("marathon")
    with pytest.raises(ValueError):
        themes.check("hyperdrive")


def test_tester_canonical_hash_mode_sensitive_and_seed_deterministic():
    a = Game(seed=5, mode="classic")
    b = Game(seed=5, mode="sprint")
    assert a.canonical() != b.canonical()
    c = Game(seed=5, mode="classic")
    for _ in range(50):
        a.step(tuning.STEP)
        c.step(tuning.STEP)
    assert a.state_hash() == c.state_hash()


def test_tester_sprint_bonus_zero_past_par_and_positive_under():
    assert modes.sprint_bonus(modes.SPRINT_PAR_S + 60.0) == 0
    assert modes.sprint_bonus(modes.SPRINT_PAR_S) == 0
    assert modes.sprint_bonus(60.0) == int(modes.SPRINT_PAR_S - 60.0) * 10 > 0


def test_tester_time_attack_refill_preserves_score_but_resets_dots():
    game = Game(seed=1, mode="time-attack")
    game._add_score(1000)
    game.maze.dots_remaining = 0
    game.maze.energizers_remaining = 0
    game.step(tuning.STEP)
    assert "maze-refill" in game.events
    assert game.score >= 1000
    assert game.dots_left > 0
    assert game.level == 1


# -- Scores hostility -----------------------------------------------------------

def test_tester_scores_hostile_files_never_crash(tmp_path):
    for name, payload in (("empty.json", ""), ("binary.json", "\x00\x01\x02"),
                          ("list.json", "[1, 2, 3]"),
                          ("neg.json", '[{"name": "X", "score": -5}]'),
                          ("zero.json", '[{"name": "X", "score": 0}]'),
                          ("str.json", '"hello"')):
        path = tmp_path / name
        path.write_text(payload, encoding="utf-8")
        assert ScoreTable(path=str(path)).entries == []


def test_tester_scores_cap_and_order_and_ties(tmp_path):
    table = ScoreTable(path=str(tmp_path / "cap.json"))
    for i in range(15):
        table.add("P%02d" % i, 100 * (i + 1), level=1)
    assert len(table.entries) == MAX_ENTRIES
    scores = [e["score"] for e in table.entries]
    assert scores == sorted(scores, reverse=True)
    assert min(scores) == 600  # bottom five evicted
    assert table.qualifies(1) is False
    assert table.qualifies(10_000_000) is True


def test_tester_clean_name_hostile_inputs():
    assert clean_name(None) == "ACE"
    assert clean_name("   ") == "ACE"
    assert clean_name("abcdefghijklmnop") == "ABCDEFGHIJ"
    assert clean_name("héllo") == "HLLO"  # non-ascii stripped
    assert len(clean_name("x" * 100)) == 10


# -- Config hostility ------------------------------------------------------------

def test_tester_config_clamps_hostile_values(tmp_path):
    path = str(tmp_path / "hostile.json")
    cfg = Config(path=path)
    cfg.update({"fps": -5, "mode": "bogus", "theme": "bogus",
                "audio": "loud", "name": "x" * 50})
    assert cfg.values["fps"] == 30 or 1 <= cfg.values["fps"] <= 240
    assert cfg.values["mode"] == "classic"
    assert cfg.values["theme"] == "classic"
    assert cfg.values["audio"] == "auto"


def test_tester_config_corrupt_file_falls_back_to_defaults(tmp_path):
    path = tmp_path / "corrupt.json"
    path.write_text("{oops", encoding="utf-8")
    assert Config(path=str(path)).values["theme"] == "classic"


# -- CLI hostility -----------------------------------------------------------------

def test_tester_cli_rejects_bad_numerics():
    assert main(["--level", "0", "--self-check"]) == 2
    assert main(["--ticks", "0", "--self-check"]) == 2
    assert main(["--fps", "999", "--self-check"]) == 2
    assert main(["--levels", "-3"]) == 2
    assert main(["--frames", "0", "--render-bench"]) == 2
    # NOTE (non-blocking): `--levels 0` is indistinguishable from the flag
    # being absent (argparse default=0) so it shows help with exit 0; only
    # negatives hit the `--levels must be >= 1` error branch. Coherent UX,
    # but the inner `< 1` guard is dead for exactly 0 - follow-up fodder.
    assert main(["--levels", "0"]) == 0


def test_tester_cli_lists_cover_all_modes_and_themes(capsys):
    assert main(["--modes"]) == 0
    out = capsys.readouterr().out
    for mode in modes.MODES:
        assert mode in out
    assert main(["--themes"]) == 0
    out = capsys.readouterr().out
    for theme in themes.THEMES:
        assert theme in out


def test_tester_cli_self_check_time_attack_reports_clock(capsys):
    assert main(["--self-check", "--ticks", "200", "--seed", "1",
                 "--mode", "time-attack"]) == 0
    out = capsys.readouterr().out
    assert "mode: time-attack" in out


# -- Render / audio / name-entry hostility ------------------------------------------

def test_tester_all_themes_paint_full_frame_and_hud_clocks():
    for name in themes.THEMES:
        fb = paint(Game(seed=1, mode="time-attack"), theme=name)
        assert (fb.cols, fb.rows) == (COLS, ROWS)
        row = "".join(fb.get(x, 1).glyph for x in range(COLS))
        assert "TIME 120" in row


def test_tester_fruit_voice_renders_and_all_events_render():
    assert "fruit" in EVENTS
    assert len(render_event("fruit")) > 1000
    for event in EVENTS:
        assert len(render_event(event)) > 0


def test_tester_name_entry_ignores_spaces_and_caps(tmp_path):
    scores = ScoreTable(path=str(tmp_path / "entry.json"))
    app = ShellState(scores=scores)
    app.start_run()
    app.game.score = 500
    app.screen = ENTER_NAME
    app.handle_entry_bytes(b"a b\r")
    assert scores.entries and scores.entries[0]["name"] == "AB"


def test_tester_step_play_nonqualifying_never_enters_name(tmp_path):
    scores = ScoreTable(path=str(tmp_path / "stacked.json"))
    scores.add("TOP", 100000, level=9)
    for i in range(9):
        scores.add("FILL%d" % i, 50000 - i, level=1)
    app = ShellState(scores=scores)
    app.start_run()
    app.game.score = 5
    app.game.lives = 0
    app.game.state = "dying"
    app.game.state_t = tuning.DEATH_SEQUENCE_S
    app.step_play(tuning.STEP)
    assert app.screen == OVER
    assert app.screen != ENTER_NAME


def test_tester_scores_json_roundtrip_is_valid_json(tmp_path):
    path = tmp_path / "rt.json"
    table = ScoreTable(path=str(path))
    table.add("ADA", 750, level=2, mode="sprint")
    raw = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(raw, list) and raw[0]["score"] == 750
