# Progress: Kinetica

- **Issue:** #124
- **Branch:** opencode/issue124-20260823094510
- **Status:** in-progress
- **Updated:** 2026-08-23T09:50:00Z

## Checklist
- [x] research: algorithmic specification of the solver (SAT, sequential impulse, friction, restitution, joints, sleeping, determinism, benchmarks)
- [x] architect: blueprint / module layout (ideas/2026-08-23-kinetica-2d-physics-engine.md)
- [ ] builder: core implementation (core/ collision/ solver/ sim/)
- [ ] builder: browser sandbox at /kinetica/index.html
- [ ] tests: determinism + stacking + energy benchmarks
- [ ] docs/ + ideas entry
- [ ] reviewer findings addressed

## Current step
Architect phase complete. Blueprint written to
`ideas/2026-08-23-kinetica-2d-physics-engine.md`: full module tree
(`kinetica/src/{core,collision,solver,sim,ui}`), public TypeScript type
contract, solver parameter defaults, browser sandbox + visual spec, and the
test matrix mapping to the three mandated benchmarks (stacking/energy/
determinism). Decision action: `build` for the Builder.

## Next steps
- Builder scaffolds `kinetica/` (package.json, tsconfig, vitest), implements
  core math/bodies/shapes/RNG/world/sleep, collision broad+narrowphase, the
  sequential-impulse solver + joints, the headless `simulate` harness, and the
  canvas sandbox at `/kinetica/index.html`.
- Tester runs the Section 13 benchmarks (stacking stability, energy
  conservation, determinism) as Vitest assertions.

## Agent log
- 2026-08-23 (Architect run 1): read architect.md, researcher spec
  (docs/kinetica-research.md), and an existing ideas file for format. Produced
  blueprint at ideas/2026-08-23-kinetica-2d-physics-engine.md: module tree,
  public TS types, solver defaults, sandbox/visual spec, and test matrix.
  Updated this progress file. Decision action: build.
- 2026-08-23 (Researcher run 1): read researcher.md, AGENTS.md, progress
  conventions. Issue #124 confirmed (Kinetica). Branch
  opencode/issue124-20260823094510 already exists. Wrote the full algorithmic
  specification to docs/kinetica-research.md covering: rigid-body model and
  mass properties (Mirtich), fixed-timestep loop, SAP broadphase, narrowphase
  (circle-circle, circle-polygon, polygon-polygon SAT + reference/incident
  face clipping for 2-point manifolds), sequential-impulse velocity solver with
  effective-mass, Coulomb friction, Baumgarte/position-correction, revolute/
  distance/prismatic joints, island-based sleeping, the determinism contract
  (seeded RNG, stable ordering, IEEE-754), data structures, complexity summary,
  and the three mandated benchmarks (stacking stability, energy conservation,
  determinism). Wrote this progress file. Decision action: architect.
