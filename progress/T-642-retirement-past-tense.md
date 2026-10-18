# T-642: maze-chase retirement wording to past tense

Status: in-progress

## Checklist
- [x] Confirm state: #552 and #582 closed 2026-10-18T03:37Z; hub already
      reworded by the Curator's #639 sweep (b485e035, in PR #640)
- [ ] Reword `maze-chase/README.md` closing paragraph to past tense
- [ ] Sweep the remaining pre-retirement wording inside `maze-chase/`
      (`docs/parity.md`, `docs/scoreboard.md`, `docs/release.md`,
      `docs/feature-matrix.md`, `docs/behavior-spec.md`)
- [ ] Verify: no em dashes, links intact, `git status` clean
- [ ] Reviewer / Tester / Evaluator gates (pipeline)

## Current step
Scaffold pushed; PR opens early. README reword next.

## Next steps
- Reword README closing paragraph; then the docs sweep; then ideas entry.

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
