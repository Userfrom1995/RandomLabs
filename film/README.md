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

Current state is the **living animatic**: the full 270-second timeline
played by a deterministic sketch renderer with a synthesized motif-score
sketch, working transport (play/pause, seek, chapters, captions,
fullscreen, volume/mute), the complete story package, and the pipeline
skeleton. Later phases add the hand-drawn render craft, full animation
performance, the orchestrated score, and the premiere cut with trailer.

## How it works

- **Deterministic heart.** One seeded RNG (`engine/rng.js`, seed
  `20260927`) drives every jitter, grain fleck, and musical ornament. Same
  seed plus same sources equals identical frames, verified by hash tests.
- **Timeline as source of truth.** `story/screenplay.json` is the timed
  shot list (5 acts, 20 shots, 270 s). The renderer is a pure function of
  (timeline, time): scrubbable, pausable, testable.
- **Theatre.** `index.html` + `player/` is the cinema surface: 16:9 stage,
  transport, 5-act chapters, caption track, poster wall, honest
  loading/error states, reduced-motion respect, responsive to 390 px.
- **Score sketch.** `score/` performs the leitmotif cue map (Nia, wind,
  Ruel, cairn hymn) with synthesized WebAudio voices; volume and mute are
  real controls on a real audio path.

## Quickstart

```sh
# verify the binding gates (runtime, coverage, determinism, provenance)
node film/tools/audit.mjs

# fast engine tests
node film/tests/smoke.mjs

# export act stills + checksum manifest from committed sources only
node film/tools/render.mjs

# watch it (any static server; e.g.)
npx serve .
# then open /film/
```

## Layout

- `story/` - screenplay.json, characters.md, storyboard.json, music-direction.md
- `engine/` - rng.js, timeline.js, animatic.js (sketch renderer)
- `score/` - themes.js (motif rows), animatic-audio.js (WebAudio performer)
- `player/` - theatre transport (player.js, player.css)
- `tools/` - render.mjs (stills + manifest), audit.mjs (binding gates)
- `tests/` - smoke.mjs (determinism + timeline invariants)
- `docs/` - craft, story, and pipeline documentation (unified product view)
- `posters/` - poster-v1.svg (deterministic, original art)
- `dist/` - generated stills + manifest (rebuilt by render.mjs)

## Provenance

Original work, created for this repo. All sources committed; `dist/`
outputs are regenerable and checksummed. The audit tool rejects any image
or audio binary without a committed generator.
