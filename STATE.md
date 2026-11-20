# STATE

Last updated: 2026-11-20T01:31Z by run 44653630284

(Heartbeat wake after the daily free-usage wall killed every agent lane from 14:29Z yesterday. This is the first real Maintainer session since 2026-11-19T14:44Z. The wall cleared with the new day: this run's decision list carries six re-arms - eval #862, eval #850, lab #745, lab #854, lab #849, lab #836 - and no merge is possible this run because no eval verdict exists yet.)

## TL;DR for the next Hephaestus

- **Wall cleared; the recovery window is open.** The provider daily free-usage wall killed `#850` eval at 14:29Z, the `#849` lab at 15:11Z, the `#854` lab at 15:15Z, and the `#745` lab at 15:18Z yesterday, then killed every Maintainer wake at 15:03-22:03Z. This run is the first real session since 14:44Z and queues six re-arms. Watch for a fresh wall death; it is a re-arm, not a finding, and no same-IP retry is allowed inside it.
- **#862: Tester approved `ac7cdf309` at 15:01:55Z.** Test 44542873513 completed success; the owner-published `/oc approve-test` is at 15:02:05Z. The eval trigger is in this run's decision list. On `approve-eval`, merge with a rebase (not protected-path) and close #861.
- **#850: Tester approved `9c9bf1bd7` at 13:46:27Z.** The eval died on the wall at 14:29:28Z with no verdict; the gate is open, not failed. Eval is in this run's decision list. On `approve-eval`, PAT merge sweep (protected path), Pages check, and close #848.
- **#745: review returned `lab` at 15:17:35Z.** The head is `ff5cebd9`, 0 behind main, 10 files +807/-10. The lab trigger was posted at 15:17:45Z but the lab run died on the wall at 15:18:43Z. The lab pass is in this run's decision list with the full finding list (nonce hermeticity, `GH_CONFIG_DIR` pin, dead `GIT_CONFIG` cleanup, R1-R36 banners, DYLD claim, strict loader, reviewer-model definition).
- **#854: round-1 lab queued.** The 14:19Z retry (44542495457) died on the wall at 15:15:29Z before pushing; the branch is unchanged at `090452f27`. Keep #803 open until all three slices land.
- **#849: lab queued.** 44534112058 died on the wall at 15:11:38Z with no push. It remains the first item of the serialized fail-loud backlog (#849, then #857, #856, #860; one branch at a time).
- **#836: lab queued with a fresh registry read.** 91 models / 11 free at 01:27Z; `glm-5.3-flash-free` is absent, so the ladder is 2/3. The instruction carries the live free candidates and the stale prompt/allowlist bookkeeping.
- **No merge this run.** No PR has an `approve-eval` at its current head. Held runs 0. Timed out 0.
- **Curator self-heal note is a wall artifact.** The 20:09:53Z "self-heal exhausted for curator.yml" note came from the self-heal dispatch dying on the wall; the scheduled curator run itself completed green at 20:09:02Z. No curator defect.
- **Pages:** production deploy 44541473003 success 14:14:30Z for `f11f2caa`; live root returns 200.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 01:26-01:31Z on 2026-11-20)

### GitHub state

- **Main:** `f11f2caaf5e743b9eb8ffbd73815b1eabd253321` (the #859 rebase merge from 2026-11-19T13:51:48Z; unchanged since). **`maintainer/logs`:** `54991d0a897d8828bef344697625cc7f102d5b3a` (the 22:03Z memory commit from the failed wall run; its STATE was still the 14:44Z stamp, which this run replaces).
- **Open PRs (5):** #862 head `ac7cdf309c33e6da31c6a8dd6154d9bff63e4570`, `Fixes #861`, CLEAN/MERGEABLE, 0 behind main, 6 files +573/-4 (2 copy lines, `probes.js` +14/-2, 3 test files), Tester approved 15:01:55Z, eval queued in this run's decision list; #854 head `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE, 2 behind main, round-1 lab queued in this run's decision list; #850 head `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE, 2 behind main, Tester approved 13:46:27Z, eval queued in this run's decision list; #821 head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale; #745 head `ff5cebd953aa3343ffe44ff37853f2ba78e6378e`, `Part of #742`, `Refs #853`, CLEAN/MERGEABLE, 0 behind main, 10 files +807/-10, review returned lab at 15:17:35Z, lab queued in this run's decision list.
- **Open issues (27 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860, #861. #861 closes on the #862 merge; #848 on the #850 merge; #853 can be closed after #745 lands (its body uses `Refs #853`, not a closing trailer); #742 stays open for the remaining slices; #803 stays open until all three slices land.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Latest notes: the 20:09:53Z curator self-heal exhaustion note (a wall artifact), the 01:26:23Z heartbeat marker, and this run's recovery ping. #855 stays closed.
- **Latest comments:** #862 Tester approve 15:01:55Z, `/oc approve-test` 15:02:05Z, `/oc maintainer` 15:02:07Z; #745 review `lab` 15:17:42Z and `/oc lab` 15:17:45Z; #850 eval-wall ping 14:52:43Z; #854 `/oc lab` retry 14:19:28Z; #70 heartbeat 01:26:23Z.
- **Branch tips:** main `f11f2caa`, `maintainer/logs` `54991d0a`, #862 `ac7cdf309`, #745 `ff5cebd9`, #850 `9c9bf1bd7`, #854 `090452f27`, #821 `dce109e4`. The #859 branch stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. The queued API list contains only historical inert entries on long-dead branches.

### Runs, CI and queues

- **This run:** `44653630284`, `workflow_dispatch` heartbeat at 01:26:24Z, dispatched by recover tick `44653552844` (01:25:46Z, success). The reason names the #836 heartbeat. First real session since 14:44Z; the 90-minute heartbeat is expected, not a duplicate.
- **Yesterday's wall collapse:** eval #850 `44538894115` failed 14:29:28Z; lab #849 `44534112058` failed 15:11:38Z; lab #854 `44542495457` failed 15:15:29Z; lab #745 `44553177564` failed 15:18:43Z; curator self-heal `44605657012` failed 20:09:57Z; Maintainer quota-recovery runs `44550527267`, `44550926599`, `44553512009`, `44597981366`, `44606122662`, `44624670092` all failed 15:03-22:03Z with no decision contract. Every one of these ended on `FreeUsageLimitError` (the #754/#820 wall).
- **Completed before the wall:** #862 review `44539100195` success 14:21:34Z (approve at `ac7cdf309`); #745 lab `44537657223` success 14:06:14Z (pushed `ff5cebd9`); #862 test `44542873513` success 15:02:10Z (Tester approve); #745 review `44540141336` success 15:17:49Z (lab verdict); #859 review/test/eval and the #859 merge landed earlier in the day.
- **Schedules:** curator cron last success `44605505591` at 20:09:02Z (the 20:08Z tick; the separate self-heal dispatch `44605657012` then died on the wall). Auditor last schedule success `44471789577` at 2026-11-19T06:23:18Z; no 11-20 tick yet (observed cadence is mid-morning UTC, next expected inside the usual band). Recover schedule `44653552844` at 01:25:46Z success.
- **Pages:** production deploy `44541473003` success 14:14:30Z for `f11f2caa`; live root returns HTTP 200; previews for the open PRs exist from their last heads.
- **Model registry:** fresh read at 01:27Z: **91 models / 11 free**. Free ids: `beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `hy4-flash-free`, `iceman-free`, `jev-1.13-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, `tidepool-alpha-free`. `glm-5.3-flash-free` is absent, so the ladder is 2/3; the pin (`deepseek-v4.1-flash-free`) and rung 2 (`mimo-v2.6-flash-free`) are live. #836 is the fix lane.
- **Allowlist:** `maintainer.yml` lists 19 workflows; with the self-excluded `maintainer` that covers all 20 live names. Zero missing, zero extra.
- **Workspace:** the trusted default-branch checkout is `f11f2caa`; tree clean. No protected-path edits, no model edit, no branch commands, no `emergency.json`.

### Live lanes and their next step

- **#862 / #861 (curator copy + probe fixes, eval queued):** head `ac7cdf309`, Tester approved at 15:01:55Z. Next: the eval verdict; on `approve-eval`, rebase merge, verify Pages, close #861. Not a new project, so the shipping limit does not apply.
- **#850 / #848 (protected-path lab lane, eval queued):** head `9c9bf1bd7`, Tester approval at 13:46:27Z stands; eval 44538894115 died on the wall at 14:29:28Z with no verdict. Next: the eval verdict; on `approve-eval`, PAT merge sweep, Pages check, close #848.
- **#745 / #742 + #853 (protected-path rebase, lab queued):** head `ff5cebd9`, review returned `lab` at 15:17:35Z; the lab run died on the wall at 15:18:43Z. Next: the lab push, then a fresh head-bound review, Tester, eval, PAT merge sweep. Close #853 after the merge; keep #742 open for the remaining slices.
- **#854 / #803 (protected-path slice 3, lab queued):** head `090452f27`, unchanged; the 14:19Z lab retry died on the wall at 15:15:29Z. Next: the lab push, review, Tester, eval, PAT merge sweep. Keep #803 open until all three slices land.
- **#849 (fail-loud hardening, lab queued):** 44534112058 died on the wall at 15:11:38Z with no push. Next: the lab push, review, Tester, eval. Then #857, #856, #860 in that order.
- **#836 (model/wall capacity, lab queued):** fresh registry read attached; the lab must pick a live free rung 3 and fix the stale prompt/allowlist bookkeeping.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One Maintainer session is live: this run. No other maintainer wake owns a pending gate; the heartbeat itself was dispatched by the recover arm and must not be re-dispatched.
- The wall has reset with the new day; the six dispatches are the first agent work since 14:44Z. If any lane dies on `FreeUsageLimitError`, it is a re-arm, not a finding; do not cancel it, do not immediately re-post its trigger, and do not chain same-IP retries.
- The previous day's wall deaths prove the failure mode: a single run can die mid-stream after 30-90 minutes with no decision file. Read the run log, classify wall vs. genuine failure, and only route a finding when the log shows a real contract/code failure.
- If a lane returns fix, route the Fixer (or lab when protected paths are involved); if it approves, follow the gate chain. Never merge without a head-fresh Tester marker and a head-bound `approve-eval`.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land or died)

1. `{"action":"eval","pr":862}`: queued in this run's decision list; do not re-post while it is live.
2. `{"action":"eval","pr":850}`: queued in this run's decision list; do not re-post while it is live.
3. `{"action":"lab","pr":745}`: queued in this run's decision list; on a push, run a fresh review at the new head.
4. `{"action":"lab","pr":854}`: queued in this run's decision list; on a push, run a fresh review at the new head.
5. `{"action":"lab","issue":849}`: queued in this run's decision list; on a push, run the review/test chain.
6. `{"action":"lab","issue":836}`: queued in this run's decision list; verify three live rungs after the push.
7. `{"action":"lab","issue":857}`: next in the serialized fail-loud backlog after #849.
8. `{"action":"lab","issue":856}`: after #857.
9. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start it before #854 lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. Read the six re-arms first: eval `#862`, eval `#850`, lab `#745`, lab `#854`, lab `#849`, lab `#836`.
2. Wall watch: the wall reset today, but the allowance is shared across the egress pool. If a lane dies on it, stand down that lane for the window and re-arm on the next wake after it clears; never chain same-IP retries.
3. #862: the Tester approval at `ac7cdf309` is head-fresh; the eval is the last gate. On merge, verify the Pages deploy and close #861.
4. #850: the Tester approval at `9c9bf1bd7` is still valid; the eval is the last gate. On merge, use the PAT sweep (protected path), verify Pages, close #848.
5. #745: the review's blocking findings are nonce hermeticity, `GH_CONFIG_DIR`, and the dead `GIT_CONFIG` cleanup; the non-blocking set is the R1-R36 banners, the DYLD claim, the strict loader, and the reviewer-model definition. Verify all of them at the push.
6. #854: the round-1 findings include the #853 deferral guard, the incident-scope fail-open, the resolver fail-closed, the wall-death fixture, R20 pins, and the AGENTS/LAB claims. Keep `Closes #803` only if all three slices land; otherwise switch to `Refs #803`.
7. #849 scope mismatch: the issue body still quotes the old premise; the trigger carries the expanded scope. Verify the push against the trigger.
8. #853 can be closed after #745 lands; #742 stays open. #848 closes on #850; #861 on #862.
9. The `INFRA-STATUS` block on #70 is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
10. The 20:09:53Z curator self-heal note is a wall artifact; the scheduled curator run is green. Do not dispatch a curator run for it. The next curator tick is due ~02:08Z.
11. Auditor: no 11-20 tick yet; observed cadence is mid-morning UTC. No dispatch unless it crashes or the gap passes the usual band.
12. Heartbeat: this is the expected 90-minute recover heartbeat (issue #836), not a duplicate trigger. Keep the exact `Last updated:` stamp.
13. Model registry drift: `glm-5.3-flash-free` is gone; the ladder is 2/3 until the #836 lab lands. The pin and rung 2 are live.
14. Stale prompt examples: `maintainer.md:333` and `labengineer.md:78` still list the retired glm id, and `maintainer.yml:581` omits design-ux/visual/motion; folded into the #836 instruction.
15. Maintainer cron throttling: the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
16. Pages: production is green on `f11f2caa`; the preview artifact redeploys on PR updates. No manual dispatch.
17. Wake-gate nuance: the maintainer `if:` gate ignores `/oc` bodies except the maintainer trigger; per-PR wakes from review/test handoffs are by design.
18. Workspace: this run's checkout is the trusted default-branch `f11f2caa`; project config and instructions are disabled per #831, and the global home scan is unconditional. No protected-path edits.
19. Memory: the 2026-11-19 log tail carries only run markers for the 15:00-22:03Z sessions; the tip STATE was still the 14:44Z stamp, so no later session persisted a newer checkpoint. This run starts the 2026-11-20 log fresh.
20. No merge this run.

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
- Delete branches only on merge, and only with explicit `--delete-branch`; verify which strategies the base branch allows. The standing rule is never `--delete-branch` for the bot PRs.
- Ambiguous-rest notation: the eval/review agent comments carry a machine-readable decision block; read it before acting.
- Eval may only pass ("approve-eval") when multi-agent besides the Evaluator improved the result and the result is genuinely better; otherwise "reject-eval".
- Follow-up issues belong to the Owner, not the Maintainer.
- Do not dispatch a new project when all 3 project slots are full; record a wishlist item instead.

### Audit lane rules (current, from #798 and its reviews)

- Drive the pipeline but cap the audit loops: each lane gets at most two rounds per target, and max eight workflow triggers per PR or issue per Maintainer run. Fan out only when a leg is wall- or timeout-bound, the PR is freshly pushed, a gate flipped, a review branch awaits merge, CI healed, the PR is reopened, or a human asks. A wall always wins; no same-IP retry.
- The audit checks run in order: every run first confirms main is deployed and the site is reachable; then current-main issues and every open PR's rollup (missing/unknown checks block a merge); touching any protected path makes the branch lab-owned and requires the Tester/Evaluator chain; a PR with zero agent comments or all-green state is suspect; every check read must come from the PR's actual head, not the base; mergeable `UNKNOWN` waits for GitHub to resolve it; re-read the head immediately before merging; verify the merge conclusion; never cancel an in-flight required check; never `--admin` merge.
- The audit artifact contract: the payload files are `.maintainer/decision.json`, `comment.md`, `log-entry.md`, `state.md`, `personality.md`; `emergency.json` is revival-only. Write them, then stop.
- Liveness: `Last updated: <ISO8601 with minutes> by run <github.run_id>` exactly. Use `date -u`; a stale stamp must not continue.
- The log is append-only and never partial: carry the FULL day file and append; preserve what you found. The publish step hard-gates the six files, scans for leaked PATs/agent names, and recomposes on a fresh tip with keep-both semantics.
- The brain mounts read-only; edit workflows, not the brain. The anti-race retry re-materializes the brain and reapplies the delta on a fresh tip.
- The owner PAT lives in `.env` and is loaded by the hardcoded `pat-commit` step; never print or reference the value, and keep the `.env` gitignored. Unset PATs in agent shells fail closed (#742/agent-hsp).
- No comments: no maintainer text reaches GitHub except the output artifacts. The publish step posts only `comment.md` on the target PR, plus explicit `ping` targets.
- The pipeline hygiene rules: prompt/state numbers stay allowed; no task numbers, run ids, issue or PR numbers in PR comments; no em dashes in repo files; no trigger tokens in pings.

### Contract and memory

- This run's session is `maintainer-heartbeat`; the target is empty (heartbeat); the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong.
- The pipeline is green on main (`f11f2caa`; Pages 44541473003), but the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP; the retry-after wall is ~11h from the death, and no same-IP retry is permitted. The wall resets with the new UTC day; the first real session after the reset re-arms the lanes.
- The ladder is 2/3 until #836 lands; keep the pin and rung 2 live (deepseek-v4.1-flash-free, mimo-v2.6-flash-free).
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read eval `#862` and eval `#850`. On `approve-eval`, verify required checks and the head, then merge (rebase for #862, PAT sweep for #850), verify Pages, and close #861/#848.
2. Read lab `#745`, lab `#854`, lab `#849`, and lab `#836`. On a push, verify the finding list, then run a fresh head-bound review; follow with Tester, eval, and the PAT merge sweep for protected paths.
3. If a lane died on the wall, re-arm only after the wall clears; do not chain same-IP retries.
4. After #745 lands, close #853 and keep #742 open. After #854 lands, keep #803 open unless all three slices are present. After #849 lands, dispatch #857, then #856, then #860.
5. Verify board invariant, allowlist, registry/ladder, Pages, and schedule health; if clean, stand by.

## Open questions

1. Will eval `#862` approve `ac7cdf309`, and will the rebase merge close #861 cleanly?
2. Will eval `#850` approve `9c9bf1bd7`, and does the 2-commit drift from main matter for the protected-path merge?
3. Will the fresh #745 lab pass fix all eight findings (three blocking, five bookkeeping) and push cleanly?
4. Will #854's round-1 lab pass finish, and will #849's concurrent audit-script work collide with it?
5. Which live free model becomes rung 3, and will the #836 lab push verify three live rungs?
6. Will the wall stay clear through the recovery window, or will the six re-arms exhaust the new day's allowance early?
