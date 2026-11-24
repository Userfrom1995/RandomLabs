# STATE

Last updated: 2026-11-24T16:32Z by run 45436407027

(16:22:40Z eval-handoff summon on PR #850: the evaluation gate approved `c1040c0c` at 16:22:38Z, so the protected PAT merge sweep in this run is landing the PR; one board ping, no agent triggers.)

## TL;DR for the next Hephaestus

- **This was the 16:22:40Z issue_comment run**, summoned by the eval workflow's owner-authored `/oc maintainer` handoff after the Quality Council verdict. Target: PR #850, so the public artifact is a comment there plus one ping on the health board.
- **The evaluation gate approved `c1040c0c`.** The verdict is `eval-verdict: approve-eval`, Quality Council score 9.9/10, `eval-head` bound to `c1040c0c5f17cb1e13f3e8f5e1680f2116b7ac27` and `eval-trigger` 7136390910 (the 15:39:21Z `/oc eval` comment). The report found no blocking defect.
- **The protected PAT merge sweep in this run is landing the PR.** Every sweep predicate was verified on the live thread: the head-fresh `/oc approve-test` marker (7136018137, 15:26:01Z, newer than the 13:54:22Z head push), no `/oc fix` anywhere on the branch, the canonical machine-published eval marker (7137567432, 16:22:38Z, newer than the test marker), the eval head equal to the current head, the eval trigger equal to the latest `/oc eval`, `MERGEABLE`/CLEAN, and closing references `[848]` only. The sweep uses rebase with `--match-head-commit`; the branch stays intact.
- **No merge action in `decision.json`:** workflow-touching PRs merge only through the hardened owner-PAT sweep, never from the agent session. This run's decision is one health-board ping.
- **`#848` closes on merge; `#836` stays open** for the Owner capacity decision. No other lane is touched this run.
- **The next wake is already queued or will arrive on the merge.** The general job's false-positive `/oc maintainer` at 16:28:23Z created pending maintainer run `45437526037`; the merge also fires a `pull_request closed` summon. Whichever owns the single pending slot will start on the fresh trunk and chain `lab` on #854. Do not dispatch #854 into a pre-merge trunk.
- **Main is still `7fb030f2` at write time**; the sweep advances it after this session. `maintainer/logs` live tip is `469d1b3c` (the 15:39:17Z memory commit).
- **Models:** registry 108 models / 10 free at 16:27Z; pin and `small_model` both `deepseek-v4.1-flash-free`; the ladder is 3/3 live. No upgrade dispatch.
- **Held 0; queued the seven known stale runs; in progress this run only.** The allowlist is 19 repo names plus the self-excluded `maintainer`, matching all 20 repo-managed workflow names.
- **Queue after the merge:** #854 lab (round-1 findings), #812, #814, #849, #857, #856, #860 (only after #854), then #742's remainder. #836 stays open for the Owner capacity decision; #821 and the Maze Chase set stay parked.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 16:23-16:32Z on 2026-11-24)

### GitHub state

- **Main:** `7fb030f275a67956d3ce882f6c22a7102d49cf44` at write time (the #863 rebase merge, 2026-11-21T17:52:03Z). The PAT sweep in this run merges #850 with rebase after this session, so the next session should read the advanced tip. **`maintainer/logs` live tip:** `469d1b3c561f4b7321017596d4fe1902abe5f2eb` (the 15:39:17Z memory commit from the 15:26 session).
- **Open PRs (3):**
  - #850 `c1040c0c5f17cb1e13f3e8f5e1680f2116b7ac27`, `Closes #848`, **CLEAN/MERGEABLE** (base `7fb030f2`, merge base = trunk tip), 7 commits, 15 files +1595/-100; checks: deploy SKIPPED, trigger SUCCESS, comment SUCCESS, GitGuardian SUCCESS. The thread ends with the 16:22:38Z eval marker, the 16:22:40Z `/oc maintainer` that summoned this run, two 16:28Z general false-positive notes, and a 16:28:23Z `/oc maintainer` from the same general job. Both merge gates are head-bound to `c1040c0c`. **The protected merge sweep is landing this PR in this run.**
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE (base `e5cd250c`); round-1 lab findings still outstanding, branch unchanged since 2026-11-15T07:38Z; last owner instruction 2026-11-20T03:34:02Z; no test or eval marker exists, so the sweep correctly skips it. Parked until #850 lands.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale (base `86570af1`); no workflow files, so the sweep skips it.
- **Open issues (24 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #831, #836, #848, #849, #856, #857, #860. No new issue. #836 is open and unlabelled for the Owner capacity decision; #677/#678/#659 are the long-frozen Maze Chase standing set under #582; #742 stays open; #848 closes on the #850 merge; #803 stays open until all its slices land; #831 is resolved by merged #832 but remains open (that PR used `Refs`), bookkeeping only.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest notes: the 15:39:19Z board note and the 12:55:44Z quota intake; this run adds one health note.
- **Latest comments:** #850 ends at the 16:28:23Z `/oc maintainer`; before it are the 16:28:16Z and 16:28:01Z general false-positive notes, the 16:22:40Z `/oc maintainer` this run answered, the 16:22:38Z eval marker, the 16:22:36Z Quality Council report, and the 16:22:29Z eval summary. #854 last 2026-11-20T03:34:02Z; #849 last 2026-11-20T03:34:03Z; #836 last 2026-11-21T18:11:34Z. No new human directive.
- **Branch tips:** main `7fb030f2`, `maintainer/logs` `469d1b3c`, #850 `c1040c0c`, #854 `090452f2`, #821 `dce109e4`. The #859 branch `opencode/issue858-curate-umbra-count-copy` stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3) plus the pending maintainer wake `45437526037` (the 16:28:23Z false-positive `/oc maintainer`). **In progress:** this run only.
- **This run:** `45436407027`, `issue_comment` at 16:22:41Z (comment 16:22:40Z); the trusted pre-agent checkout is main `7fb030f2` and the CLI bootstrap put the session tree on the PR head `c1040c0c`; tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **Eval `45428044346`:** `issue_comment` 15:39:26-16:22:52Z, success. The Quality Council approved with 9.9/10 at 16:22:36Z, the workflow published the canonical eval marker at 16:22:38Z, and its forward posted `/oc maintainer` at 16:22:40Z.
- **Test `45414974133`:** `issue_comment` 14:31:07-15:26:09Z, success. The Tester approved at 15:25:50Z, the canonical `/oc approve-test` marker posted at 15:26:01Z, and the test forward posted `/oc maintainer` at 15:26:03Z.
- **Review `45408548328` (round 7):** `issue_comment` 13:55:58-14:31:07Z, success; approved with no findings and posted `/oc test` at 14:31:03Z.
- **Lab `45402353907`:** the round-6 fix pass pushed `c1040c0c` at 13:54:22Z; the 13:55:41Z App-token "workflows permission" push rejection is the expected wrapper noise (the PAT-backed step landed the head).
- **Maintainer fan-out at 16:22:41-16:23:12Z:** dozens of `issue_comment` runs from the eval handoff; every sibling arm skipped, and this is the only maintainer run that executed. No duplicate fan-out remained to cancel.
- **General false-positive at 16:28Z:** the general job matches ` /oc` anywhere in a comment body, and the eval report quotes `/oc approve-test` in prose, so it ran, posted two no-action notes, and its hardcoded step posted `/oc maintainer` at 16:28:23Z (pending maintainer `45437526037`). This is the next-wake chaining path; keep it. Watch item for a future lab round: narrow the general matcher so quoted trigger prose does not summon it.
- **Pages `45408558192` / `45411214495`:** `workflow_dispatch` 13:56:02Z and 14:10:50Z, both failure in `actions/deploy-pages` artifact metadata after a green upload. The PR-head `pull_request` deploy `45408541420` succeeded at 13:55:56Z. Both live sites remain HTTP 200 at 16:29Z (production from `7fb030f2`, preview from the last good build); the provider status page reports operational. A fresh deployment follows the merge; do not loop a third pre-merge dispatch.
- **Schedules:** no scheduled run since the 12:11:13Z maintainer tick. Today: auditor `45359855998` green 08:52-09:16Z (delayed daily pass), curator `45360350939` green 08:55-09:07Z, recover `45339887322` green 06:21Z. The scheduler throttle (#831/#836) remains.
- **Wall:** the last death was the 12:54:48Z lab handoff (issue #754). The 14:31 test draw completed at 15:26Z and the 15:39 eval draw completed at 16:22Z, both on fresh runners. No same-pool retry is in play.
- **Model registry:** fresh read 16:27Z: 108 models / 10 free; pin `deepseek-v4.1-flash-free`, rung 2 `mimo-v2.6-flash-free`, and rung 3 `nemotron-3.5-lightning-free` are live. No Auditor recommendation, no upgrade dispatch.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Zero missing, zero extra (the three GitHub-managed workflows are outside the allowlist by design).
- **Audit:** the #850 head carries R1-R37; the eval gate re-ran the full audit 38/0 with the live board. The last daily pass reports R1-R36 on main with 37/0 consistent. Two low-severity doc drifts remain noted by the daily pass (`maintainer.yml:581` OUTPUT CONTRACT action list omits `sweep`/`create_issue`/`create_pr`; the two stale `longcat-2.5-free` prompt examples) - fold into the next lab round, no new issue.

### Live lanes and their next step

- **#850 / #848 (protected-path lab lane):** the protected merge sweep lands this head in this run; after the merge, verify main advanced, the site re-deploys, and #848 closed. On the off chance the sweep skips or fails, read the run log and re-arm the lane next wake; the gates are all still valid until the head moves.
- **#854 / #803 (protected-path slice 3):** CLEAN/MERGEABLE; round-1 lab findings outstanding (the #853 deferral guard and Refs, fail-closed head/enumeration reads, resolver fail-closed, wall-death fixture, R20 pins, AGENTS/LAB claims); last owner instruction 2026-11-20T03:34:02Z. Next: re-arm `lab` on the fresh post-#850 trunk; keep #803 open until all its slices land.
- **#812 / #814 (audit-harness backlog):** #812 is the R11 same-name shadowing with no `lab:` job scoping; #814 is the fail-open baseline read in the fix lane. Both still reproduce on main; #815 is fixed and closed. Next: after #854, with the R32 verify-body pin updated in lockstep.
- **#849 (fail-loud hardening):** lab trigger 2026-11-20T03:34:03Z; the trigger carries the expanded scope (including the #853 deferral guard). Next: after #812/#814, then #857, #856, #860 in that order (#860 only after #854).
- **#742 remainder (tracker):** open. The merged slice covers the 15 six-workflow steps; the other lanes still need the privileged launcher and the preamble, and the follow-ups remain (post-agent head check, evidence latches, per-OS `git_exec_path` pin, proxy/TLS keys). Candidate for a lab round after the serialized backlog; do not open a duplicate issue.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; the rung/contract slice is merged, but the per-egress-IP wall remains the only fix that ends the recurrence.
- **Public surface (curator lane):** last full pass green at 08:55:25-09:07:25Z with no repo changes; the self-heal re-dispatch died on the wall at 09:21:29Z and the bounded cap halted the chain. No same-pool retry; the next 6-hour cron re-arms.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw at a time; no same-pool burst. This run dispatches no agent trigger; the pending 16:28 wake and the merge-closed summon will own the next pass.
- The next session must not dispatch #854 until it has re-read the reference head on the advanced trunk; dispatching into the pre-merge trunk would replay the stale-based rebase defect.
- The two Pages deploy failures are platform-side (artifact metadata missing after a successful upload; provider status operational). Two pre-merge attempts are enough; do not loop a third. The merge re-deploys.
- Never merge without a head-fresh Tester marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardened PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#850 merge (landing this run):** the PAT sweep merges `c1040c0c` after this session; verify the merge conclusion, the advanced trunk, the Pages re-deploy, and the #848 closure next wake.
2. `{"action":"lab","pr":854}`: after #850 lands; on a push, the fresh review/test/eval chain; keep #803 open unless all its slices land.
3. `{"action":"lab","issue":812}`: after #854; scope R11 to the `lab:` job and update the R32 verify-body pin in lockstep.
4. `{"action":"lab","issue":814}`: after #812; fail-closed baseline read in the fix lane and update the R32 pin in lockstep.
5. `{"action":"lab","issue":849}`: after #814; on a push, the review/test chain.
6. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
7. `{"action":"lab","issue":856}`: after #857.
8. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
9. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #850: the protected sweep is landing `c1040c0c` in this run; next wake verifies the merge, the site re-deploy, and the #848 closure. If the sweep failed, read its log and re-arm next wake; the branch stays intact.
2. The round-7 review approval, the 15:26:01Z test approval, and the 16:22:38Z eval approval all bind `c1040c0c`. The eval marker is newer than the test marker and its trigger is the latest `/oc eval`; nothing supersedes it.
3. The 13:55:41Z wrapper App-token push rejection on the lab push is expected noise; the PAT step landed `c1040c0c` at 13:54:22Z. No post-mortem.
4. The general job's ` /oc` substring trigger matched the eval report's prose and produced two no-action notes plus one extra owner `/oc maintainer`. Harmless here (it supplies the chaining wake), but fold a narrower matcher into a future lab round; no new issue.
5. Pages: the 13:56Z and 14:10Z pre-merge dispatches failed in `actions/deploy-pages` artifact metadata after green uploads; the provider status page is operational and both live URLs stay 200. The merge re-deploys; do not loop a third pre-merge attempt.
6. Public surface: the 08:55-09:07Z schedule ran green; the bounded self-heal re-dispatch (`45362167705`) hit the wall at 09:21:29Z and the cap halted the chain. The exhaustion marker is triaged as allowance-class; the next 6-hour cron re-arms. No same-pool retry.
7. Health pass: the 08:52-09:16Z delayed schedule ran green and posted the daily audit; the next is the 2026-11-25T00:00Z slot.
8. #836 stays open for the Owner capacity decision. The merged slice restores rung 3 and aligns the contract only; do not close the issue.
9. #745 is done: merged `eca3be8e`, Pages green, #853 closed. #742 stays open for the remaining owner-credential work; the review's residual notes (other lanes lack the privileged launcher/preamble; proxy/TLS keys unpinned) are tracked there.
10. #848 closes on #850; #803 stays open until all its slices land.
11. #831 is resolved by merged #832 but remains open because that PR used `Refs`; bookkeeping only, no dispatch.
12. Model registry drift: the ladder is 3/3 on main and all three rungs are live; the free count is 10 at 16:27Z, with no rung retired. The newer free names in the registry have no Auditor recommendation; no lab dispatch.
13. Maintainer schedule/recover throttling: the declared 20-minute cron fires only a few times a day; the 15:26 and 16:22 wakes were routed summons, not schedule ticks. The scheduler throttle (#831/#836) remains, and the heartbeat lives in a throttled cron too.
14. Pages: production is green on `7fb030f2` at write time; the preview artifact redeploys on PR updates. The merge sweep triggers a fresh deployment; verify it next wake.
15. Workspace: this run's trusted pre-agent checkout is main `7fb030f2`; the CLI bootstrap put the session tree on the PR head `c1040c0c`. The memory bundle came from the trusted log-branch tip, `.maintainer/` is gitignored, and the tree is clean.
16. Memory: the 2026-11-24 file carries the 01:53-01:58Z session, the 02:15Z quota marker, the recovered 06:22-06:29Z session, the 06:38Z quota marker, the 09:16-09:22Z session, the 09:21-09:36Z triage, the 12:11-12:18Z session, the 12:55Z intake marker, the 12:54-13:16Z triage, the 13:56-14:2xZ triage, the 14:31-14:4xZ triage, the 15:26-15:4xZ triage, and this 16:22-16:3xZ triage. The log publish is append-only with keep-both semantics. The `maintainer/logs` tip is `469d1b3c`.
17. The 06:22Z session's memory commit was rejected three times by a transient `commit_refs_rules` server error; the recoverable bundle is restored in today's log. The 06:38Z intake committed successfully, the 09:16Z session committed `7b993018`, the 09:21Z session committed `4ace95c77`, the 12:11Z session committed `102671167`, the 12:55Z intake committed `c25849574`, the 13:20Z session committed `c376983ed`, the 13:56Z session committed `ebe7f971`, the 14:31Z session committed `21198af4`, and the 15:26Z session committed `469d1b3c`. No further recovery needed.
18. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round, not a standalone issue.
19. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
20. The merged #863 tree keeps the R26 canonical manifest in lockstep with `maintainer.yml`; the #850 head regenerates it and the test and eval rounds verified the regenerated pin.
21. No agent-side merge or dispatch this run beyond the protected sweep. The last verified merge was #863 via the same sweep at 2026-11-21T17:52:03Z.
22. #815 was closed as completed at 09:21:36Z after verifying the `unset LAB_RUN_NONCE` hermeticity fix on main; no comment posted.
23. The public-surface self-heal cap message is expected behavior for a wall-class death, not an infra defect; the quota intake covers the wall and the cron re-arms.
24. The general false-positive at 16:28Z is the trigger-prose matcher, not a code defect: it ran twice on the same report, posted two no-action notes, and supplied the next maintainer wake. Watch item only.

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

- This run's session is the eval-handoff summon on PR #850; the memory branch is `maintainer/logs`. The status comment on #850 is the public artifact, plus one health-board ping.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong. This run posts on #850 and pings the board.
- The pipeline is green on main (`7fb030f2`; Pages success 2026-11-22T01:15:52Z, live root 200), and the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed seventeen review draws between 2026-11-22T01:34Z and 2026-11-24T09:34Z and the lab handoff at 2026-11-24T12:54:48Z, while fresh runners completed the 12:18 and 13:55 reviews, the 13:20 lab pass, the 14:31 test, and the 15:39 eval. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Verify the #850 merge landed on the advanced trunk, the Pages re-deploy, and the #848 closure. Read the sweep's merge line in the run log; on an unexpected skip/failure, read the predicate reason and re-arm next wake.
2. Dispatch `lab` on #854 against the fresh post-#850 trunk (round-1 findings), then #812, #814, #849, #857, #856, #860 in order (#860 only after #854 lands), then #742's remainder.
3. Read the next public-surface cron outcome; if it dies on the wall again, do not same-pool retry.
4. Keep #836 open for the Owner capacity decision; keep #742 open for the remaining owner-credential work; #831 is bookkeeping only; #848 closes on the merge; #803 stays open until all its slices land; #815 is closed.
5. Read the next Auditor and Curator outcomes; the 2026-11-24 delayed passes are green.
6. Verify the board invariant, allowlist, registry/ladder, Pages, held runs, and schedule health; if clean, stand by.

## Open questions

1. Will the protected sweep land #850 cleanly on the rebase, or will a post-merge Pages failure leave the preview stale until the next deploy?
2. Is the Pages artifact-metadata failure a short provider incident that clears on the merge re-deploy, or a longer platform degradation?
3. The scheduler throttle is producing multi-hour gaps in every cron; does the Owner want to fold the scheduler and capacity work into the #836 decision?
4. Does the reopened capacity tracker still need the Owner's per-egress-IP capacity decision now that the ladder is whole again?
5. The general job matched trigger prose in the eval report and ran twice; is narrowing that matcher worth a future lab round, or is the occasional chaining wake acceptable?
