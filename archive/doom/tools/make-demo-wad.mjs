// Demo WAD generator: builds a minimal but spec-valid PWAD in memory so the
// M1 app boots and plays instantly with zero network. Layout: one rectangular
// room (E1M1 marker + 10-lump order), player start + one imp, PLAYPAL +
// COLORMAP + PNAMES + TEXTURE1, plus a second map E1M2 (empty room) to prove
// multi-map discovery. Real WADs (shareware DOOM1.WAD) load via picker/drop
// and overlay through the same parser.
function enc8(name) {
  const b = new Uint8Array(8);
  for (let i = 0; i < Math.min(8, name.length); i++) b[i] = name.charCodeAt(i);
  return b;
}

function concat(parts) {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

function roomLumps(x0, y0, x1, y1, playerAngle = 90) {
  const v = new Uint8Array(4 * 4);
  const dv = new DataView(v.buffer);
  const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  pts.forEach(([x, y], i) => { dv.setInt16(i * 4, x, true); dv.setInt16(i * 4 + 2, y, true); });
  // THINGS: player 1 start + imp (type 3001).
  const th = new Uint8Array(2 * 10);
  const dt = new DataView(th.buffer);
  dt.setInt16(0, (x0 + x1) >> 1, true); dt.setInt16(2, (y0 + y1) >> 1, true);
  dt.setInt16(4, playerAngle, true); dt.setUint16(6, 1, true); dt.setUint16(8, 0x0007, true);
  dt.setInt16(10, x1 - 32, true); dt.setInt16(12, y1 - 32, true);
  dt.setInt16(14, 180, true); dt.setUint16(16, 3001, true); dt.setUint16(18, 0x0007, true);
  // LINEDEFS: 4 one-sided walls.
  const ld = new Uint8Array(4 * 14);
  const dl = new DataView(ld.buffer);
  for (let i = 0; i < 4; i++) {
    const o = i * 14;
    dl.setUint16(o, i, true); dl.setUint16(o + 2, (i + 1) % 4, true);
    dl.setUint16(o + 4, 0x0001, true); dl.setUint16(o + 6, 0, true); dl.setUint16(o + 8, 0, true);
    dl.setUint16(o + 10, i, true); dl.setUint16(o + 12, 0xffff, true);
  }
  // SIDEDEFS: 4 sides on sector 0, mid texture BIGDOOR1 placeholder name.
  const sd = new Uint8Array(4 * 30);
  const dsd = new DataView(sd.buffer);
  for (let i = 0; i < 4; i++) {
    const o = i * 30;
    dsd.setInt16(o, 0, true); dsd.setInt16(o + 2, 0, true);
    enc8('-').forEach((b, k) => { sd[o + 4 + k] = b; });
    enc8('-').forEach((b, k) => { sd[o + 12 + k] = b; });
    enc8('STARTAN3').forEach((b, k) => { sd[o + 20 + k] = b; });
    dsd.setUint16(o + 28, 0, true);
  }
  // SECTORS: one sector, floor 0 / ceil 128, light 192.
  const sc = new Uint8Array(26);
  const dsc = new DataView(sc.buffer);
  dsc.setInt16(0, 0, true); dsc.setInt16(2, 128, true);
  enc8('FLOOR4_8').forEach((b, k) => { sc[4 + k] = b; });
  enc8('CEIL3_5').forEach((b, k) => { sc[12 + k] = b; });
  dsc.setInt16(20, 192, true); dsc.setUint16(22, 0, true); dsc.setUint16(24, 0, true);
  // SEGS/SSECTORS/NODES: minimal consistent chain (1 seg, 1 subsector, 1 node).
  const sg = new Uint8Array(12);
  const dsg = new DataView(sg.buffer);
  dsg.setUint16(0, 0, true); dsg.setUint16(2, 1, true); dsg.setInt16(4, 0, true);
  dsg.setUint16(6, 0, true); dsg.setUint16(8, 0, true); dsg.setUint16(10, 0, true);
  const ss = new Uint8Array(4);
  const dss = new DataView(ss.buffer);
  dss.setUint16(0, 1, true); dss.setUint16(2, 0, true);
  const nd = new Uint8Array(28);
  const dnd = new DataView(nd.buffer);
  dnd.setInt16(0, 0, true); dnd.setInt16(2, 0, true); dnd.setInt16(4, 256, true); dnd.setInt16(6, 0, true);
  for (let k = 0; k < 8; k++) { dnd.setInt16(8 + k * 2, 0, true); }
  dnd.setUint16(24, 0x8000, true); dnd.setUint16(26, 0x8000, true);
  const rj = new Uint8Array(1); // 1 sector -> 1 byte
  const bm = new Uint8Array(8 + 2 + 4);
  const dbm = new DataView(bm.buffer);
  dbm.setInt16(0, x0, true); dbm.setInt16(2, y0, true);
  dbm.setInt16(4, 1, true); dbm.setInt16(6, 1, true);
  dbm.setUint16(8, 0, true); dbm.setUint16(10, 0, true);
  dbm.setInt16(12, -1, true);
  return { VERTEXES: v, THINGS: th, LINEDEFS: ld, SIDEDEFS: sd, SECTORS: sc, SEGS: sg, SSECTORS: ss, NODES: nd, REJECT: rj, BLOCKMAP: bm };
}

function playpal() {
  // 14 palettes: palette 0 is a Doom-ish ramp (dark browns to grays); others
  // derived by red/gold/green tint shift like the real pain/pickup ramps.
  const out = new Uint8Array(10752);
  for (let p = 0; p < 14; p++) {
    for (let i = 0; i < 256; i++) {
      const v = Math.min(255, Math.round((i / 255) * 220 + 12));
      let r = v, g = Math.round(v * 0.82), b = Math.round(v * 0.66);
      if (p >= 1 && p <= 8) { r = 255; g = Math.round(v * 0.3); b = Math.round(v * 0.25); }
      else if (p >= 10 && p <= 12) { r = Math.min(255, v + 60); g = Math.min(255, v + 30); b = Math.round(v * 0.4); }
      else if (p === 13) { r = Math.round(v * 0.4); g = 220; b = Math.round(v * 0.45); }
      out[(p * 256 + i) * 3] = r; out[(p * 256 + i) * 3 + 1] = g; out[(p * 256 + i) * 3 + 2] = b;
    }
  }
  return out;
}

function colormap() {
  const out = new Uint8Array(8704);
  for (let t = 0; t < 34; t++) {
    for (let i = 0; i < 256; i++) {
      let v;
      if (t <= 31) v = Math.max(0, Math.min(255, Math.round(i - t * 6)));
      else if (t === 32) v = 0;
      else v = Math.round(i * 0.299 + i * 0.587 + i * 0.114 > 128 ? 200 : 60);
      out[t * 256 + i] = v;
    }
  }
  return out;
}

function pnames() {
  const out = new Uint8Array(4 + 8);
  new DataView(out.buffer).setUint32(0, 1, true);
  enc8('STARTAN3').forEach((b, k) => { out[4 + k] = b; });
  return out;
}

function texture1() {
  // 1 texture STARTAN3 64x64 with 1 patch.
  const out = new Uint8Array(4 + 4 + 22 + 10);
  const d = new DataView(out.buffer);
  d.setUint32(0, 1, true);
  d.setInt32(4, 8, true);
  const o = 8;
  enc8('STARTAN3').forEach((b, k) => { out[o + k] = b; });
  d.setUint16(o + 12, 64, true); d.setUint16(o + 14, 64, true);
  d.setUint16(o + 20, 1, true);
  d.setInt16(o + 22, 0, true); d.setInt16(o + 24, 0, true); d.setUint16(o + 26, 0, true);
  return out;
}

export function buildDemoWad() {
  const lumps = []; // [name, bytes]
  const push = (name, bytes) => lumps.push([name, bytes]);
  const room1 = roomLumps(-128, -128, 128, 128);
  push('E1M1', new Uint8Array(0));
  for (const n of ['THINGS', 'LINEDEFS', 'SIDEDEFS', 'VERTEXES', 'SEGS', 'SSECTORS', 'NODES', 'SECTORS', 'REJECT', 'BLOCKMAP']) push(n, room1[n]);
  const room2 = roomLumps(-256, -256, 256, 256, 0);
  push('E1M2', new Uint8Array(0));
  for (const n of ['THINGS', 'LINEDEFS', 'SIDEDEFS', 'VERTEXES', 'SEGS', 'SSECTORS', 'NODES', 'SECTORS', 'REJECT', 'BLOCKMAP']) push(n, room2[n]);
  push('PLAYPAL', playpal());
  push('COLORMAP', colormap());
  push('PNAMES', pnames());
  push('TEXTURE1', texture1());
  push('ENDOOM', new Uint8Array(4000).fill(32));

  const n = lumps.length;
  const dirSize = n * 16;
  let dataOff = 12;
  const dir = new Uint8Array(dirSize);
  const dd = new DataView(dir.buffer);
  const blobs = [];
  lumps.forEach(([name, bytes], i) => {
    dd.setInt32(i * 16, bytes.length === 0 ? 0 : dataOff, true);
    dd.setInt32(i * 16 + 4, bytes.length, true);
    enc8(name).forEach((b, k) => { dir[i * 16 + 8 + k] = b; });
    if (bytes.length > 0) { blobs.push(bytes); dataOff += bytes.length; }
  });
  const head = new Uint8Array(12);
  const dh = new DataView(head.buffer);
  'PWAD'.split('').forEach((c, i) => { head[i] = c.charCodeAt(0); });
  dh.setInt32(4, n, true);
  dh.setInt32(8, dataOff, true);
  return concat([head, ...blobs, dir]);
}
