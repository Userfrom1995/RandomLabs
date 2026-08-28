import { describe, it, expect } from 'vitest';
import { World } from '../src/core/world.js';
import { createBody, resetBodyIdCounter } from '../src/core/body.js';
import { createBox } from '../src/core/shapes.js';

describe('joints', () => {
  it('distance joint holds length', () => {
    resetBodyIdCounter();
    const world = new World({ gravity: { x: 0, y: 0 }, dt: 1 / 60, deterministicNoSleep: true });
    const a = createBody({ shape: { kind: 'circle', radius: 0.2 }, p: { x: -1, y: 0 } });
    const b = createBody({ shape: { kind: 'circle', radius: 0.2 }, p: { x: 1, y: 0 } });
    world.addBody(a); world.addBody(b);
    a.v.x = -5; b.v.x = 5;
    world.addJoint({ kind: 'distance', A: a.id, B: b.id, localAnchorA: { x: 0, y: 0 }, localAnchorB: { x: 0, y: 0 }, length: 2, accImpulses: [0] } as any);
    for (let i = 0; i < 600; i++) world.step(world.dt);
    const dist = Math.hypot(b.p.x - a.p.x, b.p.y - a.p.y);
    expect(dist).toBeCloseTo(2, 0.5);
  });
  it('revolute pins bodies', () => {
    resetBodyIdCounter();
    const world = new World({ gravity: { x: 0, y: -9.81 }, dt: 1 / 60, deterministicNoSleep: true });
    const pivot = createBody({ shape: createBox(0.1, 0.1), p: { x: 0, y: 5 }, isStatic: true });
    world.addBody(pivot);
    const bob = createBody({ shape: { kind: 'circle', radius: 0.3 }, p: { x: 1, y: 5 } });
    world.addBody(bob);
    world.addJoint({ kind: 'revolute', A: pivot.id, B: bob.id, localAnchorA: { x: 0, y: 0 }, localAnchorB: { x: -1, y: 0 }, accImpulses: [0, 0] } as any);
    for (let i = 0; i < 200; i++) world.step(world.dt);
    const dx = bob.p.x - pivot.p.x, dy = bob.p.y - pivot.p.y;
    const len = Math.hypot(dx, dy);
    expect(len).toBeCloseTo(1, 0.3);
  });
});
