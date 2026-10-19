# Decision: close the Tester's round-7 R15 fire-block order class (ordered escalation pin, liveness gates, real-grace probe)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T21:10:00Z
- **Applies to:** PR #654 / issue #653
- **Status:** accepted

## What was decided

The Tester's round-7 verification of PR #654 head `a6a6a73e` found that R15's
watchdog fire-block check bound only presence and count of the escalation
steps, never their ORDER. Four semantics-changing one-line rewrites (one per
fresh export, both runner paths) left the shipped audit at 23 passed / 0
failed while destroying opencode's TERM-handling window (KILL lands before or
back-to-back with TERM, so a TERM-trapping attempt can never finish its
cleanup):

- the `kill -KILL "$oc_pid"` line swapped directly before
  `kill -TERM "$oc_pid"`.
- the grace `sleep 5` moved directly before the first `kill -TERM "$oc_pid"`.
- the grace `sleep 5` moved directly after the last `kill -KILL "$tee_pid"`.
- the tee pair swapped (`kill -KILL "$tee_pid"` before the grace,
  `kill -TERM "$tee_pid"` after it).

Two further one-line rewrites of the watchdog's liveness lines (`while kill -0
"$oc_pid" 2>/dev/null; do` -> `while :; do`, and the post-sleep re-check
`|| exit 0` -> `|| true`) were recorded as cheap-pin suggestions (non-blocking
in the Tester's verdict; production timing hides them until the parent kill).
All were reproduced at 23/0 on a pristine export before any edit. The fix is
audit-only plus doc sentences plus this note; the runtime is byte-identical to
the round-2-verified blobs (`action.yml` =
`b69179b9bc00eb95c464bf72d0854905d5ae81b5`, `maintainer.yml` =
`a85701a23747ce8d81a184ab64f6357507b6134d`).

## The fix

`.github/scripts/silent-stall-audit.sh`:

- Normalized ordered pin on the extracted fire block: the kill/sleep lines are
  filtered, stripped of leading/trailing whitespace and the optional
  `2>/dev/null` suffixes, joined, and compared against exactly
  `kill -TERM "$oc_pid"|kill -TERM "$tee_pid"|sleep 5|kill -KILL "$oc_pid"|kill
  -KILL "$tee_pid"|` (`stall-fire-order-not-term-term-sleep-kill-kill`). Any
  swap, relocation, dropped step, or extra matching `sleep`/kill line failed;
  lines the filter did not match were dropped rather than failed, a gap the
  Tester's round 8 closed (see the correction section below). The
  round-6 single-`sleep 5` and signal-presence pins are retained.
- New `term-grace` behavioral scenario: the mock opencode traps TERM, kills
  its real-sleep child, cleans up through the real grace (the generated sleep
  mock honors the real requested 5 seconds only when `R15_SCENARIO` is
  `term-grace` and the value is 5), writes a marker at `R15_TERM_MARKER`, and
  exits 0; attempt 2 is healthy. The shared case asserts rc 0, attempts
  `a-free a-free`, and exactly one 10s backoff, and the marker must exist
  (`term-grace:term-cleanup-marker-missing`). A fire block whose KILL lands
  before or back-to-back with TERM kills the attempt before its cleanup
  completes, so the marker is missing while rc and the attempt sequence alone
  stay identical.
- Exact-form liveness pins: `while kill -0 "$oc_pid" 2>/dev/null; do`
  (`watchdog-loop-not-gated-on-oc-liveness`) and
  `kill -0 "$oc_pid" 2>/dev/null || exit 0`
  (`watchdog-post-sleep-liveness-check-missing`).
- The R15 header comment and the `check "R15"` success/failure text now name
  the ordered fire-block binding, the real-grace probe, and the liveness pins,
  so the guard's own description matches what it enforces.

`AGENTS.md` and `LAB.md` #653 entries extended with the same clause, so the
binding blueprint's description of R15 matches the guard.

## Correction (Tester round 8)

The round-7 ordered pin was superseded in round 8. The Tester demonstrated on
fresh exports of `6c8ed8f0` that because the pin filtered the extracted region
down to the matching kill/sleep lines, an unknown line spliced between or
around the steps left the audit at 23 passed / 0 failed while the escalation
changed: `sleep 1d` inserted after the grace or before the first TERM (both
runner paths), the oc KILL shadowed dead behind `if false; then ... fi`, and
an extra pre-TERM kill. The shipped pin is now a whole-region exact compare
(the hang-flag write, the five ordered steps, and the exit, nothing else,
normalized for whitespace, an optional trailing `2>/dev/null`, and blank
lines; `stall-fire-region-not-exact-term-term-sleep-kill-kill`) and a new
TERM-ignoring `hang-child-ignores-term` behavioral scenario binds the KILL
itself. The round-7 claim "Any swap, relocation, dropped step, or extra
`sleep`/kill line fails" held only for lines the filter matched; see
`2026-10-18T22-10-00-r15-fire-region-exact-pin-and-term-ignoring-scenario.md`.

## Evidence

Control: 23 passed / 0 failed on the committed workspace and on two fresh
`git archive` export runs by an independent verifier (deterministic PASS/FAIL
line sets; ~59s per audit run, the `term-grace` scenario adding ~6s of real
grace time).

Primary mutation matrix (one mutation per fresh export, own applier; every
mutant fails EXACTLY one rule, R15, at 22 passed / 1 failed, zero collateral,
naming the expected label):

- Reorder mutants (KILL oc first, sleep before the first TERM, sleep after the
  last KILL) in `action.yml`: `stall-fire-order-not-term-term-sleep-kill-kill`
  plus `behavioral(action-file,term-grace:term-cleanup-marker-missing)`.
- Tee pair swap in `action.yml`: the static order pin alone (the marker only
  observes the opencode escalation, as documented), still 22/1 R15-only.
- Liveness mutants in `action.yml`: `watchdog-loop-not-gated-on-oc-liveness`
  and `watchdog-post-sleep-liveness-check-missing` respectively.
- `maintainer.yml` mirrors of the KILL-first reorder and the loop-gate
  rewrite: the same labels under the `maintainer.yml` block label, including
  the behavioral marker for the reorder.
- Round-6 and round-5 regression classes still caught:
  `stall-idle-default-not-600` (default knob rewrite) and
  `fifo-capture-not-merging-stderr` plus the `fifo-stderr-ft` /
  `fifo-stderr-ft0` behavioral labels (`2>&1` merge drop).

Independent verifier campaign (general subagent, fresh `git archive` exports
of `0c294af4` and of the parent `a6a6a73e`, its own mutation applier,
`/tmp/opencode/verifier` isolation, workspace read-only): control 23/0 twice;
all eight mutant classes (seven listed above plus the maintainer loop-gate
mirror) caught by R15 alone at 22/1 with the expected labels and zero
collateral; the KILL-first reorder escaped at 23/0 on the parent, confirming
this commit closes exactly that hole; both prior-round regression checks still
caught; `bash -n` clean; the commit touches only
`.github/scripts/silent-stall-audit.sh`; zero em dashes; bot identity, `lab:`
prefix, no trailers; workspace untouched. Scenario mechanics reported at
`.github/scripts/silent-stall-audit.sh:1697` (trap arm), `:1720` (sleep-mock
real-grace branch), `:1801` (`R15_TERM_MARKER` env), `:2052-2054` (marker path,
case invocation, assertion).

Observed property, unchanged and out of scope: the audit script always ends
`exit 0`; failures surface in the summary line and the health-issue comment
body. The detection signal this round's evidence quotes is the `22 passed / 1
failed` summary plus the R15 FAIL detail line.

## Delegation ledger

- Independent verifier subagent (general; scope: adversarial R15 mutation
  campaign on fresh exports of the fix and its parent with its own mutation
  applier, `/tmp` isolation, read-only for the workspace): control 23/0 twice
  byte-identical PASS/FAIL sets; all eight mutant classes caught by R15 alone
  at 22/1 naming the expected labels with zero collateral; the parent escape
  reproduced at 23/0; prior-round regressions still caught; syntax and hygiene
  checks clean; scenario mechanics line numbers reported; no discrepancy.
- Primary reproduced all six Tester order recipes plus the two liveness
  recipes at 23/0 on the parent, authored the ordered pin, the `term-grace`
  scenario (mock arm, real-grace sleep branch, marker plumbing, assertion),
  and the liveness pins, ran the ten-mutant primary matrix and the control
  itself, verified the runtime blob hashes and the docs delta, and committed
  the round.
- Skills: no skill fits (GitHub Actions lab-infrastructure regression-audit
  work, not opencode configuration of this workspace).

## Why audit-only

The runtime hardening was approved at `78b57e6e` and is byte-identical; the
findings are coverage gaps in its regression guard. Changing only the audit
(plus two doc sentences) keeps the reviewed runtime blob stable and routes
this round through the normal re-review and re-test loop.

- the Lab Engineer
