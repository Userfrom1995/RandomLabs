# Decision: trailer-strip thread binding and R29 hardening (issue #689)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-20T11:52:21Z
- **Applies to:** issue #689
- **Status:** accepted

## What was decided

The strip step re-applied the issue-number naming guard to every trigger, so
a session on a `Refs`-only PR thread whose head was named for its parent
issue (PR #685 carried `opencode/issue582-...` for #582) redded with
`Refusing to rewrite unexpected branch` even when the branch carried no owner
trailer. The fix and its guard are:

1. **Event-shaped resolution.** On the PR-comment path (`issue_comment` on a
   PR and `pull_request_review_comment`) the script resolves the triggering
   PR head directly. Only the issue-to-linked-PR lookup keeps the strict
   `opencode/issue<issue#>-*` namespace refusal.
2. **Identity before rewrite.** A PR whose head is not on this repository
   (a fork, or a deleted head repository) is a loud no-op: fetching its
   branch name would resolve a same-named branch here that is not the
   triggering work. The PR-comment path refuses a branch outside
   `opencode/` only when it actually carries an owner trailer, so a clean
   human or fork PR cannot red. The issue lookup filters to same-repository
   PRs under `--limit 100` and selects the newest matching branch.
3. **One shared implementation, staged before the agent.** All nine
   `opencode.yml` strip steps (research, architect, build, fix, design,
   design-ux, design-visual, design-motion, general) run the script staged
   from the trusted default-branch checkout into
   `$RUNNER_TEMP/lab-scripts/`, under the actor gate with the job-scoped
   `github.token`. The fix and general jobs gain the staging step; the
   research step no longer uses the owner PAT. Inline `git filter-branch`
   copies are gone from those nine steps. The lab workflow keeps its separate
   R11-guarded strip.
4. **R29.** The rule pins the nine invocations, their trusted checkout ref
   and token, the staging-before-gate-before-agent-before-strip order, the
   exact stage body, and the no-inline-copy boundary. Its functional sandbox
   runs under `env -i` with production-shaped event/actor context, exact
   PR-number binding, an executable mock `gh`, and a local bare origin.
   Scenarios cover the no-trailer incident, owner-trailer strip, clean human,
   clean fork and deleted-head no-ops, human-branch refusal, issue mismatch,
   contributor preservation, issue-list cross-repository and head-repository
   decoys, prefix decoys, newest selection, review-comment payload, malformed
   event, and missing `origin/main`. Ten mutants each fail a scenario alone:
   the pre-fix PR-number guard applied to the PR path, the narrowed PR
   namespace guard, both identity guards, both namespace guards, both list
   filters, the prefix, the sort, and the sanitizer.
5. **R28.** The staging count is now nine, the stage body stages
   `strip-trailers.sh`, the fixture copies it, and the staged-file checks
   include it.

## Rationale

The false red was a naming convention, not a trailer finding: a `Refs`-only
PR is named for the issue that spawned it, not for its own number. Resolving
the triggering PR head removes that convention from the PR path without
weakening the issue path, where the lookup genuinely selects a branch by
pattern.

The identity check is deliberately separate from the trailer check. A fork or
deleted head cannot be rewritten, but it also has nothing on this repository
to strip, so a no-op is both safe and quiet. A rewrite is only attempted for a
same-repository `opencode/` branch that actually carries an owner trailer;
contributor trailers are preserved.

The R29 sandbox is isolated because a script that senses the audit event or
ambient actor could behave safely only under audit. The list fixture carries
three decoys (a cross-repository entry whose head repository matches, a
same-repository-flagged entry whose head repository does not, and a prefix
decoy) so each jq filter is load-bearing rather than masked by the other.

Residual: the staged copy lives in `RUNNER_TEMP`, which the agent can write,
the same trust boundary as the #690 staged helpers. It is not a security
sandbox around the agent; the review and test gates remain the control for
agent behavior. The workflow invocation and the script body are pinned.

## Verification

- Full audit: 29 passed, 0 failed, rc 0, on `.github/workflows/opencode.yml`.
- Checkout-ref mutation (`ref: ${{ github.ref }}`) makes R29 fail with
  `workflow-wiring`; the real file passes.
- Moving the general staging step after the agent makes R29 fail with
  `workflow-wiring`; the real file passes.
- R29's ten-mutant matrix passes only when each mutant is rejected; the
  cross-repository and head-repository list mutants and the pre-fix
  PR-number mutant are the ones that previously escaped or were mislabeled.
- `bash -n` passes `strip-trailers.sh` and `silent-stall-audit.sh`;
  `shellcheck -S error` is clean on both; PyYAML parses both touched
  workflows; `git diff --check` is clean; no U+2014 in any changed file.

## Delegation ledger

- Independent `general` subagent audited the diff without edits and returned
  findings on the checkout ref not being pinned, staging order for fix and
  general not being checked, the R29 sandbox inheriting ambient CI state and
  not binding PR numbers, the fork-filter mutant being masked by the
  head-repository filter, the pre-fix mutant being mislabeled, clean fork and
  deleted-head PRs false-redding, and the lab workflow's separate inline
  strip. All were addressed in this pass except the documented RUNNER_TEMP
  trust-boundary residual.
- Primary verified the full audit, the checkout-ref and stage-order
  mutations, both script syntax checks, shellcheck, YAML parsing, the em-dash
  scan, and the diff.
- Skills: no skill fits (GitHub Actions CI and audit-shell work, not opencode
  configuration); none loaded.

## Changes

- `strip-trailers.sh`: direct PR-head resolution, identity no-op, trailer
  check before the PR namespace guard, fail-closed payload/PR/fetch/log
  handling, same-repository issue list with newest selection, preserved
  contributor trailers.
- `opencode.yml`: nine staged script invocations, nine staging steps,
  job-scoped token, R29 header.
- `silent-stall-audit.sh`: R29 static pins and isolated functional matrix,
  ten mutants, R28 nine-stage count and strip-script staging.
- `AGENTS.md`, `LAB.md`: document the fix, the staged nine-step boundary,
  the fork/deleted-head no-op, and the expanded R29 matrix.

- the Lab Engineer
