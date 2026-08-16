# Redline Rush

A polished, dependency-free **top-down arcade car racing game** that runs in
any modern browser. Steer a four-lane highway at ever-increasing speed, dodge
oncoming traffic, and grab fuel cans before the tank runs dry.

- **Play it:** <https://userfrom1995.github.io/Random/rush/>
- **No dependencies, no assets** — everything (cars, road, trees, sound) is
  drawn and synthesized at runtime with Canvas 2D and the Web Audio API.
- **Works offline** — open `rush/index.html` directly from disk and it runs.

## Quick start

```bash
# Option 1: just open the file
open rush/index.html

# Option 2: serve the repo root and visit /rush/
python3 -m http.server
# then open http://localhost:8000/rush/
```

## Controls

| Key | Action |
| --- | --- |
| `←` / `A`, `→` / `D` | Steer |
| `↓` / `S` or on-screen BRAKE | Brake |
| `P` / `Esc` | Pause / resume |
| `M` | Mute |
| `Enter` / `Space` | Start / restart |

Touch devices: drag the road to steer, or use the on-screen buttons.

## How to play

Drive as fast as you dare. Distance earns score (faster = more per second),
near misses earn `+25`, fuel cans earn a refill and `+15`. Three hits and
you're done; running out of fuel is also game over. Best score is saved in
`localStorage` on the device you play on.

## Running the tests

The gameplay rules in `rush/logic.js` are pure functions, tested with Node's
built-in test runner (Node 18+):

```bash
node --test rush/logic.test.js
```

### Headless browser smoke test (Playwright)

The full game can be driven headlessly to verify boot, steering, pause,
game-over, high-score persistence, mute, and resize:

```bash
npm install playwright          # once, in any directory
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + process.cwd() + '/rush/index.html?debug=');
  await p.click('#btn-start');
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500);
  await p.keyboard.up('ArrowRight');
  await p.evaluate(() => {
    const R = window.RedlineRush;
    R.game.invincible = 0;
    R.game.cars.push({ x: R.world.player.x, y: R.world.player.y,
      w: R.world.player.w, h: R.world.player.h, speedFactor: 0,
      passedNearMiss: false, color: '#fff' });
  });
  await p.waitForTimeout(400);
  console.log('state:', await p.evaluate(() => document.body.dataset.state));
  await b.close();
})();
"
```

The `?debug=` query flag exposes `window.RedlineRush` (live `game` and
`world` state) solely for automated tests.

## Project layout

```
rush/
  index.html          game shell, HUD, overlay screens, touch controls
  style.css           theming and layout
  logic.js            pure gameplay rules (unit-tested)
  game.js             rendering, input, audio, game loop
  logic.test.js       20 Node unit tests
  README.md           this file
```

## Configuration

Gameplay tuning lives in the frozen `CONFIG` object at the top of
`logic.js` (difficulty curves, fuel rates, spawn rates, scores, lives).
Visual tuning (tree spacing, dash lengths, steering speed) lives in the
`RENDER` object at the top of `game.js`. See `docs/index.md` for the full
reference table.
