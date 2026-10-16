// Phase 7 E2E: drive the real page in headless chromium over CDP with
// node's built-in WebSocket. Proves: boot with zero console errors,
// title panel visible, Start click enters play, real keyboard turns Pip
// (score advances), pause/resume, touch swipe, canvas pixels non-blank,
// mobile viewport renders the board, scores panel restores a persisted
// row across reload and clears it in-page.
const fs = require('fs');

// Usage: node web/e2e/browser-e2e.js [page-url] [debug-port]
//   page-url defaults to http://localhost:8931/play.html
//   (serve maze-chase/ first: `python3 -m http.server 8931` inside it)
//   debug-port defaults to 9331: launch chromium first with
//   `--headless=new --remote-debugging-port=9331 --window-size=1280,900 <page-url>`
const DEBUG_PORT = Number(process.argv[3] || 9331);
const PAGE = process.argv[2] || 'http://localhost:8931/play.html';
const SHOT_DIR = '/tmp';

if (typeof WebSocket === 'undefined') {
  console.error('BROWSER-E2E FAIL: global WebSocket not found; run with Node 22+ (`node --version`), no extra packages needed.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let nextId = 1;
const pending = new Map();
function send(ws, method, params) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
}
function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => resolve(ws));
    ws.addEventListener('error', (e) => reject(e));
    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
        else p.resolve(msg.result);
      } else if (msg.method === 'Runtime.consoleAPICalled' && onConsole) {
        onConsole(msg.params);
      } else if (msg.method === 'Log.entryAdded' && onLog) {
        onLog(msg.params);
      }
    });
  });
}
let onConsole = null;
let onLog = null;

async function evalJs(ws, expr) {
  const r = await send(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.exceptionDetails) throw new Error('eval threw: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
}
async function shot(ws, path) {
  const r = await send(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path, Buffer.from(r.data, 'base64'));
}

(async () => {
  const errors = [];
  onConsole = (p) => {
    if (p.type === 'error') errors.push('console.error: ' + p.args.map((a) => a.value || a.description || '?').join(' ').slice(0, 200));
  };
  onLog = (p) => {
    if (p.entry && p.entry.level === 'error' && !/dbus|DBus|GPU|gpu|Fontconfig/i.test(p.entry.text || '')) {
      errors.push('log: ' + (p.entry.text || '').slice(0, 200));
    }
  };
  // Find the page target (chromium launched with about:blank + our page open).
  const listRes = await fetch(`http://localhost:${DEBUG_PORT}/json/list`).then((r) => r.json());
  const page = listRes.find((t) => t.url.includes('play.html')) || listRes.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target; got: ' + JSON.stringify(listRes.map((t) => t.url)));
  const ws = await connect(page.webSocketDebuggerUrl);
  await send(ws, 'Log.enable', {});
  await send(ws, 'Runtime.enable', {});
  await send(ws, 'Page.enable', {});
  await send(ws, 'Page.navigate', { url: PAGE });
  await sleep(1000);
  const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else { console.log('ok:', m); } };

  await sleep(2500); // let wasm boot + several rAF ticks run in real time.
  const boot = await evalJs(ws, `document.getElementById('boot-status').textContent`);
  assert(boot === 'Ready.', 'engine boots (boot-status Ready), got: ' + boot);
  const titleVisible = await evalJs(ws, `!document.getElementById('panel-title').hidden`);
  assert(titleVisible === true, 'title panel visible on boot');
  const scrollY = await evalJs(ws, `window.scrollY`);
  assert(scrollY === 0, 'no focus-scroll on boot, scrollY=' + scrollY);
  const canvasBox = await evalJs(ws, `(() => { const c = document.getElementById('game-canvas'); const r = c.getBoundingClientRect(); return [r.width, r.height, c.width, c.height]; })()`);
  console.log('canvas css x backing:', JSON.stringify(canvasBox));
  assert(canvasBox[0] >= 280 && canvasBox[1] >= 100, 'canvas has real CSS size');
  const badgesHidden = await evalJs(ws, `document.getElementById('hud-fright').hidden && document.getElementById('hud-relish').hidden`);
  assert(badgesHidden === true, 'fright/relish badges hidden while idle');

  // Canvas pixels are really the game (sample the data URL: must vary).
  const pxVar = await evalJs(ws, `(() => {
    const c = document.getElementById('game-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const seen = new Set(); for (let i = 0; i < d.length; i += 401) seen.add(d[i]);
    return seen.size; })()`);
  console.log('canvas distinct sampled bytes:', pxVar);
  assert(pxVar > 8, 'canvas paints varied game pixels');

  // Start the game through the real button, steer with real keys.
  await evalJs(ws, `document.getElementById('btn-start').click()`);
  await sleep(300);
  const screen = await evalJs(ws, `(() => { const s = []; return document.getElementById('panel-title').hidden; })()`);
  assert(screen === true, 'title panel hides after Start (playing)');
  const score0 = await evalJs(ws, `document.getElementById('hud-score').textContent`);
  // Hold ArrowUp for 2.5s of real play.
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code: 'ArrowUp', key: 'ArrowUp' });
  await sleep(2500);
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code: 'ArrowUp', key: 'ArrowUp' });
  const score1 = await evalJs(ws, `document.getElementById('hud-score').textContent`);
  console.log('score before/after holding Up:', score0, '->', score1);
  assert(Number(score1) > Number(score0), 'real keyboard input moves Pip and scores');
  await shot(ws, `${SHOT_DIR}/mc-e2e-play.png`);

  // Pause via the P key, resume via the button.
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyP', key: 'p' });
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyP', key: 'p' });
  await sleep(300);
  const paused = await evalJs(ws, `!document.getElementById('panel-pause').hidden`);
  assert(paused === true, 'P pauses with visible pause panel');
  await evalJs(ws, `document.getElementById('btn-resume').click()`);
  await sleep(300);
  const resumed = await evalJs(ws, `document.getElementById('panel-pause').hidden`);
  assert(resumed === true, 'resume returns to play');

  // Touch swipe on the canvas (up-right flick) must not error or leave play.
  const box = await evalJs(ws, `(() => { const r = document.getElementById('game-canvas').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
  await send(ws, 'Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box[0], y: box[1], id: 1 }] });
  for (let i = 1; i <= 5; i++) {
    await send(ws, 'Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box[0] + i * 20, y: box[1] - i * 20, id: 1 }] });
  }
  await send(ws, 'Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(800);
  const stillPlaying = await evalJs(ws, `document.getElementById('panel-title').hidden && document.getElementById('panel-pause').hidden && document.getElementById('panel-over').hidden`);
  assert(stillPlaying === true, 'touch swipe handled, game continues');

  // Mobile viewport: board must be visible without scrolling.
  await send(ws, 'Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(1500);
  const mBox = await evalJs(ws, `(() => { const c = document.getElementById('game-canvas'); const r = c.getBoundingClientRect(); return [r.width, r.height, r.top]; })()`);
  console.log('mobile canvas css:', JSON.stringify(mBox));
  assert(mBox[0] > 200 && mBox[1] > 100 && mBox[2] >= -1, 'mobile canvas visible near top');
  await shot(ws, `${SHOT_DIR}/mc-e2e-mobile.png`);

  // Scores panel: seed one persisted row, reload so the boot import path
  // (mc_scores_push) restores it, open Scores, assert the row renders via
  // the mc_score_get_* getters (the short-name bug rendered empty tables).
  await evalJs(ws, `localStorage.setItem('maze-chase-scores', JSON.stringify([{name:'Kessa',score:900,level:3}]))`);
  await send(ws, 'Page.navigate', { url: PAGE });
  await sleep(2500);
  const boot2 = await evalJs(ws, `document.getElementById('boot-status').textContent`);
  assert(boot2 === 'Ready.', 'engine reboots after scores seed, got: ' + boot2);
  await evalJs(ws, `document.getElementById('btn-title-scores').click()`);
  await sleep(400);
  const scoresVisible = await evalJs(ws, `!document.getElementById('panel-scores').hidden`);
  assert(scoresVisible === true, 'scores panel opens');
  const scoresText = await evalJs(ws, `document.getElementById('scores-body').textContent`);
  console.log('scores rows:', JSON.stringify(scoresText));
  assert(scoresText.includes('Kessa') && scoresText.includes('900'),
    'persisted row renders (name plus score), got: ' + scoresText);
  await evalJs(ws, `document.getElementById('btn-scores-clear').click()`);
  await sleep(300);
  const clearedText = await evalJs(ws, `document.getElementById('scores-body').textContent`);
  assert(clearedText.includes('No scores yet'), 'clear empties the table in-page');

  const realErrors = errors.filter((e) => !/AudioContext|audio|user gesture/i.test(e));
  console.log('console/log errors:', realErrors.length ? realErrors : '(none)');
  assert(realErrors.length === 0, 'zero console errors');
  ws.close();
  console.log(process.exitCode ? 'E2E: FAILURES PRESENT' : 'E2E: ALL GREEN');
})();
