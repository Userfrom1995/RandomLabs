# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39074129869 (~22:20Z) (`/oc maintainer` summon on #631 queued from 22:12:42Z; previous tick run 39074065919 posted at 22:19:10Z): zero dispatch. #631 head `691ed3e0` re-verified live (body ends `Refs #582`, MERGEABLE/CLEAN) and its review 39074120825 IN PROGRESS on that exact head (started 22:12:40Z); on approve the review forward arms the Tester -> eval -> my merge. #622 fold LANDED as head `c23af9b2` (F6-F8 folded, 0 behind / 16 ahead of main `114406a2`; runtime untouched) and round-7 review 39074509081 IN PROGRESS (22:18:10Z) on that head; its own maintainer tick 39074600168 is IN PROGRESS on the #622 thread (summoned 22:19:30Z) and owns that lane - zero dispatch from me. #582 Windows arm 39068849150 STILL RUNNING natively (started 20:56:50Z). Boards green: allowlist exact 19/19 re-verified, zero held runs, only red in the last 200 runs is the documented bot-actor PR-event class 39073596090 (issue #427). Sibling concurrency: two maintainer runs live at once (per-target concurrency); last-commit-wins on memory files.)**
 - Prior checkpoint: run 39074065919 (~22:14Z) (body fix landed; fresh review armed; Windows arm live; round-5/6 lab fold convergence)

## PRs & Issues
 - **#631** (macOS PASS vehicle, `opencode/issue582-20261017205719`, head `691ed3e0`, MERGEABLE/CLEAN; single file `maze-chase/crates/terminal/tests/tester_macos_e2e.rs`): body reads `Refs #582`, verified live this tick (tail read). Review run 39074120825 IN PROGRESS on `691ed3e0`. PATH: review approve -> auto `/oc test` -> `/oc approve-test` -> auto `/oc eval` -> `approve-eval` -> MERGE by me (`gh pr merge --rebase`; non-workflow PR; never `--delete-branch`; close nothing - parent stays open). Merge blocker checklist: body `Refs #582` (DONE); verdicts head-bound to `691ed3e0` or later.
 - **#582 (parent tracker)**: macOS rows signed (report 22:05:00Z + vehicle #631). Windows arm run 39068849150 LIVE since 20:56:50Z; on completion its own vehicle PR + report + handoff land; the handoff comment (posted by main's fixed forwarder) is the #612 byte-exactness acceptance proof. Final step after both proofs and the #631 merge: dispatch the verified-release Builder pass on #582 (flip `maze-chase/docs/parity.md` rows to signed, `Closes #582`).
 - **#612** open pending the Windows arm's byte-exact handoff (no `C:/Program Files/Git/...` mangle). On green: close #612, record proof in log.
 - **#622** (`opencode/lab-620-freetier-retry`, `Closes #620`, head `c23af9b2` after the F6-F8 fold, MERGEABLE/CLEAN): round-7 review 39074509081 IN PROGRESS on the new head; sibling maintainer run 39074600168 IN PROGRESS on the #622 thread owns this lane (the 22:19:30Z summon). PATH: review -> if clean read-only infra test -> PAT merge (`Closes #620`) -> close #620; if another round of findings lands, the lab lane self-converges there.
 - **#620** open via #622. **#552** owner window ~Oct 23; stays functional until both native proofs + verified release. **#70/#42** standing boards.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630. Main tip `114406a2`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs:** zero repo-wide at this survey (action_required sweep empty).
 - **Bot-actor red (documented class, STANDING):** PR-event maintainer runs on bot-authored branches show the permission-note red (latest: 39073596090 on #631, failed 22:12:14Z; cites issue #427); the working wake path is the PAT-forwarded comment arms. No action.
 - **Stale phantom queued runs (observed, log-only):** Sep 25 lab-427 cohort (36101155844/851/868) and Oct 5 opencode-pr-trigger 37344324101 sit queued forever on dead concurrency groups. No action.

## IN FLIGHT
 - **#631 REVIEW 39074120825** (on `691ed3e0`) -> approve -> test -> eval -> MERGE (body reads `Refs #582` at merge time - DONE).
 - **#582 WINDOWS ARM 39068849150** -> report + vehicle PR + byte-exact handoff -> verify -> close #612 on green -> then the verified-release Builder pass (`Closes #582`).
 - **#622 ROUND-7 REVIEW 39074509081** (on `c23af9b2`) + sibling maintainer 39074600168 -> read-only infra test -> PAT merge -> close #620.
 - PAGES WATCH (standing): deploy 39074598891 in progress (preview refresh; latest main-tip deploys green on `114406a2`).
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head. SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - Sibling concurrency: maintainer supersedes by design; this run and 39074600168 (per-target groups) ran concurrently; last-commit-wins on memory files.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #631: review verdict on `691ed3e0` -> if approved, the review forward arms the Tester automatically; watch `/oc approve-test` -> eval -> on `approve-eval` MERGE #631 directly (`gh pr merge --rebase`; non-workflow PR; never `--delete-branch`), verify main advanced + pages; do NOT close #582.
 2. #582: on the Windows arm's completion, read its vehicle/report; verify the handoff comment is byte-exact (no `C:/Program Files/Git/...`) -> record proof, close #612. Once the Windows rows are signed AND #631 is merged, dispatch the verified-release Builder pass on #582 (flip parity rows; carries `Closes #582`).
 3. #622: round-7 verdict -> read-only infra test -> PAT merge (`Closes #620`) -> close #620. A new findings round self-converges in the lab lane; only intervene if the loop exceeds its retry budget.
 4. Pages on every new main tip; held-run sweep automatic.
 5. #552 window ~Oct 23. 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the review approve #631 in one round on the corrected head?
 - Does the Windows arm come back clean natively, and is its decision handoff byte-exact (closing #612)?
 - Does the #622 round-7 review clear F6-F8 plus A1/A2 in one fold, or is another lab round needed?

 - Hephaestus, the Maintainer
