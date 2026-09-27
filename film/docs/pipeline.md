# Hearthlight pipeline and reproducibility

## Tools

- `node film/tools/audit.mjs` - binding gates: runtime 240-300 s, five
  acts, contiguous shots, per-shot coverage (background, cast, music cue,
  caption timing), motif resolution, timeline end behavior, RNG
  determinism, binary provenance, storyboard parity. Exit 0 is green.
- `node film/tests/smoke.mjs` - fast engine invariants: seed stability,
  substream isolation, runtime total, caption lookup, motif resolution.
- `node film/tools/render.mjs` - validates the screenplay, exports one SVG
  still per act plus `dist/manifest.json` with sha256 checksums of every
  committed source. Same inputs yield byte-identical outputs.
- `node film/tools/capture.mjs` - the watch-and-iterate loop: renders the
  hero frame (shot midpoint) of all 20 shots through the real engine,
  writing `dist/capture/heroes.json` (sha256 of each frame's exact
  draw-call log) plus one SVG review card per shot, one face close-up
  card per lead per bible emotion into `dist/capture/faces.json`, and one
  background plate per painted location into `dist/capture/plates.json`
  (pure paint hashed at 960 px with stroke counts, re-rendered at 390 px
  to pin the honest density scale-down). Re-run
  after any craft tweak and diff the hashes: every moved hash names a shot
  (or a lead's expression, or a location plate) whose look changed.
  Byte-identical across repeat runs.
- `node film/tests/craft-world.mjs` - world and motion craft gates:
  composition sketch per location, three wash layers on distinct streams,
  detail budgets that scale down honestly at 390 px, stance-planting gait
  with exertion-run climbs, dialogue nod on live lines, cloth answering
  the acting drivers, spray inside the painted water band, plates
  reproducible and sensitive.
- `node film/tests/craft.mjs` - craft gates: paint set covers every
  screenplay background, camera grammar covers every declared move, rig
  poses stay in eased bounds with the scripted acting beats, ink boil is
  deterministic, capture is reproducible, the gallery is wired.
- `node film/tests/craft-humans.mjs` - human craft gates: model-sheet
  proportions match the bible, the expression and phoneme sets cover the
  dialogue lattice, turnarounds hold symmetry, 390 px silhouettes stay
  distinct, face boil is lattice-locked at reduced amplitude, acting beats
  stay bounded with Tam and Lumi chained across the cut, face cards are
  reproducible and sensitive.
- `node film/tests/performance.mjs` - performance gates: 24 fps frame
  lock, frame-exact scrubbing, weather determinism with reduced-motion
  freeze, full-shot acting beats, eased camera pinned behaviorally, a
  240-frame no-throw sweep, capture with frame indices.
- `node film/tools/render-audio.mjs` - validates the screenplay, builds the
  note-event score and SFX bed into committed JSON stems under `score/`,
  and renders the 270 s master plus per-bus stems into `dist/audio/*.wav`
  with a checksum manifest. Same inputs yield byte-identical outputs
  (WAVs live in gitignored `dist/`; `*.wav` is never committed).
- `node film/tests/score.mjs` - score gates: every shot scored and foleyed,
  every voice and generator used, zero A/V sync drift, offline
  determinism (events, samples, WAV bytes), mix bounds (exact length,
  0.89 ceiling, no NaN), committed stems matching the rebuild, and the
  live performer under an AudioContext stub.
- `node film/tools/render-captions.mjs` - exports the committed
  `film/captions.vtt` (one WebVTT cue per screenplay caption line, at
  absolute film times with speaker voice tags). Same inputs yield
  byte-identical bytes; the audit pins the committed file against a
  rebuild, and the theatre page offers it as a download.
- `node film/tests/premiere.mjs` - premiere gates: the trailer cut builds
  at exactly 30 s with every segment inside its shot, the trailer map is
  monotonic and frame-identical with the full film, the cut paints at 960
  and 390 px with reduced motion on and off, every shot has a caption cue
  in bounds, both posters hang on the wall, and the end card, trailer
  buttons, noscript note, canvas guard, and focus styling are all wired.
- `node film/tests/final-audit.mjs` - final integration gates: every one of
  the 720 trailer frames lands on its intended film frame (integer-exact
  frame index parity), the Space shortcut yields to a focused button, the
  binding counts hold (270 s, 6480 frames, 20 shots, 5 acts, 30 s trailer,
  22 cues, 602 score + 50 SFX events), and a full 240-frame watch-through
  sweep paints with no throws, no empty frames, and no NaN coordinates.

## Reproducibility contract

1. One committed seed (`20260927` in screenplay.json) drives all jitter,
   grain, and ornament. No wall-clock, no network, no `Math.random` in any
   render path.
2. The renderer is a pure function of (timeline, time), locked to the
   24 fps grid: same frame index draws the same pixels, from playback,
   seek, or capture alike. The score obeys the same lattice: every note
   and foley event starts exactly on a frame boundary, so audio sync
   drift is zero by construction.
3. No binary artifacts without committed generators; the audit fails the
   build if any appear.
4. The player clock is the timeline: play advances it by rAF delta, pause
  and seek set it exactly, and every seek snaps to its frame boundary.
5. The storyboard wall on the theatre page is painted live by the same
  engine at each act midpoint: zero image binaries, zero drift between the
  film and its stills.

## Self-review discipline

After any craft change: run `capture.mjs`, diff `dist/capture/heroes.json`
against the previous run, and open the changed shots' review cards in
`dist/capture/stills/`. A craft pass is done when every moved hash is a
shot the pass intended to touch.
