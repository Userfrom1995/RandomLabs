// Lump decoders: packed on-disk geometry records (spec 3.4-3.6).
// Every decoder validates lumplen % recordsize == 0 (E_MAP) and range-checks
// cross-references later in resolveRefs (E_REF). Unknown flag bits ignored.
import { CheckedReader } from './checkedReader.js';
import { WadError } from './errors.js';

export const RECORD = {
  VERTEX: 4, THING_DOOM: 10, THING_HEXEN: 20, LINEDEF_DOOM: 14, LINEDEF_HEXEN: 16,
  SIDEDEF: 30, SECTOR: 26, SEG: 12, SSECTOR: 4, NODE: 28,
};

function needLength(bytes, rec, lump, map) {
  if (bytes.length % rec !== 0) {
    throw new WadError({ code: 'E_MAP', lump, map, offset: 0, expected: `len % ${rec} == 0`, actual: `len=${bytes.length}`, severity: 'error', fallback: 'drop map' });
  }
}

export function decodeVertexes(bytes, map = null) {
  needLength(bytes, RECORD.VERTEX, 'VERTEXES', map);
  const r = new CheckedReader(bytes, { lump: 'VERTEXES', map });
  const out = [];
  for (let o = 0; o + 4 <= bytes.length; o += 4) out.push({ x: r.i16(o), y: r.i16(o + 2) });
  if (out.length === 0) throw new WadError({ code: 'E_MAP', lump: 'VERTEXES', map, offset: 0, expected: '>= 1 vertex', actual: '0', severity: 'error', fallback: 'drop map' });
  return out;
}

export function decodeThings(bytes, hexen = false, map = null) {
  const rec = hexen ? RECORD.THING_HEXEN : RECORD.THING_DOOM;
  needLength(bytes, rec, 'THINGS', map);
  const r = new CheckedReader(bytes, { lump: 'THINGS', map });
  const out = [];
  for (let o = 0; o + rec <= bytes.length; o += rec) {
    if (!hexen) {
      out.push({ x: r.i16(o), y: r.i16(o + 2), angle: r.i16(o + 4), type: r.u16(o + 6), flags: r.u16(o + 8) });
    } else {
      out.push({ tid: r.i16(o), x: r.i16(o + 2), y: r.i16(o + 4), z: r.i16(o + 6), angle: r.i16(o + 8), type: r.u16(o + 10), flags: r.u16(o + 12), special: r.u8(o + 14), args: [r.u8(o + 15), r.u8(o + 16), r.u8(o + 17), r.u8(o + 18), r.u8(o + 19)] });
    }
  }
  return out;
}

export function decodeLinedefs(bytes, hexen = false, map = null) {
  const rec = hexen ? RECORD.LINEDEF_HEXEN : RECORD.LINEDEF_DOOM;
  needLength(bytes, rec, 'LINEDEFS', map);
  const r = new CheckedReader(bytes, { lump: 'LINEDEFS', map });
  const out = [];
  for (let o = 0; o + rec <= bytes.length; o += rec) {
    if (!hexen) {
      out.push({ v0: r.u16(o), v1: r.u16(o + 2), flags: r.u16(o + 4), special: r.u16(o + 6), tag: r.u16(o + 8), front: r.u16(o + 10), back: r.u16(o + 12) });
    } else {
      out.push({ v0: r.u16(o), v1: r.u16(o + 2), flags: r.u16(o + 4), special: r.u8(o + 6), args: [r.u8(o + 7), r.u8(o + 8), r.u8(o + 9), r.u8(o + 10), r.u8(o + 11)], front: r.u16(o + 12), back: r.u16(o + 14) });
    }
  }
  if (out.length === 0) throw new WadError({ code: 'E_MAP', lump: 'LINEDEFS', map, offset: 0, expected: '>= 1 linedef', actual: '0', severity: 'error', fallback: 'drop map' });
  return out;
}

export function decodeSidedefs(bytes, map = null) {
  needLength(bytes, RECORD.SIDEDEF, 'SIDEDEFS', map);
  const r = new CheckedReader(bytes, { lump: 'SIDEDEFS', map });
  const out = [];
  for (let o = 0; o + RECORD.SIDEDEF <= bytes.length; o += RECORD.SIDEDEF) {
    const tex = (p) => {
      const s = r.ascii(o + p, 8).toUpperCase();
      return s === '-' || s === '' ? null : s;
    };
    out.push({ xoff: r.i16(o), yoff: r.i16(o + 2), upper: tex(4), lower: tex(12), middle: tex(20), sector: r.u16(o + 28) });
  }
  if (out.length === 0) throw new WadError({ code: 'E_MAP', lump: 'SIDEDEFS', map, offset: 0, expected: '>= 1 sidedef', actual: '0', severity: 'error', fallback: 'drop map' });
  return out;
}

export function decodeSectors(bytes, map = null) {
  needLength(bytes, RECORD.SECTOR, 'SECTORS', map);
  const r = new CheckedReader(bytes, { lump: 'SECTORS', map });
  const out = [];
  for (let o = 0; o + RECORD.SECTOR <= bytes.length; o += RECORD.SECTOR) {
    out.push({
      floorH: r.i16(o), ceilH: r.i16(o + 2),
      floorFlat: r.ascii(o + 4, 8).toUpperCase(), ceilFlat: r.ascii(o + 12, 8).toUpperCase(),
      light: r.i16(o + 20), special: r.u16(o + 22), tag: r.u16(o + 24),
    });
  }
  if (out.length === 0) throw new WadError({ code: 'E_MAP', lump: 'SECTORS', map, offset: 0, expected: '>= 1 sector', actual: '0', severity: 'error', fallback: 'drop map' });
  return out;
}

export function decodeSegs(bytes, map = null) {
  needLength(bytes, RECORD.SEG, 'SEGS', map);
  const r = new CheckedReader(bytes, { lump: 'SEGS', map });
  const out = [];
  for (let o = 0; o + RECORD.SEG <= bytes.length; o += RECORD.SEG) {
    out.push({ v0: r.u16(o), v1: r.u16(o + 2), angle: r.i16(o + 4), linedef: r.u16(o + 6), dir: r.u16(o + 8), offset: r.u16(o + 10) });
  }
  return out;
}

export function decodeSubsectors(bytes, map = null) {
  needLength(bytes, RECORD.SSECTOR, 'SSECTORS', map);
  const r = new CheckedReader(bytes, { lump: 'SSECTORS', map });
  const out = [];
  for (let o = 0; o + RECORD.SSECTOR <= bytes.length; o += RECORD.SSECTOR) {
    out.push({ count: r.u16(o), first: r.u16(o + 2) });
  }
  return out;
}

export function decodeNodes(bytes, map = null) {
  needLength(bytes, RECORD.NODE, 'NODES', map);
  const r = new CheckedReader(bytes, { lump: 'NODES', map });
  const out = [];
  for (let o = 0; o + RECORD.NODE <= bytes.length; o += RECORD.NODE) {
    const box = (p) => ({ top: r.i16(p), bottom: r.i16(p + 2), left: r.i16(p + 4), right: r.i16(p + 6) });
    out.push({ x: r.i16(o), y: r.i16(o + 2), dx: r.i16(o + 4), dy: r.i16(o + 6), boxR: box(o + 8), boxL: box(o + 16), right: r.u16(o + 24), left: r.u16(o + 26) });
  }
  return out;
}

// Cross-reference validation (E_REF layer): returns { errors, warnings }.
// Front 0xFFFF is an error; two-sided line missing back is an error;
// unreferenced sector is a warning; zero-length linedef is W_GEOM.
export function resolveRefs(geo, map = null) {
  const errors = [];
  const warnings = [];
  const ref = (code, lump, offset, expected, actual, severity, fallback) =>
    new WadError({ code, lump, map, offset, expected, actual, severity, fallback });
  const nv = geo.vertexes.length, ns = geo.sidedefs.length, nsec = geo.sectors.length;
  geo.linedefs.forEach((L, i) => {
    if (L.v0 >= nv || L.v1 >= nv) errors.push(ref('E_REF', 'LINEDEFS', i * 14, `vertex < ${nv}`, `v0=${L.v0} v1=${L.v1}`, 'error', 'drop map'));
    if (L.v0 === L.v1) warnings.push(ref('W_GEOM', 'LINEDEFS', i * 14, 'non-zero length', `line ${i} zero-length`, 'warning', 'keep, skip at render'));
    if (L.front === 0xffff) errors.push(ref('E_REF', 'LINEDEFS', i * 14, 'front sidedef present', 'front=0xFFFF', 'error', 'drop map'));
    else if (L.front >= ns) errors.push(ref('E_REF', 'LINEDEFS', i * 14, `sidedef < ${ns}`, `front=${L.front}`, 'error', 'drop map'));
    if ((L.flags & 0x0004) && L.back === 0xffff) errors.push(ref('E_REF', 'LINEDEFS', i * 14, 'two-sided needs back', 'back=0xFFFF', 'error', 'drop map'));
    else if (L.back !== 0xffff && L.back >= ns) errors.push(ref('E_REF', 'LINEDEFS', i * 14, `sidedef < ${ns}`, `back=${L.back}`, 'error', 'drop map'));
  });
  geo.sidedefs.forEach((S, i) => {
    if (S.sector >= nsec) errors.push(ref('E_REF', 'SIDEDEFS', i * 30, `sector < ${nsec}`, `sector=${S.sector}`, 'error', 'drop map'));
    if (S.middle === null) {
      const line = geo.linedefs.find((L) => L.front === i || L.back === i);
      if (line && !(line.flags & 0x0004)) warnings.push(ref('W_GEOM', 'SIDEDEFS', i * 30, 'one-sided needs middle texture', `side ${i} blank middle`, 'warning', 'render as untextured'));
    }
  });
  geo.sectors.forEach((S, i) => {
    if (S.floorH > S.ceilH) warnings.push(ref('W_GEOM', 'SECTORS', i * 26, 'floor <= ceiling', `floor=${S.floorH} ceil=${S.ceilH}`, 'warning', 'clamp at render'));
    const used = geo.sidedefs.some((s) => s.sector === i);
    if (!used) warnings.push(ref('W_GEOM', 'SECTORS', i * 26, 'sector referenced', `sector ${i} unreferenced`, 'warning', 'keep'));
  });
  return { errors, warnings };
}

// REJECT size check (W_GEOM on mismatch); zero-length means all-zero (no reject).
export function checkReject(bytes, nsectors, map = null) {
  const want = Math.ceil((nsectors * nsectors) / 8);
  if (bytes.length === 0) return { mode: 'zero', warnings: [] };
  if (bytes.length !== want) {
    return { mode: 'mismatch', warnings: [new WadError({ code: 'W_GEOM', lump: 'REJECT', map, offset: 0, expected: `${want} bytes`, actual: `${bytes.length}`, severity: 'warning', fallback: 'treat as all-zero' })] };
  }
  if (bytes.length > 0 && bytes.every((b) => b === 0xff)) {
    return { mode: 'blind', warnings: [new WadError({ code: 'W_GEOM', lump: 'REJECT', map, offset: 0, expected: 'not all-0xFF', actual: 'all 0xFF (blind monsters)', severity: 'warning', fallback: 'treat as all-zero' })] };
  }
  return { mode: 'ok', warnings: [] };
}

// BLOCKMAP layout validation with 16-bit vs 32-bit offset heuristic (spec 3.6).
export function checkBlockmap(bytes, map = null) {
  const warnings = [];
  if (bytes.length < 8) {
    warnings.push(new WadError({ code: 'W_GEOM', lump: 'BLOCKMAP', map, offset: 0, expected: '>= 8 byte header', actual: `${bytes.length}`, severity: 'warning', fallback: 'rebuild empty' }));
    return { valid: false, wide: false, warnings };
  }
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ncols = v.getInt16(4, true), nrows = v.getInt16(6, true);
  if (ncols <= 0 || nrows <= 0 || ncols > 512 || nrows > 512) {
    warnings.push(new WadError({ code: 'W_GEOM', lump: 'BLOCKMAP', map, offset: 4, expected: 'sane grid dims', actual: `${ncols}x${nrows}`, severity: 'warning', fallback: 'rebuild empty' }));
    return { valid: false, wide: false, warnings };
  }
  const nblocks = ncols * nrows;
  let wide = false;
  if (8 + 2 * nblocks > bytes.length) wide = true; // retry as 4-byte offsets
  const stride = wide ? 4 : 2;
  if (8 + stride * nblocks > bytes.length) {
    warnings.push(new WadError({ code: 'W_GEOM', lump: 'BLOCKMAP', map, offset: 8, expected: 'offset table inside lump', actual: `nblocks=${nblocks} len=${bytes.length}`, severity: 'warning', fallback: 'rebuild empty' }));
    return { valid: false, wide, warnings };
  }
  const getOff = (i) => (wide ? v.getUint32(8 + i * 4, true) : v.getUint16(8 + i * 2, true) * 2);
  for (let i = 0; i < nblocks; i++) {
    const off = getOff(i);
    if (off >= bytes.length) { warnings.push(new WadError({ code: 'W_GEOM', lump: 'BLOCKMAP', map, offset: 8, expected: 'block offset inside lump', actual: `block ${i} off=${off}`, severity: 'warning', fallback: 'rebuild empty' })); return { valid: false, wide, warnings }; }
    if (off !== 0) {
      // Walk the blocklist: [0?, lines..., -1]; bounded scan.
      let p = off;
      let steps = 0;
      let terminated = false;
      if (p + 2 <= bytes.length && v.getInt16(p, true) === 0) p += 2;
      while (p + 2 <= bytes.length && steps < 4096) {
        const w = v.getInt16(p, true);
        p += 2; steps++;
        if (w === -1) { terminated = true; break; }
      }
      if (!terminated) { warnings.push(new WadError({ code: 'W_GEOM', lump: 'BLOCKMAP', map, offset: off, expected: '-1 terminated list', actual: `block ${i} unterminated`, severity: 'warning', fallback: 'rebuild empty' })); return { valid: false, wide, warnings }; }
    }
  }
  return { valid: true, wide, warnings };
}
