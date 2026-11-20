# STATE

Last updated: 2026-11-20T04:16Z by run 44670232463

(PR #745 wake: the new head `f95e5554` closes the round-1 findings and is verified; the continuation is live. The copy lane merged as `13d5bd8d` and production redeployed green; the fallback-rung repair is in its final gate; the wall-dead lanes stay parked under the wall rule. No merge, no duplicate dispatch.)

## TL;DR for the next Hephaestus

- **#745 is mid-lane on a new head.** Lab run `44668602462` produced `f95e5554` (completed 03:48:44Z) and its forward posted `/oc lab continue` at 03:48:38Z; continuation `44670213265` started 03:48:45Z and is in progress. The second commit closes the round-1 findings (nonce hermeticity, `GH_CONFIG_DIR=/proc` and empty `DYLD_*` on all 15 steps, strict loader, removed-`GH_CONFIG_DIR` mutation, `GIT_CONFIG` cleanup, R1-R36 banners, AGENTS/LAB claims). This run independently verified: audit 37/37 twice, 21 YAML parse, `bash -n`, clean diff, 15/15 key map. Do not review until the branch settles.
- **#863 is in its final gate.** Test `44667391044` approved at 03:50:51Z; eval `44671178373` live since 03:57:41Z. On `approve-eval`, rebase merge, verify Pages, keep #836 open.
- **#862 merged** as `13d5bd8d` at 03:52:39Z; #861 closed; Pages success at 04:01:52Z.
- **The wall-dead lanes stay parked.** #849 lab failed 03:49:33Z, #854 lab 03:39:13Z, #850 eval 03:42:38Z, all on the provider allowance. The wall rule: a wall always wins, no same-IP retry; the intake notes are on #70; a later wake re-arms once only after the wall demonstrably clears. The #745 continuation and the #863 eval are alive, so the wall is passable on some egress IPs; no clearance claim.
- **No merge this run.** No PR has a current-head Tester marker plus a head-bound `approve-eval`.
- **#836 stays open** for the capacity decision; #863 only restores rung 3 and the contract.
- **Board, allowlist, Pages:** #70 is the only board; the 19+maintainer allowlist matches all 20 repo names; production is green on `13d5bd8d`.
- **Schedules:** curator last success 2026-11-19T20:09:02Z; auditor 2026-11-19T06:23:18Z; recover 01:25:46Z.

## Who I am

Hephaestus, the Maintainer of this repository. I do not write project code; I keep the pipeline full and the gates honest, and I route every change through the Lab Engineer, reviewer, tester, auditors, curators, and eval. "I'll do it myself" should lose to "route it." I act only when the owner expressly asks or routine triage is due. I use subagents for parallel read-only investigation only when it materially saves time, and the capped 3-8-line delegation ledger is mandatory where required.

## Right now (surveyed 03:48-04:14Z on 2026-11-20)

### GitHub state

- **Main:** `13d5bd8deeca8edc6fcc1d8511ac531be5b901de` (#862 merged 03:52:39Z). **`maintainer/logs` pre-run tip:** `d154fade9b763c93e28f74b580139c749b213b68`.
- **Open PRs (5):**
  - #863 `e833414624a1d9653178df93c82541f66acb636f`, `Refs #836`, CLEAN/MERGEABLE, base `f11f2caa`, 5 files +5/-5, protected paths. Review approved 03:23:15Z; test `44667391044` success 03:50:59Z; `/oc approve-test` 03:50:51Z; eval `44671178373` live since 03:57:41Z.
  - #850 `9c9bf1bd72fb459388d2985656f6f61735147105`, `Closes #848`, CLEAN/MERGEABLE, 2 behind main, Tester approved 13:46:27Z; eval `44668599585` wall-dead at 03:42:38Z.
  - #854 `090452f27c575a31e617bc5c7083c6ee441b0653`, `Closes #803`, CLEAN/MERGEABLE, 2 behind main; lab `44668603091` wall-dead at 03:39:13Z; branch unchanged.
  - #745 `f95e555488bd6ec7da98c710d103e5156251089d`, `Part of #742`, `Refs #853`, CLEAN/MERGEABLE, base `f11f2caa`, 10 files +934/-17; lab continuation `44670213265` live since 03:48:45Z.
  - #821 `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN, parked Point of Sale.
- **Open issues (26 non-PR):** #42, #70, #582, #655, #657, #659, #661, #677, #678, #683, #742, #773, #774, #792, #803, #812, #814, #815, #831, #836, #848, #849, #853, #856, #857, #860. #861 closed on the #862 merge; #848 closes on #850; #853 after #745 lands; #742 stays open; #803 stays open until all three slices land.
- **Board invariant holds:** only #70 carries `lab-health` and only #70 has the exact title `Lab Health & Audit Logs`; #42 is the only other labelled issue (`brainstorm`). Latest notes: the 03:43:00Z and 03:49:53Z quota intake notes, the 03:57:23Z #863 decision, the 04:00:58Z recovery status, the 04:01:34Z merge status, the 04:09:37Z duplicate-wake note.
- **Latest comments:** #745 `/oc lab continue` 03:48:38Z and `/oc maintainer` 03:48:49Z; #863 `/oc approve-test` 03:50:51Z and `/oc eval` 03:57:36Z; #849 `/oc lab` 03:34:03Z (its run died on the wall); #854 `/oc lab` 03:34:02Z; #850 `/oc eval` 03:34:00Z.
- **Branch tips:** main `13d5bd8d`, `maintainer/logs` `d154fade`, #863 `e8334146`, #850 `9c9bf1bd`, #854 `090452f2`, #745 `f95e5554`, #821 `dce109e4`. The #859 branch stays intact at `9b862e48` (never delete). No recovery due.
- **Held runs:** 0.

### Runs, CI and queues

- **This run:** `44670232463`, `issue_comment` at 03:48:49Z on `main` `f11f2caa`, target #745. The CLI bootstrap moved the workspace to `f95e5554` after materializing the trusted prompt and memory (the #831 behavior). Tree clean; no protected-path edits, no model edit, no branch commands, no `emergency.json`.
- **#745 continuation:** `44670213265`, started 03:48:45Z, in progress. The duplicate lab run `44670232585` (created 03:48:53Z by the `/oc maintainer` comment; it will skip at the job gate) is queued behind it in group `lab-745`. The workflow_run maintainer `44670240033` is queued behind this run and will skip at its gate.
- **Sibling maintainer sessions:** `44670311946` success 03:49:36Z, `44670454318` success 03:50:52Z, `44670496053` success 03:51:16Z, `44670501472` success 03:51:19Z; their notes are the 03:57-04:09Z board posts. They dispatched the #863 eval and posted the merge/recovery status; none dispatched a duplicate.
- **#863:** test `44667391044` success 03:50:59Z; eval `44671178373` in progress since 03:57:41Z.
- **Wall deaths:** #849 lab `44668604966` failure 03:49:33Z (agent step 03:49:32Z) with the intake note 03:49:53Z; #854 lab `44668603091` failure 03:39:13Z (agent step 03:39:02Z); #850 eval `44668599585` failure 03:42:38Z. No push from any of them.
- **Wall state:** the #745 continuation (03:48:45Z) and the #863 eval (03:57:41Z) are alive, so the wall is passable on some egress IPs; no clearance claim until multiple fresh runs complete.
- **Schedules:** curator last success `44605505591` at 2026-11-19T20:09:02Z; auditor last success `44471789577` at 2026-11-19T06:23:18Z; recover `44653552844` at 01:25:46Z success.
- **Pages:** production deploy success 04:01:52Z on `13d5bd8d`; the root is green.
- **Model registry:** last fresh read 03:38Z: 91 models / 11 free; `glm-5.3-flash-free` absent; the pin (`deepseek-v4.1-flash-free`), rung 2 (`mimo-v2.6-flash-free`), and the #863 rung 3 (`nemotron-3.5-lightning-free`) are live. The ladder on main is 2/3 until #863 merges.
- **Allowlist:** `maintainer.yml` lists 19 repo workflow names; with the self-excluded `maintainer` that covers all 20 repo names. Zero missing, zero extra.

### Live lanes and their next step

- **#745 / #742 + #853 (protected-path rebase):** head `f95e5554`, continuation live. This run verified all round-1 findings at this head. Next: on the continuation's push, verify the final head, then a fresh head-bound review, test, eval, PAT merge sweep; close #853 after the merge and keep #742 open. The body still says one commit and lists `GH_CONFIG_DIR` as a follow-up; it will be refreshed on the push.
- **#863 / #836 (third rung + decision contract, protected path):** test approved at `e8334146`; eval live. Next: on `approve-eval`, rebase merge, verify Pages, keep #836 open for the capacity decision; on `fix`, route the lab.
- **#862 / #861 (curator copy + probe fixes):** merged as `13d5bd8d`; #861 closed; Pages green.
- **#850 / #848 (protected-path lab lane):** eval wall-dead at 03:42:38Z; the Tester approval at `9c9bf1bd` stands. Next: re-arm the eval once on a later wake after the wall demonstrably clears; on `approve-eval`, PAT merge sweep, Pages, close #848.
- **#854 / #803 (protected-path slice 3):** lab wall-dead at 03:39:13Z; branch unchanged at `090452f27`. Next: re-arm once on a later wake after the wall clears; on a push, review/test/eval; keep #803 open until all three slices land.
- **#849 (fail-loud hardening):** lab wall-dead at 03:49:33Z; the trigger carries the expanded scope. Next: re-arm once after the wall clears; then #857, #856, #860 in that order.
- **#836 (capacity):** open for the Owner capacity decision. No new lab dispatch now; #863 is the rung/contract slice.
- **#821 / #823** (Point of Sale staging): parked. Do not dispatch.
- **Maze Chase standing set:** #582 parent and #655/#657/#659/#661/#677/#678/#683 are slow/frozen; no action unless the Owner asks.
- **Board / health:** #70 is the only board. Every ping ends with the Maintainer sign-off; no inline trigger tokens (#775).

## Concurrency and wall coordination

- The 03:48-03:51Z sibling sessions completed and posted the board notes; this run is the only Maintainer session live now. The queued duplicates are skip-only.
- The wall rule is binding: a wall always wins; no same-IP retry. The wall-dead lanes are parked for a later wake, and the intake notes are on #70. Do not chain a retry inside the wall window.
- Do not claim the wall is clear until multiple fresh runs complete. The #745 continuation and the #863 eval are alive, but that is one window, not a clearance.
- If a lane returns `fix`, route the Fixer (or the lab when protected paths are involved); if it approves, follow the gate chain. Never merge without a head-fresh Tester marker and a head-bound `approve-eval`.
- Do not mention any agent, workflow, model, harness, or tool by name in a PR comment (the code is the only exception). Board notes stay trigger-token-free.

## Serialized queue (re-post only if the lane did not land, the wall has cleared, and no live/queued run exists)

1. `{"action":"eval","pr":850}`: wall-dead at 03:42:38Z; re-arm once on a later wake after the wall clears; on `approve-eval`, PAT merge sweep and close #848.
2. `{"action":"lab","pr":854}`: wall-dead at 03:39:13Z; re-arm once on a later wake after the wall clears; on a push, review/test/eval; keep #803 open unless all three slices land.
3. `{"action":"lab","issue":849}`: wall-dead at 03:49:33Z; re-arm once after the wall clears; on a push, the review/test chain.
4. `{"action":"lab","issue":857}`: next in the fail-loud backlog after #849.
5. `{"action":"lab","issue":856}`: after #857.
6. `{"action":"lab","issue":860}`: after #856; shares `opencode-review.yml` with the #854 lane, so do not start before #854 lands.
7. #745: no dispatch; the continuation is live. Follow the workflow handoff.
8. #863: no dispatch; the eval is live. Follow the workflow handoff.

**Do not** re-post a trigger whose target already has a live or queued run from the last 30 minutes.

## Loose ends

1. Read the #745 continuation result first. On a push, verify the final head against the eight findings, then dispatch the review; on a `lab` decision, the workflow's own continuation runs again.
2. Read the #863 eval result. On `approve-eval`, rebase merge, verify Pages, keep #836 open; on `fix`, route the lab.
3. #850/#854/#849: parked on the wall; re-arm once on a later wake only after the wall clears; never chain a same-pool retry.
4. #862 is done: merged `13d5bd8d`, #861 closed, Pages green.
5. #745 body: still says one commit and lists `GH_CONFIG_DIR` as a follow-up; the continuation's push should refresh it. If the push lands without a body update, the body-only repair is a lab follow-up.
6. #853 can be closed after #745 lands; #742 stays open. #848 closes on #850; #803 stays open until all three slices land.
7. #836 remains open for the capacity proposals. #863 restores rung 3 and the contract only; do not close the issue on the merge.
8. Auditor: no 11-20 tick yet; observed cadence is mid-morning UTC. No dispatch unless it crashes or the gap passes the usual band.
9. Curator: the 02:08Z and 03:28Z ticks did not appear; the last success is 20:09Z. Known platform throttle, not a curator defect; no dispatch.
10. Model registry drift: `glm-5.3-flash-free` is gone; the ladder is 2/3 on main until #863 merges. The PR's rung 3 is live.
11. Prompt/envelope drift: #863 fixes the staged `maintainer.md` and the `maintainer.yml` envelope for `design-ux`/`design-visual`/`design-motion`. Do not edit prompts directly.
12. Maintainer cron throttling: the 20-minute schedule has large gaps; the recover heartbeat and manual dispatches are the liveness paths (#836/#831).
13. Pages: production is green on `13d5bd8d`; the preview artifact redeploys on PR updates. No manual dispatch.
14. Workspace: this run's tree is the PR head `f95e5554` (issue_comment event, the #831 bootstrap move); the trusted prompt and memory were materialized before the move.
15. Memory: the 2026-11-20 file now carries the 01:31Z, 02:20Z, 03:23Z (twice, keep-both), 03:39Z, and this 04:16Z entry. The log publish is append-only with keep-both semantics.
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

- This run's session is `maintainer-issue-745`; target #745; the memory branch is `maintainer/logs`.
- The contract asks for the six files only, and only the artifacts get committed. The memory commit lands after publication; the output artifacts are pushed as a `chore(memory)` commit.
- Attach everything to `maintainer/logs` (rebase onto fresh `origin/main` if it moved, keep-both resolve); never reset, never force push.
- The memory log entry must include the state snapshot (counts, PR heads, failures, base heads), the decisions and rationale, the callbacks that fired, and the open questions, plus the run link.

### Persistent facts

- Protected infra changes only through the lab lane; the Agent-write token cannot push workflow files, the domain PAT can.
- The brain is always mounted read-only; the memory files under `.maintainer/memory/` are the only persistent memory I can edit.
- The maintainer must always post a comment as its comment.md artifact or an explicit ping; a silent maintainer is a failure, independent of whether anything else is wrong.
- The pipeline is green on main (`13d5bd8d`; Pages success 04:01:52Z), but the platform is perf-sensitive: the jet and the grading site are not greenfield; multi-agent is the only way to keep the guards intact.
- Free-model provider walls are per-egress IP; the wall is pool-wide and was still killing lanes at 03:49Z. The #745 continuation and the #863 eval are alive, but no clearance claim. No same-IP retry inside a window.
- The ladder on `main` is 2/3 until #863 merges; keep the pin and rung 2 live (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`). The #863 replacement rung is live.
- Owner's protection contract: never cancel required checks; cancelled runs are not green.

## Next run

1. Read the #745 continuation result. On a push, verify the final head, dispatch the fresh head-bound review, then test/eval/merge; close #853 after the merge and keep #742 open.
2. Read the #863 eval result. On `approve-eval`, rebase merge, verify Pages, keep #836 open; on `fix`, route the lab.
3. On a later wake after the wall clears, re-arm #850, #854, and #849 once each in that order; never chain a same-pool retry.
4. Verify board invariant, allowlist, registry/ladder, Pages, and schedule health; if clean, stand by.

## Open questions

1. Will the #745 continuation clear the remaining work and push a final head, or does it need another round?
2. Will the #863 eval approve on `e8334146`?
3. Will the wall clear enough for the parked #850/#854/#849 lanes on a later wake?
4. Does the #745 body refresh land with the continuation's push?
