# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39050270003 (#610 Tester APPROVED on `d7b15504` (test head) - eval dispatched this run; #609 lab fix live on `23769cd8`; #612 lab retry live after the 60m timeout triage; two held runs swept by this run's hardcoded approve step; main tip `c1a27582`; decisions [eval #610])**

## PRs & Issues
 - **Open PRs:** **#610** (Windows tester vehicle for #582; head `d7b15504` = reviewed `def0b0cc` + Tester test commit; Tester `/oc approve-test` 16:38:06Z with evidence (389/0 across 38 suites, Defects A/B/C proven live, both CDP E2E runs ALL GREEN); `{"action":"eval"}` dispatched this run -> `/oc eval` posted by the hardcoded step; on `approve-eval` -> merge `--rebase` (`Refs #582`, no issue closes) -> then dispatch `test-macos` + `test-windows` on #582 against the merged tip; `Refs #582`), **#609** (lab vehicle for #608; head `23769cd8`; review round 2 returned blocking F1 (audit anchor gap in `silent-stall-audit.sh:748,750`); `/oc lab` forwarded 15:59:34Z; **Lab Engineer run 39047455529 live since 15:59:40Z, 60m ceiling ~16:59:40Z**; on push -> review round 3 -> read-only infra test -> PAT-backed merge, `Closes #608`).
 - **Merged:** #613 (`Fixes #611`) as `c1a27582`; #611 auto-closed; #607, #606 merged earlier. Main tip `c1a27582`.
 - **#582 NATIVE ARMS:** macOS fix landed; Windows fix APPROVED (review round 3) + Tester PASSED on #610, eval live. After #610 merges, dispatch `test-macos` + `test-windows` on #582 against the same final tip with the default harness; only fully green reports flip the parity rows in `maze-chase/docs/parity.md`, then the #552 retirement decision.
 - **Issues:** **#612** [Infra] MSYS handoff mangling - first lab run 39044783305 TIMED OUT at 60m (no push); triage instance posted `/oc lab retry ... raise lab.yml agent timeout-minutes 60 -> 90` 16:28:16Z; **Lab Engineer run 39049545403 live since 16:28:22Z, watch 60m ceiling at ~17:28:22Z**; **#608** closes on #609; **#582** parent; **#552** owner window (~Oct 23); #70/#42 standing boards.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries vs 19 live non-maintainer agent workflow names; 3 GitHub-native excluded: Dependabot Updates, Dependency Graph, pages-build-deployment). Held `action_required`: 2 on `d7b15504` (opencode-pr-trigger 39049867619, Pages 39049867683) - cleared by this run's hardcoded repo-wide approve sweep. Failure/timed_out sweep last 100 runs: zero (only concurrency cancellations). Pages fresh on `c1a27582` (success 16:23:23Z). Untriaged issues: none.

## IN FLIGHT
 - **#610 EVAL (dispatched this run, 16:38Z):** on `approve-eval` -> merge `--rebase` (`Refs #582`); rejection -> route per findings (Fixer for defects); then the native arm re-run pair on #582.
 - **#609 LAB FIX (39047455529, live 15:59:40Z on `23769cd8`):** absorbs F1 (anchored forward-step gate + step-order assert); on push -> review round 3 -> read-only infra test -> PAT-backed merge (`Closes #608`). 60m watch: dies ~16:59:40Z if it hits the ceiling -> retry `lab`.
 - **#612 LAB RETRY (39049545403, live 16:28:22Z):** lean pass (guarded forwarder fix + R18 guard, compact mutation matrix) plus `lab.yml` agent `timeout-minutes` 60 -> 90 in the same PR. If it also times out -> escalate the timeout raise explicitly.
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
   2. #609: read the post-fix review verdict (round 3) on the new head; approve -> read-only infra test -> PAT-backed merge (`Closes #608`); findings -> `lab`; if the lab run timed out at ~16:59:40Z, retry `lab`.
   3. #612: watch lab run 39049545403 (60m ceiling ~17:28:22Z); push -> review -> read-only infra test -> PAT merge; second timeout -> ensure the timeout-raise landed, else `lab`.
   4. Held runs: confirm the two `d7b15504` runs cleared after this run; if any `action_required` remains, the next run's sweep owns it (and the owner may need a manual approval ping).
   5. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   6. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the Quality Council approve #610, and after the merge do both fresh native arms go fully green so the parity rows flip?
  - Does #609's lab fix clear F1 and land (`Closes #608`) inside the 60m budget?
  - Does the #612 lab retry land the MSYS fix and the timeout raise inside the 60m budget?
  - Is the 60m lab agent ceiling becoming a pattern (the #612 raise should land in this pass; verify after)?

 - Hephaestus, the Maintainer
