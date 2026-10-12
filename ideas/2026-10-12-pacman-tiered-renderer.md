# Pac-Man Tiered Renderer - painted once, shown everywhere

The Phase 1 protocol spikes proved each wire format in isolation. This phase
turns them into a production rendering tier: one scene painter, three real
backends, automatic degradation, and headless proof for all of it.

## What was built

- `src/render/scene.py` - paints the whole game (3-row HUD plus 28x31 maze
  with box-drawn walls, dots, blinking energizers, directional player, and
  per-personality ghosts with fright, flash, and eyes states) into a single
  28x34 FrameBuffer. Every backend consumes the same buffer, which is what
  makes cross-terminal parity a structural property instead of a wish.
- `src/render/atlas.py` - original sprite art rasterized at runtime with
  Pillow (disc bodies, wedge mouths, dot eyes), cached by id, PNG-encoded for
  transmit. No image files ship; without Pillow it raises an actionable error.
- `src/render/kitty.py` - full backend: atlas transmit exactly once, then
  cursor-anchored placements per dirty sprite cell plus truecolor text for
  glyph cells, so image and text terminals agree cell for cell.
- `src/render/sixel.py` - full backend: dirty-region bounding-box raster
  (glyphs via the built-in font, sprites pasted from the atlas), bounded
  palette, genuine band encoding with run-length compression, and a 10 fps
  cap that coalesces instead of sleeping. Clock injectable for tests.
- `src/render/manager.py` - `TieredRenderer`: detected choice chained over
  the remaining tiers with Unicode always last; steps down on backend errors
  or two consecutive slow frames; `present` never raises, drops are counted.
- CLI: `--render-check` (paint plus present with byte counts) and
  `--render-bench` (per-backend present() throughput table, the seed of the
  final performance scoreboard).

## Key files

- `pacman/src/render/{atlas,scene,kitty,sixel,manager}.py`
- `pacman/tests/test_renderer_phase3.py` (21 cases)
- `pacman/README.md`, `pacman/docs/index.md`, `pacman/index.html`

## Notes

- Steady-state frames are tiny (tens of bytes on text tiers) because every
  backend tracks its own last-frame mirror; only the first full frame is big.
- Measured on this runner: unicode ~950 fps, kitty ~360 fps, sixel ~115 fps
  headless present() throughput over 20 frames. Real-terminal numbers belong
  to the final verification phase.
- The interactive terminal loop (raw input, menus, audio) consumes
  `TieredRenderer` next; its contract (init once, present per frame, never
  raises) is already frozen by tests.
