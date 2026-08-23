# Kinetica — from-scratch 2D physics engine build

- **Project:** Kinetica (`kinetica/`)
- **Type:** TypeScript 2D rigid-body physics engine + browser sandbox
- **Hosting:** static GitHub Pages at `/kinetica/index.html` (entry loads `dist/ui/main.js`)
- **Core spec:** `docs/kinetica-research.md`
- **Blueprint:** `ideas/2026-08-23-kinetica-2d-physics-engine.md`

## What was built

A deterministic, headless-testable engine mirroring Box2D's solver design, prioritized for readability and modularity:

- **core/**: `vec2` pure functions, `mulberry32` seeded RNG, `shapes` with Mirtich polygon mass (area-weighted centroid recenter, `I = d/12 sum cross(intx2+inty2)`), `aabb` with overlap test, `body` with `invMass/invI` and force accumulators, `world` with fixed-timestep accumulator and `MAX_STEPS=5` clamp, `sleep` with union-find islands, `checksum` FNV-1a over fixed-precision state.
- **collision/**: `broadphase` SAP sorted by `(minX, bodyId)` sweeping active intervals, canonical `(i<j)` pairs sorted; `narrowphase` dispatching circle-circle, circle-polygon (Voronoi region test), polygon-polygon SAT (min-distance along each face normal, picking least-penetrating reference face, incident face by most anti-parallel normal, Sutherland-Hodgman side-plane clipping for 2-point manifold, penetration via `-dot(refNormal, p - refV0)`).
- **solver/**: `sequentialImpulse` computing `rn = cross(r,n)`, `kn = invMass + invI*rn^2`, Baumgarte `bias = beta/dt * max(pen - slop,0)`, restitution only when `vn < -threshold`, Coulomb `maxPt = mu*Pn` with frictional geometric mean; `joints` solving revolute (two axes), distance (single along-anchor with position bias), prismatic (perp translation + angular lock) in the same iteration loop with accumulated impulses.
- **sim/**: `scenes` building stack/pendulum/mixed/free worlds from a seed, `headless` exposing `simulate(seed, scene, steps) -> {checksum, world}`, `benchmarks` implementing stacking, energy (free + pendulum), determinism, and perf probes.
- **ui/**: `renderer` drawing grid, bodies, COM dots, joints, optional AABBs/contacts/velocities; `main` bootstrapping a `World` from scenes, RAF loop via `world.stepFrame`, controls for spawning, flinging (mouse drag impulse), gravity/sleep toggles, joint picking (shift-click two bodies), seed/scene selection, and live checksum/FPS telemetry.

## Why

The lab had no simulation project with a hard numerical core. Kinetica provides a real-time solver with direct visual payoff (stacks settling without jitter, pendulums without drift) and a strict determinism harness for automated verification.

## How it works

See `docs/kinetica-research.md` Section 3-13 for the full math. The runtime loop is:

```
world.stepFrame(dt) -> accumulator loop step(dt):
  apply gravity/forces -> update world verts -> SAP -> narrowphase manifolds (warm-start impulses applied)
  -> solver iterations (contacts then joints) -> integrate positions -> island sleep -> cache warm start -> clear forces
```

## Key files

- `kinetica/src/core/world.ts:1`
- `kinetica/src/collision/narrowphase.ts:1`
- `kinetica/src/solver/sequentialImpulse.ts:1`
- `kinetica/src/sim/headless.ts:1`
- `kinetica/src/ui/main.ts:1`
- `kinetica/test/benchmarks.test.ts:1`

## Iteration note

Initial SAT narrowphase incorrectly used `max` (support along `+n`) instead of `min` (support along `-n`), causing false separation and null manifolds; fixed to use minimal distance and to compute penetration as `-dot(n, p - v0)` uniformly for both reference choices, verified by a 2-box overlap test yielding a 2-point manifold with 0.1 penetration. The solver and benchmark suite then passed (stacking KE and drift within tolerances, free-space energy conserved to `1e-5`).

