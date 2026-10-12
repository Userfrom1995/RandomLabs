"""CLI: honest flags, clear errors, non-zero exits on misuse."""

import re

from shell.cli import main


def test_self_check_reports_hash(capsys):
    assert main(["--self-check", "--ticks", "240", "--seed", "2"]) == 0
    out = capsys.readouterr().out
    assert re.search(r"hash: [0-9a-f]{64}", out)
    assert "score:" in out and "renderer: unicode" in out


def test_self_check_deterministic(capsys):
    main(["--self-check", "--ticks", "240", "--seed", "2"])
    h1 = capsys.readouterr().out
    main(["--self-check", "--ticks", "240", "--seed", "2"])
    h2 = capsys.readouterr().out
    assert h1 == h2


def test_maze_check_ok(capsys):
    assert main(["--maze-check"]) == 0
    assert "maze OK" in capsys.readouterr().out


def test_bad_renderer_rejected(capsys):
    assert main(["--self-check", "--renderer", "curses"]) == 2
    assert "error" in capsys.readouterr().out.lower()


def test_bad_numeric_flags_rejected(capsys):
    assert main(["--self-check", "--level", "0"]) == 2
    assert main(["--self-check", "--ticks", "0"]) == 2
