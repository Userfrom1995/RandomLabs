# Hearthlight craft notes

Style brief: the feeling of classic hand-drawn film - warm ink lines,
watercolor backgrounds, patient camera work - executed as original craft,
never imitation.

## The renderer (`film/engine/animatic.js`)

The renderer plays the full timeline as a pure function of (timeline,
time): scrubbable, pausable, testable, locked to a 24 fps frame grid
(`engine/frames.js`) so playback, seeks, and the capture loop all land on
identical instants. Nine craft modules do the work:

- **Ink** (`engine/ink.js`): the 2s line-boil offset (jitter re-seeds at
  12 fps from the shot substream, freezing identically when scrubbed) plus
  a double-pass hand-inked stroke (soft bristle-drag under-stroke, crisp
  main stroke) so lines carry calligraphic weight at any size.
- **Paper** (`engine/paper.js`): the sky is painted as three stacked wash
  passes (deep, body, lift) over a base gradient, closed with paper grain,
  sparse laid fibres, and a warm edge vignette.
- **Valley paint set** (`engine/backgrounds.js`): one painter per
  screenplay background (all 14), each in four passes. A composition table
  fixes the horizon, focal mass, and key light per location (identical at
  960 px and 390 px); three wash layers (deep, body, lift, each on its own
  seeded stream) grade the sky with a fore wash over the ground; a detail
  pass paints foliage clusters, rock facets, water reflections, fern
  fronds, interior props (Yara's hearth arch, kettle, blanket folds, jar
  shelf, hanging herbs), gate posts with storm-ribbons, chart instruments,
  path stones, and dawn birds; an atmosphere pass lays ember-light
  falloff, storm murk, dawn bloom, night hush, grove gloom, or hearth
  glow. Detail stroke counts scale down honestly at narrow widths (fewer
  strokes, same composition, never blurred). The paint reports anchors
  the weather re-attaches to: the gorge water line, the house hearth.
- **Character rigs** (`engine/rigs.js`): staging for the four human
  leads from the character bible, acted from eased poses with the face
  state of the dialogue lattice. Every one of the 20 shots carries a
  deliberate beat: Nia walks, runs, climbs, kneels, receives the lantern,
  and raises it at the cairn; fear in the storm plays as stillness, not
  shaking. Tam belays the traverse with the oar yoked, carries Lumi up the
  storm slope, and leaves the oar at the gorge. Lumi is back-carried,
  arm-carried, then walks the coda with her souvenir stick. Yara knots the
  storm-ribbon on a farewell beat. Ruel is a demoted supporting appearance
  in a single shot. Eyelids ride a deterministic blink every few seconds,
  offset per character. Live dialogue lines also carry an emphasis nod to
  the head, scaled by the viseme openness, so spoken beats land with
  weight; silent beats hold the head at rest.
- **Human bodies** (`engine/humans.js`): proportion builds from the
  model-sheet head units (Nia 4.5, Yara 4.0, Tam 5.5, Lumi 3.5) with
  ground-contact gait: each foot plants through a stance share of its
  cycle (fore travelling back under the body, zero lift) then swings
  through over a sine hump, with knees bending to absorb the plant and a
  contact shadow under each foot that fades as the foot leaves the
  ground. Exertion shapes the gait (the storm climb runs: faster cadence,
  higher step, harder torso rock), loaded carriers roll over the stride,
  and two-segment FK arms swing against the stride with elbows bending
  under effort. Costume overlays double as secondary-motion surfaces,
  now driven by the acting secondary drivers: Nia's wind-bellied cloak
  with its patched elbow, Yara's embroidered shawl, Tam's rope-burned
  oilskin vest over darned wool, Lumi's tunic with the white ankle
  binding. Each lead carries a silhouette key readable at 390 px: survey
  pole and ribbons, keeper's staff, shoulder-yoked oar, topknots and
  ankle wrap.
- **Faces** (`engine/faces.js`): heads with gaze and blink, expressive
  brows, and a nine-viseme phoneme mouth set driven deterministically from
  the caption text, blended with the seventeen-expression sheet so the
  mouth never breaks while the face finishes the line. The active dialogue
  line plays on the speaker's face; between lines the bible beat for the
  shot holds.
- **Acting** (`engine/acting.js`): anticipation, action, reaction, and hold
  phases per shot, eased weight shifts, exertion curves that peak on the
  action (the gorge traverse and storm carry work hardest), and
  secondary-motion drivers shaped from the shot's own wind with analytic
  lag: cloth belly, shawl drift, topknot bounce.
- **Face-safe boil**: facial lines re-seed on the same 12 fps lattice as
  the body (scrub-exact) at roughly one-third amplitude, so brows, lids,
  and mouths hold still enough to act while the silhouette keeps its
  hand-drawn shimmer.
- **Weather** (`engine/particles.js`): one deterministic particle field per
  background, drawn over the cast like a multiplane layer and re-anchored
  to the painted world: gorge spray rises only inside the painted water
  band, house sparks rise from the painted hearth, storm slant follows the
  shot wind. Lantern embers over the hollow, wind-driven leaves in the low
  valley, grove spores, grass seed on the approach, cairn sparks that build
  with the lighting, and the rekindling wave of rising motes over the dawn
  valley. Every mote follows an analytic path from shot-local time: smooth
  in motion, pinned when scrubbed.

Camera grammar: push, pull, pan, track, sweep, rise, crane, tilt, bloom,
fade, plus hold (breathing micro-drift), drift (slow diagonal), and orbit
(gentle sway with zoom), all declared per shot in the screenplay. Directed
moves ease in and settle like a human operator; ambient moves stay linear
so the frame keeps breathing.

Reduced motion (`prefers-reduced-motion`) disables boil and grain
animation, freezes the weather at each shot's first frame (storm streaks
fall back to faint static ticks), and holds eyelids open; the film still
plays every frame exactly.

## The score and sound world

Four original leitmotifs (rows in `film/score/themes.js`): Nia's rising
pentatonic line, the wind's rocking minor second, the station's dotted low
tread, the cairn stepwise hymn. The orchestration spec (`film/score/orchestra.js`)
turns each shot's cue into voice lines for a ten-voice synth orchestra
(woodwind lead, violin thread, string chorale, cello, bass drone, brass,
bells, pad, timpani, shaker): the station row rides a low ostinato, the cairn hymn
blooms from chorale strings to full brass and bells at the arrival, the
storm screams on timpani and shaker, the blue thread is a single violin
line in near silence. A twenty-generator procedural foley bed
(`film/score/sfx.js`) covers every screenplay sound tag: wind and water
beds, fire crackle, footsteps, creaks, birds, the rising cairn-row shimmer
of the rekindling wave. Honest stylization throughout: distant cheers are a
warm hymn swell, never a fake crowd; silence tags stay silent.

One event list drives both performances: the offline mixer
(`film/score/mix.js`) renders the 270 s soft-limited master plus per-bus
stems to `dist/audio/` (byte-reproducible; the JSON stems are committed
under `score/`), while the theatre performer (`score/animatic-audio.js`)
plays the same lines live in WebAudio with a looping wind bed, resetting
its phrase on every cue change. Both duck dialogue-first from one shared
envelope (`score/duck.js`): the score bus dips to 0.45 and the SFX bed to
0.7 under every caption window, with Yara's half-silence as the release.
Notes join legato with no dead air, and every line's closing note resolves
to its motif root; Ruel's single line plays in the body (head, ears, ember
eyes). Every event start sits exactly on the
24 fps frame grid, so A/V sync drift is zero by construction and enforced
by the audit.
