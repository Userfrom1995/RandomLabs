# STATE

Last updated: 2026-11-19T13:30Z by run 44532142461

(This run answered the round-5 review approval on PR #850: the review approved at 13:18:13Z, the workflow posted the Tester trigger at 13:18:23Z, and the Tester is live. In the same window #859 was approved and then Tester-passed, #862 was approved and its Tester is live, both labs are still running, and the #836 ladder lab remains dead on the free-usage wall.)

## TL;DR for the next Hephaestus

- **The owner-PAT incident is over and the pipeline is moving.** The 13:02Z batch's six triggers landed as the owner; all their runs are producing verdicts. Zero held runs; zero timed-out/startup failures today; exactly one failure today, the #836 quota-wall death.
- **#850 (this run's target):** round-5 review **approved** at 13:18:13Z on head `9c9bf1bd7` (review run 44529568915; signed report 13:18:20Z). Tester run `44532152403` is live. Do not post another test trigger; wait for the test result, then route `eval` on a pass.
- **#859:** artifact fix pushed empty commit `9b862e48` (fix run 44530924884), review approved 13:14:43Z, Tester **passed** 13:27:06Z (run 44531572444; 41/41 live checks, 59/59 links 200, Umbra 470/470). The workflow posted the test marker and the maintainer summon at 13:27:01-02Z; maintainer run `44533563848` is live to dispatch the Evaluator.
- **#862:** artifact fix pushed empty commit `0673248c4` (fixer run 44531229345), review approved 13:21:31Z (from the older queued review 44529850597, which verified the live head tree), `/oc test` posted 13:21:42Z, Tester run `44532688079` is live. A redundant post-fix review (`44531723229`) was cancelled at ~13:24Z; the review workflow responded with `/oc review (auto-retry 1)` at 13:24:41Z, spawning review `44533179130` (live) and a 0-job test `44533179104`. Treat the live test as authoritative; expect one more approval/test trigger from the auto-retry.
- **#854 / #803 and #745 / #853:** both labs are still running on unchanged heads (`090452f27` and `7a04fa4a`). No push yet. Do not re-dispatch.
- **#836:** lab run 44529581523 died on the provider daily free-usage wall at 13:03:45Z with retry-after ~11h (reset roughly 00:03Z). No same-IP re-dispatch. Rung 3 is still the retired glm id; pin and rung 2 are live; ladder 2/3; no production impact.
- **No merge:** no PR has the full head-fresh Tester approval plus head-bound Evaluator approval yet.
- **No new triggers this run:** every actionable lane already has a live or queued run. This run only posts the status notes.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 13:18-13:30Z on 2026-11-19)

### GitHub state

- **Main:** `e5cd250c126efa8c86a084b3d72ade3bcf9bdc5b` ("curate: sync Maze Chase release status and correct the Pac-Man retirement claim", Fixes #851; 2026-11-15T06:31:53Z). **`maintainer/logs`:** `04bd61f76646314c928c5ca095cb2716465ffe2e` at the 13:26Z read, moving with the concurrent sessions. No main movement.
- **Open PRs (6):**
  - **#850** head `9c9bf1bd72fb459388d2985656f6f61735147105`, branch `opencode/lab-848-shared-health-board-selector`, body `Closes #848`, 15 protected-path files, CLEAN/MERGEABLE, 53 comments. Round-5 review approved 13:18:13Z; `/oc test` 13:18:23Z; Tester `44532152403` in progress. **This run's target.**
  - **#859** head `9b862e484cb51ef8a785ffbfcf25da5740b41b49`, body `Fixes #858`, two 1+/1- public-surface files plus the empty artifact commit, CLEAN/MERGEABLE, 16 comments. Review approved 13:14:43Z; Tester passed 13:27:06Z; `/oc approve-test` and `/oc maintainer` posted 13:27:01-02Z; maintainer `44533563848` live for the eval dispatch.
  - **#862** head `0673248c4867e9a0c4a0d2a715ad1066c4107d39`, body `Fixes #861`, two 1+/1- public-surface files plus the empty artifact commit, CLEAN/MERGEABLE, 9+ comments. Review approved 13:21:31Z; Tester `44532688079` in progress; auto-retry review `44533179130` in progress.
  - **#854** head `090452f27c575a31e617bc5c7083c6ee441b0653`, body `Closes #803`, 6 protected-path files, CLEAN/MERGEABLE, 7 comments. Round-1 lab run `44529574302` in progress since 13:02:50Z; no push.
  - **#745** head `7a04fa4a96e1982ac307ca40973fed29379def0b`, branch `opencode/lab-742-owner-pat-env-sanitization`, no closing trailer, CONFLICTING/DIRTY (5 ahead / 375 behind main), 68 comments. Rebase lab `44529576796` in progress since 13:02:51Z; no push.
  - **#821** head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale; do not dispatch.
- **Open issues (29 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #855 (closed), #856, #857, #858, #860, #861. **#855 is closed** (resolved 13:07:57Z). **#848 stays open** and closes on #850's merge. **#836 stays open and unlabelled** for the Owner capacity decision. No untriaged issue: #858 is covered by #859, #861 by #862, #860 is triaged, #855/#856/#857 carry triage; #659/#677/#678 are the known 10-18 Maze Chase standing set under #582.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`).
- **Latest comments:** the 13:27:02Z `/oc maintainer` on #859 is newest; before it the 13:27:01Z `/oc approve-test`, the 13:26:59Z test report and 13:26:52Z tester summary on #859, the 13:26:35Z #854 status note, the 13:24:41Z #862 review auto-retry, and the 13:18:13-23Z #850 approval, report, and test trigger. Two #70 ledger notes landed at 13:10:23Z and 13:12:46Z from sibling sessions.
- **Branch tips:** `git ls-remote` confirms main `e5cd250c`; the PR API resolves the heads above. No new project branch and no recovery due (newest closed PR is #852, merged 11-15).

### Runs, CI and queues

- **This run:** `44532142461`, `issue_comment` created 13:18:23Z by `Userfrom1995` (the `/oc test` comment the review workflow posted after approving #850), head `main` `e5cd250c`, in progress at snapshot close.
- **Review outcomes:** #850 review `44529568915` success 13:18:27Z, verdict **approve** (`test`), report 13:18:20Z. #859 review `44529567916` success 13:11:02Z fix, then fix `44530924884` success 13:12:39Z and a fresh review `44529567916`? No: the second #859 review is the same run's verdict at 13:14:43Z; the approval is on head `9b862e48`. #862 review `44529563614` success 13:12:53Z verdict fix; fixer `44531229345` success 13:15:39Z; approval from the older queued review `44529850597` at 13:21:31Z.
- **Tester lanes:** #850 `44532152403` in progress (since 13:18:28Z); #859 `44531572444` success 13:27:06Z (verdict pass); #862 `44532688079` in progress (since 13:21:48Z). A 0-job duplicate test `44533179104` (created 13:24:44Z) will gate-skip.
- **Lab lanes:** #854 `44529574302` in progress (since 13:02:50Z); #745 `44529576796` in progress (since 13:02:51Z). Both still in the agent step, no push.
- **Wall death:** #836 lab `44529581523` failure 13:03:45Z, `FreeUsageLimitError` with retry-after 39655s (~11h); quota intake note 13:04:10Z on #70. No decision file, post-agent gates skipped cleanly. This is the only failure today; zero timed-out and zero startup failures.
- **Held runs:** 0 (`status=action_required` total 0). The nine former held runs completed success 12:53:56-12:55:47Z.
- **Queued/pending duplicates:** maintainer `44532152362` (#850, pending behind this run), `44533179233` (#862), `44533573067` (#859), `44529574332` (#854); opencode-review `44533179130` (live) and gate-skip pending reviews; opencode-test `44533179104`; the inert historical queued entries on long-dead branches remain.
- **Cancellations this run:** `44531723229` (a redundant real post-fix review of #862's already-approved head) and three 0-job gate-skip runs (`44531751532`, `44532679260`, `44532688067`) were cancelled to stop a duplicate-test stampede. The review workflow answered `44531723229` with `/oc review (auto-retry 1)` at 13:24:41Z; `44533179130` is the resulting live review of the same head. Record this class: cancelling an in-progress review triggers its auto-retry, so prefer letting a duplicate review finish and instead avoid the duplicate *trigger* next time.
- **Pages:** root and `/preview/pr-850/`, `/preview/pr-859/`, `/preview/pr-862/` all HTTP 200; the 13:16Z Pages runs are green on `e5cd250c`.
- **Model registry:** **92 models, 12 free** at 13:24Z (`beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `hy4-flash-free`, `iceman-free`, `inkling-2-small-free`, `jev-1.13-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, `tidepool-alpha-free`). `glm-5.3-flash-free` is absent; the pin and `small_model` are `opencode/deepseek-v4.1-flash-free`, rung 2 is `mimo-v2.6-flash-free`, and the ladder file still lists glm as rung 3, so the ladder is 2/3.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; the 20 live `name:` fields are those 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Workspace note:** pre-agent checkout is the trusted default-branch commit (main `e5cd250c`), working tree clean at start. No protected-path edits, no model edit, no branch commands, no `emergency.json`. All work is routed through the decision file.

### Live lanes and their next step

- **#850 / #848 (protected-path lab lane, Tester live):** Tester `44532152403` on `9c9bf1bd7`. On a pass the test workflow posts the test marker and the maintainer summon; the maintainer must then dispatch `eval` (one entry, `pr: 850`). On a clean Evaluator verdict, run the PAT merge sweep; #848 closes only on merge; keep #836 open.
- **#859 / #858 (public-surface lane, Tester passed):** maintainer `44533563848` is live to dispatch the Evaluator. On a clean Evaluator verdict, the PAT merge sweep; #858 closes only on merge.
- **#862 / #861 (public-surface lane, fix landed, Tester live):** wait for the Tester; on a pass dispatch `eval` in the appropriate maintainer session. The auto-retry review may post one more approval/test; do not post another review or test trigger.
- **#854 / #803 (protected-path slice 3 + hardening, lab live):** on a push, verify B1-B3/H1-H5 and the `Refs #853`/conditional `Closes #803` rewrite; do not close #803 until all three slices land.
- **#745 / #853 (orphaned audit/rebuild, lab live):** on a push, verify with `git ls-remote`; dispatch exactly one fresh review; keep #853 open.
- **#836 (model/wall capacity):** re-dispatch the ladder/prompt-hygiene item only after the wall resets and with a fresh registry read; the bounded fresh-run step owns the one recovery attempt. No same-IP retry.
- **#849 / #857 / #856 / #860 (fail-loud/owner-PAT code work orders):** serialized behind #850's merge, one branch at a time; #849 first, then #857, #856, #860.
- **#821 / #823** (Point of Sale staging): parked by Priya. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).
- **Eval lane:** route `eval` only after a head-fresh Tester pass; no paid runs.

## Concurrency and wall coordination

- The pipeline is congested with sibling sessions: multiple maintainer runs are pending on #850, #862, #859, and #854, and the review/test fan-outs create gate-skip runs on every owner comment. Dedupe against the live comment stream before posting; this run did.
- The provider wall is live: the #836 lab died at 13:03:45Z with an ~11h retry-after. Per #754/#820, no same-IP agent dispatch for a wall failure; the bounded fresh-run step owns the single recovery attempt.
- The review workflow auto-retries a failed/cancelled review by posting `/oc review (auto-retry N)`. Do not cancel an in-progress review unless you accept that retry; use the live verdict as authoritative.
- Next session: read the three Tester outcomes and the two lab pushes before any dispatch; do not assume they succeeded.

## Standing rules I operate under

### Safety and autonomy

- Never post `/oc` comments by hand, never create/edit labels, issues, PRs, or branches, never commit, push, or force-push feature code. Only the hardcoded workflow steps act, under the owner PAT and the budget gates. Merging an approved PR is my job, but only after the full gate chain below.
- Never edit code on `main`. Only protected-path edits would be rebuilt under the emergency revival contract; none is warranted. The only branch/PR action I may take is the governed `recover` route, and only when a recoverable PR is closed or orphaned.
- No `ftr`/sweep PRs, no unconditional re-scans: an empty queue and "standby" are the correct answer when nothing new is due.
- All work goes through the decision file; one entry max per action per target per run; distinct actions may target the same PR in one run.

### Trigger and token discipline

- The workflow posts triggers from the decision file as the owner only in the "Run /oc triggers as owner" hardcoded step. My decision entries are inert data; I never author a trigger comment during the session.
- Pings and the public comment are posted by the bot token. All public text must be honest, specific, signed with `- Hephaestus, the Maintainer`, and carry no trigger token or eval marker.
- The owner PAT is healthy again (verified through the 13:02Z batch and the 13:14-13:27Z verdicts). A green Maintainer run is not evidence that its trigger step landed; read the step log when in doubt.

### Review, test, and merge gates

- The reviewer verdict is advisory and does not itself authorize a merge. Merge only when the Tester's owner-authored test marker is head-fresh, no newer fix findings exist, and the Evaluator's head-bound approval is on the PR.
- Required gate sequence after a successful review on a non-protected PR: `test` (OS chosen by the touched paths) THEN `eval` in a later run THEN a PAT sweep, then the bot verification. Never post a `test` trigger before the review verdict is on the PR, and never post a test/eval pair on the same PR in one run.
- Protected paths (`.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, `LAB.md`) require the Lab Engineer route; the Maintainer's PAT step may push only under a valid emergency declaration. Protected-path PRs merge only through the workflow's PAT merge step.
- A green audit is not a merge approval. Deploy keys, workflow names, and mutable actions are pinned and trusted at the default branch; the Tester/PAT gates enforce.

### Audit lane rules (current, from #798 and its reviews)

- `silent-stall-audit.sh` is the mutation harness; R19/R20/R21/R23/R28/R30/R32/R36 are part of the shell parser/classifier guard story. A full run is ~10 minutes; do not accept a partial "fast" run when a real change needs the full harness.
- Every incident-scope counter must capture the payload first, never `|| true` after the pipeline, and must treat an unreadable head/enumeration as fail-closed (#854 review B2/B3; #856/#860 are the same rule).
- The delegation ledger is capped at 3-8 lines; it must list the subagents actually used, one line each, plus a skills line. Do not claim delegation that did not happen.
- The reviewer rejects fixes that claim fail-closed while keeping a silent fallback; the docs must state the exact boundary.
- No em dashes in repo files; no direct workflow edits outside a `lab` route.

### Contract and memory

- Output contract each run: `.maintainer/decision.json` (array), `.maintainer/comment.md` (empty unless a target exists), `.maintainer/log-entry.md` (FULL day file: existing bytes + today's entry), `.maintainer/state.md` (this file), `.maintainer/personality.md` only if identity evolved, `.maintainer/emergency.json` only under the failed-lab + halted-production contract.
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526, the 2026-11-18 at 718, and the 2026-11-19 file is well past 665 lines. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
- The log entry must include the state snapshot, decisions + rationale, callbacks, the run link, and open questions. The state must stay honest about what is verified vs expected.
- The memory branch is shared tooling; do not delete or rewrite prior entries.

### Persistent facts

- Main is a single fast-forwardable history; the repo pushes are the owner PAT's job; the orphan guard must never rewrite main.
- The board is #70; its exact title is the resolver anchor; the `lab-health` label is exclusive among open issues. #855 was the incident tracker and is closed.
- The recover arm is the heartbeat source; the maintainer cron is throttled. A stale STATE stamp is the wake signal; a skipped fan-out is not a real session; every real session must carry the exact liveness stamp.
- The free-usage wall is a real class (the 13:03:45Z #836 death with an ~11h retry-after is the latest; earlier 47m35s queue death on 11-15 and 08:55:40Z death on 11-17). One fresh-run attempt is the only re-dispatch; a same-IP retry must not be dispatched.
- The owner PAT is shared by the maintainer, review, curator, recover, auditor, and lab forward/push steps. The 2026-11-15 to 2026-11-19 outage was one invalid secret, now restored.
- The model ladder must have three live `-free` rungs; a retired rung is a routine `lab` item, not an emergency.

## Next run

1. Read the three Tester outcomes first: #850 `44532152403`, #859 `44531572444` (passed), #862 `44532688079`; and the two labs #854 `44529574302` and #745 `44529576796`.
2. #850: on the Tester pass, confirm the test marker is live and dispatch `eval` for #850; on a clean Evaluator verdict, run the PAT merge sweep. #848 closes only on merge; #836 stays open.
3. #859: maintainer `44533563848` should dispatch `eval`; if it dies, re-dispatch one eval; on a clean Evaluator verdict, the PAT merge sweep. #858 closes only on merge.
4. #862: on the Tester pass, dispatch `eval`; the auto-retry review may post another approval/test, which the live test supersedes.
5. On #854's lab push: verify B1-B3/H1-H5 and the `Refs #853`/`Closes #803` rewrite; keep #803 open until all three slices land. On #745's push: verify with `git ls-remote`, dispatch one fresh review, keep #853 open.
6. Re-dispatch the #836 ladder/prompt item only after the wall resets (roughly 00:03Z) and with a fresh registry read; verify three live free rungs.
7. Start #849, then #857, #856, #860 only after #850 merges, one branch at a time.
8. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not invent work and do not duplicate the #855/#857 pings.

## Open questions

1. Will #850, #862, and #859 pass their Tester and Evaluator gates without another fix round?
2. Will the two labs (#854 and #745) fit one round, and will #854's push keep the `Closes #803` trailer only if all three slices land?
3. Will the auto-retry review of #862 post a duplicate test trigger, and will the queued duplicates remain harmless?
4. Does the free-usage wall reset on schedule (~00:03Z), and will the #836 ladder item land before the next retirement?
5. Which free model becomes rung 3: `nemotron-3.5-lightning-free`, `beam-free`, `jev-1.13-free`, `longcat-2.5-free`, or `tidepool-alpha-free`?
6. Will the throttled maintainer cron and the recover heartbeat keep the pipeline moving once the current burst of sessions drains?
7. Will the Owner stay engaged through the merge sweep, and is the #836 capacity decision still pending?
