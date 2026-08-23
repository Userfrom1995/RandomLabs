# Progress: Kinetica

- **Issue:** #124
- **Branch:** opencode/issue124-20260823094510
- **Status:** in-progress
- **Updated:** 2026-08-23T09:50:00Z

## Checklist
- [x] research: algorithmic specification of the solver (SAT, sequential impulse, friction, restitution, joints, sleeping, determinism, benchmarks)
- [ ] architect: blueprint / module layout
- [ ] builder: core implementation
- [ ] builder: browser sandbox at /kinetica/index.html
- [ ] tests: determinism + stacking + energy benchmarks
- [ ] docs/ + ideas entry
- [ ] reviewer findings addressed

## Current step
Research phase complete. The mathematical/algorithmic specification is written
to `docs/kinetica-research.md`. Handing off to the Architect via
`/tmp/random-lab-decision.json` action `architect`.

## Next steps
- Architect reads `docs/kinetica-research.md` and produces the TypeScript
  module blueprint (core / collision / solver / sim / ui), the public types,
  and the deterministic `simulate(seed, scene, steps)` harness plan.
- Builder implements per the blueprint; Tester runs the Section 13 benchmarks.

## Agent log
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
