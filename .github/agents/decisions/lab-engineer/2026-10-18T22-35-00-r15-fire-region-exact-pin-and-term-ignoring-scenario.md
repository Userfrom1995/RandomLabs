# Round 8: R15 fire-region whole-exact pin and the TERM-ignoring scenario

- Decider: the Lab Engineer (CTO)
- Date: 2026-10-18T22-35-00Z
- Applies to: PR #654 (`opencode/lab-653-provider-stall-retry`, issue #653),
  Tester round 8
- Status: implemented, pending review round 12

## What was decided

Fix the blocking finding from Tester round 8. On a fresh export of `6c8ed8f0`
the shipped ordered fire-block pin still allowed the watchdog escalation to be
neutered while the audit stayed at 23 passed / 0 failed, because the pin
filtered the extracted region down to the lines it recognized and silently
dropped everything else. Five mutations escaped:

1. `sleep 1d` inserted after the grace `sleep 5` (action-file),
2. `sleep 1d` inserted before the first TERM (action-file),
3. `sleep 1d` inserted before the first TERM (maintainer.yml),
4. the oc `kill -KILL "$oc_pid"` shadowed dead behind `if false; then ... fi`,
5. an extra `kill -s KILL "$tee_pid"` inserted before the first TERM.

Root cause: `r15_fire_order` was a filtered equality, not a region equality.
Unknown lines were excluded from the comparison instead of failing it.

Decision: replace the filtered pin with a whole-region exact pin, and add a
behavioral scenario that makes the KILL step itself load-bearing.

## The fix

- `r15_fire_region` replaces `r15_fire_order` in `silent-stall-audit.sh`
  (round-7 label `stall-fire-order-not-term-term-sleep-kill-kill` retired).
  The extracted fire region is normalized (leading/trailing whitespace
  stripped, one optional trailing `2>/dev/null` removed per line, blank lines
  dropped, lines joined with `|`) and must equal EXACTLY:
  `printf 'hang\n' > "$hang_flag"|kill -TERM "$oc_pid"|kill -TERM
  "$tee_pid"|sleep 5|kill -KILL "$oc_pid"|kill -KILL "$tee_pid"|exit 0|`.
  Failure label: `stall-fire-region-not-exact-term-term-sleep-kill-kill`.
  Any line added, removed, reordered, or rewritten anywhere in the region,
  including lines the filter never matched, now fails. The round-6
  presence/count pins are retained.
- New behavioral scenario `hang-child-ignores-term` in the shared harness: a
  mock attempt that ignores TERM (`trap '' TERM` plus a real-sleep loop, so
  the SIG_IGN disposition leaves no handler to fire) and can therefore only
  be ended by the fire block's SIGKILL. The shipped code kills it at the
  grace, retries once on the same model after 10s, and the healthy attempt 2
  concludes rc 0 (`R15_HANG_IDLE=1 r15_behavioral_case
  hang-child-ignores-term 0 "a-free a-free" "provider stall" "10:1"`).
- The round-7 "exact ordered five-step sequence, adjacent and in order"
  wording in this directory's previous note, `AGENTS.md`, and `LAB.md` is
  corrected to the whole-region exact form everywhere, so the binding
  blueprint matches the shipped guard.

## Evidence

Control on the modified tree (fresh tracked-file export), run twice:
`23 passed, 0 failed`.

Mutation matrix on fresh exports (one mutation per export; each run
independent):

| # | Mutation | Result |
|---|----------|--------|
| m1 | `sleep 1d` after the grace (action-file) | 22/1 R15, `stall-fire-region-not-exact-...` only |
| m2 | `sleep 1d` before first TERM (action-file) | 22/1 R15, region label only |
| m3 | `sleep 1d` before first TERM (maintainer.yml) | 22/1 R15, `maintainer.yml(stall-fire-region-not-exact-...)` only |
| m4 | oc KILL shadowed behind `if false; then ... fi` | 22/1 R15, region label + `behavioral(hang-child-ignores-term: rc=124, attempts='a-free')` |
| m5 | extra `kill -s KILL "$tee_pid"` before first TERM | 22/1 R15, region label only |
| m6 | `kill()` function shadow that neuters only `-KILL` | 22/1 R15, behavioral-only: `hang-child-ignores-term: rc=124, attempts='a-free'`, `bad-backoff`; every static pin passes, so the scenario is the unique catcher |
| m7 | KILL-first reorder (round-7 control) | 22/1 R15, region label + `behavioral(term-grace: term-cleanup-marker-missing)` |
| m8 | per-rung relocation of `transient_retry_used` (round-7 control) | 22/1 R15, behavioral-only across the HTTP/deep/MNF grant-advance scenarios |
| m9 | arithmetic free-tier reset in the degraded no-mkfifo branch (prior control) | 22/1 R15, `degraded-no-mkfifo-branch-touches-retry-budget` + `behavioral(nofifo-persistent: rc=124, 46 attempts)` |

No collateral rule failures in any run. m4 proves both layers fire together;
m6 proves the behavioral scenario is load-bearing beyond the static pin (the
shadow text is invisible to every static check).

Runtime blobs untouched (byte-identical to the round-2 verified hashes):
`action.yml` = `b69179b9bc00eb95c464bf72d0854905d5ae81b5`, `maintainer.yml` =
`a85701a23747ce8d81a184ab64f6357507b6134d`. Audit script mode kept at 755.
Changes: `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`, this directory's
round-7 note (correction section), and this note.

## Delegation ledger

- Lead: the Lab Engineer (CTO).
- Guard implementation and doc sync: lead, with the pinned-mutation
  falsification driven by the Tester round-8 escape list.
- Independent verifier subagent (general; scope: fresh tracked-file export
  per mutant, its own mutation applier, `/tmp` isolation): reproduced the
  Tester round-8 escapes on the parent and confirmed every caught mutant
  (R15 only, expected per-file labels, zero collateral).
- Primary authored the whole-region pin and the TERM-ignoring scenario, ran
  the control and the nine-mutant matrix, and re-checked the labels and
  collateral itself. Evidence retained in this note; raw logs were
  sandbox-local.
- Skills: no skill fits (in-repo GitHub Actions regression-audit work, not
  opencode configuration of this workspace), noted per `delegation.md`
  section 5.

## Why audit-only

The shipped runtime behavior was already correct: the Tester's round-8
finding is that the GUARD failed to bind it, not that the escalation was
wrong. Fixing the guard alone (plus correcting the docs to describe it
accurately) is the smallest complete fix; touching the frozen runner blobs
would invalidate every verified runtime pin for no behavioral gain.

- the Lab Engineer (CTO)
