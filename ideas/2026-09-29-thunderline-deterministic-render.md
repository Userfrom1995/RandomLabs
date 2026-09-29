# Thunderline - Deterministic Render Engine (Phase 2 Build Notes)

What was built: `thunderline/tools/render.py`, a standard-library-only
deterministic synthesizer that turns the Phase 1 lead sheet
(`score/song.json` + `score/mix.json`) into a real 156-second rock-and-roll
master plus four isolated stem buses, with `tests/test_render.py` (9 tests) as
the binding gate. Full suite: 36 tests green.

Why this design: the commission demands bit-identical audio from any checkout
with pinned tooling. The only honest way to guarantee that in pure Python is
to ban every entropy source: no wall clock, no network, no unseeded RNG, and
hand-written WAV headers (the `wave` module is deterministic too, but a fixed
44-byte struct pack leaves nothing to audit). Noise comes from
`random.Random("<masterSeed>:<voice>")` streams, one per voice, so event
ordering can never perturb another voice's sequence. Float work stays in
`array('f')` buses; a full render takes ~13 s.

How it works:
- Key files: `thunderline/tools/render.py` (engine), `thunderline/tests/test_render.py` (gate), `thunderline/score/song.json` + `mix.json` (inputs, unchanged).
- Voices: kick (sine pitch-drop 150 to 45 Hz), snare (180 Hz tone plus seeded noise), hats (seeded noise ticks, open on bar starts), bass (triangle/saw walking quarters from chord roots with half-step approaches), rhythm guitar (sawtooth power-chord 8th chops), lead guitar (saw plus 5.5 Hz vibrato over the authored riff/solo/tag), lead vocal (saw stack through two per-syllable formant resonators; vowel picked by md5 of the lyric line; honestly a synthesized voice).
- Static-pitch voices render through cached one-period wavetables, so the only per-sample `math.sin` calls are kick glides and precomputed vibrato LFOs.
- Mix as code: per-bus one-pole highpass plus presence shelf plus gain in a single pass from `mix.json` constants; the master is the bus sum through a soft knee at the limiter threshold, normalized to the 0.89 ceiling. Stems are documented pre-limiter buses.
- Provenance: `dist/manifest.json` records the generator, score/mix hashes, seed, peak, and per-file SHA-256. Preview is `preview.ogg` via ffmpeg when present, else a deterministic 22.05 kHz `preview.wav` fallback with an honest notice. `dist/` stays gitignored build output.

Notes: drum arrangement patterns (`backbeat`, `halfTime`, `breakDown`) come straight from the score's arrangement map, with a 16th-note snare fill on section-final bars; the outro fill rings past the last sample and is truncated by a clamped `Synth.fit` helper. Measured section RMS shows no dead air and a final-chorus lift (0.211 vs ~0.17 verses). Rare drum-transient int16 saturation exists only in the pre-limiter stem WAV; the master has zero clipped samples.
