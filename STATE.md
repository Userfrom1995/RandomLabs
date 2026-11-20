# STATE

Last updated: 2026-11-20T04:06Z by run 44670501472

(#862 duplicate wake: this run was the queued duplicate of the 03:51Z evaluator handoff and started at 04:02Z, after the lane had already merged; it verified the merge, the issue closure, and Pages, posted one additive board note, and re-armed nothing because the three wall-struck lanes are still inside their cooldown. #863's eval and #745's lab continuation are live.)

## TL;DR for the next Hephaestus

- **#862 is MERGED** (rebase) at 03:52:39Z as `13d5bd8de`, head `ac7cdf309`. The gate chain was complete: Tester `/oc approve-test` at 15:02:05Z and `eval-verdict: approve-eval` at 03:51:15Z on `ac7cdf309`, no `/oc fix` after. #861 closed at 03:52:41Z. `git diff 13d5bd8de ac7cdf309` is empty, ancestry is intact, and the live site serves both corrected strings. This run's target was that merged lane; it stood down with no re-merge and no second completion note.
- **#863's eval is live.** Eval `44671178373` started 03:57:39Z on `e8334146` and was still in progress at 04:05Z. On `approve-eval`, merge with the protected-path PAT sweep, verify Pages, and keep #836 open; on `fix`, route the lab.
- **#745 is mid-lane.** Lab continuation `44670213265` has been live since 03:48:41Z at head `f95e5554` (the finding pass). Wait for the push, then a head-bound review, test, eval, and merge; close #853 after the merge and keep #742 open.
- **Wall-struck lanes remain in cooldown, not lost.** #854's lab died 03:39:02Z (re-arm at ~04:09Z), #850's eval died 03:42:38Z (re-arm at ~04:12Z), #849's lab died 03:49:33Z (re-arm at ~04:19Z). This run deliberately did not re-arm any of them early; the next wake after each time re-arms once. No same-pool retry.
- **#857/#856/#860 are queued, not untriaged.** They have zero trigger comments and no linked PR, but they are the serialized fail-loud backlog behind #849; do not treat them as forgotten or dispatch them out of order.
- **#836 stays open** for the Owner capacity decision; #863's rung/contract patch is its first slice.
- **Registry is healthy.** Fresh read at 04:06Z: 91 models / 11 free. The pin (`deepseek-v4.1-flash-free`), rung 2 (`mimo-v2.6-flash-free`), and the #863 rung 3 (`nemotron-3.5-lightning-free`) are live.
- **Pages and board are green/invariant.** Production root returns 200 on `13d5bd8de`; latest deploy `44671643958` succeeded 04:02:26Z. Only #70 carries `lab-health`; only #42 carries `brainstorm`; held runs 0.
- **The trigger allowlist still matches.** 20 live workflow names; `maintainer.yml` lists 19 plus the self-excluded `maintainer`. Zero missing, zero extra.
- **Schedules:** maintainer schedule `44668235363` success 03:30:51Z; curator last success 2026-11-19T20:08:05Z (today's ticks throttled); auditor last success 2026-11-19T06:23:18Z (mid-morning band); recover `44653552844` success 01:25:46Z. No dispatch for the throttle.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 04:02-04:06Z on 2026-11-20)

### GitHub state

- **Main:** `13d5bd8deeca8edc6fcc1d8511ac531be5b901de` (the #862 rebase merge at 03:52:39Z). **`maintainer/logs` pre-run tip:** `b8f300b81086` (the 04:01Z memory commit; its STATE is identical to the loaded bundle, stamped 04:00Z by run 44670496053).
- **Open PRs (5):**
  - #863 `e833414624a1d9653178df93c82541f66acb636f`, `Refs #836`, CLEAN/MERGEABLE, protected paths, 5 files +5/-5, 6 behind main. Test approved 03:50:51Z; eval `44671178373` live since 03:57:39Z.
  - #850 `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE, 8 behind main, Tester approved 13:46:27Z. Eval died on the wall at 03:42:38Z; no verdict. Re-arm after ~04:12Z.
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE, 8 behind main. Lab died on the wall at 03:39:02Z; branch unchanged. Re-arm after ~04:09Z.
  - #745 `f95e555488bd6ec7da98c710d103e5156251089d`, `Part of #742`, `Refs #853`, CLEAN/MERGEABLE, 6 behind main. Lab continuation `44670213265` live since 03:48:41Z.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale.
- **Open issues (26 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860. #861 closed on the merge. No new issue; no untriaged issue. #848 closes on #850; #853 after #745; #742 stays open; #803 stays open until all three slices land.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Latest notes: the 04:00:58Z quota-recovery status, the 04:01:34Z merge-and-recovery status, and this run's 04:06Z duplicate-wake note. The quota intakes for the three wall deaths are at 03:39:36Z, 03:43:00Z, and 03:49:53Z.
- **Latest comments:** #862 peer merge note 04:01:35Z and status 04:01:21Z; #863 `/oc eval` 03:57:36Z, review approved 03:23:15Z, test approval 03:50:51Z; #745 `/oc lab continue` 03:48:38Z and `/oc maintainer` 03:48:49Z; #850 `/oc eval` 03:34:00Z; #854 `/oc lab` 03:34:02Z; #849 `/oc lab` 03:34:03Z.
- **Branch tips:** main `13d5bd8d`, `maintainer/logs` `b8f300b8`, #863 `e8334146`, #850 `9c9bf1bd`, #854 `090452f2`, #745 `f95e5554`, #821 `dce109e4`. The #859 branch stays intact at `9b862e48` (never delete); the #862 branch stays intact at `ac7cdf30`. No recovery due.
- **Held runs:** 0.

### Runs, CI and queues

- **This run:** `44670501472`, `issue_comment` at 03:51:19Z on the #862 `/oc maintainer`, per-target group `maintainer-862`. It queued behind the 03:51Z targeted session and started at 04:02:01Z, after the merge. The bootstrap moved the workspace to the PR head `ac7cdf309`; all reads were project-config-disabled. Tree clean; no protected-path edits, no model edit, no branch commands, no `emergency.json`.
- **#862 merge:** performed by the peer targeted wake at 03:52:39Z, merge commit `13d5bd8de`. `git merge-base --is-ancestor f11f2caa 13d5bd8de` is OK, `git diff 13d5bd8de ac7cdf309` is empty, and the rebased history carries the six PR commits. #861 closed at 03:52:41Z.
- **#863 eval:** `44671178373` in progress since 03:57:39Z on `e8334146`; job `eval` started 03:57:41Z. Its handoff will post the verdict and `/oc maintainer`.
- **#745 lab:** `44670213265` in progress since 03:48:41Z at head `f95e5554`; the job started 03:48:45Z. No new push yet.
- **Fan-out noise:** the 03:51Z and 03:57Z comment triggers created dozens of maintainer `workflow_run` runs; all skipped or were cancelled by the single-slot groups. Expected, no triage.
- **Schedules:** maintainer `44668235363` success 03:30:51Z; curator `44605505591` success 2026-11-19T20:08:05Z; auditor `44471789577` success 2026-11-19T06:23:18Z; recover `44653552844` success 01:25:46Z.
- **Pages:** production deploy `44671643958` success 04:02:26Z on `13d5bd8de` (the latest of four successful dispatches on this head); live root returns HTTP 200; live `/netpulse/` serves "Nothing is uploaded unless you run the upload probe." and live `/maze-chase/` serves `Dusk Pond (1/3)`.
- **Model registry:** fresh read at 04:06Z: **91 models / 11 free**. Free ids: `beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `hy4-flash-free`, `iceman-free`, `jev-1.13-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, `tidepool-alpha-free`. `glm-5.3-flash-free` is absent; the pin, rung 2, and the #863 rung 3 are live.
- **Allowlist:** 20 live workflow `name:` fields; `maintainer.yml` lists 19 with the self-excluded `maintainer`. Zero missing, zero extra. The three dynamic GitHub-managed workflows are not triage targets.

### Live lanes and their next step

- **#863 / #836 (third rung + decision contract, protected path):** eval live at `e8334146`. Next: on `approve-eval`, merge with the PAT sweep, verify Pages, and keep #836 open; on `fix`, route the lab (protected paths) and re-verify.
- **#745 / #742 + #853 (protected-path rebase):** the lab is live on the remaining findings at `f95e5554`. Next: on a completed push, verify all eight findings, then a fresh head-bound review, test, eval, PAT merge sweep; close #853 after the merge and keep #742 open.
- **#850 / #848 (protected-path lab lane):** the eval is wall-dead; the Tester approval at `9c9bf1bd` stands. Next: re-arm the eval once after ~04:12Z; on `approve-eval`, merge, verify Pages, close #848.
- **#854 / #803 (protected-path slice 3):** the lab is wall-dead with no push. Next: re-arm once after ~04:09Z; on a push, review, test, eval, merge sweep. Keep #803 open until all three slices land.
- **#849 (fail-loud hardening):** the lab is wall-dead at 03:49:33Z. Next: re-arm once after ~04:19Z with the expanded scope; then #857, #856, #860 in that order (#860 only after #854).
- **#836 (capacity):** open for the Owner capacity decision and the remaining proposals. #863 is the rung/contract slice.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- This session was the queued duplicate of the 03:51Z #862 handoff. The per-target group serialized it behind the peer session, so it loaded the peer's 04:00Z checkpoint and started after the merge. The lesson holds: a queued session must re-read the live target state before acting; here the target was already merged, so the correct action was verification only.
- The peer session posted the #862 completion note at 04:01:35Z, one minute before this session started. This run therefore left `comment.md` empty and did not duplicate the note; its only public artifact is the additive #70 ping.
- The wall remains live: three lanes died between 03:39Z and 03:49Z, while the #863 eval and the #745 lab have stayed alive since 03:57Z and 03:48Z. Do not claim the wall is clear.
- Cooldown arithmetic for the next wake: #854's lab re-arm no earlier than 04:09Z, #850's eval no earlier than 04:12Z, #849's lab no earlier than 04:19Z. Re-arm once each, never chain a same-pool retry.
- If a lane returns fix, route the Fixer (or lab when protected paths are involved); if it approves, follow the gate chain. Never merge without a head-fresh Tester marker and a head-bound `approve-eval`.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the wall has cleared, and no live/queued run exists)

1. `{"action":"eval","pr":863}`: live `44671178373`; do not duplicate. On `approve-eval`, merge with the PAT sweep and keep #836 open.
2. `{"action":"eval","pr":850}`: wall-dead at 03:42:38Z; re-arm once after ~04:12Z; on `approve-eval`, merge and close #848.
3. `{"action":"lab","pr":854}`: wall-dead at 03:39:02Z with no push; re-arm once after ~04:09Z; on a push, review/test/eval; keep #803 open unless all three slices land.
4. `{"action":"lab","issue":849}`: wall-dead at 03:49:33Z; re-arm once after ~04:19Z; on a push, the review/test chain.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
8. #745: no dispatch; the lab continuation is live. Follow its handoff.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. Read the #863 eval result. On `approve-eval`, merge with the protected-path PAT sweep, verify Pages, and keep #836 open; on `fix`, route the lab and re-verify.
2. Read the #745 lab result. On its completion, verify all eight findings against the push, then a head-bound review, test, eval, and merge; close #853 after the merge, keep #742 open.
3. Re-arm #854, #850, and #849 once each after ~04:09Z, ~04:12Z, and ~04:19Z. Never chain another same-pool retry inside the window.
4. #862 is done: merged, #861 closed, Pages green, live strings verified. No further action on that lane, and no second completion note.
5. #850/#854/#849 approvals and findings stay valid at their heads unless a new push moves them.
6. The `INFRA-STATUS` block on #70 is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
7. #836 remains open for the capacity proposals. The #863 patch restores rung 3 and the contract only; do not close the issue on the merge.
8. #857/#856/#860 carry zero triggers and no linked PR; they are the serialized backlog behind #849, not untriaged work.
9. Auditor: no 11-20 schedule tick yet; observed cadence is mid-morning UTC. No dispatch unless it crashes or the gap passes the usual band.
10. Curator: last success 2026-11-19T20:08Z; today's ticks are throttled. This is the known platform throttle, not a curator defect; no dispatch.
11. Model registry drift: `glm-5.3-flash-free` is gone; the ladder is 2/3 on `main` until #863 merges. The PR's rung 3 is live.
12. Prompt/envelope drift: the staged `maintainer.md` and the `maintainer.yml` envelope still omit `design-ux`/`design-visual`/`design-motion`; #863 fixes both. Do not use the focused design actions as a justification to edit prompts directly.
13. Maintainer cron throttling: the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
14. Pages: production is green on `13d5bd8de`; four successful deploys on this head. The preview artifact redeploys on PR updates. No manual dispatch.
15. Workspace: this run's tree was moved to the PR head `ac7cdf309` by the #831 bootstrap; reads stayed project-config-disabled and the tree is clean.
16. Memory: the 2026-11-20 file now carries the 01:31Z, 02:20Z, 02:31Z, 03:23Z, 03:30Z, 03:50Z, 03:51Z, and this 04:06Z entry. The log publish is append-only with keep-both semantics.
17. No merge this run; the only dispatch is one #70 ping.

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
- Merge preference is squash unless the PR's base branch explicitly requires another strategy; the repo's rebase-merge setting is the exception for the #859/#850/#862 lane (honor the verified expectation).
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

- This run's session is `maintainer-862`; the target is #862; the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong.
- The pipeline is green on main (`13d5bd8de`; Pages `44671643958`), but the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP; the wall killed three lanes between 03:39Z and 03:49Z while the #863 eval and #745 lab ran, so no same-IP retry inside a window and no wall-clearance claim.
- The ladder on `main` is 2/3 until #863 merges; keep the pin and rung 2 live (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`). The #863 replacement rung is live.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #863 eval result. On `approve-eval`, merge with the protected-path PAT sweep, verify Pages, and keep #836 open; on `fix`, route the lab.
2. Read the #745 lab result. On its push, verify all eight findings, then a head-bound review, test, eval, and merge; close #853 after the merge and keep #742 open.
3. Re-arm #854 (lab, after ~04:09Z), #850 (eval, after ~04:12Z), and #849 (lab, after ~04:19Z) once each. Never chain another same-pool retry inside a window.
4. On a #854 push, keep #803 open unless all three slices are present. On a #849 push, dispatch #857, then #856, then #860.
5. #862 is complete; do not reopen. Verify the production site and board invariant, and stand by.
6. Verify the allowlist, registry/ladder, Pages, and schedule health; if clean, stand by.

## Open questions

1. Will the #863 eval approve on `e8334146`, and will the merge then clear the third rung?
2. Will the #745 lab finish the remaining findings and keep the head push-clean?
3. Do the #850/#854/#849 lanes survive when the next wake re-arms them after their cooldowns?
4. Does the platform keep the maintainer cron throttled, and does the recover heartbeat remain the only reliable wake?
5. Does #836 still need an Owner capacity decision after #863 lands?
