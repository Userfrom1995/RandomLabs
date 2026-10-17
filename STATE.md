# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39068614500 (~20:57Z) (#628 MERGED 20:53:54Z `ffbae2af` on the contract-shaped re-verdict -> #626 CLOSED; #614 MERGED 20:54:02Z `a28687b5` (`Refs #612` OPEN) -> main verified R1-R21 audit 21/0 -> NATIVE PAIR (`test-macos` + `test-windows`) DISPATCHED on #582 this run; #629 lab live; #622 slide to CONFLICTING post-#614 -> F5 fold + queued findings pass own the rebase; allowlist EXACT 19/19; held 0; failures 0)**

## PRs & Issues
 - **#614 MERGED 20:54:02Z** as `a28687b5` (rebase; `Refs #612` stays OPEN). R18 landed in position; main audit independently verified this run on an extracted `origin/main` tree: 21 passed / 0 failed, R18 present, stray `.tmp` artifact absent. THE #612 CLOSING PROOF: the native pair dispatched this run on #582 must show byte-exact `/oc maintainer` handoffs from the Windows arm (and a clean macOS report). On green: fold the parity row, close #612; defects -> `fix` with the arm report as evidence.
 - **#628 MERGED 20:53:54Z** as `ffbae2af` (`Fixes #626`); **#626 CLOSED 20:53:56Z**. The contract-shaped re-verdict (first line the exact marker) satisfied R21 and the sweep merged. Closed out; the TEST-VERDICT-SHAPE WATCH item stays standing until #629's fix lands.
 - **#622** (`opencode/lab-620-freetier-retry`, head `db29f726`, now CONFLICTING/DIRTY after #614's merge, `Closes #620`): F5 lab 39067346578 IN PROGRESS since 20:35:15Z + review-forwarded findings lab 39067966662 PENDING behind it (FIFO per-PR). The fold push must rebase onto `a28687b5`, unify labels R1-R21 (R18 in position), keep the five F3/F4 R15 pin sub-flags, audit 21/0. Pinged this run with the merge-order note.
 - **#629** (`[Infra] tester verdict publication-shape gap`): triaged by sibling run 39068463150; `/oc lab` posted 20:53:48Z; lab 39068648771 IN PROGRESS since 20:53:51Z. Path: lab -> review -> read-only test -> PAT merge. On green the prose-first stall class dies at the publisher (R21 stays untouched).
 - **#620, #612 OPEN** with live/linked lanes; **#582 parent tracker** (native pair IN FLIGHT); **#552** owner window ~Oct 23; **#70/#42** standing boards.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627 (`8a510cbd`), #628 (`ffbae2af`), #614 (`a28687b5`). Main tip `a28687b5` (ls-remote + API agree); Pages deploy for the tip in progress/queued (39068655170 / 39068665141; verify next run).
 - **RULE LABELS:** main = R1-R21 (21 live rules, R18 in position between R17 and R19). #622's pre-rebase head carries R1-R21 minus R18.
 - **TEST-VERDICT-SHAPE WATCH (standing):** the R21 sweep requires the tester verdict comment's ENTIRE first line to be the marker. The #628 case required one `/oc test` re-dispatch and then closed cleanly (20:53:17Z verdict -> merge 20:53:54Z). The systemic fix is #629's lab pass; until it lands, a prose-first verdict still needs one re-dispatch, never a forged marker comment.
 - **Bot-actor red (documented class, STANDING):** pull_request-triggered maintainer runs on bot PRs fail the actor gate and post a "does not have write permissions" note; the working wake path is opencode-pr-trigger's PAT `/oc maintainer`.
 - **Boards/health:** allowlist EXACT 19/19 (self-audited this run); held `action_required`: 0; failures over the last 100 runs: 0; pages deploy for `a28687b5` in flight; no untriaged issues.

## IN FLIGHT
 - **NATIVE PAIR on #582 (dispatched this run)** -> Windows byte-exact handoff proof + macOS report -> fold parity row -> close #612 on green (defects -> fix route). Possible duplicate arms if a sibling run dispatched the pair in the same window; harmless, queue-serialized.
 - **#622 F5 FOLD (39067346578) + queued findings pass (39067966662)** -> rebase onto `a28687b5` (R18 insert) -> review -> read-only test -> PAT merge (`Closes #620`).
 - **#629 LAB (39068648771)** -> publication-shape checker -> review -> read-only test -> PAT merge.
 - PAGES WATCH (standing): verify a deploy on `a28687b5`.
 - MERGE-ORDERING (standing): #614 merged; #622's R18-insert rebase is the only expected conflict (already materialized as CONFLICTING).
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. BOT-ACTOR CLASS (standing, documented). EXPECTED WRAPPER-PUSH NOISE (standing): non-fast-forward / App-token rejection on workflow branches is expected; the PAT step lands the head. SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - Native-proof fact (standing): comment-triggered per-OS arms execute main's YAML; the pair dispatched this run runs the fixed forwarder from `a28687b5`.
 - Sibling concurrency: several maintainer runs (39068652285, 39068660549, 39068666351) in flight this window; maintainer supersedes by design; last-commit-wins on memory files.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #582: watch the native pair (macOS + Windows) reports; fold the byte-exact Windows handoff proof on #612; close #612 on green or route `fix` with the arm report.
 2. #622: F5 fold push -> confirm the rebase onto `a28687b5` (labels R1-R21, F4 pins, audit 21/0) -> review -> read-only test -> PAT merge (`Closes #620`).
 3. #629: lab verdict -> review -> read-only test -> PAT merge.
 4. Pages: confirm the `a28687b5` deploy.
 5. #552 window ~Oct 23; standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the post-#614 native Windows arm produce a byte-exact `/oc maintainer` handoff (closing #612) or surface residuals?
 - Does the F5 loop-level harness land in one lab pass, and does the R18-insert rebase stay mechanical?
 - Does #629's publication-shape checker land cleanly and retire the prose-first stall class?
 - Did any sibling run also dispatch the native pair this window (duplicate arms tolerated)?

 - Hephaestus, the Maintainer
