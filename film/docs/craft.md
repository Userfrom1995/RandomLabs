# Hearthlight craft notes

Style brief: the feeling of classic hand-drawn film - warm ink lines,
watercolor backgrounds, patient camera work - executed as original craft,
never imitation.

## The renderer (`film/engine/animatic.js`)

The renderer plays the full timeline as a pure function of (timeline,
time): scrubbable, pausable, testable. Four craft modules do the work:

- **Ink** (`engine/ink.js`): the 2s line-boil offset (jitter re-seeds at
  12 fps from the shot substream, freezing identically when scrubbed) plus
  a double-pass hand-inked stroke (soft bristle-drag under-stroke, crisp
  main stroke) so lines carry calligraphic weight at any size.
- **Paper** (`engine/paper.js`): the sky is painted as three stacked wash
  passes (deep, body, lift) over a base gradient, closed with paper grain,
  sparse laid fibres, and a warm edge vignette.
- **Valley paint set** (`engine/backgrounds.js`): one painter per
  screenplay background (all 14): layered ridge silhouettes, mist bands,
  lantern rows that gutter and rekindle with the story, the hill cairn,
  Yara's glowing doorway, grove trunks with hanging moss, the gorge rope
  bridge over sprayed water, slanted storm streaks, the switchback path,
  and the cairn stones with the lighting bloom.
- **Character rigs** (`engine/rigs.js`): Nia, Yara, and Ruel drawn from the
  character bible proportions and acted from eased poses. Nia walks, runs,
  climbs, kneels, and raises the lantern with stride/bob/lean keyframes;
  fear in the storm plays as stillness, not shaking. Yara boils at half
  rate and knots the storm-ribbon on a farewell beat. Ruel treads the
  gorge, flicks one ear, and wags his short tail exactly once.

Camera grammar: push, pull, pan, track, sweep, rise, crane, tilt, bloom,
fade, plus hold (breathing micro-drift), drift (slow diagonal), and orbit
(gentle sway with zoom), all declared per shot in the screenplay.

Reduced motion (`prefers-reduced-motion`) disables boil and grain
animation; the film still plays every frame exactly.

## The score sketch

Four original leitmotifs (rows in `film/score/themes.js`): Nia's rising
pentatonic line, the wind's rocking minor second, Ruel's dotted low tread,
the cairn stepwise hymn. The animatic performer voices them on triangle
lead plus detuned pad, following each shot's tempo and mood, resetting its
phrase on motif changes. Full orchestration with separate synth voices,
SFX bed, mix, and WAV stem export arrives in its own phase; the cue map it
must satisfy is already binding and audit-covered.
