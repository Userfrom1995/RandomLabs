// Fixer QC hardening pins (Quality Council rejection on PR #364, score 8.0).
// Seals: null capability contracts (d) and the 1-LSB angle-clamp pair (e).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chooseUploadFormat } from '../src/render/upload.js';
import { resolveTier } from '../src/render/tiers.js';
import { latchTiccmd } from '../src/input/tic.js';
import { initEngine } from '../src/engine/doomEngine.js';
import { buildDemoWad } from '../tools/make-demo-wad.mjs';

describe('fixer QC: null capability contracts never throw', () => {
  it('chooseUploadFormat(null/undefined) falls back to cpu', () => {
    assert.equal(chooseUploadFormat(null), 'cpu');
    assert.equal(chooseUploadFormat(undefined), 'cpu');
    assert.equal(chooseUploadFormat(), 'cpu');
  });
  it('resolveTier(null/undefined) resolves Tier 3, never throws', () => {
    assert.equal(resolveTier(null), 3);
    assert.equal(resolveTier(undefined), 3);
    assert.equal(resolveTier(null, 1), 1, 'explicit override still wins');
  });
});

describe('fixer QC: angle-clamp pair aligned at 32767', () => {
  it('latchTiccmd clamps angleturn to [-32768, 32767]', () => {
    const hi = latchTiccmd(null, { angleturn: 1e9 });
    assert.equal(hi.angleturn, 32767);
    const lo = latchTiccmd(null, { angleturn: -1e9 });
    assert.equal(lo.angleturn, -32768);
  });
  it('injectTiccmd matches latchTiccmd within 1 LSB (sealed tolerance)', async () => {
    const e = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
    const a0 = e.getPlayer().angle;
    e.injectTiccmd({ angleturn: 1e9, forwardmove: 0, sidemove: 0, buttons: 0 });
    const applied = e.getPlayer().angle - a0;
    const expected = 32767 / 182;
    assert.ok(Math.abs(applied - expected) < 1 / 182 + 1e-9, `applied ${applied} vs expected ${expected}`);
  });
});
