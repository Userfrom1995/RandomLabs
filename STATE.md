# STATE

Last updated: 2026-11-28T07:27Z by run 46120788496

(07:20Z PR-open wake: the PR trigger workflow posted `/oc maintainer` on the new #869 (the roster and plan-alias lab PR), which was already in review (`/oc review` at 07:16:23Z, review run `46120435681` live). This run dispatched nothing, posted a #869 status note, and left the live lanes untouched: the #812 lab draw `46120776098` (re-armed at 07:20:42Z by the 06:58Z session), the review `46120435681`, and the auditor self-heal `46119019040`.)

## TL;DR for the next Hephaestus

- **This was the 07:20Z PR-open wake on #869** (`46120788496`). The PR trigger workflow posts `/oc maintainer` as the owner on every non-draft PR open or synchronize; the review was already requested by the lab workflow, so no duplicate review, test, or eval dispatch and no merge (no gates yet).
- **#869** is the #868 roster fix: `.github/agents/REGISTRY.md` Architect trigger cell now lists `/oc architect` and `/oc plan`, and `.github/agents/architect.md` names both aliases in its three trigger mentions; two files, +4/-4, head `66716de7`, CLEAN/MERGEABLE; review `46120435681` in progress.
- **#812** fresh draw `46120776098` is live (the 06:58Z session re-armed it at 07:20:42Z after the 04:40Z draw's 06:36Z wall death). Do not duplicate.
- **Auditor self-heal `46119019040`** is live (the 06:45Z pass failed at its #853 deferral guard after about 30 minutes; the retry passed the guard and is running its agent). Do not duplicate.
- **Main `7cfe4684d`; `maintainer/logs` tip `63ab851f`; models 110/10 free; ladder 3/3 live; allowlist 19 + maintainer + 3 managed = 23 live; board resolves `70`; production 200; held 0; the seven stale queued runs unchanged.**
- **Do not duplicate:** no review/test/eval on #869 while `46120435681` is live; no second #812 draw; no auditor dispatch; no queue advancement; no review/test/eval on #821 (parked); no public-surface draw; no ideation.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the lab engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due.

## Right now (surveyed 07:21-07:27Z on 2026-11-28)

### GitHub state

- **Main:** `7cfe4684d2ce6ea0ba17492c9b9889d91a1d31fb` (the #867 rebase merge; unchanged since 21:29:36Z on 2026-11-27). **`maintainer/logs` tip:** `63ab851fe8c0478a76236969ce1228a1b1b78002` (the 06:58Z session's publish at 07:20:39Z; its STATE stamp is 07:08Z by `46119028654`; the local memory bundle matches it).
- **#869 (new):** OPEN, created 07:16:22Z by `app/github-actions`; head `66716de7d1809295def7fc939ad3ae145c7431bd`; branch `opencode/lab-868-registry-plan-alias`; base `main`; CLEAN/MERGEABLE; one commit, two files, +4/-4. `.github/agents/REGISTRY.md` (+1/-1) adds the `/oc plan` alias to the Architect trigger cell; `.github/agents/architect.md` (+3/-3) names both aliases in the three trigger mentions. `Closes #868`. Checks: comment pass, trigger pass, maintainer pass, GitGuardian pass, deploy skipped. `/oc review` posted 07:16:23Z; review run `46120435681` in progress since 07:16:39Z. `/oc maintainer` posted 07:20:53Z by the PR trigger workflow; this run is its wake.
- **#868:** OPEN; the roster drift is fixed in PR #869; no further dispatch.
- **#812:** open; the last `/oc lab` trigger is 07:20:42Z (posted by the 06:58Z session's hardcoded step); the fresh draw `46120776098` is in progress since 07:20:48Z. Do not duplicate. The prior 04:40Z draw died on the wall at 06:36:05Z with no branch.
- **#821:** open, parked since 2026-11-07; CLEAN/MERGEABLE; no gates; do not touch.
- **Open issues (23 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #812, #814, #831, #836, #849, #856, #857, #860, #868. #70 is the only `lab-health` board; #42 the only `brainstorm`.
- **Board invariant holds:** `health-board.sh` resolves `70`; only #70 carries `lab-health` and the exact title. Newest note: the 07:20:42Z failure-triage note from the 06:58Z session.
- **Latest comments:** 07:16:13Z the #868 lab completion note; 07:16:23Z `/oc review` on #869; 07:20:42Z the #70 failure-triage note and `/oc lab` on #812; 07:20:53Z the auto `/oc maintainer` on #869; 07:20:55Z the preview comment. No new human comment beyond the owner triggers.
- **Branch tips:** main `7cfe4684d`, `maintainer/logs` `63ab851f`, #869 `66716de7`, #821 `dce109e4`, #867 `5db7a41d7` (intact), #865 `818de0af3` (intact), selector branch `opencode/lab-848-shared-health-board-selector` at `c1040c0c` (intact), #859 branch `opencode/issue858-curate-umbra-count-copy` at `9b862e48` (never delete), #854 branch `opencode/issue803-20261115060707` at `d449afb9` (archival). No #812 branch. No recovery due.
- **Held:** 0. **Waiting:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3). **In progress:** this run, review `46120435681`, #812 lab `46120776098`, auditor self-heal `46119019040`. **Cohort noise:** the 07:20:55Z worker fan-out (opencode-review `46120788604` and auditor `46120788561` pending, will skip at their guards; the rest skipped or cancelled).
- **This run:** `46120788496`, `issue_comment` on #869, created 07:20:55Z; trusted pre-agent checkout main `7cfe4684d`; the CLI bootstrap then checked out the PR head `66716de7` for the issue_comment context (issue #831 class); no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **Review `46120435681`:** in progress since 07:16:26Z (agent step since 07:16:39Z); the workflow has a bounded auto-retry chain. Do not duplicate.
- **#812 lab `46120776098`:** in progress since 07:20:46Z (agent since 07:20:56Z); the 07:20:42Z `/oc lab` from the 06:58Z session. Do not duplicate.
- **Auditor self-heal `46119019040`:** in progress since 06:58:14Z; the #853 deferral guard took about 30 minutes, then the agent started; watch its outcome.
- **06:58Z session `46119028654`:** completed success at 07:20:58Z; it posted the 07:20:42Z #70 note and the #812 `/oc lab`, and advanced `maintainer/logs` to `63ab851f` (memory commit at 07:20:39Z).
- **PR trigger:** `opencode-pr-trigger` posted `/oc maintainer` on #869 at 07:20:53Z (its designed owner wake on PR open); the cohort fanned out at 07:20:55Z and the worker guards skipped. The Deploy `46120791444` (workflow_dispatch on main) succeeded at 07:21:30Z (the preview staging deploy).
- **Failures on 2026-11-28 (3):** the 02:37Z lab `46098961105` (wall), the 04:40Z lab `46108627253` (wall), and the 06:45Z auditor `46118061616` (deferral-guard read). No new failure since.
- **Pages:** production root and `/docs/` HTTP 200 on `7cfe4684d`, both serving "competitive baseline integrity" with zero "scientific depth". The serving deploy `46070782929` at 21:31:27Z remains.
- **Model registry:** 110 / 10 free at 07:24Z; pin and `small_model` `opencode/deepseek-v4.1-flash-free`; the three ladder rungs (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`) are live; `maintainer.yml` `REQUESTED_MODEL` is the same free pin. No upgrade.
- **Allowlist:** 19 names on `main` plus the self-excluded maintainer = 20 repo-managed; live 23 = those 20 plus Dependabot Updates, Dependency Graph, and pages-build-deployment; zero missing, zero extra.
- **Setup:** `bash setup.sh --check` exits 0; the only notes are the known secrets-scope and branch-protection messages.

### Live lanes and their next step

- **#869 (roster alias, #868):** review `46120435681` is live. On approval the workflow posts `/oc test`; the test lane then runs on the same head, the Tester posts `/oc maintainer` on approval, this Maintainer dispatches the quality gate, and the merge follows on a head-bound approval. If the review dies on the wall, re-arm exactly one review on the same head after confirming no live or queued review.
- **#812 (R11 audit bypass):** the fresh draw `46120776098` is live. On a push, the workflow forwards a fresh review; then test, quality, merge. If it dies on the wall, no same-pool retry; re-arm on a later wake after the window.
- **#814 (fail-open baseline read):** next after #812; includes the three-site resolver `createdAt` addendum, the deferral page-size wording, and the review/test non-blocking observations.
- **#849 (fail-loud hardening):** after #814.
- **#857 / #856 / #860 (fail-loud backlog):** serialized after #849.
- **#773/#774:** the LAB.md read-only-scope contradiction plus the phantom step reference, and the stale `setup.sh --check` roster; parked as the post-delivery batch.
- **#742 remainder (tracker):** open; the candidate lane for the remaining owner-credential steps and follow-ups, including the lab.yml PR-thread linkage guard.
- **#836 (capacity):** open for the Owner capacity decision. The per-egress-IP wall remains the only fix that ends the recurrence; no new lab dispatch beyond #812.
- **#821 / #792** (Maze Chase Windows harness): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow or frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw per lane; the #812 lab lane is the only live infra draw; #869 is a separate docs lane in review; no product gate is live (the #867 lane is closed).
- **Cooldowns:** the last lab trigger was 07:20:42Z on #812; its draw `46120776098` is live. No second draw before this one lands or dies.
- **Overlapping sessions:** this run is `maintainer-869` (the PR-open wake). The 06:58Z `maintainer-main` session completed at 07:20:58Z and owns the #812 re-arm; this run does not duplicate it. The 07:03Z `maintainer-868` session completed at about 07:15Z and owns the #869 lab dispatch.
- **Wall rule:** the wall is per egress IP and resets on the provider's daily schedule. It killed the eval draws at 12:09:23Z, 19:03:24Z, 21:44:40Z, 02:17:49Z, 04:49:23Z, 08:20:40Z and 08:03Z, and the lab draws at 13:17:06Z, 19:23:31Z, 21:39:13Z, 02:28:28Z, 05:02:45Z, 08:29:54Z, 11:51:34Z, 14:46:36Z, 20:16:52Z, 21:17:30Z, 22:06:48Z, 02:47:26Z and 06:36:05Z; the retry-after headers are diagnostic only and never a park horizon; a fresh wake on a new runner is the designed recovery, not a same-pool retry. Do not burst.
- **Checkpoint rule:** if a lab head advances with partial commits and a pass dies without signalling review, do NOT dispatch a review on that partial head. Only a `review` signal (or an explicitly complete pass) authorizes the review/test/eval chain.
- **Review retry rule:** the review workflow has its bounded auto-retry chain (the #754/#827 rule), but a wall death needs a Maintainer re-arm, not an auto-retry. Do not dispatch a duplicate while a review run is live or queued.
- **Test rule:** the test workflow has no in-workflow retry chain; every wall death needs a Maintainer re-arm.
- **Eval retry rule:** the eval lane has no in-workflow auto-retry chain; if the dispatched eval dies on the wall or crashes without a decision, the next Maintainer wake re-arms exactly one fresh eval on the same head after confirming no live or queued eval.
- **Merge rule:** the PAT merge sweep only handles workflow-touching PRs; the Maintainer session merges every other approved PR with `gh pr merge --rebase --match-head-commit <head>` (never `--delete-branch`). #869 touches `.github/agents/**`, not workflows, so the session merge path applies after the gates. The app-token merge push fires no `push` run, so dispatch the Pages deploy after every merge and verify it.
- **Double-deploy note:** the hardcoded "Trigger pages deployment if main advanced" step also dispatches a Pages deploy when main moved during the run, so a session merge currently produces two deploys for the same SHA. The second can fail on the empty-artifact class; fold a dedupe into the next lab round.
- **Public-surface rule:** the scheduled public-surface arm has a bounded self-heal of 1; the 06:49Z tick produced #868 and handed it off. The next tick is the next recovery window.
- **Do not dispatch #814/#849/#857/#856/#860/#773/#774/#742 until #812's lane is known (merged or verdict).**
- Never merge without a head-fresh test marker and a head-bound quality approval.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#869:** review `46120435681` is live; follow test, quality, merge. If the review dies without a decision, re-arm exactly one review on the same head.
2. **#812:** the fresh draw `46120776098` is live; on a push, review -> test -> quality -> merge. The R11 scoping fix plus the LAB.md fold-in.
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

1. #867 is merged and #866 is closed; the branch is intact at `5db7a41d7`; do not delete it, re-open #866, or re-dispatch any gate on the merged head.
2. #869 is the #868 roster fix in review; the fix belongs to `.github/agents/REGISTRY.md` and `.github/agents/architect.md`; the `maintainer/logs` roster mirror is refreshed from `main`, so the source fix is sufficient. On merge, #868 closes via `Closes #868`.
3. #812: the 07:20Z fresh draw is live after the 06:36Z wall death and the 06:58Z session's re-arm. If it dies on the wall again, no same-pool retry; re-arm on a later wake after the window.
4. The 06:45Z auditor failure was the #853 stale-deferral guard's paginated `actions/runs` read failing closed (`could not list workflow runs`) after about 2m28s; the agent never started. The pass self-healed with `46119019040`, which passed the guard after about 30 minutes and is running its auditor agent; the failure did not reproduce. The guard's `--paginate --slurp` on `actions/runs?per_page=100` has no explicit cap; if the failure recurs, route lab to bound it (filter by head SHA or cap pages).
5. The 04:40Z #812 draw made real edits but pushed nothing; the work is lost and there is no branch to recover. Do not claim otherwise.
6. The 06:36Z quota intake again stood down and chained no fresh draw; its recovery step is a no-op because the intake workspace has no `.maintainer/quota-wall` marker (the known marker gap). This session's sibling 06:58Z run was the effective recovery path. Record for the #836 capacity decision; no new issue.
7. #865 is merged and #864 closed; the branch is intact at `818de0af3`; do not delete it, re-open #864, or re-dispatch any gate on the merged head.
8. The quality report's non-blocking items: the Maintainer prompt's spaced sign-off variant can append a cosmetic second sign-off; a NUL-byte body raises an uncaught ValueError (red, not a silent drop); the poster resolves `gh` from the ambient PATH; the whitespace-only `comment.md`/ping skip and the unparseable `decision.json` exit-0 path remain. Fold into the next lab round; no new issue while the backlog clears.
9. The pre-existing resolver sites (`opencode.yml` baseline/phase resolvers and the review linked-PR resolver) still need the `createdAt`/`--limit 100` corrections; all fold into #814 with the pins.
10. The fail-closed poster is proven live; the 11:36Z, 11:51Z, 14:47Z, 20:17Z, 21:09Z, 21:20Z, 21:33Z, 21:34Z, 21:41Z, 21:45Z, 22:07Z and 02:48Z notes all posted. Keep watching the next session's `comment.md` and pings for the success line.
11. #853, #848, #815, #803, #864 and #866 are closed; #831 is bookkeeping only.
12. Pages: production 200 on `7cfe4684d`; `/docs/` 200; `/preview/pr-867/` 404 by design (merged PR preview retired). The successful deploy `46070782929` at 21:31:27Z is the serving build; the duplicate `46071198260` failed on the empty-artifact class and changed nothing.
13. #836 stays open for the Owner capacity decision; no new lab dispatch beyond #812.
14. Model registry drift: 110 / 10 free at 07:24Z; the ladder is 3/3 on main and all three rungs are live. No lab dispatch.
15. #821 stays parked; the Maze Chase standing set is frozen unless the Owner asks.
16. The seven stale queued runs are unchanged; do not cancel or re-dispatch them.
17. Memory: the 2026-11-25 file carries the 02:36Z session, the three run markers, the 05:01Z, 08:05Z, 10:10Z, 10:56Z, 11:12Z, 12:15Z, 12:46Z, 13:11Z quota marker, 15:46Z, 17:07Z, 17:56Z, 18:22Z, 21:12Z, 21:18Z, 21:32Z and 21:49Z sessions/markers; the 2026-11-26 file carries the 00:03Z session, the 00:44Z intake marker, the 03:38Z session, the 04:08Z intake marker, the 08:01Z session, the 08:36Z session, the 08:57Z quota-intake marker, the 09:00Z session, the 09:45Z intake marker, the 10:06Z session, the 10:24Z session, the 11:19Z session, the 11:28Z session, the 11:46Z session, the 12:00Z session, the 12:09Z/13:17Z intake markers, the 18:37Z session, the 19:03Z/19:23Z/21:15Z intake markers, the 21:15Z session, and the 21:39Z/21:44Z intake markers; the 2026-11-27 file carries the 02:02Z session, the 02:17Z/02:28Z intake markers, the 04:31Z heartbeat session, the 04:49Z/05:03Z intake markers, the 07:53Z session, the 08:21Z/08:30Z intake markers, the 10:44Z session, the 11:19Z session, the 11:28Z session, the 11:51Z intake marker, the 14:18Z heartbeat session, the 14:46Z intake marker, the 19:50Z schedule session, the 20:16Z intake marker, the 21:00Z triage session, the 21:16Z handoff session, the 21:28Z merge session, the 21:34Z concurrent deferral session, the 21:35Z triage-plus-#812 session, and the 22:07Z intake marker; the 2026-11-28 file carries the 02:32Z schedule session, the 04:34Z heartbeat session, the 06:36Z intake marker, the 07:03Z #868 session, the 06:58Z failure-triage session, and this 07:20Z PR-open session. Append-only, keep-both.
18. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round.
19. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
20. The merged tree carries the R26 canonical manifest and the R30 poster block SHA in lockstep with `maintainer.yml`; the post-merge patch-ids prove the merged tree is the audited tree. The next lab pass that edits either file must regenerate them.
21. No `emergency.json`: the maintainer workflow is alive, production is serving, and no failed lab attempt is being bypassed.
22. The general job's contains-based matcher fired on the 2026-11-26 eval approval report and on the 2026-11-27 #867 approval; watch item for a future lab round, no new issue.
23. **Resolver addendum:** three pre-existing resolver sites remain on the head, `opencode.yml:839` (the baseline resolver the reviewer cited at `:838` on main), `:1162`, and `:1397`; all sort by `.createdAt` without requesting it. Fold all three plus pins into the #814 fix-lane hardening pass.
24. **Design-lane note:** a manual design trigger placed on a PR thread would day-scope there; the designed issue invocation and the phase-completion forward are unaffected. No action now.
25. **Eval recovery watch:** no eval is live; the #867 lane closed. The #869 quality pass follows its test approval.
26. **Test-lane auto-retry gap:** the test workflow has no in-workflow retry chain (unlike review), so every wall death needs a Maintainer re-arm. The eval lane shares the gap. Watch item for the next lab round; no duplicate issue while #836 is open.
27. **Public-surface self-heal cap:** the cap of 1 worked as designed on 2026-11-26. The 06:49Z tick on 2026-11-28 landed green and produced #868; the handoff run owns it. The next tick is the next recovery window.
28. **Quota intake behavior:** the 06:36Z intake again skipped the agent, posted the audit note, and chained no fresh draw; the intake workspace has no `.maintainer/quota-wall` marker, so its recovery step is a no-op (known gap). The 06:58Z session was the effective recovery path. Record for the #836 capacity decision; no new issue.
29. **Intake memory gap:** the 06:36Z intake appended only its run marker and did not refresh STATE.md. Watch whether future intake publishes do the same.
30. **Wall-duration variance:** the 04:40Z lab draw ran about 1h56m before the wall, the longest observed; the 02:37Z draw died at 10m; the 21:45Z draw died at 21m; earlier draws ranged 9m to 1h39m. Record for the #836 capacity decision; do not change the single-draw rule.
31. **Comment-poster lane:** #864's repair merged; the poster now executes the real code against a mock `gh` and fails closed on an empty or unparseable body or exhausted retries; the R30 fixture covers the idless, mixed-sticky, and signed-ok cases. The trigger poster's non-fatal error path folds into the next lab round.
32. **#865 review/test observations:** the whitespace-only `comment.md`/ping skip and the unparseable `decision.json` exit-0 path are still open silent paths adjacent to #864; an Owner follow-up, no new issue.
33. **Schedule-throttling watch:** the last recover-arm tick was 04:33:49Z; the expected ~06:03Z heartbeat did not fire. The 06:58Z failure trigger, the 07:03Z comment trigger, and the 07:20Z PR-open trigger are event-driven wakes, not schedule ticks. Platform throttling remains; the Auditor's lane owns schedule health; no dispatch this run.
34. **Comment-trigger burst:** the 07:03Z `/oc maintainer` on #868 spawned a batch of `maintainer-main` workflow_run runs (cancelled) plus the focused `maintainer-868` run `46119422300`; the 07:20:53Z PR-trigger `/oc maintainer` on #869 spawned this `maintainer-869` run plus a cohort of skipped/cancelled worker runs. This is designed concurrency behavior, not a defect.
35. **This run's artifacts:** `decision.json` is `[]`; `comment.md` is the #869 status note; `personality.md` is empty; no `emergency.json`. The comment names no agent/workflow/model, carries no trigger token, and ends with the sign-off.
36. **#867 duplicate review run:** the earlier `/oc maintainer` comment spawned a second review run `46067351943` that shared the review group; it skipped at the job gate, as designed. No defect; the queue:max design held.
37. **Post-merge preview behavior:** `/preview/pr-867/` returns 404 after the merge because the Pages build only stages open PRs. This is expected; no defect. Record for the Curator's lane if a merged-preview redirect is ever wanted.
38. **Merge-push Pages gap:** an app-token merge does not fire the `push` trigger (GitHub suppresses workflow triggers for app-token pushes), so every session merge needs an explicit Pages dispatch and verification. The serving deploy `46070782929` remains; the hardcoded step's duplicate `46071198260` failed on the empty-artifact class and changed nothing.
39. **Concurrent-session coordination:** always re-read the target threads before re-arming; a later session must not duplicate an earlier one's dispatches. The 07:20Z PR-open wake found the review already posted by the lab workflow and correctly stood down.
40. **Heartbeat arm:** the 04:33Z recover tick was the first observed heartbeat dispatch under #836 (90-minute cooldown marker on #70). The next expected ~06:03Z tick did not land; do not re-dispatch the heartbeat yourself. Watch schedule health.

## Standing rules I operate under

### Safety and autonomy

- Never post issue or PR comments directly; the only public artifacts are the files under `.maintainer/`. Never create an issue or PR, never run git commit/push/branch commands, never touch the brain, never `@copilot`, and never spawn a Copilot review. Never mention an agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception).
- Protected paths: `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, `LAB.md` (also `.github/scripts/` as touching credential wiring). Changing them requires the full review/test/eval chain and an owner-credential push. The agent-write App token cannot push workflow files, so expect a public push-rejection on the branch; the lab's hardcoded owner-credential step performs the actual push.
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
- Merge preference is squash unless the PR's base branch explicitly requires another strategy; the repo's rebase-merge setting is the exception for this lane. The owner-credential sweep uses rebase then merge fallback with `--match-head-commit`; the session uses the same shape for non-workflow PRs.
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

- This run is an `issue_comment` PR-open wake on #869; the public artifact is the #869 status note. `decision.json` is `[]`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure. This run posts the #869 status note.
- The pipeline is green on main (`7cfe4684d`; the new-main Pages deployment is live and the root and `/docs/` are 200), and the platform is perf-sensitive: multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed the lab draws at 16:54:13Z, 23:15:37Z, 03:05:44Z, 05:10:20Z, 11:13:26Z, 13:17:06Z, 19:23:31Z, 21:39:13Z, 02:28:28Z, 05:02:45Z, 08:29:54Z, 11:51:34Z, 14:46:36Z, 20:16:52Z, 21:17:30Z, 22:06:48Z, 02:47:26Z and 06:36:05Z, the eval draws at 13:10:30Z, 21:48:51Z, 00:44:09Z, 04:07:07Z, 08:57:22Z, 09:44:22Z, 12:09:23Z, 19:03:24Z, 21:44:40Z, 02:17:49Z, 04:49:23Z and 08:20:40Z, the test draw at 18:44:57Z, the public-surface draws at 21:17:41Z (2026-11-25) and 21:12:06Z/21:15:03Z (2026-11-26), the review draw at 10:31:16Z, and the auditor/curator draws at 07:15Z/07:21Z, while fresh runners completed the 12:15Z review, 12:46Z test, 16:00-17:08Z eval, 17:23-17:56Z repair pass, 17:56-18:22Z review, 21:12Z heartbeat, the 21:16-21:32Z test, the 00:03Z/03:38Z/08:01Z/08:36Z/09:00Z/10:06Z/10:24Z/11:19Z/11:28Z/11:46Z sessions, the 07:25Z/08:01Z auditor self-heal, the 08:12-08:53Z repair pass, the 09:29-10:06Z review retry, the 10:06-10:24Z lab pass, the 10:16-11:19Z quality draw, the 11:28-11:47Z review, the 11:47-12:00Z test, the 21:15Z public-surface schedule pass (before its agent was walled), the 04:31-04:40Z heartbeat session, the 07:12-07:53Z daily audit plus the 07:17-07:29Z curator tick, the 10:54-11:19Z quality draw, the 14:18-14:26Z heartbeat session, the 19:50Z schedule session, the 20:59-21:04Z #867 review, the 21:00Z triage session, the 21:07-21:16Z #867 test, the 21:16Z handoff session, the 21:20-21:28Z #867 quality draw, the 21:28Z merge session, the 21:34-21:41Z concurrent deferral session, the 21:35-21:44Z triage-plus-#812 session, the 02:32-02:37Z schedule session, the 04:34-04:40Z heartbeat session, the 06:58-07:20Z failure-triage session, and this 07:20Z PR-open session. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Watch the #869 review `46120435681`; on approval the test gate follows, then quality, then merge. If it dies on the wall, re-arm exactly one review on the same head after confirming no live or queued review.
2. Watch the #812 lab `46120776098`; on a push, review -> test -> quality -> merge. If it dies on the wall, no same-pool retry; re-arm on a later wake after the window.
3. Watch the auditor self-heal `46119019040`; if the #853 deferral guard recurs, route its unbounded paginated run read to lab (filter by head SHA or cap pages).
4. Then the serialized queue: #814 (with the three-site resolver `createdAt` addendum, the deferral page-size wording, and the review/test non-blocking observations), #849, #857, #856, #860, #773, #774, then #742's remainder with the lab.yml PR-thread linkage-guard fix.
5. Verify the #867 production state holds: main `7cfe4684d`, root and `/docs/` 200 with the five-dimension copy, branch `5db7a41d7` intact, #866 closed.
6. The fail-closed poster is proven live; keep watching the next session's `comment.md` and pings for the success line.
7. Keep #836 open for the Owner capacity decision; #831 is bookkeeping only; #821 stays parked.
8. Verify the board invariant, allowlist, registry/ladder, live site, held runs, schedule health, and the delayed ticks at each wake; if clean, stand by.

## Open questions

1. Will the #869 review approve, or request changes? The change is a two-file roster and prompt alignment.
2. Will the #812 lab draw push a branch, or die on the wall like the 04:40Z draw?
3. The auditor self-heal's deferral guard took about 30 minutes; if that recurs, bound the paginated run read. Is the slow read a one-off platform stall or a code-level cap gap?
4. The expected ~06:03Z recover-arm heartbeat did not land; the schedule remains throttled. Is the 90-minute cadence sufficient? The capacity class is #836.
5. Should the session skip its manual Pages dispatch when the hardcoded "Trigger pages deployment if main advanced" step will also dispatch, to avoid the duplicate deploy and its empty-artifact failures? Fold into the next lab round.
6. The eval's non-blocking items: residual "Baseline parity" wording in two ideas project files, and no automated regression test guards the new five-phrase copy. Owner follow-up only; no new issue while the backlog clears.
7. The quality report's older non-blocking items (the spaced sign-off variant can append a cosmetic second sign-off, a NUL-byte body raises an uncaught ValueError, the poster resolves `gh` from the ambient PATH, and the whitespace-only/unparseable-decision skips remain) fold into the next lab round; no new issue.
8. Should the eval and test lanes get a bounded in-workflow retry like review, or stay next-wake re-armed? Known gap; fold into the next lab round or #836.
9. Should the merged preview route's 404 after a merge be documented as expected behavior? It is by design; no action now.
