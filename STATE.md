# STATE

Last updated: 2026-11-24T17:00Z by run 45442583325

(16:54Z comment summon on #854: the 16:41Z pass rebased the branch onto the post-merge trunk and pushed `8a45f9a4`, then died on the provider daily free-usage allowance before committing any round-1 finding. The diff is byte-identical to the round-1 head, so the verdict stands. No dispatch this run: one health-board ping, and the lane re-arms after the wall window.)

## TL;DR for the next Hephaestus

- **This was the 16:54Z `issue_comment` run** on #854, summoned after the lab pass forwarded its own maintainer handoff and the Owner posted a second summon. Target: #854. One health-board ping is the only decision.
- **The rebase landed, the findings did not.** The 16:41:39-16:54:43Z lab run `45440087750` committed the rebase at 16:42:20Z, kept working on the fail-closed/guard edits uncommitted, then hit `FreeUsageLimitError` (HTTP 429, retry-after 26393s) at 16:54:13Z. The owner-PAT push at 16:54:35Z force-updated `090452f27` -> `8a45f9a4`; the uncommitted edits were lost with the runner. The early safe decision file is why the push ran at all.
- **The push is rebase-only, proven:** the pruned diffs `620bb8d2..090452f27` and `e4844201..8a45f9a4` share patch-id `ee23b86e`; the PR is 6 files, +355/-60, byte-identical. The round-1 verdict (changes required, lab) stands in full.
- **No review/test/eval was dispatched:** there is no new content to gate, and a review of the same patch would repeat the round-1 verdict. The branch is CLEAN/MERGEABLE but not mergeable through the gates (no fresh review, no tester marker, no eval verdict).
- **No lab re-dispatch this run:** same-pool wall rule (#754/#820, #836). The retry-after points to ~00:14Z on 11-25; it is diagnostic, not a schedule. The next maintainer wake after the window re-arms the full 16:41:34Z instruction. This matches the previous session's own plan for this lane.
- **#854 state:** head `8a45f9a4fe14d48ad856a93c61465a8482507391` (one commit, 2026-11-24T16:42:20Z), base `e4844201`, CLEAN/MERGEABLE, 6 files +355/-60; body still `Closes #803`, no `Refs #853`; no tester/eval markers. All round-1 findings remain outstanding.
- **main `e4844201`; `maintainer/logs` tip at materialization `d7679df4`** (16:41:30Z).
- **Models:** registry 108 / 10 free at 16:58Z; pin and `small_model` are `deepseek-v4.1-flash-free`; the three ladder rungs are live. No upgrade dispatch.
- **Held 0; one 0-job pending duplicate cancelled; in progress this run only.** The seven known stale queued runs remain.
- **Queue:** #854 lab (after the wall window), then #812, #814, #849, #857, #856, #860 (only after #854), then #742's remainder. #836 stays open; #821 and the Maze Chase set stay parked.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the lab engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 16:55-17:00Z on 2026-11-24)

### GitHub state

- **Main:** `e48442018bdf7ff794d8f9f6154f5e4e28fb5610` (the rebase merge of the health-board selector work, 16:35:01Z). **`maintainer/logs` live tip at materialization:** `d7679df4` (16:41:30Z, the 16:41Z memory commit from the 16:35 session).
- **Open PRs (2):**
  - #854 `8a45f9a4fe14d48ad856a93c61465a8482507391`, `Closes #803`, CLEAN/MERGEABLE (base `e4844201`, one commit dated 2026-11-24T16:42:20Z, 6 files +355/-60). **The head is a clean rebase of the round-1 head and nothing else.** The round-1 lab findings are outstanding; no fresh review, no tester/eval marker. The body still needs `Refs #853` and the `Closes #803` -> `Refs #803` switch unless all three slices land.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale (base `86570af1`); no workflow files, so no merge sweep.
- **Open issues (23 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #831, #836, #849, #856, #857, #860. No new issue. #848 closed with the 16:35 merge; #853 is closed (its finding is the deferral-guard slice the #854 body must reference); #803 stays open until all its slices land; #831 is bookkeeping only.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest note before this run: the 16:41:32Z board note; this run adds the 17:00Z ping.
- **Latest comments:** #854 ends at the 16:54:51Z Owner `/oc maintainer` (with the lab forward at 16:54:37Z just before it); the last substantive owner instruction is the 16:41:34Z rebase-plus-findings pass. No other new human directive. #849 last 2026-11-20T03:34:03Z; #836 last 2026-11-21T18:11:34Z.
- **Branch tips:** main `e4844201`, `maintainer/logs` `d7679df4`, #854 `8a45f9a4`, #821 `dce109e4`, the landed selector branch `c1040c0c` (intact), #859 branch `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3). **Cancelled this run:** the 0-job pending maintainer duplicate `45442639583` and the duplicate comment wake `45442626881`; one pass owns the lane. **In progress:** this run only.
- **This run:** `45442583325`, `issue_comment` at 16:54:41Z (comment 16:54:37Z from the lab forward plus the Owner's 16:54:51Z summon); trusted pre-agent checkout main `e4844201`; the CLI bootstrap put the session tree on the PR head `8a45f9a4`; tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **Lab `45440087750`:** `issue_comment` 16:41:39-16:54:43Z; the agent step ran 16:41:53-16:54:32Z and failed on the wall. The rebase commit `8a45f9a4` was created at 16:42:20Z; the agent's checkpoint at 16:48:59Z still held all fail-closed and guard edits uncommitted; the provider returned `FreeUsageLimitError` at 16:54:13Z and the step ended at 16:54:32Z. The owner-PAT push at 16:54:35Z force-updated `090452f27` -> `8a45f9a4`; the early `{"action":"maintainer"}` decision file is why the post-agent PAT steps ran. The uncommitted edits were never committed and are gone with the runner.
- **Patch identity proof:** `git merge-base e4844201 090452f27` = `620bb8d2`; both pruned diffs hash to patch-id `ee23b86e`; the PR remains 6 files +355/-60. The new head adds no round-1 finding.
- **Fan-out at 16:54:43Z:** the PR `synchronize` triggered `opencode-pr-trigger` (success) and the PR-head Pages deploy `45442588672` (success, head `8a45f9a4`). The owner-credential production Pages dispatch `45442610396` also succeeded on `e4844201` at 16:54:51-16:55:26Z.
- **Duplicates:** `45442626881` (the second comment wake) was cancelled at 16:54:56Z; `45442639583` (a workflow_run fan-out wake) was pending with 0 jobs and was cancelled by this run at 16:57Z.
- **Merge sweep:** none this run. The last merge is the 16:35:02Z rebase of the selector PR; its linked audit issue closed and Pages is green on the new tip.
- **Schedules:** no new scheduled run since the 12:11:13Z maintainer tick. Today: auditor `45359855998` green 08:52-09:16Z, curator `45360350939` green 08:55-09:07Z, recover `45339887322` green 06:21Z. The scheduler throttle (#831/#836) remains.
- **Wall:** the last death is the 16:54:13Z lab draw. The prior death was the 12:54:48Z lab handoff; fresh runners then completed the 13:20 lab, 13:55 review, 14:31 test, 15:39 eval, the 16:22 eval and the merge, so the allowance had opened. It is exhausted again for the pool at this write.
- **Model registry:** fresh read 16:58Z: 108 models / 10 free; `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, and the other free names are live. No Auditor recommendation, no upgrade dispatch.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Zero missing, zero extra (the three GitHub-managed workflows are outside the allowlist by design).
- **Audit:** the merged main carries R1-R37 (`R36` owner-PAT isolation, `R37` universal board). The current #854 patch adds no new audit rule; if the next pass implements the deferral guard it owns the R38 addition and the R1-R37 -> R1-R38 renumbering plus every hash/manifest pin in the same head.
- **Pages:** production root returns 200 on `e4844201`; the #854 preview deploy succeeded on the rebased head. The closed selector PR's preview is gone, as expected.

### Live lanes and their next step

- **#854 / #803 (protected-path slice 3):** the rebase is done; the round-1 findings are not. The next wake after the wall window re-arms the full 16:41:34Z instruction: the deferral guard and `Refs #853`, fail-closed head/enumeration reads for all ten counters with no `|| true` after the pipeline, HTTP-error/malformed/future-date rejection, resolver fail-closed with `--limit 100`, the wall-death-after-a-fresh-head fixture, the R20 scope-wrapper pins with the pre-handler manifest/tester hash pins regenerated, the AGENTS/LAB corrections, and the truthful delegation ledger/skills line. Keep #803 open unless all three slices land.
- **#812 / #814 (audit-harness backlog):** #812 is R11 same-name shadowing with no `lab:` job scoping; #814 is the fail-open baseline read in the fix lane. Both still reproduce on main; #815 is fixed and closed. Next: after #854, with the R32 verify-body pin updated in lockstep.
- **#849 (fail-loud hardening):** lab trigger 2026-11-20T03:34:03Z; the trigger carries the expanded scope. Next: after #812/#814, then #857, #856, #860 in that order (#860 only after #854).
- **#742 remainder (tracker):** open. The merged slice covers the 15 six-workflow steps; the other lanes still need the privileged launcher and preamble, and the follow-ups remain. Candidate for a lab round after the serialized backlog; do not open a duplicate issue.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; the rung/contract slice is merged, but the per-egress-IP wall remains the only fix that ends the recurrence.
- **Public surface (curator lane):** last full pass green at 08:55:25-09:07:25Z with no repo changes; the self-heal re-dispatch died on the wall at 09:21:29Z and the bounded cap halted the chain. The next 6-hour cron re-arms; no same-pool retry.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw at a time; no same-pool burst. This run dispatches nothing but the board ping. The next agent draw is the re-armed #854 lab on a later wake after the window.
- Do not dispatch #812/#814/#849/#857/#856/#860 until #854's pass lands; the serialized order keeps the shared audit script single-owner.
- The #854 rebase is textually clean against the trunk; the next pass must still reconcile the merged R36/R37 rules semantically and regenerate the pins.
- Never merge without a head-fresh tester marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardened PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#854 lab (after the wall window):** rebase is done at `8a45f9a4`; re-run the full round-1 findings pass against the current trunk. On a push, the fresh review/test/eval chain; keep #803 open unless all its slices land.
2. `{"action":"lab","issue":812}`: after #854; scope R11 to the `lab:` job and update the R32 verify-body pin in lockstep.
3. `{"action":"lab","issue":814}`: after #812; fail-closed baseline read in the fix lane and update the R32 pin in lockstep.
4. `{"action":"lab","issue":849}`: after #814; on a push, the review/test chain.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
8. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #854: the pushed head is rebase-only; the round-1 work must be redone from scratch. Do not treat the rebase as progress on the findings.
2. The rebase commit `8a45f9a4` is valid and on the trunk base; the branch is clean. Do not force another rebase unless the trunk moves.
3. Wall: the 16:54:13Z death reported retry-after 26393s (~00:14Z 11-25). It is diagnostic. No same-pool retry; the next wake after the window re-arms.
4. The PR body is still `Closes #803` with no `Refs #853`; the next lab pass must apply the conditional linkage and keep `PR #854` in prose.
5. The lab's uncommitted edits (fail-closed reads, deferral guard, fixtures, docs) were lost with the runner; no partial edits are on the branch.
6. Pages: the selector merge re-deployed green on `e4844201`; the PR-head deploy succeeded on `8a45f9a4`; no loop.
7. Health pass: the 08:52-09:16Z delayed schedule ran green and posted the daily audit; the next is the 2026-11-25T00:00Z slot.
8. #836 stays open for the Owner capacity decision. The merged slice restores rung 3 and aligns the contract only; do not close the issue.
9. #745 is done: merged `eca3be8e`, Pages green, #853 closed. #742 stays open for the remaining owner-credential work.
10. #848 is closed. #803 stays open until all its slices land. #853 is closed and is referenced by the #854 body on the next pass.
11. #831 is resolved by merged #832 but remains open because that PR used `Refs`; bookkeeping only, no dispatch.
12. Model registry drift: the ladder is 3/3 on main and all three rungs are live; the free count is 10 at 16:58Z, with no rung retired. No lab dispatch.
13. Maintainer schedule/recover throttling: the declared 20-minute cron fires only a few times a day; the 16:22, 16:35 and 16:54 wakes were routed summons, not schedule ticks. The scheduler throttle (#831/#836) remains.
14. The 16:54Z fan-out produced a 0-job pending maintainer duplicate `45442639583`; this run cancelled it. The comment-wake duplicate `45442626881` was already cancelled.
15. Workspace: this run's trusted pre-agent checkout is main `e4844201`; the CLI bootstrap put the session tree on the PR head `8a45f9a4`. The memory bundle came from the trusted log-branch tip `d7679df4`, `.maintainer/` is gitignored, and the tree is clean.
16. Memory: the 2026-11-24 file carries the earlier sessions through the 16:35Z merge-closed entry and this 16:54-17:00Z session. The log publish is append-only with keep-both semantics. The `maintainer/logs` tip at materialization is `d7679df4`.
17. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round, not a standalone issue.
18. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
19. The merged tree carries the R26 canonical manifest in lockstep with `maintainer.yml`; the next lab pass must regenerate it if it edits that file.
20. No agent-side merge or dispatch this run beyond the board ping. The last verified merge is the selector PR at 16:35:02Z.
21. The general job's ` /oc` substring matcher fired on trigger prose in the eval report earlier today and produced two no-action notes plus one extra owner summon; the resulting wake was cancelled. Watch item for a future lab round; no new issue.
22. No `emergency.json`: the maintainer workflow is alive, production is serving, and no failed lab attempt is being bypassed.

## Standing rules I operate under

### Safety and autonomy

- Never post issue or PR comments directly; the only public artifacts are the files under `.maintainer/`. Never create an issue or PR, never run git commit/push/branch commands, never touch the brain, never `@copilot`, and never spawn a Copilot review. Never mention an agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception).
- Protected paths: `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, `LAB.md` (also `.github/scripts/` as touching credential wiring). Changing them requires the full review/test/eval chain and a PAT-backed push. The agent-write App token cannot push workflow files, so expect a public push-rejection on the branch; the lab's hardcoded PAT step performs the actual push.
- Unattended runs: an unattended ownerless PR is not consent. Never merge without a head-fresh tester marker and a head-bound `approve-eval`, and never bypass branch protection.
- Emergency revival (`emergency.json`) only when the maintainer workflow itself is dead, no maintainer run is pending, and the recover heartbeat has not restored it. Not applicable in this run.

### Trigger and token discipline

- Use only the agent trigger comment formats; correct token, correct target, own line. Never a freeform issue ask.
- The #775 rule: no inline trigger tokens in board notes, pings, or issue bodies. Trigger comments are the only place a token may appear.
- A ping triggers no workflow run; it is for the record and the humans. One ping per target per run.
- Do not claim a wall or lane is clear until multiple runs actually complete; correct false claims in the same thread first.
- Overlapping Maintainer sessions: before re-arming any lane, read the target threads for triggers newer than the loaded memory and treat them as live. A later session must not duplicate an earlier session's dispatches.

### Review, test, and merge gates

- Ship only on green build + CI, complete test suite with no new failures, behavior evidence, responsive accessibility, unified 8px spacing + iconography, and security.
- A failed build or CI is never acceptable just because it was already failing.
- Verify the CI workflow covers the pushed commit and required checks are green. Never merge with an in-flight required check or while the mergeable flag is `UNKNOWN`.
- Required checks only: deploy, test (ubuntu-latest, windows-latest, macos-latest), e2e.
- Merge preference is squash unless the PR's base branch explicitly requires another strategy; the repo's rebase-merge setting is the exception for this lane. The PAT sweep uses rebase then merge fallback with `--match-head-commit`.
- Delete branches only on merge, and only with explicit `--delete-branch`; the standing rule is never `--delete-branch` for the bot PRs.
- Ambiguous-rest notation: the eval/review agent comments carry a machine-readable decision block; read it before acting.
- Eval may only pass ("approve-eval") when multi-agent besides the Evaluator improved the result and the result is genuinely better; otherwise "reject-eval".
- Follow-up issues belong to the Owner, not the Maintainer.
- Do not dispatch a new project when all 3 project slots are full; record a wishlist item instead.

### Audit lane rules (current, from #798 and its reviews)

- Drive the pipeline but cap the audit loops: each lane gets at most two rounds per target, and max eight workflow triggers per PR or issue per Maintainer run. Fan out only when a leg is wall- or timeout-bound, the PR is freshly pushed, a gate flipped, a review branch awaits merge, CI healed, the PR is reopened, or a human asks. A wall always wins; no same-IP retry.
- The audit checks run in order: every run first confirms main is deployed and the site is reachable; then current-main issues and every open PR's rollup (missing/unknown checks block a merge); touching any protected path makes the branch lab-owned and requires the tester/evaluator chain; a PR with zero agent comments or all-green state is suspect; every check read must come from the PR's actual head, not the base; mergeable `UNKNOWN` waits for GitHub to resolve it; re-read the head immediately before merging; verify the merge conclusion; never cancel an in-flight required check; never `--admin` merge.
- The audit artifact contract: the payload files are `.maintainer/decision.json`, `comment.md`, `log-entry.md`, `state.md`, `personality.md`; `emergency.json` is revival-only. Write them, then stop.
- Liveness: `Last updated: <ISO8601 with minutes> by run <github.run_id>` exactly. Use `date -u`; a stale stamp must not continue.
- The log is append-only and never partial: carry the FULL day file and append; preserve what you found. The publish step hard-gates the six files, scans for leaked PATs/agent names, and recomposes on a fresh tip with keep-both semantics.
- The brain mounts read-only; edit workflows, not the brain. The anti-race retry re-materializes the brain and reapplies the delta on a fresh tip.
- The owner PAT lives in `.env` and is loaded by the hardcoded `pat-commit` step; never print or reference the value, and keep the `.env` gitignored. Unset PATs in agent shells fail closed (#742/agent-hsp).
- No comments: no maintainer text reaches GitHub except the output artifacts. The publish step posts only `comment.md` on the target PR, plus explicit `ping` targets.
- The pipeline hygiene rules: prompt/state numbers stay allowed; no em dashes in repo files; no trigger tokens in pings.

### Contract and memory

- This run's session is the comment summon on #854; the memory branch is `maintainer/logs`. The public artifact is the status comment on #854, plus one health-board ping.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure. This run posts the #854 status and pings the board.
- The pipeline is green on main (`e4844201`; the post-merge Pages deployment succeeded and the live root is 200), and the platform is perf-sensitive: multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed seventeen review draws between 2026-11-22T01:34Z and 2026-11-24T09:34Z, the lab handoff at 12:54:48Z, and this lab draw at 16:54:13Z, while fresh runners completed the 13:20 lab, 13:55 review, 14:31 test, 15:39 eval, 16:22 eval and the 16:35 merge. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Check the wall first: if the window has cleared and no #854 lab run is live or queued, re-arm `{"action":"lab","pr":854}` with the full 16:41:34Z instruction (the rebase is already in place; all findings remain). If the wall persists, stand by and re-arm on a later wake.
2. Verify main is still `e4844201` (or advanced only through a verified merge), production Pages green, and the selector branch intact at `c1040c0c`.
3. On the #854 push, a fresh review is forwarded; keep #803 open unless all three slices land, and confirm the body switch (`Refs #803`, `Refs #853`).
4. Then #812, #814, #849, #857, #856, #860 in order (#860 only after #854 lands), then #742's remainder.
5. Keep #836 open for the Owner capacity decision; #831 is bookkeeping only; #815 is closed; #848 is closed; #853 is closed.
6. Verify the board invariant, allowlist, registry/ladder, Pages, held runs, and schedule health; if clean, stand by.

## Open questions

1. When will the pool allowance clear, and will a single fresh draw carry the full #854 pass to a push?
2. Does the next pass keep `Closes #803` (only if all three slices land) or switch to `Refs #803`, and does it add `Refs #853`?
3. Does the rebase-only head need a fresh review before the findings land, or is the round-1 verdict sufficient until the next push? (Current call: the next push triggers the fresh chain; no review of the unchanged patch.)
4. The scheduler throttle is producing multi-hour gaps in every cron; does the Owner want to fold the scheduler and capacity work into the #836 decision?
5. The general job matches trigger prose in agent reports; is narrowing that matcher worth a future lab round, or is the occasional chaining wake acceptable?
