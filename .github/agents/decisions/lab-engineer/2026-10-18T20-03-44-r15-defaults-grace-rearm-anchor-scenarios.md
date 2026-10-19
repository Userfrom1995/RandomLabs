# Decision: close the Tester's round-6 R15 static-pin escapes (watchdog defaults, grace, re-arm, MNF anchor, success exit, verify exit)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T20:03:44Z
- **Applies to:** PR #654 / issue #653
- **Status:** accepted

## What was decided

The Tester's round-6 verification of PR #654 head `16dedc98` found six
blocking test-integrity holes in R15, plus one non-blocking note, each
reproduced by a semantics-changing one-liner that left the shipped audit at
23 passed / 0 failed in BOTH runner paths:

- F1: the watchdog's production defaults were unbound - `:-600` -> `:-86400`
  (a day of silence), `:-600` -> `:-2` (idle threshold at/below the poll
  cadence), and `:-30` -> `:-3600` (an hour per poll) all escaped.
- F2: the TERM-to-KILL escalation grace `sleep 5` was unbound
  (`sleep 3600` escaped, delaying the bounded kill by an hour).
- F3: the post-growth re-arm `idle=0` was unbound (`idle=$((idle -
  hang_poll_seconds))` escaped, weakening the silence accounting).
- F4: the nonzero-MNF advance grep's unanchored shape was unbound (adding a
  `^` anchor escaped, silently dropping the prefixed
  `Error: Model not found:` catch-handler form; the Tester suggested the
  `mnf-err-nz` scenario).
- F5: the inclusive threshold `-ge` was unbound (`-gt` escaped).
- F6: the success path's own `exit 0` was unbound (`true` escaped).
- Non-blocking: `maintainer.yml`'s verify `exit 1` for a missing decision
  contract was pinned by nothing (`exit 0` escaped hollow-green), pre-existing
  since the verify landed.

All thirteen recipes (seven `action.yml` variants, six `maintainer.yml`
variants) were reproduced at 23/0 on a pristine export of `16dedc98` before
any edit. The fix is audit-only plus two doc sentences plus this note; the
runtime is byte-identical to the round-2-verified blobs
(`action.yml` = `b69179b9bc00eb95c464bf72d0854905d5ae81b5`,
`maintainer.yml` = `a85701a23747ce8d81a184ab64f6357507b6134d`).

## The fix

`.github/scripts/silent-stall-audit.sh`:

- Production-default literal pins, one per arm and knob:
  `stall-idle-default-not-600`, `stall-poll-default-not-30`.
- The watchdog fire block is extracted with awk (from the printf of
  `$hang_flag` through its `exit 0`) and required to contain all four
  escalation steps (`kill -TERM` and `kill -KILL` for the opencode and tee
  PIDs; `stall-fire-block-incomplete-escalation`) and exactly one sleep line,
  which must be `sleep 5` (`no-bounded-term-kill-grace`).
- The success path is pinned to exactly one `rm -f "$log" "$fifo"
  "$hang_flag"` followed by `exit 0` (`success-path-not-exit-0`).
- The watchdog arithmetic is line-anchored: `if [ "$idle" -ge
  "$hang_idle_seconds" ]; then` (`watchdog-threshold-not-inclusive-ge`),
  `sleep "$hang_poll_seconds"` (`watchdog-poll-not-using-poll-knob`), exactly
  two exact-shape `idle=0` lines (`watchdog-idle-reset-count`), and each
  `grep -A1 'idle=0'` line followed by `last_size=$size`
  (`watchdog-idle-rearm-not-followed-by-baseline-update`).
- The nonzero-MNF advance grep is pinned in its exact unanchored form per
  file (`nonzero-mnf-grep-column0-anchored`), so prefixing a `^` anchor or
  otherwise changing the match shape fails statically.
- The Maintainer verify's missing-decision `exit 1` is pinned by counting
  the `exit 1` line after the `no .maintainer/decision.json` match
  (`hollow-green-verify-not-exit-1`).
- New behavioral scenario `mnf-err-nz`: the mock's nonzero arm emits the
  prefixed `Error: Model not found: ${MODEL}. ...` catch-handler form
  (exit 4) and the shared case asserts the rung advances
  (`a-free b-free`), so the unanchored grep is also bound end-to-end in both
  extracted runner blocks.
- The R15 header comment and the `check "R15"` success/failure text now name
  the new bindings, so the guard's own description matches what it enforces.

`AGENTS.md` and `LAB.md` #653 entries extended with the same one-clause
addition, so the binding blueprint's description of R15 matches the guard.

## Evidence

Control: 23 passed / 0 failed on the committed workspace and on a fresh
`git archive` export of `159447ab` (deterministic; ~55s per audit run on this
runner).

Primary mutation matrix (one mutation per fresh export, own applier; every
mutant fails EXACTLY one rule, R15, at 22 passed / 1 failed, zero
collateral, naming the expected pin or scenario):

- F1 variants -> `stall-idle-default-not-600` (both replacement values) and
  `stall-poll-default-not-30`.
- F2 -> `no-bounded-term-kill-grace`.
- F3 -> `watchdog-idle-reset-count` plus
  `watchdog-idle-rearm-not-followed-by-baseline-update`.
- F4 in `action.yml` -> `action-file(nonzero-mnf-grep-column0-anchored)` plus
  the two `behavioral(action-file,mnf-err-nz:...)` labels; in `maintainer.yml`
  -> the same under the `maintainer.yml` label.
- F5 -> `watchdog-threshold-not-inclusive-ge`.
- F6 -> `success-path-not-exit-0`.
- Non-blocking verify mutant -> `maintainer.yml(hollow-green-verify-not-exit-1)`.
- Four extra proactive mutants of adjacent one-line rewrites (poll knob
  replaced by a literal sleep, fire block gated off, a tee kill dropped,
  verify inverted) were all caught with the matching pins.

Independent verifier campaign (general subagent, fresh `git archive` exports
of `159447ab` and `16dedc98`, its own mutation applier,
`/tmp/opencode/verify-r6-fresh` isolation, workspace read-only): control
23/0; eight mutant classes on the fixed tree all caught by R15 alone at 22/1
with the expected pin and/or `mnf-err-nz` behavioral labels (the third mutant fires both
watchdog labels; the fourth and seventh additionally fire the behavioral
labels); every one
of the eight escaped at 23/0 on the parent, confirming this commit is
exactly what closes the holes. It also verified the `mnf-err-nz` mock arms
and shared case are present (`.github/scripts/silent-stall-audit.sh:1654`,
`:1973`) and reported the workspace untouched with head `159447ab`.

Observed property, unchanged and out of scope: the audit script always ends
`exit 0`; failures surface in the summary line and the health-issue comment
body (`exit 0` is present at `16dedc98` already, so this round neither
introduced nor relied on it). The detection signal this round's evidence
quotes is the `22 passed / 1 failed` summary plus the R15 FAIL detail line.

## Delegation ledger

- Independent verifier subagent (general; scope: adversarial R15 mutation
  campaign on fresh exports of the fix and its parent with its own mutation
  applier, `/tmp` isolation, read-only for the workspace): control 23/0;
  all eight mutant classes caught by R15 alone at 22/1 naming the expected
  labels; all eight reproduced as escapes on the parent; workspace clean;
  no findings beyond the two nuances recorded above (both reconciled).
- Primary reproduced all thirteen Tester recipes at 23/0 on the parent,
  authored the static pins and the `mnf-err-nz` scenario, ran the
  thirteen-mutant plus four-extra primary matrix and the two control runs
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
