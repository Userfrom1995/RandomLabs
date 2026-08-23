# Silent-Stall Hardening (issue #122)

A static-safety layer added to `opencode.yml` so the autonomous build pipeline
can never enter a silent, unbounded stall. The invariants below are enforced
both by code structure and by a CI auditor (R1-R5 in
`.github/scripts/silent-stall-audit.sh`, wired through `auditor.yml`).

## What Was Built

Two complementary guards were added to the lab's main event bus:

- **BINDING ACCEPTANCE INVARIANTS** in `opencode.yml` — a documented contract
  (header comment, lines 19-42) that pins four properties any future edit to the
  concurrency / self-heal blocks must preserve.
- **`silent-stall-audit.sh`** — a POSIX shell monitor that greps the workflows
  for the structural patterns behind each invariant and soft-fails (exit 0,
  logged warning) when a regression is detected, so the auditor job never
  deadlocks the pipeline.

## The Four Invariants

- **S1 Per-issue serialization**: exactly one `opencode.yml` run per issue may
  be in flight at a time (`|R(t)| <= 1`). Guaranteed by the top-level
  non-cancelling group that wraps every dispatch per issue number.
- **S2 Non-cancellation of in-flight builds**: every concurrency group MUST use
  `cancel-in-progress: false`. A duplicate `/oc continue` QUEUES behind the
  running build instead of killing it (no cancellation race).
- **L1 Bounded recovery (no infinite silent stall)**: the self-heal step may
  re-dispatch `/oc continue` (auto-heal N) at most K = 2 times, then
  UNCONDITIONALLY escalates to `/oc maintainer`. Terminates in <= 3 dispatches.
- **L2 No double-dispatch**: the self-heal step and the verify auto-retry step
  are mutually exclusive via the guard `steps.verify.outputs.retry != 'true'`.

## Rules (do not violate when editing)

- Keep `cancel-in-progress: false` on EVERY concurrency group (S2).
- Keep K = 2 (finite). Changing K must still preserve the L1 termination proof.
- NEVER assume a zero counter on an API/rate-limit failure; escalate to
  `/oc maintainer` instead (prevents the phantom-zero infinite loop).

## Audit Mapping

The `silent-stall-audit.sh` patterns map directly to the invariants:

- **R1** — `cancel-in-progress: true` must be absent (S2).
- **R2** — the auto-heal cap `"$heals" -lt 2` is bounded (L1).
- **R3** — the "Could not enumerate prior auto-heals" escalation path exists
  with no `heals=0` assumption (L1 edge case).
- **R4** — the `steps.verify.outputs.retry != 'true'` guard is present at every
  self-heal entry (L2).
- **R5** — the "No decision file found" fallback routes to `/oc maintainer`
  instead of stalling.

- the Lab Engineer
