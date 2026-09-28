# Mythduel Phase 3: Duel Animation and Combat Craft

Phase 3 of the Mythduel epic (issue #470): the painted animatic fighters are
now full FK combat rigs, choreographed beat by beat and wired into the Pages
theatre. Original interpretations of public-domain myth figures only; no
third-party likeness anywhere (audit IP scan green).

## What was built

- `mythduel/engine/rigs.js`: FK proportion bodies. Thor 7.0 heads, shoulders
  2.1 heads; Zeus 7.4 heads, shoulders 1.8 heads; binding hip ratios 1.35 vs
  1.15. Joint solver (root, hips, chest, head, FK arm/leg chains), turnaround
  mirror, silhouette metrics, 5 percent proportion-drift check.
- `mythduel/engine/acting.js`: authored keyframe choreography for all 8 beats
  (terms, circling/feints, apex-block with impact reaction and overextend,
  thrown-weapon wager with mid-sky crossing and clean catches, clinch with
  traded blows/knee/rise, back-to-back weathering, withheld opening, open-
  handed loosing). Six lattice-exact impacts, wind-driven cloth sway,
  geography-anchored particles capped at 24.
- `mythduel/engine/faces.js`: gaze at the foe, seeded blinks, effort-pitched
  brows, exertion mouths; effort curves calm in verse and hot at impacts.
- `mythduel/engine/fighters.js`: the painter (tapered limbs with per-segment
  boil, gripping hands with per-grip weapon states, tremor scaled by fatigue
  0-7, wound marks from the clinch, braid/fringe secondary motion, dropped
  shaft lying on the rock, thrown flights, aged impact bursts) plus headless
  helpers (pose, contact, silhouette, tremor).
- Theatre wired (`player/player.js` paints rigs, flights, and particles);
  `tools/capture.mjs` gains fighter close-up cards; `tools/audit.mjs` gains 8
  combat gates (40 total); `tests/phase3-combat.mjs` pins it all (41 probes);
  `repro.sh` runs the combat suite; docs stay unified (README, craft,
  pipeline).

## Why

Phase 2 proved the arena and the boards; the fighters were simplified markers.
This phase delivers the honest combat craft the acceptance bar demands: every
exchange readable, every contact planted, every impact on the grid, every
cost carried.

## How it works

Pose is a pure function of quantized local beat time, interpolated between
authored keys; faces, sway, and particles seed from boil-slotted substreams.
The stage, the audit, and the capture cards share the same functions, so
stills and canvas agree by construction. `bash mythduel/repro.sh` stays green.

## Key files

`engine/rigs.js`, `engine/acting.js`, `engine/faces.js`, `engine/fighters.js`,
`player/player.js`, `tools/capture.mjs`, `tools/audit.mjs`,
`tests/phase3-combat.mjs`, `docs/craft.md`, `docs/pipeline.md`.

## Notes

Silent stage stands in for score/SFX (Phase 4); trailer skeleton stays data
only (premiere work). No fake controls rendered.
