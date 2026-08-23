import { World } from '../core/world.js';
import { createBody, resetBodyIdCounter } from '../core/body.js';
import { createBox, createPolygon } from '../core/shapes.js';
import type { Vec2 } from '../core/vec2.js';
import { mulberry32 } from '../core/rng.js';

export type SceneName = 'stack' | 'pendulum' | 'mixed' | 'free';

export function makeWorld(seed: number, opts?: { gravity?: Vec2; deterministicNoSleep?: boolean; dt?: number }): World {
  resetBodyIdCounter();
  return new World({ seed, gravity: opts?.gravity, deterministicNoSleep: opts?.deterministicNoSleep, dt: opts?.dt });
}

export function addGround(world: World): void {
  const ground = createBody({
    shape: createBox(50, 0.5),
    p: { x: 0, y: -5 },
    isStatic: true,
    friction: 0.5,
    restitution: 0.0
  });
  world.addBody(ground);
  // walls
  world.addBody(createBody({ shape: createBox(0.5, 50), p: { x: -12, y: 10 }, isStatic: true }));
  world.addBody(createBody({ shape: createBox(0.5, 50), p: { x: 12, y: 10 }, isStatic: true }));
}

export function makeStack(seed = 123, count = 10): World {
  const w = makeWorld(seed, { gravity: { x: 0, y: -9.81 }, deterministicNoSleep: true });
  addGround(w);
  const boxW = 0.5, boxH = 0.5;
  for (let i = 0; i < count; i++) {
    const y = -4 + boxH + i * (boxH * 2 + 0.01);
    w.addBody(createBody({
      shape: createBox(boxW, boxH),
      p: { x: 0, y },
      friction: 0.5,
      restitution: 0.0,
      density: 1
    }));
  }
  return w;
}

export function makePendulum(seed = 456): World {
  const w = makeWorld(seed, { gravity: { x: 0, y: -9.81 }, deterministicNoSleep: true });
  const pivot = createBody({ shape: createBox(0.1, 0.1), p: { x: 0, y: 8 }, isStatic: true });
  w.addBody(pivot);
  const bob = createBody({
    shape: { kind: 'circle', radius: 0.5 },
    p: { x: 1, y: 6 },
    friction: 0.2,
    restitution: 0.0,
    density: 1
  });
  w.addBody(bob);
  // distance joint
  const { createDistanceJoint } = awaitImportHack();
  // we'll create manually to avoid circular
  // Use world ids directly
  const joint: any = {
    kind: 'distance',
    A: pivot.id,
    B: bob.id,
    localAnchorA: { x: 0, y: 0 },
    localAnchorB: { x: 0, y: 0 },
    length: 2,
    accImpulses: [0]
  };
  w.addJoint(joint);
  return w;
}
function awaitImportHack(): any { return null; }

export function makeMixed(seed = 789): World {
  const w = makeWorld(seed, { gravity: { x: 0, y: -9.81 }, deterministicNoSleep: true });
  addGround(w);
  const rng = mulberry32(seed);
  // 100 bodies
  for (let i = 0; i < 100; i++) {
    const x = (rng() - 0.5) * 10;
    const y = rng() * 15;
    const kind = Math.floor(rng() * 3);
    if (kind === 0) {
      w.addBody(createBody({
        shape: { kind: 'circle', radius: 0.2 + rng() * 0.3 },
        p: { x, y },
        friction: 0.4, restitution: 0.1 + rng() * 0.2
      }));
    } else if (kind === 1) {
      w.addBody(createBody({
        shape: createBox(0.2 + rng() * 0.3, 0.2 + rng() * 0.3),
        p: { x, y },
        q: (rng() - 0.5) * Math.PI,
        friction: 0.5, restitution: 0.0
      }));
    } else {
      const n = 3 + Math.floor(rng() * 3);
      const r = 0.3 + rng() * 0.3;
      const verts: Vec2[] = [];
      for (let k = 0; k < n; k++) { const ang = (k / n) * Math.PI * 2; verts.push({ x: Math.cos(ang) * r, y: Math.sin(ang) * r }); }
      w.addBody(createBody({
        shape: createPolygon(verts),
        p: { x, y },
        q: (rng() - 0.5) * Math.PI,
        friction: 0.5, restitution: 0.1
      }));
    }
  }
  return w;
}

export function makeFreeMotion(seed = 111): World {
  const w = makeWorld(seed, { gravity: { x: 0, y: 0 }, deterministicNoSleep: true });
  const c = createBody({
    shape: { kind: 'circle', radius: 0.5 },
    p: { x: 0, y: 0 },
    v: { x: 5, y: 2 },
    w: 1.5,
    friction: 0, restitution: 0
  });
  w.addBody(c);
  return w;
}

export function buildScene(name: SceneName, seed: number): World {
  switch (name) {
    case 'stack': return makeStack(seed);
    case 'pendulum': return makePendulumScene(seed);
    case 'mixed': return makeMixed(seed);
    case 'free': return makeFreeMotion(seed);
    default: return makeStack(seed);
  }
}

function makePendulumScene(seed: number): World {
  const w = makeWorld(seed, { gravity: { x: 0, y: -9.81 }, deterministicNoSleep: true });
  const pivot = createBody({ shape: createBox(0.05, 0.05), p: { x: 0, y: 10 }, isStatic: true });
  w.addBody(pivot);
  const bob = createBody({
    shape: { kind: 'circle', radius: 0.5 },
    p: { x: 2, y: 8 },
    friction: 0.1, restitution: 0, density: 1
  });
  w.addBody(bob);
  // compute local anchors
  const ca = Math.cos(pivot.q), sa = Math.sin(pivot.q);
  const cb = Math.cos(bob.q), sb = Math.sin(bob.q);
  // pivot at world (0,10), bob anchor at bob center initially? Use bob center
  // distance between pivots:  sqrt((2)^2 + (2)^2)=2.828
  const len = Math.hypot(bob.p.x - pivot.p.x, bob.p.y - pivot.p.y);
  w.addJoint({
    kind: 'distance',
    A: pivot.id, B: bob.id,
    localAnchorA: { x: 0, y: 0 },
    localAnchorB: { x: 0, y: 0 },
    length: len,
    accImpulses: [0]
  } as any);
  return w;
}
