# Decision: Review-fix round for the #828 overloaded transient retry (PR #830)

- **Decider:** The Lab Engineer (CTO)
- **Date:** 2026-11-07T02:58:09Z
- **Applies to:** PR #830 / issue #828
- **Status:** accepted

## What was decided

The review of PR #830 head `9cba85b8` returned one blocking finding and two
non-blocking observations. All three are addressed on the same branch, now
rebased onto main `7a23aa2bd` (the #822 landing, required by this PR's
sequencing note). The detector change itself is unchanged.

- **F1 (blocking): the delegation ledger was missing.** The threshold was
  met (two runner copies, the audit matrix and pins, docs, prompts, and the
  decision record, across five non-root directories), but no run artifact
  carried the ledger. This record carries the ledger for the round, and the
  PR description is updated with the same ledger. The code change itself is
  unchanged.
- **Non-blocking doc parity (applied):** `docs/index.md` and
  `docs/index.html` now name the #828 bracketed overloaded wording next to
  the #717 upstream-endpoint form in the transient 429/5xx explanation.
- **Non-blocking R15 banner (applied):** the R15 failure banner's leading
  issue list now matches its own body and the success banner, naming #805
  and #828.

## Changes

- `docs/index.md`, `docs/index.html`: the public provider-retry explanation
  names both retryable upstream forms (the #717 endpoint form and the #828
  bracketed overloaded wording).
- `.github/scripts/silent-stall-audit.sh`: the R15 failure banner's leading
  issue list gains #805 and #828; the rule body and every pin are unchanged.
- This decision record.

## Verification

- Rebase: `git rebase origin/main` replayed both #828 commits onto main
  `7a23aa2bd` with no conflicts.
- Independent detector verification on HEAD under the production
  `bash --noprofile --norc -eo pipefail` shape: both runner copies are
  byte-identical after de-indentation (`account_funds_terminal` sha256
  `6e48d10f...a133a2`, `transient_http_error_terminal` sha256
  `1b710a56...db518f`), all 18 matrix cases pass per copy (36 executions),
  the 39/40 trailing-window bound holds, the ~160 KiB match-first window
  still matches, the account line is rejected by the transient detector and
  accepted by the account detector, and the pre-#828 class rejects the live
  bracketed line (the widening is load-bearing).
- `bash -n .github/scripts/silent-stall-audit.sh`: clean.
- Full audit on the rebased tree: `env -u LAB_RUN_NONCE bash
  .github/scripts/silent-stall-audit.sh` -> 34 passed, 0 failed (R1-R34).

## Delegation ledger

- explore (doc parity and stale pin scan): found no stale pre-#828 class;
  located the only public explanation to update (`docs/index.md` lines
  117-126 and `docs/index.html` line 253), confirmed all four audit pins
  carry the widened class, and found zero em dashes in the changed files.
- general (independent detector semantics): executed the extracted
  detectors from both HEAD runner copies under the production shell form;
  both copies byte-identical after de-indentation, 36/36 case executions
  passed, the 39/40 and ~160 KiB windows behave per spec, and the pre-#828
  class rejects the live line.
- Primary verified itself: rebased the branch, made the doc-parity, R15
  banner, and ledger edits, checked `bash -n`, ran the full audit on the
  rebased tree (34/34), and reviewed the final diff.
- Skills: no skill fits; the available opencode-configuration skill does not
  apply to a runner regex, an audit banner, and lab docs.

## Residual

Unchanged from the original record: an out-of-family wording (not starting
with `Upstream request failed: `) remains unclassified by design, and a
persistent terminal death is recovered by a fresh run rather than a ladder
advance.

- the Lab Engineer
