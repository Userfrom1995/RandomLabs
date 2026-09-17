// Extended node formats: read-first support (spec 3.5).
// Order: vanilla -> ZDBSP family (XNOD/XGLN/XGL2/XGL3 + Z-compressed) ->
// glBSP GL_* lumps -> DeePBSP V4 (detect only). Inflate is size-capped.
import { WadError } from './errors.js';

export const INFLATE_CAP = 16 << 20; // 16 MB cap on Z* node payloads

export function detectNodeFormat(nodesBytes) {
  if (nodesBytes.length < 4) return 'vanilla';
  const magic = String.fromCharCode(nodesBytes[0], nodesBytes[1], nodesBytes[2], nodesBytes[3]);
  if (magic === 'XNOD' || magic === 'XGLN' || magic === 'XGL2' || magic === 'XGL3') return magic;
  if (magic === 'ZNOD' || magic === 'ZGLN' || magic === 'ZGL2' || magic === 'ZGL3') return magic;
  return 'vanilla';
}

// Parse XNOD-style payload (after 4-byte magic): 32-bit verts + u32 children.
// Layout (ZDBSP): u32 numVerts, verts(i32 x,y)*, u32 numSubsectors, then
// subsectors (u32 count + segs...), u32 numNodes, nodes. We parse counts and
// validate ranges without full BSP ingestion (read support first; rebuild later).
export function parseXnodCounts(payload, map = null) {
  const v = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const need = (off, len, what) => {
    if (off < 0 || off + len > payload.length) {
      throw new WadError({ code: 'E_MAP', lump: 'NODES', map, offset: off, expected: `${what} inside ${payload.length} bytes`, actual: `off=${off} len=${len}`, severity: 'error', fallback: 'drop map, rebuild nodes later' });
    }
  };
  let p = 4;
  need(p, 4, 'numVerts');
  const numVerts = v.getUint32(p, true); p += 4;
  if (numVerts > 1 << 20) throw new WadError({ code: 'E_MAP', lump: 'NODES', map, offset: p - 4, expected: 'numVerts <= 1M', actual: `${numVerts}`, severity: 'error', fallback: 'drop map' });
  need(p, numVerts * 8, 'verts');
  p += numVerts * 8;
  need(p, 4, 'numSubsectors');
  const numSub = v.getUint32(p, true); p += 4;
  if (numSub > 1 << 20) throw new WadError({ code: 'E_MAP', lump: 'NODES', map, offset: p - 4, expected: 'numSubsectors <= 1M', actual: `${numSub}`, severity: 'error', fallback: 'drop map' });
  // Walk subsectors: u32 count, then count * u32 seg indices (XGL family adds
  // extra fields, so we only validate the leading counts conservatively).
  for (let i = 0; i < numSub; i++) {
    need(p, 4, 'subsector count');
    const c = v.getUint32(p, true); p += 4;
    if (c > 1 << 16) throw new WadError({ code: 'E_MAP', lump: 'NODES', map, offset: p - 4, expected: 'subsector seg count sane', actual: `${c}`, severity: 'error', fallback: 'drop map' });
    need(p, Math.min(c, 1 << 16) * 4, 'subsector segs');
    p += c * 4;
    if (p > payload.length) throw new WadError({ code: 'E_MAP', lump: 'NODES', map, offset: p, expected: 'subsector inside payload', actual: 'overrun', severity: 'error', fallback: 'drop map' });
  }
  need(p, 4, 'numNodes');
  const numNodes = v.getUint32(p, true); p += 4;
  return { format: detectNodeFormat(payload), numVerts, numSubsectors: numSub, numNodes, endOffset: p };
}

// Decompress Z* payloads with a strict output cap. inflateFn(buf) must return
// a Uint8Array (caller wires pako / CompressionStream / Wasm zlib).
export async function inflateCapped(compressed, inflateFn, map = null) {
  const out = await inflateFn(compressed);
  if (out.length > INFLATE_CAP) {
    throw new WadError({ code: 'E_MAP', lump: 'NODES', map, offset: 0, expected: `inflated <= ${INFLATE_CAP}`, actual: `${out.length}`, severity: 'error', fallback: 'drop map' });
  }
  return out;
}

// glBSP presence check: GL_VERT + GL_SEGS + GL_SSECT + GL_NODES alongside classic.
export function findGlBsp(lumps) {
  const names = new Set(lumps.map((l) => l.name));
  const need = ['GL_VERT', 'GL_SEGS', 'GL_SSECT', 'GL_NODES'];
  if (need.every((n) => names.has(n))) return { present: true, lumps: need.map((n) => lumps.find((l) => l.name === n)) };
  return { present: false, lumps: [] };
}
