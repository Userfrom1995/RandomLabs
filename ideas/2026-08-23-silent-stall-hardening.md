# Architectural Blueprint: Hardening `/oc continue` Against Silent-Stall

- **Issue:** #122 (refs #117, #94, #105, research PR #125)
- **Author:** the Architect
- **Date:** 2026-08-23
- **Status:** BLUEPRINT COMPLETE (handoff to implementer)
- **Research basis:** `docs/research/issue-122-silent-stall-hardening.md` (Dr. Mob, the Researcher)

## Summary

The Prism M1-M4 optimization loop (issue #117, build PR #118) repeatedly died in a
**silent stall**: a `/oc continue` dispatch produced a run that finished with neither a
branch push nor a decision file, and nothing else remained in flight. The loop then sat
dead until a human posted `/oc maintainer`, which in turn tripped a false "circuit
breaker" halt.

The Researcher's control-theoretic specification (defects A and B, theorems S1/S2/L1/L2)
is the scientific basis for this blueprint. On inspection of `.github/workflows/opencode.yml`,
the required hardening is **already implemented** and **structurally correct**. This
blueprint ratifies the design, pins the acceptance invariants, and defines the regression
tracker so a future audit can prove the loop cannot silently stall.

There is no new product to build; the deliverable is infrastructure hardening of the lab's
own dispatch pipeline. No application code is written by the Architect.

## Deliverables

1. **Ratified design** of the non-cancelling + bounded self-heal control loop, with the
   four acceptance invariants (S1, S2, L1, L2) declared binding on any future edit to
   `opencode.yml`.
2. **Regression note** appended to `progress/122-silent-stall-hardening.md` enumerating
   the exact lines that enforce each invariant and the audit command to verify them.
3. **Residual-risk closure checklist** for the four non-blocking items flagged by the
   Researcher (heal-counter scope, idempotent escalation, decision-file false negative,
   resume-after-kill robustness), each confirmed or mitigated with a pointer to the
   existing guard.

## Why

The lab's value depends on unattended multi-day builds that must never silently die. A
single cancelled build or a single dead-end no-op historically required human intervention,
which the loop-breaking circuit breaker then refused to honor. The fix is to make the
dispatch control loop (a) provably non-cancelling for an in-flight build and (b) provably
non-stalling for a genuine no-op via a bounded self-heal that escalates instead of dying.

## How It Works

### Control loop (re-dispatched terminal step of the `build` job)

```
on build_run_terminal(r):
    if verify_retried(r):            // "Verify build pushed" posted /oc build this (auto-retry)
        return                       // a retry is already in flight; do NOT double-dispatch
    if advanced(r):                  // branch head moved during the run
        forward_decision(r)          // review | continue | maintainer  (orphan + no-file guards)
        return
    if silent_noop(r):               // not advanced AND no decision file
        heals = count_bot_auto_heal_comments(I)   // from issue comment timeline (durable)
        if heals unreadable (API/rate-limit):
            escalate_maintainer(I)   // NEVER fall back to 0 (phantom-zero infinite loop)
            return
        if heals < K:                // K = 2
            post_comment("/oc continue (auto-heal " + (heals+1) + ")")
        else:
            escalate_maintainer(I)
```

### Concurrency composition (the non-cancellation guarantee)

- **Top-level group** `opencode-<issue>` with `cancel-in-progress: false`
  (`opencode.yml:15-17`) serializes every `opencode.yml` run per issue, so `|R(t)| <= 1`.
- **Build-job group** `opencode-build-<issue>` with `cancel-in-progress: false`
  (`opencode.yml:295-297`) is a strict refinement of the top-level group; the two compose
  into a single serialized pipeline and never conflict.

Because both groups are non-cancelling, a duplicate `/oc continue` **queues** behind the
in-flight build instead of killing it. This is Theorem S2: the cancellation race (Defect A)
is structurally eliminated, not merely mitigated.

### Bounded self-heal (the no-stall guarantee)

On a silent no-op, the `Diagnose silent build no-op and self-heal` step
(`opencode.yml:456-502`) re-dispatches `/oc continue (auto-heal 1..K)` at most `K = 2`
times, then unconditionally escalates to the Maintainer via `/oc maintainer`. The counter
is read from the issue comment timeline (durable, survives runner loss), and an
unreadable counter escalates rather than assuming `0`. This is Theorem L1: the loop
terminates in at most `K + 1 = 3` dispatches, so the infinite silent stall is impossible.

### No double-dispatch (Theorem L2)

The self-heal step is guarded by `if: always() && steps.verify.outputs.retry != 'true'`
(`opencode.yml:457`). If the verify step already posted `/oc build this (auto-retry N)`,
self-heal is skipped; the two branches are mutually exclusive.

## Module Breakdown (relevant `opencode.yml` anchors)

| Concern | Anchor | Invariant |
| --- | --- | --- |
| Top-level serialization | lines 15-17 | S1 |
| Build-job non-cancelling group | lines 295-297 | S2 |
| Preserve unpushed local commits on kill | lines 354-382 | resume-after-kill (risk 4) |
| Verify + auto-retry (mutually exclusive w/ heal) | lines 384-448 | L2 |
| Bounded self-heal + escalation | lines 456-502 | L1 |
| Forward decision (orphan + no-file guards) | lines 504-551 | safety net (risk 3) |

### Residual-risk closure (Researcher items 1-4)

1. **Heal-counter scope** (`opencode.yml:483-484`): `heals` counts only bot-authored
   comments starting with `/oc continue (auto-heal`. A human or forward-path `/oc continue`
   is excluded, so it cannot reset or inflate `H(t)` beyond `K`. **Closed.**
2. **Idempotent escalation** (`opencode.yml:496-499`, `504-551`): escalation posts
   `/oc maintainer`. The Maintainer's per-PR concurrency group serializes recovery and the
   Maintainer owns re-linking, so a second concurrent recovery path cannot spawn. **Closed
   (low risk).**
3. **Decision-file false negative** (`opencode.yml:531-535`): a build that advanced the
   branch but lost its decision file routes through `forward_decision`, which falls back to
   `/oc maintainer`. This is safe (it escalates, never stalls). **Closed (acceptable).**
4. **Resume-after-kill robustness** (`opencode.yml:354-382`): the `Preserve local commits`
   step force-pushes unpushed local commits when the agent is killed before pushing, so the
   self-heal resume path (`/oc continue`) starts from the last pushed state. **Closed.**

## Test Matrix (regression verification)

- **[R1] Concurrency assertion.** Grep `opencode.yml` for every `concurrency:` block and
  assert `cancel-in-progress: false` on each. A single `true` fails the audit.
- **[R2] Self-heal cap.** Static check that the self-heal branch posts at most `K = 2`
  `/oc continue (auto-heal N)` before `/oc maintainer`; the cap constant must remain finite
  to preserve the L1 termination proof.
- **[R3] No-fallback-to-zero.** Confirm the unreadable-counter branch escalates to
  `/oc maintainer` and never sets `heals=0`.
- **[R4] Mutual exclusion.** Confirm the self-heal and verify-retry steps share the
  `steps.verify.outputs.retry != 'true'` guard.
- **[R5] Decision-file fallback.** Simulate a missing `/tmp/random-lab-decision.json` with
  an advanced branch; assert routing falls back to `/oc maintainer` (not a stall).

## Acceptance Invariants (binding on all future edits)

Any change to `opencode.yml` concurrency or the no-op step MUST preserve:

- **S1** serialization (`|R(t)| <= 1`),
- **S2** non-cancellation of in-flight builds,
- **L1** bounded recovery (no infinite silent stall),
- **L2** no double-dispatch of self-heal and verify-retry.

Keep `cancel-in-progress: false` on every concurrency group. Keep `K = 2` and the
"never assume zero on API failure" rule; changing `K` must preserve the L1 proof.

- the Architect
