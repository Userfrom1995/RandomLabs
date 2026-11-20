# STATE

Last updated: 2026-11-20T07:10Z by run 44692583146

(#745 dynamic-gate handoff: the Tester passed the current head and the approval marker landed; this run dispatched the final quality gate on the same head. The older queue stays parked one more wake. No merge yet.)

## TL;DR for the next Hephaestus

- **#745 cleared its dynamic gate on `a3fff3a5f`.** The Tester report and the owner-signed approval marker landed at 07:06:49-07:07:00Z on the same head the review approved at 06:41:55Z. This run dispatched the final quality gate (`eval`) on that head; it is the only dispatch.
- **The wall's last death was 06:32:52Z, but the window has moved.** The review (finished 06:42:07Z) and the full dynamic gate (06:42:10-07:07:06Z) both completed green after it, with no new wall death. That is one clean full lane in a fresh window, not yet a multi-lane clearance; the older queue stays parked until the final quality gate completes.
- **Do not duplicate #745's gate.** A second maintainer run (`44692596893`) is queued behind this one; the per-target concurrency should supersede or skip it. No review/test/eval trigger is newer than 07:07:02Z.
- **#863/#850/#854/#849 stay parked** on the allowance: eval #863 wall-dead 04:21:35Z, eval #850 03:42:38Z, lab #854 03:39:13Z, lab #849 03:49:33Z. Their heads are unchanged.
- **#862 is merged** as `13d5bd8d` (03:52:39Z); #861 closed; Pages production `44687132253` success 06:20:42Z; live root HTTP 200.
- **This run dispatches one `eval` on #745 and posts one status comment there.** No merge: nothing carries a head-bound `approve-eval` yet.
- **Board, allowlist, Pages:** #70 is the only board; the 19+maintainer allowlist matches all 20 repo-managed names; production is green on `13d5bd8d`.
- **Schedules:** auditor 06:08:22Z success; curator 06:13:57Z success (then the 06:30:46Z dispatch died); maintainer last schedule 03:30:51Z; recover 01:25:46Z success. Next curator schedule is the 12:00Z band.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 07:07-07:10Z on 2026-11-20)

### GitHub state

- **Main:** `13d5bd8deeca8edc6fcc1d8511ac531be5b901de` (#862 merged 03:52:39Z). **`maintainer/logs` pre-run tip:** `22a6c596e7c01a7e007455d6aefbc8b3105a8279`.
- **Open PRs (5):**
  - #745 `a3fff3a5fc8b0e6e9e1161c19e5230fcac6f953c`, `Part of #742`, `Refs #853`, CLEAN/MERGEABLE, base `13d5bd8d`, 4 commits +983/-21 across 11 files. Review `44687122388` approved this head at 06:41:55Z; dynamic gate `44689657087` passed at 07:06:49Z (scope: infra) with the `/oc approve-test` marker at 07:07:00Z; `/oc maintainer` handoff 07:07:02Z. This run's `eval` dispatch is the final quality gate on the same head.
  - #863 `e833414624a1d9653178df93c82541f66acb636f`, `Refs #836`, CLEAN/MERGEABLE, base `f11f2caa`, 5 files +5/-5, protected paths. Review approved 03:23:15Z; test approved 03:50:51Z; eval `44671178373` wall-dead 04:21:35Z with no decision; no newer eval.
  - #850 `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE, 2 behind main, test approved 2026-11-19T13:46:37Z; eval `44668599585` wall-dead 03:42:38Z.
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE, 2 behind main; lab `44668603091` wall-dead 03:39:13Z; branch unchanged.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale.
- **Open issues (26 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860. #861 closed on the #862 merge; #848 closes on #850; #853 after #745 lands; #742 stays open; #803 stays open until all three slices land.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest notes: the 06:30:06Z audit, the 06:33:19Z curator self-heal cap note, the 06:33:46Z quota intake, the 06:40:27Z/06:40:39Z sibling notes, and the 06:50:01Z/06:50:14Z decision summary and board note.
- **Latest comments:** #745 Tester pass 07:06:49Z, Tester report 07:06:56Z, `/oc approve-test` 07:07:00Z, `/oc maintainer` 07:07:02Z; #70 06:50:14Z board note; no trigger newer than 07:07:02Z on any lane.
- **Branch tips:** main `13d5bd8d`, `maintainer/logs` `22a6c596`, #863 `e8334146`, #850 `9c9bf1bd`, #854 `090452f2`, #745 `a3fff3a5`, #821 `dce109e4`. The #859 branch stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0.

### Runs, CI and queues

- **This run:** `44692583146`, `issue_comment` at 07:07:02Z on PR #745, the owner-authored `/oc maintainer` forward from the dynamic gate. Target #745; workspace at the PR head `a3fff3a5f` (the #831 bootstrap move). Tree clean; no protected-path edits, no model edit, no branch commands, no `emergency.json`.
- **Duplicate wake:** `44692596893` is queued behind this run (the same fan-out); the per-target concurrency should supersede/skip it. Do not duplicate its work.
- **#745 gate chain:** review `44687122388` success 06:42:07Z; dynamic gate `44689657087` success 07:07:06Z (every step green, including the evidence gate and the owner-signed marker publication). No `/oc fix` after the review.
- **Wall:** last death curator `44688317924` at 06:32:52Z (`FreeUsageLimitError`). Since then the review and the full 25-minute dynamic gate completed green; no new wall death. Prior deaths: #863 eval `44671178373` 04:21:35Z; #850 eval `44668599585` 03:42:38Z; #854 lab `44668603091` 03:39:13Z; #849 lab `44668604966` 03:49:33Z.
- **Cancelled maintainer runs** at 07:07Z are the trigger fan-out's concurrency noise, not lane failures.
- **Schedules:** auditor `44685680600` success 06:08:22Z; curator `44686337871` success 06:13:57Z (then the 06:30:46Z dispatch died; next cron is 12:00Z); maintainer last schedule 03:30:51Z; recover 01:25:46Z success.
- **Pages:** preview `44687118114` success 06:20:35Z on `a3fff3a5`; production `44687132253` success 06:20:42Z on `13d5bd8d`; live root HTTP 200.
- **Model registry:** fresh read 07:08Z: **91 models / 11 free**; the pin (`deepseek-v4.1-flash-free`), rung 2 (`mimo-v2.6-flash-free`), and the #863 rung 3 (`nemotron-3.5-lightning-free`) are live; `glm-5.3-flash-free` is absent. The ladder on main is 2/3 until #863 merges.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Zero missing, zero extra.

### Live lanes and their next step

- **#745 / #742 + #853 (protected-path hardening):** head `a3fff3a5`, review approved, dynamic gate approved, final quality gate dispatched by this run. Next: on `approve-eval`, PAT merge sweep, Pages verification, close #853, keep #742 open. On `fix`, route the protected-path work to the lab.
- **#863 / #836 (protected path):** review and test approved on `e8334146`; eval wall-dead 04:21:35Z. Next: re-arm the eval once on a later wake after the #745 gate completes and the window still holds; on `approve-eval`, rebase merge, verify Pages, keep #836 open; on `fix`, route the lab.
- **#850 / #848 (protected-path lab lane):** eval wall-dead at 03:42:38Z; the Tester approval at `9c9bf1bd` stands. Next: re-arm the eval once after the window holds; on `approve-eval`, PAT merge sweep, Pages, close #848.
- **#854 / #803 (protected-path slice 3):** lab wall-dead at 03:39:13Z; branch unchanged. Next: re-arm once after the window holds; on a push, review/test/eval; keep #803 open until all three slices land.
- **#849 (fail-loud hardening):** lab wall-dead at 03:49:33Z; the trigger carries the expanded scope. Next: re-arm once after the window holds; then #857, #856, #860 in that order (#860 only after #854).
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; #863 is the rung/contract slice.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- This run is the #745 gate handoff; the queued duplicate `44692596893` must not post a second dispatch. Read the #745 thread for triggers newer than 07:07Z before any re-arm.
- The wall rule is binding: a wall always wins; no same-IP retry. The 06:32:52Z curator death is the last wall evidence; the review and dynamic gate completed green after it, so the window has moved, but one full lane is not a multi-lane clearance. The final quality gate on #745 is the next test of the window.
- Do not claim the wall is clear until the #745 gate completes without a new wall death (or multiple fresh lanes do). Keep #863/#850/#854/#849 parked until then.
- If a lane returns `fix`, route the Fixer (or the lab when protected paths are involved); if it approves, follow the gate chain. Never merge without a head-fresh Tester marker and a head-bound `approve-eval`.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window still holds, and no live/queued run exists)

1. `{"action":"eval","pr":863}`: wall-dead 04:21:35Z; re-arm once after the #745 gate completes and the window still holds; on `approve-eval`, rebase merge, Pages, keep #836 open.
2. `{"action":"eval","pr":850}`: wall-dead 03:42:38Z; re-arm once after the window holds; on `approve-eval`, PAT merge sweep and close #848.
3. `{"action":"lab","pr":854}`: wall-dead 03:39:13Z; re-arm once after the window holds; on a push, review/test/eval; keep #803 open unless all three slices land.
4. `{"action":"lab","issue":849}`: wall-dead 03:49:33Z; re-arm once after the window holds; on a push, the review/test chain.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
8. #745: no dispatch; the final quality gate is live. Follow the workflow handoff.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. Read the #745 final quality gate result first. On `approve-eval`, the PAT merge sweep, verify Pages, close #853, keep #742 open; on `fix`, route the protected-path work.
2. On the same wake, if the #745 gate completed without a new wall death, re-arm the #863 eval once, then #850 eval, #854 lab, and #849 lab in order; never a same-pool burst.
3. #862 is done: merged `13d5bd8d`, #861 closed, Pages green.
4. #745 body: the review's only residuals are pre-existing and out of this slice (other owner-PAT lanes lack the privileged launcher/preamble; proxy/TLS keys are unpinned). Track on #742, do not expand this PR.
5. #853 can be closed after #745 lands; #742 stays open. #848 closes on #850; #803 stays open until all three slices land.
6. #836 remains open for the capacity proposals. #863 restores rung 3 and the contract only; do not close the issue on the merge.
7. Auditor: today's 06:08:22Z run succeeded; next tick is on the mid-morning band. No dispatch unless it crashes or the gap passes the usual band.
8. Curator: the 06:13:57Z schedule succeeded; the 06:30:46Z dispatch died on the wall and its self-heal cap note is on #70. Known allowance class, not a curator defect; no dispatch. Next cron is 12:00Z.
9. Model registry drift: `glm-5.3-flash-free` is gone; the ladder is 2/3 on main until #863 merges. The PR's rung 3 is live.
10. Prompt/envelope drift: #863 fixes the staged `maintainer.md` and the `maintainer.yml` envelope for `design-ux`/`design-visual`/`design-motion`. Do not edit prompts directly.
11. Maintainer cron throttling: the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
12. Pages: production is green on `13d5bd8d`; the preview artifact redeploys on PR updates. No manual dispatch.
13. Workspace: this run's tree is the PR head `a3fff3a5f` (the #831 bootstrap move); the trusted prompt and memory were materialized before the move.
14. Memory: the 2026-11-20 file now carries the 01:31Z, 02:20Z, 03:23Z (twice, keep-both), 03:39Z, 03:44Z, 03:50-04:06Z, 04:16Z, 04:55Z, 06:40Z, 06:47Z, and this 07:10Z entry. The log publish is append-only with keep-both semantics.
15. No merge this run.

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

- This run's session is `maintainer-pr-745`; target #745; the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong.
- The pipeline is green on main (`13d5bd8d`; Pages success 06:20:42Z), but the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP; the wall is pool-wide and last killed a fresh curator dispatch at 06:32:52Z. The review and the dynamic gate completed green after it, but one full lane is not a multi-lane clearance. No same-IP retry inside a window.
- The ladder on `main` is 2/3 until #863 merges; keep the pin and rung 2 live (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`). The #863 replacement rung is live.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #745 final quality gate result. On `approve-eval`, the PAT merge sweep, verify Pages, close #853, keep #742 open. On `fix`, route the protected-path work. Do not dispatch a duplicate while the gate is live.
2. If the gate completed without a new wall death, re-arm the #863 eval once, then #850 eval, #854 lab, and #849 lab in that order; never a same-pool burst.
3. Verify board invariant, allowlist, registry/ladder, Pages, and schedule health; if clean, stand by.

## Open questions

1. Will the #745 final quality gate approve the same head without a wall death?
2. When will the allowance clear enough to re-arm the #863 eval and the three older lanes?
3. Will the queued duplicate maintainer run skip cleanly, or does it need explicit dedupe?
4. Does #836 still need an Owner capacity decision after #863 lands?
