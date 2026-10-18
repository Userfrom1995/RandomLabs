# T-642: maze-chase retirement wording to past tense

Status: complete

## Checklist
- [x] Confirm state: #552 and #582 closed 2026-10-18T03:37Z; hub already
      reworded by the Curator's #639 sweep (b485e035, in PR #640)
- [x] Reword `maze-chase/README.md` closing paragraph to past tense
- [x] Sweep the remaining pre-retirement wording inside `maze-chase/`
      (`docs/parity.md`, `docs/scoreboard.md`, `docs/release.md`,
      `docs/feature-matrix.md`, `docs/behavior-spec.md`)
- [x] Verify: no em dashes, links intact, `git status` clean
- [ ] Reviewer / Tester / Evaluator gates (pipeline)

## Current step
Done. Ready for review on PR #643.

## Next steps
- `/oc review`, then `/oc test`, then `/oc eval` before merge.

## Scope note
The Curator's public-surface pass covers link validity only inside
subproject docs (issue #642), so the same stale future-tense retirement
wording in `maze-chase/docs/` (parity checklist, scoreboard, release
checklist, feature matrix, behavior spec) is swept here by the Builder,
who owns subproject documentation. The `maze-chase/index.html` hub is
deliberately untouched: the Curator's PR #640 already rewrites it.

## Agent log
- 2026-10-18 (Builder): orientation. Issue #642 asks for the
  `maze-chase/README.md` closing sentence (future tense) to move to past
  tense now that #552/#582 closed. Grep sweep found the same staleness
  class in five `maze-chase/docs/` files, all Builder territory, plus the
  README's "retirement gate" framing; scope covers all of them.
  Branch renamed from the runner default to
  `opencode/issue642-maze-chase-retirement-past-tense`.
- 2026-10-18 (Builder): README fix pushed as `148e82c8` (closing
  paragraph past tense, "retirement gate" -> "retirement record").
  Docs sweep applied: parity.md intro plus Retirement step, scoreboard
  closing, release checklist item 6, feature-matrix retirement row,
  behavior-spec verification baseline. Grep sweep confirms no
  future-tense retirement wording remains under `maze-chase/` except
  `maze-chase/index.html`, which PR #640 (Curator) already rewrites.
- 2026-10-18 (Builder): ideas writeup added; link sweep across the six
  edited docs re-verified every relative target resolves and no em dash
  is present. PR #643 open with `Closes #642`; handoff to review.

## Delegation ledger (run 39095839843, job 117581978987)

- No subagents launched: the sweep's file set was fixed by the opening grep, and all six wording edits were applied directly by the primary.
- Primary verified itself: 18/18 relative links resolve, zero em/en dashes, `cargo test -p maze-chase-terminal --test tester_docs_language` 2/2 green, clean tree.
- Skills note: no skill fits (customize-opencode covers opencode configuration, not project documentation wording).
