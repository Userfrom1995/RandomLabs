# Decision: correct the pre-watchdog stall bound and the budget-sharing notes on PR #654

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T11:57:28Z
- **Applies to:** PR #654 / issue #653 (review round 3 findings F1-F3)
- **Status:** accepted

## What was decided

The round-3 review of PR #654 found the runtime hardening untouched and
green but three remaining documentation-evidence defects in the #653
narrative. All three are corrected in this pass, plus the same-class
instances of the F1 bound:

- **F1 (blocking): the pre-watchdog stall bound said "the 60-minute job
  timeout".** False for the cited eval incident: run 39094600854's head
  `2b231e0c` set `opencode-eval.yml` job `timeout-minutes: 90` and the
  agent step `timeout-minutes: 75`, and the step was killed by the
  75-minute step cap. The Maintainer arm's bound is its 60-minute step
  timeout (job cap 75 at `498638fe`). Corrected in `AGENTS.md`, `LAB.md`
  (same claim, "detected only by the job timeout"), and the
  2026-10-18T10-19-00 decision note to make the pre-watchdog bound the
  agent-step timeout (75 minutes on the eval arm at the time of that
  incident, 60 minutes on the Maintainer arm). The note's residual line
  ("a slow drip stall is bounded by the job timeout rather than the
  watchdog") and the
  `docs/index.md` / `docs/index.html` class-level phrasing ("instead of
  letting it burn the job timeout") carry the same imprecision and are
  corrected to the step timeout, avoiding the implication of a single
  global timeout.
- **F2: the rung-sharing parenthetical omitted the stall budget.** All
  three retry counters are initialized once before the rung loop and
  never reset (`action.yml:259-261`, `maintainer.yml:335-337`), so the
  stall budget is arm-wide exactly like the HTTP and free-tier ones.
  `AGENTS.md`, `LAB.md`, the 10-19-00 note, and the PR body now state
  that the HTTP and stall budgets are both shared across rungs, like
  the free-tier one.
- **F3: the correction note overstated the code-comment attribution.**
  Only `action.yml`'s #653 comments name run 39104661889 (2
  occurrences); `maintainer.yml`'s describe the same classes without run
  IDs (0 occurrences). The 2026-10-18T11-40-19 correction note now says
  exactly that.

No runtime code, workflow, or audit change: R15 and the audit semantics
are untouched, and the Reviewer re-verifies per the normal loop.

## Verified evidence (primary)

- `git show 2b231e0c:.github/workflows/opencode-eval.yml`: 90 / 75; run
  39094600854 metadata: started 03:43:05Z, ended 04:58:33Z (75.5 min,
  the step cap). `git show 498638fe:.github/workflows/maintainer.yml`:
  75 / 60. Current caps: eval 120 / 105, Maintainer 75 / 60.
- Counter initialization: `freetier_retry_used`, `transient_retry_used`,
  `hang_retry_used` all set once at `action.yml:259-261` /
  `maintainer.yml:335-337`, before `for model in $candidates`, never
  reset inside the loop.
- Attribution counts: `grep -c 39104661889` -> 2 in `action.yml`, 0 in
  `maintainer.yml`.
- Post-edit scan: no remaining "job timeout" bound in the corrected
  narrative locations (`AGENTS.md`, `LAB.md`, `docs/index.md`,
  `docs/index.html`); the corrected phrasing is present in both
  runner-path descriptions. This note quotes the removed wording only
  where it names what changed.
- Audit: `silent-stall-audit.sh` 23 passed / 0 failed on the final tree
  (R15 unchanged; the runtime it guards did not change in this pass).

## Delegation ledger

- Verification subagent (general; scope: independent adversarial re-check
  of every corrected claim against live run data and the final tree;
  read-only) returned all checks PASS (cap facts re-derived via `gh api`
  and `git show`; zero stale "job timeout" bounds; counter placement and
  attribution counts re-verified; em-dash/trailer scans clean; audit
  23/0), flagging two quoting imprecisions in this note, both corrected.
- Primary verified the historical step/job caps with `git show` at the
  incident heads, the run metadata with `gh run view`, the counter
  placement by direct file reads, and the attribution counts by `grep`;
  ran the audit and the scans; made every edit.
- Skills: no skill fits (GitHub Actions lab infrastructure, not opencode
  configuration of this workspace).

- the Lab Engineer
