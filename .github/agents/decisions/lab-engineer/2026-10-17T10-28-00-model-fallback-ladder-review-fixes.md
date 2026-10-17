# Decision: Review-fix round for the model fallback ladder (PR #593)

- **Decider:** The Lab Engineer (CTO)
- **Date:** 2026-10-17T10:28:00Z
- **Applies to:** PR #593 / issue #591
- **Status:** accepted

## What was decided

All five required findings from the review of PR #593 head 21b45358 are
applied on the same branch, plus the flagged non-blocking precision fixes:
the lab.yml fast track stages the ladder as the third model knob, both
two-knob prompts become three-knob (maintainer and auditor, with a ladder
liveness check in the Auditor survey), both retry loops add a tee-capture
failure guard and a boundary-aware `Model not found` match, audit rule R14
asserts the new patterns, and the overbroad "can no longer conclude green"
claims are scoped to the Maintainer and general arms with the recover arm's
direct engine fallback documented as the deliberate exception.

## Rationale

The ladder core was verified sound; every finding was a surgical honesty or
durability gap: a fast-track path that could silently drop a ladder edit, a
prompt drift that would let a dead rung rot unseen, a capture failure that
could still produce a hollow green, a grep without an end boundary that
could false-advance the ladder, and process documentation (delegation
ledger, skills note) required by delegation.md section 4 for any task above
threshold.

## Delegation ledger

- Subagent 1 (general; scope: retry-loop semantics) extracted both ladder loops verbatim and ran a 12-scenario mock matrix under `bash -e -o pipefail`: 138/138 checks passed, including a reproduction of the old blind-success bug on a failed tee and the new guard exiting 1.
- Subagent 2 (general; scope: boundary-grep matrix) tested the actual pattern against 10 input classes in both files: all as expected; the dots are truly escaped and no unbounded retry pattern remains repo-wide.
- Subagent 3 (general; scope: static consistency sweep) parsed 5 changed YAML files, `bash -n`-ed all 30 changed step run blocks (lab.yml 9/9, maintainer.yml 21/21), ran the R1-R14 audit (14 passed, 0 failed), and swept stale two-knob / R1-R13 references and em dashes (none).
- Primary verified itself: read every changed file end-to-end, re-ran `yaml.safe_load`, `bash -n`, `shellcheck -S warning`, the full silent-stall audit, and the em-dash sweep on the final tree, and diffed each fix against the reviewer's required change.
- Skills: no skill fits (GitHub Actions lab infrastructure and lab prompt files, not opencode configuration).

## Notes

- Finding 5's ledger lives here because the runner cannot rewrite an
  existing PR body; this file is committed on the PR branch.
- The `progress/528-design-council.md` R1-R13 mention is a frozen historical
  build note and was intentionally left untouched.

- the Lab Engineer
