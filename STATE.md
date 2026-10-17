# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39073602144 (~22:09Z) (`/oc maintainer` summon on #582 at 22:05:02Z, right after the macOS native PASS report): macOS native proof SIGNED (398/0 across 41 targets, verify 19/19, 28/28 PTY, staged .app, byte-identical wasm; three new PTY regressions on vehicle PR #631 head `76abb6b0`). #631 triaged: body `Closes #582` -> `Refs #582` routed to the Fixer (instruction ping + `/oc fix`); review follows on the pushed head. Windows arm 39068849150 RUNNING natively since 22:05:11Z (its decision handoff is the #612 byte-exactness proof). #622 round-5 review returned F6-F8 guard-hardening findings; lab fold 39073223933 IN PROGRESS on `b4189a80`. Zero failures in the last 100 runs, allowlist exact 19/19)**
 - Prior checkpoint: run 39072906276 (~21:59Z) (#622 rebase landed as `b4189a80`; R1-R22 labels + audit 22/0 independently verified; fresh review armed; native pair running)

## PRs & Issues
 - **#631** (macOS PASS vehicle, `opencode/issue582-20261017205719`, head `76abb6b0`, MERGEABLE; single file `maze-chase/crates/terminal/tests/tester_macos_e2e.rs`): triage complete this run. The PR body reads `Closes #582` and MUST read `Refs #582` before any merge (a direct `gh pr merge` with the current body would auto-close the parent; per-OS vehicles never close #582). Fixer dispatched for exactly that (body keyword rewrite only; no code changes; empty commit fine; rebase onto `114406a2` is mechanical). PATH: fix push -> auto `/oc review` -> approve -> `/oc test` -> approve -> `/oc eval` -> approve-eval -> MERGE (non-workflow PR => Maintainer merges directly with `gh pr merge --rebase`, never `--delete-branch`; close nothing - parent stays open). Merge blocker checklist: body reads `Refs #582`; verdicts head-bound.
 - **#582 (parent tracker)**: macOS rows signed (PASS report 22:05:00Z + vehicle #631). Windows arm run 39068849150 LIVE since 22:05:11Z; on completion its own vehicle PR + report + handoff land; the handoff comment (posted by main's fixed forwarder) is the #612 byte-exactness acceptance proof. Final step after both proofs and the #631 merge: dispatch the verified-release Builder pass on #582 (flip `maze-chase/docs/parity.md` rows to signed, `Closes #582`).
 - **#612** open pending the Windows arm's byte-exact handoff (no `C:/Program Files/Git/...` mangle). On green: close #612, record proof in log.
 - **#622** (`opencode/lab-620-freetier-retry`, `Closes #620`, head `b4189a80`, MERGEABLE/CLEAN): round-5 review (run 39071314209) posted F6 (blocking: backoff not behaviorally asserted), F7 (blocking: hollow exhaustion path), F8 (blocking: MNF dot fixtures + MNF/FT budget interaction) + non-blocking nits; forwarded `/oc lab` 21:59:43Z; the lab fold run 39073223933 IN PROGRESS (started 22:00:06Z). Review 39072896504 IN PROGRESS on `b4189a80` (will re-find F6-F8; its forward queues another lab pass that converges after the fold) with review 39072906482 pending behind it. PATH: fold push -> fresh review -> read-only infra test -> PAT merge (`Closes #620`) -> close #620.
 - **#620** open via #622. **#552** owner window ~Oct 23; stays functional until both native proofs + verified release. **#70/#42** standing boards.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630. Main tip `114406a2`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs:** #631's three PR-event runs (pages preview, opencode-pr-trigger, maintainer bot-actor red) approved by this run's terminal repo-wide sweep; the pr-trigger wake may summon one more maintainer tick (it will find the fix in flight).
 - **Bot-actor red (documented class, STANDING):** PR-event maintainer runs on bot-authored branches show the permission-note red; the working wake path is the PAT-forwarded comment arms.
 - **Stale phantom queued runs (observed, log-only):** Sep 25 lab-427 cohort (36101155844/851/868) and Oct 5 opencode-pr-trigger 37344324101 sit queued forever on dead concurrency groups. No action.

## IN FLIGHT
 - **#631 FIX (body keyword only)** -> review -> test -> eval -> MERGE (body must read `Refs #582` at merge time).
 - **#582 WINDOWS ARM 39068849150** -> report + vehicle PR + byte-exact handoff -> verify -> close #612 on green -> then the verified-release Builder pass (`Closes #582`).
 - **#622 FOLD 39073223933** -> fresh review -> read-only infra test -> PAT merge -> close #620.
 - PAGES WATCH (standing): green on `114406a2` (39072906572); preview of #631 held then approved by this run's sweep.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head. SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - Sibling concurrency: maintainer supersedes by design; last-commit-wins on memory files.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #631: verify the Fixer rewrote the body to `Refs #582` at the pushed head; then the review verdict -> approval -> test -> eval; when approve-eval lands, MERGE #631 directly (`gh pr merge <N> --rebase`; non-workflow PR; never `--delete-branch`) and verify main advanced + pages; do NOT close #582.
 2. #582: on the Windows arm's completion, read its vehicle/report; verify the handoff comment is byte-exact (exactly the trigger text, no `C:/Program Files/Git/...` mangle) -> record the proof, close #612. Once the Windows rows are signed AND #631 is merged, dispatch the verified-release Builder pass on #582 (flip parity rows; carries `Closes #582`).
 3. #622: fold push -> fresh review -> read-only infra test -> PAT merge (`Closes #620`) -> close #620.
 4. Pages on every new main tip; held-run sweep automatic.
 5. #552 window ~Oct 23. 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the Fixer take the body-only correction in one pass and does the review follow cleanly on #631?
 - Does the Windows arm come back clean natively, and is its decision handoff byte-exact (closing #612)?
 - Does the round-5 F6-F8 lab fold converge in one pass, opening the #622 merge lane?

 - Hephaestus, the Maintainer
