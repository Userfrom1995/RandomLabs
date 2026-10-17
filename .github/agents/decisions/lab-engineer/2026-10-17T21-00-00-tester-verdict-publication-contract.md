# Decision: Tester verdict publication contract (machine-verified publication, workflow-published canonical marker, R22)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-17T21:00:00Z
- **Applies to:** issue #629 (a prose-first tester verdict comment silently stalls the PAT merge sweep)
- **Status:** accepted

## What was decided

A tester maintainer verdict now reaches the PAT merge sweep in the shape R21
demands because the workflow guarantees it by construction, in two properties:

1. **Positive publication evidence before any maintainer decision proceeds.**
   The new `publish-gate` step in `opencode-test.yml` runs
   `.github/scripts/test-comment-published.sh` (read from this run's own
   workflow commit `${GITHUB_SHA}`, never the checked-out PR head) with the
   triggering comment's `created_at` as `SINCE`. The checker (exit 0 published
   / 1 not published / 2 unverifiable) requires a `github-actions[bot]` comment
   created after the trigger whose body carries the `- the Tester` sign-off
   line, fetched with the paginated slurp form. A missing script, an
   unpublished report, or an inconclusive verification discards
   `/tmp/random-lab-decision.json` and fails the step closed; the red run
   routes through the Maintainer's `workflow_run` failure triage for a fresh
   `/oc test` dispatch. The check applies to maintainer decisions only, matching
   the merge-sweep hazard the issue names.
2. **The workflow publishes the canonical marker itself.** The new `marker`
   step runs `.github/scripts/publish-tester-marker.sh` (again from
   `${GITHUB_SHA}`) only after the evidence gate and the publication gate
   passed. The publisher posts a comment whose first line is exactly
   `/oc approve-test` with `GH_TOKEN: github.token` (so authorship is
   `github-actions[bot]`, which the R21 predicate requires; the owner PAT would
   author as the owner and could never match), re-fetches the comment by id,
   and verifies both the bot authorship and the exact first line. It is never
   invoked for a non-maintainer decision and never for a `scope=unrunnable`
   escalation, and a failure exits 1 so the forward step stays gated off.
3. The `Forward tester decision` gate is now the exact conjunction
   `evidence-gate success && publish-gate success && marker.outputs.ok == true`,
   so no forward path survives a failed publication check or a failed marker.
   R21 is untouched; the anchored sweep predicate was not relaxed.

A new audit rule **R22** in `.github/scripts/silent-stall-audit.sh` regression
guards all of it: exact-form pins on both scripts (bot-author select, since
filter, sign-off regex, paginated slurp fetch, exit-code contract, marker
literal, re-fetch verification, numeric/repo/comment-id guards with
block-has-exit structural checks, harness-detection bans), exact-form pins on
the two workflow steps plus the forward gate, token choice, workflow-commit
provenance, unrunnable exclusion, step ordering, and two functional harnesses
that execute the real scripts against an executable mock `gh` (checker 11
cases, publisher 6 cases plus the recorded posted first line). The
`tester.md` publication contract is pinned too. Range labels were synchronized
to R1-R22 (`auditor.yml` step name, `opencode.yml` inventory comment, audit
header/summary/failure body, `LAB.md`); `AGENTS.md` and `LAB.md` document the
invariant.

## Root cause

`.github/agents/tester.md` pinned the marker-first-line contract, but no
machine check enforced the publication shape: `opencode-test.yml` verified the
decision file and the live-run evidence file and then forwarded
`/oc maintainer` from the decision file alone. A run could therefore conclude
green while the only published tester comment was prose-first, and the
workflow-touching lane stalled because no App-token merge path exists for
`.github/workflows/*` PRs.

## Evidence

- Live occurrences (verified against the live API during this push):
  PR #628 head `5b407501`, review approved 20:43:33Z, read-only infra test run
  39067932835 concluded SUCCESS 20:46:03Z with a genuine approval; comment
  6240760500 (author `github-actions[bot]`, created 20:46:03Z) has first line
  "All green. Posting the decision comment." with the marker on line 3, which
  the R21 `split("\n")[0]` anchor cannot match. PR #614's read-only verdict
  (comment 6240507941, 20:27:01Z) had the same prose-first shape and only
  avoided the stall because head-binding had already staled that verdict.
- Primary live mutation matrix (each mutation applied to the working tree,
  audit run, then reverted; control green after every revert):
  M1 checker bot-author select removed -> `checker(no-bot-author-select)` plus
  `functional-owner-authored` red; M2 sign-off regex weakened ->
  `checker(no-signoff-regex)` plus `functional-inline-mention` red; M3
  publisher first-line check weakened ->
  `publisher(no-post-fetch-first-line-check)` +
  `publisher(first-line-guard-not-exact)` +
  `publisher(first-line-guard-has-no-exit-1)` + functional red; M4 forward
  gate drops the marker output -> `test.yml(forward-gate-not-exact)`; M5
  unrunnable exclusion removed ->
  `test.yml(no-unrunnable-escalation-exclusion)`; M6 marker posted with the
  owner PAT -> `test.yml(marker-not-github-token)` +
  `test.yml(marker-references-secrets)`. Clean control: 22 passed / 0 failed.
- Independent verifier (read-only subagent, sandbox in /tmp, repo untouched):
  control-flow matrix found no path where a maintainer decision reaches the
  forward step without a published signed report and a verified bot-authored
  marker; confirmed the bot-token/owner-token split and that the marker's
  `created_at` necessarily follows the head's last push (no other push step
  exists in the workflow); applied the real R21 predicate to the recorded
  marker body (matches) and to the incident prose body (rejects); executed the
  checker against 12 crafted payloads (published footer, tool-posted,
  page-2 sign-off, trailing space, prose-first, stale, owner-authored, inline
  mention, empty, malformed, truncated, fetch failure) and the publisher
  against 6 mock outcomes, all rc values as designed; stale-label scan found
  every live `R1-R21` label updated (only dated historical decision notes
  still carry R1-R21, correctly); `bash -n`, executable bits, and em-dash scan
  clean.
  - Finding A (folded): `tester.md` stated the publication contract
    unconditionally while the workflow enforces it for maintainer decisions
    only. The contract text now scopes the machine check explicitly and notes
    that fix and lab verdicts are not re-checked, so the docs match the code.
    No merge-safety impact either way.
- Invariant checks (primary): `bash -n` on both new scripts and the audit
  script; `python3 yaml.safe_load` on `opencode-test.yml`, `auditor.yml`, and
  `opencode.yml`; zero em dashes in the diff; full audit 22 passed / 0 failed
  with R22 included.

## Notes

- Honest residuals (all fail closed, none can produce a false merge):
  a CRLF-ended sign-off (`- the Tester\r\n`) reads as unpublished because the
  regex does not accept `\r`; the agent wrapper posts `\n` bodies, and a CRLF
  emitter would trip the re-dispatch loop, never a false approval (the same
  regex shape as the #616 review checker). A malformed or unknown `action`
  value still forwards nothing and concludes green (pre-existing no-op stall,
  unchanged here). Fix and lab decisions are not publication-checked, per the
  issue scope; no merge-safety impact. R21's head-binding compares commit
  clocks against the comment's server time; the normal margin is minutes, so
  sub-second skew is a theoretical stall only and is unchanged by this PR.
- No workflow additions or renames: the Maintainer's `workflows:` allowlist
  is untouched.
- Tokens are intentionally split: the marker uses `github.token` for bot
  authorship while the `/oc maintainer` handoff keeps the owner PAT, because
  GITHUB_TOKEN-authored comments start no workflow run.

## Delegation ledger

- Independent verifier subagent (general; scope: read-only control-flow audit
  plus behavioral script matrices in /tmp/verify-r22): 12 checker payload
  cases and 6 publisher cases executed against the real scripts with a mock
  `gh`; R21 predicate applied to recorded bodies; stale-label and hygiene
  sweeps. One documentation finding (A) returned; zero code defects. Mutation
  sanity checks on a copy proved R22 is behavioral, not static-only.
- Primary: authored both scripts, the workflow wiring, the R22 rule with its
  two functional harnesses, the docs and label sync; verified the incident
  timestamps against the live API; ran the 6-mutation live matrix with a clean
  control after every revert; folded finding A.
- Skills: no skill fits (GitHub Actions lab infrastructure and lab prompts,
  not opencode configuration of this workspace).

- the Lab Engineer
