// WAD loadout (M4): multi-file load order, merged assembly, per-map
// isolation, WAD identity, and DEHACKED surfacing. Pure and headless:
// no DOM, no network, no storage. The app shell owns all side effects.
//
// Load-order rules (architect blueprint, binding):
// - Files apply in drop order: the first IWAD is the base, every later
//   file is a patch (PWAD or second IWAD).
// - Map groups replace by marker name: a patch E1M1 swaps the whole base
//   E1M1 group (marker through BLOCKMAP/BEHAVIOR). Untouched maps survive.
// - Standalone lumps apply last-wins by name (TEXTURE2 overrides
//   TEXTURE1-style resources, PLAYPAL swaps globally). Order stays stable:
//   a replacement keeps the base slot, genuinely new lumps append.
// - One bad map never kills the load: probeMaps() isolates per map and
//   reports drops with taxonomy codes; the shell boots the survivors.
// - DEHACKED lumps are surfaced as info notes, never parsed as maps and
//   never applied (gameplay patching is out of scope for this milestone).
import { parseWadDirectory, lumpBytes } from './wadDir.js';
import { discoverMaps, episodeClamp, MAP_ORDER } from './mapDiscovery.js';
import {
  decodeVertexes, decodeThings, decodeLinedefs, decodeSidedefs,
  decodeSectors, resolveRefs,
} from './lumpDecoders.js';
import { detectHexen, isDehackedLump } from './hexenDetect.js';

export const LOADOUT_VERSION = 1;

// Lumps the engine must decode before a map is considered bootable.
// SEGS/SSECTORS/NODES/REJECT/BLOCKMAP are optional here: the automap
// core renders without BSP traversal, and partial PWAD fragments can
// legitimately omit them.
export const REQUIRED_MAP_LUMPS = ['THINGS', 'LINEDEFS', 'SIDEDEFS', 'VERTEXES', 'SECTORS'];

// Identify the game family carried by a parsed directory. Marker-only
// heuristics: MAPxx means Doom 2 family (TNT/Plutonia share the marker
// scheme and are reported as doom2 with a family note); E#M# means
// Doom 1 (shareware likelihood via the episode clamp rule).
export function identifyWad(dir) {
  let maps = [];
  let discoveryNote = '';
  try {
    maps = discoverMaps(dir.lumps);
  } catch (e) {
    discoveryNote = e && e.message ? String(e.message) : 'map discovery failed';
    maps = [];
  }
  const names = maps.map((m) => m.map);
  const hasDoom2 = names.some((n) => /^MAP\d\d$/.test(n));
  const hasDoom1 = names.some((n) => /^E[1-5]M[1-9]$/.test(n));
  let kind = 'unknown';
  if (hasDoom2 && !hasDoom1) kind = 'doom2';
  else if (hasDoom1 && !hasDoom2) kind = 'doom1';
  else if (hasDoom1 && hasDoom2) kind = 'mixed';
  const clamp = episodeClamp(maps);
  return {
    magic: dir.magic,
    kind,
    maps: names,
    episodes: clamp.episodes,
    sharewareLikely: clamp.sharewareLikely,
    familyNote: kind === 'doom2'
      ? 'Doom 2 family markers (MAPxx): Doom II, TNT, and Plutonia share this scheme.'
      : '',
    discoveryNote,
  };
}

// Surface DEHACKED gameplay-patch lumps as info notes. They are never
// map data (mapDiscovery only matches markers) and never applied here.
export function findDehacked(lumps) {
  const out = [];
  for (const lump of lumps) {
    if (isDehackedLump(lump.name)) {
      out.push({ name: lump.name, index: lump.index, size: lump.size });
    }
  }
  return out;
}

export function describeDehacked(entry) {
  return `DEHACKED lump present (${entry.size} bytes): gameplay patch surfaced, not applied in this milestone.`;
}

// Split a directory into merge segments: map groups keyed by marker
// plus standalone single lumps. Ranges come from discoverMaps so group
// membership matches exactly what the engine will boot.
function segmentDirectory(lumps) {
  let maps = [];
  try {
    maps = discoverMaps(lumps);
  } catch {
    maps = [];
  }
  const groupByStart = new Map(maps.map((m) => [m.index, m]));
  const covered = new Set();
  for (const m of maps) {
    for (let i = m.index; i < m.endIndex; i++) covered.add(i);
  }
  const segments = [];
  for (let i = 0; i < lumps.length; i++) {
    const group = groupByStart.get(i);
    if (group) {
      segments.push({ kind: 'map', key: group.map, lumps: lumps.slice(group.index, group.endIndex) });
      i = group.endIndex - 1;
    } else if (!covered.has(i)) {
      segments.push({ kind: 'single', key: lumps[i].name, lump: lumps[i] });
    }
    // Lumps absorbed inside a group range (interleaved unknowns) travel
    // with that group; nothing is silently dropped.
  }
  return segments;
}

// Merge an ordered file list into one directory view. Per-file container
// errors isolate to that file (rejected[]) instead of killing the load.
// Returns merged lump descriptors with payload views attached as `data`.
export function buildLoadout(files) {
  const valid = [];
  const rejected = [];
  for (const file of files) {
    try {
      const bytes = file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(file.bytes);
      const dir = parseWadDirectory(bytes);
      valid.push({ name: file.name, bytes, dir });
    } catch (e) {
      rejected.push({
        name: file.name,
        code: (e && e.code) || 'E_CONTAINER',
        message: (e && e.message) || 'unreadable WAD header or directory',
      });
    }
  }
  // Stable merge: replacements keep the base slot, new entries append.
  const order = [];
  const slotOf = new Map();
  const place = (kind, key, segment) => {
    const slotKey = `${kind}:${key}`;
    if (slotOf.has(slotKey)) {
      order[slotOf.get(slotKey)] = segment;
    } else {
      slotOf.set(slotKey, order.length);
      order.push(segment);
    }
  };
  valid.forEach((file, fileIndex) => {
    for (const seg of segmentDirectory(file.dir.lumps)) {
      if (seg.kind === 'map') {
        place('map', seg.key, { kind: 'map', key: seg.key, source: file.name, lumps: seg.lumps, fileIndex });
      } else {
        place('single', seg.key, { kind: 'single', key: seg.key, source: file.name, lump: seg.lump, fileIndex });
      }
    }
  });
  // Flatten to lump descriptors with payload views from the owning file.
  const merged = [];
  for (const seg of order) {
    if (seg.kind === 'map') {
      const owner = valid[seg.fileIndex];
      for (const lump of seg.lumps) {
        merged.push({ ...lump, source: seg.source, data: lumpBytes(owner.bytes, lump) });
      }
    } else {
      const owner = valid[seg.fileIndex];
      merged.push({ ...seg.lump, source: seg.source, data: lumpBytes(owner.bytes, seg.lump) });
    }
  }
  const dehacked = findDehacked(merged);
  return { valid: valid.map((v) => v.name), rejected, merged, dehacked };
}

// Assemble merged lump descriptors into one valid WAD byte buffer the
// engine can boot unchanged. Magic follows the base file (IWAD base
// stays IWAD unless a patch forces PWAD semantics; PWAD is the honest
// default for merged sets).
export function assembleWad(merged, magic = 'PWAD') {
  const n = merged.length;
  const dirSize = n * 16;
  let dataOff = 12;
  const dir = new Uint8Array(dirSize);
  const dd = new DataView(dir.buffer);
  const blobs = [];
  const enc8 = (name) => {
    const b = new Uint8Array(8);
    for (let i = 0; i < Math.min(8, name.length); i++) b[i] = name.charCodeAt(i);
    return b;
  };
  merged.forEach((lump, i) => {
    const data = lump.data instanceof Uint8Array ? lump.data : new Uint8Array(0);
    dd.setInt32(i * 16, data.length === 0 ? 0 : dataOff, true);
    dd.setInt32(i * 16 + 4, data.length, true);
    enc8(lump.name).forEach((b, k) => { dir[i * 16 + 8 + k] = b; });
    if (data.length > 0) { blobs.push(data); dataOff += data.length; }
  });
  const head = new Uint8Array(12);
  const dh = new DataView(head.buffer);
  String(magic).split('').forEach((c, i) => { if (i < 4) head[i] = c.charCodeAt(0); });
  dh.setInt32(4, n, true);
  dh.setInt32(8, dataOff, true);
  const total = 12 + blobs.reduce((a, p) => a + p.length, 0) + dirSize;
  const out = new Uint8Array(total);
  out.set(head, 0);
  let o = 12;
  for (const b of blobs) { out.set(b, o); o += b.length; }
  out.set(dir, o);
  return out;
}

// Per-map isolation probe: decode the required lumps per map and keep
// survivors. Hexen-dialect maps drop with a report message (never a
// silent misparse); reference errors drop the map, never the load.
export function probeMaps(wadBytes) {
  const bytes = wadBytes instanceof Uint8Array ? wadBytes : new Uint8Array(wadBytes);
  const dir = parseWadDirectory(bytes);
  const byName = new Map(dir.lumps.map((l) => [l.name, l]));
  let maps = [];
  try {
    maps = discoverMaps(dir.lumps);
  } catch (e) {
    return { viable: [], dropped: [{ map: '', code: (e && e.code) || 'E_MAP', message: (e && e.message) || 'no maps discovered' }], hexen: [] };
  }
  const viable = [];
  const dropped = [];
  const hexen = [];
  for (const entry of maps) {
    const hex = detectHexen(entry);
    if (hex.hexen) {
      hexen.push(entry.map);
      dropped.push({ map: entry.map, code: 'E_MAP', message: hex.message });
      continue;
    }
    try {
      const need = (lumpName) => {
        const ref = entry.entries[lumpName] || byName.get(lumpName);
        if (!ref) throw Object.assign(new Error(`map ${entry.map}: missing ${lumpName}`), { code: 'E_MAP' });
        return lumpBytes(bytes, ref);
      };
      const geo = {
        vertexes: decodeVertexes(need('VERTEXES'), entry.map),
        things: decodeThings(need('THINGS'), false, entry.map),
        linedefs: decodeLinedefs(need('LINEDEFS'), false, entry.map),
        sidedefs: decodeSidedefs(need('SIDEDEFS'), entry.map),
        sectors: decodeSectors(need('SECTORS'), entry.map),
      };
      const refs = resolveRefs(geo, entry.map);
      if (refs.errors.length > 0) {
        const first = refs.errors[0];
        dropped.push({ map: entry.map, code: first.code || 'E_REF', message: `${first.code} ${first.lump}: ${first.actual}` });
        continue;
      }
      viable.push(entry.map);
    } catch (e) {
      dropped.push({ map: entry.map, code: (e && e.code) || 'E_MAP', message: (e && e.message) || 'undecodable map' });
    }
  }
  return { viable, dropped, hexen };
}

// Human-readable load-order lines for the shell ("1. base.wad, IWAD, 2 maps").
export function describeLoadOrder(files) {
  return files.map((file, i) => {
    let suffix = 'unreadable';
    try {
      const bytes = file.bytes instanceof Uint8Array ? file.bytes : new Uint8Array(file.bytes);
      const dir = parseWadDirectory(bytes);
      const id = identifyWad(dir);
      suffix = `${dir.magic}, ${id.maps.length} map${id.maps.length === 1 ? '' : 's'}${id.kind !== 'unknown' ? `, ${id.kind}` : ''}`;
    } catch {
      // suffix stays 'unreadable'
    }
    return `${i + 1}. ${file.name} (${suffix})`;
  });
}

export { MAP_ORDER };
