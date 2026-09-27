# Hearthlight story

**Logline.** When keeper-in-training Nia lets the valley's last lantern fail
on her watch, she must earn back her grandmother Yara's trust by guiding a
stranded young ferryman and his injured sister through a storm-wracked gorge
to relight the high cairn before the dark month closes the pass - and Nia
must choose whose light to spend when one flame cannot save them all.

## The five acts (270 s total)

1. **The Failure** (0:00-0:50) - Nia, late with her wind soundings, lets the
   hill-road lantern die on her watch; solitary repair fails and she runs to Yara.
2. **The Debt** (0:50-1:50) - Yara sets the price: one keeper flame to the
   high cairn, plus the ferryman's children at the gorge station as Nia's charge.
3. **The Gorge** (1:50-2:50) - Valley crossing with Tam and Lumi; rope
   traverse and rockfall, where the children save Nia first and invert the debt.
4. **The Choice** (2:50-3:50) - Storm ascent with one flame and two needs;
   Nia spends half the flame to warm Lumi's fever, and the wind turns guide.
5. **Hearthlight** (3:50-4:30) - The stub should not be enough, but the
   valley's kept sparks answer and the cairn lights from many flames; Yara
   hands Nia the keeper's knot without a word.

## The cast

- **Nia** - 12, keeper-in-training. Hasty reader of wind becoming a steady
  keeper. Short sentences, wind vocabulary.
- **Grandmother Yara** - 78, retired keeper. Sets the price, waits, repays
  trust without a word. Five lines in the whole film.
- **Tam** - 17, ferryman's son. Civil, frightened, good with boats, new to
  cliffs. Counts aloud; carries his sister up the storm.
- **Lumi** - 8, ferryman's daughter. Injured ankle, observant, the film's
  truth-teller. Ties the final ribbon.
- **Ruel** - the ancient mossback boar, one supporting appearance (S12):
  hauls the spare rope, one dry joke, never carries a human beat.
- **The valley wind** - a presence, never a person. Adversary turned guide;
  its only face is its musical motif.

Full bible with model-sheet parameters: `film/story/characters.md`.
Cause-effect ledger: `film/story/continuity.md`. Voice and timing notes:
`film/story/dialogue.md`. Full timed shot list:
`film/story/screenplay.json`. Cue map: `film/story/music-direction.md`.

## The trailer (30 s)

Six moments cut from the same timeline, played on the same stage through
the same renderer, score, and captions: the untended lantern (S01), the
keeper's lantern (S06), the station children (S10), the gorge traverse (S12), the
choice (S14), the many flames (S17). The cut is data
(`film/story/trailer.json`: shot plus local in-point and duration per
segment); the mapping (`film/engine/trailer.js`) sends every trailer
instant to exactly one film instant on the 24 fps lattice, so each trailer
frame is the same film frame a full-film seek would paint. When the trailer
ends, the end card offers the full film; when the film ends, it offers the
trailer.
