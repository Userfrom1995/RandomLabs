# Research Specification: Hardening `/oc continue` Dispatch Against Silent-Stall

- **Issue:** #122 (refs #117, #94, #105)
- **Author:** Dr. Mob, the Researcher
- **Date:** 2026-08-23
- **Status:** RESEARCH COMPLETE (handoff to Architect)

## 1. Problem formalization

The Prism M1-M4 optimization loop (issue #117, build PR #118) repeatedly entered a
**silent stall**: a `/oc continue` dispatch produced a run that finished with neither
a branch push nor a decision file, and nothing else was left in flight. The loop then
died until a human posted `/oc maintainer`, which in turn tripped a false "circuit
breaker" halt. Two distinct defects caused this.

### Defect A - Cancellation race in the build concurrency group

The `build` job declared its own concurrency group
`opencode-build-<issue>` with `cancel-in-progress: true`. This contradicted the
lab-wide mandate (AGENTS.md: all workflows use `cancel-in-progress: false`). A
duplicate `/oc continue` could cancel an in-flight build, leaving zero builds running
and no queued continuation. The loop had no live run and no scheduled run: a stall.

### Defect B - Unbounded dead end on a genuine no-op

The "Diagnose silent build no-op" step only posted a note when a run finished with no
push and no decision file. Nothing re-dispatched. The loop was dead until a human
re-pinged.

### Goal

Make the dispatch control loop (1) provably non-cancelling for an in-flight build and
(2) provably non-stalling for a genuine no-op, by adding a **bounded self-heal
re-dispatch** that escalates instead of dying.

## 2. Model and definitions

Let `I` be an issue id. Define per-issue state:

- `R(t)` = multiset of workflow runs currently executing for `I` (a run is one
  invocation of `opencode.yml`).
- `B(t)` = number of `build` jobs currently executing for `I`. By construction of the
  top-level group (see invariant S1), `|R(t)| <= 1` at all times.
- `A(t)` = branch head SHA for the build branch of `I` (the source of truth for
  progress).
- `D(t)` = boolean: a `/tmp/random-lab-decision.json` was produced by the most recent
  build agent run.
- `H(t)` = count of prior `github-actions[bot]` comments on `I` of the form
  `/oc continue (auto-heal N)` (the self-heal counter).

### Concurrency groups (current implementation, verified in `opencode.yml`)

- Top-level workflow group: `opencode-<issue>` with `cancel-in-progress: false`
  (lines 15-17). Serializes every `opencode.yml` run per issue.
- Build job group: `opencode-build-<issue>` with `cancel-in-progress: false`
  (lines 295-297). Serializes only `build` jobs per issue.

Both groups are non-cancelling. The job-level group is a strict refinement of the
top-level group (it only ever gates a subset of what the top-level group already
gates), so the two never conflict; they compose into a single serialized pipeline.

### Silent-no-op predicate

A build run `r` is a **silent no-op** iff, at its terminal step:

```
advanced(r) = (A_end != A_start)   // branch head moved during the run
decided(r)  = D(r)

silent_noop(r) = (not advanced(r)) AND (not decided(r))
```

This is exactly the condition checked at lines 464-475 of `opencode.yml`.

## 3. Control loop algorithm (pseudo-code)

```
on build_run_terminal(r):
    if verify_retried(r):            // step "Verify build pushed" posted /oc build this (auto-retry)
        return                       // a retry is already in flight; do not double-dispatch
    if advanced(r):
        forward_decision(r)          // review | continue | maintainer  (lines 504-551)
        return
    if silent_noop(r):
        heal = count_auto_heal_comments(I)
        if heal is unreadable (API/rate-limit):
            escalate_maintainer(I)   // never loop on an unknown counter
            return
        if heal < K:                 // K = 2
            post_comment("/oc continue (auto-heal " + (heal+1) + ")")
        else:
            escalate_maintainer(I)
```

## 4. Theorems and proofs

### Theorem S1 (serialization / no concurrent mutation)

At any time `t`, `|R(t)| <= 1`.

*Proof.* The top-level group `opencode-<issue>` with `cancel-in-progress: false`
admits one run at a time and queues the rest. Every `opencode.yml` invocation
(research, architect, build, fix, general) belongs to this group. Therefore at most
one run executes for `I` concurrently. Since the `build` job is a job inside such a
run, `B(t) <= |R(t)| <= 1`. No two build jobs mutate the branch concurrently. Q.E.D.

### Theorem S2 (non-cancellation of in-flight build)

A running build job is never cancelled by a later `/oc continue` dispatch.

*Proof.* Cancellation in GitHub Actions occurs only when a concurrency group with
`cancel-in-progress: true` admits a newer run. Both the top-level group and the
build-job group use `cancel-in-progress: false`. A newer `/oc continue` run is
therefore queued (per S1) and executes only after the current run fully terminates.
There is no cancelling admission. Q.E.D.

Corollary: Defect A is structurally eliminated, not merely mitigated.

### Theorem L1 (no silent stall / bounded recovery)

For any genuine silent no-op, the loop either recovers or escalates within a finite
number of dispatches, and never enters an unbounded dead state.

*Proof.* On a silent no-op, the algorithm posts at most `K = 2` self-heal
re-dispatches (`/oc continue (auto-heal 1..K)`). Each re-dispatch is itself a build
run gated by S1/S2. After `K` no-ops without progress, the algorithm unconditionally
calls `escalate_maintainer(I)` (posts `/oc maintainer`). Three exhaustiveness
properties guarantee termination:

1. `H(t)` is monotonic non-decreasing and capped at `K`. The counter is read from the
   issue comment list, not from local mutable state, so a re-read always reflects
   prior heals.
2. If the counter read fails (API/rate-limit), the algorithm escalates rather than
   assuming `H = 0` (which would otherwise risk a phantom zero and an infinite loop).
   This is the same "never fall back to 0 on failure" rule used by the retry counters
   at lines 405-409 and 749-753.
3. Escalation to the Maintainer is a terminal action for the build loop; the Maintainer
   owns re-linking/recovery (per AGENTS.md), so the build loop cannot re-enter the same
   no-op path on its own.

Therefore from any silent no-op the system reaches a progress state (branch advances),
a normal decision (review/continue/maintainer), or a Maintainer escalation in at most
`K + 1` dispatches. The infinite silent stall is impossible. Q.E.D.

### Theorem L2 (no double-dispatch)

A self-heal re-dispatch and a verify-retry never both fire for the same run.

*Proof.* The self-heal step is guarded by `steps.verify.outputs.retry != 'true'`
(line 457). If the verify step already posted `/oc build this (auto-retry N)`, the
self-heal is skipped. Conversely, if verify did not retry, the run is at terminal
state and the self-heal may act. The two branches are mutually exclusive. Q.E.D.

## 5. Complexity

- Time per recovery attempt: `O(1)` comment reads/writes plus one full build run
  (`O(T_build)` where `T_build <= 105` min agent budget).
- Worst-case wall-clock to escalation on a persistent no-op: `(K + 1) * T_build`
  = `3 * T_build`, bounded and finite.
- Space: `O(1)` state, all persisted in the issue comment timeline (durable, survives
  runner loss). No database required.

## 6. Residual risk register (recommendations for the Architect)

The current `opencode.yml` implementation (lines 295-297, 456-502) already satisfies
S1, S2, L1, L2. The following residual items are non-blocking and listed for
completeness; the Architect should confirm each during implementation review.

1. **Heal counter scope.** `H(t)` counts comments matching `/oc continue (auto-heal`,
   which excludes human or forward-path `/oc continue` posts. Confirm that a human
   `/oc continue` during an auto-heal window does not reset or inflate `H(t)` in a way
   that lets the loop exceed `K`. (Mitigation already present: only bot-authored
   auto-heal comments are counted.)
2. **Idempotent escalation.** `escalate_maintainer` posts `/oc maintainer`. Verify a
   prior `/oc maintainer` on the same issue does not create a second concurrent
   recovery path. (Maintainer concurrency group serializes this; low risk.)
3. **Decision-file false negative.** A build that advanced the branch but failed to
   write the decision file is classified as `advanced=yes` and routes through
   `forward_decision`, which itself falls back to `/oc maintainer` when no file exists
   (lines 531-535). This is safe but means a successful push with a lost decision still
   escalates; acceptable because it is not a stall.
4. **Heal semantics for `continue` vs `build`.** Self-heal posts `/oc continue`, which
   resumes from the progress file rather than restarting. Confirm the resume path is
   robust when the prior run was killed mid-commit (the `Preserve local commits` step at
   lines 354-382 already force-preserves unpushed local commits).

## 7. Handoff to the Architect

The Researcher delivers the above control-theoretic specification. The Architect should:

- Treat S1/S2/L1/L2 as acceptance invariants for any change to `opencode.yml`
  concurrency or the no-op step.
- Keep `cancel-in-progress: false` on every concurrency group in the file (mandate).
- Keep the bounded self-heal cap `K = 2` and the "never assume zero on API failure"
  rule; changing `K` must preserve the L1 termination proof.
- Add a regression note to `progress/122-*` so a future audit can verify the loop
  cannot silently stall.

No production code is written by the Researcher; this document is the scientific
blueprint handed to the Architect.

- Dr. Mob, the Researcher
