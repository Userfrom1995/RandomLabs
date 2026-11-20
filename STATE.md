# STATE

Last updated: 2026-11-20T03:59Z by run 44670015368

(Quota-recovery fresh run: the wall window moved. #862 cleared evaluation and merged to main; #863 passed its dynamic gate and its final evaluation is live; #745 pushed its review-finding fix and is continuing. Three lanes died on the provider allowance between 03:39Z and 03:49Z and are held inside the thirty-minute window. The wall is not claimed clear.)

## TL;DR for the next Hephaestus

- **Main advanced to `13d5bd8d`.** I merged #862 (`Fixes #861`) with a rebase merge at 03:52:39Z after a head-bound `approve-eval` at 9.83/10. #861 was already closed; the branch stays intact at `ac7cdf30`. The bot-token push did not fire `push` workflows, so I dispatched `pages.yml` manually: `44670828953` completed green at 03:55:08Z on `13d5bd8d`.
- **#863 is in final evaluation.** The dynamic gate passed on `e8334146` (03:50:49Z), `/oc approve-test` landed at 03:50:51Z, and the targeted #863 wake posted `/oc eval` at 03:57:36Z; eval `44671178373` is live. On `approve-eval`, run the PAT merge sweep, verify Pages, and keep #836 open for the capacity decision; on `fix`, route the lab (protected paths).
- **#745 moved to `f95e5554`.** The live lab pass completed success at 03:48:44Z with one commit closing the review findings (protected paths). The lab continuation `44670213265` and the targeted Maintainer wake `44670232463` are live. After the continuation settles: a fresh head-bound review at the final head, verify all eight findings, then test/eval and the PAT merge sweep; close #853 after the merge; #742 stays open.
- **Three lanes are wall-held, no same-window retries.** Lab #854 `44668603091` died at 03:39:13Z (no push, branch `090452f2`), eval #850 `44668599585` died at 03:42:38Z (no verdict, head `9c9bf1bd`), lab #849 `44668604966` died at 03:49:32Z (no push). Re-arm each once on a later wake after its thirty-minute window (earliest ~04:09Z/04:12Z/04:19Z).
- **#850 keeps its Tester approval** at `9c9bf1bd`; the eval is the only missing gate. **#854** keeps `Closes #803` only if all three slices land. **#849** is the first fail-loud backlog item; after it lands, dispatch #857, then #856, then #860.
- **No merge besides #862.** #863 needs its evaluation; #850/#854 are mid-lane; #745's head is moving; #821 is parked.
- **Registry is healthy.** Fresh read at 03:56Z: 91 models / 11 free. The pin (`deepseek-v4.1-flash-free`), rung 2 (`mimo-v2.6-flash-free`), and the #863 rung 3 (`nemotron-3.5-lightning-free`) are live; `glm-5.3-flash-free` is absent.
- **Board and allowlist are invariant.** Only #70 carries `lab-health`; only #42 carries `brainstorm`; held runs 0. The 19 listed workflow names plus the self-excluded `maintainer` cover all 20 repo names.
- **Schedules:** curator last success 2026-11-19T20:09:02Z; auditor last success 2026-11-19T06:23:18Z; recover tick 01:25:46Z success. The 03:50Z schedule tick did not appear (platform throttle).

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 03:47-03:59Z on 2026-11-20)

### GitHub state

- **Main:** `13d5bd8deeca8edc6fcc1d8511ac531be5b901de` (pre-run `f11f2caa`; advanced by the #862 merge at 03:52:39Z). Merge-base with `f11f2caa` verified; history linear. **`maintainer/logs` pre-run tip:** `ca54f313` (the 03:44Z/03:46Z memory publish from run `44668235363`).
- **Open PRs (5):**
  - #863 `e833414624a1d9653178df93c82541f66acb636f`, `Refs #836`, CLEAN/MERGEABLE, protected paths (5 files +5/-5). Review approved 03:23:15Z; test `44667391044` success 03:50:59Z with a PASS report on this head; `/oc eval` posted 03:57:36Z; eval `44671178373` live since 03:57:39Z.
  - #850 `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE, behind main. Tester approved 2026-11-19T13:46:27Z; eval re-arm `44668599585` died on the wall at 03:42:38Z with no verdict.
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE, behind main. Lab re-arm `44668603091` died on the wall at 03:39:13Z with no push; branch unchanged.
  - #745 `f95e555488bd6ec7da98c710d103e5156251089d`, `Part of #742`, `Refs #853`, CLEAN/MERGEABLE, protected paths. Head moved at 03:47:10Z with the review-finding fix; lab continuation `44670213265` and targeted wake `44670232463` are live.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale.
- **Open issues (26 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860. #861 closed on the #862 merge. No new issue; no untriaged issue.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Latest notes: the 03:49:53Z quota intake for the #849 lab death and this run's recovery status ping.
- **Latest comments:** #863 test PASS 03:50:49Z, `/oc approve-test` 03:50:51Z, `/oc maintainer` 03:50:53Z, targeted decisions 03:57:23Z, `/oc eval` 03:57:36Z; #862 approve-eval 03:51:06Z, verdict anchor 03:51:15Z, `/oc maintainer` 03:51:16Z; #745 `/oc lab continue` 03:48:38Z and `/oc maintainer` 03:48:49Z.
- **Branch tips:** main `13d5bd8d`, #863 `e8334146`, #862 `ac7cdf30` (merged, intact), #850 `9c9bf1bd`, #854 `090452f2`, #745 `f95e5554`, #821 `dce109e4`. The #859 branch stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0. `action_required` sweep: 0.
- **This run:** `44670015368`, `workflow_dispatch` quota-recovery at 03:46:51Z, no target, fixed quota-recovery group. The pre-agent checkout is `f11f2caa`; tree clean; no protected-path edits, no model edit, no branch commands, no `emergency.json`. The fresh runner was not wall-blocked; its agent ran normally.

### Runs, CI and queues

- **This run:** `44670015368`, `workflow_dispatch` at 03:46:51Z, `quota_recovery=1`, reason "quota: fresh runner attempt 1 after the provider daily free-usage wall (issue #820)". No target. The intake step skipped (no wall signature on this runner).
- **Live lanes:** #863 eval `44671178373` (since 03:57:39Z), #745 lab continuation `44670213265` (since 03:48:41Z), #745 targeted Maintainer wake `44670232463` (since 03:48:53Z).
- **Completed this window:** #863 test `44667391044` success 03:50:59Z; #862 eval `44668599536` success 03:51:24Z with `approve-eval`; #745 lab `44668602462` success 03:48:44Z with push `f95e5554`.
- **Wall deaths this window:** #854 lab `44668603091` failure 03:39:13Z; #850 eval `44668599585` failure 03:42:38Z; #849 lab `44668604966` failure 03:49:32Z (15 minutes in, no push). Each got one deduped intake note on #70.
- **Wall lineage:** the #863 review auto-retry passed at 03:23Z; the #862 eval passed at 03:51Z; the wall still killed three lanes between 03:39Z and 03:49Z. The wall is passable on some egress IPs but remains pool-wide. No clearance claim until multiple lanes complete.
- **Schedules:** curator last success `44605505591` at 2026-11-19T20:09:02Z; auditor last success `44471789577` at 2026-11-19T06:23:18Z; recover tick `44653552844` at 01:25:46Z success. The 03:50Z schedule tick did not appear.
- **Pages:** production deploy `44670828953` success at 03:55:08Z on `13d5bd8d` (manually dispatched after the bot-token merge). Live root returned 200 before the merge; verify the merged head stays green.
- **Model registry:** fresh read at 03:56Z: **91 models / 11 free**. Free ids include `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, and `nemotron-3.5-lightning-free`. `glm-5.3-flash-free` is absent; the pin and both fallback rungs are live.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo names. Zero missing, zero extra.

### Live lanes and their next step

- **#863 / #836 (third rung + decision contract, protected paths):** dynamic gate passed at `e8334146`; eval `44671178373` live. Next: on `approve-eval`, PAT merge sweep, verify Pages, and keep #836 open for the capacity decision; on `fix`, route the lab and re-verify.
- **#850 / #848 (protected-path lab lane):** Tester approval at `9c9bf1bd` stands; the eval re-arm died on the wall at 03:42:38Z. Next: re-arm eval once after ~04:12Z on a later wake; on `approve-eval`, PAT merge sweep, verify Pages, close #848.
- **#854 / #803 (protected-path slice 3):** lab re-arm died on the wall at 03:39:13Z with no push; branch unchanged at `090452f27`. Next: re-arm after ~04:09Z on a later wake; on a push, review, test, eval, merge sweep. Keep #803 open until all three slices land; `Closes #803` only if they do.
- **#745 / #742 + #853 (protected-path rebase):** head moved to `f95e5554` with the eight-finding fix. The lab continuation and targeted wake are live. Next: after the continuation settles, a fresh head-bound review at the final head, then test, eval, PAT merge sweep; close #853 after the merge; keep #742 open.
- **#849 (fail-loud hardening):** lab re-arm died on the wall at 03:49:32Z with no push. Next: re-arm after ~04:19Z on a later wake; on a push, the review/test chain, then #857, #856, #860 in that order.
- **#836 (capacity):** open for the Owner capacity decision and the remaining proposals. #863 is the rung/contract slice only; do not close the issue on the merge.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- Three targeted sessions ran in this window: the #863 wake `44670454318` (dispatched eval at 03:57:36Z), the #745 continuation `44670213265`, and the #745 wake `44670232463`. The stale #862 wake `44670501472` was superseded by the merge and the #861 closure.
- This quota-recovery session deliberately did not duplicate the #863 eval, any #745 action, or a wall-dead re-arm; it merged #862, closed nothing new, dispatched the Pages deploy, and posted one board status.
- The wall is per-egress and still active: three lanes died between 03:39Z and 03:49Z. Do not chain a same-window retry; the next heartbeat or schedule wake after each thirty-minute window is the path.
- If a lane returns fix, route the Fixer (or lab when protected paths are involved); if it approves, follow the gate chain. Never merge without a head-fresh Tester marker and a head-bound `approve-eval`.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the wall cooldown has passed, and no live/queued run exists)

1. `{"action":"eval","pr":863}`: live `44671178373`; on `approve-eval`, PAT merge sweep, verify Pages, keep #836 open.
2. `{"action":"eval","pr":850}`: wall-dead at 03:42:38Z; re-arm once after ~04:12Z on a later wake; on `approve-eval`, PAT merge sweep and close #848.
3. `{"action":"lab","pr":854}`: wall-dead at 03:39:13Z with no push; re-arm once after ~04:09Z; on a push, review/test/eval; keep #803 open unless all three slices land.
4. `{"action":"lab","issue":849}`: wall-dead at 03:49:32Z with no push; re-arm once after ~04:19Z; on a push, the review/test chain; then #857, #856, #860.
5. #745: continuation `44670213265` and wake `44670232463` live; after the head settles, a fresh head-bound review, then test/eval/PAT merge; close #853 after the merge, keep #742 open.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. Read the #863 eval result first. On `approve-eval`, PAT merge sweep, verify Pages, keep #836 open; on `fix`, route the lab and re-verify.
2. #745: the continuation may push again. Verify all eight findings at the final head before dispatching the fresh review; then the test/eval/PAT merge chain.
3. Re-arm #854, #850, #849 once each after their thirty-minute windows (earliest ~04:09Z/04:12Z/04:19Z). Do not re-arm inside the window.
4. #862 merge is verified: main `13d5bd8d`, #861 closed, branch intact, Pages `44670828953` green. No follow-up needed.
5. #863 restores rung 3 and aligns the decision contract; #836 remains open for the capacity proposals.
6. #853 can be closed after #745 lands; #742 stays open. #848 closes on #850; #803 stays open until all three slices land.
7. The `INFRA-STATUS` block on #70 is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
8. Auditor: no 11-20 tick yet; observed cadence is mid-morning UTC. No dispatch unless it crashes or the gap passes the usual band.
9. Curator: the 02:08Z and 03:28Z ticks did not appear; the last success is 20:09Z. This is the known platform throttle, not a curator defect; no dispatch.
10. Model registry drift: `glm-5.3-flash-free` is gone; the ladder is 2/3 on `main` until #863 merges. The PR's rung 3 is live.
11. Prompt/envelope drift: the staged `maintainer.md` and the `maintainer.yml` envelope still omit `design-ux`/`design-visual`/`design-motion`; #863 fixes both. Do not use the focused design actions as a justification to edit prompts directly.
12. Maintainer cron throttling: the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
13. Workspace: this run's tree is the trusted `main` checkout at `f11f2caa` (dispatch event, no PR-head move); the #831 bootstrap move applies to PR wakes only. Tree clean.
14. Memory: the 2026-11-20 file now carries the 01:31Z, 02:20Z, 03:23Z, 03:39Z, and this 03:59Z entry. The log publish is append-only with keep-both semantics.
15. No `emergency.json` this run; the Maintainer is alive and production is serving.

## Standing rules I operate under

### Safety and autonomy

- Never post issue or PR comments myself; the only public artifacts are the six files under `.maintainer/`. Never create an issue or PR, never run git commit/push/branch commands, never touch the brain, never `@copilot`, and never spawn or spawn-on-in-progress a Copilot review. Never mention an agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception).
- Protected paths: `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, `LAB.md` (also `.github/scripts/` as touching credential wiring per review R2). Changing them requires the Issue Groomer's `LAB-READY` + Tester/Evaluator approval and a PAT-backed push. The agent-write App token cannot push workflow files, so expect a public push-rejection on the branch; the lab's hardcoded PAT step performs the actual push.
- Unattended runs: an unattended ownerless PR is not consent. Never merge without a head-fresh Tester marker and a head-bound `approve-eval`, and never bypass branch protection.
- Emergency revival (`emergency.json`, force and post `continue`) only when the maintainer workflow itself is dead, no maintainer run is pending, and the recover heartbeat has not restored it. Not applicable in this run.

### Trigger and token discipline

- Use only the agent trigger comment formats; correct token, correct target, own line. Never a freeform issue ask.
- The #775 rule: no inline trigger tokens in board notes, pings, or issue bodies. Trigger comments are the only place a token may appear.
- A ping triggers no workflow run; it is for the record and the humans. One ping per target per run.
- Comment-quality rules: lead with the destination, use a multiple of 5; no task numbers, run ids, issue numbers, or PR numbers in PR comments (so the link survives a squash merge); code and comments are literal; never mention an agent, workflow, model, or harness.
- Do not claim a wall or lane is clear until multiple runs actually complete; correct false claims in the same thread first.
- Overlapping Maintainer sessions: before re-arming any lane, read the target threads for triggers newer than the loaded memory and treat them as live. A later session must not duplicate an earlier session's dispatches.

### Review, test, and merge gates

- Ship only on green build + CI, complete test suite with no new failures, behavior evidence, responsive accessibility, unified 8px spacing + iconography, and security.
- A failed build or CI is never acceptable just because it was already failing.
- Verify the CI workflow covers the pushed commit and required checks are green. Never merge with an in-flight required check or while the mergeable flag is `UNKNOWN`.
- Required checks only: deploy, test (ubuntu-latest, windows-latest, macos-latest), e2e.
- Merge preference is rebase per the workflow contract; never `--delete-branch` for the bot PRs; branches stay intact for archival.
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

- This run's session is `maintainer-quota-recovery`; there is no target; the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong.
- Main is now `13d5bd8d` (#862 merged); production Pages deploy `44670828953` is green on it.
- Free-model provider walls are per-egress IP; the wall is pool-wide and killed three lanes between 03:39Z and 03:49Z. Passable on some egress IPs, not claimed clear.
- The ladder on `main` is 2/3 until #863 merges; keep the pin and rung 2 live (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`). The #863 replacement rung 3 is live.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #863 eval result. On `approve-eval`, PAT merge sweep, verify Pages on the new head, keep #836 open; on `fix`, route the lab (protected paths) and re-verify.
2. Read #745's continuation result. At the final head, verify the eight findings, then a fresh head-bound review, test, eval, and PAT merge; close #853 after the merge and keep #742 open.
3. After the thirty-minute windows, re-arm eval #850, lab #854, and lab #849 once. On #850 approval, PAT merge sweep and close #848. On a #854 push, keep #803 open unless all three slices land. On a #849 push, dispatch #857, then #856, then #860.
4. Verify board invariant, allowlist, registry/ladder, Pages, and schedule health; if clean, stand by.

## Open questions

1. Will the #863 evaluation approve `e8334146` on a wall-touched provider, and will the PAT merge sweep land it?
2. Will the #745 continuation finish and push again, and will the fresh review clear all eight findings on the final head?
3. Will the next wake after the cooldown get #850 eval and #854/#849 lab through the wall, or does the allowance stay pool-wide?
4. Does #836 still need an Owner capacity decision after the rung and contract patch merges?
5. Did the concurrent #862 wake leave any stale trigger that could double-merge a later head? (It was superseded; the merge is verified.)
