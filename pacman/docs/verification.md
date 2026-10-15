# Pac-Man Terminal Arcade - Verification Report

Produced by `python3 pacman/pacman.py --verify` (47 rows, all passing on the
reference machine). The same matrices live in `src/shell/verify.py`, so the
CLI, this report, and the pytest suite (`tests/test_verify_final.py`) can
never drift apart: the suite pins the row counts and fails if a check goes
quiet.

## Gameplay (15 rows)

Dot and energizer scoring through the real pickup path, fright activation
with the 200-point chain opener, death costing exactly one life with
respawn, last-life defeat with the recorded reason, maze-clear level
transition onto a fresh dot field (the level-2 dot check allows a +-4
window because the landing step already eats the spawn tile plus any
buffered pickup in the same slice), fruit ripening at its dot threshold with
tier points, time-attack timeout, sprint's no-fright rule, shell restart
building a genuinely fresh run, pause/resume cycling, pause freezing the
simulation clock (driven through the real headless `run()` freeze gate:
play advances ticks, paused frames hold them despite clock time passing,
resume advances them again), and tunnel wrap. Two remediation rows prove
the ghost freeze is gone: active hunters displace whole tiles within
seconds (peak displacement tracked, so a mid-run death cannot hide a
freeze), and frightened ghosts roam double-digit tiles while fright lasts.

## Terminal sizes (6 rows)

The scene needs 28x34 cells. Exact fit passes, roomy terminals (80x50,
120x40) pass, and anything smaller (standard 80x24, classic 80x25, tiny
20x10) routes to the honest too-small card instead of a garbled maze.
Note: a stock 80x24 terminal is below the minimum, the game tells you so.
Fitting terminals center the scene (verified live in a real pty at 80x40,
100x44, and 120x50, plus a mid-game 80x40 to 120x50 resize that recenters
exactly); the size matrix pins the fit/too-small routing while the parity
rows below pin the centering offsets.

## Renderer capability (8 rows)

Kitty and Ghostty environments detect to kitty, sixel terminals to sixel,
plain terminals to unicode, missing Pillow degrades image backends to
unicode, explicit flags and `PACMAN_RENDERER` override detection, and an
unknown backend name raises a clear error.

## Input methods (7 rows)

CSI and SS3 arrows, WASD, pause/quit/confirm/restart keys, trailing partial
escape sequences held for the next read (slow terminals never turn an arrow
into a pause), and invalid remaps rejected with a clear error.

## Fallback parity (11 rows)

28x34 geometry on every theme, identical grids across classic/neon/amber,
single-column glyphs everywhere, a text glyph on every sprite cell, and a
clean `present()` on each available backend. Four remediation rows pin the
real-terminal fixes against the live backends: a moved kitty sprite erases
its departed cell before placing the new one, a steady frame emits no
image commands at all, a 100x44 terminal centers the scene at offset
(36, 5), and a resize to 120x50 recenters at (46, 8).
