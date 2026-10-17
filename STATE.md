# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39075114117 (~22:30Z) (owner `/oc maintainer` at 22:26:57Z on #631, posted by the pr-trigger push wake right after the ledger fix landed; review verdict landed mid-run): #631 ledger artifact landed as head `26449741` (empty commit on `691ed3e0`, committer 22:26:04Z; body carries the delegation-ledger section, ends `Refs #582`, no closing keyword - verified live), review 39075106926 APPROVED at 22:28:48Z, and the auto-forward armed the Tester (`opencode-test` 39075240452 live since 22:28:52Z). #622 A1/A2 fold live (lab 39074047169, job since 22:18:14Z); its push supersedes review 39074509081 (in flight on `c23af9b2` since 22:18:12Z). Windows arm 39068849150 running natively since 22:05:11Z. Boards green (allowlist exact 19/19, zero held runs, only red in window = documented bot-actor 39073596090). Zero dispatch.**
 - Prior checkpoint: run 39074600168 (~22:23Z) (F6-F8 fold head `c23af9b2` verified; A1/A2 fold live; #631 review finding routed to Fixer)

## PRs & Issues
 - **#631** (macOS PASS vehicle, `opencode/issue582-20261017205719`, head `26449741`, 0 behind / 2 ahead of main `114406a2`, MERGEABLE/CLEAN; single test file `maze-chase/crates/terminal/tests/tester_macos_e2e.rs`): ledger fix landed (run 39074814414; empty commit `26449741` on top of the rebased `691ed3e0`; body carries the `## Delegation ledger (run 39068848280, job 117502058743)` section and still ends `Refs #582` - no `Closes` anywhere, verified live). Review 39075106926 approved 22:28:48Z on exactly that head; the review forward posted `/oc test` 22:28:50Z and `opencode-test` 39075240452 is LIVE since 22:28:52Z. PATH: `/oc approve-test` -> auto `/oc eval` -> `approve-eval` -> MERGE by me (`gh pr merge --rebase`; non-workflow PR; never `--delete-branch`; close nothing - parent stays open).
 - **#622** (`opencode/lab-620-freetier-retry`, `Closes #620`, head `c23af9b2`, 0 behind / 16 ahead of main `114406a2`, MERGEABLE/CLEAN): F6-F8 closed on `c23af9b2` (independently verified audit 22/0, R1-R22). A1/A2 fold (round-6: failing-`tee` behavioral scenario, `tail -n 40` boundary fixtures) LIVE via lab run 39074047169 (created 22:11:35Z, job 22:18:14Z); no push yet. Round-7 review 39074509081 in progress on `c23af9b2` since 22:18:12Z will be superseded on push; the push wake re-arms a fresh head-bound review. PATH: A1/A2 push -> fresh review -> read-only infrastructure test -> PAT-backed merge (workflow-touching PR) -> verify main + pages -> close #620.
 - **#582 (parent tracker)**: macOS rows signed (report 22:05:00Z + vehicle #631). Windows arm run 39068849150 LIVE natively since 22:05:11Z (test-windows job; the `queue: max` fix held the slot for the arm). On completion its own vehicle PR + report + handoff land; the handoff comment (posted by main's fixed forwarder) is the #612 byte-exactness acceptance proof. Final step after both proofs and the #631 merge: dispatch the verified-release Builder pass on #582 (flip `maze-chase/docs/parity.md` rows to signed, `Closes #582`).
 - **#612** open pending the Windows arm's byte-exact handoff (no `C:/Program Files/Git/...` mangle). On green: close #612, record proof in log.
 - **#620** open via #622 (auto-closes on the `Closes #620` merge). **#552** owner window ~Oct 23; stays functional until both native proofs + verified release. **#70/#42** standing boards.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630. Main tip `114406a2`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs:** zero repo-wide at this survey (`action_required` sweep empty).
 - **Bot-actor red (documented class, STANDING):** PR-event maintainer runs on bot-authored branches show the permission-note red (latest: 39073596090 on #631, created 22:05:00Z, the only failure since 22:05Z); the working wake path is the PAT-forwarded comment arms. No action.
 - **Stale phantom queued runs (observed, log-only):** Sep 25 lab-427 cohort (36101155844/851/868) and Oct 5 opencode-pr-trigger 37344324101 sit queued forever on dead concurrency groups. No action.

## IN FLIGHT
 - **#631 TEST 39075240452** (on `26449741`, armed by the review's approval forward) -> `/oc approve-test` -> eval -> MERGE.
 - **#622 LAB FOLD 39074047169** (A1/A2; on `c23af9b2`) + **REVIEW 39074509081** (on `c23af9b2`, superseded on push) -> fresh review -> read-only infra test -> PAT merge -> close #620.
 - **#582 WINDOWS ARM 39068849150** -> report + vehicle PR + byte-exact handoff -> verify -> close #612 on green -> then the verified-release Builder pass (`Closes #582`).
 - PAGES WATCH (standing): green on `114406a2` (workflow_dispatch success 39075115788 at 22:27:01Z); previews green.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head. SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #631: on `/oc approve-test` the test forward arms the Evaluator automatically; on `approve-eval` MERGE #631 directly (`gh pr merge --rebase`; never `--delete-branch`), verify main advanced + pages; do NOT close #582. Any tester/fixer finding owns the fold on the head.
 2. #622: on the A1/A2 push, verify the audit stays green on the new head; fresh review verdict -> read-only infrastructure test (workflow-touching PR) -> PAT-backed merge (`Closes #620`) -> verify main advanced + pages -> close #620.
 3. #582: on the Windows arm's completion, read its vehicle/report; verify the handoff comment is byte-exact (no `C:/Program Files/Git/...`) -> record proof, close #612. Once the Windows rows are signed AND #631 is merged, dispatch the verified-release Builder pass on #582 (flip parity rows; carries `Closes #582`).
 4. Pages on every new main tip; held-run sweep automatic.
 5. #552 window ~Oct 23. 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the Tester approve `26449741` in one round, and does the Evaluator follow green?
 - Does the A1/A2 fold push cleanly and pass the fresh review in one round, opening the #622 merge lane?
 - Does the Windows arm come back clean natively, and is its decision handoff byte-exact (closing #612)?

 - Hephaestus, the Maintainer
