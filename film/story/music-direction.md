# Hearthlight - Music Direction (original score, no unlicensed material)

All music is original, composed for this film from the note rows below and
performed by the synthesized orchestra in `film/score/`. Nothing is quoted,
sampled, or arranged from any existing work. Style brief: old-style
orchestral storytelling, songful woodwind lines over warm strings, low
brass weight for the ancient, bells for the rekindling.

## Leitmotifs (pitch rows, semitones relative to tonic)

- **Nia's theme** (curious, stepwise, always rising at the end):
  row `[0, 2, 4, 7, 9, 7, 4, 2]`, major pentatonic flavor. First stated as a
  solo woodwind in s02; full string statement at the cairn (s17).
- **The wind motif** (restless, rocking minor second + leap):
  row `[0, 1, 0, -2, 3, 1, 0]`. Adversarial in minor Acts 1-4; the turn in
  s15 restates it a major third higher in major mode, same rhythm.
- **Ruel's ostinato** (weight, patience): low dotted tread
  `[0, 0, -2, 0, -4, -2]` at 48-56 bpm under contrabass/bassoon color.
- **The cairn hymn** (arrival, stepwise chorale): `[0, 2, 4, 5, 7, 9, 7, 5]`
  in long notes; withheld until s16, blazing in s17, lullaby farewell s19.

## Cue map (binding: every shot has >= 1 cue; every cue resolves)

| Shot | Cue | Motif | Tempo | Forces |
|------|-----|-------|-------|--------|
| s01 | valley-lull | wind | 60 | low strings, wind pad |
| s02 | nia-theme-first | nia | 66 | solo woodwind + soft strings |
| s03 | chart-worry | nia (frag.) | 66 | woodwind fragments |
| s04 | dimming-beat | wind | 72 | low brass swell |
| s05 | yara-wisdom | cairn (hint) | 58 | warm low strings |
| s06 | entrusting | nia+cairn | 60 | strings, horn warmth |
| s07 | old-map | ruel (hint) | 54 | solo cello |
| s08 | farewell | nia | 64 | full strings, first brass |
| s09 | valley-crossing | wind | 84 | short-bowed strings |
| s10 | ruel-appears | ruel | 48 | contrabass weight |
| s11 | the-test | ruel+nia | 56 | ostinato softens, low nia entry |
| s12 | gorge-ford | nia+ruel | 92 | full orchestra surge |
| s13 | storm-takes | wind | 100 | screaming motif, ice percussion |
| s14 | blue-thread | cairn (thread) | 46 | single violin line, near silence |
| s15 | wind-turns | wind+nia (major) | 72 | strings blooming |
| s16 | last-steps | cairn (gathering) | 60 | chorale strings |
| s17 | hearthlight | cairn+nia | 76 | full orchestra arrival |
| s18 | rekindle-wave | all united | 80 | bells over orchestra |
| s19 | keepers-coda | nia (lullaby) | 58 | solo woodwind farewell |
| s20 | end-title | cairn (cadence) | 56 | final cadence, silence tail |

## Phase 1 animatic performance note

The Phase 1 living animatic performs a reduced sketch of this map in
WebAudio (woodwind-ish triangle lead + string-ish detuned pad, one timbre
per motif family) so volume/mute and cue-following are real and testable.
Full orchestration (separate synth voices, SFX bed, mix, WAV stem export)
lands in Phase 4; the cue map above is already binding and covered by the
audit tool.
