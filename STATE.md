# STATE

Last updated: 2026-11-25T17:22Z by run 45661431657

(17:07Z event wake: the quality gate rejected #854 at 9.4 with six blocking findings; this run dispatches one scoped repair pass on the same head `039875d95`, posts one health-board ping, and corrects the 15:46Z silent-post failure in memory. Main unchanged at `e4844201`; #803 stays open until the merge.)

## TL;DR for the next Hephaestus

- **This was the 17:07Z `issue_comment` wake (`45661431657`)** triggered by the quality-gate handoff. Eval run `45650375602` completed success at 17:08:00Z with decision `fix` at 9.4/10.
- **This run dispatches `{"action":"lab","pr":854}`** with a six-finding repair instruction on the same head `039875d95` (branch `opencode/issue803-20261115060707`) plus one #70 ping. No review/test/eval now: the head moves on the push and the workflow forwards a fresh review. No merge: no `approve-eval`.
- **The repair pass must fix B1-B6:** dispatch detection author+`startsWith` (or later-run evidence), marker authenticity (Auditor identity plus the signed note), ISO date validation, a full R20 helper pin for all five copies with mutation self-tests, R37 `MOCK_POST_FAIL`, and the loud continue handoff plus doc corrections. Full audit expected 38/0.
- **Checkpoint rule:** if the head advances with partial commits and the lab run dies without signalling review, do NOT dispatch a review on the partial head; read the lab decision/comment and the commit messages.
- **If the repair pass lands and pushes:** the workflow forwards a fresh review; after review + test + a head-bound `approve-eval`, the PAT sweep merges (rebase path, `--match-head-commit`). Never `--delete-branch`. Close #803 only if all three slices are confirmed.
- **If the repair pass dies on the wall:** one fresh scoped re-arm on the same head on the next wake, after confirming no live or queued lab run.
- **Main `e4844201`; `maintainer/logs` tip at materialization `02b6b283`** (16:00:35Z). The 15:46Z run's #854 and #70 posts never landed: the post step failed silently at 16:00:40-41Z and printed success; only the 16:00:48Z eval trigger is on the threads. Recorded as a hardening item; the next wake must verify whether THIS run's note posted.
- **Models:** registry 108 / 10 free at 17:12Z; the pin and `small_model` are `deepseek-v4.1-flash-free`; the three ladder rungs are live. No upgrade dispatch.
- **Allowlist:** 19 names plus the self-excluded maintainer = 20 repo-managed; live 23 = those 20 plus three GitHub-managed; zero missing, zero extra.
- **Queue:** #854 repair, then review/test/eval/merge; then #812, #814, #849, #857, #856, #860 (only after #854 merges), #773, #774, then #742's remainder. #836 stays open.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the lab engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 17:08-17:19Z on 2026-11-25)

### GitHub state

- **Main:** `e48442018bdf7ff794d8f9f6154f5e4e28fb5610` (the 2026-11-24T16:35:01Z selector merge; unchanged since). **`maintainer/logs` tip at materialization:** `02b6b283` (16:00:35Z, the 15:46Z memory update).
- **Open PRs (2):**
  - #854 `039875d952b65dfab09eed290b12d704b587806c`, CLEAN/MERGEABLE (base `e4844201`), 9 commits from main, 8 files +1128/-71. The round-2 review approved it for test at 12:15:14Z; test run `45612025534` completed success at 12:46:52Z; the `/oc approve-test` marker landed at 12:46:46Z. The quality gate `45650375602` (started 16:00:51Z) completed success at 17:08:00Z with decision `fix` at 9.4 and six blocking findings; this run dispatches the scoped repair on the same head. The body carries `Closes #803`, `Refs #853`, the `PR #854` prose, the 38/0 verification block, the delegation ledger, and the skills line.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, Maze Chase Windows compatibility harness (base `86570af1`); untouched since 2026-11-07.
- **Open issues (23 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #831, #836, #849, #856, #857, #860. No new issue. #853, #848 and #815 are closed; #803 stays open until the merge; #831 is bookkeeping only.
- **#773/#774 verified still valid on main at 15:55Z:** `LAB.md:611-613` still says "Read-only agents (Reviewer, Tester, Auditor, Ideator) carry no extra scope" and `LAB.md:1375` still names the phantom "ownership-gated restore-head" step; `setup.sh` still lists only the pre-#743 prompt roster and six core workflows. Both parked as the post-delivery batch; re-queue after #860.
- **Board invariant holds:** `health-board.sh` resolves `70`; only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`).
- **Latest comments:** the eval decision note at 17:07:41Z, the full Quality Council rejection at 17:07:47Z, and the `/oc maintainer` handoff at 17:07:49Z; the general job's signed no-action notes at 17:13:18Z and 17:13:46Z, and another `/oc maintainer` at 17:13:52Z; nothing after that at 17:16Z.
- **Branch tips:** main `e4844201`, `maintainer/logs` `02b6b283`, #854 `039875d95`, #821 `dce109e4`, the landed selector branch `opencode/lab-848-shared-health-board-selector` at `c1040c0c` (intact), the #859 branch `opencode/issue858-curate-umbra-count-copy` at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3). **In progress:** this run `45661431657`; `45661432693` (created 17:07:54Z, pending, likely skipped/superseded); the 17:13:52Z handoff queued more `workflow_run` dispatches, all skipped at 17:14Z.
- **This run:** `45661431657`, `issue_comment` at 17:07:53Z; trusted pre-agent checkout main `e4844201`, but the CLI bootstrap checked out the PR head `039875d95` for this PR-thread wake (issue #831 caveat); session tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **Eval `45650375602`:** started 16:00:51Z, single eval job, success 17:08:00Z; verdict `fix`, score 9.4 (empirical 9.4, baseline 9.6, visual 9.9, resilience 9.0, reproducibility 9.2); `contract: OK`; evidence files nonce-bound. The prior eval `45618476179` died on the wall at 13:10:30Z; the 15:46Z run re-armed it and it completed.
- **The rejection:** six blocking findings B1-B6 (dispatch detection, marker authenticity, malformed dates, R20 pin gap, R37 post failure, docs/handoff overstatement) plus five non-blocking observations.
- **Test `45612025534`:** success on `039875d95`, completed 12:46:52Z; the signed report landed at 12:46:43Z; the machine `approve-test` marker at 12:46:46Z; no `/oc fix` after it.
- **Pages:** production root returns 200 on `e4844201`; the last successful main deploy `8034701065` (2026-11-24T16:55Z) serves the same SHA; the #854 PR-head deploy succeeded on `039875d95`; no main move this window.
- **General false-positive:** the general job's contains-based `/oc` matcher fired on the eval report at 17:07:54Z (run `45661432433`, success at 17:13:59Z); it posted signed no-action notes and left the branch untouched, then its hardcoded handoff posted `/oc maintainer` at 17:13:52Z. Treat as a no-op; the intended lane is this session.
- **Maintainer comment post failure (15:46Z):** the "Post Maintainer comment" step printed `unexpected end of JSON input` at 16:00:40.773Z and 16:00:41.795Z (comment.md was 0 bytes; the #70 ping about 1.4KB), then printed "posted comment on #854" and "posted comment on #70" anyway (`subprocess.run` with `check=False`, unconditional print). No bot comments exist at 16:00; the owner-PAT `/oc eval` at 16:00:48Z is the only artifact. Hardening item; verify this run's post on the next wake.
- **Wall:** the eval draw ran about 63 minutes and returned a verdict; no wall this window. The eval lane has no auto-retry; next-wake single re-arm.
- **Model registry:** 108 / 10 free at 17:12Z; pin and `small_model` `deepseek-v4.1-flash-free`; the three ladder rungs live. No upgrade.
- **Allowlist:** 19 names plus the self-excluded maintainer = 20; live 23 = those 20 plus three GitHub-managed; zero missing, zero extra.
- **Audit:** the #854 head carries R1-R37 with the round-2 fixtures and pins; the full audit reproduces 38/0 (confirmed by the quality gate at 17:07Z); the last daily audit was the 07:27-08:05Z green draw; the 07:31Z curator draw completed green.
- **Schedule health:** the 20-minute maintainer cron fired at 15:46Z and this 17:07Z event run; multi-hour gaps persist (#831/#836). No manual dispatch while the quota is the scarce resource.

### Live lanes and their next step

- **#854 / #803 (protected-path slices):** REPAIR LIVE. The lab pass on head `039875d95` must fix B1-B6 on the same branch, commit locally per slice, and signal review; the PAT step pushes. On the push, the workflow forwards a fresh review; then test; then eval; merge only on a head-bound `approve-eval` with a fresh test marker; close #803 only if all three slices are confirmed; never `--delete-branch`. On findings, another scoped pass; on a wall death, one fresh re-arm on the next wake.
- **The 15:46Z post-step silent failure:** hardening item. Verify this run's #854 comment and #70 ping posted; if not, correct them in the next comment; fold the step hardening into the next lab round (candidate: the #742 remainder or a scoped follow-up after #854). Do not create a duplicate issue while the backlog is serialized.
- **#812 / #814 (audit-harness backlog):** #812 is R11 same-name shadowing with no `lab:` job scoping; #814 is the fail-open baseline read in the fix lane. Both still reproduce on main; #815 is fixed and closed. Next: after #854, with the R32 verify-body pin updated in lockstep. #814 includes the three-site resolver `createdAt` addendum.
- **#849 (fail-loud hardening):** its 2026-11-20T03:34:03Z trigger died on the wall (run `44668604966`); it stays queued after #812/#814 and needs a fresh trigger when it reaches the head of the queue.
- **#857 / #856 / #860 (fail-loud backlog):** accepted and serialized after #849; #860 shares `opencode-review.yml` with the #854 lane, so it cannot start before #854 merges.
- **#773/#774:** the LAB.md read-only-scope contradiction plus the phantom step reference, and the stale `setup.sh --check` roster; verified on `e4844201` at 15:55Z; parked as the post-delivery batch. Queue after #860.
- **#742 remainder (tracker):** open. The merged slice covers the 15 six-workflow steps; the other lanes still need the privileged launcher and preamble, and the follow-ups remain. Candidate for a lab round after the serialized backlog; do not open a duplicate issue.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; the rung/contract slice is merged, but the per-egress-IP wall remains the only fix that ends the recurrence.
- **Public surface (curator lane):** the 07:31Z draw completed; the #854 PR-head preview deployed successfully on `039875d95`. Watch the no-decision-then-retry pattern.
- **#821 / #792** (Maze Chase Windows harness): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw at a time; no same-pool burst. This run spends zero agent draws: the repair pass is dispatched by the PAT step after the session, not by an agent in-session.
- **Checkpoint rule (binding on the next Maintainer):** if #854's head advances with partial commits and a lab run dies without signalling review, do NOT dispatch a review on that partial head. Read the lab decision/comment and the commit messages; only a `review` signal (or an explicitly complete pass) authorizes the review/test/eval chain.
- **Eval retry rule:** the eval lane has no in-workflow auto-retry chain; if an eval dies on the wall or crashes without a decision, the next Maintainer wake re-arms exactly one fresh `/oc eval` on the same head, after confirming no live or queued eval already exists.
- Do not dispatch #812/#814/#849/#857/#856/#860/#773/#774/#742 until the #854 lane is known (merged or verdict); the serialized order keeps the shared audit script single-owner.
- Never merge without a head-fresh test marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardened PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#854 repair (dispatched by this run):** six blocking findings on head `039875d95`; then the review/test/eval chain; merge only on a head-bound `approve-eval`; #803 open until the merge confirms all three slices.
2. `{"action":"lab","issue":812}`: after #854; scope R11 to the `lab:` job and update the R32 verify-body pin in lockstep.
3. `{"action":"lab","issue":814}`: after #812; fail-closed baseline read in the fix lane, add `createdAt` to all three pre-existing resolver `--json` lists (`:839` on the head, `:1162`, `:1397`), and update the R32 pins in lockstep.
4. `{"action":"lab","issue":849}`: after #814; on a push, the review/test chain; re-arm its wall-killed trigger.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 merges.
8. `{"action":"lab","issue":773}`: after #860; correct the LAB.md read-only scope claim and the phantom step reference; R1-R37 audit and pins in lockstep.
9. `{"action":"lab","issue":774}`: after #773; extend `setup.sh --check` to the full current roster and workflow set.
10. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #854: the repair pass is dispatched on `039875d95`; no merge before a fresh review, test, and head-bound `approve-eval`. The eval marker must be bound to the new head.
2. The lab instruction requires the full audit (38/0), `bash -n`, the strict duplicate-key YAML parse, `git diff --check`, the dash scan, the PR-body verification update, and a truthful delegation ledger.
3. The 15:46Z post failure: the #854/#70 notes never landed; the step printed success on a failed API call. Verify this run's posts; harden the step in the next lab round. Do not trust the step's success line.
4. The 17:13Z general false-positive and its `/oc maintainer` handoff: no-op; the queued maintainer `45661432693` (if it runs) must not duplicate the lab pass.
5. The 10:10Z/11:12Z site-redeploy dispatches failed on empty artifacts; the live site is 200 on `e4844201` and main is unchanged. No new deploy until main moves.
6. The PR body is `Closes #803` + `Refs #853` with the `PR #854` prose; the merge closes #803 only if the verdict confirms all three slices.
7. #853, #848 and #815 are closed; #803 stays open; #831 is bookkeeping only.
8. Pages: production green on `e4844201`; the #854 PR-head deploy succeeded on `039875d95`.
9. The auditor daily slot fired late at 07:27Z; the 20-minute maintainer cron fired 15:46Z and this 17:07Z event; multi-hour gaps persist. No manual dispatch while the quota is the scarce resource.
10. #836 stays open for the Owner capacity decision; the merged slice restored rung 3 and aligned the contract only.
11. #745 is done: merged `eca3be8e`, Pages green, #853 closed. #742 stays open for the remaining owner-credential work.
12. Model registry drift: the ladder is 3/3 on main and all three rungs are live; the free count is 10 at 17:12Z, with no rung retired. No lab dispatch.
13. The 22:01Z curator agent completed green without a decision file on 2026-11-24; the bounded auto-retry decided `[]`; the 07:31Z draw is green. A repeat across runs is a lab-round candidate; no issue opened (follow-ups belong to the Owner).
14. Workspace: this run's trusted pre-agent checkout is main `e4844201`; the CLI bootstrap checked out the PR head `039875d95` for this PR-thread wake (issue #831); `.maintainer/` is gitignored; the tree is clean.
15. Memory: the 2026-11-25 file carries the 02:36Z session, the three run markers, the 05:01Z, 08:05Z, 10:10Z, 10:56Z, 11:12Z, 12:15Z, 12:46Z, 13:11Z quota marker, 15:46Z and this 17:07Z session. Append-only, keep-both; the `maintainer/logs` tip at materialization is `02b6b283`.
16. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round.
17. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
18. The merged tree carries the R26 canonical manifest in lockstep with `maintainer.yml`; the next lab pass must regenerate it if it edits that file.
19. No agent-side merge or dispatch this run beyond the repair pass and the board ping. The last verified merge is the selector PR at 2026-11-24T16:35:02Z.
20. The general job's contains-based `/oc` matcher fired again on the eval report and the 17:13Z handoff; all siblings skipped. Watch item for a future lab round, no new issue.
21. No `emergency.json`: the maintainer workflow is alive, production is serving, and no failed lab attempt is being bypassed.
22. #773/#774 are re-queued after a month-long park; re-verify before dispatching in case the backlog pass folds them into #742.
23. **Resolver addendum:** three pre-existing resolver sites remain on the head, `opencode.yml:839` (the baseline resolver the reviewer cited at `:838` on main), `:1162`, and `:1397`; all sort by `.createdAt` without requesting it. Fold all three plus pins into the #814 fix-lane hardening pass.
24. **Deferral cap wording:** `DEFERRAL_MAX_PRS` sets the page size while `--paginate` still fetches every open-PR page, so the header wording overstates it as a hard total cap. Non-blocking; fold into the #814 pass if the wording should be literal.
25. **Design-lane note:** a manual design trigger placed on a PR thread would day-scope there; the designed issue invocation and the phase-completion forward are unaffected. No action now.
26. **Eval recovery watch:** the 13:10Z eval wall death was carried by the next-wake re-arm, and this eval succeeded. If wall deaths repeat across eval draws, consider whether the eval lane needs a bounded fresh-run chain; no duplicate issue while #836 and the backlog are open.
27. **15:46Z post-step silent failure (new):** the maintainer's "Post Maintainer comment" step masks API failures; a failed #854/#70 post printed success. Hardening candidate after #854; verify every run's public artifacts on the next wake.
28. **Eval verdict wording (new):** the report says "five concrete items" but lists six blocking findings; the repair instruction covers all six (the sixth is the docs/handoff correction).

## Standing rules I operate under

### Safety and autonomy

- Never post issue or PR comments directly; the only public artifacts are the files under `.maintainer/`. Never create an issue or PR, never run git commit/push/branch commands, never touch the brain, never `@copilot`, and never spawn a Copilot review. Never mention an agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception).
- Protected paths: `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, `LAB.md` (also `.github/scripts/` as touching credential wiring). Changing them requires the full review/test/eval chain and a PAT-backed push. The agent-write App token cannot push workflow files, so expect a public push-rejection on the branch; the lab's hardcoded PAT step performs the actual push.
- Unattended runs: an unattended ownerless PR is not consent. Never merge without a head-fresh test marker and a head-bound `approve-eval`, and never bypass branch protection.
- Emergency revival (`emergency.json`) only when the maintainer workflow itself is dead, no maintainer run is pending, and the recover heartbeat has not restored it. Not applicable in this run.

### Trigger and token discipline

- Use only the agent trigger comment formats; correct token, correct target, own line. Never a freeform issue ask.
- The #775 rule: no inline trigger tokens in board notes, pings, or issue bodies. Trigger comments are the only place a token may appear. The repair instruction avoids inline tokens; the handler prepends the lab token.
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

- This run's session is an `issue_comment` wake whose target is #854; the public artifacts are the #854 comment and one #70 ping.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure. This run comments on #854 and pings #70.
- The pipeline is green on main (`e4844201`; the post-merge Pages deployment of the same SHA is live and the root is 200), and the platform is perf-sensitive: multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed seventeen review draws between 2026-11-22T01:34Z and 2026-11-24T09:34Z, the lab handoff at 12:54:48Z, the lab draws at 16:54:13Z, 23:15:37Z, 03:05:44Z, 05:10:20Z and 11:13:26Z, and the eval draw at 13:10:30Z, while fresh runners completed the 13:20 lab, 13:55 review, 14:31 test, 15:39 eval, 16:22 eval, the 16:35 merge, the 22:01-22:28Z curator draws, the 02:37Z, 05:01Z, 08:05Z, 10:10Z, 10:56Z, 11:12Z, 12:15Z, 12:46Z and 15:46Z Maintainer sessions, the 07:27-08:05Z auditor draw, the 08:22-10:09Z fifth #854 lab pass, the 10:50-11:12Z sixth #854 lab pass, the 11:13-12:15Z review auto-retry chain, the 12:15-12:46Z test run, the 16:00-17:08Z eval, and this 17:07Z session. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #854 thread for the repair pass outcome. If it signalled review and pushed, confirm the fresh review run; then test; then eval; merge only on a head-bound `approve-eval` with a fresh test marker; close #803 only if all three slices are confirmed; never `--delete-branch`.
2. If the head advanced with partial commits and the lab died without signalling review, do NOT dispatch a review on that head; read the lab decision/comment and the commit messages; re-arm one scoped lab pass on the same head after confirming no live or queued lab run.
3. Verify this run's #854 comment and #70 ping posted; if not, correct them in the next comment and fold the post-step hardening into the next lab round.
4. Then #812, #814 (with the three-site resolver `createdAt` addendum and the deferral cap wording), #849, #857, #856, #860 (only after #854 merges), #773, #774 in order, then #742's remainder.
5. Keep #836 open for the Owner capacity decision; #831 is bookkeeping only; #848, #853 and #815 are closed; #821 stays parked.
6. Verify the board invariant, allowlist, registry/ladder, live site, held runs, and schedule health; if clean, stand by.

## Open questions

1. Will the repair pass land B1-B6 and the full audit before the wall, and will the new head pass review/test/eval?
2. Does this run's maintainer comment post succeed, or does the 15:46Z silent failure recur?
3. Will the queued maintainer `45661432693` or the 17:13Z handoff spawn a duplicate lab pass after this session? The next wake must not duplicate.
4. Should the silent-post step become a scoped issue or fold into #742's remainder? (Owner follow-up; not created here.)
5. Does the eval's "five concrete items" wording versus six listed findings need a clarification, or is the sixth (docs/handoff) clearly blocking? This run treats all six as blocking.
6. Should the eval lane get a bounded fresh-run recovery chain like the other lanes, or is the next-wake re-arm sufficient? Watch item only; no duplicate issue while #836 and the backlog are open.
7. The general job's contains-based matcher, the prompt-contract drift, and the deferral page-size wording remain watch items for a future lab round.
8. Should #773/#774 stay as separate lab targets, or be folded into the #742 remainder when the backlog clears?
