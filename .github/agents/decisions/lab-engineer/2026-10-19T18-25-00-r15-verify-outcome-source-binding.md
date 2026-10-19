# Decision: bind the verify outcome source by identity in R15 (review round 22)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-19T18:25:00Z
- **Applies to:** PR #654 / issue #653
- **Status:** accepted

## What was decided

The Tester's round-22 test-integrity finding: R15 pinned the TEXT of the
verify steps' `AGENT_OUTCOME` expression (round 19 bound it to exactly
`${{ steps.opencode.outcome }}` / `${{ steps.maintainer_run.outcome }}`)
but never bound the step IDENTITY that expression resolves to. A two-line
mutation therefore kept the shipped audit at 25 passed / 0 failed while
hollow-greening the general verify: give the general job's earlier
`Configure git identity` step `id: opencode` and rename the `Run opencode
general agent` step's id to `opencode_agent`. The verify then reads the
always-succeeding git-config step's `success` outcome (the agent step's
`continue-on-error: true` keeps the job green), so a failed general agent
still concludes green, the exact #591 class the verify exists to close.

The fix is audit-only. The runtime hardening is unchanged from the
verified head; the change set is the audit script plus two doc clauses
and this note.

## The fix

`.github/scripts/silent-stall-audit.sh`:

- `OUTCOME_EXPR` resolves the expression to its step id
  (`^\$\{\{\s*steps\.([A-Za-z_][A-Za-z0-9_-]*)\.outcome\s*\}\}$`).
- `steps_of_job(doc, job_id)` returns the steps of exactly one job, so
  the id lookup is scoped to the verify's own job (opencode.yml has many
  jobs with an `opencode` id; a file-wide lookup would false-positive).
- `outcome_source_hits(doc, verify_step, expected_job,
  expected_source_name, expected_runner)` requires: the env value parses
  as a `steps.<id>.outcome` reference; exactly one step in the expected
  job carries that id (`verify-outcome-source-not-unique-in-job` when
  zero or several); that step's name is the agent runner step
  (`verify-outcome-source-not-agent-step` otherwise); and for the
  composite general arm the source must carry exactly
  `uses: ./.github/actions/opencode-run`, `continue-on-error: true`,
  `timeout-minutes: 60`, and
  `if: steps.actor_gate.outputs.run == 'true'`.
- `verify_check` gains `expected_outcome_step` and
  `expected_outcome_runner`; the Maintainer verify binds
  `maintainer_run` -> `Run Maintainer agent` (inline), the general
  verify binds `opencode` -> `Run opencode general agent` (composite).
- A non-vacuous self-test matrix covers both arms: the pristine
  fixtures stay clean, and the re-pointed decoy, duplicate-id,
  missing-id, changed-uses, flipped-continue-on-error, changed-timeout,
  changed-gate, and maintainer-repointed fixtures each trip the expected
  label. (The fixtures live in a dedicated `outcome_mutants` list
  because the existing `verify_mutants` matrix exercises
  `verify_key_hits`, not the identity binding; the class of mutant the
  Tester asked for is covered and the matrix's non-vacuity is proven by
  forcing `outcome_source_hits` to return `[]` and watching all eight
  self-test labels fire.)
- The R15 header, PASS summary, and failure text name the new binding.

## Documentation

- `AGENTS.md` #653 entry: a round-22 clause records the escape and the
  identity binding (25/0 on the pre-fix head `ca0d9d5d`, 24/1 with R15
  the only failing rule after the fix).
- `LAB.md` #653 section: a round-22 paragraph records the escape class,
  the binding, and the mutation evidence.
- PR #654 body: a round-22 bullet.

## Evidence

Control on the final tree: 25 passed / 0 failed, 0-byte stderr, R15
PASS.

Primary matrix (one mutation per fresh export of the pre-fix head plus
the fixed audit script):

- Tester's general re-point (`id: opencode` moved to the git-config
  step, agent id renamed): 24/1, R15 only,
  `opencode.yml(verify-outcome-source-not-agent-step)`.
- Maintainer re-point (`id: maintainer_run` moved to the git-config
  step, agent id renamed): 24/1, R15 only,
  `maintainer.yml(verify-outcome-source-not-agent-step)`.
- Duplicate id (git-config step also carries `id: opencode`): 24/1,
  R15 only, `opencode.yml(verify-outcome-source-not-unique-in-job)`.
- Missing id (agent id renamed with no decoy): 24/1, R15 only,
  `opencode.yml(verify-outcome-source-not-unique-in-job)`.
- Real-file attribute mutation (`continue-on-error: true` ->
  `false` on the general agent step): 24/1, R15 only,
  `opencode.yml(verify-outcome-source-not-agent-step)`, so the
  composite attribute binding is load-bearing.
- Vacuous checker (forced `return hits` in `outcome_source_hits`):
  R15 FAIL with all eight `verify-outcome-source-self-test:*` labels,
  proving the self-tests are non-vacuous.

Parent-escape control: the pre-fix head's own audit script on the
Tester's exact two-line mutant stays 25 passed / 0 failed, so the delta
is exactly what closes the hole.

False-positive control: the pristine tree reads 25/0 (the `general`
job's single `opencode` id resolves to the composite agent step with
the exact attributes; the maintainer job's `maintainer_run` resolves to
`Run Maintainer agent`), and PyYAML resolution of the shipped files
matches every compared value.

## Delegation ledger

- Independent verifier subagent (general, fresh `/tmp` copies, own
  mutation applier, read-only for the workspace): control 25/0 with
  0-byte stderr; the parent-head escape reproduced at 25/0; the Tester's
  re-point and the maintainer, duplicate-id, and self-test-non-vacuity
  variants all caught by R15 alone at 24/1 with the expected labels and
  0-byte stderr; no escape, discrepancy, or non-determinism; the
  workspace stayed untouched.
- Independent hygiene subagent (general, read-only): 10/10 categories
  PASS - scope exactly the three files, zero U+2014, `bash -n` clean,
  the extracted R15 Python heredoc compiles under PyYAML 6.0.1, both
  workflows still parse, mode 100755 kept, no secrets or new live JIT
  expressions (the single `${{` added line is a Python mutation-fixture
  string, not a workflow expression), docs consistent with the code,
  the shipped compared values re-derived independently, and no workflow
  add/rename/remove or allowlist delta.
- Primary authored the fix and the self-test matrix, ran the control,
  the four escapes, the attribute mutation, the vacuous-checker proof,
  the parent-escape control, and both regression controls; verified the
  docs delta and left the tree clean before committing.
- Skills: no skill fits (GitHub Actions lab-infrastructure
  regression-audit work, not opencode configuration of this workspace),
  noted per `delegation.md` section 5.

## Why audit-only

The finding is a coverage gap in the regression guard, not a runtime
defect. Changing only the audit plus the binding docs keeps the
behaviorally verified runtime content unchanged and routes the round
through the normal re-review and re-test loop.

- the Lab Engineer
