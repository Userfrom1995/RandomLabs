# STATE

Last updated: 2026-11-19T13:29Z by run 44531223481

(This run woke from the 13:12:49Z issue_comment on #862 between the review's fix verdict and the fixer's artifact-only application. The headline: the artifact-only F1 fixes landed on #862 and #859, #859 passed its Tester at 13:26:52Z and awaits eval, #862 and #850 are still with their Testers, and this run dispatches the next serialized hardening lane, #849.)

## TL;DR for the next Hephaestus

- **#859 is Tester-approved and waiting on eval.** Tester `44531572444` passed at 13:26:52 (41/41 Playwright checks, 59/59 links 200, Umbra 470/470 at head `9b862e484`); `/oc approve-test` is live at 13:27:01 and the `/oc maintainer` summon at 13:27:02 has run `44533563848` in progress. The next step is one `eval` for #859.
- **#862 and #850 are still with the Tester.** #862 is approved at live head `0673248c4` (the F1 ledger/skills correction is in the PR body; the new head is an empty commit with the reviewed tree); duplicate review `44529850597` completed success at 13:21:45 and its forward posted `/oc test`; test `44532688079` is live. The 13:24:41 `/oc review (auto-retry 1)` cancelled the queued duplicates and started review `44533179130` at the live head. #850 is approved at `9c9bf1bd7`; test `44532152403` is live.
- **Do not re-post a #862 review:** `44533179130` is live and the approval already exists.
- **#849 is dispatched** (this run's `lab` decision): first item of the serialized fail-loud backlog (#849, then #857, #856, #860), one branch at a time.
- **#854 and #745 labs are still in progress** at 13:23Z (started 13:02:47/48).
- **#836 ladder is wall-blocked**: lab `44529581523` died at 13:03:45Z on `FreeUsageLimitError` (retry-after ~11h); the #836 note is posted. No same-IP retry until the allowance resets; rung 3 stays dead and the ladder is 2/3 with no routing impact.
- **No merge this run**: no PR carries a Tester approval plus a head-bound `approve-eval`.
- **Registry** 92/12 at 13:21Z; `glm-5.3-flash-free` absent; pin and rung 2 live; allowlist 19/19; Pages root and the five checked previews 200.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 13:18-13:27Z on 2026-11-19)

### GitHub state

- **Main:** `e5cd250c126efa8c86a084b3d72ade3bcf9bdc5b` ("curate: sync Maze Chase release status and correct the Pac-Man retirement claim", Fixes #851; 2026-11-15T06:31:53Z). **`maintainer/logs`:** `d670299e11ed8b6cbf27502e447cbe86d7e6562a`, advanced by concurrent sessions during this window (`04bd61f7` at 13:19Z).
- **Open PRs (6):** #862 head `0673248c4867e9a0c4a0d2a715ad1066c4107d39` (empty commit atop `fe190ad0e`, body `Fixes #861`, 2 copy-only files, CLEAN/MERGEABLE); #859 head `9b862e484cb51ef8a785ffbfcf25da5740b41b49` (empty commit atop `d72d7ac9`, body `Fixes #858`, CLEAN); #850 head `9c9bf1bd72fb459388d2985656f6f61735147105` (body `Closes #848`, CLEAN); #854 head `090452f27c575a31e617bc5c7083c6ee441b0653` (body `Closes #803`, 6 protected-path files, CLEAN); #821 head `dce109e4479b3cf2801a1b0127ea98778e58c398` (parked Point of Sale, CLEAN); #745 head `7a04fa4a96e1982ac307ca40973fed29379def0b` (branch `opencode/lab-742-owner-pat-env-sanitization`, CONFLICTING/DIRTY, 5 ahead / 375 behind).
- **Open issues (28 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #858, #860, #861. #855 is closed. #861/#858 are covered by #862/#859; #856/#857/#860 are triaged and serialized; no untriaged issue remains.
- **Board invariant holds:** #70 is the only open issue with `lab-health` and the only one with the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`).
- **Latest comments:** #859 Tester pass 13:26:52Z, report 13:26:59Z, `/oc approve-test` 13:27:01Z, `/oc maintainer` 13:27:02Z; #854 sibling summon answer 13:26:35Z; #862 approve verdict 13:21:31Z, owner report 13:21:38Z, `/oc test` 13:21:42Z; #850 approve verdict 13:18:13Z, report 13:18:20Z, `/oc test` 13:18:23Z; #836 wall note 13:12:46Z; #70 notes 13:10:23Z and 13:12:46Z.
- **Branch tips:** `git ls-remote` confirms main `e5cd250c` and `maintainer/logs` `d670299e`; #862/#859/#850/#854 heads as above. Newest closed PR is #852 (merged 11-15); no recovery due.

### The 36-minute post-restoration window, verified

- **#862:** review `44529563614` returned **fix** at 13:12:40Z (artifact-only F1: PR body delegation ledger missing the skills note). Fix `44531229345` pushed empty commit `0673248c4` at 13:15:30Z and posted the artifact correction at 13:15:39Z. The older duplicate review `44529850597` (created 13:04:28Z from the 13:04:24Z duplicate trigger, started at 13:12:54Z) completed success at 13:21:45Z with **approve** at the live head, recording that F1 is resolved by the ledger now in the PR description and that `git diff fe190ad0e..0673248c4` is empty; the forward posted `/oc test`, and test `44532688079` is live.
- **#859:** review `44529567916` returned **fix** at 13:11:02Z (same artifact-only F1). Fix `44530924884` applied it at 13:12:19Z and pushed empty commit `9b862e484`. Fresh review `44531169480` (from the 13:12:27Z `/oc review`) returned **approve** at 13:14:43Z; `/oc test` was posted and test `44531572444` returned **pass** at 13:26:52Z (41/41 Playwright checks, 59/59 links 200, Umbra 470/470). `/oc approve-test` is live at 13:27:01Z and the 13:27:02Z `/oc maintainer` summon has run `44533563848` in progress.
- **#850:** review `44529568915` completed success at 13:18:27Z with **approve**; the forward posted `/oc test` and test `44532152403` is live.
- **The two labs:** #854 `44529574302` and #745 `44529576796` were still in progress at 13:23Z, no push yet.
- **The #836 wall death:** lab `44529581523` failed 13:03:45Z on `FreeUsageLimitError` (retry-after 39655s); no decision file; the #836 note at 13:12:46Z records the class and the one-fresh-run cap.
- **No held runs:** `status=action_required` returns 0.
- **Failures since 00:00Z:** exactly one (`44529581523`); timed_out 0; startup_failure 0.

### Runs, CI and queues

- **This run:** `44531223481`, `issue_comment` on #862, created 13:12:50Z, job started 13:12:53Z. A second maintainer for the 13:15:55Z `/oc maintainer` summon is pending in `maintainer-862`; sibling maintainer runs also ran for #859 (`44531572489`) and #850 (`44532142461`/`44532152362`). All read the same live state.
- **Maintainer event storm:** the 13:12:55-13:16Z window created dozens of `workflow_run` maintainer runs; most are `skipped` (non-failure conclusions) or `cancelled` (the deliberate single pending slot, #601). Not failures; no triage needed.
- **Live at 13:29Z:** test `44532688079` (#862), test `44532152403` (#850), review `44533179130` (#862 auto-retry), lab `44529574302` (#854), lab `44529576796` (#745), maintainer `44533563848` (#859 summon). #859 test `44531572444` completed pass at 13:26:52Z. The 13:24:41Z auto-retry cancelled the queued duplicate reviews `44531723229` and `44531751532` and started `44533179130`.
- **Pages:** production root and `/preview/pr-862/`, `/preview/pr-859/`, `/preview/pr-850/`, `/preview/pr-854/` all HTTP 200. Deploy `44531669352` (pull_request) succeeded; `44531755492` (`workflow_dispatch`) was in progress at 13:16Z.
- **Model registry:** **92 models, 12 free** at 13:21Z. `glm-5.3-flash-free` still absent; `opencode/deepseek-v4.1-flash-free` is the pin and `small_model` and is live; `mimo-v2.6-flash-free` (rung 2) is live; `jev-1.13-free`, `nemotron-3.5-lightning-free`, and `tidepool-alpha-free` are live untested alternatives. Ladder remains 2/3.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; the 20 live `name:` fields are those 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Schedules:** curator cron `0 */6 * * *` (next 18:00Z; the prior "~13:11Z tick" note was wrong); auditor cron `0 0 * * *` (next 00:00Z).
- **Workspace:** checkout at main `e5cd250c`, tree clean at start; no protected-path edits, no model edit, no branch commands, no `emergency.json`.

### Live lanes and their next step

- **#862 / #861 (Tester live):** test `44532688079`. On `/oc approve-test`, post `eval` in a later run; after `approve-eval`, the PAT merge sweep, then close #861. Review `44533179130` (auto-retry 1) is live at the approved head; do not re-post.
- **#859 / #858 (Tester passed, eval next):** `/oc approve-test` is live at head `9b862e48`; the summon run `44533563848` owns the next step. Post one `eval` in a later run, then after `approve-eval` the PAT merge sweep; #858 closes on merge.
- **#850 / #848 (Tester live):** test `44532152403`. Same chain; verify the `Closes #848` trailer at merge and normalize it once. After merge, `lab` on #857, then #856, then #860, one at a time.
- **#849 (dispatched):** the first serialized fail-loud hardening lane; the instruction carries the acceptance criteria vs #854/#745 overlap risk on `opencode.yml`, `AGENTS.md`, and `LAB.md`.
- **#854 / #803 (lab live):** on a push, verify B1-B3/H1-H5 and the `Refs #853` / conditional `Closes #803` rewrite; keep #803 open until all three slices land. `health-board.sh` is still absent on main (it lands with #850).
- **#745 / #853 (lab live):** on a push, verify with `git ls-remote`, dispatch exactly one fresh review, keep #853 open; delete the older bot review on the exact commit id if still present.
- **#836 (model/wall capacity):** wall-blocked until ~00:00Z; re-dispatch only after a fresh registry read and only through a new runner.
- **#821 / #823** (Point of Sale staging): parked by Priya. Do not dispatch.
- **Open infra/audit backlog (serialized):** #849 (dispatched), then #857, #856, #860; #803 closes with #854; #853 after #745's verdict; #848 via #850; then #814, #812, #815, #774/#773, #831, #742.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Concurrency and wall coordination

- Many Maintainer sessions ran in this window. This run is the only one dispatching #849; sibling runs (the #859 and #850 wakes and the pending #862 summon) read the same live state and should see the trigger on #849. Do not post a second `lab` trigger on #849.
- The duplicate #862 review `44529850597` was not stale after all: it started at 13:12:54Z before the body fix, read the updated body by verdict time, verified the live head, approved, and opened the Tester chain. The 13:24:41Z auto-retry cancelled the queued duplicate reviews and started `44533179130`; do not re-post.
- The wall is live at the account/egress level: the #836 lab died at 13:03:45Z with an ~11h retry-after. The three testers and two labs survived it. Per #754/#820, no same-IP agent retry; the bounded fresh-run step owns the one recovery attempt.
- Skip-only runs consume runner slots and create workflow_run wakes; that is the designed `#601` behavior, not a stall. Do not treat the cancelled maintainer runs as failures.

## Serialized queue (re-post these only if they did not land or died)

1. `test` on #862 (live `44532688079`) and #850 (live `44532152403`) - do not re-post. #859's test passed and `/oc approve-test` is live.
2. After each `/oc approve-test`: `eval` in a later run, one PR per run; then the PAT merge sweep. #859 is first in line.
3. `{"action":"lab","issue":849}` - posted by this run; do not re-post.
4. After #849 lands: `lab` on #857, then #856, then #860, one branch at a time.
5. After #854's push: verify the findings and the trailer rewrite; after #745's push: verify `git ls-remote` and dispatch one review.
6. After #836's wall clears: fresh registry read, replace the dead glm rung with a live free model, and verify three live rungs.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two lab triggers to the same PR in one run.

## Loose ends

1. **Read the remaining Tester outcomes first.** Tests `44532688079` (#862) and `44532152403` (#850); #859 already passed its Tester. Any failure routes `fix` on that PR; an approval routes `eval` in a later run.
2. **#862's live review `44533179130` (auto-retry 1)** is a fresh check at the approved head; it must not re-open the artifact.
3. **#850's body** ends `Closes #848`; normalize once at merge, do not add a second trailer.
4. **#853's body** needs one prepended "Update: ..." sentence once #745 lands.
5. **#849 vs #854/#745 overlap:** all touch `opencode.yml`, `AGENTS.md`, and `LAB.md`; expect rebases and do not run two labs that edit the same file at the same time if avoidable.
6. **#836 rung choice:** pick among `jev-1.13-free`, `nemotron-3.5-lightning-free`, `tidepool-alpha-free`, `beam-free`, `longcat-2.5-free` after a fresh registry read.
7. **The `INFRA-STATUS` block on #70** is stale (10-21) but factually fine; refresh it with the next real infra change.
8. **No merge yet:** no PR carries the full head-fresh Tester plus Evaluator chain.
9. **Curator** next tick 18:00Z, not 13:11Z; **auditor** next tick 00:00Z tomorrow. No dispatch.
10. **Quota wall:** the 13:03:45Z #836 death is the live instance; retry-after ~11h. One fresh-run attempt is the cap (#820/#836).
11. **Heartbeat:** this is not a heartbeat run. Keep the exact `Last updated:` stamp.
12. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live.
13. **Stale prompt examples:** `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion; folded into the #836 instruction.

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
- The owner PAT is healthy again (verified through 13:21Z). Never include a trigger token in a ping body (#775). The memory branch and the log may quote decisions, but public pings must not carry `eval-verdict:` markers or `/oc` tokens.
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
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526, the 2026-11-18 at 718, and the 2026-11-19 file now carries the 02:39, 04:29, 10:45, 12:54, 13:03, and 13:18 entries. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
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

1. Read the outcomes of tests `44532688079` (#862) and `44532152403` (#850) before any dispatch; #859's test already passed and its `/oc approve-test` is live.
2. On each `/oc approve-test`: post one `eval` for that PR (one PR per run), then after `approve-eval` run the PAT merge sweep, verify Pages, and close the linked issue (#861/#858/#848) only on merge. If the #859 summon run `44533563848` has not posted eval, post it first.
3. On #854's or #745's push: verify the findings and the trailer rewrite; dispatch exactly one review for #745 and keep #853 open.
4. Monitor #849; after its PR review, dispatch `lab` on #857, then #856, then #860, one at a time.
5. Re-dispatch the #836 ladder item only after the wall clears and with a fresh registry read; do not retry on the same runner.
6. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not duplicate the #849 trigger or the #836 ping.

## Open questions

1. Do the #862 and #850 Testers pass, and does the #859 eval clear?
2. Does the live #862 auto-retry review `44533179130` return a conflicting verdict after the approval?
3. Do the #854 and #745 labs survive the wall and land their pushes?
4. Will #849, #854, and #745 conflict on `opencode.yml`, `AGENTS.md`, or `LAB.md` when they merge?
5. Which free model becomes rung 3: `jev-1.13-free`, `nemotron-3.5-lightning-free`, `tidepool-alpha-free`, `beam-free`, or `longcat-2.5-free`?
6. Will the Evaluator accept the copy-only PRs without per-OS Tester arms?
