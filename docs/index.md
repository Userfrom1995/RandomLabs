# Redline Rush — Top-Down Arcade Car Racing

**Redline Rush** is a polished, dependency-free browser racing game: you steer
a car up a four-lane road at ever-increasing speed, dodge oncoming traffic,
and keep the tank from running dry by scooping up fuel cans. Everything —
graphics, audio, input, scoring — is plain HTML5 Canvas 2D, the Web Audio
API, and vanilla JavaScript. No frameworks, no CDNs, no build step: it runs
offline from a single folder and plays in any modern browser.

- **Play it now** — [Redline Rush game](https://userfrom1995.github.io/Random/rush/)
  (the game lives at `/rush/`; the rest of the site is the repo landing page).
- **Dependency-free** — `logic.js` (pure gameplay rules), `game.js`
  (rendering/input/audio), one HTML shell, one stylesheet. Open `rush/index.html`
  directly from disk and it works.
- **Procedural everything** — cars, road, trees, and sound effects are drawn
  and synthesized at runtime; there are zero image or audio assets.
- **Tested** — 20 unit tests for the pure gameplay logic
  (`rush/logic.test.js`, run with `node --test`), plus a headless-browser
  smoke test driving the full game loop.

```text
Steer ← → (A/D) · Brake ↓ (S) · Pause P · Mute M · Enter to start
```

---

## How to play

Click **Start Engine** (or press Enter). Your car sits at the bottom of a
four-lane road that scrolls faster the farther you drive.

- **Steer** — arrow keys or A/D, or drag/tap the road on touch screens
  (touch devices also get on-screen steer and brake buttons).
- **Brake** — hold ↓ / S / the BRAKE button to drop to ~55% speed. Slower
  driving burns less fuel but earns score more slowly.
- **Fuel** — the tank drains continuously and drains faster at high speed.
  Collect **fuel cans** (the red canisters with a yellow band) to refill.
  When the tank empties, it's game over. If fuel is running low a can is
  guaranteed to appear soon.
- **Lives** — you have 3. Hitting traffic costs one life and a couple of
  seconds of invincibility; three hits ends the run.
- **Near misses** — threading past a car within a whisker earns a `+25`
  near-miss bonus and a whoosh. That's where the real points come from.
- **Scoring** — you score continuously for distance travelled (faster = more
  per second), plus near-miss and fuel bonuses. Your best score is saved in
  `localStorage` on this device.

### Controls reference

| Key | Action |
| --- | --- |
| `←` / `A` | Steer left |
| `→` / `D` | Steer right |
| `↓` / `S` or `BRAKE` button | Brake |
| `P` / `Esc` | Pause / resume |
| `M` | Mute / unmute |
| `Enter` / `Space` | Start / restart |
| Tap or drag the road | Steer (touch) |

## Running it

There is nothing to install. The game is a static web app:

- **From the deployed site** — open
  [https://userfrom1995.github.io/Random/rush/](https://userfrom1995.github.io/Random/rush/).
- **Locally** — clone the repo and open `rush/index.html` in a browser, or
  serve the folder (`python3 -m http.server` in the repo root, then visit
  `/rush/`).

### Running the tests

The gameplay rules live in `rush/logic.js` as pure functions and are tested
with Node's built-in test runner (Node 18+):

```bash
node --test rush/logic.test.js
```

A headless-browser smoke test (Playwright) drives the actual game: boot,
start, steering, pause, three crashes → game over, high-score persistence,
mute, and window resize:

```bash
node -e "const {chromium}=require('playwright'); ... "   # see rush/README.md
```

## Configuration

All gameplay tuning lives in a single frozen `CONFIG` object at the top of
`rush/logic.js`, so the game can be rebalanced without touching logic:

| Key | Default | Description |
| --- | --- | --- |
| `lanes` | `4` | Number of road lanes |
| `minScrollSpeed` | `230` | Road speed (px/s) at the start of a run |
| `maxScrollSpeed` | `900` | Road speed (px/s) at full difficulty |
| `speedRampDistance` | `16000` | Distance (px) until max speed is reached |
| `spawnIntervalMin/Max` | `0.42` / `0.95` | Seconds between traffic batches |
| `maxGroupSize` | `3` | Cars per batch at full difficulty (a lane is always free) |
| `brakeMultiplier` | `0.55` | Speed fraction while braking |
| `collisionShrink` | `0.78` | Hitbox size fraction — forgiving scrapes |
| `fuelMax` / `fuelPickupAmount` | `100` / `40` | Tank capacity / refill per can |
| `fuelDrainBase` / `fuelDrainPerSpeed` | `1.2` / `0.006` | Fuel/s drained at base speed, plus per px/s |
| `fuelPickupEvery` | `8` | Average seconds between fuel-can spawns |
| `fuelLowThreshold` | `30` | Below this, a fuel can is guaranteed within ~2 s |
| `nearMissDistance` / `nearMissScore` | `60` / `25` | Lateral distance and reward for near misses |
| `fuelPickupScore` | `15` | Score per fuel can collected |
| `lives` / `invincibleTime` | `3` / `2.0` | Lives and post-hit invulnerability (s) |
| `scorePerPixel` / `speedToKmh` | `0.01` / `0.32` | Score per px and px/s→km/h conversion |

Visual-only tuning (tree spacing, dash lengths, steering speed) lives in the
`RENDER` object at the top of `rush/game.js`.

## How it works

### Architecture

- **`rush/logic.js`** — pure, framework-free gameplay rules: difficulty curves
  (`scrollSpeedAt`, `spawnIntervalAt`, `groupSizeAt`), forgiving AABB
  collision, lane math, score formatting, sanitized high-score persistence,
  fuel math, the traffic **spawner**, and near-miss detection. Exposed as
  `window.Redline` in the browser and as a CommonJS module for Node tests.
- **`rush/game.js`** — the browser side: canvas sizing (devicePixelRatio-aware),
  road/scenery/car/canister rendering, the update loop
  (`requestAnimationFrame` with clamped delta), keyboard/touch/pointer input,
  the state machine (menu → playing → paused → over), and the Web Audio
  synth (engine hum whose pitch follows speed, collision thump, pickup blip,
  near-miss whoosh, game-over jingle).
- **`rush/index.html` + `rush/style.css`** — the shell: canvas, HUD (score,
  best, km/h, fuel bar, lives), the three overlay screens, and on-screen
  touch buttons that appear only on coarse-pointer devices.

### The spawner (fairness guarantee)

Traffic spawns in batches, and the spawner guarantees every batch leaves at
least one lane free, and (with a 65% bias) reuses the *previous* batch's free
lane, so consecutive rows form gentle corridors instead of dead-end walls.
Vertical spacing between batches is always greater than a car length, so there
is always a path through. This is unit-tested and validated by a simulation
where a lane-choosing bot never collides across an hour of traffic.

### Difficulty curve

Speed and traffic density ramp over distance using a clamped smoothstep, so
early runs are gentle and things get frantic gradually rather than abruptly.
Braking trades score-per-second and fuel burn for breathing room.

## Key files

- `rush/index.html` — game shell, screens, touch controls.
- `rush/style.css` — layout and theming for the HUD and screens.
- `rush/logic.js` — pure gameplay rules (unit-tested).
- `rush/game.js` — rendering, input, audio, game loop.
- `rush/logic.test.js` — 20 Node unit tests for the gameplay rules.
- `rush/README.md` — project README with quick-start and testing notes.
- `docs/index.md` / `docs/index.html` — this documentation (served at `/docs/`).
- `ideas/2026-08-08-redline-rush-top-down-arcade-racer.md` — the build writeup.

## Notes

- **Why `/rush/` and not the site root?** The repo root `index.html` is the
  Random landing page, which is preserved; the game is served from its own
  directory. `pages.yml` stages `rush/` into the Pages artifact alongside the
  landing page and docs.
- **No assets, ever** — cars are rounded rects with gradient bodies, windshields,
  and lights; the road is a gradient with scrolling dashes and edge lines;
  trees are procedural; fuel cans are a red can with a yellow band and glow;
  audio is synthesized. This keeps the game tiny and fully offline-capable.
- **Fair by construction** — high scores are clamped to safe non-negative
  integers, `localStorage` access is wrapped so private browsing can't crash
  the game, delta time is clamped so a background tab can't cause a teleport,
  and the game auto-pauses when the tab loses focus.
