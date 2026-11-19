# STATE

Last updated: 2026-11-19T13:41Z by run 44534751945

(Per-PR wake on #862 minutes after its head-fresh approval: the Tester lane is already live and queued, so this run adds no trigger. #859 is in the Evaluator, #850 is in the Tester, the three labs are still running, and #836 remains the only failure of the day on the provider wall.)

## TL;DR for the next Hephaestus

- **#862 (this run's target): head-fresh review APPROVED.** The auto-retry review `44533179130` completed at 13:34:04Z with **approve** (`test`) at the live head `0673248c4`; the full report is at 13:34:07Z and `/oc test` at 13:34:09Z. The Tester was already in progress from the earlier approval (`44532688079`, since 13:21:46Z), and the new trigger queued `44534751691` (13:34:11Z) and `44534757317` (13:34:13Z); `44533179104` is also pending from 13:24:44Z. On a Tester pass: `eval` in a later run, then the merge sweep; #861 closes only on merge. Do not re-post a test trigger.
- **#859:** Tester passed at `9b862e48`; `/oc eval` posted 13:33:33Z and eval `44534657717` is in progress since 13:33:40Z. On `approve-eval`: PAT merge sweep, then #858 closes. This is the closest PR to merge.
- **#850:** head `9c9bf1bd7`, round-5 review approved 13:18:13Z; Tester `44532152403` still in progress since 13:18:28Z. On its pass: `eval` in a later run, then the protected-path PAT merge; #848 closes at merge.
- **#854:** lab `44529574302` in progress since 13:02:50Z on head `090452f27`; branch unchanged, CLEAN. The sibling `44528414321` answered the owner summon at 13:26:35Z.
- **#745:** lab `44529576796` in progress since 13:02:51Z; head `7a04fa4a`, CONFLICTING/DIRTY.
- **#849 (fail-loud hardening):** Lab Engineer `44534112058` in progress since 13:30:28Z with the serialized scope (`Refs #798`, `Refs #804`). Do not duplicate.
- **#836:** still the only failure of the day. `FreeUsageLimitError` at 13:03:45Z, retry-after ~39655s (~11h, ~00:03Z). No same-IP retry; the bounded fresh-run step owns the one recovery attempt.
- **No merge this run:** #859 lacks `approve-eval`; #850/#862 lack a Tester pass; the labs are unfinished.
- **Model/ladder:** registry 92/12 at 13:35Z; `deepseek-v4.1-flash-free` (pin/small model) and `mimo-v2.6-flash-free` live; `glm-5.3-flash-free` absent, so the ladder stays 2/3. `jev-1.13-free` and `tidepool-alpha-free` are live untested alternatives. #836 is the fix lane.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 13:34-13:41Z on 2026-11-19)

### GitHub state

- **Main:** `e5cd250c126efa8c86a084b3d72ade3bcf9bdc5b` ("curate: sync Maze Chase release status and correct the Pac-Man retirement claim", Fixes #851; 2026-11-15T06:31:53Z). **`maintainer/logs`:** `776d92f09f86817b3d9dc77156210c69d5baac69`.
- **Open PRs (6):** #862 head `0673248c4867e9a0c4a0d2a715ad1066c4107d39`, body `Fixes #861`, CLEAN/MERGEABLE, exactly two 1+/1- copy lines; #859 head `9b862e484cb51ef8a785ffbfcf25da5740b41b49`, `Fixes #858`, CLEAN/MERGEABLE; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE; #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE; #821 head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale; #745 head `7a04fa4a96e1982ac307ca40973fed29379def0b`, CONFLICTING/DIRTY.
- **Open issues (28 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #858, #860, #861. No new issue since 07:34Z; no untriaged subject.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Latest note 13:33:07Z. #855 stays closed.
- **Latest comments:** #862 head-fresh approval 13:34:04Z, full report 13:34:07Z, `/oc test` 13:34:09Z; #859 `/oc eval` 13:33:33Z and the 13:33:20/32Z eval-lane summaries; #850 status 13:32:54/13:33:08Z; #854 sibling note 13:26:22/35Z; board notes 13:33:07Z.
- **Branch tips:** main `e5cd250c`, `maintainer/logs` `776d92f09`. PR branches unchanged. Newest closed PR is #852 (merged 11-15); no recovery due.

### Runs, CI and queues

- **This run:** `44534751945`, `issue_comment` on #862 created 13:34:07-11Z; the triggering comment is the owner-identity review report (prose, non-`/oc`), since the maintainer `if:` gate excludes `/oc` bodies. Job started 13:34:13Z. Not a heartbeat. Decision `[]`.
- **Live agent runs at 13:41Z:** Tester `44532688079` (#862, 13:21:46Z), Tester `44532152403` (#850, 13:18:28Z), eval `44534657717` (#859, 13:33:40Z), labs `44529574302` (#854), `44529576796` (#745), Lab Engineer `44534112058` (#849). Pending: `44534751691` and `44534757317` (#862 test duplicates), `44533179104` (#862 test), maintainer `44534757282` (13:34:13Z).
- **Completed:** review `44533179130` success 13:34:04Z (approve at the live head). No other verdicts since the 13:21-13:27Z batch.
- **Wall death:** lab `44529581523` (#836), failure 13:03:45Z, `FreeUsageLimitError`; the post-agent gates skipped cleanly. Only failure of the day; timed_out 0; held runs 0.
- **Concurrency:** our `maintainer-862` session is `44534751945`; the later `44534757282` is pending behind it in the same group. The 13:34Z workflow_run storm is skipped/cancelled annotations, not failures.
- **Pages:** production root and `/preview/pr-862/`, `/preview/pr-859/`, `/preview/pr-850/` all HTTP 200.
- **Schedules:** curator cron `0 */6 * * *`; last scheduled `44477742504` at 07:11:50Z (the 06:00 tick delayed ~71m), previous 11-18 15:17:06Z (a ~3h17m delay). The 12:00 tick had not appeared by 13:41Z, which is inside the observed delay band; do not dispatch before a ~16h gap. Auditor cron `0 0 * * *`; last scheduled `44471789577` at 06:23:18Z, next ~00:00Z.
- **Model registry:** 92 models / 12 free at 13:35Z. Registry ids are unprefixed; `deepseek-v4.1-flash-free` and `mimo-v2.6-flash-free` are live; `glm-5.3-flash-free` is absent (only paid `glm-5.3-flash`). Pin and `small_model` are `opencode/deepseek-v4.1-flash-free`; ladder 2/3.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; the 20 live `name:` fields are those 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Workspace note:** the CLI bootstrap checked out the PR head `0673248c4` for this comment wake (tree clean). No protected-path edits, no model edit, no branch commands, no `emergency.json`. The PR adds only the two copy lines on top of main, so the workflow/config reads are main-equivalent.

### Live lanes and their next step

- **#862 / #861 (Curator copy, Tester live/queued):** head `0673248c4`; head-fresh review approved 13:34:04Z; Tester `44532688079` in progress from the earlier approval plus the 13:34Z queued duplicates. On a pass: `eval` in a later run, then the merge sweep; #861 closes on merge. Not a new project, so the shipping limit does not apply.
- **#859 / #858 (Curator copy, eval live):** head `9b862e48`; Tester passed 13:27:06Z with the owner marker at 13:27:01Z; eval `44534657717` in progress. On `approve-eval`: PAT merge sweep and #858 closes.
- **#850 / #848 (protected-path lab lane, test live):** head `9c9bf1bd7`; round-5 review approved 13:18:13Z; Tester `44532152403` in progress. On approval: `eval` in a later run, then the protected-path PAT merge; verify the `Closes #848` trailer.
- **#854 / #803 (protected-path slice 3 + hardening, lab live):** lab `44529574302` on head `090452f27` with the full B1-B3/H1-H5 instruction. On a push: watch the forwarded review; verify each finding and the `Refs #853`/conditional `Closes #803` rewrite. Do not close #803 until all three slices land. `health-board.sh` is still absent on main.
- **#745 / #853 (orphaned audit/rebuild, lab live):** lab `44529576796` rebase retry with `Refs #853`, no `Closes`. On a push: verify with `git ls-remote`, dispatch exactly one fresh review, keep #853 open; delete the older bot review on the exact commit if it still exists.
- **#849 (fail-loud hardening, lab live early):** Lab Engineer `44534112058` since 13:30:28Z with the sibling's `/oc lab` instruction (contents-API reads with `--hostname github.com`, fresh private `GH_CONFIG_DIR`, `GH_HOST`, `/bin/bash -p -s`, phase-lane read hardening, whole-body marker screening, R30/HELPER_EXECUTE_FORMS mutation coverage, LAB.md/AGENTS.md accuracy; `Refs #798`, `Refs #804`). Verify the acceptance criteria and the delegation ledger at its push.
- **#836 (model/wall capacity):** ladder + prompt-hygiene instruction queued on the issue; the first lab run died on the wall. Re-dispatch on a later wake after a fresh registry read; verify the replacement rung is live and free and the ladder has three live rungs.
- **#821 / #823** (Point of Sale staging): parked by Priya. Do not dispatch.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after #745's verdict; #849 in flight; #857, #856, #860 after #849; #848 via #850; then #814, #812, #815, #774/#773, #831, #742.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Concurrency and wall coordination

- Several Maintainer sessions ran in the same 30-minute window. This run is the `maintainer-862` session answering the review report; the pending `44534757282` will survey after it and should see the live Tester lanes. Do not re-post any trigger.
- The comment-trigger machinery creates a large skipped/cancelled `workflow_run` storm after each push and trigger; those are annotations, not failures. Do not chase them.
- The provider wall is live: the #836 lab died at 13:03:20Z with an ~11h retry-after. Per #754/#820, no same-IP agent dispatch for a wall failure; the bounded fresh-run step owns the single recovery attempt. The other lanes have model access so far.
- Do not cancel an in-progress review: a cancellation triggers the review workflow's `/oc review (auto-retry N)` and burns a retry. Duplicate pending test runs gate-skip or serialize; leave them alone.
- Next session: read the live runs' outcomes before any new dispatch; do not assume they succeeded.

## Serialized queue (re-post these only if they did not land or died)

1. `{"action":"eval","pr":859}` - live as `44534657717`; do not re-post.
2. `{"action":"test","pr":850}` - live as `44532152403`; do not re-post.
3. `{"action":"test","pr":862}` - live as `44532688079` plus queued duplicates; do not re-post.
4. `{"action":"lab","pr":854}` - live as `44529574302`; do not re-post.
5. `{"action":"lab","pr":745}` - live as `44529576796`; do not re-post.
6. `{"action":"lab","issue":849}` - live as `44534112058`; do not re-post.
7. `{"action":"lab","issue":836}` - wall-blocked; re-dispatch only after the ~11h retry-after clears and with a fresh registry read.
8. After #859's eval approval: the PAT merge sweep, then #858 closes. After #850's Tester approval: `eval`, then the protected-path PAT merge. After #862's Tester approval: `eval`, then merge.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two lab triggers to the same PR in one run.

## Loose ends

1. **Read the live lanes first.** Testers `44532688079` (#862) and `44532152403` (#850), eval `44534657717` (#859), labs `44529574302` (#854), `44529576796` (#745), `44534112058` (#849); pending duplicates `44534751691`, `44534757317`, `44533179104`.
2. **Wall watch:** if the surviving lanes die on `FreeUsageLimitError`, stand down the window and re-arm on the next wake; do not chain dispatches.
3. **#855 is closed** as resolved; do not reopen it for the #856/#857/#860 code defects.
4. **Held runs:** zero. No approve sweep needed.
5. **#745 stale bot review:** after the rebase, delete the older bot review on the exact commit id if present; filter by `commit_id`, not just author.
6. **#850's body** has `Closes #848`; normalize at merge, do not add a second trailer.
7. **#853's body chronology** needs one prepended "Update: ..." sentence once #745 lands.
8. **#849 scope mismatch:** the sibling's trigger carries the expanded scope now; the issue body still quotes the old premise. When #849 pushes, verify against the trigger and consider a body update.
9. **The `INFRA-STATUS` block on #70** is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
10. **No merge this run:** no PR carries the full head-fresh Tester plus Evaluator chain.
11. **Curator tick:** the 12:00Z scheduled tick had not appeared by 13:41Z; the observed delay band is 1-3h. Do not dispatch a manual curator run unless it crashes or the gap passes ~16h.
12. **Auditor schedule:** the next daily tick is expected ~00:00Z. No dispatch.
13. **Quota wall:** the 13:03:45Z #836 death is the live instance; retry-after ~11h. One fresh-run attempt is the cap (#820/#836).
14. **Heartbeat:** this is not a heartbeat run. Keep the exact `Last updated:` stamp.
15. **Model registry drift:** 92/12; `glm-5.3-flash-free` retired and rung 3 is dead; `jev-1.13-free` and `tidepool-alpha-free` are live untested alternatives. #836 is the fix lane.
16. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live.
17. **Stale prompt examples:** `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion; folded into the #836 instruction.
18. **Maintainer cron throttling:** the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
19. **#862 duplicate approval/test stack:** the old-head approval's Tester `44532688079` and the head-fresh approval's queued tests all target the same unchanged branch; the earliest verdict on the tree is authoritative. Do not cancel any of them.
20. **Wake-gate nuance:** the maintainer `if:` gate ignores `/oc` bodies, so this run was summoned by the owner-identity prose review report at 13:34:07Z, not by the `/oc test` comment. The review workflow's owner-identity publications are therefore maintainer wakes by design; do not treat the resulting per-PR runs as duplicates.

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
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526, the 2026-11-18 at 718, and the 2026-11-19 file now carries the 02:39, 04:29, 10:45, 12:54, 13:03, 13:18, 13:22, 13:31, and 13:41 entries. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
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

1. Read Tester `44532688079` (#862) and the queued duplicates; on a pass, dispatch `eval` (one entry) in that later run, then the merge sweep.
2. Read eval `44534657717` (#859); on `approve-eval`, run the PAT merge sweep, verify Pages, and close #858.
3. Read `44532152403` (#850 test); on a pass, `eval` in a later run, then the protected-path PAT merge; #848 closes at merge.
4. Watch the three protected-path labs (#854, #745, #849) for pushes; verify each finding set before any review or merge. Keep #803 and #853 open until their slices land.
5. Re-dispatch #836 only after the wall clears (~00:03Z) and with a fresh registry read; do not retry on the same runner.
6. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not invent work and do not duplicate the live lanes.

## Open questions

1. Will the #862 Tester pass on its first complete run, or will the queued duplicates produce a conflicting verdict?
2. Will the Evaluator approve #859 cleanly, and does any eval finding reopen the copy PR?
3. Do the concurrently running protected-path labs (#854, #745, #849) collide on the shared audit scripts or on push ordering?
4. Will #850's Tester pass on the five-day-old protected-path branch?
5. When does the free-usage allowance reset for #836, and which free model becomes rung 3?
6. Will the throttled maintainer cron keep leaving multi-hour gaps that only the recover heartbeat covers (#836/#831)?
