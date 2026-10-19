# Decision: bind the verify steps' declarative keys in R15 (review round 19)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-19T15:46:00Z
- **Applies to:** PR #654 / issue #653
- **Status:** accepted

## What was decided

Review round 19 found five blocking test-integrity escapes in R15. Round 18
had made the verify-step extraction structural and executed the parsed `run`
bodies behaviorally, but it never bound the steps' declarative keys. Five
one-line mutations therefore hollow-greened or skipped both loud-failure
verifies while the shipped audit stayed at 25 passed / 0 failed:

- adding `continue-on-error: true` to the Maintainer verify step;
- changing the Maintainer verify's `if: always()` to `if: false`;
- adding `continue-on-error: true` to the general verify step;
- changing the general verify's actor-gated `if` to `if: false`;
- hardcoding the general verify's `AGENT_OUTCOME` to `success`.

The fix is audit-only. The runtime hardening approved at `78b57e6e` is
unchanged, so this round keeps the reviewed runtime blob stable.

## The fix

`.github/scripts/silent-stall-audit.sh`:

- `verify_key_hits` binds each verify step's key surface: the mere presence
  of `continue-on-error` fails; the parsed `if` must equal the exact expected
  expression; the env mapping must be exactly `{AGENT_OUTCOME: expected}`;
  the Maintainer step's `shell` must be exactly `bash` and the general arm
  must carry no `shell`; and `timeout-minutes`/`working-directory` are
  rejected.
- `verify_check` resolves the step structurally as before, applies the key
  hits (emitting `verify-step-continue-on-error`,
  `verify-step-conditional`, `verify-step-env-not-exact`,
  `verify-outcome-env-not-agent-outcome`,
  `verify-step-shell-not-expected`, `verify-step-timeout-minutes`, or
  `verify-step-working-directory` under the file label), and writes the
  parsed run body for the behavioral harness.
- The call sites pass the exact expected values:
  Maintainer `always()`, `${{ steps.maintainer_run.outcome }}`, `bash`;
  general `always() && steps.actor_gate.outputs.run == 'true'`,
  `${{ steps.opencode.outcome }}`, no shell.
- A non-vacuous self-test exercises a good verify fixture and the
  continue-on-error, conditional, extra-env, hardcoded-outcome, shell,
  timeout, and working-directory mutant shapes.
- The R15 header comment, PASS summary, and failure text name the new
  bindings.

## Documentation and non-blocking fixes

- `AGENTS.md` #653 entry: the round-18 sentence said the four escapes "all
  read 25/0 on the fixed tree"; corrected to 25/0 on the pre-fix head
  `3ac45e82` and 24/1 after the fix, and a round-19 clause now states the
  verify-key binding.
- `LAB.md` #653 section: a round-19 paragraph records the five escapes, the
  key surface now bound, and the mutation evidence.
- PR #654 body: the stale Audit bullet count is refreshed to the 25-rule
  base (25 passed / 0 failed) and a round-19 bullet records the escapes,
  catches, and control.
- The round-6 decision note named in the review's non-blocking note no
  longer carries bare mutation IDs (the descriptive labels are already in
  place), so no edit was required there.

## Evidence

Control on the final tree: 25 passed / 0 failed, 0-byte stderr, two runs.

Primary matrix on fresh `git archive` exports, one mutation per export:

- Pre-fix head `25e9eb40`: all five reviewer mutations read 25 passed / 0
  failed (the escapes are real).
- Fixed tree: each mutation reads 24 passed / 1 failed with R15 the only
  failing rule and exactly one expected label:
  - `maintainer.yml(verify-step-continue-on-error)`
  - `maintainer.yml(verify-step-conditional)`
  - `opencode.yml(verify-step-continue-on-error)`
  - `opencode.yml(verify-step-conditional)`
  - `opencode.yml(verify-outcome-env-not-agent-outcome)`
- Defense-in-depth mutations (Maintainer `shell: dash`, general
  `timeout-minutes: 5`, general `working-directory: /tmp`, general extra
  env key) each read 24 passed / 1 failed with the matching
  `verify-step-shell-not-expected`, `verify-step-timeout-minutes`,
  `verify-step-working-directory`, and `verify-step-env-not-exact` labels.
- All runs had 0-byte stderr and deterministic summaries.

## Delegation ledger

- Independent verifier subagent (general, fresh exports under
  `/tmp/opencode/verify-r19`, its own mutation applier, read-only for the
  workspace): control 25/0 twice with 0-byte stderr; all five reviewer
  mutations escaped at 25/0 on the pre-fix tree and were caught at 24/1 with
  the exact expected R15 labels on the fixed tree; read the key-binding logic
  and confirmed each required check; reported the workspace untouched.
- Primary authored the fix and self-tests, ran the control, the five pre-fix
  escapes, the five fixed catches, and the four defense mutations, and
  verified the docs delta and clean working tree.
- Skills: no skill fits (GitHub Actions lab-infrastructure regression-audit
  work, not opencode configuration of this workspace), noted per
  `delegation.md` section 5.

## Why audit-only

The findings are coverage gaps in the regression guard, not runtime defects.
Changing only the audit plus the binding docs keeps the behaviorally verified
runtime blobs byte-identical and routes the round through the normal
re-review and re-test loop.

- the Lab Engineer
