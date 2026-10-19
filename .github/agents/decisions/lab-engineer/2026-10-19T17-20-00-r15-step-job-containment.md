# Decision: bind step-to-job containment in R15 (review round 21)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-19T17:20:00Z
- **Applies to:** PR #654 / issue #653
- **Status:** accepted

## What was decided

Review round 21 found that R15 bound the verify jobs' declarative key
surface (round 20) but not step-to-job CONTAINMENT. The extractor
`steps_of(doc)` flattens every job's steps into one list and drops the job
ids, and both `runner_check` and `verify_check` resolve their subject by
name across the whole file. Moving a bound step out of its job into a new
sibling job therefore kept the shipped audit at 25 passed / 0 failed:

- the general verify moved from `general` into a new `general-verify` job;
- the Maintainer verify moved from `maintainer` into a new
  `maintainer-verify` job;
- the `Run Maintainer agent` step moved from `maintainer` into a new
  sibling job, so the maintainer job gate no longer applies to the agent.

At runtime the moved step's pinned `if` references the old job's step
outputs, which do not exist in the sibling job, so GitHub evaluates the
condition false and silently skips the verify (and a sibling job could
hollow-green it with a job-level `continue-on-error`). This is the exact
#591 hollow-green class the gate exists to prevent.

The fix is audit-only. The runtime hardening is unchanged from the
verified head `347e25d8`; the current `maintainer.yml` blob differs from
the pre-rebase one only by main's two-line `postformer-cpu-train`
allowlist retirement.

## The fix

`.github/scripts/silent-stall-audit.sh`:

- `job_id_of_step(doc, step)` resolves the job that actually contains the
  step object, by identity, and returns `None` when the step lives in no
  job (the composite action's `runs.steps`).
- `runner_check` gains `expected_job=None`; after the unique-step check it
  fails with `${label}(run-step-not-in-expected-job)` when the step is not
  in the expected job. The composite action-file call keeps
  `expected_job=None` (an action has no jobs).
- `verify_check` gains `expected_job=None` with the same containment check
  (`${label}(verify-step-not-in-expected-job)`).
- Call sites: the Maintainer runner step and the Maintainer verify require
  job `maintainer`; the general verify requires job `general`. File-wide
  uniqueness stays as defense in depth.
- A non-vacuous self-test resolves a step in its job, a step moved into a
  sibling job (both the negative and the sibling's own id), and a
  composite step that belongs to no job.
- The R15 header comment, PASS summary, and failure text name the new
  binding.

## Documentation

- `AGENTS.md` #653 entry: a round-21 clause records the containment
  escapes and the exact-job binding (25/0 on the pre-fix head `9b7a661a`,
  24/1 after the fix).
- `LAB.md` #653 section: a round-21 paragraph records the escape class,
  the binding, and the mutation evidence.
- The round-20 decision note's runtime-identity claim is corrected from
  the pre-rebase `78b57e6e` / `a85701a2` wording to the verified head
  `347e25d8` and the current `44c1a514` maintainer blob (the only delta is
  main's allowlist retirement), as the reviewer requested.
- PR #654 body: a round-21 bullet records the escapes, the catches, and
  the control.

## Evidence

Control on the final tree: 25 passed / 0 failed, 0-byte stderr, ~58s.

Primary matrix (one mutation per copy, fresh copies of the final tree):

- general verify moved into `general-verify`: 24/1, R15 only, labels
  `opencode.yml(verify-step-not-in-expected-job)` plus
  `opencode.yml(general-verify-run-missing)`.
- Maintainer verify moved into `maintainer-verify`: 24/1, R15 only,
  labels `maintainer.yml(verify-step-not-in-expected-job)` plus
  `maintainer.yml(verify-run-missing)`.
- Maintainer runner step moved into a sibling job: 24/1, R15 only, labels
  `maintainer.yml(run-step-not-in-expected-job)` plus
  `maintainer.yml(run-block-extraction-empty)` and
  `behavioral(maintainer.yml,extract-or-shape)`.

Parent-escape controls: the pre-fix head `9b7a661a` audit script on the
same three mutants stays 25 passed / 0 failed in every case, so the delta
is load-bearing.

Regression controls: a job-level `continue-on-error: true` on `general`
still trips `job-continue-on-error` plus `job-keys-not-exact`, and a
step-level `if: false` on the Maintainer runner step still trips
`behavioral(maintainer.yml,run-step-conditional)`; both 24/1, R15 only,
0-byte stderr.

## Delegation ledger

- Independent verifier subagent (general, fresh exports under `/tmp`,
  its own applier, read-only for the workspace): control 25/0 with
  0-byte stderr; the three reviewer moves caught by R15 alone at 24/1
  with the expected per-file labels; the parent `9b7a661a` script on the
  same mutants stays 25/0; prior-round controls still caught; workspace
  untouched.
- Independent hygiene subagent (general): scope exactly the audit script,
  `AGENTS.md`, `LAB.md`, the corrected round-20 note, and the new note;
  `bash -n` clean; `yaml.safe_load` clean on both runner workflows; zero
  U+2014 em dashes; no secrets or new `${{ }}` interpolation; mode 100755
  kept; no workflow added, renamed, or removed; every commit bot-authored
  with a `lab:` prefix and no `Co-authored-by:` trailers.
- Primary authored the fix and self-test, ran the control, the three
  mutant moves, the three parent escapes, and both regression controls,
  verified the docs delta, and left the tree clean before committing.
- Skills: no skill fits (GitHub Actions lab-infrastructure regression-audit
  work, not opencode configuration of this workspace), noted per
  `delegation.md` section 5.

## Why audit-only

The finding is a coverage gap in the regression guard, not a runtime
defect. Changing only the audit plus the binding docs keeps the
behaviorally verified runtime content unchanged and routes the round
through the normal re-review and re-test loop.

- the Lab Engineer
