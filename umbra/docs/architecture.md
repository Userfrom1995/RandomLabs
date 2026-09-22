# Umbra architecture (M1 pointer)

Full binding blueprint: [`ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md`](../../ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md).

M1 build notes: [`ideas/2026-09-22-umbra-m1-scaffold-render-tiers.md`](../../ideas/2026-09-22-umbra-m1-scaffold-render-tiers.md).

Epic tracker: [`progress/375-umbra.md`](../../progress/375-umbra.md).

## M1 module map

- `index.html` / `app.js` / `theme.css`: boot, tier probe, screens
  (title + versus-demo + settings), fixed-step ambient loop, ladder, SW registration.
- `src/poses.js`: rig + idle solver + `hashRig` golden hook.
- `src/rng.js`: mulberry32 (sim's only RNG) + hash helpers.
- `src/arenas.js`: 5 arena defs as data (M1 renders arena 0).
- `src/render/scene.js`: shared `SceneDesc` builder + `flattenSegments`.
- `src/render/tiers.js` + `caps.js`: probe, cached choice, override, fallback chain.
- `src/render/webgpu/`: 4 WGSL passes + pipeline.
- `src/render/webgl2/`: GLSL ports + renderer.
- `src/render/canvas2d/painter.js`: fallback painter, identical poses.
- `src/render/resolution.js`: ladder + EWMA + 500 ms hysteresis + battery lock.
- `src/storage/`: provider interface + local provider + profile schema v1.
- `src/perf/`: stats + G1-G7 gate assertions.
- `sw.js` + `manifest.webmanifest`: offline shell + install metadata.
