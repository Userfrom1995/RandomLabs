# Chords and arrangement

Thunderline is a 160 BPM rocker in E major, 4/4, 104 bars, 156 seconds. The
harmony is the public-domain 12-bar rock-and-roll core (E7 - A7 - B7 with a
turnaround); everything around it (melody, lyrics, riff, solo tag) is
original to this project.

## Chord grid (one chord per bar)

- **Intro (8):** E7 x6, A7, B7. Band hits under a lead-guitar riff.
- **Verse 1 (12):** E7 A7 E7 E7 | A7 A7 E7 E7 | B7 A7 E7 B7. Quick-change
  12-bar: up to the IV in bar 2, turnaround in the last four.
- **Chorus 1 (12):** A7 x4 | E7 x4 | B7 B7 A7 B7. Opens on the IV so the
  hook lifts off the verse, held V (B7) into the return.
- **Verse 2 (12):** same 12-bar shape as verse 1.
- **Chorus 2 (12):** same shape as chorus 1.
- **Lead break (12):** verse changes (E7 A7 E7 E7 | A7 A7 E7 E7 |
  B7 A7 E7 B7) with the lead guitar carrying the front voice and the drums
  dropping to half time.
- **Verse 3 (12):** same 12-bar shape as verses 1-2, dawn lyrics.
- **Final chorus (16):** A7 x4 | E7 x4 | A7 A7 E7 E7 | B7 A7 E7 B7. The
  middle eight bars sit on I and IV before the turnaround, and the whole
  section runs 1.15 dynamics for the lift into the payoff lines.
- **Outro (8):** E7 x4 | A7 B7 | E7 E7. Turnaround plus a two-line sung tag
  ("Thunderline rollin' home", twice) over the tonic.

## Arrangement map (who plays what)

Every bar carries rhythm guitar (power-chord 8th chops) plus walking bass
from the chord roots plus drums, and every bar has a front voice: lead
guitar on the intro and lead break, lead vocal everywhere else, both
together on the outro tag. Drum patterns: breakdown on the intro,
backbeat on verses, choruses, and outro, half time under the lead break.

## Melody

Verses run in E-major pentatonic with a blues passing tone (MIDI 52-64,
singable lead-vocal range); the chorus hook arcs up to the tonic and sits
on a held payoff note. The lead break is a separately authored phrase over
the verse changes, note-distinct from every verse line. The outro tag is an
8-note E-major descent that lands on the tonic with the final word.

## Score as source of truth

`score/song.json` declares the tempo map, key and meter, this chord grid,
the vocal melody and lead-guitar phrases as explicit MIDI pitches with beat
timings, all 40 lyric lines bound to phrases with start and end beats, the
bar-by-bar arrangement map above, and the master seed. The lyric timings
(`lyrics.json`), the Standard MIDI File (`song.mid`), and the printable
lead sheet (`sheet.html`) are derived from that one source by
`tools/export_score.py` and never hand-edited, so words, notes, and chords
cannot drift apart.
