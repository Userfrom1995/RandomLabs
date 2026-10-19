# Review round 12: R15 whole-watchdog-subshell exact pin

- Decider: the Lab Engineer (CTO)
- Date: 2026-10-18T23-25-00Z
- Applies to: PR #654 (`opencode/lab-653-provider-stall-retry`, issue #653),
  review round 12 finding F1
- Status: implemented, pending review round 13

## What was decided

Fix the blocking finding from review round 12. The round-8 fire-region pin
anchored its comparison at the `printf 'hang\n' > "$hang_flag"` line, so
every line of the watchdog subshell BEFORE the fire block (the baseline read,
the loop, the poll, the liveness checks, the silence accounting, the
threshold-to-warning prefix, the re-arm else branch) and any non-matching
line outside the fire block sat outside the compared region. Eight one-line
insertions kept the audit at 23 passed / 0 failed while delaying the abort by
up to a day at the production defaults (600s idle / 30s poll), re-opening the
#653 stall class:

1. `sleep 1d` between the warning echo and the flag `printf` (action.yml),
2. `sleep 1d` between the threshold `if` and the warning echo (action.yml),
3. the same insertion as 1 in maintainer.yml,
4. `sleep 1d` after `sleep "$hang_poll_seconds"` (action.yml),
5. `sleep 1d` after the post-sleep liveness re-check (action.yml),
6. `sleep 1d` between `idle=$((idle + hang_poll_seconds))` and the threshold
   `if` (action.yml),
7. `sleep 1d` after `last_size=$size` in the re-arm else branch (action.yml),
8. `sleep 1d` immediately after the subshell's opening `(` (action.yml).

Root cause: the round-8 region was fire-block-scoped, not
subshell-scoped. The behavioral harness mocks `sleep` down to 0.2s, so no
scenario can observe an inserted real duration; only a static whole-subshell
pin can bind this class. The `AGENTS.md` / `LAB.md` sentence claiming "an
inserted sleep or a shadowed KILL cannot widen or neuter the escalation" was
therefore false for inserted sleeps outside the fire block.

Decision: pin the entire watchdog subshell exactly, keep every existing fire
pin and label (the new pin subsumes their interior), and scope the docs
sentence to the whole subshell.

## The fix

- New whole-subshell pin in `silent-stall-audit.sh`, immediately after the
  round-8 fire-region pin. `r15_watch` extracts the subshell from its opening
  bare `(` line through its closing `) &` line (awk, fail-closed: a missing
  or renamed anchor extracts nothing and fails the exact compare).
  `r15_watch_region` normalizes each line (leading/trailing whitespace
  stripped, one optional trailing `2>/dev/null` removed, blank lines dropped,
  lines joined with `|`) and must equal EXACTLY the shipped loop: subshell
  open, baseline read, `idle=0`, the liveness-gated `while`, the poll, the
  post-sleep liveness re-check, the size read, the size-equal branch with the
  idle accumulation and the threshold, the warning echo, the fire block
  (hang-flag write, TERM oc, TERM tee, sleep 5, KILL oc, KILL tee, exit 0),
  the re-arm else branch, `done`, and the closing `) &`. Failure label:
  `watchdog-subshell-not-exact`.
- The round-6/7/8 pins and labels are unchanged and still fire independently
  inside the region (they remain correct); the round-7 liveness pins stay as
  cheap tripwires.
- `AGENTS.md` and `LAB.md` #653 entries now scope the claim: the fire-region
  pin guards the fire block interior, and the whole-subshell pin makes the
  same claim true for the whole watchdog (an inserted sleep anywhere in the
  watchdog, before the fire block included, fails the audit). The R15 header
  comment and the `check "R15"` summary text name the new pin honestly.

## Evidence

Control on the modified tree (fresh tracked-file export):
`23 passed, 0 failed`, ~60s, deterministic.

Parent escape: fresh export of HEAD `48c11d72` (pre-fix audit) with
insertion 1 -> `23 passed, 0 failed`, so the escape class is real and the
delta is exactly what closes it.

Primary mutation matrix (fresh export per mutant, one mutation each, full
audit run to completion; every mutant `22 passed / 1 failed`, R15 the only
failing rule, zero collateral):

| # | Mutation | Result detail |
|---|----------|---------------|
| e1 | `sleep 1d` after the warning echo (action) | `action-file(watchdog-subshell-not-exact)` only |
| e2 | `sleep 1d` after the threshold `if` (action) | `action-file(watchdog-subshell-not-exact)` only |
| e3 | `sleep 1d` after the warning echo (maintainer) | `maintainer.yml(watchdog-subshell-not-exact)` only |
| e4 | `sleep 1d` after the poll sleep (action) | `action-file(watchdog-subshell-not-exact)` only |
| e4m | `sleep 1d` after the poll sleep (maintainer) | `maintainer.yml(watchdog-subshell-not-exact)` only |
| e5 | `sleep 1d` after the post-sleep liveness check (action) | `action-file(watchdog-subshell-not-exact)` only |
| e6 | `sleep 1d` after the idle accumulation (action) | `action-file(watchdog-subshell-not-exact)` only |
| e7 | `sleep 1d` after the re-arm (action) | `action-file(watchdog-subshell-not-exact)` only |
| e8 | `sleep 1d` after the subshell open (action) | `action-file(watchdog-subshell-not-exact)` only |
| c1 | `sleep 1d` after the grace (round-8 control) | region label + subshell label |
| c2 | oc KILL shadowed `if false; then ... fi` (round-8 control) | region + subshell + `hang-child-ignores-term: rc=124` |
| c3 | KILL-first reorder (round-8 control) | region + subshell + `term-grace: term-cleanup-marker-missing` |
| c4 | `sleep 5` -> `sleep 3600` (round-8 control) | `no-bounded-term-kill-grace` + region + subshell + `term-grace` |
| c5 | idle default `:-600` -> `:-86400` (outside the subshell) | `stall-idle-default-not-600` only, subshell pin correctly stays green |
| c6 | `idle=$((idle + 1))` | subshell + `watchdog-idle-not-accumulating-by-poll` + `hang-poll-slow` |
| c7 | `kill -KILL ... || true` | region + subshell |

The verifier's own campaign additionally mirrored e4 in both files and e1/e2
shapes, with the same result. c5 confirms the pin does not over-claim: knob
lines outside the subshell stay owned by their own pins.

## Delegation ledger

- Lead: the Lab Engineer (CTO).
- Guard implementation, doc sync, primary matrix (17 audit runs: control,
  1 parent escape, 15 mutants) and the final committed-tree audit: lead.
- Independent verification subagent (general, read-only workspace, own
  from-scratch applier, isolated under `/tmp/opencode/verifier-r12`,
  provenance proven by sha256): control 23/0; parent escape reproduced
  (23/0); all 12 requested cases caught 22/1, R15-only, with the correct
  per-file `watchdog-subshell-not-exact` label (absent exactly where
  expected for the outside-subshell knob mutant), zero escapes, zero
  collateral, workspace reported untouched. No discrepancy with the lead's
  matrix.
- Skills: no skill fits (GitHub Actions lab-infrastructure regression-audit
  work, not opencode configuration of this workspace), noted per
  `delegation.md` section 5.

## Why audit-only

The shipped runtime behavior was already correct and stays byte-frozen:
`action.yml` = `b69179b9bc00eb95c464bf72d0854905d5ae81b5`, `maintainer.yml` =
`a85701a23747ce8d81a184ab64f6357507b6134d`, identical to the round-2 verified
head `78b57e6e`. The finding is that the GUARD failed to bind the watchdog
completeness, not that the watchdog is wrong; fixing the guard plus the two
doc sentences is the smallest complete fix. Changed files:
`.github/scripts/silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`, and this note.
Audit script mode kept at 755.

- the Lab Engineer (CTO)
