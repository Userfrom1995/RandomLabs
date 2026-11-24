# STATE

Last updated: 2026-11-24T13:16Z by run 45398034783

(12:54Z review-report summon: round 6 returned changes required on #850; the fix handoff died on the provider allowance at 12:54:48Z before touching the tree, so one fresh fix pass is re-armed on the unchanged head.)

## TL;DR for the next Hephaestus

- **This was the 12:54:19Z issue_comment run**, summoned by the owner-authored round-6 review report on #850 (the same minute posted the `/oc lab` handoff). Target: PR #850, so the public artifact is a comment there.
- **The eighteenth review draw did not die on the wall: it completed.** Review `45392220358` ran 12:18:26-12:54:23Z (about 36 minutes) and returned changes required: F1 (blocking) the PR body's delegation ledger is a one-line no-delegation note for an above-threshold rebase (15 files, 7 workflows), plus N1-N3 (two stale R36 comments, unquoted resolver step names, unpinned resolver `TRUSTED_REF` source). The rebased technical content is clean; the audit ran 38/0 with the live board.
- **The fix handoff died on the wall immediately.** Lab `45398045302` started at 12:54:24Z and hit `FreeUsageLimitError` at 12:54:48Z (`retry-after: 40481`, diagnostic only) with no decision file and no push; the head is unchanged at `c0d34d65`. The quota intake `45398203066` detected the wall, stood down, and posted the 12:55:44Z note on #70.
- **Decisions this run: one fresh `lab` on #850 plus a status comment there.** This session is alive on an open allowance bucket, so one fresh fix pass is the designed lottery; it will apply F1 and fold in N1-N3, re-run the full audit, and hand off to review. No review/test/eval dispatch on the unchanged head, no queue dispatch, no merge.
- **Main is unchanged at `7fb030f2`; `maintainer/logs` live tip is `c25849574`** (the 12:55Z intake marker; `102671167` is the 12:18Z session memory; `4ace95c77` is the 09:38Z memory).
- **Models:** registry 108 models / 10 free at 13:14Z; pin and `small_model` both `deepseek-v4.1-flash-free`; the ladder is 3/3 live. No upgrade dispatch.
- **Held 0; queued the seven known stale runs; in progress this run.** The allowlist is 19 repo names plus the self-excluded `maintainer`, matching all 20 repo-managed workflow names.
- **Queue after #850:** #854 lab (round-1 findings), #812, #814, #849 lab, #857, #856, #860 (only after #854), then #742's remainder. #836 stays open for the Owner capacity decision; #821 and the Maze Chase set stay parked.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 12:59-13:16Z on 2026-11-24)

### GitHub state

- **Main:** `7fb030f275a67956d3ce882f6c22a7102d49cf44` (the #863 rebase merge, 2026-11-21T17:52:03Z). The tree is unchanged since that checkpoint. **`maintainer/logs` live tip:** `c258495748768beb0623a6d6e60a3f7d3d6efaa8` (the 12:55Z intake marker; `102671167` is the 12:18Z session memory; `4ace95c77` is the 09:38Z memory; `5d47ea637` is the 09:35Z intake marker).
- **Open PRs (3):**
  - #850 `c0d34d65be3b9561f026847c28cd4051dbfa2f7c`, `Closes #848`, **CLEAN/MERGEABLE** (base `7fb030f2`, merge base = trunk tip), 6 commits, 15 files +1593/-100; checks: deploy SKIPPED, trigger SUCCESS, comment SUCCESS, GitGuardian SUCCESS. The thread ends at the 12:54:19Z `/oc lab` handoff; the round-6 review report is at 12:54:16Z and the one-line verdict at 12:54:09Z. The lab handoff died on the wall at 12:54:48Z with no verdict change and no push. **This run arms one fresh lab pass.**
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE (base `e5cd250c`); round-1 lab findings still outstanding, branch unchanged since 2026-11-15T07:38Z; last owner instruction 2026-11-20T03:34:02Z; parked behind #850.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale (base `86570af1`).
- **Open issues (24 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #831, #836, #848, #849, #856, #857, #860. No new issue since 2026-11-19T06:48Z. #836 is open for the Owner capacity decision; #677/#678/#659 are the long-frozen Maze Chase standing set under #582; #742 stays open; #848 closes on #850; #803 stays open until all its slices land; #831 is resolved by merged #832 but remains open (that PR used `Refs`), bookkeeping only.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest notes: the 12:18:21Z board note and the 12:55:44Z quota intake; this run's status comment goes on #850, not the board.
- **Latest comments:** #850 ends at the 12:54:19Z `/oc lab`; the round-6 review report is 12:54:16Z; #70's newest is the 12:55:44Z quota note. #854 last 2026-11-20T03:34:02Z; #849 last 2026-11-20T03:34:03Z; #836 last 2026-11-21T18:11:34Z. No new human directive.
- **Branch tips:** main `7fb030f2`, `maintainer/logs` `c25849574`, #850 `c0d34d65`, #854 `090452f2`, #821 `dce109e4`. The #859 branch `opencode/issue858-curate-umbra-count-copy` stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3); no live maintainer sibling. **In progress:** this run.
- **This run:** `45398034783`, `issue_comment` at 12:54:19Z; the trusted pre-agent checkout is main `7fb030f2` and the CLI bootstrap put the session tree on the PR head `c0d34d65`; tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **Review `45392220358` (the eighteenth draw):** `issue_comment` 12:18:26-12:54:23Z, success. It completed the full audit and review, posted the 12:54:09Z verdict and the 12:54:16Z report (changes required: F1 blocking, N1-N3 non-blocking), then the 12:54:19Z `/oc lab` handoff. This ends the run of wall-dead review draws: the last death was the seventeenth at 09:34:16Z.
- **Lab `45398045302`:** `issue_comment` 12:54:24-12:55:18Z, failure. The agent step hit the wall at 12:54:48.183Z (`FreeUsageLimitError`, `retry-after: 40481`, diagnostic only); no decision file, no push, head unchanged. The verify step failed with `Lab step finished with outcome 'failure' and no decision file`; the post-agent PAT steps were gated off.
- **Quota intake `45398203066`:** `workflow_run` maintainer 12:55:21-12:56:00Z, success. It read the failed lab run's check-run annotations, matched the canonical #754 wall phrase, stood down without an agent, and posted the 12:55:44Z note on #70; its memory commit `c25849574` appended a run marker only.
- **This run's fan-out:** one lab trigger plus a status comment on #850.
- **No run between 12:56:00Z and this survey**; no recover tick, no curator tick, no auditor tick since the delayed 08:52-09:16Z pass. The scheduler throttle (#831/#836) remains.
- **Wall:** the review lane's last wall death was the seventeenth at 09:34:16Z; the eighteenth draw completed. The lab handoff at 12:54:48Z is the newest wall death (allowance class). The provider's `retry-after` header is diagnostic only, never a park horizon; a fresh run is the designed recovery.
- **Model registry:** fresh read 13:14Z: 108 models / 10 free; pin `deepseek-v4.1-flash-free`, rung 2 `mimo-v2.6-flash-free`, and rung 3 `nemotron-3.5-lightning-free` are live. Other free names: `iceman-free`, `beam-free`, `flint-40b-free`, `nemotron-3.5-super-vl-free`, `jev-1.13-free`, `hy4-flash-free`, `tidepool-alpha-free`; no Auditor recommendation, no upgrade dispatch.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Zero missing, zero extra (the three GitHub-managed workflows are outside the allowlist by design).
- **Schedules:** auditor daily cron 00:00Z; last success `45359855998` at 08:52:01-09:16:17Z (delayed). Curator cron every 6h; last schedule success `45360350939` at 08:55:25-09:07:25Z, its self-heal dispatch `45362167705` died on the wall at 09:21:49Z; the 12:00Z cron has not fired. Recover cron every 20 min; last success `45339887322` at 06:22:29Z. Maintainer cron every 20 min; the last schedule was 12:11:13Z (session 12:11-12:18Z), plus this 12:54:19Z review-report summon.
- **Pages:** `44970574916` success 2026-11-22T01:15:15-01:15:52Z on `7fb030f2`; preview `44970563056` success on `c0d34d65`; live root HTTP 200 and preview HTTP 200 at 13:14Z.
- **Audit:** the rebased head carries R1-R37; the round-6 review ran the full audit 38/0 with the live board. The last daily pass reports R1-R36 on main with 37/0 (R1-R36) consistent. Two low-severity doc drifts remain noted by the daily pass (`maintainer.yml:581` OUTPUT CONTRACT action list omits `sweep`/`create_issue`/`create_pr`; two stale `longcat-2.5-free` prompt examples) - fold into the next lab round, no new issue.

### Live lanes and their next step

- **#850 / #848 (protected-path lab lane):** the round-6 review requires F1 (delegation ledger in the PR body) and may fold in N1-N3; one fresh lab pass is armed this run. On a push or a lab `review` handoff, the fresh review; on approval, the test and eval chain; on `approve-eval`, PAT merge sweep, Pages, close #848.
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

- One draw at a time; no same-pool burst. This run arms one heavy lane (the fresh lab pass) on a runner whose egress bucket is demonstrably open: this agent session itself is alive on the unchanged free pin. The queue stays parked behind it.
- The lab handoff died on the wall at 12:54:48Z; this wake is the next fresh draw and the 30-minute cooldown is not a park horizon for a fresh runner. Never repeat the same failed strategy twice in the same window.
- #850 is rebased onto `7fb030f2`; no further rebase is needed unless the trunk moves before merge.
- Never merge without a head-fresh Tester marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardcoded PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#850 lab (live this run):** the fresh fix pass applies F1 and folds in N1-N3; on a push or a `review` handoff, the fresh review; on approval, test then eval; on `approve-eval`, PAT merge sweep and close #848.
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

1. #850: the fresh lab pass is live on `c0d34d65`; read its outcome next wake. On a push or a `review` handoff, chain review; on approval, test/eval. On another wall death, stand down and re-arm on the following wake.
2. The prior Tester approval (`9c9bf1bd`) and the wall-dead eval do not bind the rebased head; both gates must rerun on `c0d34d65`.
3. The wrapper's 2026-11-22T01:14:55Z non-fast-forward push rejection is expected noise; the PAT step landed the head at 01:13:16Z. No post-mortem.
4. The eighteen review draws since 2026-11-22T01:34Z: seventeen died on the wall (the last at 09:34:16Z) and the eighteenth completed at 12:54:23Z. The review lane's wall streak is broken; the lab handoff at 12:54:48Z is the newest allowance-class death. The fresh-run lottery remains the designed recovery.
5. Public surface: the 08:55-09:07Z schedule ran green; the bounded self-heal re-dispatch (`45362167705`) hit the wall at 09:21:29Z and the cap halted the chain. The exhaustion marker is triaged as allowance-class; the next 6-hour cron re-arms. No same-pool retry.
6. Health pass: the 08:52-09:16Z delayed schedule ran green and posted the daily audit; the next is the 2026-11-25T00:00Z slot.
7. #836 stays open for the Owner capacity decision. The merged slice restores rung 3 and aligns the contract only; do not close the issue on the merge. The review lane's 36-minute completion and the lab handoff's immediate wall death strengthen the case for the capacity decision.
8. #745 is done: merged `eca3be8e`, Pages green, #853 closed. #742 stays open for the remaining owner-credential work; the review's residual notes (other lanes lack the privileged launcher/preamble; proxy/TLS keys unpinned) are tracked there.
9. #848 closes on #850; #803 stays open until all its slices land.
10. #831 is resolved by merged #832 but remains open because that PR used `Refs`; bookkeeping only, no dispatch.
11. Model registry drift: the ladder is 3/3 on main and all three rungs are live; the free count is 10 at 13:14Z, with no rung retired. The newer free names in the registry have no Auditor recommendation; no lab dispatch.
12. Maintainer schedule/recover throttling: the declared 20-minute cron fires only a few times a day; no run of any kind occurred between 12:56:00Z and this survey. The scheduler throttle (#831/#836) remains, and the heartbeat lives in a throttled cron too.
13. Pages: production is green on `7fb030f2`; the preview artifact redeploys on PR updates. No manual dispatch unless a merge sweep's deployment trigger fails.
14. Workspace: this run's trusted pre-agent checkout is main `7fb030f2`; the CLI bootstrap put the session tree on the PR head `c0d34d65` for the issue_comment wake. The memory bundle came from the trusted log-branch tip, `.maintainer/` is gitignored, and the tree is clean.
15. Memory: the 2026-11-24 file carries the 01:53-01:58Z session, the 02:15Z quota marker, the recovered 06:22-06:29Z session, the 06:38Z quota marker, the 09:16-09:22Z session, the 09:21-09:36Z triage, the 12:11-12:18Z session, the 12:55Z intake marker, and this 12:54-13:16Z triage. The log publish is append-only with keep-both semantics. The `maintainer/logs` tip is `c25849574`.
16. The 06:22Z session's memory commit was rejected three times by a transient `commit_refs_rules` server error; the recoverable bundle is restored in today's log. The 06:38Z intake committed successfully, the 09:16Z session committed `7b993018`, the 09:21Z session committed `4ace95c77`, the 12:11Z session committed `102671167`, and the 12:55Z intake committed `c25849574`. No further recovery needed.
17. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round, not a standalone issue.
18. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
19. The merged #863 tree keeps the R26 canonical manifest in lockstep with `maintainer.yml`; the #850 head regenerates it. The round-6 review verified it.
20. No agent-side merge or dispatch beyond the live lab draw this run. The last merge was #863 via the hardcoded PAT sweep at 2026-11-21T17:52:03Z.
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

- This run's session is an issue_comment summon on PR #850; the memory branch is `maintainer/logs`. The status comment on #850 is the public artifact.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong. This run posts on #850.
- The pipeline is green on main (`7fb030f2`; Pages success 2026-11-22T01:15:52Z, live root 200), and the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed seventeen review draws between 2026-11-22T01:34Z and 2026-11-24T09:34Z and the lab handoff at 2026-11-24T12:54:48Z, while fresh runners completed the review at 12:18-12:54Z and the 12:11 schedule session. The eighteenth review draw completed in about 36 minutes. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #850 lab outcome (the fresh fix pass on `c0d34d65`). On a push or a `review` handoff, read the fresh review; on approval, the test gate; then eval; on `approve-eval`, PAT merge sweep, verify Pages, close #848. On another wall death, stand down and re-arm on the following wake.
2. Then #854 lab (round-1 findings), #812, #814, #849, #857, #856, #860 in order (#860 only after #854 lands), then #742's remainder.
3. Read the next public-surface cron outcome; if it dies on the wall again, do not same-pool retry.
4. Keep #836 open for the Owner capacity decision; keep #742 open for the remaining owner-credential work; #831 is bookkeeping only; #848 closes on #850; #803 stays open until all its slices land; #815 is closed.
5. Read the next Auditor and Curator outcomes; the 2026-11-24 delayed passes are green.
6. Verify the board invariant, allowlist, registry/ladder, Pages, held runs, and schedule health; if clean, stand by.

## Open questions

1. Will the fresh lab draw find an open allowance bucket on its runner and finish the body-ledger fix plus the notes? The lab's previous runner died within 24 seconds.
2. Will the round-7 review approve the artifact fix, or return another round of findings (every prior round found something)?
3. Will the fresh test and eval chain complete on `c0d34d65`, or die on the provider wall?
4. The review lane's 36-minute completion at 12:18-12:54Z shows the wall is not universal; is the per-egress capacity decision in #836 still the only path to finishing the lane reliably?
5. The scheduler throttle is producing multi-hour gaps in every cron; does the Owner want to fold the scheduler and capacity work into the #836 decision?
6. Does the reopened capacity tracker still need the Owner's per-egress-IP capacity decision now that the ladder is whole again?
