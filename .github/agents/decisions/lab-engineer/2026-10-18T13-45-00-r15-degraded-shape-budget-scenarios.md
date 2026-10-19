# Decision: bind the degraded no-mkfifo shape in R15 (tester round 3)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T13:45:00Z
- **Applies to:** PR #654 / issue #653
- **Status:** accepted

## What was decided

The Tester round-3 verification of PR #654 head `f06577cf` found one
blocking test-integrity hole: R15 could not see a retry-budget reset
inside the degraded no-mkfifo branch (`action.yml:312-327`,
`maintainer.yml:388-403`). That branch had exactly one scenario in the
behavioral matrix (`nofifo-freetier`, single-rung, success-terminated),
no persistent-error scenario, and no cross-rung scenario. The static
counter pins are literal `grep -cF` counts, so an arithmetic reset
inserted there (`freetier_retry_used=$((0))` after the mkfifo warning)
kept the literal `..._retry_used=0` occurrences at 1 and the audit still
read 23 passed / 0 failed while the bounded retry became an unbounded
loop in that capture shape (the class with no watchdog, e.g. some
Windows Git Bash environments), bounded in production only by the
agent-step timeout.

The fix is audit-only; the runtime was byte-identical to the
round-2-verified head and is unchanged.

## The fix

`.github/scripts/silent-stall-audit.sh`:

- Two new mock cases (`nofifo-persistent`, `nofifo-http-deep-grant`) and
  two new shared-list behavioral cases, executed against BOTH extracted
  runner blocks in the degraded capture shape (the existing `nofifo-`
  prefix already swaps a failing `mkfifo` onto PATH):
  - `nofifo-persistent 1 "a-free a-free" "persistent free-tier rejection" "15:1"`:
    a persistently rejecting provider must fail loudly after exactly two
    attempts with exactly one 15s backoff; a per-attempt budget reset
    loops forever and fails on rc/attempts/backoff.
  - `nofifo-http-deep-grant 1 "a-free a-free b-free" "persistent HTTP error" "30:1"`:
    a rung-1 429 spends the single retry, a Model-not-found advance
    reaches rung 2, and a second 429 there must be loud persistent with
    exactly one 30s backoff; a model-change-gated per-rung reset spends a
    second backoff and runs an extra attempt.
- A static extraction pin (`degraded-no-mkfifo-branch-touches-retry-budget`)
  that isolates the degraded `else` branch (indentation-aware awk: the
  FIFO branch nests its own if/else/fi for the size comparison, so the
  boundaries are the `else`/`fi` at exactly the mkfifo `if` line's
  indentation) and fails if it mentions any `retry_used` token; a
  companion `degraded-branch-extraction-empty` check keeps the pin
  non-vacuous.
- Header comment, R15 summary text, and the failure-message class list
  updated so the arm-wide claim is scoped honestly: the HTTP and stall
  budgets are proven arm-wide by cross-rung pairs in the FIFO capture
  shape, and the degraded shape is bound the same way for the free-tier
  and HTTP retries (the stall budget does not apply there: no watchdog).

Same-pass documentation precision fix (the Tester's non-blocking note):
maintainer run 39104695066's attempt-level wording in `AGENTS.md`,
`LAB.md`, and two lab-engineer decision notes now states that attempt 1
died on `AI_APICallError: Internal Server Error` with its first ISE line
at 07:37:52Z and no decision file, and that the owner's re-run (attempt
2, 08:03:16Z) recovered after transient ISE lines from 08:03:35Z, instead
of the previous run-level wording a reader could misread as a permanent
death.

## Evidence

Facts re-verified primary before editing (`gh run view --attempt`):
39104695066 attempt 1 ran 06:37:24Z to 07:39:17Z, failure, first ISE
line 07:37:52Z; attempt 2 ran 08:03:16Z to 08:13:00Z, success, ISE lines
from 08:03:35Z.

Mutation matrix (each mutation on a fresh copy; primary harness under
`/tmp/r15mut`, independent verifier harness under `/tmp/r15verify`):

- Control: `silent-stall-audit.sh` 23 passed / 0 failed (repeatable).
- The Tester's exact repro (both arithmetic resets after the mkfifo
  warning): caught in BOTH runner paths by the static pin plus
  `nofifo-persistent` (rc=124 timeout, runaway attempts).
- Single-counter resets (`freetier_retry_used=$((0))` only,
  `transient_retry_used=$((0))` only): caught (`nofifo-persistent` and
  `nofifo-http-deep-grant` respectively, plus the static pin).
- Model-change-gated per-rung reset: caught (`nofifo-http-deep-grant`
  attempts `a-free a-free b-free b-free` and `bad-backoff`).
- Reset inserted BEFORE the warning line: caught (static pin plus the
  behavioral loop).
- Positive controls (literal relocations of `transient_retry_used=0` /
  `freetier_retry_used=0` into the rung loop body): still caught by the
  round-2 `http-deep-grant` / `nofifo-http-deep-grant` and
  `deep-grant` / `budget-rungs` scenarios.
- Every mutation failed exactly one rule (R15) with zero collateral.

Honest limitation recorded: the static pin matches the literal token
`retry_used`, so a deliberately obfuscated reset (for example
`eval "$(printf 'transient_%s_used=0' retry)"`) evades the STATIC pin.
The independent verifier built exactly that shape and confirmed the
behavioral `nofifo-http-deep-grant` scenario still catches it (rc=124,
runaway attempts, bad-backoff, missing-output). The behavioral layer is
the load-bearing guard; the pin is a cheap first-line tripwire.

## Delegation ledger

- Independent verifier subagent (general; scope: adversarial R15
  mutation campaign on fresh copies under `/tmp/r15verify` with its own
  applier; read-only for the workspace): control 23/0; all 7 listed
  mutations caught by R15 alone with zero collateral; a self-designed
  obfuscated reset caught behaviorally (static pin honestly reported
  evadable); extraction-pin non-vacuity characterized; workspace
  reported untouched with exactly the 5 expected modifications.
- Primary authored the scenarios, mock cases, static pin, header and
  summary text updates; ran the control and the mutation matrix (7
  cases) itself before delegating; re-verified the 39104695066 attempt
  facts and made the docs precision edits.
- Skills: no skill fits (GitHub Actions lab infrastructure, not opencode
  configuration of this workspace).

## Why audit-only

The runtime hardening was byte-identical to the round-2-verified head
(`78b57e6e`) and the Tester's finding is a coverage gap in its guard,
not a runtime defect. Changing only the audit keeps the Reviewed runtime
blob stable and routes this round through the normal re-review and
re-test loop.

- the Lab Engineer
