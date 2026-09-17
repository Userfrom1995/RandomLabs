// M1 WAD tests (node:test, no browser): golden demo WAD, truncation taxonomy,
// texture compose, Hexen detect, extNodes, demo-WAD determinism.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoWad } from '../tools/make-demo-wad.mjs';
import {
  parseWadDirectory, lumpBytes, discoverMaps, episodeClamp,
  decodeVertexes, decodeThings, decodeLinedefs, decodeSidedefs, decodeSectors,
  resolveRefs, checkReject, checkBlockmap, decodePnames, decodeTextureLump,
  composeTexture, decodePicture, checkPlaypal, checkColormap, detectHexen,
  detectNodeFormat, parseXnodCounts, findGlBsp, WadError,
} from '../src/wad/index.js';

function roomBytes() { return buildDemoWad(); }

describe('golden demo WAD', () => {
  it('parses header and directory', () => {
    const wad = roomBytes();
    const dir = parseWadDirectory(wad);
    assert.equal(dir.magic, 'PWAD');
    assert.ok(dir.numlumps > 20);
    assert.equal(dir.lumps.length, dir.numlumps);
  });
  it('discovers E1M1 and E1M2 with full lump order', () => {
    const dir = parseWadDirectory(roomBytes());
    const maps = discoverMaps(dir.lumps);
    assert.deepEqual(maps.map((m) => m.map), ['E1M1', 'E1M2']);
    for (const m of maps) {
      assert.equal(m.partial, false);
      for (const n of ['THINGS', 'LINEDEFS', 'SIDEDEFS', 'VERTEXES', 'SEGS', 'SSECTORS', 'NODES', 'SECTORS', 'REJECT', 'BLOCKMAP']) {
        assert.ok(m.entries[n], `${m.map} missing ${n}`);
      }
    }
  });
  it('decodes E1M1 geometry with zero ref errors', () => {
    const wad = roomBytes();
    const dir = parseWadDirectory(wad);
    const m = discoverMaps(dir.lumps)[0];
    const B = (n) => lumpBytes(wad, m.entries[n]);
    const geo = {
      vertexes: decodeVertexes(B('VERTEXES'), 'E1M1'),
      things: decodeThings(B('THINGS'), false, 'E1M1'),
      linedefs: decodeLinedefs(B('LINEDEFS'), false, 'E1M1'),
      sidedefs: decodeSidedefs(B('SIDEDEFS'), 'E1M1'),
      sectors: decodeSectors(B('SECTORS'), 'E1M1'),
    };
    assert.equal(geo.vertexes.length, 4);
    assert.equal(geo.things.length, 2);
    assert.equal(geo.things[0].type, 1);
    assert.equal(geo.linedefs.length, 4);
    const { errors } = resolveRefs(geo, 'E1M1');
    assert.deepEqual(errors, []);
  });
  it('episode clamp reports shareware-like single episode for demo', () => {
    const dir = parseWadDirectory(roomBytes());
    const maps = discoverMaps(dir.lumps);
    const clamp = episodeClamp(maps);
    assert.deepEqual(clamp.episodes, [1]);
  });
  it('PLAYPAL/COLORMAP sizes validate; PNAMES/TEXTURE1 decode', () => {
    const wad = roomBytes();
    const dir = parseWadDirectory(wad);
    const byName = new Map(dir.lumps.map((l) => [l.name, l]));
    checkPlaypal(lumpBytes(wad, byName.get('PLAYPAL')));
    checkColormap(lumpBytes(wad, byName.get('COLORMAP')));
    assert.deepEqual(decodePnames(lumpBytes(wad, byName.get('PNAMES'))), ['STARTAN3']);
    const tex = decodeTextureLump(lumpBytes(wad, byName.get('TEXTURE1')));
    assert.ok(tex.has('STARTAN3'));
    assert.equal(tex.get('STARTAN3').width, 64);
  });
  it('demo WAD build is byte-deterministic', () => {
    const a = roomBytes(), b = roomBytes();
    assert.equal(a.length, b.length);
    assert.deepEqual(a, b);
  });
});

describe('truncation taxonomy', () => {
  it('bad magic throws E_CONTAINER', () => {
    const wad = roomBytes();
    wad[0] = 88;
    assert.throws(() => parseWadDirectory(wad), (e) => e.code === 'E_CONTAINER');
  });
  it('truncated directory throws E_CONTAINER', () => {
    const wad = roomBytes().subarray(0, 40);
    assert.throws(() => parseWadDirectory(wad), (e) => e.code === 'E_CONTAINER');
  });
  it('record size mismatch throws E_MAP', () => {
    assert.throws(() => decodeVertexes(new Uint8Array(5), 'E1M1'), (e) => e.code === 'E_MAP');
    assert.throws(() => decodeLinedefs(new Uint8Array(13), 'E1M1'), (e) => e.code === 'E_MAP');
  });
  it('front 0xFFFF is E_REF', () => {
    const wad = roomBytes();
    const dir = parseWadDirectory(wad);
    const m = discoverMaps(dir.lumps)[0];
    const B = (n) => lumpBytes(wad, m.entries[n]);
    const geo = {
      vertexes: decodeVertexes(B('VERTEXES'), 'E1M1'),
      things: decodeThings(B('THINGS'), false, 'E1M1'),
      linedefs: decodeLinedefs(B('LINEDEFS'), false, 'E1M1'),
      sidedefs: decodeSidedefs(B('SIDEDEFS'), 'E1M1'),
      sectors: decodeSectors(B('SECTORS'), 'E1M1'),
    };
    geo.linedefs[0].front = 0xffff;
    const { errors } = resolveRefs(geo, 'E1M1');
    assert.ok(errors.some((e) => e.code === 'E_REF'));
  });
  it('zero-length linedef is W_GEOM warning', () => {
    const wad = roomBytes();
    const dir = parseWadDirectory(wad);
    const m = discoverMaps(dir.lumps)[0];
    const B = (n) => lumpBytes(wad, m.entries[n]);
    const geo = {
      vertexes: decodeVertexes(B('VERTEXES'), 'E1M1'),
      things: decodeThings(B('THINGS'), false, 'E1M1'),
      linedefs: decodeLinedefs(B('LINEDEFS'), false, 'E1M1'),
      sidedefs: decodeSidedefs(B('SIDEDEFS'), 'E1M1'),
      sectors: decodeSectors(B('SECTORS'), 'E1M1'),
    };
    geo.linedefs[0].v1 = geo.linedefs[0].v0;
    const { warnings } = resolveRefs(geo, 'E1M1');
    assert.ok(warnings.some((e) => e.code === 'W_GEOM'));
  });
  it('REJECT mismatch and BLOCKMAP garbage warn, not throw', () => {
    const r = checkReject(new Uint8Array([1, 2, 3]), 4, 'E1M1');
    assert.ok(r.warnings.length > 0);
    const b = checkBlockmap(new Uint8Array([0, 0, 0]), 'E1M1');
    assert.equal(b.valid, false);
  });
  it('BAD PLAYPAL size throws W_MEDIA', () => {
    assert.throws(() => checkPlaypal(new Uint8Array(100)), (e) => e.code === 'W_MEDIA');
  });
});

describe('textures and pictures', () => {
  it('composeTexture order-blits one patch over 64x64', () => {
    const pic = { w: 4, h: 4, data: new Uint8Array(16).fill(7) };
    const buf = composeTexture({ width: 64, height: 64, patches: [{ ox: 1, oy: 2, index: 0 }] }, [pic]);
    assert.equal(buf.length, 4096);
    assert.equal(buf[2 * 64 + 1], 7);
    assert.equal(buf[0], 255);
  });
  it('composeTexture later patch overwrites earlier', () => {
    const a = { w: 2, h: 2, data: new Uint8Array([1, 1, 1, 1]) };
    const b = { w: 2, h: 2, data: new Uint8Array([2, 2, 2, 2]) };
    const buf = composeTexture({ width: 4, height: 4, patches: [{ ox: 0, oy: 0, index: 0 }, { ox: 0, oy: 0, index: 1 }] }, [a, b]);
    assert.equal(buf[0], 2);
  });
  it('decodePicture rejects truncated column table with W_MEDIA', () => {
    assert.throws(() => decodePicture(new Uint8Array([8, 0, 8, 0, 0, 0, 0, 0, 1, 2])), (e) => e.code === 'W_MEDIA');
  });
});

describe('hexen and ext nodes', () => {
  it('BEHAVIOR presence reports Hexen dialect', () => {
    const r = detectHexen({ map: 'MAP01', entries: { BEHAVIOR: {} } });
    assert.equal(r.hexen, true);
    assert.match(r.message, /Hexen dialect/);
    const r2 = detectHexen({ map: 'E1M1', entries: {} });
    assert.equal(r2.hexen, false);
  });
  it('detectNodeFormat classifies vanilla vs XNOD family', () => {
    assert.equal(detectNodeFormat(new Uint8Array([0, 0, 0, 0])), 'vanilla');
    assert.equal(detectNodeFormat(new Uint8Array([88, 78, 79, 68, 0])), 'XNOD');
    assert.equal(detectNodeFormat(new Uint8Array([90, 78, 79, 68, 0])), 'ZNOD');
  });
  it('parseXnodCounts validates counts and rejects overruns', () => {
    const payload = new Uint8Array(4 + 4 + 8 + 4 + 4);
    payload.set([88, 78, 79, 68]);
    new DataView(payload.buffer).setUint32(4, 1, true);
    new DataView(payload.buffer).setUint32(16, 0, true);
    const c = parseXnodCounts(payload, 'MAP01');
    assert.equal(c.numVerts, 1);
    assert.throws(() => parseXnodCounts(new Uint8Array([88, 78, 79, 68, 255, 255, 255, 255]), 'MAP01'), (e) => e.code === 'E_MAP');
  });
  it('findGlBsp detects the four-lump set', () => {
    const lumps = ['GL_VERT', 'GL_SEGS', 'GL_SSECT', 'GL_NODES'].map((name) => ({ name }));
    assert.equal(findGlBsp(lumps).present, true);
    assert.equal(findGlBsp([{ name: 'GL_VERT' }]).present, false);
  });
});
