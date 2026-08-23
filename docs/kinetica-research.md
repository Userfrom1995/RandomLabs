# Kinetica — 2D Rigid-Body Physics Engine: Algorithmic & Mathematical Specification

- **Issue:** #124 (Kinetica — 2D rigid-body physics engine, TypeScript)
- **Author role:** Researcher (Dr. Mob)
- **Target language:** TypeScript (browser sandbox + headless core)
- **Hosting:** static GitHub Pages at `/kinetica/index.html`
- **Handoff target:** Architect (blueprint) then Builder (implementation)

This document is the scientific blueprint. It defines the solver mathematics,
data structures, complexity bounds, determinism contract, and benchmark
definitions. It does NOT contain production code; the Architect turns this into
a module layout and the Builder implements it.

---

## 1. Scope and design goals

Kinetica is an impulse-based 2D rigid-body simulator. Bodies are convex:
circles and (possibly concave-built-from-convex) convex polygons. The engine
must satisfy four hard requirements from the mandate:

1. **Readable solver.** The solver is the product. Every stage (broadphase,
   narrowphase, manifold generation, sequential-impulse resolution, position
   correction, joints, sleeping) is isolated and unit-testable.
2. **Interactive browser sandbox.** Boxes, circles, and polygons are dropped,
   stacked, and flung; collisions, tumbling, and settling happen in real time.
3. **Deterministic, seeded, headless core.** Given the same seed and inputs,
   the simulation produces bit-identical results on every platform.
4. **Documented + benchmarked.** The solver design is documented and stability
   (stacking) plus energy-conservation sanity checks are defined here.

Design priorities, in order: *correctness and stability first*, then
determinism, then performance. A solver that jitters or explodes is useless no
matter how fast.

---

## 2. Core model and representation

### 2.1 Rigid body state

Each body `B` carries:

| Symbol | Meaning | Units |
|--------|---------|-------|
| `p` | world-space center of mass (position) | length |
| `q` | orientation, a scalar angle `theta` (2D) | rad |
| `v` | linear velocity of the COM | length / time |
| `w` | angular velocity (scalar in 2D) | rad / time |
| `m`, `invMass` | mass and its inverse (0 for static) | mass |
| `I`, `invI` | moment of inertia about COM and inverse (0 for static) | mass * length^2 |
| `f` | accumulated force (from gravity, applied forces) | force |
| `tau` | accumulated torque | torque |
| `shape` | collision geometry (circle or convex polygon) | - |
| `friction`, `restitution` | per-body material coefficients | - |
| `sleeping` | boolean island sleep flag | - |

For 2D a rotation is a single scalar, so the orientation matrix is
`R(theta) = [[cos, -sin],[sin, cos]]`. The angular part of the inertia tensor
collapses to a scalar `I`.

### 2.2 Mass properties

- **Circle** of radius `r`, uniform density `d`:
  `m = d * pi * r^2`, `I = 0.5 * m * r^2`.
- **Convex polygon** with vertices `V_i` (CCW, centered so COM is origin at
  build time). Use the standard polygon inertia summation (See
  Mirtich, "Fast and Accurate Computation of Polyhedral Mass Properties"):

  ```
  For each edge (V_i, V_{i+1}):
    cross = V_i.x * V_{i+1}.y - V_{i+1}.x * V_i.y
    intx2 = V_i.x^2 + V_i.x*V_{i+1}.x + V_{i+1}.x^2
    inty2 = V_i.y^2 + V_i.y*V_{i+1}.y + V_{i+1}.y^2
    mass += cross * intx2        (times d/12)
    I    += cross * (intx2 + inty2)   (times d/12)
  ```

  COM is computed first via the area-weighted centroid, vertices are shifted to
  COM, then inertia is recomputed. This keeps `p` exactly the COM.

Static bodies (walls, ground) have `invMass = 0`, `invI = 0`. They never move
and impose one-sided constraints on dynamic bodies.

### 2.3 Material mixing

When two bodies collide, combine coefficients:

```
restitution   e = max(e_A, e_B)         (or e_A * e_B; document the choice; max is common)
friction      mu = sqrt(mu_A * mu_B)    (Box2D-style geometric mean; stable, symmetric)
```

Use geometric mean for friction (symmetric, never negative, well-behaved). For
restitution use `max` so a bouncy ball on a dead floor still bounces.

---

## 3. Time stepping

Use a **fixed** timestep `dt` (default `1/60` s) with an accumulator so the
render frame rate is decoupled from the physics rate (Gaffer "Fix Your
Timestep"). Determinism requires the number of substeps to be a pure function
of accumulated time; cap maximum substeps per frame (e.g. 5) to avoid spiral-of-
death, and on capping, drop leftover time (do not carry it) to stay
reproducible.

```
accumulator += frameDelta
steps = 0
while accumulator >= dt and steps < MAX_STEPS:
    step(dt)
    accumulator -= dt
    steps += 1
if steps == MAX_STEPS: accumulator = 0   // deterministic clamp
```

Inside a single `step(dt)` (semi-implicit Euler / symplectic):

```
1. applyForces:  v += dt * invMass * f ;  w += dt * invI * tau   // f includes gravity
2. broadphase + narrowphase -> contact manifolds
3. joints: build constraint list
4. island/sleeping classification
5. solve velocity constraints (sequential impulses) for iters
6. integrate positions: p += dt * v ;  theta += dt * w
7. solve position constraints (or Baumgarte) for posIters
8. update sleep timers
9. clear accumulators f, tau
```

Gravity is applied as a force `f += m * g` during step 1 (or folded directly
into `v += dt * g` for dynamic bodies; keep it explicit via forces so joints
and applied impulses interact correctly).

---

## 4. Broadphase

Goal: produce a list of *potential* body pairs to test narrowly, in O(n log n)
or better, with stable (deterministic) ordering.

**Chosen algorithm: Sweep and Prune (SAP) on the x-axis AABBs**, with a
deterministic tie-break. Alternative acceptable: uniform spatial hash grid for
very dense scenes. SAP is simpler to make deterministic.

For each body maintain an axis-aligned bounding box `AABB = {minX, minY, maxX,
maxY}` in world space (recomputed each step from shape + transform).

```
1. collect all AABBs, store (minX, bodyId)
2. sort the minX list by minX, tie-break by bodyId (ascending) -> stable order
3. sweep: maintain active interval list; for each endpoint, test overlap of
   [minX,maxX] with active intervals; if x-overlap and y-overlap -> candidate pair
4. dedupe pairs (i<j canonical), sort candidate list by (i,j) for determinism
```

- **Complexity:** sort O(n log n); sweep O(n + k) where k is overlap events.
  Total O(n log n) expected.
- **Overlap test** requires both x and y interval overlap to emit a candidate.
- **Determinism:** the only sorting is by `(minX, bodyId)` and pair tuples
  `(i, j)`; no floating hash order dependence.

---

## 5. Narrowphase: collision detection and manifold generation

The narrowphase answers two questions per candidate pair: *do they touch?* and
*where, with what normal and penetration?* The output is a **contact manifold**:
one or two contact points, a shared collision normal, and a penetration depth
per point. A 2-point manifold is essential for stable stacking.

### 5.1 Circle vs Circle

```
d = p_B - p_A
dist = |d|; r = r_A + r_B
if dist > r: no contact
n = d / dist            // from A to B
penetration = r - dist
contactPoint = p_A + n * (r_A - penetration/2)   // midpoint on the line
manifold: 1 point, normal n, depth penetration
```
Special-case `dist == 0` (coincident centers): pick `n = (1,0)` arbitrary but
deterministic.

### 5.2 Circle vs Polygon

Find the polygon face with the axis of minimum penetration against the circle
center (the face whose outward normal points most toward the circle), then clip.
Standard approach:

1. Transform circle center into polygon local space.
2. Find the polygon vertex with minimum distance to the circle center; record
   the region (vertex or face).
3. If the center is inside the polygon, the normal is the face with max
   separation; contact point is the circle center projected to that face.
4. If outside, test whether the center is within the Voronoi region of a face
   (use face normal dot product) or a vertex (distance to vertex). This yields
   one contact point. Generate the manifold from that.

This reduces to a single robust contact point (circle-polygon never needs two).

### 5.3 Polygon vs Polygon (the hard case)

Use the **Separating Axis Theorem (SAT)** to find the axis of minimum
penetration among all face normals of both polygons. Then build the manifold by
**reference/incident face clipping** (the Erin Catto / Box2D method), which
produces up to two contact points and is the key to stable stacks.

**SAT minimum-penetration axis:**

```
function findMinPenetration(A, B):
    bestDist = -inf; bestIndex = -1
    for each face i of A:
        n = A.faceNormalWorld[i]
        support = B.support(-n)            // furthest B vertex along -n
        v = A.faceVertexWorld[i]
        d = dot(n, support - v)
        if d > 0: return SEPARATED        // found a separating axis -> no collision
        if d > bestDist: bestDist = d; bestIndex = i
    return (bestDist, bestIndex)           // bestDist is negative penetration
```

Repeat with A and B swapped; the axis with the *larger* (least negative)
penetration is chosen. The owner polygon becomes the **reference** face, the
other the **incident** face.

**Reference/incident clipping:**

```
1. refFace = the chosen face on the reference polygon (its 2 vertices, normal n)
2. incFace = the incident polygon face most anti-parallel to n:
       find incident face j minimizing dot(incidentNormal[j], n)
3. Clip the incident face (2 verts) against the side planes of the reference
   face (the two planes through the reference vertices, perpendicular to n).
       -> produces 0, 1, or 2 points that lie within the reference face slab
4. For each surviving clipped point, compute penetration = dot(n, refVert - point)
   keep points with penetration >= -tolerance (>= 0 ideally)
5. Manifold = those points (<= 2), normal n (pointing from reference to
   incident, oriented so it points from A to B consistently), depths.
```

Clip step is the classic Sutherland-Hodgman segment clip against two side
planes. This reliably yields the 1- or 2-point manifold that makes boxes rest
on each other without jitter.

**Manifold consistency:** always orient the normal so it points from body A to
body B (flip `n` and re-sign depths if the reference polygon is B). This makes
the solver sign convention uniform.

### 5.4 Warm starting data

Each manifold point stores an accumulated normal/tangent impulse from the
previous step, keyed by a deterministic **feature id** (the reference/incident
face + vertex indices) so impulses can be matched across frames for warm
starting. The feature id must be stable under small motion (avoid hash/random).

---

## 6. Velocity constraint formulation (sequential impulses)

We resolve collisions as velocity-level non-penetration constraints plus
friction, solved by **sequential impulses** (Catto's iterative method). This is
the readable, stable, industry-standard 2D solver.

For a contact between A and B with normal `n` (A->B), contact point `r` gives
rA = contact - p_A, rB = contact - p_B.

Relative velocity at the contact:

```
dv = (v_B + w_B x rB) - (v_A + w_A x rA)
```

In 2D, `w x r = (-w * r.y, w * r.x)`. The normal relative velocity:

```
vn = dot(dv, n)
```

### 6.1 Effective mass

The normal "effective mass" (inverse of the constraint mass):

```
rnA = cross(rA, n)      // scalar in 2D: rA.x*n.y - rA.y*n.x
rnB = cross(rB, n)
kn = invMassA + invMassB + invIA * rnA^2 + invIB * rnB^2
massNormal = 1 / kn
```

Tangent `t = perp(n)` (e.g. `(-n.y, n.x)`). Similarly:

```
rtA = cross(rA, t);  rtB = cross(rB, t)
kt = invMassA + invMassB + invIA * rtA^2 + invIB * rtB^2
massTangent = 1 / kt
```

### 6.2 Normal impulse (restitution)

Target normal velocity after resolution:

```
// bias for restitution only when approaching fast (resting contacts get e=0)
restitutionBias = 0
if vn < -threshold (e.g. 1 m/s): restitutionBias = -e * vn
```

The new (incremental) normal impulse magnitude:

```
dPn = massNormal * (-vn + restitutionBias)
```

Clamp accumulated normal impulse so it never goes negative (non-penetration is
a one-sided inequality `j_n >= 0`):

```
oldPn = Pn;  Pn = max(oldPn + dPn, 0);  dPn = Pn - oldPn
applyImpulse(dPn * n)
```

where `applyImpulse(j)` does:

```
v_A -= invMassA * j * n ;  w_A -= invIA * cross(rA, j * n)
v_B += invMassB * j * n ;  w_B += invIB * cross(rB, j * n)
```

### 6.3 Tangent (friction) impulse (Coulomb)

```
vt = dot(dv, t)
dPt = massTangent * (-vt)
// Coulomb cone: total tangent impulse magnitude <= mu * normal impulse
maxPt = mu * Pn
oldPt = Pt;  Pt = clamp(oldPt + dPt, -maxPt, maxPt);  dPt = Pt - oldPt
applyImpulse(dPt * t)
```

This is the box-constrained (Coulomb) friction solve done per contact, per
iteration.

### 6.4 Iterative loop and warm starting

```
for each contact point: Pn = warmStartPn; Pt = warmStartPt
   apply warm-start impulses (added to bodies' velocities before solving)
for iter in 1..SOLVER_ITERS (e.g. 10-20):
    for each manifold:
        for each contact point: resolve normal (6.2) then tangent (6.3)
// after solve, store Pn, Pt as warm-start for next frame
```

- **Complexity:** O((contacts + joints) * SOLVER_ITERS) per step. With
  thousands of contacts this is the dominant cost; spatial coherence + warm
  starting gives fast convergence.
- **Determinism:** iteration order is the sorted contact/joint list; all
  arithmetic is IEEE-754 deterministic given identical inputs and order. No
  multithreading in the core (or, if parallelized, use deterministic reduction).

---

## 7. Position correction (anti-sink / stabilization)

Velocity impulses alone let stacks slowly sink due to Baumgarte energy injection
or numerical drift. Use **Baumgarte stabilization** for simplicity/readability,
with the option of a separate **position solver** (split impulse / non-linear
Gauss-Seidel on position) for higher quality.

**Baumgarte (recommended for the readable core):**

```
// during velocity solve, add a position bias to the normal target:
bias = beta/dt * max(penetration - slop, 0)    // beta ~ 0.2, slop ~ 0.005
dPn = massNormal * (-vn + bias + restitutionBias)
```

`slop` lets contacts rest with a tiny tolerated penetration (removes jitter);
`beta` is the soft correction factor. This is the simplest stable choice.

**Alternative (better, more code): split-impulse / separate position solver.**
After velocity solve, run a second pass that directly corrects positions by
moving bodies apart along `n` by a fraction of penetration (no velocity
change), iterating like the velocity solver. This avoids adding energy. The
Architect should pick ONE and document it; the spec recommends Baumgarte for
the first build, with a clean seam to swap in a position solver later.

---

## 8. Joints (constraint-based)

Joints are solved with the same sequential-impulse machinery, expressed as
point-to-point or relative constraints. Required joint types from the mandate:

### 8.1 Revolute (pin) joint

Anchor point `c` world-space, common to both bodies. Constraint: positions of
the two anchor points coincide.

- Relative velocity at anchor along axes `(1,0)` and `(0,1)` must be zero.
- Build two 2D constraint rows (x and y) with effective masses from `rA`, `rB`
  exactly like the tangent rows. Solve two scalar impulses per iteration,
  clamped (revolute is bilateral, no clamp on accumulated impulse unless a
  motor/limit is added).
- Optional: angular motor (drive `w_B - w_A` to a target) and angle limits.

### 8.2 Distance joint

Maintain `|p_B + rB - (p_A + rA)| = L`. Constraint velocity:
`dot(dv, n) = 0` where `n` is the unit vector between the two anchor points;
impulse is one scalar, clamped to `[min, max]` if limits are set (rope vs rod).

### 8.3 Prismatic (slider) joint

Constrain relative motion to a single axis: the two bodies share an axis and
may only translate along it (and rotate together or be angle-locked). Expressed
as two point constraints plus an angular constraint row. Provide the formula
set; the first build may ship revolute + distance and add prismatic behind a
flag.

All joints integrate into the same `contacts + joints` iteration list, so the
velocity solver handles them uniformly. Store accumulated impulses per joint
row for warm starting.

---

## 9. Sleeping (island-based)

To keep large scenes stable and cheap, bodies that have been "still" for a
while go to sleep (excluded from integration and solving) and wake on contact
with a moving body.

### 9.1 Island classification

Build **islands** via flood fill over the contact/joint graph (union-find or
BFS). A static body anchors an island. An island is allowed to sleep only if
every dynamic body in it has low activity.

### 9.2 Sleep criterion

Track a per-body `sleepTimer` and a low-pass "motion" measure:

```
motion = |v|^2 + |w|^2 * (typicalRadius^2)    // scale angular into length units
if motion < SLEEP_LINEAR^2 (e.g. 0.01) for longer than SLEEP_TIME (e.g. 0.5s):
    mark candidate-sleeping
```

When an entire island is candidate-sleeping, set `sleeping = true`, zero its
velocities, and skip it in integrate/solve. Any contact with a non-sleeping
body, or an applied impulse/force, wakes the island (set `sleeping=false`,
reset `sleepTimer`). Sleeping is **disabled while warm-start matching is active
across the sleep boundary** to avoid impulse bookkeeping bugs: when an island
wakes, reset its warm-start impulses.

- **Determinism:** sleep timers advance with the fixed `dt`, so sleep state is a
  deterministic function of the simulation. Document that sleep may change
  floating results trivially only through skipping solver work; to guarantee
  bit-identical results, provide a `deterministicNoSleep` flag for headless
  tests.

---

## 10. Determinism contract

This is the portion the mandate explicitly requires ("deterministic, seeded,
headlessly-testable core").

1. **Fixed timestep** with deterministic substep clamp (Section 3).
2. **Seeded RNG** (mulberry32 or xorshift32, integer-only) used for ANY
   randomness (initial body placement, demo scene jitter, fling direction).
   No `Math.random()`.
3. **Stable ordering** everywhere: broadphase sort by `(minX, bodyId)`;
   candidate pairs canonical `(i<j)`; contacts/joints processed in a sorted,
   id-derived order; no unordered map iteration, no hash-order dependence.
4. **IEEE-754 determinism:** the core avoids `NaN`/`Inf` (guard zero-length
   normals, coincident centers), avoids `Math.tanh`/`exp` in the hot path
   except where their results are identical across engines; pure `+ - * /` and
   `sqrt`, `sin`, `cos` which are deterministic enough for a seeded demo (note:
   cross-platform `sin/cos` can differ in the last ULP; for strict byte
   equality across machines, provide a pluggable deterministic `sincos` using a
   fixed polynomial or a lookup, documented as optional).
5. **No time-of-day, no threading nondeterminism** in the core. The browser
   render loop feeds frame deltas but the physics is substep-deterministic.

Provide a headless `simulate(seed, scene, steps) -> finalState` function that
returns a deterministic checksum (e.g. a hash of body positions/velocities),
used by tests.

---

## 11. Data structures (suggested, for the Architect)

```
Vec2            { x, y }                      // immutable-ish value type
Body            { id, p, q, v, w, invMass, invI, shape, material, sleep state, accumulators }
Shape =
  | { kind: 'circle', radius }
  | { kind: 'polygon', localVerts[], worldVerts[], faceNormals[] }
AABB            { minX, minY, maxX, maxY }
Manifold        { A, B, normal, points: [{ point, penetration, Pn, Pt, featureId }] }
Joint           { kind, A, B, anchors, accumulatedImpulses, limits/motor }
World           { bodies[], joints[], gravity, dt, accumulator, rng, broadphase index, solver params }
```

The Architect maps these to TypeScript modules (e.g. `core/vec2.ts`,
`core/body.ts`, `core/shapes.ts`, `collision/broadphase.ts`,
`collision/narrowphase.ts`, `solver/sequentialImpulse.ts`, `solver/joints.ts`,
`core/sleep.ts`, `core/world.ts`, `core/rng.ts`, `sim/headless.ts`).

---

## 12. Complexity summary

| Stage | Time | Space |
|-------|------|-------|
| Broadphase (SAP) | O(n log n + k) | O(n) |
| Narrowphase (all pairs) | O(k * c) (c = shape complexity, small) | O(k) manifolds |
| Velocity solve | O((C + J) * I) (I iters, C contacts, J joints) | O(C + J) |
| Position integrate + correction | O(n) | O(n) |
| Sleep island build | O(n + C + J) | O(n) |
| **Total per step** | **O(n log n + (C+J)*I)** | **O(n + C + J)** |

With `I ~ 10-20` and `C, J` bounded by scene size, the engine is real-time for
hundreds of bodies in JS. The Architect should add an LRU manifold cache and
possibly a uniform grid for very dense scenes beyond a few hundred bodies.

---

## 13. Benchmark definitions (the mandate requires these)

The Tester / Builder must implement these and report numbers. The Researcher
specifies the acceptance behavior.

### 13.1 Stacking stability test

- Scene: a column of N boxes (e.g. N = 10) of equal size stacked perfectly
  vertically on a static ground, zero initial velocity, gravity on.
- Run for T = 10 s (600 steps) at dt = 1/60.
- **Acceptance:**
  - No body's center escapes a horizontal band of `+/- (0.5 * boxWidth)` from
    the stack centerline (no lateral blow-up).
  - Total penetration of any contact stays below a small slop budget
    (e.g. `< 2 * boxHeight * 0.01`).
  - After settling (last 2 s), mean kinetic energy per body
    `< 1e-3 * m * g * boxHeight` (effectively at rest; no perpetual jitter).
  - Determinism: two runs with the same seed produce identical final state
    checksum.

### 13.2 Energy conservation sanity check

- Scene: a single dynamic circle (no gravity, or gravity compensated) given an
  initial velocity, no contacts, simulate free motion, OR a pendulum (revolute
  joint, gravity on) with no damping/restitution.
- **Acceptance (free motion, no gravity):** total kinetic energy
  `0.5*m*|v|^2 + 0.5*I*w^2` is conserved to within `1e-6` relative tolerance
  over 1000 steps (verifies the integrator and that the solver adds no
  spurious energy when no contacts occur).
- **Acceptance (pendulum, damping off, restitution 0):** total mechanical
  energy (kinetic + gravitational potential `m*g*y`) drifts by less than a few
  percent over many swings; the seam choice (Baumgarte vs position solver)
  must not inject visible energy (Baumgarte can add a little; document the
  measured drift and prefer the position solver if drift exceeds tolerance).

### 13.3 Determinism test

- Run the same seeded demo scene twice; assert byte-identical body-state
  checksums after a fixed step count. Provide a `--checksum` headless mode.

### 13.4 Performance sanity

- Report steps-per-second for a 100-body mixed scene on a reference machine;
  the readable core need not be optimal but must stay real-time (> 60 Hz) for
  the demo's default scene.

---

## 14. Pseudo-code: one full step

```
step(dt):
  // 1. integrate velocities (forces)
  for b in dynamicBodies:
      if b.sleeping: continue
      b.v += dt * (b.f * b.invMass) + dt * gravity      // gravity as accel
      b.w += dt * b.tau * b.invI
  // 2. broadphase
  pairs = sweepAndPrune(bodies)              // sorted candidate (i<j)
  // 3. narrowphase -> manifolds
  manifolds = []
  for (A,B) in pairs:
      m = collide(A,B)                        // SAT + clipping, or circle cases
      if m: manifolds.push(m)
  // 4. joints
  jointList = world.joints
  // 5. warm start
  for m in manifolds: applyWarmStart(m)
  for j in jointList: applyWarmStart(j)
  // 6. solve velocity (sequential impulses)
  for it in 1..SOLVER_ITERS:
      for m in manifolds: for cp in m.points: solveNormal(cp); solveFriction(cp)
      for j in jointList: solveJoint(j)
  // 7. integrate positions
  for b in dynamicBodies:
      if b.sleeping: continue
      b.p += dt * b.v
      b.q += dt * b.w
  // 8. position correction already folded into solveNormal via Baumgarte
  //    (or run separate position solver here)
  // 9. sleep update
  updateSleep(manifolds, jointList, dt)
  // 10. store warm-start, clear forces
  for m in manifolds: storeWarm(m)
  for j in jointList: storeWarm(j)
  for b in bodies: b.f = 0; b.tau = 0
```

---

## 15. Risks and recommendations

- **Box2D is the gold reference.** Mirror its SAT + clipping + sequential
  impulse design for correctness; do not invent a new solver. Read Catto's
  "Box2D: How to Create a Custom Physics Engine" and the GDC slides.
- **2-point manifolds are mandatory for stacking.** Single-point polygon
  contacts jitter and sink.
- **Restitution threshold** prevents resting contacts from bouncing forever
  (the "resting contact" bug).
- **Baumgarte vs position solver:** ship Baumgarte first for readability; the
  energy benchmark (13.2) will reveal drift; swap to a position solver if it
  fails tolerance. Keep the solver interface identical so the swap is local.
- **Determinism is a feature, not an afterthought.** Wire the seeded RNG and
  stable ordering from day one; retrofitting is painful.
- **No concave shapes in the narrowphase.** Decompose concave polygons into
  convex pieces at load time (suggest a simple ear-clipping decomposition, or
  restrict the demo to convex primitives plus pre-decomposed compound bodies).

---

## 16. Handoff to the Architect

The Architect should produce a module blueprint that:

1. Separates `core` (math, bodies, shapes, RNG, world) from `collision`
   (broadphase, narrowphase) from `solver` (sequential impulse, joints,
   position correction) from `sim` (headless deterministic harness, benchmarks)
   from `ui` (browser sandbox, canvas renderer, input/fling controls).
2. Exposes a deterministic `simulate(seed, scene, steps)` API for tests.
3. Defines the public TypeScript types matching Section 11.
4. Plans the browser sandbox at `/kinetica/index.html` with a canvas loop that
   calls `step(dt)` and renders bodies, plus UI to spawn boxes/circles/polygons
   and apply flings.
5. Schedules the benchmarks of Section 13 as automated tests.

` - Dr. Mob, the Researcher`
