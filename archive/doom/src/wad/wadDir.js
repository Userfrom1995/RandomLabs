// WAD header + directory validation (research spec sections 3.1-3.2).
import { CheckedReader } from './checkedReader.js';
import { WadError } from './errors.js';

export const HEADER_SIZE = 12;
export const DIR_ENTRY_SIZE = 16;
export const MAX_LUMPS = 1 << 20; // allocation cap before allocating

export function parseWadDirectory(buffer) {
  const r = new CheckedReader(buffer);
  if (r.size < HEADER_SIZE) {
    throw new WadError({ code: 'E_CONTAINER', lump: '', map: null, offset: 0, expected: `filesize >= ${HEADER_SIZE}`, actual: `${r.size}`, severity: 'fatal', fallback: 'reject file' });
  }
  const magic = r.ascii(0, 4);
  if (magic !== 'IWAD' && magic !== 'PWAD') {
    throw new WadError({ code: 'E_CONTAINER', lump: '', map: null, offset: 0, expected: 'magic IWAD or PWAD', actual: JSON.stringify(magic), severity: 'fatal', fallback: 'reject file' });
  }
  const numlumps = r.i32(4);
  const infotableofs = r.i32(8);
  if (!Number.isInteger(numlumps) || numlumps < 0 || numlumps > MAX_LUMPS) {
    throw new WadError({ code: 'E_CONTAINER', lump: '', map: null, offset: 4, expected: `0 <= numlumps <= ${MAX_LUMPS}`, actual: `${numlumps}`, severity: 'fatal', fallback: 'reject file' });
  }
  if (!Number.isInteger(infotableofs) || infotableofs < HEADER_SIZE || infotableofs + numlumps * DIR_ENTRY_SIZE > r.size) {
    throw new WadError({ code: 'E_CONTAINER', lump: '', map: null, offset: 8, expected: `12 <= infotableofs and dir inside file`, actual: `infotableofs=${infotableofs} numlumps=${numlumps} size=${r.size}`, severity: 'fatal', fallback: 'reject file' });
  }

  const lumps = [];
  for (let i = 0; i < numlumps; i++) {
    const off = infotableofs + i * DIR_ENTRY_SIZE;
    const filepos = r.i32(off);
    const size = r.i32(off + 4);
    const name = r.name8(off + 8);
    if (size < 0 || filepos < 0 || filepos + size > r.size) {
      throw new WadError({ code: 'E_CONTAINER', lump: name, map: null, offset: off, expected: 'lump range inside file', actual: `filepos=${filepos} size=${size} filesize=${r.size}`, severity: 'fatal', fallback: 'reject file' });
    }
    if (size > 0 && filepos < HEADER_SIZE) {
      throw new WadError({ code: 'E_CONTAINER', lump: name, map: null, offset: off, expected: 'data lump filepos >= 12', actual: `${filepos}`, severity: 'fatal', fallback: 'reject file' });
    }
    // Marker filepos values (size == 0) must never be dereferenced; keep as-is.
    lumps.push({ index: i, name, filepos, size, dirOffset: off });
  }

  // Overlapping-range check (fatal container error).
  const spans = lumps.filter((l) => l.size > 0).map((l) => [l.filepos, l.filepos + l.size, l.name]).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < spans.length; i++) {
    if (spans[i][0] < spans[i - 1][1]) {
      throw new WadError({ code: 'E_CONTAINER', lump: spans[i][2], map: null, offset: 0, expected: 'non-overlapping lump ranges', actual: `${spans[i - 1][2]} overlaps ${spans[i][2]}`, severity: 'fatal', fallback: 'reject file' });
    }
  }

  return { magic, numlumps, infotableofs, lumps, filesize: r.size };
}

// Fetch lump payload bytes; marker lumps (size 0) yield an empty view.
export function lumpBytes(buffer, entry) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (entry.size === 0) return bytes.subarray(0, 0);
  if (entry.filepos < 0 || entry.filepos + entry.size > bytes.length) {
    throw new WadError({ code: 'E_CONTAINER', lump: entry.name, map: null, offset: entry.dirOffset, expected: 'lump range inside file', actual: `filepos=${entry.filepos} size=${entry.size}`, severity: 'fatal', fallback: 'reject file' });
  }
  return bytes.subarray(entry.filepos, entry.filepos + entry.size);
}

// Last-wins PWAD overlay by lump name (map-lump groups handled by mapDiscovery).
export function overlayLumps(baseLumps, patchLumps) {
  const out = baseLumps.slice();
  const byName = new Map();
  out.forEach((l, i) => { if (!byName.has(l.name)) byName.set(l.name, []); byName.get(l.name).push(i); });
  for (const p of patchLumps) {
    const slots = byName.get(p.name);
    if (slots && slots.length > 0) {
      // Replace the last occurrence (last-wins), keep directory order stable.
      out[slots[slots.length - 1]] = p;
    } else {
      byName.set(p.name, [out.length]);
      out.push(p);
    }
  }
  return out;
}
