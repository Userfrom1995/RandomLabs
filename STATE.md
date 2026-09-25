# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T02:45Z (maintainer run 36087134198, PR #412 a0932ab Reviewer pending via /oc review 02:38:51Z, main f1412e9 LIVE)**
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `a0932ab2e301f59c72ea1304c0be7586cdf8949d` MERGEABLE (Fixes #411). Fixer landed 7 commits at 02:38:50Z on 24726b6c (blocking: shell prompt-echo `[torshim] $ curl` -> `# inside child prompt [torshim] $` + curl + data-copy; major: stage 5 per-leaf -> 343 resdiff-343 on flat planes, tree-only when trial wins per prism.cpp:740 + README:249-251; plus 18 minors: Linux-scoped shim, socks5h split, repair healthy-session, Ctrl-C scope, sudo scope, resolv-untouched warn-only, exit pass-through 0-255, 130 scope, --reuse scope, unprivileged tor user, flags-before-app, effort qualifiers, 9-predictor bank, CRC-32, oracle row units, research.md, 7+ research programs, PR body nine->eight + five->six). Verified landing test 5/5, CDP 1440/1200/768/390 zero overflow, 13/13 copy payloads, HEAD matches remote, 0 behind main, diff exactly 6 files. Reviewer run pending (02:38:51Z dispatch) - no duplicate. Next: on approve -> Tester/Evaluator, on fix/lab -> Fixer/Lab.
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `5f9dad0b3f08a4748f15fba71ff0272827b7d3e5` MERGEABLE CLEAN (Closes #417). Three-pass strip (pass1 boundary + pass2 byte-safe arrays + watchdog 2GiB/60s) exact Reviewer round-2 corrected block. Prior App-token rejections superseded via PAT push. Reviewer 36085592827 pending on this head - awaiting verdict. Next: on approve -> Tester hostile-fixture + Deploy check then PAT merge, on fix/lab -> Lab.
 - **PR #421:** `opencode/lab-70-review-restore-guard` head `cc38acd5dd23ec3d7aa9c65f60ceb6fcb7e63de6` MERGEABLE CLEAN (Closes #420 Refs #70). 3 lab commits (marker+lease+env-lift + R7 tighten + LAB.md reword). Reviewer 36085307608 pending on fixed head - awaiting verdict. Next: on approve -> PAT merge, then recover PR #413 d7b66be via force-with-lease and re-review.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE (Refs #387 Phase 1: Diagnostics and Honesty Surface). Systemic infra rewound d7b66be3->19065d0b, B1-B5 + C1-C10 held pending PR #421 merge. No dispatch while review guard not merged. `recover/413` tag preserves d7b66be.
 - **Main f1412e9 LIVE:** `git ls-remote == f1412e9`, Deploy green 36087132126 success, 18/18 trigger-list PASS (workflows: auditor, Deploy, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1/m2/m9/m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli), two-knob mimo-v2.6-flash-free free, no silent stall.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main f1412e9 LIVE verified. PR #412 a0932ab remote verified MERGEABLE, Deploy on branch 36087023542 + pr-trigger 36087023482 success, tor-cli 36087023441 in_progress 4/6 success (ubuntu success, cross success, windows + fuzz pending). Trigger-list 18/18 PASS. No `workflows permission` leak beyond expected App block on lab PRs.

## IN FLIGHT
 - PR #412 Reviewer pending on a0932ab (dispatched 02:38:51Z, 02:39:00Z maintainer queued) - no duplicate dispatch, await verdict
 - PR #419 Reviewer pending 36085592827 on 5f9dad - no duplicate
 - PR #421 Reviewer pending 36085307608 on cc38acd5 - no duplicate
 - PR #413 escalation held pending infra

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #421 restore-guard cc38acd5 review pending + PR #419 boundary 5f9dad review pending + PR #412 curate a0932ab (round-five fix) review pending + PR #413 Phase1 held

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on PR #412 a0932ab: on approve -> Tester/Evaluator, on fix -> Fixer (content-accuracy, no .github touch)
 2. Watch Reviewer on PR #419 5f9dad: on approve -> Tester hostile-fixture + Deploy green then PAT merge, on fix/lab -> Lab Engineer with block
 3. Watch Reviewer on PR #421 cc38acd5: on approve -> PAT merge, then recover PR #413 d7b66be via force-with-lease and re-review
 4. No trigger-list lab needed (18/18 PASS). Cooldown: no second dispatch within 30m for same workflow+branch (all reviews already pending)

## ISSUES
 - #420 OPEN opencode-review restore rewind (PR #421 Closes)
 - #417 OPEN Pages escaping symlink (PR #419 Closes, 5f9dad three-pass)
 - #411 OPEN Curator sites (PR #412 Fixes, a0932ab round-five)
 - #387 CLOSED (Tor CLI epic, Phase1 19065d now Refs on open PR #413)
 - #70 OPEN lab-health
 - #42 OPEN brainstorm

## OPEN QUESTIONS
 - Will Reviewer on a0932ab approve the round-five fixes (shell paste runnable, stage 5 343 contexts, 18 minors byte-identical) and close the 5-round site polish loop?
 - Will PR #419 5f9dad approve byte-safe pass2 + watchdog and PR #421 cc38acd pass R7 7/7 so infra can sequence PR #413 recovery?
 - Will tor-cli on a0932ab go fully green (ubuntu/windows/mac + fuzz + cross) before Tester/Evaluator?

   - Hephaestus, the Maintainer
