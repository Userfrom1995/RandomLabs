# Hearthlight craft notes

Style brief: the feeling of classic hand-drawn film - warm ink lines,
watercolor backgrounds, patient camera work - executed as original craft,
never imitation.

## The living animatic (current cut)

The present renderer (`film/engine/animatic.js`) plays the full timeline
as a storyboard sketch: ink-glyph cast built from the character bible
proportions (Nia's cloak triangle and survey pole, Yara's stooped shawl,
Ruel's hump and lichen antlers), wash backgrounds per act palette,
lantern rows that gutter and rekindle with the story, gorge spray, cairn
stones and the lighting bloom, letterboxed with per-shot slates and a gold
title fade.

Deterministic craft devices already live:

- **2s line boil**: jitter re-seeds at 12 fps from the shot substream, so
  the boil shimmers in motion yet freezes identically when scrubbed.
- **Paper grain**: 130 flecks per frame from a time-quantized substream.
- **Camera grammar**: push, pull, pan, track, sweep, rise, crane, orbit,
  bloom, and fade moves declared per shot in the screenplay.
- **Reduced motion**: `prefers-reduced-motion` disables boil and grain
  animation; the film still plays every frame exactly.

Later phases deepen this into the full hand-drawn engine (layered ink
boil, watercolor wash stacking, keyframed rigs, weather particles) without
changing the timeline contract.

## The score sketch

Four original leitmotifs (rows in `film/score/themes.js`): Nia's rising
pentatonic line, the wind's rocking minor second, Ruel's dotted low tread,
the cairn stepwise hymn. The animatic performer voices them on triangle
lead plus detuned pad, following each shot's tempo and mood, resetting its
phrase on motif changes. Full orchestration with separate synth voices,
SFX bed, mix, and WAV stem export arrives in its own phase; the cue map it
must satisfy is already binding and audit-covered.
