# Pac-Man Interactive Shell - menus, keys, sound, and a loop that cleans up after itself

The engine simulates and the renderer paints; this phase puts a player in
front of them. A title card, pause and resume that truly freeze the sim,
restart, and game-over flows, remappable keys over a decoder that never
misreads a slow arrow, original synthesized sound that never blocks the
loop, and raw-mode handling that restores the terminal even when the game
crashes.

## What was built

- `src/shell/input.py` - byte-to-action decoder plus validated `Keymap`.
  Arrows (CSI and SS3), WASD/vim defaults, Esc pause, Ctrl-C quit,
  Enter/Space confirm, R restart. Partial escape sequences are held for the
  next read; unknown bytes are dropped, never fatal. `--bind action=char`
  remaps single chars with duplicate and nonsense rejection.
- `src/shell/terminal.py` - `RawTerminal`: raw mode on entry, guaranteed
  restore of saved attributes on exit (failures counted, never masking the
  loop's exception), non-blocking reads, size queries, and a pure
  minimum-size check that routes small windows to an honest card.
- `src/shell/screens.py` - title, pause, game-over, and too-small cards as
  FrameBuffers in the shared 28x34 geometry, so every backend presents them
  unchanged; pause and game-over overlay the live game frame.
- `src/shell/app.py` - the flow machine plus the frame loop: fixed 120 Hz
  simulation steps under paced display frames, renderer and audio shutdown
  in a `finally`, sounds following real game events with throttled dots.
- `src/shell/audio.py` - null, bell, and synth backends. Synth voices are
  original PCM rendered with the stdlib and handed to a real system player
  (afplay/aplay/paplay/play/pw-play) on a daemon thread; with no player the
  shell degrades to bell and says so.
- CLI: `--play` (refuses cleanly without a tty), `--audio`, `--bind`,
  `--keys`, `--fps`, all validated with non-zero exits on misuse.

## Key files

- `pacman/src/shell/input.py`, `terminal.py`, `screens.py`, `app.py`, `audio.py`
- `pacman/src/shell/cli.py` (`--play`, `--audio`, `--bind`, `--keys`, `--fps`)
- `pacman/tests/test_shell_input.py`, `test_shell_audio.py`, `test_shell_app.py` (43 cases)

## Notes

- Pause freezes the simulation loop itself, not just the display: no
  `step_play` calls happen while paused, so wall-clock time cannot leak
  into ghost movement or fright timers.
- The headless playthrough test drives `run()` with scripted byte chunks
  and a fake clock, proving init frames, stepping, teardown order, the
  size guard, and shutdown-on-crash without any terminal.
- `game.step` returns the cumulative event log, so the shell diffs by
  length to find new sounds; dot chirps are throttled to one per 10 ticks.
- Bare runners without Pillow fail only the image-backend tests; the
  Unicode play path and every shell test pass on the stdlib alone.
