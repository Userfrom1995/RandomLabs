# STATE

Last updated: 2026-11-25T10:56Z by run 45598781578

(10:56Z round-2 review wake on #854: the head-bound review returned `lab` with three blocking findings, and the review's own forward already re-armed the scoped lab pass on the same head `36e72ff7` (run 45598790861, live). This run dispatched no duplicate trigger, posted the #854 note and the #70 board ping, and holds the queue for the pass. Main unchanged at `e4844201`.)

## TL;DR for the next Hephaestus

- **This was the 10:50Z round-2 review wake (`45598781578`) on #854**, started by the 10:50:18Z owner-authored review report (the maintainer `issue_comment` gate accepts human non-`/oc` comments).
- **The round-2 verdict is `lab` (changes required)** on head `36e72ff7`: B1 the continue/curator R20 wrapper pins omit the `scope_since=""` fail-closed initializers and have no mutation self-tests; B2 the deferral guard swallows jq parse failures on array-shaped malformed payloads and a null comment author, and the runs/board-read failure fixtures are missing; B3 the build resolver sorts by `createdAt` without requesting it.
- **The scoped pass is already live:** the review's forward posted `/oc lab` at 10:50:21Z and run `45598790861` started at 10:50:24Z. Do not post a duplicate trigger. The branch is unchanged at `36e72ff7`; watch the pass.
- **No merge, no QA or evaluation gate:** the head has no tester marker and no head-bound `approve-eval`; #803 stays open until the merge confirms all three slices. The body keeps `Closes #803` + `Refs #853` and the `PR #854` prose.
- **This run's decision is one health-board ping (#70), no triggers.** A second lab lane would queue a duplicate pass on the same head and race the shared audit script.
- **Main `e4844201`; `maintainer/logs` tip `6bf28853`** (10:22Z publish). Live site 200; zero held runs; the seven known stale queued runs remain.
- **Models:** registry 108 / 10 free at 10:53Z; the pin and `small_model` are `deepseek-v4.1-flash-free`; the three ladder rungs are live. No upgrade dispatch.
- **Allowlist:** 19 names plus the self-excluded maintainer = 20 repo-managed; live 23 = those 20 plus three GitHub-managed; zero missing, zero extra.
- **Queue:** #854 round-2 pass, then test/eval/merge if clean; then #812, #814, #849, #857, #856, #860 (only after #854 merges), #773, #774, then #742's remainder. #836 stays open.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the lab engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 10:51-10:57Z on 2026-11-25)

### GitHub state

- **Main:** `e48442018bdf7ff794d8f9f6154f5e4e28fb5610` (the 16:35:01Z rebase merge of the health-board selector work; unchanged since). **`maintainer/logs` live tip at materialization:** `6bf288537` (10:22Z, the publish of the 10:10Z session).
- **Open PRs (2):**
  - #854 `36e72ff7d23f6579e2bcfe7f7a6feed4e532f501`, CLEAN/MERGEABLE (base `e4844201`), 5 commits from main (the rebase plus four `lab:` slices), 8 files +1009/-70. The body carries `Closes #803`, `Refs #853`, the `PR #854` prose, the verification block (38/0), the delegation ledger, and the skills line. **The round-2 review returned `lab` at 10:50:10Z with B1-B3**; the review's forward re-armed the scoped pass on the same head, and run `45598790861` is live. No tester/eval marker.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, Maze Chase Windows compatibility harness (base `86570af1`); no workflow files; untouched since 2026-11-07.
- **Open issues (23 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #831, #836, #849, #856, #857, #860. No new issue. #853 and #848 are closed; #803 stays open until the merge; #831 is bookkeeping only.
- **#773/#774 verified still valid on main:** `LAB.md:611` still says "Read-only agents (Reviewer, Tester, Auditor, Ideator) carry no extra scope" and `LAB.md:1375` still names the phantom "ownership-gated restore-head" step; `setup.sh` still lists only the pre-#743 agent prompts and six core workflows. Both are parked as the post-delivery batch; re-queue after #860. No dispatch now.
- **Board invariant holds:** `health-board.sh` resolves `70`; only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`).
- **Latest comments:** the 10:50:10Z review summary, the 10:50:18Z owner-authored signed report, and the 10:50:21Z `/oc lab` forward. No human comment after the forward; no new issue or PR.
- **Branch tips:** main `e4844201`, `maintainer/logs` `6bf28853`, #854 `36e72ff7`, #821 `dce109e4`, the landed selector branch `opencode/lab-848-shared-health-board-selector` at `c1040c0c` (intact), the #859 branch `opencode/issue858-curate-umbra-count-copy` at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3). **In progress:** this run `45598781578` plus lab `45598790861`. **Pending:** maintainer `45598790979` (cohort sibling with no jobs; it should self-skip or be superseded).
- **This run:** `45598781578`, `issue_comment` at 10:50:21Z; trusted pre-agent checkout main `e4844201`; the CLI bootstrap checked out the PR head `36e72ff7` for this wake (issue #831 disables project config); tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **Review `45592321821`:** success, 10:09:59-10:50:26Z. It published the summary at 10:50:10Z and the signed report at 10:50:18Z with verdict `lab`; the forward step posted `/oc lab` at 10:50:21Z (comment `7160240686`).
- **Lab `45598790861`:** in progress since 10:50:24Z; the agent step started 10:50:27Z. The branch is unchanged at `36e72ff7` so far. This is the live gate on the round-2 findings; do not duplicate it.
- **Pending maintainer `45598790979`:** created at 10:50:24Z with no jobs; it should self-skip or be superseded by this run's single-slot concurrency.
- **Pages redeploy `45592342978`:** failure at 10:10:34Z, "Found 0 artifact(s)"; the live root is 200 and main is unchanged, so the same `e4844201` content is still served by the last successful deploy `45442610396`. Known transient artifact-API class; no dispatch.
- **No other failure in the window.** The 10:50Z comment cohort siblings skipped as designed.
- **Wall:** the last death is the 05:10:20Z lab draw. The 08:22-10:09Z pass completed on a fresh runner with no wall, so the allowance is usable now; a single draw is the window test, never a burst. The `retry-after` header is diagnostic only.
- **Model registry:** fresh read 10:53Z: 108 models / 10 free; `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free` and the other free names are live. No Auditor recommendation, no upgrade dispatch.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Live 23 names = those 20 plus the three GitHub-managed names. Zero missing, zero extra.
- **Audit:** the #854 head carries R1-R37 with the round-1 fixtures and pins; the round-2 review found the R20 wrapper pins not whole, the deferral-guard fail-open, and the build resolver sort bug. The pass must repair those and re-run the full audit at 38/0.
- **Pages:** production root returns 200 on `e4844201`; the last production deploy is `45442610396` (2026-11-24T16:54Z, same main SHA); the #854 PR-head deploy `45592317353` succeeded on `36e72ff7`; the 10:10Z production redeploy dispatch failed on an empty artifact with no live content change.
- **Schedule health:** the 20-minute maintainer cron last fired at 05:01Z; this 10:50Z run is comment-triggered. The scheduler throttle (#831/#836) remains; no manual dispatch while the quota is the scarce resource.

### Live lanes and their next step

- **#854 / #803 (protected-path slices):** the round-2 review returned `lab` and the scoped pass is live on `36e72ff7`. On a push and a review signal, forward a fresh review on the new head; then the tester/eval gates. On another wall death, no same-pool retry; resume from any checkpoint commits on the next wake. The body carries `Closes #803` + `Refs #853`; #803 closes only on a merge that confirms all three slices. The branch is not merge-eligible until a head-fresh tester marker and a head-bound `approve-eval`.
- **#812 / #814 (audit-harness backlog):** #812 is R11 same-name shadowing with no `lab:` job scoping; #814 is the fail-open baseline read in the fix lane. Both still reproduce on main; #815 is fixed and closed. Next: after #854's verdict, with the R32 verify-body pin updated in lockstep.
- **#849 (fail-loud hardening):** its 2026-11-20T03:34:03Z trigger died on the wall (run `44668604966`); it stays queued after #812/#814 and will need a fresh trigger when it reaches the head of the queue.
- **#773/#774:** #773 is the LAB.md read-only-scope contradiction plus the phantom "ownership-gated restore-head" step reference; #774 is the stale `setup.sh --check` roster. Both verified valid on `e4844201` and parked since October as the post-delivery batch. Queue after #860; no dispatch until the backlog clears.
- **#857 / #856 / #860 (fail-loud backlog):** accepted and serialized after #849; #860 shares `opencode-review.yml` with the #854 lane, so it cannot start before #854 merges.
- **#742 remainder (tracker):** open. The merged slice covers the 15 six-workflow steps; the other lanes still need the privileged launcher and preamble, and the follow-ups remain. Candidate for a lab round after the serialized backlog; do not open a duplicate issue.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; the rung/contract slice is merged, but the per-egress-IP wall remains the only fix that ends the recurrence.
- **Public surface (curator lane):** the 07:31Z draw completed; the 10:09Z push deployed the #854 preview successfully. Watch the no-decision-then-retry pattern.
- **#821 / #792** (Maze Chase Windows harness): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw at a time; no same-pool burst. This run spends zero agent draws: the #854 round-2 pass is already live and the queue holds for its outcome.
- **Checkpoint rule (binding on the next Maintainer):** if #854's head advances with partial commits and a lab run dies without signalling review, do NOT dispatch a review on that partial head. Read the lab decision/comment and the commit messages; only a `review` signal (or an explicitly complete pass) authorizes the review/test/eval chain.
- Do not dispatch #812/#814/#849/#857/#856/#860/#773/#774/#742 until the #854 verdict is known; the serialized order keeps the shared audit script single-owner.
- Never merge without a head-fresh tester marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardened PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#854 round-2 pass (live):** on a push with a review signal, forward the fresh review; on findings, another scoped pass on the same head. Keep #803 open until the merge confirms all three slices.
2. `{"action":"lab","issue":812}`: after #854; scope R11 to the `lab:` job and update the R32 verify-body pin in lockstep.
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

1. #854: the round-2 review is in and the scoped pass is live on `36e72ff7`. The head is no longer rebase-only; the round-1 findings are implemented, but B1-B3 remain.
2. The lab run must fix the R20 wrapper pins (initializers + mutation self-tests), the deferral-guard fail-closed parsing and missing failure fixtures, and the build resolver's `createdAt` request; then re-run the full audit at 38/0 and update the pins in lockstep.
3. The App-token push refusal is expected wrapper noise on a workflow-touching branch; the PAT step is authoritative. Do not route a post-mortem for it alone.
4. The 10:10Z site-redeploy dispatch failed on an empty artifact; the live site is 200 and main is unchanged, so the last successful deploy of the same SHA is still serving. If a later successful deploy does not appear and the site goes stale, investigate then.
5. The PR body is `Closes #803` + `Refs #853` with the `PR #854` prose; the merge will close #803 only if the verdict confirms all three slices. N5 asks whether the design-lane day scope should be stated in the body or head-scoped.
6. #853 and #848 are closed; #803 stays open; #815 is closed; #831 is bookkeeping only.
7. Pages: production green on `e4844201`; the #854 PR-head deploy succeeded on `36e72ff7`; the failed redeploy dispatch changed no content.
8. The auditor daily slot fired late at 07:27Z; the 20-minute maintainer cron last fired at 05:01Z. The scheduler throttle (#831/#836) remains; no manual dispatch while the quota is the scarce resource.
9. #836 stays open for the Owner capacity decision. The merged slice restores rung 3 and aligns the contract only; do not close the issue.
10. #745 is done: merged `eca3be8e`, Pages green, #853 closed. #742 stays open for the remaining owner-credential work.
11. Model registry drift: the ladder is 3/3 on main and all three rungs are live; the free count is 10 at 10:53Z, with no rung retired. No lab dispatch.
12. Maintainer schedule/recover throttling: the declared 20-minute cron fires only a few times a day; the 10:50Z run is comment-triggered. The scheduler throttle (#831/#836) remains.
13. The 22:01Z curator agent completed green without a decision file on 2026-11-24; the bounded auto-retry dispatched the 22:11Z run, which decided `[]`. The 07:31Z curator draw is the next sample. A repeat across runs is a lab-round candidate; no issue opened (follow-ups belong to the Owner).
14. Workspace: this run's trusted pre-agent checkout is main `e4844201`; the CLI bootstrap checked out the PR head `36e72ff7` for this wake, so the session tree is on the PR head with project config disabled; the memory bundle came from the trusted log-branch tip `6bf28853`, `.maintainer/` is gitignored, and the tree is clean.
15. Memory: the 2026-11-25 file carries the 02:36Z session, the three run markers, the 05:01Z session, the 08:05Z session, the 10:10Z session, and this 10:56Z session. The log publish is append-only with keep-both semantics. The `maintainer/logs` tip at materialization is `6bf28853`.
16. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round, not a standalone issue.
17. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
18. The merged tree carries the R26 canonical manifest in lockstep with `maintainer.yml`; the next lab pass must regenerate it if it edits that file.
19. No agent-side merge or dispatch this run beyond the live round-2 pass and the board ping. The last verified merge is the selector PR at 16:35:02Z on 2026-11-24.
20. The general job's ` /oc` substring matcher fired on trigger prose in the eval report on 2026-11-24 and produced two no-action notes plus one extra owner summon; the resulting wake was cancelled. Watch item for a future lab round; no new issue.
21. No `emergency.json`: the maintainer workflow is alive, production is serving, and no failed lab attempt is being bypassed.
22. #773/#774 are re-queued after a month-long park. They were valid on `e4844201` when checked at 08:10Z; re-verify before dispatching in case the backlog pass folds them into #742.
23. **Lab wall-death recovery gap (watch, maybe #820/#836 follow-up):** the 05:10Z intake did not chain the bounded fresh-run recovery because the failure was a lab run, not an agent run carrying `.maintainer/quota-wall`. The lane waited ~3 hours for the auditor handoff wake. Not worth a duplicate issue now; fold into the capacity work or the next lab round after the backlog.
24. The pending maintainer `45598790979` was created at 10:50:24Z with no jobs; if it actually runs, it must read this state and avoid re-dispatching the live round-2 pass.
25. The round-2 review's non-blocking findings N1-N4 should be folded into the same lab pass if they are cheap; N5 needs a decision on the design-lane scope against #803's wording.

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

1. Read the round-2 pass outcome on `36e72ff7`. If it pushes a new head with a review signal, dispatch a fresh review on that head, then the test/eval chain as the gates advance. If it returns findings again, scope the next pass on the same head. Keep #803 open unless the merge confirms all three slices.
2. If the pass dies on the wall, no same-pool retry; the fresh-run lottery is the recovery. If it dies with checkpoint commits, resume from them; do not review a partial head.
3. Verify main is still `e4844201` (or advanced only through a verified merge), production is live, and the selector branch is intact at `c1040c0c`.
4. Then #812, #814, #849, #857, #856, #860, #773, #774 in order (#860 only after #854 merges), then #742's remainder.
5. Watch the pending maintainer `45598790979`; keep #836 open for the Owner capacity decision; #831 is bookkeeping only; #848, #853 and #815 are closed.
6. Verify the board invariant, allowlist, registry/ladder, live site, held runs, and schedule health; if clean, stand by.

## Open questions

1. Will the round-2 pass land B1-B3 inside a usable provider window?
2. Does the live pass pick up the round-2 report from the PR, given the trigger was a bare `/oc lab`?
3. Will the pending maintainer `45598790979` self-skip cleanly?
4. Does the transient site-redeploy failure class recur now that the PR-head deploy succeeded on the same push?
5. The scheduler throttle is producing multi-hour gaps in every cron; does the Owner want to fold the scheduler and capacity work into the #836 decision?
6. Does the capacity tracker still need the Owner's per-egress-IP capacity decision now that the ladder is whole again?
7. The general job's ` /oc` substring matcher and the prompt-contract drift remain watch items for a future lab round.
8. Should #773/#774 stay as separate lab targets, or be folded into the #742 remainder when the backlog clears?
