"""Final phase: the verification matrix, input bench, and scoreboard.

Every row drives the real engine/shell/renderer headlessly; the suite pins
the row counts so a silently dropped check fails loudly.
"""

from shell import verify as verify_mod
from shell.cli import main


def test_full_matrix_all_pass_seed_1():
    sections = verify_mod.full_matrix(seed=1)
    assert [name for name, _ in sections] == [
        "gameplay", "terminal-size", "layout", "visual", "capability",
        "input", "controls", "parity"]
    failed = [(section, row["name"], row["detail"])
              for section, rows in sections for row in rows
              if not row["passed"]]
    assert failed == []


def test_matrix_row_counts_pinned():
    counts = {section: len(rows)
              for section, rows in verify_mod.full_matrix(seed=1)}
    assert counts["gameplay"] == 15
    assert counts["terminal-size"] == 6
    assert counts["layout"] == 10
    assert counts["visual"] == 13
    assert counts["capability"] == 8
    assert counts["input"] == 7
    assert counts["controls"] == 12
    assert counts["parity"] == 11
    assert sum(counts.values()) == 82


def test_verify_matrix_stable_across_seeds():
    first = [(r["name"], r["passed"]) for _, rows in verify_mod.full_matrix(seed=1)
             for r in rows]
    second = [(r["name"], r["passed"]) for _, rows in verify_mod.full_matrix(seed=7)
              for r in rows]
    assert [n for n, _ in first] == [n for n, _ in second]
    assert all(passed for _, passed in second)


def test_input_bench_sane():
    bench = verify_mod.input_bench(rounds=50)
    assert bench["keys_decoded"] > 0
    assert bench["decode_keys_per_s"] > 10_000
    assert bench["decode_ns_per_key"] < 100_000
    assert bench["sim_us_per_tick"] < 8333  # 120 Hz budget with wide margin
    assert bench["sim_ticks_per_s"] > 120


def test_render_bench_unicode_always_available():
    bench = verify_mod.render_bench(frames=5, seed=1)
    assert bench["unicode"]["available"] is True
    assert bench["unicode"]["fps"] > 0
    assert bench["unicode"]["full_bytes"] > 0


def test_cli_verify_passes(capsys):
    assert main(["--verify", "--seed", "1"]) == 0
    out = capsys.readouterr().out
    assert "verify: 82/82 passed" in out
    assert "FAIL" not in out


def test_cli_input_bench(capsys):
    assert main(["--input-bench"]) == 0
    out = capsys.readouterr().out
    assert "keys/s" in out and "us/tick" in out
    assert "input-bench OK" in out


def test_cli_scoreboard(capsys):
    assert main(["--scoreboard", "--frames", "5"]) == 0
    out = capsys.readouterr().out
    assert "scoreboard OK" in out
    assert "unicode" in out and "sim-step" in out


def test_cli_scoreboard_rejects_bad_frames(capsys):
    assert main(["--scoreboard", "--frames", "0"]) == 2
