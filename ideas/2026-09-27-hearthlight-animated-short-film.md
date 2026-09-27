# Hearthlight - Original Hand-Drawn-Style Animated Short Film

An original 4-5 minute hand-drawn-style animated short film with an original
old-style orchestral score, produced entirely in-repo with a reproducible
render pipeline and premiered on GitHub Pages at `/film/`. Every pixel and
every note is generated from committed source: no unlicensed assets, no
copied work, nothing evoking any existing studio's characters, music, or
designs. The style brief is "the feeling of classic hand-drawn film" -
warm ink lines, watercolor backgrounds, patient camera work - executed as
original craft, never imitation.

## Logline

When the lanterns of Ember Hollow begin to go out one by one, twelve-year-old
apprentice wind-cartographer Nia must chart the unseen valley wind, befriend
the ancient mossback Boar Ruel, and carry her grandmother's last lantern flame
to the high cairn before the final night of the dark month falls.

## Deliverables

- **The film** - a real, playable 4.5-minute short (`film/index.html` on
  Pages): deterministic real-time canvas render of the full timeline with an
  original synthesized orchestral score, dialogue captions, and chapter
  navigation. Every player control works: play/pause, scrub/seek, chapters,
  captions toggle, fullscreen, volume/mute, and honest loading/error states.
- **Trailer and posters** - a 30-second trailer cut plus poster stills,
  rendered by the same engine from the same sources.
- **Story package** - logline, full screenplay with timed shot list,
  character bible (Nia, Grandmother Yara, Ruel the mossback, the valley wind
  as a presence), storyboard panels, and music direction, all committed under
  `film/story/`.
- **Reproducible pipeline** - `film/tools/render.mjs` exports PNG stills,
  WAV score stems, and a manifest with checksums from committed sources only;
  any run rebuilds the film bit-identically from the same seed.
- **Unified docs** - `film/README.md` plus `film/docs/` (story, craft notes,
  pipeline, reproducibility) written as one product view, and a `/film/`
  entry point that stands alone as the film's theatre page.

## Why

The lab has shipped games, engines, CLIs, and tools, but never a narrative
film. A short film stresses a different frontier of craft: sustained visual
coherence over minutes rather than moments, character acting, story arc,
music-to-picture synchronization, and self-critical iteration (the lab
watches its own film and improves it). The Owner directive demands
production-level hand-drawn quality with no corners cut; the honest way to
reach that inside a reproducible repo is a deterministic procedural
hand-drawn engine (ink boil, paper grain, watercolor wash) driven by a real
screenplay and a real score, iterated through the lab's own review, test,
and eval gates.

## How It Works

- **Deterministic heart.** One seeded RNG (`film/engine/rng.js`,
  mulberry32-style, seed committed) drives every jitter, grain fleck, and
  musical ornament. Same seed plus same sources equals pixel-identical
  frames, verified by hash tests. No wall-clock, no network, no randomness
  leaks into the render path; the player clock is the timeline.
- **Timeline as source of truth.** `film/story/screenplay.json` is a timed
  shot list (5 acts, ~270 s total): each shot declares duration, camera,
  cast, background, dialogue/caption lines, music cues, and SFX. The engine
  is a pure function of (timeline, time) - scrubbable, pausable, testable.
- **Hand-drawn look, honestly procedural.** Ink lines are stroked vector
  paths re-jittered on 2s (12 fps boil) over a 24 fps camera; watercolor
  backgrounds are layered translucent washes over paper grain; characters are
  keyframed vector rigs (Nia, Yara, Ruel) with eased inbetweening. No traced
  art, no model scraping, no third-party images.
- **Original score, synthesized.** A WebAudio engine performs a leitmotif
  score (Nia's theme, the wind motif, Ruel's low ostinato, the cairn finale)
  from a committed tempo/cue map; strings, woodwinds, and brass are
  synthesized voices, not samples. Stems export offline to WAV for audit.
- **Theatre page.** `film/index.html` is a cinema surface: 16:9 stage,
  transport controls, chapter menu (5 acts), caption track, poster wall,
  trailer, and graceful states (loading progress, decode/render error cards,
  reduced-motion respect). Responsive down to 390 px mobile.
- **Watch-and-iterate loop.** `film/tools/capture.mjs` dumps review stills
  (per-shot hero frames) for self-critique; the Builder reviews stills,
  tightens keyframes and timing, and re-renders. The Tester plays the film
  end to end on desktop and 390 px viewports; the Evaluator gates on craft.

## Module Breakdown

- `film/story/` - screenplay.json (timed shots, dialogue, cues),
  characters.md (bible + model-sheet parameters), storyboard.json,
  music-direction.md (motifs, orchestration, cue map).
- `film/engine/` - rng.js, clock.js, timeline.js, ink.js (boil line),
  paper.js (grain + wash), backgrounds.js (valley paint set), rigs/ (nia,
  yara, ruel keyframe rigs), camera.js, particles.js (embers, leaves, snow),
  captions.js, renderer.js (pure scene function).
- `film/score/` - themes.js (leitmotifs), orchestration.js (synth voices),
  performance.js (cue map interpreter), sfx.js, export-wav.js.
- `film/player/` - index.html theatre, player.js (transport, chapters,
  captions, fullscreen, volume), player.css, posters/, trailer timeline.
- `film/tools/` - render.mjs (stills + stems + manifest + checksums),
  capture.mjs (review stills), audit.mjs (runtime, sync drift, determinism).
- `film/tests/` - determinism hashes, runtime 240-300 s gate, caption/cue
  coverage, provenance check (no binary blobs without sources), player
  control tests.

## Story Structure (binding runtime: 240-300 s)

- Act 1, The Dimming (0:00-0:50): Ember Hollow at dusk, lanterns failing;
  Nia introduced charting winds on the hill.
- Act 2, The Last Flame (0:50-1:50): Yara entrusts Nia with the keeper's
  lantern; the wind map reveals the high cairn path.
- Act 3, The Mossback (1:50-2:50): Valley crossing; Ruel appears, tests Nia,
  then carries her across the washed-out bridge gorge.
- Act 4, The Ascent (2:50-3:50): Storm climb, flame nearly lost, wind motif
  turns from adversary to guide.
- Act 5, Hearthlight (3:50-4:30): Cairn lighting, valley lanterns rekindle
  in a wave of light; quiet coda with Nia as keeper.

## Test Matrix

- Determinism: render hash of 12 hero frames identical across runs/seeds.
- Runtime gate: total timeline within 240-300 s; trailer 25-35 s.
- Coverage: every shot has background + cast + captions where dialogue
  occurs + at least one music cue; every cue resolves to a performed voice.
- Craft audit: stills reviewed per act for line boil presence, wash
  layering, readable silhouettes at 390 px width.
- Player: play/pause/seek/chapters/captions/fullscreen/volume verified live
  on desktop and 390 px; error cards forced and screenshotted.
- Provenance: no image/audio binaries without committed generators.

## Team Note

No dedicated film-production agents are created up front. The Builder
executes this blueprint through the standard pipeline; if the Reviewer or
Evaluator flags a craft gap that genuinely needs specialist roles (story,
art direction, animation, score), the Lab Engineer creates them per
`.github/agents/CREATING_AGENTS.md` through a reviewed PR. Hiring flows
through that path only, never by ad-hoc prompt edits.
