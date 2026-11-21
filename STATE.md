# STATE

Last updated: 2026-11-21T22:15Z by run 44954976033

(schedule-tick checkpoint: the allowance wall still governs and no heavy completion has landed since the afternoon final-quality pass, so the rebase lane and the serialized queue stay parked; the trunk, production, audit, ladder, and board are unchanged.)

## TL;DR for the next Hephaestus

- **The allowance wall is still the only blocker and this schedule tick stands down.** The last heavy deaths remain 18:16:52Z (#850 lab, retry-after about 6h08m) and 19:21:55Z (curator retry, retry-after about 5h25m), pointing at a reset horizon around 00:25-00:47Z. No heavy lane has completed since the 17:04-17:44Z final-quality pass, so no fresh draw is spent into a pool that is still reporting blocked.
- **The next wake paths are the 00:00Z curator tick and the recover heartbeat.** The curator cron is every six hours and its 18:00Z tick was lost to the wall; the 00:00Z nominal tick re-arms with a fresh self-heal budget. The recover heartbeat remains the independent liveness path.
- **#850 is still conflict-dirty and its rebase draw is wall-dead.** The lab run dispatched by the 17:52 session (44934594728) died on the same allowance at 18:16:52Z with no decision file and no push; the branch is unchanged at `9c9bf1bd`. Do not re-arm until the allowance clears and a clean heavy completion lands; then the fresh review/test/eval chain follows on the rebased head.
- **Main is unchanged at `7fb030f2`.** Production is green (Pages `44932381420`, success 17:52:11Z; live root HTTP 200). The full audit is 37/0 (R1-R36) on this tree, verified at 18:09-18:13Z; this run's local re-run reached 28 PASS/0 FAIL before its local timeout, consistent with the unchanged tree.
- **The board invariant holds:** #70 is the only open `lab-health` issue with the exact title; #42 is the only other labelled issue (`brainstorm`). No new issue since 2026-11-19T06:48Z; no new PR, comment, or human directive.
- **Models:** registry 104 models / 11 free at 22:07Z; pin and `small_model` both `deepseek-v4.1-flash-free`; the ladder is 3/3 live (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`). No upgrade dispatch.
- **Held runs 0; queued the seven known stale runs; in progress this run.** The allowlist is 19 repo names plus the self-excluded `maintainer`, matching all 20 repo-managed workflow names.
- **Queue after #850:** #854 lab, #849 lab, #857, #856, #860 (only after #854), then #742's remainder. #836 stays open for the Owner capacity decision; #821 and the Maze Chase set stay parked.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 22:06-22:15Z on 2026-11-21)

### GitHub state

- **Main:** `7fb030f275a67956d3ce882f6c22a7102d49cf44` (the #863 rebase merge, 17:52:03Z). The tree is unchanged since the 17:52-19:30Z checkpoints. **`maintainer/logs` pre-run tip:** `504baa14952682fb073b06207fa808649d049b45` (the 19:30Z memory commit).
- **Open PRs (3):**
  - #850 `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, **CONFLICTING/DIRTY** against main `7fb030f2` (base `620bb8d2`); the rebase lab run 44934594728 died on the wall at 18:16:52Z with no push; the old test approval does not bind a rebased head and is not in the canonical first-line shape.
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE, base `e5cd250c`; last trigger 2026-11-20T03:34:02Z; branch unchanged; needs fresh gates after its lab round.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale, base `86570af1`.
- **Open issues (25 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #856, #857, #860. #836 is open for the Owner capacity decision; no new issue since 2026-11-19T06:48Z. #677/#678/#659 are the long-frozen Maze Chase standing set under #582, not new triage; do not route them without the Owner. #742 stays open; #848 closes on #850; #803 stays open until all its slices land; #831 is resolved by merged #832 but remains open (that PR used `Refs`), bookkeeping only.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest notes: 18:16:13Z post-merge status, 18:17:46Z quota-wall intake (Lab Engineer), 19:22:12Z self-heal escalation, 19:22:36Z quota-wall intake (curator), 19:28:45Z decision ping, 19:28:56Z curator triage note. This run posts the schedule status ping.
- **Latest comments:** #70 ends at the 19:28:56Z triage note; #836 carries the 18:11:34Z reopen note with the sign-off; #850 last note 18:16:15Z (the rebase trigger); #854 last trigger 2026-11-20T03:34:02Z; #849 last trigger 2026-11-20T03:34:03Z; #848/#803 remain open. No new human directive and no new issue or PR.
- **Branch tips:** main `7fb030f2`, `maintainer/logs` `504baa14`, #850 `9c9bf1bd`, #854 `090452f2`, #821 `dce109e4`. The #859 branch `opencode/issue858-curate-umbra-count-copy` stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3); no live maintainer sibling. **In progress:** this run.
- **This run:** `44954976033`, `schedule` tick created at 22:06:20Z, global target; workspace at main `7fb030f2`; tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **Recover 20:39Z tick:** `44947415290` (schedule) completed in 17 seconds; the detect job found no recovery due and the heartbeat step ran at 20:39:32Z, but the last real session was 19:29Z (about 70 minutes), so it did not dispatch; the workflow_run maintainer at 20:39:40Z skipped. No heavy agent ran.
- **Maintainer schedule gap:** the previous schedule tick was 16:56:05Z; this one is 22:06:20Z, a five-hour-ten-minute gap, the known throttling class (#831/#836). The recover heartbeat remains the independent liveness path.
- **#850 lab draw:** `44934594728` (18:16:17-18:17:21Z) died on the wall at 18:16:52Z (retry-after about 22069s, about 6h08m), no decision file, no push; the branch is unchanged at `9c9bf1bd`.
- **Curator 18:00Z cycle:** the 18:48:58Z schedule run's agent died on the daily free-usage wall at 19:00:00Z; its one bounded re-dispatch (`44938554549`, 19:00:19-19:22:14Z) died on the same wall at 19:21:55Z (retry-after 19534s, about 5h25m), then hit the cap and posted the escalation at 19:22:12Z. The cycle is lost; the next nominal tick is 00:00Z.
- **Pages:** last deploy `44932381420` success 17:52:11-17:52:57Z on `7fb030f2`; the live root returns HTTP 200.
- **Audit:** full `env -u LAB_RUN_NONCE bash .github/scripts/silent-stall-audit.sh` on a clean `7fb030f2` clone: **37 passed, 0 failed (R1-R36)** (verified 18:09-18:13Z; the tree is unchanged). This run's local re-run reached 28 PASS/0 FAIL before its 180s local timeout, consistent.
- **This run's fan-out:** none; this is a schedule tick, and the workflow_run maintainer runs after the 19:22 failures all skipped or were cancelled on the single-slot group; no duplicate agent ran.
- **Wall:** last deaths 19:21:55Z (curator retry) and 18:16:52Z (Lab Engineer). The last clean heavy completion is the 17:04-17:44Z eval. The retry-after values point to a reset horizon near 00:25-00:47Z.
- **Model registry:** fresh read 22:07Z: **104 models / 11 free**; pin `deepseek-v4.1-flash-free`, rung 2 `mimo-v2.6-flash-free`, and rung 3 `nemotron-3.5-lightning-free` are live. No upgrade dispatch.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Zero missing, zero extra (the three dynamic GitHub-managed workflows are outside the allowlist by design).
- **Schedules:** auditor last success 05:59:30Z (2026-11-21; daily at 00:00Z); curator last schedule 18:48:58Z (work lost to the wall; next nominal 00:00Z); recover last success 20:39:18Z (detect only); maintainer last schedule 16:56:05Z plus this 22:06:20Z tick. The long scheduler gaps remain the known throttling class (#831/#836), not a new defect.

### Live lanes and their next step

- **#850 / #848 (protected-path lab lane):** conflict-dirty against the trunk; the rebase draw died on the wall. Next: after the allowance clears and a clean heavy completion lands, re-arm the lab rebase onto `7fb030f2`, then the fresh review/test/eval chain; on `approve-eval`, PAT merge sweep, Pages, close #848.
- **#854 / #803 (protected-path slice 3):** CLEAN/MERGEABLE; lab trigger 2026-11-20T03:34:02Z; branch unchanged. Next: after #850, re-arm lab; keep #803 open until all its slices land.
- **#849 (fail-loud hardening):** lab trigger 2026-11-20T03:34:03Z; the trigger carries the expanded scope (including the #853 deferral guard). Next: after #854, then #857, #856, #860 in that order (#860 only after #854).
- **#742 remainder (tracker):** open. The merged slice covers the 15 six-workflow steps; the other lanes still need the privileged launcher and the preamble, and the follow-ups remain (post-agent head check, evidence latches, per-OS `git_exec_path` pin, proxy/TLS keys). Candidate for a lab round after the serialized backlog; do not open a duplicate issue.
- **#836 (capacity):** reopened for the Owner capacity decision. No new lab dispatch; the rung/contract slice is merged, but the per-egress-IP wall remains the only fix that ends the recurrence.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw at a time; no same-pool burst. The 18:16Z and 19:21Z wall deaths show the pool was blocked; the 17:04-17:44Z eval is still the last clean heavy completion. This run posts the schedule status ping and dispatches nothing.
- The next curator tick (00:00Z nominal) and the recover heartbeat are the re-arm paths. A fresh runner may get a fresh bucket; the retry-after is diagnostic only, never a park horizon.
- #850 edits `silent-stall-audit.sh` and `maintainer.yml`, the same files #863 changed. It must rebase onto the post-#863 trunk, not the old base.
- Never repeat a strategy that already failed deterministically. If a lane dies on the allowance, stand down and wait for a clean heavy completion or the next wake.
- Never merge without a head-fresh Tester marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardcoded PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#850 lab rebase:** re-arm after the allowance clears and a clean heavy completion lands; on a push, run the fresh review/test/eval chain. On `approve-eval`, PAT merge sweep and close #848.
2. `{"action":"lab","pr":854}`: after #850; on a push, the fresh review/test/eval chain; keep #803 open unless all its slices land.
3. `{"action":"lab","issue":849}`: after #854; on a push, the review/test chain.
4. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
5. `{"action":"lab","issue":856}`: after #857.
6. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
7. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. Curator: the 00:00Z nominal tick re-arms the lane with a fresh self-heal budget. If it dies on the wall, do not dispatch a same-pool curate; if it dies on the work, read the log before deciding.
2. #850: re-arm the lab rebase after the allowance clears and a clean heavy completion lands, then the fresh review/test/eval chain. If the draw dies on the wall, stand down and keep the queue parked.
3. #854 and #850 both lack the canonical owner-authored first-line test marker on their old heads; their post-rebase gates must produce fresh markers before any merge sweep can act.
4. #836 stays open for the Owner capacity decision. The merged slice restores rung 3 and aligns the contract only; do not close the issue on the merge.
5. #745 is done: merged `eca3be8e`, Pages green, #853 closed. #742 stays open for the remaining owner-credential work; the review's residual notes (other lanes lack the privileged launcher/preamble; proxy/TLS keys unpinned) are tracked there.
6. #848 closes on #850; #803 stays open until all its slices land.
7. #831 is resolved by merged #832 but remains open because that PR used `Refs`; bookkeeping only, no dispatch.
8. Model registry drift: the ladder is 3/3 on main and all three rungs are live. No lab dispatch.
9. Maintainer cron throttling: the 20-minute schedule left a five-hour-ten-minute gap between the 16:56Z and 22:06Z ticks. The recover heartbeat and the occasional comment wake are the only liveness paths (#836/#831).
10. Pages: production is green on `7fb030f2`; the preview artifact redeploys on PR updates. No manual dispatch unless a merge sweep's deployment trigger fails.
11. Workspace: this run's tree is main `7fb030f2`; `.maintainer/` is gitignored and the tree is clean.
12. Memory: the 2026-11-21 file now carries the 01:44-01:51 entry, the 02:02 intake marker, the 05:55-06:05 entry, the 06:23-06:26 entry, the 06:42-06:50 entry, the 06:49-06:56 entry, the 09:24-09:33 entry, the 14:20-14:26 entry, the 16:56-17:04 entry, the 17:44-17:52 entry, the 17:52-18:15 entry, the 19:22-19:30 entry, and this 22:06-22:15 entry. The 2026-11-20 file carries the 18:00Z entry plus run markers for the 18:01-23:47Z wall stand-downs. The log publish is append-only with keep-both semantics.
13. Auditor doc drift (watch only, no new issue): the silent-stall script and the shipped matrix are R1-R36 on main after the #745 merge and stay R1-R36 after #863. Re-check after the next audit and do not open a duplicate.
14. The merged #863 tree keeps the R26 canonical manifest in lockstep with `maintainer.yml`; the audit confirms it. No follow-up needed.
15. No agent-side merge or dispatch this run. The last merge was #863 via the hardcoded PAT sweep at 17:52:03Z.

## Standing rules I operate under

### Safety and autonomy

- Never post issue or PR comments; the only public artifacts are the six files under `.maintainer/`. Never create an issue or PR, never run git commit/push/branch commands, never touch the brain, never `@copilot`, and never spawn or spawn-on-in-progress a Copilot review. Never mention an agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception).
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

- This run's session is a `schedule` tick; the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong.
- The pipeline is green on main (`7fb030f2`; Pages success 2026-11-21 17:52:57Z), and the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed the #850 lab draw at 18:16:52Z and the curator retry at 19:21:55Z on 2026-11-21, while the 17:04-17:44Z eval completed cleanly on the same pin. A live Maintainer session is not clearance; a single draw after a clean completion is the designed window test, never a burst.
- The ladder on `main` is now 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the curator 00:00Z tick. If it lands, the cycle is restored; if it dies on the wall, the fresh self-heal budget is available for the new incident; if it dies on the work, read the log.
2. After the allowance clears and a clean heavy completion lands, re-arm #850 (lab rebase), then the fresh review/test/eval chain; on `approve-eval`, PAT merge sweep and close #848. Then #854 lab, #849 lab, #857, #856, #860 in order (#860 only after #854 lands).
3. Keep #836 open for the Owner capacity decision; keep #742 open for the remaining owner-credential work; #831 is bookkeeping only; #848 closes on #850; #803 stays open until all its slices land.
4. Verify the board invariant, allowlist, registry/ladder, Pages, held runs, and schedule health; if clean, stand by.

## Open questions

1. Does the 00:00Z curator tick land on a fresh bucket, or does the pool stay blocked past the retry-after horizon?
2. Will the #850 rebase resolve the audit-script and workflow conflicts cleanly once the wall clears, and will the full audit stay 37/0 on the rebased head?
3. Does the reopened capacity tracker still need the Owner's per-egress-IP capacity decision now that the fallback ladder is whole again?
4. When will the serialized backlog drain enough to start the #742 remainder?
