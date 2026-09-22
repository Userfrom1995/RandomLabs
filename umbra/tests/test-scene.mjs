// Umbra M1: SceneDesc determinism, shape, flatten contract.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSceneDesc, flattenSegments, PARTICLE_COUNT } from '../src/render/scene.js';

describe('buildSceneDesc', () => {
  it('same tick yields byte-identical JSON', () => {
    const a = JSON.stringify(buildSceneDesc({ tick: 90, arena: 0 }));
    const b = JSON.stringify(buildSceneDesc({ tick: 90, arena: 0 }));
    assert.equal(a, b);
  });
  it('time advances poses between ticks', () => {
    const a = JSON.stringify(buildSceneDesc({ tick: 0, arena: 0 }));
    const b = JSON.stringify(buildSceneDesc({ tick: 60, arena: 0 }));
    assert.notEqual(a, b);
  });
  it('two fighters, 48 motes, zero combat uniforms', () => {
    const s = buildSceneDesc({ tick: 10, arena: 0 });
    assert.equal(s.fighters.length, 2);
    assert.equal(s.fighters[0].segs.length, 11);
    assert.equal(s.particles.length, PARTICLE_COUNT);
    for (const p of s.particles) {
      assert.ok(p.x >= 0 && p.x < 1 && p.y >= 0 && p.y < 1);
      assert.ok(p.s > 0 && p.b > 0);
    }
    assert.equal(s.flash, 0);
    assert.equal(s.shake, 0);
    assert.deepEqual(s.weapons, [[], []]);
    assert.equal(s.layers.length, 3);
  });
  it('flattenSegments yields exactly 22 GPU-ready entries', () => {
    const flat = flattenSegments(buildSceneDesc({ tick: 5, arena: 0 }));
    assert.equal(flat.length, 22);
    for (const s of flat) {
      for (const k of ['ax', 'ay', 'bx', 'by', 'w']) assert.ok(Number.isFinite(s[k]));
    }
  });
});
