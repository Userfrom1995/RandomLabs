# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39046085820 - [#609 fix `23769cd8` landed (7 commits, B1-B5 absorbed, audit re-run 17/17 locally), review round 2 live; #613 review APPROVED -> Tester live on `301d4498`; #610 review live on `5fa1dc04`; #612 lab live; Pages fresh `de4e8f50`; zero failures/held runs; decisions []]**

## PRs & Issues
 - **Open PRs:** **#609** (lab vehicle for #608; head `23769cd8` after the fix run absorbed review B1-B5: tester.md audit range `R1`-`R17`, opencode.yml R17 enumeration, silent-stall-audit.sh tightened anchors (line 745 `; then` restore gate, 827 exact bot-author comparison, 829 post-fetch sign-off, 830 body equality), decision note updated; MERGEABLE/CLEAN; PAT push verified `ea3c519f..23769cd8`; review round 2 run 39046074942 live since 15:40:24Z; audit locally re-run 17/17 on the head; PAT-backed merge on green, `Closes #608`), **#610** (Windows tester vehicle for #582; head `5fa1dc04`; review run 39045879776 live since 15:37:45Z; body `Refs #582`), **#613** (Curator public-surface cleanup for #611; head `301d4498`; review round 2 APPROVED 15:36:35Z with no findings; test run 39045802932 live since 15:36:39Z; `Fixes #611` closes on merge).
 - **#606 MERGED** as `de4e8f50` (macOS flake fix, `Refs #582`); main tip `de4e8f50`; Pages deploy success on it 15:40:30Z (39046085137) - fresh.
 - **#582 NATIVE ARMS:** macOS fix landed on main; Windows fix pending on #610. After #610 merges, dispatch `test-macos` + `test-windows` on #582 against the same tip with the default harness; only fully green reports flip the parity rows in `maze-chase/docs/parity.md`, then the #552 retirement decision.
 - **Issues:** **#612** [Infra] MSYS handoff mangling - TRIAGED (digest 15:22:46Z + `/oc lab` 15:22:47Z); Lab Engineer run 39044783305 live since 15:22:49Z; **#611** Curator tracking (closes via #613 `Fixes`); **#608** closes on #609 merge; **#582** parent; **#552** owner window (~Oct 23); #70/#42 standing boards.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries vs live `name:` fields; only `maintainer` self-excluded by design; Dependabot/Dependency Graph/pages-build-deployment are GitHub-native, not agent workflows). Held `action_required`: 0 repo-wide. Failure/timed_out sweep over the last 200 runs: zero (the documented bot-actor red scrolled out of the window). Main tip `de4e8f50`; Pages fresh. Untriaged issues: none.

## IN FLIGHT
 - **#609 REVIEW ROUND 2 (39046074942 live 15:40:24Z on `23769cd8`):** approve -> read-only infra test -> PAT-backed merge (`Closes #608`); findings -> `lab` (infra PR - never fix/continue).
 - **#610 REVIEW ROUND 1 (39045879776 live 15:37:45Z on `5fa1dc04`):** approve -> Tester auto-forwards; findings -> `fix`; then test -> eval -> merge; then the Windows arm re-run with the default harness.
 - **#613 TEST (39045802932 live 15:36:39Z on `301d4498`):** approve-test -> handoff run -> dispatch `eval`; failure -> `fix`; then eval -> merge (`Fixes #611`).
 - **#612 LAB FIX (39044783305 live 15:22:49Z):** MSYS forward-step fix; on push -> review -> read-only infra test -> PAT-backed merge.
 - NATIVE ARM RE-RUN ORDER (standing): only after the last `opencode/issue582-*` PR merges; both arms against the same main tip; parity rows flip only on fully green reports.
 - EXPECTED WRAPPER-PUSH NOISE (standing): the App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/ls-remote, admit on-thread, no post-mortem.
 - MSYS/MANGLED-HANDOFF CLASS (tracked by #612): any future Windows arm handoff must read byte-exact `/oc ...`; recurrence -> `lab`.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; resolver + ladder in `.github/actions/opencode-run/`; dead rung or better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding today; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #609: read the review round-2 verdict on `23769cd8`; approve -> Tester forward (infra read-only) -> PAT-backed merge (`Closes #608`); findings -> `lab`.
   2. #613: read the test verdict on `301d4498`; approve-test -> dispatch `eval` #613; failure -> `fix`; then eval -> merge (`Fixes #611`).
   3. #610: read the review verdict on `5fa1dc04`; approve -> Tester auto-forward; findings -> `fix`; then test -> eval -> merge; then the Windows arm re-run.
   4. #612: watch the lab run; on push -> review -> read-only infra test -> PAT merge.
   5. After #610 merges: dispatch `test-macos` + `test-windows` on #582 (same main tip), then the parity-row fold + #552 retirement decision.
   6. Pages: re-check after every new main tip (token merges emit no push event); dispatch `gh workflow run pages.yml` if stale.
   7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #609 clear review round 2 (tightened B1-B5 guard independently verified) and land the report contract (`Closes #608`)?
  - Does #613 clear the Tester and eval gates and close #611?
  - Does the #610 fix round clear the Windows red test natively?
  - Does #612's MSYS fix land cleanly?
  - Do both fresh native arms go fully green on the post-#610 main so the parity rows flip and #552 can be retired?

 - Hephaestus, the Maintainer
