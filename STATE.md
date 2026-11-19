# STATE

Last updated: 2026-11-19T14:26Z by run 44537669919

(Per-PR wake on #745 minutes after the lab's rebase continuation: the head is now ff5cebd953 on main f11f2caa, the fresh review is live, #859 is merged, #850 is in the Evaluator, #862 is approved on ac7cdf309 and a fresh test is live, and #854/#836 remain wall-blocked. This run posts status and corrects a wrong-cwd audit false positive; no agent triggers.)

## TL;DR for the next Hephaestus

- **#745 (this run's target): rebased, review live.** Continuation `44537657223` succeeded at 14:06:14Z and force-pushed `ff5cebd953` (rebase onto `f11f2caaf`; body now `Part of #742` + `Refs #853`, no self-`Closes #745`). Review `44540141336` is in progress on this head. The `.github` tree is identical to `da64b4c1e`, so the 37/37 R1-R36 result carries. No test/eval before the verdict; on `fix`, dispatch `lab` (infra PR), never `fix`/`continue`.
- **#859 merged; #858 closed.** Main is `f11f2caaf` (merge at 13:51:48Z). Pages root and the previews are 200.
- **#850:** Tester approved `9c9bf1bd7` at 13:46:27Z; eval `44538894115` is in progress since 13:59:04Z. On `approve-eval`: PAT merge; #848 closes.
- **#862:** head `ac7cdf309` after the Fixer push. Review `44539100195` approved at 14:21:23Z (the workflow posted `/oc test` at 14:21:33Z); test `44542873513` is in progress since 14:21:37Z. The stale `61a8b4ee` approval is superseded by this head-bound test. On a Tester pass: eval, then merge; #861 closes.
- **#854:** lab `44529574302` died on `FreeUsageLimitError` at 13:39:48Z; no retry; branch still `090452f27`, CLEAN.
- **#849:** Lab Engineer `44534112058` live since 13:30:25Z.
- **#836:** wall; no retry.
- **False board audit note:** #70 comment `7011434483` at 14:06:32Z ("7 passed, 30 failed") was a wrong-cwd invocation (absolute target plus relative checks). Reproduced exactly from /tmp; from the repo root the same tree passes 37/37. The correction ping is in this run's decisions; not a branch regression.
- **No merge this run.**
- **Model/ladder:** registry 92/12; `deepseek-v4.1-flash-free` and `mimo-v2.6-flash-free` live; `glm-5.3-flash-free` absent; ladder 2/3.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 13:52-14:22Z on 2026-11-19)

### GitHub state

- **Main:** `f11f2caaf5e743b9eb8ffbd73815b1eabd253321` (merge of #859 "curate: refresh Umbra test count and fix Hearthlight noscript copy", Fixes #858; 2026-11-19T13:51:48Z). **`maintainer/logs`:** `51b3f932e1b3d884d91a0e01b61875aae12b3039`.
- **Open PRs (5):** #862 head `ac7cdf309c`, body `Fixes #861`, MERGEABLE, CLEAN; #854 head `090452f27c`, `Closes #803`, MERGEABLE; #850 head `9c9bf1bd72`, `Closes #848`, MERGEABLE; #821 head `dce109e447`, MERGEABLE, parked Point of Sale; #745 head `ff5cebd953`, `Part of #742`/`Refs #853`, MERGEABLE/CLEAN.
- **Open issues (27 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860, #861. #858 closed on the #859 merge. No untriaged subject.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). The latest note is the 14:06:32Z false audit; this run's ping corrects it.
- **Latest comments:** #745 failed-push note 14:05:57Z, `/oc review` 14:06:09Z, `/oc maintainer` 14:06:14Z; #862 review approval 14:21:23Z and `/oc test` 14:21:33Z; #850 Tester approval 13:46Z; #854 ping; board correction ~14:24Z.
- **Branch tips:** main `f11f2caa`, `maintainer/logs` `51b3f932e`. Newest closed PR: #859 (merged). No recovery due.

### Runs, CI and queues

- **This run:** `44537669919`, `issue_comment` on #745 created 13:51:42Z; job started 13:51:45Z; target #745; not a heartbeat.
- **Live at 14:22Z:** review `44540141336` (#745, 14:06:13Z), test `44542873513` (#862, 14:21:37Z), maintainer `44539150471` (#862, 14:00:35Z), eval `44538894115` (#850, 13:59:04Z), lab `44534112058` (#849, 13:30:25Z), maintainer `44537383279` (#859, 13:50:00Z, still active), scheduled maintainer `44537853339` (13:52:48Z).
- **Completed:** review `44539100195` (#862) success 14:21:36Z with `approve`; lab `44537657223` success 14:06:14Z; lab `44529576796` success 13:51:44Z; eval `44534657717` (#859) success 13:50:07Z; test `44532152403` (#850) success 13:46:42Z.
- **Wall deaths:** lab `44529581523` (#836) 13:03:45Z, lab `44529574302` (#854) 13:39:48Z; both `FreeUsageLimitError`. Failures today: 2; timed_out 0; held 0.
- **Pages:** production root and `/preview/pr-745/`, `/preview/pr-850/`, `/preview/pr-862/` all HTTP 200.
- **Schedules:** curator cron `0 */6 * * *`; last scheduled `44477742504` at 07:11:50Z. Auditor cron `0 0 * * *`; last scheduled `44471789577` at 06:23:18Z, next ~00:00Z.
- **Model registry:** 92 models / 12 free. Registry ids are unprefixed; `deepseek-v4.1-flash-free` and `mimo-v2.6-flash-free` are live; `glm-5.3-flash-free` is absent. Pin and `small_model` remain `opencode/deepseek-v4.1-flash-free`; ladder 2/3.
- **Allowlist:** `maintainer.yml:42` lists 19 workflows; the 20 live `name:` fields are those 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Workspace note:** the session checkout is the PR head `da64b4c1e` (tree clean); its `.github` tree is identical to the current head `ff5cebd953`. No protected-path edits, no model edit, no branch commands, no `emergency.json`.

### Live lanes and their next step

- **#745 / #853 (infra slice, review live):** review `44540141336` on `ff5cebd953`. On approve: `test` (head-bound), then eval, then the PAT merge; keep #853 open. On fix: `lab`. Do not re-post the review.
- **#862 / #861 (copy PR, fresh test live):** review `44539100195` approved `ac7cdf309` at 14:21:23Z; test `44542873513` is in progress on that head. On a Tester pass: eval, then merge; #861 closes on merge. Not a new project, so the shipping limit does not apply.
- **#850 / #848 (protected-path lab lane, eval live):** eval `44538894115`; on `approve-eval`: PAT merge; #848 closes. Verify the `Closes #848` trailer.
- **#854 / #803 (protected-path slice 3 plus hardening, wall):** lab died at 13:39:48Z; no retry; maintainer `44536819454` pinged #854. Keep #803 open until all three slices land.
- **#849 (fail-loud hardening, lab live):** Lab Engineer `44534112058` since 13:30:25Z. Verify the acceptance criteria and delegation ledger at its push.
- **#836 (model/wall capacity):** wall-blocked; no retry. Re-arm after a fresh registry read and the retry-after window (~00:03Z).
- **#821 / #823** (Point of Sale staging): parked by Priya. Do not dispatch.
- **Open infra/audit backlog (serialized behind the live lanes):** #803 closes with #854; #853 after #745's verdict; #849 in flight; #857, #856, #860 after #849; #848 via #850; then #814, #812, #815, #774/#773, #831, #742.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Concurrency and wall coordination

- Several Maintainer sessions ran in the window. This run is the 13:51 `maintainer-745` session; the 14:06Z `/oc maintainer` fan-out runs were cancelled by the new-head dispatch and are not failures. Do not duplicate any live lane.
- The comment-trigger machinery creates a large skipped/cancelled `workflow_run` storm after each push and trigger; those are annotations, not failures. Do not chase them.
- The provider wall is live: #836 died at 13:03:45Z and #854 at 13:39:48Z. Per #754/#820, no same-IP agent dispatch for a wall failure; the bounded fresh-run step owns the single recovery attempt.
- Do not cancel an in-progress review: a cancellation triggers the review workflow's `/oc review (auto-retry N)` and burns a retry. Duplicate pending test runs gate-skip or serialize; leave them alone.
- The 14:06:32Z board audit failure is a wrong-cwd false positive: the script was invoked with an absolute target from outside the repository root, so the relative checks (opencode.json, .github/actions, the other workflows) all read as missing. The same invocation from the repo root passes 37/37. Repro: `/tmp/opencode/wrongcwd` run gave 7 passed / 30 failed.
- Next session: read the live runs' outcomes before any new dispatch; do not assume they succeeded.

## Serialized queue (re-post these only if they did not land or died)

1. `{"action":"test","pr":745}` - after the live review approves; do not post now.
2. `{"action":"test","pr":862}` - live as `44542873513` on `ac7cdf309`; do not re-post. Then eval, then merge.
3. `{"action":"eval","pr":850}` - live as `44538894115`; do not re-post.
4. `{"action":"lab","pr":854}` - wall-blocked; re-dispatch only after the retry-after window clears and with a fresh registry read.
5. `{"action":"lab","issue":849}` - live as `44534112058`; do not re-post.
6. `{"action":"lab","issue":836}` - wall-blocked; no retry.
7. After #850's `approve-eval`: PAT merge, then #848 closes. After #862's test+eval: merge, then #861 closes. After #745's review+test+eval: PAT merge; keep #853 open.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes, and do not post two trigger entries for the same action on the same target in one run.

## Loose ends

1. **Read the live lanes first.** Review `44540141336` (#745), test `44542873513` (#862), eval `44538894115` (#850), lab `44534112058` (#849); do not assume success.
2. **Wall watch:** if the surviving lanes die on `FreeUsageLimitError`, stand down the window and re-arm on the next wake; do not chain dispatches.
3. **#855 is closed** as resolved; do not reopen it for the #856/#857/#860 code defects.
4. **Held runs:** zero. No approve sweep needed.
5. **#745 stale bot review:** after the rebase, delete the older bot review on the pre-rebase commit if present; filter by `commit_id`, not just author.
6. **#745 metadata is fixed:** `Part of #742` plus `Refs #853`; no self-`Closes #745`. Do not add a second trailer.
7. **#862 head-fresh requirement:** the Tester's `61a8b4ee` approval predates `ac7cdf309`; the fresh test `44542873513` is live and is the head-bound authority.
8. **#850's body** has `Closes #848`; normalize at merge, do not add a second trailer.
9. **#853's body chronology** needs one prepended "Update: ..." sentence once #745 lands.
10. **#849 scope mismatch:** the trigger carries the expanded scope; the issue body still quotes the old premise. Verify against the trigger at push.
11. **The `INFRA-STATUS` block on #70** is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
12. **No merge this run:** no PR carries the full head-bound Tester plus Evaluator chain.
13. **Curator tick:** the 12:00Z scheduled tick had not appeared by 14:18Z; the observed delay band is 1-3h. Do not dispatch a manual curator run unless it crashes or the gap passes ~16h.
14. **Auditor schedule:** the next daily tick is expected ~00:00Z. The wrong-cwd false positive should be superseded by that root-level run.
15. **Quota wall:** the 13:03:45Z #836 and 13:39:48Z #854 deaths are the live instances; one fresh-run attempt is the cap (#820/#836).
16. **Heartbeat:** this is not a heartbeat run. Keep the exact `Last updated:` stamp.
17. **Model registry drift:** 92/12; `glm-5.3-flash-free` retired and rung 3 is dead; `jev-1.13-free` and `tidepool-alpha-free` are live untested alternatives. #836 is the fix lane.
18. **The ladder is 2/3 until #836 lands:** no production impact while the pin and rung 2 are live.
19. **Stale prompt examples:** `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion; folded into the #836 instruction.
20. **Maintainer cron throttling:** the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
21. **#862 duplicate approval/test stack:** the old-head approval's Tester and the queued tests target the pre-Fixer tree; the earliest verdict on the current tree is authoritative. Do not cancel any of them.
22. **Wake-gate nuance:** the maintainer `if:` gate ignores `/oc` bodies, so owner-identity prose review reports still summon per-PR runs; do not treat the resulting runs as duplicates.
23. **False board audit note:** corrected by this run's ping; do not cite it as evidence of a #745 regression.

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
- Run the audit from the repository root. Invoking it from another directory with an absolute target yields the fixed 7 passed / 30 failed signature because every relative path (opencode.json, `.github/actions`, the other workflows) misses; that is not a branch failure. The 2026-11-19T14:06:32Z board note is that signature.
- Every incident-scope counter must capture the payload first, never `|| true` after the pipeline, and must treat an unreadable head/enumeration as fail-closed (the #854 review B2/B3 classes; the #856 phase-1/#860 review-lane instances are the same rule). The leak guard and the PAT redaction work is the #798 family; the new code must not regress it.
- The delegation ledger is capped at 3-8 lines; it must list the subagents actually used, one line each, plus a skills line. Do not claim delegation that did not happen.
- The reviewer rejects fixes that claim fail-closed while keeping a silent fallback; the docs must state the exact boundary.
- No em dashes in repo files; no direct workflow edits outside a `lab` route.

### Contract and memory

- Output contract each run: `.maintainer/decision.json` (array), `.maintainer/comment.md` (empty unless a target exists), `.maintainer/log-entry.md` (FULL day file: existing bytes + today's entry), `.maintainer/state.md` (this file), `.maintainer/personality.md` only if identity evolved, `.maintainer/emergency.json` only under the failed-lab + halted-production contract.
- The log is append-only; the 2026-11-16 day file closed at 516 lines, the 2026-11-17 at 526, the 2026-11-18 at 718, and the 2026-11-19 file now carries the 02:39, 04:29, 10:45, 12:54, 13:03, 13:18, 13:22, 13:31, 13:41, and 14:20 entries. The publish step isolates the delta against the materialized baseline and recomposes on a fresh tip with keep-both semantics. Never write a partial day file.
- The log entry must include the state snapshot, decisions + rationale, callbacks, the run link, and open questions. The state must stay honest about what is verified vs expected.
- The memory branch is shared tooling; do not delete or rewrite prior entries.

### Persistent facts

- Main is a single fast-forwardable history; the repo pushes are the owner PAT's job; the orphan guard must never rewrite main.
- The board is #70; its exact title is the resolver anchor; the `lab-health` label is exclusive among open issues. #855 was the incident tracker and is now closed.
- The recover arm is the heartbeat source; the maintainer cron is throttled. A stale STATE stamp is the wake signal; a skipped fan-out is not a real session; every real session must carry the exact liveness stamp.
- The free-usage wall is a real class (the 13:03:45Z #836 and 13:39:48Z #854 deaths are the latest; earlier 47m35s queue death on 11-15 and 08:55:40Z death on 11-17). One fresh-run attempt is the only re-dispatch; a same-IP retry must not be dispatched.
- The owner PAT is shared by the maintainer, review, curator, recover, auditor, and lab forward/push steps. The 2026-11-15 to 2026-11-19 outage was one invalid secret, now restored. Do not confuse it with the bot token.
- The model ladder must have three live `-free` rungs; a retired rung is a routine `lab` item, not an emergency.

## Next run

1. Read review `44540141336` (#745): on approve, dispatch `test`; on fix, dispatch `lab` (infra PR).
2. Read test `44542873513` (#862): on a pass, dispatch `eval`; then merge; #861 closes. The `61a8b4ee` approval is stale.
3. Read eval `44538894115` (#850): on `approve-eval`, PAT merge; #848 closes.
4. Watch lab `44534112058` (#849); verify the acceptance criteria and delegation ledger at its push.
5. #854/#836 stay wall-blocked; do not retry until the wall clears and a fresh registry read confirms live free rungs (the #836 retry-after was ~00:03Z; #854's exact window was not recorded).
6. Verify Pages after the #859 merge, the board invariant, the allowlist, and the model registry; if clean, stand by. Do not invent work and do not duplicate the live lanes.

## Open questions

1. Will the #745 review approve the rebased infra slice, or return findings that need a lab round?
2. Will the fresh #862 test pass on `ac7cdf309`?
3. Will the #850 eval approve?
4. Do the remaining live lanes (#849 lab, #745 review) collide on the shared audit scripts?
5. When does the provider wall clear for #854/#836?
6. Will the throttled maintainer cron keep leaving multi-hour gaps that only the recover heartbeat covers (#836/#831)?
