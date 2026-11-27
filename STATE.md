# STATE

Last updated: 2026-11-27T21:40Z by run 46071176136

(21:34Z duplicate handoff on merged PR #867. The previous session 46070508526 merged #867 at 21:29:37Z and closed #866; this wake verified the post-merge state and found a transient duplicate Pages deploy failure at 21:34:58Z, owned by the concurrent failure-triage run 46071245712. The #812 cooldown ends at 21:39:10Z, so this wake does not re-arm.)

## TL;DR for the next Hephaestus

- **This was the 21:34Z duplicate `/oc maintainer` handoff on merged PR #867** (`46071176136`). The merge landed at 21:29:37Z as `7cfe4684d`; #866 closed at 21:29:38Z; the branch is intact at `5db7a41d7`.
- **Production is 200 on `7cfe4684d`** at the root and `/docs/`, both serving "competitive baseline integrity" with zero "scientific depth"; `/preview/pr-867/` is 404 by design.
- **A duplicate post-merge Pages deploy `46071198260` FAILED at 21:34:58Z** ("Found 0 artifact(s)" after a successful upload) because the previous session's hardcoded "main advanced" step re-dispatched after the agent's manual deploy `46070782929` (success 21:31:27Z). Production is unaffected. The failure-triage run `46071245712` (workflow_run, started 21:35:04Z) owns it; this run does not duplicate the dispatch.
- **#812's draw `46068400249` FAILED on the wall at 21:18:07Z**; the 30-minute window from the 21:09:10Z trigger ends at 21:39:10Z. This wake started 21:34:25Z, before the boundary, so it does not re-arm. The next fresh wake after 21:39:10Z takes exactly one draw.
- **Two maintainer sessions are live**: this run and the failure-triage run `46071245712`. Do not duplicate each other's dispatches; the failure-triage run owns the Pages failure.
- **Main `7cfe4684d`; `maintainer/logs` tip `a945adec`.** Models 110/10 free; ladder 3/3 live; allowlist 19 + maintainer + 3 GitHub-managed = 23; board resolves `70`; held 0; the seven stale queued runs unchanged.
- **Do not duplicate:** no review/test/eval on #867 (merged); no Pages re-dispatch from this run; no #812 re-arm before 21:39:10Z; the queue (#814, #849, #857, #856, #860, #773, #774, #742) stays behind #812.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the lab engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due.

## Right now (surveyed 21:34-21:39Z on 2026-11-27)

### GitHub state

- **Main:** `7cfe4684d2ce6ea0ba17492c9b9889d91a1d31fb` (the #867 rebase merge; the empty fixer commit was dropped, as rebase does). **`maintainer/logs` tip:** `a945adec0c685b17c75b9041353ded0247d370ce` (the 21:33Z session publish; STATE stamp `2026-11-27T21:33Z by run 46070508526`).
- **#867:** MERGED at 21:29:37Z; head `5db7a41d7eb3f5f9d041902d529fca021e235934`; merge commit `7cfe4684d`; branch intact (never deleted); four files +5/-5 (`README.md`, `docs/index.md`, `docs/index.html`, `index.html`); `Fixes #866`. Review approved 21:06:56Z, machine `/oc approve-test` 21:16:23Z, machine `approve-eval` 21:28:16Z bound to the head. No `/oc fix` after 21:04:02Z, no rejection.
- **#866:** CLOSED at 21:29:38Z (auto-close on merge).
- **#812:** open; the 21:09:10Z `/oc lab` draw `46068400249` FAILED at 21:18:07Z on the wall after about nine minutes; no decision file, no push, no branch. The 30-minute cooldown from the 21:09:10Z trigger ends at 21:39:10Z.
- **Open PRs (1):** #821 `dce109e4` (parked, untouched since 2026-11-07; CLEAN/MERGEABLE).
- **Open issues (22 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #812, #814, #831, #836, #849, #856, #857, #860. #70 is the only `lab-health` board; #42 is the only `brainstorm` issue.
- **Board invariant holds:** `health-board.sh` resolves `70`; only #70 carries `lab-health` and the exact title. Newest notes: the 21:18:30Z quota intake and the 21:34:27Z merge/wall note.
- **Latest events:** the 21:34:22Z `/oc maintainer` (this wake), the 21:34:27Z merge note from the previous session, the 21:34:37Z duplicate deploy dispatch, its 21:34:58Z failure, and the 21:35:02Z failure-triage wake; no human comment otherwise since 11:19:33Z.
- **Branch tips:** main `7cfe4684d`, `maintainer/logs` `a945adec`, #867 `5db7a41d7` (intact), #865 `818de0af3` (intact), #821 `dce109e4`, the selector branch `opencode/lab-848-shared-health-board-selector` at `c1040c0c` (intact), the #859 branch `opencode/issue858-curate-umbra-count-copy` at `9b862e48` (never delete), the #854 branch `opencode/issue803-20261115060707` at `d449afb9` (archival). No #812 branch. No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3). **In progress at survey:** this run and the failure-triage run `46071245712`.
- **This run:** `46071176136`, `issue_comment` (`/oc maintainer` on PR #867 by Userfrom1995 at 21:34:22Z, after the merge), created 21:34:25Z; trusted pre-agent checkout main `7cfe4684d`; session tree HEAD `5db7a41d7` (the CLI PR checkout); no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **#867 quality `46069621847`:** success; the 21:20:10Z `/oc eval` trigger produced the 21:28:07Z `approve-eval` verdict (9.84/10), the 21:28:13Z signed report, the 21:28:16Z machine marker (`eval-head: 5db7a41d7...`, `eval-trigger: 7228351214`), and the 21:28:18Z handoff.
- **#867 merge:** the 21:28Z session merged at 21:29:37Z with `gh pr merge --rebase --match-head-commit 5db7a41d7`; main advanced to `7cfe4684d`; #866 closed at 21:29:38Z; the branch is intact.
- **Production deploy `46070782929`:** the 21:28Z session dispatched it at 21:30:49Z because the app-token merge push fired no `push` run; it succeeded at 21:31:27Z on `7cfe4684d`.
- **Duplicate Pages deploy `46071198260`:** the previous session's hardcoded "Trigger pages deployment if main advanced" step dispatched it at 21:34:37Z after the manual deploy; the job staged and uploaded its artifact successfully, then the deploy step failed at 21:34:58Z with "Found 0 artifact(s)" (a transient artifact-metadata API flake). Production is unaffected because `46070782929` already serves `7cfe4684d`.
- **Failure-triage `46071245712`:** `workflow_run` for the failed duplicate deploy, started 21:35:04Z; in progress at survey. It owns the Pages follow-up; this run does not duplicate it.
- **PAT merge sweep:** the previous session's sweep logs "PR #867 does not touch workflows; skipping PAT merge". Non-workflow PRs are the session's merge lane; the sweep only handles workflow-touching PRs.
- **Failures today (7):** the 08:03Z eval `45962732155`, the 08:03Z lab `45962733843`, the 10:54Z lab `45985972678`, the 14:26Z lab `46015912787`, the 19:54Z lab `46059991293`, the 21:09Z lab `46068400249` (all wall deaths), and the 21:34Z duplicate Pages deploy `46071198260` (transient artifact fetch, not a wall).
- **Pages:** production root HTTP 200 and `/docs/` HTTP 200 on `7cfe4684d`, both serving "competitive baseline integrity" with zero "scientific depth"; `/preview/pr-867/` 404 by design (merged PR preview retired).
- **Model registry:** 110 / 10 free at 21:38Z; pin and `small_model` `opencode/deepseek-v4.1-flash-free`; the three ladder rungs (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`) are live (registry ids carry no `opencode/` prefix); `maintainer.yml` `REQUESTED_MODEL` is the same free pin. No upgrade.
- **Allowlist:** 19 names on `main` plus the self-excluded maintainer = 20 repo-managed; live 23 = those 20 plus Dependabot Updates, Dependency Graph, and pages-build-deployment; zero missing, zero extra.
- **Setup:** `bash setup.sh --check` exits 0; the only warning is the known branch-protection note.

### Live lanes and their next step

- **#867 (public-surface rubric copy):** MERGED; #866 closed; production verified. Nothing left to dispatch. Do not reopen or re-gate.
- **#812 (R11 audit bypass):** open; its draw died on the wall. Re-arm exactly one fresh draw on the next fresh wake after 21:39:10Z. On a push, the workflow forwards a fresh review; then test, quality, merge. The fix: scope the R11 extraction to the unique `lab:` job, pin the linkage-guard ordering, add the decoy and ordering mutants, and fold in the LAB.md correction.
- **#814 (fail-open baseline read):** next after #812; includes the three-site resolver `createdAt` addendum, the deferral page-size wording, and the review/test non-blocking observations.
- **#849 (fail-loud hardening):** after #814.
- **#857 / #856 / #860 (fail-loud backlog):** serialized after #849.
- **#773/#774:** the LAB.md read-only-scope contradiction plus the phantom step reference, and the stale `setup.sh --check` roster; parked as the post-delivery batch.
- **#742 remainder (tracker):** open; the candidate lane for the remaining owner-credential steps and follow-ups, including the lab.yml PR-thread linkage guard.
- **#836 (capacity):** open for the Owner capacity decision. The per-egress-IP wall remains the only fix that ends the recurrence; no new lab dispatch beyond #812.
- **#821 / #792** (Maze Chase Windows harness): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw per lane; the #812 lab lane is the only live infra lane; no product gate is live (the #867 lane is closed).
- **Two maintainer sessions:** this run (`issue_comment` on #867) and the failure-triage run `46071245712` (`workflow_run` for the failed Pages deploy). They may run concurrently; this run does not re-dispatch Pages or re-arm #812.
- **Cooldowns:** the last lab trigger was 21:09:10Z; its 30-minute window ends at 21:39:10Z. No second lab draw before then. No eval/test/review is live or queued anywhere.
- **Pages duplicate rule:** the session's manual deploy and the hardcoded "main advanced" deploy can double-dispatch; the second is redundant and may flake on the artifact fetch. Production is already on the merged head; do not chase a duplicate failure as a production outage.
- **Wall rule:** the wall is per egress IP. It killed the eval draws at 12:09:23Z, 19:03:24Z, 21:44:40Z, 02:17:49Z, 04:49:23Z, 08:20:40Z and 08:03Z, and the lab draws at 13:17:06Z, 19:23:31Z, 21:39:13Z, 02:28:28Z, 05:02:45Z, 08:29:54Z, 11:51:34Z, 14:46:36Z, 20:16:52Z and 21:17:30Z; the 10:54Z pair survived the start (the eval completed; the lab died at the 57-minute mark). The retry-after headers are diagnostic only and never a park horizon; a fresh wake on a new runner is the designed recovery, not a same-pool retry. Do not burst.
- **Checkpoint rule:** if a lab head advances with partial commits and a pass dies without signalling review, do NOT dispatch a review on that partial head. Only a `review` signal (or an explicitly complete pass) authorizes the review/test/eval chain.
- **Review retry rule:** the review workflow has its bounded auto-retry chain (the #754/#827 rule), but a wall death needs a Maintainer re-arm, not an auto-retry. Do not dispatch a duplicate while a review run is live or queued.
- **Test rule:** the test workflow has no in-workflow retry chain; every wall death needs a Maintainer re-arm.
- **Eval retry rule:** the eval lane has no in-workflow auto-retry chain; if the dispatched eval dies on the wall or crashes without a decision, the next Maintainer wake re-arms exactly one fresh eval on the same head after confirming no live or queued eval.
- **Merge rule:** the PAT merge sweep only handles workflow-touching PRs; the Maintainer session merges every other approved PR with `gh pr merge --rebase --match-head-commit <head>` (never `--delete-branch`). The app-token merge push fires no `push` run, so the hardcoded post-merge step (or the session) must dispatch the Pages deploy and verify it; avoid double-dispatching where possible.
- **Public-surface rule:** the scheduled public-surface arm has a bounded self-heal of 1; the 20:49Z six-hour tick landed clean and produced #866/#867, now delivered.
- Do not dispatch #814/#849/#857/#856/#860/#773/#774/#742 until #812's lane is known (merged or verdict).
- Never merge without a head-fresh test marker and a head-bound quality approval. Workflow-touching PRs merge only through the hardened owner-credential sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#812:** re-arm one fresh draw on the next fresh wake after 21:39:10Z; on a push, review -> test -> quality -> merge. The R11 scoping fix plus the LAB.md fold-in.
2. `{"action":"lab","issue":814}`: after #812; fail-closed baseline read in the fix lane, add `createdAt` to all three pre-existing resolver `--json` lists, and update the R32 pins in lockstep.
3. `{"action":"lab","issue":849}`: after #814; on a push, the review/test chain; re-arm its wall-killed trigger.
4. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
5. `{"action":"lab","issue":856}`: after #857.
6. `{"action":"lab","issue":860}`: after #856.
7. `{"action":"lab","issue":773}`: after #860; correct the LAB.md read-only scope claim and the phantom step reference; R1-R37 audit and pins in lockstep.
8. `{"action":"lab","issue":774}`: after #773; extend `setup.sh --check` to the full current roster and workflow set.
9. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups, including the lab.yml PR-thread linkage guard; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #867 is merged and #866 is closed; the branch is intact at `5db7a41d7`; do not delete it, re-open #866, or re-dispatch any gate on the merged head.
2. #812: its draw died on the wall at 21:17:30Z; re-arm one fresh draw after 21:39:10Z on a fresh wake. If it dies again, no same-pool retry.
3. **Pages duplicate flake:** the 21:34:37 deploy `46071198260` uploaded its artifact successfully but the deploy step found 0 artifacts at 21:34:55 and failed at 21:34:58. Production is 200 from the 21:31:27 deploy `46070782929`. The failure-triage run `46071245712` owns it. Fold a de-dup improvement (session manual deploy vs. the hardcoded main-advanced deploy) into the next lab round; no new issue while the backlog clears.
4. The lab.yml linkage guard is a real workflow defect: on a PR thread it appends `Closes #<PR>` because the trigger number is the PR. It should skip PR threads or use `Refs`. Fold into the #742 remainder or the next lab round.
5. #865 is merged and #864 closed; the branch is intact at `818de0af3`; do not delete it, re-open #864, or re-dispatch any gate on the merged head.
6. The quality report's non-blocking items: the Maintainer prompt's spaced sign-off variant can append a cosmetic second sign-off; a NUL-byte body raises an uncaught ValueError (red, not a silent drop); the poster resolves `gh` from the ambient PATH; the whitespace-only `comment.md`/ping skip and the unparseable `decision.json` exit-0 path remain. Fold into the next lab round; no new issue while the backlog clears.
7. The pre-existing resolver sites (`opencode.yml` baseline/phase resolvers and the review linked-PR resolver) still need the `createdAt`/`--limit 100` corrections; all fold into #814 with the pins.
8. The 15:46Z post failure's tracking issue (#864) and repair PR (#865) are both closed; the poster now fails closed on main. The 11:36Z, 11:51Z, 14:47Z, 20:17Z, 21:09Z and 21:20Z notes are live proof under the new code; all posted.
9. #853, #848, #815, #803, #864 and #866 are closed; #831 is bookkeeping only.
10. Pages: production 200 on `7cfe4684d`; `/docs/` 200; `/preview/pr-867/` 404 by design (merged PR preview retired). The deploy `46070782929` succeeded at 21:31:27Z; the duplicate `46071198260` failed transiently and is being triaged.
11. #836 stays open for the Owner capacity decision; no new lab dispatch beyond #812.
12. Model registry drift: 110 / 10 free at 21:38Z; the ladder is 3/3 on main and all three rungs are live. No lab dispatch.
13. #821 stays parked; the Maze Chase standing set is frozen unless the Owner asks.
14. The seven stale queued runs are unchanged; do not cancel or re-dispatch them.
15. Memory: the 2026-11-25 file carries the 02:36Z session, the three run markers, the 05:01Z, 08:05Z, 10:10Z, 10:56Z, 11:12Z, 12:15Z, 12:46Z, 13:11Z quota marker, 15:46Z, 17:07Z, 17:56Z, 18:22Z, 21:12Z, 21:18Z, 21:32Z and 21:49Z sessions/markers; the 2026-11-26 file carries the 00:03Z session, the 00:44Z intake marker, the 03:38Z session, the 04:08Z intake marker, the 08:01Z session, the 08:36Z session, the 08:57Z quota-intake marker, the 09:00Z session, the 09:45Z intake marker, the 10:06Z session, the 10:24Z session, the 11:19Z session, the 11:28Z session, the 11:46Z session, the 12:00Z session, the 12:09Z/13:17Z intake markers, the 18:37Z session, the 19:03Z/19:23Z/21:15Z intake markers, the 21:15Z session, and the 21:39Z/21:44Z intake markers; the 2026-11-27 file carries the 02:02Z session, the 02:17Z/02:28Z intake markers, the 04:31Z heartbeat session, the 04:49Z/05:03Z intake markers, the 07:53Z session, the 08:21Z/08:30Z intake markers, the 10:44Z session, the 11:19Z session, the 11:28Z session, the 11:51Z intake marker, the 14:18Z heartbeat session, the 14:46Z intake marker, the 19:50Z schedule session, the 20:16Z intake marker, the 21:00Z triage session, the 21:16Z handoff session, the 21:28Z merge session, and this 21:34Z duplicate-wake session. Append-only, keep-both.
16. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round.
17. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
18. The merged tree carries the R26 canonical manifest and the R30 poster block SHA in lockstep with `maintainer.yml`; the post-merge patch-ids prove the merged tree is the audited tree. The next lab pass that edits either file must regenerate them.
19. No `emergency.json`: the maintainer workflow is alive, production is serving, and no failed lab attempt is being bypassed.
20. The general job's contains-based matcher fired again on the 2026-11-26 eval approval report; watch item for a future lab round, no new issue.
21. **Resolver addendum:** three pre-existing resolver sites remain on the head, `opencode.yml:839` (the baseline resolver the reviewer cited at `:838` on main), `:1162`, and `:1397`; all sort by `.createdAt` without requesting it. Fold all three plus pins into the #814 fix-lane hardening pass.
22. **Design-lane note:** a manual design trigger placed on a PR thread would day-scope there; the designed issue invocation and the phase-completion forward are unaffected. No action now.
23. **Eval recovery watch:** no eval is live; the #867 lane closed. The #812 quality pass follows its test approval.
24. **Test-lane auto-retry gap:** the test workflow has no in-workflow retry chain (unlike review), so every wall death needs a Maintainer re-arm. The eval lane shares the gap. Watch item for the next lab round; no duplicate issue while #836 is open.
25. **Public-surface self-heal cap:** the cap of 1 worked as designed on 2026-11-26 (one re-dispatch, then escalation). The 20:49Z six-hour tick landed green and produced #866/#867; this wake verified the delivery. The next tick is the next recovery window.
26. **Quota intake behavior:** the 20:16Z intake again skipped the agent, posted the audit note, and chained no fresh draw; the intake workspace has no `.maintainer/quota-wall` marker, so its recovery step is a no-op (known #26). Record for the #836 capacity decision; no new issue.
27. **Intake memory gap:** the 20:16Z intake appended only its run marker and did not refresh STATE.md. The 21:09Z, 21:16Z and 21:28Z sessions published fresh STATEs. Watch whether future intake publishes do the same.
28. **Wall-duration variance:** the 08:03Z pair died at 17m (quality) and 26m (infrastructure); the 10:54Z eval completed at 25m while the 10:54Z lab died at 57m; the 14:26Z lab died at 20m; the 19:54Z lab died at 22m; the 21:09Z lab died at 9m; the earlier #812 draws ranged 17m to 1h39m. Record for the #836 capacity decision; do not change the single-draw rule.
29. **Comment-poster lane:** #864's repair merged; the poster now executes the real code against a mock `gh` and fails closed on an empty/unparseable body or exhausted retries; the R30 fixture covers the idless, mixed-sticky, and signed-ok cases. The 11:36Z, 11:51Z, 14:47Z, 20:17Z, 21:09Z and 21:20Z notes are live proof. The trigger poster's non-fatal error path folds into the next lab round.
30. **#865 review/test observations:** the whitespace-only `comment.md`/ping skip and the unparseable `decision.json` exit-0 path are still open silent paths adjacent to #864; an Owner follow-up, no new issue.
31. **Schedule-throttling watch:** the Maintainer schedule's prior tick was 19:50Z; the recover arm's last tick was 14:18Z; the curator six-hour tick landed at 20:49Z. The 18:00Z public-surface tick did not land; the 20:49Z tick landed instead. Platform throttling; the Auditor's lane owns schedule health; no dispatch this run.
32. **Comment-trigger burst:** the 21:16Z, 21:28Z and 21:34Z report/marker/handoff wakes produced about 30 skipped/cancelled maintainer runs each; the single pending slot absorbed them. Fold into the next lab round if the noise grows.
33. **This run's artifacts:** `decision.json` is `[]`; `comment.md` posts the #867 post-merge verification note; `personality.md` is empty; no `emergency.json`. The comment names no agent/workflow/model, carries no trigger token, and ends with the sign-off.
34. **#867 duplicate review run:** the earlier `/oc maintainer` comment spawned a second review run `46067351943` that shared the review group; it skipped at the job gate, as designed. No defect; the queue:max design held.
35. **Post-merge preview behavior:** `/preview/pr-867/` returns 404 after the merge because the Pages build only stages open PRs. This is expected; no defect. Record for the Curator's lane if a merged-preview redirect is ever wanted.
36. **Merge-push Pages gap and duplicate dispatch:** an app-token merge does not fire the `push` trigger, so a session merge needs an explicit Pages dispatch; the hardcoded "main advanced" step also dispatches one. This run's predecessor did both: `46070782929` succeeded and the duplicate `46071198260` failed on the artifact fetch. The failure-triage run `46071245712` owns the duplicate. Record the de-dup improvement for the next lab round.
37. **Concurrent failure-triage session:** `46071245712` (workflow_run for the failed duplicate deploy) started at 21:35:02Z and is in progress. It may post its own board note and/or re-dispatch the deploy. This run deliberately stands down on both Pages and #812 to avoid duplicate triggers.
38. **Duplicate `/oc maintainer` wake:** the 21:34:22Z handoff arrived on an already-merged PR; the previous session's merge note posted at 21:34:27Z and this wake at 21:34:25Z overlapped it. No action beyond verification; watch the comment-trigger noise (the general/eval handoff flow can summon duplicate wakes).

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

- This run is an `issue_comment` wake on PR #867; the public artifact is the #867 post-merge verification note via `comment.md`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure. This run posts the #867 post-merge verification note.
- The pipeline is green on main (`7cfe4684d`; the new-main Pages deployment is live and the root and `/docs/` are 200), and the platform is perf-sensitive: multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed the lab draws at 16:54:13Z, 23:15:37Z, 03:05:44Z, 05:10:20Z, 11:13:26Z, 13:17:06Z, 19:23:31Z, 21:39:13Z, 02:28:28Z, 05:02:45Z, 08:29:54Z, 11:51:34Z, 14:46:36Z, 20:16:52Z and 21:17:30Z, the eval draws at 13:10:30Z, 21:48:51Z, 00:44:09Z, 04:07:07Z, 08:57:22Z, 09:44:22Z, 12:09:23Z, 19:03:24Z, 21:44:40Z, 02:17:49Z, 04:49:23Z and 08:20:40Z, the test draw at 18:44:57Z, the public-surface draws at 21:17:41Z (2026-11-25) and 21:12:06Z/21:15:03Z (2026-11-26), the review draw at 10:31:16Z, and the auditor/curator draws at 07:15Z/07:21Z, while fresh runners completed the 12:15Z review, 12:46Z test, 16:00-17:08Z eval, 17:23-17:56Z repair pass, 17:56-18:22Z review, 21:12Z heartbeat, the 21:16-21:32Z test, the 00:03Z/03:38Z/08:01Z/08:36Z/09:00Z/10:06Z/10:24Z/11:19Z/11:28Z/11:46Z sessions, the 07:25Z/08:01Z auditor self-heal, the 08:12-08:53Z repair pass, the 09:29-10:06Z review retry, the 10:06-10:24Z lab pass, the 10:16-11:19Z quality draw, the 11:28-11:47Z review, the 11:47-12:00Z test, the 21:15Z public-surface schedule pass (before its agent was walled), the 04:31-04:40Z heartbeat session, the 07:12-07:53Z daily audit plus the 07:17-07:29Z curator tick, the 10:54-11:19Z quality draw, the 14:18-14:26Z heartbeat session, the 19:50Z schedule session, the 20:59-21:04Z #867 review, the 21:00Z triage session, the 21:07-21:16Z #867 test, the 21:16Z handoff session, the 21:20-21:28Z #867 quality draw, and the 21:28Z merge session. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Re-arm exactly one fresh #812 draw on the next fresh wake after 21:39:10Z (confirm no live or queued lab first). On a push, the workflow forwards a fresh review; then test, quality, merge. If it dies on the wall again, no same-pool retry.
2. Then the serialized queue: #814 (with the three-site resolver `createdAt` addendum, the deferral page-size wording, and the review/test non-blocking observations), #849, #857, #856, #860, #773, #774, then #742's remainder with the lab.yml PR-thread linkage-guard fix.
3. Verify the #867 production state holds: main `7cfe4684d`, root and `/docs/` 200 with the five-dimension copy, branch `5db7a41d7` intact, #866 closed.
4. Watch the Pages duplicate: production is 200; the failure-triage run `46071245712` owns the failed duplicate deploy; do not re-dispatch unless production actually goes stale.
5. The fail-closed poster is proven live (the 11:36Z, 11:51Z, 14:47Z, 20:17Z, 21:09Z and 21:20Z notes posted); keep watching the next session's `comment.md` and pings for the success line.
6. Public surface: no re-dispatch; the 20:49Z tick landed and produced #866/#867, now delivered; the next six-hour tick is the next window.
7. Keep #836 open for the Owner capacity decision; #831 is bookkeeping only; #848, #853, #815, #803, #864 and #866 are closed; #821 stays parked.
8. Verify the board invariant, allowlist, registry/ladder, live site, held runs, schedule health, and the delayed ticks at each wake; if clean, stand by.

## Open questions

1. Will the next fresh wake after 21:39Z get a clean #812 draw, or will the pool-wide wall kill it again?
2. The duplicate Pages deploy flake: is the artifact-metadata "Found 0 artifact(s)" a transient GitHub API issue, and should the session stop manually dispatching once the hardcoded main-advanced step exists? Fold into the next lab round; no new issue.
3. The eval's non-blocking items: residual "Baseline parity" wording in two ideas project files, and no automated regression test guards the new five-phrase copy. Owner follow-up only; no new issue while the backlog clears.
4. The quality report's older non-blocking items (the spaced sign-off variant can append a cosmetic second sign-off, a NUL-byte body raises an uncaught ValueError, the poster resolves `gh` from the ambient PATH, and the whitespace-only/unparseable-decision skips remain) fold into the next lab round; no new issue.
5. Should the eval/test lanes get a bounded in-workflow retry like review, or stay next-wake re-armed? Known gap; fold into the next lab round or #836.
6. Why did the 20-minute Maintainer and recover cadences produce zero ticks between 14:47Z and 19:50Z? Platform throttling is the likely cause; the Auditor's lane owns schedule health, and the capacity class is #836.
7. Should the merged preview route's 404 after a merge be documented as expected behavior? It is by design; no action now.
8. Did the 21:34:22Z `/oc maintainer` come from the general/eval handoff flow, and can the duplicate wake on a merged PR be suppressed? Watch the comment-trigger noise; no new issue while the backlog clears.
