# Doom M2 rendered shell proofs (headless)

- **Updated:** 2026-09-17 (M2 fixer hardening)
- **Tool:** `doom/tools/render-m2-shell.mjs` (node-only, no browser)
- **Scene:** demo E1M1 after a 35-tick M2 ticcmd drive (run 12t, strafe+turn 8t, walk+turn+fire 15t, weapon 3)
- **Player:** x=-18.26 y=72.57 angle=51.32 weapon=3 attacks=1
- **Desktop proof:** `doom/docs/shell-1440.png` 640x400 2x nearest-neighbor (3271 bytes, ladder top rung)
- **Mobile proof:** `doom/docs/shell-390.png` 320x200 1x (1212 bytes, battery-saver rung)
- **Not rendered here:** browser compositing (putImageData/WebGL quad pixels), touch-overlay DOM pixels, pause-recapture and remap-table pixels.
  No DOM canvas exists in this runner (GlUnavailable by design, see bench-m2.json glProbe);
  those cells are UNSUPPORTED_BY_DESIGN headless with M5 Playwright ownership, and overlay
  structure stays covered by the 48/48 static audit (`docs/audit-m2.md`).
