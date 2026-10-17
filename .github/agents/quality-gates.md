# Quality Gates (Binding Completion Criteria)

Companion to `.github/agents/delegation.md` section 7, which stays
normative for what this protocol does not change. This file carries no
trigger and gets no roster row: it states the measurable criteria that
decide when lab work is done. Work is never complete because an agent
finished its task; it is complete only when every applicable gate below
passes with its evidence artifact present.

## The gates (all must pass where applicable)

1. **Reviewer (strict gate, read-only)** - every checklist item in
   `.github/agents/reviewer.md` passes, including item 19 (delegation
   ledger and skills note present and threshold-justified). Verdict is
   `/oc approve` (clean) recorded as `{"action":"test"}`; any finding
   routes to Fixer (`/oc fix`), Builder (`/oc continue`), or Lab
   Engineer (`/oc lab continue` / `/oc lab fix review findings`) for
   infrastructure diffs. Approval without all items checked is invalid.

2. **Tester (dynamic hostile verification)** - the Tester actively tries
   to break the deliverable (boundaries, corrupt inputs, races, numeric
   limits) and records the run in `/tmp/live-run-evidence.json` with at
   least one real command on the shipped entrypoint (exit code plus
   output tail). Bare test-runner commands never count. Verdict is
   `/oc approve-test` (`{"action":"maintainer"}`). Infrastructure PRs
   (no app to run) use `{"scope":"infra","checks":[...]}` with the
   validation commands actually executed; a genuinely unrunnable
   environment declares `{"scope":"unrunnable","reason":"..."}` and
   scores honesty accordingly.

3. **Evaluator (binding Quality Council gate)** - after Tester approval,
   the Evaluator audits the 5 dimensions (empirical rigor, baseline
   parity, visual craft, adversarial resilience, reproducibility) with
   swarm subagents and writes `/tmp/evaluator-decision.json` with
   exactly one action: `{"action":"approve-eval",...}` or
   `{"action":"fix",...}`. `approve-eval` is hard-gated on the same
   live-execution evidence rule as the Tester (real entrypoint
   execution; infra `scope` escape only for infrastructure PRs).

4. **Per-OS testers (where applicable)** - Linux (`/oc test-linux`),
   macOS (`/oc test-macos`), Windows (`/oc test-windows`) verify
   every command and flag natively on their OS and feed reports to the
   Tester. Each arm's workflow posts the full signed findings comment
   from `/tmp/random-lab-findings.md` and verifies it by id (bot
   authorship, sign-off, exact body) before the arm can conclude
   (issue #608); aggregate from those comments, never from run logs.
   Failures route to Fixer or Lab Engineer. Single-platform
   projects record which OS gates ran and why others were out of scope.

## What "done" means

- Product PR: Reviewer `/oc approve` plus Tester `/oc approve-test`
   plus Evaluator `approve-eval`, each with its evidence file, then
   Maintainer merge. `Closes #N` only when all binding gates pass;
   otherwise `Refs #N` with negative findings logged.
- Infrastructure PR: Reviewer `/oc approve` (or `/oc lab` round-trip
   for fixes) plus Tester infra-scope evidence, then Maintainer merge.
   No capability is removed before its replacement is verified green.
- Phase PR (incremental overhaul): `Refs #N`, lab green, backward
  compatible, each gate's result tracked on the parent issue (#42)
  with progress, blockers, and test results, following the verify and
  track steps in `.github/agents/continuous-improvement.md`.

Adding or changing a gate means editing this file through a reviewed
lab PR with the reason in the PR body.

(End of file)
