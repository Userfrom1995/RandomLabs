# STATE

Last updated: 2026-11-25T10:18Z by run 45592338251

(10:10Z owner-summon wake: the fifth #854 pass completed at 10:09:57Z and landed four commits on head `36e72ff7`; the head-bound review is in progress and the rest of the queue holds for its verdict. Main unchanged at `e4844201`; no merge, no duplicate review/test/eval dispatch.)

## TL;DR for the next Hephaestus

- **This was the 10:09:58Z owner `/oc maintainer` run (`45592338251`) on #854**, posted five seconds after the lab forward's 10:09:53Z `/oc review`.
- **#854 advanced:** head `36e72ff7` (rebase `8a45f9a4` plus four `lab:` commits, 8 files +1009/-70), CLEAN/MERGEABLE, body `Closes #803` + `Refs #853` with the `PR #854` prose, the 38/0 verification block, a truthful delegation ledger, and the skills line. The fail-closed scope reads/resolvers, the #853 deferral guard, the R19/R20/R32/R37 fixtures and pins, and the AGENTS/LAB contract docs are all in the head.
- **The expected App-token push refusal at 10:09:42Z was followed by the PAT-backed push**; the branch tip is `36e72ff7` and the PR-head deploy `45592317353` succeeded on it. This is the LAB.md expected wrapper-push noise, not a failure to route.
- **Review `45592321821` is in progress since 10:09:59Z** on the new head. A duplicate review `45592338611` and a `workflow_run` maintainer cascade `45592363877` are pending; both should self-skip or see this state.
- **This run's decision is one health-board ping (#70), no triggers.** No test/eval/merge is possible before the review verdict; no second lab lane while the review owns the shared audit script.
- **Main `e4844201`; `maintainer/logs` tip at materialization `b3b6ee7d`** (08:22Z publish). Live site 200; zero held runs; the seven known stale queued runs remain.
- **Models:** registry 108 / 10 free at 10:13Z; pin and `small_model` are `deepseek-v4.1-flash-free`; the three ladder rungs are live. No upgrade dispatch.
- **Allowlist:** 19 names plus the self-excluded maintainer = 20 repo-managed; live 23 = those 20 plus three GitHub-managed; zero missing, zero extra.
- **One transient site-redeploy dispatch `45592342978` failed at 10:10:34Z on an empty artifact**; main is unchanged and the live root is 200, so no content is stale and no dispatch is needed.
- **Queue:** #854 review, then test/eval/merge if clean; then #812, #814, #849, #857, #856, #860 (only after #854 merges), #773, #774, then #742's remainder. #836 stays open.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the lab engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 10:10-10:18Z on 2026-11-25)

### GitHub state

- **Main:** `e48442018bdf7ff794d8f9f6154f5e4e28fb5610` (the 16:35:01Z rebase merge of the health-board selector work; unchanged since). **`maintainer/logs` live tip at materialization:** `b3b6ee7da` (08:22Z, the publish of the 08:05Z session).
- **Open PRs (2):**
  - #854 `36e72ff7d23f6579e2bcfe7f7a6feed4e532f501`, CLEAN/MERGEABLE (base `e4844201`), 5 commits from main (the rebase plus four `lab:` slices), 8 files +1009/-70. **The fifth pass landed the full round-1 scope** and the body carries `Closes #803`, `Refs #853`, the `PR #854` prose, the verification block (38/0), the delegation ledger, and the skills line. No tester/eval marker. **The head-bound review is in progress (run `45592321821`).**
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale (base `86570af1`); no workflow files; untouched since 2026-11-07.
- **Open issues (23 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #831, #836, #849, #856, #857, #860. No new issue. #853 and #848 are closed; #803 stays open until the merge; #831 is bookkeeping only.
- **#773/#774 verified still valid on main:** `LAB.md:611` still says "Read-only agents (Reviewer, Tester, Auditor, Ideator) carry no extra scope" and `LAB.md:1375` still names the phantom "ownership-gated restore-head" step; `setup.sh` still lists only the pre-#743 agent prompts and six core workflows. Both are parked as the post-delivery batch; re-queue after #860. No dispatch now.
- **Board invariant holds:** `health-board.sh` resolves `70`; only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`).
- **Latest comments:** no human comment after the 10:09:58Z `/oc maintainer`; the 10:09:53Z `/oc review` is the lab forward and the 10:09:42Z push-rejection note is the expected App-token refusal. The 10:09:58Z summon is the newest human action.
- **Branch tips:** main `e4844201`, `maintainer/logs` `b3b6ee7d`, #854 `36e72ff7`, #821 `dce109e4`, the landed selector branch `opencode/lab-848-shared-health-board-selector` at `c1040c0c` (intact), the #859 branch `opencode/issue858-curate-umbra-count-copy` at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3). **In progress:** this run plus review `45592321821`. **Pending:** duplicate review `45592338611` and maintainer cascade `45592363877`.
- **This run:** `45592338251`, `issue_comment` at 10:10:02Z; trusted pre-agent checkout main `e4844201`; session tree on main `e4844201`; tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **Lab Engineer `45575671981`:** success, 08:22:16-10:09:57Z. The agent worked 107m38s and completed the pass: scope edits at 08:33-08:39Z, audit fixtures/pins through 09:54Z, full audit 38/0 at 10:06:09Z, docs updated, four slices committed at 10:09:16-10:09:26Z. Decision `review`; the forward step posted `/oc review` at 10:09:53Z. The agent's own App-token push was rejected at 10:09:42Z; the PAT step pushed at 10:09:48Z (verified `36e72ff7`); the held-run approval found none. The audit counts 9 payload-first counters in `opencode.yml`, 1 in `opencode-review.yml`, 1 in `curator.yml`, `read_scope_date` in five lanes, and `resolver_ok`/`--limit 100` in both resolvers.
- **Review `45592321821`:** in progress since 10:09:59Z, single `review` job. It is the live gate on `36e72ff7`; do not duplicate it.
- **Duplicate review `45592338611`:** pending with no jobs, spawned by the 10:10:02Z `/oc maintainer` cohort; its trigger gate should skip it.
- **Maintainer cascade `45592363877`:** pending `workflow_run` run behind this run's single-slot concurrency; it will re-survey and should see this state.
- **Pages redeploy `45592342978`:** failure at 10:10:34Z, "Found 0 artifact(s)"; the live root is 200 and main is unchanged, so the same `e4844201` content is still served by the last successful deploy `45442610396`. Known transient artifact-API class; no dispatch.
- **No other failure in the window.** The 10:10:02Z comment cohort siblings skipped as designed.
- **Wall:** the last death is the 05:10:20Z lab draw. The 08:22-10:09Z pass completed on a fresh runner with no wall, so the allowance is usable now; a single draw is the window test, never a burst. The `retry-after` header is diagnostic only.
- **Model registry:** fresh read 10:13Z: 108 models / 10 free; `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free` and the other free names are live. No Auditor recommendation, no upgrade dispatch.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Live 23 names = those 20 plus the three GitHub-managed names. Zero missing, zero extra.
- **Audit:** the #854 head carries R1-R37 with the new R19 wall-death fixture, R20 whole-wrapper and HTTP-error pins, R32 wall-after-fresh-head matrix, and R37 deferral-guard matrix; the pass reported 38/0. The merged main still carries R1-R37 until #854 merges.
- **Pages:** production root returns 200 on `e4844201`; the last production deploy is `45442610396` (2026-11-24T16:54Z, same main SHA); the #854 PR-head deploy `45592317353` succeeded on `36e72ff7`; the 10:10Z production redeploy dispatch failed on an empty artifact with no live content change.
- **Schedule health:** the 20-minute maintainer cron last fired at 05:01Z; this 10:10Z run is comment-triggered. The scheduler throttle (#831/#836) remains; no manual dispatch while the quota is the scarce resource.

### Live lanes and their next step

- **#854 / #803 (protected-path slice 3):** the fifth pass is complete and the review is in progress on `36e72ff7`. On approval, the chain forwards the tester/eval gates; on findings, the lane returns to a scoped lab pass on the same head. The body carries `Closes #803` + `Refs #853`; #803 closes only on a merge that confirms all three slices. The branch is not merge-eligible until a head-fresh tester marker and a head-bound `approve-eval`.
- **#812 / #814 (audit-harness backlog):** #812 is R11 same-name shadowing with no `lab:` job scoping; #814 is the fail-open baseline read in the fix lane. Both still reproduce on main; #815 is fixed and closed. Next: after #854's verdict, with the R32 verify-body pin updated in lockstep.
- **#849 (fail-loud hardening):** its 2026-11-20T03:34:03Z trigger died on the wall (run `44668604966`); it stays queued after #812/#814 and will need a fresh trigger when it reaches the head of the queue.
- **#773/#774:** #773 is the LAB.md read-only-scope contradiction plus the phantom "ownership-gated restore-head" step reference; #774 is the stale `setup.sh --check` roster. Both verified valid on `e4844201` and parked since October as the post-delivery batch. Queue after #860; no dispatch until the backlog clears.
- **#857 / #856 / #860 (fail-loud backlog):** accepted and serialized after #849; #860 shares `opencode-review.yml` with the #854 lane, so it cannot start before #854 merges.
- **#742 remainder (tracker):** open. The merged slice covers the 15 six-workflow steps; the other lanes still need the privileged launcher and preamble, and the follow-ups remain. Candidate for a lab round after the serialized backlog; do not open a duplicate issue.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; the rung/contract slice is merged, but the per-egress-IP wall remains the only fix that ends the recurrence.
- **Public surface (curator lane):** the 07:31Z draw completed; the 10:09Z push deployed the #854 preview successfully. Watch the no-decision-then-retry pattern.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw at a time; no same-pool burst. This run spends zero agent draws: the #854 review is already in progress and the queue holds for its verdict.
- **Checkpoint rule (binding on the next Maintainer):** if #854's head advances with partial commits and a lab run dies without signalling review, do NOT dispatch a review on that partial head. Read the lab decision/comment and the commit messages; only a `review` signal (or an explicitly complete pass) authorizes the review/test/eval chain.
- Do not dispatch #812/#814/#849/#857/#856/#860/#773/#774/#742 until the #854 review verdict is known; the serialized order keeps the shared audit script single-owner.
- Never merge without a head-fresh tester marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardened PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#854 review (in progress):** on approval, the tester/eval chain; on findings, a scoped lab pass on `36e72ff7`. Keep #803 open until the merge confirms all three slices.
2. `{"action":"lab","issue":812}`: after #854's verdict; scope R11 to the `lab:` job and update the R32 verify-body pin in lockstep.
3. `{"action":"lab","issue":814}`: after #812; fail-closed baseline read in the fix lane and update the R32 pin in lockstep.
4. `{"action":"lab","issue":849}`: after #814; on a push, the review/test chain; re-arm its wall-killed trigger.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 merges.
8. `{"action":"lab","issue":773}`: after #860; correct the LAB.md read-only scope claim and the phantom step reference; R1-R37 audit and pins in lockstep.
9. `{"action":"lab","issue":774}`: after #773; extend `setup.sh --check` to the full current roster and workflow set.
10. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #854: the fifth pass landed all four slices on `36e72ff7`; the review is in progress. The head is no longer rebase-only; the round-1 findings are implemented, not merely claimed.
2. The pass completed before the wall returned; the four slices were committed at the end of the run (10:09:16-10:09:26Z), so the checkpoint mechanism was not exercised by a wall death this time. If a future pass dies mid-work, the per-slice commits are the recovery contract.
3. The App-token push refusal at 10:09:42Z is the expected wrapper noise; the PAT push at 10:09:48Z landed the commits. Do not route a post-mortem for it alone.
4. The 10:10Z site-redeploy dispatch failed on an empty artifact; the live site is 200 and main is unchanged, so the last successful deploy of the same SHA is still serving. If a later successful deploy does not appear and the site goes stale, investigate then.
5. The PR body is now `Closes #803` + `Refs #853` with the `PR #854` prose; the merge will close #803 only if the verdict confirms all three slices.
6. #853 and #848 are closed; #803 stays open; #815 is closed; #831 is bookkeeping only.
7. Pages: production green on `e4844201`; the #854 PR-head deploy succeeded on `36e72ff7`; the failed redeploy dispatch changed no content.
8. The auditor daily slot fired late at 07:27Z; the 20-minute maintainer cron last fired at 05:01Z. The scheduler throttle (#831/#836) remains; no manual dispatch while the quota is the scarce resource.
9. #836 stays open for the Owner capacity decision. The merged slice restores rung 3 and aligns the contract only; do not close the issue.
10. #745 is done: merged `eca3be8e`, Pages green, #853 closed. #742 stays open for the remaining owner-credential work.
11. Model registry drift: the ladder is 3/3 on main and all three rungs are live; the free count is 10 at 10:13Z, with no rung retired. No lab dispatch.
12. Maintainer schedule/recover throttling: the declared 20-minute cron fires only a few times a day; the 10:10Z run is comment-triggered. The scheduler throttle (#831/#836) remains.
13. The 22:01Z curator agent completed green without a decision file on 2026-11-24; the bounded auto-retry dispatched the 22:11Z run, which decided `[]`. The 07:31Z curator draw is the next sample. A repeat across runs is a lab-round candidate; no issue opened (follow-ups belong to the Owner).
14. Workspace: this run's trusted pre-agent checkout is main `e4844201`; the session tree is on main; the memory bundle came from the trusted log-branch tip `b3b6ee7d`, `.maintainer/` is gitignored, and the tree is clean.
15. Memory: the 2026-11-25 file carries the 02:36Z session, the three run markers, the 05:01Z session, the 08:05Z session, and this 10:10Z session. The log publish is append-only with keep-both semantics. The `maintainer/logs` tip at materialization is `b3b6ee7d`.
16. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round, not a standalone issue.
17. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
18. The merged tree carries the R26 canonical manifest in lockstep with `maintainer.yml`; the next lab pass must regenerate it if it edits that file.
19. No agent-side merge or dispatch this run beyond the #854 review that was already in progress and the board ping. The last verified merge is the selector PR at 16:35:02Z on 2026-11-24.
20. The general job's ` /oc` substring matcher fired on trigger prose in the eval report on 2026-11-24 and produced two no-action notes plus one extra owner summon; the resulting wake was cancelled. Watch item for a future lab round; no new issue.
21. No `emergency.json`: the maintainer workflow is alive, production is serving, and no failed lab attempt is being bypassed.
22. #773/#774 are re-queued after a month-long park. They were valid on `e4844201` when checked at 08:10Z; re-verify before dispatching in case the backlog pass folds them into #742.
23. **Lab wall-death recovery gap (watch, maybe #820/#836 follow-up):** the 05:10Z intake did not chain the bounded fresh-run recovery because the failure was a lab run, not an agent run carrying `.maintainer/quota-wall`. The lane waited ~3 hours for the auditor handoff wake. Not worth a duplicate issue now; fold into the capacity work or the next lab round after the backlog.
24. The duplicate review `45592338611` and the `workflow_run` maintainer cascade `45592363877` are pending; if either actually runs, it must read this state and avoid re-dispatching the live review.
25. The owner's 10:09:58Z summon arrived after the lab forward; the lab pass itself requested `review`, so the review is the owner-intended next gate, not a duplicate of a maintainer decision.

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

- This run's session is an issue-comment wake with target #854; the memory branch is `maintainer/logs`. The public artifacts are the #854 comment and the health-board ping.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure. This run comments on #854 and pings the board.
- The pipeline is green on main (`e4844201`; the post-merge Pages deployment succeeded and the live root is 200), and the platform is perf-sensitive: multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed seventeen review draws between 2026-11-22T01:34Z and 2026-11-24T09:34Z, the lab handoff at 12:54:48Z, the lab draws at 16:54:13Z, 23:15:37Z, 03:05:44Z and 05:10:20Z, while fresh runners completed the 13:20 lab, 13:55 review, 14:31 test, 15:39 eval, 16:22 eval, the 16:35 merge, the 22:01-22:28Z curator draws, the 02:37Z and 05:01Z Maintainer sessions, the 07:27-08:05Z auditor draw, and the 08:22-10:09Z fifth #854 lab pass. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the review verdict on `36e72ff7`. On approval, the tester/eval chain follows; on findings, the lane returns to a scoped lab pass on the same head. Keep #803 open unless the merge confirms all three slices.
2. If the review dies on the wall, no same-pool retry; the fresh-run lottery is the recovery, and the head stays `36e72ff7`.
3. Verify main is still `e4844201` (or advanced only through a verified merge), production is live, and the selector branch is intact at `c1040c0c`.
4. Then #812, #814, #849, #857, #856, #860, #773, #774 in order (#860 only after #854 merges), then #742's remainder.
5. Watch the pending duplicate review `45592338611` and the cascade `45592363877`; keep #836 open for the Owner capacity decision; #831 is bookkeeping only; #848, #853 and #815 are closed.
6. Verify the board invariant, allowlist, registry/ladder, live site, held runs, and schedule health; if clean, stand by.

## Open questions

1. Will the review approve `36e72ff7`, or return a scoped finding list to the lab lane?
2. Does the review confirm all three slices so `Closes #803` can close on merge?
3. Will the duplicate review `45592338611` and the `workflow_run` maintainer cascade `45592363877` self-skip cleanly?
4. Does the transient site-redeploy failure class recur now that the PR-head deploy succeeded on the same push?
5. The scheduler throttle is producing multi-hour gaps in every cron; does the Owner want to fold the scheduler and capacity work into the #836 decision?
6. Does the capacity tracker still need the Owner's per-egress-IP capacity decision now that the ladder is whole again?
7. The general job's ` /oc` substring matcher and the prompt-contract drift remain watch items for a future lab round.
8. Should #773/#774 stay as separate lab targets, or be folded into the #742 remainder when the backlog clears?
