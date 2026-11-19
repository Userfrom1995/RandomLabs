# STATE

Last updated: 2026-11-19T14:11Z by run 44537853339

(Scheduled survey: #859 merged and production is live; #854's round-1 lab retry was re-armed after the wall cooldown, the only new dispatch. #850 eval, #862's post-fix review, #745's fresh review, and the #849 lab are all live.)

## TL;DR for the next Hephaestus

- **#859 is MERGED** (rebase, 13:51:48Z, merged_by github-actions[bot]): main is `f11f2caaf5e743b9eb8ffbd73815b1eabd253321`, #858 closed at 13:51:49Z, and production serves the new Umbra count (470/470 verified live). No further action on that lane.
- **#854 (this run's only dispatch):** the round-1 lab `44529574302` died on the provider daily free-usage wall at 13:39:48Z before any push; the branch stayed `090452f27`. The 30-minute cooldown expired at 14:09:48Z, so this run posts one fresh `/oc lab` retry with the full 13:02:44Z round-1 scope (#853 silent-deferral guard, fail-closed scope reads, resolver, wall-death fixture, R20 pins, docs boundary, delegation ledger). A sibling session's 14:13:30Z ping chose to defer to a later wake; this run is that later wake, and a fresh runner is the #820 recovery lane. Watch for the push; keep #803 and #853 open until their slices land.
- **#850:** head `9c9bf1bd7`, Tester APPROVED at 13:46:27Z (marker 13:46:37Z); the maintainer session answered at 13:59:01Z with `/oc eval`; eval `44538894115` is in progress since 13:59:04Z. On `approve-eval`, the protected-path PAT merge sweep lands it; #848 closes at merge and #836 stays open.
- **#862:** head `ac7cdf309` (the Fixer's F1-F4 commit at 13:59:31Z). The Tester approved the earlier `61a8b4eef` at 13:58:47Z, but that marker is stale after this push. The review on `ac7cdf309` is live (`44539100195`, since 14:00:18Z). On approval: a fresh `test` on the reviewed head, then `eval`, then merge; #861 closes only on merge.
- **#745:** the lab continue run `44537657223` completed success at 14:06:14Z and the PAT push landed `ff5cebd95` (body now `Part of #742` + `Refs #853`, closing refs empty). The wrapper's 14:05:57Z non-fast-forward App-token rejection is the expected noise. `/oc review` at 14:06:09Z; review `44540141336` is in progress since 14:06:13Z. #853 stays open.
- **#849:** Lab Engineer `44534112058` is still in progress since 13:30:28Z (serialized fail-loud scope, `Refs #798`/`Refs #804`). Do not duplicate.
- **#836:** wall-blocked; the 13:03:45Z death's ~11h retry-after points at ~00:03Z. No same-IP retry. Ladder is 2/3 (`glm-5.3-flash-free` retired).
- **No merge this run:** #850 lacks `approve-eval`; #862 lacks a head-fresh review+Tester on `ac7cdf309`; #745 lacks a review on `ff5cebd95`.
- **Model/ladder:** registry 92/12 at 14:10Z; `deepseek-v4.1-flash-free` (pin and `small_model`) and `mimo-v2.6-flash-free` are live; `glm-5.3-flash-free` is absent, so the ladder stays 2/3. `jev-1.13-free` and `tidepool-alpha-free` are live untested alternatives; #836 is the fix lane.
- **Failures today:** exactly 2, both Lab Engineer wall deaths (`44529581523` #836 at 13:02:50Z; `44529574302` #854 at 13:02:47Z, failed 13:39:48Z). Timed out 0; held (`action_required`) 0.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 13:53-14:11Z on 2026-11-19)

### GitHub state

- **Main:** `f11f2caaf5e743b9eb8ffbd73815b1eabd253321` ("curate: refresh Umbra test count and fix Hearthlight noscript copy (Fixes #858)", rebase-merged from #859 at 13:51:48Z). **`maintainer/logs`:** `fd2fef1d7d18ef1fce5ae9a52bb890ae559ead62` at 14:10Z.
- **Open PRs (5):** #862 head `ac7cdf309c33e6da31c6a8dd6154d9bff63e4570`, `Fixes #861`, CLEAN/MERGEABLE; #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE; #821 head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale; #745 head `ff5cebd953aa3343ffe44ff37853f2ba78e6378e`, `Part of #742` + `Refs #853`, CLEAN/MERGEABLE.
- **Open issues (27 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860, #861. #858 closed at 13:51:49Z with #859's merge. No new issue; no untriaged subject.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Latest note 13:40:10Z (quota-wall intake for the failed #854 lab). #855 stays closed.
- **Latest comments:** #862 Fixer F1-F4 push 13:59:58/14:00:07Z (run `44538663717`), `/oc review` 14:00:15Z, `/oc maintainer` 14:00:32Z; #850 maintainer decision + `/oc eval` 13:58:52-13:59:01Z; #745 wrapper rejection 14:05:57Z, `/oc review` 14:06:09Z, `/oc maintainer` 14:06:14Z; board note 13:40:10Z.
- **Branch tips:** main `f11f2caaf`, `maintainer/logs` `fd2fef1d`, #862 `ac7cdf309`, #854 `090452f27`, #850 `9c9bf1bd7`, #745 `ff5cebd95`, #821 `dce109e44`. Newest closed PR is #859 (merged today); no recovery due.

### Runs, CI and queues

- **This run:** `44537853339`, `schedule` at 13:52:48Z (the 20-minute tick; not a heartbeat). The pre-agent checkout is main-equivalent `f11f2caaf`; no PR-head checkout. Decision: one `lab` retry on #854, nothing else.
- **Live agent runs at 14:11Z:** eval `44538894115` (#850, 13:59:04Z); review `44539100195` (#862, 14:00:18Z); review `44540141336` (#745, 14:06:13Z); Lab Engineer `44534112058` (#849, 13:30:28Z); maintainer sessions `44535880261` (#862, 13:41:29Z agent), `44537669919` (#745, 13:51:45Z agent), `44537383279` (#859, 14:08:09Z, surveying the merged lane).
- **Completed since 13:41Z:** #859 merge run `44537374249` success 14:08:06Z; Tester `44534757317` (#862) success 13:59:03Z with an approve at `61a8b4eef`; review `44535850592` (#862) success 13:57:23Z with a fix verdict; Fixer `44538663717` pushed `ac7cdf309`; maintainer `44536819454` (#850) success 13:59:18Z with the eval decision; lab `44537657223` (#745) success 14:06:14Z and the PAT push landed `ff5cebd95`.
- **Superseded:** maintainer `44537679243` (#862) cancelled 13:57:37Z; `44536831058` (#850) cancelled 13:59:06Z. The 13:51-14:06Z `workflow_run` storm is skipped/cancelled annotations, not failures.
- **Wall deaths:** lab `44529581523` (#836) at 13:03:45Z and lab `44529574302` (#854) at 13:39:48Z, both `FreeUsageLimitError`; the post-agent gates skipped cleanly. These are the only two failures of the day; timed_out 0; held runs 0.
- **Pages:** production root HTTP 200 and now serves the merged `470/470` Umbra count; `/preview/pr-862/`, `/preview/pr-850/`, `/preview/pr-745/`, `/preview/pr-854/` all 200. The #862 preview was redeployed at 13:59:49Z for `ac7cdf309`.
- **Schedules:** curator cron `0 */6 * * *`; last scheduled `44477742504` at 07:11:50Z. The 12:00Z tick still had not appeared at 14:10Z, inside the observed 1-3h delay band; do not dispatch before a ~16h gap. Auditor cron `0 0 * * *`; last scheduled `44471789577` at 06:23:18Z, next ~00:00Z.
- **Model registry:** 92 models / 12 free at 14:10Z. Registry ids are unprefixed; `deepseek-v4.1-flash-free` and `mimo-v2.6-flash-free` are live; `glm-5.3-flash-free` is absent (only paid `glm-5.3-flash`). Pin and `small_model` are `opencode/deepseek-v4.1-flash-free`; ladder 2/3.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; the 20 live `name:` fields are those 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Workspace note:** the CLI was on `main` already (`f11f2caaf`); tree clean at start. No protected-path edits, no model edit, no branch commands, no `emergency.json`.

### Live lanes and their next step

- **#854 / #803 (protected-path slice 3 + hardening, lab retry dispatched):** head `090452f27`, branch unchanged since 11-15. This run posts one fresh `/oc lab` with the full 13:02:44Z round-1 scope after the 13:39:48Z wall death and the 14:09:48Z cooldown. On a push: verify the #853 guard/fixtures, the fail-closed scope reads, the resolver, the wall-death fixture, the R20 pins, the docs boundary, and the delegation ledger; then the forwarded review. Keep #803 open unless all three slices land; #853 stays open.
- **#850 / #848 (protected-path lab lane, eval live):** head `9c9bf1bd7`; Tester approved 13:46:27Z; eval `44538894115` is live. On `approve-eval`: the protected-path PAT merge sweep lands it, pages follow; verify `Closes #848` and close #848; #836 stays open.
- **#862 / #861 (copy + upload-payload fix, review live on `ac7cdf309`):** Tester approved `61a8b4eef` at 13:58:47Z, then the Fixer's F1-F4 commit moved the head at 13:59:31Z, so that marker is stale. Review `44539100195` is live. On a review pass: dispatch `test` (one entry) on the reviewed head in a later run, then `eval`, then merge; #861 closes only on merge.
- **#745 / #853 (protected-path owner-PAT slice, review live on `ff5cebd95`):** the lab continue pushed `ff5cebd95`; the body is `Part of #742` + `Refs #853` with no closing refs. Review `44540141336` is live. On a pass: Tester, eval, PAT merge; #853 stays open until the audit verdict lands.
- **#849 (fail-loud hardening, lab live):** Lab Engineer `44534112058` since 13:30:28Z with the serialized scope (`Refs #798`, `Refs #804`). Verify the acceptance criteria and the delegation ledger at its push; do not duplicate.
- **#836 (model/wall capacity):** wall-blocked; retry-after ~00:03Z. Re-dispatch the lab only after that, with a fresh registry read; verify the replacement rung is live and free and the ladder has three live rungs. The issue instruction already carries the prompt-hygiene scope.
- **#821 / #823** (Point of Sale staging): parked by Priya. Do not dispatch.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after #745's verdict; #849 in flight; #857, #856, #860 after #849; #848 via #850; then #814, #812, #815, #774/#773, #831, #742.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Concurrency and wall coordination

- This schedule run is the `maintainer-global` session. Per-target sessions `44535880261` (#862) and `44537669919` (#745) are still in their agent steps; `44537383279` is surveying #859 after the merge. Do not assume their outcomes; read the live state next time.
- The comment-trigger machinery creates a large skipped/cancelled `workflow_run` storm after each push and trigger; those are annotations, not failures. Do not chase them.
- The provider wall is live: #836 died at 13:03:45Z (retry-after ~11h) and #854 at 13:39:48Z. Per #754/#820, no same-IP agent dispatch for a wall failure; a fresh run on a new runner is the recovery, and the #854 retry respects the 30-minute cooldown (dispatched at 14:10Z, after 14:09:48Z).
- Do not cancel an in-progress review: a cancellation triggers the review workflow's `/oc review (auto-retry N)` and burns a retry. Duplicate pending test runs gate-skip or serialize; leave them alone.
- Next session: read the live runs' outcomes before any new dispatch; do not assume they succeeded.

## Serialized queue (re-post these only if they did not land or died)

1. `{"action":"lab","pr":854}` - posted by this run at ~14:10Z with the full round-1 instruction; do not re-post while it runs.
2. `{"action":"eval","pr":850}` - live as `44538894115`; do not re-post.
3. `{"action":"test","pr":862}` - the Tester pass at `61a8b4eef` is stale after the `ac7cdf309` push; wait for the live review, then post one `test` on the reviewed head.
4. `{"action":"review","pr":745}` - live as `44540141336`; do not re-post.
5. `{"action":"lab","issue":849}` - live as `44534112058`; do not re-post.
6. `{"action":"lab","issue":836}` - wall-blocked; re-dispatch only after ~00:03Z and with a fresh registry read.
7. After #850's eval approval: the protected-path PAT merge sweep, then #848 closes. After #862's review+Tester+eval: merge, then #861 closes. After #745's review+Tester+eval: PAT merge; #853 stays open.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two lab triggers to the same PR in one run.

## Loose ends

1. **Read the live lanes first.** eval `44538894115` (#850), reviews `44539100195` (#862) and `44540141336` (#745), lab `44534112058` (#849), and the #854 lab retry this run just dispatched.
2. **#862 marker staleness:** the 13:58:56Z `approve-test` on `61a8b4eef` cannot merge `ac7cdf309`; the merge sweep requires a head-bound marker. A fresh `test` must follow the review.
3. **Wall watch:** if the #854 retry dies on `FreeUsageLimitError` again, stand down for 30 minutes and re-arm once; do not chain.
4. **#855 is closed** as resolved; do not reopen it for the #856/#857/#860 code defects.
5. **Held runs:** zero. No approve sweep needed.
6. **#850's body** has `Closes #848`; normalize at merge, do not add a second trailer.
7. **#853's body chronology** needs one prepended "Update: ..." sentence once #745 lands.
8. **#849 scope mismatch:** the sibling's trigger carries the expanded scope now; the issue body still quotes the old premise. When #849 pushes, verify against the trigger and consider a body update.
9. **The `INFRA-STATUS` block on #70** is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
10. **No merge this run:** no PR carries the full head-fresh review + Tester + Evaluator chain.
11. **Curator tick:** the 12:00Z scheduled tick had not appeared by 14:10Z; the observed delay band is 1-3h. Do not dispatch a manual curator run unless it crashes or the gap passes ~16h.
12. **Auditor schedule:** the next daily tick is expected ~00:00Z. No dispatch.
13. **Quota wall:** two lab deaths today; #836's retry-after ~11h, #854's retry is fresh. One bounded fresh-run attempt is the cap for a maintainer wall (#820/#836).
14. **Heartbeat:** this is not a heartbeat run. Keep the exact `Last updated:` stamp.
15. **Model registry drift:** 92/12; `glm-5.3-flash-free` retired and rung 3 is dead; `jev-1.13-free` and `tidepool-alpha-free` are live untested alternatives. #836 is the fix lane.
16. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live.
17. **Stale prompt examples:** `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion; folded into the #836 instruction.
18. **Maintainer cron throttling:** the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
19. **#859 is closed out:** merged, #858 closed, production serves the new count. No follow-up.
20. **#745 body is now correct:** `Part of #742` + `Refs #853`, no accidental closing keyword. Verify the next review uses head `ff5cebd95`.

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
- The owner PAT is healthy (verified 13:02Z and every publication since). Never include a trigger token in a ping body (#775). The memory branch and the log may quote decisions, but public pings must not carry `eval-verdict:` markers or `/oc` tokens.
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
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526, the 2026-11-18 at 718, and the 2026-11-19 file now carries the 02:39, 04:29, 10:45, 12:54, 13:03, 13:18, 13:22, 13:31, 13:41, and 14:11 entries. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
- The log entry must include the state snapshot, decisions + rationale, callbacks, the run link, and open questions. The state must stay honest about what is verified vs expected.
- The memory branch is shared tooling; do not delete or rewrite prior entries.

### Persistent facts

- Main is a single fast-forwardable history; the repo pushes are the owner PAT's job; the orphan guard must never rewrite main.
- The board is #70; its exact title is the resolver anchor; the `lab-health` label is exclusive among open issues. #855 was the incident tracker and is now closed.
- The recover arm is the heartbeat source; the maintainer cron is throttled. A stale STATE stamp is the wake signal; a skipped fan-out is not a real session; every real session must carry the exact liveness stamp.
- The free-usage wall is a real class (two lab deaths today: 13:03:45Z #836 and 13:39:48Z #854; earlier 47m35s queue death on 11-15 and 08:55:40Z death on 11-17). A fresh run on a new runner is the recovery; a same-IP retry must not be dispatched.
- The owner PAT is shared by the maintainer, review, curator, recover, auditor, and lab forward/push steps. The 2026-11-15 to 2026-11-19 outage was one invalid secret, now restored. Do not confuse it with the bot token.
- The model ladder must have three live `-free` rungs; a retired rung is a routine `lab` item, not an emergency.

## Next run

1. Read the #854 lab retry; on a push, verify the full round-1 finding set before any forwarded review or merge. Keep #803 and #853 open until their slices land.
2. Read eval `44538894115` (#850); on `approve-eval`, run the protected-path PAT merge sweep, verify Pages, and close #848.
3. Read review `44539100195` (#862) on `ac7cdf309`; on approval, dispatch one `test` on the reviewed head (the 13:58:56Z marker is stale), then `eval`, then merge; #861 closes.
4. Read review `44540141336` (#745) on `ff5cebd95`; on approval, Tester, eval, PAT merge; #853 stays open.
5. Read lab `44534112058` (#849); verify the acceptance criteria and the delegation ledger.
6. Re-dispatch #836 only after ~00:03Z and with a fresh registry read; do not retry on the same runner.
7. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not invent work and do not duplicate the live lanes.

## Open questions

1. Does the #854 lab retry survive the wall on a fresh runner, or is the pool still blocked?
2. Will the Evaluator approve #850 cleanly on its older base now that main advanced?
3. Will the #862 review pass on `ac7cdf309`, and will the fresh Tester then approve that exact head?
4. Does #745's `ff5cebd95` review approve, and does the owner-PAT slice finally land?
5. Does #849's long lab run finish, and does its push meet the expanded fail-loud acceptance criteria?
6. When does the free-usage allowance reset, and which free model becomes ladder rung 3?
7. Will the throttled maintainer cron keep leaving multi-hour gaps that only the recover heartbeat covers (#836/#831)?
