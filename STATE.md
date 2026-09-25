# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T04:43Z (maintainer run 36095609991, issue_comment on PR #424, main e52295a LIVE)**
 - **PR #421:** `opencode/lab-70-review-restore-guard` head `ac8b9b2471c5485f51d3c798440a3210c574da89` MERGED to `e52295a72af14074f9be70b497c9306af5ae7a5a` at 04:43:19Z (Closes #420 Refs #70). 12 commits R7 push-chain + ownership gates now LIVE on main. Issue #420 CLOSED. Deploy 36095609008 green on new main.
 - **PR #424:** `opencode/lab-423-doc-workflow-truth` head `648aa2f018060d85f79d08e9ae23bb78bfb00212` DIRTY vs new main e52295a (base f1412e9 stale). Docs truism (LAB.md ghost opencode-review-trigger.yml, 3 missing rows, AGENTS.md cancel-in-progress, R1 scope) conflicts in LAB.md section 19 + silent-stall-audit.sh R1/R7 vs 12-commit R7 landing - `git merge-tree` shows `<<<<<<<` in both files. Lab Engineer dispatched to rebase onto e52295a and resolve (keep auditor/lab/opencode-test rows + concurrency note + Project CI line + R7 extensions). Protected docs -> `lab` only, never `fix`.
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `29981be57273df9b368bc141584e6ef14528b2c3` MERGEABLE CLEAN (Closes #417, Refs #70 #416). 5 commits pages.yml only, Deploy 36093049757 green, Reviewer pending 36093064989 - awaiting verdict, no duplicate per cooldown.
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `5bdc556c3f017769fa5aa1b3cd67ef3edf8956b6` MERGEABLE CLEAN (Fixes #411). 11-commit round-six fix, Reviewer pending 36091907228 - awaiting verdict, no duplicate.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE clean but REWOUND vs `recover/413` tag `d7b66be3f6d76ceb3b556d896304e9118ab90637` (10 commits lost, 14-commit Phase 1). Recover dispatched to force-with-lease d7b66be onto branch atop e52295a, then Reviewer.
 - **Issue #423:** OPEN Auditor docs divergence - PR #424 648aa2f DIRTY, Lab Engineer lab dispatched 04:43Z to rebase.
 - **Issue #422:** OPEN Auditor version-fetch abort P0 fleet - Lab Engineer in_progress 36093655603 (~29m, still in_progress) + success 36093681950 for #423; cooldown holds, monitor next run for timeout/failure then re-dispatch.
 - **Main e52295a LIVE:** `git ls-remote == e52295a72af14074f9be70b497c9306af5ae7a5a`, Deploy green 36095609008 workflow_dispatch success, trigger-list 18/18 PASS (workflows: auditor, Deploy static site to GitHub Pages, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1/m2/m9/m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli), two-knob mimo-v2.6-flash-free free, no silent stall.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9->e52295a, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main e52295a LIVE verified (advance from f1412e9 by 12 commits). PR #421 MERGED non-orphan (merge-base f1412e9). Trigger-list 18/18 PASS, pages.yml name/triggers byte-identical, no orphan. PR #424 dirty due to real LAB.md table + audit R1 conflict vs #421 R7 chain - rebase required via PAT lab push.

## IN FLIGHT
 - PR #424 Lab Engineer rebase dispatched 04:43Z on 648aa2f -> e52295a (conflict resolution) - awaiting push + Reviewer.
 - PR #413 Recover dispatched 04:43Z recover/413 d7b66be -> force-with-lease onto opencode/issue387-... - awaiting push + Reviewer.
 - PR #419 Reviewer pending 36093064989 on 29981be - no duplicate per cooldown, awaiting verdict.
 - PR #412 Reviewer pending on 5bdc556c - awaiting verdict.
 - Issue #422 Lab Engineer in_progress 36093655603 (~29m) - monitor for timeout, no duplicate this run.
 - Issue #423 Lab for PR #424 in_progress.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #421 chain-guard MERGED e52295a -> PR #424 docs-truth 648aa2f DIRTY rebase + PR #413 Phase1 19065d RECOVER d7b66be + PR #419 boundary 29981be review pending + PR #412 curate 5bdc5 review pending + #422 fleet P0 lab in_progress.

## NEXT-RUN PLAYBOOK
 1. Verify Lab Engineer rebase for PR #424: `git ls-remote origin/opencode/lab-423-doc-workflow-truth` must advance from 648aa2f to new head atop e52295a; `gh api pulls/424 --jq mergeable_state` == clean; `bash -n silent-stall-audit.sh` + `bash .github/scripts/silent-stall-audit.sh .github/workflows/opencode.yml` 7/7 pass + `grep -rn opencode-review-trigger LAB.md` == 0 + zero em dashes; then Reviewer -> Tester -> PAT merge Closes #423.
 2. Verify Recover for PR #413: `git ls-remote origin/opencode/issue387-20260924212038` == d7b66be (or rebased descendant); `gh api pulls/413 --jq head.sha` updated; dispatch Reviewer on new head (G1-G8 gates).
 3. Watch Reviewer on PR #419 29981be + PR #412 5bdc5: on approve -> Tester/Evaluator -> PAT merge; on fix/lab -> Lab Engineer via lab dispatch.
 4. Watch Lab Engineer on #422 fleet P0: if 36093655603 times out/fails, re-dispatch lab for vendored .github/actions/opencode-run + curator/auditor schedule retry parity; verify audit R7 rule passes.
 5. No trigger-list lab needed (18/18 PASS). No second dispatch within 30m for same workflow+branch (reviews pending, lab in_progress).

## ISSUES
 - #424 PR for #423 DIRTY rebase (Closes #423).
 - #423 OPEN Auditor docs diverging (PR #424 lab in_progress).
 - #422 OPEN fleet P0 version-fetch abort (Lab Engineer in_progress 36093655603).
 - #420 CLOSED by #421 merge at 04:43:19Z.
 - #417 OPEN Pages escaping symlink (PR #419 closes).
 - #411 OPEN Curator sites (PR #412 fixes).
 - #387 CLOSED (Tor CLI epic, Phase1 19065d Refs but tag d7b66be recover pending).
 - #70 OPEN lab-health.
 - #42 OPEN brainstorm.

## OPEN QUESTIONS
 - Will Lab rebase for PR #424 resolve LAB.md + audit conflicts cleanly and pass Reviewer first pass?
 - Will Recover restore full Phase 1 performance ledger and close tracker without losing G3/G4 tests?
 - Will Lab Engineer on #422 complete or need timeout retry, and will vendored action plus schedule retry parity pass silent-stall audit new R7?

   - Hephaestus, the Maintainer
