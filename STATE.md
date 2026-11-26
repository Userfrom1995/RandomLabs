# STATE

Last updated: 2026-11-26T08:07Z by run 45779772816

(08:01Z issue-triage wake on #864: the 03:43Z quality draw died on the provider daily free-usage allowance at 04:07:07Z, the 04:07Z intake stood down without an agent, and this issue_comment wake re-armed exactly one quality pass on the unchanged tested head `d449afb93` plus routed the new comment-poster fail-open #864 to the lab lane. Main `e4844201`; #803 stays open until the merge.)

## TL;DR for the next Hephaestus

- **This was the 08:01Z issue-triage wake (`45779772816`)**, summoned by the Auditor's `/oc maintainer` handoff on new audit issue #864 (Maintainer comment poster fail-open).
- **The quality gate is re-armed:** the third draw `45750749386` ran 03:43:44-04:07:41Z and died at 04:07:07Z on `FreeUsageLimitError` with no verdict; the 04:07Z quota intake `45753224907` stood down without an agent and posted the 04:08:05Z board note; no live or queued quality run remained, so `decision.json` = `eval #854` on `d449afb93` plus `lab #864` plus one #70 board ping.
- **The new fail-open is routed:** #864 is the Auditor's finding that the Maintainer comment poster prints success after a failed post; the repair is scoped to `maintainer.yml` and is disjoint from #854's branch (which touches the audit script, opencode/curator/auditor/review workflows, AGENTS.md, LAB.md), so it can proceed in parallel.
- **The tested head is unchanged and current:** review approved at 18:22:44Z on `d449afb93`, machine `/oc approve-test` at 21:32:05Z on the same head, no `/oc fix` after the review, no quality marker.
- **Next gate order:** on a head-bound `approve-eval` with the 21:32Z test marker still current, the PAT merge sweep merges #854 (rebase path, never `--delete-branch`), then #803 closes only if all three slices are confirmed. On findings, one scoped lab pass on the same branch. On another allowance death, the next wake re-arms exactly one fresh eval after confirming no live or queued eval. Watch #864's lab PR through review/test/eval; it is not a merge candidate until its own gate passes.
- **Main `e4844201`; `maintainer/logs` tip `2ada46cf`** (04:08Z quota-intake publish, marker only). Models 108/10 free; ladder 3/3 live; allowlist 19 live = 19 repo-managed + self + 3 GitHub-managed; board resolves `70`; production 200; held 0; the seven stale queued runs unchanged.
- **The 04:08Z publish appended only the intake run marker** and left STATE.md at 03:42Z; this run restores the live checkpoint.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the lab engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 08:02-08:07Z on 2026-11-26)

### GitHub state

- **Main:** `e48442018bdf7ff794d8f9f6154f5e4e28fb5610` (the 2026-11-24T16:35:01Z selector merge; unchanged). **`maintainer/logs` tip:** `2ada46cf` (04:08Z, the quota-intake publish; marker only, STATE.md left at 03:42Z).
- **Open PRs (2):**
  - #854 `d449afb930e0cdc94eb2a7d49bc66415b30e323e`, CLEAN/MERGEABLE (base `e4844201`), 11 commits from main, 8 files +1332/-77. Review approved at 18:22:44Z; machine `/oc approve-test` at 21:32:05Z; no quality marker on this head. Checks `comment`/`trigger`/GitGuardian SUCCESS and `deploy` SKIPPED. The body keeps `PR #854` prose, `Closes #803`, `Refs #853`, the 38/0 verification block, the delegation ledger, and the skills line.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, Maze Chase Windows compatibility harness (base `86570af1`); untouched since 2026-11-07.
- **Open issues (24 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #831, #836, #849, #856, #857, #860, #864. #864 is the new Auditor finding; #70 is the only `lab-health` board; #42 is the only `brainstorm` issue; #803 stays open until the merge; #831 is bookkeeping only.
- **Board invariant holds:** `health-board.sh` resolves `70`; only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest board note is the 08:00Z Auditor note; this run's ping follows.
- **Latest comments:** 03:43:41Z `/oc eval` on #854 (the 03:38Z run's PAT step), 04:08:05Z quota note on #70, 08:00:41Z #864 creation, 08:01:21Z board note, 08:01:53Z `/oc maintainer` on #864; no human comment after 03:43:41Z; no `/oc fix` after the 18:22Z review approval; no quality verdict.
- **Branch tips:** main `e4844201`, `maintainer/logs` `2ada46cf`, #854 `d449afb93`, #821 `dce109e4`, the landed selector branch `opencode/lab-848-shared-health-board-selector` at `c1040c0c` (intact), the #859 branch `opencode/issue858-curate-umbra-count-copy` at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3). **In progress:** this run only.
- **This run:** `45779772816`, `issue_comment` on #864, created 08:01:57Z, job started 08:01:59Z; trusted pre-agent checkout main `e4844201`; session tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`. The 08:02Z `workflow_run` maintainer cohort (`45779779277`, `45779780003`, `45779780223`, `45779780318`, `45779780591`, `45779780776`, `45779780915`, `45779780939`, `45779800680`, `45779803115`, `45779811552`) cancelled/skipped as the designed concurrency dedupe.

### Runs, CI and queues

- **Quality draw `45750749386`:** failure; created 03:43:44Z from the 03:43:41Z `/oc eval`; the job ran 03:43:46-04:07:41Z and died at 04:07:07Z on `AI_APICallError: Free usage limit reached` (`FreeUsageLimitError`, issue #754) with no evaluator decision file. The fail-closed verification step went red as designed. No retry is built into the eval lane.
- **Quota intake `45753224907`:** success; `workflow_run` summon of the failed quality draw, job 04:07:48-04:08:21Z; the agent step skipped, the quota-recovery step and all post steps green; it posted the 04:08:05Z #70 note and its memory publish appended only its run marker (`2ada46cf`).
- **Auditor `45774031232`:** success; scheduled 07:15:56Z, job 07:16:00-07:25:40Z; the log carries `FreeUsageLimitError` mentions, so the wall hit it too, but the workflow completed green.
- **Auditor self-heal `45775220002`:** success; `workflow_dispatch` 07:25:36Z, job 07:25:43-08:01:57Z; it posted the 08:00Z board note and created #864 at 08:00:41Z.
- **Curator `45774716028`:** success; scheduled 07:21:34Z, job 07:21:36-07:33:47Z; the log carries `FreeUsageLimitError` mentions, but the self-heal lane worked.
- **This run `45779772816`:** issue-triage wake on #864; a fresh runner, so the quality re-arm is the designed new-egress recovery, not a same-pool retry.
- **Pages:** production root returns 200 on `e4844201`; the latest main deploy attempts failed on the known empty-artifact class, and the last successful main deploy serves the same SHA. No main move this window.
- **Model registry:** 108 / 10 free at 08:05Z; pin and `small_model` `opencode/deepseek-v4.1-flash-free`; the three ladder rungs (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`) are live; `maintainer.yml` `REQUESTED_MODEL` is the same free pin. No upgrade.
- **Allowlist:** 19 names plus the self-excluded maintainer = 20 repo-managed; live 23 = those 20 plus Dependabot Updates, Dependency Graph, and pages-build-deployment (GitHub-managed); zero missing, zero extra.
- **Failures in the window:** the 04:07Z quality-draw allowance death is the only real failure; the 08:02Z maintainer skip/cancel cohort is the designed concurrency dedupe.

### Live lanes and their next step

- **#854 / #803 (protected-path slices):** EVAL RE-ARMED (fourth attempt) on `d449afb93` by this run. On an `approve-eval` marker with the 21:32Z test marker still current, the PAT merge sweep merges on the rebase path (never `--delete-branch`), then #803 closes only if all three slices are confirmed. On eval findings, one scoped lab pass on the same branch. On another allowance death, the next wake re-arms exactly one fresh eval after confirming no live or queued eval.
- **#864 (new comment-poster fail-open):** LAB DISPATCHED. The repair is scoped to `maintainer.yml` plus the empty-body and non-zero-exit fixtures; it is disjoint from the #854 branch, so it can proceed in parallel without breaking the serialized audit-script ownership. Watch its PR through review/test/eval; it is not a merge candidate until its own gate passes.
- **Public-surface lane:** the 07:21Z curator wall hit self-healed; no dispatch; the next scheduled tick re-arms. No new issue while #836 and the serialized backlog are open.
- **The 15:46Z post-step silent failure:** now tracked by #864; the last sessions posted correctly. Fold the trigger poster's non-fatal error path into the next lab round (it checks returncode and prints `::error::` but does not exit non-zero); no duplicate issue.
- **#812 / #814 (audit-harness backlog):** #812 is R11 same-name shadowing with no `lab:` job scoping; #814 is the fail-open baseline read in the fix lane. Both reproduce on main. Next after #854, with the R32 verify-body pin updated in lockstep. #814 includes the three-site resolver `createdAt` addendum and the deferral page-size wording.
- **#849 (fail-loud hardening):** queued after #812/#814; needs a fresh trigger when it reaches the head of the queue.
- **#857 / #856 / #860 (fail-loud backlog):** serialized after #849; #860 shares `opencode-review.yml` with the #854 lane, so it cannot start before #854 merges.
- **#773/#774:** the LAB.md read-only-scope contradiction plus the phantom step reference, and the stale `setup.sh --check` roster; verified on `e4844201`; parked as the post-delivery batch.
- **#742 remainder (tracker):** open; the candidate lane for the remaining owner-credential steps and follow-ups after the serialized backlog.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch beyond #864; the per-egress-IP wall remains the only fix that ends the recurrence. The 03:43Z quality death ran ~23 minutes before the wall hit, versus 36 minutes at 00:08Z and 11.5 minutes at 21:37Z, so the bucket can be partly consumed mid-run.
- **#821 / #792** (Maze Chase Windows harness): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw per lane; no same-pool burst. This run spends two draws on two distinct lanes: the quality re-arm on #854 (the critical gate) and the new #864 lab repair (a disjoint surface). If either dies on the wall, the next wake re-arms exactly one fresh run of that lane after confirming no live or queued run.
- **Checkpoint rule:** if #854's head advances with partial commits and a pass dies without signalling review, do NOT dispatch a review on that partial head. Read the decision/comment and the commit messages; only a `review` signal (or an explicitly complete pass) authorizes the review/test/eval chain.
- **Review retry rule:** the review workflow has its bounded auto-retry chain (the #754/#827 rule). Do not dispatch a duplicate while a review retry is live or queued. The review approved on this head; no retry is expected.
- **Test rule:** the test approval is head-bound and fresh on `d449afb93` (21:32:05Z). Do not re-dispatch the test while the eval is live; a re-arm is only for a wall death with no live or queued test.
- **Eval retry rule:** the eval lane has no in-workflow auto-retry chain; if the dispatched eval dies on the wall or crashes without a decision, the next Maintainer wake re-arms exactly one fresh eval on the same head after confirming no live or queued eval. This run did exactly that.
- Do not dispatch #812/#814/#849/#857/#856/#860/#773/#774/#742 until the #854 lane is known (merged or verdict); the serialized order keeps the shared audit script single-owner. #864 is the one parallel exception because it touches only the comment-poster surface.
- Never merge without a head-fresh test marker and a head-bound quality approval. Workflow-touching PRs merge only through the hardened PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#854:** eval re-armed on `d449afb93`; then merge only on a head-bound quality approval with the 21:32Z test marker still current; #803 open until the merge confirms all three slices.
2. **#864:** lab repair in flight (parallel, disjoint); on a push, review/test/eval; not a merge candidate until its own gate passes.
3. `{"action":"lab","issue":812}`: after #854; scope R11 to the `lab:` job and update the R32 verify-body pin in lockstep.
4. `{"action":"lab","issue":814}`: after #812; fail-closed baseline read in the fix lane, add `createdAt` to all three pre-existing resolver `--json` lists, and update the R32 pins in lockstep.
5. `{"action":"lab","issue":849}`: after #814; on a push, the review/test chain; re-arm its wall-killed trigger.
6. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
7. `{"action":"lab","issue":856}`: after #857.
8. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 merges.
9. `{"action":"lab","issue":773}`: after #860; correct the LAB.md read-only scope claim and the phantom step reference; R1-R37 audit and pins in lockstep.
10. `{"action":"lab","issue":774}`: after #773; extend `setup.sh --check` to the full current roster and workflow set.
11. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #854: eval re-armed on `d449afb93`; no merge before the head-bound quality approval with the 21:32Z test marker current.
2. #864: lab repair in flight; the 15:46Z lost #854 report and #70 ping are the evidence; verify the fix's fixtures and that a failed post now fails red.
3. The review approved with no blocking finding and listed five non-blocking observations; the test added six more. Fold them into the queued fix-lane hardening pass. Do not expand the tested head.
4. The pre-existing resolver sites (`opencode.yml:839`, `:1162`, `:1397` on the head; `:838` on main) still sort by `.createdAt` without requesting it; all fold into #814 with the pins.
5. The 15:46Z post failure now has a tracking issue (#864); the last sessions posted correctly. The step's success line remains untrusted until the fix lands.
6. #853, #848 and #815 are closed; #803 stays open; #831 is bookkeeping only.
7. Pages: production 200 on `e4844201`; the 10:10Z, 11:12Z and 17:56Z redeploys failed on the empty-artifact class; no new deploy until main moves.
8. The PR body is `Closes #803` + `Refs #853` with the `PR #854` prose; the merge closes #803 only if the verdict confirms all three slices.
9. #836 stays open for the Owner capacity decision; no new lab dispatch beyond #864. The 03:43Z quality death ran ~23 minutes before the wall hit.
10. Model registry drift: 108 / 10 free at 08:05Z; the ladder is 3/3 on main and all three rungs are live. No lab dispatch.
11. #821 stays parked; the Maze Chase standing set is frozen unless the Owner asks.
12. The seven stale queued runs are unchanged; do not cancel or re-dispatch them.
13. Memory: the 2026-11-25 file carries the 02:36Z session, the three run markers, the 05:01Z, 08:05Z, 10:10Z, 10:56Z, 11:12Z, 12:15Z, 12:46Z, 13:11Z quota marker, 15:46Z, 17:07Z, 17:56Z, 18:22Z, 21:12Z, 21:18Z, 21:32Z and 21:49Z sessions/markers; the 2026-11-26 file carries the 00:03Z session, the 00:44Z intake marker, the 03:38Z session, the 04:08Z intake marker, and this 08:01Z session. Append-only, keep-both.
14. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round.
15. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
16. The merged tree carries the R26 canonical manifest in lockstep with `maintainer.yml`; the next lab pass must regenerate it if it edits that file.
17. No `emergency.json`: the maintainer workflow is alive, production is serving, and no failed lab attempt is being bypassed.
18. The general job's contains-based `/oc` matcher fired on 2026-11-25's eval report; watch item for a future lab round, no new issue. The 04:08Z quota note, 08:00Z board note and 08:01Z `/oc maintainer` comment did not trip it.
19. **Resolver addendum:** three pre-existing resolver sites remain on the head, `opencode.yml:839` (the baseline resolver the reviewer cited at `:838` on main), `:1162`, and `:1397`; all sort by `.createdAt` without requesting it. Fold all three plus pins into the #814 fix-lane hardening pass.
20. **Design-lane note:** a manual design trigger placed on a PR thread would day-scope there; the designed issue invocation and the phase-completion forward are unaffected. No action now.
21. **Eval recovery watch:** the 13:10Z eval wall death was carried by the next-wake re-arm, the 16:00Z eval succeeded, the 21:37Z eval died at 21:48Z, the 00:08Z eval died at 00:44Z, and the 03:43Z eval died at 04:07Z. This issue-triage wake is the next-wake re-arm. If this draw dies again, re-arm once on the next wake; no duplicate issue while #836 and the backlog are open.
22. **Test-lane auto-retry gap:** the test workflow has no in-workflow retry chain (unlike review), so every wall death needs a Maintainer re-arm. The eval lane shares the gap. Watch item for the next lab round; no duplicate issue while #836 is open.
23. **Public-surface self-heal cap:** the 21:18Z exhaustion shows the cap of 1 re-dispatch working as designed on a pool-wide wall; the 07:15Z auditor and 07:21Z curator wall hits self-healed. No new issue; fold into the #836 capacity decision if the recurrence grows.
24. **Quota intake behavior:** the 18:45Z, 21:48Z, 00:44Z and 04:07Z intakes skipped the agent and posted the audit note but chained no fresh test or eval; the heartbeat/schedule/issue wake was the only re-arm. This matches the #820/#836 design for maintainer runs; record for the capacity decision.
25. **Intake memory gap:** the 21:49Z, 00:45Z and 04:08Z quota-intake publishes appended only their run markers and did not refresh STATE.md. This run restored it; watch whether future intake publishes do the same.
26. **Wall-duration variance:** the 03:43Z draw survived ~23 minutes before the wall, versus 36 minutes at 00:08Z and 11.5 minutes at 21:37Z; subagent calls may draw from the same per-egress bucket. Record for the #836 capacity decision; do not change the single-draw rule.
27. **New comment-poster lane:** #864 is the first dedicated fix for the bot-token comment poster; the trigger poster checks returncode and prints `::error::` but does not exit non-zero, while the comment/ping poster is the unconditional-success gap. The #864 fix must keep `github.token` and add the two fixtures; the trigger poster's non-fatal error path folds into the next lab round.

## Standing rules I operate under

### Safety and autonomy

- Never post issue or PR comments directly; the only public artifacts are the files under `.maintainer/`. Never create an issue or PR, never run git commit/push/branch commands, never touch the brain, never `@copilot`, and never spawn a Copilot review. Never mention an agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception).
- Protected paths: `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, `LAB.md` (also `.github/scripts/` as touching credential wiring). Changing them requires the full review/test/eval chain and a PAT-backed push. The agent-write App token cannot push workflow files, so expect a public push-rejection on the branch; the lab's hardcoded PAT step performs the actual push.
- Unattended runs: an unattended ownerless PR is not consent. Never merge without a head-fresh test marker and a head-bound quality approval, and never bypass branch protection.
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

- This run is an `issue_comment` triage on #864; the public artifact is the #864 comment plus the #70 board ping. `decision.json` dispatches two agent draws: `eval` on #854 and `lab` on #864.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure. This run posts the #864 comment and the #70 board ping.
- The pipeline is green on main (`e4844201`; the post-merge Pages deployment of the same SHA is live and the root is 200), and the platform is perf-sensitive: multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed the lab draws at 16:54:13Z, 23:15:37Z, 03:05:44Z, 05:10:20Z, 11:13:26Z, the eval draw at 13:10:30Z, the test draw at 18:44:57Z, the public-surface draw at 21:17:41Z, the eval draws at 21:48:51Z, 00:44:09Z and 04:07:07Z, and the auditor/curator draws at 07:15Z/07:21Z, while fresh runners completed the 12:15Z review, 12:46Z test, 16:00-17:08Z eval, 17:23-17:56Z repair pass, 17:56-18:22Z review, 21:12Z heartbeat, the 21:16-21:32Z test, the 00:03Z/03:38Z sessions, and the 07:25Z/08:01Z auditor self-heal. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Watch the quality gate on `d449afb93`. On a head-bound `approve-eval` with the 21:32Z test marker still current, verify the merge preflight (main history, head re-read, required checks, mergeable flag), confirm the PAT sweep merged on the rebase path (never `--delete-branch`), and close #803 only if all three slices are confirmed. On eval findings, one scoped lab pass on the same branch. On another allowance death, no same-pool retry; re-arm exactly one fresh eval on the next wake after confirming no live or queued eval.
2. Watch #864's lab PR; on a push, route review/test/eval per the infra chain; do not merge before its own gate passes.
3. Verify this run's eval trigger, lab trigger and #70 board note posted; if not, correct them in the next comment.
4. Then the serialized queue: #812, #814 (with the three-site resolver `createdAt` addendum, the deferral page-size wording, and the review/test non-blocking observations), #849, #857, #856, #860 (only after #854 merges), #773, #774, then #742's remainder.
5. Keep #836 open for the Owner capacity decision; #831 is bookkeeping only; #848, #853 and #815 are closed; #821 stays parked.
6. Verify the board invariant, allowlist, registry/ladder, live site, held runs, and schedule health; if clean, stand by.

## Open questions

1. Will this fourth fresh quality draw approve `d449afb93`, or return findings?
2. Will the #864 lab repair land without a wall death, and will its fixtures prove the poster fails closed?
3. The 03:43Z draw ran ~23 minutes before the wall, versus 36 minutes at 00:08Z and 11.5 minutes at 21:37Z: is the bucket partly consumed by subagent calls mid-run, and does that change the re-arm calculus? Watch item for the #836 capacity decision.
4. Does the bounded quota-recovery chain re-arm the lane on its own, or does every allowance death still need the heartbeat/schedule/issue wake? Watch item for the #836 capacity decision.
5. Should the eval/test lanes get a bounded in-workflow retry like review, or stay next-wake re-armed? Known gap; fold into the next lab round or #836, no new issue while the backlog is serialized.
6. Does the public-surface self-heal cap of 1 remain the right bound after a pool-wide wall, or should the lane wait for the scheduled tick? Watch item; no duplicate issue while #836 is open.
7. Should the review/test non-blocking observations fold into #742's remainder or the queued #814 lane? (Owner follow-up; not created here.)
8. The general job's contains-based matcher and the prompt-contract drift remain watch items for a future lab round.
9. Should #773/#774 stay as separate lab targets, or be folded into the #742 remainder when the backlog clears?
