# STATE

Last updated: 2026-11-22T01:20Z by run 44970577289

(post-lab handoff: the #850 rebase landed on the trunk at `c0d34d65` and the fresh review gate is live; the rest of the queue stays parked behind the one heavy lane.)

## TL;DR for the next Hephaestus

- **This was the post-lab handoff, not a heartbeat.** The lab run `44968891814` (00:54:27-01:15:13Z) replayed the six #850 commits onto `7fb030f2`, renumbered the health board rule to R37, regenerated the R26 manifest and tester pin, and the PAT step pushed `c0d34d65` at 01:13:16Z. The lab workflow then forwarded `/oc review` (01:15:07Z) and `/oc maintainer` (01:15:14Z).
- **#850 is CLEAN/MERGEABLE at `c0d34d65`** (base `7fb030f2`, 6 commits, 15 files +1593/-100, merge base = trunk tip). The previous head `9c9bf1bd` is superseded; its Tester approval and the wall-dead eval do not bind the rebased head.
- **The fresh review is live:** `opencode-review` run `44970565653` started its job at 01:15:11Z and is in progress. The pending `44970577245` is the `/oc maintainer` gate skip queued behind it.
- **The wrapper push rejection at 01:14:55Z is expected noise:** the PAT step had already landed the rebased head, so the wrapper's own push was non-fast-forward. The branch is at `c0d34d65`.
- **Main is unchanged at `7fb030f2`.** Production is green (Pages `44970574916` success 01:15:15-01:15:52Z; live root HTTP 200). The full live audit on the rebased head is the lab's 38/0 claim; the review will verify it.
- **The board invariant holds:** #70 is the only open `lab-health` issue with the exact title; #42 is the only other labelled issue (`brainstorm`). No new issue since 2026-11-19T06:48Z.
- **Models:** registry 105 models / 11 free at 01:16Z; pin and `small_model` both `deepseek-v4.1-flash-free`; the ladder is 3/3 live. No upgrade dispatch.
- **Held 0; queued the seven known stale runs; in progress this run and the review.** The allowlist is 19 repo names plus the self-excluded `maintainer`, matching all 20 repo-managed workflow names.
- **Queue after #850:** #854 lab, #849 lab, #857, #856, #860 (only after #854), then #742's remainder. #836 stays open for the Owner capacity decision; #821 and the Maze Chase set stay parked.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 01:15-01:20Z on 2026-11-22)

### GitHub state

- **Main:** `7fb030f275a67956d3ce882f6c22a7102d49cf44` (the #863 rebase merge, 17:52:03Z). The tree is unchanged since the 17:52-22:15Z checkpoints. **`maintainer/logs` pre-run tip:** `63916dcbb218cd1a3fb65e88bdc009515c3c08ef` (the 00:53Z memory commit).
- **Open PRs (3):**
  - #850 `c0d34d65be3b9561f026847c28cd4051dbfa2f7c`, `Closes #848`, **CLEAN/MERGEABLE** (base `7fb030f2`), 6 commits, 15 files +1593/-100; the rebased head; the fresh review is live.
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE (base `e5cd250c`); last trigger 2026-11-20T03:34:02Z; branch unchanged; needs fresh gates after its lab round.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale (base `86570af1`).
- **Open issues (25 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #856, #857, #860. #836 is open for the Owner capacity decision; no new issue since 2026-11-19T06:48Z. #677/#678/#659 are the long-frozen Maze Chase standing set under #582, not new triage; do not route them without the Owner. #742 stays open; #848 closes on #850; #803 stays open until all its slices land; #831 is resolved by merged #832 but remains open (that PR used `Refs`), bookkeeping only.
- **Board invariant holds:** only #70 carries `lab-health` among open issues and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest notes: 19:22:12Z self-heal cap, 19:22:36Z quota intake (curator), 19:28:45Z decision ping, 19:28:56Z curator triage, 22:16:58Z schedule status, 00:41:19Z heartbeat marker, 00:54:23Z heartbeat decision note. No new board note this run (the comment goes to #850).
- **Latest comments:** #850 ends at the 01:15:14Z `/oc maintainer` handoff (the 01:15:07Z `/oc review` is the live gate); #854 last 2026-11-20T03:34:02Z; #849 last 2026-11-20T03:34:03Z; #836 last 2026-11-21T18:11:34Z. No new human directive and no new issue or PR.
- **Branch tips:** main `7fb030f2`, `maintainer/logs` `63916dcb`, #850 `c0d34d65`, #854 `090452f2`, #821 `dce109e4`. The #859 branch `opencode/issue858-curate-umbra-count-copy` stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. **Queued:** the seven known stale runs (2026-09-25 x3, 2026-10-05 x1, 2026-11-11 x3); no live maintainer sibling (the 0-job fan-out `44970589432` was cancelled). **In progress:** this run and the #850 review `44970565653`.
- **This run:** `44970577289`, `issue_comment` at 01:15:16Z, target #850; workspace at the PR head `c0d34d65` (the CLI bootstrap's PR-head checkout on this issue_comment wake, issue #831; the memory bundle was materialized from the trusted commit and `.maintainer/` is gitignored); tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **Lab run `44968891814`:** created 00:54:27Z, completed green 01:15:13Z; the PAT step landed the rebased head `c0d34d65` at 01:13:16Z; the wrapper's own push was rejected non-fast-forward at 01:14:55Z (expected noise).
- **Review run `44970565653`:** created 01:15:10Z, job in progress since 01:15:11Z on the forwarded `/oc review`; the pending `44970577245` is the `/oc maintainer` gate skip.
- **Pages:** `44970574916` success 01:15:15-01:15:52Z on `7fb030f2`; live root HTTP 200.
- **Audit:** the rebased head carries R1-R37; the lab reports 38/0 with the live board check; my head-tree checks (syntax, YAML, conflict markers, whitespace, hash pins) are clean. The review will run the full audit.
- **This run's fan-out:** none; the duplicate 0-job `workflow_run` maintainer `44970589432` was cancelled.
- **Wall:** last deaths 18:16:52Z (lab) and 19:21:55Z (curator retry); the 00:54-01:15 lab draw completed green, so the wall is not currently blocking. No new death.
- **Model registry:** fresh read 01:16Z: 105 models / 11 free; pin `deepseek-v4.1-flash-free`, rung 2 `mimo-v2.6-flash-free`, and rung 3 `nemotron-3.5-lightning-free` are live. No upgrade dispatch.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Zero missing, zero extra (the three dynamic GitHub-managed workflows are outside the allowlist by design).
- **Schedules:** curator last schedule 18:48:58Z (work lost to the wall; the 00:00Z tick was lost; next nominal 06:00Z); auditor last daily success 2026-11-21T05:59:30Z (the 00:00Z tick was lost; next nominal 2026-11-23T00:00Z); recover last success 00:40:47Z (heartbeat only); maintainer last schedule 22:06:20Z plus this run. The long scheduler gaps remain the known throttling class (#831/#836), not a new defect.

### Live lanes and their next step

- **#850 / #848 (protected-path lab lane):** the rebase landed at `c0d34d65`; the fresh review is live. On approval, the fresh test and eval chain; on `approve-eval`, PAT merge sweep, Pages, close #848. On a wall death, stand down and keep the queue parked.
- **#854 / #803 (protected-path slice 3):** CLEAN/MERGEABLE; lab trigger 2026-11-20T03:34:02Z; branch unchanged. Next: after #850, re-arm lab; keep #803 open until all its slices land.
- **#849 (fail-loud hardening):** lab trigger 2026-11-20T03:34:03Z; the trigger carries the expanded scope (including the #853 deferral guard). Next: after #854, then #857, #856, #860 in that order (#860 only after #854).
- **#742 remainder (tracker):** open. The merged slice covers the 15 six-workflow steps; the other lanes still need the privileged launcher and the preamble, and the follow-ups remain (post-agent head check, evidence latches, per-OS `git_exec_path` pin, proxy/TLS keys). Candidate for a lab round after the serialized backlog; do not open a duplicate issue.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; the rung/contract slice is merged, but the per-egress-IP wall remains the only fix that ends the recurrence.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One draw at a time; no same-pool burst. The fresh review is the one heavy lane this window.
- If the review dies on the wall, stand down and re-arm on the next wake; never repeat the same failed strategy in the same window.
- #850 is now rebased onto `7fb030f2`; no further rebase is needed unless the trunk moves before merge.
- Never merge without a head-fresh Tester marker and a head-bound `approve-eval`. Workflow-touching PRs merge only through the hardcoded PAT sweep, never from the agent session.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. **#850 review (live this run):** on approval, test then eval; on `approve-eval`, PAT merge sweep and close #848. On a wall death, stand down.
2. `{"action":"lab","pr":854}`: after #850; on a push, the fresh review/test/eval chain; keep #803 open unless all its slices land.
3. `{"action":"lab","issue":849}`: after #854; on a push, the review/test chain.
4. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
5. `{"action":"lab","issue":856}`: after #857.
6. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
7. `{"action":"lab","issue":742}`: candidate after the backlog for the remaining owner-credential steps and follow-ups; the tracker stays open until that work lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. #850: the fresh review is live on `c0d34d65`; read its outcome first. On approval, chain test/eval; on a wall death, stand down.
2. The prior Tester approval (`9c9bf1bd`) and the wall-dead eval do not bind the rebased head; both gates must rerun on `c0d34d65`.
3. The wrapper's 01:14:55Z non-fast-forward push rejection is expected noise; the PAT step landed the head at 01:13:16Z. No post-mortem.
4. Curator: next nominal 06:00Z. If it dies on the wall, do not same-pool retry; if it dies on the work, read the log.
5. Auditor: next nominal 2026-11-23T00:00Z. The local audit re-run is consistent; no dispatch.
6. #836 stays open for the Owner capacity decision. The merged slice restores rung 3 and aligns the contract only; do not close the issue on the merge.
7. #745 is done: merged `eca3be8e`, Pages green, #853 closed. #742 stays open for the remaining owner-credential work; the review's residual notes (other lanes lack the privileged launcher/preamble; proxy/TLS keys unpinned) are tracked there.
8. #848 closes on #850; #803 stays open until all its slices land.
9. #831 is resolved by merged #832 but remains open because that PR used `Refs`; bookkeeping only, no dispatch.
10. Model registry drift: the ladder is 3/3 on main and all three rungs are live. No lab dispatch.
11. Maintainer cron throttling: the 00:00Z curator and auditor ticks were lost; the recover heartbeat remains the independent liveness path (#836/#831).
12. Pages: production is green on `7fb030f2`; the preview artifact redeploys on PR updates. No manual dispatch unless a merge sweep's deployment trigger fails.
13. Workspace: this run's tree is the PR head `c0d34d65` (the CLI bootstrap's PR-head checkout on this issue_comment wake, issue #831); the memory bundle came from the trusted commit, `.maintainer/` is gitignored, and the tree is clean.
14. Memory: the 2026-11-22 file carries the 00:41-00:53Z heartbeat entry and this 01:15-01:20Z post-lab handoff entry. The 2026-11-21 file carries the 01:44-01:51 entry, the 02:02 intake marker, the 05:55-06:05 entry, the 06:23-06:26 entry, the 06:42-06:50 entry, the 06:49-06:56 entry, the 09:24-09:33 entry, the 14:20-14:26 entry, the 16:56-17:04 entry, the 17:44-17:52 entry, the 17:52-18:15 entry, the 19:22-19:30 entry, and the 22:06-22:15 entry. The log publish is append-only with keep-both semantics.
15. Auditor doc drift (watch only, no new issue): the silent-stall script and the shipped matrix are R1-R36 on main and R1-R37 on the #850 head; after the merge, re-check the main range and do not open a duplicate.
16. The merged #863 tree keeps the R26 canonical manifest in lockstep with `maintainer.yml`; the #850 head regenerates it. The review will verify.
17. No agent-side merge or dispatch beyond the live review this run. The last merge was #863 via the hardcoded PAT sweep at 17:52:03Z.

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

- This run's session is an `issue_comment` handoff on #850; the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong.
- The pipeline is green on main (`7fb030f2`; Pages success 2026-11-22 01:15:52Z), and the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall killed the #850 lab draw at 18:16:52Z and the curator retry at 19:21:55Z on 2026-11-21, but the 00:54-01:15Z lab draw on 2026-11-22 completed green, so elapsed time alone is not proof; the fresh-run lottery is the designed recovery, and a single draw is the window test, never a burst.
- The ladder on `main` is 3/3 (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`), and the pin and `small_model` are unchanged.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #850 review outcome first. On approval, the fresh test gate; then eval; on `approve-eval`, PAT merge sweep, verify Pages, close #848. On a wall death, stand down and keep the queue parked.
2. Then #854 lab, #849 lab, #857, #856, #860 in order (#860 only after #854 lands), then #742's remainder.
3. Keep #836 open for the Owner capacity decision; keep #742 open for the remaining owner-credential work; #831 is bookkeeping only; #848 closes on #850; #803 stays open until all its slices land.
4. The curator's next nominal tick is 06:00Z; the auditor's next nominal tick is 2026-11-23T00:00Z. Read both outcomes when they land.
5. Verify the board invariant, allowlist, registry/ladder, Pages, held runs, and schedule health; if clean, stand by.

## Open questions

1. Will the review approve the rebased head, or return another round of findings (every prior round found something)?
2. Will the fresh test and eval chain complete on `c0d34d65`, or die on the provider wall?
3. Do the lost 00:00Z curator and auditor ticks show the scheduler throttle is worsening, and does the heartbeat remain the only reliable liveness path?
4. Does the reopened capacity tracker still need the Owner's per-egress-IP capacity decision now that the ladder is whole again?
