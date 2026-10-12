"""Fixer regression: BFS must terminate past full clear (Evaluator FIX verdict)."""

import subprocess
import sys

from engine.maze import Maze
from shell.cli import autopilot_inputs, bfs_first_step


def test_bfs_empty_maze_terminates():
    maze = Maze()
    maze.dots = bytearray(len(maze.dots))
    maze.energizers = bytearray(len(maze.energizers))
    # Must return promptly, not hang: exercises the no-pickup fallback.
    got = bfs_first_step(maze, (13, 23))
    assert isinstance(got, tuple) and len(got) == 2


def test_bfs_tunnel_wrap_dedupes():
    maze = Maze()
    maze.dots = bytearray(len(maze.dots))
    maze.energizers = bytearray(len(maze.energizers))
    # Tunnel mouth start: wrapped re-entries must be recognized as visited.
    got = bfs_first_step(maze, (0, 14))
    assert isinstance(got, tuple) and len(got) == 2


def test_autopilot_past_full_clear_terminates():
    # Seed 1 clears the maze before tick 5000; running to 6000 must finish.
    proc = subprocess.run(
        [sys.executable, "pacman/pacman.py", "--self-check",
         "--seed", "1", "--ticks", "6000"],
        capture_output=True, text=True, timeout=60)
    assert proc.returncode == 0, proc.stderr[-2000:]
    assert "hash:" in proc.stdout
