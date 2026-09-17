// Hexen fixture: MAP01 marker + 10 Doom-format lumps + BEHAVIOR, so the
// engine must refuse with the Hexen dialect message (never misparse).
function enc8(name) {
  const b = new Uint8Array(8);
  for (let i = 0; i < Math.min(8, name.length); i++) b[i] = name.charCodeAt(i);
  return b;
}

export function buildHexenWad() {
  const order = ['THINGS', 'LINEDEFS', 'SIDEDEFS', 'VERTEXES', 'SEGS', 'SSECTORS', 'NODES', 'SECTORS', 'REJECT', 'BLOCKMAP', 'BEHAVIOR'];
  const sizes = { THINGS: 20, LINEDEFS: 16, SIDEDEFS: 30, VERTEXES: 4, SEGS: 12, SSECTORS: 4, NODES: 28, SECTORS: 26, REJECT: 1, BLOCKMAP: 10, BEHAVIOR: 16 };
  const lumps = [['MAP01', new Uint8Array(0)]];
  for (const n of order) lumps.push([n, new Uint8Array(sizes[n]).fill(n === 'BEHAVIOR' ? 65 : 0)]);
  // Valid BLOCKMAP grid so discovery reaches the BEHAVIOR check cleanly.
  const bm = lumps.find(([n]) => n === 'BLOCKMAP')[1];
  const dv = new DataView(bm.buffer);
  dv.setInt16(4, 1, true); dv.setInt16(6, 1, true);
  const n = lumps.length;
  let dataOff = 12;
  const dir = new Uint8Array(n * 16);
  const dd = new DataView(dir.buffer);
  const blobs = [];
  lumps.forEach(([name, bytes], i) => {
    dd.setInt32(i * 16, bytes.length === 0 ? 0 : dataOff, true);
    dd.setInt32(i * 16 + 4, bytes.length, true);
    enc8(name).forEach((b, k) => { dir[i * 16 + 8 + k] = b; });
    if (bytes.length > 0) { blobs.push(bytes); dataOff += bytes.length; }
  });
  const head = new Uint8Array(12);
  'PWAD'.split('').forEach((c, i) => { head[i] = c.charCodeAt(0); });
  new DataView(head.buffer).setInt32(4, n, true);
  new DataView(head.buffer).setInt32(8, dataOff, true);
  const out = new Uint8Array(dataOff + dir.length);
  out.set(head, 0);
  let o = 12;
  for (const b of blobs) { out.set(b, o); o += b.length; }
  out.set(dir, dataOff);
  return out;
}
