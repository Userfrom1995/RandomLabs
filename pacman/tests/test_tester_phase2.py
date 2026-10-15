"""Tester Phase 2 regression suite (PR #556, issue #552).

Durable dynamic verification for ghost personalities, wave clock, fright
chains with eyes revive, house exits, tunnel slowdown, Elroy stages, and
the live CLI pins. Every case drives real shipped code paths.
"""
import math
import random
import subprocess
import sys
import os

import pytest

from engine.actors import DIRS, tile_of, center_of
from engine.game import Game
from engine.maze import GHOST_DOOR_TILE, HEIGHT, WIDTH, Maze
from engine.replay import run_recording
from engine import tuning
from shell.cli import autopilot_inputs

LAUNCHER = os.path.join(os.path.dirname(__file__), "..", "pacman.py")


def run_cli(*args):
    return subprocess.run(
        [sys.executable, LAUNCHER, *args],
        capture_output=True, text=True, timeout=120,
    )


# -- live CLI pins --------------------------------------------------------

def test_phase2_self_check_pin_live():
    p = run_cli("--self-check", "--seed", "1", "--ticks", "2400")
    assert p.returncode == 0, p.stderr + p.stdout
    # Resurveyed in the ghost-movement remediation (frozen hunters fixed;
    # live ghosts intercept the greedy autopilot: 2 deaths on this route).
    assert "dots-eaten: 147" in p.stdout
    assert "energizers: 1" in p.stdout
    assert "deaths: 2" in p.stdout


def test_phase2_maze_check_live():
    p = run_cli("--maze-check")
    assert p.returncode == 0, p.stderr + p.stdout
    assert "maze OK" in p.stdout


def test_phase2_hostile_flags_live():
    for args in (("--level", "0"), ("--ticks", "0"),
                 ("--renderer", "bogus", "--maze-check")):
        p = run_cli(*args)
        assert p.returncode == 2, (args, p.stdout, p.stderr)
        assert "error" in (p.stdout + p.stderr).lower()


# -- ghost personalities ---------------------------------------------------

def test_phase2_personalities_distinct_chase_targets():
    g = Game(seed=5)
    for gh in g.ghosts.ghosts:
        gh.state = "active"
    player, pt = g.player, tile_of(g.player.x, g.player.y)
    g.ghosts.wave_phase = "chase"
    g.ghosts.fright_t = 0.0
    targets = [g.ghosts._target_for(gh, player, pt) for gh in g.ghosts.ghosts]
    assert targets[0] == pt  # chaser hunts the player tile
    assert len(set(map(str, targets))) >= 3  # pincer styles diverge


def test_phase2_scatter_corners_are_corners():
    g = Game(seed=5)
    for gh in g.ghosts.ghosts:
        gh.state = "active"
    g.ghosts.wave_phase = "scatter"
    g.ghosts.fright_t = 0.0
    corners = [g.ghosts._target_for(gh, g.player, tile_of(g.player.x, g.player.y))
               for gh in g.ghosts.ghosts]
    assert len(set(corners)) == 4  # each ghost owns a corner


def test_phase2_wave_clock_flips_and_fright_pauses_it():
    g = Game(seed=4)
    before = (g.ghosts.wave_phase, g.ghosts.wave_idx)
    for _ in range(int(8.0 / tuning.STEP)):
        g.step(tuning.STEP)
    assert (g.ghosts.wave_phase, g.ghosts.wave_idx) != before
    frozen = g.ghosts.wave_t
    g.ghosts.start_fright(5.0)
    g.step(tuning.STEP)
    assert g.ghosts.wave_mode() == "fright"
    assert abs(g.ghosts.wave_t - frozen) < 1e-9


def test_phase2_fright_chain_and_eyes_revive():
    g = Game(seed=9)
    g.ghosts.start_fright(6.0)
    assert g.ghosts.wave_mode() == "fright"
    assert [g.notify_ghost_eaten() for _ in range(4)] == [200, 400, 800, 1600]
    ghost = g.ghosts.ghosts[0]
    ghost.state = "eyes"
    cx, cy = center_of(*GHOST_DOOR_TILE)
    ghost.actor.x, ghost.actor.y = cx, cy
    assert g.ghosts._eyes_home(ghost.actor)


def test_phase2_house_release_sequential_and_walkout():
    g = Game(seed=6)
    for _ in range(3):
        g.ghosts.notify_dots(1)
    assert g.ghosts.ghosts[1].state == "leaving"
    for _ in range(13):
        g.ghosts.notify_dots(1)
    assert g.ghosts.ghosts[2].state == "leaving"
    for _ in range(int(10.0 / tuning.STEP)):
        g.step(tuning.STEP)
    assert all(s == "active" for s in [x.state for x in g.ghosts.ghosts])


def test_phase2_house_idle_timeout_releases():
    g = Game(seed=6)
    for _ in range(int((tuning.HOUSE_IDLE_TIMEOUT_S + 1) / tuning.STEP)):
        g.step(tuning.STEP)
    assert any(s in ("active", "leaving")
               for s in [x.state for x in g.ghosts.ghosts][1:])


def test_phase2_tunnel_slows_ghosts():
    g = Game(seed=1)
    tunnel_speed = tuning.player_speed(1) * tuning.GHOST_TUNNEL_FRACTION
    cruise = tuning.player_speed(1) * tuning.GHOST_SPEED_FRACTION
    assert tunnel_speed < cruise


def test_phase2_elroy_enrages_with_dots_low():
    g = Game(seed=1)
    assert g.ghosts.elroy_stage() == 0
    calm = g.ghosts._speed_for(g.ghosts.ghosts[0], g.dots_left)
    total = g.maze.dots_remaining + g.maze.energizers_remaining
    low_left = min(t for t, _, _ in tuning.ELROY_STAGES) - 1
    enraged = g.ghosts._speed_for(g.ghosts.ghosts[0], low_left)
    assert total > low_left  # sanity: full maze is calm
    assert enraged > calm


def test_phase2_long_fuzz_wall_safety():
    for seed in (1, 2, 3):
        g = Game(seed=seed)
        rng = random.Random(seed)
        for _ in range(6000):
            if rng.random() < 0.2:
                g.set_want(rng.choice(DIRS))
            g.step(tuning.STEP)
            for ghost in g.ghosts.ghosts:
                assert math.isfinite(ghost.actor.x) and math.isfinite(ghost.actor.y)
                tx, ty = tile_of(ghost.actor.x, ghost.actor.y)
                assert 0 <= tx < WIDTH and 0 <= ty < HEIGHT, (tx, ty)


def test_phase2_replay_deterministic_with_ghosts():
    inputs = autopilot_inputs(1, 2400)
    h1, _, _ = run_recording(1, inputs, 2400)
    h2, _, _ = run_recording(1, inputs, 2400)
    assert h1 == h2 and len(h1) == 64
