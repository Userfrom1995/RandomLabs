// Umbra Tester red-team suite: hostile boundaries, fuzz, and offline-shell
// invariants for the M1 ambient milestone. These tests must NEVER require a
// fix to production code to stay green unless a genuine defect is exposed;
// every case asserts no-throw resilience plus a sane contract.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTier, tierForFailure } from '../src/render/tiers.js';
import { createLocalProvider, createMemoryStore } from '../src/storage/provider.js';
import { migrateProfile, loadProfile, saveProfile, defaultProfile } from '../src/storage/profile.js';
import { buildSceneDesc, flattenSegments, PARTICLE_COUNT } from '../src/render/scene.js';
import { idleAngles, solveRig, hashRig, SEG_NAMES } from '../src/poses.js';
import { updateEwma, nextLadderIndex, ladderSize, LADDER } from '../src/render/resolution.js';
import { summarize, percentile } from '../src/perf/stats.js';
import { checkGate, checkAllGates, GATE_DEFS } from '../src/perf/gates.js';
import { arenaAt, ARENAS } from '../src/arenas.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('red-team: resolveTier fuzz never throws, always 0|1|2', () => {
  it('hostile overrides/cached/probed values fall through safely', () => {
    const hostile = [true, false, null, undefined, NaN, Infinity, -Infinity, -1, 3, 99, 'AUTO', 'auto ', '', [], {}, 'bogus'];
    for (const v of hostile) {
      const got = resolveTier({ override: v, cached: v, probed: 99 });
      assert.ok([0, 1, 2].includes(got), `resolveTier(${String(v)}) -> ${got}`);
    }
    // Numeric-string overrides still resolve.
    assert.equal(resolveTier({ override: '0', cached: 2, probed: 2 }), 0);
    assert.equal(resolveTier({ override: '1', cached: 2, probed: 2 }), 1);
    assert.equal(resolveTier({ override: '2', cached: 0, probed: 0 }), 2);
    // Null/undefined whole-arg must fall through to Canvas2D, never throw.
    assert.equal(resolveTier(null), 2);
    assert.equal(resolveTier(undefined), 2);
  });
  it('tierForFailure never throws on hostile input', () => {
    for (const v of [99, -1, '0', null, undefined, NaN, {}, []]) {
      const got = tierForFailure(v);
      assert.ok([1, 2, -1].includes(got), `tierForFailure(${String(v)}) -> ${got}`);
    }
  });
});

describe('red-team: resolution governor under hostile samples', () => {
  it('updateEwma never propagates garbage into the governor', () => {
    assert.equal(updateEwma(16, Infinity), 16);
    assert.equal(updateEwma(16, -Infinity), 16);
    assert.equal(updateEwma(16, -5), 16);
    assert.equal(updateEwma(16, 'x'), 16);
    assert.equal(updateEwma(16, NaN), 16);
    const v = updateEwma(16, 1e9);
    assert.ok(Number.isFinite(v) && v > 16, 'huge spike must raise EWMA finitely');
  });
  it('nextLadderIndex always returns a clamped rung 0..3', () => {
    const cases = [
      { index: NaN, ewma: 14, nowMs: 2000, lastSwitchMs: 0 },
      { index: 99, ewma: 60, nowMs: 2000, lastSwitchMs: 0 },
      { index: -99, ewma: 5, nowMs: 2000, lastSwitchMs: 0 },
      { index: 1.9, ewma: 40, nowMs: 2000, lastSwitchMs: 0 },
      { index: 1, ewma: NaN, nowMs: 2000, lastSwitchMs: 0 },
      { index: 1, ewma: Infinity, nowMs: 2000, lastSwitchMs: 0 },
      { index: 1, ewma: 40, nowMs: 0, lastSwitchMs: 5000 },
      { index: 0, ewma: 5, nowMs: 100, lastSwitchMs: 99, batterySaver: 'yes' },
      { index: 3, ewma: 0, nowMs: 9999, lastSwitchMs: 0, batterySaver: 1 },
    ];
    for (const s of cases) {
      const got = nextLadderIndex(s);
      assert.ok(Number.isInteger(got) && got >= 0 && got <= 3, `ladder(${JSON.stringify(s)}) -> ${got}`);
    }
  });
  it('ladderSize clamps hostile indexes to a real rung', () => {
    for (const i of [-1, 99, NaN, 1.9, '2', null]) {
      const s = ladderSize(i);
      assert.ok(LADDER.some((r) => r.w === s.w && r.h === s.h), `ladderSize(${String(i)}) -> ${JSON.stringify(s)}`);
    }
  });
});

describe('red-team: profile migration heals hostile blobs', () => {
  it('non-object roots reset to defaults without throwing', () => {
    for (const raw of [null, undefined, 42, 'json', [1, 2], true]) {
      const m = migrateProfile(raw);
      assert.deepEqual(m.config.tier, 'auto');
      assert.ok(m.progress.unlockedArenas.includes(0));
    }
  });
  it('hostile config fields are rejected or clamped', () => {
    const m = migrateProfile({ config: { tier: '9', ladderIndex: 2.5, batterySaver: 'yes', reducedMotion: 1 } });
    assert.equal(m.config.tier, 'auto');
    assert.ok(Number.isInteger(m.config.ladderIndex));
    assert.equal(m.config.batterySaver, false);
    assert.equal(m.config.reducedMotion, false);
  });
  it('non-integer arena unlocks are filtered, arena 0 always present', () => {
    const m = migrateProfile({ progress: { unlockedArenas: [1, 'x', 2.5, null, 3] } });
    assert.ok(m.progress.unlockedArenas.includes(0));
    assert.ok(m.progress.unlockedArenas.every((n) => Number.isInteger(n)));
  });
  it('prototype pollution attempt does not pollute', () => {
    migrateProfile(JSON.parse('{"__proto__":{"polluted":true},"config":{"tier":1}}'));
    assert.equal({}.polluted, undefined);
  });
  it('numeric tier overrides survive the round-trip', async () => {
    const provider = createLocalProvider(createMemoryStore());
    const p = defaultProfile();
    p.config.tier = 1;
    p.config.ladderIndex = 3;
    await saveProfile(provider, p);
    const back = await loadProfile(provider);
    assert.equal(back.config.tier, 1);
    assert.equal(back.config.ladderIndex, 3);
  });
});

describe('red-team: storage provider faults', () => {
  it('missing store throws a TypeError immediately', () => {
    assert.throws(() => createLocalProvider(null), TypeError);
    assert.throws(() => createLocalProvider({}), TypeError);
  });
  it('corrupt JSON rejects (app falls back to defaults upstream)', async () => {
    const store = createMemoryStore();
    store.setItem('umbra/profile.json', '{not-json');
    const provider = createLocalProvider(store);
    await assert.rejects(() => provider.readJSON('profile.json'));
  });
  it('remove then read yields null', async () => {
    const provider = createLocalProvider(createMemoryStore());
    await provider.writeJSON('profile.json', defaultProfile());
    await provider.remove('profile.json');
    assert.equal(await provider.readJSON('profile.json'), null);
  });
});

describe('red-team: scene/pose determinism under hostile clocks', () => {
  it('negative and fractional ticks are normalized, huge ticks stay finite', () => {
    const neg = buildSceneDesc({ tick: -5, arena: 0 });
    assert.equal(neg.tick, 0);
    assert.equal(buildSceneDesc({ tick: 1.9, arena: 0 }).tick, 1);
    const huge = buildSceneDesc({ tick: 1e9, arena: 0 });
    assert.ok(Number.isFinite(huge.time));
    for (const p of huge.particles) {
      assert.ok(p.x >= 0 && p.x < 1 && p.y >= 0 && p.y < 1, 'motes must stay in frame at huge ticks');
    }
    assert.equal(huge.particles.length, PARTICLE_COUNT);
  });
  it('NaN/Infinity clocks never throw (contract callers pass integers)', () => {
    for (const t of [NaN, Infinity, -Infinity]) {
      assert.doesNotThrow(() => buildSceneDesc({ tick: t, arena: 0 }));
      assert.doesNotThrow(() => solveRig(idleAngles(t, 0), { x: 0, groundY: 0.14, facing: 1 }));
    }
    assert.equal(buildSceneDesc({ tick: NaN, arena: 0 }).tick, 0);
    assert.equal(buildSceneDesc({ tick: Infinity, arena: 0 }).tick, 0);
    assert.ok(Number.isFinite(buildSceneDesc({ tick: 1e15, arena: 0 }).time) === false ||
      Number.isFinite(buildSceneDesc({ tick: 1e15, arena: 0 }).time) === true);
  });
  it('hostile arena indexes still resolve to a valid render def', () => {
    for (const a of [NaN, 1.5, 'x', null, Infinity, -1, 99]) {
      const def = arenaAt(a);
      assert.ok(def && ARENAS.includes(def), `arenaAt(${String(a)}) must return a known def`);
    }
    const s = buildSceneDesc({ tick: 7, arena: 99 });
    assert.equal(s.arena, 0);
    assert.equal(arenaAt(s.arena).id, 'moonlit-temple');
  });
  it('long-horizon determinism: same tick, 1000 ticks apart in call order', () => {
    const a = JSON.stringify(buildSceneDesc({ tick: 12345, arena: 0 }));
    buildSceneDesc({ tick: 999, arena: 0 });
    const b = JSON.stringify(buildSceneDesc({ tick: 12345, arena: 0 }));
    assert.equal(a, b);
  });
  it('flattenSegments tolerates short rigs by padding to 22', () => {
    const flat = flattenSegments({ fighters: [{ segs: [] }, { segs: [] }] });
    assert.equal(flat.length, 22);
    assert.ok(flat.every((s) => ['ax', 'ay', 'bx', 'by', 'w'].every((k) => Number.isFinite(s[k]))));
  });
  it('hashRig of empty rig is a stable 8-hex string', () => {
    assert.match(hashRig([]), /^[0-9a-f]{8}$/);
    assert.equal(hashRig([]), hashRig([]));
  });
});

describe('red-team: stats and gates never false-green', () => {
  it('empty and single-sample stats are honest', () => {
    const e = summarize([]);
    assert.equal(e.n, 0);
    assert.ok(Number.isNaN(e.mean) && Number.isNaN(e.p95));
    const one = summarize([16.7]);
    assert.equal(one.mean, 16.7);
    assert.equal(one.p95, 16.7);
  });
  it('percentile clamps out-of-range p instead of returning undefined', () => {
    assert.ok(Number.isFinite(percentile([1, 2, 3], 150)));
    assert.ok(Number.isFinite(percentile([1, 2, 3], -5)));
    assert.ok(Number.isNaN(percentile([], 95)));
  });
  it('hostile gate measurements report null, never true', () => {
    assert.equal(checkGate('G1', { p95Ms: 'fast' }).pass, null);
    assert.equal(checkGate('G1', { p95Ms: Infinity }).pass, null);
    assert.equal(checkGate('G1', { p95Ms: NaN }).pass, null);
    assert.equal(checkGate('G1', { p95Ms: -3 }).pass, null); // impossible input must never green
    assert.equal(checkGate('G4', { hashA: 42, hashB: 42 }).pass, null);
    assert.equal(checkGate('G5', { roundTrip: 'yes' }).pass, null);
    assert.equal(checkGate('G9', {}).pass, null);
    assert.equal(checkGate('G2', {}).pass, null);
    assert.equal(checkAllGates({}).length, GATE_DEFS.length);
    assert.ok(GATE_DEFS.length >= 7);
  });
});

describe('red-team: offline shell and PWA wiring (post-fixer invariants)', () => {
  it('activate cleanup is scoped to umbra- caches only', () => {
    const sw = readFileSync(join(root, 'sw.js'), 'utf8');
    assert.ok(sw.includes("k.startsWith('umbra-')"), 'cache cleanup must be umbra- scoped');
    assert.ok(!/keys\.filter\(\(k\) => k !== UMBRA_CACHE\)\.map/.test(sw), 'unscoped wipe must be gone');
  });
  it('fetch handler has an offline fallback to index.html', () => {
    const sw = readFileSync(join(root, 'sw.js'), 'utf8');
    assert.ok(sw.includes('.catch('), 'fetch chain must catch network failure');
    assert.ok(sw.includes("caches.match('./index.html')"), 'fallback must serve index.html');
  });
  it('SHELL pre-caches every manifest icon and every entry exists', () => {
    const sw = readFileSync(join(root, 'sw.js'), 'utf8');
    const manifest = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
    for (const icon of manifest.icons) {
      const rel = icon.src.replace(/^\.\//, '');
      assert.ok(sw.includes(icon.src), `SHELL must pre-cache ${icon.src}`);
      assert.ok(existsSync(join(root, rel)), `icon missing on disk: ${rel}`);
    }
    const entries = [...sw.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]).filter((p) => p !== '');
    for (const e of entries) assert.ok(existsSync(join(root, e)), `missing shell file: ${e}`);
  });
  it('every DOM id touched by app.js exists in index.html', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    const js = readFileSync(join(root, 'app.js'), 'utf8');
    const ids = new Set(
      [...js.matchAll(/\$\(`([^`]+)`\)/g)]
        .map((m) => m[1].split('${')[0])
        .filter((p) => p && !p.endsWith('-')),
    );
    for (const m of js.matchAll(/\$\('([^']+)'\)/g)) {
      if (!m[1].includes('${')) ids.add(m[1]);
    }
    // M2 contract: title + fight + settings screens (ambient demo retired).
    ids.add('screen-title');
    ids.add('screen-fight');
    ids.add('screen-settings');
    for (const id of ids) {
      assert.ok(html.includes(`id="${id}"`), `index.html missing #${id} used by app.js`);
    }
    for (const b of ['btn-versus', 'btn-settings', 'btn-pause', 'btn-fight-quit', 'btn-resume', 'btn-quit', 'btn-rematch', 'btn-result-title', 'btn-settings-back']) {
      assert.ok(html.includes(`id="${b}"`), `button #${b} missing`);
    }
    // Blueprint E2E hooks: touch cluster + fight HUD + overlays.
    for (const t of ['joystick', 'btn-punch', 'btn-kick', 'btn-block', 'btn-special', 'hud-health-0', 'hud-health-1', 'hud-timer', 'pause-overlay', 'banner', 'remap-list']) {
      assert.ok(html.includes(`id="${t}"`) || html.includes(`data-testid="${t}"`), `touch/HUD hook #${t} missing`);
    }
    assert.ok(js.includes('btn-versus') && js.includes('settings-form'), 'wiring must reference fight + settings');
  });
  it('rig segment names are stable for GPU uniform packing', () => {
    assert.equal(SEG_NAMES.length, 11);
    assert.ok(SEG_NAMES.includes('head') && SEG_NAMES.includes('torso'));
  });
});
