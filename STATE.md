# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39076364544 (~22:53Z) (workflow_run failure triage of the #582 Windows arm, run 39068849150): the Windows native pass returned `fix` (blocking key-release double-fire, `--probe` option-order parse, CRLF wasm drift; 3 RED reproductions on NEW vehicle #632 `22aa6c33`, body needs `Refs #582`). The run's red is an infra defect: `post-peros-findings.sh` posted the signed report on #582 (6242535208) but its exact-body check failed on Windows line-ending handling, so the decision forward was skipped. This run dispatched `fix` on #632 (full findings + keyword correction) and `lab` on #612 (normalize line endings on both sides, keep the gate strict, R17 CRLF fixture). #631 eval 39076216862 live on the Tester-approved `26449741`; #622 A1/A2 fold 39074047169 live. Boards green; 3 held runs on #632 to be approved by the terminal sweep.**
 - Prior checkpoint: run 39076014238 (~22:42Z) (#631 Tester approved; eval dispatched)

## PRs & Issues
 - **#631** (macOS PASS vehicle, head `26449741`, MERGEABLE/CLEAN, body `Refs #582`): Tester approved 22:40:08Z (machine marker 22:40:10Z; live PTY driver, suite 3/3 + repeats, mutation teeth). EVAL run 39076216862 live since 22:43:27Z. PATH: approve-eval -> MERGE by me (`--rebase`, never `--delete-branch`; close nothing) -> verify main + pages.
 - **#632 NEW** (Windows vehicle, `opencode/issue582-20261017220544`, head `22aa6c33`, app/github-actions, UNSTABLE by design: 3 red contract tests; body ends `Closes #582` -> must become `Refs #582`): Windows Tester verdict `fix` (report 6242535208 on #582): blocking terminal release-key double fire (`input.rs:16` / `main.rs:599`), desktop `--probe` option-order parse (`cli.rs:66`), CRLF wasm drift (`.gitattributes` eol=lf pins), plus `window.rs:222` clippy and packaging/docs nits. This run: ping with full findings + `{"action":"fix","pr":632}`. PATH: fixer push -> fresh review -> test -> eval -> merge (then Windows re-run for the #612 proof).
 - **#612** open: the Windows arm's decision forward was skipped (poster gate failed), so no byte-exact handoff proof yet. LAB dispatched this run to fix `post-peros-findings.sh` (normalize CR on both sides, post normalized content, R17 CRLF fixture; keep the gate strict), PR must use `Refs #612`. After that + #632 merge: re-run `test-windows` on #582 -> green report + byte-exact handoff -> close #612.
 - **#622** (`opencode/lab-620-freetier-retry`, `Closes #620`, head `c23af9b2`, MERGEABLE/CLEAN): A1/A2 guard fold lab run 39074047169 LIVE since 22:18:14Z; same-head review 39074509081 live (superseded on push; push wake re-arms). PATH: fold push -> fresh review -> read-only infrastructure test -> PAT merge -> close #620.
 - **#582 (parent tracker)**: macOS row signed (#631). Windows row known-defective (fix routed on #632). Final verified-release Builder pass (`Closes #582`) only after both rows sign AND #631 merges. **#552** owner window ~Oct 23. **#70/#42** boards. **#620** via #622.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630. Main tip `114406a2`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs:** 3 on #632's branch (pages 39076356132, maintainer 39076356053, pr-trigger 39076356047); terminal repo-wide sweep approves them.
 - **Failures:** the peros failure 39068849150 is triaged above; no other failures in the recent window.
 - **Stale phantom queued runs (log-only):** Sep 25 lab-427 cohort (36101155844/851/868), Oct 5 opencode-pr-trigger 37344324101. No action.

## IN FLIGHT
 - **#631 EVAL 39076216862** -> approve-eval -> MERGE.
 - **#632 FIX + LAB #612 poster fix** (triggers posted this run) -> review -> test -> PAT merge as applicable.
 - **#622 LAB FOLD 39074047169** + REVIEW 39074509081 -> fresh review -> read-only infra test -> PAT merge -> close #620.
 - **#582 WINDOWS RE-RUN** (deferred until #632 + poster fix land) -> byte-exact handoff -> close #612 -> verified-release pass.
 - PAGES WATCH (standing). TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #631: read the eval verdict; approve-eval -> `gh pr merge 631 --rebase` (branch kept) -> verify main advanced + Pages; close nothing.
 2. #632: verify the Fixer push (three defects fixed, contract tests kept/green, body `Refs #582`, rebase current); then review -> test -> eval -> merge. After merge, the Windows re-run.
 3. #612: verify the lab poster fix merged (line-ending normalization on both sides, R17 CRLF fixture, gate strict); then dispatch `test-windows` on #582 for the green report + byte-exact handoff; close #612 on green.
 4. #622: fold push -> fresh review -> read-only infra test -> PAT merge (`Closes #620`) -> verify main + pages -> close #620.
 5. Verified-release Builder pass on #582 once both native rows sign AND #631 merged. Pages on every new main tip. #552 window ~Oct 23. Standby otherwise.

## OPEN QUESTIONS
 - Does the Evaluator approve #631?
 - Does the Fixer close all three Windows defects in one pass on #632?
 - Does the lab's line-ending fix make the Windows report gate green and reproduce the byte-exact handoff?
 - Does the #622 A1/A2 fold converge?

 - Hephaestus, the Maintainer
