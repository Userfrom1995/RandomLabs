# Hearthlight Rebuilt Premiere Cut - the trailer, the third poster, and the verified theatre

Phase 5 of the Hearthlight Reimagined rebuild (#463): the premiere cut is
finalized. The 30-second trailer is re-cut against the real caption
lattice, the poster wall gains a third ensemble poster for the new human
leads, and the theatre is verified end to end on desktop and 390 px mobile
with reduced motion on and off.

## What was built

- `film/story/trailer.json` - the S06 label aligned to its shot title
  ("The keeper's lantern"; the other five already matched). The cut keeps
  its proven six-moment arc (S01, S06, S10, S12, S14, S17: one moment per
  act, failure through many flames) because every window was verified
  against the rebuilt caption spans: each window carries live dialogue
  delivery (NARRATOR+NIA, YARA, TAM+LUMI, RUEL+TAM, LUMI, NIA+TAM), so
  faces act through the whole trailer.
- `film/engine/trailer.js` - untouched. The 24 fps lattice map, the
  hostile clamps, and the frame-parity property all hold for the
  re-labeled cut (verified, not assumed).
- `film/posters/poster-v3.svg` - new third poster, "three lights, one
  rope": Nia with the keeper's lantern, Tam with his oar yoked, small
  Lumi with cupped lantern-light, crossing the rope traverse over white
  water while the valley's kept sparks rise below. Original flat-poster
  art in the v1/v2 style, drawn in code, no em dashes, valid SVG.
- `film/index.html` - poster wall shows all three; trailer paragraph
  names the keeper's lantern beat.
- `film/tests/premiere.mjs` + `film/tools/audit.mjs` - new Phase 5 gates:
  all three posters exist and hang on the wall; every trailer label
  matches its shot title.
- Docs (`film/README.md`, `film/docs/story.md`, `film/docs/pipeline.md`,
  root `index.html` + `README.md`) - unified product view: three posters,
  the corrected trailer beats, and a logline that names the new ensemble
  (Nia, the young ferryman, his injured sister).

## Why

The new story is an ensemble story: Tam and Lumi carry acts 3 and 4, and
the owner's verdict demanded properly designed human characters with an
original identity at every level. A poster wall showing only Nia (v1) and
a dawn valley (v2) undersold the rebuild, and v1's tiny Ruel silhouette
over-billed a character demoted to one supporting appearance. The additive
answer: leave v1/v2 untouched and let v3 carry the new leads. The trailer
label fix is the same honesty at text level: five labels matched their
shots, one did not.

## How it was verified

- `bash film/repro.sh` green (audit with new Phase 5 gates, smoke,
  premiere, captions byte-exact at 43 cues).
- All 23 film suites green, including the Tester's hostile pins
  (602 score / 50 SFX events, trailer drift bound, hostile seeks).
- Builder theatre probe: 91 renders covering every act start (chapters),
  the end-card instant, every trailer half-second at 390 px with reduced
  motion, and hostile film times, all painting with no throws.
- `final-audit.mjs`: 720/720 trailer frames land on their intended film
  frames; 240/240 watch-through sweep paints with no empty frames or NaN.

## Key files

- `film/posters/poster-v3.svg`, `film/story/trailer.json`
- `film/index.html`, `film/player/player.js` (unchanged, verified),
  `film/player/gallery.js` (unchanged, paints new plates automatically)
- `film/tests/premiere.mjs`, `film/tools/audit.mjs`
- `progress/463-hearthlight-reimagined-rebuild.md` (Phase 5 notes)
