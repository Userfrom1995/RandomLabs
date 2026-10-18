# Maze Chase docs: the #552 retirement recorded in past tense

The #552 Pac-Man and #582 Maze Chase trackers closed on 2026-10-18 and the
public surfaces (root README, landing page, both hubs via the Curator's
#639 sweep in PR #640) describe the Python game as retired. The
maze-chase project docs were the last surface still speaking in future
tense: the README closing paragraph said the reference game "retires by
the Maintainer's explicit step after this release lands", and the same
stale class sat in five subproject docs the Curator cannot edit
(subproject documentation is Builder territory, and the Curator's remit
inside it is link validity only).

## What changed

- `maze-chase/README.md`: closing paragraph now reads "the #552 Python
  reference game is retired in favor of this game, kept as the reference
  implementation"; the intro's "retirement gate" framing became
  "retirement record" since the parity checklist now records a completed
  step.
- `maze-chase/docs/parity.md`: intro and the Retirement step section
  move to past tense (#552 was retired against the checklist and the
  retirement was recorded in the issue; the Python game kept working
  until the retirement decision executed).
- `maze-chase/docs/scoreboard.md`: the reference game was retired in
  favor of this game by the Maintainer's explicit step after the release
  merged.
- `maze-chase/docs/release.md`: clean-checkout item 6 confirms the
  feature-matrix rows that gated the retirement (was "before retiring").
- `maze-chase/docs/feature-matrix.md`: the retirement row's evidence
  cell moves to past tense.
- `maze-chase/docs/behavior-spec.md`: the verification-baseline bar is
  stated as the gate the harness had to reach before the retirement.

## Scope decision

The issue asked for the README sentence; the sweep covers the same stale
wording class wherever it survives under `maze-chase/`, so no surface
contradicts the closed retirement records. `maze-chase/index.html` is
deliberately untouched because PR #640 (the Curator's surface sweep)
already rewrites the hub, and polluting its diff would only invite a
conflict.

## Key files

- `maze-chase/README.md`
- `maze-chase/docs/parity.md`
- `maze-chase/docs/scoreboard.md`
- `maze-chase/docs/release.md`
- `maze-chase/docs/feature-matrix.md`
- `maze-chase/docs/behavior-spec.md`
- `progress/T-642-retirement-past-tense.md`

## Notes

- Documentation only; no code, link targets, or measured numbers
  changed.
- No em dashes; all relative links re-verified after the edit.
