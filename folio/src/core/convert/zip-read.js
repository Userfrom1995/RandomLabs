// Folio minimal ZIP reader (V4 fallback path): parses the central directory
// of PK ZIP archives so Office files can be read without dependencies.
//
// Our own writers emit store-only (method 0) entries, which extract
// synchronously via extractStore. Real-world Office files use deflate
// (method 8): those entries are listed with needsInflate=true and inflated
// through an injected async inflater (Node: zlib.inflateRawSync wrapped in
// a promise; browser: DecompressionStream('deflate-raw')). Injection keeps
// this module pure and headless-testable.
export function unzipList(bytes) {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (u.length < 22) throw new Error("not a ZIP (too short)");
  // Find end-of-central-directory (scan last 64KB + 22).
  let eocd = -1;
  const start = Math.max(0, u.length - 65557 - 22);
  for (let i = u.length - 22; i >= start; i--) {
    if (u[i] === 0x50 && u[i + 1] === 0x4b && u[i + 2] === 0x05 && u[i + 3] === 0x06) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a ZIP (EOCD missing)");
  const count = u[eocd + 10] | (u[eocd + 11] << 8);
  const cdOff = u[eocd + 16] | (u[eocd + 17] << 8) | (u[eocd + 18] << 16) | (u[eocd + 19] << 24);
  const entries = [];
  let o = cdOff >>> 0;
  const td = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (u[o] !== 0x50 || u[o + 1] !== 0x4b || u[o + 2] !== 0x01 || u[o + 3] !== 0x02) {
      throw new Error("ZIP central directory corrupt at entry " + i);
    }
    const method = u[o + 10] | (u[o + 11] << 8);
    const crc = (u[o + 16] | (u[o + 17] << 8) | (u[o + 18] << 16) | (u[o + 19] << 24)) >>> 0;
    const compSize = (u[o + 20] | (u[o + 21] << 8) | (u[o + 22] << 16) | (u[o + 23] << 24)) >>> 0;
    const size = (u[o + 24] | (u[o + 25] << 8) | (u[o + 26] << 16) | (u[o + 27] << 24)) >>> 0;
    const nameLen = u[o + 28] | (u[o + 29] << 8);
    const extraLen = u[o + 30] | (u[o + 31] << 8);
    const commentLen = u[o + 32] | (u[o + 33] << 8);
    const localOff = (u[o + 42] | (u[o + 43] << 8) | (u[o + 44] << 16) | (u[o + 45] << 24)) >>> 0;
    const name = td.decode(u.slice(o + 46, o + 46 + nameLen));
    entries.push({ name, method, crc, compSize, size, localOff, needsInflate: method === 8 });
    o += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function localDataRange(u, localOff) {
  if (u[localOff] !== 0x50 || u[localOff + 1] !== 0x4b || u[localOff + 2] !== 0x03 || u[localOff + 3] !== 0x04) {
    throw new Error("ZIP local header missing at " + localOff);
  }
  const nameLen = u[localOff + 26] | (u[localOff + 27] << 8);
  const extraLen = u[localOff + 28] | (u[localOff + 29] << 8);
  const dataOff = localOff + 30 + nameLen + extraLen;
  return dataOff;
}

// Synchronous extraction for stored (method 0) entries only.
export function extractStore(bytes, entry) {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (entry.method !== 0) throw new Error("entry " + entry.name + " needs inflate (method " + entry.method + ")");
  const dataOff = localDataRange(u, entry.localOff);
  return u.slice(dataOff, dataOff + entry.compSize);
}

// Build a name->bytes map for stored entries (our own writers roundtrip).
export function unzipStores(bytes) {
  const out = {};
  for (const e of unzipList(bytes)) {
    if (e.method === 0 && !e.name.endsWith("/")) out[e.name] = extractStore(bytes, e);
  }
  return out;
}

// Async full extraction: stored entries sync, deflated via inflater(compBytes)
// which must resolve to the raw inflated bytes. Returns name->Uint8Array.
export async function unzipAll(bytes, inflater) {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const out = {};
  for (const e of unzipList(u)) {
    if (e.name.endsWith("/")) continue;
    if (e.method === 0) {
      out[e.name] = extractStore(u, e);
    } else if (e.method === 8) {
      if (!inflater) throw new Error("entry " + e.name + " is deflated; no inflater provided");
      const dataOff = localDataRange(u, e.localOff);
      const comp = u.slice(dataOff, dataOff + e.compSize);
      const raw = await inflater(comp);
      out[e.name] = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
    } else {
      throw new Error("entry " + e.name + " uses unsupported method " + e.method);
    }
  }
  return out;
}
