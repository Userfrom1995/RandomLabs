# STATE

Last updated: 2026-11-21T17:48Z by run 44931673530

(final-quality approval handoff on the infrastructure lane: the merge sweep executes; the next lane waits for the post-merge trunk because it edits the same files.)

## TL;DR for the next Hephaestus

- **#863's final quality gate passed.** Eval `44928065181` succeeded 17:04:57-17:44:28Z and published `approve-eval` at 17:44:18Z (comment 7066707257, score 9.9/10, head `e8334146`, trigger `7066194857` = the 17:04:52Z `/oc eval`). Review and test approvals stand; no `/oc fix` ever; CLEAN/MERGEABLE.
- **The PAT merge sweep executes in this run.** It re-verifies the marker shape, head binding, trigger id, ordering, and mergeability before merging, then triggers Pages if main advances. No agent-side merge.
- **#836 will auto-close on the merge.** The PR body carries `Closes #836`, but #863 is only the rung/contract slice. The post-merge run must reopen the capacity tracker and note that the decision is still the Owner's.
- **#850 is the next lane, but only after the merge.** It edits `silent-stall-audit.sh` and `maintainer.yml`, the same files #863 changes; a pre-merge rebase would immediately re-conflict. The post-merge run dispatches the lab rebase onto the new trunk, then its fresh review/test/eval chain.
- **Queue order after #850:** #854 lab, #849 lab, #857, #856, #860 (only after #854), then #742's remainder as a candidate.
- **Window:** the eval completed end to end on the free pin; the last wall death was 07:03:30Z and the last clean heavy completion before this was 06:42:15Z. The window is demonstrably open for one lane at a time, not a burst.
- **Board, allowlist, Pages, registry, held runs:** #70 is the only board; the 19+self allowlist matches all 20 repo-managed names; production is green on `eca3be8e` with the live root at HTTP 200; held runs 0; registry 104 models / 11 free with all three ladder rungs live; `glm-5.3-flash-free` is absent.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 17:45-17:52Z on 2026-11-21)

### GitHub state

- **Main:** `eca3be8e7055f343894e25b315df8e01e80b60ec` (#745 merged 2026-11-21T06:48:48Z). **`maintainer/logs` pre-run tip:** `20f8e9b23b68ba0a50f8902ec3877a762574a947` (the 16:56-17:04 session's memory commit).
- **Open PRs (4):**
  - #863 `e833414624a1d9653178df93c82541f66acb636f`, intent `Refs #836` but the body says `Closes #836`, CLEAN/MERGEABLE, base `f11f2caa` (10 behind main), 5 files +5/-5, protected paths. Review approved 2026-11-20T03:23:15Z; test approved 03:50:51Z (comment 7029835330); no `/oc fix` ever; final eval `44928065181` succeeded 17:04:57-17:44:28Z and published `approve-eval` at 17:44:18Z (comment 7066707257, score 9.9/10, `eval-head: e8334146...`, `eval-trigger: 7066194857` = the 17:04:52Z `/oc eval`, the latest non-bot eval trigger). **The PAT merge sweep executes in this run.**
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE, base `e5cd250c`; lab wall-dead 03:39:13Z; last trigger 03:34:02Z; branch unchanged.
  - #850 `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CONFLICTING/DIRTY after the #745 merge (base `620bb8d2`); test approved 2026-11-19T13:46:37Z on this head; eval wall-dead 03:42:38Z; last trigger 03:34:00Z. Touches `silent-stall-audit.sh` and `maintainer.yml`, the same files #863 changes, so its rebase must target the post-#863 trunk.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale, base `86570af1`.
- **Open issues (25 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #856, #857, #860. No new issues since 2026-11-19T06:48Z. #677/#678/#659 are the long-frozen Maze Chase standing set under #582, not new triage; do not route them without the Owner. #742 stays open; #848 closes on #850; #803 stays open until all its slices land; #831 is resolved by merged #832 but remains open (that PR used `Refs`), bookkeeping only. **#836 is the capacity tracker and must stay open**: #863 only restores rung 3 and aligns the contract.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest notes: 09:31:02Z wall status, 09:31:02Z #863 status, 09:31:03Z #850 status, 14:20:40Z heartbeat marker, 14:29:49Z heartbeat survey, 17:04:50Z schedule status, and this run's note.
- **Latest comments:** #863 ends at the 17:44:20Z `/oc maintainer` handoff after the 17:44:18Z `approve-eval` marker; #850 last `/oc eval` 03:34:00Z; #854 last `/oc lab` 03:34:02Z; #849 last `/oc lab` 03:34:03Z. No repo comment arrived after 17:44:20Z. No human directive newer than the 17:04:52Z trigger.
- **Branch tips:** main `eca3be8e`, `maintainer/logs` `20f8e9b2`, #863 `e8334146`, #850 `9c9bf1bd`, #854 `090452f2`, #821 `dce109e4`. The #859 branch `opencode/issue858-curate-umbra-count-copy` stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs from 2026-09-25/10-05/11-11; no live maintainer sibling. **In progress:** this run.
- **This run:** `44931673530`, `issue_comment` on #863 at 17:44:20Z, global target; workspace at PR head `e8334146` after the trusted prompt and memory were materialized from main `eca3be8e`; tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **#863 eval:** `44928065181` success 17:04:55-17:44:29Z, agent 17:04:57-17:44:28Z, `approve-eval` at 17:44:18Z (score 9.9/10; dimensions 9.9/9.9/9.8/10.0/10.0). The report verified the live ladder rung and prompt examples, resolver requested/fallback controls, 36/0 audit on HEAD and 37/0 after a clean merge with main, the byte-identical R26 manifest with a mutation control, the aligned contract/dispatcher/triggers, unchanged pins, and byte-identical preview/production with no overflow or console errors.
- **#745 chain (context):** merged 06:48:48Z; production `44877316473` succeeded 06:49:35Z on `eca3be8e`; the live root returns HTTP 200.
- **This run's fan-out:** the workflow_run maintainer fan-outs after the eval were all skipped or cancelled by the single-slot group; no duplicate agent ran.
- **Wall:** last death 07:03:30Z (`44877291766`, `FreeUsageLimitError`, `retry-after: 62476`, diagnostic only). The 17:04-17:44Z eval is the first clean heavy completion since 06:42:15Z, so the window is open.
- **Pages:** production `44877316473` success 06:49:35Z on `eca3be8e`; live root HTTP 200. The preview artifact redeploys on PR updates.
- **Model registry:** fresh read 17:47Z: **104 models / 11 free**; pin `deepseek-v4.1-flash-free`, rung 2 `mimo-v2.6-flash-free`, and the #863 rung 3 `nemotron-3.5-lightning-free` are live; `glm-5.3-flash-free` is absent. The ladder on main is 2/3 until #863 merges. No upgrade dispatch.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Zero missing, zero extra (the three dynamic GitHub-managed workflows are outside the allowlist by design).
- **Schedules:** auditor last success 06:23:11Z (2026-11-21); curator last success 06:17:38Z (2026-11-21); maintainer this run 17:44:20Z; recover last success 14:20:06Z. The long scheduler gaps remain the known throttling class (#831/#836), not a new defect.

### Live lanes and their next step

- **#863 / #836 (protected path):** all gates passed on `e8334146`; the PAT merge sweep executes this run. Next: verify the merge and Pages, reopen #836 if the closing keyword auto-closed it, and run the full audit once on the merged main (R1-R36).
- **#850 / #848 (protected-path lab lane):** CONFLICTING/DIRTY after the #745 merge; its old test approval does not bind a rebased head. Next: on the post-#863 trunk, dispatch the lab rebase, re-run the full audit on the rebased head, then a fresh review/test/eval chain; on `approve-eval`, PAT merge sweep, Pages, close #848.
- **#854 / #803 (protected-path slice 3):** lab wall-dead 03:39:13Z; branch unchanged; CLEAN/MERGEABLE. Next: after #850, re-arm lab; keep #803 open until all its slices land.
- **#849 (fail-loud hardening):** lab wall-dead 03:49:33Z; the trigger carries the expanded scope (including the #853 deferral guard). Next: after #854, then #857, #856, #860 in that order (#860 only after #854).
- **#742 remainder (tracker):** open. The merged slice covers the 15 six-workflow steps; the other lanes still need the privileged launcher and the preamble, and the follow-ups remain (post-agent head check, evidence latches, per-OS `git_exec_path` pin, proxy/TLS keys). Candidate for a lab round after the serialized backlog; do not open a duplicate issue.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; #863 is the rung/contract slice. The capacity decision remains the only fix that ends the recurrence.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- The eval completed end to end on the free pin at 17:44Z, so the window is demonstrably open. This run posts no heavy draw: the merge is a PAT action, and the next lane is sequenced onto the post-merge trunk for a real dependency reason.
- #850 edits `silent-stall-audit.sh` and `maintainer.yml`, the same files #863 changes. A rebase before the merge would target the wrong base and immediately re-conflict. The post-merge maintainer run (`pull_request: closed` on #863, same single-slot group) dispatches the rebase onto the new trunk. This is sequencing, not idling: the wake is deterministic and immediate.
- One draw at a time; no same-pool burst. Never repeat a strategy that already failed deterministically. If a lane dies on the allowance, stand down and wait for a clean heavy completion or the next wake.
- Never merge without a head-fresh Tester marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardcoded PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#863 merge sweep:** executes in this run. Verify the merge, Pages, and the reopened capacity tracker.
2. `{"action":"lab","pr":850}`: dispatch on the post-#863 trunk; rebase, resolve the audit-script and workflow conflicts, re-run the full audit on the rebased head, then the fresh review/test/eval chain. On `approve-eval`, PAT merge sweep and close #848.
3. `{"action":"lab","pr":854}`: after #850; on a push, review/test/eval; keep #803 open unless all its slices land.
4. `{"action":"lab","issue":849}`: after #854; on a push, the review/test chain.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
8. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. Verify the #863 merge landed: main advanced, the merged tree matches the approved head, Pages redeployed. If the sweep skipped, read its log and re-arm the cause.
2. **Reopen #836 if the merge auto-closed it.** The PR body says `Closes #836`; the slice is partial and the capacity decision is still the Owner's.
3. Run the full audit once on the merged main (R1-R36) to confirm the merged pins and the R26 manifest agree.
4. #850 is conflict-dirty; its old test approval does not bind a rebased head. Rebase through the lab lane on the post-#863 trunk, then run the fresh gates.
5. #745 is done: merged `eca3be8e`, Pages green, #853 closed. #742 stays open for the remaining owner-credential work; the review's residual notes (other lanes lack the privileged launcher/preamble; proxy/TLS keys unpinned) are tracked there.
6. #848 closes on #850; #803 stays open until all its slices land.
7. #836 remains open for the capacity proposals. #863 restores rung 3 and the contract only; do not close the issue on the merge.
8. Model registry drift: `glm-5.3-flash-free` is gone; the ladder is 2/3 on main until #863 merges. The PR's rung 3 is live. No lab dispatch: #863 is the fix.
9. Maintainer cron throttling: the 20-minute schedule has large gaps; the last gap was 14:29:58-16:56:05Z (2h27m), after the 09:31:17-14:20:06Z gap (4h49m) and the 07:04-09:24Z gap (2h20m). The recover heartbeat and the occasional schedule tick are the only wakes; they remain the liveness path (#836/#831).
10. Pages: production is green on `eca3be8e`; the preview artifact redeploys on PR updates. No manual dispatch unless a merge sweep's deployment trigger fails.
11. Workspace: this run's tree is the PR head `e8334146` after the trusted materialization from main `eca3be8e`; `.maintainer/` is gitignored and the tree is clean.
12. Memory: the 2026-11-21 file now carries the 01:44-01:51 entry, the 02:02 intake marker, the 05:55-06:05 entry, the 06:23-06:26 entry, the 06:42-06:50 entry, the 06:49-06:56 entry, the 09:24-09:33 entry, the 14:20-14:26 entry, the 16:56-17:04 entry, and this 17:44-17:52 entry. The 2026-11-20 file carries the 18:00Z entry plus run markers for the 18:01-23:47Z wall stand-downs. The log publish is append-only with keep-both semantics.
13. Auditor doc drift (watch only, no new issue): the silent-stall script and the shipped matrix are R1-R36 on main after the #745 merge; #863's merged head should keep that. Re-check after the next audit and do not open a duplicate.
14. #863 changes the maintainer workflow matrix in the audit script (the embedded prompt/env line) and the `maintainer.md` model example. After it merges, run the full audit once on main (R1-R36) to confirm the merged pins agree; the head-bound eval ran on the pre-merge branch and after a clean local merge (37/0).
15. #850's audit-script diff is large (964 additions) against a pre-R36 base; expect a substantive rebase, not a trivial one, and re-run the full audit on the rebased head.
16. #831 is resolved by merged #832 but remains open because that PR used `Refs`; bookkeeping only, no dispatch.
17. No agent-side merge or dispatch beyond the merge sweep this run. The last merge was #745 via the hardcoded PAT sweep at 06:48:48Z.
18. If the #863 merge fails, do not re-arm a duplicate gate: the chain is complete and head-bound; diagnose the sweep and retry the merge, not the gates.

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
- Merge preference is squash unless the PR's base branch explicitly requires another strategy; the repo's rebase-merge setting is the exception for the #859/#850 lane (honor the verified expectation). The PAT sweep uses rebase then merge fallback with `--match-head-commit`.
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

- This run's session is an `issue_comment` handoff targeting #863; the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong.
- The pipeline is green on main (`eca3be8e`; Pages success 2026-11-21 06:49:35Z), and the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall last killed the #863 eval at 07:03:30Z on 2026-11-21, and the 17:04-17:44Z eval completed cleanly on the same pin. A live Maintainer session is not clearance; a single draw after a clean completion is the designed window test, never a burst.
- The ladder on `main` is 2/3 until #863 merges; keep the pin and rung 2 live (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`). The #863 replacement rung is live.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Verify the #863 merge landed (main advanced, merged tree matches the approved head, Pages redeployed). If the sweep skipped, read its log and fix the cause.
2. **Reopen #836 if the merge auto-closed it**, with a note that the slice is partial and the capacity decision remains with the Owner.
3. Run the full audit once on the merged main (R1-R36) to confirm the merged pins and the R26 manifest agree.
4. Dispatch the #850 lab rebase on the post-#863 trunk, then its fresh review/test/eval chain; then #854 lab, #849 lab, #857, #856, #860 in order.
5. Verify the board invariant, allowlist, registry/ladder, Pages, held runs, and schedule health; if clean, stand by.

## Open questions

1. Does the PAT merge sweep land #863 cleanly on the first attempt, and does the production deployment follow?
2. Will #836 auto-close from the PR body's closing keyword, and does the post-merge run reopen it promptly?
3. How much does #850 need to rebase onto the post-#863 trunk, and will the audit-script conflicts resolve cleanly?
4. Does the capacity decision on #836 still need the Owner now that the fallback ladder is whole again?
