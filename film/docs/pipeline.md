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
  draw-call log) plus one SVG review card per shot. Re-run after any craft
  tweak and diff the hashes: every moved hash names a shot whose look
  changed. Byte-identical across repeat runs.
- `node film/tests/craft.mjs` - craft gates: paint set covers every
  screenplay background, camera grammar covers every declared move, rig
  poses stay in eased bounds with the scripted acting beats, ink boil is
  deterministic, capture is reproducible, the gallery is wired.
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
