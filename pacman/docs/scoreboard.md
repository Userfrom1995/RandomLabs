# Pac-Man Terminal Arcade - Performance Scoreboard

Measured headlessly with `python3 pacman/pacman.py --scoreboard --frames 60`
on Linux x86_64, Python 3.12.3, Pillow 12.3.0. Headless throughput counts
full-scene `present()` calls (game step plus paint plus encode); interactive
frame rates are paced lower on purpose (30 fps default, `--fps` up to 240),
so every backend below runs far ahead of what the eye can use. Numbers move
with the machine; rerun the command on yours to compare.

## Renderer throughput (full-scene present, headless)

| Backend | fps   | Full-frame bytes | Notes |
|---------|------:|-----------------:|-------|
| kitty   | ~595  | ~36,063          | Sprite atlas transmitted once, per-frame placements only |
| sixel   | ~72   | ~42,829          | Dirty-region raster with band RLE, 10 fps coalescing cap |
| unicode | ~875  | ~11,939          | Changed cells only, inside synchronized output |

Without Pillow both image backends report `unavailable (needs Pillow)` and
the tiered renderer plays the unicode path; that degrade is covered by the
`--verify` capability matrix. On Pillow-less hosts the two image parity rows
(`parity-present-kitty`, `parity-present-sixel`) record honest skips instead
of backend timings: they pass vacuously by design so CI without image
libraries still proves the unicode path, and the fps table above only covers
backends that actually ran.

## Input and simulation latency

| Probe | Result | Budget |
|-------|--------|--------|
| Key decode | ~1,868,000 keys/s (~535 ns/key) | Human input is ms-scale; decode is noise |
| Simulation tick | ~25 us/tick (~39,000 ticks/s) | 120 Hz needs <8,333 us; margin is ~300x |

The fixed 120 Hz timestep therefore costs about 3 ms of CPU per real second;
the rest of the frame budget belongs to the terminal emulator.

## Fallback-mode parity checklist

- One 28x34 scene painter feeds every backend: maze, entity, and HUD cells
  match by construction, not by parallel implementations.
- Every sprite cell carries a text glyph, so the unicode path draws the same
  layout where images cannot go.
- All glyphs are single-column, so cursor addresses agree across backends.
- `TieredRenderer.present` never raises; backend errors and repeated slow
  frames step down one tier with counted drops.
- `--verify` proves all of the above on every run (7 parity rows).

## How to reproduce

```sh
python3 pacman/pacman.py --scoreboard --frames 60
python3 pacman/pacman.py --input-bench
python3 pacman/pacman.py --verify
python3 pacman/pacman.py --render-bench --frames 60
```
