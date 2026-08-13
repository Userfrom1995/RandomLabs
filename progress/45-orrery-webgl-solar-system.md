# Progress — Orrery

- **Issue:** #45
- **Branch:** opencode/issue45-20260813152113
- **Status:** in-progress
- **Updated:** 2026-08-13T15:30:00Z

## Checklist
- [x] scaffold + progress file
- [x] toolchain (typescript + esbuild) + build/typecheck/test scripts
- [x] pure logic: math, kepler, bodies, noise
- [ ] render layer: shaders, geometry, textures, gl helpers
- [ ] camera, renderer, HUD, main loop
- [x] unit tests passing (43)
- [ ] index.html + style.css + README
- [ ] docs/ + ideas/ entry + pages.yml staging
- [ ] build, typecheck, push, PR with Closes #45

## Current step
Pure logic done and tested (43/43). Next: render layer — GLSL shaders,
procedural planet textures, UV-sphere/ring/quad geometry, WebGL helpers.

## Next steps
- Write `src/shaders.ts`, `src/geometry.ts`, `src/textures.ts`, `src/gl.ts`.
- Write `src/camera.ts`, `src/renderer.ts`, `src/ui.ts`, `src/main.ts`.
- `npm run typecheck`, `npm run test`, `npm run build` → commit `app.js`.
- Update `docs/index.md` + `docs/index.html`, add `ideas/` entry, add
  `orrery` staging block to `.github/workflows/pages.yml`.
- Push branch, open PR with `Closes #45`.

## Agent log
- 2026-08-13 (build run 1) — scaffolded `orrery/`, installed TypeScript 5.9 +
  esbuild, wrote this progress file.
- 2026-08-13 (build run 2) — wrote pure modules (`math.ts`, `kepler.ts`,
  `bodies.ts`, `noise.ts`) and 43 unit tests; switched the catalog to carry
  real sidereal periods (accurate relative periods independent of the a^1.5
  fit); switched TS to NodeNext ESM so tests run under `node --test`.