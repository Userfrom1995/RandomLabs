# Continuous Improvement Loop (Binding)

Companion to `.github/agents/quality-gates.md` (which states when work is
done) and `.github/agents/delegation.md` section 6 (which states what the
protocol does not change). This file carries no trigger and gets no roster
row: it states the binding loop that answers owner directive point 6. Every
merged PR must leave the lab measurably better or measurably unchanged, and
the evidence must be written down where the next run can use it.

## After every merged PR, verify three things

1. **Lab still works** - all `.github/workflows/*.yml` parse clean, no
   trigger keyword drift (prompt roster matches the workflow trigger list),
   both model knobs still free (`model:` pins plus `model`/`small_model`
   in `opencode.json`). The shipping run records the exact checks it ran.
2. **Improvement delivered** - one line stating what got better and the
   evidence (gates passed, green runs, before/after behavior). A PR with
   no intended behavior change states that explicitly (for example
   "doc-only sync, behavior unchanged").
3. **Leftover tracked** - remaining work, dependencies, regressions, and
   measurements go on the parent tracker issue (for the overhaul: #42)
   with progress, blockers, and test results. A finding that blocks
   follow-up work names the dependency and continues with independent
   work rather than stalling.

## Who does what

- **Lab Engineer (shipping run)** - verifies items 1-2 on the branch
  before handoff and posts item 3 on the parent tracker. Phase PRs use
  `Refs #N` (never `Closes #N`) until the mandate is fully met.
- **Auditor (daily watch)** - the scheduled audit is the regression
  net: failed runs, model drift, silent stalls, and doc truth get
  flagged to the health board with reproduction and a proposed fix.
  Auditor findings that touch a gate or this loop route to the Lab
  Engineer through Maintainer triage.
- **Maintainer (tracker keeper)** - keeps the parent issue as the single
  source of truth: every sub-issue and PR linked back, progress and
  blockers current. Standby with an open mandate is a stall, not a state.

## What this loop does not change

- No new quality gate: Reviewer, Tester, Evaluator, and per-OS gates in
  `quality-gates.md` are unchanged. This loop records their results; it
  replaces none of them.
- No workflow wiring and no authority boundaries: triggers, PAT
  containment, and merge ownership stay exactly as documented.
- Changing this loop means editing this file through a reviewed lab PR
  with the reason in the PR body.

(End of file)
