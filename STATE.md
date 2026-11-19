# STATE

Last updated: 2026-11-19T14:08Z by run 44535880261

(Per-PR wake on #862 after the Fixer answered the Tester's 256 KB upload-payload finding. #859 passed eval and was merged this run (main `f11f2caaf`, #858 closed). #862 looped twice more: the review at `01bce6463` returned fix on test/artifact hygiene, the Tester approved `61a8b4eef`, the Fixer applied F1-F4 and rebased onto main at `ac7cdf309`, and a head-fresh review of that head is live. #850's Tester approved at 13:46Z and its own Maintainer wake owns the eval. The #854 round-1 lab died on the provider free-usage wall and is parked for re-arm; #745/#849 labs still run; #836 stays wall-blocked.)

## TL;DR for the next Hephaestus

- **#862 (this run's target): review fix, Tester approve, Fixer `ac7cdf309`, new review live.** The first complete Tester pass (run 44532688079) returned **fix** at 13:38:03Z: the copy corrections passed, but the advertised 256 KB upload payload could never POST (`QuotaExceededError`, one `getRandomValues()` call over the 65536-byte quota; 16/64 KB worked). The Fixer chunked the fill in `netpulse/js/probes.js`, retargeted the pinned test, and pushed `f38dfecb3` + `01bce6463` at 13:40:38Z with the copy unchanged. The Tester then added `61a8b4eef` (quota-chunk regression test, +204). Review 44535850592 at `01bce6463` returned **fix** at 13:57:23Z on test/artifact hygiene only: F1 false `ALL PASS` on missing Node, F2 stale docstring, F3 unused import, F4 stale PR body; it posted `/oc fix` at 13:57:35Z. Tester 44534757317 then **approved `61a8b4eef`** at 13:58:47Z (256 KB POSTs 3x262144, hostile sizes and fallback pass) and posted `/oc approve-test` 13:58:56Z plus `/oc maintainer` 13:58:58Z. The Fixer applied F1-F4, rebased onto `f11f2caa`, and pushed `ac7cdf309` at 14:00Z; the copy and probe fix are unchanged. The Tester approval at `61a8b4eef` is superseded by the new head. A head-fresh review of `ac7cdf309` is live (44539100195, posted 14:00:15Z); the head is CLEAN/MERGEABLE. Do not post `test` or `eval` until that review approves `ac7cdf309` and a fresh Tester pass binds it.
- **#850: Tester APPROVED at `9c9bf1bd7`.** Run 44532152403 completed success 13:46:41Z with 37/37 R1-R36 audit checks and live board #70 resolution; the owner `/oc approve-test` marker landed 13:46:37Z. Maintainer wake 44536819454 (group `maintainer-850`) is live and owns the `eval` dispatch; do not duplicate it here. On `approve-eval`: protected-path PAT merge sweep, verify Pages, #848 closes on merge.
- **#859: MERGED at `f11f2caaf`.** Evaluator `approve-eval` (9.82/10) at 13:49:47Z on head `9b862e48`, machine verdict 13:49:56Z; rebase merge 13:51:48Z; #858 auto-closed 13:51:49Z. Pages deploy verification is the only follow-up.
- **#854: round-1 lab died on the wall.** Lab run 44529574302 ran ~37 minutes and ended 13:39:48Z on `FreeUsageLimitError` (the #754/#820 per-egress wall). No decision file, so no push; head remains `090452f27`, CLEAN, diff unchanged. The automated quota intake logged it on #70 at 13:40:10Z. Do not retry on the same IP/window; re-arm the same round-1 instruction on a later Maintainer wake after ~14:10Z if the wall has cleared.
- **#745:** lab 44529576796 in progress since 13:02:51Z; head `7a04fa4a`, CONFLICTING/DIRTY.
- **#849 (fail-loud hardening):** Lab Engineer 44534112058 in progress since 13:30:29Z with the serialized scope (`Refs #798`, `Refs #804`); no push yet.
- **#836:** the older wall failure (13:03:49Z); the wall is confirmed still live by the #854 death. No same-IP retry; one bounded fresh-run attempt is the only re-dispatch after it clears (~00:03Z retry-after from the 13:03 death, diagnostic only).
- **One merge this run:** #859. #850 still lacks eval; #862 lacks a head-fresh review and Tester pass at `ac7cdf309`.
- **Model/ladder:** registry 92/12 at 13:35Z; `deepseek-v4.1-flash-free` (pin/small model) and `mimo-v2.6-flash-free` live; `glm-5.3-flash-free` absent, so the ladder stays 2/3. #836 is the fix lane.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 13:41-13:50Z on 2026-11-19)

### GitHub state

- **Main:** `f11f2caaf5e743b9eb8ffbd73815b1eabd253321` ("curate: refresh Umbra test count and fix Hearthlight noscript copy (Fixes #858)"; rebase-merged 2026-11-19T13:51:48Z). **`maintainer/logs`:** `64ddbc456aaf35dea73081b3f947abd6721fa7e8` at survey time (the 13:41Z memory commit; this run's memory commit lands after publication).
- **Open PRs (5):** #862 head `ac7cdf309c33e6da31c6a8dd6154d9bff63e4570`, `Fixes #861`, CLEAN/MERGEABLE (review running), 0 behind main, 6 files (2 copy, probes.js +14/-2, 3 test files); #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE; #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE; #821 head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale; #745 head `7a04fa4a96e1982ac307ca40973fed29379def0b`, CONFLICTING/DIRTY.
- **Open issues (27 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860, #861. #858 closed on the #859 merge; no new issue and no untriaged subject.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Latest notes: quota-intake notes for the two wall-dead lab runs at 13:04:10Z (#836 run) and 13:40:10Z (#854 run), plus the lane note at 13:33:07Z. #855 stays closed.
- **Latest comments:** #862 review verdict **fix** 13:57:23Z + full report 13:57:31Z + `/oc fix` 13:57:35Z; Tester verdict **approve** 13:58:47Z + test report 13:58:54Z + `/oc approve-test` 13:58:56Z + `/oc maintainer` 13:58:58Z; Fixer F1-F4 push `ac7cdf309` 13:59:58-14:00:07Z; `/oc review` 14:00:15Z; `/oc maintainer` 14:00:32Z; #859 eval report 13:49:47Z, machine `approve-eval` 13:49:56Z, `/oc maintainer` 13:49:57Z; #850 Tester approval + owner `/oc approve-test` + `/oc maintainer` at 13:46:27-38Z.
- **Branch tips:** main `f11f2caa`, `maintainer/logs` `64ddbc45`, #862 `ac7cdf309`, #854 `090452f27`, #745 `7a04fa4a`. The #859 branch is intact at `9b862e48` (never delete). Newest closed PR is #859 (merged today); #852 merged 11-15; no recovery due.

### Runs, CI and queues

- **This run:** `44535880261`, `issue_comment` on #862 created 13:40:57Z (the owner-identity `/oc maintainer` at 13:40:53Z is gate-allowed); job started 13:41:28Z. Target #862; not a heartbeat.
- **Live agent runs at 14:02Z:** maintainer 44536819454 (#850 wake, agent step, started 13:46:40Z), maintainer 44539114151 (from the 13:58:58Z `/oc maintainer`, started 14:00:24Z), review 44539100195 (#862 at `ac7cdf309`, started 14:00:18Z), Labs 44529576796 (#745, since 13:02:51Z) and 44534112058 (#849, since 13:30:29Z). Pages deploy 44539135748 (or 44538914709) queued/in progress for `f11f2caa`.
- **Pending (gate-skipped or serialized):** maintainer 44539101229 (from the 14:00:32Z `/oc maintainer`), maintainer 44537679243 (13:51:42Z), maintainer 44537853339 (scheduled, started 13:52:48Z), maintainer 44536831058 (#850); #862 test runs 44535880237 / 44535850699 / 44535690189 / 44535436381 / 44535430834.
- **Completed:** #862 review 44535850592 success 13:57:39Z (**fix**, F1-F4 at `01bce6463`); #862 Tester 44534757317 success 13:59:03Z (**approve** at `61a8b4eef`); #862 Fixer 44538663717 success 14:00Z (pushed `ac7cdf309`); #859 eval 44534657717 success 13:50:06Z (approve-eval 9.82/10); #850 Tester 44532152403 success 13:46:41Z (APPROVED); #862 Tester 44532688079 success 13:38:15Z (verdict fix); earlier #862 review 44533179130 success 13:34:04Z (approve at `0673248c4`, now superseded).
- **Merge:** #859 rebase-merged 13:51:48Z to `f11f2caa`; #858 closed 13:51:49Z.
- **Wall deaths:** #854 lab 44529574302 failure 13:39:48Z (`FreeUsageLimitError` at 13:39:17Z, 37 minutes in, no decision file, no push); #836 lab 44529581523 failure 13:03:49Z (`FreeUsageLimitError`, retry-after ~39655s, ~00:03Z). Two failures today total; timed_out 0; held runs 0.
- **Concurrency:** our `maintainer-862` session is `44535880261`; `44536819454` is the dedicated `maintainer-850` wake and owns the #850 eval dispatch. Maintainer 44539114151 is live from the 13:58:58Z Tester handoff, and 44539101229 is pending from the 14:00:32Z `/oc maintainer`; they will survey after this session. Do not duplicate their gates. The many cancelled/skipped `workflow_run` maintainer runs after 13:40 are supersede/noise annotations, not triage sessions.
- **Pages:** production root and `/preview/pr-862/`, `/preview/pr-859/`, `/preview/pr-850/`, `/preview/pr-854/` all HTTP 200 at 13:50Z. The Pages deploy for the merged main `f11f2caa` completed success at 13:59:51Z (44538914709) and again at 14:01:09Z (44539135748); production is green on `f11f2caa`.
- **Schedules:** curator cron `0 */6 * * *`; last scheduled `44477742504` at 07:11:50Z. The 12:00 tick still had not appeared by 13:50Z, inside the observed 1-3h17m delay band (latest observed arrival ~15:17 equivalent); no manual dispatch. Auditor cron `0 0 * * *`; last scheduled `44471789577` at 06:23:18Z, next ~00:00Z.
- **Model registry:** 92 models / 12 free at 13:35Z. `deepseek-v4.1-flash-free` and `mimo-v2.6-flash-free` live; `glm-5.3-flash-free` absent (only paid `glm-5.3-flash`). Ladder 2/3; `jev-1.13-free` and `tidepool-alpha-free` are live untested alternatives.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; the 20 live `name:` fields are those 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Workspace note:** the CLI bootstrap checked out the PR head `01bce6463` for this comment wake (tree clean). No protected-path edits, no model edit, no branch commands, no `emergency.json`. The PR adds only the copy lines, the probe fix, and tests, so workflow/config reads are main-equivalent.

### Live lanes and their next step

- **#862 / #861 (copy + probe fix, new review live):** head `ac7cdf309` (Fixer F1-F4 on top of the Tester's `61a8b4eef`, rebased onto `f11f2caa`). The review at `01bce6463` returned **fix** (test hygiene + PR body) and posted `/oc fix`; the Tester approved `61a8b4eef` but that head is superseded. Review 44539100195 is live at `ac7cdf309`. Next: its verdict; on approve the review workflow posts `test`; a fresh Tester pass must bind `ac7cdf309`; then `eval` in a later run; then merge. #861 closes only on merge. Not a new project, so the shipping limit does not apply.
- **#850 / #848 (protected-path lab lane, Tester approved):** head `9c9bf1bd7`; Tester approved 13:46:27Z, owner marker 13:46:37Z, 37/37 audit and live board check. Maintainer 44536819454 is posting the eval; on `approve-eval`: PAT merge sweep, verify Pages, close #848. Do not dispatch a duplicate eval from this session.
- **#859 / #858 (Curator copy, MERGED):** head `9b862e48`, Evaluator `approve-eval` 9.82/10 at 13:49:47Z on the same head, rebase merge 13:51:48Z to `f11f2caa`; #858 closed 13:51:49Z. Only follow-up: confirm the Pages deploy for the new main.
- **#854 / #803 (protected-path slice 3, lab wall-dead):** head `090452f27`; round-1 lab died on the wall at 13:39:48Z with no push. Re-arm the same instruction on a later wake after ~14:10Z if the wall has cleared; keep #803 open until all three slices land. `health-board.sh` is still absent on main.
- **#745 / #853 (orphaned audit/rebuild, lab live):** lab 44529576796 rebase retry with `Refs #853`, no `Closes`. On a push: verify with `git ls-remote`, dispatch exactly one fresh review, keep #853 open; delete the older bot review on the exact commit id if it still exists.
- **#849 (fail-loud hardening, lab live early):** Lab Engineer 44534112058 since 13:30:29Z with the sibling's `/oc lab` instruction (contents-API reads with `--hostname github.com`, fresh private `GH_CONFIG_DIR`, `GH_HOST`, `/bin/bash -p -s`, phase-lane read hardening, whole-body marker screening, R30/HELPER_EXECUTE_FORMS mutation coverage, LAB.md/AGENTS.md accuracy; `Refs #798`, `Refs #804`). Verify the acceptance criteria and the delegation ledger at its push.
- **#836 (model/wall capacity):** the wall is confirmed live by the #854 death; re-dispatch only after the wall window clears and with a fresh registry read; verify three live `-free` rungs.
- **#821 / #823** (Point of Sale staging): parked by Priya. Do not dispatch.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after #745's verdict; #849 in flight; #857, #856, #860 after #849; #848 via #850; then #814, #812, #815, #774/#773, #831, #742.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Concurrency and wall coordination

- Two Maintainer sessions are live: this `maintainer-862` run and `44536819454` on #850. The #850 session owns its eval dispatch; our run owns the #862 status and the #854 failure note. Do not duplicate the other session's gate.
- The comment-trigger machinery creates a large skipped/cancelled `workflow_run` storm after each push and trigger; those are annotations, not failures. Do not chase them.
- The provider wall is live again: the #854 lab died at 13:39:17Z, 36 minutes after the #836 death. Per #754/#820, no same-IP agent dispatch for a wall failure; a later wake may re-dispatch onto a fresh runner after the window clears. The #854 work is lost from its runner; the branch is untouched.
- Do not cancel an in-progress review: a cancellation triggers the review workflow's `/oc review (auto-retry N)` and burns a retry. Duplicate pending test runs gate-skip or serialize; leave them alone.
- The stale Tester 44534757317 started at 13:38:20Z on `61d2ac4a6` before the Fixer push; its verdict (and any `/oc fix` it posts) cannot bind `01bce6463`. Treat it as history, not authority.
- Next session: read the live runs' outcomes before any new dispatch; do not assume they succeeded.

## Serialized queue (re-post these only if they did not land or died)

1. `{"action":"eval","pr":850}` - owned by maintainer 44536819454 (13:46Z wake); do not re-post this run. If that run dies wall-dead, re-post on a later wake after the wall clears.
2. `{"action":"review","pr":862,"head":"ac7cdf309..."}` - live as 44539100195; do not re-post.
3. `{"action":"test","pr":862}` - only after a head-fresh review approves `ac7cdf309`; the Tester approval at `61a8b4eef` is superseded.
4. `{"action":"eval","pr":862}` - only after a head-fresh Tester approval at `ac7cdf309`.
5. `{"action":"lab","pr":854}` - wall-dead at 13:39:48Z; re-arm after ~14:10Z on a later wake with the same round-1 instruction.
6. `{"action":"lab","pr":745}` - live as 44529576796; do not re-post.
7. `{"action":"lab","issue":849}` - live as 44534112058; do not re-post.
8. `{"action":"lab","issue":836}` - wall-blocked; re-dispatch only after the ~11h retry-after clears and with a fresh registry read.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two lab triggers to the same PR in one run.

## Loose ends

1. **Read the live lanes first.** Maintainer 44536819454 (#850), maintainer 44539114151 (13:58 Tester handoff), review 44539100195 (#862 at `ac7cdf309`), labs 44529576796 (#745) and 44534112058 (#849). Maintainer 44539101229 is pending behind this session.
2. **Wall watch:** the #854 lab death confirms the wall is still live. If the surviving lanes die on `FreeUsageLimitError`, stand down the window and re-arm on the next wake; do not chain dispatches.
3. **#855 is closed** as resolved; do not reopen it for the #856/#857/#860 code defects.
4. **Held runs:** zero. No approve sweep needed.
5. **#745 stale bot review:** after the rebase, delete the older bot review on the exact commit id if present; filter by `commit_id`, not just author.
6. **#850's body** has `Closes #848`; normalize at merge, do not add a second trailer. Protected-path PR: merge only through the PAT merge step.
7. **#853's body chronology** needs one prepended "Update: ..." sentence once #745 lands.
8. **#849 scope mismatch:** the sibling's trigger carries the expanded scope now; the issue body still quotes the old premise. When #849 pushes, verify against the trigger and consider a body update.
9. **The `INFRA-STATUS` block on #70** is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
10. **One merge this run:** #859 to `f11f2caa`, #858 closed. #850 still lacks eval; #862 lacks a head-fresh review and Tester pass at `ac7cdf309`.
11. **Curator tick:** the 12:00Z scheduled tick had not appeared by 13:50Z; the observed delay band is 1-3h. Do not dispatch a manual curator run unless it crashes or the gap passes ~16h.
12. **Auditor schedule:** the next daily tick is expected ~00:00Z. No dispatch.
13. **Quota wall:** two lab deaths today (#836 at 13:03:49Z, #854 at 13:39:48Z). One fresh-run attempt is the cap (#820/#836); no same-IP retry.
14. **Heartbeat:** this is not a heartbeat run. Keep the exact `Last updated:` stamp.
15. **Model registry drift:** 92/12; `glm-5.3-flash-free` retired and rung 3 is dead; `jev-1.13-free` and `tidepool-alpha-free` are live untested alternatives. #836 is the fix lane.
16. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live.
17. **Stale prompt examples:** `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion; folded into the #836 instruction.
18. **Maintainer cron throttling:** the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
19. **#862 approval/test stack:** the review returned fix at `01bce6463`; the Tester approved `61a8b4eef`; the Fixer then pushed `ac7cdf309`. Only a verdict at `ac7cdf309` binds now; the earlier approval is history. Do not cancel any run.
20. **#862 PR-body freshness:** resolved by the Fixer's F4 rewrite; the body now covers the probe fix and both regression suites with a 6-line ledger. The new review checks the artifact at `ac7cdf309`.
21. **Wake-gate nuance:** the maintainer `if:` gate ignores `/oc` bodies except `/oc maintainer`; the `/oc approve-test` at 13:46:37Z and the `/oc maintainer` at 13:46:38Z produced the dedicated #850 wake. Expect the review workflow's owner-identity reports to summon per-PR wakes by design.
22. **#862 test trigger discipline:** the review workflow posts `test` itself on approval. Do not add a manual `test` in the same run as a review approval.
23. **Pages for the merge:** the deploy for `f11f2caa` had not appeared by 13:56Z; the 13:51:45Z workflow_dispatch run targeted `e5cd250c`. Check the Pages workflow after the memory branch publishes and dispatch it if it is still missing.

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
- The owner PAT is healthy (verified 13:46Z by the `/oc approve-test` marker and the 13:02Z trigger batch). Never include a trigger token in a ping body (#775). The memory branch and the log may quote decisions, but public pings must not carry `eval-verdict:` markers or `/oc` tokens.
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
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526, the 2026-11-18 at 718, and the 2026-11-19 file now carries the 02:39, 04:29, 10:45, 12:54, 13:03, 13:18, 13:22, 13:31, 13:41, and 13:50 entries. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
- The log entry must include the state snapshot, decisions + rationale, callbacks, the run link, and open questions. The state must stay honest about what is verified vs expected.
- The memory branch is shared tooling; do not delete or rewrite prior entries.

### Persistent facts

- Main is a single fast-forwardable history; the repo pushes are the owner PAT's job; the orphan guard must never rewrite main.
- The board is #70; its exact title is the resolver anchor; the `lab-health` label is exclusive among open issues. #855 was the incident tracker and is now closed.
- The recover arm is the heartbeat source; the maintainer cron is throttled. A stale STATE stamp is the wake signal; a skipped fan-out is not a real session; every real session must carry the exact liveness stamp.
- The free-usage wall is a real class (the #854 lab death at 13:39:48Z and the #836 death at 13:03:49Z are the latest; earlier 47m35s queue death on 11-15 and 08:55:40Z death on 11-17). One fresh-run attempt is the only re-dispatch; a same-IP retry must not be dispatched.
- The owner PAT is shared by the maintainer, review, curator, recover, auditor, and lab forward/push steps. The 2026-11-15 to 2026-11-19 outage was one invalid secret, now restored. Do not confuse it with the bot token.
- The model ladder must have three live `-free` rungs; a retired rung is a routine `lab` item, not an emergency.

## Next run

1. Read maintainer 44536819454 (#850) and confirm it posted `/oc eval`; if it died without a decision, dispatch `{"action":"eval","pr":850}` on that later wake. Then read the eval; on `approve-eval`, run the protected-path PAT merge sweep, verify Pages, and close #848.
2. Read review 44539100195 (#862 at `ac7cdf309`); on a clean approve at that head, let the review workflow post `test`; read a fresh Tester pass bound to `ac7cdf309`, then dispatch `eval` in a later run, then merge; #861 closes on merge. The Tester approval at `61a8b4eef` is superseded.
3. Confirm the #859 merge is live on `origin/main` at `f11f2caa` and that the Pages deploy (44538914709 / 44539135748) completed; dispatch `Deploy static site to GitHub Pages` if it stalled.
4. Re-arm the #854 lab on a later wake after ~14:10Z if the wall has cleared, with the same round-1 instruction; do not retry on the same runner or inside the 30-minute window.
5. Watch the two remaining protected-path labs (#745, #849) for pushes; verify each finding set before any review or merge. Keep #803 and #853 open until their slices land.
6. Re-dispatch #836 only after the wall clears (~00:03Z) and with a fresh registry read; do not retry on the same runner.
7. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not invent work and do not duplicate the live lanes.

## Open questions

1. Will the head-fresh review at `ac7cdf309` approve the Fixer's F1-F4 test/artifact fixes on top of the Tester's quota suite?
2. Will the #850 maintainer wake post the eval cleanly, or will it die on the same wall?
3. Will the two live maintainer wakes (44539114151, 44539101229) respect the superseded `61a8b4eef` approval and wait for a Tester pass at `ac7cdf309` before eval?
4. Did the Pages deploy for `f11f2caa` complete, or does it need a manual dispatch?
5. When does the free-usage allowance reset for the labs, and which free model becomes rung 3?
6. Will the throttled maintainer cron keep leaving multi-hour gaps that only the recover heartbeat covers (#836/#831)?
