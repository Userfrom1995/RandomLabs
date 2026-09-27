# Hearthlight - an original animated short film

When the lanterns of Ember Hollow begin to go out one by one,
twelve-year-old apprentice wind-cartographer Nia must chart the unseen
valley wind, befriend the ancient mossback boar Ruel, and carry her
grandmother's last lantern flame to the high cairn before the final night
of the dark month falls.

**Watch it:** [theatre page](https://userfrom1995.github.io/RandomLabs/film/)
(plays the current cut; this phase premieres the living animatic).

## What this is

An original 4 minute 30 second hand-drawn-style animated short with an
original orchestral score, produced entirely in-repo through a
reproducible render pipeline. Every pixel and every note is generated from
committed sources under `film/`: no unlicensed assets, no copied work,
nothing evoking any existing studio's characters, music, or designs.

Current state is the **full performance cut**: the full 270-second timeline
played by a deterministic renderer locked to a 24 fps frame grid, with a
synthesized motif-score sketch, working transport (play/pause, frame-exact
seek, chapters, captions, fullscreen, volume/mute), a live-painted
storyboard wall, the complete story package, and the pipeline with its
self-review capture loop. Ink lines boil on 2s with double-pass stroke
weight, skies are stacked watercolor washes over paper grain, the valley
paint set dresses all 14 backgrounds, deterministic weather (embers,
leaves, spray, storm, cairn sparks, the rekindling wave) plays over every
shot, and the character rigs act all 20 shots from eased poses with a
deterministic blink.

## How it works

- **Deterministic heart.** One seeded RNG (`engine/rng.js`, seed
  `20260927`) drives every jitter, grain fleck, and musical ornament. Same
  seed plus same sources equals identical frames, verified by hash tests.
- **Timeline as source of truth.** `story/screenplay.json` is the timed
  shot list (5 acts, 20 shots, 270 s). The renderer is a pure function of
  (timeline, time): scrubbable, pausable, testable.
- **Theatre.** `index.html` + `player/` is the cinema surface: 16:9 stage,
  transport, 5-act chapters, caption track, storyboard wall of live-painted
  act stills, poster wall, honest loading/error states, reduced-motion
  respect, responsive to 390 px.
- **Score.** `score/` performs the leitmotif cue map (Nia, wind,
  Ruel, cairn hymn) twice from one orchestration spec: a ten-voice synth
  orchestra (woodwind, violin, strings, cello, bass, brass, bells, pad,
  timpani, shaker) plus a twenty-generator procedural SFX bed (wind, water,
  fire, footsteps, creaks, birds, the rekindling wave), mixed to a
  soft-limited 270 s master. The theatre plays it live in WebAudio; the
  identical event lists render offline to WAV stems. Volume and mute are
  real controls on a real audio path.

## Quickstart

```sh
# verify the binding gates (runtime, coverage, determinism, provenance)
node film/tools/audit.mjs

# fast engine tests
node film/tests/smoke.mjs

# export act stills + checksum manifest from committed sources only
node film/tools/render.mjs

# capture all 20 hero frames + review cards for the self-review loop
node film/tools/capture.mjs

# render the deterministic score + SFX mix (WAV stems into dist/audio)
node film/tools/render-audio.mjs

# score gates (coverage, sync, determinism, mix bounds, live performer)
node film/tests/score.mjs

# craft gates (paint set, camera grammar, rig poses, capture, gallery)
node film/tests/craft.mjs

# performance gates (frame lock, weather, acting beats, eased camera)
node film/tests/performance.mjs

# watch it (any static server; e.g.)
npx serve .
# then open /film/
```

## Layout

- `story/` - screenplay.json, characters.md, storyboard.json, music-direction.md
- `engine/` - rng.js, timeline.js, frames.js (24 fps lock), animatic.js (renderer) + ink.js, paper.js, backgrounds.js, rigs.js, particles.js (craft modules)
- `score/` - themes.js (motif rows), orchestra.js (cue-to-events spec),
  voices.js (offline synth voices), sfx.js (procedural foley bed), mix.js
  (mixer + WAV writer), animatic-audio.js (live WebAudio performer),
  score-events.json + sfx-events.json (committed stems, byte-reproducible)
- `player/` - theatre transport (player.js, gallery.js, player.css)
- `tools/` - render.mjs (stills + manifest), render-audio.mjs (WAV mix +
  stems + audio manifest), capture.mjs (hero-frame review loop), audit.mjs (binding gates)
- `tests/` - smoke.mjs (determinism + timeline invariants), craft.mjs (paint/camera/rig/capture/gallery gates), performance.mjs (frame lock, weather, acting, eased camera gates), score.mjs (orchestration, sync, mix, live performer gates)
- `docs/` - craft, story, and pipeline documentation (unified product view)
- `posters/` - poster-v1.svg (deterministic, original art)
- `dist/` - generated stills + manifest (rebuilt by render.mjs)

## Provenance

Original work, created for this repo. All sources committed; `dist/`
outputs are regenerable and checksummed. The audit tool rejects any image
or audio binary without a committed generator.
