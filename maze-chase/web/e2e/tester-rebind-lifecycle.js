// Tester regression: the rebind capture lifecycle around Settings form
// controls, at the shipped page and wasm.
//
// Round 30 split the capture contract in two: Escape always cancels an
// armed capture (even from a focused form control), while every other key
// pressed inside a field belongs to the field and must leave the capture
// armed. This script pins both halves through real CDP input and checks the
// Rust-side binding through the exported session and the visible labels.
//
// Usage: node web/e2e/tester-rebind-lifecycle.js [page-url] [debug-port]
//   page-url defaults to http://localhost:8931/index.html
//   (serve maze-chase/ first: `python3 -m http.server 8931` inside it)
//   debug-port defaults to 9331: launch chromium first with
//   `--headless=new --remote-debugging-port=9331 --window-size=1280,900 <page-url>`
const DEBUG_PORT = Number(process.argv[3] || 9331);
const PAGE = process.argv[2] || 'http://localhost:8931/index.html';

if (typeof WebSocket === 'undefined') {
  console.error('REBIND-LIFECYCLE FAIL: global WebSocket not found; run with Node 22+.');
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
      }
    });
  });
}
async function evalJs(ws, expr) {
  const r = await send(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true });
  if (r.exceptionDetails) throw new Error('eval threw: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result.value;
}
const tapKey = async (ws, code, key, vk) => {
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', code, key, windowsVirtualKeyCode: vk });
  await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', code, key, windowsVirtualKeyCode: vk });
  await sleep(220);
};

(async () => {
  const listRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`).then((r) => r.json());
  const page = listRes.find((t) => t.url.includes('index.html')) || listRes.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target; got: ' + JSON.stringify(listRes.map((t) => t.url)));
  const ws = await connect(page.webSocketDebuggerUrl);
  await send(ws, 'Runtime.enable', {});
  await send(ws, 'Page.enable', {});
  // Capture the page's own wasm exports so the Rust-side binding can be
  // read directly, exactly like browser-e2e.js does.
  await send(ws, 'Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      const wrap = (r) => { try { window.__mazeExports = r.instance ? r.instance.exports : r.exports; } catch (e) {} return r; };
      const streaming = WebAssembly.instantiateStreaming;
      if (streaming) WebAssembly.instantiateStreaming = function () { return streaming.apply(this, arguments).then(wrap); };
      const instantiate = WebAssembly.instantiate;
      WebAssembly.instantiate = function () { return instantiate.apply(this, arguments).then(wrap); };
    })();`,
  });
  const assert = (c, m) => {
    if (!c) { console.error('FAIL:', m); process.exitCode = 1; }
    else console.log('ok:', m);
  };

  await send(ws, 'Page.navigate', { url: PAGE });
  await sleep(1200);
  await evalJs(ws, `localStorage.removeItem('maze-chase-settings')`);
  await send(ws, 'Page.navigate', { url: PAGE });
  await sleep(2500);
  assert((await evalJs(ws, `document.getElementById('boot-status').textContent`)) === 'Ready.',
    'engine boots before the rebind lifecycle checks');
  await evalJs(ws, `document.getElementById('btn-title-settings').click()`);
  await sleep(350);
  const pauseRow = `document.querySelectorAll('#rebind-list button')[4]`;
  assert((await evalJs(ws, `${pauseRow}.textContent`)).includes('Pause: P'),
    'the Pause row starts on its default binding');

  // Escape cancels even from a form control: the checkbox must not capture.
  await evalJs(ws, `${pauseRow}.click()`);
  await evalJs(ws, `document.getElementById('chk-motion').focus()`);
  const beforeEscape = await evalJs(ws, `document.getElementById('chk-motion').checked`);
  await tapKey(ws, 'Escape', 'Escape', 27);
  assert((await evalJs(ws, `${pauseRow}.textContent`)).includes('Pause: P'),
    'Escape from a focused checkbox cancels the armed capture');
  assert((await evalJs(ws, `document.getElementById('chk-motion').checked`)) === beforeEscape,
    'the Escape cancel does not disturb the focused checkbox state');

  // Every other key belongs to the field and leaves the capture armed.
  await evalJs(ws, `${pauseRow}.click()`);
  await evalJs(ws, `document.getElementById('rng-master').focus()`);
  const sliderBefore = Number(await evalJs(ws, `document.getElementById('rng-master').value`));
  await tapKey(ws, 'ArrowRight', 'ArrowRight', 39);
  const sliderAfter = Number(await evalJs(ws, `document.getElementById('rng-master').value`));
  assert(sliderAfter > sliderBefore,
    `a focused slider still handles a non-Escape key, got ${sliderBefore} -> ${sliderAfter}`);
  assert((await evalJs(ws, `${pauseRow}.textContent`)).includes('press a key'),
    'a field key leaves the rebind capture armed');
  assert((await evalJs(ws, `window.__mazeExports.mc_binding(4) >>> 0`)) === 12,
    'the armed capture never lets a field key steal the Pause binding');

  // The next key outside the field completes the still-armed capture.
  await evalJs(ws, `document.getElementById('rng-master').blur()`);
  await tapKey(ws, 'ArrowUp', 'ArrowUp', 38);
  assert((await evalJs(ws, `${pauseRow}.textContent`)).includes('Pause: ArrowUp'),
    'the armed capture completes on the next key outside the field');
  assert((await evalJs(ws, `window.__mazeExports.mc_binding(4) >>> 0`)) === 1,
    'the completed capture binds Pause to the new key in the live session');

  // The completed binding survives a reload, matching the visible label.
  await send(ws, 'Page.navigate', { url: PAGE });
  await sleep(2500);
  await evalJs(ws, `document.getElementById('btn-title-settings').click()`);
  await sleep(350);
  const reloaded = await evalJs(ws, `${pauseRow}.textContent`);
  assert(reloaded.includes('Pause: ArrowUp'),
    'the completed field-split binding survives a reload, got: ' + reloaded);

  await evalJs(ws, `localStorage.removeItem('maze-chase-settings')`);
  await send(ws, 'Page.navigate', { url: PAGE });
  await sleep(1200);
  ws.close();
  console.log(process.exitCode ? 'REBIND LIFECYCLE: FAILURES PRESENT' : 'REBIND LIFECYCLE: ALL GREEN');
})();
