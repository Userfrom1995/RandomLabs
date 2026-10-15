# Pac-Man Thoughtful Controls and Menus

The fullscreen canvas wave, third movement: the game stops asking players
to memorize hotkeys and starts showing them what they can do. Title,
pause, and game-over screens are real navigable menus (up/down plus
ENTER), every item does real work, two new first-class keys (M mutes,
? opens help) work everywhere and remap like everything else, and a live
help card always shows the true bindings.

## Product vision

Before this wave the title screen was a poster (ENTER starts, Q quits,
memorize the rest) and pause was a frozen overlay with a text legend.
Now each screen owns a menu with a wrapping selection: title offers
start, help, scores, sound on/off, and quit; pause offers resume,
restart, sound on/off, help, quit to title, and quit; game-over offers
play again, quit to title, and quit. Defaults sit where muscle memory
already is (start, resume, play again), so every legacy hotkey keeps
working exactly as before: ENTER still starts, P still pauses and
resumes, ENTER on game-over still restarts, Q still quits from anywhere.
Left and right never move menus, so steering fingers cannot misfire.
Mute is a session toggle that gates every event voice at the shell
(the events still map, nothing audible plays), and help freezes the
simulation like pause does, returning to exactly the screen it came
from. Nothing is a facade: the sound item shows the live on/off state,
the help card renders the actual remapped bindings, and quit-to-title
resets the title menu.

## Why this shape

- The menu model (`shell/menus.py`) is pure data plus an index: no I/O,
  fully headless-testable, and the only new module. Labels are built
  live from mute state and keymap, so toggles and remaps can never show
  stale text.
- Paints extend existing cards with optional menu parameters whose
  defaults reproduce the legacy frames exactly, so every old screenshot
  test passes unchanged while new rows pin the menu rows, the help card,
  and the canvas-size variants.
- The controls panel on wide canvases grows two live rows (mute, help)
  from the same keymap, keeping the cheat-sheet honest under remaps.
- Forensic pty work during the build caught two harness lessons worth
  remembering: drain-until-quiet never terminates against a live 30 fps
  game (bound the reads), and cursor-addressed backends need ANSI
  stripping before substring assertions (glyphs arrive one cell at a
  time wrapped in cursor moves).

## Key files

- `pacman/src/shell/input.py`: mute/help actions with m/? defaults,
  remappable and conflict-checked like every other binding.
- `pacman/src/shell/menus.py`: pure title/pause/over menus with wrap,
  reset, and live labels.
- `pacman/src/shell/screens.py`: menu-row painter, fullscreen help card,
  menu-aware title/pause/over paints (legacy-exact defaults).
- `pacman/src/shell/app.py`: HELP and SCORES screens, per-screen menus,
  session mute, quit to title, help-from tracking, per-screen hints.
- `pacman/src/render/compose.py`: controls panel gains live mute/help
  rows from the keymap.
- `pacman/src/shell/verify.py`: `controls_matrix()` (12 rows); total
  matrix 82 rows.
- `pacman/tests/test_controls_menus.py`: 17 menu/mute/help/flow tests.

## Notes

- Session mute is deliberately not persisted: settings persistence and
  its UI belong to the next wave, which owns the config surface.
- Follow-ups deliberately out of scope: settings versioning UI and the
  final scoreboard refresh each get their own wave on top of this one.

- the Builder
