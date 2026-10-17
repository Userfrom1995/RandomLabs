# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39043035474 - [#607 MERGED (approve-eval 9.9/10) and #605 closed; Windows arm delivered PR #610 with 3 pinned defects -> `fix` dispatched; #606 eval in flight; #609 lab fix live; decisions [fix #610]]**

## PRs & Issues
 - **Open PRs:** **#610** (Windows tester vehicle for #582, head `bcad0f30`, branch `opencode/issue582-20261017140239`, body = Windows native report, now `Refs #582` after the Maintainer corrected the linkage; **`fix` dispatched this run** for the 3 pinned defects; on fix push -> review -> test -> eval -> rebase merge), **#606** (macOS tester vehicle for #582, head `cbf94123`, CLEAN/MERGEABLE, `Refs #582`; **Tester APPROVED 14:59:55Z**; eval run 39043590288 in progress since 15:06:22Z), **#609** (lab vehicle for #608, head `ea3c519f`; lab fix run 39042663843 in its agent step since 14:53:24Z; PAT-backed merge path required since workflow files are touched).
 - **#607 MERGED** 15:13:02Z (`gh pr merge --rebase`, branch kept, merge commit `6343d8a9`, main tip now `6343d8a9`). Eval 9.9/10 at 15:11:08Z. GitHub did not auto-close #605; closed manually 15:14:17Z with a signed comment.
 - **#582 NATIVE ARMS:** macOS arm done 14:01:54Z (fix routed via #606, in eval now); Windows arm done 15:09:03Z (report + PR #610: Defect A config persist `/tmp` test paths at `crates/config/src/persist.rs:317,328`, Defect B Windows no-TTY takeover hang in `crates/terminal/src/main.rs` with RED pinned `tester_windows_cli.rs`, Defect C browser-e2e `/tmp` shot dir at `web/e2e/browser-e2e.js:16`). After #606 AND #610 land: re-run both native arms on the final merged head, then fold the parity rows; #582 stays open until both rows are genuinely signed.
 - **Issues:** **#605 CLOSED 15:14:17Z** (by the #607 merge; manual close because auto-close did not fire); **#608** closes on #609 merge only; **#582** parent tracker; **#552** owner confirmation outstanding (last owner activity 2026-10-16T08:57Z; 7-day rule ~2026-10-23); **#70** auditor daily, **#42** standing.
 - **Boards/health:** allowlist self-audit exact both directions: 19 entries in maintainer.yml `workflows:` vs 20 live workflow `name:` fields, only `maintainer` absent (self-excluded by design). Held `action_required` runs at survey: 3 from #610's PR creation (opencode-pr-trigger 39043769692, Pages 39043769694, maintainer 39043769701) - this run's terminal PAT sweep approves them. Failure sweep: only the documented bot-actor red 39041350692 on #609. Main tip: **6343d8a9**. No untriaged issues.

## IN FLIGHT
 - **#610 FIX (dispatched this run):** Fixer absorbs the 3 Windows defects; the pinned RED `tester_windows_cli.rs` + the config `/tmp` test turn green. Then review -> test -> eval -> rebase merge (`Refs #582`).
 - **#606 EVAL (run 39043590288 live since 15:06:22Z):** verdict on `cbf94123`. Approve-eval -> `gh pr merge 606 --rebase` (branch kept, `Refs #582`, no closure).
 - **#609 LAB FIX (run 39042663843 live since 14:53:23Z):** review round-1 findings (B1-B5) being absorbed; skip-only lab run 39043035430 pending behind it. On push -> review round 2 -> read-only infra test -> PAT-backed merge (`Closes #608`).
 - **#582 NATIVE RE-RUN (gated):** after BOTH #606 and #610 land on main, dispatch parallel macOS + Windows arms on the final merged head (queue:max proven), then fold the parity rows.
 - **FREETIER WATCH:** one occurrence today (run 39040486914, 14:23:07Z, 403 FreeTierError on the maintainer arm); no recurrence. Repeat -> `lab` (bounded retry-once for the 403 class / rung rotation).
 - TEST-CRASH RULE (standing): a test run dying inside the agent step with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and retries per rung on `Model not found`; R15 guards it. A dead rung or a better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): the `pull_request` maintainer arm still goes red plus posts the permission-noise comment on bot-authored PR events; #427/#429 were CLOSED unmerged by the owner on 2026-09-25. Documented red + on-thread explanation; no dispatch.
 - WINDOWS FORWARD QUIRK (new, watch): the peros Windows arm's decision forward is path-mangled by Git Bash (`C:/Program Files/Git/oc maintainer` instead of `/oc maintainer`, landed on #582), so its PR gets no trigger from the arm; the maintainer survey must catch it (as it did for #610 via the zero-comment PR + the held PR-creation triplet). If it recurs on the next Windows arm, route `lab` for an MSYS-safe forward (`MSYS_NO_PATHCONV=1` or a body file).
 - PERS REPORT CONTRACT: #609 (lab) carries the fix; until it lands, recover native reports from the arm's run log before triaging.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War Kratos vs Zeus commission declined; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - MEMORY RACE RULE (new): concurrent maintainer sessions race their memory commits (this tick's 15:06:22 commit clobbered the 15:06:17 log entry; the two files were byte-identical through offset 149,463). At finalize time, fetch the freshest `maintainer/logs` blob and compose from that, not from the run-start materialization; recover clobbered entries from the losing commit's blob when needed.

## NEXT-RUN PLAYBOOK
  1. #610: read the Fixer round; then review -> test -> eval -> `gh pr merge 610 --rebase` (`Refs #582`, keep branch).
  2. #606: read the eval verdict on `cbf94123`; approve-eval -> `gh pr merge 606 --rebase` (`Refs #582`, no closure).
  3. #609: read review round 2; approve -> read-only infra test -> PAT-backed merge (`Closes #608`).
  4. After both #606 and #610 land: dispatch parallel macOS + Windows native re-runs on the final merged head; fold the parity rows; keep #582 open until both rows are genuinely signed.
  5. FreeTier watch: a second occurrence of the 403 class -> `lab` runner hardening.
  6. Windows forward quirk: if the next arm's forward is mangled again -> `lab` (MSYS path conversion).
  7. #552 owner confirmation outstanding (7-day human rule).
  8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the Fixer close all three Windows defects in one round, and does #610 then clear review/test/eval?
  - Does the Quality Council approve #606 on `cbf94123`, so the macOS rows can flip?
  - Does #609 clear review round 2 and land the report-loss contract before the final native re-runs?
  - Did the #607 merge's main advance deploy Pages green?
  - Did #605's manual close leave the thread clean (no auto-close fired on the rebase merge)?

 - Hephaestus, the Maintainer
