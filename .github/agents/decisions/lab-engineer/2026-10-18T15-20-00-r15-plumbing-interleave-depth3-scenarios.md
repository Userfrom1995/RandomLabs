# Decision: bind the degraded-shape plumbing, cross-class budget interleaves, and rung-depth-3 widening in R15 (tester round 4)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T15:20:00Z
- **Applies to:** PR #654 / issue #653
- **Status:** accepted

## What was decided

The Tester round-4 verification of PR #654 head `3fda66b5` found three
blocking test-integrity holes in R15, each reproduced by semantics-changing
one-line mutants that left the audit at 23 passed / 0 failed, all in both
runner paths:

1. The degraded no-mkfifo branch's status/tee/stderr plumbing was unbound.
   The only degraded-shape scenarios were terminal-line-classified, so
   `status` and `tee_status` were never observably wrong: `status=0` or
   `status="${st[1]}"` concluded silent green on an unclassified death,
   `tee_status=0` or a masked PIPESTATUS swallowed a failing degraded tee,
   and removing the `2>&1` merge lost a stderr-borne terminal line so the
   bounded retry silently vanished.
2. Cross-class budget coupling escaped. An arithmetic reset of an
   already-spent budget inserted inside ANOTHER class's retry branch
   (`transient_retry_used=$((0))` next to `freetier_retry_used=1`,
   `hang_retry_used=$((0))` next to `transient_retry_used=1`, and the other
   directions) evaded both the literal count pins and every single-class
   scenario: no scenario ever repeated a class after another class's retry
   was consumed.
3. The rung-gated widening hardening only covered the free-tier budget at
   rung depth 3; the #653 deep pairs reached only rung 2, so
   `[ "$model" = "c-free" ] && transient_retry_used=-1` (or the stall
   mirror) at the loop top was invisible.

The fix is audit-only; the runtime is byte-identical to the
round-2-verified head and is unchanged.

## The fixes

`.github/scripts/silent-stall-audit.sh`:

- Degraded-shape plumbing (F1): three new mock cases plus shared-list
  behavioral cases, executed against both extracted runner blocks:
  - `nofifo-unclassified 5 "a-free" "failed with exit status 5" ""`:
    an unclassified nonzero degraded death must stay loud with its own
    status (the want_out matches both runner paths' message wording), so
    `status=0` / `status="${st[1]}"` silent greens are caught.
  - `nofifo-teefail 1 "a-free" "could not capture the (Maintainer )?opencode log" ""`:
    the tee-swap condition now also swaps for `nofifo-teefail`, so a
    failing tee in the degraded pipeline must fail loudly; `tee_status=0`
    and the masked-PIPESTATUS mutant are caught.
  - `nofifo-stderr-ft 0 "a-free a-free" "" "15:1"`: attempt 1 writes the
    free-tier terminal line to stderr and exits 1; the `2>&1` merge must
    carry it into the log so the bounded retry fires. Without the merge
    the log is empty, the death reads as unclassified, and the retry is
    silently lost.
- Cross-class interleaves (F2): six new scenarios (`mixed`,
  `mixed-nz`, `hang-mixed`, `hang-mixed-nz`, `ft-hang-http`,
  `ft-hang-http-nz`) each repeat a class after another class's retry was
  consumed. Together they cover every (resetting site, reset budget) pair:
  both exit shapes of the free-tier and HTTP branches plus the hang
  branch. The shipped code must fail loudly at the repeat; the reset
  spends an extra backoff and runs an extra attempt, tripping the
  attempts/count/rc assertions.
- Rung-depth-3 widening (F3): `widened`, `widened-advance`,
  `hang-widened`, `hang-widened-advance` mirror the free-tier deep pair
  for the HTTP and stall budgets with three candidates (`a-free b-free
  c-free`), so a widening (`..._retry_used=-1` gated on `c-free`) or a
  theft (`...=1`) at the third rung is observable.
- Header comment, the `check "R15"` success summary, and the
  failure-class list updated so the coverage claims match what the matrix
  actually enforces (the interleave clause is explicit, and the
  degraded-shape plumbing clause names the unclassified/tee/stderr
  contracts).

`AGENTS.md` and `LAB.md` #653 entries extended with the same three
coverage additions (one sentence each), so the binding blueprint's
description of R15 matches the guard.

## Evidence

Mutation matrix (each mutation applied on a fresh `git archive HEAD`
export, one mutation per export, both runner files mutated together,
primary harness; 24 runs, 3-way parallel):

- Control: 23 passed / 0 failed.
- F1 (5 mutants): `status=0`, `status="${st[1]}"` caught by
  `nofifo-unclassified` (rc=0, want 5; missing output) in both blocks;
  `tee_status=0`, `st=("${PIPESTATUS[0]}" 0)` caught by `nofifo-teefail`
  (rc=9 runaway, missing output) in both blocks; `2>&1` removal caught by
  `nofifo-stderr-ft` (rc=1, want 0; single attempt; bad-backoff) in both
  blocks.
- F2 (10 mutants: every reset site x reset budget direction): each caught
  by its matching interleave scenario (e.g. `reset-ft0-http` by `mixed`,
  `reset-ftnz-hang` by `hang-mixed-nz`, `reset-hang-ft` by
  `ft-hang-http`) in both blocks with zero collateral.
- F3 (4 mutants: widen/steal x http/hang): widen variants caught by
  `widened` / `hang-widened` (extra attempt, second backoff); steal
  variants caught by `widened-advance` / `hang-widened-advance` (healthy
  advance turns loud) plus the static consumption-count pin.
- Regression positive controls: relocation of each of the three counters
  into the rung loop body and the round-3 degraded-branch arithmetic reset
  all remain caught.
- Every mutant failed exactly one rule (R15); control run after the edits:
  23 passed / 0 failed (independently re-confirmed at 40s). One full
  mutant run inspected line by line confirmed only R15 FAILed (22 passed
  / 1 failed) and only the expected scenario names appeared.

## Delegation ledger

- Independent verifier subagent (general; scope: adversarial R15 mutation
  campaign on fresh exports with its own mutation applier, `/tmp`
  isolation, credential-scrubbed, read-only for the workspace): control
  23/0 in 40s; all 22 mutants (the five F1 plumbing shapes, all ten F2
  interleave directions, the four F3 rung-3 widen/theft shapes, and the
  three regression relocations) caught by R15 alone with zero collateral;
  four extra per-file runs proved each runner block catches the plumbing
  and interleave classes independently; workspace reported untouched with
  exactly the three expected entries.
- Primary authored the scenarios, mock cases, tee-swap extension, header
  and summary text updates, and the docs sentences; ran the control plus
  the 24-case mutation matrix itself (23 mutants, 3-way parallel);
  verified the exact repro shapes against the runner control flow line by
  line before and after the edits.
- Skills: no skill fits (GitHub Actions lab infrastructure, not opencode
  configuration of this workspace).

## Why audit-only

The runtime hardening was byte-identical to the round-2-verified head
(`78b57e6e`) and the Tester's findings are coverage gaps in its guard,
not runtime defects. Changing only the audit (plus two doc sentences)
keeps the Reviewed runtime blob stable and routes this round through the
normal re-review and re-test loop.

- the Lab Engineer
