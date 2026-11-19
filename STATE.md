# STATE

Last updated: 2026-11-19T13:56Z by run 44536819454

(Per-PR wake on #850 seconds after its machine-published Tester approval: the single dispatch is `eval` on `9c9bf1bd7`, and the #854 lab wall death is recorded for a later re-arm. #859 merged and #858 closed; #862, #745, and #849 have live lanes.)

## TL;DR for the next Hephaestus

- **#850 (this run's target): Tester PASSED; the Evaluator is queued.** The Tester approved head `9c9bf1bd7` at 13:46:27Z, the machine marker is at 13:46:37Z, and the round-5 review already approved the same head at 13:18:13Z. This run dispatched `{"action":"eval","pr":850}`; the eval should be live by ~13:57Z. On a head-bound `approve-eval`, the protected-path PAT merge sweep lands it; #848 closes on merge, #836 stays open. Do not re-post any trigger.
- **#859: MERGED** at 13:51:48Z after `approve-eval` (9.82/10); #858 CLOSED; main advanced to `f11f2caaf`. The #859 session `44537374249` owns the post-merge checks.
- **#854: the round-1 lab pass DIED ON THE WALL** at 13:39:48Z after 36 minutes of work, with no push; branch unchanged at `090452f27`. The intake posted the board note at 13:40:10Z. Do NOT same-IP retry; re-arm after the wall clears with a fresh registry read.
- **#862:** head `61a8b4eef` (fixer commits for Tester F1 at 13:40:19Z; Tester artifact commit 13:49:28Z). Review `44535850592` is in progress on the older `01bce6463`; Tester `44534757317` is in progress; maintainer `44537679243` is pending. Only a head-current Tester approval plus a head-bound eval authorizes a merge; #861 closes only on merge.
- **#745:** branch moved to `da64b4c1e`; the lab's push was rejected non-fast-forward at 13:51:21Z. The Owner posted `/oc lab continue` at 13:51:33Z and `/oc maintainer` at 13:51:38Z; maintainer `44537669919` is live. Do not duplicate.
- **#849:** Lab Engineer `44534112058` still in progress since 13:30:25Z. Do not duplicate.
- **#836:** wall-dead; shares the same ~10.7h wall as #854. Re-arm both after it clears, with a fresh registry read.
- **No other merge this run:** #850 lacks eval; #862 lacks a head-current Tester approval; #745 and #854 are infra lanes in flight.
- **Model/ladder:** registry 92/12 at 13:48Z; `deepseek-v4.1-flash-free` (pin/small model) and `mimo-v2.6-flash-free` live; `glm-5.3-flash-free` absent (only paid `glm-5.3`), so the ladder stays 2/3. #836 is the fix lane.
- **Failures today:** exactly two, both the provider wall: `44529581523` (#836, 13:03:45Z) and `44529574302` (#854, 13:39:48Z). Timed out 0; held runs 0.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 13:47-13:57Z on 2026-11-19)

### GitHub state

- **Main:** `f11f2caaf5e743b9eb8ffbd73815b1eabd253321` ("curate: refresh Umbra test count and fix Hearthlight noscript copy (Fixes #858)", 2026-11-19T13:51:48Z, the rebase merge of #859). **`maintainer/logs`:** `64ddbc456aaf35dea73081b3f947abd6721fa7e8` at the 13:49Z read.
- **Open PRs (5):** #862 head `61a8b4eefeafd29350bd024fcac4787f801d012f`, `Fixes #861`, CLEAN/MERGEABLE; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, merge state UNKNOWN right after the main advance (the PAT sweep rebases); #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, CLEAN, lab wall-dead; #821 head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale; #745 head `da64b4c1ea4f50ec906270ac6b31720c4e603e12`, push rejected at 13:51:21Z, fresh lab continue live.
- **Open issues (28 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860, #861. #858 is CLOSED (merged with #859). No new issue since 07:34Z; no untriaged subject.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Wall intake notes at 13:04:10Z (#836) and 13:40:10Z (#854). #855 stays closed.
- **Latest comments:** #850 Tester pass 13:46:27Z, report 13:46:34Z, `/oc approve-test` 13:46:37Z, `/oc maintainer` 13:46:38Z; #859 eval approval 13:49:47/54/56Z and merge 13:51:48Z; #862 `/oc maintainer` 13:51:42Z; #745 push rejection 13:51:21Z, `/oc lab continue` 13:51:33Z, `/oc maintainer` 13:51:38Z.
- **Branch tips:** main `f11f2caaf`; #862 `61a8b4ee`; #850 `9c9bf1bd7`; #854 `090452f27`; #745 `da64b4c1e`; #859 branch `9b862e48` (merged); #821 `dce109e4`. Newest closed PR is now #859; the previously newest was #852. No recovery due.
- **Linkage:** #848 is open and is the only closing reference on #850; #836 is open and unlabelled; #861 is open and closes only when #862 merges.

### Runs, CI and queues

- **This run:** `44536819454`, `issue_comment` on #850 created 13:46:37Z, summoning comment `/oc maintainer` at 13:46:38Z (one second after the machine `/oc approve-test`). Decision `eval` on #850 plus a #854 ping; not a heartbeat.
- **Live agent runs at 13:56Z:** maintainer `44535880261` (#862, 13:40:57Z), maintainer `44537669919` (#745, 13:51:42Z), maintainer `44537374249` (#859, merging/finishing), review `44535850592` (#862, 13:40:49Z), Tester `44534757317` (#862 job since 13:38:19Z), labs `44529576796` (#745, 13:02:51Z) and `44534112058` (#849, 13:30:25Z). Pending: maintainer `44536831058` (#850 duplicate, 13:46:42Z), maintainer `44537679243` (#862, 13:51:45Z).
- **Completed:** Tester `44532152403` (#850) success 13:46:42Z; eval `44534657717` (#859) success 13:50:07Z with `approve-eval` 9.82/10; #859 merged 13:51:48Z. No other verdicts since the 13:46Z batch.
- **Wall deaths:** `44529581523` (#836) at 13:03:45Z and `44529574302` (#854) at 13:39:48Z, both `FreeUsageLimitError`; retry-after ~39655s and ~38474s respectively (diagnostic only). No same-IP retry.
- **Concurrency:** our `maintainer-850` session is `44536819454`; `44536831058` is pending behind it in the same group. The three siblings above are separate target groups. The 13:46-13:52 `workflow_run` storm is skipped/cancelled annotations, not failures.
- **Pages:** root and `/preview/pr-850/`, `/preview/pr-859/`, `/preview/pr-862/` all HTTP 200.
- **Schedules:** curator cron `0 */6 * * *`; last scheduled `44477742504` at 07:11:50Z (the 06:00 tick delayed ~71m); the 12:00Z tick had not appeared by 13:57Z, inside the observed 1-3h delay band. Auditor cron `0 0 * * *`; last scheduled `44471789577` at 06:23:18Z; next ~00:00Z.
- **Model registry:** 92 models / 12 free at 13:48Z. Registry ids are unprefixed; `deepseek-v4.1-flash-free` and `mimo-v2.6-flash-free` are live; `glm-5.3-flash-free` is absent (only paid `glm-5.3`). Pin and `small_model` are `opencode/deepseek-v4.1-flash-free`; ladder 2/3.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; the 20 live `name:` fields are those 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Workspace note:** the CLI bootstrap checked out the PR head `9c9bf1bd7` for this comment wake (tree clean). No protected-path edits, no model edit, no branch commands, no `emergency.json`. The PR touches protected paths, so the workspace copies of workflows/scripts differ from main; the bridge steps read main through the contents API.

### Live lanes and their next step

- **#850 / #848 (protected-path lab lane, eval queued):** head `9c9bf1bd7`; round-5 review approved 13:18:13Z; Tester passed 13:46:27Z with the machine marker at 13:46:37Z; this run dispatched `eval`. On a head-bound `approve-eval`: the protected-path PAT merge sweep, then #848 closes on merge and #836 stays open. Recheck the merge state after GitHub recomputes post-#859; the sweep rebases.
- **#862 / #861 (Curator copy + Netpulse probe fix, review and test live):** head `61a8b4eef`; the Tester's F1 (the 256 KB payload could never build) was fixed in `f38dfecb3`/`01bce6463` at 13:40:19Z; review `44535850592` started on `01bce6463` and must be treated as stale if the head is unchanged at `61a8b4eef`; the Tester committed `61a8b4eef` at 13:49:28Z. On a head-current review approval: `test`, then on a Tester pass `eval`, then the merge; #861 closes on merge. Do not re-post triggers while `44535850592`/`44534757317` live.
- **#854 / #803 (protected-path slice 3 + hardening, wall-dead):** head `090452f27`; the round-1 lab pass ran 36 minutes and died on the wall with no push. Re-arm one fresh lab pass after the wall clears (fresh registry read first); keep #803 open until all three slices land.
- **#745 / #853 (orphaned audit/rebuild, restarted):** head `da64b4c1e`; the previous lab push was rejected non-fast-forward at 13:51:21Z; the Owner dispatched `/oc lab continue` at 13:51:33Z and maintainer `44537669919` is live. On a push: verify with `git ls-remote`, dispatch exactly one fresh review, keep #853 open; delete the older bot review on the exact commit id if present.
- **#849 (fail-loud hardening, lab live):** Lab Engineer `44534112058` since 13:30:25Z with the serialized scope (`Refs #798`, `Refs #804`). Verify the acceptance criteria and the delegation ledger at its push. Do not duplicate.
- **#859 / #858:** MERGED; #858 CLOSED; main `f11f2caaf`. No action unless the Pages deploy fails.
- **#836 (model/wall capacity):** wall-blocked with the #854 death; the ladder is 2/3. Re-dispatch after the wall clears with a fresh registry read; verify three live free rungs.
- **#821 / #823** (Point of Sale staging): parked by Priya. Do not dispatch.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after #745's verdict; #849 in flight; #857, #856, #860 after #849; #848 via #850; then #814, #812, #815, #774/#773, #831, #742.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Concurrency and wall coordination

- Several Maintainer sessions are live at once. This run is the `maintainer-850` session answering the Tester marker; the pending `44536831058` will survey after it in the same group and must see the eval trigger already posted. Siblings `44535880261` (#862), `44537669919` (#745), and `44537374249` (#859) own their targets.
- The comment-trigger machinery creates a large skipped/cancelled `workflow_run` storm after each push and trigger; those are annotations, not failures. Do not chase them.
- The provider wall is live: two deaths today, at 13:03 and 13:39, with ~11h/~10.7h retry-afters. Per #754/#820, no same-IP agent dispatch for a wall failure; the bounded fresh-run step owns the single maintainer recovery attempt. The eval and review lanes dispatched after 13:33 survived, so the wall is per-runner, not universal.
- Do not cancel an in-progress review: a cancellation triggers the review workflow's `/oc review (auto-retry N)` and burns a retry. Duplicate pending runs gate-skip or serialize; leave them alone.
- Next session: read the live runs' outcomes before any new dispatch; do not assume they succeeded.

## Serialized queue (re-post these only if they did not land or died)

1. `{"action":"eval","pr":850}` - dispatched by this run at ~13:56Z; do not re-post unless its run dies without a verdict.
2. `{"action":"test","pr":862}` - the review's own handoff will post it after a head-current approval; do not pre-empt.
3. `{"action":"lab","pr":854}` - re-arm only after the wall clears; the previous pass died on it.
4. `{"action":"lab","pr":745}` - the Owner's `/oc lab continue` at 13:51:33Z is live; do not duplicate.
5. `{"action":"lab","issue":849}` - live as `44534112058`; do not duplicate.
6. `{"action":"lab","issue":836}` - wall-blocked; re-dispatch alongside #854 after the wall clears and with a fresh registry read.
7. After #850's eval approval: the protected-path PAT merge sweep, then #848 closes. After #862's Tester approval: `eval`, then merge; #861 closes.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two lab triggers to the same PR in one run.

## Loose ends

1. **Read the live lanes first.** Siblings `44535880261` (#862), `44537669919` (#745), `44537374249` (#859); review `44535850592`; Tester `44534757317`; labs `44529576796` (#745) and `44534112058` (#849); pending maintainers `44536831058` (#850) and `44537679243` (#862).
2. **#850 eval:** verify the trigger posted after this run and the eval is in progress; on `approve-eval`, let the PAT merge sweep rebase and merge. Do not add a second trailer.
3. **#862 head churn:** the review started on `01bce6463` and the Tester committed `61a8b4eef`; only head-current verdicts count. Watch for the review workflow's head-movement guard.
4. **#854 wall:** the branch is unchanged; no finding is rejected. Re-arm after the wall clears; keep #803 open.
5. **#745:** verify the fresh continue push with `git ls-remote` before any review; keep #853 open; delete a stale bot review on the exact old commit id if present.
6. **#849 scope:** the sibling's trigger carries the expanded scope; verify against the trigger and consider a body update at its push.
7. **#850 merge state:** recheck after GitHub recomputes post-#859; the PAT sweep rebases, so the older base is not a blocker.
8. **Wall watch:** if the eval or review lanes die on `FreeUsageLimitError`, stand down the window and re-arm on the next wake; do not chain dispatches.
9. **Held runs:** zero. No approve sweep needed.
10. **No merge this run:** #850 lacks eval; #862 lacks a head-current Tester approval; #745/#854 are infra lanes in flight.
11. **Curator tick:** the 12:00Z tick is inside the observed 1-3h delay band; do not dispatch a manual run unless it crashes or the gap passes ~16h.
12. **Auditor schedule:** next daily tick expected ~00:00Z. No dispatch.
13. **Heartbeat:** this is not a heartbeat run. Keep the exact `Last updated:` stamp.
14. **Model registry drift:** 92/12; `glm-5.3-flash-free` retired, so rung 3 is dead; `jev-1.13-free` and `tidepool-alpha-free` are live untested alternatives. #836 is the fix lane.
15. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live.
16. **Stale prompt examples:** `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion; folded into the #836 instruction.
17. **Maintainer cron throttling:** the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
18. **#858 is closed** with #859's merge; do not reopen it for its code defects. #848 closes on #850's merge; #836 stays open for the Owner capacity decision.
19. **#855 is closed** as resolved; do not reopen it for the #856/#857/#860 code defects.
20. **Wake-gate nuance:** the maintainer `if:` gate ignores `/oc` bodies, so this run was summoned by the `/oc maintainer` comment (which is the intended summon after the test workflow's marker), not by the Tester's prose report. Do not treat the resulting per-PR runs as duplicates.

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
- The owner PAT is healthy (verified by the 13:49/13:51 eval publication and merge). Never include a trigger token in a ping body (#775). The memory branch and the log may quote decisions, but public pings must not carry `eval-verdict:` markers or `/oc` tokens.
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
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526, the 2026-11-18 at 718, and the 2026-11-19 file now carries the 02:39, 04:29, 10:45, 12:54, 12:55, 13:02, 13:08, 13:18, 13:25, 13:31, 13:41, and 13:56 entries. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
- The log entry must include the state snapshot, decisions + rationale, callbacks, the run link, and open questions. The state must stay honest about what is verified vs expected.
- The memory branch is shared tooling; do not delete or rewrite prior entries.

### Persistent facts

- Main is a single fast-forwardable history; the repo pushes are the owner PAT's job; the orphan guard must never rewrite main.
- The board is #70; its exact title is the resolver anchor; the `lab-health` label is exclusive among open issues. #855 was the incident tracker and is now closed.
- The recover arm is the heartbeat source; the maintainer cron is throttled. A stale STATE stamp is the wake signal; a skipped fan-out is not a real session; every real session must carry the exact liveness stamp.
- The free-usage wall is a real class (the 13:03:45Z #836 death and the 13:39:48Z #854 death are the latest; earlier 47m35s queue death on 11-15 and 08:55:40Z death on 11-17). One fresh-run attempt is the only re-dispatch; a same-IP retry must not be dispatched.
- The owner PAT is shared by the maintainer, review, curator, recover, auditor, and lab forward/push steps. The 2026-11-15 to 2026-11-19 outage was one invalid secret, now restored and confirmed by the #859 eval publication and merge. Do not confuse it with the bot token.
- The model ladder must have three live `-free` rungs; a retired rung is a routine `lab` item, not an emergency.

## Next run

1. Read the #850 eval run (dispatched ~13:56Z). On a head-bound `approve-eval`, verify the protected-path PAT merge sweeps #850 and #848 closes on merge; #836 stays open.
2. Read #862's review `44535850592` and Tester `44534757317`, plus the maintainer `44537679243`; the head moved to `61a8b4eef`, so only head-current verdicts count. On a Tester pass, `eval` in a later run, then merge; #861 closes on merge.
3. Watch #745's `/oc lab continue` and the #849 lab for pushes; verify each finding set before any review or merge. Keep #853 and #803 open until their slices land.
4. Re-arm the #854 round-1 lab pass and the #836 ladder item only after the wall clears and with a fresh registry read; verify three live `-free` rungs. Do not same-IP retry.
5. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not invent work and do not duplicate the live lanes.

## Open questions

1. Will the #850 eval approve cleanly, or return a Quality Council finding that reopens the lab lane?
2. Will the #862 head settle long enough for the review and Tester to post head-current verdicts?
3. Does the #745 lab continue recover the rejected push, and does the branch now carry the intended rebase?
4. When exactly does the wall clear for #854 and #836, and will a fresh runner get a fresh bucket?
5. Which free model becomes rung 3, and will #836 land the ladder fix before another retirement?
6. Will the throttled maintainer cron keep leaving multi-hour gaps that only the recover heartbeat covers (#836/#831)?
