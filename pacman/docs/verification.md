# Pac-Man Terminal Arcade - Verification Report

Produced by `python3 pacman/pacman.py --verify` (92 rows, all passing on the
reference machine). The same matrices live in `src/shell/verify.py`, so the
CLI, this report, and the pytest suite (`tests/test_verify_final.py`) can
never drift apart: the suite pins the row counts and fails if a check goes
quiet. Real-terminal proof rides alongside: true-pty `--play` drives on
unicode and kitty at 80x50, 100x44, 120x50, and 160x60 (title, magnified
gameplay with side panels, pause, too-small card at 20x10, clean teardown,
symmetric kitty place/erase counts with multi-cell `c=2` placements) plus
sixel and midnight-theme smoke runs, a dedicated menu tour on unicode
100x44 and kitty 120x50 (title navigation, help open and back, mid-game
help, session mute on and off, pause-menu sound toggle, hotkey resume,
clean exit with symmetric kitty place/erase), and a settings tour on
unicode 100x44/80x40 and kitty 120x50 (title and pause entry, left/right
cycling, mode deferred to the next run, config-file persistence
reloaded from disk, clean exit 0).

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

## Responsive layout (10 rows)

The window is a full-screen canvas, not a centered postage stamp. The
layout matrix pins the region thresholds: tiny windows report too-small,
28x34 plays the bare maze cell-identically to the scene painter, narrow
windows gain only the title and hints strips, 56+ column windows gain the
live score/run/progress dashboard, 80+ column windows add the
controls-and-legend panel, and the composer blits the 28x34 scene
verbatim at the layout origin inside frames that always match the
terminal size. `describe()` names every region for `--layout-check`,
with panel thresholds that follow the magnified maze box.

## Scaled visuals (13 rows)

Roomy terminals magnify instead of leaving dead space. The visual matrix
pins the magnification ladder (classic 1x1, wide 2x1 once 56x34 fits,
full 2x2 on huge windows, auto picking the richest fit; unknown modes
fall back to classic while `check()` raises), the doubled wide blit
(origin cells verbatim, fillers repeating the glyph, one `(2,1)` image
span per sprite), and multi-cell kitty placements (`c=2`) on the live
backend. Animation frames are pinned tick by tick: the mouth opens and
closes (legacy paint never emits closed sprites), energizers pulse
through three frames with reduced-flash pinning one, dying advances
four frames over the death sequence, clearing tints walls rainbow, and
fruit sparkles deterministically around its tile. All six themes paint
the shared grid with three distinct wall-drawing styles.

## Renderer capability (8 rows)

Kitty and Ghostty environments detect to kitty, sixel terminals to sixel,
plain terminals to unicode, missing Pillow degrades image backends to
unicode, explicit flags and `PACMAN_RENDERER` override detection, and an
unknown backend name raises a clear error.

## Input methods (7 rows)

CSI and SS3 arrows, WASD, pause/quit/confirm/restart keys, trailing partial
escape sequences held for the next read (slow terminals never turn an arrow
into a pause), and invalid remaps rejected with a clear error.

## Thoughtful controls (12 rows)

Mute and help decode from their default keys and from remapped keys, with
conflicts against existing binds rejected. Session mute genuinely silences
every event voice and unmute restores them. Title confirm still starts the
run, the title menu wraps around both ends, and help and scores round-trip
back to the title with the help card showing its headline. The pause menu
resumes on confirm, toggles sound while staying paused, and quits back to
the title without exiting; the game-over menu restarts on confirm.

## Custom settings (10 rows)

The settings screen is reachable from the title and pause menus and
returns to the screen it came from without disturbing a live run. Theme
cycling changes the live palette (a full cycle wraps back), effects and
scale cycle live on the fullscreen canvas, the mode choice leaves the
running game on its old ruleset (honestly deferred: the next
`start_run` picks it up), every change persists to the config file and
reloads field-identically, invalid values are rejected with the state
kept intact, and help opened from settings returns to settings.

## Fallback parity (11 rows)

28x34 geometry on every theme, identical grids across all six palettes,
single-column glyphs everywhere, a text glyph on every sprite cell, and a
clean `present()` on each available backend. Four remediation rows pin the
real-terminal fixes against the live backends: a moved kitty sprite erases
its departed cell before placing the new one, a steady frame emits no
image commands at all, and the canvas model pins renderer origin (0,0)
with the maze composed at (34,5) on 100x44 and (44,8) after a resize to
120x50 (the composer owns offsets now; resizes re-init the backends at
the new terminal dims and repaint fully).
