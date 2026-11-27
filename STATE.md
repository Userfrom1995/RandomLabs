# STATE

Last updated: 2026-11-27T08:02Z by run 45961614607

(07:53Z owner summon on the health board, the first real session since the 04:31Z heartbeat. Both 04:40Z draws died on the provider daily free-usage wall at 04:49Z (quality) and 05:02Z (infrastructure); this run re-arms exactly one fresh draw per lane after the 07:12Z/07:17Z scheduled passes completed.)

## TL;DR for the next Hephaestus

- **This was the 07:53Z owner-triggered session (`45961614607`) on #70.** The 04:31Z heartbeat (`45940412102`) published its note at 04:40:38Z and triggered one quality draw on #865 and one infrastructure draw on #812; both died on the wall at 04:49:23Z and 05:02:45Z, and the intakes `45942185588`/`45943470936` recorded them. No real session since.
- **Retry-after evidence:** the 04:49Z response carried `retry-after` 72454s (~20.1h, ~00:57Z on 2026-11-28); the 05:02Z response carried 69069s (~19.2h, ~00:14Z on 2026-11-28). Diagnostic only; the fresh-run lottery is the recovery.
- **#865 is merge-ready except the quality gate:** head `818de0af3`, review approved 11:46:54Z, test approved 12:00:52Z, no `/oc fix`, CLEAN/MERGEABLE against main `de728de5f`, checks trigger/comment/GitGuardian SUCCESS, deploy SKIPPED. The branch is 2 commits on `e4844201`, 11 behind main, so the PAT rebase path is the merge route. On a head-bound `approve-eval` and handoff, verify the merge preflight and the PAT sweep; then #864 closes. On another wall death, re-arm one fresh eval on the next wake.
- **#812's lab pass restarts from scratch:** no branch was pushed across five draws, all wall deaths. On a push, review -> test -> quality -> merge; the R11 scoping fix plus the LAB.md fold-in.
- **Main `de728de5f`; `maintainer/logs` tip `9552bddd`.** Models 110/10 free; ladder 3/3 live; allowlist 19/19 + maintainer; board resolves `70`; production 200; preview #865 200; held 0; the seven stale queued runs unchanged.
- **Schedule:** the daily health audit landed 07:12-07:53Z and the curator 6-hour tick landed 07:17-07:29Z, both success; the maintainer 20-minute cadence produced no tick between 01:56Z and the 04:31Z heartbeat and none before this 07:53Z owner summon. Platform throttling pattern; watch item, not a defect.
- **Do not duplicate:** no review/test on #865 (both current on the unchanged head); the queue (#814, #849, #857, #856, #860, #773, #774, #742) stays behind #812; no public-surface draw.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the lab engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due.

## Right now (surveyed 07:53-08:02Z on 2026-11-27)

### GitHub state

- **Main:** `de728de5f9e01c43ae5c2e6fc8ea37914b6412a9` (the #854 rebase merge; unchanged since 11:28:48Z on 2026-11-26). **`maintainer/logs` tip:** `9552bddd` (the 04:40Z heartbeat publish plus the 04:49Z/05:03Z intake markers).
- **#865:** head `818de0af3b72d044d499594c544b14c06d28f504`, CLEAN/MERGEABLE against `de728de5f`, 2 files +275/-16 (`.github/scripts/silent-stall-audit.sh`, `.github/workflows/maintainer.yml`). Review APPROVED at 11:46:54Z; test APPROVED via the machine-published `/oc approve-test` marker at 12:00:52Z. Checks: `trigger`, `comment`, GitGuardian SUCCESS; `deploy` SKIPPED. The 12:06:14Z, 18:46:03Z, 21:22:10Z, 02:06:25Z and 04:40:39Z `/oc eval` triggers spawned `45816544966`, `45878527521`, `45897661732`, `45926376258` and `45941337060`; all died on the provider wall (12:09:23Z, 19:03:24Z, 21:44:40Z, 02:17:49Z and 04:49:23Z) with no verdict, no marker, and no forward. No `/oc fix` anywhere in the thread; `closingIssuesReferences` lists only #864. Body carries the delegation ledger, skills note, sign-off, `Closes #864`, and the cosmetic `Closes #865` footer.
- **#812:** open; the 11:37:55Z, 18:46:04Z, 21:22:11Z, 02:06:26Z and 04:40:40Z `/oc lab` triggers spawned `45812338702`, `45878530023`, `45897664964`, `45926377879` and `45941338841`; all five ran long (1h39m, 37m, 17m, 22m and 22m) and died on the wall (13:17:06Z, 19:23:31Z, 21:39:13Z, 02:28:28Z and 05:02:45Z). None wrote a decision file, the push step was skipped, and no branch exists. The next lab pass starts fresh.
- **Open PRs (2):** #865 and #821 `dce109e4479b3cf2801a1b0127ea98778e58c398` (parked, untouched since 2026-11-07).
- **Open issues (23 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #812, #814, #831, #836, #849, #856, #857, #860, #864. #70 is the only `lab-health` board; #42 is the only `brainstorm` issue; #864 stays open until #865 merges.
- **Board invariant holds:** `health-board.sh` resolves `70`; only #70 carries `lab-health` and the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest board notes before this run: the 04:49:59Z and 05:03:28Z wall intakes, the 07:53:08Z daily audit, and the 07:53:40Z owner `/oc maintainer`. This run's note is the board comment.
- **Latest comments:** the 07:53:40Z `/oc maintainer` on #70; the 04:40:39Z `/oc eval` on #865; the 04:40:40Z `/oc lab` on #812. No human comment after 07:53:40Z.
- **Branch tips:** main `de728de5f`, `maintainer/logs` `9552bddd`, #865 `818de0af3`, #821 `dce109e4`, the landed selector branch `opencode/lab-848-shared-health-board-selector` at `c1040c0c` (intact), the #859 branch `opencode/issue858-curate-umbra-count-copy` at `9b862e48` (never delete), the #854 branch `opencode/issue803-20261115060707` at `d449afb9` (archival). No #812 branch. No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3). **In progress:** this run. **Pending:** none.
- **This run:** `45961614607`, `issue_comment` on #70, created 07:53:43Z; trusted pre-agent checkout main `de728de5f`; session tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **#865 quality `45941337060`:** failure. The 04:40:39Z trigger spawned it at 04:40:42Z; the agent hit the provider daily free-usage wall and the run ended failure at 04:49:23Z with no verdict and no marker. The response carried `retry-after: 72454` (~20.1h, pointing to ~00:57Z on 2026-11-28).
- **#812 infrastructure `45941338841`:** failure. The 04:40:40Z trigger spawned it at 04:40:43Z; the agent hit the same wall and the run ended failure at 05:02:45Z with no decision file, no push, and no branch. The response carried `retry-after: 69069` (~19.2h, pointing to ~00:14Z on 2026-11-28).
- **Intakes:** `45942185588` (workflow_run, 04:49:42Z-04:50:14Z, success) posted the 04:49:59Z #70 note for the quality death; `45943470936` (workflow_run, 05:03:11Z-05:03:43Z, success) posted the 05:03:28Z #70 note for the infrastructure death. Neither chained a fresh draw: the failed eval/lab workflows do not write the maintainer inline runner's `.maintainer/quota-wall` marker, so the intake's marker-gated recovery step is a no-op on its fresh workspace. Record for #836.
- **Scheduled passes:** the daily health audit `45956896881` (schedule, created 07:12:43Z, success at 07:53:44Z) posted the 07:53:08Z daily report: 769 runs in the last day, 48 success, 16 failure, 100 cancelled, 604 skipped; 14 failures are the free-usage wall (eval 7, lab 5, curator 1, review 1) and 2 are transient deployment-artifact misfires that self-healed; no new bug. The curator six-hour tick `45957449600` (schedule, created 07:17:32Z, success at 07:29:05Z) landed. Both show the pinned free model was serving in the 07:12-07:53Z window.
- **Recover arm:** no new heartbeat dispatch since the 04:31Z wake; this was an owner summon. Held runs 0.
- **Schedule health:** maintainer schedule ticks at 01:56:34Z and 18:37:52Z (2026-11-26), plus the 04:31:09Z heartbeat and this 07:53:43Z owner run; no maintainer schedule tick between 01:56Z and now. The daily health audit's 00:00Z tick landed at 07:12Z today, and the curator 6-hour tick landed at 07:17Z, so the earlier missing-tick pattern is easing. Platform delay pattern; watch items, not workflow defects; the Auditor's lane owns schedule health.
- **Pages:** production root HTTP 200 on `de728de5f`; preview `/preview/pr-865/` HTTP 200; the last main deploy `45810953211` succeeded at 11:29:28Z (no main move since).
- **Model registry:** 110 / 10 free at 07:55Z; pin and `small_model` `opencode/deepseek-v4.1-flash-free`; all 20 workflow `model:` inputs use the same free pin; the three ladder rungs (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`) are live; `maintainer.yml` `REQUESTED_MODEL` is the same free pin. No upgrade.
- **Allowlist:** 19 names on `main` plus the self-excluded maintainer = 20 repo-managed; live 23 = those 20 plus Dependabot Updates, Dependency Graph, and pages-build-deployment; zero missing, zero extra.
- **Setup:** `bash setup.sh --check` exits 0; the only warning is the known branch-protection note.

### Live lanes and their next step

- **#865 / #864 (comment-poster fail-closed):** QUALITY GATE re-armed this run on `818de0af3`. On the head-bound `approve-eval` marker and the `/oc maintainer` handoff, verify the merge preflight (canonical marker shape, `eval-head`/`eval-trigger` binding, test marker current, no newer `/oc fix`), confirm the hardened PAT sweep merged on the rebase path (never `--delete-branch`), and close #864. On another wall death, no same-pool retry; re-arm exactly one fresh eval on the next wake.
- **#812 (R11 audit bypass):** LAB re-armed this run from scratch. On a push, the workflow forwards a fresh review; then test, quality, merge. The fix: scope the R11 extraction to the unique `lab:` job, pin the linkage-guard ordering, add the decoy and ordering mutants, and fold in the LAB.md correction.
- **#803:** CLOSED at 11:28:48Z on 2026-11-26 via the #854 merge. Do not re-open.
- **#814 (fail-open baseline read):** next after #812; includes the three-site resolver `createdAt` addendum, the deferral page-size wording, and the review/test non-blocking observations.
- **#849 (fail-loud hardening):** after #814.
- **#857 / #856 / #860 (fail-loud backlog):** serialized after #849.
- **#773/#774:** the LAB.md read-only-scope contradiction plus the phantom step reference, and the stale `setup.sh --check` roster; parked as the post-delivery batch.
- **#742 remainder (tracker):** open; the candidate lane for the remaining owner-credential steps and follow-ups, including the lab.yml PR-thread linkage guard.
- **#836 (capacity):** open for the Owner capacity decision. The per-egress-IP wall remains the only fix that ends the recurrence; no new lab dispatch beyond #812 and #865.
- **#821 / #792** (Maze Chase Windows harness): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw per lane; no same-pool burst. The #865 quality draw and the #812 infrastructure draw are the only live lanes after this run.
- **Cooldowns:** the last eval trigger was 04:40:39Z; the last lab trigger was 04:40:40Z; both 30-minute windows expired at 05:10Z. This run's triggers are the only new draws; do not dispatch a second eval or lab while these are live or queued.
- **Wall rule:** the wall is per egress IP. It killed the 04:40Z pair (quality 04:49:23Z, infrastructure 05:02:45Z) after the 02:06Z pair (02:17:49Z, 02:28:28Z) and seven earlier agent draws on 2026-11-26. The retry-after headers now point ~19-20h out (~00:14-00:57Z on 2026-11-28), but they are diagnostic only and never a park horizon; a fresh wake on a new runner is the designed recovery, not a same-pool retry. The 07:12Z daily audit and 07:17Z public-surface pass both completed, so the model was serving in this window. If both fresh draws die, stop and wait for the next wake; do not burst.
- **Checkpoint rule:** if a lab head advances with partial commits and a pass dies without signalling review, do NOT dispatch a review on that partial head. Only a `review` signal (or an explicitly complete pass) authorizes the review/test/eval chain.
- **Review retry rule:** the review workflow has its bounded auto-retry chain (the #754/#827 rule), but the #865 thread's lifetime budget is spent; a wall death needs a Maintainer re-arm, not an auto-retry. Do not dispatch a duplicate while a review run is live or queued.
- **Test rule:** the test workflow has no in-workflow retry chain; every wall death needs a Maintainer re-arm. The #865 test already approved; no further test on this head is needed unless the head moves.
- **Eval retry rule:** the eval lane has no in-workflow auto-retry chain; if the dispatched eval dies on the wall or crashes without a decision, the next Maintainer wake re-arms exactly one fresh eval on the same head after confirming no live or queued eval.
- **Public-surface rule:** the scheduled public-surface arm has a bounded self-heal of 1; the 07:17Z tick landed clean. The next six-hour tick is the recovery window; do not draw a third time in the same window.
- Do not dispatch #814/#849/#857/#856/#860/#773/#774/#742 until #812's lane is known (merged or verdict); #865 is the one parallel exception because its R30 region and `maintainer.yml` surface do not overlap #812's R11 region.
- Never merge without a head-fresh test marker and a head-bound quality approval. Workflow-touching PRs merge only through the hardened PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#865:** quality live on `818de0af3` (this run's dispatch); on the head-bound quality approval, verify the merge preflight, merge through the PAT sweep, and close #864. On a wall death, re-arm one fresh eval on the next wake.
2. **#812:** lab live from scratch; on a push, review -> test -> quality -> merge. The R11 scoping fix plus the LAB.md fold-in.
3. `{"action":"lab","issue":814}`: after #812; fail-closed baseline read in the fix lane, add `createdAt` to all three pre-existing resolver `--json` lists, and update the R32 pins in lockstep.
4. `{"action":"lab","issue":849}`: after #814; on a push, the review/test chain; re-arm its wall-killed trigger.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856.
8. `{"action":"lab","issue":773}`: after #860; correct the LAB.md read-only scope claim and the phantom step reference; R1-R37 audit and pins in lockstep.
9. `{"action":"lab","issue":774}`: after #773; extend `setup.sh --check` to the full current roster and workflow set.
10. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups, including the lab.yml PR-thread linkage guard; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #865: quality live; on the head-bound quality approval, verify the merge preflight and the PAT sweep; on a wall death, re-arm exactly one fresh eval on the next wake.
2. #812: lab live from scratch; verify the pass pushes and the review forward fires.
3. #865's body carries the cosmetic `Closes #865` footer appended by the lab workflow's linkage guard; the review accepted it (the authored artifact ends with the sign-off) and `closingIssuesReferences` lists only #864. No body-only pass needed; fold the guard fix into the #742 remainder.
4. The lab.yml linkage guard is a real workflow defect: on a PR thread it appends `Closes #<PR>` because the trigger number is the PR. It should skip PR threads or use `Refs`. Fold into the #742 remainder or the next lab round.
5. #803 is closed by the #854 merge; #854's branch is intact at `d449afb93`; main is `de728de5f`.
6. The review and test on #865 listed seven non-blocking observations (mock interception proof is count-based; retry-on-empty can duplicate on a lost response; whitespace-only comment/ping skip; unparseable decision-file path; id 0 treated as failure; pre-existing paths unchanged). Fold into the next lab round; no new issue while #864's repair merges.
7. The pre-existing resolver sites (`opencode.yml` baseline/phase resolvers and the review linked-PR resolver) still need the `createdAt`/`--limit 100` corrections; all fold into #814 with the pins.
8. The 15:46Z post failure has its tracking issue (#864) and its repair PR (#865); the poster's success line remains untrusted until #865 merges.
9. #853, #848, #815 and #803 are closed; #864 stays open until #865 merges; #831 is bookkeeping only.
10. Pages: production 200 on `de728de5f`; preview #865 200.
11. #836 stays open for the Owner capacity decision; no new lab dispatch beyond #812 and #865.
12. Model registry drift: 110 / 10 free at 07:55Z; the ladder is 3/3 on main and all three rungs are live. No lab dispatch.
13. #821 stays parked; the Maze Chase standing set is frozen unless the Owner asks.
14. The seven stale queued runs are unchanged; do not cancel or re-dispatch them.
15. Memory: the 2026-11-25 file carries the 02:36Z session, the three run markers, the 05:01Z, 08:05Z, 10:10Z, 10:56Z, 11:12Z, 12:15Z, 12:46Z, 13:11Z quota marker, 15:46Z, 17:07Z, 17:56Z, 18:22Z, 21:12Z, 21:18Z, 21:32Z and 21:49Z sessions/markers; the 2026-11-26 file carries the 00:03Z session, the 00:44Z intake marker, the 03:38Z session, the 04:08Z intake marker, the 08:01Z session, the 08:36Z session, the 08:57Z quota-intake marker, the 09:00Z session, the 09:45Z intake marker, the 10:06Z session, the 10:24Z session, the 11:19Z session, the 11:28Z session, the 11:46Z session, the 12:00Z session, the 12:09Z/13:17Z intake markers, the 18:37Z session, the 19:03Z/19:23Z/21:15Z intake markers, the 21:15Z session, and the 21:39Z/21:44Z intake markers; the 2026-11-27 file carries the 02:02Z session, the 02:17Z/02:28Z intake markers, the 04:31Z heartbeat session, the 04:49Z/05:03Z intake markers, and this 07:53Z session. Append-only, keep-both.
16. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round.
17. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
18. The merged tree carries the R26 canonical manifest in lockstep with `maintainer.yml`; the next lab pass must regenerate it if it edits that file. #865 updates the R26 pre-handler manifest and the R30 poster block SHA; the review and test verified them on the head; verify again on merge.
19. No `emergency.json`: the maintainer workflow is alive, production is serving, and no failed lab attempt is being bypassed.
20. The general job's contains-based matcher fired again on the 2026-11-26 eval approval report; watch item for a future lab round, no new issue.
21. **Resolver addendum:** three pre-existing resolver sites remain on the head, `opencode.yml:839` (the baseline resolver the reviewer cited at `:838` on main), `:1162`, and `:1397`; all sort by `.createdAt` without requesting it. Fold all three plus pins into the #814 fix-lane hardening pass.
22. **Design-lane note:** a manual design trigger placed on a PR thread would day-scope there; the designed issue invocation and the phase-completion forward are unaffected. No action now.
23. **Eval recovery watch:** the eval dispatch is for #865 now; next is #812 after its test approval.
24. **Test-lane auto-retry gap:** the test workflow has no in-workflow retry chain (unlike review), so every wall death needs a Maintainer re-arm. The eval lane shares the gap. Watch item for the next lab round; no duplicate issue while #836 is open.
25. **Public-surface self-heal cap:** the cap of 1 worked as designed on 2026-11-26 (one re-dispatch, then escalation). The 07:17Z six-hour tick landed green; the next tick is the recovery. Fold into the #836 capacity decision if the recurrence grows.
26. **Quota intake behavior:** the 04:49Z/05:03Z intakes skipped the agent and posted the audit notes but chained no fresh draw; the failed eval/lab workflows do not write the maintainer inline runner's `.maintainer/quota-wall` marker, so the intake's marker-gated recovery step is a no-op on a fresh workspace. The owner summon (or the recover-arm heartbeat) is the actual re-arm. Record for the #836 capacity decision; no new issue.
27. **Intake memory gap:** the intakes appended only their run markers and did not refresh STATE.md. Watch whether future intake publishes do the same.
28. **Wall-duration variance:** the 04:40Z pair died at 9m (quality) and 22m (infrastructure); the 02:06Z pair at 11m and 22m; the earlier #812 draws ranged 17m to 1h39m. Record for the #836 capacity decision; do not change the single-draw rule.
29. **Comment-poster lane:** #864's repair (#865) executes the real poster against a mock `gh` and fails closed on an empty/unparseable body or exhausted retries; the R30 fixture now covers the idless, mixed-sticky, and signed-ok cases. The trigger poster's non-fatal error path folds into the next lab round.
30. **#865 review/test observations:** the whitespace-only `comment.md`/ping skip and the unparseable `decision.json` exit-0 path are still open silent paths adjacent to #864; an Owner follow-up, no new issue.
31. **Schedule-throttling watch:** the 20-minute maintainer cadence produced no tick between 01:56Z and this 07:53Z owner summon; the daily health audit and curator six-hour tick both landed today after earlier delays. The pattern matches platform delay; the Auditor's lane owns schedule health; no dispatch this run.
32. **This run's comment:** the #70 note records the two wall deaths, the retry-after evidence, the single fresh draws, the schedule watch, and the next gates; it names no agent/workflow/model, carries no trigger token, and ends with the sign-off.

## Standing rules I operate under

### Safety and autonomy

- Never post issue or PR comments directly; the only public artifacts are the files under `.maintainer/`. Never create an issue or PR, never run git commit/push/branch commands, never touch the brain, never `@copilot`, and never spawn a Copilot review. Never mention an agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception).
- Protected paths: `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, `LAB.md` (also `.github/scripts/` as touching credential wiring). Changing them requires the full review/test/eval chain and a PAT-backed push. The agent-write App token cannot push workflow files, so expect a public push-rejection on the branch; the lab's hardcoded PAT step performs the actual push.
- Unattended runs: an unattended ownerless PR is not consent. Never merge without a head-fresh test marker and a head-bound quality approval, and never bypass branch protection.
- Emergency revival (`emergency.json`) only when the maintainer workflow itself is dead, no maintainer run is pending, and the recover heartbeat has not restored it. Not applicable in this run.

### Trigger and token discipline

- Use only the agent trigger comment formats; correct token, correct target, own line. Never a freeform issue ask.
- The #775 rule: no inline trigger tokens in board notes, pings, or issue bodies. Trigger comments are the only place a token may appear.
- A ping triggers no workflow run; it is for the record and the humans. One ping per target per run.
- Do not claim a wall or lane is clear until multiple runs actually complete; correct false claims in the same thread first.
- Overlapping Maintainer sessions: before re-arming any lane, read the target threads for triggers newer than the loaded memory and treat them as live. A later session must not duplicate an earlier session's dispatches.

### Review, test, and merge gates

- Ship only on green build + CI, complete test suite with no new failures, behavior evidence, responsive accessibility, unified 8px spacing + iconography, and security.
- A failed build or CI is never acceptable just because it was already failing.
- Verify the CI workflow covers the pushed commit and required checks are green. Never merge with an in-flight required check or while the mergeable flag is `UNKNOWN`.
- Required checks only: deploy, test (ubuntu-latest, windows-latest, macos-latest), e2e.
- Merge preference is squash unless the PR's base branch explicitly requires another strategy; the repo's rebase-merge setting is the exception for this lane. The PAT sweep uses rebase then merge fallback with `--match-head-commit`.
- Delete branches only on merge, and only with explicit `--delete-branch`; the standing rule is never `--delete-branch` for the bot PRs.
- Ambiguous-rest notation: the eval/review agent comments carry a machine-readable decision block; read it before acting.
- Follow-up issues belong to the Owner, not the Maintainer.
- Do not dispatch a new project when all 3 project slots are full; record a wishlist item instead.

### Audit lane rules (current, from #798 and its reviews)

- Drive the pipeline but cap the audit loops: each lane gets at most two rounds per target, and max eight workflow triggers per PR or issue per Maintainer run. Fan out only when a leg is wall- or timeout-bound, the PR is freshly pushed, a gate flipped, a review branch awaits merge, CI healed, the PR is reopened, or a human asks. A wall always wins; no same-IP retry.
- The audit checks run in order: every run first confirms main is deployed and the site is reachable; then current-main issues and every open PR's rollup (missing/unknown checks block a merge); touching any protected path makes the branch lab-owned and requires the tester/evaluator chain; a PR with zero agent comments or all-green state is suspect; every check read must come from the PR's actual head, not the base; mergeable `UNKNOWN` waits for GitHub to resolve it; re-read the head immediately before merging; verify the merge conclusion; never cancel an in-flight required check; never `--admin` merge.
- The audit artifact contract: the payload files are `.maintainer/decision.json`, `comment.md`, `log-entry.md`, `state.md`, `personality.md`; `emergency.json` is revival-only. Write them, then stop.
- Liveness: `Last updated: <ISO8601 with minutes> by run <github.run_id>` exactly. Use `date -u`; a stale stamp must not continue.
- The log is append-only and never partial: carry the FULL day file and append; preserve what you found. The publish step hard-gates the six files, scans for leaked PATs/agent names, and recomposes on a fresh tip with keep-both semantics.
- The brain mounts read-only; edit workflows, not the brain. The anti-race retry re-materializes the brain and reapplies the delta on a fresh tip.
- The owner PAT lives in `.env` and is loaded by the hardcoded `pat-commit` step; never print or reference the value, and keep the `.env` gitignored. Unset PATs in agent shells fail closed (#742/agent-hsp).
- No comments: no maintainer text reaches GitHub except the output artifacts. The publish step posts only `comment.md` on the target PR, plus explicit `ping` targets.
- The pipeline hygiene rules: prompt/state numbers stay allowed; no em dashes in repo files; no trigger tokens in pings.

### Contract and memory

- This run is an owner summon on #70; the public artifact is the #70 board ping (decision.json `comment.md` target).
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure. This run posts the #70 board note.
- The pipeline is green on main (`de728de5f`; the new-main Pages deployment is live and the root is 200), and the platform is perf-sensitive: multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed the lab draws at 16:54:13Z, 23:15:37Z, 03:05:44Z, 05:10:20Z, 11:13:26Z, 13:17:06Z, 19:23:31Z, 21:39:13Z, 02:28:28Z and 05:02:45Z, the eval draws at 13:10:30Z, 21:48:51Z, 00:44:09Z, 04:07:07Z, 08:57:22Z, 09:44:22Z, 12:09:23Z, 19:03:24Z, 21:44:40Z, 02:17:49Z and 04:49:23Z, the test draw at 18:44:57Z, the public-surface draws at 21:17:41Z (2026-11-25) and 21:12:06Z/21:15:03Z (2026-11-26), the review draw at 10:31:16Z, and the auditor/curator draws at 07:15Z/07:21Z, while fresh runners completed the 12:15Z review, 12:46Z test, 16:00-17:08Z eval, 17:23-17:56Z repair pass, 17:56-18:22Z review, 21:12Z heartbeat, the 21:16-21:32Z test, the 00:03Z/03:38Z/08:01Z/08:36Z/09:00Z/10:06Z/10:24Z/11:19Z/11:28Z/11:46Z sessions, the 07:25Z/08:01Z auditor self-heal, the 08:12-08:53Z repair pass, the 09:29-10:06Z review retry, the 10:06-10:24Z lab pass, the 10:16-11:19Z quality draw, the 11:28-11:47Z review, the 11:47-12:00Z test, the 21:15Z public-surface schedule pass (before its agent was walled), the 04:31-04:40Z heartbeat session, and the 07:12-07:53Z daily audit plus the 07:17-07:29Z curator tick. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Watch the #865 quality draw on `818de0af3`. On the head-bound `approve-eval` marker and the `/oc maintainer` handoff, verify the merge preflight (canonical marker shape, `eval-head`/`eval-trigger` binding, head-fresh test marker, no newer `/oc fix`), confirm the PAT sweep merged on the rebase path, and close #864. On a wall death, re-arm exactly one fresh eval on the next wake.
2. Watch #812's lab pass. On a push, a fresh review follows; then test, quality, merge. If it dies on the wall, no same-pool retry; re-arm after the window on a later wake.
3. Verify this run's #865 eval and #812 lab triggers and the #70 board note posted; if not, correct in the next comment.
4. Public surface: no re-dispatch; the 07:17Z six-hour tick landed green; the next tick is the recovery window. If it dies on the wall, the self-heal caps and escalates here; triage as #836, not a defect.
5. Then the serialized queue: #814 (with the three-site resolver `createdAt` addendum, the deferral page-size wording, and the review/test non-blocking observations), #849, #857, #856, #860, #773, #774, then #742's remainder with the lab.yml PR-thread linkage-guard fix.
6. Keep #836 open for the Owner capacity decision; #831 is bookkeeping only; #848, #853, #815 and #803 are closed; #821 stays parked.
7. Verify the board invariant, allowlist, registry/ladder, live site, held runs, schedule health, and the delayed ticks at each wake; if clean, stand by.

## Open questions

1. Will the fresh draws land now that the 07:12Z daily audit and 07:17Z public-surface pass both completed, or is the wall still live for the eval/lab runners?
2. When does the per-egress allowance actually reset? The 04:49Z/05:02Z retry-after headers pointed ~19-20h out (~00:14-00:57Z on 2026-11-28); diagnostic only, never a park horizon.
3. Will #812 and #865 merge without a rebase conflict on `.github/scripts/silent-stall-audit.sh` (the R11 and R30 regions are disjoint, and GitHub reports #865 CLEAN/MERGEABLE against `de728de5f`)?
4. Should the eval/test lanes get a bounded in-workflow retry like review, or stay next-wake re-armed? Known gap; fold into the next lab round or #836.
5. Does the public-surface self-heal cap of 1 remain the right bound after a pool-wide wall? It behaved as designed on 2026-11-26; watch item; no duplicate issue while #836 is open.
6. Should the general workflow's contains-based matcher be fixed in the next lab round? It fired again on the 2026-11-26 eval approval report and spawned a redundant maintainer handoff.
7. Should #773/#774 stay as separate lab targets, or be folded into the #742 remainder when the backlog clears?
8. Why did the 20-minute maintainer cadence produce no tick between 01:56Z and this 07:53Z owner summon, while the daily health audit and curator six-hour tick landed today? Platform throttling is the likely cause; the Auditor's lane owns schedule health. Watch the next ticks; no dispatch.
9. Should the intake quota recovery be extended to failed eval/lab runs, or is the owner summon/heartbeat the right re-arm? The marker-gated step is a no-op on the intake's fresh workspace; record for #836.
