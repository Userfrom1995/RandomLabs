# Kinetica - 2D Rigid-Body Physics Engine

A from-scratch impulse-based 2D physics engine in TypeScript. Deterministic, headless-testable, with an interactive browser sandbox.

## Overview

Kinetica implements the full Box2D-style pipeline:

1. **Broadphase:** Sweep-and-Prune on AABBs with stable `(minX, bodyId)` ordering, O(n log n).
2. **Narrowphase:** Circle-circle, circle-polygon, polygon-polygon SAT plus reference/incident face clipping (Sutherland-Hodgman) for stable 2-point manifolds.
3. **Solver:** Sequential impulses with effective masses, Baumgarte bias, Coulomb friction cone, restitution threshold, and warm starting.
4. **Integration:** Fixed timestep `1/60` with accumulator and deterministic `MAX_STEPS=5` clamp.
5. **Joints:** Revolute, distance, and prismatic constraints solved in the same impulse loop.
6. **Sleeping:** Island-based union-find sleeping with deterministic `deterministicNoSleep` flag.

## Project layout

```
kinetica/src/core/{vec2,rng,shapes,aabb,body,world,sleep,checksum}
kinetica/src/collision/{broadphase,narrowphase,manifold}
kinetica/src/solver/{sequentialImpulse,joints}
kinetica/src/sim/{scenes,headless,benchmarks}
kinetica/src/ui/{renderer,main}
kinetica/test/*.test.ts
kinetica/index.html
```

## Determinism contract

- Fixed `dt` and accumulator, dropping leftover time when capped.
- Seeded `mulberry32` RNG only, never `Math.random`.
- Stable ordering everywhere: `(minX, bodyId)` for SAP, `(i<j)` pairs sorted, manifolds sorted by `(A,B)`.
- `hashState` sorts by id and hashes fixed-precision `p,q,v,w`.
- Headless `simulate(seed, scene, steps)` returns bit-identical checksums across runs; `deterministicNoSleep` disables sleep-induced divergence.

## Running

```bash
cd kinetica
npm install
npm run build
npm test
npx tsx src/sim/headless.ts --seed 42 --scene stack --steps 600 --checksum
```

Open `kinetica/index.html` via Pages at `/kinetica/` or locally with a static server.

## Benchmarks

Three mandated benchmarks (see `src/sim/benchmarks.ts`):

- **Stacking:** 10 boxes on ground, 600 steps, checks lateral drift `< 0.6` and settled KE `< 0.5`.
- **Energy:** Free circle (no gravity) KE conserved to `1e-5` rel over 1000 steps; pendulum mechanical energy drift within tolerance.
- **Determinism:** Same seed and scene yield identical checksums; different seeds diverge.
