# Decision: restore the #696 actor-gate paragraph and bullet split in AGENTS.md (round-24 fix-up)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-19T19:52:00Z
- **Applies to:** PR #654 / issue #653
- **Status:** accepted

## Context

The round-24 rebase (run 39304587859, head `561c5ba7`) was dispatched to
resolve the two `.github/scripts/silent-stall-audit.sh` and `AGENTS.md`
conflicts so BOTH main's #698 surface and this PR's #653 surface survive.

The audit side survived intact (re-verified on the touched tree: canonical
audit 25 passed / 0 failed, R12 maintainer-gate coverage present:
`run-gate-step-not-unique`, `run-gate-step-not-shared-gate`, the verify
gate-env pin, the tree-wide watchdog-knob ban, and R25 cap pairs).

The `AGENTS.md` conflict resolution did NOT: it kept the pre-#698
actor-gate paragraph ("its own inline actor permission preflight is still
pending in issue #427 / PR #429", `schedule`/`workflow_dispatch` only)
instead of main's post-#696 version, contradicting the same head's
`maintainer.yml` (gate step `id: actor_gate` invoking the shared gate,
gating the runner and every post-gate side-effect step, clean-skip verify
lane). It also left the "Merge capability" and "PAT merge
shallow-workspace guard (issue #602)" bullets joined on one line, which
main has as two bullets. Both defects are visible in
`git diff origin/main -- AGENTS.md` as removed main-side lines, and both
the round-24 decision note and the PR body had claimed main's paragraph
was kept.

## What was decided

Restore `AGENTS.md` byte-exactly to main's lines for the actor-gate
paragraph and the two split bullets, keeping this PR's #653 entry as the
only addition over `origin/main`. No runtime, audit, script, or workflow
change.

## Verification

- `git diff origin/main -- AGENTS.md` after the fix: one hunk, exactly one
  added line (the `#653` entry), zero removed main-side lines, no EOF
  change.
- Secondary set check: lines in HEAD but not in main = exactly the #653
  bullet; lines in main but not in HEAD = none; duplicate-line counts
  unchanged (2/2), so the insertion is unique.
- The three restored lines match `git show origin/main:AGENTS.md` lines 69,
  71, and 72 byte-exactly (`diff` against the live file: identical).
- Canonical audit on the fixed tree: 25 passed / 0 failed, 0-byte stderr.
- Zero em dashes in the edited file.
- The round-24 note's and PR body's reconciliation claims are now true of
  the head.

## Ledger

- Primary self-verified: the diff-vs-main inventory (pre and post fix), the
  byte-exact line comparisons, the secondary `comm` set check, the audit
  control run, and the clean tree.
- No subagents were deployed: the work is a byte-exact textual restore whose
  correctness is directly and mechanically provable, and each claim above
  was re-executed on the final tree.
- Skills: none applied; `AGENTS.md`, `LAB.md`, and the audit script were
  read directly.

- the Lab Engineer
