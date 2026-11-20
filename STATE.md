# STATE

Last updated: 2026-11-20T04:00Z by run 44670496053

(#862 targeted wake: the evaluator approved at 03:51:15Z and a concurrent targeted wake merged the PR at 03:52:39Z before this session could act; this run verified the full gate chain, the ancestry and tree equality, the issue closure, and the Pages deploy instead of re-merging, and held the three wall-struck lanes inside the peer session's cooldown. #863's eval is live; #745's lab is live.)

## TL;DR for the next Hephaestus

- **#862 is MERGED** (rebase) at 03:52:39Z as `13d5bd8de`, head `ac7cdf309`. The gate chain was complete: Tester `/oc approve-test` at 15:02:05Z and `eval-verdict: approve-eval` at 03:51:15Z, both on `ac7cdf309`, with no `/oc fix` after the Tester marker. #861 closed automatically at 03:52:41Z. The production Pages deploy `44670828953` succeeded at 03:55:08Z on `13d5bd8de`; the live site serves the new Netpulse sentence and the `Dusk Pond (1/3)` label.
- **#863's eval is live.** The peer session `44670454318` (the `/oc maintainer` handoff at 03:50:53Z) posted `/oc eval` at 03:57:36Z and eval `44671178373` started at 03:57:39Z on head `e8334146`. On `approve-eval`, merge with the protected-path PAT sweep, verify Pages, and keep #836 open; on `fix`, route the lab.
- **#745 is mid-lane.** The lab pushed `f95e5554` at 03:48:38Z, then the continue handoff started lab `44670213265` and the target session `44670232463`; both are live. No new comment or trigger on #745 since 03:48:49Z. Wait for the lab to finish before a head-bound review.
- **No merge waits on this run.** #850/#854/#849 remain wall-struck and are held in cooldown: #850's eval died at 03:42:38Z, #854's lab at 03:39:02Z, and #849's lab at 03:49:33Z. The peer session explicitly held all three at 03:57Z. The next wake after this window re-arms each once; do not chain another same-pool retry now.
- **#836 stays open** for the Owner capacity decision; #863's rung/contract patch is its first slice, not the whole fix.
- **Registry is healthy.** Fresh read at 03:56Z: 91 models / 11 free. The pin (`deepseek-v4.1-flash-free`), rung 2 (`mimo-v2.6-flash-free`), and the #863 rung 3 (`nemotron-3.5-lightning-free`) are live.
- **Pages and board are green/invariant.** Production root returns 200 on `13d5bd8de`; only #70 carries `lab-health`; only #42 carries `brainstorm`; held runs 0.
- **The trigger allowlist still matches.** 19 listed repo workflow names plus the self-excluded `maintainer` cover all 20 repo names; the three dynamic GitHub-managed workflows are not triage targets.
- **Schedules:** curator last success 2026-11-19T20:09:02Z (today's ticks are throttled); auditor last success 2026-11-19T06:23:18Z (mid-morning is the observed band); recover tick 01:25:46Z success. No dispatch for the throttle.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 03:51-04:00Z on 2026-11-20)

### GitHub state

- **Main:** `13d5bd8deeca8edc6fcc1d8511ac531be5b901de` (the #862 rebase merge at 03:52:39Z; descends from `f11f2caa`). **`maintainer/logs` pre-run tip:** `d7a8e84b7e5b` (the 03:50Z memory commit; peer sessions may advance it).
- **Open PRs (5):**
  - #863 `e833414624a1d9653178df93c82541f66acb636f`, `Refs #836`, CLEAN/MERGEABLE, protected paths, 5 files +5/-5. Test approved 03:50:51Z; eval `44671178373` live since 03:57:39Z.
  - #850 `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE, 2 behind main, Tester approved 13:46:27Z. Eval died on the wall at 03:42:38Z; no verdict. Held in cooldown.
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE, 2 behind main. Lab died on the wall at 03:39:02Z; branch unchanged. Held in cooldown.
  - #745 `f95e555488bd6ec7da98c710d103e5156251089d`, `Part of #742`, `Refs #853`, CLEAN/MERGEABLE. The lab pushed the finding-pass head at 03:48:38Z; lab `44670213265` and target session `44670232463` are live.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale.
- **Open issues (26 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860. #861 closed on the merge. No new issue; no untriaged issue. #848 closes on #850; #853 after #745; #742 stays open; #803 stays open until all three slices land.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Latest notes: the quota-wall intakes at 03:39:36Z, 03:43:00Z, and 03:49:53Z; the 03:33:58Z recovery-window status; this run's 04:00Z merge-and-recovery note.
- **Latest comments:** #863 test approval 03:50:51Z, report 03:50:49Z, `/oc maintainer` 03:50:53Z, `/oc eval` 03:57:36Z, the peer session's status 03:57:23Z and 03:57:35Z; #862 eval verdict 03:51:15Z, `/oc maintainer` 03:51:16Z; #745 `/oc lab continue` 03:48:38Z and `/oc maintainer` 03:48:49Z; #850 `/oc eval` 03:34:00Z; #854 `/oc lab` 03:34:02Z; #849 `/oc lab` 03:34:03Z.
- **Branch tips:** main `13d5bd8d`, `maintainer/logs` `d7a8e84b`, #863 `e8334146`, #850 `9c9bf1bd`, #854 `090452f2`, #745 `f95e5554`, #821 `dce109e4`. The #859 branch stays intact at `9b862e48` (never delete); the #862 branch stays intact at `ac7cdf30`. No recovery due.
- **Held runs:** 0.

### Runs, CI and queues

- **This run:** `44670496053`, `issue_comment` at 03:51:16Z on #862, per-target group `maintainer-862`. The pre-agent checkout is the trusted `main`; the workspace was not moved to a PR head. Tree clean; no protected-path edits, no model edit, no branch commands, no `emergency.json`.
- **Peer sessions:** `44670454318` on #863 (issue_comment, 03:50:52Z -> success 03:58:23Z; dispatched the eval and published its status); `44670232463` on #745 (issue_comment, 03:48:53Z, live). Pending/duplicate runs: `44670501472` (#862), `44670462371` (#863), `44670232585` (lab #745 lane); the single-slot groups absorb them.
- **#862 merge:** performed by a concurrent targeted wake at 03:52:39Z, `mergedBy app/github-actions`, merge commit `13d5bd8de`. `git merge-base --is-ancestor f11f2caa 13d5bd8de` is OK, `git diff 13d5bd8de ac7cdf309` is empty, and the rebased history carries the six PR commits. #861 closed at 03:52:41Z.
- **#863 eval:** `44671178373` in progress since 03:57:39Z on `e8334146`; its handoff will post the verdict and `/oc maintainer`.
- **#745 lab:** `44670213265` in progress since 03:48:41Z after the successful push `f95e5554`; head unchanged at the push (no finding-pass content known beyond the two commits on the branch).
- **Wall lineage:** the wall killed lab #854 `44668603091` at 03:39:02Z, eval #850 `44668599585` at 03:42:38Z, and lab #849 `44668604966` at 03:49:33Z (intake 03:49:53Z). The #863 test `44667391044` survived and approved at 03:50:42Z, and the #745 lab pushed at 03:48:38Z, but the wall is not claimed clear.
- **Schedules:** curator last success `44605505591` at 2026-11-19T20:09:02Z; auditor last success `44471789577` at 2026-11-19T06:23:18Z; recover `44653552844` at 01:25:46Z success. No schedule tick in the recent window, so the cron throttle is broad.
- **Pages:** production deploy `44670828953` success 03:55:08Z on `13d5bd8de`; live root returns HTTP 200. Preview deploy `44660010716` success 02:19:58Z.
- **Model registry:** fresh read at 03:56Z: **91 models / 11 free**. Free ids: `beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `hy4-flash-free`, `iceman-free`, `jev-1.13-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, `tidepool-alpha-free`. `glm-5.3-flash-free` is absent; the pin, rung 2, and the #863 rung 3 are live.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo names. Zero missing, zero extra. The three dynamic GitHub-managed names are not triage targets.

### Live lanes and their next step

- **#863 / #836 (third rung + decision contract, protected path):** eval live at `e8334146`. Next: on `approve-eval`, merge with the PAT sweep, verify Pages, and keep #836 open; on `fix`, route the lab (protected paths) and re-verify.
- **#745 / #742 + #853 (protected-path rebase):** the lab is live on the remaining findings after `f95e5554`. Next: on a completed push, verify all eight findings, a fresh head-bound review, test, eval, PAT merge sweep; close #853 after the merge and keep #742 open.
- **#850 / #848 (protected-path lab lane):** the eval is wall-dead; the Tester approval at `9c9bf1bd` stands. Next: re-arm the eval once on a later wake after this cooldown; on `approve-eval`, merge, verify Pages, close #848.
- **#854 / #803 (protected-path slice 3):** the lab is wall-dead with no push. Next: re-arm on a later wake after this cooldown; on a push, review, test, eval, merge sweep. Keep #803 open until all three slices land; keep `Closes #803` only if all three land.
- **#849 (fail-loud hardening):** the lab is wall-dead at 03:49:33Z. Next: re-arm once after the cooldown with the expanded scope; then #857, #856, #860 in that order (#860 only after #854).
- **#836 (capacity):** open for the Owner capacity decision and the remaining proposals. No new lab dispatch now; #863 is the rung/contract slice.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- Three maintainer sessions overlapped in this window: `44670232463` on #745 (live), `44670454318` on #863 (success 03:58:23Z), and this run on #862. The #862 merge was executed by a targeted wake before this session could, so this run verified rather than re-merged. The lesson holds: always re-read the PR state immediately before merging.
- The peer session's 03:57Z note explicitly held #850/#854/#849 "inside the wall cooldown". This run honors that and chains no same-pool retry. The next wake after the window re-arms each once.
- The wall remains live: three lanes died on it between 03:39Z and 03:49Z, but the #863 test survived and approved, and #745's lab pushed, so some egress IPs are passable. Do not claim the wall is clear.
- If a lane returns fix, route the Fixer (or lab when protected paths are involved); if it approves, follow the gate chain. Never merge without a head-fresh Tester marker and a head-bound `approve-eval`.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the wall has cleared, and no live/queued run exists)

1. `{"action":"eval","pr":863}`: live `44671178373`; do not duplicate. On `approve-eval`, merge with the PAT sweep and keep #836 open.
2. `{"action":"eval","pr":850}`: wall-dead again at 03:42:38Z; wait for the next wake after this window, then re-arm once; on `approve-eval`, merge and close #848.
3. `{"action":"lab","pr":854}`: wall-dead at 03:39:02Z with no push; wait for the next wake after this window, then re-arm once; on a push, review/test/eval; keep #803 open unless all three slices land.
4. `{"action":"lab","issue":849}`: wall-dead at 03:49:33Z; wait for the next wake after this window, then re-arm once; on a push, the review/test chain.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
8. #745: no dispatch; the lab and the target session are live. Follow their handoff.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. Read the #863 eval result. On `approve-eval`, merge with the protected-path PAT sweep, verify Pages, and keep #836 open; on `fix`, route the lab and re-verify.
2. Read the #745 lab result. On its completion, verify all eight findings against the push, then a head-bound review, test, eval, and merge; close #853 after the merge, keep #742 open.
3. Re-arm #850, #854, and #849 once on the next wake after this cooldown. Never chain another same-pool retry now.
4. #862 is done: merged, #861 closed, Pages green. No further action on that lane.
5. #850/#854/#849 approvals and findings stay valid at their heads unless a new push moves them.
6. The `INFRA-STATUS` block on #70 is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
7. #836 remains open for the capacity proposals. The #863 patch restores rung 3 and the contract only; do not close the issue on the merge.
8. Auditor: no 11-20 tick yet; observed cadence is mid-morning UTC. No dispatch unless it crashes or the gap passes the usual band.
9. Curator: last success 2026-11-19T20:09Z; today's ticks are throttled. This is the known platform throttle, not a curator defect; no dispatch.
10. Model registry drift: `glm-5.3-flash-free` is gone; the ladder is 2/3 on `main` until #863 merges. The PR's rung 3 is live.
11. Prompt/envelope drift: the staged `maintainer.md` and the `maintainer.yml` envelope still omit `design-ux`/`design-visual`/`design-motion`; #863 fixes both. Do not use the focused design actions as a justification to edit prompts directly.
12. Maintainer cron throttling: the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
13. Pages: production is green on `13d5bd8de`; the preview artifact redeploys on PR updates. No manual dispatch.
14. Workspace: this run's tree is the trusted `main` checkout; the #831 bootstrap move applies to PR wakes only.
15. Memory: the 2026-11-20 file now carries the 01:31Z, 02:20Z, 03:23Z, 03:39Z, and this 04:00Z entry. The log publish is append-only with keep-both semantics.
16. No merge this run; no trigger dispatched this run.

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
- The pipeline is green on main (`13d5bd8de`; Pages `44670828953`), but the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP; the wall is pool-wide and killed three lanes between 03:39Z and 03:49Z, while the #863 test survived and #745's lab pushed. No same-IP retry inside a window.
- The ladder on `main` is 2/3 until #863 merges; keep the pin and rung 2 live (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`). The #863 replacement rung is live.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #863 eval result. On `approve-eval`, merge with the protected-path PAT sweep, verify Pages, and keep #836 open; on `fix`, route the lab.
2. Read the #745 lab result. On its push, verify all eight findings, then a head-bound review, test, eval, and merge; close #853 after the merge and keep #742 open.
3. On the next wake after the wall cooldown, re-arm #850 (eval), #854 (lab), and #849 (lab) once each. Never chain another same-pool retry now.
4. On a #854 push, keep #803 open unless all three slices are present. On a #849 push, dispatch #857, then #856, then #860.
5. #862 is complete; do not reopen. Verify the production site and board invariant, and stand by.
6. Verify the allowlist, registry/ladder, Pages, and schedule health; if clean, stand by.

## Open questions

1. Will the #863 eval approve on `e8334146`, and will the merge then clear the third rung?
2. Will the #745 lab finish the remaining findings and keep the head push-clean?
3. Do the #850/#854/#849 lanes survive when the next wake re-arms them?
4. Does the rebased `main` stay green through the next project merge?
5. Does #836 still need an Owner capacity decision after #863 lands?
