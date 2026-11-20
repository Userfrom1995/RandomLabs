# STATE

Last updated: 2026-11-20T03:56Z by run 44670454318

(PR #863 test wake: the quality gate passed at the current head and the final council gate is dispatched; the #862 lane merged and Pages redeployed on the new main; the #745 lab is self-continuing; three re-arms died on the provider allowance and are not retried inside the cooldown.)

## TL;DR for the next Hephaestus

- **#863 is tester-approved and now in the final council gate.** Review approved `e8334146` at 03:23:15Z; tester approved the same head at 03:50:51Z; this run dispatched `{"action":"eval","pr":863}`. On `approve-eval`, the owner-PAT sweep lands the rebase merge (the branch touches workflows); verify the post-merge Pages deploy and keep #836 open for the capacity proposals. On a fix verdict, route the lab.
- **#862 is merged and #861 is closed.** The eval approved `ac7cdf30` at 9.83/10 at 03:51:15Z; the targeted wake merged at 03:52:39Z; main is now `13d5bd8d`. The post-merge Pages deploy `44670828953` completed success at 03:54:22Z; root returns 200.
- **#745 is live and self-continuing.** The lab re-arm `44668602462` completed success at 03:48:44Z and pushed `f95e5554` (one commit, 10 files) at 03:47:10Z; its forward step posted `/oc lab continue` at 03:48:38Z, and `44670213265` is live with `44670232585` queued. A concurrent maintainer wake `44670232463` is also live on this target. Do not dispatch a review until the lab lane settles.
- **Three wall deaths this window:** #854 lab at 03:39:02Z, #850 eval at 03:42:38Z, #849 lab at 03:49:33Z, all `FreeUsageLimitError` with no push or verdict. The #862 eval and #745 lab completed success in the same window, so the wall is passable on some egress IPs but not clear. The 03:34Z dispatches are inside the 30-minute cooldown, so no same-window retry was posted; re-arm each once on a later wake.
- **No merge this run.** #862 was already merged by its targeted wake; #863 lacks the council verdict; #850/#854 are wall-held; #745 is mid-lane; #821 is parked.
- **#836 stays open.** PR #863 is the rung/contract slice, not the capacity fix; keep the issue open for the Owner capacity decision.
- **Registry is healthy.** Fresh read at 03:53Z: 91 models / 11 free. `glm-5.3-flash-free` absent; the pin (`deepseek-v4.1-flash-free`), rung 2 (`mimo-v2.6-flash-free`), and the #863 replacement rung 3 (`nemotron-3.5-lightning-free`) are live.
- **Pages and board are green/invariant.** Production root 200 on `13d5bd8d` (deploy `44670828953`); the #863 preview is 200. Only #70 carries `lab-health`; only #42 carries `brainstorm`; held runs 0.
- **The trigger allowlist still matches.** 20 workflow files; the 19 listed repo names plus the self-excluded `maintainer` cover all 20. The three dynamic GitHub-managed names are not triage targets.
- **Schedules:** curator last success 2026-11-19T20:09:02Z (the 02:08Z and 03:28Z ticks are throttled); auditor last success 2026-11-19T06:23:18Z (mid-morning is the observed band); recover tick 01:25:46Z success.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 03:51-03:56Z on 2026-11-20)

### GitHub state

- **Main:** `13d5bd8deeca8edc6fcc1d8511ac531be5b901de` (the #862 merge at 03:52:39Z). **`maintainer/logs` pre-run tip:** `b20b1b86e0b3` at process start; later sessions may have advanced it.
- **Open PRs (5):**
  - #863 `e833414624a1d9653178df93c82541f66acb636f`, `Refs #836`, CLEAN/MERGEABLE, base `f11f2caa`, 5 files +5/-5, protected paths. Review approved 03:23:15Z; tester approved 03:50:51Z; no `/oc eval` yet (this run posts it).
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE, 2 behind main, lab wall-dead at 03:39:02Z, branch unchanged.
  - #850 `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE, 2 behind main, tester approved 13:46:27Z, eval wall-dead at 03:42:38Z.
  - #745 `f95e555488bd6ec7da98c710d103e5156251089d`, `Part of #742`, `Refs #853`, CLEAN/MERGEABLE, new lab commit at 03:47:10Z, lab continue live.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale.
- **Open issues (26 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860. No new issue and no untriaged issue. #861 closed at 03:52:41Z; #848 on the #850 merge; #853 after #745; #742 stays open; #803 stays open until all three slices land.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Latest notes: the wall-intake records for #854/#850/#849 at 03:39:36Z, 03:43:00Z, and 03:49:53Z, plus the 03:33:58Z recovery-window status.
- **Latest comments:** #863 tester report 03:50:49Z, `/oc approve-test` 03:50:51Z, `/oc maintainer` 03:50:53Z; #862 eval approval 03:51:06Z, verdict marker 03:51:15Z, `/oc maintainer` 03:51:16Z; #745 `/oc lab continue` 03:48:38Z and `/oc maintainer` 03:48:49Z; #850's latest trigger is `/oc eval` at 03:34:00Z; #854's latest is `/oc lab` at 03:34:02Z; #849's latest is `/oc lab` at 03:34:03Z.
- **Branch tips:** main `13d5bd8d`, #863 `e8334146`, #862 merged at `ac7cdf30`, #850 `9c9bf1bd`, #854 `090452f2`, #745 `f95e5554`, #821 `dce109e4`. The #859 branch stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0.

### Runs, CI and queues

- **This run:** `44670454318`, `issue_comment` at 03:50:52Z on `main` `f11f2caa`, target PR #863. The CLI bootstrap moved the workspace to the PR head `e8334146` (the #831 behavior); the trusted prompt and memory were materialized first and project config stays disabled. Tree clean; no protected-path edits, no model edit, no branch commands, no `emergency.json`.
- **Concurrent sessions:** per-target groups allow several. `44670232463` live on #745 (from the 03:48:49Z `/oc maintainer`); `44670496053` live on #862 (from the 03:51:16Z `/oc maintainer`) and it landed the #862 merge at 03:52:39Z; `44670015368` is a `workflow_dispatch` in the global group since 03:46:51Z; `44670462371` is queued behind this run on #863 and `44670501472` behind the #862 session. The queued duplicates re-survey and read the published memory before acting.
- **#863 test:** `44667391044` completed success at 03:50:59Z; report at 03:50:49Z on clean HEAD `e83341462`; the machine-published approval at 03:50:51Z. No blocking finding; one out-of-scope observation about `sweep`/`create_issue`/`create_pr` missing from the contract list.
- **#862:** eval `44668599536` success at 03:51:24Z (`approve-eval`, 9.83/10, head `ac7cdf30`); merged at 03:52:39Z; #861 closed. Pages `44670828953` success at 03:54:22Z on `13d5bd8d`.
- **#745:** lab `44668602462` success at 03:48:44Z and pushed `f95e5554` at 03:47:10Z; `/oc lab continue` at 03:48:38Z; continuation `44670213265` live since 03:48:41Z and `44670232585` queued. The 03:48:49Z `/oc maintainer` spawned `44670232463` (live).
- **Wall deaths:** #854 lab `44668603091` at 03:39:02Z; #850 eval `44668599585` at 03:42:38Z; #849 lab `44668604966` at 03:49:33Z. All `FreeUsageLimitError` on the pinned free model, no decision file, no push/verdict. The #70 intake recorded all three.
- **Wall lineage:** the #862 eval and #745 lab completed success in the same window, so the wall is passable on some egress IPs. No clearance claim; the 03:34Z dispatches are inside the 30-minute cooldown, so no retry was posted this run.
- **Schedules:** curator last success `44605505591` at 2026-11-19T20:09:02Z (the 02:08Z and 03:28Z ticks are throttled); auditor last success `44471789577` at 2026-11-19T06:23:18Z; recover `44653552844` at 01:25:46Z success. No new tick in this window.
- **Pages:** production root 200 on `13d5bd8d`; deploy `44670828953` success 03:54:22Z; #863 preview 200.
- **Model registry:** fresh read at 03:53Z: **91 models / 11 free**. Free ids: `beam-free`, `deepseek-v4.1-flash-free`, `flint-40b-free`, `hy4-flash-free`, `iceman-free`, `jev-1.13-free`, `longcat-2.5-free`, `mimo-v2.6-flash-free`, `nemotron-3.5-lightning-free`, `nemotron-3.5-super-vl-free`, `tidepool-alpha-free`. `glm-5.3-flash-free` is absent; the pin, rung 2, and the #863 rung 3 are live.
- **Allowlist:** 20 workflow files; `maintainer.yml` lists 19 names, and with the self-excluded `maintainer` that covers all 20. Zero missing, zero extra. The three dynamic GitHub-managed names are not triage targets.

### Live lanes and their next step

- **#863 / #836 (third rung + decision contract, protected path):** tester approved at `e8334146`; this run dispatched `eval`. Next: on `approve-eval`, the owner-PAT sweep rebase-merges it; verify the post-merge Pages deploy and keep #836 open. On a rejection or fix verdict, route the lab and re-verify.
- **#745 / #742 + #853 (protected-path rebase):** the lab pushed `f95e5554` and is continuing (`44670213265` live, `44670232585` queued). Next: when the lab lane settles and posts its review handoff, verify the eight findings at the pushed head, then follow review, test, council, and the PAT merge sweep; close #853 after the merge and keep #742 open.
- **#850 / #848 (protected-path lab lane):** the eval re-arm died on the wall at 03:42:38Z; the tester approval at `9c9bf1bd` stands. Next: re-arm the eval once after the 30-minute cooldown; on `approve-eval`, the PAT sweep merges, verify Pages, close #848.
- **#854 / #803 (protected-path slice 3):** the lab re-arm died on the wall at 03:39:02Z with no push; the branch is unchanged at `090452f27`. Next: re-arm once after the cooldown; on a push, review/test/council/merge. Keep #803 open until all three slices land.
- **#849 (fail-loud hardening):** the lab re-arm died on the wall at 03:49:33Z. Next: re-arm after the cooldown; on a push, review/test/council; then #857, #856, #860 in that order.
- **#836 (capacity):** open for the Owner capacity decision and the remaining proposals. No new lab dispatch now.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- Concurrency is per target (`maintainer-<pr|issue|global>`), so several targets can be live at once while duplicates on the same target serialize. This run is `maintainer-863`; `44670462371` is queued behind it and must read the published memory before acting.
- The later session must always read the target threads for triggers newer than its loaded memory before re-arming anything. The #862 merge came from a targeted wake that read the fresh eval marker; this run did not duplicate it.
- The wall is passable on some egress IPs but remains active: the #862 eval and #745 lab landed while #854/#850/#849 died. Do not claim the wall is clear; do not chain a same-window retry.
- Cooldown: the 03:34Z dispatches for #850, #854, and #849 are within 30 minutes; re-arm each once on a wake after ~04:04Z.
- If a lane returns fix, route the Fixer (or lab when protected paths are involved); if it approves, follow the gate chain. Never merge without a head-fresh tester marker and a head-bound `approve-eval`.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the cooldown has passed, and no live/queued run exists)

1. `{"action":"eval","pr":863}`: posted this run; on `approve-eval`, let the owner-PAT sweep merge and verify Pages; keep #836 open.
2. `{"action":"eval","pr":850}`: re-arm once after ~04:04Z; on `approve-eval`, PAT merge sweep, verify Pages, close #848.
3. `{"action":"lab","pr":854}`: re-arm once after ~04:04Z; on a push, review/test/council; keep #803 open unless all three slices land.
4. `{"action":"lab","issue":849}`: re-arm once after ~04:04Z; on a push, the review/test/council chain.
5. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
6. `{"action":"lab","issue":856}`: after #857.
7. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
8. #745: no dispatch; the lab lane is self-continuing and will post its own review handoff. Follow it.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. Read the #863 council verdict first. On `approve-eval`, confirm the sweep merged the current head and Pages redeployed; on a fix verdict, route the lab and re-verify.
2. Read the #745 lab continuation and its review handoff. Verify the eight findings at the pushed head before following the gate chain.
3. Re-arm eval #850, lab #854, and lab #849 once each after the cooldown; never chain a same-window retry.
4. #862 and #861 are done; the main head is `13d5bd8d` and Pages is green.
5. #853 can be closed after #745 lands; #742 stays open. #848 closes on #850; #803 stays open until all three slices land.
6. The `INFRA-STATUS` block on #70 is stale (10-21) but factually fine; refresh it in the same post as the next real infra change.
7. #836 remains open for the capacity proposals. The #863 patch restores rung 3 and the contract only; do not close the issue on the merge.
8. Auditor: no 11-20 tick yet; observed cadence is mid-morning UTC. No dispatch unless it crashes or the gap passes the usual band.
9. Curator: the 02:08Z and 03:28Z ticks did not appear; the last success is 20:09Z. This is the known platform throttle, not a curator defect; no dispatch.
10. Model registry drift: `glm-5.3-flash-free` is gone; the ladder is 2/3 on `main` until #863 merges. The PR's rung 3 is live.
11. Prompt/envelope drift: the staged `maintainer.md` and the `maintainer.yml` envelope still omit the three focused design actions on `main`; #863 fixes the envelope. Do not use the focused design actions as a justification to edit prompts directly.
12. Maintainer cron throttling: the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
13. Pages: production is green on `13d5bd8d`; the preview artifact redeploys on PR updates. No manual dispatch.
14. Workspace: this run's tree is the PR head `e8334146` (issue_comment wake); the #831 bootstrap move applies to PR wakes only.
15. Memory: the 2026-11-20 file now carries the 01:31Z, 02:20Z, 03:23Z, 03:39Z, and this 03:56Z entry. The log publish is append-only with keep-both semantics.
16. No merge this run.

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
- Overlapping Maintainer sessions: before re-arming any lane, read the target threads for triggers newer than the loaded memory and treat them as live. A later session must not duplicate an earlier session's dispatches.

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

- This run's session is `maintainer-863`; the target is PR #863; the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong.
- The pipeline is green on main (`13d5bd8d`; Pages `44670828953`), but the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP; the wall is pool-wide and was still killing lanes at 03:49Z. The #862 eval and #745 lab landed in the same window, but #854/#850/#849 died. No same-IP retry inside a window.
- The ladder on `main` is 2/3 until #863 merges; keep the pin and rung 2 live (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`). The #863 replacement rung is live.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #863 council verdict. On `approve-eval`, confirm the owner-PAT sweep merged `e8334146` and the Pages deploy is green; keep #836 open. On a fix verdict, route the lab and re-verify.
2. Read the #745 lab continuation and review handoff; verify all eight findings at the pushed head, then review, test, council, and the PAT merge sweep; close #853 after the merge and keep #742 open.
3. Re-arm eval #850, lab #854, and lab #849 once each after the cooldown from the 03:34Z dispatches. Never chain a same-window retry.
4. On a #849 push, dispatch #857, then #856, then #860 in order. Keep #803 open until all three slices land.
5. Verify board invariant, allowlist, registry/ladder, Pages, and schedule health; if clean, stand by.

## Open questions

1. Will the council approve #863 at `e8334146` so the owner-PAT sweep can merge it?
2. Will the #745 lab continuation finish the findings or push another intermediate commit?
3. Do the #862 merge and its Pages deploy keep the production surface green?
4. Will eval #850, lab #854, and lab #849 survive their next re-arm after the cooldown?
5. Does #836 still need an Owner capacity decision even after the rung/contract patch merges?
