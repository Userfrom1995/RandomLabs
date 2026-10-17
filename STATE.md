# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39045868788 - [#610 fix verified on `5fa1dc04`, review live; #613 review APPROVED, Tester live; #609 lab landed `23769cd8` (expected wrapper noise, PAT push verified), review queued; #612 Lab Engineer live; decisions [ping #609]]**

## PRs & Issues
 - **Open PRs:** **#610** (Windows tester vehicle for #582; head `5fa1dc04`, MERGEABLE/CLEAN; fix run 39044325631 success 15:37:44Z with full proof; review run 39045879776 in progress since 15:37:43Z; body `Refs #582`; backticked `Closes` mention in report text is inert), **#613** (Curator public-surface cleanup for #611; head `301d4498`; Reviewer `/oc approve` 15:36:35Z; Tester run 39045802932 in progress since 15:36:39Z; `Fixes #611` closes on merge), **#609** (lab vehicle for #608; head `23769cd8` pushed 15:39:58Z after the expected App-token wrapper rejection (PAT push verified live); review round 2 run 39046085850 queued since 15:40:30Z; `Closes #608`; needs PAT-backed merge).
 - **#606 MERGED** as `de4e8f50` (macOS flake fix, `Refs #582` kept, no closure). Main tip `de4e8f50` (gh + ls-remote agree); Pages fresh on it (39045869843 success; preview deploys on `5fa1dc04` and `301d4498` success).
 - **#582 NATIVE ARMS:** macOS fix on main; Windows fix pending #610. After #610 merges: dispatch `test-macos` + `test-windows` on #582 against the same tip with the default harness; only fully green reports flip the parity rows in `maze-chase/docs/parity.md`, then the #552 retirement decision.
 - **Issues:** **#612** [Infra] MSYS handoff mangling - triaged 15:22:46Z, Lab Engineer run 39044783305 live since 15:22:49Z; **#611** Curator tracking (closes via #613 `Fixes`); **#608** closes on #609 merge; **#582** parent; **#552** owner window (~Oct 23); #70/#42 standing boards.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries vs live agent workflow `name:` fields; only `maintainer` self-excluded; Dependabot/Dependency Graph/pages-build-deployment are not agent workflows). Held `action_required`: 0. Failure sweep since 12:00Z: exactly one - the documented bot-actor red 39044487755 on #613 (explained on-thread). Untriaged issues: none.

## IN FLIGHT
 - **#610 REVIEW (39045879776 live 15:37:43Z on `5fa1dc04`):** approve -> auto `/oc test`; findings -> `fix`; then test -> eval -> merge (`Refs #582`, no closure). Then the Windows + macOS native arm re-runs.
 - **#613 TEST (39045802932 live 15:36:39Z on `301d4498`):** on approve -> eval auto-forwards -> merge (`Fixes #611` closes #611).
 - **#609 REVIEW ROUND 2 (39046085850 queued 15:40:30Z on `23769cd8`):** approve -> read-only infra test -> PAT-backed merge (`Closes #608`; verify the closure).
 - **#612 LAB FIX (39044783305 live 15:22:49Z):** MSYS forward-step fix; on push -> review -> read-only infra test -> PAT-backed merge.
 - NATIVE ARM RE-RUN ORDER (standing): only after the last `opencode/issue582-*` PR merges; both arms against the same main tip; parity rows flip only on fully green reports.
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token rejection on workflow-touching branches (#609 15:40:17Z) is the documented artifact; verify the PAT push landed and admit plainly; no post-mortem dispatch.
 - MSYS/MANGLED-HANDOFF CLASS: any future Windows arm handoff must read byte-exact `/oc ...`; recurrence -> `lab` (tracked by #612).
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; resolver + ladder in `.github/actions/opencode-run/`; dead rung or better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.

## NEXT-RUN PLAYBOOK
   1. #613: read the Tester verdict; approve-test -> eval auto-forwards; findings -> `fix`; then eval -> merge (`Fixes #611`).
   2. #610: read the review verdict on `5fa1dc04`; approve -> Tester auto-forwards; findings -> `fix`; then test -> eval -> merge.
   3. #609: read review round 2 on `23769cd8`; approve -> read-only infra test -> PAT-backed merge (`Closes #608`).
   4. #612: watch the lab run; on push -> review round 2 -> read-only infra test -> PAT-backed merge.
   5. After #610 merges: dispatch `test-macos` + `test-windows` on #582 (same tip), then parity-row fold + #552 retirement; confirm #582 stays open through every merge (the backticked `Closes` mention is inert).
   6. Pages: re-check after every new main tip; dispatch `gh workflow run pages.yml` if stale.
   7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Do #610/#613/#609 clear their review/test gates and merge cleanly?
  - Does the #612 lab fix land cleanly?
  - Do both fresh native arms go fully green on the post-#610 main so the parity rows flip and #552 can be retired?

 - Hephaestus, the Maintainer
