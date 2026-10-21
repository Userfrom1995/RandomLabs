// Boot-gate E2E: serve a fake stale wasm to the real page and prove the
// harness rejects it on the error card instead of reaching Ready.
//
// Usage: node web/e2e/boot-gate-e2e.js [page-url] [debug-port]
//   page-url defaults to http://localhost:8931/play.html
//   (serve maze-chase/ first: `python3 -m http.server 8931` inside it)
//   debug-port defaults to 9331: launch chromium first with
//   `--headless=new --remote-debugging-port=9331 --window-size=1280,900 <page-url>`
const DEBUG_PORT = Number(process.argv[3] || 9331);
const PAGE = process.argv[2] || 'http://localhost:8931/play.html';

if (typeof WebSocket === 'undefined') {
  console.error('BOOT-GATE-E2E FAIL: global WebSocket not found; run with Node 22+.');
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

// Hand-assembled zero-import module: `mc_version` returns `version`, every
// other required name returns 0, and one exported memory. `opts.omit` drops
// one export so a boot-gate case can prove that group is required;
// `opts.withFright === false` drops mc_fright_segments for the stale module.
const NAMES = [
  'mc_version', 'mc_reset', 'mc_step', 'mc_frame', 'mc_frame_len',
  'mc_key', 'mc_swipe', 'mc_press', 'mc_goto', 'mc_rebind', 'mc_binding',
  'mc_screen', 'mc_scratch', 'mc_scratch_len', 'mc_theme_name',
  'mc_fright_segments', 'mc_fright_flash', 'mc_reduced_flash',
  'mc_reduced_motion', 'mc_high_contrast', 'mc_theme', 'mc_theme_count',
  'mc_difficulty', 'mc_dots_total', 'mc_show_fps',
];

function staleWasmB64(version, opts) {
  opts = opts || {};
  const leb = (n) => {
    const out = [];
    do {
      let b = n & 0x7f;
      n >>>= 7;
      if (n) b |= 0x80;
      out.push(b);
    } while (n);
    return out;
  };
  const name = (s) => [Buffer.byteLength(s), ...Buffer.from(s, 'utf8')];
  const names = NAMES.filter((n) => n !== opts.omit);
  if (opts.withFright === false) {
    const at = names.indexOf('mc_fright_segments');
    if (at >= 0) names.splice(at, 1);
  }
  const type = [1, 0x60, 0, 1, 0x7f];
  const funcs = [2, 0, 0];
  const mem = [1, 0, 1];
  const exports = [names.length + 1];
  names.forEach((n, i) => exports.push(...name(n), 0, i === 0 ? 1 : 0));
  exports.push(...name('memory'), 2, 0);
  const code = [2, 4, 0, 0x41, 0, 0x0b, 4, 0, 0x41, version, 0x0b];
  const sec = (id, payload) => [id, ...leb(payload.length), ...payload];
  const bytes = Uint8Array.from([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    ...sec(1, type), ...sec(3, funcs), ...sec(5, mem),
    ...sec(7, exports), ...sec(10, code),
  ]);
  return Buffer.from(bytes).toString('base64');
}

const staleV1NoFright = staleWasmB64(1, { withFright: false });
const staleV1WithFright = staleWasmB64(1, {});
const staleV2NoHudFlash = staleWasmB64(2, { omit: 'mc_fright_flash' });
const staleV2NoReducedFlash = staleWasmB64(2, { omit: 'mc_reduced_flash' });
const staleV2NoTheme = staleWasmB64(2, { omit: 'mc_theme' });
const staleV2NoDifficulty = staleWasmB64(2, { omit: 'mc_difficulty' });
const staleV2NoDotsTotal = staleWasmB64(2, { omit: 'mc_dots_total' });
const staleV2NoShowFps = staleWasmB64(2, { omit: 'mc_show_fps' });

(async () => {
  const listRes = await fetch(`http://localhost:${DEBUG_PORT}/json/list`).then((r) => r.json());
  const page = listRes.find((t) => t.url.includes('play.html')) || listRes.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target; got: ' + JSON.stringify(listRes.map((t) => t.url)));
  const ws = await connect(page.webSocketDebuggerUrl);
  await send(ws, 'Runtime.enable', {});
  await send(ws, 'Page.enable', {});

  const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exitCode = 1; } else { console.log('ok:', m); } };

  const injected = await send(ws, 'Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      const mode = new URL(location.href).searchParams.get('stale-wasm');
      if (!mode) return;
      const modules = {
        '2': '${staleV1WithFright}',
        'hud-flash': '${staleV2NoHudFlash}',
        'reduced-flash': '${staleV2NoReducedFlash}',
        'theme': '${staleV2NoTheme}',
        'difficulty': '${staleV2NoDifficulty}',
        'dots-total': '${staleV2NoDotsTotal}',
        'show-fps': '${staleV2NoShowFps}',
      };
      const b64 = modules[mode] || '${staleV1NoFright}';
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const realFetch = (window.fetch || fetch).bind(window);
      window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (/maze-chase\\.wasm(?:[?#]|$)/.test(url)) {
          window.__staleWasmHits = (window.__staleWasmHits || 0) + 1;
          return Promise.resolve(new Response(bytes.slice(), {
            status: 200,
            headers: { 'Content-Type': 'application/wasm' },
          }));
        }
        return realFetch(input, init);
      };
    })();`,
  });

  async function cardState() {
    return evalJs(ws, `(() => {
      const card = document.getElementById('panel-error');
      const rect = card.getBoundingClientRect();
      return {
        cardVisible: !card.hidden && getComputedStyle(card).display !== 'none' &&
          rect.width > 0 && rect.height > 0,
        titleHidden: document.getElementById('panel-title').hidden,
        reason: document.getElementById('error-reason').textContent,
        hint: document.getElementById('error-hint').textContent,
        boot: document.getElementById('boot-status').textContent,
        hits: window.__staleWasmHits || 0,
      };
    })()`);
  }

  // A version-1 module missing mc_fright_segments must fail on the export
  // check even though it reports the old version and every old export.
  const url1 = new URL(PAGE);
  url1.searchParams.set('stale-wasm', '1');
  await send(ws, 'Page.navigate', { url: url1.toString() });
  await sleep(2500);
  let state = await cardState();
  assert(state.hits >= 1, 'the stale module was actually fetched');
  assert(state.cardVisible, 'missing fright export reaches the error card');
  assert(state.titleHidden, 'the title panel is hidden after boot rejection');
  assert(state.reason ===
    'Could not load the game engine (missing export: mc_fright_segments).',
    'the error names the missing fright export, got: ' + state.reason);
  assert(state.hint.includes('served over http'), 'the repair hint is present');
  assert(state.boot === 'Loading engine...', 'boot status never reaches Ready');

  // A version-1 module with every export now fails the version check, so the
  // ABI bump alone also rejects a stale cached artifact.
  const url2 = new URL(PAGE);
  url2.searchParams.set('stale-wasm', '2');
  await send(ws, 'Page.navigate', { url: url2.toString() });
  await sleep(2500);
  state = await cardState();
  assert(state.hits >= 1, 'the version-1 module was actually fetched');
  assert(state.cardVisible, 'version skew reaches the error card');
  assert(state.reason ===
    'Could not load the game engine (version mismatch: wasm=1 harness=2).',
    'the error names both versions, got: ' + state.reason);

  // An ABI-2 module missing one first-HUD or accessibility export must fail
  // the boot gate instead of reaching Ready with a silently frozen HUD.
  const groupCases = [
    ['hud-flash', 'mc_fright_flash'],
    ['reduced-flash', 'mc_reduced_flash'],
    ['theme', 'mc_theme'],
    ['difficulty', 'mc_difficulty'],
    ['dots-total', 'mc_dots_total'],
    ['show-fps', 'mc_show_fps'],
  ];
  for (const [mode, exportName] of groupCases) {
    const url = new URL(PAGE);
    url.searchParams.set('stale-wasm', mode);
    await send(ws, 'Page.navigate', { url: url.toString() });
    await sleep(2500);
    state = await cardState();
    assert(state.cardVisible, 'missing ' + exportName + ' reaches the error card');
    assert(state.reason ===
      'Could not load the game engine (missing export: ' + exportName + ').',
      'the error names ' + exportName + ', got: ' + state.reason);
    assert(state.boot === 'Loading engine...', 'boot status never reaches Ready for ' + exportName);
  }

  await send(ws, 'Page.removeScriptToEvaluateOnNewDocument', {
    identifier: injected.identifier,
  });
  ws.close();
  console.log(process.exitCode ? 'BOOT-GATE-E2E: FAILURES PRESENT' : 'BOOT-GATE-E2E: ALL GREEN');
})();
