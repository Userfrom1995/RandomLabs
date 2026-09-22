// Umbra M1: tier choice logic, storage round-trip, gates, arenas, offline shell.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTier, tierForFailure } from '../src/render/tiers.js';
import { createLocalProvider, createMemoryStore } from '../src/storage/provider.js';
import {
  defaultProfile,
  migrateProfile,
  loadProfile,
  saveProfile,
  PROFILE_VERSION,
} from '../src/storage/profile.js';
import { summarize } from '../src/perf/stats.js';
import { checkGate, checkAllGates } from '../src/perf/gates.js';
import { ARENAS, arenaAt } from '../src/arenas.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('resolveTier', () => {
  it('override wins, then cached, then probed, else Canvas2D', () => {
    assert.equal(resolveTier({ override: 0, cached: 1, probed: 2 }), 0);
    assert.equal(resolveTier({ override: 'auto', cached: 1, probed: 0 }), 1);
    assert.equal(resolveTier({ probed: 0 }), 0);
    assert.equal(resolveTier({}), 2);
    assert.equal(resolveTier({ override: 'bogus', cached: 'bogus' }), 2);
  });
  it('fallback chain 0 -> 1 -> 2 -> dead', () => {
    assert.equal(tierForFailure(0), 1);
    assert.equal(tierForFailure(1), 2);
    assert.equal(tierForFailure(2), -1);
  });
});

describe('profile storage', () => {
  it('defaults carry schema v1 and arena 0 unlocked', () => {
    const p = defaultProfile();
    assert.equal(p.version, PROFILE_VERSION);
    assert.ok(p.progress.unlockedArenas.includes(0));
  });
  it('migration heals garbage and clamps ranges', () => {
    assert.deepEqual(migrateProfile(null).config.tier, 'auto');
    const m = migrateProfile({ config: { tier: '9', ladderIndex: 99, batterySaver: 'yes' } });
    assert.equal(m.config.tier, 'auto');
    assert.equal(m.config.ladderIndex, 3);
    assert.equal(m.config.batterySaver, false);
  });
  it('local provider round-trips a profile', async () => {
    const provider = createLocalProvider(createMemoryStore());
    const p = defaultProfile();
    p.config.batterySaver = true;
    await saveProfile(provider, p);
    const back = await loadProfile(provider);
    assert.equal(back.config.batterySaver, true);
    assert.equal(back.version, PROFILE_VERSION);
  });
  it('first run returns defaults when nothing stored', async () => {
    const provider = createLocalProvider(createMemoryStore());
    assert.deepEqual(await loadProfile(provider), defaultProfile());
  });
});

describe('perf gates', () => {
  it('unmeasured gates report null, never false-green', () => {
    for (const g of checkAllGates({})) {
      if (['G1', 'G4', 'G5'].includes(g.id)) assert.equal(g.pass, null);
    }
  });
  it('G1 enforces the 16.667 ms p95 budget', () => {
    assert.equal(checkGate('G1', { p95Ms: 12 }).pass, true);
    assert.equal(checkGate('G1', { p95Ms: 20 }).pass, false);
  });
  it('G4 compares replay hashes, G5 the round-trip flag', () => {
    assert.equal(checkGate('G4', { hashA: 'ab', hashB: 'ab' }).pass, true);
    assert.equal(checkGate('G4', { hashA: 'ab', hashB: 'cd' }).pass, false);
    assert.equal(checkGate('G5', { roundTrip: true }).pass, true);
  });
  it('summarize reports n/mean/median/p95', () => {
    const s = summarize([10, 12, 14, 16, 18]);
    assert.equal(s.n, 5);
    assert.equal(s.median, 14);
    assert.ok(s.p95 >= s.median);
  });
});

describe('arenas', () => {
  it('five frozen defs, safe clamp accessor', () => {
    assert.equal(ARENAS.length, 5);
    assert.equal(arenaAt(0).id, 'moonlit-temple');
    assert.equal(arenaAt(99).id, 'moonlit-temple');
    assert.equal(arenaAt(-1).id, 'moonlit-temple');
  });
});

describe('offline shell file list', () => {
  it('every sw.js SHELL entry exists on disk', () => {
    const sw = readFileSync(join(root, 'sw.js'), 'utf8');
    const entries = [...sw.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]).filter((p) => p !== '');
    assert.ok(entries.length > 10, 'shell list suspiciously short');
    for (const e of entries) {
      assert.ok(existsSync(join(root, e)), `missing shell file: ${e}`);
    }
  });
  it('WGSL passes expose vertex + fragment entries; GLSL ports match uniforms', () => {
    for (const f of ['background.wgsl', 'silhouette.wgsl', 'rimlight.wgsl', 'particles.wgsl']) {
      const src = readFileSync(join(root, 'src/render/webgpu', f), 'utf8');
      assert.ok(src.includes('@vertex'), `${f} missing vertex stage`);
      assert.ok(src.includes('@fragment'), `${f} missing fragment stage`);
    }
    const glsl = readFileSync(join(root, 'src/render/webgl2/shaders.js'), 'utf8');
    for (const token of ['uSeg[22]', 'uW[22]', 'uPts[64]', 'gl_VertexID']) {
      assert.ok(glsl.includes(token), `GLSL missing ${token}`);
    }
  });
});
