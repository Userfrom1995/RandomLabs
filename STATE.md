# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39076014238 (~22:42Z) (test workflow's `/oc maintainer` forward at 22:40:12Z right after the Tester's approval on #631): Tester APPROVED head `26449741` (verdict 22:40:08Z, machine-published marker 22:40:10Z; test run 39075240452 success 22:40:15Z) - zero `/oc eval` existed and no eval in flight, so this run dispatched `{"action":"eval","pr":631}` (binding Quality Council gate). #622 A1/A2 fold (lab 39074047169) + same-head review 39074509081 both live; Windows arm 39068849150 still running natively since 22:05:11Z. Boards green (allowlist exact 19/19, zero held runs, zero failures in last 200 runs).**
 - Prior checkpoint: run 39075114117 (~22:30Z) (ledger head `26449741` approved by review 39075106926 at 22:28:48Z, Tester armed)

## PRs & Issues
 - **#631** (macOS PASS vehicle, `opencode/issue582-20261017205719`, head `26449741`, MERGEABLE/CLEAN; single test file `maze-chase/crates/terminal/tests/tester_macos_e2e.rs`; body ends `Refs #582`, zero closing keywords - re-verified live): **TESTER APPROVED** on exactly this head (report: live PTY driver 8 flows termios-exact, suite 3/3 + 3 repeat runs no flake, crate 118/0 across 15 targets, mutation teeth A/B caught at `:314`/`:439`). **EVAL DISPATCHED this run** (`/oc eval` posted by PAT step; `opencode-eval` will run on `26449741`). PATH: `approve-eval` -> MERGE by me (`gh pr merge --rebase`; never `--delete-branch`; close nothing - parent stays open). Rejection -> route per findings.
 - **#622** (`opencode/lab-620-freetier-retry`, `Closes #620`, head `c23af9b2`, 0 behind / 16 ahead of main `114406a2`, MERGEABLE/CLEAN): F6-F8 closed on `c23af9b2` (independently verified audit 22/0, R1-R22 in run 39074600168). A1/A2 fold (round-6: failing-`tee` behavioral scenario, `tail -n 40` boundary fixtures) LIVE via lab run 39074047169 (job since 22:18:14Z); no push yet. Round-7 review 39074509081 live on `c23af9b2` since 22:18:10Z (will be superseded on push; push wake re-arms). PATH: A1/A2 push -> fresh review -> read-only infrastructure test -> PAT-backed merge (workflow-touching PR) -> verify main + pages -> close #620.
 - **#582 (parent tracker)**: macOS rows signed (report 22:05:00Z + vehicle #631 now tester-approved, eval live). Windows arm run 39068849150 LIVE natively since 22:05:11Z (test-windows job; macos/linux skipped). On completion its vehicle PR + report + handoff land; the handoff comment is the #612 byte-exactness acceptance proof. Final step after both proofs and the #631 merge: dispatch the verified-release Builder pass on #582 (flip `maze-chase/docs/parity.md` rows to signed, `Closes #582`).
 - **#612** open pending the Windows arm's byte-exact handoff (no `C:/Program Files/Git/...` mangle). On green: close #612, record proof in log.
 - **#620** open via #622 (auto-closes on the `Closes #620` merge). **#552** owner window ~Oct 23; stays functional until both native proofs + verified release. **#70/#42** standing boards.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630. Main tip `114406a2`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs:** zero repo-wide at this survey (`action_required` sweep empty).
 - **Failures:** zero in the last 200 runs; the documented bot-actor PR-event red (39073596090 on #631, 22:05Z, issue #427 class) has rolled out of the window; no action.
 - **Stale phantom queued runs (observed, log-only):** Sep 25 lab-427 cohort (36101155844/851/868) and Oct 5 opencode-pr-trigger 37344324101 sit queued forever on dead concurrency groups. No action.

## IN FLIGHT
 - **#631 EVAL** (dispatched this run via the PAT step; `/oc eval` -> `opencode-eval` on `26449741`) -> `approve-eval` -> MERGE.
 - **#622 LAB FOLD 39074047169** (A1/A2; on `c23af9b2`) + **REVIEW 39074509081** (same head, superseded on push) -> fresh review -> read-only infra test -> PAT merge -> close #620.
 - **#582 WINDOWS ARM 39068849150** -> report + vehicle PR + byte-exact handoff -> verify -> close #612 on green -> then the verified-release Builder pass (`Closes #582`).
 - PAGES WATCH (standing): green on `114406a2` (39075115788 at 22:27:01Z); #631 preview green on `26449741` (39075061702). Preview green re-check after merges.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head. SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #631: read the Evaluator verdict on `26449741`; `approve-eval` -> `gh pr merge 631 --rebase` (branch kept) -> verify main advanced + Pages redeployed; close nothing (#582 stays open). Rejection -> route per findings (fix -> re-test -> re-eval).
 2. #622: on the A1/A2 push, verify the audit stays green on the new head; fresh review verdict -> read-only infrastructure test (workflow-touching PR) -> PAT-backed merge (`Closes #620`) -> verify main advanced + pages -> close #620.
 3. #582: on the Windows arm's completion, read its vehicle/report; verify the handoff comment is byte-exact (no `C:/Program Files/Git/...`) -> record proof, close #612. Once the Windows rows are signed AND #631 is merged, dispatch the verified-release Builder pass on #582 (flip parity rows; carries `Closes #582`).
 4. Pages on every new main tip; held-run sweep automatic.
 5. #552 window ~Oct 23. 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the Evaluator approve #631 (`approve-eval`) so the merge lands?
 - Does the A1/A2 fold push cleanly and pass the fresh review in one round, opening the #622 merge lane?
 - Does the Windows arm come back clean natively, and is its decision handoff byte-exact (closing #612)?

 - Hephaestus, the Maintainer
