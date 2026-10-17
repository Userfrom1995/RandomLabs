# Decision: Review-comment publication evidence gate and audit rule R19

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-17T18:45:15Z
- **Applies to:** issue #616 (a reviewer death between the decision-file write and the comment post forwarded an unread verdict with zero published findings)
- **Status:** accepted

## What was decided

The review verify step (`opencode-review.yml`) no longer treats a present
`/tmp/random-lab-decision.json` as a completed verdict. Forwarding now
requires positive publication evidence, computed by the new shared script
`.github/scripts/review-comment-published.sh` (exit 0 published / 1 not
published / 2 unverifiable): a `github-actions[bot]` comment created after the
triggering comment whose body carries the exact `- the Reviewer` sign-off
line. The script is read from the run's own workflow commit
(`${GITHUB_SHA}:...`, extracted into `$RUNNER_TEMP`), never from the
checked-out PR head, so a PR can never weaken the gate that reviews it; a
missing script fails the verify step closed. An unpublished verdict is
deleted before the infra override and the forward step can ever see it, and
the run falls into the existing bounded review auto-retry (owner-authored
`/oc review (auto-retry N)`, cap 3, refuse-to-retry on enumeration failure).
Verification failure (exit 2) neither forwards nor auto-retries a possibly-
published review. Both the force-lab-routing step and the forward step now
also carry `steps.verify-review.outcome == 'success'`, so no forward path
survives an inconclusive verify. The reviewer prompt documents the
publication contract. A new audit rule R19 regression-guards all of it:
exact-form script pins (author/since/sign-off filters, paginated slurp fetch,
exit-code counts, harness-detection bans), workflow provenance pins
(workflow-commit extraction, fail-closed guard, published/unpublished/unknown
mapping, ordering of evidence -> verdict -> published guard -> discard ->
retry), forward-gate adjacency pins, and a functional test that executes the
real script against an executable mock `gh` across 11 payload cases.

## Root cause

Review run 39052018409 on PR #614 died at 17:12:06Z with
`api_key_expired` after the reviewer had written the decision file but before
its decision comment was published. The wrapper then posted a raw APIError
comment with no sign-off. The verify step saw the file, exited 0, the infra
override rewrote `fix` -> `lab`, and a bare `/oc lab` was forwarded at
17:12:09Z - the pipeline advanced on an unread verdict with zero published
findings. The agent-step `outcome=failure` marker was already available, but
the file-presence check short-circuited before the crash-parity logic.

## Evidence

- Incident: PR #614, run 39052018409 (`api_key_expired`, decision file
  present, agent outcome failed, wrapper APIError comment the only post).
- Comment-shape survey across historical review comments: the wrapper posts
  the final message with a `[github run](/Userfrom1995/RandomLabs/actions/runs/<id>)`
  footer and the sign-off tail; a mid-session comment-tool post carries the
  sign-off without a footer (PR #610 comment 6236137061); the dying run's
  APIError comment carries neither. The chosen predicate accepts the first
  two and rejects the third.
- Subagent A (general; behavioral harness, read-only on the repo): extracted
  the real verify run block from YAML at HEAD, substituted only the five
  macro lines (diff-verified), and executed an 11-scenario matrix against the
  real evidence script with a mock `gh` in a /tmp git repo: gate skip,
  published verdict (file kept, exit 0), unpublished verdict + crash
  (file removed, exactly one `/oc review (auto-retry 1)` post, exit 0),
  unpublished verdict + success (exit 1, no post), crash without decision
  (retry 2 posted), success without decision (exit 1), retry cap (exit 1),
  enumeration failure (exit 1), evidence rc 2 (file removed, exit 1, no
  retry), missing script at `GITHUB_SHA` (fail closed, file removed, exit 1,
  zero gh calls), and page-2 slurp sign-off (published, exit 0). 11/11 PASS.
- Subagent B (general; static sweep + independent mutation matrix in a /tmp
  copy): YAML parse + `bash -n` on all 93 extracted run blocks of the three
  changed workflows and both scripts (0 failures); executable bits 100755;
  zero em dashes; live audit 17/17; security scan clean (verify env exactly
  `AGENT_GATE`/`GH_TOKEN` PAT secret/`SINCE`; no free-form macro in any run
  block); mutations M1 (drop since filter), M2 (drop forward verify-success
  gate), M3 (swap published/unpublished exits), M4 (unanchored sign-off
  regex), M5 (drop the unpublished-verdict discard) each turn R19 red with
  the expected sub-flags, baseline restored 17/0.
- Primary verified itself: line-by-line read of the verify-step hunk;
  `bash -n` on all extracted review run blocks; live audit 17/17 twice;
  five direct mutation checks in a scratch copy (each tripping the expected
  pins); `git ls-files -s` modes; clean-tree and em-dash checks before
  committing.

## Delegation ledger

- Subagent A (general; scope: end-to-end verify-step behavioral matrix in
  /tmp, read-only on the real repo): 11/11 scenarios matched the specified
  exit codes, decision-file states, and gh post records; macro substitution
  integrity proven by line-indexed diff; mock interception asserted; scratch
  hygiene restored (`/tmp/random-lab-decision.json` absent afterwards); repo
  untouched.
- Subagent B (general; scope: static consistency sweep + independent R19
  mutation matrix in /tmp): 8/8 check groups PASS; found the two stale live
  `R1-R16` labels in `.github/agents/tester.md:64` and `LAB.md:530`, which
  this branch then fixed (plus `tester.md:60`, which the `R1-R16` substring
  pattern could not see through its backticks); mutation matrix 5/5 red with
  expected sub-flags.
- Primary verified itself: as listed under Evidence; plus the R19 functional
  harness dry-run and the docs/range coherence sweep.
- Skills: no skill fits (GitHub Actions lab infrastructure and lab prompts,
  not opencode configuration of this workspace).

## Notes

- Expected conflict surface: open PRs #609 (claims R17) and #614 (claims R18)
  also extend `silent-stall-audit.sh` and bump the same range strings; the
  first to merge after this one rebases and renumbers. R19 is appended after
  R16 without restructuring R14/R15/R16 blocks.
- Residual (documented in R19's header): the verify step's own shell control
  flow cannot be executed by the static audit; an arbitrary reshuffle that
  still passes every exact-form and ordering pin is caught by the review
  gate. Subagent A's harness executed it once out of band; the pins guard the
  contract going forward.
- `maintainer.yml` failure triage includes `opencode-review`, so the new
  loud-failure branches (exit 1 without a retry post) surface on the
  Maintainer's board instead of dying silently.
- No workflow file additions or renames, so the maintainer `workflows:`
  allowlist is untouched.

- the Lab Engineer
