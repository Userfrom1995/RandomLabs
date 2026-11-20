# STATE

Last updated: 2026-11-20T02:31Z by run 44660015440

(PR #863 wake: the #836 third-rung and decision-contract patch landed from the 01:34Z lab re-arm; review returned one process-only finding at 02:28Z and a lab fix pass is live. Five of the six re-arms died on the provider wall. No merge is possible this run; the board's 01:34Z "wall has cleared" claim is corrected.)

## TL;DR for the next Hephaestus

- **The wall did not clear.** Of the six lanes re-armed at 01:34Z, five died on the provider daily free-usage allowance: eval #862 `44654645886` (01:44:22Z), lab #854 `44654652845` (01:44:20Z), eval #850 `44654647908` (01:53:23Z), lab #849 `44654654511` (02:05:51Z), and lab #745 `44654649966` (02:20:00Z). Only the #836 lab pass `44654655608` succeeded (02:07:17Z) and opened PR #863. The #70 intake notes at 01:44-02:20 record every death. No same-pool retries were posted this run, by rule.
- **#863 is the live lane.** Head `e833414624a1d9653178df93c82541f66acb636f`, base `f11f2caa`, CLEAN/MERGEABLE, 5 files +5/-5, all protected paths. Review `44658508531` completed success at 02:28:57Z with verdict `lab`: one blocking process finding (the PR artifact lacks the delegation ledger and skills note), the five changed lines correct, audit 36/0. The owner-published `/oc lab` landed at 02:28:53Z and lab run `44661100902` is in progress. The duplicate review `44660015384` skipped. Do not dispatch another review or lab while the fix pass is live.
- **No merge this run.** No PR has a head-bound `approve-eval`. #862/#850 have Tester approvals only; #863 has a live lab fix pass; #745/#854 are mid-lane; #821 is parked.
- **The #836 patch is partial.** It restores a live third rung and aligns the decision contract; it does not fix the pool-wide capacity wall. #836 stays open for the Owner capacity decision, the cadence documentation, and the optional wall-proof merge path.
- **Registry is healthy.** Fresh read at 02:24Z: 91 models / 11 free. `glm-5.3-flash-free` stays absent; the pin (`deepseek-v4.1-flash-free`), rung 2 (`mimo-v2.6-flash-free`), and the #863 replacement rung 3 (`nemotron-3.5-lightning-free`) are all live.
- **Pages and board are green/invariant.** Production root returns 200 on `f11f2caa`; the #863 preview deployed at 02:19:58Z. Only #70 carries `lab-health`; only #42 carries `brainstorm`; held runs 0.
- **The trigger allowlist still matches.** 19 listed workflow names plus the self-excluded `maintainer` cover all 20 live names.
- **Schedules:** curator last success 2026-11-19T20:09:02Z (the ~02:08Z tick did not appear; known throttle); auditor last success 2026-11-19T06:23:18Z (mid-morning is the observed band); recover tick 01:25:46Z success.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 02:20-02:27Z on 2026-11-20)

### GitHub state

- **Main:** `f11f2caaf5e743b9eb8ffbd73815b1eabd253321` (the #859 rebase merge; unchanged). **`maintainer/logs` pre-run tip:** `5917971b3` (the 02:20Z marker-only memory commit; its STATE was still stamped 01:31Z, which this run replaces).
- **Open PRs (6):**
  - #863 `e833414624a1d9653178df93c82541f66acb636f`, `Refs #836`, CLEAN/MERGEABLE, base `f11f2caa`, 5 files +5/-5, protected paths, review `lab` 02:28:42Z with a process-only finding, lab fix pass `44661100902` live.
  - #862 `ac7cdf309c33e6da31c6a8dd6154d9bff63e4570`, `Fixes #861`, CLEAN/MERGEABLE, 0 behind main, Tester approved 15:01:55Z, eval wall-dead 01:44:22Z.
  - #850 `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE, 2 behind main, Tester approved 13:46:27Z, eval wall-dead 01:53:23Z.
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE, 2 behind main, lab wall-dead 01:44:20Z, branch unchanged.
  - #745 `ff5cebd953aa3343ffe44ff37853f2ba78e6378e`, `Part of #742`, `Refs #853`, CLEAN/MERGEABLE, 0 behind main, lab wall-dead 02:20:00Z, branch unchanged.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale.
- **Open issues (27 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860, #861. #836 carries PR #863; #861 closes on the #862 merge; #848 on the #850 merge; #853 after #745 lands; #742 stays open for the remaining slices; #803 stays open until all three slices land.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Latest notes: the five quota-wall intake notes (01:44-02:20), the 01:26Z heartbeat marker, and the 01:34Z recovery ping whose "wall has cleared" claim this run corrects.
- **Latest comments:** #863 `/oc review` 02:07:12Z, preview 02:19:56Z, `/oc maintainer` 02:19:57Z, review verdict 02:28:42Z, review report 02:28:49Z, `/oc lab` 02:28:53Z; #862/#850 eval triggers 01:34:51-52Z, no eval result; #745 no new comment since the 01:34Z lab re-arm; #849/#854 same.
- **Branch tips:** main `f11f2caa`, `maintainer/logs` `5917971b3`, #863 `e8334146`, #862 `ac7cdf30`, #850 `9c9bf1bd`, #854 `090452f2`, #745 `ff5cebd9`, #821 `dce109e4`. The #859 branch stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0 (repo-wide sweep in `44660022774` at 02:20:46Z).

### Runs, CI and queues

- **This run:** `44660015440`, `issue_comment` at 02:20:01Z on `main` `f11f2caa`, target #863. The `/oc maintainer` was posted at 02:19:57Z by the PR preview handoff after the Pages artifact deploy `44660010716` succeeded at 02:19:58Z. The CLI bootstrap then moved the workspace to the PR head `e8334146` (the #831 behavior); the trusted prompt and memory were already staged from `f11f2caa`, and project config is disabled.
- **01:34Z re-arm outcomes:**
  - Lab #854 `44654652845` failed 01:44:20Z on the wall, no decision file, no push.
  - Eval #862 `44654645886` failed 01:44:22Z on the wall, no verdict.
  - Eval #850 `44654647908` failed 01:53:23Z on the wall, no verdict.
  - Lab #849 `44654654511` failed 02:05:51Z on the wall, no decision file, no push.
  - Lab #836 `44654655608` succeeded 02:07:17Z; PR #863 opened at 02:07:10Z.
  - Lab #745 `44654649966` failed 02:20:00Z on the wall after 45 minutes, no decision file, no push.
- **Callbacks:** `44655796362`, `44655801166` (01:44Z), `44656858828` (01:53Z), `44658349596` (02:06Z), `44660022774` (02:20Z) all completed success as marker-only memory sessions; none wrote a new STATE and none re-armed a lane. This is correct under the wall rule, but it means the queue depends on the next real wake.
- **Review:** `44658508531` completed success at 02:28:57Z with verdict `lab` (one blocking process finding: missing delegation ledger and skills note in the PR artifact; the five changed lines are correct; audit 36/0). The duplicate `44660015384` completed `skipped`. The lab fix run `44661100902` started at 02:28:56Z and is in progress; it should add the ledger and skills note to the PR artifact, with no code change.
- **Schedules:** curator last schedule success `44605505591` at 2026-11-19T20:09:02Z (the ~02:08Z tick did not appear); auditor last schedule success `44471789577` at 2026-11-19T06:23:18Z; recover schedule `44653552844` at 01:25:46Z success. No missing allowlist entry; no self-heal cap escalation today.
- **Pages:** production deploy `44541473003` success 14:14:30Z for `f11f2caa`; live root returns HTTP 200. Preview deploy `44660010716` success 02:19:58Z on `main`; #863 preview exists.
- **Model registry:** fresh read at 02:24Z: **91 models / 11 free**. Free ids: `beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `hy4-flash-free`, `iceman-free`, `jev-1.13-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, `tidepool-alpha-free`. `glm-5.3-flash-free` is absent; the pin and rung 2 are live; the #863 rung 3 is live.
- **Allowlist:** `maintainer.yml` lists 19 workflow names; with the self-excluded `maintainer` that covers all 20 live names. Zero missing, zero extra.
- **Workspace:** the pre-agent checkout was `f11f2caa`; the CLI bootstrap moved the tree to the PR head `e8334146`. Tree clean at the moment of survey; no protected-path edits, no model edit, no branch commands, no `emergency.json`.

### Live lanes and their next step

- **#863 / #836 (third rung + decision contract, protected path, lab fix live):** head `e8334146`, review verdict `lab` at 02:28:42Z with one process-only finding, lab run `44661100902` in progress. Next: the lab adds the delegation ledger and skills note to the PR artifact (no code change); then a fresh head-bound review, Tester, eval, PAT merge sweep. Do not dispatch another review or lab while the fix pass is live.
- **#862 / #861 (curator copy + probe fixes, eval wall-dead):** head `ac7cdf30`, Tester approved at 15:01:55Z. Next: re-arm the eval on the next wake after the wall clears; on `approve-eval`, rebase merge, verify Pages, close #861. Not a new project, so the shipping limit does not apply.
- **#850 / #848 (protected-path lab lane, eval wall-dead):** head `9c9bf1bd`, Tester approval at 13:46:27Z stands. Next: re-arm the eval after the wall clears; on `approve-eval`, PAT merge sweep, Pages check, close #848.
- **#745 / #742 + #853 (protected-path rebase, lab wall-dead):** head `ff5cebd9`, review returned `lab` at 15:17:35Z with three blocking and five bookkeeping findings. Next: the lab push after the wall clears, then a fresh head-bound review, Tester, eval, PAT merge sweep. Close #853 after the merge; keep #742 open for the remaining slices.
- **#854 / #803 (protected-path slice 3, lab wall-dead):** head `090452f27`. Next: the lab push after the wall clears, then review, Tester, eval, PAT merge sweep. Keep #803 open until all three slices land.
- **#849 (fail-loud hardening, lab wall-dead):** no push. Next: the lab pass after the wall clears; then review, Tester, eval. Then #857, #856, #860 in that order.
- **#836 (capacity):** PR #863 is the rung/contract slice; the issue stays open for the Owner capacity decision and the remaining proposals. No new lab dispatch now.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- One Maintainer session is live: this run. The #863 lab fix run `44661100902` is the only active agent lane; the duplicate review finished `skipped`.
- The wall is pool-wide and is still killing lanes. A same-IP dispatch is a lottery, not a retry; do not re-post a wall-dead lane this window. The next heartbeat/schedule wake is the re-arm path once the wall clears.
- The 01:34Z recovery ping's "wall has cleared" claim was false; this run corrects it on #70. Do not repeat a "cleared" claim until multiple lanes actually complete.
- If a lane returns fix, route the Fixer (or lab when protected paths are involved); if it approves, follow the gate chain. Never merge without a head-fresh Tester marker and a head-bound `approve-eval`.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the wall has cleared, and no live/queued run exists)

1. `{"action":"eval","pr":862}`: wall-dead; Tester approval stands.
2. `{"action":"eval","pr":850}`: wall-dead; Tester approval stands.
3. `{"action":"lab","pr":745}`: wall-dead; on a push, fresh head-bound review.
4. `{"action":"lab","pr":854}`: wall-dead; on a push, fresh head-bound review.
5. `{"action":"lab","issue":849}`: wall-dead; on a push, the review/test chain.
6. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
7. `{"action":"lab","issue":856}`: after #857.
8. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
9. #863: no dispatch; the review returned `lab` and the lab fix run `44661100902` is live. Follow the workflow handoff.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. Read the #863 lab fix result first. The review verdict is `lab` (process-only: add the delegation ledger and skills note to the PR artifact; no code change). On the fix push, run a fresh head-bound review, then Tester, eval, and the PAT merge sweep; if the lab run dies, its self-heal and the failure callback own the next step.
2. Wall watch: the five wall deaths are re-arms, not findings. Re-arm only on a later wake after the wall clears; never chain same-IP retries.
3. #862: the Tester approval at `ac7cdf30` is head-fresh; the eval is the last gate. On merge, verify Pages and close #861.
4. #850: the Tester approval at `9c9bf1bd` is still valid; the eval is the last gate. On merge, use the PAT sweep (protected path), verify Pages, close #848.
5. #745: the blocking findings are nonce hermeticity, `GH_CONFIG_DIR`, and the dead `GIT_CONFIG` cleanup; the non-blocking set is the R1-R36 banners, the DYLD claim, the strict loader, and the reviewer-model definition. Verify all eight at the push.
6. #854: the round-1 findings include the #853 deferral guard, the incident-scope fail-open, the resolver fail-closed, the wall-death fixture, R20 pins, and the AGENTS/LAB claims. Keep `Closes #803` only if all three slices land; otherwise switch to `Refs #803`.
7. #849 scope mismatch: the issue body still quotes the old premise; the trigger carries the expanded scope. Verify the push against the trigger.
8. #853 can be closed after #745 lands; #742 stays open. #848 closes on #850; #861 on #862.
9. The `INFRA-STATUS` block on #70 is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
10. #836 remains open for the capacity proposals. The #863 patch restores rung 3 and the contract only; do not close the issue on the merge.
11. Auditor: no 11-20 tick yet; observed cadence is mid-morning UTC. No dispatch unless it crashes or the gap passes the usual band.
12. Curator: the ~02:08Z tick did not appear; the last success is 20:09Z. This is the known platform throttle, not a curator defect; no dispatch.
13. Model registry drift: `glm-5.3-flash-free` is gone; the ladder is 2/3 on `main` until #863 merges. The PR's rung 3 is live.
14. Prompt/envelope drift: the staged `maintainer.md` and the `maintainer.yml` envelope still omit `design-ux`/`design-visual`/`design-motion`; #863 fixes both. Do not use the focused design actions as a justification to edit prompts directly.
15. Maintainer cron throttling: the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
16. Pages: production is green on `f11f2caa`; the preview artifact redeploys on PR updates. No manual dispatch.
17. Workspace: this run's tree is the PR head after the #831 bootstrap move; do not trust local protected-path content as default-branch truth. Use `gh api --ref main` or `git show origin/main:...` for trusted reads.
18. Memory: the 2026-11-20 file now carries the 01:31Z entry, the five wall deaths, the #836 success, and this run's entry. The 02:20Z callback only appended a marker.
19. No merge this run.

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
- Comment-quality rules: lead with the destination, use a multiple of 5; no task numbers, run ids, issue numbers, or PR numbers in PR comments (so the link survives a squash merge); code and comments are literal; never mention an agent, workflow, model, or harness.
- Do not claim a wall or lane is clear until multiple runs actually complete; correct false claims in the same thread first.

### Review, test, and merge gates

- Ship only on green build + CI, complete test suite with no new failures, behavior evidence, responsive accessibility, unified 8px spacing + iconography, and security.
- A failed build or CI is never acceptable just because it was already failing.
- Verify the CI workflow covers the pushed commit and required checks are green. Never merge with an in-flight required check or while the mergeable flag is `UNKNOWN`.
- Required checks only: deploy, test (ubuntu-latest, windows-latest, macos-latest), e2e.
- Merge preference is squash unless the PR's base branch explicitly requires another strategy; the repo's rebase-merge setting is the exception for the #859/#850 lane (honor the verified expectation).
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

- This run's session is `maintainer-issue_comment`; the target is PR #863; the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong.
- The pipeline is green on main (`f11f2caa`; Pages `44541473003`), but the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP; the wall is pool-wide and still active today. The reset at the new UTC day was consumed by the six re-arms; no same-IP retry is permitted.
- The ladder on `main` is 2/3 until #863 merges; keep the pin and rung 2 live (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`). The #863 replacement rung is live.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #863 lab fix result. The review verdict is `lab` (process-only: add the delegation ledger and skills note to the PR artifact; no code change). On the fix push, run a fresh head-bound review, then Tester, eval, and the PAT merge sweep; if the lab run dies, its self-heal and the failure callback own the next step.
2. If the wall has cleared, re-arm eval #862 and #850 first, then lab #745, #854, and #849 in that order. On `approve-eval`, merge (rebase for #862, PAT sweep for #850), verify Pages, and close #861/#848.
3. On a #745 push, verify all eight findings, then a fresh head-bound review, Tester, eval, PAT merge sweep; close #853 after the merge and keep #742 open.
4. On a #854 push, keep #803 open unless all three slices are present. On a #849 push, dispatch #857, then #856, then #860.
5. Keep #836 open for the capacity proposals. Verify board invariant, allowlist, registry/ladder, Pages, and schedule health; if clean, stand by.

## Open questions

1. Will the #863 lab fix run complete on the wall, and will the process-only finding clear on the fresh review?
2. Will the wall clear on the next heartbeat, or does the pool stay depleted through the day?
3. Do the Tester approvals on #862/#850 survive long enough for the eval to land, or does the queue need a fresh test pass after the wall?
4. Does the #836 patch cover enough of the capacity issue to keep the lanes alive, or is an Owner capacity decision still the binding blocker?
5. Will the #745 lab pass, once it runs, clear all eight review findings?
