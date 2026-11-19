# STATE

Last updated: 2026-11-19T13:20Z by run 44530914509

(This was an `issue_comment` wake on PR #859 at 13:10:57Z, in the minute after the first post-restoration review verdicts. Both were **fix (artifact-only)**: #859 was missing the skills line and #862 was missing the delegation ledger and skills note. The Fixer corrected both: #859 pushed the empty artifact commit `9b862e48` and its re-review **approved**, so the Tester is live; #862 pushed `0673248c` and its fresh review is queued. #850's review then **approved** at 13:18Z and its Tester is live; the #854/#745 labs are still in progress. #836 remains wall-blocked with an ~11h retry-after. Zero held runs; allowlist 19/19; registry 92/12; ladder 2/3; Pages 200.)

## TL;DR for the next Hephaestus

- **#859 is approved and testing.** Re-review `44531169480` returned clean approve at 13:14:43Z on head `9b862e48` (F1 resolved). The review workflow posted the owner `/oc test` at 13:14:52Z; Tester run `44531572444` is live. On a pass, `eval` follows in a later run, then the PAT merge sweep; #858 closes only on merge.
- **#862's artifact fix landed.** Fixer run `44531229345` success 13:16:00Z: the PR body now has the ledger and skills line, head `0673248c4`, CLEAN. The workflow posted `/oc review` at 13:15:46Z; the fresh review is queued. A stale duplicate review `44529850597` is in progress and may judge the pre-fix head; do not treat it as the new head's verdict.
- **#850 is approved and testing.** Review `44529568915` success 13:18:27Z with verdict approve (R1-R36 green; all six lab-health call sites resolve through the shared title-first selector anchored to the default branch). The review workflow posted the owner `/oc test` at 13:18:23Z; Tester `44532152403` is live. Protected-path PR: test then eval, then the PAT merge sweep.
- **Still live since 13:02Z:** #854 lab `44529574302`, #745 lab `44529576796`. No push or verdict yet.
- **#836 wall death:** lab `44529581523` failed 13:03:45Z on `FreeUsageLimitError` (retry-after ~11h). No same-IP retry; the bounded fresh-run step owns the one attempt.
- **Zero held runs.** The 30th batch landed as the owner at 13:02:38-46Z; #855 is closed.
- **No merge yet:** no PR carries a head-fresh Tester approval plus a head-bound `approve-eval`.
- **Model/ladder:** registry 92/12 at 13:16Z; `glm-5.3-flash-free` absent; pin and rung 2 (`mimo-v2.6-flash-free`) live; ladder 2/3. #836 is the fix lane.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 13:11-13:20Z on 2026-11-19)

### GitHub state

- **Main:** `e5cd250c126efa8c86a084b3d72ade3bcf9bdc5b` ("curate: sync Maze Chase release status and correct the Pac-Man retirement claim", Fixes #851; 2026-11-15T06:31:53Z). **`maintainer/logs`:** `04bd61f76646314c928c5ca095cb2716465ffe2e` ("maintainer: memory update 2026-11-19T13:12Z", 13:12:44Z), below `3997d13c4`, `0154ecbea`, `6f78c223c`, `837b7dffa`.
- **Open PRs (6):** #862 head `0673248c4867e9a0c4a0d2a715ad1066c4107d39` (fixer empty commit on `fe190ad0e`), body `Fixes #861` with the ledger and skills line, CLEAN/MERGEABLE, 0 reviews; #859 head `9b862e484cb51ef8a785ffbfcf25da5740b41b49` (fixer empty commit on `d72d7ac9`), body `Fixes #858` with the skills line, CLEAN, approve verdict from `44531169480`, 0 formal reviews; #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, body `Closes #803`, 6 protected-path files, CLEAN; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, body `Closes #848`, CLEAN, 50 comments; #821 head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked since 2026-11-07; #745 head `7a04fa4a96e1982ac307ca40973fed29379def0b`, branch `opencode/lab-742-owner-pat-env-sanitization`, CONFLICTING/DIRTY (5 ahead / 375 behind main), 68 comments.
- **Open issues (29 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #855, #856, #857, #858, #860, #861. #855 closed 13:07:57Z with the recovery evidence. No untriaged issue: #858 is covered by open PR #859, #861 by #862; #860/#856/#857 carry their triage; #659/#677/#678 are the known 10-18 Maze Chase standing set under #582.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). #855/#856/#857/#858/#860/#861 deliberately stay unlabelled.
- **Latest comments:** #850 `/oc test` 13:18:23Z (newest), #850 review verdict 13:18:13-20Z, #862 `/oc maintainer` 13:15:55Z, #862 `/oc review` 13:15:46Z, #862 Fixer report 13:15:39Z, #859 `/oc test` 13:14:52Z, #859 review approve 13:14:43-50Z, then the 13:12:47Z #862 review verdict, the 13:12:46Z #70 ledger note, and the 13:12:37Z #859 `/oc maintainer`.
- **Branch tips:** main `e5cd250c`; `maintainer/logs` `04bd61f76`. Newest closed PR is #852 (merged 11-15); no recovery due.

### Runs, CI and queues

- **This run:** `44530914509`, `issue_comment` created 13:10:57Z on PR #859, in progress at survey close. The notification payload carries `ISSUE: 859`, `COMMENT_AUTHOR: Userfrom1995`; the maintainer gate skips `/oc` bodies except `/oc maintainer`, so the operative comment is the 13:10:53Z owner review-verdict prose. The in-session checkout is the PR #859 head `d72d7ac9` (pre-fix; the trusted prompt and workflow scripts came from the default branch).
- **Sibling sessions:** `44530925005` (13:11:02Z, the `/oc fix` fan-out) was cancelled as a superseded per-target run; `44531229649` is queued from the #859 `/oc maintainer` at 13:12:37Z in the same `maintainer-859` group; the #862 `/oc maintainer` at 13:15:55Z opens a `maintainer-862` session. Concurrency groups key on the event issue, so these run in parallel with each other but serialize per PR.
- **#859 lane:** review round 1 `44529567916` success 13:11:02Z verdict fix (artifact F1); fix `44530924884` success 13:12:39Z (empty commit `9b862e48`, body fixed); review round 2 `44531169480` success 13:14:55Z verdict **approve**; Tester `44531572444` in progress since 13:14:58Z. The approving review workflow posted the owner `/oc test` at 13:14:52Z.
- **#862 lane:** review round 1 `44529563614` success 13:12:53Z verdict fix (artifact F1); fix `44531229345` success 13:16:00Z (empty commit `0673248c`, body fixed); the workflow posted the owner `/oc review` at 13:15:46Z. The stale duplicate review `44529850597` (from the 13:04:24Z duplicate trigger) is in progress; the 13:12:50-53Z and 13:15:49-59Z review entries are skip-only fan-outs that gate out when they reach the slot.
- **#850 lane:** review `44529568915` success 13:18:27Z, verdict **approve** (R1-R36 green, 37 passed / 0 failed; the six lab-health call sites share one title-first selector anchored to the default branch). The approving review workflow posted the owner `/oc test` at 13:18:23Z and Tester `44532152403` is in progress since 13:18:26Z. **#854 lane:** lab `44529574302` in progress since 13:02:50Z. **#745 lane:** lab `44529576796` in progress since 13:02:51Z.
- **Wall death:** lab `44529581523` (#836) failed 13:03:45Z, `FreeUsageLimitError: Free usage limit reached` on `opencode/deepseek-v4.1-flash-free`, `retry-after: 39655` (~11h), no decision file. The quota intake posted the #70 note at 13:04:10Z.
- **Failures since 00:00Z:** exactly one (`44529581523`). No timed_out, no startup_failure.
- **Held (`action_required`) runs:** **none** (the nine former held runs completed success 12:53:56-12:55:47Z).
- **Pages:** production root 200 on `e5cd250c`; previews for #854/#859/#862 remain green.
- **Model registry:** **92 models, 12 free** at 13:16Z (`beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `hy4-flash-free`, `iceman-free`, `inkling-2-small-free`, `jev-1.13-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, `tidepool-alpha-free`). `glm-5.3-flash-free` absent; pin and `small_model` are `opencode/deepseek-v4.1-flash-free`; rung 2 live; ladder 2/3.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; the 20 live `name:` fields are those 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Curator:** last scheduled run `44477742504` 07:11:50Z; the ~13:11Z tick had not started by 13:16Z (GitHub schedule delay; not a crash). **Auditor:** last `44471789577` 06:23Z; next ~06:00Z tomorrow.
- **Workspace note:** in-session checkout is PR #859 head `d72d7ac9` (expected for this wake class); live head moved to `9b862e48` mid-run. No protected-path edits, no model edit, no branch commands, no `emergency.json`.

### Live lanes and their next step

- **#859 / #858 (Curator copy lane):** approved on `9b862e48`, Tester `44531572444` live. On a pass: `eval` in a later run, then the PAT merge sweep; #858 closes only on merge. Not a new project, so the daily shipping limit does not apply.
- **#862 / #861 (Curator copy lane):** fixed artifact-only on `0673248c`; fresh review queued from the 13:15:46Z forward. Ignore the stale duplicate `44529850597` if it reports on the pre-fix head. On an approve: `test`, then `eval` in a later run, then the PAT merge sweep; #861 closes only on merge.
- **#850 / #848 (protected-path lab lane):** approved on `9c9bf1bd7` (R1-R36 green); Tester `44532152403` live. On a pass: `eval` in a later run, then the PAT merge sweep, then `lab` on #849, then #857, then #856, then #860, one branch at a time; verify the `Closes #848` trailer at merge.
- **#854 / #803 (protected-path slice 3 + hardening):** lab `44529574302` with the full B1-B3/H1-H5 instruction. On a push: watch the forwarded review; verify each finding and the `Refs #853`/conditional `Closes #803` rewrite. Do not close #803 until all three slices land. `health-board.sh` is still absent on main.
- **#745 / #853 (orphaned audit/rebuild):** lab `44529576796` rebase retry with `Refs #853`, no `Closes`. On a push: verify with `git ls-remote`, dispatch exactly one fresh review, keep #853 open; delete the older bot review on the exact commit if present.
- **#836 (model/wall capacity):** the ladder + prompt-hygiene instruction is queued on the issue; the first lab run died on the wall. Re-dispatch only after the allowance clears, with a fresh registry read; verify three live `-free` rungs.
- **#821 / #823** (Point of Sale staging): parked by Priya. Do not dispatch.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after #745's verdict; #849/#857/#856/#860 after #850; #848 via #850; then #814, #812, #815, #774/#773, #831, #742.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Serialized queue (do not re-post these; all have a live or queued run)

1. #859 review round 2 (approved) and Tester `44531572444` (live) - do not post `test` again.
2. #862 fresh review from the 13:15:46Z forward (queued) plus the stale duplicate `44529850597` (in progress).
3. #850 review approved and Tester `44532152403` (live) - do not post `test` again.
4. #854 lab `44529574302` (in progress).
5. #745 lab `44529576796` (in progress).
6. #836 lab: wall-dead; re-arm only after the ~11h allowance clears.
7. After #850's Tester: `eval`, then the PAT merge sweep and `lab` on #849, #857, #856, #860; after #859's Tester: `eval`; after #862's approve: `test`; after #854's push: the forwarded review; after #745's push: one fresh review.

**Do not** re-post a trigger whose target already has a live or queued run, and do not post two lab triggers to the same PR in one run (the workflow dedupes by `(action, target)` within a run only).

## Loose ends

1. **#859's next gate is the Tester, then Evaluator.** The review verdict alone does not authorize a merge.
2. **#862's stale duplicate review:** `44529850597` started 13:12:55Z from the 13:04:24Z head-bound trigger. If it reports a fix verdict on `fe190ad0e`, that is not the new head's verdict; the fresh review after `0673248c` is authoritative.
3. **Wall watch:** the #836 death is the only failure; if a live lane also dies on `FreeUsageLimitError`, stand down the window and re-arm on the next wake. No same-IP dispatches.
4. **#855 is closed** as resolved; do not reopen it for the #856/#857/#860 code defects.
5. **Held runs:** zero. The approve sweep is clean; no sweep needed.
6. **#745 stale bot review:** after the fix-up, delete the older bot review on the exact commit id if present; filter by `commit_id`, not just author.
7. **#850's body** has `Closes #848`; normalize at merge, do not add a second trailer.
8. **#853's body chronology** needs one prepended "Update: ..." sentence once #745 lands.
9. **#849 scope mismatch:** its premise quotes the old body text; the expanded scope lives in #850's body. Add the expansion to #849's body first when #850 lands. #856/#857/#860 are separate siblings.
10. **The `INFRA-STATUS` block on #70** is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
11. **No merge this run:** no PR carries the full head-fresh Tester plus Evaluator chain.
12. **Curator tick:** due ~13:11Z, not started by 13:16Z; do not dispatch a manual curator run unless it crashes or the gap passes ~16h.
13. **Auditor schedule:** next daily tick ~06:00Z tomorrow. No dispatch.
14. **Quota wall:** retry-after ~11h from 13:03:45Z. One fresh-run attempt is the cap (#820/#836).
15. **Heartbeat:** this is not a heartbeat run. Keep the exact `Last updated:` stamp so the recover arm does not misfire.
16. **Model registry drift:** 92/12; `glm-5.3-flash-free` retired and rung 3 is dead; `jev-1.13-free` and `tidepool-alpha-free` are live untested alternatives. #836 is the fix lane.
17. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live.
18. **Stale prompt examples:** `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion; folded into the #836 instruction.
19. **Maintainer cron throttling:** the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
20. **Run wake ambiguity:** the maintainer gate skips `/oc` bodies except `/oc maintainer`, so this run was woken by the 13:10:53Z owner review prose, not the 13:10:57Z `/oc fix`; the latter created the cancelled sibling `44530925005`.

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
- The owner PAT is healthy again (verified 13:02Z and every post since). Never include a trigger token in a ping body (#775). The memory branch and the log may quote decisions, but public pings must not carry `eval-verdict:` markers or `/oc` tokens.
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
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526, the 2026-11-18 at 718, and the 2026-11-19 file carries the 02:39, 04:29, 10:45, 12:54, 13:03, and 13:18 entries. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
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

1. Read Tester `44531572444` (#859) and `44532152403` (#850), and the #862 re-review after `0673248c`, before any dispatch.
2. On #859's Tester pass: `eval` in a later run, then the PAT merge sweep; #858 closes on merge. Never merge on the reviewer verdict alone.
3. On #850's Tester pass: `eval` in a later run, then the PAT merge sweep (protected path), then `lab` on #849, #857, #856, #860 one branch at a time; #848 closes only on merge.
4. On #862's approve: `test`, then `eval` in a later run, then the PAT merge sweep; #861 closes on merge. Ignore the stale duplicate's pre-fix verdict.
5. On #854's push: verify B1-B3/H1-H5 and the `Refs #853`/`Closes #803` rewrite; keep #803 open until all three slices land.
6. On #745's push: verify with `git ls-remote`, dispatch one review, keep #853 open.
7. Re-dispatch the #836 ladder item only after the wall clears and with a fresh registry read; do not retry on the same runner.
8. If the wall took more runs, treat it as the #820 class: one bounded fresh-run attempt, then wait.
9. Verify the board invariant, allowlist count, model registry/ladder, Pages, and curator/auditor schedule health; if clean, stand by. Do not invent work and do not duplicate the #836 ping.

## Open questions

1. Will the Tester pass #859's copy-only change, and will the Evaluator chain complete before the wall reaches this runner pool?
2. Will the #862 re-review judge the new head `0673248c`, not the stale duplicate's pre-fix head?
3. Will #850's Tester and Evaluator pass the protected-path change, and will the PAT merge sweep land it cleanly?
4. Will #854's lab pass fit one round, or will the mutation harness plus the three fail-closed classes need a second?
5. Does the #745 branch still merge cleanly onto `e5cd250c`, and is its scope still distinct from #804?
6. Which free model becomes rung 3: `nemotron-3.5-lightning-free`, `beam-free`, `jev-1.13-free`, `longcat-2.5-free` (1M context), or `tidepool-alpha-free`?
7. When will the daily free-usage allowance reset enough to re-arm #836, and will the throttled maintainer cron resume a normal cadence without the recover heartbeat?
