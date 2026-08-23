# Kinetica — 2D Rigid-Body Physics Engine

A from-scratch impulse-based 2D physics engine in TypeScript with a deterministic headless core and an interactive browser sandbox.

## Quick start

```bash
cd kinetica
npm install
npm run build   # tsc -> dist/
npm test        # vitest
```

Open `index.html` in a browser (served via `file://` or Pages at `/kinetica/`).

## What it does

- **Core:** Vec2, seeded RNG (mulberry32), shape mass (Mirtich polygons, 0.5 m r^2 circles), bodies, AABBs, island sleeping, FNV-1a checksums
- **Collision:** SAP broadphase (stable (minX,bodyId) sort) + narrowphase: circle-circle, circle-polygon, polygon-polygon SAT + reference/incident face clipping for 2-point manifolds
- **Solver:** sequential-impulse velocity solver with Baumgarte bias (beta 0.2, slop 0.005), Coulomb friction (mu = sqrt(muA*muB)), restitution threshold (1 m/s), warm starting
- **Joints:** revolute (pin), distance (rope), prismatic (slider) solved in the same impulse loop
- **Sim:** deterministic `simulate(seed, scene, steps)` + four scenes (stack, pendulum, mixed 100-body, free motion) + benchmarks

## Project layout

```
kinetica/src/core/        vec2, rng, shapes, aabb, body, world, sleep, checksum
kinetica/src/collision/   manifold, broadphase, narrowphase
kinetica/src/solver/      sequentialImpulse, joints
kinetica/src/sim/         scenes, headless, benchmarks
kinetica/src/ui/          renderer, main
kinetica/test/            vitest suite
kinetica/index.html       sandbox entry
```

## Determinism contract

Fixed `dt = 1/60` with accumulator + MAX_STEPS=5 clamp (drops leftover time), stable sorts everywhere, no `Math.random`, sleeping deterministic via `dt` and optional `deterministicNoSleep` flag for headless tests. `hashState` sorts by body id and hashes fixed-precision positions.

## Benchmarks

See `src/sim/benchmarks.ts` and `test/benchmarks.test.ts` for the three mandated checks: stacking stability (10-box column), energy conservation (free + pendulum), and bit-identical determinism, plus a perf sanity probe.

## Browser sandbox

Canvas 2D render loop decoupled from physics via accumulator. Controls: spawn box/circle/polygon, fling by drag, gravity toggle, sleeping toggle, AABB/contact/velocity overlays, pin/rope joints via shift-click, seed + preset scenes, live checksum + FPS.

## Solver defaults

`SOLVER_ITERS=12`, `beta=0.2`, `slop=0.005`, `restThreshold=1.0`, friction `sqrt(muA*muB)`, restitution `max(eA,eB)`.

