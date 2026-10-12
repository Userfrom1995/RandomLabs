"""Determinism: seeded streams, replay hashes, tick-rate convergence."""

from engine import tuning
from engine.game import Game
from engine.replay import parse_dir, run_recording, verify_recording
from engine.rng import Rng


def test_streams_deterministic_and_split():
    a, b = Rng(42), Rng(42)
    assert [a.fork("ghost").next_u32() for _ in range(10)] == \
           [b.fork("ghost").next_u32() for _ in range(10)]
    # forking new consumers never shifts an existing stream
    r = Rng(42)
    g = r.fork("ghost")
    seq = [g.next_u32() for _ in range(5)]
    r.fork("fruit")
    r.fork("zzz")
    seq += [g.next_u32() for _ in range(5)]
    fresh = Rng(42)
    expect = [fresh.fork("ghost").next_u32() for _ in range(10)]
    assert seq == expect


def test_stream_golden_values():
    # Locks the mixing function: identical on every machine and process.
    g = Rng(1).fork("sim")
    assert [g.next_u32() for _ in range(5)] == [
        3040149545, 2711510473, 79966800, 2423744193, 3951505851,
    ]


def test_same_recording_same_hash():
    inputs = [(0, parse_dir("left")), (300, parse_dir("up")), (900, parse_dir("right"))]
    h1, _, _ = run_recording(5, inputs, 1200)
    h2, _, _ = run_recording(5, inputs, 1200)
    assert h1 == h2
    assert len(h1) == 64


def test_different_inputs_different_hash():
    base = [(0, parse_dir("left"))]
    alt = [(0, parse_dir("right"))]
    h1, _, _ = run_recording(5, base, 1200)
    h2, _, _ = run_recording(5, alt, 1200)
    assert h1 != h2


def test_verify_recording_roundtrip():
    inputs = [(0, parse_dir("left")), (500, parse_dir("down"))]
    digest, _, _ = run_recording(9, inputs, 800)
    ok, actual = verify_recording(9, inputs, 800, digest)
    assert ok and actual == digest
    ok, _ = verify_recording(9, inputs, 800, "0" * 64)
    assert not ok


def test_parse_dir_names_and_rejects_garbage():
    assert parse_dir("Up") == (0, -1)
    assert parse_dir(" LEFT ") == (-1, 0)  # whitespace-tolerant
    for bad in ("north", "", None, 42):
        try:
            parse_dir(bad)
        except ValueError:
            continue
        raise AssertionError("accepted %r" % (bad,))


def test_coarse_dt_matches_fine_dt():
    inputs = [(0, parse_dir("left")), (200, parse_dir("up"))]
    g_fine = Game(seed=4)
    for t in range(600):
        for tick, d in inputs:
            if tick == t:
                g_fine.set_want(d)
        g_fine.step(tuning.STEP)
    g_coarse = Game(seed=4)
    for t in range(0, 600, 4):
        for tick, d in inputs:
            if t <= tick < t + 4:
                g_coarse.set_want(d)
        g_coarse.step(4 * tuning.STEP)
    assert g_fine.state_hash() == g_coarse.state_hash()
