// Folio M3 minimal ZIP (pure): stored-entry writer for generated Office
// files plus a stored/deflate reader for parsing them back. Real PKZIP
// structures (no compression on write; CRC32 per spec). Deflate reads use
// an injected inflate(raw) -> Promise<Uint8Array> so the same module runs
// in browsers (DecompressionStream) and node (zlib) with zero deps.

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;

export function crc32(bytes) {
  let table = crc32._t;
  if (!table) {
    table = crc32._t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function u16(v) {
  return [v & 0xff, (v >>> 8) & 0xff];
}
function u32(v) {
  return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
}
function rd16(b, o) {
  return b[o] | (b[o + 1] << 8);
}
function rd32(b, o) {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

// files: [{name, data: Uint8Array|string}]. Stored (method 0), valid for
// every OOXML reader (Word/Excel/LibreOffice accept stored entries).
export function buildZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const nameB = enc.encode(f.name);
    const data = typeof f.data === "string" ? enc.encode(f.data) : f.data;
    const crc = crc32(data);
    const lh = [...u32(SIG_LOCAL), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameB.length), ...u16(0)];
    chunks.push(new Uint8Array(lh), nameB, data);
    central.push({ nameB, crc, len: data.length, offset });
    offset += lh.length + nameB.length + data.length;
  }
  const cdir = [];
  let csize = 0;
  for (const c of central) {
    const e = [...u32(SIG_CENTRAL), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0), ...u32(c.crc), ...u32(c.len), ...u32(c.len), ...u16(c.nameB.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(c.offset)];
    cdir.push(new Uint8Array(e), c.nameB);
    csize += e.length + c.nameB.length;
  }
  const end = [...u32(SIG_EOCD), ...u16(0), ...u16(0), ...u16(central.length), ...u16(central.length), ...u32(csize), ...u32(offset), ...u16(0)];
  const total = offset + csize + end.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of [...chunks, ...cdir, new Uint8Array(end)]) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}

// inflate: async (rawBytes) => Uint8Array (raw deflate stream).
export async function parseZip(bytes, inflate) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  // Locate EOCD (no archive comment support on write; scan last 64KB).
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65558); i--) {
    if (rd32(b, i) === SIG_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip (EOCD missing)");
  const count = rd16(b, eocd + 10);
  let co = rd32(b, eocd + 16);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (rd32(b, co) !== SIG_CENTRAL) throw new Error("bad central dir");
    const method = rd16(b, co + 10);
    const flags = rd16(b, co + 8);
    const compLen = rd32(b, co + 24);
    const nameLen = rd16(b, co + 28);
    const extraLen = rd16(b, co + 30);
    const commentLen = rd16(b, co + 32);
    const lhOff = rd32(b, co + 42);
    const name = new TextDecoder().decode(b.slice(co + 46, co + 46 + nameLen));
    if (rd32(b, lhOff) !== SIG_LOCAL) throw new Error("bad local header");
    const lhName = rd16(b, lhOff + 26);
    const lhExtra = rd16(b, lhOff + 28);
    const dataOff = lhOff + 30 + lhName + lhExtra;
    const comp = b.slice(dataOff, dataOff + compLen);
    if (flags & 0x08) throw new Error("data-descriptor zips unsupported: " + name);
    let data;
    if (method === 0) data = comp.slice();
    else if (method === 8) {
      if (!inflate) throw new Error("deflated entry needs inflate: " + name);
      data = await inflate(comp);
    } else throw new Error("unsupported method " + method + ": " + name);
    out.push({ name, data });
    co += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

export function decodeUtf8(b) {
  return dec.decode(b);
}
