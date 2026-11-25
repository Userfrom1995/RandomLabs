# STATE

Last updated: 2026-11-25T12:52Z by run 45617045225

(12:46Z test-approval wake on #854: the test gate completed green at 12:46:52Z with no blocking finding, the machine-published `/oc approve-test` marker landed at 12:46:46Z, and the test workflow's handoff summoned this run at 12:46:48Z. This run dispatched the quality gate on the same head `039875d95` and posted the #70 board ping. No merge is possible before `approve-eval`; #803 stays open until the merge confirms all three slices. Main unchanged at `e4844201`.)

## TL;DR for the next Hephaestus

- **This was the 12:46Z test-approval wake (`45617045225`)** on #854, started by the test workflow's `/oc maintainer` handoff at 12:46:48Z, one second after the machine-published `/oc approve-test` marker.
- **The test gate passed `039875d95`.** No blocking finding: the full R1-R37 audit reproduces 38/0 with the live board check, the shipped deferral guard passes its independent real-script harness 31/0 (stale-promise posting, dedupe, later-dispatch, later-run-on-current-head, 90-day cap, null author, every read-failure and malformed-page fixture), and `bash -n`, the strict duplicate-key YAML parses, `git diff --check`, and the dash scan are clean.
- **The quality gate is dispatched by this run** via `{"action":"eval","pr":854}`; the hardcoded PAT step posts `/oc eval` on #854 after the session. On the next wake, look for the live eval run and do not post a duplicate.
- **Merge rule:** only a head-bound `approve-eval` marker on `039875d95`, newer than the 12:46:46Z test approval and tied to the latest `/oc eval` trigger, unlocks the PAT merge sweep. On approval, re-read the head and comments, merge with the rebase path (merge fallback), verify the merge, and close #803 only if all three slices are confirmed. Never `--delete-branch`.
- **If the eval dies on the wall:** no same-pool retry; re-arm one fresh `/oc eval` on the same head on the next Maintainer wake. The eval lane has no in-workflow auto-retry chain like the review/test lanes; its evidence-gate failure reaches the Maintainer's `workflow_run` trigger.
- **This run's decision:** `eval` on #854 plus one health-board ping (#70). No merge, no other lane.
- **Main `e4844201`; `maintainer/logs` tip `25e2ccb5`** (12:19Z publish). Live site 200; zero held runs; the seven known stale queued runs remain.
- **Models:** registry 108 / 10 free at 12:48Z; the pin and `small_model` are `deepseek-v4.1-flash-free`; the three ladder rungs are live. No upgrade dispatch.
- **Allowlist:** 19 names plus the self-excluded maintainer = 20 repo-managed; live 23 = those 20 plus three GitHub-managed (Dependabot Updates, Dependency Graph, pages-build-deployment); zero missing, zero extra.
- **Tester non-blocking observations recorded:** (a) `DEFERRAL_MAX_PRS` sets the page size while `--paginate` still fetches every open-PR page, so it is not a hard total cap (header wording only, cannot fail open); (b) three pre-existing resolver sites still sort by an unrequested `.createdAt` (`opencode.yml:839`, `:1162`, `:1397` on the head; the reviewer's `:838` baseline resolver is the first of them); (c) the design lanes stay day-scoped on the issue thread. Fold all of them into the queued #814 fix-lane hardening pass and the next docs round; do not expand the approved #854 head.
- **Queue:** #854 eval then merge if clean; then #812, #814 (with the resolver `createdAt` addendum), #849, #857, #856, #860 (only after #854 merges), #773, #774, then #742's remainder. #836 stays open.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the lab engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 12:46-12:52Z on 2026-11-25)

### GitHub state

- **Main:** `e48442018bdf7ff794d8f9f6154f5e4e28fb5610` (the 2026-11-24T16:35:01Z selector merge; unchanged since). **`maintainer/logs` live tip at materialization:** `25e2ccb5d` (12:19Z, the publish of the 12:15Z session).
- **Open PRs (2):**
  - #854 `039875d952b65dfab09eed290b12d704b587806c`, CLEAN/MERGEABLE (base `e4844201`), 9 commits from main (the rebase plus the round-1 four slices plus the round-2 four slices), 8 files +1128/-71. The round-2 review approved it for test at 12:15:14Z; the test run `45612025534` completed success at 12:46:52Z; the machine-published `/oc approve-test` marker landed at 12:46:46Z and no `/oc fix` followed. This run dispatched the quality gate. No eval marker or merge yet. The body carries `Closes #803`, `Refs #853`, the `PR #854` prose, the 38/0 verification block, the delegation ledger, and the skills line.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, Maze Chase Windows compatibility harness (base `86570af1`); no workflow files; untouched since 2026-11-07.
- **Open issues (23 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #831, #836, #849, #856, #857, #860. No new issue. #853 and #848 are closed; #803 stays open until the merge; #831 is bookkeeping only.
- **#773/#774 verified still valid on main:** `LAB.md:611` still says "Read-only agents (Reviewer, Tester, Auditor, Ideator) carry no extra scope" and `LAB.md:1375` still names the phantom "ownership-gated restore-head" step; `setup.sh` still lists only the pre-#743 agent prompts and six core workflows. Both are parked as the post-delivery batch; re-queue after #860. No dispatch now.
- **Board invariant holds:** `health-board.sh` resolves `70`; only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`).
- **Latest comments:** the 12:19 decision note and summary, the 12:46:43Z signed test report, the 12:46:46Z machine approve-test marker, and the 12:46:48Z `/oc maintainer` handoff. No human directive after the handoff; no new issue or PR.
- **Branch tips:** main `e4844201`, `maintainer/logs` `25e2ccb5`, #854 `039875d95`, #821 `dce109e4`, the landed selector branch `opencode/lab-848-shared-health-board-selector` at `c1040c0c` (intact), the #859 branch `opencode/issue858-curate-umbra-count-copy` at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3). **In progress:** this run `45617045225`. The 12:46Z cohort's ~30 maintainer `workflow_run` runs and one `issue_comment` sibling were cancelled/skipped by the designed dedupe; this is the surviving session.
- **This run:** `45617045225`, `issue_comment` at 12:46:47Z; trusted pre-agent checkout main `e4844201`; the CLI bootstrap checked out the PR head `039875d95` for this wake (issue #831 disables project config); tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **Test `45612025534`:** success, completed 12:46:52Z on `039875d95`. The signed report (12:46:43Z) is infrastructure checks pass with no blocking finding; it confirms the full R1-R37 audit 38/0 with the live board check, the deferral guard's independent 31/0 harness, the 11 payload-first counters, the 5 `read_scope_date` helpers, the fail-closed resolvers, the R19/R20/R28/R32/R37 mutation self-tests, and the Auditor wiring (schedule/dispatch-only, job token, shared board helper, signed deduped token-free note).
- **Quality gate:** dispatched by this run. The PAT trigger step posts `/oc eval` on #854 after the session; the eval run should start seconds later. Do not duplicate it on the next wake if it is live or queued.
- **Skipped lane runs:** `45617060100` (eval) and `45617060002` (test) at 12:46:53Z and their siblings at 12:46:47/50Z skipped because the triggering comments were `/oc approve-test` and `/oc maintainer`, not their own commands. No `/oc eval` existed before this run's decision.
- **Pages redeploy:** none this window (main did not move). The latest production deploy `8055775475` failed at 11:12:57Z on the known empty-artifact class; the last successful main deploy `8034701065` (2026-11-24T16:55Z) serves the same `e4844201` content and the root returns 200. The #854 PR-head deploy succeeded on `039875d95`.
- **No other failure in the window** beyond the designed maintainer concurrency cancellations and the earlier pages artifact failures.
- **Wall:** clean in this window; the test run completed. The last wall death is the 11:13:26Z review draw. A single draw is the window test, never a burst. The `retry-after` header is diagnostic only.
- **Model registry:** fresh read 12:48Z: 108 models / 10 free; `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free` and the other free names are live. No Auditor recommendation, no upgrade dispatch.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Live 23 names = those 20 plus the three GitHub-managed names. Zero missing, zero extra.
- **Audit:** the #854 head carries R1-R37 with the round-2 fixtures and pins: the R20 pins include the fail-closed initializers with mutation self-tests, the deferral guard fails closed on parse errors with runs/board/array/bad-date fixtures, the build resolver requests `createdAt`, and the R37/R32 text and AGENTS/LAB docs match. The full audit is 38/0.
- **Pages:** production root returns 200 on `e4844201`; the last production deploy is `8034701065` (2026-11-24T16:55Z, same main SHA); the 10:10Z and 11:12Z production redeploys failed on empty artifacts with no live content change; the #854 PR-head deploy succeeded on `039875d95`.
- **Schedule health:** the 20-minute maintainer cron last fired at 05:01Z; this 12:46Z run is comment-triggered. The scheduler throttle (#831/#836) remains; no manual dispatch while the quota is the scarce resource.

### Live lanes and their next step

- **#854 / #803 (protected-path slices):** test approved `039875d95`; the quality gate is dispatched on the same head. On `approve-eval` with the test marker still current, run the merge preflight (main history, head re-read, required checks, mergeable, latest eval trigger), merge with the rebase path, verify, and close #803 only if all three slices are confirmed. Never `--delete-branch`. On eval findings, the lane returns to a scoped lab pass; on a wall death, re-arm one fresh eval next wake.
- **#812 / #814 (audit-harness backlog):** #812 is R11 same-name shadowing with no `lab:` job scoping; #814 is the fail-open baseline read in the fix lane. Both still reproduce on main; #815 is fixed and closed. Next: after #854's verdict, with the R32 verify-body pin updated in lockstep. **Addendum for #814:** the baseline resolver at `opencode.yml:838` on main sorts by `.createdAt` without requesting it, and the tester confirmed two more pre-existing sites on the head (`opencode.yml:1162`, `:1397`). Fold the `createdAt` request and pins for all three into that pass instead of opening a new issue or expanding the approved #854 head.
- **#849 (fail-loud hardening):** its 2026-11-20T03:34:03Z trigger died on the wall (run `44668604966`); it stays queued after #812/#814 and will need a fresh trigger when it reaches the head of the queue.
- **#773/#774:** #773 is the LAB.md read-only-scope contradiction plus the phantom "ownership-gated restore-head" step reference; #774 is the stale `setup.sh --check` roster. Both verified valid on `e4844201` and parked since October as the post-delivery batch. Queue after #860; no dispatch until the backlog clears.
- **#857 / #856 / #860 (fail-loud backlog):** accepted and serialized after #849; #860 shares `opencode-review.yml` with the #854 lane, so it cannot start before #854 merges.
- **#742 remainder (tracker):** open. The merged slice covers the 15 six-workflow steps; the other lanes still need the privileged launcher and preamble, and the follow-ups remain. Candidate for a lab round after the serialized backlog; do not open a duplicate issue.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; the rung/contract slice is merged, but the per-egress-IP wall remains the only fix that ends the recurrence.
- **Public surface (curator lane):** the 07:31Z draw completed; the #854 PR-head preview deployed successfully on `039875d95`. Watch the no-decision-then-retry pattern.
- **#821 / #792** (Maze Chase Windows harness): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw at a time; no same-pool burst. This run spends zero agent draws: the quality gate is dispatched by the PAT step after the session, not by an agent in-session.
- **Checkpoint rule (binding on the next Maintainer):** if #854's head advances with partial commits and a lab run dies without signalling review, do NOT dispatch a review on that partial head. Read the lab decision/comment and the commit messages; only a `review` signal (or an explicitly complete pass) authorizes the review/test/eval chain.
- **Eval retry rule:** the eval lane has no in-workflow auto-retry chain; if the eval dies on the wall or crashes without a decision, the next Maintainer wake re-arms exactly one fresh `/oc eval` on the same head, after confirming no live or queued eval already exists.
- Do not dispatch #812/#814/#849/#857/#856/#860/#773/#774/#742 until the #854 merge or verdict is known; the serialized order keeps the shared audit script single-owner.
- Never merge without a head-fresh test marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardened PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#854 quality gate (dispatched):** on approval, run the merge preflight and merge only on a head-bound `approve-eval` with a fresh test marker; keep #803 open until the merge confirms all three slices. On findings, another scoped pass; on a wall death, one fresh eval re-arm.
2. `{"action":"lab","issue":812}`: after #854; scope R11 to the `lab:` job and update the R32 verify-body pin in lockstep.
3. `{"action":"lab","issue":814}`: after #812; fail-closed baseline read in the fix lane, add `createdAt` to all three pre-existing resolver `--json` lists (`:838`, and the two remaining sites the tester cited), and update the R32 pins in lockstep.
4. `{"action":"lab","issue":849}`: after #814; on a push, the review/test chain; re-arm its wall-killed trigger.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 merges.
8. `{"action":"lab","issue":773}`: after #860; correct the LAB.md read-only scope claim and the phantom step reference; R1-R37 audit and pins in lockstep.
9. `{"action":"lab","issue":774}`: after #773; extend `setup.sh --check` to the full current roster and workflow set.
10. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #854: the test approved `039875d95`; the quality gate is dispatched. No merge before `approve-eval`; no duplicate eval on the next wake if it is live.
2. The eval marker must be bound to `039875d95`, newer than the 12:46:46Z test approval, and tied to the latest `/oc eval` trigger; then the PAT sweep merges. The eval dispatch is `{"action":"eval","pr":854}`.
3. The App-token push refusal is expected wrapper noise on a workflow-touching branch; the PAT step is authoritative. Do not route a post-mortem for it alone.
4. The 10:10Z and 11:12Z site-redeploy dispatches failed on empty artifacts; the live site is 200 and main is unchanged, so the last successful deploy of the same SHA is still serving. No new deploy this window because main did not move. If a later successful deploy does not appear and the site goes stale, investigate then.
5. The PR body is `Closes #803` + `Refs #853` with the `PR #854` prose; the merge will close #803 only if the verdict confirms all three slices.
6. #853 and #848 are closed; #803 stays open; #815 is closed; #831 is bookkeeping only.
7. Pages: production green on `e4844201`; the #854 PR-head deploy succeeded on `039875d95`; the failed redeploy dispatches changed no content.
8. The auditor daily slot fired late at 07:27Z; the 20-minute maintainer cron last fired at 05:01Z. The scheduler throttle (#831/#836) remains; no manual dispatch while the quota is the scarce resource.
9. #836 stays open for the Owner capacity decision. The merged slice restores rung 3 and aligns the contract only; do not close the issue.
10. #745 is done: merged `eca3be8e`, Pages green, #853 closed. #742 stays open for the remaining owner-credential work.
11. Model registry drift: the ladder is 3/3 on main and all three rungs are live; the free count is 10 at 12:48Z, with no rung retired. No lab dispatch.
12. Maintainer schedule/recover throttling: the declared 20-minute cron fires only a few times a day; the 12:46Z run is comment-triggered. The scheduler throttle (#831/#836) remains.
13. The 22:01Z curator agent completed green without a decision file on 2026-11-24; the bounded auto-retry dispatched the 22:11Z run, which decided `[]`. The 07:31Z curator draw is the next sample. A repeat across runs is a lab-round candidate; no issue opened (follow-ups belong to the Owner).
14. Workspace: this run's trusted pre-agent checkout is main `e4844201`; the CLI bootstrap checked out the PR head `039875d95` for this wake, so the session tree is on the PR head with project config disabled; the memory bundle came from the trusted log-branch tip `25e2ccb5`, `.maintainer/` is gitignored, and the tree is clean.
15. Memory: the 2026-11-25 file carries the 02:36Z session, the three run markers, the 05:01Z session, the 08:05Z session, the 10:10Z session, the 10:56Z session, the 11:12Z session, the 12:15Z session, and this 12:46Z session. The log publish is append-only with keep-both semantics. The `maintainer/logs` tip at materialization is `25e2ccb5`.
16. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round, not a standalone issue.
17. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
18. The merged tree carries the R26 canonical manifest in lockstep with `maintainer.yml`; the next lab pass must regenerate it if it edits that file.
19. No agent-side merge or dispatch this run beyond the eval dispatch and the board ping. The last verified merge is the selector PR at 2026-11-24T16:35:02Z.
20. The general job's ` /oc` substring matcher fired on the approve-test and handoff cohorts again at 12:46:5xZ (all siblings skipped or cancelled); watch item for a future lab round, no new issue.
21. No `emergency.json`: the maintainer workflow is alive, production is serving, and no failed lab attempt is being bypassed.
22. #773/#774 are re-queued after a month-long park. They were valid on `e4844201` when checked at 11:16Z; re-verify before dispatching in case the backlog pass folds them into #742.
23. **Resolver addendum (revised):** three pre-existing resolver sites remain on the head, `opencode.yml:839` (the baseline resolver the reviewer cited at `:838` on main), `:1162`, and `:1397`; all sort by `.createdAt` without requesting it. The touched build resolver at `:1056` is fixed. Fold all three plus pins into the #814 fix-lane hardening pass; do not edit the approved #854 head for them.
24. **Deferral cap wording (new, non-blocking):** `DEFERRAL_MAX_PRS` sets the page size while `--paginate` still fetches every open-PR page, so the header wording overstates it as a hard total cap. It cannot fail open and is not a merge blocker; fold into the same fix-lane pass if the wording should be literal.
25. **Design-lane note (future hardening only):** a manual design trigger placed on a PR thread would day-scope there; the designed issue invocation and the phase-completion forward are unaffected. Not a blocker, no action now.
26. The dispatched eval has no in-workflow auto-retry chain; if the wall kills it, the next Maintainer wake must read the verdict trail and re-arm a single fresh eval on the same head, not a burst.

## Standing rules I operate under

### Safety and autonomy

- Never post issue or PR comments directly; the only public artifacts are the files under `.maintainer/`. Never create an issue or PR, never run git commit/push/branch commands, never touch the brain, never `@copilot`, and never spawn a Copilot review. Never mention an agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception).
- Protected paths: `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, `LAB.md` (also `.github/scripts/` as touching credential wiring). Changing them requires the full review/test/eval chain and a PAT-backed push. The agent-write App token cannot push workflow files, so expect a public push-rejection on the branch; the lab's hardcoded PAT step performs the actual push.
- Unattended runs: an unattended ownerless PR is not consent. Never merge without a head-fresh test marker and a head-bound `approve-eval`, and never bypass branch protection.
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
- The pipeline is green on main (`e4844201`; the post-merge Pages deployment of the same SHA is live and the root is 200), and the platform is perf-sensitive: multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed seventeen review draws between 2026-11-22T01:34Z and 2026-11-24T09:34Z, the lab handoff at 12:54:48Z, the lab draws at 16:54:13Z, 23:15:37Z, 03:05:44Z, 05:10:20Z and 11:13:26Z, while fresh runners completed the 13:20 lab, 13:55 review, 14:31 test, 15:39 eval, 16:22 eval, the 16:35 merge, the 22:01-22:28Z curator draws, the 02:37Z, 05:01Z, 08:05Z, 10:10Z, 10:56Z, 11:12Z and 12:15Z Maintainer sessions, the 07:27-08:05Z auditor draw, the 08:22-10:09Z fifth #854 lab pass, the 10:50-11:12Z sixth #854 lab pass, the 11:13-12:15Z review auto-retry chain, the 12:15-12:46Z test run, and this 12:46Z session. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the quality-gate verdict on `039875d95`. On `approve-eval` with the test marker still current, run the merge preflight (main history, head re-read, required checks, mergeable, latest eval trigger), merge with the rebase path, verify, and close #803 only if all three slices are confirmed; keep the branch intact. On findings, dispatch a scoped lab pass on the same head. On a wall death, re-arm exactly one fresh eval on the same head.
2. Verify main is still `e4844201` (or advanced only through a verified merge), production is live, and the selector branch is intact at `c1040c0c`.
3. Then #812, #814 (with the three-site resolver `createdAt` addendum and the deferral cap wording), #849, #857, #856, #860 (only after #854 merges), #773, #774 in order, then #742's remainder.
4. Keep #836 open for the Owner capacity decision; #831 is bookkeeping only; #848, #853 and #815 are closed.
5. Verify the board invariant, allowlist, registry/ladder, live site, held runs, and schedule health; if clean, stand by.

## Open questions

1. Will the quality gate approve `039875d95`, or return findings?
2. Will the provider wall spare the eval runner long enough to finish, and does the single fresh re-arm on the next wake cover a wall death cleanly?
3. Will the merge sweep select the eval marker as the latest trigger and merge cleanly on the rebase path, closing #803 only if all three slices are confirmed?
4. The scheduler throttle is producing multi-hour gaps in every cron; does the Owner want to fold the scheduler and capacity work into the #836 decision?
5. Does the capacity tracker still need the Owner's per-egress-IP capacity decision now that the ladder is whole again?
6. The general job's ` /oc` substring matcher, the prompt-contract drift, and the deferral page-size wording remain watch items for a future lab round.
7. Should #773/#774 stay as separate lab targets, or be folded into the #742 remainder when the backlog clears?
