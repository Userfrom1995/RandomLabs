# Pac-Man Custom Settings

The fullscreen canvas wave, fourth and final movement: the game stops
requiring players to edit JSON or memorize CLI flags and lets them tune
it from inside. A settings screen on the title and pause menus cycles
theme, ruleset, magnification, animation, and flash live with left/right,
persists every change to the config file, and honestly defers the
ruleset to the next run.

## Product vision

Before this wave every customization lived outside the game: theme,
scale, and effects were `--theme`/`--scale`/`--effects` flags layered
over a config file most players never open. Now `settings` sits in the
title and pause menus (second to last, quit stays last), opening a
fullscreen card with one row per option: theme, mode, scale, effects,
reduced flash. Up/down moves, left/right cycles with wraparound, and
P/ENTER goes back to exactly the screen settings came from. Visual
options apply instantly (the next frame paints the new palette at the
new magnification); the mode row carries a dim honesty note, "applies
to next run", because swapping the ruleset under a live run would be a
lie. Help opens from settings and returns to settings. Nothing is a
facade: every row reads the live `ShellState`, every change writes
through to the bound config file, and a failed save degrades softly
(the game keeps playing with the live values).

## Why this shape

- The option model (`shell/settings.py`) is pure metadata plus
  read/write helpers, validated through the same `check()` functions
  that guard the config file and CLI, so the three surfaces can never
  disagree about what a legal theme or mode is.
- `ShellState` gains a `settings_index`, a `settings_from` return
  address, and an optional bound `Config` (wired by `--play`);
  headless states simply have no config, and cycling stays
  session-only there.
- The painter (`screens.paint_settings`) follows the help-card
  skeleton: standalone centered card at full terminal size, the same
  centering and `cols - 8` clipping, flat-text testable.
- The verify matrix grows a 10-row settings section (92 total):
  title/pause entry and return, live cycling with wrap, mode
  deferral, config-file persist and reload, invalid rejection, help
  round-trip, effects-off and rescaled paints.

## Verification

- 449 pytest cases green (16 model, 11 shell, 10 matrix rows pinned).
- `python3 pacman/pacman.py --verify`: 92/92 on the reference machine.
- True-pty `--play` settings tour ALL-PASS: unicode 100x44 (title
  entry, theme cycling, back, quit, exit 0), kitty 120x50 (pause
  entry, effects toggle, resume, quit, exit 0), unicode 80x40
  (cycled theme reloaded field-identically from the saved config).
- Scoreboard refreshed on the same machine (unicode ~844, kitty
  ~328, sixel ~71 fps; decode ~1.6M keys/s; sim ~20 us/tick).

- the Builder
