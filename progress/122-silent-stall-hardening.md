# Progress: Hardening `/oc continue` Against Silent-Stall (#122)

- **Issue:** #122
- **Branch:** opencode/issue122-20260823093519
- **Status:** in-progress
- **Architect:** the Architect (blueprint complete; research by Dr. Mob, the Researcher)

## Goal

Make the dispatch control loop (1) provably non-cancelling for an in-flight build and
(2) provably non-stalling for a genuine no-op, via non-cancelling concurrency groups plus a
bounded self-heal that escalates to the Maintainer instead of dying silently.

## Acceptance Invariants (binding)

- **S1** serialization: `|R(t)| <= 1` at all times.
- **S2** non-cancellation: a running build is never cancelled by a later `/oc continue`.
- **L1** bounded recovery: no infinite silent stall; escalate within `K + 1` dispatches (`K = 2`).
- **L2** no double-dispatch: self-heal and verify-retry are mutually exclusive.

## Milestones

- [x] 1. Research spec delivered (`docs/research/issue-122-silent-stall-hardening.md`).
- [x] 2. Architect blueprint delivered (`ideas/2026-08-23-silent-stall-hardening.md`).
- [x] 3. Confirm implementation already satisfies S1/S2/L1/L2 (verified in `opencode.yml`).
- [x] 4. Close 4 residual risks (heal-counter scope, idempotent escalation, decision-file
        false negative, resume-after-kill robustness) with code pointers.
- [ ] 5. Implementer: add regression note + invariants comment block to `opencode.yml`
        (pin S1/S2/L1/L2 at lines 295-297 and 456-502).
- [ ] 6. Implementer: wire regression Test Matrix R1-R5 into `auditor.yml` health check so a
        future edit that breaks an invariant is caught by the Auditor.
- [ ] 7. Reviewer: confirm no `cancel-in-progress: true` exists anywhere in `opencode.yml`
        and the self-heal cap remains finite.
- [ ] 8. Tester: dry-run simulate a silent no-op and confirm escalation to `/oc maintainer`
        after exactly `K = 2` auto-heals.

## Current step

Blueprint ratified. Ready for the implementer to pin the invariants as a comment block in
`opencode.yml` and add the R1-R5 regression checks to the Auditor.

## Next steps

Implementer to scaffold the regression note in `opencode.yml` and extend `auditor.yml` with
the concurrency / self-heal audit; then route to Reviewer and Tester.

## Regression Note (for future audit)

The silent-stall loop is structurally prevented by:

- `opencode.yml:15-17`  top-level group `opencode-<issue>`, `cancel-in-progress: false`  -> S1
- `opencode.yml:295-297` build-job group `opencode-build-<issue>`, `cancel-in-progress: false` -> S2
- `opencode.yml:456-502` bounded self-heal, `K = 2`, escalate on unreadable counter -> L1
- `opencode.yml:457` self-heal guard `steps.verify.outputs.retry != 'true'` -> L2

Audit command (R1): grep every `concurrency:` block in `opencode.yml` and assert
`cancel-in-progress: false` on each. Any `true` reintroduces Defect A.

- the Architect
