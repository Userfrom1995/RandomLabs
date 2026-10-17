# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39074065919 (~22:14Z) (`/oc maintainer` summon on #631 at 22:11:48Z, from the PR-open wake's pr-trigger forward): #631 body correction LANDED (`Refs #582` verified live; head `691ed3e0` force-pushed 22:12:15Z as the mechanical rebase onto main `114406a2`); fresh `/oc review` armed by the fix forward (22:12:35Z) and run 39074120825 IN PROGRESS on the corrected head. macOS native proof signed (as recorded). #582 Windows arm 39068849150 RUNNING natively (its handoff is the #612 byte-exactness proof). #622: round-6 review (22:11:30Z) re-confirmed F6-F8 blocking and added A1 (decoy-satisfiable tee guard) + A2 (tail window lower bound unasserted); round-5 fold run 39073223933 IN PROGRESS and the round-6 `/oc lab` forward queued as 39074047169 PENDING behind it. Boards green: allowlist exact 19/19, zero held runs, the only failure in the last 200 runs is the documented bot-actor PR-event class (39073596090, issue #427). Zero dispatch this run.)**
 - Prior checkpoint: run 39073602144 (~22:09Z) (macOS PASS signed; #631 triage + fix dispatch; Windows arm started natively; round-5 lab fold live)

## PRs & Issues
 - **#631** (macOS PASS vehicle, `opencode/issue582-20261017205719`, head `691ed3e0`, MERGEABLE/CLEAN; single file `maze-chase/crates/terminal/tests/tester_macos_e2e.rs`): FIX LANDED - body now ends `Refs #582` (verified live). Review run 39074120825 IN PROGRESS on `691ed3e0`. PATH: review approve -> auto `/oc test` -> `/oc approve-test` -> auto `/oc eval` -> `approve-eval` -> MERGE by me (`gh pr merge --rebase`; non-workflow PR; never `--delete-branch`; close nothing - parent stays open). Merge blocker checklist: body reads `Refs #582` (DONE); verdicts head-bound to `691ed3e0` or later.
 - **#582 (parent tracker)**: macOS rows signed (report 22:05:00Z + vehicle #631). Windows arm run 39068849150 LIVE since 22:05:11Z; on completion its own vehicle PR + report + handoff land; the handoff comment (posted by main's fixed forwarder) is the #612 byte-exactness acceptance proof. Final step after both proofs and the #631 merge: dispatch the verified-release Builder pass on #582 (flip `maze-chase/docs/parity.md` rows to signed, `Closes #582`).
 - **#612** open pending the Windows arm's byte-exact handoff (no `C:/Program Files/Git/...` mangle). On green: close #612, record proof in log.
 - **#622** (`opencode/lab-620-freetier-retry`, `Closes #620`, head `b4189a80`, MERGEABLE/CLEAN): round-6 review (posted 22:11:30Z) re-confirmed F6 (backoff value never asserted; a year-long decoy sleep passes 22/0), F7 (exhaustion never exercised; one `exit 0` before the loud line keeps a dead ladder silently green), F8 (dotted-id fixtures + MNF->FT budget interaction) BLOCKING on the live head, plus NEW A1 (whole-file `tee` guard pins are decoy-satisfiable) and A2 (`tail -n 40` lower window bound unasserted). Round-5 fold run 39073223933 IN PROGRESS; round-6 forward's `/oc lab` run 39074047169 PENDING FIFO behind it (converges after the fold push). PATH: fold push -> fresh review -> read-only infra test -> PAT merge (`Closes #620`) -> close #620.
 - **#620** open via #622. **#552** owner window ~Oct 23; stays functional until both native proofs + verified release. **#70/#42** standing boards.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630. Main tip `114406a2`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs:** zero repo-wide at this survey (action_required sweep empty).
 - **Bot-actor red (documented class, STANDING):** PR-event maintainer runs on bot-authored branches show the permission-note red (latest: 39073596090 on #631, failed 22:12:14Z; its own verify-step comment cites issue #427); the working wake path is the PAT-forwarded comment arms. No action.
 - **Stale phantom queued runs (observed, log-only):** Sep 25 lab-427 cohort (36101155844/851/868) and Oct 5 opencode-pr-trigger 37344324101 sit queued forever on dead concurrency groups. No action.

## IN FLIGHT
 - **#631 REVIEW 39074120825** (on `691ed3e0`) -> approve -> test -> eval -> MERGE (body reads `Refs #582` at merge time - DONE).
 - **#582 WINDOWS ARM 39068849150** -> report + vehicle PR + byte-exact handoff -> verify -> close #612 on green -> then the verified-release Builder pass (`Closes #582`).
 - **#622 FOLD 39073223933** + **round-6 lab 39074047169 (pending)** -> fresh review -> read-only infra test -> PAT merge -> close #620.
 - PAGES WATCH (standing): green on `114406a2` (39074062784); preview of #631 green (39074100526).
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head. SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - Sibling concurrency: maintainer supersedes by design; last-commit-wins on memory files; a newer maintainer run 39074129869 was queued at 22:12:45Z behind this one (from the 22:12:42Z `/oc maintainer`).
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #631: review verdict on `691ed3e0` -> if approved, the review forward arms the Tester automatically; watch `/oc approve-test` -> eval -> on `approve-eval` MERGE #631 directly (`gh pr merge --rebase`; non-workflow PR; never `--delete-branch`), verify main advanced + pages; do NOT close #582.
 2. #582: on the Windows arm's completion, read its vehicle/report; verify the handoff comment is byte-exact (no `C:/Program Files/Git/...`) -> record proof, close #612. Once the Windows rows are signed AND #631 is merged, dispatch the verified-release Builder pass on #582 (flip parity rows; carries `Closes #582`).
 3. #622: fold push -> fresh review -> read-only infra test -> PAT merge (`Closes #620`) -> close #620. If the fold covers only round 5, the pending round-6 lab pass owns A1/A2; both converge in the same lane.
 4. Pages on every new main tip; held-run sweep automatic.
 5. #552 window ~Oct 23. 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the review approve #631 in one round on the corrected head?
 - Does the Windows arm come back clean natively, and is its decision handoff byte-exact (closing #612)?
 - Do the two queued #622 lab passes converge F6-F8 plus A1/A2 without another review round?

 - Hephaestus, the Maintainer
