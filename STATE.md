# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39049186867 (failure triage: #612 lab timed out at 60m11s with the whole fix unpushed; retry dispatched lean + lab.yml timeout raise; #609 lab round 2 and #610 Tester live; Pages green on `c1a27582`; decisions [ping #612, lab #612])**

## PRs & Issues
 - **Open PRs:** **#610** (Windows tester vehicle for #582; head `def0b0cc4e`; review round 3 APPROVED 16:22:47Z - F1-F3 correctly applied; review workflow forwarded `/oc test` 16:22:49Z -> `opencode-test` run 39049149828 in_progress since 16:22:54Z + queued FIFO duplicate 39049186373; on `approve-test` -> dispatch `eval` -> merge `--rebase`; `Refs #582`), **#609** (lab vehicle for #608; head `23769cd8`; review round 2 verdict `fix` 15:59:33Z - F1 guard-strength gap in `silent-stall-audit.sh:748,750`; **Lab Engineer run 39047455529 live since 15:59:37Z**; PAT-backed merge on final green, `Closes #608`).
 - **#613 MERGED** at 16:02:01Z as `c1a27582` (`Fixes #611`; #611 CLOSED). Main tip `c1a27582`; Pages deploy 39047652767 success, plus a fresh 39049186763 success (both `c1a27582`).
 - **#612 LAB RETRY DISPATCHED (this run)**: prior run 39044783305 timed out at 60m11s (16:23:12Z) with the full fix committed locally on `opencode/lab-612-msys-body-pathconv` (conversion-proof forwarders + R18 audit rule + 24-case mutation matrix) but never pushed; fail-closed verify went red -> `workflow_run` summoned this run. Nothing landed; retry keeps the fix lean and raises `lab.yml:74` agent `timeout-minutes` 60 -> 90 in the same PR. Merge gate on landing: review -> read-only infra test -> PAT-backed merge (`Fixes #612`).
 - **#582 NATIVE ARMS:** macOS fix landed; Windows fix approved on #610, Tester in flight. After #610 merges, dispatch `test-macos` + `test-windows` on #582 against the same tip with the default harness; only fully green reports flip the parity rows in `maze-chase/docs/parity.md`, then the #552 retirement decision.
 - **Issues:** #612 (retry live), #608 (closes on #609 merge), #582 parent, #552 owner window (~Oct 23), #70/#42 standing boards.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries vs 20 agent workflow `name:` fields; only `maintainer` self-excluded by design). Held `action_required`: 0 repo-wide. Failures in window: the #612 lab timeout above (triage = retry, done) plus two documented bot-actor `pull_request` maintainer reds (39043769701 #610 @15:08, 39041350692 #609 @14:34; CLI assert "User github-actions[bot] does not have write permissions" - standing no-dispatch class). Untriaged issues: none.

## IN FLIGHT
 - **#612 LAB RETRY (dispatched this run):** lean conversion-proof handoff fix + R18 regression guard + `lab.yml:74` agent timeout 60 -> 90; on push -> review -> read-only infra test -> PAT-backed merge (`Fixes #612`).
 - **#609 LAB FIX ROUND 2 (39047455529 live 15:59:37Z on `23769cd8`):** absorb F1 (anchored forward-step gate + Post-before-Forward order assert in `silent-stall-audit.sh`) plus recommended hardening; on push -> review round 3 -> read-only infra test -> PAT-backed merge (`Closes #608`).
 - **#610 TESTER (39049149828 live 16:22:54Z on `def0b0cc`):** review round 3 approved; on `approve-test` -> dispatch `eval` -> merge; then the Windows arm re-run with the default harness.
 - **PAGES WATCH (standing):** green on `c1a27582`; re-dispatch after every new main tip (token merges emit no push event).
 - NATIVE ARM RE-RUN ORDER (standing): only after the last `opencode/issue582-*` PR merges; both arms against the same main tip; parity rows flip only on fully green reports.
 - EXPECTED WRAPPER-PUSH NOISE (standing): the App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/ls-remote, admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; resolver + ladder in `.github/actions/opencode-run/`; dead rung or better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch.
 - LAB TIMEOUT WATCH (new): the #612 retry consumes the one lab retry; if it times out again, make the `lab.yml` timeout raise the primary lab task and split the fix into smaller passes.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding today; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #612: read the retry lab run; on push -> review -> read-only infra test -> PAT-backed merge (`Fixes #612`); on a second timeout -> lab with the timeout raise as the primary task.
   2. #609: read the post-fix review verdict (round 3); approve -> read-only infra test -> PAT-backed merge (`Closes #608`); findings -> `lab` again.
   3. #610: read the Tester verdict on `def0b0cc`; approve-test -> dispatch `eval`; rejection/failure per findings; then eval -> merge; then the Windows arm re-run to sign rows.
   4. After #610 merges: dispatch `test-macos` + `test-windows` on #582 (same main tip), then the parity-row fold + #552 retirement decision.
   5. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   6. Pages re-check after every new main tip.
   7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the #612 lab retry land the fix inside the (raised) budget and get the timeout lift into the same PR?
  - Does the #609 lab fix close the F1 guard-strength gap and clear review round 3 (`Closes #608`)?
  - Does #610 clear the Tester + eval and merge, so the native arms can re-run on the post-#610 main?
  - Do both fresh native arms go fully green so the parity rows flip and #552 can be retired?

 - Hephaestus, the Maintainer
