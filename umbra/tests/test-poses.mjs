// Umbra M1: pose solver shape, mirror symmetry, determinism, golden hashes.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SEG_NAMES, idleAngles, solveRig, hashRig } from '../src/poses.js';

describe('rig shape', () => {
  it('solves exactly 11 named segments', () => {
    const segs = solveRig(idleAngles(0, 0), { x: 0, groundY: 0.14, facing: 1 });
    assert.equal(segs.length, 11);
    assert.deepEqual(segs.map((s) => s.name), SEG_NAMES);
  });
  it('all coordinates and widths are finite and sane', () => {
    for (const facing of [1, -1]) {
      const segs = solveRig(idleAngles(1.23, 0.7), { x: -0.34, groundY: 0.14, facing });
      for (const s of segs) {
        for (const k of ['ax', 'ay', 'bx', 'by', 'w']) {
          assert.ok(Number.isFinite(s[k]), `${s.name}.${k} not finite`);
        }
        assert.ok(s.w > 0 && s.w < 0.2, `${s.name} width insane: ${s.w}`);
        assert.ok(s.ay >= 0 && s.by >= 0, `${s.name} below ground`);
        assert.ok(s.ay <= 1 && s.by <= 1, `${s.name} above frame`);
      }
    }
  });
  it('facing mirrors x around the root', () => {
    const x = 0.2;
    const l = solveRig(idleAngles(0.5, 0), { x, groundY: 0.14, facing: 1 });
    const r = solveRig(idleAngles(0.5, 0), { x, groundY: 0.14, facing: -1 });
    // Limb segment sets mirror; compare sorted absolute endpoint offsets.
    const norm = (segs) =>
      segs
        .map((s) =>
          [Math.abs(s.ax - x), Math.abs(s.bx - x)]
            .map((v) => Math.round(v * 1e4))
            .sort((p, q) => p - q)
            .join(','),
        )
        .sort()
        .join('|');
    assert.equal(norm(l), norm(r));
  });
  it('hashRig is deterministic and time-sensitive', () => {
    const h1 = hashRig(solveRig(idleAngles(2, 0), { x: 0, groundY: 0.14, facing: 1 }));
    const h2 = hashRig(solveRig(idleAngles(2, 0), { x: 0, groundY: 0.14, facing: 1 }));
    const h3 = hashRig(solveRig(idleAngles(3, 0), { x: 0, groundY: 0.14, facing: 1 }));
    assert.equal(h1, h2);
    assert.notEqual(h1, h3);
  });
  it('golden hashes pin the solver output', () => {
    const g1 = hashRig(solveRig(idleAngles(0, 0), { x: -0.34, groundY: 0.14, facing: 1 }));
    const g2 = hashRig(solveRig(idleAngles(1.37, 2.4), { x: 0.34, groundY: 0.14, facing: -1 }));
    assert.equal(g1, '5046b8f7');
    assert.equal(g2, '4cdd52dc');
  });
});
