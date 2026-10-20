# Decision: R28 referenced-id identity binding and job override pins (PR #708)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-20T05:11:35Z
- **Applies to:** PR #708 / issue #690
- **Status:** accepted

## What was decided

The round-3 review found that R28's static pass pinned expressions but never
proved that the step ids those expressions consume still name the intended
step. Three one-line edits stayed green at 28 passed, 0 failed: renaming the
build baseline `id: baseline`, renaming the phase `id: actor_gate`, and adding
a job-level `continue-on-error: true`. Each silently turns a real failure or a
denied run into a green result while every text pin still matches. The review
also asked for the stale "25 mutation self-tests" count to be made accurate
(F2). Both findings are closed in this round.

## Rationale

A pinned expression string is worthless if its `steps.<id>` reference resolves
to nothing or to a decoy: `${{ steps.baseline.outputs.branch }}` becomes
empty, the verify falls into its fallback branch, and any pre-existing remote
tip reads as this session's push (the exact #690 symptom). The same logic
applies to `actor_gate` (an emptied `AGENT_GATE` makes the denial branch a
green no-op) and to job-level overrides, which can swallow a failed verify.
R28 now binds identity, not just text, and pins the effective job surface.

## Changes

- Added `resolve_ref()` to the R28 static pass. Every consumed id
  (`actor_gate`, `opencode`, `baseline`, `verify-phase`, `verify`) must
  resolve inside its owning job to exactly one step, with the expected name,
  action (`uses`), key surface, `if`, env, scalars (continue-on-error,
  timeout), and (for the baseline) executable output lines, and it must
  precede its consumer. `count_job_steps()` and `count_job_uses()` require
  exactly one actor gate and one composite agent per bound job, with `uses:`
  paths normalized so a dot-segment alias cannot hide a second agent.
- Pinned the exact actor-gate env (including the per-job `GATE_LABEL`), the
  exact agent env (never the owner PAT), agent `continue-on-error: true` and
  per-job timeout, and the complete baseline run body via `expect_step`
  (commented-out or unreachable output writes fail).
- Pinned each bound job's key surface, trigger `if` scalar, `runs-on`, and
  `timeout-minutes`, and rejected job-level `continue-on-error` in the same
  bad-key loop as `defaults`, `env`, `container`, and `strategy`.
- Improved `norm()` so a blank or comment line that terminates a shell
  continuation is preserved instead of dropped: splicing a blank line after
  the baseline's `gh pr list ... \` continuation changes the command while
  the old normalization still matched.
- Added 20 static mutants beyond the previous 25 (45 static plus 7 helper
  fixture mutants = 52): baseline/actor-gate id renames, job-level
  continue-on-error on research and build, `if: false` and duplicate decoys
  for the gate/agent/baseline, a rewritten baseline body and commented-out
  output, job-level `if: false`/`permissions`/`runs-on`/`timeout`, an owner
  PAT in the agent env, a shortened agent cap, a path-aliased shadow agent,
  and the blank-continuation splice.
- Updated the R28 header, success banner, `AGENTS.md`, and `LAB.md` to the
  accurate count: 52 mutation self-tests (45 static + 7 helper).

## Verification

- Control at the implementation head:
  `bash .github/scripts/silent-stall-audit.sh .github/workflows/opencode.yml`
  -> `28 passed, 0 failed`, exit 0.
- Pre-fix repro on `ec15bf14`: the reviewer's three escapes each stayed
  green (independently reproduced by the adversarial verifier).
- Post-fix repro: each reviewer escape fails R28 alone with a distinct token
  (`referenced-id-not-unique:build:baseline:0`,
  `referenced-id-not-unique:research:actor_gate:0`,
  `job-effective-override:build:continue-on-error`); all 52 mutants fail the
  pass while the control stays green.
- `bash -n` passes on `silent-stall-audit.sh`; PyYAML parses `opencode.yml`
  and `auditor.yml`; `shellcheck -S error` passes on the audit and both R28
  helpers; em-dash scan and `git diff --check` are clean.

## Delegation ledger

- General (very thorough; independent adversarial R28 audit, first pass):
  reproduced the reviewer's three escapes on the pre-fix head and found eight
  more green escapes (decoy gate/agent/baseline, job-level `if: false`, an
  owner PAT, a shortened cap, a path-aliased shadow agent, and job surface
  overrides); all are now caught by the identity/job pins and their mutants.
- General (very thorough; independent adversarial retest, second pass):
  confirmed the 8 first-pass escapes are closed and found six further
  escapes: the baseline blank-continuation bypass (fixed by the
  continuation-preserving `norm()` plus a dedicated mutant), plus researcher
  prompt replacement, fix-job shadow agent, agent variant downgrade,
  workflow-level `permissions` widening, and the agent `use_github_token`
  switch (left to diff review, outside R28's identity/bound-job scope).
- Primary verified itself: generated the canonical bodies from the live
  workflow, executed the extracted static pass against the control and every
  mutant, verified each reviewer escape fails alone, and ran the full R1-R28
  audit to 28 passed / 0 failed plus `bash -n`, YAML parse, shellcheck,
  em-dash scan, and `git diff --check`.
- Skills: no skill fits (GitHub Actions CI and audit work, not opencode
  configuration); none loaded.

- the Lab Engineer
