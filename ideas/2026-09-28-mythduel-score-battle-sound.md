# Mythduel: original score and battle sound (synthesized duel orchestra)

Phase 4 of the Mythduel build (#470): the silent stage learns to sing. Four
original leitmotif rows, a six-voice synthesized orchestra, an eighteen-bed
procedural foley floor, voiced-line-first ducking, a deterministic WAV master
with per-bus stems, and a live WebAudio performer that plays the same event
lists in the theatre.

## What was built

- `mythduel/score/themes.js`: four original semitone rows (thor-row, zeus-row,
  clash-ostinato, resolution-hymn), distinct from any existing lab material.
- `mythduel/score/orchestra.js`: per-cue orchestration with march tempi
  (60 bpm terms, 132 bpm skyburst, 56 bpm loosing) and storm-graded beat
  rides; 842 deterministic note-events covering all 8 beats edge to edge.
- `mythduel/score/voices.js`: six original synth voices (frame drum, northern
  horn, plucked gut string, struck bronze, war shaker, deep storm pad).
- `mythduel/score/sfx.js`: eighteen foley generators voicing every duel
  choreography tag; the held-beat hush maps to null, honestly silent.
- `mythduel/score/duck.js` + `mix.js`: voiced-line ducking (score floor 0.45,
  bed floor 0.7) shared by the offline master and the live performer;
  soft-limited mono master at a fixed 0.89 ceiling plus seven stems.
- `mythduel/score/live-audio.js`: WebAudio performer with the same rows,
  lines, and cue-opening pitches as the WAV master (enumerated parity proven).
- `mythduel/tools/render-audio.mjs`: deterministic pipeline writing committed
  JSON stems plus `dist/audio/` WAVs with a checksum manifest.
- Theatre: real volume slider and mute button driving the live performer,
  which follows the stage beat-for-beat.
- `mythduel/tests/phase4-sound.mjs`: 60-probe regression suite. Audit grows
  from 40 to 48 binding gates.

## How it works

The duel timeline stays the single source of truth. Orchestra and SFX both
derive event lists keyed off beat index with frame-quantized starts, so sync
drift is exactly zero and scrubs land on identical audio. Every offline
renderer is seeded per event (seed + beat + voice/tag + pitch), making the
full 172 s master byte-reproducible. Closing notes snap to their motif root
and ring to the beat edge, so coverage is continuous with a pinned count.

## Key files

`mythduel/score/`, `mythduel/tools/render-audio.mjs`,
`mythduel/tests/phase4-sound.mjs`, `mythduel/player/player.js`
(volume/mute/live cue following).

## Notes

- Full mix renders in about 20 s at 22050 Hz; peak lands exactly on the 0.89
  ceiling, skyburst region runs more than twice as hot as the loosing.
- No samples, no quoted material, no binaries committed: WAVs live only in
  gitignored `dist/`. The audit IP scan covers the new sources.
