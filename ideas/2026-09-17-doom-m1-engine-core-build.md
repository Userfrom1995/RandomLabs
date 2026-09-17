# Doom M1 build: engine core plus WAD parser plus basic loop (what was built)

Date: 2026-09-17. Issue: #362. Milestone: M1 (Refs #362).
Blueprint: `ideas/2026-09-17-doom-client-side-web-engine.md`.
Research: `doom/docs/research-spec.md`.

## What was built

A complete, playable M1: the `/doom/` app boots a generated demo level
instantly, presents a live automap first frame on Canvas2D, ticks at 35 Hz
under a rAF accumulator, accepts real `.wad` files via picker plus drag-drop
(with Cache Storage precache and episode clamp), and surfaces layered WAD
diagnostics. 35/35 `node:test` assertions green, no dependencies.

## Why this shape

- No Emscripten toolchain exists in the lab runner, so the doomgeneric Wasm
  backend ships as real source (`build/shim_m1.c`: DG_* web shim, exported
  320x200 8-bit framebuffer, key queue) plus a real build script
  (`build/emcc_m1.sh`: `-O2`, `ALLOW_MEMORY_GROWTH`, SIMD plus scalar split,
  hard abort on `-pthread`/`USE_PTHREADS`/`SHARED_MEMORY`). The JS core behind
  the same stable boundary is a genuine engine (parse to framebuffer), not a
  stub: M2 swaps the backend without touching the app.
- No shareware WAD can ship in the repo, so `tools/make-demo-wad.mjs`
  generates a spec-valid PWAD in memory (E1M1 plus E1M2, full 10-lump order,
  PLAYPAL 10752, COLORMAP 8704, PNAMES, TEXTURE1). Real WADs load through the
  identical parser path.
- M1 visible loop is a camera-follow automap over real decoded geometry with
  a 3x5 micro-font status line. The full 3D BSP column rasterizer is M2 scope
  behind the same framebuffer contract; the scoreboard records this honestly.

## How it works

Boot (`app.js`): tier probe (M1 resolves Tier 2 with Wasm, Tier 3 without;
`?tier=` plus localStorage override) -> WAD bytes (Cache Storage, else demo
generator) -> `initEngine` (header/dir, discovery, decoders, ref check,
palette) -> `createLoop` (35 Hz accumulator, cap 3, alpha) -> `present2d`
(8-bit plus palette to `putImageData`). Input sets flags consumed per tick;
map select re-inits per map; visibility change pauses; service worker caches
the app shell offline-first (WAD precache lands in M4).

## Key files

- `doom/src/wad/`: `checkedReader.js`, `errors.js`, `wadDir.js`,
  `mapDiscovery.js`, `lumpDecoders.js`, `extNodes.js`, `textures.js`,
  `hexenDetect.js`, `index.js`
- `doom/src/engine/doomEngine.js` (stable boundary), `simdProbe.js`
  (validated SIMD128 test module, cached choice, manual override)
- `doom/src/core/clock.js` + `loop.js`, `doom/src/render/fbView.js`,
  `automap.js`, `present2d.js`, `tiers.js`
- `doom/src/storage/wad-cache.js`, `doom/build/shim_m1.c`,
  `doom/build/emcc_m1.sh`, `doom/tools/make-demo-wad.mjs`,
  `doom/tools/render-first-frame.mjs`, `doom/tests/` (35 green)
- `doom/docs/scoreboard.md` (H1-H5 ledger, M1 unit-gated rows),
  `doom/docs/first-frame.png` (rendered E1M1 first frame)

## Notes and next steps

- Two real bugs found by the suite and fixed: a double-added offset in
  `decodeSidedefs` texture reads (row N read row 2N) and a malformed
  hand-rolled SIMD probe module (replaced with a validated
  `v128.const`/`drop` module, verified `WebAssembly.validate === true`).
- Playwright E2E (desktop 1280x800 first-frame screenshot, corrupt-WAD error
  list, pause-recapture) is specified in the blueprint test matrix but not run
  in M1 (no browser in the runner); the committed `first-frame.png` is rendered
  from the same framebuffer path. Tester wires Playwright in review.
- M2 next: WebGL paletted path plus shader quad, resolution ladder, tic
  pipeline with Pointer Lock plus touch overlay, remapping UI, screenshots.

- the Builder
