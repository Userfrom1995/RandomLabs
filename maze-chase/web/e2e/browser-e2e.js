// Phase 7 E2E: drive the real page in headless chromium over CDP with
// node's built-in WebSocket. Proves: boot with zero console errors,
// title panel visible, Start click enters play, real keyboard turns Pip
// (score advances), pause/resume, touch swipe, canvas pixels non-blank,
// mobile viewport renders the board, scores panel restores a persisted
// row across reload and clears it in-page.
const fs = require('fs');
const os = require('os');

// Usage: node web/e2e/browser-e2e.js [page-url] [debug-port]
//   page-url defaults to http://localhost:8931/play.html
//   (serve maze-chase/ first: `python3 -m http.server 8931` inside it;
//   Windows: `python -m http.server 8931`)
//   debug-port defaults to 9331: launch chromium first with
//   `--headless=new --remote-debugging-port=9331 --window-size=1280,900 <page-url>`
const DEBUG_PORT = Number(process.argv[3] || 9331);
const PAGE = process.argv[2] || 'http://localhost:8931/play.html';
const SHOT_DIR = os.tmpdir();

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
  const titleZones = await evalJs(ws, `(() => {
    const desc = document.getElementById('title-desc');
    const legend = document.getElementById('title-legend');
    const goal = document.getElementById('title-goal');
    return [
      !!desc && desc.textContent.includes('Start game'),
      !!legend && legend.textContent.includes('Bram the heron'),
      !!goal && goal.textContent.includes('445'),
    ];
  })()`);
  assert(titleZones[0] === true, 'title card carries the selected-item description strip');
  assert(titleZones[1] === true, 'title card carries the warden legend');
  assert(titleZones[2] === true, 'title card carries the goal line');
  const descSwitches = await evalJs(ws, `(() => {
    document.getElementById('btn-title-help').focus();
    return document.getElementById('title-desc').textContent.includes('warden legend');
  })()`);
  assert(descSwitches === true, 'focusing a title action updates the description strip');
  const scrollY = await evalJs(ws, `window.scrollY`);
  assert(scrollY === 0, 'no focus-scroll on boot, scrollY=' + scrollY);
  const canvasBox = await evalJs(ws, `(() => { const c = document.getElementById('game-canvas'); const r = c.getBoundingClientRect(); return [r.width, r.height, c.width, c.height]; })()`);
  console.log('canvas css x backing:', JSON.stringify(canvasBox));
  assert(canvasBox[0] >= 280 && canvasBox[1] >= 100, 'canvas has real CSS size');
  const badgesHidden = await evalJs(ws, `document.getElementById('hud-fright').hidden && document.getElementById('hud-relish').hidden`);
  assert(badgesHidden === true, 'fright/relish badges hidden while idle');

  // First-view craft: the title card and its primary CTA are fully inside
  // the 1440x900 viewport, centered, and hit-testable at their real
  // coordinates (not merely present in the DOM below the fold).
  const firstView = await evalJs(ws, `(() => {
    const card = document.getElementById('panel-title');
    const btn = document.getElementById('btn-start');
    const c = card.getBoundingClientRect(), b = btn.getBoundingClientRect();
    const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    const cx = c.x + c.width / 2, cy = c.y + c.height / 2;
    return [c.x, c.y, c.width, c.height, b.x, b.y, b.width, b.height,
      (hit === btn || btn.contains(hit)) ? 1 : 0,
      Math.abs(cx - document.documentElement.clientWidth / 2) < 2 ? 1 : 0,
      Math.abs(cy - innerHeight / 2) < 2 ? 1 : 0,
      document.documentElement.clientWidth, innerHeight];
  })()`);
  console.log('first view card/cta:', JSON.stringify(firstView));
  assert(firstView[0] >= 0 && firstView[1] >= 0 &&
    firstView[0] + firstView[2] <= firstView[11] &&
    firstView[1] + firstView[3] <= firstView[12],
    'title card fully inside the first viewport');
  assert(firstView[4] >= 0 && firstView[5] >= 0 &&
    firstView[4] + firstView[6] <= firstView[11] &&
    firstView[5] + firstView[7] <= firstView[12],
    'Start CTA fully inside the first viewport');
  assert(firstView[8] === 1, 'Start CTA receives the hit test at its center');
  assert(firstView[9] === 1 && firstView[10] === 1, 'title card is centered in the viewport');

  // Canvas pixels are really the game (sample the data URL: must vary).
  const pxVar = await evalJs(ws, `(() => {
    const c = document.getElementById('game-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const seen = new Set(); for (let i = 0; i < d.length; i += 401) seen.add(d[i]);
    return seen.size; })()`);
  console.log('canvas distinct sampled bytes:', pxVar);
  assert(pxVar > 8, 'canvas paints varied game pixels');

  // Start the game through a real mouse click at the CTA center.
  const startPt = await evalJs(ws, `(() => { const r = document.getElementById('btn-start').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: startPt[0], y: startPt[1], button: 'left', clickCount: 1 });
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: startPt[0], y: startPt[1], button: 'left', clickCount: 1 });
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
  const mobilePause = await evalJs(ws, `(() => {
    const p = document.getElementById('panel-pause');
    const b = document.getElementById('btn-pause');
    const pr = p.getBoundingClientRect(), br = b.getBoundingClientRect();
    const hit = document.elementFromPoint(br.x + br.width / 2, br.y + br.height / 2);
    return [b.hidden ? 0 : 1, p.hidden ? 0 : 1,
      br.x >= 0 && br.y >= 0 && br.x + br.width <= innerWidth && br.y + br.height <= innerHeight ? 1 : 0,
      (hit === b || b.contains(hit)) ? 1 : 0,
      pr.x >= 0 && pr.y >= 0 && pr.x + pr.width <= innerWidth && pr.y + pr.height <= innerHeight ? 1 : 0,
      pr.x, pr.y, pr.width, pr.height, innerWidth, innerHeight];
  })()`);
  console.log('mobile pause hit test:', JSON.stringify(mobilePause));
  assert(mobilePause[0] === 1, 'mobile pause control is visible during play');
  assert(mobilePause[2] === 1 && mobilePause[3] === 1, 'mobile pause control is inside the viewport and hit-testable');
  const pausePt = await evalJs(ws, `(() => { const r = document.getElementById('btn-pause').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: pausePt[0], y: pausePt[1], button: 'left', clickCount: 1 });
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: pausePt[0], y: pausePt[1], button: 'left', clickCount: 1 });
  await sleep(300);
  const mobilePaused = await evalJs(ws, `(() => {
    const p = document.getElementById('panel-pause');
    const r = p.getBoundingClientRect();
    return [p.hidden ? 0 : 1, r.x >= 0 && r.y >= 0 && r.x + r.width <= innerWidth && r.y + r.height <= innerHeight ? 1 : 0];
  })()`);
  assert(mobilePaused[0] === 1, 'real click opens the pause dialog on mobile');
  assert(mobilePaused[1] === 1, 'mobile pause dialog fits the viewport');
  const resumePt = await evalJs(ws, `(() => { const r = document.getElementById('btn-resume').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: resumePt[0], y: resumePt[1], button: 'left', clickCount: 1 });
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: resumePt[0], y: resumePt[1], button: 'left', clickCount: 1 });
  await sleep(300);
  assert((await evalJs(ws, `document.getElementById('panel-pause').hidden`)) === true, 'mobile Resume returns to play');
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

  // Settings theme panel: the label is read from Rust (single source of
  // truth), the cycle button repaints the attract board, and the choice
  // persists through the settings blob and a reload. The baseline is
  // normalized first because a prior run may have left a stored theme.
  await send(ws, 'Page.navigate', { url: PAGE });
  await sleep(2500);
  await evalJs(ws, `document.getElementById('btn-title-settings').click()`);
  await sleep(400);
  const themeLabel = () => evalJs(ws, `document.getElementById('theme-label').textContent`);
  const canvasHash = () => evalJs(ws, `(() => { const d = document.getElementById('game-canvas').toDataURL(); let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d.charCodeAt(i)) | 0; return h; })()`);
  let label = await themeLabel();
  for (let i = 0; i < 3 && !String(label).startsWith('Dusk Pond'); i++) {
    await evalJs(ws, `document.getElementById('btn-theme').click()`);
    await sleep(300);
    label = await themeLabel();
  }
  assert(label === 'Dusk Pond (1/3)', 'theme label starts on the canonical Dusk Pond row, got: ' + label);
  const duskHash = await canvasHash();
  await evalJs(ws, `document.getElementById('btn-theme').click()`);
  await sleep(400);
  assert((await themeLabel()) === 'Morning Shallows (2/3)', 'theme cycle advances to Morning Shallows');
  await evalJs(ws, `document.getElementById('btn-theme').click()`);
  await sleep(400);
  assert((await themeLabel()) === 'Moonwake (3/3)', 'theme cycle advances to Moonwake');
  const moonHash = await canvasHash();
  assert(moonHash !== duskHash, 'a theme change repaints the board canvas');
  const themeBlob = await evalJs(ws, `localStorage.getItem('maze-chase-settings')`);
  const themeText = themeBlob ? Buffer.from(themeBlob, 'base64').toString('utf8') : '';
  assert(/^theme = moonwake$/m.test(themeText), 'stored settings blob carries the canonical theme id, got: ' + JSON.stringify(themeText.split('\n').filter((l) => l.startsWith('theme'))));
  await send(ws, 'Page.navigate', { url: PAGE });
  await sleep(2500);
  await evalJs(ws, `document.getElementById('btn-title-settings').click()`);
  await sleep(400);
  assert((await themeLabel()) === 'Moonwake (3/3)', 'theme choice persists across a reload');
  // Leave the shipped default for any later pass.
  await evalJs(ws, `document.getElementById('btn-theme').click()`);
  await sleep(400);
  assert((await themeLabel()) === 'Dusk Pond (1/3)', 'theme returns to the default row');

  // Accessibility settings: both checkboxes exist, reachable, persist in
  // the Rust settings blob, and restore checked across a reload.
  assert((await evalJs(ws, `document.querySelectorAll('#chk-motion, #chk-contrast').length`)) === 2,
    'reduced-motion and high-contrast checkboxes exist');
  await evalJs(ws, `(() => {
    const m = document.getElementById('chk-motion');
    const c = document.getElementById('chk-contrast');
    m.checked = true; m.dispatchEvent(new Event('change', { bubbles: true }));
    c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sleep(400);
  const a11yBlob = await evalJs(ws, `localStorage.getItem('maze-chase-settings')`);
  const a11yText = a11yBlob ? Buffer.from(a11yBlob, 'base64').toString('utf8') : '';
  assert(/^reduced_motion = true$/m.test(a11yText), 'reduced_motion persists in the settings blob, got: ' + JSON.stringify(a11yText.split('\n').filter((l) => l.startsWith('reduced_motion'))));
  assert(/^high_contrast = true$/m.test(a11yText), 'high_contrast persists in the settings blob');
  await send(ws, 'Page.navigate', { url: PAGE });
  await sleep(2500);
  await evalJs(ws, `document.getElementById('btn-title-settings').click()`);
  await sleep(400);
  assert((await evalJs(ws, `document.getElementById('chk-motion').checked`)) === true, 'reduced-motion restores checked');
  assert((await evalJs(ws, `document.getElementById('chk-contrast').checked`)) === true, 'high-contrast restores checked');
  await evalJs(ws, `(() => {
    const m = document.getElementById('chk-motion');
    const c = document.getElementById('chk-contrast');
    m.checked = false; m.dispatchEvent(new Event('change', { bubbles: true }));
    c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sleep(300);

  const realErrors = errors.filter((e) => !/AudioContext|audio|user gesture/i.test(e));
  console.log('console/log errors:', realErrors.length ? realErrors : '(none)');
  assert(realErrors.length === 0, 'zero console errors');
  ws.close();
  console.log(process.exitCode ? 'E2E: FAILURES PRESENT' : 'E2E: ALL GREEN');
})();
