# STATE

Last updated: 2026-11-25T18:17Z by run 45670017235

(17:56Z event wake: the #854 repair pass landed head `d449afb93` with the six Quality Council fixes and signalled review; the head-bound review `45670001908` is live on that exact head, so this run posts the #854 note and one board ping and dispatches no duplicate gate. Main unchanged at `e4844201`; #803 stays open until the merge.)

## TL;DR for the next Hephaestus

- **This was the 17:56Z `issue_comment` wake (`45670017235`)**, summoned by a `/oc maintainer` handoff at 17:56:35Z immediately after the repair pass signalled review. The meaningful sibling is the 17:56:29Z `/oc review` forward; the review is live.
- **The repair landed:** head moved `039875d95` -> `d449afb93` with commits `e0df262ab` (deferral-guard trigger, marker, and date hardening; R20 whole-helper pins and mutation self-test; R37 post-failure fixture) and `d449afb93` (loud continue handoff and the doc corrections). 11 commits, 8 files, +1332/-77, CLEAN/MERGEABLE against `e4844201`. The body was rewritten to the round-3 summary and keeps `Closes #803` plus `Refs #853`.
- **I reproduced the full audit on the new head:** 38 passed, 0 failed with the live board check, plus `bash -n` clean. The review will re-run it independently.
- **No duplicate review/test/eval/merge:** review `45670001908` is running on `d449afb93` (agent step started 17:56:53Z). The approved test marker is on the old head `039875d95`, so the test gate must re-run on the new head after the review forwards it. No eval marker exists on the new head, so no merge.
- **If the review approves:** the review workflow forwards `/oc test`; let it run on `d449afb93`. After the test passes, the maintainer dispatch for the quality gate follows; merge only on a head-bound quality approval with a fresh test marker.
- **If the review returns findings:** scoped lab pass on the same branch; if it dies on the wall, one fresh re-arm on the next wake after confirming no live or queued run.
- **15:46Z silent-post failure did NOT recur:** the 17:23Z #854 comment and #70 board note landed (verified). The post-step hardening remains a queued watch item, not a new issue.
- **Main `e4844201`; `maintainer/logs` tip `3e869fb61`** (17:23:13Z). Models 108/10 free; ladder 3/3 live; allowlist 19 + self + 3 GitHub-managed = 23; board resolves `70`; production 200; held 0; the seven stale queued runs unchanged.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the lab engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 17:57-18:17Z on 2026-11-25)

### GitHub state

- **Main:** `e48442018bdf7ff794d8f9f6154f5e4e28fb5610` (the 2026-11-24T16:35:01Z selector merge; unchanged). **`maintainer/logs` tip:** `3e869fb61` (17:23:13Z, the 17:07Z session memory publish).
- **Open PRs (2):**
  - #854 `d449afb930e0cdc94eb2a7d49bc66415b30e323e`, CLEAN/MERGEABLE (base `e4844201`), 11 commits from main, 8 files +1332/-77. Round-3 repair landed at 17:56Z; review `45670001908` live on this head; checks `comment`/`trigger`/GitGuardian SUCCESS and `deploy` SKIPPED. The body keeps `PR #854` prose, `Closes #803`, `Refs #853`, the 38/0 verification block, the delegation ledger, and the skills line. The 12:46:46Z test approval is on the old head `039875d95` and does not carry to this head.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, Maze Chase Windows compatibility harness (base `86570af1`); untouched since 2026-11-07.
- **Open issues (23 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #831, #836, #849, #856, #857, #860. No new issue. #853, #848 and #815 are closed; #803 stays open until the merge confirms all three slices; #831 is bookkeeping only.
- **Board invariant holds:** `health-board.sh` resolves `70`; only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`).
- **Latest comments:** `/oc lab ...` (the 17:23:18Z repair instruction), the expected App-token push rejection at 17:56:18Z, the machine `/oc review` forward at 17:56:29Z, and the `/oc maintainer` handoff at 17:56:35Z that woke this run. No human comment after that at 18:17Z.
- **Branch tips:** main `e4844201`, `maintainer/logs` `3e869fb6`, #854 `d449afb93`, #821 `dce109e4`, the landed selector branch `opencode/lab-848-shared-health-board-selector` at `c1040c0c` (intact), the #859 branch `opencode/issue858-curate-umbra-count-copy` at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3). **In progress:** this run `45670017235` and review `45670001908`; pending review `45670017245` (from the `/oc maintainer` comment) will skip at the job gate.
- **This run:** `45670017235`, `issue_comment` at 17:56:40Z; trusted pre-agent checkout main `e4844201`, but the CLI bootstrap checked out the PR head `d449afb93` for this PR-thread wake (issue #831 caveat); session tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### The repair pass (run 45664234174)

- Started 17:23:24Z from the 17:23:18Z owner instruction; run-level success at 17:56:34Z.
- The agent step's own `##[end-action]` recorded `outcome=failure` at 17:56:24Z after about 32m45s of work, but the decision file was already `{"action":"review"}` and both commits were on the branch. This is the crash-resilience contract working: the post-agent verify saw a valid decision, the expected App-token push was refused at 17:56:18Z, the PAT step pushed, and the forward posted `/oc review` at 17:56:29Z.
- The pass's own work-state at 17:56:02Z still listed slice C as "not yet audited" and the LAB.md deferral bullet as not yet updated, but the final commit `d449afb93` contains both. My independent full audit on `d449afb93` reproduces 38/0, so the final head is consistent.
- Commits: `e0df262ab` "lab: harden the deferral guard trigger, marker, and date checks" and `d449afb93` "lab: fail loudly on a failed continue handoff and correct the fail-closed docs".

### Runs, CI and queues

- **Review `45670001908`:** created 17:56:35Z, `review` job in progress, agent step (`Run opencode reviewer`) started 17:56:53Z. It reads the current PR head, so it is bound to `d449afb93`.
- **Pending review `45670017245`:** created 17:56:40Z by the `/oc maintainer` comment; the job gate skips it. It cannot displace the real review (`queue: max`, `cancel-in-progress: false`).
- **The audit:** I ran `env -u LAB_RUN_NONCE HEALTH_BOARD_LIVE_CHECK=1 bash .github/scripts/silent-stall-audit.sh .github/workflows/opencode.yml` read-only on `d449afb93`; result 38 passed, 0 failed. `bash -n` is clean on `.github/scripts/deferral-guard.sh` and `.github/scripts/silent-stall-audit.sh`.
- **Pages:** production root returns 200 on `e4844201`; the 17:56:38Z production redeploy `45670010327` failed at 17:57:04Z on the known empty-artifact class, so the live site still serves the unchanged trunk. No main move this window.
- **Model registry:** 108 / 10 free at 18:10Z; pin and `small_model` `opencode/deepseek-v4.1-flash-free`; the three ladder rungs (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`) are live. No upgrade.
- **Allowlist:** 19 names plus the self-excluded maintainer = 20 repo-managed; live 23 = those 20 plus Dependabot Updates, Dependency Graph, and pages-build-deployment (GitHub-managed); zero missing, zero extra.
- **The general false-positive:** the 17:07Z report-token wake `45661432433` completed success at 17:13:59Z with signed no-action notes; its 17:13:52Z handoff run was skipped. No new false positive this window.
- **The 15:46Z silent-post failure did not recur:** the 17:23Z session's #854 summary and #70 note both exist.
- **Wall:** no wall this window; the repair pass ran about 33 minutes and signalled review.

### Live lanes and their next step

- **#854 / #803 (protected-path slices):** REVIEW LIVE on `d449afb93`. On approval the review forwards the test gate on the same head. After the test passes, the quality gate follows; merge only on a head-bound quality approval with a fresh test marker; close #803 only if all three slices are confirmed; never `--delete-branch`. On findings, one scoped lab pass; on a wall death, one fresh re-arm on the next wake.
- **The 15:46Z post-step silent failure:** hardening watch item; the last two sessions posted correctly. Fold into the next lab round (candidate: the #742 remainder); no duplicate issue while the backlog is serialized.
- **#812 / #814 (audit-harness backlog):** #812 is R11 same-name shadowing with no `lab:` job scoping; #814 is the fail-open baseline read in the fix lane. Both reproduce on main. Next after #854, with the R32 verify-body pin updated in lockstep. #814 includes the three-site resolver `createdAt` addendum and the deferral page-size wording.
- **#849 (fail-loud hardening):** queued after #812/#814; needs a fresh trigger when it reaches the head of the queue.
- **#857 / #856 / #860 (fail-loud backlog):** serialized after #849; #860 shares `opencode-review.yml` with the #854 lane, so it cannot start before #854 merges.
- **#773/#774:** the LAB.md read-only-scope contradiction plus the phantom step reference, and the stale `setup.sh --check` roster; verified on `e4844201`; parked as the post-delivery batch.
- **#742 remainder (tracker):** open; the candidate lane for the remaining owner-credential steps and follow-ups after the serialized backlog.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; the per-egress-IP wall remains the only fix that ends the recurrence.
- **#821 / #792** (Maze Chase Windows harness): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw at a time; no same-pool burst. This run spends zero agent draws: the review is already live from the lab forward, and this session only posts its artifacts.
- **Checkpoint rule:** if #854's head advances with partial commits and a pass dies without signalling review, do NOT dispatch a review on that partial head. Read the decision/comment and the commit messages; only a `review` signal (or an explicitly complete pass) authorizes the review/test/eval chain.
- **Review retry rule:** the review workflow has its bounded auto-retry chain (the #754/#827 rule). Do not dispatch a duplicate while a review retry is live or queued.
- **Test rule:** the test approval is head-bound. The old `039875d95` marker does not authorize a merge on `d449afb93`; a fresh test marker on the new head is required.
- **Eval retry rule:** the eval lane has no in-workflow auto-retry chain; if an eval dies on the wall or crashes without a decision, the next Maintainer wake re-arms exactly one fresh eval on the same head after confirming no live or queued eval.
- Do not dispatch #812/#814/#849/#857/#856/#860/#773/#774/#742 until the #854 lane is known (merged or verdict); the serialized order keeps the shared audit script single-owner.
- Never merge without a head-fresh test marker and a head-bound quality approval. Workflow-touching PRs merge only through the hardened PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#854:** review live on `d449afb93`; then test on the same head; then the quality gate; merge only on a head-bound quality approval with a fresh test marker; #803 open until the merge confirms all three slices.
2. `{"action":"lab","issue":812}`: after #854; scope R11 to the `lab:` job and update the R32 verify-body pin in lockstep.
3. `{"action":"lab","issue":814}`: after #812; fail-closed baseline read in the fix lane, add `createdAt` to all three pre-existing resolver `--json` lists, and update the R32 pins in lockstep.
4. `{"action":"lab","issue":849}`: after #814; on a push, the review/test chain; re-arm its wall-killed trigger.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 merges.
8. `{"action":"lab","issue":773}`: after #860; correct the LAB.md read-only scope claim and the phantom step reference; R1-R37 audit and pins in lockstep.
9. `{"action":"lab","issue":774}`: after #773; extend `setup.sh --check` to the full current roster and workflow set.
10. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #854: review live on `d449afb93`; no merge before the fresh review, the test gate on the new head, and a head-bound quality approval. The test marker on `039875d95` is stale for this head.
2. The full audit (38/0), `bash -n`, the strict YAML parse, `git diff --check`, and the dash scan are verified on `d449afb93`; the review re-runs them independently.
3. The agent step in the repair run recorded `outcome=failure` after the decision file was written. The work landed and the final head passes the audit. Watch whether this end-of-session failure class recurs; if it does, a lab hardening item.
4. The 15:46Z post failure did not recur; the 17:23Z and this run's artifacts posted correctly. The step's success line is still untrusted until verified.
5. #853, #848 and #815 are closed; #803 stays open; #831 is bookkeeping only.
6. Pages: production 200 on `e4844201`; the 17:56Z redeploy failed on the empty-artifact class; no new deploy until main moves.
7. The PR body is `Closes #803` + `Refs #853` with the `PR #854` prose; the merge closes #803 only if the verdict confirms all three slices.
8. #836 stays open for the Owner capacity decision; the merged slice restored rung 3 and aligned the contract only.
9. Model registry drift: 108 / 10 free at 18:10Z; the ladder is 3/3 on main and all three rungs are live. No lab dispatch.
10. #821 stays parked; the Maze Chase standing set is frozen unless the Owner asks.
11. The seven stale queued runs are unchanged; do not cancel or re-dispatch them.
12. Memory: the 2026-11-25 file carries the 02:36Z session, the three run markers, the 05:01Z, 08:05Z, 10:10Z, 10:56Z, 11:12Z, 12:15Z, 12:46Z, 13:11Z quota marker, 15:46Z, 17:07Z, and this 17:56Z session. Append-only, keep-both; the `maintainer/logs` tip is `3e869fb6`.
13. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round.
14. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
15. The merged tree carries the R26 canonical manifest in lockstep with `maintainer.yml`; the next lab pass must regenerate it if it edits that file.
16. No `emergency.json`: the maintainer workflow is alive, production is serving, and no failed lab attempt is being bypassed.
17. The general job's contains-based `/oc` matcher fired again on 2026-11-25's eval report; watch item for a future lab round, no new issue.
18. **Resolver addendum:** three pre-existing resolver sites remain on the head, `opencode.yml:839` (the baseline resolver the reviewer cited at `:838` on main), `:1162`, and `:1397`; all sort by `.createdAt` without requesting it. Fold all three plus pins into the #814 fix-lane hardening pass.
19. **Design-lane note:** a manual design trigger placed on a PR thread would day-scope there; the designed issue invocation and the phase-completion forward are unaffected. No action now.
20. **Eval recovery watch:** the 13:10Z eval wall death was carried by the next-wake re-arm, and the 16:00Z eval succeeded. If wall deaths repeat across eval draws, consider whether the eval lane needs a bounded fresh-run chain; no duplicate issue while #836 and the backlog are open.
21. **Repair-run end-state:** the agent step ended failure after the decision and commits; the run-level success and the PAT push landed both commits. Do not treat the step outcome as a lost pass; verify the head, not the step status.

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

- This run's session is an `issue_comment` wake whose target is #854; the public artifacts are the #854 comment and one #70 ping.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure. This run comments on #854 and pings #70.
- The pipeline is green on main (`e4844201`; the post-merge Pages deployment of the same SHA is live and the root is 200), and the platform is perf-sensitive: multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed the lab draws at 16:54:13Z, 23:15:37Z, 03:05:44Z, 05:10:20Z, 11:13:26Z and the eval draw at 13:10:30Z on 2026-11-24/25, while fresh runners completed the 12:15Z review, 12:46Z test, 16:00-17:08Z eval, 17:23-17:56Z repair pass, and this session. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Watch review `45670001908` on `d449afb93`. On approval, confirm the forwarded test gate starts on the same head; do not dispatch a duplicate. On findings, one scoped lab pass on the same branch. On a wall death, one fresh re-arm after confirming no live or queued run.
2. After the test passes, dispatch the quality gate on the same head (the eval lane has no auto-retry; one fresh re-arm on a wall death). Merge only on a head-bound quality approval with a fresh test marker; close #803 only if all three slices are confirmed; never `--delete-branch`.
3. Verify this run's #854 comment and #70 ping posted; if not, correct them in the next comment.
4. Then #812, #814 (with the three-site resolver `createdAt` addendum and the deferral page-size wording), #849, #857, #856, #860 (only after #854 merges), #773, #774, then #742's remainder.
5. Keep #836 open for the Owner capacity decision; #831 is bookkeeping only; #848, #853 and #815 are closed; #821 stays parked.
6. Verify the board invariant, allowlist, registry/ladder, live site, held runs, and schedule health; if clean, stand by.

## Open questions

1. Will the review approve `d449afb93`, or return findings?
2. Will the provider wall spare the review, test, and quality-gate runners long enough to finish?
3. Does the review's bounded auto-retry chain cover a wall death on this head?
4. Does the repair run's end-of-session agent-step failure (after the decision file and commits) recur? If so, a lab hardening item, not a new issue while the backlog is serialized.
5. Should the silent-post hardening fold into #742's remainder? (Owner follow-up; not created here.)
6. The general job's contains-based matcher, the prompt-contract drift, and the deferral page-size wording remain watch items for a future lab round.
7. Should #773/#774 stay as separate lab targets, or be folded into the #742 remainder when the backlog clears?
