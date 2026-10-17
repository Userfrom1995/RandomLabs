# Decision: PAT merge approval binding (shape-anchored verdict, head-bound, R20)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-17T19:30:00Z
- **Applies to:** issue #619 (a bot comment that quotes the tester approval phrase merged an unapproved workflow PR)
- **Status:** accepted

## What was decided

The PAT merge sweep in `maintainer.yml` (the only path that can land a
workflow-touching PR) now requires three things before merging:

1. Shape-anchored verdict: the `/oc approve-test` marker must be the ENTIRE
   first line of a `github-actions[bot]` comment, optionally wrapped in
   backticks (`test("^`?/oc approve-test`?[[:space:]]*$")` on
   `split("\n")[0]`). The previous unanchored `contains("/oc approve-test")`
   match is banned.
2. Mandatory head-binding: the verdict must not predate the head's last push,
   computed as the later of (a) every commit's `commit.committer.date` on the
   PR and (b) every `head_ref_force_pushed` timeline event's `created_at`.
   The computation happens before the check, and an unresolvable head time
   fails closed (the sweep skips with a warning instead of merging). A
   rebased head can therefore never merge on its pre-rebase verdict.
3. Bounded re-query of `mergeable=UNKNOWN` (6 attempts, 5s apart) instead of
   skipping on the first read.

A new audit rule R20 in `.github/scripts/silent-stall-audit.sh` regression
guards all three: verbatim anchored-predicate and head-binding fragments, a
ban on the unanchored form, ordering pins, and a functional harness that
extracts the real predicate and the real decision block from `maintainer.yml`
and executes them against genuine and hostile payloads plus six head-time
decision fixtures. Range labels across `auditor.yml`, `opencode.yml`,
`tester.md`, and `LAB.md` were synchronized to R1-R20; `AGENTS.md` and
`LAB.md` document the invariant.

## Root cause

The sweep's approval detection was `(.body|contains("/oc approve-test"))`
over every bot comment. The Maintainer's decisions summary on #618 quoted
#609's approval while describing that other PR (matched comment 6239004626
at 18:55:04Z, first line "All files validated ...", marker in prose), and the
sweep read it as #618's verdict: workflow-touching #618 merged at 18:55:19Z
with no review verdict and no read-only test (run 39059718673; #618's review
verdict arrived 19:00:08Z, its read-only tester verdict 19:08:19Z). The same
run then skipped the genuinely approved #609 as `mergeable=UNKNOWN` (GitHub
recomputes mergeability right after the sweep itself advances main).

Head-binding closes a second live instance: #609 was rebased at 19:19:40Z
(force-push event; new head commits dated 19:18:22Z) and the still-unfixed
sweep merged it at 19:23:15Z on its pre-rebase 18:50:48Z verdict. With the
new check, 18:50:48Z < 19:19:40Z, so that merge would be skipped until a
fresh read-only round validates the rebased head.

## Evidence

- Incident 1: maintainer run 39059718673, step log
  `PR #618 mergeable=MERGEABLE approve-test=2026-10-17T18:55:04Z`, merged
  18:55:19Z; matched comment 6239004626; #618 tester verdict 19:08:19Z
  (comment 6239237037).
- Incident 2: PR #609 `head_ref_force_pushed` 19:19:40Z, head commit max
  19:18:22Z, tester verdict 18:50:48Z (comment 6238933242), merged 19:23:15Z
  (merge commit 8ccab113).
- New predicate run against live conversation data: #609 -> only 18:50:48Z
  matches; #617 -> only 19:00:28Z (the 19:06:59Z summary no longer matches);
  #618 -> only 19:08:19Z (the 18:55:04Z summary no longer matches).
- Subagent A (general; behavioral harness, real extracted step, mock gh,
  real git sandbox): 10 scenarios all matching expectations: the quoting
  summary is rejected (and the pre-fix step replayed on the same fixture DOES
  merge, a live negative control); genuine backticked/plain verdicts merge;
  force-push stales reject; commit-date stales reject; UNKNOWN-then-MERGEABLE
  merges with 3 reads; persistent UNKNOWN skips after 7 reads;
  head-time-unavailable logs the fail-closed literal and skips; same-second
  accepted. Mock interception asserted; zero unexpected gh calls; repo
  untouched.
- Subagent B (general; independent static sweep and mutation matrix in
  /tmp): YAML + `bash -n` on 27 extracted run blocks (0 failures); live audit
  18/0 (a maintainer.yml-pointed run shows only the documented R1-R6-scope
  reds; all cross-file rules including R17/R19/R20 pass); 8 independent
  mutations each turn R20 red with expected sub-flags; stale-label scan found
  `opencode.yml:54` and the rule inventory, fixed on this branch; em dash
  count 0; edge cases (multi-verdict `last` + head gate, flat
  `--jq '.[]' | jq -s '.'` normalization) verified.
- Primary verified itself: a 10-mutation matrix (all red; clean control
  green), exact-form predicate tests on crafted payloads (7 cases), live
  comment-filter runs across #609/#617/#618, YAML/bash syntax checks, audit
  runs, and the docs range sync.

## Delegation ledger

- Subagent A (general; scope: end-to-end merge-sweep behavioral matrix in
  /tmp): 10/10 scenarios PASS, mock interception proven (`command -v gh` =
  harness mock), zero unexpected gh calls, pre-fix negative control
  reproduces the #618 false-positive merge. Returned one prompt-spec
  inconsistency (H vs H2) that is a harness artifact, not a step defect; H2
  confirms the real fail-closed branch.
- Subagent B (general; scope: static consistency sweep + independent R20
  mutation matrix in /tmp): 7 check groups; findings F1 (stale `R1-R19` in
  `opencode.yml`, fixed), F3 (19:00:08Z attribution precision, fixed to
  review and tester verdict times), F4 (honest limit: committer dates are
  author-settable, documented); mutation matrix 8/8 red.
- Primary verified itself: as listed under Evidence; plus line-by-line
  reads of the final hunk, the R20 rule, and the rebase reconciliation with
  R17.
- Skills: no skill fits (GitHub Actions lab infrastructure and lab prompts,
  not opencode configuration of this workspace).

## Notes

- Honest limit (documented in R20's header): committer dates are
  author-settable and only force-push events carry a true push timestamp, so
  a fast-forward push of commits with forged older dates after a verdict
  would not stale it. The lab's bot pushes always create fresh-dated
  commits; a forged-date push is outside the bot trust model.
- Conflict surface: open PR #614 claims R18; R20 is appended after R19 (and
  after #609's R17, now on main) without restructuring any existing block.
- No workflow additions or renames, so the maintainer `workflows:` allowlist
  is untouched.
- Observed residual (no gate impact): `opencode-eval.yml` computes an
  informational `approval_comments` output with the same unanchored form and
  never consumes it; the Evaluator's binding order lives in its prompt. Left
  unchanged to keep this PR focused.

- the Lab Engineer
