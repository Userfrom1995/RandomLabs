// M4 Tester red-team suite: hostile boundary, degenerate-input, and
// containment probes for the WAD ecosystem (loadout.js) and shell states.
// Headless (node:test), no DOM. All cases pass against the M4 milestone;
// case R1 pins a CHARACTERIZATION of partial-patch cross-map borrowing
// (reviewer note on PR #366) as the M5 hostile-fuzz tightening target.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLoadout, assembleWad, probeMaps, identifyWad, findDehacked,
  describeLoadOrder,
} from '../src/wad/loadout.js';
import { resolveShellState, droppedLines, SHELL_STATES } from '../src/ui/shellStates.js';
import { parseWadDirectory } from '../src/wad/index.js';
import { buildDemoWad } from '../tools/make-demo-wad.mjs';

const demo = () => buildDemoWad();

describe('R1 partial-patch isolation characterization (M5 tightening target)', () => {
  it('THINGS-only patch group never crashes and never kills the healthy map', () => {
    // A patch whose E1M2 group carries only THINGS replaces the whole base
    // E1M2 group per the drop-order merge rule. probeMaps currently heals
    // the missing geometry via the global byName fallback (borrowing E1M1
    // lumps), so E1M2 still probes viable. M5 must decide: strict per-group
    // scoping (E1M2 drops with E_MAP) vs documented borrowing. Either way
    // this pin catches regressions in the containment envelope.
    const partial = assembleWad([
      { name: 'E1M2', data: new Uint8Array(0) },
      { name: 'THINGS', data: new Uint8Array(10) },
    ], 'PWAD');
    const lo = buildLoadout([
      { name: 'base.wad', bytes: demo() },
      { name: 'partial.wad', bytes: partial },
    ]);
    assert.deepEqual(lo.rejected, []);
    const out = assembleWad(lo.merged, 'PWAD');
    assert.doesNotThrow(() => parseWadDirectory(out));
    const probe = probeMaps(out);
    assert.ok(probe.viable.includes('E1M1'), 'healthy map always survives a partial patch');
    for (const d of probe.dropped) {
      assert.ok(typeof d.code === 'string' && d.code.length > 0, 'every drop carries a taxonomy code');
    }
    // Viable set is always a subset of discovered maps: no phantom maps.
    const id = identifyWad(parseWadDirectory(out));
    for (const v of probe.viable) assert.ok(id.maps.includes(v), `viable ${v} is a discovered map`);
  });
});

describe('R2 hostile container inputs isolate with E_CONTAINER', () => {
  for (const [label, bytes] of [
    ['empty', new Uint8Array(0)],
    ['truncated-header', new Uint8Array([73, 87, 65, 68])],
    ['noise', new Uint8Array(4096).fill(255)],
    ['three-bytes', new Uint8Array([1, 2, 3])],
  ]) {
    it(`${label} rejects with E_CONTAINER and the base map set survives`, () => {
      const lo = buildLoadout([
        { name: 'base.wad', bytes: demo() },
        { name: `${label}.wad`, bytes },
      ]);
      assert.deepEqual(lo.valid, ['base.wad']);
      assert.equal(lo.rejected.length, 1);
      assert.equal(lo.rejected[0].code, 'E_CONTAINER');
      const probe = probeMaps(assembleWad(lo.merged, 'PWAD'));
      assert.deepEqual(probe.viable.sort(), ['E1M1', 'E1M2']);
    });
  }
  it('all-files-rejected still assembles to a valid mapless container', () => {
    const lo = buildLoadout([{ name: 'junk.wad', bytes: new Uint8Array([9]) }]);
    assert.deepEqual(lo.valid, []);
    assert.equal(lo.rejected.length, 1);
    const out = assembleWad(lo.merged, 'PWAD');
    assert.equal(parseWadDirectory(out).numlumps, 0);
  });
});

describe('R3 probeMaps contract on raw non-WAD bytes', () => {
  it('throws E_CONTAINER instead of corrupting state (callers must wrap; app.js ingest/removeWad do)', () => {
    assert.throws(
      () => probeMaps(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])),
      (e) => e && e.code === 'E_CONTAINER',
    );
  });
});

describe('R4 degenerate shell-state facts never throw and stay in the five-state set', () => {
  for (const facts of [
    undefined, null, {}, { loading: false, fatal: '', seenBefore: false, droppedCount: 999 },
    { seenBefore: true, droppedCount: -1 }, { loading: 0, fatal: 0, seenBefore: 1 },
  ]) {
    it(`facts ${JSON.stringify(facts)} resolve inside SHELL_STATES`, () => {
      const state = resolveShellState(facts);
      assert.ok(SHELL_STATES.includes(state), `${state} is a pinned shell state`);
    });
  }
});

describe('R5 multi-file last-wins and identity edges', () => {
  it('three-file PLAYPAL chain collapses to one lump from the last file', () => {
    const pal = (v) => assembleWad([{ name: 'PLAYPAL', data: new Uint8Array(64).fill(v) }], 'PWAD');
    const lo = buildLoadout([
      { name: 'a.wad', bytes: pal(1) },
      { name: 'b.wad', bytes: pal(2) },
      { name: 'c.wad', bytes: pal(3) },
    ]);
    const pals = lo.merged.filter((l) => l.name === 'PLAYPAL');
    assert.equal(pals.length, 1);
    assert.equal(pals[0].source, 'c.wad');
    assert.equal(pals[0].data[0], 3);
  });
  it('mixed E1M1+MAP01 markers identify as mixed, never crash', () => {
    const mixed = assembleWad([
      { name: 'E1M1', data: new Uint8Array(0) },
      { name: 'THINGS', data: new Uint8Array(10) },
      { name: 'MAP01', data: new Uint8Array(0) },
      { name: 'THINGS', data: new Uint8Array(10) },
    ], 'PWAD');
    assert.equal(identifyWad(parseWadDirectory(mixed)).kind, 'mixed');
  });
  it('demo wad carries no DEHACKED; helper lines stay honest on degenerate input', () => {
    assert.deepEqual(findDehacked(parseWadDirectory(demo()).lumps), []);
    assert.deepEqual(droppedLines(undefined), []);
    assert.doesNotThrow(() => droppedLines([{ code: 'E_MAP' }]));
    const lines = describeLoadOrder([{ name: 'x.wad' }]);
    assert.ok(lines[0].includes('unreadable'));
  });
  it('assembleWad tolerates a dataless lump descriptor', () => {
    const out = assembleWad([{ name: 'FOO' }], 'PWAD');
    assert.equal(parseWadDirectory(out).numlumps, 1);
  });
});

describe('R6 soak: repeated merge-assemble-probe stays stable', () => {
  it('500 cold iterations complete without throw or viable-set drift', () => {
    const t0 = Date.now();
    for (let i = 0; i < 500; i++) {
      const lo = buildLoadout([{ name: 'base.wad', bytes: demo() }]);
      const probe = probeMaps(assembleWad(lo.merged, 'PWAD'));
      assert.deepEqual(probe.viable.sort(), ['E1M1', 'E1M2']);
    }
    const dt = Date.now() - t0;
    assert.ok(dt < 60000, `500 iterations in ${dt}ms (under 60s budget)`);
  });
});
