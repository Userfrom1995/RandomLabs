"""Tester red-team suite for Pac-Man Phase 1 (PR #553, issue #552).

Durable hostile verification: CLI happy-path plus error flows, engine
boundary traps, determinism parity, render-protocol framing, and static
site presence. Every case drives real shipped code paths.
"""
import math
import os
import random
import subprocess
import sys

import pytest

from engine.actors import DIRS, LEFT, RIGHT, UP, DOWN, Actor, opposite, step_actor, tile_of
from engine.game import Game
from engine.maze import HEIGHT, WIDTH, TUNNEL_ROW, Maze
from engine.replay import parse_dir, run_recording, verify_recording
from engine.rng import Rng
from engine import tuning
from render import detect as detect_mod
from render.detect import detect_renderer

LAUNCHER = os.path.join(os.path.dirname(__file__), "..", "pacman.py")


def run_cli(*args):
    return subprocess.run(
        [sys.executable, LAUNCHER, *args],
        capture_output=True, text=True, timeout=120,
    )


# -- CLI live entrypoint ------------------------------------------------

def test_cli_maze_check_live():
    p = run_cli("--maze-check")
    assert p.returncode == 0, p.stderr + p.stdout
    assert "dots: 282 energizers: 4 reachable: 286/286" in p.stdout
    assert "maze OK" in p.stdout


def test_cli_self_check_deterministic_live():
    a = run_cli("--self-check", "--seed", "1", "--ticks", "2400")
    b = run_cli("--self-check", "--seed", "1", "--ticks", "2400")
    assert a.returncode == 0 and b.returncode == 0
    ha = [l for l in a.stdout.splitlines() if l.startswith("hash:")][0]
    hb = [l for l in b.stdout.splitlines() if l.startswith("hash:")][0]
    assert len(ha.split()[1]) == 64
    assert ha == hb  # bit-identical across processes
    # Resurveyed in the ghost-movement remediation (ghosts were frozen
    # before; now live hunters intercept the greedy autopilot): seed 1 /
    # 2400 ticks eats 147 dots with 1 energizer, 1 ghost eaten, 2 deaths.
    assert "dots-eaten: 147" in a.stdout


def test_cli_self_check_seed2_live():
    p = run_cli("--self-check", "--seed", "2", "--ticks", "100")
    assert p.returncode == 0
    assert "dots-left: 278" in p.stdout


def test_cli_hostile_flags_exit_2():
    for args in (("--level", "0"), ("--ticks", "0"),
                 ("--ticks", "-5"), ("--renderer", "bogus", "--maze-check")):
        p = run_cli(*args)
        assert p.returncode == 2, (args, p.stdout, p.stderr)
        assert "error" in (p.stdout + p.stderr).lower()


def test_cli_renderer_variants_live():
    for name in ("unicode", "kitty", "sixel"):
        p = run_cli("--self-check", "--renderer", name, "--ticks", "20")
        assert p.returncode == 0, (name, p.stdout, p.stderr)
        assert p.stdout.splitlines()[0].startswith("renderer: ")


def test_cli_no_args_prints_help_exit_0():
    p = run_cli()
    assert p.returncode == 0
    assert "headless engine" in (p.stdout + p.stderr).lower() or "usage" in (p.stdout + p.stderr).lower()


# -- maze hostile traps -------------------------------------------------

def test_maze_symmetry_and_counts():
    m = Maze()
    assert (WIDTH, HEIGHT) == (28, 31)
    for y in range(HEIGHT):
        for x in range(WIDTH // 2):
            assert m.grid[y][x] == m.grid[y][WIDTH - 1 - x], (x, y)
    assert m.total_dots == 282
    assert m.total_energizers == 4
    assert m.reachable_dots_from((13, 23)) == 286


def test_maze_tile_oob_raises():
    m = Maze()
    with pytest.raises(IndexError):
        m.tile(-1, 0)
    with pytest.raises(IndexError):
        m.tile(WIDTH, 0)
    assert m.eat_at(-1, TUNNEL_ROW) is None
    assert m.has_dot(-5, -5) is False


def test_maze_ghost_door_not_player_walkable():
    m = Maze()
    assert m.is_walkable(13, 12) is False
    assert m.is_walkable(13, 12, for_ghost=True) is True
    assert m.is_walkable(13, 14) is False
    assert m.is_walkable(13, 14, for_ghost=True) is True


def test_maze_eat_idempotent():
    m = Maze()
    got = None
    for y in range(HEIGHT):
        for x in range(WIDTH):
            r = m.eat_at(x, y)
            if r == "dot" and got is None:
                got = (x, y)
    assert got is not None
    assert m.eat_at(*got) is None  # second eat is a no-op


def test_maze_tunnel_mouths_walkable_offgrid():
    m = Maze()
    assert m.is_walkable(-1, TUNNEL_ROW) is True
    assert m.is_walkable(WIDTH, TUNNEL_ROW) is True
    assert m.is_walkable(-1, 0) is False
    assert m.is_walkable(5, -1) is False


# -- movement hostile fuzz ----------------------------------------------

def test_movement_fuzz_never_in_wall_no_nan():
    rng = random.Random(552)
    m = Maze()
    from engine.maze import PLAYER_START_TILE
    from engine.actors import center_of
    cx, cy = center_of(*PLAYER_START_TILE)
    for trial in range(60):
        a = Actor(cx, cy, rng.choice(DIRS), tuning.player_speed(1))
        a.want = rng.choice(DIRS)
        for _ in range(50):
            if rng.random() < 0.3:
                a.want = rng.choice(DIRS)
            step_actor(m, a, tuning.STEP)
            assert math.isfinite(a.x) and math.isfinite(a.y)
            tx, ty = tile_of(a.x, a.y)
            assert 0 <= tx < WIDTH and 0 <= ty < HEIGHT, (a.x, a.y)
            assert m.is_walkable(tx, ty), (a.x, a.y, tx, ty)


def test_movement_instant_reversal():
    from engine.maze import PLAYER_START_TILE
    from engine.actors import center_of
    m = Maze()
    cx, cy = center_of(*PLAYER_START_TILE)
    a = Actor(cx, cy, LEFT, tuning.player_speed(1))
    a.want = RIGHT
    step_actor(m, a, tuning.STEP)
    assert a.dir == RIGHT


def test_movement_tick_rate_independence():
    def run(chunks):
        g = Game(seed=7)
        g.set_want(RIGHT)
        for c in chunks:
            g.step(c)
        return (round(g.player.x, 4), round(g.player.y, 4))
    fine = run([tuning.STEP] * 120)
    coarse = run([tuning.STEP * 4] * 30)
    assert abs(fine[0] - coarse[0]) + abs(fine[1] - coarse[1]) < 0.6


def test_game_dt_nonpositive_raises():
    g = Game(seed=1)
    with pytest.raises(ValueError):
        g.step(0)
    with pytest.raises(ValueError):
        g.step(-0.5)
    with pytest.raises(ValueError):
        Game(seed=1, level=0)


# -- game flow traps -----------------------------------------------------

def test_death_respawn_and_game_over_flow():
    g = Game(seed=3)
    assert g.running is True
    for _ in range(4):  # 3 lives + final death -> over (0.5 s clamp per step: pump)
        g.kill_player()
        for _ in range(8):
            g.step(0.5)
            if g.state in ("play", "over"):
                break
    assert g.state == "over"
    assert g.running is False
    assert "game-over" in g.events


def test_kill_player_idempotent_outside_play():
    g = Game(seed=3)
    g.kill_player()
    n = len(g.events)
    g.kill_player()  # already dying: no duplicate event
    assert len(g.events) == n


def test_ghost_chain_caps_at_1600():
    g = Game(seed=3)
    got = [g.notify_ghost_eaten() for _ in range(6)]
    assert got[:4] == [200, 400, 800, 1600]
    assert got[4] == 1600 and got[5] == 1600


def test_extra_life_awarded_once():
    g = Game(seed=3)
    before = g.lives
    g._add_score(tuning.EXTRA_LIFE_AT)
    assert g.lives == before + 1
    g._add_score(tuning.EXTRA_LIFE_AT * 2)
    assert g.lives == before + 1  # never again
    assert g.events.count("extra-life") == 1


def test_energizer_resets_fright_chain():
    g = Game(seed=3)
    g.notify_ghost_eaten()
    assert g.ghosts_eaten_chain == 1
    g.reset_fright_chain()
    assert g.notify_ghost_eaten() == 200


# -- determinism / replay / rng ------------------------------------------

def test_replay_verify_roundtrip():
    from shell.cli import autopilot_inputs
    inputs = autopilot_inputs(11, 200)
    digest, _, _ = run_recording(11, inputs, 200)
    ok, actual = verify_recording(11, inputs, 200, digest)
    assert ok and actual == digest
    bad, _ = verify_recording(11, inputs, 200, "0" * 64)
    assert bad is False


def test_replay_hash_differs_by_seed():
    from shell.cli import autopilot_inputs
    h1, _, _ = run_recording(1, autopilot_inputs(1, 120), 120)
    h2, _, _ = run_recording(2, autopilot_inputs(2, 120), 120)
    assert h1 != h2


def test_rng_stream_isolation():
    r1 = Rng(99)
    a_seq = [r1.fork("movement").next_u32() for _ in range(5)]
    r2 = Rng(99)
    r2.fork("brand-new-consumer").next_u32()
    b_seq = [r2.fork("movement").next_u32() for _ in range(5)]
    assert a_seq == b_seq  # new consumer cannot shift existing stream
    r3 = Rng(99)
    r4 = Rng(100)
    assert [r3.fork("x").next_u32() for _ in range(3)] != \
           [r4.fork("x").next_u32() for _ in range(3)]


def test_rng_hostile_args():
    r = Rng(5).fork("t")
    with pytest.raises(ValueError):
        r.randrange(0)
    with pytest.raises(ValueError):
        r.choice([])
    with pytest.raises(ValueError):
        parse_dir("diagonal-ish")
    with pytest.raises(ValueError):
        parse_dir(None)
    assert parse_dir("  LEFT ") == LEFT
    assert parse_dir("Up") == UP


def test_canonical_hash_stable_across_instances():
    from shell.cli import autopilot_inputs
    inputs = autopilot_inputs(4, 60)
    h1, _, _ = run_recording(4, inputs, 60)
    h2, _, _ = run_recording(4, inputs, 60)
    assert h1 == h2 and len(h1) == 64


# -- render protocol hostile ----------------------------------------------

def test_render_backends_string_out_and_framing():
    from render.framebuffer import BLANK, FrameBuffer
    from render.unicode import UnicodeBackend
    from render.kitty import KittyBackend, place_image, transmit_image
    from render.sixel import dcs_wrap, encode_solid, frame_solid
    from render import ansi
    fb = FrameBuffer(4, 2)
    cell = BLANK._replace(glyph="a")
    fb.set(0, 0, cell)
    dirty = fb.dirty_cells()
    u = UnicodeBackend()
    init = u.init(4, 2)
    assert isinstance(init, str) and ansi.ALT_ENTER in init
    out = u.present(fb, dirty)
    assert isinstance(out, str) and "a" in out
    assert ansi.SYNC_BEGIN in out and ansi.SYNC_END in out
    assert u.clear() and u.shutdown()
    # kitty wire format: transmit-once (a=T) then place (a=p)
    tx = transmit_image(b"\x89PNG-fake", 1, 8, 8)
    assert "a=T" in tx
    pl = place_image(1, 0, 0)
    assert "a=p" in pl
    k = KittyBackend()
    assert k.transmit_atlas(b"\x89PNG-fake", 1, 8, 8)
    assert "a=p" in k.place(1, 0, 0)
    with pytest.raises(ValueError):
        k.place(999, 0, 0)  # never transmitted
    with pytest.raises(ValueError):
        transmit_image(b"", 1, 8, 8)
    # sixel DCS framing + real solid encoder
    framed = frame_solid(6, 6)
    assert framed.startswith("\x1bPq") and framed.endswith("\x1b\\")
    assert dcs_wrap(encode_solid(4, 12)) .startswith("\x1bP")
    with pytest.raises(ValueError):
        encode_solid(0, 4)
    with pytest.raises(TypeError):
        dcs_wrap(b"bytes-not-str")


def test_render_detect_hostile_and_degrade():
    with pytest.raises(ValueError):
        detect_renderer("bogus")
    assert detect_renderer("kitty", pillow=False) == "unicode"  # honest degrade
    assert detect_renderer("sixel", pillow=False) == "unicode"
    assert detect_renderer("unicode", pillow=False) == "unicode"
    assert detect_renderer("KITTY", pillow=True) == "kitty"
    assert detect_renderer(env={"KITTY_WINDOW_ID": "7"}, pillow=True) == "kitty"
    assert detect_renderer(env={}, pillow=False) == "unicode"


def test_render_framebuffer_dirty_tracking():
    from render.framebuffer import BLANK, FrameBuffer
    fb = FrameBuffer(3, 3)
    assert len(fb.dirty_cells()) == 9  # fresh buffer is fully dirty
    fb.clear_dirty()
    assert fb.dirty_cells() == []
    fb.set(1, 1, BLANK._replace(glyph="p"))
    assert 4 in fb.dirty_cells()
    with pytest.raises(IndexError):
        fb.set(9, 9, BLANK)
    with pytest.raises(ValueError):
        FrameBuffer(0, 3)


# -- tuning curves --------------------------------------------------------

def test_tuning_curves_clamp_and_reject():
    assert tuning.player_speed(1) == pytest.approx(8.5)
    assert tuning.player_speed(999) == tuning.player_speed(9)
    with pytest.raises(ValueError):
        tuning.player_speed(0)
    assert tuning.fright_duration(11) == 0.0
    assert tuning.fruit_points(13) == 5000
    sched = tuning.wave_schedule(9)
    assert all(s >= 1.0 for s, _ in sched)


# -- static site presence ---------------------------------------------------

def test_site_hub_present_and_linked():
    hub = os.path.join(os.path.dirname(__file__), "..", "index.html")
    assert os.path.exists(hub)
    html = open(hub, encoding="utf-8").read()
    assert "--maze-check" in html and "--self-check" in html
    assert "552" in html
