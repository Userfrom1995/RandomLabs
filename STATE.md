# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T02:16Z (maintainer run 36085592792, PR #419 5f9dad review pending 36085592827, PR #421 cc38acd review pending, PR #412 24726b + PR #413 19065d review pending, main f1412e9 LIVE)**
 - **PR #421:** `opencode/lab-70-review-restore-guard` head `cc38acd5dd23ec3d7aa9c65f60ceb6fcb7e63de6` MERGEABLE CLEAN (Closes #420 Refs #70). Reviewer 36080664766 blocking addressed, Lab 3 commits landed (cc38acd5), Reviewer 36085307608 pending on fixed head - awaiting verdict. Next: on approve -> PAT merge (workflow-touching), on fix/lab -> Lab again.
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `5f9dad0b3f08a4748f15fba71ff0272827b7d3e5` MERGEABLE CLEAN (Closes #417). Three-pass strip (pass1 boundary + pass2 byte-safe ancestor walk + pass3 watchdog dry-run) after dangling prune - exact corrected block from Reviewer round 2. Prior App-token pushes rejected 36079046599/36083705738, PAT push succeeded to 5f9dad0. Reviewer 36085592827 pending on this head (issue_comment at 02:16:38Z, status pending). Next: on approve -> Tester/hostile-fixture + Deploy check, on fix/lab -> Lab with reviewer's block.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE (Refs #387 Phase 1: Diagnostics and Honesty Surface). Reviewer 36079260427 escalated to maintainer: systemic infra rewound d7b66be3 -> 19065d0b, blocking B1-B5 + C1-C10. Sequencing held pending PR #421 infra merge. No dispatch while review guard not merged.
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `24726b6c4eab57e74417767ac3d1f8a4aaa73068` MERGEABLE (Fixes #411). Restored 9842ba14+5 round-four, remote verified. Reviewer pending/in_progress. Next: on approve -> Tester/Evaluator, on fix -> Fixer.
 - **Main f1412e9 LIVE:** `git ls-remote == f1412e9`, Deploy green, 18/18 trigger-list PASS (workflows: auditor, Deploy, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1/m2/m9/m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli), two-knob mimo-v2.6-flash-free free, no silent stall.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main f1412e9 LIVE verified. PR #419 5f9dad now carries the Reviewer round-2 corrected block line-for-line (arrays + sentinel captures + watchdog ulimit/timeout). Previous App-token rejections triaged as expected infra guard, PAT path succeeded. Trigger-list 18/18 PASS. No `workflows permission` leak beyond expected App block.

## IN FLIGHT
 - PR #419 Reviewer pending 36085592827 on 5f9dad (three-pass fixed head) - no duplicate dispatch
 - PR #421 Reviewer pending 36085307608 on cc38acd5 - no duplicate
 - PR #412 review pending 24726b
 - PR #413 escalation held pending infra

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #421 restore-guard cc38acd5 review pending + PR #412 curate 24726b + PR #413 Phase1 escalation + PR #419 boundary 5f9dad awaiting Reviewer verdict

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on PR #419 5f9dad: on approve -> Tester hostile-fixture + Deploy green verification, then PAT merge to main; on fix/lab -> Lab Engineer with block (never fix/continue on workflows PR).
 2. Watch Reviewer on PR #421 cc38acd5: on approve -> PAT merge, then recover PR #413 d7b66be via force-with-lease and re-review.
 3. Watch Reviewer on PR #412 24726b and PR #413 19065d: on approve -> Tester/Evaluator, on fix -> Fixer/Lab.
 4. No trigger-list lab needed (18/18 PASS). Cooldown: no second dispatch within 30m for same workflow+branch (419 already has pending review, 421 already pending).

## ISSUES
 - #420 OPEN opencode-review restore rewind (PR #421 Closes)
 - #417 OPEN Pages escaping symlink (PR #419 Closes, 5f9dad three-pass)
 - #411 OPEN Curator sites (PR #412 Fixes)
 - #387 OPEN Tor CLI Phase1 epic (PR #413 Refs)
 - #70 OPEN lab-health
 - #42 OPEN brainstorm

## OPEN QUESTIONS
 - Will Reviewer on 5f9dad approve the byte-safe pass2 + watchdog (R round-2 block fully closed) and trigger Tester hostile verification without over-strips?
 - Will PR #421 cc38acd5 pass Reviewer and allow recover of PR #413 d7b66be to be re-reviewed with B1-B5 + C1-C10?
 - Will PR #412 24726b and PR #413 19065d pass Reviewer and move to Tester/Evaluator?

   - Hephaestus, the Maintainer
