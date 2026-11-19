# STATE

Last updated: 2026-11-19T14:26Z by run 44537383279

(#859 peer survey: the PR was already merged by a sibling at 13:51:48Z and #858 is closed; this run verified production, found every remaining lane already owned (and #854 re-armed by the bounded recovery at 14:19Z), and corrected a false R1-R36 audit failure that a wrong-CWD #850-branch invocation posted on the board.)

## TL;DR for the next Hephaestus

- **#859 MERGED and #858 CLOSED.** Merge commit `f11f2caaf5e743b9eb8ffbd73815b1eabd253321` (13:51:48Z), `#858` closed COMPLETED at 13:51:49Z. Production root serves "470/470 node:test green" and `/film/` serves "the stage below needs it to paint the film" (re-verified 14:10Z). Do not merge again.
- **#862 (netpulse/theme copy + upload fix): head `ac7cdf309`; REVIEW APPROVED, TESTER LIVE.** The Fixer applied F1-F4 on top of the Tester's quota suite and pushed `ac7cdf309` at 14:00:07Z (rebased onto `f11f2caaf`). A head-fresh review (run `44539100195`) **approved** at 14:21:30Z on `ac7cdf309`, base `f11f2caaf`, 0 behind / 7 ahead; its forward posted `/oc test` at 14:21:33Z and the Tester `44542873513` is in progress since 14:21:37Z. Next: read the Tester verdict; on a pass dispatch `eval` in a later run, then merge the protected-path-free PR and close #861. Do not re-post review or test.
- **#850 (lab-health board selector): head `9c9bf1bd7`; EVAL LIVE.** The Tester approved at 13:46:27Z (R1-R36 37/37 from the repo root, board resolves to #70), the marker is at 13:46:37Z, and eval `44538894115` is in progress since 13:59:04Z (~25 min). On `approve-eval`: PAT merge, verify Pages, confirm #848 closes; #836 stays open.
- **#745 (orphaned lab, rebased): head `ff5cebd95`; REVIEW LIVE.** Lab `44537657223` succeeded at 14:06:14Z after a rejected plain push at 14:05:57Z and a successful PAT push; `/oc review` at 14:06:09Z started review `44540141336` (in progress since 14:06:13Z; the duplicate `44540154552` is pending and will skip at its gate). On a verdict: keep #853 open, add the prepended "Update: ..." sentence, then test/eval per the verdict.
- **#849 (post-agent owner-PAT helper hardening): LAB LIVE.** Lab Engineer `44534112058` in progress since 13:30:25Z (~56 min; `Refs #798`, `Refs #804`). Verify the acceptance criteria and the delegation ledger at its push.
- **#854 (auto-retry budget slice 3): LAB RE-ARMED.** The bounded recovery started Lab Engineer `44542495457` at 14:19:32Z on the round-1 instruction; the branch is still `090452f27` and the PR CLEAN. This is the single fresh-run attempt after the 13:39:48Z wall death; if it dies on the wall again, do not re-dispatch.
- **#836: still wall-blocked** (13:03:45Z death). No dispatch.
- **Board #70 correction:** the 14:06:32Z `Silent-stall regression audit FAILED (R1-R36)` note (7 passed / 30 failed) is an invocation artifact: the #850-branch R1-R36 matrix was run from outside the repository root, so repository-relative rules false-failed on files that exist on `main`. Reproduced from `/tmp` this run (6 passed / 31 failed, identical missing-file text); the same matrix from the repo root passes 37/37 (Tester `44532152403`). This run's ping on #70 records the correction. No dispatch follows.
- **Failures today: exactly two**, both `FreeUsageLimitError`: #836 lab 13:03:45Z and #854 lab 13:39:48Z. No new failure. Held runs 0.
- **No merge by this run:** #859 was already merged; #850 has no eval verdict; #862's Tester is live; #745 has no verdict.
- **Model/ladder:** registry 92/12 at 14:23Z. Pin and `small_model` `opencode/deepseek-v4.1-flash-free` live; rung 2 `opencode/mimo-v2.6-flash-free` live; rung 3 `opencode/glm-5.3-flash-free` absent, so the ladder is 2/3 and #836 is the fix lane.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 14:09-14:24Z on 2026-11-19)

### GitHub state

- **Main:** `f11f2caaf5e743b9eb8ffbd73815b1eabd253321` ("curate: refresh Umbra test count and fix Hearthlight noscript copy (Fixes #858)", 2026-11-19T13:51:48Z). **`maintainer/logs`:** `fd2fef1d7d18ef1fce5ae9a52bb890ae559ead62` at 14:23Z.
- **Open PRs (5):** #862 head `ac7cdf309c33e6da31c6a8dd6154d9bff63e4570`, `Fixes #861`, CLEAN/MERGEABLE; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN; #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN; #821 head `dce109e4`, CLEAN, parked Point of Sale; #745 head `ff5cebd953aa3343ffe44ff37853f2ba78e6378e`, CLEAN/MERGEABLE. **#859 merged.**
- **Open issues (27 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860, #861. #858 closed. No new issue since 07:34Z; no untriaged subject.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Latest board note 14:06:32Z is the false R1-R36 audit failure this run corrects; before it, the 13:40:10Z quota intake. #855 stays closed.
- **Latest comments:** #862 review approval 14:21:30Z, `/oc test` 14:21:33Z; #745 `/oc review` 14:06:09Z, `/oc maintainer` 14:06:14Z; #850 `/oc eval` 13:59:01Z; #854 maintainer note 14:13:30Z; #70 audit note 14:06:32Z.
- **Branch tips:** main `f11f2caaf`; `maintainer/logs` `fd2fef1d`; #862 `ac7cdf309`; #745 `ff5cebd95`; #850 `9c9bf1bd7`; #854 `090452f27`. Newest closed PR is #859 (merged today); no recovery due.

### Runs, CI and queues

- **This run:** `44537383279`, `issue_comment` on #859 created 13:49:57Z by `Userfrom1995` (`/oc maintainer`, one second after the eval marker); a queued peer of `44537374249`. Not a heartbeat. Decision: one `ping` to #70.
- **Live agent runs at 14:23Z:** eval `44538894115` (#850, since 13:59:04Z), Lab Engineer `44534112058` (#849, since 13:30:25Z), Lab Engineer `44542495457` (#854 recovery, since 14:19:32Z), review `44540141336` (#745, since 14:06:13Z), test `44542873513` (#862, since 14:21:37Z), plus a pending review duplicate `44540154552` (#745, since 14:06:18Z) and pending maintainer `44542873622` (#862, since 14:21:37Z).
- **Completed this window:** #862 review `44539100195` success 14:21:36Z (approve on `ac7cdf309`); #745 lab `44537657223` success 14:06:14Z; eval/lab/review/test runs from the 13:59-14:06 window otherwise still live.
- **Pending maintainer runs:** `44540182770` (workflow_run, pending since 14:06:27Z), `44542873622` (#862, pending 14:21:37Z). This run is `44537383279`.
- **Failures today:** #836 lab `44529581523` 13:03:45Z and #854 lab `44529574302` 13:39:48Z, both `FreeUsageLimitError`; quota intake notes on #70 at 13:04:10Z and 13:40:10Z. No new failure since 13:39:48Z.
- **Concurrency:** the post-push `workflow_run` maintainer fan-out is skipped/cancelled annotations, not failures. Comment-triggered maintainer sessions overlap heavily; the wake-gate ignores `/oc` bodies, so prose bot reports also summon Maintainer runs by design.
- **Pages:** production root `/` HTTP 200 with `470/470 node:test green`, `/film/` HTTP 200 with `the stage below needs it to paint the film` (verified 14:10Z).
- **Schedules:** maintainer cron tick `44537853339` ran 13:52:48Z. Curator cron `0 */6 * * *`; last scheduled `44477742504` at 07:11:50Z; next 18:00Z tick. Auditor cron `0 0 * * *`; last scheduled `44471789577` at 06:23:18Z; next ~00:00Z.
- **Model registry:** 92 models / 12 free at 14:23Z. `deepseek-v4.1-flash-free` (pin/small model) and `mimo-v2.6-flash-free` (rung 2) live; `glm-5.3-flash-free` absent. Live untested alternatives: `jev-1.13-free`, `tidepool-alpha-free`, `longcat-2.5-free`, `iceman-free`, `inkling-2-small-free`, `beam-free`, `flint-40b-free`, `nemotron-3.5-super-vl-free`, `nemotron-3.5-lightning-free`, `hy4-flash-free`.
- **Allowlist:** `maintainer.yml:42` lists 19 workflow names; the repo has 20 workflow files (those 19 plus self-excluded `maintainer`), so repo-defined coverage is exact. The API also reports platform-managed `Dependabot Updates`, `Dependency Graph`, and `pages-build-deployment`.
- **Workspace note:** the CLI bootstrap checked out the #859 head `9b862e48` (tree clean). No protected-path edits, no model edit, no branch commands, no `emergency.json`.

### Live lanes and their next step

- **#862 / #861 (Curator copy + Netpulse upload fix):** head `ac7cdf309`, base `f11f2caaf`, CLEAN. The Fixer applied F1-F4 (clean Node-absent skip, past-tense docstring, unused import removed, PR body rewritten for the behavior change) and pushed at 14:00:07Z. Review `44539100195` approved at 14:21:30Z; `/oc test` posted at 14:21:33Z; the Tester `44542873513` is live. On a pass: `eval` in a later run, then merge (non-protected) and #861 closes. The earlier Tester approval on `61a8b4ee` is stale; only `ac7cdf309` counts.
- **#850 / #848 (protected-path lab lane, eval live):** `9c9bf1bd7`, Tester approved 13:46:27Z with the marker at 13:46:37Z; eval `44538894115` is in progress since 13:59:04Z. On `approve-eval`: protected-path PAT merge; #848 closes on merge; #836 stays open.
- **#745 / #853 (orphaned audit/rebuild, rebased, review live):** head `ff5cebd95`, CLEAN. The lab succeeded at 14:06:14Z after the push rejection and retry; review `44540141336` is live on the branch. On a verdict: verify the review is head-fresh at `ff5cebd95`, keep #853 open, add the prepended "Update: ..." sentence to #853, and dispatch test/eval only after a clean review.
- **#849 (fail-loud hardening, lab live):** Lab Engineer `44534112058` since 13:30:25Z with the serialized scope (`Refs #798`, `Refs #804`; contents-API reads, private `GH_CONFIG_DIR`, `/bin/bash -p -s`, phase-lane hardening, whole-body marker screening, R30 coverage, LAB.md/AGENTS.md accuracy). Verify the acceptance criteria and the delegation ledger at its push.
- **#854 / #803 (protected-path slice 3 + hardening):** head `090452f27`, CLEAN. The bounded recovery re-armed the round-1 lab as `44542495457` at 14:19:32Z. This is the single post-wall attempt; a second wall death ends the lane until the window resets. Keep #803 open until all three slices land.
- **#836 (model/wall capacity):** ladder + prompt-hygiene instruction queued on the issue; both lab attempts died on the wall. Re-dispatch after a fresh registry read and a live third rung.
- **#821 / #823** (Point of Sale staging): parked by Priya. Do not dispatch.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after #745's verdict; #849 in flight; #857, #856, #860 after #849; #848 via #850; then #814, #812, #815, #774/#773, #831, #742.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Concurrency and wall coordination

- Several Maintainer sessions share this window (this is the #859 peer `44537383279`; `44537374249` verified the merge; `44539150471`-era sessions handled #862; a sibling re-armed #854). Verify, never repeat.
- The comment-trigger machinery creates a large skipped/cancelled `workflow_run` storm after each push and trigger; those are annotations, not failures. Do not chase them.
- The provider wall is live but sporadic (per-runner egress): #836 at 13:03Z and #854 at 13:39Z died, while review/test/eval/lab runs succeeded in between. Per #754/#820, no same-IP retry; the bounded fresh-run step owns the one recovery attempt (it re-armed #854 at 14:19Z).
- Do not cancel an in-progress review: a cancellation triggers the review workflow's `/oc review (auto-retry N)` and burns a retry. Duplicate pending test/review runs gate-skip or serialize; leave them alone.
- Next session: read the live runs' outcomes before any new dispatch; do not assume they succeeded.

## Serialized queue (re-post these only if they did not land or died)

1. #850 eval `44538894115` - live; do not duplicate. On `approve-eval`, the protected-path PAT merge closes #848.
2. #862 Tester `44542873513` - live; on a pass, `eval`, then merge; #861 closes.
3. #745 review `44540141336` - live; then test/eval per the verdict; keep #853 open.
4. #849 lab `44534112058` - live; do not re-post.
5. #854 recovery lab `44542495457` - live; no further retry if it dies on the wall.
6. `{"action":"lab","issue":836}` - wall-blocked; re-dispatch only after the wall clears with a fresh registry read.
7. After a clean #862 eval: merge (non-protected) and close #861.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two lab triggers to the same PR in one run.

## Loose ends

1. **#859 is done:** merge `f11f2caaf`, #858 closed, production verified twice. No further action.
2. **#862's fresh head:** `ac7cdf309`; the old approvals on `61a8b4ee` are stale. The review approved the new head; the Tester must too before eval.
3. **#850 eval:** live as `44538894115`; read the verdict before any merge. If it dies on the wall, the bounded recovery applies; do not re-post on the same egress.
4. **#745 review:** live; verify the verdict names `ff5cebd95` and covers the rebased protected-path diff.
5. **#854's second lab:** `44542495457`; this is the single post-wall attempt. A second wall death ends the lane until the window resets.
6. **#849 scope mismatch:** the trigger carries the expanded scope; the issue body still quotes the old premise. At its push, verify against the trigger and consider a body update.
7. **#855 is closed** as resolved; do not reopen it for the #856/#857/#860 code defects.
8. **Held runs:** zero. No approve sweep needed.
9. **The `INFRA-STATUS` block on #70** is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
10. **Curator tick:** the 12:00Z and 18:00Z ticks; the observed delay band is 1-3h. Do not dispatch a manual curator run unless it crashes or the gap passes ~16h.
11. **Auditor schedule:** the next daily tick is expected ~00:00Z. No dispatch.
12. **Quota wall:** two deaths today (#836 13:03:45Z, #854 13:39:48Z). One fresh-run attempt each is the cap (#820/#836).
13. **Heartbeat:** this is not a heartbeat run. Keep the exact `Last updated:` stamp.
14. **Board false alarm:** the 14:06:32Z R1-R36 FAILED note is a wrong-CWD invocation artifact (7/30); this run's ping corrects it and reproduces the signature (6/31 from `/tmp`). The correct-context matrix passes 37/37. If a later session sees the note before the ping lands, do not dispatch from it.
15. **Model registry drift:** 92/12; `glm-5.3-flash-free` retired and rung 3 is dead; `jev-1.13-free` and `tidepool-alpha-free` are live untested alternatives. #836 is the fix lane.
16. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live.
17. **Stale prompt examples:** `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion; folded into the #836 instruction.
18. **Maintainer cron throttling:** the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
19. **Wake-gate nuance:** the maintainer `if:` gate ignores `/oc` bodies, so prose bot reports summon Maintainer runs by design; do not treat the resulting per-PR runs as duplicates.
20. **The audit-posting footgun:** a wrong-CWD invocation of `silent-stall-audit.sh` with a health-issue argument posts a mass failure to #70. The #848/#850 lane should keep it in scope when its eval verdict lands.

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
- The owner PAT is healthy (verified by the 14:21:33Z publication). Never include a trigger token in a ping body (#775). The memory branch and the log may quote decisions, but public pings must not carry `eval-verdict:` markers or `/oc` tokens.
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
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526, the 2026-11-18 at 718, and the 2026-11-19 file now carries the 02:39, 04:29, 10:45, 12:54, 13:03, 13:18, 13:22, 13:31, 13:41, 13:57, and 14:23 entries. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
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

1. Read the #862 Tester `44542873513`; on a pass, dispatch `eval` for `ac7cdf309`; on `approve-eval`, merge and confirm #861 closes.
2. Read eval `44538894115` (#850); on `approve-eval`, run the protected-path PAT merge, verify Pages, and confirm #848 closes on merge.
3. Read the #745 review `44540141336`; verify a head-fresh verdict at `ff5cebd95`, then test/eval per the verdict and keep #853 open.
4. Read the #849 lab `44534112058` and the #854 recovery lab `44542495457`; verify acceptance criteria and delegation ledgers at their pushes.
5. Re-dispatch #836 only after the wall clears and with a fresh registry read; verify three live free rungs. Never retry a wall death on the same egress.
6. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not invent work and do not duplicate the live lanes.

## Open questions

1. Does the #862 Tester pass `ac7cdf309` cleanly so the lane can go to eval, or does the new test stack draw another finding?
2. Will eval `44538894115` approve #850 cleanly, or will a protected-path finding reopen the lab lane?
3. Does the #745 review approve `ff5cebd95`, and does the rebased protected-path diff preserve the intended #742 scope?
4. Do the #849 and #854 recovery labs finish before the wall returns, and does the wrong-CWD audit posting footgun surface in the #850 eval verdict?
5. When the wall resets, which free model becomes rung 3 for #836?
6. Will the throttled maintainer cron and the recover heartbeat keep the pipeline moving once this burst of sessions drains?
