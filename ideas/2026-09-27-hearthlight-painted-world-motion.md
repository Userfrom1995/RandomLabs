# Hearthlight Painted World and Hand-Drawn Motion - the valley gets its paint and its walk

Phase 3 of the Hearthlight Reimagined rebuild (#463): every one of the 14
locations is repainted in four honest passes, and the cast learns to walk
with weight: ground-contact gait, exertion-run climbs, dialogue emphasis
in the head, cloth and hair on the acting drivers, weather re-anchored to
the painted world.

## What was built

- `film/engine/backgrounds.js` - location-by-location repaint. A
  composition table fixes horizon, focal mass, and key light per location
  (identical at 960 px and 390 px); three wash layers (deep, body, lift)
  grade the sky with a fore wash over the ground; a detail pass paints
  foliage clusters, rock facets, water reflections, fern fronds, Yara's
  interior props (hearth arch, kettle, blanket folds, jar shelf, hanging
  herbs), threshold gate posts with storm-ribbons, chart instruments, path
  stones, and dawn birds; an atmosphere pass lays ember-light falloff,
  storm murk, dawn bloom, night hush, grove gloom, or hearth glow. Detail
  stroke counts scale down honestly at narrow widths through
  `detailCountFor` (fewer strokes, same composition, never blurred), and
  the paint reports anchors (gorge water line, house hearth) the weather
  re-attaches to.
- `film/engine/humans.js` - ground-contact gait (`footPlant`: stance
  plants with zero lift and the fore travelling back under the body,
  swing lifts over a sine hump), exertion shaping (`gaitFor`: the storm
  climb runs with faster cadence, higher step, harder torso rock), carry
  roll for loaded carriers, contact shadows under every foot, shallow
  walk bob so planted feet keep contact, cloak belly on the acting cloth
  driver.
- `film/engine/faces.js` - dialogue emphasis nod (`speechNod`: the head
  rides the live viseme openness, silence reads exactly 0); Lumi's
  topknots lag on the acting bounce driver when the stage feeds one.
- `film/engine/rigs.js` - `faceFor` carries the nod on live lines and
  rests it off them; every human delegate forwards the acting secondary
  drivers into the body.
- `film/engine/animatic.js` - stages acting secondaries into every rig
  and feeds the painted anchors into the weather layer.
- `film/engine/particles.js` - re-anchored weather (`waterYFor`,
  `hearthFor`): gorge spray fills only the painted water band, house
  sparks rise from the painted hearth, honest fallbacks without a painted
  frame.
- `film/tools/capture.mjs` - 14 background plates (one per location,
  hashed at 960 px with stroke and gradient counts, re-rendered at 390 px
  for the density pair) in `dist/capture/plates.json` with SVG review
  cards carrying the composition values.
- `film/tests/craft-world.mjs` - 40-gate world and motion suite:
  composition, washes, honest budgets, plate detail and scale-down,
  stance/swing gait, run climbs, nod timing, wind-answered cloth, contact
  shadows, anchored spray, stage at both widths, plate reproducibility.
- `film/tools/audit.mjs` - Phase 3 gates: composition and wash coverage,
  honest budgets, gait run, silent nod, anchor fallbacks, secondary and
  anchor wiring, plates loop, suite committed.

## Why it matters

The owner's verdict on the first cut named thin backgrounds and
bare-minimum motion as closing-grade defects. This phase answers both
with systems, not one-off art: the four-pass paint structure means every
future location rework follows the same composition-to-atmosphere path,
and the gait/secondary/anchor contracts mean every future acting beat
inherits weight, cloth lag, and weather that belongs to its painting.
Self-review measured the walk instead of eyeballing it: stance feet float
at most 3 px on a 120 px body (sub-pixel at mobile widths) with full
contact shadows, swing feet apex near 11 px.

## Key files

`film/engine/backgrounds.js`, `film/engine/humans.js`,
`film/engine/faces.js`, `film/engine/rigs.js`,
`film/engine/animatic.js`, `film/engine/particles.js`,
`film/tools/capture.mjs`, `film/tools/audit.mjs`,
`film/tests/craft-world.mjs`, `film/docs/craft.md`,
`film/docs/pipeline.md`, `film/README.md`.

## Notes

- Rerun-identity only: no absolute hashes are pinned anywhere, so the
  repaint moved every hero hash freely; determinism suites prove the new
  paint pins instead.
- Two regressions caught mid-phase by the older suites: a dropped `l2`
  argument in the leg rewrite (NaN feet, found by final-audit) and hostile
  widths throwing in the strict budget function (found by the Phase 2
  hostile suite). Both fixed at the source with gates kept.
- Known stand-ins for Phase 4: SFX still sit on the conservative Phase 1
  cue map (re-anchor next), dialogue-first ducking not yet in the mix.

- the Builder
