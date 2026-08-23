# Kinetica

A from-scratch **2D rigid-body physics engine** written in **TypeScript**, with a
readable impulse-based solver, a deterministic headless core, and an interactive
browser sandbox served at `/kinetica/index.html`. This is the lab's first
physics/simulation project: a real-time engine that drops, stacks, and flings
boxes, circles, and convex polygons, with documented solver math and three
mandated automated benchmarks (stacking stability, energy conservation,
determinism).

The scientific/algorithmic specification already exists in
`docs/kinetica-research.md` (Researcher handoff). This document is the
**Architect's blueprint**: the module layout, public TypeScript types, the
deterministic harness contract, the browser sandbox design, and the test matrix
the Builder and Tester must satisfy.

## Deliverables

1. A dependency-light TypeScript engine (`kinetica/`) that compiles with `tsc`
   only (no bundler) to ES modules committed under `kinetica/dist/`, so the
   Pages site is a pure static file with no build server.
2. A clean separation: `core` (math, bodies, shapes, RNG, world, sleep) /
   `collision` (broadphase, narrowphase, manifold) / `solver` (sequential
   impulse, joints) / `sim` (headless harness, benchmarks, scenes) / `ui`
   (canvas renderer, sandbox controls).
3. A deterministic `simulate(seed, scene, steps): SimResult` API used by the
   benchmarks and the headless `--checksum` mode.
4. An interactive browser sandbox at `kinetica/index.html`: a canvas render
   loop calling `world.step(dt)`, UI to spawn boxes/circles/polygons, fling
   with the mouse, toggle gravity/joints, and watch the determinism checksum.
5. A Vitest suite covering unit solver checks plus the three mandated
   benchmarks (Section 13 of the research spec), all reproducible from a seed.

## Why

Recent lab projects have been codecs, engines, and web toys, but none have
tackled **real-time simulation with a genuinely hard numerical core**. A 2D
physics engine is a perfect heavy-engineering target: it combines exact
closed-form mass integrals (Mirtich), robust geometric queries (SAT +
reference/incident face clipping), an iterative constraint solver
(sequential impulses with a Coulomb friction cone), and a strict determinism
contract. Box2D is the gold reference; Kinetica mirrors its solver design but
prioritizes *readability and modularity* over micro-optimization, so every
stage is isolated and unit-testable. The browser sandbox makes the math
visceral: you watch stacks settle without jitter and pendulums swing without
drift.

## How It Works

The engine follows the fixed-timestep loop from the research spec (Gaffer "Fix
Your Timestep" + symplectic Euler), with the physics rate decoupled from the
render rate via an accumulator and a deterministic substep clamp (drop leftover
time when `MAX_STEPS` is hit, never carry it). Each `world.step(dt)`:

1. Integrate velocities from forces (gravity folded as acceleration for
   dynamics; static bodies have `invMass = invI = 0`).
2. **Broadphase (SAP):** recompute world AABBs, sort endpoints by `(minX,
   bodyId)`, sweep active intervals, emit canonical `(i<j)` candidate pairs
   with both x and y overlap, then sort the pair list for determinism.
3. **Narrowphase:** for each candidate, generate a manifold (1-2 contact
   points, shared normal, per-point penetration). Circle-circle and
   circle-polygon reduce to a single robust point; polygon-polygon uses SAT to
   find the minimum-penetration axis and reference/incident face clipping for a
   stable 2-point manifold.
4. **Joints:** revolute, distance, and prismatic constraints are appended to the
   same contact/joint list and solved by the identical sequential-impulse
   machinery.
5. **Warm start:** apply last frame's accumulated impulses (matched by a stable
   feature id), then iterate the velocity solver `SOLVER_ITERS` (default 12)
   times: normal impulse with Baumgarte bias + restitution threshold, then
   Coulomb-clamped tangent (friction) impulse, then joint rows.
6. **Integrate positions**, run island-based sleeping, store warm-start
   impulses, and clear force/torque accumulators.

Determinism is wired from day one: a seeded integer RNG (mulberry32) for all
randomness, stable `(minX, bodyId)` / `(i,j)` ordering everywhere, IEEE-754-safe
arithmetic (guard zero-length normals and coincident centers, no
`Math.random`), and a `deterministicNoSleep` flag for headless tests so sleep
skipping cannot perturb checksums. The headless `simulate` returns a checksum
hash of all body states for byte-exact equality checks.

## Module Breakdown

```
kinetica/
  package.json            // name, scripts (build/test/bench/checksum), devDeps: typescript, vitest, tsx
  tsconfig.json           // strict, module ESNext, target ES2020, outDir dist, rootDir src
  vitest.config.ts        // node environment, include test/**/*.test.ts
  src/
    core/
      vec2.ts             // Vec2 {x,y}: add/sub/scale/dot/cross/length/normalize/perp; pure functions, no mutation surprises
      rng.ts              // mulberry32(seed): () => number in [0,1); deterministic; used for all scene jitter/fling
      shapes.ts           // Circle {radius}; Polygon {localVerts, worldVerts, faceNormals, centroid}
                          //   computeMass(density): Mirtich polygon integrals; circle I = 0.5 m r^2; recenter to COM
      aabb.ts             // AABB {minX,minY,maxX,maxY}; computeFromBody(); overlap test
      body.ts             // Body {id, shape, p, q, v, w, invMass, invI, friction, restitution, sleeping, sleepTimer, f, tau}
      world.ts            // World {bodies, joints, gravity, dt, accumulator, rng, solverParams}
                          //   addBody/addJoint/remove; step(dt) accumulator loop; MAX_STEPS clamp
      sleep.ts            // buildIslands(world, manifolds, joints): union-find; updateSleep(dt); wakeIsland(id)
      checksum.ts         // hashState(bodies): FNV-1a over a fixed-precision byte stream of p,q,v,w,m
    collision/
      manifold.ts         // Manifold {A,B,normal, points[]}; ContactPoint {point, penetration, Pn, Pt, featureId}
      broadphase.ts       // sweepAndPrune(bodies): Manifold-free candidate (i<j) pairs, sorted
      narrowphase.ts      // collide(A,B): dispatch; circleCircle; circlePolygon; polygonPolygon(SAT+clip)
                          //   SAT min-penetration, reference/incident clip (Sutherland-Hodgman side planes),
                          //   featureId from (refFace, incFace, vertex idx)
    solver/
      sequentialImpulse.ts// effectiveMass(n,t,rA,rB,invMass,invI); solveNormal(cp)/solveFriction(cp)
                          //   (Baumgarte bias + restitution threshold + Coulomb clamp); warmStart/manifold cache
      joints.ts           // RevoluteJoint, DistanceJoint, PrismaticJoint; solve() rows share effectiveMass util
    sim/
      scenes.ts           // makeStack(n), makePendulum(), makeMixedScene(seed), makeFreeMotion()
      headless.ts         // simulate(seed, sceneName|scene, steps, opts): {finalState, checksum, samples}
                          //   deterministic: seeds RNG, builds World, runs steps, returns checksum + telemetry
      benchmarks.ts       // runStacking(), runEnergy(), runDeterminism(), runPerf(): return structured metrics
    ui/
      renderer.ts         // drawWorld(ctx, world): bodies, AABBs (toggle), contacts (toggle), axes
      sandbox.ts          // input: spawn box/circle/polygon, mouse-fling (applyImpulse), buttons (gravity,
                          //   joints, pause, reset, seed, show-checksum), FPS + checksum readout
      main.ts             // bootstrap: build World from scene, RAF loop calling world.step + renderer, wire sandbox
  index.html              // kinetica landing: <canvas>, control panel, loads dist/ui/main.js as module
  dist/                   // tsc output (committed so Pages serves a static site with no build step)
  test/
    vec2.test.ts          // vector math identities
    shapes.test.ts        // Mirtich mass vs analytic (square, triangle, circle) within 1e-9
    broadphase.test.ts    // SAP finds all true overlaps, deterministic order, no dupes
    narrowphase.test.ts   // circle-circle, circle-poly (center inside/outside), poly-poly 2-point manifold
    solver.test.ts        // resting box on ground: vn -> 0, no sink beyond slop; friction stops slide
    joints.test.ts        // distance joint holds length; revolute pins; pendulum conserves approx
    determinism.test.ts   // simulate twice same seed -> identical checksum; different seed -> likely differs
    benchmarks.test.ts    // stacking/energy/determinism acceptance from research Section 13
```

### Public Type Contract (Section 11 of research spec, mapped to TS)

```ts
type Vec2 = { x: number; y: number };
interface Circle { kind: 'circle'; radius: number }
interface Polygon { kind: 'polygon'; localVerts: Vec2[]; worldVerts: Vec2[]; faceNormals: Vec2[] }
type Shape = Circle | Polygon;
interface AABB { minX: number; minY: number; maxX: number; maxY: number }
interface Body {
  id: number; p: Vec2; q: number;           // position (COM) + orientation angle
  v: Vec2; w: number;                        // linear + angular velocity
  invMass: number; invI: number;             // 0 for static
  shape: Shape; friction: number; restitution: number;
  sleeping: boolean; sleepTimer: number; f: Vec2; tau: number;
}
interface ContactPoint { point: Vec2; penetration: number; Pn: number; Pt: number; featureId: number }
interface Manifold { A: number; B: number; normal: Vec2; points: ContactPoint[] }   // normal A->B
interface Joint { kind: 'revolute'|'distance'|'prismatic'; A: number; B: number;
  anchors: Vec2[]; accImpulses: number[]; limits?: [number,number]; motor?: number }
interface World {
  bodies: Body[]; joints: Joint[]; gravity: Vec2; dt: number; accumulator: number;
  rng: () => number; solverIters: number; beta: number; slop: number;
  deterministicNoSleep: boolean;
}
function simulate(seed: number, scene: SceneSpec, steps: number, opts?: SimOpts): SimResult;
```

### Solver parameters (sane defaults, documented in `world.ts`)

- `dt = 1/60`, `MAX_STEPS = 5` (deterministic clamp drops leftover time).
- `SOLVER_ITERS = 12`, `BAUMGARTE_BETA = 0.2`, `SLOP = 0.005`.
- Restitution threshold `REST_THRESHOLD = 1.0` m/s (resting contacts get `e=0`).
- `SLEEP_LINEAR = 0.1` (motion `|v|^2 + |w|^2 r^2` below `SLEEP_LINEAR^2`),
  `SLEEP_TIME = 0.5` s, island-wide gate.
- Material mixing: friction `mu = sqrt(muA*muB)`, restitution `e = max(eA,eB)`.

## Visual & UI Specification (`kinetica/index.html`)

- **Layout:** full-viewport `<canvas>` (devicePixelRatio-aware) on the left;
  a fixed control panel on the right (or top bar on narrow viewports).
  Dark theme, monospace labels, accent color `#4fd1c5` (teal) on `#0f172a`.
- **Canvas render loop:** `requestAnimationFrame` measures frame delta, feeds
  the `world` accumulator (`step(dt)` called 0-5 times), then `renderer.draw`.
  Bodies drawn as filled polygons / stroked circles with a thin outline; optional
  overlays (toggle buttons): AABB boxes (faint), contact points + normals
  (magenta), center-of-mass dot, velocity vectors.
- **Controls:**
  - Spawn: Box / Circle / Polygon (random convex n-gon) buttons drop a body at
    cursor (or top-center) with seeded initial placement.
  - Mouse fling: click-drag on a body applies an impulse along the drag vector
    (raycast pick by point-in-AABB then shape test).
  - Toggles: Gravity on/off, Pause, Step-once, Show AABBs, Show contacts,
    Enable sleeping, Deterministic mode.
  - Joints: "Pin" (revolute between two picked bodies), "Rope" (distance),
    "Slider" (prismatic).
  - Telemetry: live FPS, body count, solver iteration count, and the current
    state **checksum** (so a seed+scene can be verified byte-identical across
    reloads). A "Copy checksum" button.
  - Preset scenes: Stack (10 boxes), Pendulum, Mixed 100-body (perf),
    Free-motion (energy test).
- **Responsive:** canvas resizes to container; control panel collapses to a
  top bar under 720px width.

## Test Matrix

| Test file | What it proves | Acceptance |
|-----------|----------------|------------|
| `vec2.test.ts` | vector identities | dot/cross/perp/norm within 1e-12 of analytic |
| `shapes.test.ts` | Mirtich mass props | square `I = m(a^2+b^2)/12`, triangle vs analytic, circle `0.5 m r^2`, all within 1e-9; COM at origin |
| `broadphase.test.ts` | SAP correctness + determinism | finds every true overlap, no duplicates, pair list order identical across runs |
| `narrowphase.test.ts` | manifold generation | circle-circle normal/pen; circle-in-poly center-inside case; poly-poly yields 2-point manifold on face-face contact; featureId stable under tiny motion |
| `solver.test.ts` | constraint resolution | a box resting on static ground: normal velocity -> ~0, penetration within `2*slop`, no sink; friction stops a sliding box |
| `joints.test.ts` | joint constraints | distance joint holds length within 1e-3 over 600 steps; revolute pins anchors; pendulum angle-period sane |
| `determinism.test.ts` | byte-exact reproducibility | `simulate(seed,scene,steps).checksum` identical across two calls; `deterministicNoSleep` flag yields identical results with/without sleep code path exercised |
| `benchmarks.test.ts` | the three mandated benchmarks | **Stacking:** 10-box column, 600 steps, no lateral escape beyond `0.5*width`, settled KE `< 1e-3*m*g*h`, identical checksum on repeat. **Energy:** free circle (no gravity) KE conserved to 1e-6 rel over 1000 steps; pendulum (no damping) ME drift `< few %`. **Determinism:** same as above. **Perf:** 100-body mixed scene reports > 60 steps/s on CI runner |

The benchmarks reuse `sim/benchmarks.ts` so the same code runs in `npm run bench`
(headless) and as Vitest assertions. `npm run checksum -- --seed N --scene stack
--steps 600` prints the deterministic checksum for manual verification and the
sandbox's "Copy checksum" cross-check.

## Notes

- **tsc-only, no bundler.** Keeping the build to `tsc` (emit ES modules to
  `dist/`, committed) means the GitHub Pages site is a pure static file with no
  CI build step, and the determinism story stays simple (one compiler, one
  output). The browser loads `dist/ui/main.js` as `<script type="module">`.
- **Baumgarte first, position-solver seam kept clean.** Ship Baumgarte
  stabilization in `solveNormal` for the first build; the energy benchmark
  (13.2) will reveal drift. The solver interface (`solveNormal`/`solveFriction`)
  is identical for a split-impulse position solver, so the swap is local and does
  not touch `world.step`.
- **No concave shapes in narrowphase.** The demo uses convex primitives and
  pre-decomposed compound bodies; a future `shapes.decompose()` (ear-clipping)
  is a documented extension, not a first-build requirement.
- **Mirror Box2D, do not invent.** SAT + reference/incident clipping +
  sequential impulse with warm starting is the proven design; the value here is
  readability, modularity, and the determinism harness, not a novel solver.
- **Name origin.** "Kinetica" - the study of motion (kinetics) plus a nod to a
  clean, lively engine.

- the Architect
