# Decision: rebase R15 onto the #698 actor gate and bind the runner invocation (round 24)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-19T19:20:00Z
- **Applies to:** PR #654 / issue #653
- **Status:** accepted

## What was decided

Two tasks in one push, ordered by the round-24 dispatch:

1. Rebase `opencode/lab-653-provider-stall-retry` onto post-#698 main
   (`78a196f9`) and resolve the two conflicts so BOTH sides survive:
   main's landed actor-write gate (`#696`, PR #698) and this PR's R15
   `#653` surface, R25, and the 150/180 lab plus 120/180 fix cap pairs.
2. Fold in the round-23 review finding: R15's round-22 outcome-source
   identity binding accepted a duplicate composite invocation, so a
   renamed real agent step plus a no-op `uses:
   ./.github/actions/opencode-run` decoy carrying the verify's source id
   kept the audit at 25 passed / 0 failed while the real agent ran
   unverified.

## Rebase reconciliation

Conflicts were `.github/scripts/silent-stall-audit.sh` and `AGENTS.md`
(`.github/workflows/maintainer.yml` and `LAB.md` auto-merged).

- `AGENTS.md`: the `#653` entry keeps this PR's round-18 through round-23
  text; the actor-gate paragraph keeps main's post-#698 version
  (`schedule`/`workflow_dispatch`/`workflow_run` arms, the maintainer
  inline gate, the clean-skip verify lane).
- `silent-stall-audit.sh`: the structural python R15 (rounds 18-23)
  supersedes main's shell R15 extraction, and main's R12/R23/R24/R25
  regions survive unchanged. The R12 region is byte-identical to
  `origin/main`'s.
- One earlier conflict resolution (round-21 docs) briefly committed
  conflict markers; the commit was amended during a targeted interactive
  rebase before this round, and every commit in `78a196f9..HEAD` is now
  marker-free.
- The `#653` runtime content is unchanged: the composite `action.yml`
  run block is its pre-rebase literal, and the Maintainer runner block
  still matches the audit's whole-run-block exact pin. `maintainer.yml`
  as a file changed only because main's gate step and env landed; the
  runner block itself is byte-frozen.

## R15 adaptation for the landed gate

`.github/scripts/silent-stall-audit.sh`:

- `runner_key_hits` accepts exactly one conditional on the Maintainer
  runner: `if: steps.actor_gate.outputs.run == 'true'`, and only when
  `runner_check` finds exactly one step with `id: actor_gate` whose
  `run` invokes `.github/scripts/actor-write-gate.sh`
  (`run-gate-step-not-unique`, `run-gate-step-not-shared-gate`).
  Every other condition still fails `run-step-conditional`.
- `verify_key_hits` and `verify_check` gain `expected_gate`: the
  Maintainer verify env must be exactly `AGENT_OUTCOME:
  ${{ steps.maintainer_run.outcome }}` plus `AGENT_GATE:
  ${{ steps.actor_gate.outputs.run }}`; the general verify stays
  exactly `AGENT_OUTCOME`. A wrong gate value trips
  `verify-gate-env-not-exact`.
- The Maintainer verify behavioral sandbox sets `AGENT_GATE=true`, so
  the missing-decision `exit 1` and present-decision `exit 0` checks
  exercise the post-gate lane instead of the denial clean-skip.
- The R15 header and both banners now state the issue #696 exception.

## Round-23 fix

`outcome_source_hits` now requires the verify's job to contain exactly
one parsed composite invocation (`uses: ./.github/actions/opencode-run`)
when `expected_runner == "composite"`, recording
`verify-outcome-source-runner-not-unique` otherwise. The attribute
branch returns immediately (keeping the `uses-changed` self-test at
exactly `verify-outcome-source-not-agent-step`), and the uniqueness check
runs only for a source with valid runner attributes.

The self-test matrix adds `duplicate-invocation-unquoted` and
`duplicate-invocation-quoted` fixtures, both expecting
`verify-outcome-source-runner-not-unique`; the mutant runner now locates
the verify step by parsed name instead of a fixed index (the duplicate
fixtures have four steps). The quoted spelling evades R12's textual
`uses` count, so R15's parsed uniqueness check is the load-bearing
guard; the unquoted spelling also trips R12 when no duplicate gate step
is added.

## Documentation

- `AGENTS.md` #653 entry: the round-22 sentence now states that the
  composite invocation must be the job's only one and records both
  duplicate variants (25/0 before, 24/1 R15-only after).
- `LAB.md` #653 section: a round-23 paragraph records the escape, the
  uniqueness binding, and both spellings.
- PR #654 body: round-23 and round-24 bullets.

## Evidence

Control on the final tree: 25 passed / 0 failed, 0-byte stderr, R15
PASS.

- Quoted duplicate-invocation variant (reviewer variant A): 24/1, R15
  only, `opencode.yml(verify-outcome-source-runner-not-unique)`.
- Unquoted duplicate-invocation variant without a duplicate gate step:
  24/1, R15 only with the same label plus R12's count failure.
- Unquoted duplicate-invocation variant with a duplicate gate step
  (reviewer variant B): 24/1, R15 only.
- Tester's two-line re-point escape: still 24/1, R15 only,
  `opencode.yml(verify-outcome-source-not-agent-step)`.
- Gate-abuse controls: `if: true` and `if: false` on the Maintainer
  runner fail `behavioral(maintainer.yml,run-step-conditional)`; deleting
  `id: actor_gate` fails `run-gate-step-not-unique` plus the conditional
  label; changing the gate `run` away from the shared script fails
  `run-gate-step-not-shared-gate` plus the conditional label.
- Maintainer verify behavior: missing decision with `AGENT_GATE=true`
  exits 1; present decision exits 0; `AGENT_GATE=false` takes the
  clean-skip lane and exits 0.
- Self-test non-vacuity: removing the uniqueness clause, or reverting
  the name lookup to the old fixed index, fails exactly the two new
  duplicate-invocation self-tests.

## Delegation ledger

- Independent verifier subagent (general, fresh `/tmp` copies, own
  mutation applier, workspace untouched): pristine control 25/0 with
  0-byte stderr; quoted duplicate 24/1 R15-only; unquoted duplicate 23/2
  (R15 plus R12's textual count); Tester re-point still 24/1 R15-only;
  `if: true`, deleted gate id, and changed gate script all fail R15;
  maintainer verify lane behavior matches. One observation: the unquoted
  duplicate trips R12 as well unless a duplicate gate step is added, so
  the quoted spelling is the one that proves R15 is load-bearing.
- Independent hygiene subagent (general, read-only): 10/10 categories
  PASS - scope exactly the audit script plus `AGENTS.md` and `LAB.md`,
  zero U+2014, `bash -n` clean, all 20 workflow/action YAML files parse,
  modes unchanged, no secrets or new live JIT expressions, all 18
  rebased commits bot-authored `lab:` with no `Co-authored-by:`
  trailers, main's `#698` gate step/env and R12/R24/R25 all present, and
  the new self-tests non-vacuous. Its one note: the R15 PASS banner's
  "no `if:`" phrase was stale for the now-allowed gate; fixed in this
  round by naming the #696 exception.
- Primary authored the reconciliation and the fix, ran the control, the
  quoted/unquoted duplicate variants, the Tester regression, both gate
  abuse controls, and the banner re-run; wrote the round-23 and round-24
  PR bullets.
- Skills: no skill fits (GitHub Actions lab-infrastructure
  regression-audit work, not opencode configuration of this workspace),
  noted per `delegation.md` section 5.

## Why this shape

The rebase is a mechanical reconciliation of two landed audit surfaces,
not a redesign. The round-23 fix stays audit-only: the runtime hardening
is unchanged, and the new uniqueness check is the smallest binding that
closes the duplicate-invocation class without weakening the round-22
identity checks.

- the Lab Engineer
