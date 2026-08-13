# Progress — Orrery

- **Issue:** #45
- **Branch:** opencode/issue45-20260813152113
- **Status:** complete
- **Updated:** 2026-08-13T16:05:00Z

## Checklist
- [x] scaffold + progress file
- [x] toolchain (typescript + esbuild) + build/typecheck/test scripts
- [x] pure logic: math, kepler, bodies, noise
- [x] render layer: shaders, geometry, textures, gl helpers
- [x] camera, renderer, HUD, main loop
- [x] unit tests passing (57)
- [x] index.html + style.css + README
- [x] docs/ + ideas/ entry
- [x] build, typecheck, push, PR with Closes #45

## Current step
Complete. Build green: strict typecheck (0 errors), 57/57 unit tests, esbuild
bundle committed (`app.js`, 57.7 kB). PR #46 mergeable (CLEAN). Landing page,
README, docs, and ideas entry all updated.

## Note on pages.yml
The `orrery/` staging block was intentionally NOT included in this PR:
GitHub refuses a `github-actions[bot]` push that touches `.github/workflows/`
when the workflow token lacks `workflows` permission (opencode.yml grants
`contents` but not `workflows`). This matches the `rush` precedent — its
pages.yml block was staged by the owner in the bootstrap commit, not by a
build PR. After merge, the owner (or a hardcoded PAT step) adds the two-line
block so `/orrery/` is served and previewed; the app is fully functional when
served statically, and the PR preview still stages the Orrery docs page.

## Next steps
- None — awaiting the Reviewer.

## Agent log
- 2026-08-13 (build run 1) — scaffolded `orrery/`, installed TypeScript 5.9 +
  esbuild, wrote this progress file.
- 2026-08-13 (build run 2) — wrote pure modules (`math.ts`, `kepler.ts`,
  `bodies.ts`, `noise.ts`) and 43 unit tests; switched the catalog to carry
  real sidereal periods (accurate relative periods independent of the a^1.5
  fit); switched TS to NodeNext ESM so tests run under `node --test`.
- 2026-08-13 (build run 3) — rebuilt the PR branch onto the latest
  `origin/main` (the old head had a disconnected history → PR was CONFLICTING;
  now MERGEABLE/CLEAN). Wrote the render layer (`gl.ts`, `shaders.ts`,
  `geometry.ts`, `textures.ts`), `camera.ts` (free-fly + follow), `renderer.ts`
  (scene draw + ray picking), `ui.ts` (HUD + controls + pointer/wheel input),
  `main.ts` (clock + loop), and the app shell `index.html`/`style.css`/
  `README.md`. Typecheck clean, 43/43 tests, esbuild bundle `app.js`.
- 2026-08-13 (build run 3, part 2) — added 14 more unit tests (`camera`,
  `geometry` — 57 total, all passing), rebuilt `app.js`, updated `docs/`
  (Orrery docs page), added `ideas/2026-08-13-orrery-webgl-solar-system.md`,
  and promoted Orrery on the root `README.md` and `index.html` landing page.
  The `orrery` pages.yml staging block was dropped because the bot token
  cannot push `.github/workflows/` changes (no `workflows` permission) — see
  the "Note on pages.yml" section. Marked Status: complete and pushed.