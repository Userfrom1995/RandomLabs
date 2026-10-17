# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39043114411 - [#606 Tester-approved at `cbf94123`; Quality Council `/oc eval` dispatched (last gate before merge); #607 eval in flight; #609 lab fix + concurrent maintainer live; Windows arm inside budget; decisions [eval #606]]**

## PRs & Issues
 - **Open PRs:** **#606** (#582 macOS test/fix vehicle, head `cbf94123`, CLEAN/MERGEABLE, body `Refs #582`; review APPROVED 14:34:44Z; **Tester approved 14:59:55Z**; **`eval` dispatched this run**; on approve-eval -> in-session rebase merge (branch kept, no workflow files) -> then parity-row fold + fresh macOS arm re-run), **#607** (#605 desktop vehicle, head `7f558d8d` = Builder `6e5f046d` + tester test-only commit; CLEAN/MERGEABLE; Tester approved 14:53:44Z; **eval 39043009254 in progress since 14:58:25Z**, queued duplicate 39043027413 pending; on approve-eval -> merge --rebase -> #605 auto-closes), **#609** (lab vehicle for #608, head `ea3c519f`, body `Closes #608`; review round 1 returned findings 14:53:18Z; **lab fix run 39042663843 in progress since 14:53:23Z**; concurrent maintainer run 39043035474 in progress on this thread - do not duplicate).
 - **#582 NATIVE ARMS:** macOS arm done 14:01:54Z (report recovered; flake fix landed on #606 and passed both gates). Windows arm run 39036859435 `test-windows` in progress since 14:01:57Z (90-min budget to ~15:32Z). Parity rows flip after #606 merges plus a fresh loaded macOS run; final pass carries `Closes #582`.
 - **Issues:** **#608** (peros report-loss Infra) has its PR #609 under live lab fix + concurrent maintainer tick; **#605** build complete, closes on #607 merge only; **#582** parent tracker; **#552** owner confirmation outstanding (last owner activity 2026-10-16T08:57Z; 7-day rule ~2026-10-23); **#70** auditor daily, **#42** standing.
 - **Boards/health:** allowlist self-audit exact both directions: 19 entries in maintainer.yml `workflows:` vs 19 repo-owned non-maintainer workflow `name:` fields (live list 23 = those 19 + `maintainer` self-excluded + platform Dependabot Updates / Dependency Graph / pages-build-deployment). Held `action_required` runs at survey: **0**. Failure sweep over last 200 runs: exactly **one** - the documented bot-actor `pull_request` maintainer red 39041350692 on #609 (explained on-thread). Main tip: **6270703a**. No untriaged issues.

## IN FLIGHT
 - **#606 EVAL (dispatched this run):** verdict on `cbf94123`. Approve-eval -> merge `--rebase` in-session (branch kept), `Refs #582` stays open, then plan the parity-row fold + fresh loaded macOS arm. Rejection -> `fix` -> re-test -> re-eval.
 - **#607 EVAL (39043009254, since 14:58:25Z):** verdict on `7f558d8d`. Approve-eval -> `gh pr merge 607 --rebase` (keep branch) -> verify #605 auto-closed + Pages redeployed. Rejection -> `fix`.
 - **#609 LAB FIX (39042663843, since 14:53:23Z):** review round 1 findings being absorbed; on push -> review round 2; then read-only infra test -> PAT-backed merge (`Closes #608`).
 - **#582 WINDOWS ARM (39036859435 since 14:01:57Z):** 90-min budget ~15:32Z; read its report; second consecutive silent death -> `lab`.
 - **FREETIER WATCH:** one occurrence (run 39040486914, 14:23:07Z, 403 FreeTierError on the maintainer arm); no recurrence. Repeat -> `lab` (bounded retry-once hardening for the 403 class / rung rotation).
 - TEST-CRASH RULE (standing): a test run dying inside the agent step with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and retries per rung on `Model not found`; R15 guards it. A dead rung or a better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): the `pull_request` maintainer arm still goes red plus posts the permission-noise comment on bot-authored PR events; #427/#429 were CLOSED unmerged by the owner on 2026-09-25. Documented red + on-thread explanation; no dispatch. Red on #609's head (39041350692) already explained.
 - PERS REPORT CONTRACT: #609 (lab) carries the fix; until it lands, recover native reports from the arm's run log before triaging. macOS report already recovered and consumed.
 - Evaluator follow-ups, the Tester's R14 regex residuals, the Reviewer's flow-style note, and carried advisory nits remain queued for a future hardening vehicle.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War Kratos vs Zeus commission declined; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: four zombie queued runs (issue532 pr-trigger, lab-427 x2, one pages deploy) sit permanently queued; the queued duplicate eval 39043027413 (pending behind 39043009254) is harmless.

## NEXT-RUN PLAYBOOK
  1. #606: read the Evaluator verdict on `cbf94123`; approve-eval -> `gh pr merge 606 --rebase` (keep branch) -> plan parity-row fold + fresh macOS arm; rejection -> dispatch `fix`.
  2. #607: read the Evaluator verdict on `7f558d8d`; approve-eval -> `gh pr merge 607 --rebase` -> verify #605 auto-closed + Pages redeployed; rejection -> `fix`.
  3. #609: read the post-fix review verdict; approve -> read-only infra test -> PAT-backed merge (`Closes #608`).
  4. Windows arm: read its report; budget ~15:32Z; second consecutive silent death -> `lab`.
  5. FreeTier watch: a second occurrence of the 403 class -> `lab` runner hardening.
  6. #552 owner confirmation outstanding (7-day human rule).
  7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the Quality Council approve #606 on `cbf94123`, so the macOS rows can flip?
  - Does the Quality Council approve #607 on `7f558d8d`, so #605 closes?
  - Does #609 clear review round 2 and land the report-loss contract before the final native re-runs?
  - Does the Windows arm sign its rows or surface new native defects?
  - Was the FreeTierError a one-off provider blip, or the start of a new failure class?
  - What vehicle resolves the bot-actor `pull_request` arm question now that #427/#429 are closed unmerged?

 - Hephaestus, the Maintainer
