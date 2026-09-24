# Redline Rush

A polished, dependency-free browser **car racing game** (top-down arcade
racer): steer a four-lane highway at ever-increasing speed, dodge oncoming
traffic, and grab fuel cans before the tank runs dry. Deployed on GitHub
Pages so it can be played anywhere from a browser.

## What Was Built

A static web game in `rush/` — nothing but HTML5 Canvas 2D, the Web Audio
API, and vanilla JavaScript. No frameworks, no CDNs, no build step, and no
image or audio assets: every car, tree, road marking, and sound effect is
drawn or synthesized at runtime, so the whole game runs offline from a
single folder and plays identically on a phone or a desktop.

- **Gameplay** — the player steers a car up a scrolling four-lane road that
  accelerates over distance. Traffic spawns in batches that always leave a
  passable lane; the tank drains faster at speed, so fuel cans must be
  collected; three lives, invincibility blink after each hit; near-miss
  bonuses (`+25`) reward threading past traffic; distance-scored with a
  `localStorage`-persisted best.
- **Input everywhere** — arrow keys / WASD, plus drag-or-tap steering and
  on-screen buttons on touch devices; brake pedal; pause (P/Esc); mute (M);
  auto-pause on tab blur.
- **Procedural audio** — a Web Audio engine hum whose pitch follows speed, a
  collision thump, a pickup blip, a near-miss whoosh, and a game-over
  jingle. No audio files.
- **Playable on GitHub Pages** — the game is served from `/rush/` on the
  repo's Pages site while the root landing page stays intact; docs live in
  `docs/` (also deployed). Works offline once loaded.

## Why

The repo's builds so far were all terminal/CLI tools (Automatarium, Arpeggio,
Homunculus, Rotoria) plus one minimal web game (Tic-Tac-Toe, which replaced
the landing page and was later superseded). Redline Rush fills two gaps at
once: a **full-featured browser game** (not a minimax puzzle) that stays
playable long-term as a standalone project, and a **production-quality web
app** — with real input handling (keyboard + touch + pointer), a state
machine, DPR-aware rendering, procedural audio, and an automated test story —
deployed on GitHub Pages so it can be played anywhere.

## How It Works

- **Two-layer architecture.** `rush/logic.js` holds every gameplay rule as a
  pure, framework-free function (difficulty curves, forgiving AABB
  collision, lane math, score formatting, sanitized high-score persistence,
  fuel math, the traffic spawner, near-miss detection). `rush/game.js` only
  wires those rules to canvas rendering, input, audio, and the update loop.
  Because the rules are pure, they're unit-tested in Node (20 tests, `node
  --test rush/logic.test.js`) and reusable verbatim in the browser.
- **Fair spawner.** Traffic spawns in batches; each batch leaves at least one
  lane free, and with 65% probability reuses the previous batch's free lane,
  producing followable corridors instead of dead-end walls. Vertical spacing
  between batches always exceeds a car length. Verified by unit tests plus a
  simulation in which a lane-choosing bot survives an hour of generated
  traffic without a single collision.
- **Difficulty ramp.** Road speed (230→900 px/s) and spawn rate ramp over
  distance with a clamped smoothstep, so the game eases in and gets frantic
  gradually; braking cuts speed to ~55%, trading score-per-second and fuel
  burn for breathing room.
- **Fuel economy loop.** The tank drains proportionally to speed, fuel cans
  spawn every ~8 s, and when fuel drops below a threshold a can is
  guaranteed within ~2 s — so fuel is scarce enough to matter but never
  impossible to find.
- **Rendering.** The canvas is sized in CSS pixels with
  `devicePixelRatio` scaling; the road, scrolling dashes, edge lines,
  procedural trees, gradient cars with windshields/lights, bobbing fuel cans,
  and floating score text are all drawn each frame; screen shake and a red
  flash sell collisions; delta time is clamped so background-tab stutter
  can't teleport the player.
- **Robustness.** All `localStorage` access is try/catch-wrapped (private
  browsing can't crash it), high scores are coerced to safe integers, the
  audio context is created only on a user gesture, and the game auto-pauses
  when the tab loses focus.

## Key Files

- `rush/index.html` — game shell, HUD, overlay screens, touch controls.
- `rush/style.css` — theming and layout for the HUD and screens.
- `rush/logic.js` — pure gameplay rules (unit-tested).
- `rush/game.js` — rendering, input, audio, and the game loop.
- `rush/logic.test.js` — 20 Node unit tests for the gameplay rules.
- `rush/README.md` — project README with quick-start and testing notes.
- `docs/index.md` + `docs/index.html` — documentation site (served at
  `/docs/` on GitHub Pages).
- `.github/workflows/pages.yml` — updated to stage `rush/` into the Pages
  artifact (the PR-preview feature is untouched).

## Notes

- **Play it:** https://userfrom1995.github.io/Random/rush/ (or open
  `rush/index.html` directly from disk — no server needed).
- **Tests:** `node --test rush/logic.test.js` (20/20 passing). The game was
  also smoke-tested headlessly with Playwright: boot → menu, start,
  steering, pause/resume, three crashes → game over, high-score persistence,
  mute persistence, and window-resize clamping all verified with zero JS
  errors.
- **Name origin:** "redline" = the maximum engine speed; a game about pushing
  the throttle toward the limit while the needle climbs the dial. Easily
  distinguishable from the other project names (Arpeggio, Homunculus,
  Automatarium, Rotoria) so future ideation agents won't collide with it.
- **Possible improvements:** leaderboards, drifting/skid physics, a
  one-more-lap endless variant, day/night cycle, and power-ups beyond fuel
  (nitro, shield, coin multiplier).
