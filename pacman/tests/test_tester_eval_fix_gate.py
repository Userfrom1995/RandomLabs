"""Tester eval-fix gate: locks the Quality Council fix round on PR #560.

Covers the two blocking findings from the 8.7/10 verdict so they can never
silently regress:
1. pause-freezes-sim must drive the real run() freeze gate (ticks advance,
   freeze while paused despite clock time passing, advance after resume).
2. Visual-craft gaps must stay closed (maze fit-content, code nowrap,
   fps-per-item units, docs executive summary, Pillow-less disclosure).
"""

import inspect
import os

from shell import verify as verify_mod

ROOT = os.path.join(os.path.dirname(__file__), "..")


def _gameplay_row(name):
    rows = dict(verify_mod.full_matrix(seed=1))["gameplay"]
    hit = [r for r in rows if r["name"] == name]
    assert hit, "missing gameplay row %s" % name
    return hit[0]


def test_tester_evalfix_pause_row_drives_real_run_gate():
    row = _gameplay_row("pause-freezes-sim")
    assert row["passed"], "pause row must pass: %s" % row["detail"]
    # Detail reports the three-phase tick journey played/held/now.
    assert "played=" in row["detail"] and "held=" in row["detail"]
    assert "now=" in row["detail"]
    assert "paused=paused" in row["detail"]
    assert "resumed=playing" in row["detail"]
    played = int(row["detail"].split("played=")[1].split()[0])
    held = int(row["detail"].split("held=")[1].split()[0])
    now = int(row["detail"].split("now=")[1].split()[0])
    assert played > 0, "must advance ticks while playing"
    assert held == played, "ticks must freeze while paused"
    assert now > held, "ticks must advance after resume"
    # The row must go through the real run() loop, not a read-twice check.
    src = inspect.getsource(verify_mod.gameplay_matrix)
    assert "max_frames" in src and "tick_count" in src


def test_tester_evalfix_pause_stable_across_seeds():
    for seed in (1, 7, 999):
        rows = dict(verify_mod.full_matrix(seed=seed))["gameplay"]
        row = [r for r in rows if r["name"] == "pause-freezes-sim"][0]
        assert row["passed"], "seed %d: %s" % (seed, row["detail"])


def test_tester_evalfix_visual_craft_stays_closed():
    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    assert "fit-content" in html, "maze card must size to content"
    assert "nowrap" in html, "inline code must not orphan flags"
    readme = open(os.path.join(ROOT, "README.md"), encoding="utf-8").read()
    assert "unicode ~" in readme and readme.count("fps") >= 3, \
        "README must repeat fps per item"
    idx = open(os.path.join(ROOT, "docs", "index.md"), encoding="utf-8").read()
    assert "verification.md" in idx and "scoreboard.md" in idx, \
        "docs/index.md needs executive summary with doc links"
    sb = open(os.path.join(ROOT, "docs", "scoreboard.md"), encoding="utf-8").read()
    assert "illow" in sb, "scoreboard must disclose Pillow-less skip path"
    for rel in ("docs/verification.md", "docs/scoreboard.md", "docs/index.md",
                "README.md", "index.html"):
        text = open(os.path.join(ROOT, rel), encoding="utf-8").read()
        assert "\u2014" not in text, "em dash in %s" % rel
