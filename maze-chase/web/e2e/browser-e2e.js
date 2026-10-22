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
  // Capture the page's own wasm exports so the fright HUD contract below can
  // drive the same session the on-screen HUD reads from.
  await send(ws, 'Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      const wrap = (r) => { try { window.__mazeExports = r.instance ? r.instance.exports : r.exports; } catch (e) {} return r; };
      const streaming = WebAssembly.instantiateStreaming;
      if (streaming) WebAssembly.instantiateStreaming = function () { return streaming.apply(this, arguments).then(wrap); };
      const instantiate = WebAssembly.instantiate;
      WebAssembly.instantiate = function () { return instantiate.apply(this, arguments).then(wrap); };
    })();`,
  });
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
  const chip = await evalJs(ws, `(() => {
    const b = document.getElementById('btn-audio');
    return b ? [b.hidden, b.tagName, b.textContent.trim()] : null;
  })()`);
  assert(chip && chip[0] === false && chip[1] === 'BUTTON' && /tap to wake/i.test(chip[2]),
    'audio unlock chip is visible before the first gesture, got: ' + JSON.stringify(chip));
  // Keyboard focus contract: boot auto-focuses Start, ArrowDown moves off it,
  // and P/Esc/M keep working from a focused panel action (round-23 review).
  const bootFocus = await evalJs(ws, `document.activeElement && document.activeElement.id`);
  assert(bootFocus === 'btn-start', 'title auto-focuses Start, got: ' + bootFocus);
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code: 'ArrowDown', key: 'ArrowDown', windowsVirtualKeyCode: 40 });
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code: 'ArrowDown', key: 'ArrowDown', windowsVirtualKeyCode: 40 });
  await sleep(150);
  const focusMoved = await evalJs(ws, `document.activeElement && document.activeElement.id`);
  assert(focusMoved !== 'btn-start' && focusMoved !== '',
    'ArrowDown moves focus off the auto-focused Start, got: ' + focusMoved);
  await evalJs(ws, `document.getElementById('btn-start').focus()`);
  await evalJs(ws, `document.getElementById('btn-audio').click()`);
  await sleep(500);
  const chipHidden = await evalJs(ws, `document.getElementById('btn-audio').hidden`);
  assert(chipHidden === true, 'audio unlock chip retires once the context is awake');
  await send(ws, 'Page.bringToFront');
  const descSwitches = await evalJs(ws, `(() => {
    document.getElementById('btn-title-help').focus();
    return document.getElementById('title-desc').textContent.includes('warden legend');
  })()`);
  assert(descSwitches === true, 'focusing a title action updates the description strip');
  // P is the documented menu Back key, not only Esc.
  await evalJs(ws, `document.getElementById('btn-title-help').click()`);
  await sleep(200);
  const helpOpen = await evalJs(ws, `!document.getElementById('panel-help').hidden`);
  assert(helpOpen === true, 'Help opens from the title action');
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyP', key: 'p' });
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyP', key: 'p' });
  await sleep(200);
  const helpClosedByP = await evalJs(ws, `document.getElementById('panel-help').hidden`);
  assert(helpClosedByP === true, 'P backs out of Help');
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
    const hb = document.querySelector('header').getBoundingClientRect();
    const contentCenter = hb.bottom + (innerHeight - hb.bottom) / 2;
    return [c.x, c.y, c.width, c.height, b.x, b.y, b.width, b.height,
      (hit === btn || btn.contains(hit)) ? 1 : 0,
      Math.abs(cx - document.documentElement.clientWidth / 2) < 2 ? 1 : 0,
      Math.abs(cy - contentCenter) < 2 ? 1 : 0,
      document.documentElement.clientWidth, innerHeight,
      c.y >= hb.bottom + 8 ? 1 : 0, hb.bottom];
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
  assert(firstView[9] === 1 && firstView[10] === 1, 'title card is centered in the content area below the header');
  assert(firstView[13] === 1, 'title card clears the sticky header, header bottom=' + firstView[14]);

  // Title card clears the sticky header on every small viewport (including
  // short landscape), with its heading itself hit-testable and every action
  // inside both the card and the viewport.
  for (const [vw, vh] of [[320, 480], [320, 568], [320, 360], [360, 640], [375, 667], [390, 844], [480, 320], [568, 320]]) {
    await send(ws, 'Emulation.setDeviceMetricsOverride', { width: vw, height: vh, deviceScaleFactor: 2, mobile: true });
    await sleep(350);
    const fit = await evalJs(ws, `(() => {
      const card = document.getElementById('panel-title');
      const h = document.querySelector('header');
      const heading = card.querySelector('h2');
      const b = card.querySelector('[data-primary]');
      const hb = h.getBoundingClientRect(), cb = card.getBoundingClientRect();
      const tb = heading.getBoundingClientRect();
      const hit = document.elementFromPoint(tb.x + tb.width / 2, tb.y + tb.height / 2);
      const br = b.getBoundingClientRect();
      const bhit = document.elementFromPoint(br.x + br.width / 2, br.y + br.height / 2);
      const contentCenter = hb.bottom + (innerHeight - hb.bottom) / 2;
      const buttons = Array.from(card.querySelectorAll('.title-actions button'));
      const buttonsFit = buttons.length > 0 && buttons.every((btn) => {
        const r = btn.getBoundingClientRect();
        return r.top >= cb.top && r.bottom <= cb.bottom &&
          r.left >= cb.left && r.right <= cb.right &&
          r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
      });
      return [hb.bottom, cb.top, cb.bottom, innerHeight, innerWidth,
        cb.top >= hb.bottom + 8 ? 1 : 0,
        cb.top >= 0 && cb.bottom <= innerHeight ? 1 : 0,
        (hit === heading || heading.contains(hit)) ? 1 : 0,
        Math.abs((cb.top + cb.bottom) / 2 - contentCenter) < 2 ? 1 : 0,
        br.top, br.left, br.right, br.bottom,
        br.top >= 0 && br.left >= 0 && br.right <= innerWidth && br.bottom <= innerHeight ? 1 : 0,
        (bhit === b || b.contains(bhit)) ? 1 : 0,
        buttonsFit ? 1 : 0];
    })()`);
    assert(fit[5] === 1, `title card clears the sticky header at ${vw}x${vh} (header ${fit[0]}, card ${fit[1]})`);
    assert(fit[6] === 1, `title card is inside the viewport at ${vw}x${vh} (card ${fit[1]}..${fit[2]}, viewport ${fit[3]})`);
    assert(fit[7] === 1, `title heading itself is hit-testable at ${vw}x${vh}`);
    assert(fit[8] === 1, `title card is centered below the header at ${vw}x${vh}`);
    assert(fit[13] === 1,
      `title primary CTA is fully inside ${vw}x${vh} (${fit[9]}..${fit[12]})`);
    assert(fit[14] === 1, `title primary CTA is hit-testable at ${vw}x${vh}`);
    assert(fit[15] === 1, `every title action is inside the card and ${vw}x${vh}`);
  }

  // A title card scrolled on a phone must reopen at its top after leaving
  // and coming back (Start -> Pause -> Quit in the round-21 review). The
  // body is a labeled focus region, so arrows scroll it from the keyboard.
  await send(ws, 'Emulation.setDeviceMetricsOverride', { width: 320, height: 480, deviceScaleFactor: 2, mobile: true });
  await sleep(350);
  const scrollRegion = await evalJs(ws, `(() => {
    const body = document.querySelector('#panel-title .panel-scroll');
    body.focus();
    return [document.activeElement === body ? 1 : 0, body.getAttribute('tabindex'),
      body.getAttribute('role'), body.getAttribute('aria-label') || ''];
  })()`);
  assert(scrollRegion[0] === 1 && scrollRegion[1] === '0' && scrollRegion[2] === 'region',
    'title body is a focusable scroll region');
  assert(scrollRegion[3].length > 0, 'title scroll region carries an aria-label');
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code: 'ArrowDown', key: 'ArrowDown', windowsVirtualKeyCode: 40 });
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code: 'ArrowDown', key: 'ArrowDown', windowsVirtualKeyCode: 40 });
  await sleep(250);
  const titleScrolled = await evalJs(ws, `document.querySelector('#panel-title .panel-scroll').scrollTop`);
  assert(titleScrolled > 0, 'arrow keys scroll the focused title body, scrollTop=' + titleScrolled);
  await evalJs(ws, `document.querySelector('#panel-title .panel-scroll').scrollTop = 999`);
  const preClickScroll = await evalJs(ws, `document.querySelector('#panel-title .panel-scroll').scrollTop`);
  assert(preClickScroll > 0, 'title body is scrolled before the reopen check, scrollTop=' + preClickScroll);
  await evalJs(ws, `document.getElementById('btn-title-help').click()`);
  await sleep(250);
  await evalJs(ws, `document.getElementById('btn-help-back').click()`);
  await sleep(250);
  const titleReset = await evalJs(ws, `(() => {
    const body = document.querySelector('#panel-title .panel-scroll');
    const h = document.querySelector('#panel-title h2').getBoundingClientRect();
    return [body.scrollTop, h.top, document.getElementById('panel-title').hidden ? 0 : 1];
  })()`);
  console.log('title reopen scroll:', JSON.stringify(titleReset));
  assert(titleReset[2] === 1, 'title returns after Help');
  assert(titleReset[0] === 0, 'title body reopens at its top, scrollTop=' + titleReset[0]);
  assert(titleReset[1] >= 0, 'title heading is visible after reopening, top=' + titleReset[1]);
  await send(ws, 'Emulation.clearDeviceMetricsOverride');
  await sleep(400);


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

  // Pause via the P key; focus lands on Resume. The old handler dropped
  // P/Esc/M whenever a panel button had focus, so prove all three work.
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyP', key: 'p' });
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyP', key: 'p' });
  await sleep(300);
  const paused = await evalJs(ws, `!document.getElementById('panel-pause').hidden`);
  assert(paused === true, 'P pauses with visible pause panel');
  const pauseFocus = await evalJs(ws, `document.activeElement && document.activeElement.id`);
  assert(pauseFocus === 'btn-resume', 'pause focuses the Resume action, got: ' + pauseFocus);
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyP', key: 'p' });
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyP', key: 'p' });
  await sleep(300);
  const resumedByP = await evalJs(ws, `document.getElementById('panel-pause').hidden`);
  assert(resumedByP === true, 'P resumes from the focused Resume button');

  // Pause again, then Esc resumes from the same focused button.
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyP', key: 'p' });
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyP', key: 'p' });
  await sleep(300);
  const pausedAgain = await evalJs(ws, `!document.getElementById('panel-pause').hidden`);
  assert(pausedAgain === true, 'P pauses again');
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code: 'Escape', key: 'Escape', windowsVirtualKeyCode: 27 });
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code: 'Escape', key: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(300);
  const resumedByEsc = await evalJs(ws, `document.getElementById('panel-pause').hidden`);
  assert(resumedByEsc === true, 'Esc resumes from the pause hub');

  // M toggles mute from the focused pause action (also dropped before).
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyP', key: 'p' });
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyP', key: 'p' });
  await sleep(300);
  const muteBefore = await evalJs(ws, `document.getElementById('btn-mute').textContent`);
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyM', key: 'm' });
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyM', key: 'm' });
  await sleep(500);
  const muteAfter = await evalJs(ws, `document.getElementById('btn-mute').textContent`);
  assert(muteAfter !== muteBefore,
    'M toggles mute from the focused pause action, got: ' + muteBefore + ' -> ' + muteAfter);
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyM', key: 'm' });
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyM', key: 'm' });
  await sleep(500);
  const muteRestored = await evalJs(ws, `document.getElementById('btn-mute').textContent`);
  assert(muteRestored === muteBefore, 'M toggles mute back, got: ' + muteRestored);
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code: 'Escape', key: 'Escape', windowsVirtualKeyCode: 27 });
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code: 'Escape', key: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(300);
  const resumedAfterMute = await evalJs(ws, `document.getElementById('panel-pause').hidden`);
  assert(resumedAfterMute === true, 'Esc resumes after the mute checks');

  // Round-25 keyboard contract: menu arrows never dispatch a rebound
  // gameplay action, P dispatches the Back *button* even after Back leaves
  // Escape, WASD twins move focus, and the M shortcut persists its mute.
  const tapKey = async (code, key, vk) => {
    await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code, key, windowsVirtualKeyCode: vk });
    await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code, key, windowsVirtualKeyCode: vk });
    await sleep(180);
  };
  await tapKey('Escape', 'Escape', 27);
  await sleep(250);
  await evalJs(ws, `document.getElementById('btn-pause-quit').click()`);
  await sleep(300);
  assert((await evalJs(ws, `!document.getElementById('panel-title').hidden`)) === true,
    'quit returns to the title for the keyboard contract checks');
  // Start from defaults so a persisted custom keymap from an earlier pass
  // cannot make the rebind captures conflict.
  await evalJs(ws, `localStorage.removeItem('maze-chase-settings')`);
  await send(ws, 'Page.navigate', { url: PAGE });
  await sleep(2500);
  await evalJs(ws, `document.getElementById('btn-title-settings').click()`);
  await sleep(300);
  const audioDefaults = await evalJs(ws, `[
    Number(document.getElementById('rng-master').value),
    Number(document.getElementById('rng-music').value),
    Number(document.getElementById('rng-sfx').value),
  ]`);
  assert(audioDefaults[0] === 80 && audioDefaults[1] === 60 && audioDefaults[2] === 80,
    'settings expose the documented 80/60/80 master/music/SFX defaults, got: ' + JSON.stringify(audioDefaults));
  await evalJs(ws, `(() => {
    const m = document.getElementById('rng-music');
    const s = document.getElementById('rng-sfx');
    m.value = 35; m.dispatchEvent(new Event('input', { bubbles: true }));
    s.value = 45; s.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(300);
  const audioBlob = await evalJs(ws, `localStorage.getItem('maze-chase-settings')`);
  const audioText = audioBlob ? Buffer.from(audioBlob, 'base64').toString('utf8') : '';
  assert(/^music = 0\.35$/m.test(audioText), 'music volume persists, got: ' + JSON.stringify(audioText.split('\n').filter((l) => l.startsWith('music'))));
  assert(/^sfx = 0\.45$/m.test(audioText), 'SFX volume persists, got: ' + JSON.stringify(audioText.split('\n').filter((l) => l.startsWith('sfx'))));
  // An unmapped key (F1) during rebind capture must cancel the Rust capture
  // too, or the next key (M) is swallowed by the stale capture (round 29).
  await evalJs(ws, `document.querySelectorAll('#rebind-list button')[4].click()`);
  const armedPauseLabel = await evalJs(ws, `document.querySelectorAll('#rebind-list button')[4].textContent`);
  assert(armedPauseLabel.includes('press a key'),
    'the Pause row is armed before the unmapped-key check, got: ' + armedPauseLabel);
  await tapKey('F1', 'F1', 112);
  const cancelledPauseLabel = await evalJs(ws, `document.querySelectorAll('#rebind-list button')[4].textContent`);
  assert(cancelledPauseLabel.includes('Pause: P'),
    'an unmapped key cancels the rebind capture, got: ' + cancelledPauseLabel);
  await tapKey('KeyM', 'm', 77);
  await sleep(500);
  const muteAfterUnmapped = await evalJs(ws, `document.getElementById('btn-mute').textContent`);
  assert(muteAfterUnmapped === 'Unmute',
    'the key after an unmapped rebind key still toggles mute, got: ' + muteAfterUnmapped);
  await tapKey('KeyM', 'm', 77);
  await sleep(500);
  const muteRestoredAfterUnmapped = await evalJs(ws, `document.getElementById('btn-mute').textContent`);
  assert(muteRestoredAfterUnmapped === 'Mute',
    'M restores the unmuted state after the unmapped-key check, got: ' + muteRestoredAfterUnmapped);
  // Round 30: an armed capture cannot survive leaving Settings. Back out,
  // Start, and hold ArrowUp: the movement key must reach the engine and the
  // Pause binding must stay P (no bind_pause = Up in the blob).
  await evalJs(ws, `document.querySelectorAll('#rebind-list button')[4].click()`);
  const armedBeforeLeave = await evalJs(ws, `document.querySelectorAll('#rebind-list button')[4].textContent`);
  assert(armedBeforeLeave.includes('press a key'),
    'the Pause row is armed before leaving Settings, got: ' + armedBeforeLeave);
  await evalJs(ws, `document.getElementById('btn-settings-back').click()`);
  await sleep(300);
  await evalJs(ws, `document.getElementById('btn-start').click()`);
  await sleep(500);
  const scoreBeforeLeave = await evalJs(ws, `document.getElementById('hud-score').textContent`);
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code: 'ArrowUp', key: 'ArrowUp' });
  await sleep(1500);
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code: 'ArrowUp', key: 'ArrowUp' });
  await sleep(200);
  const scoreAfterLeave = await evalJs(ws, `document.getElementById('hud-score').textContent`);
  assert(Number(scoreAfterLeave) > Number(scoreBeforeLeave),
    'the movement key reaches the engine after leaving Settings, got: ' + scoreBeforeLeave + ' -> ' + scoreAfterLeave);
  const pauseAfterLeave = await evalJs(ws, `window.__mazeExports.mc_binding(4) >>> 0`);
  assert(pauseAfterLeave === 12,
    'leaving Settings cancels the armed capture (Pause stays P), got key id ' + pauseAfterLeave);
  const leaveBlob = await evalJs(ws, `localStorage.getItem('maze-chase-settings')`);
  const leaveBlobText = leaveBlob ? Buffer.from(leaveBlob, 'base64').toString('utf8') : '';
  assert(!/^bind_pause = Up$/m.test(leaveBlobText),
    'the abandoned capture never persists bind_pause = Up');
  await tapKey('KeyP', 'p', 80);
  await sleep(300);
  assert((await evalJs(ws, `!document.getElementById('panel-pause').hidden`)) === true,
    'P pauses after the leave-Settings movement check');
  await evalJs(ws, `document.getElementById('btn-pause-quit').click()`);
  await sleep(300);
  await evalJs(ws, `document.getElementById('btn-title-settings').click()`);
  await sleep(300);
  // Escape cancels a capture even when a form control has focus, and the
  // next key is not consumed by a stale capture.
  await evalJs(ws, `document.querySelectorAll('#rebind-list button')[4].click()`);
  await evalJs(ws, `document.getElementById('rng-master').focus()`);
  await tapKey('Escape', 'Escape', 27);
  const escFromFieldLabel = await evalJs(ws, `document.querySelectorAll('#rebind-list button')[4].textContent`);
  assert(escFromFieldLabel.includes('Pause: P'),
    'Escape cancels the capture from a focused form control, got: ' + escFromFieldLabel);
  await evalJs(ws, `document.getElementById('rng-master').blur()`);
  const muteBeforeEscField = await evalJs(ws, `document.getElementById('btn-mute').textContent`);
  await tapKey('KeyM', 'm', 77);
  await sleep(500);
  const muteAfterEscField = await evalJs(ws, `document.getElementById('btn-mute').textContent`);
  assert(muteAfterEscField !== muteBeforeEscField,
    'the key after an Escape-from-field cancel is not consumed, got: ' + muteBeforeEscField + ' -> ' + muteAfterEscField);
  await tapKey('KeyM', 'm', 77);
  await sleep(500);
  // A touch pad press cancels an armed capture instead of completing the
  // Rust-side rebind behind the prompt's back.
  await evalJs(ws, `document.body.classList.add('pad-force')`);
  await evalJs(ws, `document.querySelectorAll('#rebind-list button')[4].click()`);
  await evalJs(ws, `document.getElementById('pad-down').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))`);
  await sleep(150);
  const padBinding = await evalJs(ws, `window.__mazeExports.mc_binding(4) >>> 0`);
  assert(padBinding === 12, 'a pad press leaves the Pause binding at P, got key id ' + padBinding);
  const padLabel = await evalJs(ws, `document.querySelectorAll('#rebind-list button')[4].textContent`);
  assert(padLabel.includes('Pause: P'), 'a pad press clears the capture prompt, got: ' + padLabel);
  const muteBeforePad = await evalJs(ws, `document.getElementById('btn-mute').textContent`);
  await tapKey('KeyM', 'm', 77);
  await sleep(500);
  const muteAfterPad = await evalJs(ws, `document.getElementById('btn-mute').textContent`);
  assert(muteAfterPad !== muteBeforePad,
    'no capture remains after a pad press, got: ' + muteBeforePad + ' -> ' + muteAfterPad);
  await tapKey('KeyM', 'm', 77);
  await sleep(500);
  await evalJs(ws, `document.body.classList.remove('pad-force')`);
  // Arming a second row resets the previous row's prompt.
  await evalJs(ws, `document.querySelectorAll('#rebind-list button')[4].click()`);
  await evalJs(ws, `document.querySelectorAll('#rebind-list button')[6].click()`);
  const promptRows = await evalJs(ws, `(() => {
    const rows = Array.from(document.querySelectorAll('#rebind-list button'));
    return [rows.filter((b) => b.textContent.includes('press a key')).length,
      rows[4].textContent, rows[6].textContent];
  })()`);
  assert(promptRows[0] === 1 && promptRows[1].includes('Pause: P') && promptRows[2].includes('press a key'),
    'only the newest armed row carries the capture prompt, got: ' + JSON.stringify(promptRows));
  await tapKey('Escape', 'Escape', 27);
  // Rebind Pause to ArrowUp through the real rebind control.
  await evalJs(ws, `document.querySelectorAll('#rebind-list button')[4].click()`);
  await tapKey('ArrowUp', 'ArrowUp', 38);
  const pauseBinding = await evalJs(ws, `document.querySelectorAll('#rebind-list button')[4].textContent`);
  assert(pauseBinding.includes('ArrowUp'), 'the rebind control captures ArrowUp for Pause, got: ' + pauseBinding);
  const pauseBlob = await evalJs(ws, `localStorage.getItem('maze-chase-settings')`);
  const pauseBlobText = pauseBlob ? Buffer.from(pauseBlob, 'base64').toString('utf8') : '';
  assert(/^bind_pause = Up$/m.test(pauseBlobText),
    'the rebind capture persists the Pause binding in the settings blob, got: ' + JSON.stringify(pauseBlobText.split('\n').filter((l) => l.startsWith('bind_pause'))));
  await send(ws, 'Page.navigate', { url: PAGE });
  await sleep(2500);
  await evalJs(ws, `document.getElementById('btn-title-settings').click()`);
  await sleep(300);
  const pauseBindingReloaded = await evalJs(ws, `document.querySelectorAll('#rebind-list button')[4].textContent`);
  assert(pauseBindingReloaded.includes('ArrowUp'),
    'the Pause binding survives a reload, got: ' + pauseBindingReloaded);
  await evalJs(ws, `document.getElementById('btn-settings-back').click()`);
  await sleep(250);
  // On the pause hub, the rebound Pause key must only move focus.
  await evalJs(ws, `document.getElementById('btn-start').click()`);
  await sleep(500);
  await evalJs(ws, `document.getElementById('btn-pause').click()`);
  await sleep(300);
  const pauseBefore = await evalJs(ws, `[!document.getElementById('panel-pause').hidden, document.activeElement && document.activeElement.id]`);
  await tapKey('ArrowUp', 'ArrowUp', 38);
  const pauseAfter = await evalJs(ws, `[!document.getElementById('panel-pause').hidden, document.activeElement && document.activeElement.id]`);
  assert(pauseBefore[0] === true, 'the pause hub is open before the rebound-arrow check');
  assert(pauseAfter[0] === true, 'a rebound Pause on ArrowUp never fires from menu focus movement');
  assert(pauseAfter[1] !== pauseBefore[1],
    'ArrowUp still moves focus on the pause hub, got: ' + pauseBefore[1] + ' -> ' + pauseAfter[1]);
  await evalJs(ws, `document.getElementById('btn-resume').click()`);
  await sleep(300);
  // Rebind Back off Escape (to Space, freeing Escape) while Pause keeps
  // ArrowUp, then prove the documented P shortcut still backs out.
  await evalJs(ws, `document.getElementById('btn-pause').click()`);
  await sleep(250);
  await evalJs(ws, `document.getElementById('btn-pause-quit').click()`);
  await sleep(300);
  await evalJs(ws, `document.getElementById('btn-title-settings').click()`);
  await sleep(300);
  await evalJs(ws, `document.querySelectorAll('#rebind-list button')[6].click()`);
  await tapKey('Space', ' ', 32);
  const backBinding = await evalJs(ws, `document.querySelectorAll('#rebind-list button')[6].textContent`);
  assert(backBinding.includes('Space'), 'the rebind control moves Back off Escape to Space, got: ' + backBinding);
  await evalJs(ws, `document.getElementById('btn-settings-back').click()`);
  await sleep(250);
  await evalJs(ws, `document.getElementById('btn-title-help').click()`);
  await sleep(250);
  assert((await evalJs(ws, `!document.getElementById('panel-help').hidden`)) === true,
    'Help opens before the P/Back check');
  await tapKey('KeyP', 'p', 80);
  assert((await evalJs(ws, `document.getElementById('panel-help').hidden`)) === true,
    'P dispatches the Back action even when Escape is no longer bound to Back');
  // WASD twins move focus without firing their (movement) actions.
  await evalJs(ws, `document.getElementById('btn-start').focus()`);
  await tapKey('KeyS', 's', 83);
  const wasdFocus = await evalJs(ws, `document.activeElement && document.activeElement.id`);
  assert(wasdFocus === 'btn-title-help',
    'S moves focus from Start to the next title action like ArrowDown, got: ' + wasdFocus);
  // The persisted keymap (Pause on ArrowUp, Back on Space) restores on
  // reload; M must also write the settings blob and the mute must survive
  // the next reload.
  await send(ws, 'Page.navigate', { url: PAGE });
  await sleep(2500);
  await tapKey('KeyM', 'm', 77);
  await sleep(700);
  const muteBlob = await evalJs(ws, `localStorage.getItem('maze-chase-settings')`);
  const muteBlobText = muteBlob ? Buffer.from(muteBlob, 'base64').toString('utf8') : '';
  assert(/^mute = true$/m.test(muteBlobText),
    'M persists the mute in the settings blob, got: ' + JSON.stringify(muteBlobText.split('\n').filter((l) => l.startsWith('mute'))));
  await send(ws, 'Page.navigate', { url: PAGE });
  await sleep(2500);
  const muteReloaded = await evalJs(ws, `document.getElementById('btn-mute').textContent`);
  assert(muteReloaded === 'Unmute', 'keyboard mute survives a reload, got: ' + muteReloaded);
  await tapKey('KeyM', 'm', 77);
  await sleep(700);
  const muteOff = await evalJs(ws, `document.getElementById('btn-mute').textContent`);
  assert(muteOff === 'Mute', 'M restores the unmuted state, got: ' + muteOff);

  // The fright route drives raw key id 1 (ArrowUp); clear the persisted
  // keymap (Pause on ArrowUp) and reboot so the route's movement keys are
  // not consumed by the rebind.
  await evalJs(ws, `localStorage.removeItem('maze-chase-settings')`);
  await send(ws, 'Page.navigate', { url: PAGE });
  await sleep(2500);

  // Fright HUD: the badge announces the active window for its whole
  // duration; the 30-segment meter joins only for the final 1.5 s tail.
  // Drive the same deterministic route the node harness uses.
  const fid = { up: 1, down: 2, left: 3, right: 4 };
  const fkey = async (id, ms) => {
    await evalJs(ws, `window.__mazeExports.mc_key(${id}, 1)`);
    await sleep(ms);
    await evalJs(ws, `window.__mazeExports.mc_key(${id}, 0)`);
    await sleep(50);
  };
  const hasExports = await evalJs(ws, `!!window.__mazeExports`);
  assert(hasExports === true, 'page wasm exports captured for the fright HUD drive');
  if (hasExports) {
    await evalJs(ws, `window.__mazeExports.mc_reset(12345, 0, 1, 0)`);
    await sleep(200);
    await evalJs(ws, `window.__mazeExports.mc_press(4)`);
    await sleep(300);
    for (const [dir, ms] of [['right', 200], ['down', 1200], ['left', 2000], ['up', 600], ['right', 200]]) {
      await fkey(fid[dir], ms);
    }
    // The HUD refreshes at 4 Hz; allow a tick to publish the fright that
    // started during the route before sampling the panel.
    await sleep(500);
    const early = await evalJs(ws, `(() => {
      const e = window.__mazeExports;
      return {
        active: e.mc_fright_active() >>> 0,
        flash: e.mc_fright_flash() >>> 0,
        segs: e.mc_fright_segments() >>> 0,
        hidden: document.getElementById('fright-meter').hidden,
        segsVisible: document.getElementById('fright-segs').getClientRects().length > 0,
        text: document.getElementById('hud-fright').textContent,
      };
    })()`);
    console.log('fright early:', JSON.stringify(early));
    assert(early.active === 1 && early.flash === 0 && early.segs === 0,
      'deterministic route reaches the early fright window');
    assert(early.hidden === false, 'fright badge is visible for the whole active window, not only its final tail');
    assert(early.segsVisible === false, 'the 30-segment meter stays out of the early fright window');
    assert(/FRIGHT/.test(early.text), 'active fright badge names the fright, got: ' + early.text);
    await sleep(3700);
    const late = await evalJs(ws, `(() => {
      const e = window.__mazeExports;
      return {
        active: e.mc_fright_active() >>> 0,
        segs: e.mc_fright_segments() >>> 0,
        hidden: document.getElementById('fright-meter').hidden,
        segsVisible: document.getElementById('fright-segs').getClientRects().length > 0,
        text: document.getElementById('hud-fright').textContent,
      };
    })()`);
    console.log('fright tail:', JSON.stringify(late));
    assert(late.active === 1 && late.segs >= 1 && late.segs <= 30,
      'countdown reaches the final tail inside 1..30, got ' + late.segs);
    assert(late.hidden === false, 'fright meter stays visible while the tail drains');
    assert(late.segsVisible === true, 'the 30-segment meter joins for the final tail');
    assert(/FRIGHT ENDING|THE TURN ENDS/.test(late.text),
      'tail badge names the ending, got: ' + late.text);
  }

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
  const pauseA11y = await evalJs(ws, `(() => {
    const p = document.getElementById('panel-pause');
    const b = document.getElementById('btn-mute');
    const r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return [p.getAttribute('aria-modal'), b.hidden ? 0 : 1,
      r.top >= 0 && r.bottom <= innerHeight ? 1 : 0,
      (hit === b || b.contains(hit)) ? 1 : 0, b.textContent];
  })()`);
  console.log('pause a11y/header reach:', JSON.stringify(pauseA11y));
  assert(pauseA11y[0] === null, 'pause dialog does not claim aria-modal while header controls stay reachable');
  assert(pauseA11y[1] === 1 && pauseA11y[2] === 1 && pauseA11y[3] === 1,
    'header mute control stays visible and hit-testable while paused');
  await evalJs(ws, `document.getElementById('btn-mute').click()`);
  await sleep(150);
  const muteText = await evalJs(ws, `document.getElementById('btn-mute').textContent`);
  assert(muteText !== pauseA11y[4], 'header mute stays functional while paused');
  await evalJs(ws, `document.getElementById('btn-mute').click()`);
  const resumePt = await evalJs(ws, `(() => { const r = document.getElementById('btn-resume').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: resumePt[0], y: resumePt[1], button: 'left', clickCount: 1 });
  await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: resumePt[0], y: resumePt[1], button: 'left', clickCount: 1 });
  await sleep(300);
  assert((await evalJs(ws, `document.getElementById('panel-pause').hidden`)) === true, 'mobile Resume returns to play');
  await shot(ws, `${SHOT_DIR}/mc-e2e-mobile.png`);

  // Short landscape phones: the pause card keeps its heading and every
  // action inside both the card and the viewport, with Resume hit-testable.
  for (const [vw, vh] of [[480, 320], [320, 360], [568, 320]]) {
    await send(ws, 'Emulation.setDeviceMetricsOverride', { width: vw, height: vh, deviceScaleFactor: 2, mobile: true });
    await sleep(350);
    await evalJs(ws, `document.getElementById('btn-pause').click()`);
    await sleep(300);
    const landscapePause = await evalJs(ws, `(() => {
      const p = document.getElementById('panel-pause');
      const h = p.querySelector('h2');
      const b = document.getElementById('btn-resume');
      const r = p.getBoundingClientRect(), br = b.getBoundingClientRect();
      const hr = h.getBoundingClientRect();
      const hit = document.elementFromPoint(br.x + br.width / 2, br.y + br.height / 2);
      const hhit = document.elementFromPoint(hr.x + hr.width / 2, hr.y + hr.height / 2);
      const buttons = Array.from(p.querySelectorAll('.pause-actions button'));
      const buttonsFit = buttons.length > 0 && buttons.every((btn) => {
        const q = btn.getBoundingClientRect();
        return q.top >= r.top && q.bottom <= r.bottom &&
          q.left >= r.left && q.right <= r.right &&
          q.top >= 0 && q.left >= 0 && q.right <= innerWidth && q.bottom <= innerHeight;
      });
      return [p.hidden ? 0 : 1, br.top, br.bottom, r.top, r.bottom, innerHeight,
        br.top >= 0 && br.left >= 0 && br.right <= innerWidth && br.bottom <= innerHeight ? 1 : 0,
        (hit === b || b.contains(hit)) ? 1 : 0,
        (hhit === h || h.contains(hhit)) ? 1 : 0,
        buttonsFit ? 1 : 0, innerWidth];
    })()`);
    console.log(`short landscape pause ${vw}x${vh}:`, JSON.stringify(landscapePause));
    assert(landscapePause[0] === 1, `pause dialog opens at ${vw}x${vh}`);
    assert(landscapePause[6] === 1,
      `pause Resume is fully inside ${vw}x${vh} (${landscapePause[1]}..${landscapePause[2]} in card ${landscapePause[3]}..${landscapePause[4]} of ${landscapePause[5]})`);
    assert(landscapePause[7] === 1, `pause Resume is hit-testable at ${vw}x${vh}`);
    assert(landscapePause[8] === 1, `pause heading itself is hit-testable at ${vw}x${vh}`);
    assert(landscapePause[9] === 1, `every pause action is inside the card and ${vw}x${vh}`);
    await evalJs(ws, `document.getElementById('btn-resume').click()`);
    await sleep(300);
    assert((await evalJs(ws, `document.getElementById('panel-pause').hidden`)) === true,
      `pause Resume returns to play at ${vw}x${vh}`);
  }
  await send(ws, 'Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(300);

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
  // truth), the cycle button repaints the title board, and the choice
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
  assert((await themeLabel()) === 'Moonwake (high contrast)',
    'high contrast labels the effective Moonwake theme');
  const hcHash = await canvasHash();
  await evalJs(ws, `(() => {
    const c = document.getElementById('chk-contrast');
    c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sleep(400);
  assert((await themeLabel()) === 'Dusk Pond (1/3)',
    'clearing high contrast restores the stored Dusk Pond theme');
  const duskMotionHash = await canvasHash();
  assert(hcHash !== duskMotionHash,
    'high contrast really repaints the canvas to the Moonwake theme');
  await evalJs(ws, `document.getElementById('btn-theme').click()`);
  await sleep(300);
  await evalJs(ws, `document.getElementById('btn-theme').click()`);
  await sleep(400);
  assert((await themeLabel()) === 'Moonwake (3/3)',
    'the manual cycle reaches Moonwake with reduced motion still on');
  const moonMotionHash = await canvasHash();
  assert(hcHash === moonMotionHash,
    'high contrast renders the effective Moonwake theme, not just a label');
  await evalJs(ws, `document.getElementById('btn-theme').click()`);
  await sleep(300);
  await evalJs(ws, `(() => {
    const c = document.getElementById('chk-contrast');
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
  assert((await themeLabel()) === 'Dusk Pond (1/3)',
    'clearing high contrast restores the stored theme label');

  // Every screen panel is a viewport overlay with a pinned action row:
  // Help, Scores, and Settings must open fully on-screen with their primary
  // control hit-testable at both the mobile and desktop viewports. Game over
  // is measured synchronously (the render loop would hide a non-current
  // screen) so its footer geometry is covered without faking a run.
  async function panelGeometry(id, primaryId) {
    return evalJs(ws, `(() => {
      const p = document.getElementById(${JSON.stringify(id)});
      const a = p.querySelector('.panel-actions');
      const b = document.getElementById(${JSON.stringify(primaryId)});
      const r = p.getBoundingClientRect(), ar = a ? a.getBoundingClientRect() : r;
      const br = b.getBoundingClientRect();
      const hb = document.querySelector('header').getBoundingClientRect();
      const hit = document.elementFromPoint(br.x + br.width / 2, br.y + br.height / 2);
      return [r.top, r.bottom, ar.bottom, br.bottom, innerHeight, innerWidth,
        r.left, r.right, br.top, br.left, br.right,
        (hit === b || b.contains(hit)) ? 1 : 0,
        r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight ? 1 : 0,
        ar.bottom <= innerHeight ? 1 : 0,
        !!p.querySelector('.panel-scroll') ? 1 : 0, hb.bottom];
    })()`);
  }
  for (const [vw, vh] of [[1440, 900], [390, 844]]) {
    await send(ws, 'Emulation.setDeviceMetricsOverride', { width: vw, height: vh, deviceScaleFactor: 2, mobile: vw < 700 });
    await sleep(400);
    for (const [btn, panel, primary, label] of [
      ['btn-title-help', 'panel-help', 'btn-help-back', 'Help'],
      ['btn-title-scores', 'panel-scores', 'btn-scores-back', 'Scores'],
      ['btn-title-settings', 'panel-settings', 'btn-settings-back', 'Settings'],
    ]) {
      await evalJs(ws, `window.__mazeExports.mc_press(1)`);
      await sleep(150);
      await evalJs(ws, `document.getElementById(${JSON.stringify(btn)}).click()`);
      await sleep(250);
      const g = await panelGeometry(panel, primary);
      console.log(`${label} panel ${vw}x${vh}:`, JSON.stringify(g));
      assert(g[12] === 1, `${label} panel is fully inside ${vw}x${vh} (${g[0]}..${g[1]} of ${g[4]})`);
      assert(g[13] === 1 && g[3] <= g[4], `${label} action row is pinned on-screen at ${vw}x${vh}`);
      assert(g[11] === 1, `${label} primary action is hit-testable at ${vw}x${vh}`);
      assert(g[14] === 1, `${label} body is a scroll region at ${vw}x${vh}`);
      assert(g[0] >= g[15] + 8, `${label} panel clears the sticky header at ${vw}x${vh} (header ${g[15]}, panel ${g[0]})`);
    }
    // Game over: the rAF loop would immediately re-hide it, so flip the
    // attribute, measure, and restore in one synchronous evaluation.
    const over = await evalJs(ws, `(() => {
      const p = document.getElementById('panel-over');
      const was = p.hidden;
      p.hidden = false;
      const a = p.querySelector('.panel-actions');
      const b = document.getElementById('btn-over-restart');
      const r = p.getBoundingClientRect(), ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
      const hb = document.querySelector('header').getBoundingClientRect();
      const hit = document.elementFromPoint(br.x + br.width / 2, br.y + br.height / 2);
      p.hidden = was;
      return [r.top, r.bottom, ar.bottom, br.bottom, innerHeight, innerWidth,
        r.left, r.right, (hit === b || b.contains(hit)) ? 1 : 0,
        r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight ? 1 : 0,
        ar.bottom <= innerHeight ? 1 : 0, !!p.querySelector('.panel-scroll') ? 1 : 0, hb.bottom];
    })()`);
    console.log(`Game over panel ${vw}x${vh}:`, JSON.stringify(over));
    assert(over[9] === 1, `Game over panel is fully inside ${vw}x${vh} (${over[0]}..${over[1]} of ${over[4]})`);
    assert(over[10] === 1 && over[3] <= over[4], `Game over action row is pinned on-screen at ${vw}x${vh}`);
    assert(over[8] === 1, `Game over primary action is hit-testable at ${vw}x${vh}`);
    assert(over[11] === 1, `Game over body is a scroll region at ${vw}x${vh}`);
    assert(over[0] >= over[12] + 8, `Game over panel clears the sticky header at ${vw}x${vh} (header ${over[12]}, panel ${over[0]})`);
  }
  await send(ws, 'Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(400);
  const mobileHud = await evalJs(ws, `(() => {
    const h = document.getElementById('hud');
    const d = document.getElementById('hud-dots-bar');
    const f = document.getElementById('hud-fps');
    const dl = h.querySelector('dl');
    const meter = document.getElementById('fright-meter');
    const relish = document.getElementById('hud-relish');
    const segs = document.getElementById('fright-segs');
    const wasMeter = meter.hidden, wasRelish = relish.hidden, segsHtml = segs.innerHTML;
    meter.hidden = false;
    relish.hidden = false;
    if (!segs.children.length) {
      segs.innerHTML = Array.from({ length: 30 }, () => '<span class="on"></span>').join('');
    }
    const r = h.getBoundingClientRect(), dr = d.getBoundingClientRect();
    const tracks = getComputedStyle(dl).gridTemplateColumns.split(' ').filter(Boolean).length;
    meter.hidden = wasMeter;
    relish.hidden = wasRelish;
    segs.innerHTML = segsHtml;
    return [r.top, r.bottom, innerHeight, dr.width, f.hidden ? 0 : 1,
      getComputedStyle(f).display, (window.__mazeExports.mc_dots_total() >>> 0),
      (window.__mazeExports.mc_show_fps() >>> 0), tracks];
  })()`);
  console.log('mobile HUD geometry:', JSON.stringify(mobileHud));
  assert(mobileHud[1] <= mobileHud[2], `mobile HUD fits above the fold (${mobileHud[1]} <= ${mobileHud[2]})`);
  assert(mobileHud[8] === 4, `mobile HUD uses the four-column layout (got ${mobileHud[8]} tracks)`);
  assert(mobileHud[3] > 100, 'dots completion bar has real width on mobile');
  assert(mobileHud[4] === 0 && mobileHud[5] === 'none', 'frame diagnostics are hidden by default');
  assert(mobileHud[6] === 449, 'pickups total reports the full 445 crumbs plus 4 sunseeds');
  assert(mobileHud[7] === 0, 'frame-diagnostics setting starts off');
  await evalJs(ws, `(() => {
    const f = document.getElementById('chk-fps');
    f.checked = true; f.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sleep(400);
  const fpsOn = await evalJs(ws, `(() => {
    const f = document.getElementById('hud-fps');
    return [f.hidden ? 0 : 1, getComputedStyle(f).display,
      (window.__mazeExports.mc_show_fps() >>> 0)];
  })()`);
  assert(fpsOn[0] === 1 && fpsOn[1] !== 'none' && fpsOn[2] === 1,
    'Settings frame diagnostics reveal the FPS row');
  await evalJs(ws, `(() => {
    const f = document.getElementById('chk-fps');
    f.checked = false; f.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sleep(400);
  assert((await evalJs(ws, `document.getElementById('hud-fps').hidden`)) === true,
    'frame diagnostics hide again when switched off');
  await send(ws, 'Emulation.clearDeviceMetricsOverride');
  await sleep(400);

  const realErrors = errors.filter((e) => !/AudioContext|audio|user gesture/i.test(e));
  console.log('console/log errors:', realErrors.length ? realErrors : '(none)');
  assert(realErrors.length === 0, 'zero console errors');
  ws.close();
  console.log(process.exitCode ? 'E2E: FAILURES PRESENT' : 'E2E: ALL GREEN');
})();
