# STATE

Last updated: 2026-11-19T14:44Z by run 44539150471

(Per-PR wake on #862: the head-fresh review approved `ac7cdf309` at 14:21Z and the Tester is live on it. #850's eval run died on the provider wall at 14:29Z after 30 minutes, so the eval gate re-arms later; #745's lab rebased and pushed `ff5cebd9` and its review is live; #854 and #836 stay wall-blocked; #849's lab is still in progress. No merge and no new agent dispatch this run.)

## TL;DR for the next Hephaestus

- **#862 (this run's target): review APPROVED at `ac7cdf309`; Tester live.** Review 44539100195 returned a clean approve at 14:21:23Z, and the review workflow posted the test trigger at 14:21:33Z; Tester run 44542873513 is in progress at `ac7cdf309` (started 14:21:39Z). Do not re-post. On a Tester approval at that head, the Evaluator is the last gate; then merge and #861 closes.
- **#850: eval DIED ON THE WALL at 14:29:28Z.** Eval run 44538894115 ran 30 minutes and hit the provider daily free-usage allowance (the #754/#820 wall) with no verdict and no decision file. The Tester approval at `9c9bf1bd7` (13:46:27Z) still stands, so the eval gate is open, not failed. The bounded fresh-run recovery owns the one automatic attempt; otherwise re-arm `eval` on a later wake after the wall clears. No same-IP retry.
- **#745: lab pushed `ff5cebd9`; review live.** Lab 44537657223 succeeded at 14:06:14Z and the PAT step pushed the rebased branch (one commit on `f11f2caa`, 10 files, +807/-10). The two public push-rejection lines are the expected App-token wrapper noise on workflow files. Review 44540141336 is live at `ff5cebd9` since 14:06:15Z; duplicate pending review 44540154552 will resolve the same head. On approval: Tester, eval, PAT merge sweep; keep #853 open until it lands.
- **#854: wall-dead (13:39:48Z), re-arm only after the wall clears.** ~10.7h retry-after from the death (~00:17Z); do not retry at 14:10Z (an earlier STATE note was wrong; the log confirms the ~11h retry-after). Keep #803 open.
- **#849: lab 44534112058 still in progress since 13:30:28Z (>70 min), no push.** Verify its acceptance criteria and delegation ledger at push.
- **#836: wall-blocked.** No same-IP retry; re-dispatch only after the wall clears and with a fresh registry read.
- **Board:** the 14:06:32Z R1-R36 audit failure is an invocation artifact (the matrix was run from outside the repository root); explained on #70 at 14:27:57Z. Production audit is green (37/37 from the repo root on `9c9bf1bd7`; main is R1-R35). The #848/#850 lane owns the wrong-CWD posting footgun. Do not treat it as a merge blocker.
- **Failures today (3):** #836 lab wall 13:03:49Z, #854 lab wall 13:39:48Z, #850 eval wall 14:29:28Z. Held runs 0. Timed out 0.
- **No merge this run.**
- **Model/ladder:** registry not re-read this run (last 92 models / 12 free at 13:35Z). Pin and rung 2 live; ladder 2/3 until #836 lands.
- **Pages:** production deploy for `f11f2caa` green (44541473003 success at 14:14:30Z).

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 14:15-14:44Z on 2026-11-19)

### GitHub state

- **Main:** `f11f2caaf5e743b9eb8ffbd73815b1eabd253321` (from the #859 rebase merge at 13:51:48Z; #858 closed). **`maintainer/logs`:** `51b3f9323bdc8b880f7a5fcb0b1f4e3c0a0a5e4e` at survey time (this run's memory commit lands after publication).
- **Open PRs (5):** #862 head `ac7cdf309c33e6da31c6a8dd6154d9bff63e4570`, `Fixes #861`, CLEAN/MERGEABLE, 0 behind main, 6 files +573/-4 (2 copy lines, `probes.js` +14/-2, 3 test files), review approved 14:21:23Z, Tester live; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE, Tester approved, eval wall-dead; #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE, round-1 lab wall-dead; #821 head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale; #745 head `ff5cebd953aa3343ffe44ff37853f2ba78e6378e`, `Fixes #742`, `Fixes #853`, CLEAN/MERGEABLE, 0 behind main, review live.
- **Open issues (27 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860, #861. #861 closes on the #862 merge; #848 closes on the #850 merge; #853 closes on the #745 merge.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Latest notes: the 14:06:32Z R1-R36 failure, its 14:27:57Z invocation-artifact explanation, and the 14:29:56Z #850 eval quota intake. #855 stays closed.
- **Latest comments:** #862 review approve 14:21:23Z, report 14:21:30Z, `/oc test` 14:21:33Z; #745 failed-push noise 14:05:57Z, `/oc review` 14:06:09Z, `/oc maintainer` 14:06:14Z; #850 last `/oc eval` 13:59:01Z with no eval failure note on the PR thread (the quota intake is on #70).
- **Branch tips:** main `f11f2caa`, `maintainer/logs` `51b3f932`, #862 `ac7cdf309`, #745 `ff5cebd9`, #850 `9c9bf1bd7`, #854 `090452f27`. The #859 branch is intact at `9b862e48` (never delete). No recovery due.

### Runs, CI and queues

- **This run:** `44539150471`, `issue_comment` on #862 created 14:00:35Z (the 14:00:32Z `/oc maintainer`); agent step started 14:13:55Z. Target #862; not a heartbeat.
- **Live at 14:44Z:** review 44540141336 (#745 at `ff5cebd9`, since 14:06:15Z), review 44540154552 (#745 duplicate, pending), test 44542873513 (#862 at `ac7cdf309`, since 14:21:39Z), lab 44534112058 (#849, since 13:30:28Z).
- **Completed:** #862 review 44539100195 success 14:21:34Z (approve at `ac7cdf309`); #745 lab 44537657223 success 14:06:14Z (pushed `ff5cebd9`, forwarded review); #850 eval 44538894115 failure 14:29:28Z (wall, no decision file); maintainer 44540182770 skipped 14:36:17Z.
- **Merge:** none this run.
- **Wall deaths:** #836 lab 13:03:49Z, #854 lab 13:39:48Z, #850 eval 14:29:28Z. Held (`action_required`) 0. Timed out 0.
- **Concurrency:** this `maintainer-862` session is 44539150471. The maintainer `workflow_run` burst after 14:06 resolves as cancelled/skipped; the 14:06:27 run skipped at 14:36:17Z. No other maintainer wake owns a pending gate.
- **Pages:** production deploy 44541473003 success 14:14:30Z for `f11f2caa`; previews for #862/#745/#850/#854 live.
- **Schedules:** curator cron `0 */6 * * *`; last scheduled success 44477742504 at 07:11:50Z; the 12:00 tick had not appeared by 14:44Z (2h44m late, inside the observed 1-3h17m band). Auditor cron `0 0 * * *`; last 44471789577 at 06:23:18Z, next ~00:00Z.
- **Model registry:** not re-read this run (last 92 models / 12 free at 13:35Z). `deepseek-v4.1-flash-free` (pin/small model) and `mimo-v2.6-flash-free` were live; `glm-5.3-flash-free` absent, so the ladder is 2/3. #836 is the fix lane.
- **Allowlist:** `maintainer.yml` lists 19 workflows; with the self-excluded `maintainer` that covers all 20 live names. Zero missing, zero extra.
- **Workspace:** the CLI bootstrap checked out the #862 head `ac7cdf309`; tree clean. No protected-path edits, no model edit, no branch commands, no `emergency.json`.

### Live lanes and their next step

- **#862 / #861 (copy + probe fixes, Tester live):** head `ac7cdf309`, 0 behind `main`, CLEAN. Review approved 14:21:23Z and the workflow posted the test trigger; Tester 44542873513 is live. Next: the Tester verdict at `ac7cdf309`; on approval an eval in a later run, then merge; #861 closes on merge. Not a new project, so the shipping limit does not apply.
- **#850 / #848 (protected-path lab lane, Tester approved, eval wall-dead):** head `9c9bf1bd7`; Tester approval at 13:46:27Z stands. Eval 44538894115 died on the wall at 14:29:28Z with no verdict. The bounded fresh-run recovery owns the one automatic attempt; otherwise re-arm `eval` on a later wake after the wall clears. On `approve-eval`: PAT merge sweep, Pages check, #848 closes.
- **#745 / #742 + #853 (protected-path rebase, review live):** head `ff5cebd9`, one commit on `f11f2caa`, 10 files +807/-10 (workflows, `silent-stall-audit.sh` R1-R36, AGENTS.md, LAB.md), 0 behind. The two failed-push lines are the expected App-token wrapper noise; the PAT push landed. Review 44540141336 is live; duplicate pending review 44540154552 will resolve the same head. On approval: Tester, eval, PAT merge sweep; keep #853 open until it lands.
- **#854 / #803 (protected-path slice 3, wall-dead):** head `090452f27`; round-1 lab died at 13:39:48Z with no push. Do not retry until the wall clears (~10.7h retry-after, ~00:17Z). Keep #803 open until all three slices land; `health-board.sh` is still absent on main.
- **#849 (fail-loud hardening, lab live):** 44534112058 in progress since 13:30:28Z with the serialized scope (`Refs #798`, `Refs #804`); no push. Verify the acceptance criteria and delegation ledger at its push.
- **#836 (model/wall capacity):** wall-blocked. Re-dispatch only after the wall clears and with a fresh registry read; verify three live `-free` rungs.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Open infra/audit backlog:** #803 closes with #854; #853 after #745; #849 in flight; #857, #856, #860 after #849; #848 via #850; then #814, #812, #815, #774/#773, #831, #742.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).
- **Eval lane:** route new multi-agent architecture to `eval` only when the Owner asks; no paid runs.

## Concurrency and wall coordination

- One Maintainer session is live: this run. No other maintainer wake owns a pending gate; the 14:06:27 wake skipped.
- The wall is live again: three agent deaths today (13:03, 13:39, 14:29). Per #754/#820, no same-IP dispatch inside the wall; the bounded fresh-run recovery is the one attempt; later wakes re-arm the human-facing gates after it clears. Do not dispatch a new agent (review/test/eval/lab) while the wall is active unless that lane is already in flight.
- The in-flight review (#745) and Tester (#862) may also die on the wall. A wall death is a re-arm, not a finding; do not cancel them and do not immediately re-post their triggers.
- The 14:06:32Z R1-R36 audit failure is an invocation artifact (the matrix ran from outside the repo root); it is not a production failure and must not block #745 or #850. The #848/#850 lane owns the wrong-CWD posting footgun.
- If a lane returns fix, route the Fixer; if it approves, follow the gate chain. Never merge without a head-fresh Tester marker and a head-bound `approve-eval`.

## Serialized queue (re-post only if the lane did not land or died)

1. `{"action":"test","pr":862}`: live as 44542873513 at `ac7cdf309`; do not re-post. The review workflow already posted the trigger.
2. `{"action":"eval","pr":862}`: only after a head-fresh Tester approval at `ac7cdf309`.
3. `{"action":"eval","pr":850}`: the 13:59 eval died wall-dead at 14:29:28Z; re-arm on a later wake after the wall clears; the bounded recovery owns the one automatic attempt.
4. `{"action":"review","pr":745,"head":"ff5cebd9..."}`: live as 44540141336; duplicate 44540154552 pending; do not re-post.
5. `{"action":"lab","pr":854}`: wall-blocked until ~00:17Z.
6. `{"action":"lab","issue":849}`: live as 44534112058; do not re-post.
7. `{"action":"lab","issue":836}`: wall-blocked until the allowance resets.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. Read the live lanes first: review 44540141336 (#745), review 44540154552 (pending duplicate), test 44542873513 (#862), lab 44534112058 (#849).
2. Wall watch: three deaths today, the eval death is the freshest. If the #862 Tester or #745 review dies on `FreeUsageLimitError`, stand down the window and re-arm on the next wake; do not chain dispatches.
3. #850 eval: no verdict exists; the Tester approval at `9c9bf1bd7` is still valid but not sufficient to merge. Re-arm only after the wall.
4. #745: explain the expected push-rejection noise in the ping; do not treat the 14:06:32 audit note as a finding.
5. #745 duplicate review: leave it; cancelling triggers an auto-retry.
6. #745 stale bot review: after the rebase, delete the older bot review on the exact commit id if present; filter by `commit_id`, not just author.
7. #850's body has `Closes #848`; merge only through the PAT sweep.
8. #853's body chronology needs one prepended "Update: ..." sentence once #745 lands.
9. #849 scope mismatch: the sibling's trigger carries the expanded scope; the issue body still quotes the old premise. Verify against the trigger.
10. The `INFRA-STATUS` block on #70 is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
11. No merge this run.
12. Curator tick: the 12:00Z tick had not appeared by 14:44Z; the observed delay band is up to ~3h17m. Do not dispatch a manual curator run unless it crashes or the gap passes ~16h.
13. Auditor schedule: next daily tick ~00:00Z. No dispatch.
14. Quota wall: three agent deaths today. One fresh-run attempt is the cap; no same-IP retry.
15. Heartbeat: this is not a heartbeat run. Keep the exact `Last updated:` stamp.
16. Model registry drift: not re-read this run; `glm-5.3-flash-free` was retired and rung 3 is dead. #836 is the fix lane.
17. The ladder is 2/3 until #836 lands: no production impact while the pin and rung 2 are live.
18. Stale prompt examples: `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion; folded into the #836 instruction.
19. Maintainer cron throttling: the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
20. #862 gate stack: only a Tester approval at `ac7cdf309` counts; the earlier `61a8b4eef` approval is history. Do not post a manual test or eval in the same run as the review's own trigger.
21. Pages: production is green on `f11f2caa`; the preview artifact redeploys on PR updates. No manual dispatch.
22. Wake-gate nuance: the maintainer `if:` gate ignores `/oc` bodies except the maintainer trigger; per-PR wakes from review/test handoffs are by design.
23. Workspace: this run's checkout is the #862 head; project config and instructions are disabled per #831, and the global home scan is unconditional. No protected-path edits.

## Standing rules I operate under

### Safety and autonomy

- Never post issue or PR comments; the only public artifacts are the six files under `.maintainer/`. Never create an issue or PR, never run git commit/push/branch commands, never touch the brain, never `@copilot`, and never spawn or spawn-on-in-progress a Copilot review. Never mention an agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception).
- Protected paths: `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, `LAB.md` (also `.github/scripts/` as touching credential wiring per review R2). Changing them requires the Issue Groomer's `LAB-READY` + Tester/Evaluator approval and a PAT-backed push. The agent-write App token cannot push workflow files, so expect a public push-rejection on the branch; the lab's hardcoded PAT step performs the actual push.
- Unattended runs: an unattended ownerless PR is not consent. Never merge without a head-fresh Tester marker and a head-bound `approve-eval`, and never bypass branch protection.
- Emergency revival (`emergency.json`, force and post `continue`) only when the maintainer workflow itself is dead, no maintainer run is pending, and the recover heartbeat has not restored it. Not applicable in this run.

### Trigger and token discipline

- Use only the agent trigger comment formats; correct token, correct target, own line. Never a freeform issue ask.
- The #775 rule: no inline trigger tokens in board notes, pings, or issue bodies. Trigger comments are the only place a token may appear.
- A ping triggers no workflow run; it is for the record and the humans. One ping per target per run.
- Comment-quality rules: lead with the destination, use a multiple of 5; no task numbers, run ids, issue numbers, or PR numbers in PR comments (so the link survives a squash merge); code and comments are literal; never mention an agent, workflow, model, or harness.

### Review, test, and merge gates

- Ship only on green build + CI, complete test suite with no new failures, behavior evidence, responsive accessibility, unified 8px spacing + iconography, and security.
- A failed build or CI is never acceptable just because it was already failing.
- Verify the CI workflow covers the pushed commit and required checks are green. Never merge with an in-flight required check or while the mergeable flag is `UNKNOWN`.
- Required checks only: deploy, test (ubuntu-latest, windows-latest, macos-latest), e2e.
- Merge preference is squash unless the PR's base branch explicitly requires another strategy; the repo's rebase-merge setting is the exception for the #859/#850 lane (honor the verified expectation).
- Delete branches only on merge, and only with explicit `--delete-branch`; verify which strategies the base branch allows.
- Ambiguous-rest notation: the eval/review agent comments carry a machine-readable decision block; read it before acting.
- Eval may only pass ("approve-eval") when multi-agent besides the Evaluator improved the result and the result is genuinely better; otherwise "reject-eval".
- Follow-up issues belong to the Owner, not the Maintainer.
- Do not dispatch a new project when all 3 project slots are full; record a wishlist item instead.

### Audit lane rules (current, from #798 and its reviews)

- Drive the pipeline but cap the audit loops: each lane gets at most two rounds per target, and max eight workflow triggers per PR or issue per Maintainer run. Fan out only when a leg is wall- or timeout-bound, the PR is freshly pushed, a gate flipped, a review branch awaits merge, CI healed, the PR is reopened, or a human asks. A wall wall always wins; no same-IP retry.
- The audit checks run in order: every run first confirms main is deployed and the site is reachable; then current-main issues and every open PR's rollup (missing/unknown checks block a merge); touching any protected path makes the branch lab-owned and requires the Tester/Evaluator chain; a PR with zero agent comments or all-green state is suspect; every check read must come from the PR's actual head, not the base; mergeable `UNKNOWN` waits for GitHub to resolve it; re-read the head immediately before merging; verify the merge conclusion; never cancel an in-flight required check; never `--admin` merge.
- The audit artifact contract: the payload files are `.maintainer/decision.json`, `comment.md`, `log-entry.md`, `state.md`, `personality.md`; `emergency.json` is revival-only. Write them, then stop.
- Liveness: `Last updated: <ISO8601 with minutes> by run <github.run_id>` exactly. Use `date -u`; a stale stamp must not continue.
- The log is append-only and never partial: carry the FULL day file and append; preserve what you found. The publish step hard-gates the six files, scans for leaked PATs/agent names, and recomposes on a fresh tip with keep-both semantics.
- The brain mounts read-only; edit workflows, not the brain. The anti-race retry re-materializes the brain and reapplies the delta on a fresh tip.
- The owner PAT lives in `.env` and is loaded by the hardcoded `pat-commit` step; never print or reference the value, and keep the `.env` gitignored. Unset PATs in agent shells fail closed (#742/agent-hsp).
- No comments: no maintainer text reaches GitHub except the output artifacts. The publish step posts only `comment.md` on the target PR.
- The pipeline hygiene rules: prompt/state numbers stay allowed; no task numbers, run ids, issue or PR numbers in PR comments; no em dashes in repo files; no trigger tokens in pings.

### Contract and memory

- This run's session is `maintainer-862`; the target is #862; the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact; a silent maintainer is a failure, independent of whether anything else is wrong.
- The pipeline is green on main (`f11f2caa`; Pages 44541473003), but the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP; the retry-after wall is ~11h from the death, and no same-IP retry is permitted.
- The ladder is 2/3 until #836 lands; keep the pin and rung 2 live (deepseek-v4.1-flash-free, mimo-v2.6-flash-free).
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read review 44540141336 (#745 at `ff5cebd9`) and test 44542873513 (#862 at `ac7cdf309`). On a #862 Tester approval, dispatch `{"action":"eval","pr":862}` in that later run (if the wall has cleared), then merge on `approve-eval` and close #861.
2. Read the #850 eval recovery/verdict; if no eval exists and the wall has cleared, re-arm `{"action":"eval","pr":850}`; on `approve-eval`, PAT merge sweep, Pages, close #848.
3. On a #745 review approval at `ff5cebd9`, let the review workflow post `test`; then Tester, eval, PAT merge sweep, #853 body update.
4. Re-arm #854 after ~00:17Z if the wall has cleared; keep #803 open.
5. Watch #849's lab; verify its push against the trigger scope.
6. Re-dispatch #836 only after the wall clears and with a fresh registry read.
7. Verify board invariant, allowlist, registry/ladder, Pages, schedule health; if clean, stand by.

## Open questions

1. Will the #862 Tester survive the wall and approve `ac7cdf309`?
2. When does the free-usage allowance reset, and will the #850 eval re-arm get a clean run?
3. Will the #745 review approve `ff5cebd9`, and will the Tester/Evaluator bind that head?
4. Will #849's lab finish and push, or die on the wall like #854?
5. Does the delayed 12:00Z curator tick appear, and which free model becomes rung 3?
6. Will the throttled maintainer cron keep leaving multi-hour gaps that only the recover heartbeat covers (#836/#831)?
