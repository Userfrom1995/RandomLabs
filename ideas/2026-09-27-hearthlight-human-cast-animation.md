# Hearthlight Human Cast Animation - four leads walk the frame

Phase 2 of the Hearthlight Reimagined rebuild (#463): the new human leads
Tam (17, ferryman's son) and Lumi (8, truth-teller) take their bodies, and
Nia and Yara step off placeholder builds onto fully articulated proportion
figures with expressive faces.

## What was built

- `film/engine/humans.js` - proportion bodies from the model-sheet head
  units (Nia 4.5, Yara 4.0, Tam 5.5, Lumi 3.5): two-segment FK arms and
  legs with knees and elbows, simple readable hands, and costume overlays
  that double as secondary-motion surfaces (wind-bellied cloak with patched
  elbow, embroidered shawl, rope-burned oilskin vest over darned wool,
  tunic with the white ankle binding). Silhouette keys readable at 390 px:
  survey pole and ribbons, keeper's staff, shoulder-yoked oar, topknots
  and ankle wrap.
- `film/engine/faces.js` - heads with gaze and deterministic blink,
  expressive brows, and a nine-viseme phoneme mouth set driven from the
  caption text at six visemes per second, blended with a seventeen-emotion
  expression sheet covering every emotion the dialogue lattice uses. All
  153 emotion-by-phoneme combinations render; M/B/F close the lips, A opens
  tall, and the mouth never breaks while the face finishes the line.
- `film/engine/acting.js` - anticipation/action/reaction/hold phases per
  shot, eased weight shifts, exertion curves peaking on the gorge traverse
  and storm carry, and secondary-motion drivers (cloth belly, shawl drift,
  topknot bounce) shaped from each shot's own wind with analytic lag, still
  scrub-exact.
- `film/engine/rigs.js` - re-rigged onto the human leads: Tam belays s12
  with the oar yoked and drops it past the gorge, Lumi is back-carried in
  s13, arm-carried in s14, and walks the s19 coda with her stick; Ruel is
  demoted to a single background appearance. The active dialogue line plays
  on its speaker's face; the bible beat holds between lines.
- `film/engine/ink.js` - face-safe boil: faces re-seed on the same 12 fps
  lattice at 0.35x amplitude (pinned, lattice-locked, still under reduced
  motion).
- `film/engine/animatic.js` - stages the full party with acting state and
  per-shot wind; Ruel at half scale behind the party in his one shot.
- `film/tools/capture.mjs` - 18 face close-up cards (5 Nia, 4 Yara, 5 Tam,
  4 Lumi) hashed into `dist/capture/faces.json` with SVG review cards.
- `film/tests/craft-humans.mjs` - 30+ gates: bible proportions, lattice
  emotion coverage, turnaround symmetry, distinct 390 px bodies with costume
  keys, boil ratio, four-phase acting bounds, Tam/Lumi story beats, dialogue
  face delivery, full-stage renders at 960 and 390 px, face-card
  reproducibility and sensitivity. Audit extended with human-module, cast
  coverage, face-boil, and acting gates.

## Why

The owner verdict on the closed #449 epic ordered proper human characters
with an original visual identity: the earlier figures read as
placeholder/childlike. This phase retires them. Every lead now stands on
two jointed legs with weight and exertion, speaks with a moving mouth, and
holds a readable silhouette at mobile widths.

## How it works

Pure functions throughout: `poseFor` gives kinematics, `faceFor` resolves
the dialogue lattice to emotion plus viseme, `actFor` gives phase/weight/
exertion/secondary drivers, `drawHuman`/`drawFace` paint. Same inputs equal
identical marks; the capture loop diffs hashes to name any look that moved.

## Key files

`film/engine/humans.js`, `film/engine/faces.js`, `film/engine/acting.js`,
`film/engine/rigs.js`, `film/engine/animatic.js`, `film/engine/ink.js`,
`film/tools/capture.mjs`, `film/tests/craft-humans.mjs`,
`film/tools/audit.mjs`, `film/docs/craft.md`, `film/docs/pipeline.md`,
`film/README.md`, `progress/463-hearthlight-reimagined-rebuild.md`.
