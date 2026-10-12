"""Tester final-gate regression suite for the verification/scoreboard phase.

Hostile, black-box checks against the shipped CLI entrypoint and the real
verify matrices: error paths must exit non-zero with clear errors, hostile
input bytes must never raise, benches must hold their budgets, and the
published docs hub files must exist and stay consistent.
"""

import os

from shell import verify as verify_mod
from shell.cli import main
from shell.input import Keymap, decode_stream


def test_tester_final_error_paths_exit_two(capsys):
    assert main(["--scoreboard", "--frames", "0"]) == 2
    assert "error" in capsys.readouterr().out.lower()
    assert main(["--render-bench", "--frames", "-3"]) == 2
    assert "error" in capsys.readouterr().out.lower()
    assert main(["--level", "0", "--self-check"]) == 2
    assert "error" in capsys.readouterr().out.lower()
    assert main(["--renderer", "hologram", "--render-check"]) == 2
    assert "unknown renderer" in capsys.readouterr().out.lower()


def test_tester_final_verify_stable_across_seeds():
    names_1 = [r["name"] for _, rows in verify_mod.full_matrix(seed=1) for r in rows]
    for seed in (2, 7, 999):
        sections = verify_mod.full_matrix(seed=seed)
        assert [r["name"] for _, rows in sections for r in rows] == names_1
        failed = [(s, r["name"]) for s, rows in sections for r in rows if not r["passed"]]
        assert failed == []


def test_tester_final_hostile_input_never_raises():
    keymap = Keymap()
    hostile = [b"", b"\x00\xff\xfe", b"\x1b", b"\x1b[", b"\x1bO",
               bytes(range(256)), b"\x1b[Awasdrpq " * 2000, b"qqqqqq"]
    for blob in hostile:
        actions, leftover = decode_stream(blob, keymap)
        assert isinstance(actions, list)
        assert isinstance(leftover, bytes)


def test_tester_final_bench_budgets_hold():
    bench = verify_mod.input_bench(rounds=50)
    assert bench["decode_keys_per_s"] > 10_000
    assert bench["sim_us_per_tick"] < 8333
    render = verify_mod.render_bench(frames=3, seed=1)
    assert render["unicode"]["available"] is True
    assert render["unicode"]["fps"] > 0


def test_tester_final_scoreboard_shape(capsys):
    assert main(["--scoreboard", "--frames", "3"]) == 0
    out = capsys.readouterr().out
    for token in ("scoreboard OK", "unicode", "sim-step", "input-decode", "parity"):
        assert token in out


def test_tester_final_docs_hub_present():
    root = os.path.join(os.path.dirname(__file__), "..")
    for rel in ("docs/verification.md", "docs/scoreboard.md", "docs/index.md",
                "README.md", "index.html"):
        path = os.path.join(root, rel)
        assert os.path.isfile(path), "missing %s" % rel
    html = open(os.path.join(root, "index.html"), encoding="utf-8").read()
    assert "--verify" in html and "--scoreboard" in html
    assert "\u2014" not in html
