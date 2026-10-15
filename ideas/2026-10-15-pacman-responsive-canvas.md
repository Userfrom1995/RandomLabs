# Pac-Man Responsive Fullscreen Canvas

A unified redesign that turns the terminal into a full-screen game canvas:
the maze, HUD, dashboards, and menus use the entire window at any size
instead of a small centered block, with richer visuals layered on the
capability the terminal actually offers.

## Product vision

Today the game paints a fixed 28x34 scene and centers it, leaving the rest
of the window empty. The canvas redesign keeps that scene painter as the
parity anchor (Kitty, Sixel, and Unicode keep matching within one cell) and
adds two layers above it:

1. A responsive layout engine that maps the live terminal size to regions:
   the maze composition plus optional side dashboards, a title strip, and
   a status bar. Narrow windows play exactly as before; wide windows gain
   a live stats dashboard; very wide windows gain a controls and legend
   panel; tall windows gain title and hint strips instead of dead space.
2. A fullscreen composer that renders those regions into one frame whose
   dimensions equal the terminal dimensions, so every cell of the window
   is intentional: game, dashboard, chrome, or themed background.

Later waves build on the same seams: scaled sprites and visual effects
paint through the composer regions, thoughtful controls remap through a
menu-grade input layer, and settings persist through a versioned config.

## Why this shape

- Pure layout math (no I/O) stays unit-testable; the composer is the only
  place that knows about regions, so backends keep consuming plain frames
  and every existing test keeps passing unchanged.
- The frame always matches the terminal size, so the renderer's origin
  stays at zero and cursor addresses never drift on resize.
- Sidebars show only live data (score, level, lives, mode rules, dot
  progress, fruit value, best score, real key bindings): no facades.
- Minimum window stays 28x34, so small terminals and the too-small card
  keep working exactly as before.

## Key files

- `pacman/src/render/layout.py`: pure responsive layout engine
  (`compute(term_cols, term_rows)` plus thresholds and region rects).
- `pacman/src/render/compose.py`: fullscreen composer (maze blit, side
  dashboards, title and status strips, themed background fill).
- `pacman/src/shell/app.py`: the play loop sizes frames to the terminal
  and passes the live layout into paint; resizes re-layout and repaint.
- `pacman/src/shell/screens.py`: title, pause, game-over, name-entry,
  scores, and too-small cards render at full terminal size.
- `pacman/src/shell/cli.py`: `--layout-check` reports the live layout.
- `pacman/src/shell/verify.py`: `layout_matrix()` pins the new behavior.
- `pacman/tests/test_layout_canvas.py`: layout, composer, and wiring tests.

## Notes

- The 28x34 scene geometry is unchanged: scene.paint stays the reference
  every backend shares, and the composer blits it verbatim.
- Thresholds: side dashboards appear only when the maze still fits with
  room to spare (right panel at 56+ columns, left panel at 80+ columns,
  status strip at 36+ rows, title strip at 40+ rows).
- Follow-ups deliberately out of scope here: sprite scaling and effects,
  menu-grade control remapping, and settings versioning each get their own
  wave on top of this canvas.

- the Builder
