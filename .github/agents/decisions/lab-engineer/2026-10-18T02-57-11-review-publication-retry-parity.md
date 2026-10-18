# Decision: Review-gate crash parity for provably unpublished verdicts

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T02:57:11Z
- **Applies to:** issue #637 (a healthy reviewer session ending with an unsigned final message lost its verdict and no auto-retry fired; issue #616 follow-up)
- **Status:** accepted

## What was decided

1. **Workflow** (`opencode-review.yml` verify step): a provably unpublished
   verdict (publication-evidence script exit 1) is now a crash signature
   regardless of the agent step's `outcome`. Both crash classes set one
   shared `crash_signature` flag (`outcome != success`, and
   `unpublished_verdict = true`) and the existing bounded auto-retry
   (owner-authored `/oc review (auto-retry N)`, cap 3, paginated counter,
   refuse-to-retry on enumeration failure) is gated on exactly that flag.
   The evidence exit-2 (unverifiable) path keeps its deliberate no-retry
   fail-closed behavior per the #616 rationale: a possibly-published review
   must not be re-run. The publication-evidence result is echoed into the
   job log (`Publication evidence for #N: evidence script exit X
   (published=...)`) for diagnosability.
2. **Prompt** (`reviewer.md` Publication Contract): the wrapper posts only
   the session's FINAL message, so that final message MUST BE the complete
   sign-off-bearing decision comment; any later turn (a post-compaction
   wrap-up, a summary, a clean-up note) replaces it and loses the verdict.
   The mid-session comment-tool post is documented as the safer path when
   the session may continue, and the retry promise now matches the workflow
   behavior for both outcome shapes.
3. **Audit** (R19): static pins require the shared crash flag (exactly two
   setters, exactly one unpublished-verdict branch, retry gated on the flag,
   full order chain) and bind the verify step to its unique
   `id: verify-review` (exact step name adjacent above the id, duplicate-id
   count pinned to 1). The behavioral matrix executes the REAL extracted
   verify `run:` block (four expression macros plus the decision-file path
   substituted, integrity asserted) under the runner's `bash -e` default in a
   sandbox git repo whose commit carries a scenario-driven, argument-validating
   evidence stub, against a mock `gh` bound to the sandbox endpoint that
   serves the retry enumeration, records posts, and can reject a POST under
   scenario control. Fifteen scenarios assert exit code, posted body, decision
   file state, and a required output marker: published verdict,
   success+unpublished (the #637 regression: post `/oc review (auto-retry 1)`,
   exit 0), the #616 incident quadrant (failure + decision present +
   unpublished: discard plus retry) and its mirror (failure + published
   verdict survives untouched), a rejected retry POST failing loudly,
   prior-marker advance (retry 2), two-prior advance (retry 3; with the
   three-prior refusal case this pins the cap to exactly 3), foreign-authored
   and embedded lookalike markers (never counted), failed-run retry, cap
   refusal, enumeration-failure refusal, exit-2 no-retry, silent no-op
   no-retry, and gate denial. F1-F16 of review rounds 1-3 hardened this
   harness (see the follow-up sections).
4. **Docs**: `AGENTS.md` and `LAB.md` synced to the #637 contract.

## Root cause

The verify step's crash-parity branch was gated only on
`outcome != success`. The #616 fix added the publication-evidence check and
discarded an unpublished verdict, but then routed the success case into a
separate fail-loud branch with NO auto-retry, so a healthy session whose
final message was not the signed decision comment lost the verdict until a
human recovered it. Review run 39089530715 on PR #636: decision file
`{"action":"lab"}` written at 02:26:48Z, complete signed comment composed at
02:27:04Z, session compacted and ended on an unsigned wrap-up, the wrapper
published only that wrap-up (comment 6244724655), the evidence script exited
1, and the success branch failed loudly with no retry.

## Evidence

- Incident: review run 39089530715 on PR #636 (decision file present, signed
  comment never published, unsigned final message the only post).
- Subagent A (general; independent behavioral harness in /tmp, read-only on
  the repo): extracted the real verify block from both HEAD and pre-fix
  c672f443 (line-range byte-equality verified); 9/9 required scenarios PASS
  on the fixed block (exact exit codes, exact posted bodies, decision-file
  states); 7 adversarial extras PASS (foreign-authored markers ignored,
  priors=2 boundary posts retry 3, missing script fails closed, quoted
  markers ignored, real evidence script integration published/unpublished);
  old block fails scenario 1 (exit 1, zero posts) while the fixed block
  posts `/oc review (auto-retry 1)` and exits 0; a mutant disabling only the
  unpublished crash setter is caught. Interception proven (chmod +x,
  `command -v gh` resolved to the mock, probe recorded).
- Subagent B (general; static sweep + mutation matrix in a /tmp copy): all
  workflow YAML parses; all 12 extracted run blocks `bash -n` clean; live
  audit 22/22; six behavior-changing mutations each turn R19 red with the
  expected sub-flags, including the literal pre-fix revert (static pins plus
  the extraction precondition) and a semantic-only enumeration mutation that
  only the behavioral matrix catches; no mutation survives; copy restored,
  real repo untouched.
- Subagent C (general; contract coherence audit): traced all seven control
  flow cases; prompt, docs, and pins verified accurate; one non-blocking
  wording finding (over-broad crash-signature comment) fixed in
  `lab: tighten the crash-parity comment wording and record the #637 decision
  (review F1, Refs #637)`;
  no em dashes in changed lines; changed-file set exactly as intended.
- Primary verified itself: live audit 22/22 before and after the comment
  fix; YAML parse; em-dash scan; manual review of every hunk.

## Delegation ledger

- Subagent A (general; scope: independent end-to-end verify-block behavioral
  matrix from both fixed and pre-fix revisions, read-only on the real repo):
  fixed 9/9 required + 7/7 extras PASS; old-version discrimination proven;
  mock interception asserted; found the pre-existing red-run-after-retry
  shape (documented below) and the implicit `bash -e` dependency for a
  failed retry POST (real runner default, safe).
- Subagent B (general; scope: static consistency sweep + R19 mutation matrix
  in /tmp): 22/22 baseline, 6/6 mutations red with expected sub-flags, copy
  restored (the harness still carried five property-6 escape hatches that
  review round 1 found as F1-F5; the follow-up round fixed and re-proved
  them).
- Subagent C (general; scope: claim/behavior coherence audit across
  workflow, prompt, docs, and pins): all claims verified; one over-broad
  wording finding fixed; its remaining observations are recorded under Notes
  and residuals.
- Skills: no skill fits (GitHub Actions lab infrastructure and lab prompts,
  not opencode configuration of this workspace).
- Primary verified itself: live audit runs, YAML/em-dash/hunk checks, and
  the subagent evidence review; final diff is the primary's own work.
- Round-2 verifier A (general; scope: F7/F8 static-pin mutation matrix
  M1-M7 on a /tmp clone): control 22/22 green; 7/7 mutations red with the
  exact expected R19 flags; noted that the `pr=`-ping expression occurs
  outside the verify block too, so the mutation was applied with block-local
  context (the pin itself is correctly scoped to the extracted block);
  clone and workspace clean.
- Round-2 verifier B (general; scope: F9/F10 pins plus behavioral
  mutations M8-M13 and the F10 differential on a /tmp clone): control 22/22
  green; 6/6 mutations red with the expected evidence; the F10-reverted
  differential reproduces the pre-fix green escape (22/22 with the
  SINCE-gated discard mutation), proving the sandbox env realism is
  load-bearing; no non-R19 failure in any run; clone and workspace clean.
- Round-3 verifier A (general; scope: F11 post-failure/fail-fast mutation
  matrix on a /tmp clone): control 22/22 green; 6/6 mutations red with the
  exact expected R19 sub-flags (function-wrapped swallow, dead-decoy suffix,
  tainted-body swallow, quoted and unquoted `set +e`, `trap '' ERR`); no
  non-R19 failure; clone clean.
- Round-3 verifier B (general; scope: F12/F13 outcome-quadrant and env
  mutations plus the two differentials on a /tmp clone): control 22/22 green;
  4/4 mutations red with the expected flags; differential A (ban extension
  and env realism reverted) reproduces the pre-fix green escape while
  differential B (ban extension reverted only) still catches the mutation
  behaviorally, proving the env realism is load-bearing; no non-R19 failure;
  clone clean.
- Round-3 verifier C (general; scope: F14-F16 pins plus round-1/round-2
  regression mutations on a /tmp clone): control 22/22 green; 7/7 mutations
  red with the exact expected sub-flags; the 15-case matrix count confirmed;
  no non-R19 failure; clone clean.
- Round-4 verifier A (general; scope: the reviewer's E1-E15 escape fixtures
  on a /tmp clone of 594e1f4e): control 22/22 green; 15/15 mutations red with
  the exact expected R19 sub-flags; zero non-R19 failures; noted the benign
  within-rule double attribution when a job/workflow-level attribute is
  appended at EOF (the expected class flag fires too); clone and workspace
  clean.
- Round-4 verifier B (general; scope: rounds 1-3 regression fixtures plus
  the F20 poisoned-tip differentials on a /tmp clone): control 22/22; 8/8
  regression mutations red R19-only; the provenance-dodge variant caught
  behaviorally with zero static flags; the tip-reverted differential
  reproduces the pre-fix green escape, proving the tip load-bearing; the
  bans-removed differential still catches the dodge behaviorally; clean.
- Round-4 verifier C (general; scope: coherence and hygiene audit of the
  committed harness): audit 22/22; commit scope, pin-to-path mapping, step
  sequence, and poisoned-tip wiring all verified; diff clean of em dashes
  and trailers; one record wording nit fixed.

## Review round 1 follow-up (2026-10-18)

The reviewer of PR #638 (issue #637) found six issues, all in the new
property-6 harness plus record text; all are fixed in the follow-up commits
on this branch:

- F1 (blocking): the harness executed the extracted block under plain `bash`,
  not the runner's `bash -e {0}` default, so an unguarded failing command
  before the retry post killed the retry in production while R19 stayed
  green. The harness now runs `bash -e`; the F1 mutation (a `false` line
  inserted before the retry post) turns R19 red, and the reverted harness
  plus the same mutation reproduces the reviewer's green escape, so the fix
  is load-bearing.
- F2 (blocking): the mock `gh` matched any argument string, so a retry
  posted to, or an enumeration read from, another endpoint escaped. The mock
  is now bound to `repos/mockrepo/issues/614/comments` (paginated-slurp
  reads and `-f body=` posts only; every other call fails the run). Both URL
  mutations (post and enumeration) now turn R19 red.
- F3 (blocking): the retry cap value was unpinned (any cap in {2,3} passed).
  A two-prior payload with an expected-retry-3 case now joins the
  three-prior refusal case, pinning the cap to exactly 3; a `-lt 2` mutation
  turns R19 red.
- F4 (blocking): the retry counter's owner-author filter and the
  `startswith` marker anchor had no negative controls. New payloads (a
  foreign-authored canonical marker; an owner-authored embedded marker) must
  not count, so dropping the author filter or weakening the anchor to
  `contains(` turns R19 red.
- F5 (hardening): the verify step was located by the first exact name match,
  so a renamed real step plus an old-name decoy escaped. Both the static
  extraction and the property-6 extraction are now bound to the unique
  `id: verify-review` plus its exact adjacent name line; the rename+decoy
  mutation turns R19 red.
- F6 (record text): corrected here and in the audit headers (the
  substitution is four expression macros plus the decision-file path, not
  five macro lines; every scenario now carries a required output marker; the
  cross-reference to nonexistent finding labels is removed; the "no gap"
  claim is replaced by this F1-F5 record).

Post-fix evidence: live audit 22/22 PASS on the final tree; a control plus
ten mutations (F1 false-before-post, F2 post/enumeration URL, F3 cap 2, F4
author-filter drop and startswith-to-contains, F5 rename+decoy, crash-setter
drop, discard drop, evidence-map flip) leaves the control green and turns
R19 red in 10/10 mutated cases; the F1 differential (fix reverted plus
mutation) reproduces the reviewer's escape.

## Review round 2 follow-up (2026-10-18)

The reviewer of PR #638 (round 2) verified the workflow core and the round-1
harness fixes as correct, then found four more escapes, all behavior-changing
edits that left the whole 22-rule audit green; all are fixed in the follow-up
commit on this branch:

- F7 (blocking): the identity lines and the counter predicate had no static
  expression pins. The property-6 sandbox substitutes the identity macros
  with sandbox literals, so a workflow edit that hardcodes a substituted
  value (post or enumeration URL to `614`, `pr=614`, owner literal
  `mockowner`, predicate weakened to `!= "mockintruder"`) was behaviorally
  indistinguishable and escaped. New static pins: the retry POST as an
  exact whole line (leading whitespace stripped), the enumeration URL
  substring, the exact owner+startswith predicate, the raw event-bound
  `pr="${{ github.event.issue.number }}"`, plus an outright ban on harness
  literals and CI-only env fingerprints (`mockowner`, `mockrepo`, `R19P_`,
  `GITHUB_EVENT_PATH`, `GITHUB_RUN_ID`) in the verify block.
- F8 (blocking): the F1 `bash -e` guarantee was bypassable and the retry
  POST was not pinned fail-fast. A `|| true` suffix on the POST made a
  failed retry end the step green with no retry posted; a `set +e` at the
  block top disabled fail-fast wholesale. The whole-line POST pin closes
  the suffix class, and a `set +`/`trap` ban closes the bypass.
- F9 (hardening): the missing-evidence fail-closed branch (`exit 1`, the
  #616 owner) was pinned only by its `if` line and was unreachable in the
  sandbox, so it could silently become `exit 0`. The branch is now
  awk-extracted from the block and pinned to exit nonzero with no `exit 0`.
- F10 (hardening): the sandbox omitted production env (`SINCE`,
  `GITHUB_EVENT_PATH`), so env-fingerprint branches escaped; one leaked the
  unpublished verdict in production. The case environment now sets both
  (with a parseable `event.json` fixture), and the F7 fingerprint ban
  rejects such branches statically.
- Minor: the PR body claimed nine scenarios and six mutations from the
  pre-follow-up round; it is corrected to the twelve-scenario matrix and
  the current mutation record.

Post-fix evidence (round 2): live audit 22/22 PASS on the final tree. Two
independent verifier subagents ran a control plus thirteen escape mutations
against clones of the fixed commit: control 22/22 green on both clones, and
13/13 mutations turned R19 red with the exact expected sub-flags (post URL,
enumeration URL, `pr=614`, owner literal, weakened predicate, `|| true`
suffix, `set +e`, missing-evidence `exit 0`, SINCE-gated discard,
env-gated extra retry post, cap `-lt 2`, `contains(` anchor, `false` before
the post under `bash -e`). No non-R19 rule failed in any run. The M9
differential (F10 env realism reverted plus the SINCE-gated discard
mutation) reproduces the pre-fix green escape, proving the env realism is
load-bearing.

## Review round 3 follow-up (2026-10-18)

The reviewer of PR #638 (round 3) verified the workflow core and the
round-1/round-2 fixes as correct and load-bearing, then found six more
behavior-changing escapes in the R19 property-6 guard, all of them keeping
the whole 22-rule audit green; all are fixed in the follow-up commit on this
branch:

- F11 (blocking): the retry POST's fail-fast guarantee was still evadable.
  The exact-line pin is existence-based, so the pinned line could live inside
  a dead `if false` decoy or a function body while the real call swallowed
  errors (`|| true`), and the mock never failed a POST, so the matrix could
  not see a lost retry. The mock now rejects a POST under `R19P_POST_FAIL`,
  a new `success-unpublished-post-fail` case requires rc 1 with zero posts on
  a rejected POST, and the fail-fast ban catches the quoted `set "+e"` form
  as well.
- F12 (blocking): the matrix had no (outcome=failure, decision file present)
  case, the exact #616 incident shape. New `failure-published-verdict` (the
  verdict survives untouched) and `failure-unpublished-verdict` (discard plus
  retry) cases close both directions.
- F13 (blocking): the case env unset `GITHUB_ACTIONS`/`GITHUB_REPOSITORY`
  without banning them, so a branch on them escaped. The case env now sets
  both to production-shaped values (behavioral catch) and the fingerprint ban
  covers them plus `GITHUB_WORKFLOW`, `GITHUB_JOB`, `GITHUB_EVENT_NAME`,
  `GITHUB_ACTOR`, `RUNNER_OS`, and standalone `CI` (static backstop).
- F14 (blocking): the provenance pins were substring greps satisfiable by a
  `# decoy:` comment beside a weakened live line (`HEAD:` instead of
  `${GITHUB_SHA}`), invisible in a single-commit sandbox where HEAD equals
  GITHUB_SHA. Both provenance lines are now whole-line pins.
- F15 (blocking): the evidence invocation was a substring pin and the stub
  ignored its arguments, so a hardcoded SINCE literal escaped. The invocation
  is now a whole-line pin and the stub validates `$1`/`$2` (wrong arguments
  exit 2 and fail the case).
- F16 (blocking): the verify step's own execution wiring was unpinned: an
  `if: false` would silently disable the whole gate, and a hardcoded
  `AGENT_GATE: "true"` would launder an actor denial into an owner retry
  (the issue #428 class). Both lines are now exact whole-line pins.

Post-fix evidence (round 3): live audit 22/22 PASS on the final tree. Three
independent verifier subagents ran a control plus seventeen mutations on
clones of the fixed commit: control 22/22 green on all three; 17/17 mutations
turned R19 red with the exact expected sub-flags and no non-R19 failure
(function-wrapped swallow, dead decoy plus `|| true` suffix, dead decoy plus
tainted body, quoted/unquoted `set +e`, `trap '' ERR`, keep-file-on-failure,
discard-published-on-failure, GITHUB_ACTIONS-gated discard and extra POST,
HEAD provenance decoy, 1970 SINCE literal, `AGENT_GATE: "true"`, `if: false`,
plus the round-1/round-2 regressions: `false` before the post, post URL
literal, missing-evidence `exit 0`). The F13 differential: reverting the ban
extension AND the env realism reproduces the pre-fix green escape (22/22 with
the GITHUB_ACTIONS-gated discard), while reverting only the ban extension
still catches the mutation behaviorally, proving the env realism is
load-bearing.

## Review round 4 follow-up (2026-10-18)

The reviewer of PR #638 (round 4) verified the workflow core and the
round-1/2/3 fixes (F1-F16) as correct and load-bearing, then found five more
behavior-changing escape classes in the R19 guard (twelve fixtures plus
three draft-fix holes), all of them keeping the whole 22-rule audit green;
all are fixed in the follow-up harness commit on this branch (audit-script
only; the workflow file needs no change):

- F17 (blocking): the property-6 extraction took the first `run: |` at ANY
  indent, so an `env:`-nested step-shaped decoy before the real key could
  make production execute a different body than the audit extracted. The
  extraction is now struct-anchored at exactly the 8-space step-key indent,
  and a run-key cardinality pin requires exactly one `run: |` in the step
  region.
- F18 (blocking): execution-attribute overrides were unpinned: verify-step
  `continue-on-error: true` (header or tail), `shell: bash {0}`, job-level
  `defaults.run.shell`, job-level `continue-on-error: true`, and
  workflow-level `defaults:` all voided the `bash -e` fail-fast premise or
  swallowed the job failure while the audit stayed green. Step-region,
  job-level (4-space keys), and workflow-level (column-0 `defaults:`) pins
  now red all seven fixtures.
- F19 (blocking): the verify step's `GH_TOKEN` could be swapped to
  `github.token` (an issue_comment run spawned by a token-authored retry
  never fires, silently killing the bounded auto-retry). It is now pinned to
  `${{ secrets.OPENCODE_PAT }}` exactly.
- F20 (blocking): provenance invariance was textual only. A `GITHUB_SHA=`
  reassignment (e.g. to `git rev-parse HEAD`) or a `HEAD:` extraction path
  with a dead decoy defeated the whole-line pins, and the sandbox could not
  see it because its HEAD equaled GITHUB_SHA. Static bans now reject both,
  and the sandbox commits a poisoned tip revision (an always-published stub)
  while GITHUB_SHA points one commit back at the real scenario-driven stub:
  any HEAD-reading extractor fails the unpublished/unverifiable cases
  behaviorally, so even a syntax variant that dodges the literal bans is
  caught.
- F21 (blocking): the forward path was unpinned. A dispatch body swap
  (`/oc test` to `/oc fix`), forward-step `continue-on-error: true`, forward
  `GH_TOKEN` to `github.token`, and an extra near-forward step before verify
  (resurrecting the #616 unread-verdict forward) all escaped. The forward
  step's five exact trigger bodies, its absent attribute overrides and its
  PAT token are pinned, and the review job's full step sequence is pinned in
  order.

Post-fix evidence (round 4): live audit 22/22 PASS on the final tree
(commit 594e1f4e, audit-script only). Three independent verifier subagents
ran on fresh clones of that commit:

- Verifier A (scope: the reviewer's E1-E15 escape fixtures): control 22/22
  green; all 15 mutations turned R19 red (21 passed / 1 failed) with the
  expected sub-flags (E1/E2/E3 `verify-step-attribute-override`, E4
  `verify-gh-token-not-PAT`, E5 `github-sha-reassignment` plus the
  behavioral matrix, E6 `pr-head-provenance` plus the matrix, E7
  `forward-body-not-exact`, E8 `run-key-count=2,want=1`, E9/E13/E14
  `job-run-attribute-override`, E10 `step-sequence-changed`, E11
  `forward-step-attribute-override`, E12 `forward-gh-token-not-PAT`, E15
  `workflow-run-defaults-override`); zero non-R19 failures.
- Verifier B (scope: rounds 1-3 regression fixtures plus the F20
  differentials): the eight regression mutations (false-before-post, `||
  true` POST suffix, `set +e`, missing-evidence `exit 0`, `if: false`,
  hardcoded AGENT_GATE, cap `-lt 2`, retry-URL literal) each red R19-only
  with the expected flags (the URL fixture is a static-only catch); the
  provenance-dodge variant (a `r19sha=$(git rev-parse HEAD)` indirection
  that no static ban matches) is caught behaviorally by the poisoned-tip
  matrix (`verify-behavioral(...missing-post...)` across the unpublished
  cases) with zero static flags; the differential that reverts only the
  poisoned tip escapes green (22/22), proving the tip is load-bearing, and
  the differential that removes only the static bans still catches the
  dodge behaviorally; valid-YAML job-level attribute fixtures fail R19 only.
- Verifier C (scope: coherence and hygiene): audit 22/22; the commit
  changes exactly the audit script (workflow diff empty); all eleven new
  pin names verified against their real check paths by code reading plus
  mutation spot-checks; the wanted step sequence diffed identical to the
  workflow; the poisoned-tip wiring confirmed (HEAD~1 carries the
  argument-validating stub, HEAD the always-published one); the diff
  carries no em dashes and no trailers; the decision record matches the
  implementation.

One benign diagnostic note (verifier A): when a job- or workflow-level
attribute is appended at EOF, the forward-block scan (which runs to EOF for
the last step) reports it as a forward-step attribute as well; both labels
live inside R19, the expected class flag fires, and no detection escapes.

## Notes and residuals

- R1 (pre-existing, deliberately left in scope): on the auto-retry path the
  verify step exits 0 with the decision file deleted, so the
  verify-success-gated "Forward reviewer decision" step exits 1 and the run
  ends red after the retry was posted. The #616 crash path already had this
  shape; it feeds Maintainer failure triage while the queued retry proceeds.
  A follow-up issue can make the retry path terminate green if the lab
  decides the triage noise outweighs the visibility.
- R2 (by design): `success + no decision file` (nothing written at all)
  keeps its loud no-retry no-op branch by design; #637 covers the
  written-but-unpublished class, and the evidence script stays the sole
  publication oracle.
- R3 (supersession): the historical #616 decision record
  (`2026-10-17T18-45-00-review-comment-publication-gate.md`) describes the
  old success-case fail-loud branch and the then-out-of-band harness; this
  record supersedes both (the behavior now matches that record's stated
  "bounded review auto-retry takes over" contract, and the harness is
  permanent inside R19).
- R4 (coverage boundary): the behavioral matrix does not execute the
  missing-evidence-script branch or the two forward steps (statically
  pinned); exotic sandbox-path fingerprinting stays a review-gated boundary.
  The F1-F21 hardening additionally pins the runner's `bash -e` execution
  mode, the endpoint-bound mock (plus its scenario-controlled POST failure),
  the exact cap 3, the counter's author/anchor predicates, the retry POST as
  an exact whole line, the enumeration URL, the owner+startswith predicate,
  the event-bound PR number, the missing-evidence fail-closed exit, the
  verify step's `if:` line and `AGENT_GATE` env mapping, the provenance probe
  and extraction and the evidence invocation as exact whole lines, the
  absence of harness/env fingerprints (including `GITHUB_ACTIONS`,
  `GITHUB_REPOSITORY`, and the other ambient CI vars) and fail-fast bypasses
  (including quoted `set "+e"`), a production-shaped case env (`SINCE`,
  `GITHUB_EVENT_PATH` with a parseable event fixture, `GITHUB_ACTIONS`,
  `GITHUB_REPOSITORY`, other ambient CI vars sanitized), an argument-validating
  evidence stub, and the outcome-quadrant plus rejected-POST cases. Round 4
  (F17-F21) adds the struct-anchored extraction (exactly one 8-space `run: |`
  key), step/job/workflow execution-attribute override bans, the verify and
  forward owner-PAT token pins, the forward step's five exact trigger bodies,
  the review job's exact step sequence, `GITHUB_SHA=`-reassignment and
  `HEAD:` provenance bans, and the poisoned sandbox tip that makes any
  HEAD-reading provenance extractor fail the matrix behaviorally. No
  workflow file additions or renames, so the maintainer `workflows:`
  allowlist is untouched.
- R5 (conflict surface): `silent-stall-audit.sh` is a hot file (R21/R22
  landed recently); rebase onto main before merge if other infra PRs land
  first, and keep R19 self-contained.

- the Lab Engineer
