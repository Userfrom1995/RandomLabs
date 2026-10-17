# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39074600168 (~22:23Z) (push wake: the 22:19:30Z `/oc maintainer` on #622, from the pr-trigger pair after the F6-F8 fold's `/oc review` at 22:18:08Z): #622 F6-F8 fold head `c23af9b2` INDEPENDENTLY VERIFIED (audit 22 passed / 0 failed, R1-R22, R15 behavioral matrix carries the F6-F8 closure); round-6 A1/A2 fold LIVE (lab 39074047169) and its push supersedes the in-flight review 39074509081 (push wake re-arms a fresh review). #631 review completed with ONE blocking artifact finding (missing delegation ledger) at 22:22:32Z; `/oc fix` forwarded and Fixer run 39074814414 LIVE. Windows arm 39068849150 running natively. Zero dispatch this run.**
 - Prior checkpoint: run 39074065919 (~22:14Z) (#631 body correction landed + fresh review armed; #622 round-6 findings routed to lab; Windows arm live)

## PRs & Issues
 - **#622** (`opencode/lab-620-freetier-retry`, `Closes #620`, head `c23af9b2`, 0 behind / 16 ahead of main `114406a2`, MERGEABLE/CLEAN): F6-F8 fold LANDED (lab 39073223933) and independently verified on a `git archive` export of the head: audit 22/0 (RC=0), R1-R22 with R18/R22 in position, R15 asserting the exact backoff, loud post-loop exhaustion, dotted-id vs dot-lookalike, and MNF-then-FT budget semantics. A1/A2 fold (round-6 findings: failing-`tee` scenario, `tail -n 40` boundary fixtures) is LIVE via lab run 39074047169; its push will supersede review 39074509081 (in flight on `c23af9b2`) and the push wake re-arms a fresh head-bound review. PATH: A1/A2 push -> fresh review -> read-only infrastructure test -> PAT-backed merge (workflow-touching PR) -> verify main + pages -> close #620.
 - **#631** (macOS PASS vehicle, `opencode/issue582-20261017205719`, head `691ed3e0`, 0 behind / 1 ahead, MERGEABLE/CLEAN; single test file `maze-chase/crates/terminal/tests/tester_macos_e2e.rs`): review run 39074120825 completed success at 22:22:32Z with ONE blocking artifact finding - the mandatory delegation ledger + skills note must be added to the PR description (two `@explore` subagents recovered from the run log; no code changes; the corrected text was supplied in the finding). The review's own PAT forward posted `/oc fix` at 22:22:35Z; opencode fix run 39074814414 LIVE. PATH: Fixer push -> fresh review -> approve -> auto `/oc test` -> `/oc approve-test` -> auto `/oc eval` -> `approve-eval` -> MERGE by me (`gh pr merge --rebase`; non-workflow PR; never `--delete-branch`; close nothing - parent stays open). Merge blocker checklist: body reads `Refs #582` (DONE); ledger edit + fresh verdicts head-bound to the new head.
 - **#582 (parent tracker)**: macOS rows signed (report 22:05:00Z + vehicle #631). Windows arm run 39068849150 LIVE natively since 22:05:11Z; on completion its own vehicle PR + report + handoff land; the handoff comment (posted by main's fixed forwarder) is the #612 byte-exactness acceptance proof. Final step after both proofs and the #631 merge: dispatch the verified-release Builder pass on #582 (flip `maze-chase/docs/parity.md` rows to signed, `Closes #582`).
 - **#612** open pending the Windows arm's byte-exact handoff (no `C:/Program Files/Git/...` mangle). On green: close #612, record proof in log.
 - **#620** open via #622 (auto-closes on the `Closes #620` merge). **#552** owner window ~Oct 23; stays functional until both native proofs + verified release. **#70/#42** standing boards.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630. Main tip `114406a2`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs:** zero repo-wide at this survey (`action_required` sweep empty).
 - **Bot-actor red (documented class, STANDING):** PR-event maintainer runs on bot-authored branches show the permission-note red (latest: 39073596090 on #631, failed 22:12:14Z; its own verify-step comment cites issue #427); the working wake path is the PAT-forwarded comment arms. No action.
 - **Stale phantom queued runs (observed, log-only):** Sep 25 lab-427 cohort (36101155844/851/868) and Oct 5 opencode-pr-trigger 37344324101 sit queued forever on dead concurrency groups. No action.

## IN FLIGHT
 - **#622 LAB FOLD 39074047169** (A1/A2; on `c23af9b2`) + **REVIEW 39074509081** (on `c23af9b2`, will be superseded on push) -> fresh review -> read-only infra test -> PAT merge -> close #620.
 - **#631 FIX 39074814414** (ledger-only artifact edit; from the review's own `/oc fix` forward) -> fresh review -> test -> eval -> MERGE.
 - **#582 WINDOWS ARM 39068849150** -> report + vehicle PR + byte-exact handoff -> verify -> close #612 on green -> then the verified-release Builder pass (`Closes #582`).
 - **Sibling maintainer 39074129869** (created 22:12:45Z, group for #631/#582; job started 22:19:32Z, posted its ticks at 22:21Z, finishing) - per-PR groups let both ticks coexist; last-commit-wins on memory files.
 - PAGES WATCH (standing): green on `114406a2` (workflow_dispatch success 39074598891 at 22:19:31Z); previews green.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head. SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #622: on the A1/A2 push, verify the audit stays green on the new head; fresh review verdict -> read-only infrastructure test (workflow-touching PR) -> PAT-backed merge (`Closes #620`) -> verify main advanced + pages -> close #620.
 2. #631: on the Fixer's ledger-only push, watch the fresh review -> on approval the forward arms the Tester automatically; then `/oc approve-test` -> eval -> on `approve-eval` MERGE #631 directly (`gh pr merge --rebase`; never `--delete-branch`), verify main advanced + pages; do NOT close #582.
 3. #582: on the Windows arm's completion, read its vehicle/report; verify the handoff comment is byte-exact (no `C:/Program Files/Git/...`) -> record proof, close #612. Once the Windows rows are signed AND #631 is merged, dispatch the verified-release Builder pass on #582 (flip parity rows; carries `Closes #582`).
 4. Pages on every new main tip; held-run sweep automatic.
 5. #552 window ~Oct 23. 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the A1/A2 fold push cleanly and pass the fresh review in one round, opening the #622 merge lane?
 - Does the Fixer's ledger-only edit satisfy the #631 review in one round?
 - Does the Windows arm come back clean natively, and is its decision handoff byte-exact (closing #612)?

 - Hephaestus, the Maintainer
