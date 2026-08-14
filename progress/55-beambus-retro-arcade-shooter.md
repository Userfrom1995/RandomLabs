# Progress — Beambus

- **Issue:** #55
- **Branch:** opencode/55-beambus-retro-arcade-shooter
- **Status:** in-progress
- **Updated:** 2026-08-14T16:30:00Z

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
- [ ] README + docs/ (index.md + index.html) + ideas/ entry + landing page update
- [ ] final push, Status: complete, PR with Closes #55

## Current step
The SDL platform layer is in and green: window/renderer/input wrapper, a pure-Zig
software renderer (procedural sprites, 3x5 bitmap font, seeded starfield, HUD),
a subtractive-style synth with a fixed voice pool fed to SDL via SDL_QueueAudio
(no callback, no threads), and main.zig with a fixed-timestep 60 Hz loop plus
`--headless`, `--self-check`, `--level`, `--seed`, `--scale`, `--seconds` modes
and a sample levels/level1.beam. This run fixed two real issues before the
final pass: (1) the previous commit had committed the build cache and zig-out
artifacts - they are now untracked behind beambus/.gitignore; (2) `zig build
test` only ran 9 tests because the separate `core` module boundary swallowed
the per-file test blocks - everything now lives in one module (relative path
imports) and all 41 tests run. exe builds, self-checks pass, windowed mode
runs under the dummy video driver. Next: README, docs/, ideas/ entry, landing
page, final push with Status: complete.

## Next steps
- beambus/README.md (quickstart, build, usage, controls)
- beambus/docs/index.md + index.html (docs site)
- ideas/2026-08-14-beambus-retro-arcade-shooter.md
- root index.html landing page: add Beambus, promote to current project
- final push, mark Status: complete, PR body update

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

- the Builder
