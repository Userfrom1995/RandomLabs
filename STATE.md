# STATE

Last updated: 2026-11-24T16:41Z by run 45438842413

(16:35:09Z merge-closed run: the health-board selector PR landed on main as a rebase merge at `e4844201`, the linked audit issue closed, the fresh production deployment is green on the new tip, and one lab pass is being re-armed on #854 against the new trunk; one board ping, no other triggers.)

## TL;DR for the next Hephaestus

- **This was the 16:35:09Z pull_request-closed run** for the merged health-board selector PR. Target: that PR, so the public artifact is a post-merge comment there plus one ping on the health board.
- **The protected merge landed.** The PR is `MERGED` at 16:35:02Z by the owner credential, rebase strategy; main advanced from `7fb030f2` to `e48442018bdf7ff794d8f9f6154f5e4e28fb5610` with the seven branch commits replayed. The merged tree is byte-identical to the gated head `c1040c0c` (tree hash equality verified), so the work that passed review, test, and eval is exactly what shipped.
- **The linked audit issue closed with the merge** at 16:35:04Z; the branch `opencode/lab-848-shared-health-board-selector` stays intact at `c1040c0c`. `#836` stays open and unlabelled for the Owner capacity decision.
- **Production is green on the new tip:** the post-merge Pages dispatch `45438833164` succeeded on `e4844201` (16:35:07-16:35:42Z), the live root returns 200, and the merged docs surface is serving. The preview path for the now-closed PR is gone, which is expected.
- **Decision this run: one `lab` on #854 + one health-board ping.** #854 is next in the serialized queue; it is re-armed against the fresh post-merge trunk so its audit rules reconcile with the merged owner-credential and board-selector rules. No other agent trigger is dispatched.
- **`#854` state:** head `090452f27c575a31e617bc5c7083c6ee441b0653` (single commit, 2026-11-15T07:37:21Z), base `e5cd250c`, CLEAN/MERGEABLE, 6 files +355/-60; round-1 lab findings still outstanding; no test or eval marker exists, so no merge is pending. Last owner instruction 2026-11-20T03:34:02Z.
- **`maintainer/logs` tip at materialization:** `1341fc508c679de8cf7d0fdcb578fd71bdc2abd9` (the 16:34:45Z `maintainer: memory update 2026-11-24T16:34Z` commit from the previous session).
- **Models:** registry 108 models / 10 free at 16:38Z; the pin and `small_model` are both `deepseek-v4.1-flash-free` and the three ladder rungs are live. No upgrade dispatch.
- **Held 0; queued the seven known stale runs; in progress this run only.** The pending 16:28Z maintainer wake `45437526037` was cancelled and this merge-closed run owns the lane.
- **Queue after this run:** #854 lab (live), then #812, #814, #849, #857, #856, #860 (only after #854), then #742's remainder. #836 stays open; #821 and the Maze Chase set stay parked.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the lab engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 16:35-16:41Z on 2026-11-24)

### GitHub state

- **Main:** `e48442018bdf7ff794d8f9f6154f5e4e28fb5610` (the rebase merge of the health-board selector work, 16:35:01Z, seven replayed commits since `7fb030f2`). **`maintainer/logs` live tip at materialization:** `1341fc50` (16:34:45Z).
- **Open PRs (2):**
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE (base `e5cd250c`, one commit, 2026-11-15T07:37:21Z, 6 files +355/-60); round-1 lab findings outstanding, no test or eval marker; **the lab pass re-armed in this run targets this head**. Its branch is textually conflict-free against the new trunk, but the semantic reconciliation with the merged rules is the lab's job.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale (base `86570af1`); no workflow files, so no merge sweep.
- **Open issues (23 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #831, #836, #849, #856, #857, #860. #848 closed at 16:35:04Z with the merge; no new issue. #836 is open and unlabelled for the Owner capacity decision; #803 stays open until all its slices land; #831 is bookkeeping only (resolved by merged #832 but opened with `Refs`).
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest note before this run: the 16:34:48Z board note; this run adds the 16:40Z ping.
- **Latest comments:** the thread ends with the previous session's 16:34:50Z "merge is landing now" note and this run's post-merge confirmation; #854 last 2026-11-20T03:34:02Z; #849 last 2026-11-20T03:34:03Z; #836 last 2026-11-21T18:11:34Z. No new human directive.
- **Branch tips:** main `e4844201`, `maintainer/logs` `1341fc50`, the landed branch `c1040c0c` (intact), #854 `090452f2`, #821 `dce109e4`. The #859 branch `opencode/issue858-curate-umbra-count-copy` stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3). **In progress:** this run only.
- **This run:** `45438842413`, `pull_request` closed at 16:35:09Z; the trusted pre-agent checkout is the new main `e4844201`; the CLI bootstrap put the session tree on the landed branch head `c1040c0c`; tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **Merge sweep:** the same run's protected step merged at 16:35:02Z (owner credential, rebase). The PR is `MERGED`, `closingIssuesReferences` was `[848]` only, and the branch was not deleted.
- **Post-merge Pages `45438833164`:** `workflow_dispatch` 16:35:07-16:35:42Z, success, head `e4844201`. The push-triggered deploy `45438828515` was cancelled because the dispatch superseded it; the PR-head deploy `45438842117` was skipped because the PR is closed. Root 200 at 16:38Z; the closed PR's preview path returns 503, which is expected after the artifact re-stage.
- **Post-merge checks on the PR:** trigger, comment and GitGuardian pass; deploy, recover, comment and detect skip; `maintainer` is this run and pending while it executes.
- **Eval `45428044346`:** 15:39:26-16:22:52Z, success; the Quality Council approved 9.9/10 at 16:22:36Z and the canonical eval marker bound `c1040c0c`.
- **Test `45414974133`:** 14:31:07-15:26:09Z, success; the canonical tester marker bound `c1040c0c` at 15:26:01Z.
- **Review (round 7) `45408548328`:** 13:55:58-14:31:07Z, success; approved with no findings and posted the test handoff at 14:31:03Z.
- **Lab `45402353907`:** the round-6 fix pass pushed `c1040c0c` at 13:54:22Z; the 13:55:41Z App-token "workflows permission" push rejection is the expected wrapper noise (the PAT-backed step landed the head).
- **Fan-out:** the merge-closed event's sibling arms all skipped; the 16:28Z false-positive maintainer wake `45437526037` was cancelled, as was `45437547143`; this run owns the single pending slot.
- **Schedules:** no new scheduled run since the 12:11:13Z maintainer tick. Today: auditor `45359855998` green 08:52-09:16Z, curator `45360350939` green 08:55-09:07Z, recover `45339887322` green 06:21Z. The scheduler throttle (#831/#836) remains.
- **Wall:** the last death was the 12:54:48Z lab handoff (issue #754). The 13:20 lab, 13:55 review, 14:31 test, 15:39 eval and the merge sweep all completed on fresh runners, so the allowance is open at this write.
- **Model registry:** fresh read 16:38Z: 108 models / 10 free; `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, and `nemotron-3.5-lightning-free` are all live. No Auditor recommendation, no upgrade dispatch.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Zero missing, zero extra (the three GitHub-managed workflows are outside the allowlist by design).
- **Audit:** the merged main carries R1-R37 (`R36` is the owner-PAT isolation rule, `R37` the universal board rule). The gated head ran 38 passed / 0 failed with the live board resolving to #70; the next daily pass on main should report the same matrix. Two low-severity doc drifts remain noted by earlier passes (`maintainer.yml` OUTPUT CONTRACT action list omits `sweep`/`create_issue`/`create_pr`; two stale `longcat-2.5-free` prompt examples) - fold into a future lab round, no new issue.

### Live lanes and their next step

- **#854 / #803 (protected-path slice 3):** the lab pass dispatched in this run rebases head `090452f27` onto `e4844201` and applies the full round-1 findings (the deferral guard and `Refs #853`, fail-closed head/enumeration reads, resolver fail-closed, wall-death fixture, R20 pins, AGENTS/LAB claims, delegation ledger). On push, the lab workflow forwards a fresh review; #803 stays open until all three slices land.
- **#812 / #814 (audit-harness backlog):** #812 is the R11 same-name shadowing with no `lab:` job scoping; #814 is the fail-open baseline read in the fix lane. Both still reproduce on main; #815 is fixed and closed. Next: after #854, with the R32 verify-body pin updated in lockstep.
- **#849 (fail-loud hardening):** lab trigger 2026-11-20T03:34:03Z; the trigger carries the expanded scope (including the #853 deferral guard). Next: after #812/#814, then #857, #856, #860 in that order (#860 only after #854).
- **#742 remainder (tracker):** open. The merged slice covers the 15 six-workflow steps; the other lanes still need the privileged launcher and the preamble, and the follow-ups remain (post-agent head check, evidence latches, per-OS `git_exec_path` pin, proxy/TLS keys). Candidate for a lab round after the serialized backlog; do not open a duplicate issue.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; the rung/contract slice is merged, but the per-egress-IP wall remains the only fix that ends the recurrence.
- **Public surface (curator lane):** last full pass green at 08:55:25-09:07:25Z with no repo changes; the self-heal re-dispatch died on the wall at 09:21:29Z and the bounded cap halted the chain. No same-pool retry; the next 6-hour cron re-arms.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw at a time; no same-pool burst. This run dispatches exactly one lab pass (#854) plus the board ping. If the lab draw dies on the wall, do not retry on the same pool; record and re-arm on a later wake.
- Do not dispatch #812/#814/#849/#857/#856/#860 until #854's pass lands; the serialized order keeps the shared audit script single-owner.
- The Pages preview for the closed PR disappearing is expected; production stays the only live surface and it is green.
- Never merge without a head-fresh tester marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardened PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#854 lab (live from this run):** rebase onto `e4844201` plus the full round-1 findings; on a push, the fresh review/test/eval chain; keep #803 open unless all its slices land.
2. `{"action":"lab","issue":812}`: after #854; scope R11 to the `lab:` job and update the R32 verify-body pin in lockstep.
3. `{"action":"lab","issue":814}`: after #812; fail-closed baseline read in the fix lane and update the R32 pin in lockstep.
4. `{"action":"lab","issue":849}`: after #814; on a push, the review/test chain.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
8. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #854: the re-armed pass is the live lane; verify its trigger posted and a run started. If the draw dies on the wall, no same-pool retry; record it in STATE/log and let a later wake re-arm.
2. The merge is complete and verified: PR `MERGED` at 16:35:02Z, main `e4844201`, merged tree identical to `c1040c0c`, linked audit issue closed, branch intact. The five gate markers on the head are preserved in the thread.
3. The 13:55:41Z wrapper App-token push rejection on the round-6 lab push is expected noise; the PAT step landed `c1040c0c` at 13:54:22Z. No post-mortem.
4. The general job's ` /oc` substring matcher fired on trigger prose in the eval report earlier today and produced two no-action notes plus one extra owner summon; the resulting wake was cancelled by this merge-closed run. Watch item for a future lab round; no new issue.
5. Pages: the two pre-merge dispatches at 13:56Z and 14:10Z failed in `actions/deploy-pages` artifact metadata after green uploads; the post-merge dispatch succeeded on `e4844201` and the root is 200. Do not loop further deploys.
6. Public surface: the 08:55-09:07Z schedule ran green; the bounded self-heal re-dispatch (`45362167705`) hit the wall at 09:21:29Z and the cap halted the chain. The exhaustion marker is triaged as allowance-class; the next 6-hour cron re-arms. No same-pool retry.
7. Health pass: the 08:52-09:16Z delayed schedule ran green and posted the daily audit; the next is the 2026-11-25T00:00Z slot.
8. #836 stays open for the Owner capacity decision. The merged slice restores rung 3 and aligns the contract only; do not close the issue.
9. #745 is done: merged `eca3be8e`, Pages green, #853 closed. #742 stays open for the remaining owner-credential work; the review's residual notes (other lanes lack the privileged launcher/preamble; proxy/TLS keys unpinned) are tracked there.
10. #848 is closed; #803 stays open until all its slices land.
11. #831 is resolved by merged #832 but remains open because that PR used `Refs`; bookkeeping only, no dispatch.
12. Model registry drift: the ladder is 3/3 on main and all three rungs are live; the free count is 10 at 16:38Z, with no rung retired. The newer free names in the registry have no Auditor recommendation; no lab dispatch.
13. Maintainer schedule/recover throttling: the declared 20-minute cron fires only a few times a day; the 16:22 and 16:35 wakes were routed summons, not schedule ticks. The scheduler throttle (#831/#836) remains, and the heartbeat lives in a throttled cron too.
14. Pages: production is green on `e4844201` at write time; the preview artifact redeploys on open-PR updates. The merged PR's preview is gone, which is expected.
15. Workspace: this run's trusted pre-agent checkout is main `e4844201`; the CLI bootstrap put the session tree on the landed head `c1040c0c`. The memory bundle came from the trusted log-branch tip, `.maintainer/` is gitignored, and the tree is clean.
16. Memory: the 2026-11-24 file carries the 01:53-01:58Z session, the 02:15Z quota marker, the recovered 06:22-06:29Z session, the 06:38Z quota marker, the 09:16-09:22Z session, the 09:21-09:36Z triage, the 12:11-12:18Z session, the 12:55Z intake marker, the 12:54-13:16Z triage, the 13:56-14:2xZ triage, the 14:31-14:4xZ triage, the 15:26-15:4xZ triage, the 16:22-16:3xZ triage, and this 16:35-16:4xZ merge-closed entry. The log publish is append-only with keep-both semantics. The `maintainer/logs` tip at materialization is `1341fc50`.
17. The 06:22Z session's memory commit was rejected three times by a transient `commit_refs_rules` server error; the recoverable bundle is restored in today's log. The 06:38Z intake committed successfully, the 09:16Z session committed `7b993018`, the 09:21Z session committed `4ace95c77`, the 12:11Z session committed `102671167`, the 12:55Z intake committed `c25849574`, the 13:20Z session committed `c376983ed`, the 13:56Z session committed `ebe7f971`, the 14:31Z session committed `21198af4`, the 15:26Z session committed `469d1b3c`, and the 16:22Z session committed `1341fc50`. No further recovery needed.
18. Prompt-contract drift (watch only, no new issue): the `maintainer.yml` OUTPUT CONTRACT action list omits `sweep`, `create_issue`, and `create_pr` while the staged prompt documents them; the workflow handles them. Fold into the next lab round, not a standalone issue.
19. Auditor doc drift (watch only, no new issue): the two stale `longcat-2.5-free` prompt examples remain; the prompts require a fresh registry query before use. Fold into the next lab round.
20. The merged tree carries the R26 canonical manifest in lockstep with `maintainer.yml`; the merge did not change it, and the next lab pass must regenerate it if it edits that file.
21. No agent-side merge or dispatch this run beyond the protected sweep and the one #854 lab trigger. The last verified merges are this one and #863 via the same sweep.
22. #815 was closed as completed at 09:21:36Z after verifying the `unset LAB_RUN_NONCE` hermeticity fix on main; no comment posted.
23. The public-surface self-heal cap message is expected behavior for a wall-class death, not an infra defect; the quota intake covers the wall and the cron re-arms.
24. The false-positive general run earlier today is the trigger-prose matcher, not a code defect; this time its extra wake was cancelled. Watch item only.

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

- This run's session is the merge-closed summon on the landed PR; the memory branch is `maintainer/logs`. The post-merge status comment on that PR is the public artifact, plus one health-board ping.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure. This run posts the merge confirmation and pings the board.
- The pipeline is green on main (`e4844201`; the post-merge Pages dispatch succeeded and the live root is 200), and the platform is perf-sensitive: multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed seventeen review draws between 2026-11-22T01:34Z and 2026-11-24T09:34Z and the lab handoff at 12:54:48Z, while fresh runners completed the 13:20 lab, 13:55 review, 14:31 test, 15:39 eval and this merge. Elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Verify the #854 lab trigger posted and a lab run started on the fresh trunk; if it is still working, wait. On a push, the lab workflow forwards a fresh review and the test/eval chain follows. If the draw dies on the wall, no same-pool retry; record and re-arm later.
2. Re-check the new trunk: main still `e4844201` (or advanced only through a verified merge), the post-merge Pages deployment green, and the landed branch intact at `c1040c0c`.
3. Read the next daily audit on main and confirm it reports R1-R37 green with the live board; fold any doc drift into the next lab round rather than a new issue.
4. Then #812, #814, #849, #857, #856, #860 in order (#860 only after #854 lands), then #742's remainder.
5. Keep #836 open for the Owner capacity decision; #831 is bookkeeping only; #803 stays open until all its slices land; #815 is closed; #848 is closed.
6. Verify the board invariant, allowlist, registry/ladder, Pages, held runs, and schedule health; if clean, stand by.

## Open questions

1. Will the re-armed #854 pass land on the fresh trunk without a new wall death, and does the rebase reconcile the merged R36/R37 numbering cleanly?
2. Does the merged selector and trusted-anchor work hold on the next daily audit on main, or does the daily pass surface a doc drift that needs a lab round?
3. The scheduler throttle is producing multi-hour gaps in every cron; does the Owner want to fold the scheduler and capacity work into the #836 decision?
4. Does the capacity tracker still need the Owner's per-egress-IP capacity decision now that the ladder is whole again?
5. The general job matches trigger prose in agent reports; is narrowing that matcher worth a future lab round, or is the occasional chaining wake acceptable?
