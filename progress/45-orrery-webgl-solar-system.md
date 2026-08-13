# Progress — Orrery

- **Issue:** #45
- **Branch:** opencode/issue45-20260813152113
- **Status:** in-progress
- **Updated:** 2026-08-13T16:00:00Z

## Checklist
- [x] scaffold + progress file
- [x] toolchain (typescript + esbuild) + build/typecheck/test scripts
- [x] pure logic: math, kepler, bodies, noise
- [x] render layer: shaders, geometry, textures, gl helpers
- [x] camera, renderer, HUD, main loop
- [x] unit tests passing (43)
- [ ] index.html + style.css + README
- [ ] docs/ + ideas/ entry + pages.yml staging
- [ ] build, typecheck, push, PR with Closes #45

## Current step
Render layer, camera, HUD, and main loop are written and typecheck-clean
(43/43 tests, 0 type errors); the app shell (`index.html`, `style.css`,
`README.md`) is in place. The PR branch was rebuilt on the latest `origin/main`
because the old branch had a disconnected history and GitHub reported the PR
as CONFLICTING. Next: docs + ideas entry + pages.yml staging + landing updates.

## Next steps
- Update `docs/index.md` + `docs/index.html` (Orrery docs).
- Add `ideas/2026-08-13-orrery-webgl-solar-system.md`.
- Add `orrery` staging block to `.github/workflows/pages.yml` (deploy + preview).
- Update root `README.md` "Current Project" + `index.html` landing card.
- Mark `Status: complete`, push, verify PR mergeable.

## Agent log
- 2026-08-13 (build run 1) — scaffolded `orrery/`, installed TypeScript 5.9 +
  esbuild, wrote this progress file.
- 2026-08-13 (build run 2) — wrote pure modules (`math.ts`, `kepler.ts`,
  `bodies.ts`, `noise.ts`) and 43 unit tests; switched the catalog to carry
  real sidereal periods (accurate relative periods independent of the a^1.5
  fit); switched TS to NodeNext ESM so tests run under `node --test`.
- 2026-08-13 (build run 3) — rebuilt the PR branch onto the latest
  `origin/main` (the old head had a disconnected history → PR was CONFLICTING).
  Wrote the render layer (`gl.ts`, `shaders.ts`, `geometry.ts`, `textures.ts`),
  `camera.ts` (free-fly + follow), `renderer.ts` (scene draw + ray picking),
  `ui.ts` (HUD + controls + pointer/wheel input), `main.ts` (clock + loop), and
  the app shell `index.html`/`style.css`/`README.md`. Typecheck clean, 43/43
  tests, esbuild bundle `app.js` (57.7 kB).