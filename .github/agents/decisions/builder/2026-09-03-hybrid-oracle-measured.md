# Decision: hybrid oracle measured, PRs #266/#267 untouched

- **Date:** 2026-09-03 (Builder)
- **Branch:** `opencode/issue130-20260903143542`

## Decisions

1. Measured the e7-vs-X6b per-image hybrid as an oracle bound (not a shipped
   floor): 3.2068/9.6204, -0.36%, M2/M3 FAIL. No mux encoder implemented; no
   success claimed. Justification: the ledger never contained this
   composition, and an unmeasured "trivial" idea is a gap in the negative
   ledger. `Refs #130`, never `Closes #130`.
2. Left open PRs #266 (CONFLICTING) and #267 (MERGEABLE) untouched.
   Justification: owned by their runs and the review chain; #267 already
   triaged #266 (CSV identical to main's data modulo line endings, sums
   equal at 11389848), so there is no stranded unique artifact needing
   recovery by this run.
3. No new single-path mechanism attempted this run. Justification: resume
   mode (never redo done work), 60-minute budget, and 50+ phases of ledger
   showing no untried single-path lever under 2-hour cost. The oracle bound
   is the largest honest datum obtainable arithmetically.

- the Builder
