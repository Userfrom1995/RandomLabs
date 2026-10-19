# Decision: correct the #653 incident attribution across docs and PR #654

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-18T11:40:19Z
- **Applies to:** PR #654 / issue #653
- **Status:** accepted

## What was decided

The Tester review of PR #654 head `78b57e6e` found the runtime hardening
independently clean and mutation-proof but raised blocking
documentation-evidence findings: the incident narrative misattributed a
429-then-stall death to the ISE class, and misattributed the ISE
quick-death cluster to the 60-minute stall class. The empirical ledger is
the lab's method, so the narrative is corrected everywhere it appears:

- `AGENTS.md` (the issue #653 entry): the stall clause now carries only the
  two verified stall incidents (eval 39094600854, 46 silent minutes;
  Maintainer 39104661889, 429 terminal line at 06:37:19Z then 60 silent
  minutes until the agent-step timeout), and the ISE quick-death cluster
  moved into the 429/5xx clause with its measured durations.
- `LAB.md` (the #653 architecture section): same correction; the ISE
  cluster evidence now sits with the 429/5xx detector it motivated.
- `.github/agents/decisions/lab-engineer/2026-10-18T10-19-00-provider-stall-and-http-retry.md`:
  root-cause bullets and the evidence list rewritten to the same verified
  truth table; the run that note previously cited as a ninety-second ISE
  death is in fact the canonical hybrid incident (429 terminal line at
  06:37:19Z, then a 60-minute silent stall until the step timeout).
- `.github/agents/decisions/lab-engineer/2026-10-18T11-14-27-provider-stall-http-retry-review-fixes.md`:
  the bare `M1`-`M9` mutation IDs are replaced with descriptive mutation
  names, matching the Semantic Phase Naming rule (no bare robotic
  numbers in decision logs).
- PR #654's body: same evidence corrections via `gh pr edit`.

The code comments were already correct (`action.yml`'s #653 comments name
39104661889 as the 429-then-silent-stall incident and the cluster as ISE
terminal deaths; `maintainer.yml`'s describe the same classes without run
IDs), so no code changed in this pass. R15 and
the audit semantics are untouched; the Reviewer re-verifies per the normal
loop.

## Verified truth table (primary, from `gh run view --log` and run metadata)

- Stall class (what the watchdog bounds):
  - eval 39094600854: started 03:43:05Z, stalled ~04:12:38Z, ~46 silent
    minutes until the then-75-minute cap (ended 04:58:33Z).
  - Maintainer 39104661889: `AI_APICallError: Rate limit exceeded. Please
    try again later.` at 06:37:14Z/06:37:19Z (with the
    `FreeUsageLimitError` envelope), zero `Internal Server Error` lines,
    then no output until the agent-step timeout
    (`##[error]The action 'Run Maintainer agent' has timed out after 60
    minutes.`, 07:37:20Z; run failed 07:37:37Z).
- 429/5xx terminal class (what the anchored detector bounds):
  - Maintainer 39104661889's 429 line above (shared incident: its
    terminal line is the HTTP class, its silence is the stall class).
  - maintainer 39104695066: attempt 1 died on
    `AI_APICallError: Internal Server Error` (first ISE line 07:37:52Z,
    no decision file); the owner re-ran it as attempt 2 (08:03:16Z),
    which recovered after transient ISE lines from 08:03:35Z.
  - the 2026-10-18 quick-death cluster: eval 39110580426 (91-94 s),
    lab 39110581700 (91 s), maintainer 39110680183 (98 s), and
    maintainer 39110681392 (199 s), each failing on
    `AI_APICallError: Internal Server Error` with no decision file
    (first cluster ISE lines 08:13:09Z-08:16:16Z).

## Evidence

- Primary re-fetched all seven run logs and the run metadata tables above
  with `gh run view --log` / `--json startedAt,updatedAt` on 2026-10-18 and
  matched every cited timestamp and phrase, independently reproducing the
  Tester's findings F1-F5 before editing.
- The PR body correction is applied via `gh pr edit` (bot identity,
  `pull-requests: write`).
- Post-edit scan: the shipped docs (`AGENTS.md`, `LAB.md`, and both
  earlier lab-engineer decision notes) carry no remaining occurrence of
  the old misattribution (the false ninety-second ISE claim, the
  "before 08:16Z" bound, and the stall clause naming the ISE cluster), and
  the lab-engineer decision notes carry no bare `M<number>` mutation IDs.
  This correction note names the old wording only where needed to say what
  changed.

## Delegation ledger

- Primary verified every incident fact directly against the live run logs
  and metadata, made all corrections, and re-scanned the tree.
- Verification was primary-only by design for this docs-only pass: the
  primary re-fetched every cited run log and run metadata directly from the
  GitHub API, and no independent harness or subagent scope applied, so none
  was dispatched.
- Skills: no skill fits (GitHub Actions lab infrastructure, not opencode
  configuration of this workspace).

- the Lab Engineer
