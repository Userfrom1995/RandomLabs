"""Phase 2: ghost personalities, wave clock, fright, house, Elroy, eyes."""

import math

import pytest

from engine import tuning
from engine.actors import DOWN, LEFT, RIGHT, UP, center_of, tile_of
from engine.game import Game
from engine.ghosts import (
    AHEAD_AMBUSH,
    DRIFTER_SHY_TILES,
    Ghosts,
)
from engine.maze import GHOST_OUTSIDE_TILE, SCATTER_CORNERS


def test_four_ghosts_distinct_targets():
    game = Game(seed=3)
    ghosts = game.ghosts
    assert [g.name for g in ghosts.ghosts] == ["chaser", "ambusher", "flanker", "drifter"]
    assert [g.state for g in ghosts.ghosts] == ["active", "house", "house", "house"]
    for ghost in ghosts.ghosts:
        ghost.state = "active"
    ghosts.wave_phase = "chase"
    player_tile = tile_of(game.player.x, game.player.y)
    # park the drifter on the player so it retreats to its corner
    ghosts.ghosts[3].actor.x, ghosts.ghosts[3].actor.y = game.player.x, game.player.y
    targets = [ghosts._target_for(g, game.player, player_tile) for g in ghosts.ghosts]
    assert targets[0] == player_tile  # chaser: on the player
    assert targets[1] == (player_tile[0] + game.player.dir[0] * AHEAD_AMBUSH,
                          player_tile[1] + game.player.dir[1] * AHEAD_AMBUSH)
    assert len(set(targets)) == 4  # every personality aims somewhere different


def test_flanker_mirrors_chaser_across_pivot():
    game = Game(seed=3)
    ghosts = game.ghosts
    for ghost in ghosts.ghosts:
        ghost.state = "active"
    ghosts.wave_phase = "chase"
    game.player.dir = game.player.want = RIGHT
    player_tile = tile_of(game.player.x, game.player.y)
    chaser_tile = tile_of(ghosts.ghosts[0].actor.x, ghosts.ghosts[0].actor.y)
    pivot = (player_tile[0] + 2, player_tile[1])
    expect = (2 * pivot[0] - chaser_tile[0], 2 * pivot[1] - chaser_tile[1])
    assert ghosts._target_for(ghosts.ghosts[2], game.player, player_tile) == expect


def test_drifter_retreats_when_close():
    game = Game(seed=3)
    ghosts = game.ghosts
    drifter = ghosts.ghosts[3]
    drifter.state = "active"
    ghosts.wave_phase = "chase"
    player_tile = tile_of(game.player.x, game.player.y)
    # park the drifter on the player: it must aim at its corner, not the player
    drifter.actor.x, drifter.actor.y = game.player.x, game.player.y
    assert ghosts._target_for(drifter, game.player, player_tile) == SCATTER_CORNERS[3]
    # park it far away: it hunts the player
    drifter.actor.x, drifter.actor.y = center_of(1, 1)
    far_tile = tile_of(game.player.x, game.player.y)
    dist = math.dist((1, 1), far_tile)
    assert dist >= DRIFTER_SHY_TILES
    assert ghosts._target_for(drifter, game.player, far_tile) == far_tile


def test_scatter_targets_are_corners():
    game = Game(seed=3)
    ghosts = game.ghosts
    for ghost in ghosts.ghosts:
        ghost.state = "active"
    ghosts.wave_phase = "scatter"
    player_tile = tile_of(game.player.x, game.player.y)
    for i, ghost in enumerate(ghosts.ghosts):
        assert ghosts._target_for(ghost, game.player, player_tile) == SCATTER_CORNERS[i]


def test_wave_clock_advances_and_reverses():
    game = Game(seed=3)
    ghosts = game.ghosts
    ghosts.waves = [(0.5, 0.5), (0.5, 1.0e9)]
    for _ in range(80):  # past the 0.5 s opening scatter
        game.step(tuning.STEP)
    assert ghosts.wave_phase == "chase"
    # reversal contract: active ghosts are ordered about-face, house ghosts kept
    chaser = ghosts.ghosts[0]
    chaser.actor.dir = chaser.actor.want = LEFT
    housed = ghosts.ghosts[3]
    housed_want = housed.actor.want
    ghosts._reverse_all()
    assert chaser.actor.want == RIGHT
    assert housed.actor.want == housed_want


def test_fright_start_flash_and_expiry():
    game = Game(seed=3)
    game.ghosts.start_fright(6.0)
    assert game.fright_active
    assert game.ghosts.wave_mode() == "fright"
    assert not game.fright_flashing
    for _ in range(int(5.0 / tuning.STEP)):
        game.step(tuning.STEP)
    assert game.fright_active and game.fright_flashing  # last 1.5 s warns
    for _ in range(int(2.0 / tuning.STEP)):
        game.step(tuning.STEP)
    assert not game.fright_active
    assert "fright-end" in game.events


def test_fright_zero_duration_is_noop():
    game = Game(seed=3)
    game.ghosts.start_fright(0.0)
    assert not game.fright_active


def test_energizer_triggers_fright_in_game():
    game = Game(seed=3)
    cx, cy = center_of(2, 3)
    game.player.x, game.player.y = cx, cy
    game.player.dir = game.player.want = LEFT
    game._last_tile = (2, 3)
    for _ in range(60):
        game.step(tuning.STEP)
        if game.fright_active:
            break
    assert game.fright_active
    assert game.ghosts.fright_t == pytest.approx(tuning.fright_duration(1), abs=0.05)


def test_ghost_eaten_chain_and_eyes_revive():
    game = Game(seed=3)
    game.ghosts.start_fright(6.0)
    chaser = game.ghosts.ghosts[0]
    chaser.state = "active"
    chaser.actor.x, chaser.actor.y = game.player.x, game.player.y
    chaser.actor.dir = chaser.actor.want = LEFT
    events = game.ghosts.step(tuning.STEP, game)
    assert chaser.state == "eyes"
    assert "ghost-eaten:chaser:200" in events
    assert game.score >= 200
    # eyes walk home and revive at the door
    chaser.actor.x, chaser.actor.y = center_of(13, 10)
    for _ in range(3000):
        game.ghosts._move_ghost(chaser, tuning.STEP, game.player,
                                tile_of(game.player.x, game.player.y), 200)
        if chaser.state == "active":
            break
    assert chaser.state == "active"
    assert tile_of(chaser.actor.x, chaser.actor.y) == GHOST_OUTSIDE_TILE


def test_collision_kills_player_outside_fright():
    game = Game(seed=3)
    chaser = game.ghosts.ghosts[0]
    chaser.actor.x, chaser.actor.y = game.player.x, game.player.y
    chaser.actor.dir = chaser.actor.want = LEFT
    assert not game.fright_active
    game.ghosts.step(tuning.STEP, game)
    assert game.state == "dying"
    assert "death" in game.events


def test_eyes_pass_through_player():
    game = Game(seed=3)
    chaser = game.ghosts.ghosts[0]
    chaser.state = "eyes"
    chaser.actor.x, chaser.actor.y = game.player.x, game.player.y
    game.ghosts.step(tuning.STEP, game)
    assert game.state == "play"  # no kill, no eat


def test_house_counters_release_in_order():
    game = Game(seed=3)
    ghosts = game.ghosts
    ghosts.idle_t = -1000.0  # disable the idle timeout for this test
    assert [g.state for g in ghosts.ghosts] == ["active", "house", "house", "house"]
    ghosts.notify_dots(7)  # ambusher owes 7 on level 1
    assert ghosts.ghosts[1].state == "leaving"
    assert ghosts.ghosts[2].state == "house"
    ghosts.notify_dots(17)  # flanker owes 17
    assert ghosts.ghosts[2].state == "leaving"


def test_house_idle_timeout_releases():
    game = Game(seed=3)
    ghosts = game.ghosts
    assert ghosts.ghosts[1].state == "house"
    for _ in range(int(tuning.HOUSE_IDLE_TIMEOUT_S / tuning.STEP) + 5):
        game.step(tuning.STEP)
        if ghosts.ghosts[1].state != "house":
            break
    assert ghosts.ghosts[1].state in ("leaving", "active")


def test_leaving_ghost_reaches_outside():
    game = Game(seed=3)
    ghosts = game.ghosts
    ghosts.idle_t = -1000.0
    ambusher = ghosts.ghosts[1]
    ghosts.notify_dots(7)
    assert ambusher.state == "leaving"
    for _ in range(3000):
        game.step(tuning.STEP)
        if ambusher.state == "active":
            break
        if game.state != "play":  # death resets the house; keep waiting it out
            for _ in range(400):
                game.step(tuning.STEP)
                if game.state == "play":
                    break
    assert ambusher.state == "active"


def test_tunnel_slows_ghosts():
    game = Game(seed=3)
    ghosts = game.ghosts
    chaser = ghosts.ghosts[0]
    chaser.actor.x, chaser.actor.y = center_of(3, 14)
    slow = ghosts._speed_for(chaser, 200)
    chaser.actor.x, chaser.actor.y = center_of(13, 23)
    cruise = ghosts._speed_for(chaser, 200)
    assert slow == pytest.approx(tuning.player_speed(1) * tuning.GHOST_TUNNEL_FRACTION)
    assert cruise == pytest.approx(
        tuning.player_speed(1) * tuning.GHOST_SPEED_FRACTION)
    assert slow < cruise


def test_elroy_enrage_and_wave_skip():
    game = Game(seed=3)
    game.maze.dots_remaining = 25
    game.maze.energizers_remaining = 0
    assert game.ghosts.elroy_stage() == 0
    game.maze.dots_remaining = 15
    assert game.ghosts.elroy_stage() == 1
    game.maze.dots_remaining = 8
    assert game.ghosts.elroy_stage() == 2
    game.ghosts.wave_phase = "scatter"  # Elroy-2 pins chase regardless
    assert game.ghosts.wave_mode() == "chase"


def test_elroy_speed_bonus():
    game = Game(seed=3)
    ghosts = game.ghosts
    chaser = ghosts.ghosts[0]
    chaser.actor.x, chaser.actor.y = center_of(13, 23)
    calm = ghosts._speed_for(chaser, 200)
    enraged = ghosts._speed_for(chaser, 8)
    assert enraged > calm


def test_ghosts_deterministic_replay():
    from engine.replay import run_recording
    from shell.cli import autopilot_inputs
    inputs = autopilot_inputs(11, 400)
    h1, _, _ = run_recording(11, inputs, 400)
    h2, _, _ = run_recording(11, inputs, 400)
    assert h1 == h2 and len(h1) == 64


def test_ghost_fuzz_never_in_wall():
    import random
    rng = random.Random(5522)
    game = Game(seed=21)
    for t in range(6000):
        if t % 41 == 0:
            game.set_want(rng.choice([UP, DOWN, LEFT, RIGHT]))
        game.step(tuning.STEP)
        for ghost in game.ghosts.ghosts:
            tx, ty = tile_of(ghost.actor.x, ghost.actor.y)
            assert math.isfinite(ghost.actor.x) and math.isfinite(ghost.actor.y)
            assert 0 <= tx < 28 and 0 <= ty < 31
            assert game.maze.is_walkable(tx, ty, for_ghost=True), \
                (ghost.name, tx, ty)
        if game.state != "play":
            for _ in range(400):
                game.step(tuning.STEP)
                if game.state == "play":
                    break


def test_death_resets_ghosts_and_clock():
    game = Game(seed=3)
    for _ in range(1200):
        game.step(tuning.STEP)
    game.kill_player()
    for _ in range(int(tuning.DEATH_SEQUENCE_S / tuning.STEP) + 5):
        game.step(tuning.STEP)
    assert game.state == "play"
    assert [g.state for g in game.ghosts.ghosts] == ["active", "house", "house", "house"]
    assert not game.fright_active
    assert game.ghosts.wave_idx == 0 and game.ghosts.wave_phase == "scatter"


def test_active_ghosts_displace_over_time():
    """Regression: tile-center steering must not pin ghosts in place.

    Strides at 120 Hz are shorter than the steering window, so re-snapping
    on every near-center tick froze every active ghost within 0.1 tiles of
    spawn (the suite stayed green because nothing asserted displacement).
    A live hunter roams whole tiles within seconds.
    """
    game = Game(seed=1)
    chaser = game.ghosts.ghosts[0]
    start = (chaser.actor.x, chaser.actor.y)
    for _ in range(600):  # 5 s: the chaser must leave its spawn tile
        game.step(tuning.STEP)
        if game.state != "play":
            break
    moved = abs(chaser.actor.x - start[0]) + abs(chaser.actor.y - start[1])
    assert tile_of(chaser.actor.x, chaser.actor.y) != tile_of(*start)
    assert moved > 2.0


def test_steering_decides_once_per_tile_visit():
    """The decided gate fires on a fresh tile and holds while inside it."""
    game = Game(seed=3)
    ghosts = game.ghosts
    chaser = ghosts.ghosts[0]
    chaser.actor.x, chaser.actor.y = center_of(13, 11)
    chaser.actor.dir = chaser.actor.want = LEFT
    chaser.decided = None
    player_tile = tile_of(game.player.x, game.player.y)
    ghosts._move_ghost(chaser, tuning.STEP, game.player, player_tile, 200)
    assert chaser.decided == (13, 11)
    first_dir = chaser.actor.dir
    # Still inside the same tile: no re-decision, but travel accumulates.
    before = (chaser.actor.x, chaser.actor.y)
    ghosts._move_ghost(chaser, tuning.STEP, game.player, player_tile, 200)
    assert chaser.decided == (13, 11)
    assert chaser.actor.dir == first_dir
    assert (chaser.actor.x, chaser.actor.y) != before
    # A reversal clears the gate so the next center re-steers.
    ghosts._reverse_all()
    assert chaser.decided is None


def test_frightened_ghosts_roam_while_fright_lasts():
    """Fright random steering must also accumulate into real travel."""
    game = Game(seed=5)
    game.ghosts.start_fright(30.0)
    positions = set()
    for _ in range(1200):
        game.step(tuning.STEP)
        if game.state != "play":
            break
        for ghost in game.ghosts.ghosts:
            if ghost.state == "active":
                positions.add(tile_of(ghost.actor.x, ghost.actor.y))
    assert len(positions) > 10
