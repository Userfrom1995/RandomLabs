# STATE

Last updated: 2026-11-25T02:45Z by run 45534155917

(02:36Z heartbeat tick: the 22:39Z #854 lab draw died on the provider wall at 23:15:37Z after 36 minutes with no push, so the branch is still rebase-only. This run re-arms the full round-1 pass and posts one board note. This session is itself a working fresh draw at 02:37Z, which is the window test. Main unchanged at `e4844201`; no merge, no review/test/eval on the rebase-only head.)

## TL;DR for the next Hephaestus

- **This was the 02:36Z heartbeat run (issue #836)**, the first Maintainer session since 22:35Z; the `reason` input names the heartbeat. Expected wake, not a duplicate trigger.
- **#854 is unchanged:** head `8a45f9a4` (rebase-only onto trunk `e4844201`, patch-id `ee23b86e`, 6 files +355/-60), CLEAN/MERGEABLE, no tester/eval marker, no fresh review, body still `Closes #803` with no `Refs #853`. The 22:39Z lab draw ran 36 minutes and died on the wall at 23:15:37Z before the push; all round-1 findings remain outstanding.
- **The lane is re-armed this run** with the full round-1 instruction. One draw only; no burst.
- **The 23:16Z quota intake** stood down, posted the wall note, and dispatched no fresh run (the marker-gated recovery step does not fire for a lab-run failure); the heartbeat is the independent re-arm.
- **Main `e4844201`; `maintainer/logs` tip at materialization `43ffb3dd`** (23:16Z memory commit). Production Pages 200. Zero held runs; the seven known stale queued runs remain.
- **Models:** registry 108 / 10 free at 02:40Z; pin and `small_model` are `deepseek-v4.1-flash-free`; the three ladder rungs are live. No upgrade dispatch.
- **Allowlist:** 19 names plus the self-excluded maintainer = 20 repo-managed; zero missing, zero extra.
- **Queue:** #854 lab (re-armed), then #812, #814, #849, #857, #856, #860, then #773/#774 (verified still valid and re-queued after a long park), then #742's remainder. #836 stays open.
- **New this run:** #773 and #774 re-queued. No new issue, PR, human comment, or workflow failure since 23:16Z. The 00:00Z auditor slot did not fire (scheduler throttle); no dispatch.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the lab engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 02:36-02:45Z on 2026-11-25)

### GitHub state

- **Main:** `e48442018bdf7ff794d8f9f6154f5e4e28fb5610` (the 16:35:01Z rebase merge of the health-board selector work; unchanged since). **`maintainer/logs` live tip at materialization:** `43ffb3dda135adfd9204b794bd8f46bf982a975c` (23:16Z, the quota-intake memory commit).
- **Open PRs (2):**
  - #854 `8a45f9a4fe14d48ad856a93c61465a8482507391`, `Closes #803`, CLEAN/MERGEABLE (base `e4844201` = trunk tip, one commit dated 2026-11-24T16:42:20Z, 6 files +355/-60). **The head is a pure rebase of the round-1 head `090452f27`; no round-1 finding landed.** No tester/eval marker; no fresh review. The body still needs `Refs #853` and the `Closes #803` -> `Refs #803` switch unless all three slices land. **This run re-armed the full pass.**
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale (base `86570af1`); no workflow files; untouched since 2026-11-07.
- **Open issues (23 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #831, #836, #849, #856, #857, #860. No new issue. #848 closed at 16:35:04Z; #853 closed; #803 stays open until all its slices land; #831 is bookkeeping only.
- **#773/#774 verified still valid on main:** `LAB.md:611` still says "Read-only agents (Reviewer, Tester, Auditor, Ideator) carry no extra scope" and `LAB.md:1375` still names the phantom "ownership-gated restore-head" step; `setup.sh` still lists only the pre-#743 agent prompts and six core workflows. Both have been parked since October as the post-delivery batch; #745 is done, so they are re-queued after #860. No dispatch now.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest note before this run: the 02:36:21Z heartbeat marker; this run adds the 02:45Z ping.
- **Latest comments:** no human comment since the 22:39:40Z owner `/oc lab` instruction. The only newer comments are the 23:16:41Z quota intake note and the 02:36:21Z heartbeat marker (both bot). No new directive.
- **Branch tips:** main `e4844201`, `maintainer/logs` `43ffb3dd`, #854 `8a45f9a4`, #821 `dce109e4`, the landed selector branch `c1040c0c` (intact), #859 `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3). **In progress:** this run only. **Pending:** none.
- **This run:** `45534155917`, `workflow_dispatch` (heartbeat reason) at 02:36:23Z; trusted pre-agent checkout main `e4844201`; session tree on main `e4844201`; tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **Lab Engineer `45503006819`:** failure. The agent step ran 22:39:55-23:16:03 (36m08s), hit the provider daily free-usage wall at 23:15:37Z (`AI_APICallError: Free usage limit reached`, `FreeUsageLimitError`, HTTP 429, model `deepseek-v4.1-flash-free`), and the verify step failed because no decision file was written. The push step skipped, so the branch stayed at `8a45f9a4`. The run log shows substantial uncommitted edits to `silent-stall-audit.sh`, the workflows, and the docs; all of it was lost with the runner. The wall is not retryable on the same egress and did not consume the stall retry.
- **Maintainer intake `45508513509`:** green 23:16:17-23:16:53Z. The quota-wall intake saw the failed lab run, stood this run down (no agent summon), and posted the 23:16:41Z #70 note. The marker-gated fresh-run recovery step found no `.maintainer/quota-wall` in its own workspace (the failure was a lab run, not this run's agent), so it exited silently and no fresh run was dispatched. **The heartbeat is the designed re-arm.**
- **Recover schedule `45534080985`:** green 02:35:45Z; detect success, recover skipped (no closed/orphaned build PR), and it dispatched the 02:36:21Z heartbeat marker plus this run.
- **Maintainer `workflow_run` sibling `45534167419`:** skipped at 02:36:28Z (it only runs on failed/timed-out workflows). No failure summon.
- **No failure since 23:15:37Z.** The only red run overnight is the #854 lab draw.
- **Wall:** the last death is the 22:39Z lab draw at 23:15:37Z. This Maintainer session is a fresh agent draw working at 02:37Z, so the allowance is empirically usable on a fresh runner now; a single draw is the window test, never a burst. The 16:54Z retry-after (about 00:14Z) was diagnostic only.
- **Model registry:** fresh read 02:40Z: 108 models / 10 free; `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free` and the other free names are live. No Auditor recommendation, no upgrade dispatch.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Zero missing, zero extra (the three GitHub-managed workflows are outside the allowlist by design).
- **Audit:** the merged main carries R1-R37 (`R36` owner-PAT isolation, `R37` universal board). The current #854 patch adds no new audit rule; the next pass that implements the deferral guard owns the R38 addition and the R1-R37 -> R1-R38 renumbering plus every hash/manifest pin in the same head.
- **Pages:** production root returns 200 on `e4844201`; the last production deploy is the 16:54:51-16:55:26Z owner-credential dispatch `45442610396` (success); the #854 PR-head deploy `45442588672` succeeded on `8a45f9a4`.
- **Schedule health:** no maintainer scheduled tick between 22:35Z and this heartbeat (the 20-minute cron is throttled to a few runs per day); the daily auditor 00:00Z slot did not fire either. Both are the known scheduler throttle, not lane failures. The curator 6-hour cron's next slot is about 04:00Z.

### Live lanes and their next step

- **#854 / #803 (protected-path slice 3):** the lab re-arm is this run's decision. The instruction re-arms the full 22:39:40Z scope: the #853 deferral guard and `Refs #853`, fail-closed head/enumeration reads for all ten counters with no `|| true` after the pipeline, HTTP-error/malformed/future-date rejection, resolver fail-closed with `--limit 100`, the wall-death-after-a-fresh-head fixture, the R20 scope-wrapper pins with the pre-handler manifest/tester hash pins regenerated, the AGENTS/LAB corrections, the full R1-R37 audit with the live board (expect 38/0), and the truthful delegation ledger/skills line. Keep #803 open unless all three slices land.
- **#812 / #814 (audit-harness backlog):** #812 is R11 same-name shadowing with no `lab:` job scoping; #814 is the fail-open baseline read in the fix lane. Both still reproduce on main; #815 is fixed and closed. Next: after #854, with the R32 verify-body pin updated in lockstep.
- **#849 (fail-loud hardening):** its 2026-11-20T03:34:03Z trigger died on the wall (run `44668604966`); it stays queued after #812/#814 and will need a fresh trigger when it reaches the head of the queue.
- **#773/#774 (newly re-queued):** #773 is the LAB.md read-only-scope contradiction plus the phantom "ownership-gated restore-head" step reference; #774 is the stale `setup.sh --check` roster. Both verified valid on `e4844201` and parked since October as the post-delivery batch. Queue after #860; no dispatch until the backlog clears.
- **#857 / #856 / #860 (fail-loud backlog):** accepted and serialized after #849; #860 shares `opencode-review.yml` with the #854 lane, so it cannot start before #854 lands.
- **#742 remainder (tracker):** open. The merged slice covers the 15 six-workflow steps; the other lanes still need the privileged launcher and preamble, and the follow-ups remain. Candidate for a lab round after the serialized backlog; do not open a duplicate issue.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; the rung/contract slice is merged, but the per-egress-IP wall remains the only fix that ends the recurrence.
- **Public surface (curator lane):** green at 22:01-22:28Z with no repo changes; the next 6-hour cron re-arms at about 04:00Z; no same-pool retry. Watch the no-decision-then-retry pattern.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw at a time; no same-pool burst. This run spends exactly one agent draw: the #854 lab pass.
- Do not dispatch #812/#814/#849/#857/#856/#860/#773/#774/#742 until #854's pass lands; the serialized order keeps the shared audit script single-owner.
- The #854 rebase is textually clean against the trunk; the next pass must still reconcile the merged R36/R37 rules semantically and regenerate the pins.
- Never merge without a head-fresh tester marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardened PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#854 lab (re-armed this run):** the full round-1 findings pass on head `8a45f9a4`; on a push, the fresh review/test/eval chain; keep #803 open unless all its slices land.
2. `{"action":"lab","issue":812}`: after #854; scope R11 to the `lab:` job and update the R32 verify-body pin in lockstep.
3. `{"action":"lab","issue":814}`: after #812; fail-closed baseline read in the fix lane and update the R32 pin in lockstep.
4. `{"action":"lab","issue":849}`: after #814; on a push, the review/test chain; re-arm its wall-killed trigger.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
8. `{"action":"lab","issue":773}`: after #860; correct the LAB.md read-only scope claim and the phantom step reference; R1-R37 audit and pins in lockstep.
9. `{"action":"lab","issue":774}`: after #773; extend `setup.sh --check` to the full current roster and workflow set.
10. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #854: the lab pass is re-armed this run; if the draw dies on the wall, no same-pool retry; record and re-arm on the next wake.
2. The 22:39Z draw lost about 36 minutes of uncommitted work; nothing partial is on the branch; the next pass redoes it from the detailed instruction.
3. This session is a working fresh draw at 02:37Z; the heartbeat is the designed wake, not a duplicate trigger.
4. Wall: the last death is 23:15:37Z. The 16:54Z retry-after (about 00:14Z) was diagnostic only and is now past; elapsed time alone is not proof, so the fresh-run lottery stays the recovery.
5. The PR body is still `Closes #803` with no `Refs #853`; the next lab pass must apply the conditional linkage and keep `PR #854` in prose.
6. Pages: production green on `e4844201`; the #854 PR-head deploy succeeded on `8a45f9a4`; no loop.
7. The 00:00Z auditor slot did not fire (scheduler throttle); the next delivered schedule will run the daily audit. No manual dispatch while the quota is the scarce resource.
8. #836 stays open for the Owner capacity decision. The merged slice restores rung 3 and aligns the contract only; do not close the issue.
9. #745 is done: merged `eca3be8e`, Pages green, #853 closed. #742 stays open for the remaining owner-credential work.
10. #848 is closed. #803 stays open until all its slices land. #853 is closed and is referenced by the #854 body on the next pass.
11. #831 is resolved by merged #832 but remains open because that PR used `Refs`; bookkeeping only, no dispatch.
12. Model registry drift: the ladder is 3/3 on main and all three rungs are live; the free count is 10 at 02:40Z, with no rung retired. No lab dispatch.
13. Maintainer schedule/recover throttling: the declared 20-minute cron fires only a few times a day; this 02:36Z heartbeat is the first Maintainer session since 22:35Z. The scheduler throttle (#831/#836) remains.
14. The 22:01Z curator agent completed green without a decision file; the bounded auto-retry dispatched the 22:11Z run, which decided `[]`. A repeat across runs is a lab-round candidate; no issue opened (follow-ups belong to the Owner).
15. Workspace: this run's trusted pre-agent checkout is main `e4844201`; the session tree is on main; the memory bundle came from the trusted log-branch tip `43ffb3dd`, `.maintainer/` is gitignored, and the tree is clean.
16. Memory: the 2026-11-25 file starts with this session; the 2026-11-24 file carries the earlier sessions through the 23:16Z intake marker. The log publish is append-only with keep-both semantics. The `maintainer/logs` tip at materialization is `43ffb3dd`.
17. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round, not a standalone issue.
18. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
19. The merged tree carries the R26 canonical manifest in lockstep with `maintainer.yml`; the next lab pass must regenerate it if it edits that file.
20. No agent-side merge or dispatch this run beyond the #854 lab and the board ping. The last verified merge is the selector PR at 16:35:02Z.
21. The general job's ` /oc` substring matcher fired on trigger prose in the eval report earlier today and produced two no-action notes plus one extra owner summon; the resulting wake was cancelled. Watch item for a future lab round; no new issue.
22. No `emergency.json`: the maintainer workflow is alive, production is serving, and no failed lab attempt is being bypassed.
23. #773/#774 are re-queued after a month-long park. They were valid on `e4844201` when checked at 02:40Z; re-verify before dispatching in case the backlog pass folds them into #742.
24. The quota intake run `45508513509` did not dispatch a fresh run because the marker-gated step had no marker; the one-attempt chain is not spent, and the heartbeat is the independent re-arm. Do not read its silence as a recovery failure.

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

- This run's session is a heartbeat tick with no target; the memory branch is `maintainer/logs`. The public artifacts are the health-board ping and the #854 lab trigger.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure. This run pings the board and triggers the lab.
- The pipeline is green on main (`e4844201`; the post-merge Pages deployment succeeded and the live root is 200), and the platform is perf-sensitive: multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed seventeen review draws between 2026-11-22T01:34Z and 2026-11-24T09:34Z, the lab handoff at 12:54:48Z, the lab draws at 16:54:13Z and 23:15:37Z, while fresh runners completed the 13:20 lab, 13:55 review, 14:31 test, 15:39 eval, 16:22 eval, the 16:35 merge, the 22:01-22:28Z curator draws, and this 02:37Z Maintainer session. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #854 lab outcome. On a push, a fresh review is forwarded; keep #803 open unless all three slices land, and confirm the body switch (`Refs #803`, `Refs #853`).
2. If the draw died on the wall, no same-pool retry; record and re-arm on a later wake.
3. Verify main is still `e4844201` (or advanced only through a verified merge), production Pages green, and the selector branch intact at `c1040c0c`.
4. Then #812, #814, #849, #857, #856, #860, #773, #774 in order (#860 only after #854 lands), then #742's remainder.
5. Keep #836 open for the Owner capacity decision; #831 is bookkeeping only; #848 and #853 are closed; #815 is closed.
6. Verify the board invariant, allowlist, registry/ladder, Pages, held runs, and schedule health; if clean, stand by.

## Open questions

1. Will the fresh #854 draw complete the full pass inside the provider window, or die on the wall again?
2. Will the curator no-decision-then-retry pattern recur across runs (a lab-round candidate)?
3. The scheduler throttle is producing multi-hour gaps in every cron and dropped the 00:00Z auditor slot; does the Owner want to fold the scheduler and capacity work into the #836 decision?
4. Does the capacity tracker still need the Owner's per-egress-IP capacity decision now that the ladder is whole again?
5. The general job matches trigger prose in agent reports; is narrowing that matcher worth a future lab round, or is the occasional chaining wake acceptable?
6. Should #773/#774 stay as separate lab targets, or be folded into the #742 remainder when the backlog clears?
