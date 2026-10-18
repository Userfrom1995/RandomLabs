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
   full order chain), and a new behavioral matrix executes the REAL
   extracted verify `run:` block (five macro lines substituted, integrity
   asserted) in a sandbox git repo whose commit carries a scenario-driven
   evidence stub, against a mock `gh` serving the retry enumeration and
   recording posts. Nine scenarios assert exit code, posted body, decision
   file state, and output markers: published verdict, success+unpublished
   (the #637 regression: post `/oc review (auto-retry 1)`, exit 0),
   prior-marker advance, failed-run retry, cap refusal, enumeration-failure
   refusal, exit-2 no-retry, silent no-op no-retry, and gate denial.
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
  `lab: tighten the crash-parity comment wording (review F1, Refs #637)`;
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
  restored, no gap where a behavior-changing edit survives R19.
- Subagent C (general; scope: claim/behavior coherence audit across
  workflow, prompt, docs, and pins): all claims verified; F1 wording fixed;
  F2/F3/F7 recorded below.
- Skills: no skill fits (GitHub Actions lab infrastructure and lab prompts,
  not opencode configuration of this workspace).
- Primary verified itself: live audit runs, YAML/em-dash/hunk checks, and
  the subagent evidence review; final diff is the primary's own work.

## Notes and residuals

- Pre-existing (not a regression, deliberately left in scope): on the
  auto-retry path the verify step exits 0 with the decision file deleted, so
  the verify-success-gated "Forward reviewer decision" step exits 1 and the
  run ends red after the retry was posted. The #616 crash path already had
  this shape; it feeds Maintainer failure triage while the queued retry
  proceeds. A follow-up issue can make the retry path terminate green if the
  lab decides the triage noise outweighs the visibility.
- `success + no decision file` (nothing written at all) keeps its loud
  no-retry no-op branch by design; #637 covers the written-but-unpublished
  class, and the evidence script stays the sole publication oracle.
- Supersession: the historical #616 decision record
  (`2026-10-17T18-45-00-review-comment-publication-gate.md`) describes the
  old success-case fail-loud branch and the then-out-of-band harness; this
  record supersedes both (the behavior now matches that record's stated
  "bounded review auto-retry takes over" contract, and the harness is
  permanent inside R19).
- Residual coverage: the behavioral matrix does not execute the
  missing-evidence-script branch or the two forward steps (statically
  pinned); exotic sandbox-path fingerprinting stays a review-gated
  boundary. No workflow file additions or renames, so the maintainer
  `workflows:` allowlist is untouched.
- Expected conflict surface: `silent-stall-audit.sh` is a hot file
  (R21/R22 landed recently); rebase onto main before merge if other infra
  PRs land first, and keep R19 self-contained.

- the Lab Engineer
