# M4 headless-Chromium shell proofs (2026-09-18)

Taken with system Chromium (`--headless=new --disable-gpu`, SwiftShader
WebGL) served from `doom/` over localhost. Same settled-CDP method as M3
(`Page.captureScreenshot` after a 20 s settle, throwaway Node CDP script
over built-in `fetch` plus `WebSocket`, no dependencies).

## Settled DOM (CDP dump, fresh profile then cached profile)

- `status-line`: `E1M1 running (Tier 0 WebGL2 paletted, 640x400)`
- `wad-order`: `No custom WADs loaded. Built-in sample level active.` (empty state)
- `wad-clamp`: empty on the built-in sample; `Shareware WAD detected: map
  list clamps to Episode 1.` once a real WAD is staged (cached profile run)
- `dehacked-note`: empty (demo carries no DEHACKED lump)
- `wad-error`: empty, `save-status`: `Save storage: opfs. 6 slots,
  export/import ready.` (real OPFS in this Chromium)
- `audio-status`: locked pre-gesture (correct)
- Map select populated (2 maps); onboarding panel visible on first visit,
  hidden after dismiss
- `canvas.toDataURL()` length 2890 chars at 320x200: the automap frame is
  really composited (Tier 0 quad, SwiftShader), not a cleared canvas

## Environment defect found and fixed (M4 hardening)

- `app.js` imported `droppedLines` from `src/wad/loadout.js`; the export
  lives in `src/ui/shellStates.js`. Module link failure killed the whole
  boot (status stuck at `Loading…`, no save manager). Fixed the import,
  added an `audit-m4` import-surface pin, re-captured both screenshots
  green. Lesson for M5: a boot-smoke assertion on `status-line` content
  belongs in the Tester E2E gate.

## Screenshots

- `shell-m4-1280.png`: desktop 1280x1000, E1M1 automap live, Controls plus
  Video plus Audio panels rendered, M4 header.
- `shell-m4-390.png`: mobile 390x844, canvas on top, control deck below,
  responsive contract holds, no center overlap.

## Owned by M5 (Playwright, real gestures)

- Drop-and-picker ingest round-trip with a real IWAD plus PWAD pair,
  per-map isolation visible in the diagnostics list.
- Onboarding dismiss persistence across reload, sample .WAD download.
- Cold/warm TTFF bands and p95 frame tracing (H1-H5 ledger).
