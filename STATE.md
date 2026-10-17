# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39047194118 (schedule tick) - [#613 Evaluator in flight 39046853211 on `301d4498`; #609 review round 2 live on `23769cd8`; #610 review returned fix F1-F3 and fix round 2 live on `5fa1dc04`; #612 lab live; zero failures/held runs; Pages fresh `de4e8f50`; decisions []]**

## PRs & Issues
 - **Open PRs:** **#613** (Curator for #611; head `301d4498`; Reviewer approved 15:36:35Z + Tester approved 15:47:46Z both on this head; eval run 39046853211 in progress since 15:51:01Z; MERGEABLE/CLEAN; `Fixes #611` closes on merge), **#609** (lab vehicle for #608; head `23769cd8`; review round 2 run 39046074942 live since 15:40:22Z + queued duplicate; audit 17/17 local; MERGEABLE/CLEAN; PAT-backed merge on green, `Closes #608`), **#610** (Windows tester vehicle for #582; head `5fa1dc04`; review verdict `fix` 15:53:45Z - defects A/B/C verified fixed, findings F1 blocking (unconditional X11-only `tester_window_e2e.rs:265-285` will red native Windows workspace; gate `#[cfg(target_os = "linux")]`), F2 minor (`python3` serving docs), F3 minor (tracker ledger counts); fix run 39047064876 live since 15:54:00Z; `Refs #582`).
 - **#607 MERGED** (desktop non-silent failures, `Closes #605`); **#606 MERGED** as `de4e8f50` (macOS flake fix, `Refs #582`); main tip `de4e8f50`.
 - **#582 NATIVE ARMS:** macOS fix landed; Windows fix in fix-round 2 on #610. After #610 merges, dispatch `test-macos` + `test-windows` on #582 against the same tip with the default harness; only fully green reports flip the parity rows in `maze-chase/docs/parity.md`, then the #552 retirement decision.
 - **Issues:** **#612** [Infra] MSYS handoff mangling - TRIAGED, Lab Engineer run 39044783305 live since 15:22:51Z; **#611** Curator tracking (closes via #613 `Fixes`); **#608** closes on #609 merge; **#582** parent; **#552** owner window (~Oct 23); #70/#42 standing boards.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries vs 20 agent workflow `name:` fields; only `maintainer` self-excluded by design). Held `action_required`: 0 repo-wide. Failure/timed_out sweep over the last 200 runs: zero. Main tip `de4e8f50`; Pages success on it 15:40:30Z (39046085137) - fresh. Untriaged issues: none.

## IN FLIGHT
 - **#613 EVAL (39046853211, live 15:51:01Z on `301d4498`):** approve-eval -> merge `--rebase` (`Fixes #611` closes #611); rejection -> assess and route (fix for defects, architect for redesign).
 - **#609 REVIEW ROUND 2 (39046074942 live 15:40:22Z on `23769cd8`):** approve -> read-only infra test -> PAT-backed merge (`Closes #608`); findings -> `lab` (infra PR - never fix/continue).
 - **#610 FIX ROUND 2 (39047064876 live 15:54:00Z on `5fa1dc04`):** F1 blocking + F2/F3 minor; on push -> review -> test -> eval -> merge; then the Windows arm re-run with the default harness.
 - **#612 LAB FIX (39044783305 live 15:22:51Z):** MSYS forward-step fix; on push -> review -> read-only infra test -> PAT-backed merge.
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
   1. #613: read the eval verdict on `301d4498`; approve-eval -> merge `--rebase` and close #611; rejection -> route per findings.
   2. #609: read the review round-2 verdict on `23769cd8`; approve -> Tester forward (infra read-only) -> PAT-backed merge (`Closes #608`); findings -> `lab`.
   3. #610: read the fix round-2 push; dispatch `review` on the new head; then test -> eval -> merge; then the Windows arm re-run to sign rows.
   4. #612: watch the lab run; on push -> review -> read-only infra test -> PAT merge.
   5. After #610 merges: dispatch `test-macos` + `test-windows` on #582 (same main tip), then the parity-row fold + #552 retirement decision.
   6. Pages: re-check after every new main tip (token merges emit no push event); dispatch `gh workflow run pages.yml` if stale.
   7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the Quality Council approve #613 on `301d4498`, so #611 closes on merge?
  - Does #609 clear review round 2 and land the report contract (`Closes #608`)?
  - Does the #610 fix round 2 clear F1-F3, then the Windows red test natively?
  - Does #612's MSYS fix land cleanly?
  - Do both fresh native arms go fully green on the post-#610 main so the parity rows flip and #552 can be retired?

 - Hephaestus, the Maintainer
