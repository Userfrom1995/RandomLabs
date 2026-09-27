# Hearthlight Reimagined - Dialogue Notes

Voice, timing, and delivery for the rebuilt dialogue pass. Every caption
line in `screenplay.json` carries `who` (speaker), `t` (in-point in shot
seconds), optional `dur` (out-point = `t + dur`, default 4.5 s), and
`emotion` (face-blender tag for Phase 2, mix-ducking hint for Phase 4).

## Lattice rule (audit-enforced)

- Every `t` and every `dur` sits exactly on the 24 fps frame lattice
  (`frameTime(x) === x`); legal durations in this cut: 3, 3.5, 4, 4.5 s.
- `t + dur` never exceeds the shot duration; lines within a shot are sorted
  and non-overlapping.
- Speakers: NARRATOR, NIA, YARA, TAM, LUMI, RUEL only. Four human voices,
  one supporting creature line (s12), one caption-only narrator.
- Emotions (closed set): awe, anger, calm, fear, grief, guilt, hope, joy,
  resolve, shame, sorrow, tenderness, wonder, exhaustion, determination,
  relief, neutral. Every line carries one; the narrator's lines carry one
  too (delivery color for the mix).

## Voice direction

- **NARRATOR:** Spare, warm, past tense. States only what the picture cannot
  (time passing, interior causes). Never narrates the choice (s14) or the
  payoff (s17): those belong to the children.
- **NIA:** Short sentences, wind vocabulary (soundings, gusts, lee,
  traverses). Counts fast when frightened in Act 1, counts steadily by Act 4:
  the same mouth, a different keeper.
- **YARA:** Slow, low, complete sentences. Five lines in the whole film
  (s05 x2, s06, s07, s08); each one moves the plot. Silence is her main
  instrument (s19: the knot, no words).
- **TAM:** River vocabulary, warnings, counts. Starts sentences he does not
  finish (s06-pattern fear), finishes them by s16.
- **LUMI:** Plain words, complete thoughts, shortest lines. The truth-teller:
  every Lumi line names something an adult is circling. Never explains the
  theme; the s19 ribbon line is about a knot, not about the film.
- **RUEL:** One line (s12), dry, slow. Four feet of ballast, five words.

## Delivery notes per beat

- s01-s04: Nia talks AT people (excuses, pleas). The narrator carries the
  guilt she will not name.
- s05-s08: Yara's lines land with 0.5 s of silence after them in the mix;
  Nia's replies overlap the room tone (Phase 4 ducking note).
- s10-s12: The party talks OVER each other in life, but never in captions:
  lattice lines stay sequential so the VTT read follows the plot.
- s14 (the choice): Near silence under both lines. Lumi's line is tired,
  not noble; Nia's answer is practical, not grand. The emotion is in the
  hands, the faces, the halved flame: words stay small on purpose.
- s19: No Yara line by design. The narrator's "three keepers" line must not
  explain; Lumi's knot line closes the film's argument in eight words.

## Caption-only read (Phase 1 self-review)

Strip the picture: read `captions.vtt` top to bottom. A first-time viewer
must be able to follow: a girl lets a lantern die (s01-s04), an old keeper
sets a price of flame plus children (s05-s08), the party forms and crosses
(s09-s12), the girl spends half the flame to save the child (s13-s14), the
wind turns (s15-s16), the valley answers with many flames (s17-s18), and the
girl comes home a keeper (s19-s20). If any link in that chain needs the
picture to make sense, the line is rewritten, not the picture.
