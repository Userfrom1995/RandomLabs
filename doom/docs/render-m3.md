# M3 headless-Chromium shell proofs (2026-09-17)

Taken with system Chromium (`--headless=new --disable-gpu`, SwiftShader
WebGL) served from `doom/` over localhost. Screenshots fire before async
boot settles, so settled state was captured through CDP
(`Page.captureScreenshot` after an 18 s settle via a throwaway Node CDP
script over built-in `fetch` plus `WebSocket`, no dependencies).

## Settled DOM (CDP dump, wedged storage backend)

- `status-line`: `E1M1 running (Tier 0 WebGL2 paletted, 640x400)`
- `save-status`: `Save storage: local (fell back past opfs, idb). 6 slots, export/import ready.`
- `audio-status`: `Audio locked. Press Enable audio (a click counts as the browser gesture).`
- Map select populated (`E1M1`); 6 slot rows render `empty`; remap table renders all actions.

## Canvas pixels

`canvas.toDataURL()` length 2890 chars at 320x200 against 378 chars for a
blank black PNG of the same size (7.6x): the automap frame is really
composited (Tier 0 quad, SwiftShader), not a cleared canvas.

## Environment defects found and fixed (M3 hardening)

- `navigator.storage.getDirectory()` never resolves in this runner (stays
  `PENDING`): the ladder previously selected OPFS without probing it and
  hung before first frame. Fixed: `selectProvider` races every tier probe
  against `probeTimeoutMs` (OPFS plus IDB carry real round-trip probes).
- Cache Storage (`caches.open`/`match`) hangs the same way (`CACHE-TIMEOUT`
  probe page): `loadCachedWad`/`precacheWad` now race `CACHE_TIMEOUT_MS`
  (3 s) and fall back to memory/demo boot. Sealed M1 contract kept
  (`precacheWad` still returns `'memory'` headless; suite 293/293 green).

## Screenshots

- `shell-m3-1280.png`: desktop 1280x1000, E1M1 automap live, Audio plus
  Saves panels rendered.
- `shell-m3-390.png`: mobile 390x844, canvas on top, controls below,
  responsive contract holds.

## Owned by M5 (Playwright, real gesture plus audible output)

- AudioContext resume latency and audible SFX/music audition.
- Pointer Lock capture plus touch multi-touch.
- Cold/warm TTFF bands and p95 frame tracing.
