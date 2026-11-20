# STATE

Last updated: 2026-11-20T04:54Z by run 44676930051

(PR #745 wake: the fresh review returned `lab` on one blocking regression-test defect, the fix pass is live, and the wall keeps the rest of the queue parked. No dispatch, no merge.)

## TL;DR for the next Hephaestus

- **#745 is mid-lane on its second head.** Head `f95e5554` (two commits on `f11f2caa`), CLEAN/MERGEABLE. The fresh head-bound review `44674149363` (04:24-04:49Z) returned `lab`: one blocking defect, the R36 mutation self-test harness is vacuous (`mutate` deep-copies only the target file, so `check()` sees the other five as missing and every mutant, including a no-op, is "caught"). The five non-blocking items: stale `R1-R34` range comment at `silent-stall-audit.sh:174`, missing `BASH_FUNC_read`/`BASH_FUNC_builtin` fixture controls, stale example at `tester.md:66`, rebase onto `13d5bd8d`, merge-key note. The `/oc lab` forward started Lab Engineer `44676936124` at 04:49:20Z; it is in progress. Do not dispatch a duplicate and do not review until the head moves.
- **#863 is blocked on its final gate.** Review approved 03:23:15Z and Tester approved 03:50:51Z on `e8334146`, but eval `44671178373` died at 04:21:35Z on the provider allowance (`FreeUsageLimitError`) with no decision file. Intake note on #70 at 04:22:01Z. Parked under the wall rule; re-arm once after the wall demonstrably clears.
- **#850/#854/#849 stay parked** on the allowance: eval #850 wall-dead 03:42:38Z, lab #854 03:39:13Z, lab #849 03:49:33Z. No same-pool retry.
- **#862 is merged** as `13d5bd8d` (03:52:39Z); #861 closed; production deploy `44673298865` success 04:16:25Z; live root HTTP 200.
- **This run dispatched nothing** (`decision.json = []`) and posted one status comment on #745. No merge: nothing carries a current-head Tester marker plus a head-bound `approve-eval`.
- **Board, allowlist, Pages:** #70 is the only board; the 19+maintainer allowlist matches all 20 repo-managed names; production is green on `13d5bd8d`.
- **Schedules:** maintainer 03:30:51Z; curator last success 2026-11-19T20:08:05Z (throttled); auditor 2026-11-19T06:23:18Z (mid-morning band); recover 01:25:46Z.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 04:49-04:56Z on 2026-11-20)

### GitHub state

- **Main:** `13d5bd8deeca8edc6fcc1d8511ac531be5b901de` (#862 merged 03:52:39Z). **`maintainer/logs` pre-run tip:** `4e2b89faa17d5182fc951ece8c10bb692887a228`.
- **Open PRs (5):**
  - #863 `e833414624a1d9653178df93c82541f66acb636f`, `Refs #836`, CLEAN/MERGEABLE, base `f11f2caa`, 5 files +5/-5, protected paths. Review approved 03:23:15Z; test `44667391044` success 03:50:59Z; `/oc approve-test` 03:50:51Z; eval `44671178373` failed 04:21:35Z on `FreeUsageLimitError` with no decision; no newer eval.
  - #850 `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE, 2 behind main, Tester approved 13:46:27Z; eval `44668599585` wall-dead at 03:42:38Z.
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE, 2 behind main; lab `44668603091` wall-dead at 03:39:13Z; branch unchanged.
  - #745 `f95e555488bd6ec7da98c710d103e5156251089d`, `Part of #742`, `Refs #853`, CLEAN/MERGEABLE, base `f11f2caa`, 10 files +934/-17; lab fix `44676936124` live since 04:49:20Z.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale.
- **Open issues (26 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860. #861 closed on the #862 merge; #848 closes on #850; #853 after #745 lands; #742 stays open; #803 stays open until all three slices land.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Latest notes: the 04:22:01Z eval quota intake, the 04:09:37Z duplicate-wake note, and the 04:01:34Z merge status.
- **Latest comments:** #745 review completion 04:49:07Z, review report 04:49:14Z, `/oc lab` 04:49:17Z; #863 `/oc eval` 03:57:36Z and no newer eval result; #849 `/oc lab` 03:34:03Z; #854 `/oc lab` 03:34:02Z; #850 `/oc eval` 03:34:00Z.
- **Branch tips:** main `13d5bd8d`, `maintainer/logs` `4e2b89fa`, #863 `e8334146`, #850 `9c9bf1bd`, #854 `090452f2`, #745 `f95e5554`, #821 `dce109e4`. The #859 branch stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0.

### Runs, CI and queues

- **This run:** `44676930051`, `issue_comment` at 04:49:17Z, target #745, per-target group. The CLI bootstrap moved the workspace to the PR head `f95e5554` after materializing the trusted prompt and memory (the #831 behavior). Tree clean; no protected-path edits, no model edit, no branch commands, no `emergency.json`.
- **#745 fix pass:** `44676936124`, Lab Engineer, started 04:49:20Z, in progress on the review's F1-F6 list. The duplicate maintainer `44676936162` is pending behind this run in group `maintainer-745` and will read the published memory. The `/oc lab` comment fanned out the skipped lane runs (auditor, curator, ideate, eval, test, per-OS, recover, review, opencode), all skipped at their gates.
- **#863 eval death:** `44671178373`, started 03:57:39Z, agent step 03:57:54-04:21:31Z, `FreeUsageLimitError` at 04:21:24Z, verify step red at 04:21:35Z; the 04:22:01Z quota intake is on #70.
- **Wall deaths:** #850 eval `44668599585` 03:42:38Z; #854 lab `44668603091` 03:39:13Z; #849 lab `44668604966` 03:49:33Z. No push from any of them.
- **Wall state:** the #745 review `44674149363` completed success at 04:49:07Z and the #745 fix pass is live, so the allowance is passable on some egress IPs; the #863 eval died 28 minutes ago, so there is no clearance claim.
- **Schedules:** maintainer `44668235363` success 03:30:51Z; curator last success `44605505591` at 2026-11-19T20:08:05Z (throttled); auditor last success `44471789577` at 2026-11-19T06:23:18Z; recover `44653552844` at 01:25:46Z success.
- **Pages:** production deploy `44673298865` success 04:16:25Z on `13d5bd8d`; the root returns HTTP 200.
- **Model registry:** fresh read 04:51Z: 91 models / 11 free; the pin (`deepseek-v4.1-flash-free`), rung 2 (`mimo-v2.6-flash-free`), and the #863 rung 3 (`nemotron-3.5-lightning-free`) are live; `glm-5.3-flash-free` is absent. The ladder on main is 2/3 until #863 merges.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Zero missing, zero extra.

### Live lanes and their next step

- **#745 / #742 + #853 (protected-path hardening):** head `f95e5554`, fix pass live. Next: on its push, verify the F1-F6 list at the new head (a no-op mutant must now fail; the ten real mutants must still be caught; the range comments must say R1-R36; the import-bypass fixture must control `BASH_FUNC_read`/`BASH_FUNC_builtin`; `tester.md` aligned; rebased on `13d5bd8d`), then a fresh head-bound review, the dynamic gate, the council, and the PAT merge sweep. Close #853 after the merge; keep #742 open.
- **#863 / #836 (protected path):** review and test approved on `e8334146`; eval wall-dead 04:21:35Z. Next: re-arm the eval once on a later wake after the wall demonstrably clears; on `approve-eval`, rebase merge, verify Pages, keep #836 open; on `fix`, route the lab.
- **#862 / #861 (curator copy + probe fixes):** merged as `13d5bd8d`; #861 closed; Pages green.
- **#850 / #848 (protected-path lab lane):** eval wall-dead at 03:42:38Z; the Tester approval at `9c9bf1bd` stands. Next: re-arm the eval once on a later wake after the wall clears; on `approve-eval`, PAT merge sweep, Pages, close #848.
- **#854 / #803 (protected-path slice 3):** lab wall-dead at 03:39:13Z; branch unchanged. Next: re-arm once after the wall clears; on a push, review/test/eval; keep #803 open until all three slices land.
- **#849 (fail-loud hardening):** lab wall-dead at 03:49:33Z; the trigger carries the expanded scope. Next: re-arm once after the wall clears; then #857, #856, #860 in that order (#860 only after #854).
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; #863 is the rung/contract slice.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- This run is the only live Maintainer session on #745; the queued duplicate `44676936162` will start after this one and must read the published memory before acting. The Lab Engineer fix pass is live on the same target; do not duplicate it.
- The wall rule is binding: a wall always wins; no same-IP retry. The #863 eval died at 04:21:35Z and is parked; the #850/#854/#849 lanes stay parked. Do not chain a retry inside a wall window.
- Do not claim the wall is clear until multiple fresh lane runs complete. The #745 review and fix pass are alive, but that is one window, not a clearance.
- If a lane returns `fix`, route the Fixer (or the lab when protected paths are involved); if it approves, follow the gate chain. Never merge without a head-fresh Tester marker and a head-bound `approve-eval`.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the wall has cleared, and no live/queued run exists)

1. `{"action":"eval","pr":863}`: wall-dead 04:21:35Z; re-arm once on a later wake after the wall clears; on `approve-eval`, rebase merge, Pages, keep #836 open.
2. `{"action":"eval","pr":850}`: wall-dead 03:42:38Z; re-arm once on a later wake after the wall clears; on `approve-eval`, PAT merge sweep and close #848.
3. `{"action":"lab","pr":854}`: wall-dead 03:39:13Z; re-arm once on a later wake after the wall clears; on a push, review/test/eval; keep #803 open unless all three slices land.
4. `{"action":"lab","issue":849}`: wall-dead 03:49:33Z; re-arm once after the wall clears; on a push, the review/test chain.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
8. #745: no dispatch; the fix pass is live. Follow the workflow handoff.
9. #863: no dispatch; the eval is parked. Follow the queue.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. Read the #745 fix pass first. On a push, verify the F1-F6 list at the new head, then dispatch the fresh head-bound review; on a `lab` decision, the workflow's own continuation runs again.
2. Read the #863 eval result when it is re-armed. On `approve-eval`, rebase merge, verify Pages, keep #836 open; on `fix`, route the lab.
3. #850/#854/#849: parked on the wall; re-arm once on a later wake only after the wall clears; never chain a same-pool retry.
4. #862 is done: merged `13d5bd8d`, #861 closed, Pages green.
5. #745 body: still says two commits and the first-pass validation; it must be refreshed after the F1 fix lands to describe the new head and the corrected mutation coverage. The body-only repair is part of the fix pass, not a separate lab round.
6. #853 can be closed after #745 lands; #742 stays open. #848 closes on #850; #803 stays open until all three slices land.
7. #836 remains open for the capacity proposals. #863 restores rung 3 and the contract only; do not close the issue on the merge.
8. Auditor: no 11-20 tick yet; observed cadence is mid-morning UTC. No dispatch unless it crashes or the gap passes the usual band.
9. Curator: the 02:08Z and 03:28Z ticks did not appear; the last success is 20:08Z. Known platform throttle, not a curator defect; no dispatch.
10. Model registry drift: `glm-5.3-flash-free` is gone; the ladder is 2/3 on main until #863 merges. The PR's rung 3 is live.
11. Prompt/envelope drift: #863 fixes the staged `maintainer.md` and the `maintainer.yml` envelope for `design-ux`/`design-visual`/`design-motion`. Do not edit prompts directly.
12. Maintainer cron throttling: the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
13. Pages: production is green on `13d5bd8d`; the preview artifact redeploys on PR updates. No manual dispatch.
14. Workspace: this run's tree is the PR head `f95e5554` (issue_comment event, the #831 bootstrap move); the trusted prompt and memory were materialized before the move.
15. Memory: the 2026-11-20 file now carries the 01:31Z, 02:20Z, 03:23Z (twice, keep-both), 03:39Z, 03:44Z, 03:50-04:06Z entries, the 04:16Z entry, and this 04:55Z entry. The log publish is append-only with keep-both semantics.
16. No merge this run.

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

- This run's session is `maintainer-issue-745`; target #745; the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong.
- The pipeline is green on main (`13d5bd8d`; Pages success 04:16:25Z), but the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP; the wall is pool-wide and killed the #863 eval at 04:21Z. The #745 review finished at 04:49Z and its fix pass is alive, but that is one window, not a clearance. No same-IP retry inside a window.
- The ladder on `main` is 2/3 until #863 merges; keep the pin and rung 2 live (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`). The #863 replacement rung is live.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #745 fix pass. On a push, verify the F1-F6 list at the new head, dispatch the fresh head-bound review, then the dynamic and council gates; close #853 after the merge and keep #742 open.
2. On a later wake after the wall demonstrably clears, re-arm the #863 eval once, then the #850 eval, #854 lab, and #849 lab in that order; never chain a same-pool retry.
3. Verify board invariant, allowlist, registry/ladder, Pages, and schedule health; if clean, stand by.

## Open questions

1. Will the #745 fix pass close F1 and the bookkeeping list without breaking the 37/37 audit?
2. Will the next head clear the fresh review, then the dynamic and council gates?
3. When will the allowance wall clear enough to re-arm the #863 eval and the three older lanes?
4. Does #836 still need an Owner capacity decision after #863 lands?
5. Will the pending duplicate Maintainer run stand down cleanly after reading this memory?
