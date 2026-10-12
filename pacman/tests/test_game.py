"""Scoring, lives, extra life, death/respawn, level flow."""

from engine import tuning
from engine.actors import LEFT
from engine.game import Game


def run_ticks(game, n, dt=None):
    dt = tuning.STEP if dt is None else dt
    for _ in range(n):
        game.step(dt)


def test_dot_scores_ten():
    game = Game(seed=3)
    before = game.score
    game.set_want(LEFT)
    run_ticks(game, 30)  # row 23 has dots immediately left of spawn
    assert game.score > before
    assert (game.score - before) % tuning.DOT_SCORE == 0


def test_energizer_scores_fifty_and_resets_chain():
    game = Game(seed=3)
    game.ghosts_eaten_chain = 2
    # teleport onto the row-3 left energizer approach: tile (1,3)
    from engine.actors import center_of
    cx, cy = center_of(2, 3)
    game.player.x, game.player.y = cx, cy
    game.player.dir = game.player.want = LEFT
    game._last_tile = (2, 3)
    run_ticks(game, 30)
    assert game.score >= tuning.ENERGIZER_SCORE
    assert game.ghosts_eaten_chain == 0


def test_ghost_chain_scoring():
    game = Game(seed=3)
    assert game.notify_ghost_eaten() == 200
    assert game.notify_ghost_eaten() == 400
    assert game.notify_ghost_eaten() == 800
    assert game.notify_ghost_eaten() == 1600
    assert game.notify_ghost_eaten() == 1600  # chain caps


def test_extra_life_once():
    game = Game(seed=3)
    lives = game.lives
    game._add_score(tuning.EXTRA_LIFE_AT)
    assert game.lives == lives + 1
    assert "extra-life" in game.events
    game._add_score(tuning.EXTRA_LIFE_AT)
    assert game.lives == lives + 1  # exactly once


def test_death_respawn_and_game_over():
    game = Game(seed=3)
    start_lives = game.lives
    game.kill_player()
    run_ticks(game, int(tuning.DEATH_SEQUENCE_S / tuning.STEP) + 5)
    assert game.lives == start_lives - 1
    assert game.state == "play"
    assert "respawn" in game.events
    # drain remaining lives
    for _ in range(start_lives):
        game.kill_player()
        run_ticks(game, int(tuning.DEATH_SEQUENCE_S / tuning.STEP) + 5)
    assert game.state == "over"
    assert "game-over" in game.events
    assert not game.running


def test_kill_during_dying_is_noop():
    game = Game(seed=3)
    game.kill_player()
    game.kill_player()
    assert game.events.count("death") == 1


def test_level_clear_advances_and_regenerates():
    game = Game(seed=3)
    game.maze.dots_remaining = 1
    game.maze.energizers_remaining = 0
    # leave exactly one dot under the player path: wipe field, plant one dot
    game.maze.dots = bytearray(len(game.maze.dots))
    from engine.maze import WIDTH
    tx, ty = (12, 23)
    game.maze.dots[ty * WIDTH + tx] = 1
    game.maze.dots_remaining = 1
    game.set_want(LEFT)
    for _ in range(900):
        game.step(tuning.STEP)
        if game.level == 2:
            break
    assert game.level == 2
    assert "level:2" in game.events
    assert game.dots_left == game.maze.total_dots + game.maze.total_energizers


def test_tick_rate_independence():
    fast = Game(seed=11)
    slow = Game(seed=11)
    fast.set_want(LEFT)
    slow.set_want(LEFT)
    for _ in range(600):  # 5 s at 120 Hz
        fast.step(tuning.STEP)
    for _ in range(150):  # 5 s at 30 Hz chunks
        slow.step(1.0 / 30)
    assert fast.state_hash() == slow.state_hash()
