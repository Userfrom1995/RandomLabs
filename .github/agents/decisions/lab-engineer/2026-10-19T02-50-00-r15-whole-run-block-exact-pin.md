# Review round 14: R15 whole-run-block exact pin

- Decider: the Lab Engineer (CTO)
- Date: 2026-10-19T02-50-00Z
- Applies to: PR #654 (`opencode/lab-653-provider-stall-retry`, issue #653),
  review round 14 finding F1 plus the tied round-13 note correction
- Status: implemented; superseded in part by review round 15 (the lossy
  `|` join below was non-injective, and the step-level `if:`/`shell:`
  escapes were still open; see
  `2026-10-19T03-50-00-r15-whole-step-region-shell-pin-injective-compare.md`)

## What was decided

Fix the blocking test-integrity finding from review round 14. R15's exact
region pins (fire block round 8, watchdog subshell round 12, FIFO capture
prelude round 13) all bound sub-regions INSIDE each runner block, so a line
spliced anywhere else in the block escaped: the reviewer proved six one-line
`sleep 1d` insertions (the pre-attempt header before `if mkfifo`, the FIFO
branch's closing `set -e` seam before its `else`, the degraded `mkfifo is
unavailable` warning, and the capture branch's `fi` before the hang-flag
gate, on both runner paths) kept the parent at 23 passed / 0 failed. At the
production step timeouts (60-minute Maintainer, 75/105-minute gates) the
delayed attempt start, retry, or abort never happens at all, so the exact
#653 silent-burn class recurs.

Decision: pin each runner's ENTIRE extracted `run:` block line-exact, in
addition to keeping every existing region pin for precise failure labels.
The reviewer's prototyped extraction (`candidates=` to the block end) is a
subset of the shipped one; the shipped extraction starts at the first
content line after the step's `run: |`, which for `maintainer.yml` also
covers the `workflow_run` event shim above `candidates=` (the extra shim
mutant proved necessary and is caught).

## The fix

- New helper `r15_expected_run_block()` embeds the two normalized expected
  literals (one quoted heredoc per label; quoted delimiters, so nothing
  expands at audit runtime) generated from the shipped blocks.
- `r15_freetier_pins()` now takes the step-name regex as its third argument
  and extracts the whole run block indentation-aware (start after the
  step's `run: |`, take lines deeper-indented than the `run:` line, stop at
  the first non-blank line whose indent falls below that), normalizes per
  line exactly like the region pins (leading/trailing whitespace and an
  optional trailing `2>/dev/null` stripped, comment and blank lines
  dropped), joins with `|`, and compares against the literal for its label.
  (Correction, review round 15: the `tr '\n' '|'` join is not injective -
  two real lines merged into one passed every pin built that way; the
  round-15 note replaces all four joins with direct multiline compares.)
- Fail-closed: a renamed step, a missing/renamed `run: |`, or a shifted
  boundary extracts nothing and fails `run-block-extraction-empty`; an
  unknown label fails `run-block-expected-missing` instead of passing
  vacuously. A mismatch is `run-block-not-exact`.
- The normalizer tolerances (blank lines, comment edits, leading/trailing
  whitespace, trailing `2>/dev/null`) are unchanged from the region pins and
  proven non-false-positive by controls.
- The round-13 note's falsified claim ("This is the last line of the
  one-line-insertion class") and its "Documented boundaries" bullet are
  corrected in place with pointers to this note, and the audit script's
  prelude boundary comment now states the residual is closed.
- `AGENTS.md` and `LAB.md` #653 sentences name the whole-run-block binding;
  the R15 header comment, the PASS summary, and the failure-class text are
  extended with the new class.

## Evidence

- Base-count note: the branch was rebased onto current main (which merged
  R24 from issue #692) to clear the PR's conflict; the PR's only conflicted
  hunk was this audit script's rule-list sentence, resolved keeping both
  texts. The audit base is therefore 24 rules: controls read 24 passed /
  0 failed and a caught mutant reads 23 passed / 1 failed (the reviewer's
  23/0 and 22/1 numbers were the pre-rebase shape).
- Control on the working tree and on fresh exports: 24 passed / 0 failed,
  ~59s, deterministic (4 runs across lead and verifier).
- Primary matrix (fresh export per mutant, full audit run to completion;
  every entry caught by R15 alone, correct per-file label, zero collateral):
  - all six reviewer sites (a-notice, a-sete, a-warn, a-fi, m-notice, m-fi);
  - three extra insertions: m-shim (maintainer `workflow_run` shim, the
    residual the reviewer's prototype window would have left open), a-top
    (action pre-attempt header), a-tail (after the block-final `exit 1`);
  - rewrites: `sleep 30` -> `sleep 29`, `sleep 15` -> `sleep 16`,
    `hang_idle_seconds=600` -> `86400`.
- Parent escapes: the HEAD audit script on the same mutant exports stays
  24/0 for a-notice, a-fi, m-notice, and m-shim, proving the delta is
  exactly what closes the class.
- Tolerance controls: blank-line insertion and comment-wording edits on
  both files stay 24/0; whitespace and trailing-`2>/dev/null` normalization
  controls stay 24/0.
- Independent verifier subagent (general; fresh rsync of the working tree,
  its OWN applier and extraction parser, read-only repo): 4 deterministic
  controls 24/0; lexical totality byte-equal (action 190 joined items /
  6327 bytes, maintainer 193 / 6457, equal to the live blocks); all 6
  reviewer sites plus 11 further mutants (insertions at the pre-attempt
  header, the degraded pipeline body, before the rung loop, after the
  block-final `exit 1`, duplicate-line and deletion variants, `sleep`
  rewrites, a watchdog default rewrite) caught R15-only with the correct
  per-file label; parent escapes m1/m7/m4 reproduced at 24/0; renamed step
  and `run: >` fail closed; zero escapes, zero collateral, zero false
  positives, zero nondeterminism.
- Hygiene subagent (general; read-only full-delta scan): 10/10 PASS:
  scope exactly the four changed files, runtime YAMLs byte-frozen
  (`action.yml` `b69179b9...`), `bash -n` and YAML parse clean, mode
  100755, zero U+2014, no secrets, quoted heredocs (no runtime expansion),
  no loosened assertion (the removed lines are the function signature, the
  two call sites, comments, and reworded check descriptions only), both
  literals exactly equal to the live blocks, docs truthful.

## Delegation ledger

- Lead: the Lab Engineer (CTO). Guard implementation, literal generation,
  primary matrix (control, 4 parent escapes, 12 mutants, 4 tolerance
  controls), docs sync, note corrections, PR body: lead.
- Verification subagent (general; independent applier/parser on a fresh
  working-tree copy, read-only workspace): full matrix returned, zero
  escapes, zero collateral, zero false positives, lexical totality
  byte-equal.
- Hygiene subagent (general; static full-delta scan, read-only): 10/10
  categories PASS, no loosened assertions, no discrepancy.
- Skills: no skill fits (in-repo GitHub Actions regression-audit work, not
  opencode configuration of this workspace), noted per `delegation.md`
  section 5.

## Why audit-only

The shipped runtime behavior is unchanged and stays byte-frozen:
`action.yml` = `b69179b9bc00eb95c464bf72d0854905d5ae81b5`; `maintainer.yml` =
`44c1a514c11ce13302fc955e8f9976d2c7ae83fb` (the main-merged blob from the
rebase; the #653 runner-step delta within it is intact). The finding is that
the GUARD failed to bind the block around its sub-regions, not that the
runner is wrong; fixing the guard, the falsified note claims, and the two
doc sentences is the smallest complete fix. Changed files:
`.github/scripts/silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`, the
round-13 note, and this note. Audit script mode kept at 755.

- the Lab Engineer (CTO)
