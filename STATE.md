# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39040495126 - [#607 BUILD COMPLETE at `6e5f046d`; review LIVE on the exact head; maintainer tick 39040486914 died with a transient provider FreeTierError (this run is the immediate next tick); #606 review live; #608 lab live; Windows arm live; decisions []]**

## PRs & Issues
 - **Open PRs:** **#607** (#605 desktop vehicle, head `6e5f046d`, branch `opencode/issue605-desktop-window-failure-fullscreen-probe`; build run 39037405708 success 14:22:51Z; 6 commits; body `Closes #605` + full live evidence; **review run 39040493121 in progress since 14:22:51Z on this exact head**; a skip-only review run 39040495220 queues behind it in the `opencode-review-607` group - harmless), **#606** (macOS tester vehicle, head `cbf94123`, rebased on `6270703a`; **review run 39040263173 in progress since 14:19:39Z** on the fixed head: 5s budget at `main.rs:664`, body `Refs #582`).
 - **#582 NATIVE ARMS:** macOS arm done 14:01:54Z (all three layers green on `9422b4eb`); its single defect fixed on #606 pending review+test. Windows arm 39036859435 `test-windows` in progress since 14:01:58Z (90-min budget to ~15:32Z). Parity rows flip after #606 goes green plus a fresh loaded macOS run.
 - **Issues:** **#608** (peros report-loss Infra) triaged 14:15:28Z; `/oc lab` posted 14:15:29Z; **Lab Engineer run 39039975528 live since 14:15:34Z**. **#605** build complete (closes on #607 merge; do not close early). **#582** parent tracker. **#552** owner live-terminal confirmation outstanding (last owner activity 2026-10-16T08:57Z; 7-day rule ~2026-10-23). **#70** auditor daily, **#42** standing.
 - **Boards/health:** Allowlist self-audit: 19 entries in maintainer.yml `workflows:` vs 20 live workflow `name:` fields - exact match both directions with only `maintainer` absent (self-excluded by design). Held `action_required` runs: **0**. Failure sweep since 14:00Z: exactly **one** new failure - maintainer run 39040486914 (FreeTierError, FREETIER WATCH below); no other failures/timed_out. Main tip: **6270703a**.

## IN FLIGHT
 - **#607 REVIEW (run 39040493121, live since 14:22:51Z):** verdict on `6e5f046d`. Approve -> auto-forward `/oc test`; findings -> review workflow auto-dispatches fix (desktop crate only - NOT infra, safe for fix routing). No workflow files touched, so on test+eval green the standard in-session `gh pr merge --rebase` applies (no PAT sweep needed) and `Closes #605` closes the issue.
 - **#606 REVIEW (run 39040263173 live since 14:19:39Z):** verdict on `cbf94123`; approve -> `/oc test` gate; on green: parity-row fold (Builder pass on #582) + fresh macOS arm re-run for the signed rows.
 - **#608 LAB (run 39039975528 live since 14:15:34Z):** verify the branch/PR when it lands; dead run -> one retry, then infra rules.
 - **#582 WINDOWS ARM (run 39036859435 since 14:01:58Z):** 90-min budget ~15:32Z; read its report; silent death -> one retry then `lab`.
 - **FREETIER WATCH (NEW):** maintainer run 39040486914 (14:22:44Z, `/oc maintainer` on #607) died at the provider with `FreeTierError` 403 "OpenCode's free tier can only be used from within OpenCode" at 14:23:07Z; the ladder advances only on `Model not found`, so the agent step exited 1 loudly and the wrapper auto-posted the APIError comment on #607 (14:23:08Z). The immediate next tick (run 39040495126, this run) is healthy while the concurrent #606 review, #608 lab, and Windows arm all kept running - so it reads as a one-off provider blip. Explained on-thread by this run. ONE occurrence in 7 days of logs. If it recurs -> `lab` (runner hardening: bounded retry-once on FreeTierError, or rung rotation).
 - TEST-CRASH RULE (standing): a test run dying inside the agent step with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and retries per rung on `Model not found`; R15 guards it. A dead rung or a better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): the `pull_request` maintainer arm still goes red plus posts the permission-noise comment on bot-authored PR events; #427/#429 were CLOSED unmerged by the owner on 2026-09-25. Documented red + on-thread explanation; no dispatch.
 - PERS REPORT CONTRACT: #608 lab live; until fixed, recover native reports from the arm's run log before triaging.
 - SHALLOW-WORKSPACE HAZARD: FIXED on main (#604, `6270703a`). Guard + R16 live.
 - Evaluator follow-ups, the Tester's R14 regex residuals, the Reviewer's flow-style note, and carried advisory nits remain queued for a future hardening vehicle.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War Kratos vs Zeus commission declined; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: four zombie queued runs (issue532 pr-trigger, lab-427 x2, one pages deploy) sit permanently queued.

## NEXT-RUN PLAYBOOK
  1. #607: read the review verdict on `6e5f046d`; approve -> auto `/oc test` -> eval -> merge (`Closes #605`); findings -> `fix` (desktop crate only). If the review agent died silently, crash parity re-posts `/oc review (auto-retry N)`; at cap -> `lab`.
  2. #606: read the review verdict on `cbf94123`; on green, plan the parity-row fold + fresh macOS arm re-run.
  3. #608: verify the lab run landed (branch/PR); dead or missing -> dispatch `lab` again.
  4. Windows arm: read its report; budget ~15:32Z; second consecutive silent death -> `lab`.
  5. FreeTier watch: a second occurrence of the 403 class -> `lab` runner hardening.
  6. #552 owner confirmation outstanding (7-day human rule).
  7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #606 clear review + test on the rebased head, so the macOS rows can flip?
  - Does #607 pass the standard gates and close #605?
  - Does the Windows arm sign its rows or surface new native defects?
  - Does #608's lab run land the findings-report contract before the final native re-runs?
  - Was the FreeTierError a one-off provider blip, or the start of a new failure class?

 - Hephaestus, the Maintainer
