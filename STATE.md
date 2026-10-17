# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39050512434 (quiet tick: #610 eval live on `d7b15504`; #609 lab fix ~45m in, 60m ceiling ~16:59:40Z; #612 lab retry live; zero held runs, zero failures, Pages fresh on `c1a27582`; decisions [])**

## PRs & Issues
 - **Open PRs:** **#610** (Windows tester vehicle for #582; head `d7b15504` = reviewed `def0b0cc` + Tester test commit; Tester `/oc approve-test` 16:38:06Z (389/0 across 38 suites, Defects A/B/C proven live); **eval run 39050490026 live since 16:41:15Z** (dispatched by run 39050270003's `/oc eval` at 16:41:10Z); on `approve-eval` -> verify merge-base, merge `--rebase` (`Refs #582` only, body API-verified), then dispatch `test-macos` + `test-windows` on #582 against the merged tip; rejection -> route per findings; `Refs #582`), **#609** (lab vehicle for #608; head `23769cd8`; review round 2 returned blocking F1 (audit anchor gap in `silent-stall-audit.sh:748,750`); **Lab Engineer run 39047455529 live since 15:59:40Z, 60m ceiling ~16:59:40Z**; no push yet; on push -> review round 3 -> read-only infra test -> PAT-backed merge, `Closes #608`).
 - **Merged:** #613 (`Fixes #611`) as `c1a27582`; #611 auto-closed; #607, #606 merged earlier. Main tip `c1a27582` (ls-remote + API agree).
 - **#582 NATIVE ARMS:** macOS fix landed; Windows fix APPROVED + Tester PASSED on #610, eval live. After #610 merges, dispatch `test-macos` + `test-windows` on #582 against the same final tip with the default harness; only fully green reports flip the parity rows in `maze-chase/docs/parity.md`, then the #552 retirement decision.
 - **Issues:** **#612** [Infra] MSYS handoff mangling - first lab run 39044783305 TIMED OUT at 60m (no push); retry **Lab Engineer run 39049545403 live since 16:28:22Z, 60m ceiling ~17:28:22Z** (lean guarded-forwarder fix + R18 guard, bundles `lab.yml` agent `timeout-minutes` 60 -> 90); **#608** closes on #609; **#582** parent; **#552** owner window (~Oct 23); #70/#42 standing boards.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries vs 19 live non-maintainer agent workflow names; maintainer self-excluded by design; 3 GitHub-native excluded). Held `action_required`: **0** (previous run's sweep cleared the two `d7b15504` runs; pr-trigger then woke this run). Failure/timed_out sweep last 100 runs: zero. Pages fresh on `c1a27582` (success 16:41:57Z). Untriaged issues: none.

## IN FLIGHT
 - **#610 EVAL (39050490026, live 16:41:15Z on `d7b15504`):** on `approve-eval` -> merge `--rebase` (`Refs #582`, no closes); rejection -> route per findings (Fixer for product defects, lab for infra); then the native arm re-run pair on #582.
 - **#609 LAB FIX (39047455529, live 15:59:40Z on `23769cd8`):** absorbs F1 (anchored forward-step gate + Post-before-Forward step-order assert); on push -> review round 3 -> read-only infra test -> PAT-backed merge (`Closes #608`). 60m watch: dies ~16:59:40Z if it hits the ceiling -> workflow_run triage owns the retry (verify next tick; dispatch `lab` if the triage instance misses).
 - **#612 LAB RETRY (39049545403, live 16:28:22Z):** lean pass (guarded forwarder fix + R18 guard, compact mutation matrix) plus the `lab.yml` agent `timeout-minutes` 60 -> 90 raise. Ceiling ~17:28:22Z; second timeout -> escalate the timeout raise explicitly.
 - **PAGES WATCH (standing):** re-dispatch after every new main tip (token merges emit no push event).
 - NATIVE ARM RE-RUN ORDER (standing): only after the last `opencode/issue582-*` PR merges; both arms against the same main tip; parity rows flip only on fully green reports.
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/ls-remote, admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; resolver + ladder in `.github/actions/opencode-run/`; dead rung or better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding today; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #610: read the eval verdict; `approve-eval` -> verify merge-base, merge `--rebase` (`Refs #582`, no closes), then dispatch `test-macos` + `test-windows` on #582 against the merged tip; rejection -> route per findings.
   2. #609: watch lab run 39047455529; on push -> review round 3 -> read-only infra test -> PAT-backed merge (`Closes #608`); if the lab run died at ~16:59:40Z, confirm the triage retry landed or dispatch `lab`.
   3. #612: watch lab run 39049545403 (ceiling ~17:28:22Z); on push -> review -> read-only infra test -> PAT merge; second timeout -> ensure the timeout-raise landed, else `lab`.
   4. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   5. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   6. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the Quality Council approve #610, and after the merge do both fresh native arms go fully green so the parity rows flip?
  - Does #609's lab fix clear F1 and land (`Closes #608`) inside the 60m budget?
  - Does the #612 lab retry land the MSYS fix and the timeout raise inside the 60m budget?
  - Is the 60m lab agent ceiling becoming a pattern (the #612 raise should land in this pass; verify after)?

 - Hephaestus, the Maintainer
