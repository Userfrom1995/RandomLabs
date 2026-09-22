# Umbra M1: scaffold + render tiers + offline shell (build notes)

Date: 2026-09-22. Issue: #375. Milestone 1 of the binding blueprint
(`2026-09-22-umbra-shadow-fight-webgpu-combat.md`). Zero-build plain
ES-module JS with JSDoc types, no CDN, no binary art (icons are
procedurally generated PNGs from a checked-in Node script).

## What was built

- `umbra/index.html` boot shell: canvas `#umbra-canvas`, HUD (arena, tier
  badge, fps), screens title + versus-demo (ambient) + settings only.
  Later-milestone screens do not exist in the UI (zero-stub rule).
- Tier probe (`caps.js`): WebGPU adapter first, WebGL2 context second,
  Canvas2D last resort; cached probe + settings override + `?tier=` URL
  hook for headless/Tester forcing. Fallback chain on init failure.
- One shared `SceneDesc` (`render/scene.js`): 2 idle fighters from the
  data-driven pose solver, 48 stateless hash-indexed motes, parallax
  layers, zeroed combat uniforms. Tick-deterministic (node:test asserts
  byte-identical JSON for the same tick).
- Tier 0 WebGPU: four WGSL passes (background, silhouette SDF, rim-light
  finite-difference normals, particles) as fullscreen triangles with
  opaque/alpha/additive blending, driven by per-frame uniform uploads.
- Tier 1 WebGL2: GLSL ES 3.0 ports of the same four passes (`gl_VertexID`
  triangles, no VBOs), same uniforms and blend modes.
- Tier 2 Canvas2D: gradient sky, moon halo, parallax ridges, ground band,
  capsule bodies, offset accent crescents, motes. Same poses.
- Pose solver (`poses.js`): 11-segment FK rig, idle-guard angles as pure
  f(time, phase), mirror symmetry, FNV golden hashes pinned in tests.
- Resolution ladder (`resolution.js`): 1280x720 to 426x240, EWMA governor,
  500 ms hysteresis (no oscillation by construction, tested), battery
  saver pins 640x360 with no particles.
- Storage (`storage/`): frozen provider interface, localStorage provider
  with injectable store, profile schema v1 (config-only in M1).
- Perf (`perf/`): mean/median/p95 + G1-G7 assertions that return
  `pass: null` when unmeasured (never false-green).
- `sw.js` offline-first shell (versioned cache, navigation-safe) +
  `manifest.webmanifest` + procedural icons.
- `docs/scoreboard.md` G1-G7 skeleton with honest pending/partial states.

## Key files

`umbra/app.js`, `umbra/src/poses.js`, `umbra/src/render/scene.js`,
`umbra/src/render/webgpu/*.wgsl + pipeline.js`,
`umbra/src/render/webgl2/shaders.js + renderer.js`,
`umbra/src/render/canvas2d/painter.js`, `umbra/tests/*.mjs` (36 green).

## Verification (Builder-run)

- `node --test umbra/tests/*.mjs`: 36/36 green (rng, poses incl. golden
  hashes `5046b8f7`/`4cdd52dc`, scene determinism, ladder hysteresis,
  tiers, profile round-trip, gates, shell file list, shader tokens).
- Headless Chromium screenshots: desktop WebGL2 (tier badge 1, live
  silhouettes + rim + moon), desktop Canvas2D `?tier=2` (rim crescents +
  fine motes after one paint fix), mobile 390x844 portrait (readable HUD,
  working demo panel; fixed `.pill` wrap). Saved under `umbra/docs/shot-*`.
- `node --check` clean on all browser-only modules.

## Notes for next milestones

- M2 builds `src/combat/` (headless 60 Hz core, `hashState`, seeded AI)
  and universal input; the `?screen=demo` hook already serves E2E.
- G1/G2/G7 need real-browser Playwright measurement; G3 needs the M2 sim.
- The moon sits behind fighter 2's head at 1280x800: intentional drama,
  revisit in the M5 VFX pass if the Tester flags it.

- the Builder
