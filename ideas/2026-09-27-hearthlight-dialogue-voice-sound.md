# Hearthlight Dialogue Voice and Sound Continuity - words first, music second, air third

Phase 4 of the Hearthlight Reimagined rebuild (#463): the dialogue delivery
pass the owner verdict demanded. The earlier master rode the score at full
level straight through spoken lines (mean score energy 0.455 outside lines
vs 0.415 under them: no delivery, just coexistence) and dropped the tails
of two shots into dead air. This phase re-voices the mix around the words.

## What was built

- `film/score/duck.js` (new) - the single source of truth for the
  dialogue-first envelope, shared by the offline WAV master and the live
  theatre performer. All 43 caption lines become 25 merged absolute windows
  (stacked s05 lines merge into one hold, never pumping); the score bus
  dips to 0.45 and the SFX bed to 0.7 under every window, with a 0.25 s
  attack and a 0.5 s release. The release is Yara's scripted half-silence
  made structural. Measured on the master: RMS 0.075 under dialogue
  against 0.133 outside; storm still outweighs the blue thread 2x.
- `film/score/mix.js` - per-sample duck application inside the placement
  loop, so a note that starts on a line but rings past it breathes back in
  instead of staying buried. Bus structure, peak ceiling (0.89), stems, and
  determinism unchanged; mix version steps to hearthlight-mix/2.
- `film/score/orchestra.js` - legato continuity at the same 602 events:
  mid-line notes join to the next note start, every line's closing note
  rings exactly to the shot edge on a resolved motif root. Dead-air seconds
  across the 270 s: 2 down to 0. Bounds and zero frame-grid drift hold.
- `film/score/sfx.js` - re-anchored to the new action beats at the same 50
  events: gorge white-water leads at 0.7 with six spray gusts, nine
  crunching boots under a 0.7 storm howl for the carry, the rekindling
  whoom leads at 0.7, ten hard footfalls under Nia's s04 sprint, eight
  dawn-bird calls behind the homecoming. Grove-silence and title-hush
  still render honestly nothing.
- `film/score/animatic-audio.js` - the live performer ducks from the same
  envelope by position inside the current cue (same windows, same floors)
  and resolves closing degrees with the same snap, so the theatre breathes
  where the record breathes.
- `film/engine/rigs.js` - Ruel delivers his single s12 line in the body:
  `lineWindow`/`speakFor` (0.3 s edges) lift the head, perk the ears, and
  widen the ember eyes on his words, silent off-line. The narrator's 9
  lines duck the mix but never move a staged mouth (REST viseme, zero nod).
- `film/tests/dialogue-voice.mjs` (new, 27 gates) - envelope unit gates
  (floors, monotonic attack, merged windows, no pumping), score continuity
  (zero dead air, edge-closing resolved roots), delivery coverage (33 human
  lines on face rigs, Ruel body line, narrator ventriloquism guard), SFX
  anchor floors, live parity, VTT byte-pin.
- `film/tools/audit.mjs` - Phase 4 gates: duck version/floors, hold/rest
  behavior, zero dead air, 602/50 counts, Ruel delivery, silence tags.
- Docs: `story/dialogue.md` gains the Phase 4 delivery section;
  `docs/craft.md` and `README.md` describe the ducked, legato, resolved
  sound as one product (no milestone leakage).

## Verification

- `bash film/repro.sh` green; all 23 film suites green (22 prior plus
  dialogue-voice), including the Tester's pinned 602/50 hostile audio
  suite untouched.
- Builder self-review: envelope curve sampled (mid-line floor exact,
  pre-film unity, attack monotone); Ruel speak probed (1 on-line, 0
  off-line, fractional on edges, 0 on hostile seeks); full-mix render
  10.5 s, peak at ceiling, all seven stems audible.

## Key files

- `film/score/duck.js`, `film/score/mix.js`, `film/score/orchestra.js`,
  `film/score/sfx.js`, `film/score/animatic-audio.js`
- `film/engine/rigs.js` (`lineWindow`, `speakFor`, Ruel delivery)
- `film/tests/dialogue-voice.mjs`, `film/tools/audit.mjs`
- `film/story/dialogue.md`, `film/docs/craft.md`, `film/README.md`
