# STATE

Last updated: 2026-11-19T13:25Z by run 44528414321

(This was the #854 owner summon at 12:55:26Z, the first per-PR wake after the owner-PAT recovery. The headline: the 30th batch landed as the owner at 13:02:38-46Z, zero held runs remain, #855 is closed as resolved, #859 and #850 moved through review into the Tester, #862 is between review rounds, #854 and #745 are still in the lab, and the #836 lab died on the free-usage wall.)

## TL;DR for the next Hephaestus

- **Owner-PAT incident RESOLVED.** Run `44527997595`'s trigger step posted all six queued triggers as the owner at 13:02:38-46Z: reviews on #862 (`fe190ad0e`), #859 (`d72d7ac9`), #850 (`9c9bf1bd7`); lab on #854 (full round-1 findings), #745 (rebase), #836 (ladder rung). #855 was closed as resolved at 13:07:57Z by a sibling session.
- **Zero held runs.** All nine former `action_required` runs completed success by 12:55:47Z. The 13:04:22Z #70 note's "one held run remains" claim was stale; the second dispatch corrected it on #70.
- **Lanes live at 13:21Z:** lab `44529574302` (#854), lab `44529576796` (#745), test `44531572444` (#859), test `44532152403` (#850), review `44531723229` (#862 fresh head `0673248c`), duplicate review `44529850597` (#862 old head `fe190ad0e`), and comment-triggered Maintainer sessions `44531223481`, `44531750970`, `44532142461`.
- **#859:** review returned **fix** (artifact-only F1: the delegation ledger was missing the mandatory skills line) at 13:10:46Z; the fix run `44530924884` completed success, head moved to `9b862e48`, a fresh review approved at 13:14:43Z, and `/oc test` went out at 13:14:52Z. **#850:** round-4 review approved at 13:18:13Z (R1 fixed: pre-agent `default_branch`, `trusted_sha`, self-head reads); `/oc test` at 13:18:23Z. **#862:** review returned **fix** (artifact-only: delegation ledger) at 13:12:47Z; fix run `44531229345` completed success, head moved to `0673248c`, and a fresh review is pending.
- **One wall death:** lab `44529581523` (#836) failed at 13:03:45Z on `FreeUsageLimitError` (retry-after ~39655s, ~11h) before any decision. No same-IP retry; the bounded fresh-run step owns the single recovery attempt. The ladder stays 2/3 with no production impact.
- **Model/ladder:** registry 92/12 at 13:07Z; `glm-5.3-flash-free` absent; pin and rung 2 (`mimo-v2.6-flash-free`) live; the ladder file still lists glm as rung 3. #836 is the fix lane.
- **No merge yet:** no PR carries a head-fresh Tester plus Evaluator chain. #859 and #850 just entered the Tester; #862 is between review rounds; #854/#745 are in the lab.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 12:56-13:25Z on 2026-11-19)

### GitHub state

- **Main:** `e5cd250c126efa8c86a084b3d72ade3bcf9bdc5b` ("curate: sync Maze Chase release status and correct the Pac-Man retirement claim", Fixes #851; 2026-11-15T06:31:53Z). **`maintainer/logs`:** `04bd61f76` ("maintainer: memory update 2026-11-19T13:12Z"), with `ca1d231c4`, `3997d13c4`, `0154ecbea`, `6f78c223c`, and `837b7dffa` below it.
- **Open PRs (6):** #862 head `0673248c4867e9a0c4a0d2a715ad1066c4107d39` after the artifact fix, body `Fixes #861`, CLEAN/MERGEABLE; #859 head `9b862e484cb51ef8a785ffbfcf25da5740b41b49` after the artifact fix, body `Fixes #858`, CLEAN/MERGEABLE; #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, body `Closes #803`, 6 files (5 protected-path), CLEAN/MERGEABLE; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, body `Closes #848`, CLEAN/MERGEABLE; #821 head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale; #745 head `7a04fa4a96e1982ac307ca40973fed29379def0b`, branch `opencode/lab-742-owner-pat-env-sanitization`, CONFLICTING/DIRTY until the in-progress rebase lands.
- **Open issues (28 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #858, #860, #861. #855 was closed at 13:07:57Z; no untriaged issue remains.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). #855/#856/#857/#858/#860/#861 deliberately stay unlabelled.
- **Latest comments:** #862 approved report 13:21:38Z and `/oc test` 13:21:42Z, then the workflow auto-retried `/oc review (auto-retry 1)` at 13:24:41Z; #850 approved report 13:18:20Z; #859 approved report 13:14:50Z; this run's #854 comment will be newest.
- **Branch tips:** `git ls-remote` confirms main `e5cd250c` and `maintainer/logs` `04bd61f76`; #862 and #859 moved after their fix pushes; #854/#850/#745 heads unchanged. Newest closed PR is #852 (merged 11-15); no recovery due.

### The 30th batch, verified

- **All six triggers posted as the owner** from run `44527997595`'s `Run /oc triggers as owner` step at 13:02:38-46Z (six `posted '...'` lines at 13:02:47Z): `/oc review (head fe190ad0ea200725d460273d83720d84e9a451ad)` on #862, `/oc review (head d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4)` on #859, `/oc review (head 9c9bf1bd72fb459388d2985656f6f61735147105)` on #850, the full round-1 `/oc lab` instruction on #854, the `/oc lab` rebase instruction on #745, and the ladder `/oc lab` instruction on #836.
- **First successful Maintainer batch since 2026-11-15T07:38Z.** The 29th batch had 401ed at 10:55:51Z; the secret was restored between 10:55Z and 12:54Z and the owner's 12:53-12:55Z activity (two dispatches, three `/oc maintainer` summons, release of the held runs) preceded it.
- **Five runs started** (see below). The #836 run died on the wall; all others moved forward.
- **Zero held runs:** all nine former `action_required` runs are `completed success` (12:53:56Z-12:55:47Z).

### Runs, CI and queues

- **This run:** `44528414321`, `issue_comment` `/oc maintainer` on PR #854 by Userfrom1995 at 12:55:26Z; job started 12:55:45Z. Not a heartbeat.
- **30th-batch session:** `44527997595`, `workflow_dispatch` 12:52:50Z, success 13:02:56Z; trigger step 13:02:47Z; #70 note 13:02:38Z; #855 note 13:02:39Z; memory commit `6f78c223c`.
- **Second owner dispatch:** `44528070035`, `workflow_dispatch` 12:53:18Z, started ~13:03:18Z behind the first dispatch, success ~13:19Z; memory commit `04bd61f76` (13:12:44Z); corrected the held-run count on #70.
- **Concurrent sessions:** `44528214502` (#862 per-PR wake, memory `3997d13c4`, own #862 note 13:04:09Z, #70 note 13:04:22Z, duplicate #862 review 13:04:24Z); `44528405829` (#859 per-PR wake, review-forward flow); `44529751783` (#836 quota-wall intake, success 13:04:1xZ, #70 note 13:04:10Z, stood down); `44530924884` (#859 fix, success); `44531229345` (#862 fix, success); `44531223481`/`44531750970` (#862 comment-triggered Maintainer sessions); `44532142461` (#850 lane Maintainer session).
- **Live agent runs at 13:25Z:** lab `44529574302` (#854), lab `44529576796` (#745), test `44531572444` (#859), test `44532152403` (#850), test `44532688079` (#862), test `44533179104` (pending, #862), review `44533179130` (#862 auto-retry), Maintainer `44531223481` (in progress), `44532142461` (in progress). The duplicate review `44529850597` completed success at 13:21:45Z; the 13:15:46Z fresh review `44531723229` was cancelled at 13:24:46Z and the workflow auto-retried.
- **Wall death:** lab `44529581523` (#836), failure 13:03:45Z, `FreeUsageLimitError: Free usage limit reached` on `opencode/deepseek-v4.1-flash-free`, `retry-after: 39655` (~11h), no decision file, post-agent PAT gates skipped cleanly.
- **Failures since 00:00Z:** exactly one (`44529581523`). No timed_out, no startup_failure. The `workflow_run` storm after the fix pushes is all `skipped`/`cancelled` annotations, not failures.
- **Queued runs:** the seven inert historical entries on long-dead branches (`42971888736` siblings, `37344324101`, `36101155868`). No new queued trigger.
- **Pages:** production deployment green; root and `/preview/pr-854/`, `/preview/pr-859/`, `/preview/pr-862/` all HTTP 200.
- **Model registry:** **92 models, 12 free** at 13:07Z (`beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `hy4-flash-free`, `iceman-free`, `inkling-2-small-free`, `jev-1.13-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, `tidepool-alpha-free`). `glm-5.3-flash-free` still absent; pin and `small_model` are `opencode/deepseek-v4.1-flash-free`; rung 2 live; ladder 2/3.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; the 20 live `name:` fields are those 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Workspace note:** checkout is the trusted default-branch commit (main `e5cd250c`), working tree clean at start. No protected-path edits, no model edit, no branch commands, no `emergency.json`.

### Live lanes and their next step

- **#862 / #861 (Curator lane, review auto-retry live):** head `0673248c` after the artifact fix (delegation ledger added at 13:15:39Z). The old-head duplicate review `44529850597` completed success at 13:21:45Z and posted an approval at 13:21:31Z; its forwarded test `44532688079` is in progress. Because the 13:15:46Z fresh review `44531723229` was cancelled at 13:24:46Z, the workflow posted `/oc review (auto-retry 1)` at 13:24:41Z; review `44533179130` is in progress and test `44533179104` is pending. Treat only the auto-retry verdict as head-fresh. On a clean verdict: `test`, then `eval` in a later run, then the PAT merge sweep; #861 closes only on merge. Not a new project, so the shipping limit does not apply.
- **#859 / #858 (Curator lane, test live):** head `9b862e48`; review approved clean at 13:14:43Z; test `44531572444` in progress since 13:14:58Z. On the Tester's owner-authored approval: `{"action":"eval"}` in a later run, then the PAT merge sweep; #858 closes only on merge.
- **#850 / #848 (protected-path lab lane, test live):** head `9c9bf1bd7`; round-4 review approved at 13:18:13Z with R1 fixed (all four workflows resolve `github.event.repository.default_branch` pre-agent, publish `trusted_sha`, and read self-heads); test `44532152403` in progress since 13:18:26Z. On approval: `eval` in a later run, then the protected-path PAT merge; verify the `Closes #848` trailer at merge. Then `lab` on #849, then #857, then #856, then #860, one branch at a time.
- **#854 / #803 (protected-path slice 3 + hardening, lab live):** lab `44529574302` on head `090452f27` with the full B1-B3/H1-H5 instruction. On a push: watch the forwarded review; verify each finding and the `Refs #853`/conditional `Closes #803` rewrite. Do not close #803 until all three slices land. `health-board.sh` is still absent on main.
- **#745 / #853 (orphaned audit/rebuild, lab live):** lab `44529576796` rebase retry with `Refs #853`, no `Closes`. On a push: verify with `git ls-remote`, dispatch exactly one fresh review, keep #853 open; delete the older bot review on the exact commit if it still exists.
- **#836 (model/wall capacity):** ladder + prompt-hygiene instruction queued on the issue; the first lab run died on the wall. Re-dispatch on a later wake after a fresh registry read; verify the replacement rung is live and free and the ladder has three live rungs.
- **#821 / #823** (Point of Sale staging): parked by Priya. Do not dispatch.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after #745's verdict; #849/#857/#856/#860 after #850; #848 via #850; then #814, #812, #815, #774/#773, #831, #742.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Concurrency and wall coordination

- Several Maintainer sessions ran in the same 30-minute window. The 30th batch landed once; do not re-post its six triggers. The only duplicate observed is the #862 review (`44529850597`), created by the per-PR session's 13:04:24Z re-post.
- The comment-trigger machinery creates a large skipped/cancelled `workflow_run` storm after each fix push; those are annotations, not failures. Do not chase them.
- The provider wall is live again: the #836 lab died at 13:03:20Z with an ~11h retry-after. Per #754/#820, no same-IP agent dispatch for a wall failure; the bounded fresh-run step owns the single recovery attempt. Watch whether the surviving lanes also die on it.
- Next session: read the live runs' outcomes before any new dispatch; do not assume they succeeded.

## Serialized queue (re-post these only if they did not land or died)

1. `{"action":"review","pr":862,"head":"0673248c4867e9a0c4a0d2a715ad1066c4107d39"}` - pending `44531723229`; do not re-post.
2. `{"action":"review","pr":859,"head":"9b862e484cb51ef8a785ffbfcf25da5740b41b49"}` - approved; test live.
3. `{"action":"review","pr":850,"head":"9c9bf1bd72fb459388d2985656f6f61735147105"}` - approved; test live.
4. `{"action":"lab","pr":854,"instruction":"<the round-1 review findings in this log>"}` - posted and live.
5. `{"action":"lab","pr":745,"instruction":"<rebase onto e5cd250c, Refs #853, verify with git ls-remote>"}` - posted and live.
6. `{"action":"lab","issue":836,"instruction":"<replace the retired glm-5.3 rung with a live free model, add the prompt/allowlist fixes>"}` - posted; run died on the wall; re-dispatch only after the wall clears.
7. After #859's Tester approval: `eval` then the PAT merge sweep; after #850's: `eval` then the protected-path PAT merge, then `lab` on #849, #857, #856, #860; after #862's review: `test` then `eval` then the PAT merge sweep; after #854's push: verify the findings; after #745's push: verify `git ls-remote` and dispatch one review.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two lab triggers to the same PR in one run.

## Loose ends

1. **Read the live lanes first.** Labs `44529574302` (#854) and `44529576796` (#745); tests `44531572444` (#859) and `44532152403` (#850); review `44531723229` (#862 fresh) and the duplicate `44529850597`. Everything else is known as of 13:21Z.
2. **Wall watch:** if the surviving lanes also die on `FreeUsageLimitError`, stand down the window and re-arm on the next wake; do not chain dispatches.
3. **#855 is closed** as resolved; do not reopen it for the #856/#857/#860 code defects.
4. **Held runs:** zero. The approve sweep is clean; no sweep needed.
5. **#745 stale bot review:** after the rebase, delete the older bot review on the exact commit id if present; filter by `commit_id`, not just author.
6. **#850's body** has `Closes #848`; normalize at merge, do not add a second trailer.
7. **#853's body chronology** needs one prepended "Update: ..." sentence once #745 lands.
8. **#849 scope mismatch:** its premise quotes the old body text; the expanded scope lives in #850's body. Add the expansion to #849's body first when #850 lands. #856/#857/#860 are separate siblings.
9. **The `INFRA-STATUS` block on #70** is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
10. **No merge this run:** no PR carries the full head-fresh Tester plus Evaluator chain.
11. **Curator tick:** the next 6h tick was due ~13:11Z; do not dispatch a manual curator run unless it crashes or the gap passes ~16h.
12. **Auditor schedule:** the next daily tick is expected ~06:00Z tomorrow. No dispatch.
13. **Quota wall:** the 13:03:45Z #836 death is the live instance; retry-after ~11h. One fresh-run attempt is the cap (#820/#836).
14. **Heartbeat:** this is not a heartbeat run. The recover arm's last tick was 10:45Z; the next is expected ~18:4xZ. Keep the exact `Last updated:` stamp.
15. **Model registry drift:** 92/12; `glm-5.3-flash-free` retired and rung 3 is dead; `jev-1.13-free` and `tidepool-alpha-free` are live untested alternatives. #836 is the fix lane.
16. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live.
17. **Stale prompt examples:** `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion; folded into the #836 instruction.
18. **Maintainer cron throttling:** the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
19. **Duplicate #862 review:** the old-head duplicate approved at 13:21:31Z; its test `44532688079` is live. The head-fresh authority is the auto-retry review `44533179130`; if its verdict differs, the newer head-bound result wins.
20. **Memory tip:** the 13:04 `3997d13c4` state mislabels the sibling sessions and says "one held run remains"; the 13:12 `04bd61f76` state corrects both. Prefer this state.

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
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526, the 2026-11-18 at 718, and the 2026-11-19 file now carries the 02:39, 04:29, 10:45, 12:54, 13:03, and 13:22 entries. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
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

1. Read the outcomes of `44529574302` (#854), `44529576796` (#745), `44531572444` (#859), `44532152403` (#850), `44533179130` (#862 auto-retry), `44532688079`/`44533179104` (#862 tests), and the cancelled `44531723229` before any dispatch.
2. On a clean #862 review: `test`, then `eval` in a later run, then the PAT merge sweep; #861 closes only on merge. On the #859 and #850 Tester approvals: `eval` in a later run, then the PAT merge sweeps; #858 and #848 close only on merge. Never merge on the reviewer verdict alone.
3. On #854's push: verify B1-B3/H1-H5 and the `Refs #853`/`Closes #803` rewrite; keep #803 open until all three slices land.
4. On #850's merge: `lab` on #849, then #857, then #856, then #860, one branch at a time; verify the `Closes #848` trailer.
5. On #745's push: verify with `git ls-remote`, dispatch one review, keep #853 open.
6. Re-dispatch the #836 ladder item only after the wall clears and with a fresh registry read; do not retry on the same runner.
7. If the wall took more runs, treat it as the #820 class: one bounded fresh-run attempt, then wait.
8. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not invent work and do not duplicate the #855/#836 pings (the incident thread is closed and already carries the sibling's resolution).

## Open questions

1. Will the three surviving lanes (#854, #745, #859/#850 tests) survive the wall, and what verdicts do they return?
2. Which free model becomes rung 3: `nemotron-3.5-lightning-free`, `beam-free`, `jev-1.13-free`, `longcat-2.5-free`, or `tidepool-alpha-free`?
3. Will #854's lab pass fit one round, or will the mutation harness plus the three fail-closed classes need a second?
4. Does the #745 branch still merge cleanly onto `e5cd250c` after the rebase, and is its scope still distinct from #804?
5. Should #860, #856, and #857 be one consolidated fail-loud owner-PAT change or separate sequential branches once #854/#850 lands? (Current plan: separate scopes, one branch at a time.)
6. Did the duplicate #862 review queue entry produce a second verdict on the old head or get superseded?
7. Will the throttled maintainer cron keep leaving multi-hour gaps that only the recover heartbeat covers (#836/#831)?
