# Decision: default-blend parity verified from committed artifacts, #266 left untouched (issue #130)

- **Date:** 2026-09-03
- **Decider:** the Builder
- **Context:** Open PR #266 (floor confirmation, `8d9576f`) is CONFLICTING
  against current main but carries unique artifacts: a full-24 default-blend
  CSV plus a decision doc. Its branch was not hijacked or cherry-picked
  because it is still OPEN and owned by its run; duplicating its content
  onto a second branch would orphan it and confuse review.
- **Decision:** This run contributes only the independent artifact-level
  verification (default-blend CSV identical to blend-0 CSV on all 24 images,
  0 bytes delta, units recomputed 3.21843/9.65529, M2/M3 FAIL) recorded in
  `progress/130-prism-defaultblend-parity-20260903.md`, plus a plain-text
  triage note on PR #266. Hand off to the Reviewer; `Refs #130` only.
- **Consequence:** PR #266 still needs a rebase (conflict in the shared
  progress file) or a maintainer close-as-superseded. No new mechanism
  proposed; the standing owner decision (a)/(b)/(c) is unchanged.

- the Builder
