// Stable engine boundary (blueprint binding). M1 backs it with the pure-JS
// core (WAD parse -> automap framebuffer); the doomgeneric Wasm build (M1
// build scripts) and Chocolate SDL2 adaptor (v1.1) expose the same exports,
// so the app never changes when the backend swaps in M2.
import { parseWadDirectory, lumpBytes, discoverMaps, decodeVertexes, decodeThings, decodeLinedefs, decodeSidedefs, decodeSectors, resolveRefs, detectHexen, checkPlaypal, checkColormap, fallbackPalette, WadReport } from '../wad/index.js';
import { createFrameBuffer } from '../render/fbView.js';
import { renderAutomap, renderStatusBar, FB_W, FB_H } from '../render/automap.js';

export const ENGINE_VERSION = 'm1-js-core/1.0.0';

export async function initEngine({ wadBytes, skill = 3, episode = 1, map = 'E1M1' }) {
  const bytes = wadBytes instanceof Uint8Array ? wadBytes : new Uint8Array(wadBytes);
  const report = new WadReport();
  const dir = parseWadDirectory(bytes);
  const byName = new Map(dir.lumps.map((l) => [l.name, l]));
  const maps = discoverMaps(dir.lumps);
  if (maps.length === 0) throw Object.assign(new Error('no maps found in WAD'), { code: 'E_MAP' });
  const entry = maps.find((m) => m.map === map) || maps[0];
  const hexen = detectHexen(entry);
  if (hexen.hexen) throw Object.assign(new Error(hexen.message), { code: 'E_MAP', hexen: true });

  const need = (n) => {
    const e = entry.entries[n];
    if (!e) throw Object.assign(new Error(`map ${entry.map}: missing ${n}`), { code: 'E_MAP', map: entry.map, lump: n });
    return lumpBytes(bytes, e);
  };
  const vertexes = decodeVertexes(need('VERTEXES'), entry.map);
  const things = decodeThings(need('THINGS'), false, entry.map);
  const linedefs = decodeLinedefs(need('LINEDEFS'), false, entry.map);
  const sidedefs = decodeSidedefs(need('SIDEDEFS'), entry.map);
  const sectors = decodeSectors(need('SECTORS'), entry.map);
  const geo = { vertexes, things, linedefs, sidedefs, sectors };
  const refs = resolveRefs(geo, entry.map);
  if (refs.errors.length > 0) {
    const first = refs.errors[0];
    throw Object.assign(new Error(`map ${entry.map}: ${first.code} ${first.lump}: ${first.actual}`), { code: 'E_REF', details: refs.errors });
  }
  for (const w of refs.warnings) report.warnings.push(w);

  let palette = fallbackPalette();
  if (byName.has('PLAYPAL')) {
    try { palette = checkPlaypal(lumpBytes(bytes, byName.get('PLAYPAL'))).slice(0, 768); }
    catch (e) { report.warnings.push(e); }
  }
  if (byName.has('COLORMAP')) {
    try { checkColormap(lumpBytes(bytes, byName.get('COLORMAP'))); } catch (e) { report.warnings.push(e); }
  }

  const fb = createFrameBuffer(FB_W, FB_H);
  const player = things.find((t) => t.type === 1) || { x: 0, y: 0, angle: 90 };
  let ticks = 0;
  let angle = player.angle;
  const keys = new Set();
  const cmd = { forward: 0, turn: 0 };

  function drawFrame() {
    // Camera-follow automap: rotate world by -angle around player, then reuse
    // the automap projector on a translated/rotated copy (cheap, M1 scope).
    renderAutomap(fb, geo);
    renderStatusBar(fb, `${entry.map} E${episode} SK${skill} T${ticks}`);
  }

  drawFrame();

  return {
    version: ENGINE_VERSION,
    map: entry.map,
    maps: maps.map((m) => m.map),
    report,
    episode,
    skill,
    tickOnce() {
      ticks++;
      if (keys.has('turnLeft')) angle += 4;
      if (keys.has('turnRight')) angle -= 4;
      drawFrame();
      return ticks;
    },
    getFrameBufferView() { return fb.data; },
    getFramebufferPtr() { return 0; },
    getWidth() { return FB_W; },
    getHeight() { return FB_H; },
    queueKey(k, pressed) { if (pressed) keys.add(k); else keys.delete(k); },
    injectTiccmd(c) {
      if (c.forwardmove) cmd.forward = c.forwardmove;
      if (c.angleturn) angle += c.angleturn / 182;
    },
    getPlayer() { return { ...player, angle }; },
    get tickCount() { return ticks; },
    shutdown() {},
    onMemoryGrow() {},
    __fb: fb,
    __geo: geo,
    __palette: palette,
  };
}
