# Decision: verify-only run, no new lever, escalate standing question (issue #130)

- **Date:** 2026-09-03
- **Decider:** the Builder
- **Context:** Branch `opencode/issue130-20260903185936` at `9bd6d100`
  (= origin/main). Ledger survey: all single-pipeline mechanism classes
  measured and rejected (R1-R10, X3/X6, V/S/T/U series); mux closed at every
  granularity (whole-image 2-way 3.2068, 8-way 3.20325, per-subband full-24
  3.20664, N-way quad 0.72% bound); floor X6b blend-0 3.21843/9.65529.
- **Decision:** (1) Run verification only: fresh Release build, gate
  self-check, 260/260 unit suite (R7 guard excluded as red-on-main by
  design), kodim01 e7 + X6b determinism re-proofs - all green, zero source
  changes. (2) Build nothing new: full-24 R6C re-encode would re-prove a
  closed lever at hours of cost; X6b/e7 per-subband mux is incommensurable
  (no shared subband grid) and already bounded by the whole-image oracle;
  PR #275 and all open PRs left untouched for their owners. (3) Escalate
  the unchanged standing owner question (a)/(b)/(c) via `{"action":
  "maintainer"}`; `Refs #130` only, never `Closes #130`.
- **Consequence:** #130 stays OPEN per Anti-Surrender + No-Pause. The next
  build phase requires owner authorization of a new paradigm.

- the Builder
