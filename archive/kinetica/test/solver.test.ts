import { describe, it, expect } from 'vitest';
import { World } from '../src/core/world.js';
import { createBody, resetBodyIdCounter } from '../src/core/body.js';
import { createBox } from '../src/core/shapes.js';

describe('solver', () => {
  it('box resting on ground has near-zero vertical velocity and small penetration', () => {
    resetBodyIdCounter();
    const world = new World({ gravity: { x: 0, y: -9.81 }, dt: 1 / 60, deterministicNoSleep: true });
    const ground = createBody({ shape: createBox(10, 0.5), p: { x: 0, y: -2 }, isStatic: true });
    world.addBody(ground);
    const box = createBody({ shape: createBox(0.5, 0.5), p: { x: 0, y: 0 } });
    world.addBody(box);
    for (let i = 0; i < 300; i++) world.step(world.dt);
    expect(Math.abs(box.v.y)).toBeLessThan(0.2);
    // should be resting near ground top (-1.5) + 0.5 = -1.0? Actually ground top at -1.5, box center at -1.0
    expect(box.p.y).toBeCloseTo(-1.0, 0.3);
  });
  it('friction stops sliding box', () => {
    resetBodyIdCounter();
    const world = new World({ gravity: { x: 0, y: -9.81 }, dt: 1 / 60, deterministicNoSleep: true });
    const ground = createBody({ shape: createBox(10, 0.5), p: { x: 0, y: -2 }, isStatic: true, friction: 0.8 });
    world.addBody(ground);
    const box = createBody({ shape: createBox(0.5, 0.5), p: { x: 0, y: -0.9 }, v: { x: 2, y: 0 }, friction: 0.8 });
    world.addBody(box);
    for (let i = 0; i < 300; i++) world.step(world.dt);
    expect(Math.abs(box.v.x)).toBeLessThan(0.5);
  });
});
