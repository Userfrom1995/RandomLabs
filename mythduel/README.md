# Mythduel: an original Thor vs Zeus mythic duel

An original 172-second hand-drawn-style mythic duel fight scene, staged as a
playable Pages film at `/mythduel/`: two original interpretations of
public-domain myth figures, Thor (storm-bringer of the north) and Zeus
(storm-lord of Olympus), meet over a contested storm and settle it in single
combat. Deterministic real-time canvas render, original story and choreography,
original fighter designs, beat-synced captions, chapter navigation, and a
behind-the-scenes surface. Score and battle SFX are synthesized in-repo as the
build advances; every phase keeps `bash mythduel/repro.sh` green.

## Watch

Open `mythduel/index.html` (served at `/mythduel/`): play/pause (Space),
scrub/seek on the 24 fps frame grid, beat/chapter menu, captions toggle (C),
fullscreen. Reduced-motion viewers get held stills stepped by seek and
chapters. Works at 390 px mobile widths.

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
  grain. Fighter rigs, arena paint, and particles arrive with their phases.
- `player/`: theatre transport, storyboard gallery, styles.
- `tools/`: stills manifest, headless capture cards, caption export, binding
  audit (continuity ledger, lattice, motif coverage, IP/provenance gates).
- `tests/`: smoke suite. `captions.vtt`: committed caption track.
- `docs/`: pipeline and craft notes. `repro.sh`: one-command green build.

## Reproduce

`bash mythduel/repro.sh` runs the audit, the smoke suite, the capture and
render tools, and a byte-exact captions rebuild check.

## Originality

Thor and Zeus are original interpretations of public-domain myth figures only.
No Marvel likeness, no game or film assets, no third-party tracks. Provenance
is machine-enforced: no image/audio binaries without committed generators, and
the audit carries a forbidden-token scan. See `story/IP-DECLARATION.md`.
