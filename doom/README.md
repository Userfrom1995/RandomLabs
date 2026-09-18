# Doom: client-side web engine at `/doom/`

Milestones 1-3 (issue #362): engine core plus WAD parser plus basic loop (M1),
WebGL renderer plus full input (M2), WebAudio SFX plus music with save
persistence (M3).

## What works (M1)

- Checked WAD reader (`src/wad/`): header plus directory validation, map
  discovery (`E1M1`-`E5M9` plus `MAP01`-`MAP40`), lump decoders (vertices,
  things, linedefs, sidedefs, sectors, segs, subsectors, nodes), REJECT plus
  BLOCKMAP checks with the 16/32-bit offset heuristic, texture composition
  (`PNAMES` plus `TEXTURE1/2`, `R_GenerateTexture` order blit), flats, pictures,
  palette/colormap validation, extended-node read-first (`XNOD` family detect,
  capped inflate, glBSP detect), Hexen `BEHAVIOR` detect-and-report, and the
  layered error taxonomy (`E_CONTAINER`/`E_MAP`/`E_REF`/`W_GEOM`/`W_MEDIA`).
- Stable engine boundary (`src/engine/doomEngine.js`): `initEngine`,
  `tickOnce`, `getFrameBufferView`, `queueKey`, `injectTiccmd`, `shutdown`.
  M1 backs it with a pure-JS core (WAD parse to automap framebuffer); the
  doomgeneric Wasm build (`build/shim_m1.c` plus `build/emcc_m1.sh`, SIMD plus
  scalar, no pthreads) exposes the same exports for the M2 swap.
- Fixed-step loop (`src/core/`): rAF driver plus 35 Hz accumulator
  (`step = 28.571ms`, 100ms clamp, cap 3), render every frame with alpha.
- Canvas2D presenter (`src/render/`): 8-bit framebuffer plus palette to
  `putImageData`; automap projection of real decoded geometry with status line;
  tier probe resolving to Tier 2/3 in M1 with `?tier=` and localStorage override.
- App shell (`index.html`, `app.js`): canvas, pause/resume, map select,
  `.wad` picker plus drag-drop ingest with Cache Storage precache and episode
  clamp, layered diagnostics list, keyboard turning, offline shell service worker.

## What works (M2)

- Render ladder (`src/render/`): WebGL2 paletted single-pass quad (Tier 0,
  64 KB frames) with WebGL1 RGBA fallback (Tier 1), Canvas2D fallback
  (Tier 2/3, Tier 3 capped at 30 FPS), emergency 256x160 (Tier 4);
  upload-once palette manager; resolution ladder (640x400 to 256x160) with
  500 ms hysteresis, battery saver, and mobile start step; renderer plus
  resolution controls persisted on device.
- Input pipeline (`src/input/`): 35 Hz ticcmd sampling (vanilla speeds,
  +-50 clamp) from desktop keys, Pointer Lock mouse look (raw-input
  attempt, drag fallback, ESC auto-pause with recapture overlay), and a DOM
  touch overlay (dynamic-origin stick for move plus turn, FIRE/USE/strafe,
  weapon strip with landscape auto-collapse, menu). Versioned remapping
  (`doom-bindings` v1) with conflict swap, persisted per device.
- Engine movement: full ticcmd moves with per-tick button edges and weapon
  select, live automap player marker, deterministic twin convergence.
  Collision against linedefs arrives with the 3D BSP milestone.

## What works (M3)

- SFX (`src/audio/`): DMX lump parser (format 3, pad strip, u8 to f32),
  lazy LRU decode cache, 8-voice pool with vanilla distance/stereo/pitch
  math and steal policy, mixer (master/SFX/music buses plus compressor,
  menu 0..15, click-free mute), gesture unlock gate (nothing schedules
  before first input). Fire edges play the pistol lump; volumes persist.
- Music (`src/audio/musicEngine.js`): MUS to SMF Type 0 converter
  (Crispy single-track port, drum-channel map, scale-not-clamp volumes),
  GENMIDI bank parse, song switch per map, pure-JS 2-operator FM renderer
  (looped lookahead buffer; cycle-accurate Wasm OPL3 stays M5 scope).
- Persistence (`src/storage/`): `StorageProvider` ladder OPFS to
  IndexedDB to localStorage to memory with real round-trip probes and
  timeouts (a wedged tier falls through, never hangs boot); 6 opaque save
  slots plus config/progression/bindings; 500 ms debounced writes flushed
  on hide; versioned JSON-plus-base64 export/import bundles applied
  atomically; progression resumes the last map on boot.
- Hardening found by headless Chromium: the ladder now probes tiers
  before selecting them, and the WAD cache races wedged backends with a
  3 s timeout, so boot always reaches first frame.

## Run it

Serve the repo root and open `/doom/`:

```sh
python3 -m http.server 8000
# open http://localhost:8000/doom/
```

The built-in demo level boots instantly. Drop a real `DOOM1.WAD` to play E1M1.

## Tests

```sh
node --test "doom/tests/*.mjs"
```

## Build the Wasm (needs emsdk)

```sh
DOOMGENERIC_SRC=./vendor/doomgeneric sh doom/build/emcc_m1.sh
```

## Docs

- `docs/research-spec.md` (binding research), `docs/architecture.md` (pointer),
  `docs/scoreboard.md` (H1-H5 ledger), `docs/first-frame.png` (M1 first frame),
  `docs/render-m3.md` plus `docs/shell-m3-1280.png`/`docs/shell-m3-390.png`
  (M3 headless-Chromium shell proofs).
