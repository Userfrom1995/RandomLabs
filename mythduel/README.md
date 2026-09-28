# Mythduel: an original Thor vs Zeus mythic duel

An original 172-second hand-drawn-style mythic duel fight scene, staged as a
playable Pages film at `/mythduel/`: two original interpretations of
public-domain myth figures, Thor (storm-bringer of the north) and Zeus
(storm-lord of Olympus), meet over a contested storm and settle it in single
combat. Deterministic real-time canvas render, original story and choreography,
original fighter designs, beat-synced captions, chapter navigation, an original
synthesized score with battle SFX performed live in the theatre and rendered
offline to a deterministic WAV master, and a behind-the-scenes surface. Every
phase keeps `bash mythduel/repro.sh` green.

## Watch

Open `mythduel/index.html` (served at `/mythduel/`): play/pause (Space),
scrub/seek on the 24 fps frame grid, beat/chapter menu, captions toggle (C),
fullscreen, volume and mute for the live original score. Reduced-motion viewers
get held stills stepped by seek and chapters. Works at 390 px mobile widths.

## How it works

- One seeded RNG (`engine/rng.js`) drives every jitter, grain fleck, and boil
  offset. Same seed plus same sources equals identical frames, verified by
  hash-free determinism checks and byte-exact caption rebuilds.
- `story/duel.json` is the source of truth: 8 timed beats with camera, staging,
  captions, music cues, SFX tags, wind vectors, and continuity entry/exit
  fields. The engine is a pure function of (timeline, time): scrubbable,
  pausable, testable.
- Every beat declares entry and exit state; the next beat's entry must match.
  No teleporting weapons, no forgotten wounds, no weather that resets.
- The story: a free storm neither fighter called gathers over the strait;
  both claim the right to loose it. Ranging exchanges, thrown weapons recalled,
  body blows, the sky turning on both fighters, one clean opening, one withheld
  killing blow. Mercy as strength: both loose the storm out to sea together.

## Repository map

- `story/`: duel timeline, fighter bible, choreography, continuity ledger,
  music direction, storyboard, IP declaration.
- `designs/`: original SVG model sheets, weapon sheets, palette plate.
- `engine/`: deterministic RNG, timeline, 24 fps frame grid, ink boil, paper
  grain, four-pass storm-crag arena paint, FK fighter rigs with combat
  choreography (poses, faces, exertion, wounds, wind-driven cloth and hair,
  impact particles anchored to the geography).
- `player/`: theatre transport (including live-score volume/mute), storyboard gallery with per-beat shot lists, styles.
- `score/`: original leitmotif rows and per-cue orchestration, six offline
  synth voices, eighteen-generator procedural SFX bed, voiced-line-first
  ducking, deterministic mix to WAV master plus per-bus stems, live WebAudio
  performer playing the same event lists, committed JSON stems.
- `tools/`: stills manifest with arena plates and trailer totals, headless
  capture cards, arena plates, and fighter close-up cards (poses, contacts,
  silhouette reads), caption export, audio render pipeline (WAV master plus
  stems into `dist/`, committed JSON stems), binding audit (continuity ledger,
  lattice, motif coverage, board/duel agreement, shot and trailer resolution,
  arena grades/determinism/budgets, rig proportions, turnaround symmetry,
  contact honesty, impact timing, fighter determinism and paint budgets,
  score coverage and dead-air check, SFX tag map, voice/generator coverage,
  audio sync and bounds, stem rebuild match, duck floors, master bounds,
  live/offline phrase parity, IP/provenance gates).
- `tests/`: smoke suite, animatic suite, combat suite, sound suite, hostile and QC regression pins.
  `captions.vtt`: committed caption track. `story/trailer.json`: trailer cut skeleton.
- `docs/`: pipeline and craft notes. `repro.sh`: one-command green build.

## Sound

Four original motif rows (northern horn-call for Thor, bright bronze row for
Zeus, grinding half-step clash ostinato, resolving unison hymn) orchestrated
per cue with march tempi and storm-graded beat rides: 842 deterministic
note-events covering every beat edge to edge, no dead air. Eighteen
procedural foley generators voice every choreography tag (gravel footfalls,
haft swings, shaft blocks, spark spray, thrown-weapon whooshes, sky cracks,
body blows, rain walls, rockfall, the held-beat hush kept honestly silent).
Both buses duck under voiced lines (words first, music second, air third).
`node mythduel/tools/render-audio.mjs` writes the 172 s master plus stems to
`dist/audio/` with a checksum manifest; the theatre performs the same lists
live through WebAudio.

## Reproduce

`bash mythduel/repro.sh` runs the audit, the smoke, animatic, combat, and sound
suites, the audio render, the capture and render tools, and a byte-exact
captions rebuild check.

## Originality

Thor and Zeus are original interpretations of public-domain myth figures only.
No Marvel likeness, no game or film assets, no third-party tracks. Provenance
is machine-enforced: no image/audio binaries without committed generators, and
the audit carries a forbidden-token scan. See `story/IP-DECLARATION.md`.
