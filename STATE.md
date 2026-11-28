# STATE

Last updated: 2026-11-28T09:18Z by run 46128733604

(09:04Z #869 eval-approval handoff wake: the quality gate approved head `66716de7` at 09:04:17Z, so this run merged PR #869 as `a5056e614` at 09:07:22Z, closed #868 at 09:07:24Z, kept the branch intact, dispatched the Pages deploy `46128982216` (success on `a5056e61` at 09:08:05Z), and verified root and `/docs/` 200. The #870 lab draw died on the wall at 09:08:40Z; the quota intake `46129069138` stood down with the 09:09:05Z board note. The #812 lab draw died on the wall at 09:14:44Z; the quota intake `46129548347` posted the 09:15:10Z board note and published at 09:15:28Z. A duplicate Maintainer wake `46128739567` from the `/oc maintainer` comment is queued behind this run.)

## TL;DR for the next Hephaestus

- **This was the #869 eval-approval handoff wake** (`46128733604`). The eval-verdict machine comment at 09:04:26Z is owner-authored and does not start with `/oc`, so it passes the Maintainer guard and started this run; the explicit `/oc maintainer` at 09:04:28Z queued the duplicate `46128739567` behind it.
- **#869 is MERGED** on head `66716de7` as `a5056e614` at 09:07:22Z with `--rebase --match-head-commit`; #868 closed at 09:07:24Z; the branch `opencode/lab-868-registry-plan-alias` remains intact at `66716de7`; the merged tree carries the alias in `REGISTRY.md:13` and `architect.md:9,32,75` (tree identical to the reviewed head). The Pages deploy `46128982216` succeeded at 09:08:05Z on `a5056e61`; root and `/docs/` are 200 with the five-dimension copy.
- **#870** (memory-publish shallow-graft fix): the 08:47Z lab draw `46127467430` died on the provider wall at 09:08:40Z with no decision file, no push, and no branch. The quota intake `46129069138` completed at ~09:09Z and posted the 09:09:05Z board note; its recovery step did not dispatch (the known marker gap). **Do not re-arm before 09:17:42Z** (30 minutes from the 08:47:42Z trigger); the next wake after the window re-arms exactly one draw.
- **#812** (R11 audit bypass): the 08:47Z lab draw `46127468911` died on the provider wall at 09:14:44Z (`FreeUsageLimitError` at 09:14:33Z) with no decision file and no branch; the quota intake `46129548347` posted the 09:15:10Z board note. Do not re-arm before 09:17:44Z; the next wake after the window re-arms exactly one draw.
- **Auditor:** the 08:38Z fresh pass filed #870 and completed; the next scheduled tick is midnight UTC. No dispatch.
- **Main `a5056e614`; `maintainer/logs` tip `197453ef`; models 110/10 free; ladder 3/3 live; allowlist 19 + maintainer + 3 managed = 23 live; board resolves `70`; production 200; held 0; waiting 0; requested 0; the seven stale queued runs unchanged; one duplicate maintainer wake pending.**
- **Do not duplicate:** no second #869 gate or merge; no #870 re-arm before 09:17:42Z; no #812 re-arm before 09:17:44Z; no auditor dispatch; no queue advancement; no review/test/eval on #821 (parked); no public-surface draw; no ideation.
- **Memory publish:** the workspace is shallow from the CLI PR-head checkout, but the two quota intakes advanced the memory tip twice (`64279e97` at 09:09:13Z, `197453ef` at 09:15:28Z) and the unforced publish fetch fast-forwarded cleanly each time (exit 0); the publish is a fast-forward. Still never run a depth-limited fetch on the memory branch (#870).

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the lab engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due.

## Right now (surveyed 09:04-09:12Z on 2026-11-28)

### GitHub state

- **Main:** `a5056e614a411a65e36c6d406fb72c8e568ef10e` (the #869 rebase merge; parent `7cfe4684d`, same tree as `66716de7`). **`maintainer/logs` tip:** `852b76dcabd19804200778394137d06fff1203cb` at run start; advanced to `64279e97747b621b02ff51ca32ad3465e0162113` at 09:09:13Z and then `197453ef758953fe201c1a320194737376157e13` at 09:15:28Z by the two quota intakes' memory publishes; each refreshed the `REGISTRY.md` mirror from the merged main (the alias is in the mirror) and appended its run marker; this run's publish will advance it again.
- **#869:** MERGED at 09:07:22Z; head `66716de7`; merge commit `a5056e614`; branch intact at `66716de7`; checks comment/trigger/maintainer/GitGuardian pass, deploy skipped; review 07:27:35Z, test 07:55:53Z (`/oc approve-test` 07:55:55Z), quality 09:04:17Z (`eval-verdict: approve-eval` on head `66716de7`, trigger comment 7236815841). No newer `/oc fix`; no newer eval trigger.
- **#868:** CLOSED at 09:07:24Z by the merge (`Closes #868`); no further action.
- **#870:** open; the 08:47Z lab draw `46127467430` failed at 09:08:40Z on the wall; the verify step failed closed with no decision file, no push, no branch; the quota intake `46129069138` stood down and posted the 09:09:05Z note. The 30-minute window runs to 09:17:42Z.
- **#812:** open; the 08:47Z lab draw `46127468911` failed at 09:14:44Z on the wall (`FreeUsageLimitError` at 09:14:33Z); the verify step failed closed with no decision file; no push and no branch. The quota intake `46129548347` posted the 09:15:10Z note. The 30-minute window runs to 09:17:44Z.
- **#821:** open, parked since 2026-11-07; CLEAN/MERGEABLE; no gates; do not touch.
- **Open issues (23 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #812, #814, #831, #836, #849, #856, #857, #860, #870. #70 is the only `lab-health` board; #42 the only `brainstorm`.
- **Board invariant holds:** `health-board.sh` resolves `70`; only #70 carries `lab-health` and the exact title. Newest note: the 09:09:05Z quota-wall intake note for the #870 lab failure.
- **Latest comments:** 09:04:17Z the quality report; 09:04:23Z the Quality Council approval; 09:04:26Z the eval-verdict marker; 09:04:28Z `/oc maintainer`; 09:09:05Z the #70 quota note for the #870 lab; 09:15:10Z the #70 quota note for the #812 lab. This run posts the #869 merge note.
- **Branch tips:** main `a5056e614`, `maintainer/logs` `197453ef`, #869 `66716de7` (intact), #821 `dce109e4`, #867 `5db7a41d7` (intact), #865 `818de0af3` (intact), selector branch `opencode/lab-848-shared-health-board-selector` at `c1040c0c` (intact), #859 branch `opencode/issue858-curate-umbra-count-copy` at `9b862e48` (never delete), #854 branch `opencode/issue803-20261115060707` at `d449afb9` (archival), the stale queued-run branches `opencode/lab-843-review-cap-r17-hermetic` `ccdcf49b`, `opencode/issue532-20261005154527` `836870be`, `opencode/lab-427-actor-permission-preflight` `ef4770fe`, `opencode/lab-620-freetier-retry` `cfe55726` (unchanged). No #812 branch. No #870 branch. No recovery due.
- **Held:** 0. **Waiting:** 0. **Requested:** 0. **Queued:** the seven known stale runs plus the duplicate maintainer wake `46128739567` (pending in the `maintainer-869` group). **In progress:** this run; both quota intakes completed (the second at 09:15:28Z).
- **This run:** `46128733604`, `issue_comment` on #869, created 09:04:26Z; trusted pre-agent checkout main `7cfe4684d`; the CLI bootstrap checked out the PR head `66716de7`; the workspace is shallow from that checkout, but the memory refs are at the tip and the publish fetch exits 0; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **#869 eval `46127468569`:** success at 09:04:36Z; the agent ran 08:47Z-09:04Z, wrote the approve-eval decision, and the workflow published the Quality Council report at 09:04:17Z and the machine verdict at 09:04:26Z.
- **Merge:** `gh pr merge 869 --rebase --match-head-commit 66716de7` at 09:07:22Z; main advanced `7cfe4684d` -> `a5056e614`; #868 auto-closed at 09:07:24Z; branch intact.
- **Pages deploy `46128982216`:** workflow_dispatch on main; success at 09:08:05Z; head `a5056e61`; root and `/docs/` 200 with "competitive baseline integrity". The hardcoded "Trigger pages deployment if main advanced" step may dispatch a duplicate after this session (known double-deploy class; the duplicate can fail on the empty-artifact class and change nothing).
- **#870 lab `46127467430`:** failure at 09:08:40Z; the agent ran 08:47:48-09:08:34 and ended on the provider daily free-usage wall; the verify step failed closed with no decision file; no push, no branch.
- **Quota intake `46129069138`:** success at ~09:09Z; `workflow_run` on the failed lab; stood down without an agent, posted the 09:09:05Z note on #70, and did not dispatch a recovery (the known marker gap).
- **#812 lab `46127468911`:** failure at 09:14:44Z; the agent ran 08:47:48-09:14:33 and ended on `FreeUsageLimitError` (issue #754); the verify step failed closed with no decision file; no push, no branch.
- **Quota intakes `46129069138` / `46129548347`:** success at 09:09Z / 09:15:28Z; each `workflow_run` on a failed lab; both stood down without an agent, posted one note on #70 (09:09:05Z for #870, 09:15:10Z for #812), published their memory markers (tips `64279e97` and `197453ef`), and did not dispatch a recovery (the known marker gap).
- **Failures on 2026-11-28 (10):** the 02:37Z lab `46098961105` (wall), the 04:40Z lab `46108627253` (wall), the 06:45Z auditor `46118061616` (deferral-guard read), the 07:27Z auditor `46119019040` (wall), the 07:30Z lab `46120776098` (wall), the 07:37Z maintainer memory publish `46121290367` (non-fast-forward), the 08:36Z eval `46124195870` (wall), the 08:36Z lab `46124197825` (wall), the 09:08Z #870 lab `46127467430` (wall), and the 09:14Z #812 lab `46127468911` (wall).
- **Pages:** production root and `/docs/` HTTP 200 on `a5056e614`, both serving "competitive baseline integrity" with zero "scientific depth". The serving deploy is `46128982216`.
- **Model registry:** 110 / 10 free at 09:10Z; pin and `small_model` `opencode/deepseek-v4.1-flash-free`; the three ladder rungs (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`) are live; `maintainer.yml` `REQUESTED_MODEL` is the same free pin. No upgrade.
- **Allowlist:** 19 names on `main` plus the self-excluded maintainer = 20 repo-managed; live 23 = those 20 plus Dependabot Updates, Dependency Graph, and pages-build-deployment; zero missing, zero extra.
- **Setup:** `bash setup.sh --check` exits 0; `gh api rate_limit` core 4808, graphql 4989.

### Live lanes and their next step

- **#869 (roster alias, #868):** DONE. Merged on head `66716de7` as `a5056e614`; #868 closed; branch intact; Pages deploy verified. Do not re-dispatch any gate on the merged head.
- **#870 (memory publish, audit):** the 08:47Z draw died on the wall at 09:08:40Z. The next wake after 09:17:42Z re-arms exactly one fresh draw; on a branch/PR, review -> test -> quality -> merge (the PR touches a workflow file, so the owner-credential merge sweep applies), then verify the publish actually fast-forwards on the next session.
- **#812 (R11 audit bypass):** the 08:47Z draw died on the wall at 09:14:44Z. The next wake after 09:17:44Z re-arms exactly one fresh draw; on a push, review -> test -> quality -> merge. Prefer one lab draw per wake while the wall is active; do not dispatch #870 and #812 together on the same runner.
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

- One draw per lane. Both infrastructure draws are dead and wait for their windows; no worker draw is live; the #869 lane is closed. Prefer one lab draw per wake while the wall is active.
- **Cooldowns:** the #870 trigger was 08:47:42Z (died 09:08:40Z); the 30-minute window runs to 09:17:42Z. The #812 trigger was 08:47:44Z (died 09:14:44Z); its window runs to 09:17:44Z. The last eval trigger was 08:47:43Z (approved 09:04:17Z); no new eval.
- **Duplicate wake:** `46128739567` is pending in the `maintainer-869` group from the 09:04:28Z `/oc maintainer`; it will start after this run and must re-survey before acting. It should stand down on #869 (already merged) and not duplicate the #870 re-arm before 09:17:42Z.
- **Overlapping sessions:** this run is `maintainer-869` (the eval handoff). The quota intakes `46129069138` and `46129548347` are in the separate `quota-recovery` group and completed. The pending duplicate is the only queued Maintainer session.
- **Wall rule:** the wall is per egress IP and resets on the provider's daily schedule. It killed the #870 draw at 09:08:40Z after about 21 minutes and the #812 draw at 09:14:44Z after about 27 minutes; the eval on the same wake succeeded on a different runner. Do not burst; a fresh wake on a new runner is the designed recovery, not a same-pool retry.
- **Checkpoint rule:** if a lab head advances with partial commits and a pass dies without signalling review, do NOT dispatch a review on that partial head. Only a `review` signal (or an explicitly complete pass) authorizes the review/test/eval chain.
- **Review retry rule:** the review workflow has its bounded auto-retry chain (the #754/#827 rule), but a wall death needs a Maintainer re-arm, not an auto-retry. Do not dispatch a duplicate while a review run is live or queued.
- **Test rule:** the test workflow has no in-workflow retry chain; every wall death needs a Maintainer re-arm.
- **Eval retry rule:** the eval lane has no in-workflow auto-retry chain; if the dispatched eval dies on the wall or crashes without a decision, the next Maintainer wake re-arms exactly one fresh eval on the same head after confirming no live or queued eval.
- **Merge rule:** the PAT merge sweep only handles workflow-touching PRs; the Maintainer session merges every other approved PR with `gh pr merge --rebase --match-head-commit <head>` (never `--delete-branch`). #869 touched `.github/agents/**`, not workflows, so this session merged it; #870's fix touches a workflow file, so the PAT sweep applies. The app-token merge push fires no `push` run, so dispatch the Pages deploy after every merge and verify it.
- **Double-deploy note:** the hardcoded "Trigger pages deployment if main advanced" step also dispatches a Pages deploy when main moved during the run, so a session merge can produce two deploys for the same SHA. The second can fail on the empty-artifact class; fold a dedupe into the next lab round.
- **Memory-publish rule:** the publish fetch is unforced into the shared `refs/remotes/origin/logs` ref. The refs fast-forwarded from `852b76dc` through `64279e97` to the current tip `197453ef` (exit 0), so this run's publish is a fast-forward even from the shallow PR-head workspace. Until #870 lands, never run a depth-limited fetch on the memory branch.
- **Public-surface rule:** the scheduled public-surface arm has a bounded self-heal of 1; the 06:49Z tick produced #868 and it is now closed by #869. The next tick is the next recovery window.
- **Do not dispatch #814/#849/#857/#856/#860/#773/#774/#742 until the #870 and #812 lanes are known (merged or verdict).**
- Never merge without a head-fresh test marker and a head-bound quality approval.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#870:** re-arm exactly one lab draw on the next wake after 09:17:42Z; on a branch/PR, review -> test -> quality -> merge (PAT sweep), then verify the publish.
2. **#812:** re-arm exactly one lab draw on the next wake after 09:17:44Z, preferably after the #870 draw has an outcome; on a push, review -> test -> quality -> merge. The R11 scoping fix plus the LAB.md fold-in.
3. `{"action":"lab","issue":814}`: after #870/#812; fail-closed baseline read in the fix lane, add `createdAt` to all three pre-existing resolver `--json` lists, and update the R32 pins in lockstep.
4. `{"action":"lab","issue":849}`: after #814; on a push, the review/test chain; re-arm its wall-killed trigger.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856.
8. `{"action":"lab","issue":773}`: after #860; correct the LAB.md read-only scope claim and the phantom step reference; R1-R37 audit and pins in lockstep.
9. `{"action":"lab","issue":774}`: after #773; extend `setup.sh --check` to the full current roster and workflow set.
10. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups, including the lab.yml PR-thread linkage guard; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #869 is merged and #868 is closed; the branch is intact at `66716de7`; do not delete it, re-open #868, or re-dispatch any gate on the merged head.
2. #870: the 08:47Z draw died on the wall at 09:08:40Z with no branch; the work is lost. The next wake after 09:17:42Z re-arms exactly one draw. The issue body carries the root cause and the proposed fix; no research or architecture pass.
3. #812: the 08:47Z draw died on the wall at 09:14:44Z with no branch; the work is lost. The next wake after 09:17:44Z re-arms exactly one draw, preferably after the #870 draw has an outcome.
4. The 06:45Z auditor failure was the #853 stale-deferral guard's paginated `actions/runs` read failing closed after about 2m28s; the 08:05Z fresh audit passed the guard and completed green. The guard's `--paginate --slurp` on `actions/runs?per_page=100` has no explicit cap; if the failure recurs, route lab to bound it (filter by head SHA or cap pages).
5. The quota intakes again stood down and chained no fresh draw; the intake workspace has no `.maintainer/quota-wall` marker (the known marker gap). Record for the #836 capacity decision; no new issue. The 09:08Z intake posted the 09:09:05Z note for the #870 lab death.
6. The duplicate Maintainer wake `46128739567` (from the `/oc maintainer` after the eval-verdict) is pending; it will start after this run and must stand down on the merged #869 and not duplicate the #870 re-arm before the window. The eval workflow's machine verdict plus the explicit `/oc maintainer` produced two wakes; fold a dedupe into the next lab round.
7. #865 is merged and #864 closed; the branch is intact at `818de0af3`; do not delete it, re-open #864, or re-dispatch any gate on the merged head.
8. The quality report's non-blocking items: the Maintainer prompt's spaced sign-off variant can append a cosmetic second sign-off; a NUL-byte body raises an uncaught ValueError (red, not a silent drop); the poster resolves `gh` from the ambient PATH; the whitespace-only `comment.md`/ping skip and the unparseable `decision.json` exit-0 path remain. Fold into the next lab round; no new issue while the backlog clears.
9. The pre-existing resolver sites (`opencode.yml` baseline/phase resolvers and the review linked-PR resolver) still need the `createdAt`/`--limit 100` corrections; all fold into #814 with the pins.
10. The fail-closed poster is proven live; keep watching the next session's `comment.md` and pings for the success line.
11. #853, #848, #815, #803, #864, #866 and #868 are closed; #831 is bookkeeping only.
12. Pages: production 200 on `a5056e614`; `/docs/` 200; the serving deploy `46128982216` succeeded at 09:08:05Z. The hardcoded duplicate deploy may follow; the second can fail on the empty-artifact class and change nothing.
13. #836 stays open for the Owner capacity decision; no new lab dispatch beyond the live lanes.
14. Model registry drift: 110 / 10 free at 09:10Z; the ladder is 3/3 on main and all three rungs are live. No lab dispatch.
15. #821 stays parked; the Maze Chase standing set is frozen unless the Owner asks.
16. The seven stale queued runs are unchanged; do not cancel or re-dispatch them.
17. Memory: the 2026-11-25 file carries the 02:36Z session, the three run markers, the 05:01Z, 08:05Z, 10:10Z, 10:56Z, 11:12Z, 12:15Z, 12:46Z, 13:11Z quota marker, 15:46Z, 17:07Z, 17:56Z, 18:22Z, 21:12Z, 21:18Z, 21:32Z and 21:49Z sessions/markers; the 2026-11-26 file carries the 00:03Z session, the 00:44Z intake marker, the 03:38Z session, the 04:08Z intake marker, the 08:01Z session, the 08:36Z session, the 08:57Z quota-intake marker, the 09:00Z session, the 09:45Z intake marker, the 10:06Z session, the 10:24Z session, the 11:19Z session, the 11:28Z session, the 11:46Z session, the 12:00Z session, the 12:09Z/13:17Z intake markers, the 18:37Z session, the 19:03Z/19:23Z/21:15Z intake markers, the 21:15Z session, and the 21:39Z/21:44Z intake markers; the 2026-11-27 file carries the 02:02Z session, the 02:17Z/02:28Z intake markers, the 04:31Z heartbeat session, the 04:49Z/05:03Z intake markers, the 07:53Z session, the 08:21Z/08:30Z intake markers, the 10:44Z session, the 11:19Z session, the 11:28Z session, the 11:51Z intake marker, the 14:18Z heartbeat session, the 14:46Z intake marker, the 19:50Z schedule session, the 20:16Z intake marker, the 21:00Z triage session, the 21:16Z handoff session, the 21:28Z merge session, the 21:34Z concurrent deferral session, the 21:35Z triage-plus-#812 session, and the 22:07Z intake marker; the 2026-11-28 file carries the 02:32Z schedule session, the 04:34Z heartbeat session, the 06:36Z intake marker, the 07:03Z #868 session, the 06:58Z failure-triage session, the 07:20Z PR-open session, the 07:30Z quota-intake marker, the 07:55Z test-handoff session, the 08:36Z/08:37Z quota-intake markers, the 08:38Z audit-intake session, the 09:09Z/09:15Z quota-intake markers, and this 09:04Z eval-handoff session. Append-only, keep-both.
18. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round.
19. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
20. The merged tree carries the R26 canonical manifest and the R30 poster block SHA in lockstep with `maintainer.yml`; the post-merge patch-ids prove the merged tree is the audited tree. The next lab pass that edits either file must regenerate them.
21. No `emergency.json`: the maintainer workflow is alive, production is serving, and no failed lab attempt is being bypassed.
22. The general job's contains-based matcher fired on the 2026-11-26 eval approval report and on the 2026-11-27 #867 approval; watch item for a future lab round, no new issue.
23. **Resolver addendum:** three pre-existing resolver sites remain on the head, `opencode.yml:839` (the baseline resolver the reviewer cited at `:838` on main), `:1162`, and `:1397`; all sort by `.createdAt` without requesting it. Fold all three plus pins into the #814 fix-lane hardening pass.
24. **Design-lane note:** a manual design trigger placed on a PR thread would day-scope there; the designed issue invocation and the phase-completion forward are unaffected. No action now.
25. **Eval recovery watch:** #869 is closed; no eval re-arm needed. The eval lane's next use is the next gated PR.
26. **Test-lane auto-retry gap:** the test workflow has no in-workflow retry chain (unlike review), so every wall death needs a Maintainer re-arm. The eval lane shares the gap. Watch item for the next lab round; no duplicate issue while #836 is open.
27. **Public-surface self-heal cap:** the cap of 1 worked as designed on 2026-11-26. The 06:49Z tick on 2026-11-28 landed green and produced #868, which #869 has now closed. The next tick is the next recovery window.
28. **Quota intake behavior:** the 09:08Z intake again skipped the agent, posted the board note, and chained no fresh draw; the intake workspace has no `.maintainer/quota-wall` marker, so its recovery step is a no-op (known gap). Record for the #836 capacity decision; no new issue.
29. **Intake memory gap:** the quota intakes append only run markers and do not refresh STATE.md. Watch whether future intake publishes do the same.
30. **Wall-duration variance:** the #870 draw ran about 21 minutes before the wall; the #812 draw ran about 27 minutes before the wall. Record for the #836 capacity decision; do not change the single-draw rule.
31. **Comment-poster lane:** #864's repair merged; the poster now executes the real code against a mock `gh` and fails closed on an empty or unparseable body or exhausted retries; the R30 fixture covers the idless, mixed-sticky, and signed-ok cases. The trigger poster's non-fatal error path folds into the next lab round.
32. **#865 review/test observations:** the whitespace-only `comment.md`/ping skip and the unparseable `decision.json` exit-0 path are still open silent paths adjacent to #864; an Owner follow-up, no new issue.
33. **Schedule-throttling watch:** event-driven wakes continue; the last recover-arm tick was 04:33:49Z and the expected ~06:03Z heartbeat did not fire. Platform throttling remains; the Auditor's lane owns schedule health; no dispatch this run.
34. **Comment-trigger burst:** the eval-verdict machine comment plus the explicit `/oc maintainer` spawned this run and the pending duplicate; the single-slot concurrency serializes them. This is designed concurrency behavior, not a defect; fold a dedupe into the next lab round.
35. **This run's artifacts:** `decision.json` is `[]`; `comment.md` is the #869 merge note; `personality.md` is empty; no `emergency.json`. The comment names no agent/workflow/model, carries no trigger token, and ends with the sign-off.
36. **#867 duplicate review run:** the earlier `/oc maintainer` comment spawned a second review run `46067351943` that shared the review group; it skipped at the job gate, as designed. No defect; the queue:max design held.
37. **Post-merge preview behavior:** `/preview/pr-869/` will return 404 after the merge because the Pages build only stages open PRs. This is expected; no defect. Record for the Curator's lane if a merged-preview redirect is ever wanted.
38. **Merge-push Pages gap:** an app-token merge does not fire the `push` trigger, so every session merge needs an explicit Pages dispatch and verification. This run dispatched `46128982216` and verified it; the hardcoded step may add a duplicate.
39. **Concurrent-session coordination:** always re-read the target threads before re-arming; a later session must not duplicate an earlier one's dispatches. The pending `46128739567` must stand down on #869.
40. **Memory-publish failure (now #870):** the 07:27Z triage session (`46121290367`) lost its memory update after three non-fast-forward push rejections. The #870 diagnosis: the agent's `--depth=1` fetch created a shallow graft, so the unforced publish fetch at `maintainer.yml:1339` rejected the shared-ref update; the loop then built an orphan root and the push was rejected too. The 07:55Z session's #70 ping corrected the false 07:35Z refresh claim. The fix is still open in #870. Do not run depth-limited fetches on the memory branch until it lands.
41. **Heartbeat arm:** the 04:33Z recover tick was the first observed heartbeat dispatch under #836 (90-minute cooldown marker on #70). The expected ~06:03Z tick did not land; do not re-dispatch the heartbeat yourself. Watch schedule health.
42. **Eval-handoff duplicate wake:** the eval workflow posts both the machine verdict and an explicit `/oc maintainer`; both pass the Maintainer guard and produce two wakes. The single-slot group serializes them; the second should stand down. Fold a dedupe into the next lab round; no new issue while the backlog clears.

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

- This run is an `issue_comment` eval-approval handoff wake on PR #869; the public artifact is the #869 merge note. `decision.json` is `[]`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure. This run posts the #869 merge note.
- The pipeline is green on main (`a5056e614`; the post-merge Pages deployment is live and the root and `/docs/` are 200), and the platform is perf-sensitive: multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed the lab draws at 16:54:13Z, 23:15:37Z, 03:05:44Z, 05:10:20Z, 11:13:26Z, 13:17:06Z, 19:23:31Z, 21:39:13Z, 02:28:28Z, 05:02:45Z, 08:29:54Z, 11:51:34Z, 14:46:36Z, 20:16:52Z, 21:17:30Z, 22:06:48Z, 02:47:26Z, 06:36:05Z, 07:30:40Z, 08:35:36Z, 09:08:40Z and 09:14:44Z, the eval draws at 13:10:30Z, 21:48:51Z, 00:44:09Z, 04:07:07Z, 08:57:22Z, 09:44:22Z, 12:09:23Z, 19:03:24Z, 21:44:40Z, 02:17:49Z, 04:49:23Z, 08:20:40Z and 08:36:23Z, the test draw at 18:44:57Z, the public-surface draws at 21:17:41Z (2026-11-25) and 21:12:06Z/21:15:03Z (2026-11-26), the review draw at 10:31:16Z, and the auditor/curator draws at 07:15Z/07:21Z and 07:27:06Z, while fresh runners completed the 12:15Z review, 12:46Z test, 16:00-17:08Z eval, 17:23-17:56Z repair pass, 17:56-18:22Z review, 21:12Z heartbeat, the 21:16-21:32Z test, the 00:03Z/03:38Z/08:01Z/08:36Z/09:00Z/10:06Z/10:24Z/11:19Z/11:28Z/11:46Z sessions, the 07:25Z/08:01Z auditor self-heal, the 08:12-08:53Z repair pass, the 09:29-10:06Z review retry, the 10:06-10:24Z lab pass, the 10:16-11:19Z quality draw, the 11:28-11:47Z review, the 11:47-12:00Z test, the 21:15Z public-surface schedule pass (before its agent was walled), the 04:31-04:40Z heartbeat session, the 07:12-07:53Z daily audit plus the 07:17-07:29Z curator tick, the 10:54-11:19Z quality draw, the 14:18-14:26Z heartbeat session, the 19:50Z schedule session, the 20:59-21:04Z #867 review, the 21:00Z triage session, the 21:07-21:16Z #867 test, the 21:16Z handoff session, the 21:20-21:28Z #867 quality draw, the 21:28Z merge session, the 21:34-21:41Z concurrent deferral session, the 21:35-21:44Z triage-plus-#812 session, the 02:32-02:37Z schedule session, the 04:34-04:40Z heartbeat session, the 06:58-07:20Z failure-triage session, the 07:16-07:27Z #869 review, the 07:27-07:55Z #869 test, the 07:55Z test-handoff session, the 08:05-08:38Z auditor pass, the 08:38Z audit-intake session, the 08:47-09:04Z #869 quality draw, the 09:04-09:07Z #869 merge session, and this 09:04Z eval-handoff session. Elapsed time alone is not proof; the run conclusion is.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Watch for the next #870/#812 re-arm after 09:17:44Z; prefer one lab draw per wake while the wall is active. On a push, review -> test -> quality -> merge.
2. Re-arm exactly one #870 lab draw on the next wake after 09:17:42Z; on a branch/PR, review -> test -> quality -> merge (the PAT sweep applies), then verify the memory publish actually fast-forwards.
3. The pending duplicate `46128739567` will run after this session; it must stand down on the merged #869 and not duplicate the #870 re-arm before the window.
4. Then the serialized queue: #814 (with the three-site resolver `createdAt` addendum, the deferral page-size wording, and the review/test non-blocking observations), #849, #857, #856, #860, #773, #774, then #742's remainder with the lab.yml PR-thread linkage-guard fix.
5. Verify the #869 merge holds: main `a5056e614`, root and `/docs/` 200 with the five-dimension copy, branch `66716de7` intact, #868 closed.
6. The fail-closed poster is proven live; keep watching the next session's `comment.md` and pings for the success line.
7. Keep #836 open for the Owner capacity decision; #831 is bookkeeping only; #821 stays parked.
8. Verify the board invariant, allowlist, registry/ladder, live site, held runs, schedule health, and the memory-publish ref behavior at each wake; if clean, stand by. Never run a depth-limited fetch on the memory branch.

## Open questions

1. Will the next #870/#812 re-arm after 09:17:42Z land on a fresh runner and complete, or hit the wall again?
2. Will the next wake after 09:17:42Z get a clean allowance bucket for the #870 re-arm, or will the wall continue? The capacity class is #836.
3. The duplicate Maintainer wake `46128739567` is queued from the eval handoff; will it stand down cleanly on the merged #869?
4. The eval workflow's machine verdict plus the explicit `/oc maintainer` produce two wakes; should the maintainer guard skip the machine verdict and rely on the explicit trigger? Fold into the next lab round.
5. The wall: the #870 draw died at 09:08:40Z after about 21 minutes, while the eval succeeded on the same wake. The per-egress-IP lottery is the only recovery; the capacity decision is #836.
6. The duplicate Pages deploy per merge and the older non-blocking quality items fold into the next lab round; no new issue while the backlog clears.
7. Should the eval and test lanes get a bounded in-workflow retry like review, or stay next-wake re-armed? Known gap; fold into the next lab round or #836.
8. The eval's non-blocking items: residual "Baseline parity" wording in two ideas project files, and no automated regression test guards the new five-phrase copy. Owner follow-up only; no new issue while the backlog clears.
9. Should the merged preview route's 404 after a merge be documented as expected behavior? It is by design; no action now.
10. Will the #870 fix's shallow-state clearing interact with the shared `refs/remotes/origin/logs` ref cleanly? The next session's publish is the proof; verify it and record the result.
