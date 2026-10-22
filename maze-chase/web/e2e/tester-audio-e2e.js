// Tester regression: the shipped web audio graph at the cue and loop level.
//
// browser-e2e.js pins the five tunes, four loud SFX recipes, and the four
// warden chain arms. This suite extends that to every stable wire cue, the
// crumb pitch-variation arms, and a live title loop across multiple
// scheduler iterations. The loop count is observed by wrapping the page's
// own AudioContext before boot; the page never reads the wrapper.
//
// Usage: node web/e2e/tester-audio-e2e.js [page-url] [debug-port]
//   page-url defaults to http://127.0.0.1:8931/play.html
//   (serve maze-chase/ first: `python3 -m http.server 8931` inside it)
//   debug-port defaults to 9331: launch chromium first with
//   `--headless=new --remote-debugging-port=9331 --window-size=1280,900 <page-url>`
const DEBUG_PORT = Number(process.argv[3] || 9331);
const PAGE = process.argv[2] || 'http://127.0.0.1:8931/play.html';

if (typeof WebSocket === 'undefined') {
  console.error('AUDIO-E2E FAIL: global WebSocket not found; run with Node 22+.');
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
  const r = await send(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval threw: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
}

// Stable wire cues from crates/web/src/audio_map.rs. The six silent codes
// are the fright/level loop markers (3, 12, 17) and the three stings
// (8, 11, 16); all other codes carry an SFX recipe.
const SILENT_CUES = [3, 8, 11, 12, 16, 17];
const PLAYED_CUES = [1, 2, 4, 5, 6, 7, 9, 10, 13, 14, 15, 18, 19, 20, 21, 22];
const MUSIC_MIN = 0.31;
const MUSIC_MAX = 0.3205;
const SFX_MIN = 0.45;
const SFX_MAX = 0.5001;

(async () => {
  const listRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`).then((r) => r.json());
  const page = listRes.find((t) => t.url.includes('play.html')) || listRes.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target; got: ' + JSON.stringify(listRes.map((t) => t.url)));
  const ws = await connect(page.webSocketDebuggerUrl);
  let checks = 0;
  const fail = (msg) => { console.error('FAIL:', msg); checks++; process.exitCode = 1; };
  const ok = (msg) => { console.log('ok:', msg); checks++; };

  try {
    await send(ws, 'Runtime.enable', {});
    await send(ws, 'Page.enable', {});
    await send(ws, 'Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const patched = function (...args) {
          const ctx = new AC(...args);
          window.__audioCtx = ctx;
          window.__oscStarts = 0;
          const createOscillator = ctx.createOscillator.bind(ctx);
          ctx.createOscillator = function () {
            const osc = createOscillator();
            const start = osc.start.bind(osc);
            osc.start = function (...a) { window.__oscStarts++; return start(...a); };
            return osc;
          };
          return ctx;
        };
        patched.prototype = AC.prototype;
        window.AudioContext = patched;
        window.webkitAudioContext = patched;
      })();`,
    });

    await send(ws, 'Page.navigate', { url: PAGE });
    await sleep(1200);
    await evalJs(ws, `localStorage.removeItem('maze-chase-settings')`);
    await send(ws, 'Page.navigate', { url: PAGE });
    await sleep(2600);

    const boot = await evalJs(ws, `document.getElementById('boot-status').textContent`);
    if (boot !== 'Ready.') fail('engine did not boot, got: ' + boot); else ok('engine boots at the shipped page');

    const chip = await evalJs(ws, `(() => {
      const b = document.getElementById('btn-audio');
      return b ? [b.hidden, b.tagName, b.textContent.trim()] : null;
    })()`);
    if (!chip || chip[0] !== false || !/tap to wake/i.test(chip[2])) fail('audio unlock chip is not visible, got: ' + JSON.stringify(chip));
    else ok('audio unlock chip is visible before the first gesture');
    const rect = await evalJs(ws, `(() => { const r = document.getElementById('btn-audio').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
    await send(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: rect[0], y: rect[1], button: 'left', clickCount: 1 });
    await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect[0], y: rect[1], button: 'left', clickCount: 1 });
    await sleep(700);

    const early = await evalJs(ws, `({
      audio: window.__mcAudio || null,
      state: window.__audioCtx ? window.__audioCtx.state : 'none',
      t: window.__audioCtx ? window.__audioCtx.currentTime : 0,
      osc: window.__oscStarts || 0
    })`);
    if (!early.audio || early.audio.state !== 'running') fail('AudioContext is not running after the trusted chip click, got: ' + JSON.stringify(early));
    else ok('trusted chip click starts the AudioContext');
    if (!early.audio || early.audio.music !== 1 || early.audio.tune !== 0 || early.audio.loop !== true) {
      fail('title loop did not start, got: ' + JSON.stringify(early.audio));
    } else ok('title loop starts as tune 0 with loop=true');
    if (!early.audio || !early.audio.gains || !early.audio.gains.primed) {
      fail('mix was not primed before the title loop, got: ' + JSON.stringify(early.audio && early.audio.gains));
    } else {
      const g = early.audio.gains;
      const near = (a, b) => Math.abs(a - b) < 0.005;
      if (!near(g.master, 0.8) || !near(g.music, 0.6) || !near(g.sfx, 0.8)) {
        fail('default 80/60/80 mix is not on the buses, got: ' + JSON.stringify(g));
      } else ok('default 80/60/80 mix is primed on the buses');
    }
    if (!(early.osc > 0)) fail('the title scheduler started no oscillators, got: ' + early.osc);
    else ok('the title scheduler starts oscillators before the first frame');

    await sleep(6500);
    const mid = await evalJs(ws, `({
      audio: window.__mcAudio || null,
      state: window.__audioCtx ? window.__audioCtx.state : 'none',
      t: window.__audioCtx ? window.__audioCtx.currentTime : 0,
      osc: window.__oscStarts || 0
    })`);
    await sleep(6000);
    const late = await evalJs(ws, `({
      audio: window.__mcAudio || null,
      state: window.__audioCtx ? window.__audioCtx.state : 'none',
      t: window.__audioCtx ? window.__audioCtx.currentTime : 0,
      osc: window.__oscStarts || 0
    })`);
    if (!late.audio || late.audio.state !== 'running') fail('AudioContext stopped during the title loop, got: ' + JSON.stringify(late));
    else ok('AudioContext stays running through the title loop');
    if (!late.audio || late.audio.tune !== 0 || late.audio.loop !== true) {
      fail('the title loop job was replaced or stopped, got: ' + JSON.stringify(late.audio));
    } else ok('title loop job stays tune 0 with loop=true after two iterations');
    if (!(late.t - early.t >= 11.5)) fail('AudioContext clock did not advance ~12s, got: ' + (late.t - early.t));
    else ok('AudioContext clock advances in real time across the loop');
    if (!(late.osc - early.osc >= 45)) {
      fail('the title scheduler stopped after its first iteration (oscillator delta ' + (late.osc - early.osc) + ')');
    } else ok('the title scheduler re-arms for later iterations (oscillator delta ' + (late.osc - early.osc) + ')');
    if (late.osc - early.osc > 250) fail('the title scheduler ran away, oscillator delta ' + (late.osc - early.osc));
    else ok('the title scheduler does not catch up in an unbounded burst');
    if (!(mid.osc > early.osc)) fail('no notes were scheduled between the first and second iteration, got: ' + JSON.stringify([early.osc, mid.osc]));
    else ok('notes continue to be scheduled between iterations');

    const tunePeaks = await evalJs(ws, `(async () => {
      const peaks = [];
      for (let id = 0; id <= 4; id++) peaks.push(await window.__mcRenderTunePeak(id, 30));
      return peaks;
    })()`);
    const tuneBad = tunePeaks.filter((p) => !(p >= MUSIC_MIN) || p > MUSIC_MAX);
    if (tunePeaks.length !== 5 || tuneBad.length) fail('tune peaks outside the 0.32 ceiling envelope: ' + JSON.stringify(tunePeaks));
    else ok('all five tunes stay under the 0.32 music ceiling: ' + JSON.stringify(tunePeaks));

    const cuePeaks = await evalJs(ws, `(async () => {
      const out = {};
      for (let cue = 1; cue <= 22; cue++) out[cue] = await window.__mcRenderSfxPeak(cue, 3);
      return out;
    })()`);
    for (const cue of SILENT_CUES) {
      if (!(cuePeaks[cue] === 0)) fail('silent cue ' + cue + ' rendered SFX peak ' + cuePeaks[cue]);
    }
    if (SILENT_CUES.every((c) => cuePeaks[c] === 0)) ok('fright/level loop markers and stings carry no SFX duplication');
    for (const cue of PLAYED_CUES) {
      const p = cuePeaks[cue];
      if (!(p >= SFX_MIN) || p > SFX_MAX) fail('cue ' + cue + ' peak outside the 0.50 SFX ceiling: ' + p);
    }
    if (PLAYED_CUES.every((c) => cuePeaks[c] >= SFX_MIN && cuePeaks[c] <= SFX_MAX)) {
      ok('all ' + PLAYED_CUES.length + ' SFX cues normalize under the 0.50 ceiling');
    }

    const variation = await evalJs(ws, `(async () => {
      const out = [];
      for (const [cue, pitch] of [[1, 0.988], [1, 1.012], [4, 2], [4, 4], [4, 8]]) {
        out.push([cue, pitch, await window.__mcRenderSfxPeak(cue, 3, pitch)]);
      }
      return out;
    })()`);
    const variationBad = variation.filter(([, , p]) => !(p >= 0.44) || p > SFX_MAX);
    if (variationBad.length) fail('crumb variation or warden chain arm escaped the ceiling: ' + JSON.stringify(variation));
    else ok('crumb variation and every warden chain arm re-normalize under the 0.50 ceiling');

    const hostile = await evalJs(ws, `(async () => [
      await window.__mcRenderSfxPeak(4, 3, 0.01),
      await window.__mcRenderSfxPeak(4, 3, 64),
      await window.__mcRenderSfxPeak(1, 3, 64),
      await window.__mcRenderSfxPeak(22, 3, 64)
    ])()`);
    const hostileBad = hostile.filter((p) => !(Number.isFinite(p)) || p < 0 || p > SFX_MAX);
    if (hostileBad.length) fail('extreme pitch inputs escaped the ceiling or trapped: ' + JSON.stringify(hostile));
    else ok('extreme pitch inputs stay finite and under the SFX ceiling');
  } finally {
    ws.close();
  }

  if (process.exitCode) {
    console.error('TESTER AUDIO E2E: FAILED');
  } else {
    console.log('TESTER AUDIO E2E: ALL GREEN (' + checks + ' checks)');
  }
})().catch((e) => {
  console.error('AUDIO-E2E FAIL:', e && e.stack ? e.stack : e);
  process.exit(1);
});
