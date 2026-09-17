# Doom M2: WebGL renderer plus full input (issue #362)

Date: 2026-09-17. Milestone 2 of the Doom client-side web engine epic.
M1 (engine core, WAD parser, Canvas2D automap loop) is on main; this
milestone adds the real renderer ladder and the complete input pipeline.

## What was built

- Renderer ladder (`doom/src/render/`): `upload.js` (R8 paletted vs RGBA
  fallback choice, CPU expansion, 64 KB vs 256 KB frame math), `palette.js`
  (upload-once-per-change manager), `glQuad.js` (single-pass fullscreen
  shader quad with damage flash plus gamma, `GlUnavailable` fallback
  errors), `resolution.js` (640x400 to 256x160 ladder, 500 ms hysteresis,
  battery-saver pin, mobile start step), `tiers.js` (Tier 0/1 now resolve
  when GL is present; M1 Tier 2/3 pins preserved bit-exactly).
- Input pipeline (`doom/src/input/`): `tic.js` (vanilla speeds 25/50,
  24/40, 640/1280/320, +-50 clamp, button bits, weapon 1..7),
  `bindings.js` (doom-bindings v1, conflict swap, store-injected
  persistence), `keyboard.js` (headless key state plus strafe-suppresses-turn
  sampling plus DOM attach), `mouse.js` (Pointer Lock with
  unadjustedMovement fallback, delta accumulator, drag fallback, ESC
  auto-pause), `touch.js` (dynamic-origin stick driving move plus turn,
  strafe buttons, weapon latch, 120 ms haptic throttle, coarse-pointer
  detection), `remap-ui.js` (pure row descriptors plus createElement-only
  capture table, no blocking dialogs).
- Engine (`doom/src/engine/doomEngine.js`): full ticcmd movement (arcade
  scale 0.08 units per ticcmd unit, map-bounds clamp, per-tick button edges,
  weapon select), live automap player marker, deterministic twin convergence.
  `injectTiccmd` keeps the M1 immediate-turn contract (mouse-look latency)
  while moves/buttons/weapon latch per tick. Collision against linedefs is
  explicitly deferred to the 3D BSP milestone.
- Shell (`doom/index.html`, `app.js`, `theme.css`): tier-aware presenter
  selection with one-rung fallback, resolution plus battery controls,
  touch overlay (stick, FIRE/USE/strafe/weapon strip with 3 s landscape
  collapse, menu), pause recapture overlay, remap table with reset,
  per-tick input pump feeding the 35 Hz loop, Tier 3 30 FPS presentation
  cap. All M1 shell contracts intact (ids, canvas attrs, no-dialog rules).

## Key files

- `doom/src/input/tic.js`, `bindings.js`, `keyboard.js`, `mouse.js`,
  `touch.js`, `remap-ui.js`
- `doom/src/render/upload.js`, `palette.js`, `glQuad.js`, `resolution.js`,
  `tiers.js`
- `doom/tests/test-m2-input.mjs`, `test-m2-render.mjs` (49 tests)
- `doom/tools/audit-m2.mjs`, `doom/docs/audit-m2.md` (48/48 ALL PASS)

## Verification

- `node --test "doom/tests/*.mjs"`: 200/200 green (151 M1 sealed pins
  untouched, 49 M2 new).
- `node doom/tools/audit-m2.mjs`: 48/48 ALL PASS (E2E testid set, security
  rules, live tier/governor/tic/bindings behavior, 44 px targets, safe
  areas, contrast text/bg 15.9:1 and muted/panel above 4.5:1).
- Headless GL unavailable in this runner by design: `createGLPresenter`
  throws `GlUnavailable` (unit-gated) and the app falls back to Canvas2D;
  browser frame-time cells (H1/H2) stay pending to M5 with Playwright.

## Notes

- No em dashes anywhere; no `Co-authored-by` trailers; M1 sealed evidence
  (`manifest.sha256`, `bench-m1.json`, `soak-m1.json`, `first-frame.png`,
  `layout-audit.md`, `THREATS.md` keywords, pinned version string) verified
  untouched by the green M1 suites.
- Collision, audio (M3), and WAD ecosystem polish (M4) are out of scope.

- the Builder
