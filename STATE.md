# STATE

Last updated: 2026-11-28T12:42Z by run 46145179728

(12:32Z `issue_comment` wake on PR #871: the owner-authored review report requested infrastructure changes (process finding: no delegation ledger, no skills note, inaccurate threshold claim), and the review workflow posted `/oc lab`; the repair run `46145183043` is in flight. #812's 11:02Z draw died on the provider wall at 11:31:58Z and is held behind #871 because both edit `.github/scripts/silent-stall-audit.sh` and `LAB.md`. No new dispatch; comment on #871 only.)

## TL;DR for the next Hephaestus

- **This was an `issue_comment` wake `46145179728`** on PR #871 (the owner-authored review report at 12:32:34Z). The lab repair `46145183043` is in flight from the review workflow's `/oc lab` (12:32:36Z). No new dispatch is needed.
- **PR #871** (memory-publish shallow-graft fix): head `c0d8ac80` (one commit on main), MERGEABLE/UNSTABLE, only GitGuardian green; the review requested changes at 12:32:34Z on a blocking process finding (delegation ledger, skills note, inaccurate threshold claim) while verifying the technical fix sound. No new head yet. On the repaired head: review -> test -> quality -> merge (PAT sweep), then verify the memory publish fast-forwards.
- **#812** (R11 audit bypass): the 11:02Z draw died on the wall at 11:31:58Z with no branch; its 30-minute window ended 12:01:58Z. NOT re-armed this wake: it edits the same audit script and `LAB.md` as #871; re-arm on the post-#871 main.
- **#870** is open and closes with #871. **#869 is MERGED**; do not touch.
- **Main `a5056e614`; `maintainer/logs` tip `f5481902`; models 110/10 free; ladder 3/3 live; allowlist 19 + maintainer + 3 managed = 23 live; board resolves `70`; production 200; held 3 (the #871 PR-open runs); waiting 0; requested 0; queued the seven stale runs.**
- **Do not duplicate:** no second lab pass on #871; no review/test/eval before the repaired head; no #812 draw until #871 lands; no gate on #869; no auditor/ideate/curate/recover; no merge.
- **Memory publish:** the memory load fetched `maintainer/logs` tip `f5481902` with a full fetch; this session ran no depth-limited fetch, so the publish should fast-forward. Never run a depth-limited fetch on the memory branch (#870).

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the lab engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due.

## Right now (surveyed 12:33-12:40Z on 2026-11-28)

### GitHub state

- **Main:** `a5056e614a411a65e36c6d406fb72c8e568ef10e` (unchanged). **`maintainer/logs` tip:** `f5481902f75f15114f1e0887c8dc687eabc32dda` at 11:32:56Z (the 11:32Z quota intake's marker-only publish; it did not refresh STATE.md).
- **PR #871:** open; head `c0d8ac80333ecdd7da5651132a6bbaa2beb0bc5f` (one commit on main `a5056e614`); base `main`; MERGEABLE/UNSTABLE; rollup has only GitGuardian SUCCESS; the review report at 12:32:34Z requested changes on process finding F1 (no valid delegation ledger, no skills note, inaccurate "threshold was not met" claim) and verified the technical fix sound; the `/oc lab` repair trigger posted 12:32:36Z; the repair run `46145183043` is in progress. No new head yet.
- **#870:** open; the 11:02Z draw `46138004819` succeeded at 11:35:21Z and produced branch/PR #871 (branch `opencode/lab-870-memory-publish-shallow-graft` at `c0d8ac80`). It closes on merge.
- **#812:** open; the 11:02Z draw `46138005838` failed at 11:32:26Z on the provider wall (`FreeUsageLimitError` at 11:31:58Z, retry-after 46249); no decision file, no push, no branch. Its window ended 12:01:58Z. Held for serialization behind #871 (shared audit script and `LAB.md`).
- **#821:** open, parked since 2026-11-07; CLEAN/MERGEABLE; no gates; do not touch.
- **Open issues (23 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #812, #814, #831, #836, #849, #856, #857, #860, #870. #70 is the only `lab-health` board; #42 the only `brainstorm`. No untriaged issue.
- **Board invariant holds:** `health-board.sh` resolves `70`; only #70 carries `lab-health` and the exact title. Newest note: the 11:32:49Z (#812) quota-wall intake note.
- **Latest comments since 11:00Z:** 11:02:50Z the 10:52Z schedule note on #70; 11:02:51Z `/oc lab` on #870; 11:02:52Z `/oc lab` on #812; 11:32:49Z the quota note on #70; 11:35:04Z the #870 "Done" comment; 11:35:16Z `/oc review` on #871; 12:10:42Z `/oc review (auto-retry 1)`; 12:32:27Z the bot review summary; 12:32:34Z the owner review report; 12:32:36Z `/oc lab`. No human comment.
- **Branch tips:** main `a5056e614`, `maintainer/logs` `f5481902`, #871 `c0d8ac80` (new), #869 `66716de7` (intact), #821 `dce109e4`, #867 `5db7a41d7` (intact), #865 `818de0af3` (intact), selector branch `opencode/lab-848-shared-health-board-selector` at `c1040c0c` (intact), #859 branch `opencode/issue858-curate-umbra-count-copy` at `9b862e48` (never delete), #854 branch `opencode/issue803-20261115060707` at `d449afb9` (archival), the stale queued-run branches `opencode/lab-843-review-cap-r17-hermetic` `ccdcf49b`, `opencode/issue532-20261005154527` `836870be`, `opencode/lab-427-actor-permission-preflight` `ef4770fe`, `opencode/lab-620-freetier-retry` `cfe55726` (unchanged). No #812 branch.
- **Held:** 3 (`Deploy static site to GitHub Pages` `46140591369`, `maintainer` `46140591428`, `opencode-pr-trigger` `46140591368`, all from the 11:35:18Z PR-open event). The hardcoded approve step will clear them; the pr-trigger posts `/oc maintainer` and the maintainer pull_request run may add wakes on #871, serialized by the single-slot `maintainer-871` group. **Waiting:** 0. **Requested:** 0. **Queued:** the seven known stale runs, unchanged (`42971888736`, `42971888815`, `42971888785`, `37344324101`, `36101155868`, `36101155851`, `36101155844`). **In progress:** the #871 repair `46145183043` and this run.
- **This run:** `46145179728`, `issue_comment` on PR #871, created 12:32:37Z, `head_sha` `a5056e614`; the workflow checkout was pinned to main, then the CLI bootstrap checked out the PR head `c0d8ac80` and the workspace is shallow (`.git/shallow` = `44ac37be5`, a main-history boundary); no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **#871 review:** the first run `46140593197` (11:35:19Z) ended with no published verdict at 12:10:41Z ("crashed mid-run, e.g. Provider finish_reason: network_error / APIError"); the workflow posted `/oc review (auto-retry 1)` at 12:10:42Z; the retry `46143364818` succeeded at 12:32:41Z and posted the machine summary and the owner report. The review auto-retry chain worked as designed.
- **#871 repair:** `46145183043` started 12:32:39Z from the `/oc lab` trigger; in progress at survey time; no log flushed yet; no new head.
- **#812 draw:** `46138005838` failed at 11:32:26Z on the wall; the verify step failed closed with no decision file; the quota intake `46140365985` completed at 11:33:04Z, posted the 11:32:49Z note, and published only a marker at 11:32:56Z (`f5481902`).
- **#870 draw:** `46138004819` succeeded at 11:35:21Z; branch/PR #871 opened 11:35:14Z.
- **Failures on 2026-11-28 (12):** the 02:37Z lab `46098961105` (wall), the 04:40Z lab `46108627253` (wall), the 06:45Z auditor `46118061616` (deferral-guard read), the 07:27Z auditor `46119019040` (wall), the 07:30Z lab `46120776098` (wall), the 07:37Z maintainer memory publish `46121290367` (non-fast-forward), the 08:36Z eval `46124195870` (wall), the 08:36Z lab `46124197825` (wall), the 09:08Z #870 lab `46127467430` (wall), the 09:14Z #812 lab `46127468911` (wall), the 09:52Z #870 lab `46130269626` (wall), and the 11:32Z #812 lab `46138005838` (wall). The 11:35Z review run `46140593197` ended without a verdict but its in-workflow auto-retry recovered, so it is not counted as a red failure.
- **Pages:** production root and `/docs/` HTTP 200 on `a5056e614` (both re-verified at 12:38Z; the marker text is present). The serving deploy is `46128982216`.
- **Model registry:** 110 / 10 free at ~12:38Z; pin and `small_model` `opencode/deepseek-v4.1-flash-free`; the three ladder rungs (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`) are live; `maintainer.yml` `REQUESTED_MODEL` is the same free pin. No upgrade.
- **Allowlist:** 19 names on `main` plus the self-excluded maintainer = 20 repo-managed; live 23 = those 20 plus Dependabot Updates, Dependency Graph, and pages-build-deployment; zero missing, zero extra.
- **Setup:** `bash setup.sh --check` exits 0; `gh api rate_limit` core 4955, graphql 4990.

### Live lanes and their next step

- **#871 (memory publish, #870):** in repair. The review requested changes on a process finding only; the repair run is in flight. On the new head: the lab workflow forwards `/oc review`; the review must approve before the test and quality gates; then the PAT merge sweep (the PR touches workflow files) and a publish verification on the next session.
- **#812 (R11 audit bypass):** held behind #871. Its 11:02Z draw died on the wall; the window has passed, but the shared audit script and `LAB.md` make a concurrent branch conflict with #871. Re-arm exactly one fresh draw on the post-#871 main.
- **#870:** open; closes with #871. No separate dispatch.
- **#869:** DONE. Merged on head `66716de7` as `a5056e614`; #868 closed; branch intact; Pages verified. Do not re-dispatch any gate.
- **Auditor:** the 08:38Z fresh pass filed #870 and completed; the next scheduled tick is midnight UTC. No dispatch.
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

- **One lab draw per wake while the wall is active.** The 10:52Z two-draw revision ended with #870 landing (PR #871) and #812 dying on the wall at 11:31:58Z. Return to one draw per wake; the serialized queue resumes #812 on the post-#871 main.
- **#812 serialization is required by scope:** #812 edits `.github/scripts/silent-stall-audit.sh` and `LAB.md` (plus `opencode-test.yml`); #871 edits the same audit script and `LAB.md`. The issue's own queue note forbids a competing pass while the audit script is edited by another PR. Do not dispatch #812 until #871 is merged or abandoned.
- **Windows:** the #871 review trigger was 11:35:16Z (auto-retry 12:10:42Z, approved/reported 12:32:27Z); the #871 repair trigger was 12:32:36Z (in flight); the #812 trigger was 11:02:52Z (died 11:31:58Z); its window ended 12:01:58Z. The last eval trigger was 08:47:43Z (approved 09:04:17Z); no new eval.
- **Overlapping sessions:** this run and the #871 repair are live; the duplicate maintainer run `46145183118` (from the `/oc lab` comment) is queued behind this session in the single-slot `maintainer-871` group and should skip at the job gate. The 11:32Z quota intake `46140365985` completed at 11:33:04Z.
- **Held-run approval wake class:** approving the three PR-open held runs will let `opencode-pr-trigger` post `/oc maintainer` and the `maintainer` pull_request run start; both land in the `maintainer-871` group and will survey/stand down. Watch for duplicate wakes; fold a dedupe into the next lab round.
- **Wall rule:** the wall is per egress IP and resets on the provider's daily schedule. It killed the #812 draw at 11:31:58Z after about 29 minutes (retry-after 46249); the review retry succeeded on the same wake. A fresh runner is the designed recovery, not a same-pool retry; the retry-after value is diagnostic only.
- **Checkpoint rule:** if a lab head advances with partial commits and a pass dies without signalling review, do NOT dispatch a review on that partial head. Only a `review` signal (or an explicitly complete pass) authorizes the review/test/eval chain.
- **Review retry rule:** the review workflow has its bounded auto-retry chain (the #754/#827 rule); the 12:10Z retry is the proof. Do not dispatch a duplicate while a review run is live or queued.
- **Test rule:** the test workflow has no in-workflow retry chain; every wall death needs a Maintainer re-arm.
- **Eval retry rule:** the eval lane has no in-workflow auto-retry chain; if the dispatched eval dies on the wall or crashes without a decision, the next Maintainer wake re-arms exactly one fresh eval on the same head after confirming no live or queued eval.
- **Merge rule:** the PAT merge sweep only handles workflow-touching PRs; the Maintainer session merges every other approved PR with `gh pr merge --rebase --match-head-commit <head>` (never `--delete-branch`). #871 touches workflow files, so the PAT sweep applies. The app-token merge push fires no `push` run, so dispatch the Pages deploy after every merge and verify it.
- **Memory-publish rule:** the publish fetch is unforced into the shared `refs/remotes/origin/logs` ref. The memory load fetched `f5481902` with a full fetch and the workspace's shallow boundary is a main-history commit, so this session's publish should fast-forward. Never run a depth-limited fetch on the memory branch (#870).
- **Public-surface rule:** the scheduled public-surface arm has a bounded self-heal of 1; the 06:49Z tick produced #868 and #869 closed it. The next tick is the next recovery window.
- **Do not dispatch #814/#849/#857/#856/#860/#773/#774/#742 until the #871 and #812 lanes are known (merged or verdict).**
- Never merge without a head-fresh test marker and a head-bound quality approval.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#871:** in repair; watch it. On the new head: review -> test -> quality -> merge (PAT sweep), then verify the publish.
2. **#812:** re-arm exactly one draw on the post-#871 main; its window has passed but the shared audit script and `LAB.md` require the #871 merge head. On a push: review -> test -> quality -> merge. The R11 scoping fix plus the LAB.md fold-in.
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

1. #871: the review's blocking finding is process-only (delegation ledger, skills note, threshold claim); the technical fix is verified sound. The repair is in flight. Do not dispatch a duplicate lab pass or a review on the current head.
2. #812: the 11:02Z draw died on the wall at 11:31:58Z with no branch; do not re-arm until #871 lands because of the shared audit script and `LAB.md`.
3. #870: open; closes with #871. Do not close it early.
4. #869 is merged and #868 is closed; the branch is intact at `66716de7`; do not delete it, re-open #868, or re-dispatch any gate on the merged head.
5. The 06:45Z auditor failure was the #853 stale-deferral guard's paginated `actions/runs` read failing closed after about 2m28s; the 08:05Z fresh audit passed the guard and completed green. The guard's `--paginate --slurp` on `actions/runs?per_page=100` has no explicit cap; if the failure recurs, route lab to bound it (filter by head SHA or cap pages).
6. The 11:32Z quota intake again stood down and chained no fresh draw; the intake workspace has no `.maintainer/quota-wall` marker (the known marker gap). Record for the #836 capacity decision; no new issue.
7. The 11:32Z intake published only a marker and left the STATE stamp at 11:01Z (the known intake memory gap). This session refreshes it.
8. #865 is merged and #864 closed; the branch is intact at `818de0af3`; do not delete it, re-open #864, or re-dispatch any gate on the merged head.
9. The quality report's non-blocking items: the Maintainer prompt's spaced sign-off variant can append a cosmetic second sign-off; a NUL-byte body raises an uncaught ValueError (red, not a silent drop); the poster resolves `gh` from the ambient PATH; the whitespace-only `comment.md`/ping skip and the unparseable `decision.json` exit-0 path remain. Fold into the next lab round; no new issue while the backlog clears.
10. The pre-existing resolver sites (`opencode.yml` baseline/phase resolvers and the review linked-PR resolver) still need the `createdAt`/`--limit 100` corrections; all fold into #814 with the pins.
11. The fail-closed poster is proven live; keep watching the next session's `comment.md` and pings for the success line.
12. #853, #848, #815, #803, #864, #866 and #868 are closed; #831 is bookkeeping only.
13. Pages: production 200 on `a5056e614`; `/docs/` 200 (re-verified at 12:38Z); the serving deploy `46128982216` succeeded at 09:08:05Z; the duplicate deploy `46129877058` succeeded at 09:18:50Z and changed nothing.
14. #836 stays open for the Owner capacity decision; no new lab dispatch beyond the live lanes.
15. Model registry drift: 110 / 10 free at ~12:38Z; the ladder is 3/3 on main and all three rungs are live. No lab dispatch.
16. #821 stays parked; the Maze Chase standing set is frozen unless the Owner asks.
17. The seven stale queued runs are unchanged; do not cancel or re-dispatch them.
18. Memory: the 2026-11-25 file carries the 02:36Z session, the three run markers, the 05:01Z, 08:05Z, 10:10Z, 10:56Z, 11:12Z, 12:15Z, 12:46Z, 13:11Z quota marker, 15:46Z, 17:07Z, 17:56Z, 18:22Z, 21:12Z, 21:18Z, 21:32Z and 21:49Z sessions/markers; the 2026-11-26 file carries the 00:03Z session, the 00:44Z intake marker, the 03:38Z session, the 04:08Z intake marker, the 08:01Z session, the 08:36Z session, the 08:57Z quota-intake marker, the 09:00Z session, the 09:45Z intake marker, the 10:06Z session, the 10:24Z session, the 11:19Z session, the 11:28Z session, the 11:46Z session, the 12:00Z session, the 12:09Z/13:17Z intake markers, the 18:37Z session, the 19:03Z/19:23Z/21:15Z intake markers, the 21:15Z session, and the 21:39Z/21:44Z intake markers; the 2026-11-27 file carries the 02:02Z session, the 02:17Z/02:28Z intake markers, the 04:31Z heartbeat session, the 04:49Z/05:03Z intake markers, the 07:53Z session, the 08:21Z/08:30Z intake markers, the 10:44Z session, the 11:19Z session, the 11:28Z session, the 11:51Z intake marker, the 14:18Z heartbeat session, the 14:46Z intake marker, the 19:50Z schedule session, the 20:16Z intake marker, the 21:00Z triage session, the 21:16Z handoff session, the 21:28Z merge session, the 21:34Z concurrent deferral session, the 21:35Z triage-plus-#812 session, and the 22:07Z intake marker; the 2026-11-28 file carries the 02:32Z schedule session, the 04:34Z heartbeat session, the 06:36Z intake marker, the 07:03Z #868 session, the 06:58Z failure-triage session, the 07:20Z PR-open session, the 07:30Z quota-intake marker, the 07:55Z test-handoff session, the 08:36Z/08:37Z quota-intake markers, the 08:38Z audit-intake session, the 09:09Z/09:15Z quota-intake markers, the 09:04Z eval-handoff session, the 09:19Z duplicate-wake session, the 09:52Z quota-intake marker, the 10:52Z schedule session, the 11:32Z quota-intake marker, and this 12:32Z PR-handoff session. Append-only, keep-both.
19. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round.
20. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
21. The merged tree carries the R26 canonical manifest and the R30 poster block SHA in lockstep with `maintainer.yml`; the post-merge patch-ids prove the merged tree is the audited tree. The next lab pass that edits either file must regenerate them.
22. No `emergency.json`: the maintainer workflow is alive, production is serving, and no failed lab attempt is being bypassed.
23. The general job's contains-based matcher fired on the 2026-11-26 eval approval report and on the 2026-11-27 #867 approval; watch item for a future lab round, no new issue.
24. **Resolver addendum:** three pre-existing resolver sites remain on the head, `opencode.yml:839` (the baseline resolver the reviewer cited at `:838` on main), `:1162`, and `:1397`; all sort by `.createdAt` without requesting it. Fold all three plus pins into the #814 fix-lane hardening pass.
25. **Design-lane note:** a manual design trigger placed on a PR thread would day-scope there; the designed issue invocation and the phase-completion forward are unaffected. No action now.
26. **Eval recovery watch:** #869 is closed; no eval re-arm needed. The eval lane's next use is the next gated PR.
27. **Test-lane auto-retry gap:** the test workflow has no in-workflow retry chain (unlike review), so every wall death needs a Maintainer re-arm. The eval lane shares the gap. Watch item for the next lab round; no duplicate issue while #836 is open.
28. **Public-surface self-heal cap:** the cap of 1 worked as designed on 2026-11-26. The 06:49Z tick on 2026-11-28 landed green and produced #868, which #869 has now closed. The next tick is the next recovery window.
29. **Quota intake behavior:** the 09:08Z, 09:14Z, 09:52Z, and 11:32Z intakes again skipped the agent, posted the board notes, and chained no fresh draw; the intake workspace has no `.maintainer/quota-wall` marker, so its recovery step is a no-op (known gap). Record for the #836 capacity decision; no new issue.
30. **Intake memory gap:** the quota intakes append only run markers and do not refresh STATE.md; the 11:32Z intake again left the stamp at 11:01Z. Watch whether future intake publishes do the same.
31. **Wall-duration variance:** the #812 draw ran about 29 minutes before the wall (retry-after 46249); the earlier #870 draws ran 21-28 minutes. Record for the #836 capacity decision.
32. **Comment-poster lane:** #864's repair merged; the poster now executes the real code against a mock `gh` and fails closed on an empty or unparseable body or exhausted retries; the R30 fixture covers the idless, mixed-sticky, and signed-ok cases. The trigger poster's non-fatal error path folds into the next lab round.
33. **#865 review/test observations:** the whitespace-only `comment.md`/ping skip and the unparseable `decision.json` exit-0 path are still open silent paths adjacent to #864; an Owner follow-up, no new issue.
34. **Schedule-throttling watch:** event-driven wakes continue; the 02:32Z to 10:52Z schedule gap (about 8h20m) is the largest observed. Platform throttling remains; the Auditor's lane owns schedule health; no dispatch this run.
35. **Held-run approval wake class:** the three PR-open held runs (`Deploy static site...`, `maintainer`, `opencode-pr-trigger`) are approved by the hardcoded sweep after this session; the pr-trigger posts `/oc maintainer` and the maintainer pull_request run starts. Both are serialized in `maintainer-871`; watch for duplicate wakes and fold a dedupe into the next lab round.
36. **Review auto-retry proof:** the first #871 review run crashed mid-run with no verdict at 12:10:41Z; the workflow posted `/oc review (auto-retry 1)` and the retry succeeded. This is the review lane's bounded chain working as designed, not a defect.
37. **This run's artifacts:** `decision.json` is `[]`; `comment.md` is the #871 review-handoff note; `personality.md` is empty; no `emergency.json`. The comment names no agent/workflow/model, carries no trigger token, and ends with the sign-off.
38. **#867 duplicate review run:** the earlier `/oc maintainer` comment spawned a second review run `46067351943` that shared the review group; it skipped at the job gate, as designed. No defect; the queue:max design held.
39. **Post-merge preview behavior:** `/preview/pr-869/` will return 404 after the merge because the Pages build only stages open PRs. This is expected; no defect. Record for the Curator's lane if a merged-preview redirect is ever wanted.
40. **Merge-push Pages gap:** an app-token merge does not fire the `push` trigger, so every session merge needs an explicit Pages dispatch and verification. The previous session dispatched `46128982216` and verified it; the hardcoded step added the duplicate `46129877058` (success).
41. **Concurrent-session coordination:** always re-read the target threads before re-arming; a later session must not duplicate an earlier one's dispatches. This run read the review report and the repair trigger, then stood down.
42. **Memory-publish failure (now #870):** the 07:27Z triage session (`46121290367`) lost its memory update after three non-fast-forward push rejections. The #870 diagnosis: the agent's `--depth=1` fetch created a shallow graft, so the unforced publish fetch at `maintainer.yml:1339` rejected the shared-ref update; the loop then built an orphan root and the push was rejected too. The fix is in PR #871 (in repair). Do not run depth-limited fetches on the memory branch until it lands.
43. **Heartbeat arm:** the 04:33Z recover tick was the first observed heartbeat dispatch under #836 (90-minute cooldown marker on #70). The expected ~06:03Z tick did not land; do not re-dispatch the heartbeat yourself. Watch schedule health.
44. **Eval-handoff duplicate wake:** the eval workflow posts both the machine verdict and an explicit `/oc maintainer`; both pass the Maintainer guard and produce two wakes. The single-slot group serializes them. Fold a dedupe into the next lab round; no new issue while the backlog clears.
45. **Two-draw outcome:** the 10:52Z two-draw revision produced one success (#870 -> PR #871) and one wall death (#812 at 11:31:58Z). The preference returns to one draw per wake while the wall is active; the serialized queue resumes #812 after #871.
46. **#812 scope coupling:** #812 edits `.github/scripts/silent-stall-audit.sh` and `LAB.md`, which #871 also edits; the issue's own queue note forbids a competing pass while the audit script is edited by another PR. This is the decisive reason #812 is held this wake.

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

- This run is the 12:32Z `issue_comment` wake on PR #871; the public artifact is the review-handoff note in `comment.md`. `decision.json` is `[]`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure. This run posts the #871 note.
- The pipeline is green on main (`a5056e614`; the post-merge Pages deployment is live and the root and `/docs/` are 200), and the platform is perf-sensitive: multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed the lab draws at 16:54:13Z, 23:15:37Z, 03:05:44Z, 05:10:20Z, 11:13:26Z, 13:17:06Z, 19:23:31Z, 21:39:13Z, 02:28:28Z, 05:02:45Z, 08:29:54Z, 11:51:34Z, 14:46:36Z, 20:16:52Z, 21:17:30Z, 22:06:48Z, 02:47:26Z, 06:36:05Z, 07:30:40Z, 08:35:36Z, 09:08:40Z, 09:14:44Z, 09:52:01Z and 11:31:58Z, the eval draws at 13:10:30Z, 21:48:51Z, 00:44:09Z, 04:07:07Z, 08:57:22Z, 09:44:22Z, 12:09:23Z, 19:03:24Z, 21:44:40Z, 02:17:49Z, 04:49:23Z, 08:20:40Z and 08:36:23Z, the test draw at 18:44:57Z, the public-surface draws at 21:17:41Z (2026-11-25) and 21:12:06Z/21:15:03Z (2026-11-26), the review draw at 10:31:16Z, and the auditor/curator draws at 07:15Z/07:21Z and 07:27:06Z, while fresh runners completed the 12:15Z review, 12:46Z test, 16:00-17:08Z eval, 17:23-17:56Z repair pass, 17:56-18:22Z review, 21:12Z heartbeat, the 21:16-21:32Z test, the 00:03Z/03:38Z/08:01Z/08:36Z/09:00Z/10:06Z/10:24Z/11:19Z/11:28Z/11:46Z sessions, the 07:25Z/08:01Z auditor self-heal, the 08:12-08:53Z repair pass, the 09:29-10:06Z review retry, the 10:06-10:24Z lab pass, the 10:16-11:19Z quality draw, the 11:28-11:47Z review, the 11:47-12:00Z test, the 21:15Z public-surface schedule pass (before its agent was walled), the 04:31-04:40Z heartbeat session, the 07:12-07:53Z daily audit plus the 07:17-07:29Z curator tick, the 10:54-11:19Z quality draw, the 14:18-14:26Z heartbeat session, the 19:50Z schedule session, the 20:59-21:04Z #867 review, the 21:00Z triage session, the 21:07-21:16Z #867 test, the 21:16Z handoff session, the 21:20-21:28Z #867 quality draw, the 21:28Z merge session, the 21:34-21:41Z concurrent deferral session, the 21:35-21:44Z triage-plus-#812 session, the 02:32-02:37Z schedule session, the 04:34-04:40Z heartbeat session, the 06:58-07:20Z failure-triage session, the 07:16-07:27Z #869 review, the 07:27-07:55Z #869 test, the 07:55Z test-handoff session, the 08:05-08:38Z auditor pass, the 08:38Z audit-intake session, the 09:04Z eval handoff, the 11:02-11:35Z #870 lab draw, and the 12:10-12:32Z #871 review retry.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Watch the #871 repair. On a new head, the lab workflow forwards `/oc review`; the review must approve before the test and quality gates; then the PAT merge sweep and a publish verification. If the repair dies on the wall, the failure summons a maintainer run; re-arm after the 30-minute window.
2. After #871 lands, re-arm exactly one #812 draw on the new main (the shared audit script and `LAB.md` require the #871 merge head).
3. Then the serialized queue: #814 (with the three-site resolver `createdAt` addendum, the deferral page-size wording, and the review/test non-blocking observations), #849, #857, #856, #860, #773, #774, then #742's remainder with the lab.yml PR-thread linkage-guard fix.
4. Verify the held-run approval clears the three action_required runs; watch whether the pr-trigger and maintainer pull_request runs add duplicate wakes on #871.
5. Verify the memory publish fast-forwards; never run a depth-limited fetch on the memory branch.
6. Verify the #869 merge holds: main `a5056e614`, root and `/docs/` 200, branch `66716de7` intact, #868 closed.
7. Keep #836 open for the Owner capacity decision; #831 is bookkeeping only; #821 stays parked.
8. Verify the board invariant, allowlist, registry/ladder, live site, held runs, schedule health, and the memory-publish ref behavior at each wake; if clean, stand by.

## Open questions

1. Will the #871 repair land the ledger and skills note without touching the verified code, and will the re-review approve on the new head?
2. Will the repair survive the wall, or will it need a fresh draw after the window?
3. Will approving the three held runs produce the expected duplicate wakes on #871, and does the single-slot group absorb them cleanly?
4. Does the serialization call on #812 hold, or does the queue stall too long behind the #871 chain?
5. The wall: the #812 draw died at 11:31:58Z after about 29 minutes (retry-after 46249); the review retry succeeded on the same wake. The capacity decision remains #836.
6. The intake memory gap persists (the 11:32Z intake left the STATE stamp at 11:01Z); this session refreshes it. Watch the next intake publish.
7. The duplicate maintainer run `46145183118` and the review workflow's owner-report wake class remain a dedupe candidate for the next lab round.
8. The duplicate Pages deploy per merge followed again (`46129877058`, success) and changed nothing; fold the dedupe into the next lab round.
9. Should the eval and test lanes get a bounded in-workflow retry like review, or stay next-wake re-armed? Known gap; fold into the next lab round or #836.
10. The eval's non-blocking items: residual "Baseline parity" wording in two ideas project files, and no automated regression test guards the new five-phrase copy. Owner follow-up only; no new issue while the backlog clears.
11. Should the merged preview route's 404 after a merge be documented as expected behavior? It is by design; no action now.
12. The schedule gap (02:32Z to 10:52Z) shows the platform throttling again; is the schedule health degrading? The Auditor's lane owns it, and the capacity class is #836.
