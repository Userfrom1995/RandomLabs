# Pac-Man Real-Terminal Remediation - what the scoreboard missed

Owner reopened #552 on 2026-10-15: in a real terminal Pac-Man left imprints,
ghosts never moved, and the scene hid in one corner. The headless suite was
green throughout. This entry records the three root causes and the fixes, so
the next project tests live behavior instead of simulating it.

## What was wrong

1. **Frozen ghosts (engine/ghosts.py).** `_move_ghost` re-snapped the ghost
   to the tile center on every tick inside the steering window. At 120 Hz a
   stride (~0.068 tiles) is shorter than the window (0.09), so each stride
   was undone the next tick: every active ghost quivered 0.07 tiles off its
   spawn forever. The suite stayed green because no test asserted
   displacement; the self-check pin (170 dots, zero deaths) was really
   "the autopilot outruns statues".
2. **Sprite trails (render/kitty.py).** Text written over a kitty `a=p`
   placement does not remove the image, and the backend never emitted any
   delete: every sprite move left a permanent imprint. Unicode diffing was
   correct, which is why headless tests never saw it.
3. **Corner layout (shell/app.py, render/*).** The renderer initialized at
   exactly 28x34 with all cursor addresses top-left; terminal size was only
   used for the too-small gate, never for placement.

## What changed

- Steering runs once per tile visit (`Ghost.decided`, cleared on reversals,
  house exits, and eyes revival); house dots feed one at a time.
  Self-check resurveyed honestly: 147 dots, 1 ghost eaten, 2 deaths.
- Kitty erases each departed sprite cell (`a=d,d=c` at the cursor) before
  redrawing, draws a text glyph under every placement (actors stay visible
  where images cannot render), wipes placements in `clear()`, and emits
  cleanup plus setup on tier degrade (plus a full repaint, since the fresh
  tier knows no screen state).
- All backends take a centering origin; the manager computes it from the
  live terminal size, `resize()` re-inits from a clean slate, and the play
  loop polls the size every frame.
- `--verify` grew 41 to 47 rows (ghost displacement, fright roaming, kitty
  erase/steady, centering, resize); the suite grew to 304 with a dedicated
  `test_remediation.py`.

## Proof it works in a real terminal

- True-pty `--play` runs (unicode + kitty): title, gameplay with moving
  ghosts, pause card, too-small card at 20x10, clean alt-screen teardown.
- Pty-verified exact centering at 80x40, 100x44, 120x50 and a mid-game
  80x40 to 120x50 resize; kitty places/erases symmetric (152/147 live).
- 304 tests green, `--verify` 47/47, scoreboard refreshed.

## Lesson for the lab

Headless escape-sequence assertions are necessary but not sufficient: drive
the real `run()` loop through a pty and emulate the screen (see the
forensic harness pattern), assert actor displacement over time, and never
let a backend diff assume text semantics for image placements.
