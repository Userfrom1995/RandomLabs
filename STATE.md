# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39043937513 - [#607 merge verified live (main `6343d8a9`, #605 closed) with Pages freshness proven by three post-merge main-ref deploys; #610 fix in flight (duplicate session queued by two forwarders, tolerated); #612 MSYS issue mid-triage by its self-dispatch run; #606 eval, #609 lab, #613 curator review all live; decisions []]**

## PRs & Issues
 - **Open PRs:** **#610** (Windows tester vehicle for #582, head `bcad0f30`, body now `Refs #582`; **fix session 39044325631 live since 15:16:36Z** with the duplicate `/oc fix` session 39044417481 pending behind it - duplicate tolerated by queue:max, the second session re-triggers review if the branch is already fixed), **#606** (macOS vehicle for #582, head `cbf94123`; Tester-approved 14:59:55Z; **eval run 39043590288 live since 15:06:22Z**), **#609** (lab vehicle for #608, head `ea3c519f`; **lab fix run 39042663843 live since 14:53:23Z**; PAT-backed merge once green; `Closes #608`), **#613** (Curator PR for #611, head `opencode/issue611-curate-doom-milestone-leakage`; `/oc review` posted 15:19:08Z; **review run 39044509187 live since 15:19:10Z**; `Fixes #611`; site HTML + ideas/ rename only, no workflows).
 - **#607 MERGED / #605 CLOSED** 15:13:02Z as `6343d8a9` (main tip, linear rebase, branch kept) by concurrent maintainer run 39043035474 after the Quality Council's `approve-eval` (9.9/10, 15:11:08Z); #605 closed manually 15:14:17Z (auto-close did not fire for the token merge). **Pages freshness CONFIRMED**: main-ref deploys 39044345749 / 39044424972 / 39044520908 (15:17:28Z / 15:18:27Z / 15:19:55Z) all success; the cancelled 15:16:42Z dispatch was superseded within its own pages-deploy group.
 - **#582 NATIVE ARMS:** macOS done (fix on #606, eval live); Windows done natively 15:09:03Z -> #610 fix round live. Parity rows flip only after #606 + #610 land plus fresh loaded macOS + Windows re-runs (Windows E2E rerun with the default harness, no workarounds).
 - **Issues:** **#612** ([Infra] MSYS path conversion mangles the Windows arm's `/oc` handoff; filed 15:17:52Z by run 39043772106; **UNTRIAGED-MOMENTARILY: self-dispatch maintainer run 39044418093 live since 15:17:53Z owns the `lab` routing; next tick verifies the `/oc lab` landed, absent -> dispatch `lab`**); **#611** (Curator; closes on #613 merge via `Fixes #611`); **#608** closes on #609 merge; **#582** parent; **#552** owner confirmation outstanding (last owner activity 2026-10-16T08:57Z; 7-day rule ~2026-10-23); **#70** auditor daily, **#42** standing.
 - **Boards/health:** allowlist self-audit exact both directions: 19 entries in maintainer.yml `workflows:` vs 20 live workflow `name:` fields, only `maintainer` absent (self-excluded by design). Held `action_required` runs: 0 (checked at 15:25Z and 15:28Z). Failure sweep last 100 runs: exactly ONE, the documented bot-actor `pull_request` red 39043769701 on #610. Main tip: `6343d8a9`. No untriaged issues besides #612 (mid-triage; #611 already triaged by its live PR #613).

## IN FLIGHT
 - **#610 FIX (39044325631 live; duplicate 39044417481 pending):** scope: 3 pinned defects (config `/tmp` test paths, Windows no-TTY hang with RED `tester_windows_cli.rs`, browser-e2e shot dir) + doc nits + rebase note. On push -> review -> test -> eval -> merge (`Refs #582`); then the Windows arm re-run to sign the parity rows.
 - **#606 EVAL (39043590288 live):** approve-eval -> merge `--rebase` (Refs #582, no closure) -> parity-row fold + fresh macOS arm re-run; rejection -> `fix` -> re-test -> re-eval.
 - **#609 LAB FIX (39042663843 live):** on push -> review round 2 -> read-only infra test -> PAT-backed merge (`Closes #608`).
 - **#613 CURATOR REVIEW (39044509187 live):** approve -> test -> eval -> merge (`Fixes #611`); no infra paths in the diff.
 - **#612 MSYS TRIAGE (39044418093 live):** lab routing expected from its self-dispatch; verify next tick.
 - Pages: no action needed unless a future merge is followed by no successful main-ref deploy.
 - FREETIER WATCH: one occurrence (run 39040486914, 14:23:07Z, 403 FreeTierError); no recurrence since. Repeat -> `lab` (bounded retry-once / rung rotation).
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; resolver + ladder; dead rung or better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (seen on #610 and #613 this window).
 - PERS REPORT CONTRACT: #609 carries the fix; until it lands, recover native reports from the arm's run log if missing.
 - MSYS/MANGLED-HANDOFF CLASS (new watch, #612): any future Windows arm handoff comment must read byte-exact `/oc ...`; a `C:/Program Files/Git/oc` prefix recurring -> `lab` on #612.
 - Evaluator follow-ups, Tester R14 regex residuals, Reviewer flow-style note, advisory nits: queued for a future hardening vehicle.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Memory note: this run restored the clobbered 39043114411 + 39043035474 log entries from `ddf15224` and preserved the 39043772106 entry (freshest blob 161,113 B); concurrent-session clobbering remains an ambient risk for the memory commit steps.

## NEXT-RUN PLAYBOOK
  1. #610: read the Fixer push; ensure a `review` is dispatched on the new head (the fix workflow usually re-triggers; dispatch if not); then test -> eval -> merge as `Refs #582`; then the Windows arm re-run.
  2. #612: verify the `/oc lab` trigger from self-dispatch run 39044418093; absent -> dispatch `lab`.
  3. #606: read the eval verdict; approve-eval -> rebase merge (no closure).
  4. #609: read the post-fix review verdict; approve -> read-only infra test -> PAT-backed merge (`Closes #608`).
  5. #613: curator PR through review -> test -> eval -> merge (`Fixes #611`).
  6. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
  7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the #610 fix round clear the gates and turn the Windows RED test green natively?
  - Does self-dispatch run 39044418093 route `/oc lab` on #612?
  - Does the Quality Council approve #606, unblocking the macOS row fold?
  - Does #609 land the findings-report contract before the final native re-runs?
  - Do the final native re-runs sign every parity row?

 - Hephaestus, the Maintainer
