// M4 ecosystem tests: load order merge rules, WAD assembly round-trip,
// per-map isolation, DEHACKED surfacing, shareware clamp, shell states.
// Headless (node:test), no DOM.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLoadout, assembleWad, probeMaps, identifyWad, findDehacked,
  describeLoadOrder, describeDehacked, REQUIRED_MAP_LUMPS, LOADOUT_VERSION,
} from '../src/wad/loadout.js';
import {
  resolveShellState, loadingLine, emptyLoadOrderLine, droppedLines,
  ONBOARDED_KEY, SHELL_STATES,
} from '../src/ui/shellStates.js';
import { parseWadDirectory } from '../src/wad/index.js';
import { buildDemoWad } from '../tools/make-demo-wad.mjs';

const demo = () => buildDemoWad();

// A patch WAD: replaces E1M1 THINGS (moves the player start) and adds a
// global PLAYPAL override plus a DEHACKED info lump.
function buildPatchWad() {
  const base = buildLoadout([{ name: 'base.wad', bytes: demo() }]);
  const things = base.merged.find((l) => l.name === 'THINGS');
  assert.ok(things, 'demo wad carries THINGS');
  const moved = new Uint8Array(things.data);
  new DataView(moved.buffer).setInt16(0, 64, true);
  const pal = new Uint8Array(10752).fill(7);
  const deh = new TextEncoder().encode('Patch File\nDoom version = 19\n');
  const lumps = [
    { name: 'E1M1', data: new Uint8Array(0) },
    { name: 'THINGS', data: moved },
    { name: 'PLAYPAL', data: pal },
    { name: 'DEHACKED', data: deh },
  ];
  return assembleWad(lumps, 'PWAD');
}

describe('loadout version and constants', () => {
  it('pins LOADOUT_VERSION 1 and five required map lumps', () => {
    assert.equal(LOADOUT_VERSION, 1);
    assert.deepEqual([...REQUIRED_MAP_LUMPS].sort(), ['LINEDEFS', 'SECTORS', 'SIDEDEFS', 'THINGS', 'VERTEXES']);
  });
});

describe('identifyWad', () => {
  it('identifies the demo wad as doom1 with two maps', () => {
    const id = identifyWad(parseWadDirectory(demo()));
    assert.equal(id.kind, 'doom1');
    assert.deepEqual(id.maps, ['E1M1', 'E1M2']);
    assert.deepEqual(id.episodes, [1]);
    assert.equal(id.sharewareLikely, true);
  });
  it('identifies MAPxx markers as the doom2 family', () => {
    const id = identifyWad(parseWadDirectory(buildPatchWad()));
    assert.equal(id.kind, 'doom1');
    const mapxx = assembleWad([
      { name: 'MAP01', data: new Uint8Array(0) },
      { name: 'THINGS', data: new Uint8Array(10) },
    ], 'PWAD');
    const id2 = identifyWad(parseWadDirectory(mapxx));
    assert.equal(id2.kind, 'doom2');
    assert.ok(id2.familyNote.includes('MAPxx'));
  });
  it('reports unknown for a mapless wad instead of throwing', () => {
    const empty = assembleWad([{ name: 'PLAYPAL', data: new Uint8Array(10752) }], 'PWAD');
    const id = identifyWad(parseWadDirectory(empty));
    assert.equal(id.kind, 'unknown');
    assert.deepEqual(id.maps, []);
  });
});

describe('buildLoadout merge rules', () => {
  it('single file passes through with zero rejections', () => {
    const lo = buildLoadout([{ name: 'base.wad', bytes: demo() }]);
    assert.deepEqual(lo.valid, ['base.wad']);
    assert.deepEqual(lo.rejected, []);
    assert.ok(lo.merged.length > 0);
  });
  it('corrupt files isolate into rejected with E_CONTAINER', () => {
    const lo = buildLoadout([
      { name: 'base.wad', bytes: demo() },
      { name: 'junk.wad', bytes: new Uint8Array([1, 2, 3]) },
    ]);
    assert.deepEqual(lo.valid, ['base.wad']);
    assert.equal(lo.rejected.length, 1);
    assert.equal(lo.rejected[0].code, 'E_CONTAINER');
    assert.ok(lo.merged.length > 0);
  });
  it('patch map group replaces the base group, untouched maps survive', () => {
    const patch = buildPatchWad();
    const lo = buildLoadout([
      { name: 'base.wad', bytes: demo() },
      { name: 'patch.wad', bytes: patch },
    ]);
    assert.deepEqual(lo.rejected, []);
    const assembled = assembleWad(lo.merged, 'PWAD');
    const probe = probeMaps(assembled);
    assert.deepEqual(probe.viable.sort(), ['E1M1', 'E1M2']);
    // The patched E1M1 player start moved to x=64.
    const dir = parseWadDirectory(assembled);
    const e1m1 = dir.lumps.findIndex((l) => l.name === 'E1M1');
    const things = dir.lumps.slice(e1m1).find((l) => l.name === 'THINGS');
    const view = new DataView(assembled.buffer, assembled.byteOffset + things.filepos, 10);
    assert.equal(view.getInt16(0, true), 64);
  });
  it('standalone lumps apply last-wins (PLAYPAL override sticks)', () => {
    const patch = buildPatchWad();
    const lo = buildLoadout([
      { name: 'base.wad', bytes: demo() },
      { name: 'patch.wad', bytes: patch },
    ]);
    const pals = lo.merged.filter((l) => l.name === 'PLAYPAL');
    assert.equal(pals.length, 1);
    assert.equal(pals[0].source, 'patch.wad');
    assert.equal(pals[0].data[0], 7);
  });
  it('DEHACKED lumps surface from the patch, never as maps', () => {
    const lo = buildLoadout([
      { name: 'base.wad', bytes: demo() },
      { name: 'patch.wad', bytes: buildPatchWad() },
    ]);
    assert.equal(lo.dehacked.length, 1);
    assert.equal(lo.dehacked[0].name, 'DEHACKED');
    const note = describeDehacked(lo.dehacked[0]);
    assert.ok(note.includes('not applied'));
    const probe = probeMaps(assembleWad(lo.merged, 'PWAD'));
    assert.ok(!probe.viable.includes('DEHACKED'));
  });
  it('same-name re-drop replaces in place (no duplicates)', () => {
    const d = demo();
    const lo = buildLoadout([
      { name: 'base.wad', bytes: d },
      { name: 'base.wad', bytes: d },
    ]);
    const once = buildLoadout([{ name: 'base.wad', bytes: d }]);
    assert.equal(lo.merged.length, once.merged.length);
  });
});

describe('assembleWad round-trip', () => {
  it('single-file assembly parses and probes identically', () => {
    const lo = buildLoadout([{ name: 'base.wad', bytes: demo() }]);
    const out = assembleWad(lo.merged, 'PWAD');
    const dir = parseWadDirectory(out);
    assert.equal(dir.magic, 'PWAD');
    assert.equal(dir.numlumps, lo.merged.length);
    assert.deepEqual(probeMaps(out).viable.sort(), ['E1M1', 'E1M2']);
  });
  it('empty merge assembles to a valid mapless container', () => {
    const out = assembleWad([], 'PWAD');
    const dir = parseWadDirectory(out);
    assert.equal(dir.numlumps, 0);
  });
});

describe('probeMaps per-map isolation', () => {
  it('drops a corrupt map and keeps the healthy one', () => {
    const lo = buildLoadout([{ name: 'base.wad', bytes: demo() }]);
    // Corrupt every E1M2 VERTEXES byte range via a hostile patch group.
    const evilThings = new Uint8Array(10);
    const hostile = assembleWad([
      { name: 'E1M2', data: new Uint8Array(0) },
      { name: 'THINGS', data: evilThings },
      { name: 'LINEDEFS', data: new Uint8Array(0) },
    ], 'PWAD');
    const merged = buildLoadout([
      { name: 'base.wad', bytes: demo() },
      { name: 'evil.wad', bytes: hostile },
    ]);
    const probe = probeMaps(assembleWad(merged.merged, 'PWAD'));
    assert.ok(probe.viable.includes('E1M1'));
    assert.ok(probe.dropped.some((d) => d.map === 'E1M2'));
    assert.ok(!probe.viable.includes('E1M2'));
    assert.ok(lo.merged.length > 0);
  });
  it('dropped lines keep taxonomy codes for bug reports', () => {
    const lines = droppedLines([{ map: 'E1M2', code: 'E_REF', message: 'boom' }]);
    assert.equal(lines.length, 1);
    assert.ok(lines[0].includes('E1M2') && lines[0].includes('E_REF'));
    assert.deepEqual(droppedLines([]), []);
  });
});

describe('findDehacked', () => {
  it('finds nothing in the demo wad', () => {
    assert.deepEqual(findDehacked(parseWadDirectory(demo()).lumps), []);
  });
});

describe('describeLoadOrder', () => {
  it('numbers files with identity suffixes, unreadable stays honest', () => {
    const lines = describeLoadOrder([
      { name: 'base.wad', bytes: demo() },
      { name: 'junk.wad', bytes: new Uint8Array([9]) },
    ]);
    assert.ok(lines[0].startsWith('1. base.wad'));
    assert.ok(lines[0].includes('2 maps'));
    assert.ok(lines[1].includes('unreadable'));
  });
});

describe('shellStates', () => {
  it('pins the five states and the onboarded key', () => {
    assert.deepEqual([...SHELL_STATES].sort(), ['error', 'loading', 'onboarding', 'ready', 'ready-warnings']);
    assert.equal(ONBOARDED_KEY, 'doom-onboarded');
  });
  it('loading beats fatal, fatal beats onboarding', () => {
    assert.equal(resolveShellState({ loading: true, fatal: 'x' }), 'loading');
    assert.equal(resolveShellState({ fatal: 'x', seenBefore: false }), 'error');
    assert.equal(resolveShellState({ seenBefore: false }), 'onboarding');
  });
  it('returning visitors see ready, drops escalate to ready-warnings', () => {
    assert.equal(resolveShellState({ seenBefore: true }), 'ready');
    assert.equal(resolveShellState({ seenBefore: true, droppedCount: 1 }), 'ready-warnings');
  });
  it('helper lines are non-empty and honest', () => {
    assert.ok(loadingLine('doom.wad').includes('doom.wad'));
    assert.ok(emptyLoadOrderLine().includes('No custom WADs'));
  });
});
