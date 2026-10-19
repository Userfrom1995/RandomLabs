# Decision: bind rung-gated resets at the nonzero-MNF advance site in R15 (review round 8)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T18:42:00Z
- **Applies to:** PR #654 / issue #653
- **Status:** accepted

## What was decided

The Reviewer's round-8 verification of PR #654 head `9caeeb5a` found one
blocking test-integrity hole in R15, reproduced by a semantics-changing
one-liner that left the shipped audit at 23 passed / 0 failed in BOTH runner
paths:

- The round-5 nonzero-MNF scenarios (`mnf-nz-mixed`, `ft-mnf-nz`,
  `hang-mnf-nz`) only advance through the grep-based nonzero
  `Model not found` branch on rung 1, so a budget reset GATED on a later
  rung, inserted immediately after the advance warning echo:

  ```
  [ "$model" != "${candidates%% *}" ] && transient_retry_used=$((0))
  ```

  was invisible: no scenario ever observed the site past the first advance.
  The mutation is a real behavior change (rung-1 MNF-nz advance, rung-2
  bounded 429 retry, rung-2 MNF-nz advance to `c-free` resurrects the spent
  budget, rung-3 429 then spends a second 30s backoff instead of failing
  loudly), exactly the "later-rung budget gating" class R15's own failure
  text declares must not pass and the contract `AGENTS.md` states ("a spent
  retry must not be resurrected by a rung advance through that branch").

The fix is audit-only plus two doc sentences plus the decision note; the
runtime is byte-identical to the round-2-verified head `78b57e6e`
(`action.yml` blob `b69179b9bc00eb95c464bf72d0854905d5ae81b5`,
`maintainer.yml` blob `a85701a23747ce8d81a184ab64f6357507b6134d`).

## The fix

`.github/scripts/silent-stall-audit.sh`:

- Three rung-depth-3 mirrors, one per budget class, added to the R15 mock
  (`mnf-nz-deep`, `ft-mnf-nz-deep`, `hang-mnf-nz-deep`) and to the shared
  behavioral case list (executed against both extracted runner blocks):

  ```
  r15_behavioral_case mnf-nz-deep 2 "a-free b-free b-free c-free" "persistent HTTP error" "30:1" "a-free b-free c-free"
  r15_behavioral_case ft-mnf-nz-deep 1 "a-free b-free b-free c-free" "persistent free-tier rejection" "15:1" "a-free b-free c-free"
  R15_HANG_IDLE=1 r15_behavioral_case hang-mnf-nz-deep 1 "a-free b-free b-free c-free" "repeated provider stall" "10:1" "a-free b-free c-free"
  ```

  Each shape advances via the nonzero-MNF branch on rungs 1 AND 2 (MNF-nz
  exit 4), spends the class's single retry on rung 2 (429 exit 2 / FreeTier
  terminal exit 0 / stall), and requires the rung-3 repeat to be loud
  persistent with exactly one backoff. A rung-gated reset at the second
  advance (where the gate `model != first candidate` first becomes true)
  spends a second backoff and runs an extra `c-free` attempt, failing both
  the attempts and the backoff assertions; an unconditional reset fails
  them too, so the new mirrors also catch the round-5 shape.
- The R15 header comment, the `check "R15"` success summary, and the
  failure-class list now state the rung-gated depth-3 coverage, so the
  guard's own text matches what the matrix enforces.
- Cosmetic honesty fix in the success summary: the FIFO-merge clause wrote
  the token as a backticked `` `2>&1` `` inside the double-quoted
  `check` string, so bash command-substituted it at expansion time and the
  token vanished from the printed banner; the backticks are now escaped and
  the banner renders `` `2>&1` `` literally.

`AGENTS.md` and `LAB.md` #653 entries extended with the same one-clause
addition (the rung-gated mirrors), so the binding blueprint's description
of R15 matches the guard.

## Evidence

Control: 23 passed / 0 failed on the workspace and on a fresh `git archive`
export of the fix commit (deterministic across runs; ~53s per audit run on
this runner).

Primary mutation matrix (one mutation per fresh export, own applier; every
mutant fails EXACTLY one rule, R15, at 22 passed / 1 failed, zero
collateral, with the expected scenario named in the FAIL detail):

- Gated resets (`[ "$model" != "${candidates%% *}" ] && <counter>=$((0))`
  after the advance echo): transient in `action.yml` -> `mnf-nz-deep`;
  transient in `maintainer.yml` -> `mnf-nz-deep` under the `maintainer.yml`
  label; free-tier in `action.yml` -> `ft-mnf-nz-deep`; stall in
  `action.yml` -> `hang-mnf-nz-deep`; stall in `maintainer.yml` ->
  `hang-mnf-nz-deep` under its own label.
- Regression controls from earlier rounds, still caught: unconditional
  transient reset -> `mnf-nz-mixed` plus `mnf-nz-deep`; per-attempt
  relocation of each counter into the while loop -> `http-persistent` /
  `hang-persistent` / `persistent-nonzero` runaway loops (rc=124); for-loop
  relocation (the round-2/6 recipe) -> `http-deep-grant`, `hang-deep-grant`,
  `deep-grant` / `budget-rungs`; arithmetic reset in the degraded no-mkfifo
  branch -> the static no-budget-assignment pin plus `nofifo-persistent`;
  detector pipefail unwrap -> the static shape pin plus the functional
  `rc=141` big-window fixture.

Independent verifier campaign (general subagent, fresh exports, its own
mutation applier, `/tmp` isolation, workspace read-only): control 23/0;
six mutants (gated transient in both files, gated free-tier, gated stall,
unconditional transient, for-loop relocation) all caught by R15 alone at
22/1 with the expected scenario names and the doubled-attempt plus
`bad-backoff` detail; zero escapes. Its historical control - the gated
transient mutation applied to the parent commit `9caeeb5a` - escaped at
23 passed / 0 failed, confirming this commit is exactly what closes the
hole. Workspace reported untouched; branch head identity re-checked.

## Delegation ledger

- Independent verifier subagent (general; scope: adversarial R15 mutation
  campaign on fresh exports of the fix commit with its own mutation applier,
  `/tmp/verifier654` isolation, read-only for the workspace): control 23/0;
  all six mutants caught by R15 alone at 22/1 naming the expected scenarios;
  the parent-commit escape reproduced (23/0), proving the delta closes the
  hole; hygiene (workspace clean, head identity, scenario shapes and
  candidate lists re-read from the export) PASS; no findings.
- Primary authored the scenarios, mock cases, header/summary text, and the
  docs sentences; ran the control plus the 14-mutant primary matrix itself;
  derived each scenario's expected attempt sequence against the runner
  control flow (rung-1 MNF-nz advance, rung-2 spent retry, rung-2 MNF-nz
  gated advance, rung-3 loud repeat) before editing; verified the runtime
  blob hashes and the audit-only delta.
- Skills: no skill fits (GitHub Actions lab-infrastructure regression-audit
  work, not opencode configuration of this workspace).

## Why audit-only

The runtime hardening was approved at `78b57e6e` and is byte-identical; the
finding is a coverage gap in its regression guard. Changing only the audit
(plus two doc sentences) keeps the reviewed runtime blob stable and routes
this round through the normal re-review and re-test loop.

- the Lab Engineer
