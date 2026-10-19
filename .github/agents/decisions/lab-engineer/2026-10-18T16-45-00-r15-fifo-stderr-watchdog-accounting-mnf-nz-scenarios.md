# Decision: bind the FIFO-shape stderr merge, the watchdog silence accounting, and the nonzero-MNF budget-reset sites in R15 (tester round 5)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T16:45:00Z
- **Applies to:** PR #654 / issue #653
- **Status:** accepted

## What was decided

The Tester round-5 verification of PR #654 head `16519bc9` found three
blocking test-integrity holes in R15, each reproduced by semantics-changing
one-line mutants that left the audit at 23 passed / 0 failed, in both runner
paths:

1. F1: the FIFO capture shape never binds its `2>&1` stderr merge.
   `MODEL="$model" opencode github run > "$fifo" 2>&1 &` without the merge
   sends stderr to the step output instead of the captured log, so every
   anchored detector reads a log missing stderr-borne terminal lines: on the
   exit-0 path the run concludes silent green with no retry, on the nonzero
   path the bounded retry is lost as unclassified. Round 4 established
   stderr carriage as contract for the degraded shape (`nofifo-stderr-ft`);
   the primary shape had no equivalent probe.
2. F2: the watchdog's silence accounting is unbound. Four one-line variants
   pass the shipping audit: `idle=$((idle + 1))` and a non-accumulating
   `idle=$((hang_poll_seconds))` never reach the threshold at the production
   cadence (5h at defaults), a zeroed byte-size read kills an actively
   producing attempt, and dropping the `last_size=$size` re-arm means the
   documented incident shape (output, then silence) never fires.
3. F3: the nonzero Model-not-found advance (the grep-based branch that
   `continue 2`s) is the last unbound budget-reset site. An arithmetic reset
   inserted there (`transient_retry_used=$((0))`, or the stall/free-tier
   analogue) resurrects a spent budget, so a persistent death loops one
   extra bounded retry instead of failing loudly with the provider's status.
   The exit-0 MNF advance is covered incidentally by the deep-grant pairs;
   the nonzero branch had no scenario combining it with a spent budget.

The fix is audit-only; the runtime is byte-identical to the
round-2-verified head `78b57e6e` (`action.yml` blob
`b69179b9bc00eb95c464bf72d0854905d5ae81b5`, `maintainer.yml` blob
`a85701a23747ce8d81a184ab64f6357507b6134d`) and is unchanged.

## The fixes

`.github/scripts/silent-stall-audit.sh`:

- FIFO-shape stderr merge (F1): mock cases `fifo-stderr-ft` (attempt 1
  writes the free-tier terminal line to stderr and exits 1) and
  `fifo-stderr-ft0` (same write with exit 0, the silent-green direction),
  plus shared-list cases
  `fifo-stderr-ft 0 "a-free a-free" "" "15:1"` and
  `fifo-stderr-ft0 0 "a-free a-free" "" "15:1"`, executed against both
  extracted runner blocks. A static exact-form tripwire
  (`opencode github run > "$fifo" 2>&1 &`) backs the merge.
- Watchdog silence accounting (F2): three mock cases plus shared cases:
  - `hang-poll-slow` (`R15_HANG_POLL=30 R15_HANG_IDLE=90`, silent attempt):
    exactly three polling rounds must accumulate to fire (30+30+30 >= 90);
    `idle += 1` or a non-accumulating idle never reaches the threshold
    before the 10s scenario timeout (observed rc=124, single attempt).
  - `hang-active` (`R15_HANG_IDLE=3`): a producing attempt (10 rounds of
    0.1s real sleep plus a progress line) must not be killed; three
    consecutive silent polls (~0.6s) are needed to misfire while the
    producer writes every ~0.1s. A zeroed byte-size read kills it and the
    extra attempt shows (`a-free a-free`, want `a-free`).
  - `out-then-hang` (`R15_HANG_IDLE=3`): one line after the watchdog's
    baseline read, then a stall. The shipped re-arm lets the post-output
    silence accumulate and fire; without `last_size=$size` the growth
    branch resets idle forever and the attempt runs into the timeout
    (observed rc=124, single attempt). Deliberate deterministic variant of
    the Tester's line-first recipe: with the line written before the
    watchdog's initial byte-size read, the missing re-arm is unobservable
    (the race means the baseline already includes the line); the 0.3s
    pre-output sleep guarantees a post-baseline growth event.
  - Static tripwires: accumulation (`idle=$((idle + hang_poll_seconds))`),
    re-arm (`last_size=$size`), and a line-anchored size-read pin (a plain
    fixed-string probe is also satisfied by the `last_size=$(wc ...)`
    initializer as a substring; independent verifier finding D1, fixed
    here with `^[[:space:]]*size=...$`).
- Nonzero-MNF advance reset sites (F3): mock cases plus shared cases
  `mnf-nz-mixed 2 "a-free a-free b-free" "persistent HTTP error" "30:1"`,
  `ft-mnf-nz 1 "a-free a-free b-free" "persistent free-tier rejection"
  "15:1"`, and
  `R15_HANG_IDLE=1 r15_behavioral_case hang-mnf-nz 1 "a-free a-free b-free"
  "repeated provider stall" "10:1"`. Each spends one class's single retry,
  advances through the nonzero MNF branch, and requires the repeat on the
  next rung to be loud persistent with exactly one backoff; a reset at the
  site spends a second backoff and runs an extra attempt. One scenario per
  budget class covers all three reset directions (the Tester verified the
  HTTP direction; the free-tier and stall mirrors generalize it).
- Header comment, the `check "R15"` success summary, and the failure-class
  list updated so the coverage claims match what the matrix enforces
  (the stderr merge, watchdog accounting, and nonzero-MNF site clauses are
  explicit; "unclassified propagation" is now shape-qualified).

`AGENTS.md` and `LAB.md` #653 entries extended with the same coverage
additions, so the binding blueprint's description of R15 matches the guard.

## Evidence

Mutation matrix (each mutation applied on a fresh `tar` export of the
working tree, one mutation per export, primary harness; 12 mutants, 3-way
parallel; control 23 passed / 0 failed on the workspace and on the export):

- F1 (2 mutants, both files): `2>&1` removal caught by the static pin plus
  `fifo-stderr-ft` (rc=1, want 0; single attempt; bad-backoff) and
  `fifo-stderr-ft0` (single attempt wanted two; bad-backoff; rc stays 0,
  the silent-green direction) in the mutated block's own label.
- F2 (5 mutants): `idle += 1` and `idle = poll` in either file caught by
  `hang-poll-slow` (rc=124, single attempt, missing 10s backoff) plus the
  accumulation pin; `size=0` in either file caught by `hang-active`
  (`a-free a-free`, want `a-free`) plus the anchored size-read pin;
  dropped re-arm caught by `out-then-hang` (rc=124, single attempt) plus
  the re-arm pin.
- F3 (4 mutants): `transient_retry_used=$((0))`, `freetier_retry_used=$((0))`,
  `hang_retry_used=$((0))` at the nonzero-MNF site in `action.yml` and the
  transient reset in `maintainer.yml` each caught by the matching scenario
  in its own label (e.g. `mnf-nz-mixed:rc=0,want=2`,
  attempts `a-free a-free b-free b-free`, bad-backoff). No static pin by
  design (the arithmetic spelling is the point).
- Every mutant failed exactly one rule (R15) at 22 passed / 1 failed with
  zero collateral; the exact `r15_bad` lists name only the expected
  scenarios.

## Delegation ledger

- Independent verifier subagent (general; scope: adversarial R15 mutation
  campaign on fresh exports with its own mutation applier, `/tmp`
  isolation, read-only for the workspace): baseline 23/0 twice with
  byte-identical logs; all five mutation classes (FIFO unmerge in
  `action.yml`, `idle += 1` in `maintainer.yml`, `size=0`, dropped re-arm,
  nonzero-MNF transient reset) caught by R15 alone with the exact expected
  scenario names and zero collateral; catch determinism re-confirmed with
  repeat runs; copy fidelity proven by recursive diff and hashes; static
  hygiene (bash -n, zero U+2014) clean; workspace reported untouched. Its
  finding D1 (the size-read static pin was vacuously satisfied by the
  `last_size=` initializer substring) was fixed in this round with the
  line-anchored form and the fix mutation-verified (the size-read pin now
  fires alongside `hang-active`).
- Primary authored the scenarios, mock cases, static tripwires, header and
  summary text, and the docs sentences; ran the control plus the 12-case
  mutation matrix itself; derived the scenario timing margins against the
  runner control flow line by line before and after the edits (including
  the `out-then-hang` race analysis that produced the deterministic
  variant).
- Skills: no skill fits (GitHub Actions lab infrastructure, not opencode
  configuration of this workspace).

## Why audit-only

The runtime hardening was byte-identical to the round-2-verified head and
the Tester's findings are coverage gaps in its guard, not runtime defects.
Changing only the audit (plus two doc sentences) keeps the reviewed runtime
blob stable and routes this round through the normal re-review and re-test
loop.

- the Lab Engineer
