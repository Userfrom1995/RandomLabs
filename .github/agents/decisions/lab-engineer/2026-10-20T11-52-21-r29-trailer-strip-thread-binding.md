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
4. **R29.** The rule pins the nine invocations, their exact trusted-checkout
   `with:` surface (`repository`, `ref`, `token`, `persist-credentials`,
   `fetch-depth`), the staging-before-gate-before-agent-before-strip order,
   the exact stage body, and the no-inline-copy boundary. Its functional
   sandbox runs under `env -i` with production-shaped event/actor context,
   exact PR-number binding, an executable mock `gh`, and a local bare origin.
   Scenarios cover the no-trailer incident, owner-trailer strip, clean human,
   clean fork and deleted-head no-ops, an absent head branch, human-branch
   refusal, issue mismatch, contributor preservation, issue-list
   cross-repository and head-repository decoys, prefix decoys, newest
   selection, both review-comment rewrite shapes, malformed and non-object
   event payloads, malformed PR metadata, failed list/view queries, a
   rejected push, and missing `origin/main`. Every case snapshots every
   remote head, so only the target branch may move. Fourteen mutants each
   fail a scenario alone: the pre-fix PR-number guard applied to the PR path,
   the narrowed PR namespace guard, both identity guards, both namespace
   guards, both list filters, the prefix, the sort, the sanitizer, a
   review-comment event-name shortcut, a rejected push failing open, a failed
   list failing open, and a main force-push.
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
- Full audit after review round 2: 29 passed, 0 failed, rc 0.
- R29's fourteen-mutant matrix passes only when each mutant is rejected; the
  whole-remote, review-path, checkout-surface, in-place-tamper, rejected-push,
  and failed-list mutants are the ones added in review round 2. Mutant
  branches are reseeded before each run so a mutant cannot be "caught" merely
  because an earlier case already stripped the fixture.
- `bash -n` passes `strip-trailers.sh` and `silent-stall-audit.sh`;
  `shellcheck -S error` is clean on both; PyYAML parses both touched
  workflows; `git diff --check` is clean; no U+2014 in any changed file.

## Review round 2 (guard hardening)

The Reviewer found that the first R29 pass compared only the named target
branch and exercised the review path only through a no-trailer fixture, so a
guard could stay green while a case force-pushed `main` or short-circuited
`pull_request_review_comment`. The guard and script were hardened:

- Every case now snapshots all remote heads and, for a rewrite, permits
  exactly the target branch to move. A `force-push-main` mutant proves it.
- Review-path cases exercise an owner-trailer strip and a mixed
  owner-plus-contributor strip (plus fork and deleted-head no-ops); a
  `review-event-shortcut` mutant proves the path is load-bearing.
- The full checkout `with:` map is pinned exactly, so an added `repository`,
  a shallower `fetch-depth`, or disabled credentials cannot source the
  staged helper from elsewhere; the wiring checker's own mutation self-test
  adds `repository: evil/RandomLabs` and requires rejection.
- R28 now scans every step (not only bound ones) and bans in-place editors
  and truncators (`sed -i`, `perl -i`, `truncate`, `rm`, `chmod`, Python
  open-writes) plus writes to the source helpers outside the staging step;
  a `stage-inplace-tamper` mutant proves it.
- Failure paths are exercised: a rejected strip push, a failed PR list, and
  a failed PR view all return rc 1 with the remote untouched; `push-fail-open`
  and `list-fail-open` mutants prove the fail-closed contract.
- The script distinguishes a definitively absent head (`ls-remote --exit-code`
  status 2, a loud no-op for a deleted branch) from a transport/auth error
  (rc 1), keeps the subsequent fetch failure hard, parses the event as a JSON
  object, and extracts the PR identity fields through one strict `jq -er`
  pass with a loud rc 1 on malformed metadata instead of raw jq errors.

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
