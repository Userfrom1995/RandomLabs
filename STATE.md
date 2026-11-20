# STATE

Last updated: 2026-11-20T03:44Z by run 44668235363

(Schedule tick: the 03:23Z PR wake re-armed the five wall-dead lanes once; this wake verified the runs and the #863 quality gate, posted no duplicate triggers, and made no merge. Three re-arms and the quality gate are live; the #854 lab and #850 eval re-arms died on the provider allowance at 03:39:02Z and 03:42:38Z. The wall is not claimed clear.)

## TL;DR for the next Hephaestus

- **#863 is approved and in test.** Review `44664181465` approved head `e8334146` at 03:23:15Z (F1 resolved by the delegation ledger and skills note; five changed lines verified; resolver 3/3; audit 36/0; R26 manifest byte-identical). The workflow posted `/oc test` at 03:23:26Z and test `44667391044` is in progress since 03:23:32Z. On `approve-test`, dispatch eval at this head; on `fix`, route the lab (protected paths).
- **The 03:23Z session (issue_comment run `44667383835`) re-armed the five wall-dead lanes once at 03:33:59-03:34:03Z.** Three are live as of 03:44Z: eval #862 `44668599536`, lab #745 `44668602462`, lab #849 `44668604966`. Two died on the provider allowance with no push: lab #854 `44668603091` at 03:39:02Z and eval #850 `44668599585` at 03:42:38Z; the quota intake recorded both on #70 at 03:39:36Z and 03:43:00Z. No retry is chained in this window.
- **Concurrency resolved cleanly.** The 03:23Z session completed success at 03:34:21Z and committed memory `b20b1b86` at 03:33:56Z; the duplicate `44667390989` skipped at 03:34:21Z. Only this session is live now. The overlap did not double-dispatch any lane.
- **No merge this run.** No PR has a head-bound `approve-eval`. #862/#850 have Tester approvals only; #745/#854 are mid-lane; #821 is parked; #863 still needs test plus eval.
- **#836 stays open.** PR #863 restores the third rung and aligns the decision contract; it does not fix the pool-wide capacity wall. Keep the issue open for the Owner capacity decision and the remaining proposals.
- **Registry is healthy.** Fresh read at 03:38Z: 91 models / 11 free. `glm-5.3-flash-free` absent; the pin (`deepseek-v4.1-flash-free`), rung 2 (`mimo-v2.6-flash-free`), and the #863 replacement rung 3 (`nemotron-3.5-lightning-free`) are live.
- **Pages and board are green/invariant.** Production root returns 200 on `f11f2caa`; the #863 preview deployed at 02:19:58Z. Only #70 carries `lab-health`; only #42 carries `brainstorm`; held runs 0.
- **The trigger allowlist still matches.** 19 listed repo workflow names plus the self-excluded `maintainer` cover all 20 repo names; the three dynamic GitHub-managed workflows are not triage targets.
- **Schedules:** curator last success 2026-11-19T20:09:02Z (the 02:08Z and 03:28Z ticks are throttled); auditor last success 2026-11-19T06:23:18Z (mid-morning is the observed band); recover tick 01:25:46Z success.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 03:30-03:38Z on 2026-11-20)

### GitHub state

- **Main:** `f11f2caaf5e743b9eb8ffbd73815b1eabd253321` (unchanged). **`maintainer/logs` pre-run tip:** `b20b1b86e0b3` (the 03:33Z memory commit from the 03:23Z session).
- **Open PRs (6):**
  - #863 `e833414624a1d9653178df93c82541f66acb636f`, `Refs #836`, CLEAN/MERGEABLE, base `f11f2caa`, 5 files +5/-5, protected paths. Review approved 03:23:15Z; test `44667391044` in progress since 03:23:32Z.
  - #862 `ac7cdf309c33e6da31c6a8dd6154d9bff63e4570`, `Fixes #861`, CLEAN/MERGEABLE, 0 behind main, Tester approved 15:01:55Z, eval re-armed and live as `44668599536`.
  - #850 `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE, 2 behind main, Tester approved 13:46:27Z, eval re-armed as `44668599585` but that run died on the provider allowance at 03:42:38Z; no verdict, no push.
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE, 2 behind main, lab re-armed as `44668603091` but that run died on the provider allowance at 03:39:02Z; branch unchanged, no push.
  - #745 `ff5cebd953aa3343ffe44ff37853f2ba78e6378e`, `Part of #742`, `Refs #853`, CLEAN/MERGEABLE, 0 behind main, review returned `lab` at 15:17:35Z, lab re-armed and live as `44668602462`.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale.
- **Open issues (27 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860, #861. No new issue and no untriaged issue. #861 closes on the #862 merge; #848 on the #850 merge; #853 after #745 lands; #742 stays open; #803 stays open until all three slices land.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Latest notes: the five quota-wall intake notes (01:44-02:20Z), the 02:32Z correction, the 03:33Z recovery-window status, and this run's 03:39Z schedule audit.
- **Latest comments:** #863 review approval 03:23:15Z, report 03:23:23Z, `/oc test` 03:23:26Z, the 03:23Z session's status 03:33:46Z and 03:33:58Z; #862 `/oc eval` re-arm 03:33:59Z (prior 01:34:51Z); #850 `/oc eval` re-arm 03:34:00Z (prior 01:34:52Z); #745 `/oc lab` re-arm 03:34:01Z with the finding list; #854 `/oc lab` re-arm 03:34:02Z; #849 `/oc lab` re-arm 03:34:03Z.
- **Branch tips:** main `f11f2caa`, `maintainer/logs` `b20b1b86`, #863 `e8334146`, #862 `ac7cdf30`, #850 `9c9bf1bd`, #854 `090452f2`, #745 `ff5cebd9`, #821 `dce109e4`. The #859 branch stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0.

### Runs, CI and queues

- **This run:** `44668235363`, `schedule` at 03:30:51Z on `main` `f11f2caa`, no target, in the global group. The pre-agent checkout is `f11f2caa`; the workspace was not moved to a PR head. Tree clean; no protected-path edits, no model edit, no branch commands, no `emergency.json`.
- **Overlapping session:** `44667383835`, `issue_comment` at 03:23:26Z on `main`, target PR #863 (the `/oc test` handoff). It completed success at 03:34:21Z, committed memory `b20b1b86` at 03:33:56Z, and published its decisions at 03:33:46-03:34:03Z. The duplicate `44667390989`, queued behind it, skipped at 03:34:21Z.
- **#863 test:** `44667391044` in progress since 03:23:32Z (agent step active). Its hardcoded step will post `approve-test` or route a fix on completion.
- **Re-armed lanes:** eval #862 `44668599536` (live), lab #745 `44668602462` (live), lab #849 `44668604966` (live), eval #850 `44668599585` (died on the wall at 03:42:38Z, no verdict), lab #854 `44668603091` (died on the wall at 03:39:02Z, no push). These are new-run recovery attempts after the 01:44-02:20Z wall deaths, not same-IP retries.
- **Wall lineage:** the first #863 review attempt `44662427086` died on `FreeUsageLimitError` at 02:54:56Z; the auto-retry `44664181465` then completed success at 03:23:21Z. The wall is passable on some egress IPs, but no clearance claim is made until the re-armed lanes report.
- **Schedules:** curator last success `44605505591` at 2026-11-19T20:09:02Z (the 02:08Z tick did not appear); auditor last success `44471789577` at 2026-11-19T06:23:18Z; recover `44653552844` at 01:25:46Z success. No schedule tick in the last 200 runs except this one, so the cron throttle is broad, not per workflow.
- **Pages:** production deploy `44541473003` success 14:14:30Z for `f11f2caa`; live root returns HTTP 200. Preview deploy `44660010716` success 02:19:58Z; #863 preview exists.
- **Model registry:** fresh read at 03:38Z: **91 models / 11 free**. Free ids: `beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `hy4-flash-free`, `iceman-free`, `jev-1.13-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, `tidepool-alpha-free`. `glm-5.3-flash-free` is absent; the pin and rung 2 are live; the #863 rung 3 is live.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo names. Zero missing, zero extra. The three dynamic GitHub-managed names are not triage targets.

### Live lanes and their next step

- **#863 / #836 (third rung + decision contract, protected path):** review approved at `e8334146`; test `44667391044` live. Next: on `approve-test`, dispatch eval at this head; on `fix`, route the lab (protected paths) and re-verify. On `approve-eval`, merge with the PAT sweep, verify Pages, and keep #836 open for the Owner capacity decision.
- **#862 / #861 (curator copy + probe fixes):** eval re-armed and live `44668599536`. Next: on `approve-eval`, rebase merge, verify Pages, close #861. Not a new project, so the shipping limit does not apply.
- **#850 / #848 (protected-path lab lane):** the eval re-arm `44668599585` died on the wall at 03:42:38Z with no verdict; the Tester approval at `9c9bf1bd` stands. Next: re-arm the eval once on a later wake after this window; on `approve-eval`, PAT merge sweep, Pages check, close #848.
- **#745 / #742 + #853 (protected-path rebase):** lab re-armed and live `44668602462` on the three blocking and five bookkeeping findings. Next: on a push, verify all eight, fresh head-bound review, test, eval, PAT merge sweep; close #853 after the merge; keep #742 open.
- **#854 / #803 (protected-path slice 3):** the lab re-arm `44668603091` died on the wall at 03:39:02Z with no push; the branch is unchanged at `090452f27`. Next: re-arm on a later wake after this window; on a push, review, test, eval, merge sweep. Keep #803 open until all three slices land; keep `Closes #803` only if all three land.
- **#849 (fail-loud hardening):** lab re-armed and live `44668604966` with the expanded scope. Next: on a push, review, test, eval; then #857, #856, #860 in that order.
- **#836 (capacity):** open for the Owner capacity decision and the remaining proposals. No new lab dispatch now; #863 is the rung/contract slice.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- The overlap is over: the 03:23Z session `44667383835` completed at 03:34:21Z and the duplicate `44667390989` skipped. Only this schedule session is live now.
- This schedule wake found the five re-arms already posted and live, so it deliberately posted no duplicate triggers. The lesson: when two Maintainer sessions overlap, the later session must read the target threads for triggers newer than its memory before re-arming anything.
- The wall is passable on at least some egress IPs but remains active: the review auto-retry completed after the first attempt died at 02:54:56Z, and the #854 lab re-arm then died on it at 03:39:02Z (retry-after about 21h, diagnostic only). Do not chain another retry in this window; the next heartbeat/schedule wake is the path.
- Do not claim the wall is clear until multiple re-armed lanes report. The 01:34Z "wall has cleared" claim was false; do not repeat it.
- If a lane returns fix, route the Fixer (or lab when protected paths are involved); if it approves, follow the gate chain. Never merge without a head-fresh Tester marker and a head-bound `approve-eval`.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the wall has cleared, and no live/queued run exists)

1. `{"action":"eval","pr":862}`: re-armed, live `44668599536`; on `approve-eval`, rebase merge and close #861.
2. `{"action":"eval","pr":850}`: re-armed but wall-dead again at 03:42:38Z; wait for a later wake, then re-arm once; on `approve-eval`, PAT merge sweep and close #848.
3. `{"action":"lab","pr":745}`: re-armed, live `44668602462`; on a push, fresh head-bound review, then test/eval/merge.
4. `{"action":"lab","pr":854}`: re-armed but wall-dead again at 03:39:02Z (no push); wait for a later wake, then re-arm once; on a push, review/test/eval; keep #803 open unless all three slices land.
5. `{"action":"lab","issue":849}`: re-armed, live `44668604966`; on a push, the review/test chain.
6. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
7. `{"action":"lab","issue":856}`: after #857.
8. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
9. #863: no dispatch; the test `44667391044` is live. Follow the workflow handoff; dispatch eval on approval.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. Read the #863 test result first. On `approve-test`, dispatch eval at `e8334146`; on `fix`, route the lab (protected paths) and re-verify.
2. Read the re-armed lane results. The #854 lab and #850 eval already died on the wall at 03:39:02Z and 03:42:38Z; the other three were live at 03:44Z. Re-arm both once on a later wake after this window; never chain another same-pool retry now.
3. #862: the Tester approval at `ac7cdf30` is head-fresh; the eval is the last gate. On merge, verify Pages and close #861.
4. #850: the Tester approval at `9c9bf1bd` is still valid; the eval is the last gate. On merge, use the PAT sweep, verify Pages, close #848.
5. #745: the blocking findings are nonce hermeticity, `GH_CONFIG_DIR`, and the dead `GIT_CONFIG` cleanup; the non-blocking set is the R1-R36 banners, the DYLD claim, the strict loader, and the reviewer-model definition. Verify all eight at the push.
6. #854: the round-1 findings include the #853 deferral guard, the incident-scope fail-open, the resolver fail-closed, the wall-death fixture, R20 pins, and the AGENTS/LAB claims. Keep `Closes #803` only if all three slices land; otherwise switch to `Refs #803`.
7. #849 scope mismatch: the issue body still quotes the old premise; the trigger carries the expanded scope. Verify the push against the trigger.
8. #853 can be closed after #745 lands; #742 stays open. #848 closes on #850; #861 on #862.
9. The `INFRA-STATUS` block on #70 is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
10. #836 remains open for the capacity proposals. The #863 patch restores rung 3 and the contract only; do not close the issue on the merge.
11. Auditor: no 11-20 tick yet; observed cadence is mid-morning UTC. No dispatch unless it crashes or the gap passes the usual band.
12. Curator: the 02:08Z and 03:28Z ticks did not appear; the last success is 20:09Z. This is the known platform throttle, not a curator defect; no dispatch.
13. Model registry drift: `glm-5.3-flash-free` is gone; the ladder is 2/3 on `main` until #863 merges. The PR's rung 3 is live.
14. Prompt/envelope drift: the staged `maintainer.md` and the `maintainer.yml` envelope still omit `design-ux`/`design-visual`/`design-motion`; #863 fixes both. Do not use the focused design actions as a justification to edit prompts directly.
15. Maintainer cron throttling: the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
16. Pages: production is green on `f11f2caa`; the preview artifact redeploys on PR updates. No manual dispatch.
17. Workspace: this run's tree is the trusted `main` checkout at `f11f2caa` (schedule event, no PR-head move); the #831 bootstrap move applies to PR wakes only.
18. Memory: the 2026-11-20 file now carries the 01:31Z, 02:20Z, 03:23Z, and this 03:39Z entry. The log publish is append-only with keep-both semantics.
19. No merge this run.

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
- Do not claim a wall or lane is clear until multiple runs actually complete; correct false claims in the same thread first.
- Overlapping Maintainer sessions: before re-arming any lane, read the target threads for triggers newer than the loaded memory and treat them as live. A later session must not duplicate an earlier session's dispatches.

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

- This run's session is `maintainer-schedule`; there is no target; the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong.
- The pipeline is green on main (`f11f2caa`; Pages `44541473003`), but the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP; the wall is pool-wide and was still killing lanes at 03:42Z. One review auto-retry then passed and three re-armed lanes were live at 03:44Z, but the #854 lab and #850 eval died. No same-IP retry inside a window.
- The ladder on `main` is 2/3 until #863 merges; keep the pin and rung 2 live (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`). The #863 replacement rung is live.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #863 test result. On `approve-test`, dispatch eval at `e8334146`; on `fix`, route the lab (protected paths) and re-verify. On `approve-eval`, merge with the PAT sweep, verify Pages, and close only the linked work (keep #836 open for the capacity decision).
2. Read the re-armed eval #862/#850 results. On `approve-eval`, merge (rebase for #862, PAT sweep for #850), verify Pages, and close #861/#848.
3. On a #745 push, verify all eight findings, then a fresh head-bound review, test, eval, PAT merge sweep; close #853 after the merge and keep #742 open.
4. On a #854 push, keep #803 open unless all three slices are present. On a #849 push, dispatch #857, then #856, then #860.
5. If any re-armed lane died on the wall, stand down and wait for the next heartbeat; do not chain another retry. Keep #836 open.
6. Verify board invariant, allowlist, registry/ladder, Pages, and schedule health; if clean, stand by.

## Open questions

1. Will the #863 test approve on this head, and will the eval then clear it for a rebase merge?
2. Will the re-armed eval/lab lanes survive the provider allowance, or does the pool wall return?
3. Do the #862/#850 Tester approvals stay valid through the eval, or does the queue need a fresh test pass?
4. Will the #745 lab clear all eight findings on the next push?
5. Does #836 need an Owner capacity decision even after the rung/contract patch merges?
