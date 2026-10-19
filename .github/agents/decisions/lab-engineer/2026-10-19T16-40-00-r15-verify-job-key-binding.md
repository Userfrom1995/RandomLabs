# Decision: bind the verify jobs' declarative key surface in R15 (review round 20)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-19T16:40:00Z
- **Applies to:** PR #654 / issue #653
- **Status:** accepted

## What was decided

Review round 20 found that R15 bound the verify steps' declarative keys
(round 19) but not their enclosing jobs. The extractor `steps_of(doc)`
flattens every job in a workflow into one step list and discards the job
ids, so job-level declarative keys were invisible to the audit. Five
one-line mutations therefore hollow-greened or skipped both loud-failure
verifies while the shipped audit stayed at 25 passed / 0 failed:

- a job-level `continue-on-error: true` on the `maintainer` job of
  `maintainer.yml` or the `general` job of `opencode.yml` (the whole job
  reports green on any outcome);
- a job-level `if: false` on either job (the tick is silently skipped);
- a job-level `defaults.run.shell: "true {0}"` on the `general` job (the
  general verify step deliberately carries no step `shell`, so the job
  default would execute its body as `true <path>`).

The fix is audit-only. The runtime hardening approved at `78b57e6e` is
unchanged, so this round keeps the reviewed runtime blobs byte-identical.

## The fix

`.github/scripts/silent-stall-audit.sh`:

- `EXPECTED_MAINTAINER_JOB_IF` and `EXPECTED_GENERAL_JOB_IF` hold the exact
  parsed `if` scalars of the two jobs (block scalars, trailing newline
  included, no normalization or truncation; 588 and 2919 characters).
- `verify_job_hits(job, expected_if, expected_runs_on, expected_timeout)`
  binds a job's key surface: the mere presence of `continue-on-error` fails
  (`job-continue-on-error`); the parsed `if` must equal the expected scalar
  (`job-if-not-exact`); `defaults` and `env` are rejected
  (`job-defaults-override`, `job-env-override`); `runs-on` must be exactly
  `ubuntu-latest` (`job-runs-on-not-exact`); `timeout-minutes` must be
  exactly `75` (`job-timeout-minutes-not-exact`); and the exact key set must
  be `{if, runs-on, timeout-minutes, steps}` (`job-keys-not-exact`).
- `verify_workflow_hits(doc)` rejects workflow-level `defaults` and `env`
  (`workflow-defaults-override`, `workflow-env-override`) and fails closed
  on a non-mapping document (`workflow-not-mapping`).
- `verify_job_check(label, path, job_id, expected_if, expected_runs_on,
  expected_timeout)` resolves the job structurally (fail closed on a parse
  error or a missing job) and emits the hits under the file label.
- The call sites pass the exact expected values for
  `maintainer.yml`/`maintainer` (588-char `if`, `ubuntu-latest`, 75) and
  `opencode.yml`/`general` (2919-char `if`, `ubuntu-latest`, 75).
- A non-vacuous self-test exercises a good job fixture and the
  continue-on-error, conditional, defaults, env, runs-on, timeout, and
  extra-key mutant shapes plus a good workflow fixture and its defaults and
  env mutant shapes.
- The R15 header comment, PASS summary, and failure text name the new
  bindings.

## Documentation

- `AGENTS.md` #653 entry: a round-20 clause records the job-level escapes
  and the job/workflow key surface now bound (25/0 on the pre-fix head
  `be1b109c`, 24/1 after the fix).
- `LAB.md` #653 section: a round-20 paragraph records the three escape
  classes, the bindings, and the mutation evidence.
- PR #654 body: a round-20 bullet records the escapes, the catches, and the
  control.

## Evidence

Control on the final tree: 25 passed / 0 failed, 0-byte stderr, two runs.

Primary matrix: 12 mutants on fresh `git archive` exports, one mutation per
export, each caught by R15 alone at 24 passed / 1 failed with the matching
label and 0-byte stderr:

- `maintainer.yml(job-continue-on-error)` + `job-keys-not-exact` (m1)
- `opencode.yml(job-continue-on-error)` (m2)
- `opencode.yml(job-if-not-exact)` (m3)
- `opencode.yml(job-defaults-override)` (m4)
- `maintainer.yml(job-if-not-exact)` (m5)
- `opencode.yml(job-runs-on-not-exact)` (m6)
- `opencode.yml(job-timeout-minutes-not-exact)` (m7)
- `opencode.yml(job-env-override)` (m8)
- `opencode.yml(workflow-defaults-override)` (m9)
- `opencode.yml(workflow-env-override)` (m10)
- `opencode.yml(job-keys-not-exact)` (m11)
- `maintainer.yml(job-env-override)` (m12)

Parent-escape controls: the pre-fix head `be1b109c` audit script against the
m1 and m3 workflows stays 25 passed / 0 failed, so the delta is load-bearing.

Constant self-test: both expected `if` constants equal the parsed YAML
values exactly (588 and 2919 characters).

## Delegation ledger

- Independent verifier subagent (general, fresh exports under `/tmp/v654`,
  its own mutation applier, read-only for the workspace): control 25/0 twice
  with 0-byte stderr; all five reviewer mutations (job `continue-on-error`
  on both jobs, job `if: false` on both jobs, job `defaults.run.shell` on
  the general job) caught by R15 alone at 24/1 with the exact expected
  labels and 0-byte stderr; both parent-escape trees stayed 25/0 with the
  HEAD audit script; constants re-derived independently and equal; the
  workspace audit script hash unchanged before and after (`md5sum`
  `5a5948a8f15a0eb2f00dc46ecf015230`).
- Independent hygiene subagent (general): 11/11 categories PASS (scope
  exactly the three modified files, `bash -n` clean, exactly one definition
  and one call site per new function, constants re-derived equal, self-tests
  replayed non-vacuously, zero em dashes, no secrets, mode 100755 kept,
  workflows byte-identical to HEAD, both R15 banners nominally escaped).
- Primary authored the fix and self-tests, ran the control, the 12-mutant
  matrix, and the parent escapes, and verified the docs delta and clean
  working tree.
- Skills: no skill fits (GitHub Actions lab-infrastructure regression-audit
  work, not opencode configuration of this workspace), noted per
  `delegation.md` section 5.

## Why audit-only

The findings are coverage gaps in the regression guard, not runtime defects.
Changing only the audit plus the binding docs keeps the behaviorally
verified runtime blobs byte-identical and routes the round through the
normal re-review and re-test loop.

- the Lab Engineer
