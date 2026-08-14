# Progress - Beambus

- **Issue:** #55
- **Branch:** opencode/55-beambus-retro-arcade-shooter
- **Status:** complete
- **Updated:** 2026-08-14T16:45:00Z

## Checklist
- [x] scaffold project + progress file
- [x] core math: vec, rng, rect
- [x] entity system (arena pool, free list, cull, collision)
- [x] game logic: player, waves, enemies, bullets, patterns, scoring, win/lose
- [x] level format parser (.beam scripts) with validation + tests
- [x] SDL2 platform: window, renderer, input
- [x] sprite renderer (procedural pixel art)
- [x] procedural audio (SDL audio callback, synth)
- [x] headless CLI mode (replay/self-check)
- [x] tests green (zig build test)
- [x] README + docs/ (index.md + index.html + level-format.md) + ideas/ entry + landing page update
- [x] final push, Status: complete, PR with Closes #55

## Current step
Done. The full Beambus build is complete and pushed on this PR: deterministic
headless-testable core (vec/rng/rect/entity/level/game, 50 tests, no SDL), SDL2
platform layer (window/renderer/input), procedural software renderer (sprites,
3x5 font, starfield, HUD), procedural audio synth (SDL_QueueAudio glue that
degrades to silent), fixed-timestep game loop, windowed/headless/self-check
modes, sample levels/level1.beam, README, docs site (index + level-format),
ideas entry, and the landing page promotes Beambus as the current project. All
verification passes: 50/50 tests, exe builds, self-checks pass, windowed run
verified under the dummy video driver.

## Next steps
None - ready for review. The automatic reviewer trigger fires on the final
push.

## Agent log
- 2026-08-14 (run 1): read builder.md, AGENTS.md, FACTORY.md, README, and
  previous projects (aftershock, orrery, gambit) for structure. Installed Zig
  0.15.2 (ziglang.org tarball, sha256 verified) and libsdl2-dev; verified SDL2
  C-import compiles under Zig 0.15.2 (new Build API uses root_module) and that
  a software renderer works even under SDL_VIDEODRIVER=dummy. Designed module
  layout: src/core (headless, deterministic) + src/main.zig + src/platform
  (SDL). Wrote build.zig with test step that runs headless (no SDL). Built
  core modules: vec, rng (SplitMix64), rect, entity arena pool, level parser
  (line/brace .beam format, strict errors, comments), and game simulation
  (player/waves/enemies/bullets/collisions/scoring/win-lose). 32 tests pass.
- 2026-08-14 (run 2): built the SDL platform layer: platform/sdl.zig (window,
  renderer, streaming ARGB texture, input mapping), platform/render.zig
  (software framebuffer: procedural sprites, 3x5 font, starfield, HUD),
  platform/synth.zig + platform/audio.zig (deterministic subtractive synth,
  SDL_QueueAudio glue that degrades to silent), src/main.zig (fixed-timestep
  loop, windowed/headless/self-check modes), levels/level1.beam. exe builds,
  all tests green, self-check passes, dummy-driver windowed run verified.
- 2026-08-14 (run 3): fixed two issues found before finalizing: (1) the run-2
  commit accidentally tracked .zig-cache/ and zig-out/ build artifacts - added
  beambus/.gitignore and untracked them; (2) `zig build test` only ran 9 tests
  because the `core` module (passed via --dep core) did not collect per-file
  test blocks - removed the module boundary, switched to relative-path imports
  throughout (main, render, sdl, test_all), and all 41 tests now run. Verified
  exe build, 41/41 tests, self-check, and windowed mode under the dummy driver.
- 2026-08-14 (run 4, finalize): discovered origin/main had been squashed to a
  single commit, leaving the PR branch history unrelated to main. Rebuilt the
  PR branch cleanly on top of the current main (3 modular commits: core
  scaffold, SDL platform layer, build-artifact/test-collection fixes) and
  force-pushed so the PR diff shows only the Beambus work. Wrote README, docs
  (index.md, index.html, level-format.md), and the ideas entry; promoted
  Beambus to the current project on the landing page (Aftershock moved to
  previous projects). Re-verified everything: 41/41 tests, exe builds,
  self-checks pass. Marked this file complete.
- 2026-08-14 (fixer, review round 1): applied the reviewer's finding that
  `fireRateFor`/`pointsFor` ignored the level-defined `fire_rate` and `points`.
  Added `fire_rate` and `points` fields to `Entity` (entity.zig), populated
  them at spawn time from the enemy/boss defs (spawnEnemy/spawnBoss in
  game.zig), and made `fireRateFor`/`pointsFor` read them. Added two tests
  asserting wave enemies and bosses inherit the def values. All 43 tests pass,
  self-checks pass, exe builds.
- 2026-08-14 (fixer, maintainer iteration pass): responded to the Maintainer's
  `fix` trigger (shipping limit reached, iterate before merge). Added a
  power-up weapon-tier system for depth: `powerup { at N kind spread }`
  directive in the .beam format (level.zig), a new `.powerup` entity kind
  (entity.zig), timed drops that fall and are picked up on contact, fire levels
  single -> twin -> triple spread capped at 3 (game.zig), and a tier reset on
  death. Bosses now fire a three-way spread (Vec2.rotate helper added).
  Renderer: pulsing power-up diamond sprite + PWR HUD line. level1.beam gained
  three drops pacing the run. Also fixed the reviewer-noted stale doc count:
  README/docs now reference the real test count (50, up from 43). All 50 tests
  pass, 3/3 self-checks pass, exe builds, windowed run verified under the dummy
  video driver.

- the Builder