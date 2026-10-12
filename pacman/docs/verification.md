# Pac-Man Terminal Arcade - Verification Report

Produced by `python3 pacman/pacman.py --verify` (41 rows, all passing on the
reference machine). The same matrices live in `src/shell/verify.py`, so the
CLI, this report, and the pytest suite (`tests/test_verify_final.py`) can
never drift apart: the suite pins the row counts and fails if a check goes
quiet.

## Gameplay (13 rows)

Dot and energizer scoring through the real pickup path, fright activation
with the 200-point chain opener, death costing exactly one life with
respawn, last-life defeat with the recorded reason, maze-clear level
transition onto a fresh dot field, fruit ripening at its dot threshold with
tier points, time-attack timeout, sprint's no-fright rule, shell restart
building a genuinely fresh run, pause/resume cycling, pause freezing the
simulation clock, and tunnel wrap.

## Terminal sizes (6 rows)

The scene needs 28x34 cells. Exact fit passes, roomy terminals (80x50,
120x40) pass, and anything smaller (standard 80x24, classic 80x25, tiny
20x10) routes to the honest too-small card instead of a garbled maze.
Note: a stock 80x24 terminal is below the minimum, the game tells you so.

## Renderer capability (8 rows)

Kitty and Ghostty environments detect to kitty, sixel terminals to sixel,
plain terminals to unicode, missing Pillow degrades image backends to
unicode, explicit flags and `PACMAN_RENDERER` override detection, and an
unknown backend name raises a clear error.

## Input methods (7 rows)

CSI and SS3 arrows, WASD, pause/quit/confirm/restart keys, trailing partial
escape sequences held for the next read (slow terminals never turn an arrow
into a pause), and invalid remaps rejected with a clear error.

## Fallback parity (7 rows)

28x34 geometry on every theme, identical grids across classic/neon/amber,
single-column glyphs everywhere, a text glyph on every sprite cell, and a
clean `present()` on each available backend.
