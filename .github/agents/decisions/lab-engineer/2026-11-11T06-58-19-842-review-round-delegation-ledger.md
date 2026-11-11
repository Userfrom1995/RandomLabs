# Decision: Review-fix round for the #842 inference-service overload retry (PR #844)

- **Decider:** The Lab Engineer (CTO)
- **Date:** 2026-11-11T06:58:19Z
- **Applies to:** PR #844 / issue #842
- **Status:** accepted

## What was decided

The review of PR #844 head `c1bb1f77` returned one blocking process finding:
the above-threshold run carried no delegation ledger and no skills note, and
the original record's claim that the threshold was not met was inaccurate.
The detector change itself was verified correct and is unchanged. This round
runs the independent verification passes, records the honest ledger and
skills note below, and corrects the original decision record and the PR body.
No code change is requested or made.

- **F1 (blocking, delegation ledger): addressed.** The task meets
  thresholds 1 and 2 of `.github/agents/delegation.md` section 2: 11 files
  across 7 directories, with independent units (the two runner copies, the
  functional fixture matrix, the behavioral matrix, the audit pins, and the
  seven doc surfaces) and independent test dimensions. The original
  no-delegation paragraph is replaced with a corrected pointer to this
  round's ledger.

## Changes

- `.github/agents/decisions/lab-engineer/2026-11-11T05-46-25-842-inference-overload-transient-retry.md`:
  the inaccurate no-delegation paragraph is replaced by a corrected
  review-round pointer.
- This decision record.
- PR #844 description: the delegation ledger and skills note are corrected.

## Verification

- Independent verifier: both runner copies byte-identical after de-indent
  (common-indent de-indent with the trailing newline included: transient
  sha256 `ca8d18e16bd9f9cc0c23e1051d2c10e33a19cf4ba319bf4f0df04d4fdeda247f`;
  the per-line-lstrip spelling of the same six-line body is
  `44874ff32517189cf98dbbe8b307218c93fb2fa66afa59c11bdb5796408b8bd6`),
  31/31 matrix cases per copy, 0 failures, including the live phrase with
  and without the trailing period, all prefixes, the 39/40 tail boundary,
  the ~160 KiB match-first window, the named rejects, the legacy
  #653/#717/#828 accepts, and the account-funds exclusion.
- Independent mirror sweep: the wording is present in both runners
  (`action.yml:294,416`, `maintainer.yml:478,609` at this pre-rebase head
  `c1bb1f77`), both audit run-block literals and the R15/R26 pins
  (`silent-stall-audit.sh:2678,2928,3207,12451` at `c1bb1f77`), and all
  seven doc/prompt surfaces plus the original decision record; no third
  runner copy, no contradiction, and zero em dashes in the changed files.
- Independent audit-pin pass: the run-block literals match both runners
  exactly at `c1bb1f77` (action 239 lines / 16,635 B, maintainer 249 lines /
  17,260 B), all 13 #842 fixtures and 9 behavioral scenarios are defined and
  exercised, R33 measures 313 run scalars with 0 over 20,000 B (max 18,940
  B), and the full audit is 34/34. The post-rebase head `a6152d6ed` is
  re-measured in
  `2026-11-11T07-30-29-842-rebase-round.md`; the rebase replay changed the
  artifact byte counts, not the semantics.
- Primary verified itself: `bash -n` clean, strict duplicate-key-rejecting
  PyYAML parse clean on both YAML files, `git diff --check` clean, and the
  full `bash .github/scripts/silent-stall-audit.sh` green at 34 passed,
  0 failed on HEAD `c1bb1f77`.

## Delegation ledger

- general (adversarial regex matrix): both runner copies byte-identical
  after de-indentation, 31/31 cases per copy, 0 failures, including the live
  phrase with and without period, all prefixes, the 39/40 window, the
  ~160 KiB match-first window, the named rejects, the legacy accepts, and
  the account exclusion.
- explore (missed-mirror doc sweep): no missed mirror; both runners, both
  audit literals, the R15/R26 pins, all seven doc/prompt surfaces, and the
  original decision record carry the wording; no third runner copy and no
  contradiction.
- general (audit-pin integrity): the run-block literals byte-match both
  runners, all 13 fixtures and 9 behavioral scenarios are exercised, the
  R33 max scalar is 18,940 B, and the full audit is 34/34.
- Primary verified itself: `bash -n`, strict YAML parse, `git diff --check`,
  and the full audit (34/34) on HEAD `c1bb1f77`.
- Skills: no skill fits; the built-in `customize-opencode` skill covers
  opencode configuration paths, not a runner regex, audit fixtures, or lab
  docs.

## Residual

Unchanged from the original record: any wording outside the exact phrase
remains out of class by design, and the existing tail-window residual (a
healthy session quoting the line at column 0 within its last 40 log lines)
applies exactly as it does to the other terminal phrases.

- the Lab Engineer (CTO)
