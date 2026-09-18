# M5 settled headless-Chromium shell proofs (2026-09-18)

Taken with system Chromium (headless new, SwiftShader WebGL) served from
the repo root over localhost, via the committed driver
`doom/tools/cdp-m5.mjs` (Node built-ins only). Settle rule: poll the
status line until it reports a running map (25 s cap), then 3 s extra for
saves plus onboarding paint before `Page.captureScreenshot`.

## Settled DOM (desktop 1280x1000, fresh profile)

- `status-line`: `E1M1 running (Tier 0 WebGL2 paletted, 640x400)`
- `save-status`: `Save storage: opfs. 6 slots, export/import ready.`
- `audio-status`: `Audio locked. Press Enable audio (a click counts as the browser gesture).`
- `wad-order`: `No custom WADs loaded. Built-in sample level active.`
- `wad-clamp`: `(empty on the built-in sample)`
- `dehacked-note`: `(empty, demo carries no DEHACKED)`
- `wad-error`: `(empty)`
- onboarding visible on first visit: `true`
- map select: `E1M1,E1M2`
- `canvas.toDataURL()` length: `2890` chars (composited frame, not a clear)
- renderer selector value: `auto`
- console plus page errors: none (favicon is an inline data URI, so no 404)

## Settled DOM (mobile 390x844 emulated, fresh profile)

- `status-line`: `E1M1 running (Tier 0 WebGL2 paletted, 640x400)`
- `save-status`: `Save storage: opfs. 6 slots, export/import ready.`
- `audio-status`: `Audio locked. Press Enable audio (a click counts as the browser gesture).`
- onboarding visible on first visit: `true`
- `canvas.toDataURL()` length: `2890` chars

## M5 shell fixes proved here

- Renderer selector pins the stored tier: forcing `doom-tier=1` boots
  `Tier 1 WebGL1 RGBA` and the selector shows `1` (was auto-probe only,
  the selector re-booted the probed tier). Pinned by `tools/audit-m5.mjs`.
- Inline favicon removes the last console 404, so a clean run reports zero
  page errors.

## Screenshots

- `shell-m5-1280.png`: desktop, live automap frame plus full control deck.
- `shell-m5-390.png`: mobile portrait, canvas on top, panels below.

## Still owned by the Tester E2E gate

- Real IWAD plus PWAD drop round-trips on hardware GPUs, gesture audio on
  touch devices, and multi-hour soak. The harness cells in
  `docs/bench-m5.json` cover the headless-measurable halves.
