# STATE

Last updated: 2026-11-21T06:04Z by run 44873122583

(heartbeat wake after a 3h52m scheduler gap: the 01:52 final-quality draw died on the wall at 02:02 and the allowance window has not demonstrably cleared, so this session stands down and the queue stays parked. No merge.)

## TL;DR for the next Hephaestus

- **The 01:52 final-quality draw died on the wall at 02:02:15Z** with `retry-after: 80405` (about 2026-11-22T00:22Z, diagnostic only) and no verdict. The 02:02 intake stood down and posted the lab-health note; no recovery run followed.
- **A 3h52m scheduler gap followed** (02:03-05:55Z, zero runs). The recover heartbeat dispatched this 05:55Z session, which is live on the unchanged free pin. The auditor and curator scheduled ticks returned at 05:59Z and 06:03Z and are in flight. But a live Maintainer session is not the multi-lane clearance the wall rule requires, and the same "live session" test already failed at 01:43, so this session issues no new draw.
- **No draw this run; the queue stays parked** until a heavy lane completes on the free pin with no new wall death, or the Owner resolves the capacity question on #836. The next real session re-arms #745 first when that evidence lands.
- **The older queue stays parked:** #863 eval, #850 eval, #854 lab, #849 lab wait for the same window.
- **No merge:** nothing carries a head-bound `approve-eval`. #745's review and dynamic gates stand; the final gate has no verdict.
- **Board, allowlist, Pages, registry, held runs:** #70 is the only board; the 19+self allowlist matches all 20 repo-managed names; production `44687132253` green 2026-11-20 06:20:42Z on `13d5bd8d`, live root HTTP 200; held runs 0; no new issues; registry 104 models / 11 free with the pin, rung 2, and the #863 rung 3 live; `glm-5.3-flash-free` is absent, so the ladder on main is 2/3 until #863 merges.
- **Next wake owns the next window test:** on a heavy-lane completion with no new wall death, re-arm #745; on another wall death, stand down again; do not repeat the failed "live session equals draw" heuristic.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 05:56-06:05Z on 2026-11-21)

### GitHub state

- **Main:** `13d5bd8deeca8edc6fcc1d8511ac531be5b901de` (#862 merged 2026-11-20 03:52:39Z). **`maintainer/logs` pre-run tip:** `2bfc97e586a01013001c59baed7ec00f7d863196` (the 02:02 intake appended one marker only; STATE stayed at the 01:51Z stamp).
- **Open PRs (5):**
  - #745 `a3fff3a5fc8b0e6e9e1161c19e5230fcac6f953c`, `Part of #742`, `Refs #853`, CLEAN/MERGEABLE, base `13d5bd8d`, 4 commits +983/-21 across 11 files. Review `44687122388` approved this head 06:41:55Z; dynamic gate `44689657087` passed 07:06:49Z with the `/oc approve-test` marker at 07:07:00Z. Evals `44694660389` (07:59:17Z), `44709624984` (09:45:40Z), `44788669496` (18:01:25Z), and `44852664667` (02:02:31Z) all wall-dead with no verdict. No `/oc fix` after the review; newest comment is the 01:52:03Z `/oc eval`.
  - #863 `e833414624a1d9653178df93c82541f66acb636f`, `Refs #836`, CLEAN/MERGEABLE, base `f11f2caa`, 5 files +5/-5, protected paths. Review approved 03:23:15Z; test approved 03:50:51Z; eval `44671178373` wall-dead 04:21:35Z with no decision.
  - #850 `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE, base `620bb8d2`, 2 behind main; test approved 2026-11-19T13:46:37Z; eval `44668599585` wall-dead 03:42:38Z.
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE, base `e5cd250c`, 2 behind main; lab `44668603091` wall-dead 03:39:13Z; branch unchanged.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale, base `86570af1`.
- **Open issues (26 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860. No new issues since 2026-11-19T06:48Z. #677/#678/#659 are the long-frozen Maze Chase standing set under #582, not new triage; do not route them without the Owner. #853 closes after #745 lands; #742 stays open; #848 closes on #850; #803 stays open until all three slices land.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Newest notes: the 19:44:55Z curator self-heal cap, 19:45:24Z intake, 19:47:40Z recovery cap, 20:34:18Z recovery cap, 23:44:29Z heartbeat marker, 23:47:07Z recovery cap, 01:52:02Z status, 02:02:52Z intake, 05:55:39Z heartbeat marker, and this run's note.
- **Latest comments:** #745 ends at the 01:52:03Z `/oc eval` (no verdict); #863 last `/oc eval` 03:57:36Z (2026-11-20); #850 last `/oc eval` 03:34:00Z; #854 last `/oc lab` 03:34:02Z; #849 last `/oc lab` 03:34:03Z. No trigger newer than 01:52:03Z on any lane, and no human directive.
- **Branch tips:** main `13d5bd8d`, `maintainer/logs` `2bfc97e5`, #745 `a3fff3a5`, #863 `e8334146`, #850 `9c9bf1bd`, #854 `090452f2`, #821 `dce109e4`. The #859 branch `opencode/issue858-curate-umbra-count-copy` stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0.
- **This run:** `44873122583`, `workflow_dispatch` heartbeat at 05:55:40Z; the 05:55:49Z fan-out skipped. Workspace at main `13d5bd8d`; tree clean; no protected-path edits; no model edit; no branch commands; no `emergency.json`.

### Runs, CI and queues

- **This run:** `44873122583`, heartbeat at 05:55:40Z from recover `44873075712` (05:55:04Z, success); the fan-out `44873132721` skipped. The last real session stamp was 01:51Z, so the 90-minute window had passed.
- **02:02 wall:** eval `44852664667` started 01:52:06Z, died 02:02:15Z with `AI_APICallError: Free usage limit reached` / `FreeUsageLimitError`, `retry-after: 80405` (about 2026-11-22T00:22Z, diagnostic only), and the verify step failed closed with no decision at 02:02:28Z. Intake `44853635983` (workflow_run, 02:02:34Z) stood down without an agent, posted the 02:02:52Z note, and succeeded 02:03:19Z. Its `QUOTA_RECOVERY_ATTEMPT` was empty; no recovery run followed.
- **Scheduler gap:** zero runs between 02:03:19Z and 05:55:04Z (3h52m). The 00:00Z curator tick, the auditor tick, and the maintainer cron in that window did not fire. Known throttling class (#831/#836), not a new defect.
- **Scheduled ticks returned:** auditor `44873396723` in progress since 05:59:30Z; curator `44873751278` in progress since 06:03:47Z. Their results are the next fresh-lane evidence; do not dispatch while they are in flight.
- **Wall:** last death 02:02:15Z; prior deaths #863 eval 04:21:35Z, #850 eval 03:42:38Z, #854 lab 03:39:13Z, #849 lab 03:49:33Z (all 2026-11-20), plus the #745 evals at 07:59:17Z, 09:45:40Z, and 18:01:25Z. The 01:52 draw is the only death on 2026-11-21. This session is live 3h54m later, but that is not enough to re-arm after the 01:43 heuristic failed.
- **#745 gate chain:** review `44687122388` success 06:42:07Z; dynamic gate `44689657087` success 07:07:06Z; evals `44694660389`, `44709624984`, `44788669496`, and `44852664667` all wall-dead with no decision. No verdict.
- **Pages:** preview `44687118114` success 06:20:35Z on `a3fff3a5`; production `44687132253` success 06:20:42Z on `13d5bd8d`; live root HTTP 200.
- **Model registry:** fresh read 05:57Z: **104 models / 11 free**; pin `deepseek-v4.1-flash-free`, rung 2 `mimo-v2.6-flash-free`, and the #863 rung 3 `nemotron-3.5-lightning-free` are live; `glm-5.3-flash-free` is absent. The ladder on main is 2/3 until #863 merges. New free ids: beam-free, flint-40b-free, hy4-flash-free, iceman-free, jev-1.13-free, longcat-2.5-free, nemotron-3.5-super-vl-free, tidepool-alpha-free. No upgrade dispatch: the free-id churn is not a scheduled target and #863 already restores the rung.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo-managed names. Zero missing, zero extra (the three dynamic GitHub-managed workflows are outside the allowlist by design).
- **Schedules:** auditor last success 06:08:22Z (2026-11-20), with a new tick in progress at 05:59:30Z; curator last scheduled success 19:43:03Z (2026-11-20), then its 19:45:00 self-heal dispatch failed on the wall, and a new tick is in progress at 06:03:47Z; maintainer last real schedule 01:43:46Z (2026-11-21) and this 05:55:40Z heartbeat; recover last success 05:55:04Z.

### Live lanes and their next step

- **#745 / #742 + #853 (protected-path hardening):** head `a3fff3a5`, review and dynamic gate approved, final quality gate still open after four wall deaths. Next: re-arm first when the window demonstrably clears; on `approve-eval`, PAT merge sweep, Pages verification, close #853, keep #742 open; on `fix`, route the protected-path work to the lab.
- **#863 / #836 (protected path):** review and test approved on `e8334146`; eval wall-dead 04:21:35Z. Next: re-arm the eval after #745 clears; on `approve-eval`, rebase merge, verify Pages, keep #836 open; on `fix`, route the lab.
- **#850 / #848 (protected-path lab lane):** eval wall-dead 03:42:38Z; the Tester approval at `9c9bf1bd` stands. Next: re-arm the eval after the window holds; on `approve-eval`, PAT merge sweep, Pages, close #848.
- **#854 / #803 (protected-path slice 3):** lab wall-dead 03:39:13Z; branch unchanged. Next: re-arm once after the window holds; on a push, review/test/eval; keep #803 open until all three slices land.
- **#849 (fail-loud hardening):** lab wall-dead 03:49:33Z; the trigger carries the expanded scope. Next: re-arm once after the window holds; then #857, #856, #860 in that order (#860 only after #854).
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch; #863 is the rung/contract slice. The persistent wall is now the dominant blocker, not a code defect.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- This run is the only live maintainer session; no sibling is active. The auditor and curator scheduled ticks are in flight; no Maintainer dispatch while they run. The queue has no live or queued run; the next heavy-lane dispatch will summon a maintainer run on completion through the `workflow_run` allowlist.
- The wall rule governs: a wall always wins; no same-runner retry, no same-pool burst, and no repeat of a strategy that already failed. The 01:43 "live session equals draw" heuristic failed when its draw died at 02:02; this session does not repeat it. A new draw waits for a heavy-lane completion with no new wall death, or for the Owner's capacity decision on #836.
- If a later #745 attempt approves, follow the merge chain; if it returns `fix`, route the protected-path work to the lab; if it dies on the allowance again, stand down again.
- Never merge without a head-fresh Tester marker and a head-bound `approve-eval`.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the window demonstrably holds, and no live/queued run exists)

1. `{"action":"eval","pr":745}`: wall-dead 02:02:31Z; re-arm first when a heavy lane completes with no new wall death. On `approve-eval`, PAT merge sweep, Pages, close #853, keep #742 open.
2. `{"action":"eval","pr":863}`: wall-dead 04:21:35Z; re-arm after #745 clears and the window still holds; on `approve-eval`, rebase merge, Pages, keep #836 open.
3. `{"action":"eval","pr":850}`: wall-dead 03:42:38Z; re-arm after the window holds; on `approve-eval`, PAT merge sweep and close #848.
4. `{"action":"lab","pr":854}`: wall-dead 03:39:13Z; re-arm after the window holds; on a push, review/test/eval; keep #803 open unless all three slices land.
5. `{"action":"lab","issue":849}`: wall-dead 03:49:33Z; re-arm after the window holds; on a push, the review/test chain.
6. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
7. `{"action":"lab","issue":856}`: after #857.
8. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. The #745 final quality gate has no verdict; the 02:02 draw died on the wall. Re-arm it first when a heavy lane completes with no new wall death. On `approve-eval`, the PAT merge sweep, verify Pages, close #853, keep #742 open; on `fix`, route the protected-path work.
2. Re-arm #863 eval, #850 eval, #854 lab, and #849 lab once each only after the #745 verdict and at least one more fresh completion with no new wall death; never a same-pool burst.
3. #862 is done: merged `13d5bd8d`, #861 closed, Pages green.
4. #745 body: the review's only residuals are pre-existing and out of this slice (other owner-PAT lanes lack the privileged launcher/preamble; proxy/TLS keys are unpinned). Track on #742, do not expand this PR.
5. #853 can be closed after #745 lands; #742 stays open. #848 closes on #850; #803 stays open until all three slices land.
6. #836 remains open for the capacity proposals. #863 restores rung 3 and the contract only; do not close the issue on the merge. The persistent wall is now the dominant blocker.
7. Auditor: last real scheduled run 06:08:22Z on 2026-11-20; no newer schedule observed. Curator: last scheduled success 19:43:03Z on 2026-11-20, then its 19:45:00 self-heal dispatch failed on the wall; the 00:00Z tick was not observed. Both are the known throttling/allowance class; no manual dispatch.
8. Model registry drift: `glm-5.3-flash-free` is gone; the ladder is 2/3 on main until #863 merges. The PR's rung 3 is live. No lab dispatch: #863 is the fix.
9. Prompt/envelope drift: #863 fixes the staged `maintainer.md` and the `maintainer.yml` envelope for `design-ux`/`design-visual`/`design-motion`. Do not edit prompts directly.
10. Maintainer cron throttling: the 20-minute schedule has large gaps; the last gap was 02:03-05:55Z (3h52m). The recover heartbeat and manual dispatches are the liveness paths (#836/#831).
11. Pages: production is green on `13d5bd8d`; the preview artifact redeploys on PR updates. No manual dispatch.
12. Workspace: this run's tree is main `13d5bd8d` (heartbeat dispatch, no PR-head move); the trusted prompt and memory were materialized before the checkout.
13. Memory: the 2026-11-21 file now carries the 01:44-01:51 entry, the 02:02 intake marker, and this 05:55-06:05 entry. The 2026-11-20 file carries the 18:00Z entry plus run markers for the 18:01-23:47Z wall stand-downs. The log publish is append-only with keep-both semantics.
14. No merge and no dispatch this run.

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

- This run's session is a global heartbeat dispatch (no target PR); the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong.
- The pipeline is green on main (`13d5bd8d`; Pages success 06:20:42Z), but the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP and sporadic across runners; the wall last killed the #745 eval at 02:02Z on 2026-11-21, then the 3h52m scheduler gap followed. This 05:55Z session is live, but the "live session equals draw" heuristic already failed at 01:43; do not repeat it.
- The ladder on `main` is 2/3 until #863 merges; keep the pin and rung 2 live (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`). The #863 replacement rung is live.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the auditor and curator results first; a clean completion is the next window evidence. The #745 final quality gate has no verdict; the 02:02 draw died on the wall. Re-arm it first when a heavy lane completes with no new wall death. On `approve-eval`, the PAT merge sweep, verify Pages, close #853, keep #742 open. On `fix`, route the protected-path work. Do not dispatch a duplicate while the gate is live.
2. When the window demonstrably holds, re-arm #745 first, then #863 eval, #850 eval, #854 lab, and #849 lab once each; never a same-pool burst. If the wall persists, stand by and keep #836 visible for the Owner.
3. Verify the board invariant, allowlist, registry/ladder, Pages, held runs, and schedule health; if clean, stand by.

## Open questions

1. When will the allowance window clear enough for the next #745 final-quality attempt?
2. When will multiple fresh lanes complete again so the #863/#850/#854/#849 queue can be re-armed without a same-pool burst?
3. The auditor and curator ticks returned at 05:59Z and 06:03Z; will they complete cleanly, and is the scheduler recovering after the 3h52m gap?
4. Does #836 still need an Owner capacity decision after #863 lands, and is the provider plan now the only way to break the wall?
