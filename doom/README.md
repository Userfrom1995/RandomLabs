# Doom: client-side web engine at `/doom/`

Milestones 1-5 (issue #362): engine core plus WAD parser plus basic loop (M1),
WebGL renderer plus full input (M2), WebAudio SFX plus music with save
persistence (M3), WAD ecosystem plus polish (M4), integration plus end-to-end
audit (M5).

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

## What works (M4)

- Load order (`src/wad/loadout.js`): multi-file staging in drop order
  (base plus patches), map-group replacement by marker with last-wins
  standalone resources, stable order (replacements keep the base slot),
  merged assembly the engine boots unchanged, per-file E_CONTAINER
  isolation, WAD identity (doom1/doom2/mixed/unknown plus shareware
  likelihood), DEHACKED surfaced as info and never applied.
- Per-map isolation: the probe decodes every map's required lumps and
  boots the survivors; one corrupt or Hexen-dialect map becomes a
  diagnostics warning, never a dead load. The map list shows viable maps
  only, clamped to Episode 1 on shareware markers.
- Shell states (`src/ui/shellStates.js` plus panels): first-visit
  onboarding with sample-level load and sample `.wad` download, loading
  line with aria-busy, empty load-order line, alert-box errors that keep
  the running level alive (failed loads resume the previous loop),
  per-file remove buttons, offline service worker that preserves the WAD
  cache across shell upgrades (`doom-m4-v1`).
- Hardening found by headless Chromium: a wrong-module import of
  `droppedLines` killed the entire boot; fixed and pinned by
  `tools/audit-m4.mjs`, with settled proofs at `docs/shell-m4-1280.png`
  and `docs/shell-m4-390.png` (see `docs/render-m4.md`).

## What works (M5)

- End-to-end ledger (`docs/bench-m5.json`, `docs/scoreboard.md`): every
  H-cell resolved with machine proof. H1 zero dropped vsyncs in 357 frames
  on Tier 0; H2browser paired Tier0/Tier1 null result (vsync-locked, CI
  includes zero; the upload CPU gap stays H2c); H3 UNSUPPORTED_BY_DESIGN
  (no emsdk, proof recorded); H4 cold 403ms within broadband and warm
  279ms within the warm band (N=30 each, bootstrap CIs); H5 locked to
  running in 52ms on a trusted click; ecosystem round-trips 4/4 pass
  (picker ingest, corrupt reject, onboarding persistence, OPFS slot
  survival across reload).
- Gate verdicts (`src/perf/m5gates.js`): pure TTFF band, frame-trace,
  paired-compare, and ecosystem verdict logic pinned by
  `tests/test-m5-integration.mjs` (21 tests).
- Committed CDP driver (`tools/cdp-m5.mjs`, Node built-ins only, no
  Playwright): `tools/capture-m5.mjs` writes settled desktop plus mobile
  proofs (`docs/shell-m5-1280.png`, `docs/shell-m5-390.png`,
  `docs/render-m5.md`); `tools/bench-m5.mjs` measures every cell;
  `tools/audit-m5.mjs` gates the milestone (70 checks).
- Hardening found by headless Chromium: the renderer selector was a
  facade (boot always re-probed, ignoring the stored tier), and rejected
  files left the status line stuck on a stale loading line. Boot now pins
  the stored `doom-tier` override, all four ingest/remove reject paths
  repaint the surviving level via `restoreRunningStatus()`, and an inline
  favicon removes the last console 404.

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
  `docs/render-m4.md` plus `docs/shell-m4-1280.png`/`docs/shell-m4-390.png`
  (M4 headless-Chromium shell proofs), `docs/render-m5.md` plus
  `docs/shell-m5-1280.png`/`docs/shell-m5-390.png` (M5 settled proofs),
  `docs/bench-m5.json` (M5 end-to-end cells).
