// Stable engine boundary (blueprint binding). M1 backs it with the pure-JS
// core (WAD parse -> automap framebuffer); the doomgeneric Wasm build (M1
// build scripts) and Chocolate SDL2 adaptor (v1.1) expose the same exports,
// so the app never changes when the backend swaps in M2.
import { parseWadDirectory, lumpBytes, discoverMaps, decodeVertexes, decodeThings, decodeLinedefs, decodeSidedefs, decodeSectors, resolveRefs, detectHexen, checkPlaypal, checkColormap, fallbackPalette, WadReport } from '../wad/index.js';
import { createFrameBuffer } from '../render/fbView.js';
import { renderAutomap, renderStatusBar, FB_W, FB_H } from '../render/automap.js';
import { latchTiccmd, TIC } from '../input/tic.js';

export const ENGINE_VERSION = 'm1-js-core/1.0.0';

// Arcade movement scale: one ticcmd unit of forward/side move shifts the
// player by 0.08 map units, so a full run (50) covers 4 units per tick.
// Collision against linedefs arrives with the 3D BSP rasterizer milestone;
// M2 movement is free (clamped to the map bounding box).
export const MOVE_UNITS_PER_TICCMD = 0.08;
export const KEY_TURN_DEG = 4;

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
  const spawn = things.find((t) => t.type === 1) || { x: 0, y: 0, angle: 90, type: 1 };
  // Simulated player: starts as a copy of the spawn thing (type preserved for
  // the M1 getPlayer contract) plus M2 action state. All updates are pure
  // arithmetic, so identical input sequences converge bit-exactly.
  const player = {
    ...spawn,
    weapon: 2, // pistol, vanilla start
    attackCount: 0,
    useCount: 0,
  };
  let ticks = 0;
  let angle = player.angle;
  const keys = new Set();
  // Latched per-tick moves (forward/side/buttons/weapon), consumed once by
  // tickOnce. angleturn applies immediately inside injectTiccmd (M1 latency
  // contract: mouse deltas steer without waiting for the next tick).
  let latched = null;

  function clampToMapBounds() {
    if (!geo.vertexes || geo.vertexes.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const v of geo.vertexes) {
      if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
    }
    player.x = Math.max(minX, Math.min(maxX, player.x));
    player.y = Math.max(minY, Math.min(maxY, player.y));
  }

  function stepPlayer(forwardmove, sidemove) {
    if (!forwardmove && !sidemove) return;
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const f = forwardmove * MOVE_UNITS_PER_TICCMD;
    const s = sidemove * MOVE_UNITS_PER_TICCMD;
    player.x += cos * f - sin * s;
    player.y += sin * f + cos * s;
    clampToMapBounds();
  }

  function drawFrame() {
    // Camera-follow automap: rotate world by -angle around player, then reuse
    // the automap projector on a translated/rotated copy (cheap, M1 scope).
    renderAutomap(fb, geo, undefined, { x: player.x, y: player.y, angle });
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
      if (keys.has('turnLeft')) angle += KEY_TURN_DEG;
      if (keys.has('turnRight')) angle -= KEY_TURN_DEG;
      let fw = 0, sd = 0;
      if (keys.has('forward')) fw += TIC.FWD_RUN;
      if (keys.has('back')) fw -= TIC.FWD_RUN;
      if (keys.has('strafeLeft')) sd -= TIC.SIDE_RUN;
      if (keys.has('strafeRight')) sd += TIC.SIDE_RUN;
      if (latched) {
        fw += latched.forwardmove || 0;
        sd += latched.sidemove || 0;
        const buttons = latched.buttons || 0;
        if (buttons & 1) player.attackCount++;
        if (buttons & 2) player.useCount++;
        if (latched.weaponSelect) player.weapon = latched.weaponSelect;
        latched = null;
      }
      stepPlayer(
        Math.max(-TIC.MOVE_CLAMP * 2, Math.min(TIC.MOVE_CLAMP * 2, fw)),
        Math.max(-TIC.MOVE_CLAMP * 2, Math.min(TIC.MOVE_CLAMP * 2, sd)),
      );
      drawFrame();
      return ticks;
    },
    getFrameBufferView() { return fb.data; },
    getFramebufferPtr() { return 0; },
    getWidth() { return FB_W; },
    getHeight() { return FB_H; },
    queueKey(k, pressed) { if (pressed) keys.add(k); else keys.delete(k); },
    injectTiccmd(c) {
      if (!c || typeof c !== 'object') return;
      // Turn applies immediately (M1 latency contract, mouse-look feel);
      // moves, buttons, and weapon select latch for the next tickOnce.
      if (Number.isFinite(Number(c.angleturn))) {
        // Sealed 1-LSB tolerance: matches latchTiccmd clamp [-32768, 32767].
        const a = Math.max(-32768, Math.min(32767, Math.round(Number(c.angleturn))));
        if (a) angle += a / 182;
      }
      const { angleturn: _drop, ...rest } = c;
      latched = latchTiccmd(latched, rest);
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
