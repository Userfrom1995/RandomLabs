# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~19:31Z, maintainer run 32768632901, schedule/dispatched). Owner correction on #141 applied: `workflows: write` is NOT a valid GITHUB_TOKEN permission.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** brainstorm frozen; NO Ideator dispatches; NO new projects. Prism is the sole priority until M2 AND M3 genuinely pass dual-unit gates on real cjxl output. Infra reliability fixes are exempt.
- **BINDING TARGETS (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885. Corpus truth re-verified by round 4: e1 = 10.2904 / 3.4301; e3/e7 = 10.2861 / 3.4287 (~19 pct above parity at e1; net -6.7 pct bytes vs e7 baseline 11.026/3.675). Every claim cites fresh reproducible measurement in BOTH units.
- **#134 HOLD** stands (draft `c6adb5a6d4`, "wait for my action"); largely superseded by the 630dce1 model switch; owner decides disposition.
- **OWNER DECISION POINT (open, on #131/#130):** D4 stretch (levers <= 1-3 pct each vs M3 gap -15.9 pct) VS honest closure of #130 at net -6.7 pct with six directions measured shut. Executes only on the owner's word.
- **OWNER CORRECTION (2026-08-24T19:20Z on #141):** `workflows: write` is not a valid GITHUB_TOKEN permission in the workflow `permissions:` block. Verified against workflow syntax table (valid: actions, attestations, checks, contents, deployments, discussions, id-token, issues, packages, pages, pull-requests, repository-projects, security-events, statuses) and live `main` (`630dce1` declares only contents/issues/pull-requests/actions). Previous workflow file changes that landed were via owner direct push (`630dce1` by User1995) or Lab Engineer's PAT-backed runner step (`secrets.OPENCODE_PAT` workflow scope), never via GITHUB_TOKEN permission. Bot merges of workflow-touching PRs require owner manual click; there is no GITHUB_TOKEN permission to grant.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `630dce19bf86268650f73bad2083fdd0fc262bac`** (bootstrap `630dce1` + maintainer/logs). Pages green (last deploys 19:28-19:30Z). All three open PRs MERGEABLE per API.
- **MERGE-CAPABILITY LANE (corrected).** Platform-level block: GitHub App / GITHUB_TOKEN cannot create/update `.github/workflows/*` regardless of `contents: write`. No valid `workflows:` permission exists to add. The only paths are PAT-backed pushes (Lab Engineer runner) and owner manual merge clicks via UI/PAT. The `workflows: write` premise in PR #141's grant commit `66f1d95` and docs `d00186c` / `AGENTS.md:62` / `LAB.md:73` is invalid and must be reverted.
  - **#141 OPEN** (`opencode/issue70-20260824184700`, head `2a6e7c14a`, MERGEABLE): three commits - grant `66f1d95` (INVALID: adds `workflows: write` to lab.yml, maintainer.yml, opencode.yml, opencode-recover.yml), docs `d00186c`, relink `2a6e7c1`. Body `Closes #140` violates linkage discipline (#140 is a closed PR, not an issue). Review round completed 19:16Z with Finding 1 (body fix) routing to Lab Engineer; owner then fired `/oc lab` (run 32767195833 died rate-limited at 19:18Z) and `/oc maintainer` (this run's trigger at 19:20:10Z). This run dispatches Lab Engineer to strip the invalid scope, correct docs, and fix the body. Until owner manually merges the corrected PR, no bot merge of infra PRs is attemptable (disqualified strategy - two live refusals on #139 + platform docs).
  - **#139 OPEN** (`opencode/lab-137-session-death-resilience`, head `a4994c6cc6`, MERGEABLE per API, valid permissions block WITHOUT `workflows: write`): approved (round 3) + Tester PASS (18:35:27Z), no newer findings; newest comment error notice 18:48Z. Blocked solely on platform merge block - requires owner manual merge after #141 docs are corrected, then I merge it via bot? No - also requires owner click. Post-landing plan corrected: owner clicks merge on #139 once green; I verify main advance, CLOSE #137 AND #138 MANUALLY, verify-and-dispatch pages.
  - **#140 CLOSED by owner 19:09:16Z** - superseded by #141, no work lost (same branch).
- **Model watch:** stealth/ox-alpha burst today: four dead sessions (17:40 endpoint-unavailable; 18:09-18:24 x3; 18:59 rate-limit; plus 19:18 + 19:20 + 19:22 lab/maintainer rate-limits on #141). Every chain self-healed via crash-parity/auto-retry except the two latest lab rate-limits which are pending retry. Day-2 falsification watch active.

## IN FLIGHT
- **#141 Lab Engineer fix** - dispatched this run to correct invalid permission + docs + body; owns the PR in concurrency group opencode-issue70.
- **131-thread Lab Engineer session** (owner-fired 19:05:55Z) still in_progress per prior STATE - read its delivery next run (may have completed during this window - verify fresh).
- **#139** awaiting owner manual merge (approved+tested, blocked on platform).
- No other builds in flight repo-wide.

## PIPELINE POSITION (#130)
research DONE -> architect DONE (+rescope) -> build C0-C5 + D0-D3 COMPLETE -> REVIEW ROUNDS 1-4 DONE (round 4 CLEAN: fold independently re-derived incl. 12.61-11.48=1.13 and 12.98-11.51=1.47, canonical pair at all seven sites, F2 documented, 80/80 gtests, gates fail-capable both units; one non-blocking progress-file nit deferred) -> OWNER DECISION POINT -> freeze blocks any project merge regardless.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION (a) #141: read the Lab Engineer fix outcome on PR #141 (full timeline + job log). Verify: `workflows: write` removed from all four workflow files (grep at PR head), AGENTS.md/LAB.md docs corrected to PAT/manual-merge contract, PR body reads non-closing lineage (e.g., `Continues #140` / `Refs #70`, no `Closes` against #140 or #70), YAML parses clean, branch MERGEABLE. Then await owner manual merge click (do NOT bot-merge; disqualified). At merge, verify main advances past `630dce1` via contents API, then dispatch pages if silent.
2. FIRST ACTION (b) once #141 IS merged (owner click): verify docs live at ref=main, then ping owner to click merge on #139 (also workflow-touching, MERGEABLE at `a4994c6cc6`, approved+tested). After #139 merge, verify main advance, CLOSE #137 AND #138 MANUALLY (their Closes links are valid), verify-and-dispatch pages.
3. #131: read the 131-thread lab session's delivery; if owner ruled D4-vs-closure, execute immediately; else keep parked (round 4 clean; no continue into a parked clean build).
4. Model falsification watch day 2/3: stealth/ox-alpha rate-limit burst on #141 lab retries - if it recurs post-merge, escalate to lab with run IDs as provider-instability evidence; today's burst includes 19:18/19:20/19:22 on same pin.
5. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. Say the numbers every time.
6. Never fire duplicate lab triggers into the live #141 fix (concurrency group opencode-issue70 owns it); stand down on duplicates.

## ISSUES
- **#130 Prism** sole workstream (carried by #131), parked at the owner decision point.
- **#137 + #138** open awaiting #139 owner merge; I close them manually post-merge.
- **#70 (Lab Health)** PERMANENT pinned board - never let any PR body auto-close it.
- **#42 Brainstorm Board** frozen by owner directive.

## OPEN QUESTIONS
- Will the Lab Engineer strip the invalid `workflows: write` and correct the merge-capability docs on #141 cleanly?
- Will the owner click merge on #141 and #139 once green (both require manual PAT/UI path)?
- Owner ruling pending: D4 stretch vs honest closure of #130?
- What does the still-running 131-thread lab session deliver (if still live)?
- Does stealth/ox-alpha stay bursty/rate-limited under day-2 watch?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline (watch pagination traps) before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone.
- Closing keywords resolve against ISSUES only - check every PR body's linkage; `Closes <closedPR>` is a finding even if technically inert.
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a change as live until contents-API/grep confirms it at ref=main.
- Never fire into healthy automatic chains; duplicate pings resolve via stand-downs; ephemeral numbers are not evidence.
- A strategy that failed once is disqualified until its root cause is fixed (bot merges of workflow-touching PRs: disqualified - requires owner manual/PAT path; `workflows: write` permission idea is invalid).
- Verify permission names against GitHub's actual permission model before documenting them; previous workflow changes landed via owner direct push / PAT-backed runner, never via GITHUB_TOKEN permission grant.

- Mae, the Maintainer
