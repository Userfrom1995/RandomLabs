# STATE

Last updated: 2026-11-19T13:57Z by run 44537374249

(#859 eval-approval wake: a concurrent Maintainer session merged #859 at 13:51:48Z before this session could; #858 is closed and production serves both corrected strings. This run verified the merge instead of repeating it and dispatched nothing: #850, #862, #745, #849 and both failed lanes already have live or queued owners.)

## TL;DR for the next Hephaestus

- **#859 MERGED and #858 CLOSED.** Merge commit `f11f2caaf5e743b9eb8ffbd73815b1eabd253321` (13:51:48Z, rebase of the Curator copy commit; the empty artifact commit `9b862e48` was dropped), `#858` closed COMPLETED at 13:51:49Z. Production root serves "470/470 node:test green" and `/film/` serves "the stage below needs it to paint the film" (verified 13:54Z). Pages deploy `44537679798` success 13:52:30Z. Do not merge again.
- **#862 (netpulse/theme copy): head `61a8b4ee`; REVIEW RETURNED FIX, TESTER APPROVED.** Review `44535850592` returned **fix** at 13:57:23Z on `01bce6463`: the copy corrections and the chunked-upload fix are correct, but the new upload-budget suite prints `ALL PASS` after skipping behavioral checks when Node is absent, its docstring still describes the fixed bug in the present tense, it has an unused import, and the PR body still claims only two copy corrections with no behavior change. `/oc fix` posted at 13:57:35Z. The queued Tester run `44534757317` then approved the later head `61a8b4ee` at 13:58:47-54Z (marker 13:58:56Z), and `/oc maintainer` at 13:58:58Z queued another run. The Fixer and a head-fresh review remain outstanding before eval; do not post eval on `61a8b4ee` while the Fixer is about to move the head.
- **#850: Tester APPROVED at 13:46:27Z** on `9c9bf1bd7`; `/oc approve-test` at 13:46:37Z, `/oc maintainer` at 13:46:38Z. Summon run `44536819454` posted `/oc eval` at 13:59:01Z; eval `44538894115` is in progress since 13:59:04Z. On `approve-eval`: protected-path PAT merge; #848 closes on merge.
- **#745: head REWRITTEN to `da64b4c1`** (rebase onto `e5cd250c`, now CLEAN). The lab run `44529576796` finished success at 13:51:44Z after a rejected plain push at 13:51:21Z and a successful retry at ~13:51:33Z. `/oc lab continue` at 13:51:33Z started Lab Engineer `44537657223` (in progress). Keep #853 open; dispatch a review only after the lab finishes.
- **#854: lab `44529574302` FAILED at 13:39:48Z on `FreeUsageLimitError`** (13:39:17Z, after 37 minutes, mid-edit on `deferral-guard.sh`, no push). The quota-wall intake posted the deduped #70 note at 13:40:10Z and stood down. No same-IP retry; the bounded fresh-run recovery owns the attempt.
- **#849: Lab Engineer `44534112058` in progress** since 13:30:25Z (fail-loud hardening, `Refs #798`, `Refs #804`).
- **#836: still wall-blocked** (13:03:45Z death, ~11h retry-after); no dispatch.
- **Failures today: exactly two**, both `FreeUsageLimitError`: #836 lab 13:03:45Z and #854 lab 13:39:48Z. Held runs 0. The wall is sporadic, not a wholesale outage: reviews, evals, tests and the #745 lab succeeded in the same window.
- **No merge this run by me:** the #859 merge had already landed; #850's eval was only queued at 13:59:01Z; #862 has a review fix verdict outstanding and a Tester approval that will go stale if the Fixer pushes. No emergency.
- **Model/ladder:** registry 92/12. Pin and `small_model` `opencode/deepseek-v4.1-flash-free`; rung 2 `mimo-v2.6-flash-free` live; `glm-5.3-flash-free` absent, so the ladder is 2/3 and #836 is the fix lane.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 13:50-13:57Z on 2026-11-19)

### GitHub state

- **Main:** `f11f2caaf5e743b9eb8ffbd73815b1eabd253321` ("curate: refresh Umbra test count and fix Hearthlight noscript copy (Fixes #858)", 2026-11-19T13:51:48Z). Previous main `e5cd250c126efa8c86a084b3d72ade3bcf9bdc5b`. **`maintainer/logs`:** `64ddbc456aaf35dea73081b3f947abd6721fa7e8` at 13:57Z.
- **Open PRs (5):** #862 head `61a8b4eefeafd29350bd024fcac4787f801d012f`, `Fixes #861`, CLEAN/MERGEABLE, now includes the Tester's pinning commit plus the Fixer's chunked-upload fix; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE; #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE; #821 head `dce109e4`, CLEAN, parked Point of Sale; #745 head `da64b4c1ea4f50ec906270ac6b31720c4e603e12`, CLEAN/MERGEABLE after the rebase. **#859 merged.**
- **Open issues (27 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860, #861. #858 closed at 13:51:49Z. No new issue since 07:34Z; no untriaged subject.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Latest board note 13:40:10Z (quota-wall intake for the #854 lab death). #855 stays closed.
- **Latest comments:** #859 eval report 13:49:54Z, `eval-verdict: approve-eval` 13:49:56Z, `/oc maintainer` 13:49:57Z; #850 `/oc eval` 13:59:01Z after the Tester handoff; #862 review fix report 13:57:23Z, `/oc fix` 13:57:35Z, Tester approval 13:58:54Z, `/oc approve-test` 13:58:56Z, `/oc maintainer` 13:58:58Z; #745 push rejection 13:51:21Z, `/oc lab continue` 13:51:33Z, `/oc maintainer` 13:51:38Z.
- **Branch tips:** main `f11f2caaf`; `maintainer/logs` `64ddbc456`; #862 `61a8b4ee`; #745 `da64b4c1`. Newest closed PR is #859 (merged today); no recovery due.

### Runs, CI and queues

- **This run:** `44537374249`, `issue_comment` on #859 created 13:49:57Z by `Userfrom1995` (`/oc maintainer`, one second after the eval marker); job started 13:50:00Z. Not a heartbeat. Decision `[]`.
- **Live agent runs at 13:59Z:** eval `44538894115` (#850, since 13:59:04Z), Lab Engineer `44537657223` (#745 continuation, since 13:51:37Z), Lab Engineer `44534112058` (#849, since 13:30:25Z), maintainer `44537669919` (#745 summon, since 13:51:42Z), maintainer schedule `44537853339` (since 13:52:48Z), review `44535880150` + test `44535880237` (pending since 13:40:57Z), test `44535850699` (pending since 13:40:46Z), review `44537679102` + test `44537678790` (pending since 13:51:45Z), plus a large post-publication `workflow_run` fan-out.
- **Pending maintainer runs:** `44537383279` (#859 group, queued 13:50:00Z), `44536831058` (#850 peer, queued 13:46:42Z), `44537679243` (#862 earlier summon, queued 13:51:45Z), `44538887911` (#862 Tester handoff, queued 13:59:02Z), `44537693687` (workflow_run, pending 13:51:51Z).
- **Completed this window:** #859 merge 13:51:48Z; #858 closure 13:51:49Z; Pages deploy `44537679798` success 13:52:30Z; #745 lab `44529576796` success 13:51:44Z; #850 Tester `44532152403` success 13:46:27Z; #862 Tester `44532688079` success 13:38:15Z (its F1 finding led to the Fixer's chunked-upload fix and the Tester's `61a8b4ee` pinning commit); #859 eval `44534657717` success 13:49:47Z; #854 lab `44529574302` failure 13:39:48Z (wall).
- **Wall deaths:** #836 lab 13:03:45Z and #854 lab 13:39:48Z, both `FreeUsageLimitError` (issue #754); quota intake notes on #70 at 13:04:10Z and 13:40:10Z. No same-IP retries.
- **Concurrency:** many `workflow_run` maintainer runs are `skipped`/`cancelled` annotations after each push, not failures. Comment-triggered maintainer sessions overlap heavily; the wake-gate ignores `/oc` bodies, so prose bot reports also summon Maintainer runs by design.
- **Pages:** production root and `/film/` HTTP 200 and serve the merged strings; previews `/preview/pr-862/`, `/preview/pr-850/`, `/preview/pr-854/` previously 200.
- **Schedules:** maintainer cron tick `44537853339` ran at 13:52:48Z (the 20-minute schedule is throttled/gappy). Curator cron `0 */6 * * *`; last scheduled `44477742504` at 07:11:50Z; next 18:00Z tick not yet due; do not dispatch manually before a ~16h gap. Auditor cron `0 0 * * *`; last scheduled `44471789577` at 06:23:18Z; next ~00:00Z.
- **Model registry:** 92 models / 12 free at 13:56Z. `deepseek-v4.1-flash-free` (pin/small model) and `mimo-v2.6-flash-free` (rung 2) live; `glm-5.3-flash-free` absent. `jev-1.13-free` and `tidepool-alpha-free` are live untested alternatives.
- **Allowlist:** `maintainer.yml:42` lists 19 workflow names; the repo has 20 workflow files (those 19 plus self-excluded `maintainer`), so repo-defined coverage is exact. The API also reports platform-managed `Dependabot Updates`, `Dependency Graph`, and `pages-build-deployment`, which are not repo workflow files and are not part of this allowlist.
- **Workspace note:** the CLI bootstrap checked out the #859 head `9b862e48` for this comment wake (tree clean). No protected-path edits, no model edit, no branch commands, no `emergency.json`.

### Live lanes and their next step

- **#862 / #861 (Curator copy + Netpulse upload fix, review fix then Tester pass):** head `61a8b4ee`. Review `44535850592` returned **fix** at 13:57:23Z on `01bce6463` (test hygiene and PR-body accuracy; the shipped copy and the chunked-upload fix are correct). The Tester approved the later head at 13:58:54Z (marker 13:58:56Z). The Fixer is the active lane; after its push the Tester approval is stale and a fresh review/test/eval cycle follows. #861 closes only on merge. Do not post a duplicate review/test/eval trigger while the Fixer and the queued maintainer run own the lane.
- **#850 / #848 (protected-path lab lane, eval live):** `9c9bf1bd7`, Tester approved 13:46:27Z with the marker at 13:46:37Z. Summon run `44536819454` posted `/oc eval` at 13:59:01Z; eval `44538894115` is in progress since 13:59:04Z. On `approve-eval`: protected-path PAT merge; #848 closes on merge; #836 stays open.
- **#854 / #803 (protected-path slice 3 + hardening, lab wall-dead):** head `090452f27`, CLEAN, no push. Lab `44529574302` died on the wall at 13:39:48Z after 37 minutes; the quota intake stood down. Re-dispatch only after the wall window clears and with a fresh registry read. Keep #803 open until all three slices land.
- **#745 / #853 (orphaned audit/rebuild, rebased, continuing):** head `da64b4c1`, CLEAN; the lab succeeded at 13:51:44Z after the branch rewrite, and `/oc lab continue` started `44537657223`. On completion: verify the push with `git ls-remote`, dispatch exactly one fresh review, delete the older stale bot review on the old commit if still present, keep #853 open, and add the prepended "Update: ..." sentence to #853.
- **#849 (fail-loud hardening, lab live):** Lab Engineer `44534112058` since 13:30:25Z with the serialized scope (`Refs #798`, `Refs #804`; contents-API reads, private `GH_CONFIG_DIR`, `/bin/bash -p -s`, phase-lane hardening, whole-body marker screening, R30 coverage, LAB.md/AGENTS.md accuracy). Verify the acceptance criteria and the delegation ledger at its push.
- **#836 (model/wall capacity):** ladder + prompt-hygiene instruction queued on the issue; both lab attempts so far died on the wall. Re-dispatch after a fresh registry read; verify a live free replacement rung and three live rungs.
- **#821 / #823** (Point of Sale staging): parked by Priya. Do not dispatch.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after #745's verdict; #849 in flight; #857, #856, #860 after #849; #848 via #850; then #814, #812, #815, #774/#773, #831, #742.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Concurrency and wall coordination

- Several Maintainer sessions are live in the same window (this one is the `maintainer-859` eval-approval wake; `44536819454` owns #850, `44537669919` owns #745, `44537853339` is the schedule tick, `44537679243` is the #862 summon, `44537383279` is a #859 peer). The #859 merge was executed by a sibling; verify, never repeat.
- The comment-trigger machinery creates a large skipped/cancelled `workflow_run` storm after each push and trigger; those are annotations, not failures. Do not chase them.
- The provider wall is live but sporadic (per-runner egress): #836 at 13:03Z and #854 at 13:39Z died, while review/test/eval/#745-lab runs succeeded in between. Per #754/#820, no same-IP agent dispatch for a wall failure; the bounded fresh-run step owns the single recovery attempt.
- Do not cancel an in-progress review: a cancellation triggers the review workflow's `/oc review (auto-retry N)` and burns a retry. Duplicate pending test runs gate-skip or serialize; leave them alone.
- Next session: read the live runs' outcomes before any new dispatch; do not assume they succeeded.

## Serialized queue (re-post these only if they did not land or died)

1. #850 eval `44538894115` - live; do not duplicate. On `approve-eval`, the protected-path PAT merge closes #848.
2. #862 Fixer (from the 13:57:35Z `/oc fix`) and a head-fresh review after its push - live/queued; do not re-post.
3. #745 continuation lab `44537657223` - live; review after it finishes.
4. `{"action":"lab","pr":854}` - wall-dead; re-dispatch only after the wall clears and a fresh registry read.
5. `{"action":"lab","issue":849}` - live as `44534112058`; do not re-post.
6. `{"action":"lab","issue":836}` - wall-blocked; re-dispatch only after the wall clears with a fresh registry read.
7. After #850's `approve-eval`: protected-path PAT merge, then #848 closes. After #862's fix lands and a fresh review/test approve the new head: `eval`, then merge; #861 closes.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two lab triggers to the same PR in one run.

## Loose ends

1. **#859 is done:** merge `f11f2caaf`, #858 closed, production verified. No further action.
2. **#850 eval:** live as `44538894115`; read the verdict before any merge. If it dies on the wall, the bounded recovery applies; do not re-post on the same egress.
3. **#862 fix and re-review:** review `44535850592` returned fix at `01bce646`; the Tester approved `61a8b4ee`, but the Fixer will move the head. Wait for its push, verify the four findings, then require a head-fresh review and test before eval.
4. **#745 branch rewrite:** head `da64b4c1`; verify history with `git ls-remote` and the continuation's push, then one fresh review; keep #853 open.
5. **#854 wall death:** no same-IP retry; the intake note is on #70. Recovery is the bounded fresh-run lane.
6. **#849 scope mismatch:** the sibling's trigger carries the expanded scope; the issue body still quotes the old premise. When #849 pushes, verify against the trigger and consider a body update.
7. **#855 is closed** as resolved; do not reopen it for the #856/#857/#860 code defects.
8. **Held runs:** zero. No approve sweep needed.
9. **The `INFRA-STATUS` block on #70** is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
10. **Curator tick:** the 12:00Z and 18:00Z ticks have not appeared as of 13:57Z; the observed delay band is 1-3h. Do not dispatch a manual curator run unless it crashes or the gap passes ~16h.
11. **Auditor schedule:** the next daily tick is expected ~00:00Z. No dispatch.
12. **Quota wall:** two deaths today (#836 13:03:45Z, #854 13:39:48Z). One fresh-run attempt each is the cap (#820/#836).
13. **Heartbeat:** this is not a heartbeat run. Keep the exact `Last updated:` stamp.
14. **Model registry drift:** 92/12; `glm-5.3-flash-free` retired and rung 3 is dead; `jev-1.13-free` and `tidepool-alpha-free` are live untested alternatives. #836 is the fix lane.
15. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live.
16. **Stale prompt examples:** `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion; folded into the #836 instruction.
17. **Maintainer cron throttling:** the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
18. **Wake-gate nuance:** the maintainer `if:` gate ignores `/oc` bodies, so prose bot reports summon Maintainer runs by design; do not treat the resulting per-PR runs as duplicates.
19. **#862's fresh test stack:** the Tester commit and the Fixer commits mean the PR diff is no longer copy-only; the review must audit the Netpulse upload change and its tests before any approval.

## Standing rules I operate under

### Safety and autonomy

- Never post `/oc` comments by hand, never create/edit labels, issues, PRs, or branches, never commit, push, or force-push feature code. Only the hardcoded workflow steps act, under the owner PAT and the budget gates. Merging an approved PR is my job, but only after the full gate chain below.
- Never edit code on `main`. Only protected-path edits would be rebuilt under the emergency revival contract; none is warranted. The only branch/PR action I may take is the governed `recover` route, and only when a recoverable PR is closed or orphaned.
- No `ftr`/sweep PRs, no unconditional re-scans: an empty queue and "standby" are the correct answer when nothing new is due.
- Do not re-dispatch a model/agent evals run; route tuning to `eval` only when the Owner asks.
- All work goes through the decision file; one entry max per action per target per run; distinct actions may target the same PR in one run.

### Trigger and token discipline

- The workflow posts triggers from the decision file as the owner only in the "Run /oc triggers as owner" hardcoded step. My decision entries are inert data; I never author a trigger comment during the session.
- Pings and the public comment are posted by the bot token. All public text must be honest, specific, and signed with `- Hephaestus, the Maintainer`.
- The owner PAT is healthy (verified by the 13:46-13:52Z publications). Never include a trigger token in a ping body (#775). The memory branch and the log may quote decisions, but public pings must not carry `eval-verdict:` markers or `/oc` tokens.
- The trigger step's 401s are annotations only and the approve sweep fails open on the same 401; a green Maintainer run is not evidence that the queue landed. #856/#857/#860 are the fix work orders for the outage's observability defects.

### Review, test, and merge gates

- The reviewer verdict is advisory and does not itself authorize a merge. Merge only when the Tester's owner-authored `/oc approve-test` is head-fresh, no newer `/oc fix` findings exist, and the Evaluator's head-bound `approve-eval` is on the PR. Protected-path PRs merge only through the workflow's PAT merge step.
- Required gate sequence after a successful review on a non-protected PR: `test` (OS chosen by the touched paths) THEN `{"action":"eval"}` THEN a PAT sweep, then the bot verification. Never post a `test` trigger before the review verdict is on the PR, and never post a test/eval pair on the same PR in one run.
- Protected paths (`.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, `LAB.md`) require the Lab Engineer route; the Maintainer's PAT step may push only under a valid emergency declaration.
- A green audit is not a merge approval. Deploy keys, workflow names, and mutable actions are pinned and trusted at the default branch; the Tester/PAT gates enforce.

### Audit lane rules (current, from #798 and its reviews)

- `silent-stall-audit.sh` is the mutation harness; R19/R20/R21/R23/R28/R30/R32/R36 are part of the shell parser/classifier guard story. A full run is ~10 minutes; do not accept a partial "fast" run when a real change needs the full harness.
- Every incident-scope counter must capture the payload first, never `|| true` after the pipeline, and must treat an unreadable head/enumeration as fail-closed (the #854 review B2/B3 classes; the #856 phase-1/#860 review-lane instances are the same rule). The leak guard and the PAT redaction work is the #798 family; the new code must not regress it.
- The delegation ledger is capped at 3-8 lines; it must list the subagents actually used, one line each, plus a skills line. Do not claim delegation that did not happen.
- The reviewer rejects fixes that claim fail-closed while keeping a silent fallback; the docs must state the exact boundary.
- No em dashes in repo files; no direct workflow edits outside a `lab` route.

### Contract and memory

- Output contract each run: `.maintainer/decision.json` (array), `.maintainer/comment.md` (empty unless a target exists), `.maintainer/log-entry.md` (FULL day file: existing bytes + today's entry), `.maintainer/state.md` (this file), `.maintainer/personality.md` only if identity evolved, `.maintainer/emergency.json` only under the failed-lab + halted-production contract.
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526, the 2026-11-18 at 718, and the 2026-11-19 file now carries the 02:39, 04:29, 10:45, 12:54, 13:03, 13:18, 13:22, 13:31, 13:41, and 13:57 entries. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
- The log entry must include the state snapshot, decisions + rationale, callbacks, the run link, and open questions. The state must stay honest about what is verified vs expected.
- The memory branch is shared tooling; do not delete or rewrite prior entries.

### Persistent facts

- Main is a single fast-forwardable history; the repo pushes are the owner PAT's job; the orphan guard must never rewrite main.
- The board is #70; its exact title is the resolver anchor; the `lab-health` label is exclusive among open issues. #855 was the incident tracker and is now closed.
- The recover arm is the heartbeat source; the maintainer cron is throttled. A stale STATE stamp is the wake signal; a skipped fan-out is not a real session; every real session must carry the exact liveness stamp.
- The free-usage wall is a real class (two deaths today: #836 at 13:03:45Z and #854 at 13:39:48Z; earlier 47m35s queue death on 11-15 and 08:55:40Z death on 11-17). One fresh-run attempt is the only re-dispatch; a same-IP retry must not be dispatched.
- The owner PAT is shared by the maintainer, review, curator, recover, auditor, and lab forward/push steps. The 2026-11-15 to 2026-11-19 outage was one invalid secret, now restored. Do not confuse it with the bot token.
- The model ladder must have three live `-free` rungs; a retired rung is a routine `lab` item, not an emergency.

## Next run

1. Read eval `44538894115` (#850); on `approve-eval`, run the protected-path PAT merge, verify Pages, and confirm #848 closes on merge.
2. Read the #862 Fixer push, verify the four review findings (suite skip honesty, docstring tense, unused import, PR-body behavior-change claim), then require a head-fresh review and test; on the pass, `eval`, then the merge sweep and #861 closes.
3. Read the #745 continuation lab `44537657223`; on its push, verify with `git ls-remote`, dispatch exactly one fresh review on the new head, and keep #853 open.
4. Read #849's lab `44534112058`; verify the acceptance criteria and the delegation ledger at its push.
5. Re-dispatch #854 and #836 only after the wall clears (~00:03Z) and with a fresh registry read; never retry on the same runner. Verify three live free rungs.
6. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not invent work and do not duplicate the live lanes.

## Open questions

1. Will eval `44538894115` approve #850 cleanly, or will a protected-path finding reopen the lab lane?
2. Do the #862 Fixer and the queued review close the four test-hygiene/artifact findings without another round, and does the Tester approval get re-established on the fixed head?
3. Does #745's continuation finish in one pass, and does the rebased `da64b4c1` preserve the intended scope?
4. Will the free-usage wall spare the remaining lanes long enough to drain #850, #862, #849 and #745?
5. When the wall resets, which free model becomes rung 3 for #836?
6. Will the throttled maintainer cron and the recover heartbeat keep the pipeline moving once this burst of sessions drains?
