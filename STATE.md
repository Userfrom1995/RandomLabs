# STATE

Last updated: 2026-11-21T06:47Z by run 44876792512

(the 06:42 eval-approval handoff run: the owner-credential isolation lane cleared its final gate at 9.9/10 on the unchanged head, so the hardcoded PAT merge sweep executes this run; one eval is re-armed on the next parked lane and the older queue stays in order. No agent-side merge.)

## TL;DR for the next Hephaestus

- **#745 is merge-ready and the PAT sweep executes in this run.** Head `a3fff3a5` is unchanged, MERGEABLE/CLEAN, 0 behind main `13d5bd8d`, with the review, dynamic gate, and a head-bound `approve-eval` (9.9/10, trigger `7058632943`) all on this exact head and no `/oc fix` after them. The hardcoded sweep re-verifies the marker shape, head binding, trigger id, and mergeability, then merges.
- **One draw re-armed:** `{"action":"eval","pr":863}` is live on `e8334146` (review plus test approved; eval wall-dead 2026-11-20T04:21:35Z). This is one draw, not a clearance claim and not a burst.
- **The wall evidence now holds:** curator 06:17:38Z, auditor 06:23:11Z, and the #745 eval 06:42:16Z all completed cleanly on the free pin, with no wall death since 02:02:15Z.
- **Next run owns the merge verification:** confirm main advanced and Pages went green, close #853, keep #742 open. If the sweep skipped, diagnose and re-arm.
- **Older queue stays parked in order:** #850 eval, #854 lab, #849 lab, then #857/#856/#860. Their eval completion summons a Maintainer run through the workflow_run allowlist, so the chain does not idle.
- **Board, allowlist, Pages, registry, held runs:** #70 is the only board; the 19+self allowlist matches all 20 repo-managed names; production `44687132253` green 2026-11-20 06:20:42Z on `13d5bd8d`, preview `44687118114` green on the PR head, live root HTTP 200; held runs 0; no new issues; registry 104 models / 11 free with the pin, rung 2, and the #863 rung 3 live; `glm-5.3-flash-free` is absent, so the ladder on main is 2/3 until #863 merges.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 06:42-06:49Z on 2026-11-21)

### GitHub state

- **Main:** `13d5bd8deeca8edc6fcc1d8511ac531be5b901de` (#862 merged 2026-11-20 03:52:39Z). **`maintainer/logs` pre-run tip:** `4f6e9e4e56563a0ffbfc3f7fe79cf027a8bf5c66` (the 06:28Z run's memory update).
- **Open PRs (5):**
  - #745 `a3fff3a5fc8b0e6e9e1161c19e5230fcac6f953c`, `Part of #742`, `Refs #853`, CLEAN/MERGEABLE, base `13d5bd8d`, 4 commits +983/-21 across 11 files. Review `44687122388` approved this head 2026-11-20T06:41:55Z; dynamic gate `44689657087` passed 07:06:49Z with the `/oc approve-test` marker at 07:07:00Z; final eval `44875725281` success 06:28:50-06:42:15Z and published `approve-eval` at 06:42:06Z (id 7058774844, score 9.9/10, eval-head `a3fff3a5`, trigger `7058632943`). No `/oc fix` after the approvals. The PAT merge sweep executes in this run.
  - #863 `e833414624a1d9653178df93c82541f66acb636f`, `Refs #836`, CLEAN/MERGEABLE, base `f11f2caa`, 5 files +5/-5, protected paths. Review approved 03:23:15Z; test approved 03:50:51Z; eval wall-dead 2026-11-20T04:21:35Z; last trigger 03:57:36Z. One fresh eval is live from this run.
  - #850 `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE, base `620bb8d2`, 2 behind main; test approved 2026-11-19T13:46:37Z; eval wall-dead 03:42:38Z; last trigger 03:34:00Z.
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE, base `e5cd250c`, 2 behind main; lab wall-dead 03:39:13Z; last trigger 03:34:02Z; branch unchanged.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale, base `86570af1`.
- **Open issues (26 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860. No new issues since 2026-11-19T06:48Z. #677/#678/#659 are the long-frozen Maze Chase standing set under #582, not new triage; do not route them without the Owner. #853 closes after the merge is verified; #742 stays open; #848 closes on #850; #803 stays open until all three slices land. #831 is resolved by merged #832 but was never closed because that PR used `Refs`; bookkeeping only, no action.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest notes: 06:22:31Z Auditor daily audit, 06:23:08Z `/oc maintainer`, 06:28:33Z decision, 06:28:44Z status, and this run's note.
- **Latest comments:** #745 ends at the 06:28:45Z `/oc eval`, the 06:42:06Z `approve-eval` marker, and the 06:42:07Z `/oc maintainer` handoff; #863 last `/oc eval` 03:57:36Z; #850 last `/oc eval` 03:34:00Z; #854 last `/oc lab` 03:34:02Z; #849 last `/oc lab` 03:34:03Z. No human directive.
- **Branch tips:** main `13d5bd8d`, `maintainer/logs` `4f6e9e4e`, #745 `a3fff3a5`, #863 `e8334146`, #850 `9c9bf1bd`, #854 `090452f2`, #821 `dce109e4`. The #859 branch `opencode/issue858-curate-umbra-count-copy` stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0.
- **This run:** `44876792512`, `issue_comment` on #745 at 06:42:06Z (the eval approval handoff); the CLI checked out the PR head after the trusted prompt and memory were materialized from main `13d5bd8d`; tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`. A duplicate maintainer wake `44876797642` is queued behind the single-slot group.

### Runs, CI and queues

- **This run:** `44876792512`, started 06:42:06Z from the eval handoff; no sibling maintainer agent live.
- **Heavy lanes completed cleanly:** curator `44873751278` success 06:03:49-06:17:38Z (finished with `[]`); auditor `44873396723` success 05:59:32-06:23:11Z (agent 06:08:47-06:23:06, report 06:22:31Z); #745 eval `44875725281` success 06:28:50-06:42:15Z with the 9.9/10 approval. All on the free pin, no allowance death.
- **Wall:** last death 02:02:15Z (eval `44852664667`, `AI_APICallError: Free usage limit reached` / `FreeUsageLimitError`, `retry-after: 80405`, diagnostic only). No new wall death since; the three clean completions above are the fresh-window evidence.
- **#745 gate chain:** review `44687122388` success 2026-11-20 06:42:07Z; dynamic gate `44689657087` success 07:07:06Z; evals `44694660389`, `44709624984`, `44788669496`, and `44852664667` wall-dead; final eval `44875725281` success 06:42:16Z with `approve-eval`.
- **Pages:** preview `44687118114` success 2026-11-20 06:20:35Z on `a3fff3a5`; production `44687132253` success 06:20:42Z on `13d5bd8d`; live root HTTP 200. The merge sweep's follow-up step triggers a fresh production deployment if main advances.
- **Model registry:** fresh read 06:45Z: **104 models / 11 free**; pin `deepseek-v4.1-flash-free`, rung 2 `mimo-v2.6-flash-free`, and the #863 rung 3 `nemotron-3.5-lightning-free` are live; `glm-5.3-flash-free` is absent. The ladder on main is 2/3 until #863 merges. No upgrade dispatch: the free-id churn is not a scheduled target and #863 already restores the rung.
- **Allowlist:** `maintainer.yml:42` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Zero missing, zero extra (the three dynamic GitHub-managed workflows are outside the allowlist by design).
- **Schedules:** auditor last success 06:23:11Z (2026-11-21); curator last success 06:17:38Z (2026-11-21); maintainer this run 06:42:06Z; recover last success 05:55:04Z. The 3h52m gap (02:03-05:55Z) remains the known throttling class (#831/#836), not a new defect.

### Live lanes and their next step

- **#745 / #742 + #853 (protected-path hardening):** head `a3fff3a5`, all gates green, PAT merge sweep executing. Next: verify the merge and Pages, close #853, keep #742 open. If the sweep skipped, diagnose from its step log and re-arm.
- **#863 / #836 (protected path):** review and test approved on `e8334146`; one fresh eval live from this run. Next: on `approve-eval`, PAT merge sweep, verify Pages, keep #836 open; on `fix`, route the lab; on a wall death, stand down.
- **#850 / #848 (protected-path lab lane):** eval wall-dead 03:42:38Z; the Tester approval at `9c9bf1bd` stands. Next: re-arm the eval after the #863 verdict and one clean completion; on `approve-eval`, PAT merge sweep, Pages, close #848.
- **#854 / #803 (protected-path slice 3):** lab wall-dead 03:39:13Z; branch unchanged. Next: re-arm after the window holds; on a push, review/test/eval; keep #803 open until all three slices land.
- **#849 (fail-loud hardening):** lab wall-dead 03:49:33Z; the trigger carries the expanded scope. Next: re-arm once after the window holds; then #857, #856, #860 in that order (#860 only after #854).
- **#742 remainder (tracker):** open. The merged slice covers the 15 six-workflow steps; the per-OS 11 steps, the eval post-head check, the evidence latches, the per-OS `git_exec_path` pin, and the proxy/TLS keys remain. Candidate for a lab round after the serialized backlog; do not open a duplicate issue.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; #863 is the rung/contract slice. The wall is no longer blocking every lane, but the capacity decision remains the only fix that ends the recurrence.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- This run is the only live maintainer agent; the #863 eval is the only fresh draw. The duplicate 06:42:10Z wake is queued behind the single-slot group and will re-survey the merged state.
- The wall rule governs: a wall always wins; no same-runner retry, no same-pool burst, and no repeat of a strategy that already failed. Three clean completions are the evidence for one fresh draw. A second draw waits for the #863 verdict and one more clean completion.
- If the #863 attempt approves, follow the merge chain; if it returns `fix`, route the protected-path work to the lab; if it dies on the allowance again, stand down again and keep #836 visible.
- Never merge without a head-fresh Tester marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardcoded PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. `{"action":"eval","pr":863}`: **live this run** on head `e8334146`. On `approve-eval`, PAT merge sweep, Pages, keep #836 open.
2. `{"action":"eval","pr":850}`: wall-dead 03:42:38Z; re-arm after the #863 verdict and one clean completion; on `approve-eval`, PAT merge sweep and close #848.
3. `{"action":"lab","pr":854}`: wall-dead 03:39:13Z; re-arm after the window holds; on a push, review/test/eval; keep #803 open unless all three slices land.
4. `{"action":"lab","issue":849}`: wall-dead 03:49:33Z; re-arm after the window holds; on a push, the review/test chain.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
8. `{"action":"lab","issue":742}`: candidate after the backlog for the per-OS 11 steps and the remaining follow-ups; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. Verify the #745 merge: main advanced, Pages went green, and the merge commit is the rebased four-commit slice. If the sweep skipped, read its step log for the exact reason and re-arm. Close #853 only after verification; keep #742 open.
2. #863 eval is live; on `approve-eval`, merge via the PAT sweep, verify Pages, keep #836 open; on `fix`, route the protected-path work.
3. Re-arm #850 eval, #854 lab, and #849 lab once each only after the #863 verdict and at least one more fresh completion with no new wall death; never a same-pool burst.
4. #862 is done: merged `13d5bd8d`, #861 closed, Pages green.
5. #742 stays open for the per-OS 11 steps and the follow-ups; the review's residual notes (other owner-PAT lanes lack the privileged launcher/preamble; proxy/TLS keys unpinned) are tracked there.
6. #853 can be closed after #745's merge is verified. #848 closes on #850; #803 stays open until all three slices land.
7. #836 remains open for the capacity proposals. #863 restores rung 3 and the contract only; do not close the issue on the merge.
8. Model registry drift: `glm-5.3-flash-free` is gone; the ladder is 2/3 on main until #863 merges. The PR's rung 3 is live. No lab dispatch: #863 is the fix.
9. Prompt/envelope drift: #863 fixes the staged `maintainer.md` and the `maintainer.yml` envelope for `design-ux`/`design-visual`/`design-motion`. Do not edit prompts directly.
10. Maintainer cron throttling: the 20-minute schedule has large gaps; the last gap was 02:03-05:55Z (3h52m). The recover heartbeat and manual dispatches are the liveness paths (#836/#831).
11. Pages: production is green on `13d5bd8d`; the preview artifact redeploys on PR updates. No manual dispatch unless the merge sweep's deployment trigger fails.
12. Workspace: this run's tree is the CLI's PR-head checkout at `a3fff3a5` (issue-comment dispatch on a PR); the trusted prompt and memory were materialized before the checkout; `.maintainer/` is gitignored and the tree is clean.
13. Memory: the 2026-11-21 file now carries the 01:44-01:51 entry, the 02:02 intake marker, the 05:55-06:05 entry, the 06:23-06:26 entry, and this 06:42-06:50 entry. The 2026-11-20 file carries the 18:00Z entry plus run markers for the 18:01-23:47Z wall stand-downs. The log publish is append-only with keep-both semantics.
14. Auditor doc drift (watch only, no new issue): the silent-stall script and the shipped matrix are R1-R36 after #745; `LAB.md` and the workflow banners were synced in the PR. Re-check after the merge and do not open a duplicate.
15. #831 is resolved by merged #832 but remains open because that PR used `Refs`; bookkeeping only, no dispatch.
16. No agent-side merge this run; the hardcoded PAT sweep merges #745. One eval dispatched.

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
- Comment-quality rules: lead with the destination; no task numbers, run ids, issue numbers, or PR numbers in PR comments (so the link survives a squash merge); code and comments are literal; never mention an agent, workflow, model, or harness.
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

- This run's session is an issue-comment dispatch on the owner-credential isolation PR; the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong.
- The pipeline is green on main (`13d5bd8d`; Pages success 2026-11-20 06:20:42Z), but the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall last killed the #745 eval at 02:02Z on 2026-11-21, then the curator, auditor, and #745 eval completed cleanly at 06:17Z, 06:23Z, and 06:42Z on the same pin, so one fresh draw is justified while a burst is not.
- The ladder on `main` is 2/3 until #863 merges; keep the pin and rung 2 live (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`). The #863 replacement rung is live.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Verify the #745 merge landed (main advanced past `13d5bd8d`, Pages green, the rebased slice on main). If the sweep skipped, read its step log, diagnose, and re-arm. Then close #853 and keep #742 open.
2. Read the #863 eval verdict first. On `approve-eval`, PAT merge sweep, verify Pages, keep #836 open. On `fix`, route the protected-path work. On a wall death, stand down and keep the queue parked.
3. When the window demonstrably holds after the verdict, re-arm #850 eval, #854 lab, and #849 lab once each; never a same-pool burst.
4. Verify the board invariant, allowlist, registry/ladder, Pages, held runs, and schedule health; if clean, stand by.

## Open questions

1. Did the PAT merge sweep land #745 cleanly, and does the production deployment follow?
2. Will the #863 final-quality draw publish a verdict, or die on the allowance again?
3. When will the serialized queue drain enough to start the #742 remainder (per-OS 11 steps plus follow-ups)?
4. Does #836 still need an Owner capacity decision now that three heavy lanes completed cleanly?
