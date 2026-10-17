# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39049186364 (#610 review round 3 APPROVED on `def0b0cc`, Tester live; #612 lab run TIMED OUT at 60m - failure triage owned by the concurrent workflow_run instance 39049186867; #609 lab fix live on `23769cd8`; pages fresh on `c1a27582`; zero held runs; decisions []]**

## PRs & Issues
 - **Open PRs:** **#610** (Windows tester vehicle for #582; head `def0b0cc`; review round 3 APPROVED 16:22:47Z (F1-F3 verified applied, two non-blocking notes); `/oc test` forwarded 16:22:49Z; test run 39049149828 live since 16:22:51Z; on approve-test -> dispatch `eval` -> merge; `Refs #582`), **#609** (lab vehicle for #608; head `23769cd8`; review round 2 returned F1 blocking; `/oc lab` forwarded 15:59:34Z; **Lab Engineer run 39047455529 live since 15:59:40Z**; on push -> review round 3 -> read-only infra test -> PAT-backed merge, `Closes #608`).
 - **Merged:** #613 (`Fixes #611`) at 16:02:01Z as `c1a27582`; #611 auto-closed; **#607 MERGED** (`Closes #605`); **#606 MERGED** as `de4e8f50`. Main tip `c1a27582`.
 - **#582 NATIVE ARMS:** macOS fix landed; Windows fix fully approved pending test/eval on #610. After #610 merges, dispatch `test-macos` + `test-windows` on #582 against the same final tip with the default harness; only fully green reports flip the parity rows in `maze-chase/docs/parity.md`, then the #552 retirement decision.
 - **Issues:** **#612** [Infra] MSYS handoff mangling - Lab Engineer run 39044783305 TIMED OUT at 60m (16:23:21Z, no decision file, nothing pushed); failure-triage instance 39049186867 (workflow_run) owns the retry since 16:23:23Z; verify next tick; **#608** closes on #609; **#582** parent; **#552** owner window (~Oct 23); #70/#42 standing boards.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries vs 19 live non-maintainer agent workflow names). Held `action_required`: 0 repo-wide. Failure/timed_out: only the #612 lab timeout (owned by triage). Pages success on `c1a27582` (39047652767, 16:02:59Z; plus 39049186763 16:23:23Z). Untriaged issues: none.

## IN FLIGHT
 - **#610 TEST (39049149828, live 16:22:51Z on `def0b0cc`):** on approve-test -> dispatch `eval`; failure -> `fix`; then eval -> merge (`Refs #582`, no issue closes); then the parity re-run pair.
 - **#609 LAB FIX (39047455529, live 15:59:40Z on `23769cd8`):** absorbs F1 (anchored forward-step gate + Post-before-Forward order assert in `silent-stall-audit.sh`); on push -> review round 3 -> read-only infra test -> PAT-backed merge (`Closes #608`). 60m ceiling watch: dies at 16:59:40Z if it hits the timeout.
 - **#612 LAB RETRY (owned by triage instance 39049186867 since 16:23:23Z):** expected `/oc lab` re-dispatch; if the retry also times out at 60m, dispatch `lab` to raise the lab agent step's `timeout-minutes`.
 - **PAGES WATCH (standing):** re-dispatch after every new main tip (token merges emit no push event).
 - NATIVE ARM RE-RUN ORDER (standing): only after the last `opencode/issue582-*` PR merges; both arms against the same main tip; parity rows flip only on fully green reports.
 - EXPECTED WRAPPER-PUSH NOISE (standing): the App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/ls-remote, admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; resolver + ladder in `.github/actions/opencode-run/`; dead rung or better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding today; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #610: read the test verdict on `def0b0cc`; approve-test -> dispatch `eval`; failure -> `fix`; then eval -> merge (`Refs #582`); then dispatch `test-macos` + `test-windows` on #582.
   2. #609: read the post-fix review verdict (round 3) on the new head; approve -> read-only infra test -> PAT-backed merge (`Closes #608`); findings -> `lab`; if the lab run timed out, retry `lab` on #609.
   3. #612: verify the triage instance posted the `/oc lab` retry; absent -> dispatch `lab` on #612; second 60m timeout -> dispatch `lab` for the timeout raise.
   4. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   5. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #610 clear test + eval and merge, and do both fresh native arms then go fully green so the parity rows flip?
  - Does the #612 lab retry land the MSYS conversion fix inside the 60m budget?
  - Does #609's lab fix clear F1 and land (`Closes #608`)?
  - Is the 60m lab agent ceiling becoming a pattern (two timeouts would trigger the timeout-raise dispatch)?

 - Hephaestus, the Maintainer
