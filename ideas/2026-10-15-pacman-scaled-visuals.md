# Pac-Man Scaled Visuals and Theming

The fullscreen canvas wave, second movement: roomy terminals no longer
frame a small maze with empty margins. An integer magnification engine
doubles the maze to 56 cells wide wherever it fits, image backends place
one multi-cell sprite per magnified block, and a tick-driven effects
layer animates the whole scene. Six original themes with distinct wall
styles and margin patterns complete the richer look, all verified live
in real ptys with symmetric kitty place/erase counts.

## Product vision

Phase 1 put live dashboards beside a 1x maze. This wave spends the
remaining space on the maze itself: auto magnification picks 2x width
whenever 56x34 fits (2x2 on huge windows), keeps classic 1x on small
ones, and lets players pin any mode. Animation runs on game counters so
every frame is deterministic and headless-testable: the mouth opens and
closes, energizers pulse, fruit sparkles, dying plays four frames, and
clearing mazes celebrate in rainbow. Nothing is a facade: every flag
(`--scale`, `--effects`, `--theme`) drives real rendering, and the
legacy reference frame is one flag away.

## Why this shape

- The 28x34 scene painter stays the parity anchor: magnification happens
  in the composer blit, so Kitty, Sixel, and Unicode agree by
  construction and small windows render bit-identically to before.
- Image spans ride on the framebuffer (`fb.spans`), not a new backend
  interface: Unicode and Sixel needed zero changes, Kitty reads spans
  for `c=2` placements, and the existing erase rule covers blocks.
- Effects default off in `scene.paint` (legacy exact) and on in play,
  so every old parity test passes unchanged while new rows pin the
  animation frames tick by tick.
- Forensic pty work during the build caught a probe artifact worth
  remembering: keys buffered before child startup arrive as one batch,
  so fast probes start and quit the game in a single frame (5 places,
  0 erases, no SCORE). Slow the key cadence and the same binary shows
  symmetric 137/132 place/erase counts. Probe the behavior, not the
  harness.

## Key files

- `pacman/src/render/scale.py`: pure magnification modes and selection.
- `pacman/src/render/effects.py`: pure tick animation frames.
- `pacman/src/render/scene.py`: wall styles, effects integration.
- `pacman/src/render/compose.py`: magnified blit with spans, chrome,
  sparkles, centered tall panels.
- `pacman/src/render/atlas.py`: closed-mouth sprites (appended, old ids
  stable). `themes.py`: six palettes with wall styles and chrome.
- `pacman/src/render/kitty.py`: multi-cell placements from spans.
- `pacman/src/render/layout.py`: scale-aware regions and thresholds.
- `pacman/src/shell/app.py`: `canvas_layout()` plus scale/effects
  settings. `config.py`: versioned scale/effects fields. `cli.py`:
  `--scale`, `--effects`/`--no-effects`, scale-aware `--layout-check`.
- `pacman/src/shell/verify.py`: `visual_matrix()` (13 rows) plus
  `canvas_bench()`; total matrix 70 rows.
- `pacman/tests/test_scale_visuals.py`: 20 magnification/effects/theme
  tests.

## Notes

- Wide 2x1 needs 56x34; 80-column windows show the wide maze without
  side panels (84 cols needed for the dashboard at 2x). Players who
  want panels at 80 cols can pin `--scale classic`.
- Follow-ups deliberately out of scope: menu-grade control remapping
  and settings versioning UI each get their own wave.

- the Builder
