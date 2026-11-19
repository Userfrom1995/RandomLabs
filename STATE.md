# STATE

Last updated: 2026-11-19T13:31Z by run 44533563848

(Per-PR wake on #859 one second after the machine-published Tester approval. The headline: #859 passed the Tester and this run queues the Evaluator; #850 is still in the Tester, #862's head-fresh review is live, #854/#745 remain in the lab, and a sibling session started the #849 lab lane early. #836 stays wall-blocked.)

## TL;DR for the next Hephaestus

- **#859 (this run's target): Tester PASS.** `44531572444` succeeded at 13:27:06Z; the report (`13:26:59Z`) and the owner `/oc approve-test` (`13:27:01Z`, id 7010495790) are on the thread at head `9b862e48`. This run dispatches `{"action":"eval","pr":859}`; the evaluator is the last gate, then the merge sweep lands it and #858 closes.
- **#850:** head `9c9bf1bd7`, round-4 review approved 13:18:13Z, Tester `44532152403` still in progress since 13:18:26Z. On its pass: `eval`, then the protected-path PAT merge; #848 closes at merge.
- **#862:** head `0673248c`; the old-head duplicate review approved at 13:21:31Z and its forwarded test `44533179104` is pending, but the head-fresh authority is the auto-retry review `44533179130` (in progress since 13:24:44Z). On a clean verdict: `test`, then `eval`, then merge; #861 closes on merge.
- **#854:** lab `44529574302` in progress since 13:02:47Z on head `090452f27`; branch unchanged. The sibling `44528414321` answered the owner summon at 13:26:35Z.
- **#745:** lab `44529576796` in progress since 13:02:48Z; head `7a04fa4a`, CONFLICTING/DIRTY.
- **#849 (new, early start):** sibling Maintainer run `44531223481` completed success at 13:30:42Z and posted `/oc lab` on #849 at 13:30:22Z; Lab Engineer `44534112058` is in progress since 13:30:25Z with the serialized fail-loud scope (`Refs #798`, `Refs #804`). This starts the #849 -> #857 -> #856 -> #860 chain before the #850 merge, not as previously planned; it is in flight, so do not duplicate it.
- **#836:** still the only failure of the day. `FreeUsageLimitError` at 13:03:45Z, `retry-after` ~11h; no same-IP retry, one bounded fresh-run attempt is the cap.
- **No merge this run:** #859 has no eval verdict yet; every other PR lacks a head-fresh Tester plus Evaluator chain.
- **Model/ladder:** registry 92/12 at 13:30Z; `deepseek-v4.1-flash-free` (pin/small model) and `mimo-v2.6-flash-free` live; `glm-5.3-flash-free` absent, so the ladder stays 2/3. #836 is the fix lane.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 13:27-13:31Z on 2026-11-19)

### GitHub state

- **Main:** `e5cd250c126efa8c86a084b3d72ade3bcf9bdc5b` ("curate: sync Maze Chase release status and correct the Pac-Man retirement claim", Fixes #851; 2026-11-15T06:31:53Z). **`maintainer/logs`:** `63735f3fb36ace46f54195d8e4510ecaac4862dc`.
- **Open PRs (6):** #862 head `0673248c4867e9a0c4a0d2a715ad1066c4107d39`, body `Fixes #861`, CLEAN/MERGEABLE; #859 head `9b862e484cb51ef8a785ffbfcf25da5740b41b49`, body `Fixes #858`, CLEAN/MERGEABLE; #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, body `Closes #803`, 6 files (5 protected-path), CLEAN/MERGEABLE; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, body `Closes #848`, CLEAN/MERGEABLE; #821 head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale; #745 head `7a04fa4a96e1982ac307ca40973fed29379def0b`, CONFLICTING/DIRTY.
- **Open issues (28 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #858, #860, #861. No new issue since 07:34Z; no untriaged subject.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Latest note 13:12:46Z. #855 stays closed.
- **Latest comments:** #859 Tester pass 13:26:52/59Z, owner `/oc approve-test` 13:27:01Z and `/oc maintainer` 13:27:02Z; #862 stale-duplicate approval 13:21:31Z and head-fresh auto-retry trigger 13:24:41Z; #849 owner `/oc lab` 13:30:22Z; #854 sibling note 13:26:22/35Z.
- **Branch tips:** main `e5cd250c`, `maintainer/logs` `63735f3fb`. Newest closed PR is #852 (merged 11-15); no recovery due.

### Runs, CI and queues

- **This run:** `44533563848`, `issue_comment` `/oc maintainer` on #859 at 13:27:02Z; job started 13:27:03Z. Not a heartbeat.
- **Live agent runs at 13:31Z:** Tester `44532152403` (#850), review `44533179130` (#862 auto-retry), lab `44529574302` (#854), lab `44529576796` (#745), Lab Engineer `44534112058` (#849). Pending: test `44533179104` (#862, from the stale duplicate approval).
- **Completed:** test `44531572444` (#859) success 13:27:06Z; duplicate review `44529850597` (#862 old head) success 13:21:45Z; the 13:15:46Z fresh review `44531723229` cancelled 13:24:46Z and auto-retried.
- **Wall death:** lab `44529581523` (#836), failure 13:03:45Z, `FreeUsageLimitError`, no decision file; the post-agent gates skipped cleanly. Only failure of the day; timed_out 0; held runs 0.
- **Concurrency:** our `maintainer-859` session is `44533563848`; the later `issue_comment` wake `44533573067` is pending behind it in the same group; `44533565999` was cancelled as a superseded per-target run. The 13:27-13:31Z `workflow_run` storm is skipped/cancelled annotations, not failures.
- **Pages:** production root and `/preview/pr-859/`, `/preview/pr-850/`, `/preview/pr-862/` all HTTP 200.
- **Schedules:** curator last scheduled `44477742504` at 07:11:50Z (success); the ~13:11Z tick is delayed, not failed. Auditor last scheduled `44471789577` at 06:23Z (success); next ~06:00Z tomorrow.
- **Model registry:** 92 models / 12 free at 13:30Z. Registry ids are unprefixed; `deepseek-v4.1-flash-free` and `mimo-v2.6-flash-free` are live; `glm-5.3-flash-free` is absent (only paid `glm-5.3-flash`). Pin and `small_model` are `opencode/deepseek-v4.1-flash-free`; ladder 2/3.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; the 20 live `name:` fields are those 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Workspace note:** checkout is the trusted default-branch commit (main `e5cd250c`), working tree clean at start. No protected-path edits, no model edit, no branch commands, no `emergency.json`.

### Live lanes and their next step

- **#859 / #858 (Curator copy, eval queued by this run):** head `9b862e48`; review approved 13:14:43Z; Tester passed and the owner marker is at 13:27:01Z; this run posts `/oc eval`. On `approve-eval` the merge sweep lands it and #858 closes. Not a new project, so the shipping limit does not apply.
- **#850 / #848 (protected-path lab lane, test live):** head `9c9bf1bd7`; round-4 review approved 13:18:13Z; Tester `44532152403` in progress. On approval: `eval` in a later run, then the protected-path PAT merge; verify the `Closes #848` trailer. #849 has already started early via the sibling session; #857/#856/#860 follow one branch at a time.
- **#862 / #861 (Curator copy, head-fresh review live):** head `0673248c`. The old-head duplicate approval and its pending test are not the head-fresh authority; the auto-retry review `44533179130` is. On a clean verdict: `test`, then `eval` in a later run, then the PAT merge sweep; #861 closes only on merge.
- **#854 / #803 (protected-path slice 3 + hardening, lab live):** lab `44529574302` on head `090452f27` with the full B1-B3/H1-H5 instruction. On a push: watch the forwarded review; verify each finding and the `Refs #853`/conditional `Closes #803` rewrite. Do not close #803 until all three slices land. `health-board.sh` is still absent on main.
- **#745 / #853 (orphaned audit/rebuild, lab live):** lab `44529576796` rebase retry with `Refs #853`, no `Closes`. On a push: verify with `git ls-remote`, dispatch exactly one fresh review, keep #853 open; delete the older bot review on the exact commit if it still exists.
- **#849 (fail-loud hardening, lab live early):** Lab Engineer `44534112058` since 13:30:25Z with the sibling's `/oc lab` instruction (contents-API reads with `--hostname github.com`, fresh private `GH_CONFIG_DIR`, `GH_HOST`, `/bin/bash -p -s`, phase-lane read hardening, whole-body marker screening, R30/HELPER_EXECUTE_FORMS mutation coverage, LAB.md/AGENTS.md accuracy; `Refs #798`, `Refs #804`). Verify the acceptance criteria and the delegation ledger at its push.
- **#836 (model/wall capacity):** ladder + prompt-hygiene instruction queued on the issue; the first lab run died on the wall. Re-dispatch on a later wake after a fresh registry read; verify the replacement rung is live and free and the ladder has three live rungs.
- **#821 / #823** (Point of Sale staging): parked by Priya. Do not dispatch.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after #745's verdict; #849 in flight; #857, #856, #860 after #849; #848 via #850; then #814, #812, #815, #774/#773, #831, #742.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Concurrency and wall coordination

- Several Maintainer sessions ran in the same 30-minute window. This run is the first `maintainer-859` session after the tester approval; the pending `44533573067` will survey after it and should see the eval lane live. Do not re-post the eval.
- The comment-trigger machinery creates a large skipped/cancelled `workflow_run` storm after each push and trigger; those are annotations, not failures. Do not chase them.
- The provider wall is live: the #836 lab died at 13:03:20Z with an ~11h retry-after. Per #754/#820, no same-IP agent dispatch for a wall failure; the bounded fresh-run step owns the single recovery attempt. The other lanes have model access so far.
- Next session: read the live runs' outcomes before any new dispatch; do not assume they succeeded.

## Serialized queue (re-post these only if they did not land or died)

1. `{"action":"eval","pr":859}` - posted by this run; do not re-post.
2. `{"action":"test","pr":850}` - live as `44532152403`; do not re-post.
3. `{"action":"review","pr":862,"head":"0673248c4867e9a0c4a0d2a715ad1066c4107d39"}` - live as `44533179130`; do not re-post.
4. `{"action":"lab","pr":854}` - live as `44529574302`; do not re-post.
5. `{"action":"lab","pr":745}` - live as `44529576796`; do not re-post.
6. `{"action":"lab","issue":849}` - live as `44534112058`; do not re-post.
7. `{"action":"lab","issue":836}` - wall-blocked; re-dispatch only after the ~11h retry-after clears and with a fresh registry read.
8. After #859's eval approval: the PAT merge sweep, then #858 closes. After #850's Tester approval: `eval`, then the protected-path PAT merge. After #862's head-fresh approval: `test`, then `eval`, then merge.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two lab triggers to the same PR in one run.

## Loose ends

1. **Read the live lanes first.** Tests `44532152403` (#850), review `44533179130` (#862), labs `44529574302` (#854), `44529576796` (#745), `44534112058` (#849); pending test `44533179104` (#862 stale duplicate forwarded).
2. **Wall watch:** if the surviving lanes die on `FreeUsageLimitError`, stand down the window and re-arm on the next wake; do not chain dispatches.
3. **#855 is closed** as resolved; do not reopen it for the #856/#857/#860 code defects.
4. **Held runs:** zero. No approve sweep needed.
5. **#745 stale bot review:** after the rebase, delete the older bot review on the exact commit id if present; filter by `commit_id`, not just author.
6. **#850's body** has `Closes #848`; normalize at merge, do not add a second trailer.
7. **#853's body chronology** needs one prepended "Update: ..." sentence once #745 lands.
8. **#849 scope mismatch:** the sibling's trigger carries the expanded scope now; the issue body still quotes the old premise. When #849 pushes, verify against the trigger and consider a body update.
9. **The `INFRA-STATUS` block on #70** is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
10. **No merge this run:** no PR carries the full head-fresh Tester plus Evaluator chain.
11. **Curator tick:** the ~13:11Z scheduled tick is delayed; do not dispatch a manual curator run unless it crashes or the gap passes ~16h.
12. **Auditor schedule:** the next daily tick is expected ~06:00Z tomorrow. No dispatch.
13. **Quota wall:** the 13:03:45Z #836 death is the live instance; retry-after ~11h. One fresh-run attempt is the cap (#820/#836).
14. **Heartbeat:** this is not a heartbeat run. Keep the exact `Last updated:` stamp.
15. **Model registry drift:** 92/12; `glm-5.3-flash-free` retired and rung 3 is dead; `jev-1.13-free` and `tidepool-alpha-free` are live untested alternatives. #836 is the fix lane.
16. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live.
17. **Stale prompt examples:** `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion; folded into the #836 instruction.
18. **Maintainer cron throttling:** the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
19. **Duplicate #862 review:** the old-head duplicate approved at 13:21:31Z; its test `44533179104` is pending. The head-fresh authority is the auto-retry review `44533179130`; if its verdict differs, the newer head-bound result wins.
20. **#849 started early:** the earlier plan was to wait for #850's merge; the sibling session opened it at 13:30Z. Treat it as the first serialized backlog item from now on.

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
- The owner PAT is healthy again (verified 13:02Z). Never include a trigger token in a ping body (#775). The memory branch and the log may quote decisions, but public pings must not carry `eval-verdict:` markers or `/oc` tokens.
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
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526, the 2026-11-18 at 718, and the 2026-11-19 file now carries the 02:39, 04:29, 10:45, 12:54, 13:03, 13:18, 13:22, and 13:31 entries. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
- The log entry must include the state snapshot, decisions + rationale, callbacks, the run link, and open questions. The state must stay honest about what is verified vs expected.
- The memory branch is shared tooling; do not delete or rewrite prior entries.

### Persistent facts

- Main is a single fast-forwardable history; the repo pushes are the owner PAT's job; the orphan guard must never rewrite main.
- The board is #70; its exact title is the resolver anchor; the `lab-health` label is exclusive among open issues. #855 was the incident tracker and is now closed.
- The recover arm is the heartbeat source; the maintainer cron is throttled. A stale STATE stamp is the wake signal; a skipped fan-out is not a real session; every real session must carry the exact liveness stamp.
- The free-usage wall is a real class (the 13:03:45Z #836 death with an ~11h retry-after is the latest; earlier 47m35s queue death on 11-15 and 08:55:40Z death on 11-17). One fresh-run attempt is the only re-dispatch; a same-IP retry must not be dispatched.
- The owner PAT is shared by the maintainer, review, curator, recover, auditor, and lab forward/push steps. The 2026-11-15 to 2026-11-19 outage was one invalid secret, now restored. Do not confuse it with the bot token.
- The model ladder must have three live `-free` rungs; a retired rung is a routine `lab` item, not an emergency.

## Next run

1. Read the `/oc eval` run on #859; on `approve-eval`, run the PAT merge sweep and close #858.
2. Read `44532152403` (#850 test); on a pass, `eval` in a later run, then the protected-path PAT merge; #848 closes at merge.
3. Read `44533179130` (#862 head-fresh review); on a clean verdict, post `test`, then `eval` in a later run, then merge; #861 closes on merge.
4. Watch the three protected-path labs (#854, #745, #849) for pushes; verify each finding set before any review or merge. Keep #803 and #853 open until their slices land.
5. Re-dispatch #836 only after the wall clears and with a fresh registry read; do not retry on the same runner.
6. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not invent work and do not duplicate the live lanes.

## Open questions

1. Will the Evaluator approve #859 cleanly, and does any eval finding reopen the copy PR?
2. Do the concurrently running protected-path labs (#854, #745, #849) collide on the shared audit scripts or on push ordering?
3. Will the #862 head-fresh review confirm the old-head duplicate's approval?
4. Will #850's Tester pass on the five-day-old protected-path branch?
5. When does the free-usage allowance reset for #836, and which free model becomes rung 3?
6. Will the throttled maintainer cron keep leaving multi-hour gaps that only the recover heartbeat covers (#836/#831)?
