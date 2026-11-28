# STATE

Last updated: 2026-11-28T08:47Z by run 46126791367

(08:38Z #870 audit-intake wake: the 08:05Z lane draws died on the provider wall at 08:35-08:36Z - the #869 quality gate and the #812 infrastructure draw - while the fresh daily audit completed at 08:38:51Z and filed #870, the memory-publish shallow-graft defect. This run routes #870 to the infrastructure lane, re-arms exactly one eval on #869 head `66716de7`, and re-arms exactly one lab draw on #812.)

## TL;DR for the next Hephaestus

- **This was the #870 audit-intake wake** (`46126791367`). The daily audit's fresh pass succeeded at 08:38:51Z and filed #870 at 08:38:02Z; its forward posted `/oc maintainer` at 08:38:48Z.
- **#870** is the memory-publish defect: the agent's read-only `git fetch origin maintainer/logs --depth=1` created a shallow graft, so the unforced publish fetch at `maintainer.yml:1339` rejected the ref as non-fast-forward, the loop rebuilt an orphan root, and the push was also rejected; the 07:27Z session's memory was lost. The proposed fix is force the publish fetch into its private ref, clear shallow state before the loop, distinguish a rejected fetch from a missing branch, and add the shallow-plus-advanced-tip fixture. This run routes it to the infrastructure lane.
- **#869** is the #868 roster fix; head `66716de7`; review and test both approved; the quality gate died on the wall at 08:36:23Z with no decision. This run re-arms exactly one fresh eval on the same head.
- **#812** is the R11 audit-bypass infra issue; the 08:05Z draw made real edits (the R11 scope fix in the test workflow) but died on the wall at 08:35:36Z with no push and no branch. This run re-arms exactly one fresh draw after the 30-minute window.
- **Auditor:** the fresh pass succeeded at 08:38:51Z and filed #870; no new dispatch. The next scheduled tick is midnight UTC.
- **Main `7cfe4684d`; `maintainer/logs` tip `35c4acd1`; models 110/10 free; ladder 3/3 live; allowlist 19 + maintainer + 3 managed = 23 live; board resolves `70`; production 200; held 0; the seven stale queued runs unchanged.**
- **Do not duplicate:** no second eval on #869 while this run's eval is live; no second #812 draw; no second #870 draw; no auditor dispatch; no queue advancement; no review/test/eval on #821 (parked); no public-surface draw; no ideation.
- **Do not run a depth-limited fetch on the memory branch.** The #870 defect is caused by exactly that; use `git show refs/remotes/origin/logs:...` or a full fetch.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the lab engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due.

## Right now (surveyed 08:39-08:46Z on 2026-11-28)

### GitHub state

- **Main:** `7cfe4684d2ce6ea0ba17492c9b9889d91a1d31fb` (the #867 rebase merge; unchanged since 21:29:36Z on 2026-11-27). **`maintainer/logs` tip:** `35c4acd1a0faa4b2c74bf8a90a223a00b9700bf8` at run start (the 08:37:16Z second intake memory commit; the committed STATE still carries the 08:02Z stamp until this run's publish).
- **#870 (new):** OPEN, created 08:38:02Z by `app/github-actions`; no labels; one comment `/oc maintainer` at 08:38:48Z. The audit finding: the 07:27Z Maintainer run `46121290367` went red at the memory publish; all three attempts failed with `maintainer/logs -> origin/logs (non-fast-forward)` and `HEAD -> maintainer/logs (non-fast-forward)`, so the session's memory was lost. Root cause: the agent's read-only `git fetch origin maintainer/logs --depth=1` (07:31-07:34Z) left a shallow graft; the unforced publish fetch at `maintainer.yml:1339` then rejected the shared-ref update, the loop read that as "no tip", built an orphan root, and the push was also non-fast-forward. Proposed fix: force the publish fetch into its private ref, clear shallow state before the loop, distinguish a rejected fetch from a missing branch (for example with `git ls-remote --exit-code`), add an R23 shallow-plus-advanced-tip fixture, and add a Maintainer prompt guard against depth-limited fetches.
- **#869:** OPEN, created 07:16:22Z by `app/github-actions`; head `66716de7d1809295def7fc939ad3ae145c7431bd`; branch `opencode/lab-868-registry-plan-alias`; base `main`; CLEAN/MERGEABLE; one commit, two files, +4/-4 (`.github/agents/REGISTRY.md` +1/-1, `.github/agents/architect.md` +3/-3); `Closes #868`. Checks: comment, trigger, maintainer, GitGuardian SUCCESS; deploy SKIPPED. Review approved 07:27:35Z; test approved 07:55:53Z; `/oc eval` 08:05:41Z; the eval `46124195870` died on the wall at 08:36:23Z with no decision file. No eval verdict.
- **#812:** open; the last `/oc lab` trigger was 08:05:42Z; the draw `46124197825` made real edits in the workspace (the R11 scope fix in `opencode-test.yml`, removing `--exclude-standard` from the untracked-path inventory) but died on the wall at 08:35:36Z; the verify step failed closed and did not self-heal; no push and no branch. The 30-minute window ran to 08:35:42Z.
- **#821:** open, parked since 2026-11-07; CLEAN/MERGEABLE; no gates; do not touch.
- **Open issues (24 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #812, #814, #831, #836, #849, #856, #857, #860, #868, #870. #70 is the only `lab-health` board; #42 the only `brainstorm`.
- **Board invariant holds:** `health-board.sh` resolves `70`; only #70 carries `lab-health` and the exact title. Newest notes: the 08:36:37Z and 08:37:11Z quota-wall intake notes and the 08:38:31Z daily audit note plus the 08:38:42Z "Done. Filed #870" note.
- **Latest comments:** 08:05:26Z the #869 decisions note; 08:05:39Z the #70 failure-triage note; 08:05:40Z the #869 maintainer note; 08:05:41Z `/oc eval` on #869; 08:05:42Z `/oc lab` on #812; 08:05:43Z `/oc auditor` on #70; 08:36:37Z and 08:37:11Z the #70 quota notes; 08:38:31Z the #70 daily audit note; 08:38:42Z the #70 "Done. Filed #870" note; 08:38:48Z `/oc maintainer` on #870. No new human comment beyond the owner triggers.
- **Branch tips:** main `7cfe4684d`, `maintainer/logs` `35c4acd1`, #869 `66716de7`, #821 `dce109e4`, #867 `5db7a41d7` (intact), #865 `818de0af3` (intact), selector branch `opencode/lab-848-shared-health-board-selector` at `c1040c0c` (intact), #859 branch `opencode/issue858-curate-umbra-count-copy` at `9b862e48` (never delete), #854 branch `opencode/issue803-20261115060707` at `d449afb9` (archival), the stale queued-run branches `opencode/lab-843-review-cap-r17-hermetic` `ccdcf49b`, `opencode/issue532-20261005154527` `836870be`, `opencode/lab-427-actor-permission-preflight` `ef4770fe`, `opencode/lab-620-freetier-retry` `cfe55726` (unchanged). No #812 branch. No recovery due.
- **Held:** 0. **Waiting:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3). **In progress:** this run only. **Cohort noise:** the 08:38:51Z fan-out skipped/cancelled at the guards, as designed.
- **This run:** `46126791367`, `issue_comment` on #870, created 08:38:51Z; trusted pre-agent checkout main `7cfe4684d`; the target is an issue, so no PR-head checkout; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **#869 eval `46124195870`:** failure at 08:36:42Z; the agent ran 08:05:46-08:36:23 and ended on `AI_APICallError: Free usage limit reached` (`FreeUsageLimitError`, HTTP 429, retry-after 57320); the verify step failed closed with no decision file. No auto-retry chain.
- **#812 lab `46124197825`:** failure at 08:36:10Z; the agent ran 08:05:47-08:35:36 and ended on the same wall (retry-after 56755); the verify step failed closed and did not dispatch a self-heal retry; no decision file, no push, no branch.
- **Auditor `46124199233`:** success at 08:38:51Z; the fresh audit filed #870 at 08:38:02Z, posted the daily audit note at 08:38:31Z and the "Done. Filed #870" note at 08:38:42Z, and forwarded `/oc maintainer` on #870 at 08:38:48Z.
- **Quota intakes `46126594677` / `46126636387`:** success at 08:36:54Z / 08:37:23Z; both stood down (no agent), posted one deduped quota note each on #70, and appended only run markers to the logs tip.
- **Failures on 2026-11-28 (8):** the 02:37Z lab `46098961105` (wall), the 04:40Z lab `46108627253` (wall), the 06:45Z auditor `46118061616` (deferral-guard read), the 07:27Z auditor `46119019040` (wall), the 07:30Z lab `46120776098` (wall), the 07:37Z maintainer memory publish `46121290367` (non-fast-forward), the 08:36Z eval `46124195870` (wall), and the 08:36Z lab `46124197825` (wall).
- **Pages:** production root and `/docs/` HTTP 200 on `7cfe4684d`, both serving "competitive baseline integrity" with zero "scientific depth". The serving deploy `46070782929` at 21:31:27Z remains.
- **Model registry:** 110 / 10 free at 08:41Z; pin and `small_model` `opencode/deepseek-v4.1-flash-free`; the three ladder rungs (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`) are live; `maintainer.yml` `REQUESTED_MODEL` is the same free pin. No upgrade.
- **Allowlist:** 19 names on `main` plus the self-excluded maintainer = 20 repo-managed; live 23 = those 20 plus Dependabot Updates, Dependency Graph, and pages-build-deployment; zero missing, zero extra.
- **Setup:** `bash setup.sh --check` exits 0; `gh api rate_limit` core 4926, graphql 4940.

### Live lanes and their next step

- **#869 (roster alias, #868):** the quality gate is re-armed this run on head `66716de7`. On `approve-eval`, merge with `gh pr merge 869 --rebase --match-head-commit 66716de7` (never `--delete-branch`), close #868 via `Closes #868`, then dispatch and verify the Pages deploy. If the eval dies on the wall or crashes without a decision, the next Maintainer wake re-arms exactly one fresh eval on the same head after confirming no live or queued eval.
- **#870 (memory publish, audit):** the infrastructure fix is dispatched this run. On a branch/PR, review -> test -> quality -> merge (the PR touches a workflow file, so the owner-credential merge sweep applies); then verify the publish actually fast-forwards on the next session. If the draw dies on the wall, re-arm on a later wake after the window.
- **#812 (R11 audit bypass):** the fresh draw is dispatched this run. On a push, the workflow forwards a fresh review; then test, quality, merge. If it dies on the wall, no same-pool retry; re-arm on a later wake after the window.
- **Auditor:** the fresh pass succeeded at 08:38:51Z and filed #870; no further dispatch. The next scheduled tick is midnight UTC.
- **#814 (fail-open baseline read):** next after #870/#812; includes the three-site resolver `createdAt` addendum, the deferral page-size wording, and the review/test non-blocking observations.
- **#849 (fail-loud hardening):** after #814.
- **#857 / #856 / #860 (fail-loud backlog):** serialized after #849.
- **#773/#774:** the LAB.md read-only-scope contradiction plus the phantom step reference, and the stale `setup.sh --check` roster; parked as the post-delivery batch.
- **#742 remainder (tracker):** open; the candidate lane for the remaining owner-credential steps and follow-ups, including the lab.yml PR-thread linkage guard.
- **#836 (capacity):** open for the Owner capacity decision. The per-egress-IP wall remains the only fix that ends the recurrence; no new lab dispatch beyond the live lanes.
- **#821 / #792** (Maze Chase Windows harness): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow or frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw per lane; the #869 eval lane, the #870 infrastructure lane, and the #812 infrastructure lane are the three draws this run. No product gate is live (the #867 lane is closed).
- **Cooldowns:** the last eval trigger was 08:05:41Z (died 08:36:42Z); this run's re-arm is a fresh draw. The last #812 lab trigger was 08:05:42Z (died 08:36:10Z); the 30-minute window ran to 08:35:42Z. The #870 lab trigger is new. No duplicate while a live or queued run exists.
- **Overlapping sessions:** this run is `maintainer-870` (the audit intake). The 07:55Z handoff session completed at ~08:05Z and published STATE at 08:02Z. The two 08:36Z quota intakes completed at 08:36:54Z / 08:37:23Z. The 08:05Z eval and lab died at 08:36Z; the auditor completed at 08:38:51Z. This run owns the three re-arms.
- **Wall rule:** the wall is per egress IP and resets on the provider's daily schedule. It killed the eval draws at 12:09:23Z, 19:03:24Z, 21:44:40Z, 02:17:49Z, 04:49:23Z, 08:20:40Z and 08:03Z, the 08:05Z eval at 08:36:23Z, the lab draws at 13:17:06Z, 19:23:31Z, 21:39:13Z, 02:28:28Z, 05:02:45Z, 08:29:54Z, 11:51:34Z, 14:46:36Z, 20:16:52Z, 21:17:30Z, 22:06:48Z, 02:47:26Z, 06:36:05Z, 07:30:40Z and 08:35:36Z, and the auditor/curator draws at 07:15Z/07:21Z and 07:27:06Z; the retry-after headers are diagnostic only and never a park horizon; a fresh wake on a new runner is the designed recovery, not a same-pool retry. Do not burst.
- **Checkpoint rule:** if a lab head advances with partial commits and a pass dies without signalling review, do NOT dispatch a review on that partial head. Only a `review` signal (or an explicitly complete pass) authorizes the review/test/eval chain.
- **Review retry rule:** the review workflow has its bounded auto-retry chain (the #754/#827 rule), but a wall death needs a Maintainer re-arm, not an auto-retry. Do not dispatch a duplicate while a review run is live or queued.
- **Test rule:** the test workflow has no in-workflow retry chain; every wall death needs a Maintainer re-arm.
- **Eval retry rule:** the eval lane has no in-workflow auto-retry chain; if the dispatched eval dies on the wall or crashes without a decision, the next Maintainer wake re-arms exactly one fresh eval on the same head after confirming no live or queued eval.
- **Merge rule:** the PAT merge sweep only handles workflow-touching PRs; the Maintainer session merges every other approved PR with `gh pr merge --rebase --match-head-commit <head>` (never `--delete-branch`). #869 touches `.github/agents/**`, not workflows, so the session merge path applies after the gates; the #870 fix touches a workflow file, so the PAT sweep applies. The app-token merge push fires no `push` run, so dispatch the Pages deploy after every merge and verify it.
- **Double-deploy note:** the hardcoded "Trigger pages deployment if main advanced" step also dispatches a Pages deploy when main moved during the run, so a session merge currently produces two deploys for the same SHA. The second can fail on the empty-artifact class; fold a dedupe into the next lab round.
- **Memory-publish rule:** the publish fetch is unforced into the shared `refs/remotes/origin/logs` ref. The Auditor's #870 diagnosis ties the 07:27Z loss to the agent's `--depth=1` fetch creating a shallow graft. Until #870 lands, never run a depth-limited fetch on the memory branch; the local workspace is full and the shared refs are at the tip, so this run's publish is a fast-forward.
- **Public-surface rule:** the scheduled public-surface arm has a bounded self-heal of 1; the 06:49Z tick produced #868 and handed it off. The next tick is the next recovery window.
- **Do not dispatch #814/#849/#857/#856/#860/#773/#774/#742 until the #870 and #812 lanes are known (merged or verdict).**
- Never merge without a head-fresh test marker and a head-bound quality approval.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#869:** the quality gate is re-armed this run; on `approve-eval`, merge on head `66716de7`, close #868, verify Pages.
2. **#870:** the infrastructure fix is dispatched this run; on a branch/PR, review -> test -> quality -> merge (PAT sweep), then verify the publish.
3. **#812:** the fresh draw is dispatched this run; on a push, review -> test -> quality -> merge. The R11 scoping fix plus the LAB.md fold-in.
4. **Auditor:** done for this wake; the next scheduled tick is midnight UTC.
5. `{"action":"lab","issue":814}`: after #870/#812; fail-closed baseline read in the fix lane, add `createdAt` to all three pre-existing resolver `--json` lists, and update the R32 pins in lockstep.
6. `{"action":"lab","issue":849}`: after #814; on a push, the review/test chain; re-arm its wall-killed trigger.
7. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
8. `{"action":"lab","issue":856}`: after #857.
9. `{"action":"lab","issue":860}`: after #856.
10. `{"action":"lab","issue":773}`: after #860; correct the LAB.md read-only scope claim and the phantom step reference; R1-R37 audit and pins in lockstep.
11. `{"action":"lab","issue":774}`: after #773; extend `setup.sh --check` to the full current roster and workflow set.
12. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups, including the lab.yml PR-thread linkage guard; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #867 is merged and #866 is closed; the branch is intact at `5db7a41d7`; do not delete it, re-open #866, or re-dispatch any gate on the merged head.
2. #869 is the #868 roster fix in quality; the fix belongs to `.github/agents/REGISTRY.md` and `.github/agents/architect.md`; the `maintainer/logs` roster mirror is refreshed from `main`, so the source fix is sufficient. On merge, #868 closes via `Closes #868`.
3. #812: the 08:05Z draw died on the wall at 08:35:36Z after making real workspace edits (the R11 scope fix); no branch exists, so the work is lost. This run re-arms exactly one draw after the window. If it dies on the wall again, no same-pool retry; re-arm on a later wake after the window.
4. #870: the Auditor's root cause is accepted. The fix is in `maintainer.yml` (protected path) and belongs to the infrastructure lane; this run dispatches it. The issue body already carries the exact sites (`:1339`, `:263`, `:1969`, `:2328`) and the proposed fix; no research or architecture pass.
5. The 06:45Z auditor failure was the #853 stale-deferral guard's paginated `actions/runs` read failing closed (`could not list workflow runs`) after about 2m28s; the agent never started. The 06:58Z self-heal passed the guard after about 30 minutes but its agent died on the wall at 07:27:06Z; the self-heal cap of 1 then escalated. The 08:05Z fresh audit passed the guard and completed green. The guard's `--paginate --slurp` on `actions/runs?per_page=100` has no explicit cap; if the failure recurs, route lab to bound it (filter by head SHA or cap pages).
6. The 04:40Z #812 draw made real edits but pushed nothing; the work is lost and there is no branch to recover. Do not claim otherwise.
7. The 06:36Z and 08:36Z quota intakes again stood down and chained no fresh draw; their recovery step is a no-op because the intake workspace has no `.maintainer/quota-wall` marker (the known marker gap). Record for the #836 capacity decision; no new issue.
8. #865 is merged and #864 closed; the branch is intact at `818de0af3`; do not delete it, re-open #864, or re-dispatch any gate on the merged head.
9. The quality report's non-blocking items: the Maintainer prompt's spaced sign-off variant can append a cosmetic second sign-off; a NUL-byte body raises an uncaught ValueError (red, not a silent drop); the poster resolves `gh` from the ambient PATH; the whitespace-only `comment.md`/ping skip and the unparseable `decision.json` exit-0 path remain. Fold into the next lab round; no new issue while the backlog clears.
10. The pre-existing resolver sites (`opencode.yml` baseline/phase resolvers and the review linked-PR resolver) still need the `createdAt`/`--limit 100` corrections; all fold into #814 with the pins.
11. The fail-closed poster is proven live; the 11:36Z, 11:51Z, 14:47Z, 20:17Z, 21:09Z, 21:20Z, 21:33Z, 21:34Z, 21:41Z, 21:45Z, 22:07Z and 02:48Z notes all posted. Keep watching the next session's `comment.md` and pings for the success line.
12. #853, #848, #815, #803, #864 and #866 are closed; #831 is bookkeeping only.
13. Pages: production 200 on `7cfe4684d`; `/docs/` 200; `/preview/pr-867/` 404 by design (merged PR preview retired). The successful deploy `46070782929` at 21:31:27Z is the serving build; the duplicate `46071198260` failed on the empty-artifact class and changed nothing.
14. #836 stays open for the Owner capacity decision; no new lab dispatch beyond the live #870/#812 lanes.
15. Model registry drift: 110 / 10 free at 08:41Z; the ladder is 3/3 on main and all three rungs are live. No lab dispatch.
16. #821 stays parked; the Maze Chase standing set is frozen unless the Owner asks.
17. The seven stale queued runs are unchanged; do not cancel or re-dispatch them.
18. Memory: the 2026-11-25 file carries the 02:36Z session, the three run markers, the 05:01Z, 08:05Z, 10:10Z, 10:56Z, 11:12Z, 12:15Z, 12:46Z, 13:11Z quota marker, 15:46Z, 17:07Z, 17:56Z, 18:22Z, 21:12Z, 21:18Z, 21:32Z and 21:49Z sessions/markers; the 2026-11-26 file carries the 00:03Z session, the 00:44Z intake marker, the 03:38Z session, the 04:08Z intake marker, the 08:01Z session, the 08:36Z session, the 08:57Z quota-intake marker, the 09:00Z session, the 09:45Z intake marker, the 10:06Z session, the 10:24Z session, the 11:19Z session, the 11:28Z session, the 11:46Z session, the 12:00Z session, the 12:09Z/13:17Z intake markers, the 18:37Z session, the 19:03Z/19:23Z/21:15Z intake markers, the 21:15Z session, and the 21:39Z/21:44Z intake markers; the 2026-11-27 file carries the 02:02Z session, the 02:17Z/02:28Z intake markers, the 04:31Z heartbeat session, the 04:49Z/05:03Z intake markers, the 07:53Z session, the 08:21Z/08:30Z intake markers, the 10:44Z session, the 11:19Z session, the 11:28Z session, the 11:51Z intake marker, the 14:18Z heartbeat session, the 14:46Z intake marker, the 19:50Z schedule session, the 20:16Z intake marker, the 21:00Z triage session, the 21:16Z handoff session, the 21:28Z merge session, the 21:34Z concurrent deferral session, the 21:35Z triage-plus-#812 session, and the 22:07Z intake marker; the 2026-11-28 file carries the 02:32Z schedule session, the 04:34Z heartbeat session, the 06:36Z intake marker, the 07:03Z #868 session, the 06:58Z failure-triage session, the 07:20Z PR-open session, the 07:30Z quota-intake marker, the 07:55Z test-handoff session, the 08:36Z/08:37Z quota-intake markers, and this 08:38Z audit-intake session. Append-only, keep-both.
19. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round.
20. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
21. The merged tree carries the R26 canonical manifest and the R30 poster block SHA in lockstep with `maintainer.yml`; the post-merge patch-ids prove the merged tree is the audited tree. The next lab pass that edits either file must regenerate them.
22. No `emergency.json`: the maintainer workflow is alive, production is serving, and no failed lab attempt is being bypassed.
23. The general job's contains-based matcher fired on the 2026-11-26 eval approval report and on the 2026-11-27 #867 approval; watch item for a future lab round, no new issue.
24. **Resolver addendum:** three pre-existing resolver sites remain on the head, `opencode.yml:839` (the baseline resolver the reviewer cited at `:838` on main), `:1162`, and `:1397`; all sort by `.createdAt` without requesting it. Fold all three plus pins into the #814 fix-lane hardening pass.
25. **Design-lane note:** a manual design trigger placed on a PR thread would day-scope there; the designed issue invocation and the phase-completion forward are unaffected. No action now.
26. **Eval recovery watch:** the #869 eval is re-armed this run; if it dies without a decision, re-arm exactly one fresh eval on the same head after confirming no live or queued eval.
27. **Test-lane auto-retry gap:** the test workflow has no in-workflow retry chain (unlike review), so every wall death needs a Maintainer re-arm. The eval lane shares the gap. Watch item for the next lab round; no duplicate issue while #836 is open.
28. **Public-surface self-heal cap:** the cap of 1 worked as designed on 2026-11-26. The 06:49Z tick on 2026-11-28 landed green and produced #868; the handoff run owns it. The next tick is the next recovery window.
29. **Quota intake behavior:** the 08:36Z intakes again skipped the agent, posted the audit notes, and chained no fresh draw; the intake workspace has no `.maintainer/quota-wall` marker, so its recovery step is a no-op (known gap). Record for the #836 capacity decision; no new issue.
30. **Intake memory gap:** the 08:36Z intakes appended only run markers and did not refresh STATE.md. The 07:30Z intake did the same; the 07:27Z triage session's memory publish failed outright. Watch whether future intake publishes do the same.
31. **Wall-duration variance:** the 04:40Z lab draw ran about 1h56m before the wall, the longest observed; the 08:05Z draws died at about 30m; the 07:20Z draw died at 10m; the 02:37Z draw died at 10m; the 21:45Z draw died at 21m; earlier draws ranged 9m to 1h39m. Record for the #836 capacity decision; do not change the single-draw rule.
32. **Comment-poster lane:** #864's repair merged; the poster now executes the real code against a mock `gh` and fails closed on an empty or unparseable body or exhausted retries; the R30 fixture covers the idless, mixed-sticky, and signed-ok cases. The trigger poster's non-fatal error path folds into the next lab round.
33. **#865 review/test observations:** the whitespace-only `comment.md`/ping skip and the unparseable `decision.json` exit-0 path are still open silent paths adjacent to #864; an Owner follow-up, no new issue.
34. **Schedule-throttling watch:** the last recover-arm tick was 04:33:49Z; the expected ~06:03Z heartbeat did not fire. The 06:58Z failure trigger, the 07:03Z comment trigger, the 07:20Z PR-open trigger, the 07:55Z test handoff, and this 08:38Z audit handoff are event-driven wakes, not schedule ticks. Platform throttling remains; the Auditor's lane owns schedule health; no dispatch this run.
35. **Comment-trigger burst:** the 07:03Z `/oc maintainer` on #868 spawned a batch of `maintainer-main` workflow_run runs (cancelled) plus the focused `maintainer-868` run `46119422300`; the 07:20:53Z PR-trigger `/oc maintainer` on #869 spawned the 07:20Z `maintainer-869` run plus a cohort of skipped/cancelled worker runs; the 07:55:56Z handoff and this 08:38:48Z audit handoff spawned the same designed cohort. This is designed concurrency behavior, not a defect.
36. **This run's artifacts:** `decision.json` has `lab` on #870, `eval` on #869, and `lab` on #812; `comment.md` is the #870 audit-intake note; `personality.md` is empty; no `emergency.json`. The comment names no agent/workflow/model, carries no trigger token, and ends with the sign-off.
37. **#867 duplicate review run:** the earlier `/oc maintainer` comment spawned a second review run `46067351943` that shared the review group; it skipped at the job gate, as designed. No defect; the queue:max design held.
38. **Post-merge preview behavior:** `/preview/pr-867/` returns 404 after the merge because the Pages build only stages open PRs. This is expected; no defect. Record for the Curator's lane if a merged-preview redirect is ever wanted.
39. **Merge-push Pages gap:** an app-token merge does not fire the `push` trigger (GitHub suppresses workflow triggers for app-token pushes), so every session merge needs an explicit Pages dispatch and verification. The serving deploy `46070782929` remains; the hardcoded step's duplicate `46071198260` failed on the empty-artifact class and changed nothing.
40. **Concurrent-session coordination:** always re-read the target threads before re-arming; a later session must not duplicate an earlier one's dispatches. The 07:20Z PR-open wake found the review already posted by the lab workflow and correctly stood down; the 07:55Z handoff found the test already approved and dispatched only the next gate; this 08:38Z wake found the eval and lab dead and the auditor done.
41. **Memory-publish failure (now #870):** the 07:27Z triage session (`46121290367`) lost its memory update after three non-fast-forward push rejections. The Auditor's #870 diagnosis: the agent's `--depth=1` fetch created a shallow graft, so the unforced publish fetch at `maintainer.yml:1339` rejected the shared-ref update; the loop then built an orphan root and the push was rejected too. The 07:55Z session's #70 ping corrected the false 07:35Z refresh claim. The fix is dispatched to the infrastructure lane this run. Do not run depth-limited fetches on the memory branch until it lands.
42. **Heartbeat arm:** the 04:33Z recover tick was the first observed heartbeat dispatch under #836 (90-minute cooldown marker on #70). The expected ~06:03Z tick did not land; do not re-dispatch the heartbeat yourself. Watch schedule health.

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

- This run is an `issue_comment` audit-intake wake on #870; the public artifact is the #870 audit-intake note. `decision.json` carries `lab` on #870, `eval` on #869, and `lab` on #812.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure. This run posts the #870 audit-intake note.
- The pipeline is green on main (`7cfe4684d`; the new-main Pages deployment is live and the root and `/docs/` are 200), and the platform is perf-sensitive: multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed the lab draws at 16:54:13Z, 23:15:37Z, 03:05:44Z, 05:10:20Z, 11:13:26Z, 13:17:06Z, 19:23:31Z, 21:39:13Z, 02:28:28Z, 05:02:45Z, 08:29:54Z, 11:51:34Z, 14:46:36Z, 20:16:52Z, 21:17:30Z, 22:06:48Z, 02:47:26Z, 06:36:05Z, 07:30:40Z and 08:35:36Z, the eval draws at 13:10:30Z, 21:48:51Z, 00:44:09Z, 04:07:07Z, 08:57:22Z, 09:44:22Z, 12:09:23Z, 19:03:24Z, 21:44:40Z, 02:17:49Z, 04:49:23Z, 08:20:40Z and 08:36:23Z, the test draw at 18:44:57Z, the public-surface draws at 21:17:41Z (2026-11-25) and 21:12:06Z/21:15:03Z (2026-11-26), the review draw at 10:31:16Z, and the auditor/curator draws at 07:15Z/07:21Z and 07:27:06Z, while fresh runners completed the 12:15Z review, 12:46Z test, 16:00-17:08Z eval, 17:23-17:56Z repair pass, 17:56-18:22Z review, 21:12Z heartbeat, the 21:16-21:32Z test, the 00:03Z/03:38Z/08:01Z/08:36Z/09:00Z/10:06Z/10:24Z/11:19Z/11:28Z/11:46Z sessions, the 07:25Z/08:01Z auditor self-heal, the 08:12-08:53Z repair pass, the 09:29-10:06Z review retry, the 10:06-10:24Z lab pass, the 10:16-11:19Z quality draw, the 11:28-11:47Z review, the 11:47-12:00Z test, the 21:15Z public-surface schedule pass (before its agent was walled), the 04:31-04:40Z heartbeat session, the 07:12-07:53Z daily audit plus the 07:17-07:29Z curator tick, the 10:54-11:19Z quality draw, the 14:18-14:26Z heartbeat session, the 19:50Z schedule session, the 20:59-21:04Z #867 review, the 21:00Z triage session, the 21:07-21:16Z #867 test, the 21:16Z handoff session, the 21:20-21:28Z #867 quality draw, the 21:28Z merge session, the 21:34-21:41Z concurrent deferral session, the 21:35-21:44Z triage-plus-#812 session, the 02:32-02:37Z schedule session, the 04:34-04:40Z heartbeat session, the 06:58-07:20Z failure-triage session, the 07:16-07:27Z #869 review, the 07:27-07:55Z #869 test, the 07:55Z test-handoff session, the 08:05-08:38Z auditor pass, and this 08:38Z audit-intake session. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Watch the #870 infrastructure lane; on a branch/PR, review -> test -> quality -> merge (the PAT sweep applies because the fix touches a workflow file), then verify the memory publish actually fast-forwards on the next session.
2. Watch the #869 quality gate; on `approve-eval`, merge on head `66716de7` with `--rebase --match-head-commit`, keep the branch, close #868, then dispatch and verify the Pages deploy. If it dies on the wall or crashes without a decision, re-arm exactly one fresh eval on the same head after confirming no live or queued eval.
3. Watch the #812 lab draw; on a push, review -> test -> quality -> merge. If it dies on the wall, no same-pool retry; re-arm on a later wake after the window.
4. Then the serialized queue: #814 (with the three-site resolver `createdAt` addendum, the deferral page-size wording, and the review/test non-blocking observations), #849, #857, #856, #860, #773, #774, then #742's remainder with the lab.yml PR-thread linkage-guard fix.
5. Verify the #867 production state holds: main `7cfe4684d`, root and `/docs/` 200 with the five-dimension copy, branch `5db7a41d7` intact, #866 closed.
6. The fail-closed poster is proven live; keep watching the next session's `comment.md` and pings for the success line.
7. Keep #836 open for the Owner capacity decision; #831 is bookkeeping only; #821 stays parked.
8. Verify the board invariant, allowlist, registry/ladder, live site, held runs, schedule health, and the memory-publish ref behavior at each wake; if clean, stand by. Never run a depth-limited fetch on the memory branch.

## Open questions

1. Will the #870 infrastructure lane land the memory-publish fix, or will the wall kill it like the 08:05Z draws?
2. Will the quality gate approve #869 on `66716de7`, or return findings?
3. Will the fresh #812 draw get a clean allowance bucket, or will the wall continue? The capacity class is #836.
4. The 08:36Z quota intakes again appended only run markers and did not refresh STATE; the intake memory gap persists. Watch the next intake publish.
5. The wall: the eval and lab lanes both died at ~08:36Z with retry-after about 16 hours, while the auditor survived on the same wake. The per-egress-IP lottery is the only recovery; the capacity decision is #836.
6. The duplicate Pages deploy per merge and the older non-blocking quality items fold into the next lab round; no new issue while the backlog clears.
7. Should the eval and test lanes get a bounded in-workflow retry like review, or stay next-wake re-armed? Known gap; fold into the next lab round or #836.
8. The eval's non-blocking items: residual "Baseline parity" wording in two ideas project files, and no automated regression test guards the new five-phrase copy. Owner follow-up only; no new issue while the backlog clears.
9. Should the merged preview route's 404 after a merge be documented as expected behavior? It is by design; no action now.
10. Will the #870 fix's shallow-state clearing interact with the shared `refs/remotes/origin/logs` ref cleanly? The next session's publish is the proof; verify it and record the result.
