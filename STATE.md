# STATE

Last updated: 2026-11-23T02:24Z by run 45099579845

(02:19Z heartbeat wake: the eighth review wall death is answered by one fresh review draw on this fresh runner; the 00:00Z health tick missed the scheduler; the rest of the queue stays parked.)

## TL;DR for the next Hephaestus

- **This was the 02:19Z heartbeat wake** (issue #836): the last real Maintainer session was the 23:26-23:36Z quota-recovery run (163 minutes stale at the check), no Maintainer run was active, and the recover arm dispatched this run at 02:19:53Z.
- **The review lane died an eighth time on the provider allowance at 23:41:18Z** after about 3.5 minutes of real audit work, and the verify step reported the gate dead after 4 attempts (manual intervention required). **This run arms one fresh review draw on #850 at `c0d34d65`.** The head is unchanged, CLEAN/MERGEABLE against the unchanged trunk, and the lane's checks are green.
- **Main is unchanged at `7fb030f2`; `maintainer/logs` pre-run tip is `f883c18f`** (the 23:42Z marker-only memory commit from the quota intake; `34634b16` carries the 23:26 session's state). Production is green (Pages `44970574916` success 01:15:52Z; live root HTTP 200).
- **#850 is the only heavy lane in flight.** #854/#849/#857/#856/#860/#742 stay parked in the serialized queue; #860 also waits for #854.
- **The board invariant holds:** #70 is the only open `lab-health` issue with the exact title; #42 is the only other labelled issue (`brainstorm`). No new issue since 2026-11-19T06:48Z.
- **Models:** registry 105 models / 10 free at 02:23Z; pin and `small_model` both `deepseek-v4.1-flash-free`; the ladder is 3/3 live. No upgrade dispatch.
- **Held 0; queued the seven known stale runs; in progress this run.** The allowlist is 19 repo names plus the self-excluded `maintainer`, matching all 20 repo-managed workflow names.
- **Queue after #850:** #854 lab, #849 lab, #857, #856, #860 (only after #854), then #742's remainder. #836 stays open for the Owner capacity decision; #821 and the Maze Chase set stay parked.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 02:20-02:24Z on 2026-11-23)

### GitHub state

- **Main:** `7fb030f275a67956d3ce882f6c22a7102d49cf44` (the #863 rebase merge, 2026-11-21T17:52:03Z). The tree is unchanged since the 17:52-02:25Z checkpoints. **`maintainer/logs` pre-run tip:** `f883c18fd5d483818180f6ae3b8fd0912dea40c5` (the 23:42Z marker-only memory commit from the quota intake; `34634b162` carries the 23:26 session's state).
- **Open PRs (3):**
  - #850 `c0d34d65be3b9561f026847c28cd4051dbfa2f7c`, `Closes #848`, **CLEAN/MERGEABLE** (base `7fb030f2`, merge base = trunk tip), 6 commits, 15 files +1593/-100; checks: deploy SKIPPED, trigger SUCCESS, comment SUCCESS, GitGuardian SUCCESS. The 23:37:29Z review draw died on the wall at 23:41:18Z after about 3.5 minutes of real audit work, no verdict; **this run arms one fresh review draw.**
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE (base `e5cd250c`); last trigger 2026-11-20T03:34:02Z; branch unchanged; needs fresh gates after its lab round.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale (base `86570af1`).
- **Open issues (25 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #856, #857, #860. #836 is open for the Owner capacity decision; no new issue since 2026-11-19T06:48Z. #677/#678/#659 are the long-frozen Maze Chase standing set under #582, not new triage; do not route them without the Owner. #742 stays open; #848 closes on #850; #803 stays open until all its slices land; #831 is resolved by merged #832 but remains open (that PR used `Refs`), bookkeeping only.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest notes: the 23:37:28Z quota-recovery note, the 23:41:54Z quota intake, the 02:19:51Z heartbeat marker, and this run's decision ping.
- **Latest comments:** #850 last 23:37:29Z (the wall-dead review trigger; no verdict after it); #854 last 2026-11-20T03:34:02Z; #849 last 2026-11-20T03:34:03Z; #836 last 2026-11-21T18:11:34Z. No new human directive and no new issue or PR.
- **Branch tips:** main `7fb030f2`, `maintainer/logs` `f883c18f`, #850 `c0d34d65`, #854 `090452f2`, #821 `dce109e4`. The #859 branch `opencode/issue858-curate-umbra-count-copy` stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3); no live maintainer sibling. **In progress:** this run.
- **This run:** `45099579845`, `workflow_dispatch` at 02:19:53Z (heartbeat reason in the notification), global target; workspace at main `7fb030f2`; tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **Review run `45084257456`:** failure 23:37:34-23:41:27Z; the agent did about 3.5 minutes of real audit work (the silent-stall audit and manifest checks ran 23:37:48-23:41:18Z), then the wall hit at 23:41:18.987Z (`FreeUsageLimitError`, `AI_APICallError: Free usage limit reached`, `retry-after: 3276`, diagnostic only) before a verdict, a report, or a push; the head did not move. The verify step found no published verdict (evidence script exit 1) and reported the gate dead after 4 attempts (1 initial + 3 prior auto-retries), requiring manual intervention.
- **Quota intake `45084603293`:** `workflow_run` maintainer success 23:41:31-23:42:16Z; it stood down without summoning an agent, posted the 23:41:54Z note on #70, and its memory commit `f883c18f` appended only a run marker.
- **23:42-02:19Z:** no workflow run at all; the 2026-11-23T00:00Z health pass nominal tick did not fire. That is the known scheduler-throttling class (#831/#836), not a new defect.
- **Recover `45099520317`:** schedule success 02:19:15-02:19:56Z; the heartbeat step measured the last real session at 163 minutes (threshold 90), posted the 02:19:51Z marker on #70, and dispatched this run at 02:19:53Z. The duplicate `workflow_run` maintainer `45099591077` skipped at 02:20:00-02:20:01Z.
- **This run `45099579845`:** `workflow_dispatch` at 02:19:53Z; arms one fresh review draw; no other dispatch.
- **Pages:** `44970574916` success 01:15:15-01:15:52Z on `7fb030f2`; live root HTTP 200.
- **Audit:** the rebased head carries R1-R37; the daily pass reports R1-R36 on main with 37/0 (R1-R36) consistent; my head-tree checks from the 01:15 session (syntax, YAML, conflict markers, whitespace, hash pins) are clean. The review will run the full audit. One low-severity prompt-contract drift noted by the daily pass (`maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, `create_pr` while the prompt documents them) - not a runtime roadblock; fold into the next lab round, no new issue.
- **This run's fan-out:** none.
- **Wall:** eight review wall deaths since 01:34Z on 2026-11-22: 01:34:50Z, 02:34:13Z, 06:39:30Z, 10:23:04Z, 16:12:09Z, 18:09:33Z, 22:12:30Z, and 23:41:18Z. The 22:12 draw did 27 minutes of real work, the 23:41 draw about 3.5; the public-surface pass completed cleanly at 23:22-23:32Z; this heartbeat is the next fresh-run draw. The retry-after values are diagnostic only, never a park horizon.
- **Model registry:** fresh read 02:23Z: 105 models / 10 free; pin `deepseek-v4.1-flash-free`, rung 2 `mimo-v2.6-flash-free`, and rung 3 `nemotron-3.5-lightning-free` are live. No upgrade dispatch.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Zero missing, zero extra (the three dynamic GitHub-managed workflows are outside the allowlist by design).
- **Schedules:** public-surface last schedule 23:22:02Z (success; next nominal about 2026-11-23T05:22Z); health pass last schedule 05:35:21Z on 2026-11-22 (wall-dead, self-heal retry succeeded 06:23:43Z; the 2026-11-23T00:00Z nominal tick did not fire); recover last success 02:19:15Z (heartbeat dispatch); maintainer last schedule 23:25:10Z (wall-dead agent, recovery dispatched 23:26:37Z) plus this heartbeat dispatch.

### Live lanes and their next step

- **#850 / #848 (protected-path lab lane):** the rebased head is clean; this run re-arms the review. On approval, the fresh test and eval chain; on `approve-eval`, PAT merge sweep, Pages, close #848. On another wall death, stand down and keep the queue parked for the next wake.
- **#854 / #803 (protected-path slice 3):** CLEAN/MERGEABLE; lab trigger 2026-11-20T03:34:02Z; branch unchanged. Next: after #850, re-arm lab; keep #803 open until all its slices land.
- **#849 (fail-loud hardening):** lab trigger 2026-11-20T03:34:03Z; the trigger carries the expanded scope (including the #853 deferral guard). Next: after #854, then #857, #856, #860 in that order (#860 only after #854).
- **#742 remainder (tracker):** open. The merged slice covers the 15 six-workflow steps; the other lanes still need the privileged launcher and the preamble, and the follow-ups remain (post-agent head check, evidence latches, per-OS `git_exec_path` pin, proxy/TLS keys). Candidate for a lab round after the serialized backlog; do not open a duplicate issue.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; the rung/contract slice is merged, but the per-egress-IP wall remains the only fix that ends the recurrence.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw at a time; no same-pool burst. The fresh review is the one heavy lane this window.
- If the review dies on the wall, stand down and re-arm on the next wake; never repeat the same failed strategy in the same window. The retry-after header is diagnostic only; the fresh-run lottery is the designed recovery.
- #850 is rebased onto `7fb030f2`; no further rebase is needed unless the trunk moves before merge.
- Never merge without a head-fresh Tester marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardcoded PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#850 review (armed this run):** on approval, test then eval; on `approve-eval`, PAT merge sweep and close #848. On a wall death, stand down; the next wake re-arms.
2. `{"action":"lab","pr":854}`: after #850; on a push, the fresh review/test/eval chain; keep #803 open unless all its slices land.
3. `{"action":"lab","issue":849}`: after #854; on a push, the review/test chain.
4. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
5. `{"action":"lab","issue":856}`: after #857.
6. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
7. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #850: the fresh review is armed on `c0d34d65`; read its outcome first. On approval, chain test/eval; on a wall death, stand down.
2. The prior Tester approval (`9c9bf1bd`) and the wall-dead eval do not bind the rebased head; both gates must rerun on `c0d34d65`.
3. The wrapper's 01:14:55Z non-fast-forward push rejection is expected noise; the PAT step landed the head at 01:13:16Z. No post-mortem.
4. The eight review wall deaths at 01:34:50Z, 02:34:13Z, 06:39:30Z, 10:23:04Z, 16:12:09Z, 18:09:33Z, 22:12:30Z, and 23:41:18Z are the #754/#820 class; the intake stood down each time and the fresh-run lottery is the recovery. The 22:12 draw did 27 minutes of real work and the 23:41 draw about 3.5; this heartbeat is the next fresh draw.
5. Public-surface pass: last schedule 23:22:02Z success with `[]`; next nominal about 2026-11-23T05:22Z. If it dies on the wall, do not same-pool retry; if it dies on the work, read the log.
6. Health pass: last daily success 06:23:43Z on 2026-11-22 (self-heal retry); the 2026-11-23T00:00Z nominal tick did not fire. Scheduler throttling, not a new defect; no dispatch.
7. #836 stays open for the Owner capacity decision. The merged slice restores rung 3 and aligns the contract only; do not close the issue on the merge. Eight review wall deaths plus the 23:25 maintainer first-call death strengthen the case for the capacity decision.
8. #745 is done: merged `eca3be8e`, Pages green, #853 closed. #742 stays open for the remaining owner-credential work; the review's residual notes (other lanes lack the privileged launcher/preamble; proxy/TLS keys unpinned) are tracked there.
9. #848 closes on #850; #803 stays open until all its slices land.
10. #831 is resolved by merged #832 but remains open because that PR used `Refs`; bookkeeping only, no dispatch.
11. Model registry drift: the ladder is 3/3 on main and all three rungs are live; the free count is 10 at 02:23Z, with no rung retired. No lab dispatch.
12. Maintainer cron throttling: the declared 20-minute cron fires only a few times a day; the recover heartbeat remains the independent liveness path (#836/#831). The 23:25 tick did fire but died at first call; the 00:00Z health tick did not fire; this heartbeat is the wake.
13. Pages: production is green on `7fb030f2`; the preview artifact redeploys on PR updates. No manual dispatch unless a merge sweep's deployment trigger fails.
14. Workspace: this run's tree is main `7fb030f2` (the pre-agent trusted checkout on a heartbeat dispatch wake); the memory bundle came from the trusted commit, `.maintainer/` is gitignored, and the tree is clean.
15. Memory: the 2026-11-22 file carries the 00:41-00:53Z heartbeat entry through the 23:26-23:36Z recovery entry and the 23:42Z intake marker; this run starts the 2026-11-23 file with its 02:19-02:24Z heartbeat entry. The log publish is append-only with keep-both semantics.
16. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round, not a standalone issue.
17. Auditor doc drift (watch only, no new issue): the silent-stall script and the shipped matrix are R1-R36 on main and R1-R37 on the #850 head; after the merge, re-check the main range and do not open a duplicate.
18. The merged #863 tree keeps the R26 canonical manifest in lockstep with `maintainer.yml`; the #850 head regenerates it. The review will verify.
19. No agent-side merge or dispatch beyond the fresh review this run. The last merge was #863 via the hardcoded PAT sweep at 2026-11-21T17:52:03Z.

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

- This run's session is a `workflow_dispatch` heartbeat wake with no target; the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong. This run posts a ping on #70 because a heartbeat wake has no comment target.
- The pipeline is green on main (`7fb030f2`; Pages success 2026-11-22 01:15:52Z), and the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed the #850 review at 01:34:50Z, 02:34:13Z, 06:39:30Z, 10:23:04Z, 16:12:09Z, 18:09:33Z, 22:12:30Z, and 23:41:18Z, while fresh runners completed the public-surface pass 05:39-05:50Z, the health retry 05:59-06:23Z, the curator pass 14:15-14:34Z, and the public-surface pass 23:22-23:32Z. The 22:12 draw did 27 minutes of real audit work before the wall; the 23:41 draw about 3.5. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #850 review outcome first. On approval, the fresh test gate; then eval; on `approve-eval`, PAT merge sweep, verify Pages, close #848. On a wall death, stand down and keep the queue parked for the next wake.
2. Then #854 lab, #849 lab, #857, #856, #860 in order (#860 only after #854 lands), then #742's remainder.
3. Keep #836 open for the Owner capacity decision; keep #742 open for the remaining owner-credential work; #831 is bookkeeping only; #848 closes on #850; #803 stays open until all its slices land.
4. The public-surface pass's next nominal is about 2026-11-23T05:22Z; the health pass's next nominal is 2026-11-24T00:00Z (the 2026-11-23T00:00Z tick did not fire).
5. Verify the board invariant, allowlist, registry/ladder, Pages, held runs, and schedule health; if clean, stand by.

## Open questions

1. Will the ninth review draw find an open allowance bucket on its runner and finish, or die on the same pool-wide wall?
2. Will the review approve the rebased head, or return another round of findings (every prior round found something)?
3. Will the fresh test and eval chain complete on `c0d34d65`, or die on the provider wall?
4. Eight consecutive review draws have died on the wall, but the 22:12 draw did 27 minutes of real work and the public-surface pass completed cleanly at 23:22-23:32Z; does the pool have an open bucket for this draw, or is the per-egress capacity decision now the only path?
5. The 00:00Z health tick did not fire; does the scheduler throttle keep worsening, and does the heartbeat remain the only reliable liveness path?
6. Does the reopened capacity tracker still need the Owner's per-egress-IP capacity decision now that the ladder is whole again?
