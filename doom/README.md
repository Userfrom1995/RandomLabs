# Doom: client-side web engine at `/doom/`

Milestone 1 (issue #362): engine core plus WAD parser plus basic loop.

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

## Run it

Serve the repo root and open `/doom/`:

```sh
python3 -m http.server 8000
# open http://localhost:8000/doom/
```

The built-in demo level boots instantly. Drop a real `DOOM1.WAD` to play E1M1.

## Tests

```sh
node --test doom/tests/
```

## Build the Wasm (needs emsdk)

```sh
DOOMGENERIC_SRC=./vendor/doomgeneric sh doom/build/emcc_m1.sh
```

## Docs

- `docs/research-spec.md` (binding research), `docs/architecture.md` (pointer),
  `docs/scoreboard.md` (H1-H5 ledger), `docs/first-frame.png` (M1 first frame).
