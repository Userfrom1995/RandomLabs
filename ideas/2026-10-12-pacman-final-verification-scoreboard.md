# Pac-Man Final Verification and Scoreboard - what it is

The closing phase of the Pac-Man terminal arcade epic: instead of new
gameplay, it proves everything already built actually works and publishes
the numbers. A new `pacman/src/shell/verify.py` module owns five headless
matrices (41 rows total) that drive the real engine, shell, and renderer
with no tty, no sleeps, and no mocks of the unit under test; three new CLI
flags expose them; two new docs pages publish the results; the Pages hub
gains a scoreboard section.

## Why this shape

Earlier phases each shipped their own checks (`--maze-check`,
`--self-check`, `--render-check`, `--render-bench`), but nothing tied
gameplay transitions, terminal sizes, capability detection, input methods,
and fallback parity together in one runnable, testable place. The owner
spec demands real terminal verification and a published scoreboard, so the
final phase makes the matrix itself a first-class module that the CLI, the
docs, and pytest all import: `tests/test_verify_final.py` pins the exact
row counts, so a silently dropped check fails loudly instead of rotting.

## How it works

- `gameplay_matrix()` (13 rows): dot/energizer scoring through
  `_eat_current_tile`, fright plus the 200-point chain opener, death with
  respawn costing one life, last-life defeat, maze-clear level transition
  (board emptied tile-by-tile through `eat_at` so counters stay honest, then
  the real 2 s clearing timer), fruit ripening and pickup at its threshold,
  time-attack timeout, sprint's no-fright rule, shell restart freshness and
  pause/resume through `ShellState`, and tunnel wrap. Large-dt steps are
  sliced at 0.25 s because the engine clamps its accumulator at 0.5 s.
- `size_matrix()` (6 rows): the 28x34 scene against exact-fit, stock 80x24
  (honest too-small card), 80x25, 80x50, 120x40, and tiny windows.
- `capability_matrix()` (8 rows): kitty/ghostty/sixel/plain detection, the
  no-Pillow degrade, explicit and env-var overrides, unknown-name rejection.
- `input_matrix()` (7 rows): CSI/SS3 arrows, WASD, pause/quit/confirm/restart,
  partial-escape holds, bad-remap rejection.
- `parity_check()` (7 rows): shared 28x34 geometry across themes,
  single-column glyphs, text fallback on every sprite cell, clean `present()`
  per backend.
- `input_bench()` / `render_bench()`: decode throughput (~1.9M keys/s),
  sim-tick cost (~25 us vs the 8,333 us 120 Hz budget), per-backend fps
  (unicode ~875, kitty ~595, sixel ~72 headless on the reference box).
- CLI: `--verify` (exit 1 on any failure, for CI), `--input-bench`,
  `--scoreboard` (machine line plus all numbers plus parity pointer).

## Key files

- `pacman/src/shell/verify.py` - the matrices and benches
- `pacman/src/shell/cli.py` - `cmd_verify`, `cmd_input_bench`, `cmd_scoreboard`
- `pacman/tests/test_verify_final.py` - 9 tests (matrix green, counts pinned, CLI)
- `pacman/docs/verification.md`, `pacman/docs/scoreboard.md` - published reports
- `pacman/README.md`, `pacman/docs/index.md`, `pacman/index.html` - unified updates

## Notes

- Reference numbers were measured on Linux x86_64 / Python 3.12.3 / Pillow
  12.3.0; headless throughput varies by machine, so the docs say to rerun
  `--scoreboard` locally rather than treating the table as a gate.
- A stock 80x24 terminal is below the 28x34 minimum by design; the game says
  so with a too-small card instead of rendering garbage.
- The landing slice after a level transition can eat a few dots before the
  harness re-checks, so the level-transition row allows a small, documented
  tolerance instead of asserting an exact count.
