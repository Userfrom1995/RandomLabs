# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39043027429 - [#607 eval LIVE on `7f558d8d`; #606 Tester-APPROVED with the eval dispatch owned by handoff run 39043114411; #609 lab fix live; decisions []]**

## PRs & Issues
 - **Open PRs:** **#607** (#605 desktop vehicle, head `7f558d8d`; CLEAN/MERGEABLE; **eval run 39043009254 in progress since 14:58:25Z**; on approve-eval -> rebase merge (branch kept) -> #605 auto-closes), **#606** (macOS tester vehicle for #582, head `cbf94123`; CLEAN/MERGEABLE; **Tester APPROVED 14:59:55Z** on that head; the test workflow's `/oc maintainer` handoff 14:59:56Z spawned maintainer run 39043114411 (in progress) which owns the `/oc eval` dispatch; this run stood down to avoid a duplicate), **#609** (lab vehicle for #608, head `ea3c519f`; lab fix run 39042663843 in progress since 14:53:23Z; concurrent maintainer run 39043035474 on #609 in progress; PAT-backed merge path required since workflow files are touched).
 - **#582 NATIVE ARMS:** macOS arm done 14:01:54Z (flake fix routed via #606, now tester-approved); Windows arm run 39036859435 `test-windows` in progress since 14:01:57Z (90-min budget to ~15:32Z). Parity rows flip after #606 goes green plus a fresh loaded macOS run.
 - **Issues:** **#608** closes on #609 merge only; **#605** closes on #607 merge only; **#582** parent tracker; **#552** owner confirmation outstanding (last owner activity 2026-10-16T08:57Z; 7-day rule ~2026-10-23); **#70** auditor daily, **#42** standing.
 - **Boards/health:** allowlist self-audit exact both directions: 19 entries in maintainer.yml `workflows:` vs 20 live workflow `name:` fields, only `maintainer` absent (self-excluded by design). Held `action_required` runs at survey: 0 (checked twice). Failure sweep last 100 runs: **zero**. No queued zombies visible this survey. Main tip: **6270703a**. No untriaged issues.

## IN FLIGHT
 - **#607 EVAL (run 39043009254 live since 14:58:25Z):** verdict on `7f558d8d`. Approve-eval -> merge `--rebase` in-session, keep branch, #605 auto-closes, then confirm Pages. Rejection -> `fix` -> re-test -> re-eval.
 - **#606 EVAL DISPATCH (owned by maintainer run 39043114411, in progress since 14:59:59Z):** expected to post `/oc eval` #606. Next run MUST verify the trigger landed; absent or run dead -> dispatch `eval` #606. On approve-eval -> merge `--rebase` (Refs #582, no closure) -> plan the parity fold + fresh macOS arm re-run.
 - **#609 LAB FIX (run 39042663843 live since 14:53:23Z):** review round-1 findings being absorbed; concurrent maintainer run 39043035474 on #609. On push -> review round 2 -> read-only infra test -> PAT-backed merge (`Closes #608`).
 - **#582 WINDOWS ARM (run 39036859435 since 14:01:57Z):** 90-min budget ~15:32Z; read its report; silent death -> one retry then `lab`.
 - **FREETIER WATCH:** one occurrence today (run 39040486914, 14:23:07Z, 403 FreeTierError on the maintainer arm); no recurrence. Repeat -> `lab` (bounded retry-once for the 403 class / rung rotation). This is also the fallback risk for the #606 eval handoff.
 - TEST-CRASH RULE (standing): a test run dying inside the agent step with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and retries per rung on `Model not found`; R15 guards it. A dead rung or a better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): the `pull_request` maintainer arm still goes red plus posts the permission-noise comment on bot-authored PR events; #427/#429 were CLOSED unmerged by the owner on 2026-09-25. Documented red + on-thread explanation; no dispatch.
 - PERS REPORT CONTRACT: #609 (lab) carries the fix; until it lands, recover native reports from the arm's run log before triaging.
 - Evaluator follow-ups, the Tester's R14 regex residuals, the Reviewer's flow-style note, and carried advisory nits remain queued for a future hardening vehicle.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War Kratos vs Zeus commission declined; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: zombie queued-run watch - none visible at 15:05Z (the issue532 pr-trigger / lab-427 pair / pages deploy set was not queued this survey).

## NEXT-RUN PLAYBOOK
  1. #607: read the Evaluator verdict on `7f558d8d`; approve-eval -> `gh pr merge 607 --rebase` (keep branch) -> verify #605 auto-closed + Pages redeployed; rejection -> dispatch `fix`.
  2. #606: verify `/oc eval` #606 was posted by handoff run 39043114411; absent -> dispatch `eval`; on approve-eval -> merge `--rebase` (Refs #582, no closure) -> plan the parity-row fold + fresh macOS arm re-run.
  3. #609: read the post-fix review verdict; approve -> read-only infra test -> PAT-backed merge (`Closes #608`).
  4. Windows arm: read its report; budget ~15:32Z; second consecutive silent death -> `lab`.
  5. FreeTier watch: a second occurrence of the 403 class -> `lab` runner hardening.
  6. #552 owner confirmation outstanding (7-day human rule).
  7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the Quality Council approve #607 on `7f558d8d`, so #605 closes?
  - Did handoff run 39043114411 dispatch `/oc eval` #606 before dying (verify next tick)?
  - Does #609 clear review round 2 and land the report-loss contract before the final native re-runs?
  - Does the Windows arm sign its rows or surface new native defects?

 - Hephaestus, the Maintainer
