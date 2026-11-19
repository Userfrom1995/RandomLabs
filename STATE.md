# STATE

Last updated: 2026-11-19T13:12Z by run 44528070035

(This was the second global `workflow_dispatch` queued at 12:53:18Z, started ~13:03:18Z after the first dispatch finished. The headline: the 30th batch LANDED as the owner at 13:02:38-46Z, five trigger-driven runs started (three reviews, two labs), the #836 lab died on the free-usage wall, zero held runs remain, and #855 is closed as resolved. The four-day owner-PAT 401 incident is over.)

## TL;DR for the next Hephaestus

- **Owner-PAT incident RESOLVED.** Run `44527997595`'s trigger step posted all six queued triggers as the owner at 13:02:38-46Z: reviews on #862 (`fe190ad0e`), #859 (`d72d7ac9`), #850 (`9c9bf1bd7`); lab on #854 (full round-1 findings), #745 (rebase), #836 (ladder rung). #855 is closed.
- **Lanes live:** review `44529563614` (#862), review `44529568915` (#850), lab `44529574302` (#854), lab `44529576796` (#745) were in progress at 13:11Z. The #859 review `44529567916` completed success at 13:11:02Z with verdict **fix** (artifact-only F1: the PR body's delegation ledger is missing the mandatory one-line skills note); the workflow posted the fix trigger and fix run `44530924884` is live.
- **One wall death:** the #836 lab run `44529581523` failed at 13:03:45Z on `FreeUsageLimitError` (retry-after ~11h) before any decision. Do not dispatch a same-IP retry; the bounded fresh-run step owns the one recovery attempt. Ladder stays 2/3; no production impact.
- **Zero held runs.** All nine former `action_required` runs completed success by 12:55:47Z. Ignore the "one held run remains" line in the 13:04:22Z #70 note; this run corrected it on #70.
- **One duplicate trigger:** run `44528214502` re-posted `/oc review (head fe190ad0e)` on #862 at 13:04:24Z; it queued as `44529850597` behind the live review. Concurrency artifact.
- **No merge yet:** no PR carries a head-fresh Tester plus Evaluator chain.
- **Model/ladder:** registry 92/12 at 13:07Z; `glm-5.3-flash-free` absent; pin and rung 2 (`mimo-v2.6-flash-free`) live; ladder file still lists glm as rung 3. #836 is the fix lane.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 13:03-13:08Z on 2026-11-19)

### GitHub state

- **Main:** `e5cd250c126efa8c86a084b3d72ade3bcf9bdc5b` ("curate: sync Maze Chase release status and correct the Pac-Man retirement claim", Fixes #851; 2026-11-15T06:31:53Z). **`maintainer/logs`:** `3997d13c4` ("maintainer: memory update 2026-11-19T13:04Z"), with `0154ecbea`, `6f78c223c`, and `837b7dffa` below it, written by the concurrent sessions.
- **Open PRs (6):** #862 head `fe190ad0ea200725d460273d83720d84e9a451ad`, body `Fixes #861`, two copy-only public-surface files, CLEAN/MERGEABLE, 3 comments (owner `/oc maintainer` 12:54:10Z, preview 12:54:18Z, owner `/oc review (head fe190ad0)` 13:02:40Z), 0 reviews; #859 head `d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4`, body `Fixes #858`, CLEAN, 5 comments (handoff, fresh curator audit 00:07:31Z, owner `/oc maintainer` 12:55:22Z, preview, owner `/oc review (head d72d7ac9)` 13:02:41Z), 0 reviews; #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, body `Closes #803`, 6 protected-path files, CLEAN, 6 comments (round-1 verdict, owner `/oc maintainer` 12:55:26Z, preview, owner `/oc lab ...` 13:02:44Z), 0 reviews; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, body `Closes #848`, CLEAN, 50 comments (owner `/oc review (head 9c9bf1bd7)` 13:02:42Z newest), 0 reviews; #821 head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale; #745 head `7a04fa4a96e1982ac307ca40973fed29379def0b`, branch `opencode/lab-742-owner-pat-env-sanitization`, CONFLICTING/DIRTY (5 ahead / 375 behind), 68 comments (owner `/oc lab` rebase 13:02:45Z newest), 0 reviews. No head moved.
- **Open issues (29 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #855, #856, #857, #858, #860, #861. #855 was closed at 13:07:57Z by a sibling Maintainer session and this run verified the state (no duplicate comment); #861/#858 are covered by #862/#859; no untriaged issue remains.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). #855/#856/#857/#858/#860/#861 deliberately stay unlabelled.
- **Latest comments:** this run's two pings (#70, #836) will be newest; before them the 13:04:22Z #70 note, the 13:04:10Z quota-wall intake note, the 13:04:09Z #862 note, and the 13:02:38-46Z 30th batch.
- **Branch tips:** `git ls-remote` confirms main `e5cd250c` and `maintainer/logs` `3997d13c`; #862/#859/#854/#850 heads unchanged. Newest closed PR is #852 (merged 11-15); no recovery due.

### The 30th batch, verified

- **All six triggers posted as the owner** from run `44527997595`'s `Run /oc triggers as owner` step at 13:02:38-46Z (the run log prints six `posted '...'` lines at 13:02:47Z): `/oc review (head fe190ad0ea200725d460273d83720d84e9a451ad)` on #862, `/oc review (head d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4)` on #859, `/oc review (head 9c9bf1bd72fb459388d2985656f6f61735147105)` on #850, the full round-1 `/oc lab` instruction on #854, the `/oc lab` rebase instruction on #745, and the ladder `/oc lab` instruction on #836.
- **First successful Maintainer batch since 2026-11-15T07:38Z.** The 29th batch had 401ed at 10:55:51Z; the secret was restored between 10:55Z and 12:54Z and the owner's 12:53-12:55Z activity (two dispatches, three `/oc maintainer` summons, release of the held runs) preceded it.
- **Five runs started** (see below). The #836 run died on the wall; all others were alive at survey close.
- **Zero held runs:** all nine former `action_required` runs are `completed success` (12:53:56Z-12:55:47Z). The 13:04:22Z #70 note's "one held run remains" claim was stale and is corrected on #70 by this run.

### Runs, CI and queues

- **This run:** `44528070035`, `workflow_dispatch` (empty payload) created 12:53:18Z, queued behind `44527997595`, started ~13:03:18Z on `main` `e5cd250c`. Not a heartbeat.
- **30th-batch session:** `44527997595`, `workflow_dispatch` 12:52:50Z, success; trigger step 13:02:47Z; #70 note 13:02:38Z; #855 note 13:02:39Z; memory commit `6f78c223c`.
- **Concurrent sessions:** `44528214502` (#862 per-PR wake, memory commit `3997d13c`, #70 note 13:04:22Z, duplicate #862 review 13:04:24Z, own #862 note 13:04:09Z); `44528405829` (#859) and `44528414321` (#854) also ran. `44529751783` was the quota-wall intake run (success 13:04:1x, #70 note 13:04:10Z, stood down). `44529850637` is a pending comment-triggered maintainer run.
- **Live agent runs at 13:08Z:** review `44529563614` (#862), review `44529567916` (#859), review `44529568915` (#850), lab `44529574302` (#854), lab `44529576796` (#745); all in progress. Review `44529850597` is pending behind the #862 review (duplicate trigger).
- **Wall death:** lab `44529581523` (#836), failure 13:03:45Z, `FreeUsageLimitError: Free usage limit reached` on `opencode/deepseek-v4.1-flash-free`, `retry-after: 39655` (~11h), no decision file, post-agent PAT gates skipped cleanly.
- **Failures since 00:00Z:** exactly one (`44529581523`). No timed_out, no startup_failure.
- **Queued runs:** the seven inert historical entries on long-dead branches (`42971888736` siblings, `37344324101`, `36101155868`). No new queued trigger.
- **Pages:** production deployment green; root and `/preview/pr-854/`, `/preview/pr-859/`, `/preview/pr-862/` all HTTP 200.
- **Model registry:** **92 models, 12 free** at 13:07Z (`beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `hy4-flash-free`, `iceman-free`, `inkling-2-small-free`, `jev-1.13-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, `tidepool-alpha-free`). `glm-5.3-flash-free` still absent; pin and `small_model` are `opencode/deepseek-v4.1-flash-free`; rung 2 live; ladder 2/3.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; the 20 live `name:` fields are those 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Workspace note:** checkout is the trusted default-branch commit (main `e5cd250c`), working tree clean at start. No protected-path edits, no model edit, no branch commands, no `emergency.json`.

### Live lanes and their next step

- **#862 / #861 (Curator lane, review live):** review `44529563614` on `fe190ad0e`. On a clean verdict, the next wake posts `test` (then `eval` in a later run), then the PAT merge sweep; #861 closes only on merge. A duplicate review queue entry `44529850597` exists from the per-PR session; ignore it. Not a new project, so the shipping limit does not apply.
- **#859 / #858 (Curator lane, fix live):** review `44529567916` returned **fix** at 13:11:02Z for artifact-only F1 (append the mandatory skills line to the PR body's delegation ledger; no source change). The workflow posted the fix trigger and fix run `44530924884` is live. After the body fix: one fresh head-bound review, then `test`, then `eval` in a later run, then the PAT merge sweep; #858 closes only on merge.
- **#850 / #848 (protected-path lab lane, review live):** review `44529568915` on `9c9bf1bd7`. The reviewer will route lab on a protected-path PR. When it lands: `lab` on #849, then #857, then #856, then #860, one branch at a time; verify the `Closes #848` trailer at merge.
- **#854 / #803 (protected-path slice 3 + hardening, lab live):** lab `44529574302` on head `090452f27` with the full B1-B3/H1-H5 instruction. On a push: watch the forwarded review; verify each finding and the `Refs #853`/conditional `Closes #803` rewrite. Do not close #803 until all three slices land. `health-board.sh` is still absent on main.
- **#745 / #853 (orphaned audit/rebuild, lab live):** lab `44529576796` rebase retry with `Refs #853`, no `Closes`. On a push: verify with `git ls-remote`, dispatch exactly one fresh review, keep #853 open; delete the older bot review on the exact commit if it still exists.
- **#836 (model/wall capacity):** ladder + prompt-hygiene instruction queued on the issue; the first lab run died on the wall. Re-dispatch on a later wake after a fresh registry read; verify the replacement rung is live and free and the ladder has three live rungs.
- **#821 / #823** (Point of Sale staging): parked by Priya. Do not dispatch.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after #745's verdict; #849/#857/#856/#860 after #850; #848 via #850; then #814, #812, #815, #774/#773, #831, #742.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Concurrency and wall coordination

- Several Maintainer sessions ran in the same 10-minute window. The 30th batch landed once; do not re-post its six triggers. The only duplicate observed is the #862 review (`44529850597`).
- The provider wall is live again: the #836 lab died at 13:03:20Z with an ~11h retry-after. Per #754/#820, no same-IP agent dispatch for a wall failure; the bounded fresh-run step owns the single recovery attempt. Watch whether the four surviving runs also die on it.
- Next session: read the five live runs' outcomes before any new dispatch; do not assume they succeeded.

## Serialized queue (re-post these only if they did not land or died)

1. `{"action":"review","pr":862,"head":"fe190ad0ea200725d460273d83720d84e9a451ad"}` - posted and live; do not re-post.
2. `{"action":"review","pr":859,"head":"d72d7ac9aa5d08f9c4d35c1dfc1e63cb116571a4"}` - posted and live.
3. `{"action":"review","pr":850,"head":"9c9bf1bd72fb459388d2985656f6f61735147105"}` - posted and live.
4. `{"action":"lab","pr":854,"instruction":"<the round-1 review findings in this log>"}` - posted and live.
5. `{"action":"lab","pr":745,"instruction":"<rebase onto e5cd250c, Refs #853, verify with git ls-remote>"}` - posted and live.
6. `{"action":"lab","issue":836,"instruction":"<replace the retired glm-5.3 rung with a live free model, add the prompt/allowlist fixes>"}` - posted; run died on the wall; re-dispatch only after the wall clears.
7. After #850's verdict: `lab` on #849, then #857, then #856, then #860; after #862's review: `test` then `eval`; after #859's review: `test` then `eval`; after #836's ladder push: verify three live free rungs; after #745's push: verify `git ls-remote` and dispatch one review.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two lab triggers to the same PR in one run.

## Loose ends

1. **Read the live lanes first.** Reviews `44529563614` (#862) and `44529568915` (#850); labs `44529574302` (#854) and `44529576796` (#745); fix `44530924884` (#859). The #859 review outcome is known (fix, artifact-only F1). Everything else is unknown as of 13:11Z.
2. **Wall watch:** if the reviews also die on `FreeUsageLimitError`, stand down the window and re-arm on the next wake; do not chain dispatches.
3. **#855 is closed** as resolved; do not reopen it for the #856/#857/#860 code defects.
4. **Held runs:** zero. The approve sweep is clean; no sweep needed.
5. **#745 stale bot review:** after the fix-up, delete the older bot review on the exact commit id if present; filter by `commit_id`, not just author.
6. **#850's body** has `Closes #848`; normalize at merge, do not add a second trailer.
7. **#853's body chronology** needs one prepended "Update: ..." sentence once #745 lands.
8. **#849 scope mismatch:** its premise quotes the old body text; the expanded scope lives in #850's body. Add the expansion to #849's body first when #850 lands. #856/#857/#860 are separate siblings.
9. **The `INFRA-STATUS` block on #70** is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
10. **No merge this run:** no PR carries the full head-fresh Tester plus Evaluator chain.
11. **Curator tick:** the next 6h tick is due ~13:11Z; do not dispatch a manual curator run unless it crashes or the gap passes ~16h.
12. **Auditor schedule:** the next daily tick is expected ~06:00Z tomorrow. No dispatch.
13. **Quota wall:** the 13:03:45Z #836 death is the live instance; retry-after ~11h. One fresh-run attempt is the cap (#820/#836).
14. **Heartbeat:** this is not a heartbeat run. The recover arm's last tick was 10:45Z; the next is expected ~18:4xZ. Keep the exact `Last updated:` stamp.
15. **Model registry drift:** 92/12; `glm-5.3-flash-free` retired and rung 3 is dead; `jev-1.13-free` and `tidepool-alpha-free` are live untested alternatives. #836 is the fix lane.
16. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live.
17. **Stale prompt examples:** `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion; folded into the #836 instruction.
18. **Maintainer cron throttling:** the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).

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
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526, the 2026-11-18 at 718, and the 2026-11-19 file now carries the 02:39, 04:29, 10:45, 12:54, and 13:03 entries. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
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

1. Read the outcomes of `44529563614` (#862), `44529568915` (#850), `44529574302` (#854), `44529576796` (#745), and fix `44530924884` (#859) before any dispatch.
2. #859's review returned fix (artifact-only F1); after the fix push, post one fresh head-bound review, then `test`, then `eval` in a later run. On a clean #862 review: `test`, then `eval` in a later run, then the PAT merge sweep; #861/#858 close only on merge. Never merge on the reviewer verdict alone.
3. On #854's push: verify B1-B3/H1-H5 and the `Refs #853`/`Closes #803` rewrite; keep #803 open until all three slices land.
4. On #850's verdict: `lab` on #849, then #857, then #856, then #860, one branch at a time; verify the `Closes #848` trailer.
5. On #745's push: verify with `git ls-remote`, dispatch one review, keep #853 open.
6. Re-dispatch the #836 ladder item only after the wall clears and with a fresh registry read; do not retry on the same runner.
7. If the wall took more runs, treat it as the #820 class: one bounded fresh-run attempt, then wait.
8. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not invent work and do not duplicate the #836 ping (the #855 thread is closed and already carries the sibling's resolution).

## Open questions

1. Will the three reviews and two labs survive the wall, and what verdicts do they return?
2. Which free model becomes rung 3: `nemotron-3.5-lightning-free`, `beam-free`, `jev-1.13-free`, `longcat-2.5-free`, or `tidepool-alpha-free`?
3. Will #854's lab pass fit one round, or will the mutation harness plus the three fail-closed classes need a second?
4. Does the #745 branch still merge cleanly onto `e5cd250c`, and is its scope still distinct from #804?
5. Should #860, #856, and #857 be one consolidated fail-loud owner-PAT change or separate sequential branches once #854/#850 lands? (Current plan: separate scopes, one branch at a time.)
6. Did the duplicate #862 review queue entry produce a second verdict or get superseded?
7. Will the throttled maintainer cron keep leaving multi-hour gaps that only the recover heartbeat covers (#836/#831)?
