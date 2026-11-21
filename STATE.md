# STATE

Last updated: 2026-11-21T06:54Z by run 44877315719

(the #745 merge-event run: the owner-credential isolation slice landed on the trunk and production redeployed green; #853 is closed; the next lane is conflict-dirty after the merge and the queue stays parked behind one live final-quality draw.)

## TL;DR for the next Hephaestus

- **#745 is merged and live.** Main is `eca3be8e7055f343894e25b315df8e01e80b60ec` (rebase-merged 2026-11-21T06:48:48Z). The merged tree `5f17b3e0` is identical to the approved head `a3fff3a5`, so the reviewed, dynamically validated, and evaluated content is exactly what landed (11 files +983/-21). Production `44877316473` succeeded 06:49:35Z and the live root returns HTTP 200.
- **#853 is closed (completed, 06:51:56Z).** The orphaned-PR audit's subject is resolved. #742 stays open for the remaining owner-credential work, #803 stays open for #854, and #848 closes on #850.
- **One draw is live:** the #863 eval `44877291766` started 06:48:32Z and its evaluator agent is live. No new draw this run; the wall rule still governs.
- **#850 is now CONFLICTING/DIRTY** because the merge touched `.github/scripts/silent-stall-audit.sh` and the workflow files it also edits. Its test approval is on the old head `9c9bf1bd`; a rebased head needs fresh gates. When the queue reaches it, dispatch the lab rebase first, then the review/test/eval chain.
- **The older queue stays parked in order:** #850 (rebase, then gates), #854 lab, #849 lab, then #857/#856/#860. Their completions summon the Maintainer through the workflow_run allowlist, so the chain does not idle.
- **Board, allowlist, Pages, registry, held runs:** #70 is the only board; the 19+self allowlist matches all 20 repo-managed names; production is green on `eca3be8e`; held runs 0; registry 104 models / 11 free with the pin, rung 2, and the #863 rung 3 live; `glm-5.3-flash-free` is absent.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 06:49-06:56Z on 2026-11-21)

### GitHub state

- **Main:** `eca3be8e7055f343894e25b315df8e01e80b60ec` (#745 merged 2026-11-21T06:48:48Z; the four commits `ee7e2c02`, `f76177c5`, `c07ab98b`, `eca3be8e`). **`maintainer/logs` pre-run tip:** `cac181c22a0eed4f1eb39af2af50ead381c87ff5`.
- **Open PRs (4):**
  - #863 `e833414624a1d9653178df93c82541f66acb636f`, `Refs #836`, CLEAN/MERGEABLE, base `f11f2caa`, 5 files +5/-5, protected paths. Review approved 2026-11-20T03:23:15Z; test approved 03:50:51Z; eval `44877291766` live since 06:48:32Z (last trigger `/oc eval` 06:48:29Z).
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE, base `e5cd250c`; lab wall-dead 03:39:13Z; last trigger 03:34:02Z; branch unchanged.
  - #850 `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, **CONFLICTING/DIRTY** after the #745 merge (base `620bb8d2`, was CLEAN before); test approved 2026-11-19T13:46:37Z on this head; eval wall-dead 03:42:38Z; last trigger 03:34:00Z.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale, base `86570af1`.
- **Open issues (25 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #856, #857, #860. #853 was closed completed this run. No new issues since 2026-11-19T06:48Z. #677/#678/#659 are the long-frozen Maze Chase standing set under #582, not new triage; do not route them without the Owner. #742 stays open; #848 closes on #850; #803 stays open until all its slices land; #831 is resolved by merged #832 but remains open (that PR used `Refs`), bookkeeping only.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest notes: 06:22:31Z Auditor daily audit, 06:23:08Z `/oc maintainer`, 06:28:33Z decision, 06:28:44Z status, 06:48:27Z merge note, and this run's note.
- **Latest comments:** #745 ends at the 06:48:28Z status and the merge; #863 last `/oc eval` 06:48:29Z (eval live); #850 last `/oc eval` 03:34:00Z; #854 last `/oc lab` 03:34:02Z; #849 last `/oc lab` 03:34:03Z. No human directive newer than the 06:48:29Z trigger.
- **Branch tips:** main `eca3be8e`, `maintainer/logs` `cac181c2`, #863 `e8334146`, #850 `9c9bf1bd`, #854 `090452f2`, #821 `dce109e4`. The #859 branch `opencode/issue858-curate-umbra-count-copy` stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs from 2026-09-25/10-05/11-11; no live maintainer sibling.
- **This run:** `44877315719`, `pull_request` closed event at 06:48:51Z (`PR_MERGED: true`); the CLI checked out the PR head `a3fff3a5` after the trusted prompt and memory were materialized from main `13d5bd8d`; tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **#745 merge chain:** the final eval `44875725281` success 06:28:50-06:42:15Z, `approve-eval` at 06:42:06Z (9.9/10, head `a3fff3a5`, trigger `7058632943`); the PAT sweep merged at 06:48:48Z; the push Pages deploy `44877315248` was cancelled as superseded; the workflow_dispatch deploy `44877316473` succeeded 06:49:35Z on `eca3be8e`; the live root returns HTTP 200.
- **Live:** #863 eval `44877291766` (started 06:48:32Z; every pre-agent step through the evidence binding green; evaluator agent live since 06:48:46Z).
- **Heavy lanes completed cleanly earlier:** curator `44873751278` success 06:03:49-06:17:38Z; auditor `44873396723` success 05:59:32-06:23:11Z; #745 eval 06:42:15Z. All on the free pin.
- **Wall:** last death 02:02:15Z (`44852664667`, `AI_APICallError: Free usage limit reached` / `FreeUsageLimitError`, `retry-after: 80405`, diagnostic only). No new wall death since; the three clean completions plus the merge chain are the fresh-window evidence.
- **Pages:** production `44877316473` success 06:49:35Z on `eca3be8e`; live root HTTP 200. The preview artifact redeploys on PR updates.
- **Model registry:** fresh read 06:52Z: **104 models / 11 free**; pin `deepseek-v4.1-flash-free`, rung 2 `mimo-v2.6-flash-free`, and the #863 rung 3 `nemotron-3.5-lightning-free` are live; `glm-5.3-flash-free` is absent. The ladder on main is 2/3 until #863 merges. No upgrade dispatch.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Zero missing, zero extra (the three dynamic GitHub-managed workflows are outside the allowlist by design).
- **Schedules:** auditor last success 06:23:11Z (2026-11-21); curator last success 06:17:38Z (2026-11-21); maintainer this run 06:48:51Z; recover last success 05:55:04Z. The long scheduler gaps remain the known throttling class (#831/#836), not a new defect.

### Live lanes and their next step

- **#863 / #836 (protected path):** review and test approved on `e8334146`; one final-quality draw live. Next: on `approve-eval`, PAT merge sweep, verify Pages, keep #836 open; on `fix`, route the lab; on a wall death, stand down.
- **#850 / #848 (protected-path lab lane):** now CONFLICTING/DIRTY after the #745 merge; test approval is on the old head `9c9bf1bd`. Next when the queue reaches it: lab rebase onto current main, then a fresh review/test/eval chain; on `approve-eval`, PAT merge sweep, Pages, close #848.
- **#854 / #803 (protected-path slice 3):** lab wall-dead 03:39:13Z; branch unchanged; CLEAN/MERGEABLE. Next: re-arm after #850, then on a push run review/test/eval; keep #803 open until all its slices land.
- **#849 (fail-loud hardening):** lab wall-dead 03:49:33Z; the trigger carries the expanded scope (including the #853 deferral guard). Next: re-arm once after #854; then #857, #856, #860 in that order (#860 only after #854).
- **#742 remainder (tracker):** open. The merged slice covers the 15 six-workflow steps; the other lanes still need the privileged launcher and the preamble, and the follow-ups remain (post-agent head check, evidence latches, per-OS `git_exec_path` pin, proxy/TLS keys). Candidate for a lab round after the serialized backlog; do not open a duplicate issue.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; #863 is the rung/contract slice. The wall is no longer blocking every lane, but the capacity decision remains the only fix that ends the recurrence.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- This run is a merge-event run, not a scheduled draw. The #863 eval is the only fresh draw. The duplicate workflow_run maintainer fan-outs all skipped on the single-slot group.
- The wall rule governs: a wall always wins; no same-runner retry, no same-pool burst, and no repeat of a strategy that already failed. The merge chain plus the earlier clean completions are the evidence for one fresh draw. A second draw waits for the #863 verdict and one more clean completion.
- If the #863 attempt approves, follow the merge chain; if it returns `fix`, route the protected-path work to the lab; if it dies on the allowance again, stand down again and keep #836 visible.
- Never merge without a head-fresh Tester marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardcoded PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. `{"action":"eval","pr":863}`: **live this run** on head `e8334146`. On `approve-eval`, PAT merge sweep, Pages, keep #836 open.
2. `{"action":"lab","pr":850}`: **new conflict from the #745 merge**; rebase first, then its review/test/eval chain. On `approve-eval`, PAT merge sweep and close #848.
3. `{"action":"lab","pr":854}`: wall-dead 03:39:13Z; re-arm after #850; on a push, review/test/eval; keep #803 open unless all its slices land.
4. `{"action":"lab","issue":849}`: wall-dead 03:49:33Z; re-arm after #854; on a push, the review/test chain.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
8. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. Read the #863 verdict. On `approve-eval`, the PAT sweep merges it, Pages redeploys, and #836 stays open; on `fix`, route the protected-path work; on a wall death, stand down.
2. #850 is now conflict-dirty; its old test approval does not bind a rebased head. Rebase through the lab lane when the queue reaches it, then run the fresh gates.
3. Re-arm #854 lab and #849 lab once each only after the #863 verdict and at least one more fresh completion with no new wall death; never a same-pool burst.
4. #745 is done: merged `eca3be8e`, Pages green, #853 closed. #742 stays open for the remaining owner-credential work; the review's residual notes (other lanes lack the privileged launcher/preamble; proxy/TLS keys unpinned) are tracked there.
5. #848 closes on #850; #803 stays open until all its slices land.
6. #836 remains open for the capacity proposals. #863 restores rung 3 and the contract only; do not close the issue on the merge.
7. Model registry drift: `glm-5.3-flash-free` is gone; the ladder is 2/3 on main until #863 merges. The PR's rung 3 is live. No lab dispatch: #863 is the fix.
8. Prompt/envelope drift: #863 fixes the staged `maintainer.md` and the `maintainer.yml` envelope for `design-ux`/`design-visual`/`design-motion`. Do not edit prompts directly.
9. Maintainer cron throttling: the 20-minute schedule has large gaps; the last gap was 02:03-05:55Z (3h52m). The recover heartbeat and manual dispatches are the liveness paths (#836/#831).
10. Pages: production is green on `eca3be8e`; the preview artifact redeploys on PR updates. No manual dispatch unless a merge sweep's deployment trigger fails.
11. Workspace: this run's tree is the CLI's PR-head checkout at `a3fff3a5` (closed-PR event); the trusted prompt and memory were materialized before the checkout; `.maintainer/` is gitignored and the tree is clean.
12. Memory: the 2026-11-21 file now carries the 01:44-01:51 entry, the 02:02 intake marker, the 05:55-06:05 entry, the 06:23-06:26 entry, the 06:42-06:50 entry, and this 06:49-06:56 entry. The 2026-11-20 file carries the 18:00Z entry plus run markers for the 18:01-23:47Z wall stand-downs. The log publish is append-only with keep-both semantics.
13. Auditor doc drift (watch only, no new issue): the silent-stall script and the shipped matrix are R1-R36 on main after the merge; `LAB.md` and the workflow banners were synced in the PR. Re-check after the next audit and do not open a duplicate.
14. #863 changes the maintainer workflow matrix in the audit script (the embedded prompt/env line) and the `maintainer.md` model example. After it merges, run the full audit once on main (R1-R36) to confirm the merged pins agree; the head-bound eval ran on the pre-merge branch (R1-R35).
15. #850's audit-script diff is large (964 additions) against a pre-R36 base; expect a substantive rebase, not a trivial one, and re-run the full audit on the rebased head.
16. #831 is resolved by merged #832 but remains open because that PR used `Refs`; bookkeeping only, no dispatch.
17. No agent-side merge this run; the hardcoded PAT sweep merged #745 before this run started. No new dispatch; one eval was already live.

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

- This run's session is a merged-PR event on the owner-credential isolation PR; the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong.
- The pipeline is green on main (`eca3be8e`; Pages success 2026-11-21 06:49:35Z), but the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall last killed the #745 eval at 02:02Z on 2026-11-21, then the curator, auditor, and #745 eval completed cleanly at 06:17Z, 06:23Z, and 06:42Z on the same pin, so one fresh draw is justified while a burst is not.
- The ladder on `main` is 2/3 until #863 merges; keep the pin and rung 2 live (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`). The #863 replacement rung is live.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #863 eval verdict first. On `approve-eval`, the PAT merge sweep merges it, verify Pages, keep #836 open. On `fix`, route the protected-path work. On a wall death, stand down and keep the queue parked.
2. When the window demonstrably holds after the verdict, dispatch the #850 lab rebase (now conflict-dirty), then its review/test/eval chain; then #854 lab, #849 lab, #857, #856, #860 in order.
3. Verify the board invariant, allowlist, registry/ladder, Pages, held runs, and schedule health; if clean, stand by.

## Open questions

1. Will the #863 final-quality draw publish a verdict, or die on the allowance again?
2. How much does #850 need to rebase, and will the audit-pin conflicts resolve cleanly?
3. When will the serialized queue drain enough to start the #742 remainder (the other lanes' launcher/preamble plus the follow-ups)?
4. Does #836 still need an Owner capacity decision now that three heavy lanes completed cleanly?
