# Progress - Beambus

- **Issue:** #55
- **Branch:** opencode/55-beambus-retro-arcade-shooter
- **Status:** complete
- **Updated:** 2026-08-14T22:57:00Z

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
- 2026-08-14 (fixer, maintainer iteration pass 2): round 2 of the
  shipping-limit improvement window. Added three mechanics for depth and
  polish: (1) a combo scoring multiplier - consecutive kills without a hit
  climb the score multiplier to x4 (comboMult in game.zig), resets on any hit,
  shown next to the score in the HUD; (2) bonus lives via the new
  `player { life_every N }` key (awardBonusLife, 0 disables); (3) a second
  power-up kind, `shield`, which equips a one-hit bubble (damagePlayer absorbs
  the hit, renderer draws a shield ring + SHLD HUD line). Also: spawnScoreText
  now shows the actual points gained, three new synth effects (powerup,
  shield_break, life) wired into the windowed loop, shield drops added to
  level1.beam, and a second sample level (levels/level2.beam) added. Fixed a
  subtle `@min` u2-overflow in comboMult. Docs (README, docs/index.md,
  docs/index.html, level-format.md) describe the new mechanics and the real
  test count (57). All 57 tests pass, 3/3 self-checks pass, exe builds, 40-seed
  headless stress is clean, determinism byte-identical, windowed run verified
  under the dummy video driver.

- 2026-08-14 (fixer, review round 4 findings): applied the reviewer's three
  round-4 findings. (1) Root README "Current Project" section now names
  Beambus (was still Aftershock) and Aftershock moved to Previous Ideas, in
  line with the landing page. (2) Landing page Beambus card test count fixed
  to 57 (was 41). (3) Removed three unused imports: Rng in entity.zig, Vec2 in
  level.zig, and Kind in game.zig. All 57 tests still pass, 3/3 self-checks.
- 2026-08-14 (fixer, maintainer iteration pass 3): round 3 of the
  shipping-limit improvement window. Added three mechanics for depth and
  polish: (1) a smart bomb - the new `player { bombs N }` level key starts the
  player with N bombs; detonating one (B/V) clears every enemy bullet on
  screen, deals two points of damage to every enemy (kills score through the
  combo multiplier via the shared killEnemy path), flashes the screen white
  and plays a dedicated bomb sound, with a BMB HUD line; (2) a boss health bar
  drawn at the top of the arena from the new max_hp entity field; (3) a
  two-second respawn invulnerability window (blinking sprite) that blocks
  enemy bullets and body contact, so a fresh spawn is never killed instantly.
  levels/level1.beam and level2.beam gained bombs. Docs (README, docs/index,
  docs/index.html, level-format.md, ideas, landing page, root README) updated
  to the real test count (63). All 63 tests pass (6 new: bomb clears bullets,
  bomb damages/scoring, no-stock guard, respawn invuln grant, invuln blocks a
  hit, max_hp at spawn), 3/3 self-checks pass, exe builds, byte-identical
  determinism, 40-seed headless stress clean, windowed runs verified under the
  dummy video driver, frame_test.zig still dumps a valid PPM.

## Iteration log

- **2026-08-14 (round 4, improvement window):** Graze mechanic and enemy shot
  volleys. (1) Grazing: an enemy bullet that passes within the graze band
  around the ship (without hitting) scores `50 * combo multiplier` points,
  rings a soft tick, spawns a cyan burst and floating score, and counts toward
  a GRAZE HUD line; each bullet grazes at most once (new `grazed` entity
  flag). (2) Configurable enemy volleys: enemy defs and bosses accept `shots`
  (bullets per trigger) and `spread` (fan angle in radians) via new level keys,
  so any enemy can throw a fan volley; the old hardcoded boss three-way is now
  data-driven. (3) Polish: a deterministic, RNG-free thruster-trail ember
  behind the ship (uses time, not the RNG stream, so gameplay outcomes are
  unchanged). (4) Synth gained a `graze` effect, wired into the windowed loop;
  sample levels demonstrate volleys (level1 dart/boss, level2 dart/tank/boss).
  Docs (beambus/README, docs/index.md, docs/index.html, level-format.md,
  ideas, root README, landing page) updated to the real test count (68). All
  68 tests pass (5 new: graze scores once, one-graze-per-bullet, graze scaled
  by combo, shots/spread inheritance, parser shots/spread), 3/3 self-checks
  pass, exe builds, byte-identical determinism, 30-seed headless stress clean,
  windowed run verified under the dummy video driver, frame_test.zig valid.
  Note: the Reviewer's "63 vs 61 tests" grep miscounted - the docs' 63 was
  correct (61 named blocks + 2 anonymous aggregator blocks), and the count is
  now 68 after this round.

- **2026-08-14 (round 5, improvement window):** Boss enrage phases, a chase
  movement pattern, bomb-refill drops, and a parallax starfield. (1) Enrage:
  boss defs accept `rage_hp` (HP fraction); when a boss drops to that level it
  enrages exactly once - fire rate doubles, volley gains two bullets, a red
  pulsing aura renders, and a growling `enrage` synth effect plays (new entity
  `enraged`/`rage_hp` fields, checkEnrage in game.zig, wired into the windowed
  loop). (2) Chase: a seventh movement pattern that steers an enemy onto the
  player's column while falling (a dive bomber), used by darts in both sample
  levels. (3) Bomb drops: a third power-up kind that refills one smart-bomb
  stock (capped at 9), drawn as a pinwheel; both levels gained a bomb drop.
  (4) Renderer polish: a two-layer parallax starfield (slow dim far stars,
  faster bright near stars) replaces the single layer. Docs (beambus/README,
  docs/index.md, docs/index.html, level-format.md, ideas, root README, landing
  page) updated to the real test count (74). All 74 tests pass (6 new: boss
  enrage below threshold, enrage fires once, bomb drop refills stock, parser
  reads rage_hp/chase, parser reads bomb kind), 3/3 self-checks pass, exe
  builds, byte-identical determinism per seed, 60-seed headless stress clean,
  windowed run verified under the dummy video driver.

- **2026-08-14 (round 6, improvement window):** Focus mode, a rank difficulty
  system, and a level-title intro banner. (1) Focus: holding Shift (new
  `focus` input bit, SDL shift scancodes) slows the ship to a fraction of its
  speed - the level's new `player { focus_speed }` key, default 0.5 - tightens
  the shot pattern into a converging beam (twin shots converge, the triple
  spread narrows to a tight cone), draws a cyan reticle on the ship's exact
  hitbox, and plays a soft `focus` synth blip on toggle. (2) Rank: a
  performance-scaled difficulty meter (0-100) that rises by 2 per kill and 1
  per graze and drops by 25 on a hit (shield break or death); `rankMult`
  scales enemy fire probability and enemy bullet speed by up to 1.6x, so a hot
  clean run gets harder while a struggling player gets a breather. The HUD
  shows RANK colored by heat. (3) Polish: a level-title intro banner plus a
  controls hint fades in over the first 2.5s of a run (pure game-time, so
  deterministic and pause-freezing). Docs (beambus/README, docs/index.md,
  docs/index.html, level-format.md, ideas, root README, landing page) updated
  to the real test count (79). All 79 tests pass (5 new: parser reads
  focus_speed, focus slows the player, focused twin shots converge, rank rises
  and falls, rank scales the threat multiplier), 3/3 self-checks pass, exe
  builds, byte-identical determinism per seed, 80-seed headless stress clean
  (40 per level), windowed runs verified under the dummy video driver for both
  levels.

- the Fixer

- the Builder