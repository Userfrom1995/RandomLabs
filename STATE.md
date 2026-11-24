# STATE

Last updated: 2026-11-24T14:41Z by run 45414967114

(14:31Z review-report summon on PR #850: round 7 approved with no findings, `/oc test` posted at 14:31:03Z, and the test gate is live on `c1040c0c`. No dispatch, no merge, one board ping.)

## TL;DR for the next Hephaestus

- **This was the 14:31:00Z issue_comment run**, summoned by the owner-authored round-7 review report (a non-`/oc` owner comment) on PR #850. Target: PR #850, so the public artifact is a comment there plus one ping on the health board.
- **Round 7 approved.** The review closed clean at 14:31:00Z: no findings, full audit 38 passed / 0 failed with the live board resolving #70, the round-6 F1/N1-N3 fixes verified (the N3 resolver-source pin is proven load-bearing by mutation), and the head `c1040c0c` sits on the trunk tip, CLEAN/MERGEABLE.
- **The test gate is live.** The review forward posted `/oc test` at 14:31:03Z and test `45414974133` started 14:31:07Z; its tester step was active at 14:36Z. No test approval marker exists yet.
- **No merge is pending.** There is no head-fresh test approval and no head-bound `approve-eval` on `c1040c0c`; the protected PAT sweep only lands after both. `closingIssuesReferences` is [848] only, so #848 closes on merge and #836 stays open for the Owner capacity decision.
- **Decisions this run: one health-board ping (#70) plus the #850 status comment.** The test already owns the lane; no duplicate review, test, or eval was dispatched. The 14:31 maintainer fan-out cohort (about 20 `workflow_run` runs) resolved itself: most skipped, four cancelled by the single-slot supersede; no 0-job duplicate remains queued.
- **Main is unchanged at `7fb030f2`; `maintainer/logs` live tip is `ebe7f971`** (the 14:23:51Z memory commit from the 13:56 session; `c376983ed` is the 13:20Z session; `c25849574` is the 12:55Z intake marker).
- **Models:** registry 108 models / 10 free at 14:34Z; pin and `small_model` both `deepseek-v4.1-flash-free`; the ladder is 3/3 live. No upgrade dispatch.
- **Held 0; queued the seven known stale runs; in progress this run plus the test.** The allowlist is 19 repo names plus the self-excluded `maintainer`, matching all 20 repo-managed workflow names.
- **Queue after #850:** #854 lab (round-1 findings), #812, #814, #849 lab, #857, #856, #860 (only after #854), then #742's remainder. #836 stays open for the Owner capacity decision; #821 and the Maze Chase set stay parked.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 14:32-14:40Z on 2026-11-24)

### GitHub state

- **Main:** `7fb030f275a67956d3ce882f6c22a7102d49cf44` (the #863 rebase merge, 2026-11-21T17:52:03Z). The tree is unchanged since that checkpoint. **`maintainer/logs` live tip:** `ebe7f97117d1257f1b32cefe67b804fe7bc3b5db` (the 14:23:51Z memory commit from the 13:56 session; `c376983ed` is the 13:20Z session; `c25849574` is the 12:55Z intake marker; `102671167` is the 12:18Z session).
- **Open PRs (3):**
  - #850 `c1040c0c5f17cb1e13f3e8f5e1680f2116b7ac27`, `Closes #848`, **CLEAN/MERGEABLE** (base `7fb030f2`, merge base = trunk tip), 7 commits, 15 files +1595/-100; checks: deploy SKIPPED, trigger SUCCESS, comment SUCCESS, GitGuardian SUCCESS. The thread ends at the 14:31:03Z `/oc test`; before it are the 14:31:00Z round-7 approval report and the 14:30:53Z approval summary. The body names PR #850 in prose, carries the round-6 ledger plus skills line, and ends `Closes #848` / `- the Lab Engineer`. **The test gate is live on this head.**
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE (base `e5cd250c`); round-1 lab findings still outstanding, branch unchanged since 2026-11-15T07:38Z; last owner instruction 2026-11-20T03:34:02Z; parked behind #850.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale (base `86570af1`).
- **Open issues (24 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #831, #836, #848, #849, #856, #857, #860. No new issue since 2026-11-19T06:48Z. #836 is open for the Owner capacity decision; #677/#678/#659 are the long-frozen Maze Chase standing set under #582; #742 stays open; #848 closes on #850; #803 stays open until all its slices land; #831 is resolved by merged #832 but remains open (that PR used `Refs`), bookkeeping only.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest notes: the 12:55:44Z quota intake and the 14:23:54Z board note; this run's health note follows.
- **Latest comments:** #850 ends at the 14:31:03Z `/oc test`; the round-7 report is 14:31:00Z; #70's newest before this run is the 14:23:54Z board note. #854 last 2026-11-20T03:34:02Z; #849 last 2026-11-20T03:34:03Z; #836 last 2026-11-21T18:11:34Z. No new human directive.
- **Branch tips:** main `7fb030f2`, `maintainer/logs` `ebe7f971`, #850 `c1040c0c`, #854 `090452f2`, #821 `dce109e4`. The #859 branch `opencode/issue858-curate-umbra-count-copy` stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3). **In progress:** this run and test `45414974133`.
- **This run:** `45414967114`, `issue_comment` at 14:31:04Z; the trusted pre-agent checkout is main `7fb030f2` and the CLI bootstrap put the session tree on the PR head `c1040c0c`; tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **Review `45408548328` (round 7, the nineteenth draw):** `issue_comment` 13:55:58-14:31:07Z, success. The reviewer wrote `{"action":"test"}`, the report and approval summary were published, and the forward step posted `/oc test` at 14:31:02-03Z. The review gate-skip `45408564007` completed skipped at 14:31:07Z.
- **Test `45414974133`:** `issue_comment` started 14:31:07Z, in progress at 14:36Z; `Run opencode tester` is the active step. The earlier `45414966960` at 14:31:04Z is a skipped duplicate. No test marker yet.
- **Maintainer fan-out cohort at 14:31:07-14:31:24Z:** about 20 `workflow_run` runs from the completed lanes; most skipped, four cancelled by the single-slot supersede (`45415002563`, `45415000297`, `45414985589`, `45414985016`). This is the designed supersede behavior; no 0-job duplicate remains.
- **Pages `45408558192`:** `workflow_dispatch` 13:56:02-13:56:33Z, failure. The preview job's dispatch staged and uploaded the site, then `Deploy to GitHub Pages` failed with `Found 0 artifact(s)` / `Fetching artifact metadata failed`. **Pages `45411214495`:** my single re-dispatch 14:10:50-14:11:25Z failed the identical way. Both live sites remain HTTP 200 from the last good deployment (main `7fb030f2`, preview `c0d34d65`); the provider status page reports operational. No loop.
- **No other run between 14:23Z and this survey**; no recover tick, no curator tick, no auditor tick. The scheduler throttle (#831/#836) remains.
- **Wall:** the review lane's 19 draws since 2026-11-22T01:34Z: seventeen died on the wall, the 12:18 draw completed (round 6), and the 13:55 draw completed (round 7). The test draw is alive on a fresh runner. The last wall death was the 12:54:48Z lab handoff (issue #754).
- **Model registry:** fresh read 14:34Z: 108 models / 10 free; pin `deepseek-v4.1-flash-free`, rung 2 `mimo-v2.6-flash-free`, and rung 3 `nemotron-3.5-lightning-free` are live. Other free names: `iceman-free`, `beam-free`, `flint-40b-free`, `nemotron-3.5-super-vl-free`, `jev-1.13-free`, `hy4-flash-free`, `tidepool-alpha-free`; no Auditor recommendation, no upgrade dispatch.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Zero missing, zero extra (the three GitHub-managed workflows are outside the allowlist by design).
- **Schedules:** auditor daily cron 00:00Z; last success `45359855998` at 08:52:01-09:16:17Z (delayed). Curator cron every 6h; last schedule success `45360350939` at 08:55:25-09:07:25Z, its self-heal dispatch `45362167705` died on the wall at 09:21:49Z; the 12:00Z and 18:00Z crons have not fired yet. Recover cron every 20 min; last success `45339887322` at 06:22:29Z. Maintainer cron every 20 min; the last schedule was 12:11:13Z, plus this 14:31:00Z routed summon.
- **Pages:** production is green on `7fb030f2` (last good deploy `44970574916` at 2026-11-22T01:15:15-01:15:52Z); the preview is 200 from `c0d34d65`; the two artifact-service failures did not change what is served.
- **Audit:** the #850 head carries R1-R37; round 7 re-ran the full audit 38/0 with the live board. The last daily pass reports R1-R36 on main with 37/0 consistent. Two low-severity doc drifts remain noted by the daily pass (`maintainer.yml:581` OUTPUT CONTRACT action list omits `sweep`/`create_issue`/`create_pr`; two stale `longcat-2.5-free` prompt examples) - fold into the next lab round, no new issue.

### Live lanes and their next step

- **#850 / #848 (protected-path lab lane):** the test gate is live on `c1040c0c`. On approval, the test forward summons the next Maintainer wake to route eval; on `approve-eval`, the PAT merge sweep lands it, Pages re-deploys, and #848 closes. On test findings, the infra lane returns to the Lab Engineer. The head is clean and mergeable on the trunk tip, so no rebase is needed unless main moves first.
- **#854 / #803 (protected-path slice 3):** CLEAN/MERGEABLE; round-1 lab findings outstanding (the #853 deferral guard and Refs, fail-closed head/enumeration reads, resolver fail-closed, wall-death fixture, R20 pins, AGENTS/LAB claims); last owner instruction 2026-11-20T03:34:02Z. Next: after #850, re-arm lab; keep #803 open until all its slices land.
- **#812 / #814 (audit-harness backlog):** #812 is the R11 same-name shadowing with no `lab:` job scoping; #814 is the fail-open baseline read in the fix lane. Both still reproduce on main; #815 is fixed and closed. Next: after #854, with the R32 verify-body pin updated in lockstep.
- **#849 (fail-loud hardening):** lab trigger 2026-11-20T03:34:03Z; the trigger carries the expanded scope (including the #853 deferral guard). Next: after #812/#814, then #857, #856, #860 in that order (#860 only after #854).
- **#742 remainder (tracker):** open. The merged slice covers the 15 six-workflow steps; the other lanes still need the privileged launcher and the preamble, and the follow-ups remain (post-agent head check, evidence latches, per-OS `git_exec_path` pin, proxy/TLS keys). Candidate for a lab round after the serialized backlog; do not open a duplicate issue.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; the rung/contract slice is merged, but the per-egress-IP wall remains the only fix that ends the recurrence.
- **Public surface (curator lane):** last full pass green at 08:55:25-09:07:25Z with no repo changes; the self-heal re-dispatch died on the wall at 09:21:29Z and the bounded cap halted the chain. No same-pool retry; the next 6-hour cron re-arms.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw at a time; no same-pool burst. This run dispatched no agent: the test already owns #850 and the queue stays parked behind it.
- The two Pages deploy failures are platform-side (artifact metadata missing after a successful upload; provider status operational). Two attempts are enough; do not loop a third. The next PR update or the merge re-deploys.
- #850 is rebased onto `7fb030f2`; no further rebase is needed unless the trunk moves before merge.
- Never merge without a head-fresh Tester marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardcoded PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#850 test (live this run):** read the test verdict on `c1040c0c`; on approval, route eval on the same head; on `approve-eval`, PAT merge sweep, verify Pages, close #848. On test findings, the infra lane returns to the Lab Engineer.
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

1. #850: the test gate is live on `c1040c0c`; read its verdict next wake. On approval, route eval; on findings, the infra lane returns to the Lab Engineer. On a wall death, stand down and re-arm on the following wake.
2. The round-7 review approval binds `c1040c0c`; the test approval must be head-fresh, and the evaluation gate must be head-bound before any merge.
3. The wrapper's App-token push rejection on the 13:55 lab push is expected noise; the PAT step landed `c1040c0c` at 13:54:22Z. No post-mortem.
4. The review lane's 19 draws since 2026-11-22T01:34Z: seventeen died on the wall, the 12:18 draw completed (round 6), and the 13:55 draw completed (round 7). The fresh-run lottery remains the designed recovery.
5. Pages: the 13:56Z preview dispatch and the 14:11Z re-dispatch both failed in `actions/deploy-pages` artifact metadata after a successful upload; the provider status page is operational and both live URLs stay 200 from the last good deployment. No repo-side defect and no retry loop; the next PR update or the merge re-deploys.
6. Public surface: the 08:55-09:07Z schedule ran green; the bounded self-heal re-dispatch (`45362167705`) hit the wall at 09:21:29Z and the cap halted the chain. The exhaustion marker is triaged as allowance-class; the next 6-hour cron re-arms. No same-pool retry.
7. Health pass: the 08:52-09:16Z delayed schedule ran green and posted the daily audit; the next is the 2026-11-25T00:00Z slot.
8. #836 stays open for the Owner capacity decision. The merged slice restores rung 3 and aligns the contract only; do not close the issue on the merge.
9. #745 is done: merged `eca3be8e`, Pages green, #853 closed. #742 stays open for the remaining owner-credential work; the review's residual notes (other lanes lack the privileged launcher/preamble; proxy/TLS keys unpinned) are tracked there.
10. #848 closes on #850; #803 stays open until all its slices land.
11. #831 is resolved by merged #832 but remains open because that PR used `Refs`; bookkeeping only, no dispatch.
12. Model registry drift: the ladder is 3/3 on main and all three rungs are live; the free count is 10 at 14:34Z, with no rung retired. The newer free names in the registry have no Auditor recommendation; no lab dispatch.
13. Maintainer schedule/recover throttling: the declared 20-minute cron fires only a few times a day; the 14:31 cohort was the routed summon, not a schedule tick. The scheduler throttle (#831/#836) remains, and the heartbeat lives in a throttled cron too.
14. Pages: production is green on `7fb030f2`; the preview artifact redeploys on PR updates. No manual dispatch unless a merge sweep's deployment trigger fails.
15. Workspace: this run's trusted pre-agent checkout is main `7fb030f2`; the CLI bootstrap put the session tree on the PR head `c1040c0c` for the review-report wake. The memory bundle came from the trusted log-branch tip, `.maintainer/` is gitignored, and the tree is clean.
16. Memory: the 2026-11-24 file carries the 01:53-01:58Z session, the 02:15Z quota marker, the recovered 06:22-06:29Z session, the 06:38Z quota marker, the 09:16-09:22Z session, the 09:21-09:36Z triage, the 12:11-12:18Z session, the 12:55Z intake marker, the 12:54-13:16Z triage, the 13:56-14:2xZ triage, and this 14:31-14:4xZ triage. The log publish is append-only with keep-both semantics. The `maintainer/logs` tip is `ebe7f971`.
17. The 06:22Z session's memory commit was rejected three times by a transient `commit_refs_rules` server error; the recoverable bundle is restored in today's log. The 06:38Z intake committed successfully, the 09:16Z session committed `7b993018`, the 09:21Z session committed `4ace95c77`, the 12:11Z session committed `102671167`, the 12:55Z intake committed `c25849574`, the 13:20Z session committed `c376983ed`, and the 13:56Z session committed `ebe7f971`. No further recovery needed.
18. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round, not a standalone issue.
19. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
20. The merged #863 tree keeps the R26 canonical manifest in lockstep with `maintainer.yml`; the #850 head regenerates it and round 7 verified the regenerated pin.
21. No agent-side merge or dispatch beyond the test already live. The last merge was #863 via the hardcoded PAT sweep at 2026-11-21T17:52:03Z.
22. #815 was closed as completed at 09:21:36Z after verifying the `unset LAB_RUN_NONCE` hermeticity fix on main; no comment posted.
23. The public-surface self-heal cap message (`cap of 1 re-dispatch(es) for curator.yml reached after this crash`) is expected behavior for a wall-class death, not an infra defect; the quota intake covers the wall and the cron re-arms.
24. The 14:31 maintainer fan-out cohort was the designed single-slot supersede: four runs cancelled, the rest skipped. No sibling owns this lane, and no duplicate review/test/eval trigger was posted.

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

- This run's session is a review-report summon on PR #850; the memory branch is `maintainer/logs`. The status comment on #850 is the public artifact, plus one health-board ping.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong. This run posts on #850.
- The pipeline is green on main (`7fb030f2`; Pages success 2026-11-22T01:15:52Z, live root 200), and the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed seventeen review draws between 2026-11-22T01:34Z and 2026-11-24T09:34Z and the lab handoff at 2026-11-24T12:54:48Z, while fresh runners completed the 12:18 and 13:55 reviews and the 13:20 lab pass. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #850 test verdict on `c1040c0c`. On approval, route eval on the same head; on `approve-eval`, the PAT merge sweep, verify Pages, close #848. On test findings, the infra lane returns to the Lab Engineer. On a wall death, stand down and re-arm on the following wake.
2. Then #854 lab (round-1 findings), #812, #814, #849, #857, #856, #860 in order (#860 only after #854 lands), then #742's remainder.
3. Read the next public-surface cron outcome; if it dies on the wall again, do not same-pool retry.
4. Keep #836 open for the Owner capacity decision; keep #742 open for the remaining owner-credential work; #831 is bookkeeping only; #848 closes on #850; #803 stays open until all its slices land; #815 is closed.
5. Read the next Auditor and Curator outcomes; the 2026-11-24 delayed passes are green.
6. Verify the board invariant, allowlist, registry/ladder, Pages, held runs, and schedule health; if clean, stand by.

## Open questions

1. Will the live test gate pass on `c1040c0c`, or die on the provider wall / return findings?
2. Will the eval gate complete on this head, or join the wall lottery?
3. Is the Pages artifact-metadata failure a short provider incident that clears on the next PR update, or a longer platform degradation that leaves the previews stale through the merge?
4. The scheduler throttle is producing multi-hour gaps in every cron; does the Owner want to fold the scheduler and capacity work into the #836 decision?
5. Does the reopened capacity tracker still need the Owner's per-egress-IP capacity decision now that the ladder is whole again?
