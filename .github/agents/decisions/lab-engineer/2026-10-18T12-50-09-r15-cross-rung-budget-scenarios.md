# Decision: teach R15 to catch per-rung resets of the shared #653 retry budgets

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T12:50:09Z
- **Applies to:** PR #654 / issue #653 (Tester round 2 blocking finding F1)
- **Status:** accepted

## What was decided

The Tester's second infra verification round found the runtime hardening
correct and the incident attribution exact, but the R15 regression guard
blind to a semantics-changing mutation: relocating
`transient_retry_used=0` or `hang_retry_used=0` from its initialization
point before the rung loop into the loop body (a per-rung budget reset)
passed the audit 23/0 on both runner paths, even though the binding docs
state the HTTP and stall budgets are arm-wide like the free-tier one. The
only cross-rung scenarios before this round were the free-tier
`deep-grant`/`deep-advance` pair and `budget-rungs`.

Fix (audit-only, `silent-stall-audit.sh`; no runtime change): four new
cross-rung behavioral scenarios run against both extracted runner blocks,
in both directions:

- `http-deep-grant`: rung 1 spends the single HTTP retry (429), a
  Model-not-found advance reaches rung 2, and rung 2's 429 must be loud
  persistent with exactly one `30:1` backoff (attempts
  `a-free a-free b-free`). A per-rung reset spends a second backoff and
  runs an extra attempt, failing the attempts and backoff assertions.
- `hang-deep-grant` (under `R15_HANG_IDLE=1`): the stall mirror, exactly
  one `10:1`, second stall loud (`repeated provider stall`).
- `http-deep-advance`: a rung-1 Model-not-found must not gate the retry
  away from rung 2, which still spends exactly one `30:1`.
- `hang-deep-advance`: the stall mirror, exactly one `10:1`.

Supporting changes: four mock scenario cases; the R15 header comment and
the `check "R15"` summary text now state the cross-rung enforcement for
all three budgets (the free-tier clause is scoped to free-tier; the #653
clause names the cross-rung grant/advance pairs), so the summary is
honest about what the rule actually enforces.

## Verified evidence (primary and independent)

- Control: 23 passed / 0 failed on the final tree, three runs (~25s
  each, deterministic).
- Mutation matrix on fresh `git archive` exports: relocating
  `transient_retry_used=0` (action.yml and maintainer.yml),
  `hang_retry_used=0` (both files), and the free-tier positive control
  (`freetier_retry_used=0`) each produce exactly "22 passed, 1 failed"
  with the single failure being R15 naming the matching deep-grant
  scenario (attempts and bad-backoff detail), zero collateral.
- Independent verifier subagent (fresh exports, its own mutation
  applier): control 23/0 twice; all five mutations caught by R15 alone,
  zero collateral; counter placement re-confirmed (`action.yml:259-261`,
  `maintainer.yml:335-337`, before `for model in $candidates`); the four
  scenario expectations re-derived against the runner control flow; em
  dash, secret, and mode-bit hygiene clean; the repo tree untouched.
- Note: the audit script exits 0 by design (pre-existing); the summary
  line and the health-issue post are the signals, not the exit code.

## Delegation ledger

- Verification subagent (general; scope: independent R15 mutation
  campaign on fresh exports; read-only, all work under /tmp): returned
  the matrix above (all five mutations caught, R15 alone, zero
  collateral), the placement check, the scenario-to-runner-flow
  reasoning, and hygiene PASS, with no discrepancy.
- Primary: authored the scenarios, mock cases, and comment/summary text;
  ran the audit three times on the tree; built and ran the same mutation
  matrix before delegating; verified the runner control flow line by
  line (`action.yml:259-263`, `:328-408`); checked em dashes, `bash -n`,
  and repo state.
- Skills: no skill fits (GitHub Actions lab infrastructure, not opencode
  configuration of this workspace).

- the Lab Engineer
