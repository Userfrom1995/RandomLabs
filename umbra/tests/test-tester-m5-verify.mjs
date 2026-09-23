/**
 * Tester M5 verification suite (PR #384, issue #375).
 * Regression pins for the five Reviewer blocking findings plus hostile
 * boundary traps. Pure Node (node:test), no DOM required.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { burstsFor, sparkPoints, slowMoFor, BURST_LIFE } from '../src/vfx.js';
import { patternFor } from '../src/input/haptics.js';
import { migrateProfile, defaultProfile } from '../src/storage/profile.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

describe('tester-m5: block ring-VFX event contract', () => {
  it('blocked events yield a ring burst (engine contract t=blocked)', () => {
    const out = burstsFor([{ t: 'blocked', tick: 10, x: 0, y: 0.6 }], 10);
    assert.equal(out.length, 1);
    assert.equal(out[0].kind, 'ring');
  });
  it('legacy block alias still yields a ring burst', () => {
    const out = burstsFor([{ t: 'block', tick: 10, x: 0, y: 0.6 }], 10);
    assert.equal(out.length, 1);
    assert.equal(out[0].kind, 'ring');
  });
  it('expired blocked bursts leave the window (no ghosts)', () => {
    assert.equal(burstsFor([{ t: 'blocked', tick: 0 }], BURST_LIFE + 1).length, 0);
  });
  it('hostile inputs never throw: null, corrupt, NaN coords', () => {
    assert.deepEqual(burstsFor(null, 0), []);
    assert.deepEqual(burstsFor([{ t: 'blocked' }], 10), []);
    assert.deepEqual(burstsFor([{ t: 'blocked', tick: 10, x: NaN, y: Infinity }], 10).length, 1);
    assert.equal(sparkPoints(null, 0).length, 8);
    assert.equal(slowMoFor([{ t: 'ko' }], 5), 1);
  });
});

describe('tester-m5: block haptics contract', () => {
  it('blocked maps to the block thud pattern, not the default', () => {
    assert.deepEqual(patternFor('blocked'), [10]);
    assert.deepEqual(patternFor('block'), [10]);
  });
  it('unknown haptic kinds fall through to the safe default', () => {
    assert.deepEqual(patternFor('nope'), [8]);
    assert.deepEqual(patternFor(null), [8]);
  });
});

describe('tester-m5: tutorial stipend single-grant', () => {
  it('tutorialDone survives a save/migrate round-trip (no re-grant)', () => {
    const base = defaultProfile();
    base.progress.stats.tutorialDone = true;
    base.progress.currency = 25;
    const mig = migrateProfile(JSON.parse(JSON.stringify(base)));
    assert.equal(mig.progress.stats.tutorialDone, true);
  });
  it('hostile stats blobs cannot mint the flag or corrupt counters', () => {
    const evil = migrateProfile({ progress: { stats: { tutorialDone: 'yes', wins: -5, trials: [1, 2] } } });
    assert.equal(evil.progress.stats.tutorialDone, undefined);
    assert.equal(evil.progress.stats.wins, 0);
    assert.deepEqual(evil.progress.stats.trials, []);
  });
});

describe('tester-m5: banner live region + slow-mo gate (static shell pins)', () => {
  it('#banner keeps role=status in the shipped shell', () => {
    const html = read('index.html');
    const at = html.indexOf('id="banner"');
    assert.ok(at !== -1, 'banner element exists');
    assert.ok(html.slice(Math.max(0, at - 120), at + 160).includes('role="status"'));
  });
  it('showBanner mirrors into the announce path', () => {
    const app = read('app.js');
    const at = app.indexOf('function showBanner');
    assert.ok(at !== -1);
    assert.ok(app.slice(at, at + 500).includes('announce(text)'));
  });
  it('KO slow-mo is forced off under reduced motion', () => {
    const app = read('app.js');
    const at = app.indexOf('slowMoFor(');
    assert.ok(at !== -1);
    const window = app.slice(Math.max(0, at - 400), at + 200);
    assert.match(window, /reducedMo/i);
  });
});

describe('tester-m5: SW cache generation + evidence', () => {
  it('service worker pins the current umbra-v5 cache with stale purge', () => {
    const sw = read('sw.js');
    assert.ok(sw.includes('umbra-v5'), 'current cache tag present');
    assert.ok(!sw.includes('umbra-v4'), 'no stale v4 tag');
    assert.ok(sw.includes("startsWith('umbra-')"), 'purge-old-caches guard present');
  });
});
