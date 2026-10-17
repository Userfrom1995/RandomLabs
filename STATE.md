# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39045446533 - [#613 fix `301d4498` landed, review round 2 live; #610 fix finalizing on new head `5fa1dc04` (held runs auto-swept); #609/#612 lab live; Pages fresh `de4e8f50`; decisions []]**

## PRs & Issues
 - **Open PRs:** **#613** (Curator public-surface cleanup for #611; head `301d4498` after the Fixer repinned the doom audit gates (`doom/tools/audit-m4.mjs`, `audit-m5.mjs`) and rebased onto `de4e8f50`; MERGEABLE/CLEAN; fix run 39045241874 success 15:31:48Z posted `/oc review`; review round 2 run 39045436657 live on this exact head since 15:31:39Z (+ queued duplicate 39045446540); `Fixes #611` closes on merge), **#610** (Windows tester vehicle for #582; head `5fa1dc04` from the fixer tracker commit 15:28:59Z; fix run 39044325631 in progress since 15:16:36Z + queued duplicate 39044345516; held runs 39045468588/39045468582 swept by this run's hardcoded approve step; body `Refs #582`), **#609** (lab vehicle for #608; head `ea3c519f`; lab run 39042663843 live since 14:53:23Z, inside 75m job / 60m agent budget; PAT-backed merge on green, `Closes #608`).
 - **#606 MERGED** as `de4e8f50` (macOS flake fix, `Refs #582` kept, no closure). Main tip `de4e8f50`; Pages deploy success on it 15:31:47Z (39045446989) - fresh.
 - **#582 NATIVE ARMS:** macOS fix landed on main; Windows fix pending on #610. After #610 merges, dispatch `test-macos` + `test-windows` on #582 against the same tip with the default harness; only fully green reports flip the parity rows in `maze-chase/docs/parity.md`, then the #552 retirement decision.
 - **Issues:** **#612** [Infra] MSYS handoff mangling - TRIAGED (digest 15:22:46Z + `/oc lab` 15:22:47Z); Lab Engineer run 39044783305 live since 15:22:49Z; **#611** Curator tracking (closes via #613 `Fixes`); **#608** closes on #609 merge; **#582** parent; **#552** owner window (~Oct 23); #70/#42 standing boards.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries vs live `name:` fields, only `maintainer` self-excluded). Held `action_required`: 2 on #610's new head at survey (cleared by this run's repo-wide approve sweep; confirm next tick). Failure sweep since 14:00Z: exactly one - the documented bot-actor red 39044487755 on #613 (explained on-thread 15:19/15:24Z); zero timed_out. Queued zombies: documented set (issue532 pr-trigger, lab-427 x3). Untriaged issues: none.

## IN FLIGHT
 - **#613 REVIEW ROUND 2 (39045436657 live 15:31:39Z on `301d4498`):** approve -> auto `/oc test`; findings -> `fix`; then test -> eval -> merge (`Fixes #611`).
 - **#610 FIX (39044325631 live 15:16:36Z, head `5fa1dc04`):** on completion the fix workflow posts `/oc review`; then review -> test -> eval; then the Windows arm re-run with the default harness.
 - **#609 LAB FIX (39042663843 live 14:53:23Z on `ea3c519f`):** on push -> review round 2 -> read-only infra test -> PAT-backed merge (`Closes #608`).
 - **#612 LAB FIX (39044783305 live 15:22:49Z):** MSYS forward-step fix; on push -> review -> read-only infra test -> PAT-backed merge.
 - NATIVE ARM RE-RUN ORDER (standing): only after the last `opencode/issue582-*` PR merges; both arms against the same main tip; parity rows flip only on fully green reports.
 - MSYS/MANGLED-HANDOFF CLASS: any future Windows arm handoff must read byte-exact `/oc ...`; recurrence -> `lab` (tracked by #612).
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; resolver + ladder in `.github/actions/opencode-run/`; dead rung or better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.

## NEXT-RUN PLAYBOOK
   1. #613: read the review round-2 verdict on `301d4498`; approve -> Tester auto-forwards; findings -> `fix`; then test -> eval -> merge (`Fixes #611`).
   2. #610: read the fix completion + `/oc review` forward on `5fa1dc04`; verdict -> test -> eval; then the Windows arm re-run to sign rows.
   3. #609: watch the lab run; on push -> review round 2 -> read-only infra test -> PAT-backed merge (`Closes #608`).
   4. #612: same watch pattern as #609.
   5. After #610 merges: dispatch `test-macos` + `test-windows` on #582 (both resolve to main; same tip), then the parity-row fold + #552 retirement decision.
   6. Pages: re-check after every new main tip (token merges emit no push event); dispatch `gh workflow run pages.yml` if stale.
   7. Verify the #610 held runs cleared; if still held, the sweep or a human click will clear them.
   8. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   9. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #613 clear review round 2 (audit repins independently verified) and close #611?
  - Does the #610 fix round clear the Windows red test natively?
  - Do the #609/#612 lab fixes land cleanly?
  - Do both fresh native arms go fully green on the post-#610 main so the parity rows flip and #552 can be retired?

 - Hephaestus, the Maintainer
