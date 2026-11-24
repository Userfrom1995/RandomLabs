# STATE

Last updated: 2026-11-24T12:18Z by run 45391085976

(12:11Z schedule wake after a 2.5-hour scheduler gap: one fresh review draw re-arms the #850 critical lane; queue parked, trunk and production green.)

## TL;DR for the next Hephaestus

- **This was the 12:11:13Z schedule run**, the first workflow run of any kind since the 09:35:39Z wall intake finished. The maintainer 20-minute cron and the 12:00Z curator cron did not tick in that 2.5-hour gap (known scheduler throttling, #831/#836), and no human comment or issue arrived. Target: none (schedule dispatch), so the public artifact is a ping on #70.
- **The seventeenth review draw died on the wall at 09:34:16Z** on #850 at `c0d34d65`; the intake recorded it at 09:35:18Z and the 09:21 session stood down without a same-window re-arm. This wake is the next fresh draw: **one review trigger armed on `c0d34d65` (the eighteenth draw).** The head is unchanged and clean.
- **The public-surface lane stays parked.** The one bounded self-heal re-dispatch died on the allowance at 09:21:29Z and the cap halted the chain; the last full pass (08:55-09:07Z) was green and left the repo unchanged. The 12:00Z cron has not fired yet; no same-pool retry.
- **No new issue, no new comment, no human directive since 09:38:05Z.** The board invariant holds; 24 open non-PR issues, unchanged.
- **Main is unchanged at `7fb030f2`; `maintainer/logs` live tip is `4ace95c77`** (the 09:38Z memory update from run 45364469335; `5d47ea637` is the 09:35Z intake marker).
- **Decisions this run: one `review` on #850 plus a board ping.** No lab or queue dispatch: the serialized order is unchanged and one heavy lane at a time.
- **Models:** registry 108 models / 10 free at 12:13Z; pin and `small_model` both `deepseek-v4.1-flash-free`; the ladder is 3/3 live. No upgrade dispatch.
- **Held 0; queued the seven known stale runs; in progress this run.** The allowlist is 19 repo names plus the self-excluded `maintainer`, matching all 20 repo-managed workflow names.
- **Queue after #850:** #854 lab (round-1 findings), #812, #814, #849 lab, #857, #856, #860 (only after #854), then #742's remainder. #836 stays open for the Owner capacity decision; #821 and the Maze Chase set stay parked.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 12:12-12:16Z on 2026-11-24)

### GitHub state

- **Main:** `7fb030f275a67956d3ce882f6c22a7102d49cf44` (the #863 rebase merge, 2026-11-21T17:52:03Z). The tree is unchanged since the 2026-11-21T17:52Z checkpoint. **`maintainer/logs` live tip:** `4ace95c77745ba42a5566bfddd4a2c02101d8423` (the 09:38Z memory update; `5d47ea637` is the 09:35Z intake marker; `7b9930186` is the 09:26Z session; `e901f0745` is the 09:22Z marker).
- **Open PRs (3):**
  - #850 `c0d34d65be3b9561f026847c28cd4051dbfa2f7c`, `Closes #848`, **CLEAN/MERGEABLE** (base `7fb030f2`, merge base = trunk tip), 6 commits, 15 files +1593/-100; checks: deploy SKIPPED, trigger SUCCESS, comment SUCCESS, GitGuardian SUCCESS. The thread ends at the 09:26:14Z review trigger; that draw died on the wall at 09:34:16Z with no verdict, head unchanged. **This run arms the eighteenth draw.**
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE (base `e5cd250c`); round-1 lab findings still outstanding, branch unchanged since 2026-11-15T07:38Z; last owner instruction 2026-11-20T03:34:02Z; parked behind #850.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale (base `86570af1`).
- **Open issues (24 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #831, #836, #848, #849, #856, #857, #860. No new issue since 2026-11-19T06:48Z. #836 is open for the Owner capacity decision; #677/#678/#659 are the long-frozen Maze Chase standing set under #582; #742 stays open; #848 closes on #850; #803 stays open until all its slices land; #831 is resolved by merged #832 but remains open (that PR used `Refs`), bookkeeping only.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest notes: the 09:35:18Z quota intake, the 09:37:48Z prior-run summary, the 09:38:05Z board note, and this run's board ping.
- **Latest comments:** #850 ends at the 09:26:14Z trigger; the draw died on the wall at 09:34:16Z with no verdict. The newest board note is the 09:38:05Z one. #854 last 2026-11-20T03:34:02Z; #849 last 2026-11-20T03:34:03Z; #836 last 2026-11-21T18:11:34Z. No new human directive; nothing posted anywhere since 09:38:05Z.
- **Branch tips:** main `7fb030f2`, `maintainer/logs` `4ace95c77`, #850 `c0d34d65`, #854 `090452f2`, #821 `dce109e4`. The #859 branch `opencode/issue858-curate-umbra-count-copy` stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3); no live maintainer sibling. **In progress:** this run.
- **This run:** `45391085976`, `schedule` at 12:11:13Z; workspace at main `7fb030f2`; tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **No workflow run at all between 09:35:39Z and 12:11:13Z.** The maintainer 20-minute cron, the recover 20-minute cron, and the 12:00Z curator cron all failed to tick in that window; no recover heartbeat fired even though the last real session stamp was 09:36Z (due after 11:06Z). This is the known scheduler-throttling class (#831/#836), not a new defect, and it is why this schedule tick is the wake.
- **Maintainer `45364469335` (the 09:21Z session):** `issue_comment` 09:21:48-09:38:22Z, success; it posted the 09:37:48Z summary and the 09:38:05Z board note, and its memory commit is `4ace95c77` at 09:38Z. The 09:35:18Z quota note and the 09:35Z marker commit `5d47ea637` belong to the intake `45366562655`.
- **Review `45365187610`:** the seventeenth draw, `issue_comment` 09:26:19-09:34:54Z, failure. Wall at 09:34:16.403Z (`FreeUsageLimitError`, `retry-after: 52474`, diagnostic only) after about eight minutes; no verdict, no report, no push, head unchanged. Verify reported `Review gate still dead after 4 attempts (1 initial + 3 auto-retries). Manual intervention required.`
- **Curator self-heal `45362167705`:** the bounded re-dispatch died on the wall at 09:21:29.379Z (`retry-after: 52807`); the cap halted the chain with `cap of 1 re-dispatch(es) for curator.yml reached after this crash`. The last full scheduled pass `45360350939` was green 08:55:25-09:07:25Z and left the repo unchanged.
- **Auditor `45359855998`:** schedule success 08:52:01-09:16:17Z (delayed from the 00:00Z slot); daily audit posted 09:15:41Z; census 126 runs / 6 failed / 0 timed out / 0 startup failures; no new issue. The next nominal slot is 2026-11-25T00:00Z.
- **Pages:** `44970574916` success 2026-11-22T01:15:15-01:15:52Z on `7fb030f2`; preview `44970563056` success on `c0d34d65`; live root HTTP 200 at 12:13Z.
- **Audit:** the rebased head carries R1-R37; the last daily pass reports R1-R36 on main with 37/0 (R1-R36) consistent; the 14:32 review draw ran the full audit green at 38/0 with the live-board check. My head-tree checks from prior sessions (syntax, YAML, conflict markers, whitespace, hash pins) are clean. Two low-severity doc drifts noted by the daily pass (`maintainer.yml:581` OUTPUT CONTRACT action list omits `sweep`/`create_issue`/`create_pr`; two stale `longcat-2.5-free` prompt examples) - not runtime roadblocks; fold into the next lab round, no new issue. The 09:15Z pass adds #812/#814 as still-reproducing and #815 as fixed.
- **This run's fan-out:** one review trigger plus one board ping.
- **Wall:** seventeen review wall deaths since 2026-11-22T01:34Z: 01:34:50Z, 02:34:13Z, 06:39:30Z, 10:23:04Z, 16:12:09Z, 18:09:33Z, 22:12:30Z, 23:41:18Z, 2026-11-23T02:51:50Z, 04:17:14Z, 07:06:06Z, 11:20:44Z, 15:21:23Z, 22:53:52Z, 2026-11-24T02:14:58Z, 06:38:16Z, and 09:34:16Z. The 22:12 draw did 27 minutes of real work, the 02:27 draw about 24, the 14:32 draw about 48 (it reached the final verification stage with the audit green), the 22:34 draw about 19, the 02:00 draw about 14.5, the 06:28 draw about 10, and the 09:34 draw about 8. Maintainer first-call deaths: 2026-11-22T23:25:10Z (recovered 23:26:37Z) and 2026-11-23T03:59:19Z (recovered at 04:01:05Z). The curator wall death at 09:21:29Z is the same allowance class, not a review draw. The retry-after header is diagnostic only, never a park horizon; the fresh-run lottery is the designed recovery.
- **Model registry:** fresh read 12:13Z: 108 models / 10 free; pin `deepseek-v4.1-flash-free`, rung 2 `mimo-v2.6-flash-free`, and rung 3 `nemotron-3.5-lightning-free` are live. Other free names: `iceman-free`, `beam-free`, `flint-40b-free`, `nemotron-3.5-super-vl-free`, `jev-1.13-free`, `hy4-flash-free`, `tidepool-alpha-free`; no Auditor recommendation, no upgrade dispatch.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Zero missing, zero extra (the three GitHub-managed workflows are outside the allowlist by design).
- **Schedules:** auditor daily cron 00:00Z; last success `45359855998` at 08:52:01-09:16:17Z (delayed). Curator cron every 6h; last schedule success `45360350939` at 08:55:25-09:07:25Z, its self-heal dispatch `45362167705` died on the wall at 09:21:49Z; the 12:00Z cron has not fired. Recover cron every 20 min; last success `45339887322` at 06:22:29Z. Maintainer cron every 20 min; the last schedule was 01:53:02Z on 2026-11-24, plus the 06:22:27Z heartbeat, the 09:16:18Z Auditor comment trigger, the 09:21:48Z exhaustion trigger, and this 12:11:13Z schedule tick.

### Live lanes and their next step

- **#850 / #848 (protected-path lab lane):** the rebased head is clean; the eighteenth review draw is armed on `c0d34d65` this run. On approval, the fresh test and eval chain; on `approve-eval`, PAT merge sweep, Pages, close #848.
- **#854 / #803 (protected-path slice 3):** CLEAN/MERGEABLE; round-1 lab findings outstanding (the #853 deferral guard and Refs, fail-closed head/enumeration reads, resolver fail-closed, wall-death fixture, R20 pins, AGENTS/LAB claims); last owner instruction 2026-11-20T03:34:02Z. Next: after #850, re-arm lab; keep #803 open until all its slices land.
- **#812 / #814 (audit-harness backlog):** #812 is the R11 same-name shadowing with no `lab:` job scoping; #814 is the fail-open baseline read in the fix lane. Both still reproduce on main; #815 is fixed and closed. Next: after #854, with the R32 verify-body pin updated in lockstep.
- **#849 (fail-loud hardening):** lab trigger 2026-11-20T03:34:03Z; the trigger carries the expanded scope (including the #853 deferral guard). Next: after #812/#814, then #857, #856, #860 in that order (#860 only after #854).
- **#742 remainder (tracker):** open. The merged slice covers the 15 six-workflow steps; the other lanes still need the privileged launcher and the preamble, and the follow-ups remain (post-agent head check, evidence latches, per-OS `git_exec_path` pin, proxy/TLS keys). Candidate for a lab round after the serialized backlog; do not open a duplicate issue.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; the rung/contract slice is merged, but the per-egress-IP wall remains the only fix that ends the recurrence.
- **Public surface (curator lane):** last full pass green at 08:55:25-09:07:25Z with no repo changes; the self-heal re-dispatch died on the wall at 09:21:29Z and the bounded cap halted the chain. No same-pool retry; the 12:00Z cron (not yet fired) re-arms.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw at a time; no same-pool burst. This run arms the one heavy lane (the eighteenth review draw) on a fresh runner whose egress bucket is demonstrably open: this agent session itself is alive on the unchanged free pin. The queue stays parked behind it.
- The seventeenth draw died on the wall at 09:34:16Z after about eight minutes; this wake is 2.5 hours later, so the 30-minute cooldown is long expired and the fresh-run lottery is the designed recovery. Never repeat the same failed strategy in the same window.
- The 12:00Z public-surface tick has not fired; when it does, it is a separate fresh runner. If it dies on the wall, do not same-pool retry; the next cron or an owner trigger re-arms it.
- #850 is rebased onto `7fb030f2`; no further rebase is needed unless the trunk moves before merge.
- Never merge without a head-fresh Tester marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardcoded PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#850 review (live this run):** the eighteenth draw is armed on `c0d34d65`; on approval, test then eval; on `approve-eval`, PAT merge sweep and close #848.
2. `{"action":"lab","pr":854}`: after #850; on a push, the fresh review/test/eval chain; keep #803 open unless all its slices land.
3. `{"action":"lab","issue":812}`: after #854; scope R11 to the `lab:` job and update the R32 verify-body pin in lockstep.
4. `{"action":"lab","issue":814}`: after #812; fail-closed baseline read in the fix lane and update the R32 pin in lockstep.
5. `{"action":"lab","issue":849}`: after #814; on a push, the review/test chain.
6. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
7. `{"action":"lab","issue":856}`: after #857.
8. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
9. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #850: the eighteenth draw is live on `c0d34d65`; read its verdict next wake. On approval, chain test/eval. On another wall death, stand down and re-arm on the following wake.
2. The prior Tester approval (`9c9bf1bd`) and the wall-dead eval do not bind the rebased head; both gates must rerun on `c0d34d65`.
3. The wrapper's 2026-11-22T01:14:55Z non-fast-forward push rejection is expected noise; the PAT step landed the head at 01:13:16Z. No post-mortem.
4. The seventeen review wall deaths at 2026-11-22T01:34:50Z, 02:34:13Z, 06:39:30Z, 10:23:04Z, 16:12:09Z, 18:09:33Z, 22:12:30Z, 23:41:18Z, 2026-11-23T02:51:50Z, 04:17:14Z, 07:06:06Z, 11:20:44Z, 15:21:23Z, 22:53:52Z, 2026-11-24T02:14:58Z, 06:38:16Z, and 09:34:16Z are the #754/#820 class; the intake stood down each time and the fresh-run lottery is the recovery. The 22:12 draw did 27 minutes of real work, the 02:27 draw about 24, the 11:04 draw about 15.5, the 14:32 draw about 48, the 22:34 draw about 19, the 02:00 draw about 14.5, the 06:28 draw about 10, and the 09:34 draw about 8; the 14:32 draw reached the final verification stage with the audit green (38/0 with the live board). The next wake is the next fresh draw.
5. Public surface: the 08:55-09:07Z schedule ran green; the bounded self-heal re-dispatch (`45362167705`) hit the wall at 09:21:29Z and the cap halted the chain. The exhaustion marker is triaged as allowance-class; the 12:00Z cron (not yet fired) re-arms. No same-pool retry.
6. Health pass: the 08:52-09:16Z delayed schedule ran green and posted the daily audit; the next is the 2026-11-25T00:00Z slot.
7. #836 stays open for the Owner capacity decision. The merged slice restores rung 3 and aligns the contract only; do not close the issue on the merge. Seventeen review wall deaths, the curator wall death, the two maintainer first-call deaths, and the scheduler gaps strengthen the case for the capacity decision.
8. #745 is done: merged `eca3be8e`, Pages green, #853 closed. #742 stays open for the remaining owner-credential work; the review's residual notes (other lanes lack the privileged launcher/preamble; proxy/TLS keys unpinned) are tracked there.
9. #848 closes on #850; #803 stays open until all its slices land.
10. #831 is resolved by merged #832 but remains open because that PR used `Refs`; bookkeeping only, no dispatch.
11. Model registry drift: the ladder is 3/3 on main and all three rungs are live; the free count is 10 at 12:13Z, with no rung retired. The newer free names in the registry have no Auditor recommendation; no lab dispatch.
12. Maintainer schedule/recover throttling: the declared 20-minute cron fires only a few times a day, and no run of any kind occurred between 09:35:39Z and this 12:11:13Z tick; the heartbeat did not fire either. The scheduler throttle (#831/#836) remains, and the heartbeat lives in a throttled cron too.
13. Pages: production is green on `7fb030f2`; the preview artifact redeploys on PR updates. No manual dispatch unless a merge sweep's deployment trigger fails.
14. Workspace: this run's tree is main `7fb030f2` (the trusted pre-agent checkout); the memory bundle came from the trusted commit, `.maintainer/` is gitignored, and the tree is clean.
15. Memory: the 2026-11-24 file carries the 01:53-01:58Z session, the 02:15Z quota marker, the recovered 06:22-06:29Z session, the 06:38Z quota marker, the 09:16-09:22Z session, the 09:21-09:36Z triage, and this 12:11-12:18Z triage. The log publish is append-only with keep-both semantics. The `maintainer/logs` tip is `4ace95c77`.
16. The 06:22Z session's memory commit was rejected three times by a transient `commit_refs_rules` server error; the recoverable bundle is restored in today's log. The 06:38Z intake committed successfully, the 09:16Z session committed `7b993018`, and the 09:21Z session committed `4ace95c77`. No further recovery needed.
17. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round, not a standalone issue.
18. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
19. The merged #863 tree keeps the R26 canonical manifest in lockstep with `maintainer.yml`; the #850 head regenerates it. The review will verify.
20. No agent-side merge or dispatch beyond the live review draw this run. The last merge was #863 via the hardcoded PAT sweep at 2026-11-21T17:52:03Z.
21. #815 was closed as completed at 09:21:36Z after verifying the `unset LAB_RUN_NONCE` hermeticity fix on main; no comment posted.
22. The public-surface self-heal cap message (`cap of 1 re-dispatch(es) for curator.yml reached after this crash`) is expected behavior for a wall-class death, not an infra defect; the quota intake covers the wall and the cron re-arms.

## Standing rules I operate under

### Safety and autonomy

- Never post issue or PR comments; the only public artifacts are the six files under `.maintainer/`. Never create an issue or PR, never run git commit/push/branch commands, never touch the brain, never `@copilot`, and never spawn or spawn-on-progress a Copilot review. Never mention an agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception).
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

- This run's session is a schedule dispatch; the memory branch is `maintainer/logs`. The board ping is the public artifact and `comment.md` is empty because a schedule dispatch has no target.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong. This run pings #70.
- The pipeline is green on main (`7fb030f2`; Pages success 2026-11-22T01:15:52Z, live root 200), and the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed the #850 review at 2026-11-22T01:34:50Z, 02:34:13Z, 06:39:30Z, 10:23:04Z, 16:12:09Z, 18:09:33Z, 22:12:30Z, 23:41:18Z, 2026-11-23T02:51:50Z, 04:17:14Z, 07:06:06Z, 11:20:44Z, 15:21:23Z, 22:53:52Z, 2026-11-24T02:14:58Z, 06:38:16Z, and 09:34:16Z, and the public-surface self-heal at 2026-11-24T09:21:29Z, while fresh runners completed the delayed public-surface passes at 08:55-09:07Z, the 09:16 comment-triggered session, and this 12:11 schedule session. The 22:12 draw did 27 minutes of real audit work, the 11:04 draw about 15.5, the 14:32 draw about 48 with the audit green and the final verification underway, the 22:34 draw about 19, the 02:00 draw about 14.5, and the 06:28 draw about 10. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #850 review verdict on `c0d34d65` (the eighteenth draw). On approval, the fresh test gate; then eval; on `approve-eval`, PAT merge sweep, verify Pages, close #848. On another wall death, stand down and re-arm on the following wake.
2. Then #854 lab (round-1 findings), #812, #814, #849, #857, #856, #860 in order (#860 only after #854 lands), then #742's remainder.
3. Read the 12:00Z public-surface outcome (not yet fired); if it dies on the wall again, do not same-pool retry.
4. Keep #836 open for the Owner capacity decision; keep #742 open for the remaining owner-credential work; #831 is bookkeeping only; #848 closes on #850; #803 stays open until all its slices land; #815 is closed.
5. Read the next Auditor and Curator outcomes; the 2026-11-24 delayed passes are green.
6. Verify the board invariant, allowlist, registry/ladder, Pages, held runs, and schedule health; if clean, stand by.

## Open questions

1. Will the eighteenth review draw find an open allowance bucket on its fresh runner and finish? The last draws got about 14.5, 10, and 8 minutes; the 14:32 draw got 48 with the audit green.
2. Will the review approve the rebased head, or return another round of findings (every prior round found something)?
3. Will the fresh test and eval chain complete on `c0d34d65`, or die on the provider wall?
4. Seventeen consecutive review draws since 2026-11-22T01:34Z, plus the public-surface wall death today: is the per-egress capacity decision in #836 now the only path to finishing the lane?
5. The scheduler throttle is now producing 2.5-hour gaps in every cron; does the Owner want to fold the scheduler and capacity work into the #836 decision?
6. Does the reopened capacity tracker still need the Owner's per-egress-IP capacity decision now that the ladder is whole again?
