// M1 boot: probe tier, load WAD (cache -> picker/drop -> built-in demo),
// init engine boundary, start rAF + 35 Hz loop, present on Canvas2D.
import { buildDemoWad } from './tools/make-demo-wad.mjs';
import { initEngine } from './src/engine/doomEngine.js';
import { createLoop } from './src/core/loop.js';
import { createPresenter } from './src/render/present2d.js';
import { probeCapabilities, resolveTier } from './src/render/tiers.js';
import { precacheWad, loadCachedWad } from './src/storage/wad-cache.js';
import { episodeClamp, discoverMaps, parseWadDirectory } from './src/wad/index.js';

const $ = (id) => document.getElementById(id);
const status = (msg) => { $('status-line').textContent = msg; };

function showErrors(report, fatalMsg) {
  const ul = $('error-list');
  ul.innerHTML = '';
  const add = (text, cls) => {
    const li = document.createElement('li');
    if (cls) li.className = cls;
    li.textContent = text;
    ul.appendChild(li);
  };
  if (fatalMsg) add(fatalMsg, 'fatal');
  if (!report) return;
  for (const w of report.warnings || []) add(`warning ${w.code} ${w.lump || ''}: ${w.actual} (${w.fallback})`);
  for (const m of report.toJSON ? report.toJSON().maps : []) {
    for (const e of m.errors) add(`map ${m.map}: ${e.code} ${e.lump}: ${e.actual}`);
  }
}

let engine = null;
let loop = null;
let presenter = null;
let paused = false;

function bindMapSelect(maps, current) {
  const sel = $('map-select');
  sel.innerHTML = '';
  for (const m of maps) {
    const o = document.createElement('option');
    o.value = m; o.textContent = m;
    if (m === current) o.selected = true;
    sel.appendChild(o);
  }
}

function probeGL() {
  // Probe on a throwaway canvas (never the visible one): acquiring one WebGL
  // context type locks the canvas, so probing webgl then webgl2 on the same
  // canvas always reports webgl2 as missing. Try webgl2 first, then webgl.
  try {
    const probe = document.createElement('canvas');
    const webgl2 = !!probe.getContext('webgl2');
    const probe2 = document.createElement('canvas');
    const webgl = !!probe2.getContext('webgl');
    return { webgl, webgl2 };
  } catch {
    return { webgl: false, webgl2: false };
  }
}
  if (loop) loop.stop();
  try {
    engine = await initEngine({ wadBytes, episode: 1, map: undefined });
  } catch (e) {
    showErrors(e.details ? { warnings: [], toJSON: () => ({ maps: [{ map: '', errors: e.details }] }) } : null, `Load failed: ${e.message}`);
    status(`Load failed: ${e.message}`);
    return;
  }
  const canvas = $('doom-canvas');
  presenter = createPresenter(canvas, engine.__palette);
  bindMapSelect(engine.maps, engine.map);
  showErrors(engine.report, null);
  const gl = probeGL();
  const tier = resolveTier(probeCapabilities(gl));
  status(`${label}: ${engine.map} running (tier ${tier}, ${engine.version}, ${engine.__geo.linedefs.length} lines, ${engine.__geo.sectors.length} sector${engine.__geo.sectors.length === 1 ? '' : 's'})`);

  loop = createLoop({
    tick: () => engine.tickOnce(),
    render: () => presenter.present(engine.__fb),
    onPause: () => status('Paused. Press Resume.'),
  });
  loop.start();
  presenter.present(engine.__fb);
}

async function readFile(file) {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

function clampToEpisode1(bytes) {
  // Episode clamp: if only Episode 1 markers exist, map select stays E1Mx.
  try {
    const dir = parseWadDirectory(bytes);
    const maps = discoverMaps(dir.lumps);
    const clamp = episodeClamp(maps);
    return clamp;
  } catch {
    return { episodes: [1], sharewareLikely: true };
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  // Drag-and-drop window protection: only the dropzone accepts files.
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => { if (e.target.id !== 'wad-drop') e.preventDefault(); });

  const cached = await loadCachedWad();
  if (cached) {
    await boot(cached, 'Cached WAD');
  } else {
    const demo = buildDemoWad();
    await boot(demo, 'Demo level');
  }

  const ingest = async (file) => {
    if (!file || !/\.wad$/i.test(file.name)) {
      status('Not a .WAD file; load rejected.');
      return;
    }
    const bytes = await readFile(file);
    await precacheWad(bytes);
    clampToEpisode1(bytes);
    $('wad-info').textContent = `${file.name} (${bytes.length} bytes) cached.`;
    await boot(bytes, file.name);
  };

  $('wad-picker').addEventListener('change', (e) => ingest(e.target.files[0]));
  const drop = $('wad-drop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); });
  drop.addEventListener('drop', (e) => { e.preventDefault(); ingest(e.dataTransfer.files[0]); });
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') $('wad-picker').click();
  });

  $('map-select').addEventListener('change', async (e) => {
    const bytes = (await loadCachedWad()) || buildDemoWad();
    if (loop) loop.stop();
    try {
      engine = await initEngine({ wadBytes: bytes, map: e.target.value });
      presenter = createPresenter($('doom-canvas'), engine.__palette);
      showErrors(engine.report, null);
      status(`${engine.map} running (${engine.__geo.linedefs.length} lines)`);
      loop = createLoop({ tick: () => engine.tickOnce(), render: () => presenter.present(engine.__fb) });
      if (!paused) loop.start();
      presenter.present(engine.__fb);
    } catch (err) {
      status(`Map load failed: ${err.message}`);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (!engine) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') engine.queueKey('turnLeft', true);
    if (e.code === 'ArrowRight' || e.code === 'KeyD') engine.queueKey('turnRight', true);
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { engine.tickOnce(); presenter.present(engine.__fb); }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    if (!engine) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') engine.queueKey('turnLeft', false);
    if (e.code === 'ArrowRight' || e.code === 'KeyD') engine.queueKey('turnRight', false);
  });

  $('btn-pause').addEventListener('click', () => { paused = true; if (loop) loop.pause(); });
  $('btn-resume').addEventListener('click', () => {
    paused = false;
    if (engine && presenter) {
      loop = createLoop({ tick: () => engine.tickOnce(), render: () => presenter.present(engine.__fb) });
      loop.start();
      status(`${engine.map} running`);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && loop) loop.stop();
    else if (!document.hidden && !paused && engine && presenter) {
      loop = createLoop({ tick: () => engine.tickOnce(), render: () => presenter.present(engine.__fb) });
      loop.start();
    }
  });

  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('./sw.js', { scope: './' }); } catch { /* offline pass is M4 */ }
  }
});
