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

## Phase 4 delivery pass (mix and performance)

- **Dialogue-first ducking** (`score/duck.js`, shared by the WAV master and
  the live theatre performer): every caption window dips the score bus to
  0.45 and the SFX bed to 0.7, with a 0.25 s attack and a 0.5 s release.
  The release is Yara's scripted half-silence made structural: her lines
  land, the valley stays hushed for exactly one release, then the score
  breathes back in. Stacked lines (s05) merge into one hold, never pumping.
  Measured on the master: RMS under dialogue 0.075 against 0.133 outside.
- **Score continuity**: every voice line joins legato to the next note and
  the closing note of every line rings exactly to the shot edge on a
  resolved motif root. Zero dead seconds across the 270 s (the earlier
  master dropped the tails of s16/s17). Event count unchanged at 602.
- **Per-line delivery coverage**: all 33 human lines drive their speaker's
  face rig mid-line (emotion plus viseme plus nod); Ruel's single s12 line
  plays in the body (head lift, ear perk, widened ember eyes with 0.3 s
  edges, silent off-line); the narrator's 9 lines duck the mix but never
  move a staged mouth (REST viseme, zero nod pinned).
- **SFX re-anchor** (50 events, same tags): gorge white-water leads at 0.7
  with six spray gusts, the storm carry runs nine crunching boots under a
  0.7 howl, the rekindling whoom leads at 0.7, ten hard footfalls under
  Nia's s04 sprint, eight dawn-bird calls behind the s18 homecoming.
  Silence stays honest: grove-silence and title-hush render nothing.

## Caption-only read (Phase 1 self-review)

Strip the picture: read `captions.vtt` top to bottom. A first-time viewer
must be able to follow: a girl lets a lantern die (s01-s04), an old keeper
sets a price of flame plus children (s05-s08), the party forms and crosses
(s09-s12), the girl spends half the flame to save the child (s13-s14), the
wind turns (s15-s16), the valley answers with many flames (s17-s18), and the
girl comes home a keeper (s19-s20). If any link in that chain needs the
picture to make sense, the line is rewritten, not the picture.
