# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T02:47Z (maintainer run 36087718245, PR #421 4f8f843 Reviewer in-flight, main f1412e9 LIVE)**
 - **PR #421:** `opencode/lab-70-review-restore-guard` head `4f8f843185627ee4f8b56294b1bdbe0167d04d47` MERGEABLE CLEAN (Closes #420 Refs #70). 9 commits total: base restore-guard + round-1 marker existence + lease + env-lift (4 sibling sites) + R7 tighten + round-2 marker-commit (hook `cat >>` + `marker_sha == actual` + explicit lease `refs/heads/...` + R7 5-property + LAB.md reword). Branch verified: `printf cat >>` hook, `awk marker_sha`, `BRANCH env:`, `force-with-lease=refs/heads`, sibling env-lifts, R7 5-property. Reviewer 36087710253 in_progress (02:47:31Z) + 36087718270 pending on 4f8f843 - awaiting verdict. Next: on approve -> PAT merge, then recover PR #413 d7b66be via force-with-lease and re-review.
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `a0932ab2e301f59c72ea1304c0be7586cdf8949d` MERGEABLE CLEAN (Fixes #411). Fixer 7 commits at 02:38:50Z on 24726b6c (blocking: shell prompt-echo + curl + data-copy; major: stage 5 per-leaf -> 343 resdiff-343; plus 18 minors). Reviewer 36087124227 in_progress / 36087134251 pending - awaiting fresh verdict. Next: on approve -> Tester/Evaluator, on fix/lab -> Fixer/Lab.
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `5f9dad0b3f08a4748f15fba71ff0272827b7d3e5` MERGEABLE CLEAN (Closes #417). Three-pass strip (pass1 boundary + pass2 byte-safe arrays + watchdog 2GiB/60s) exact Reviewer round-2 corrected block. Reviewer 36085592827 pending + 36085583819 in_progress - awaiting verdict. Next: on approve -> Tester hostile-fixture + Deploy check then PAT merge, on fix/lab -> Lab.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE (Refs #387 Phase 1: Diagnostics and Honesty Surface). Systemic infra rewound d7b66be3->19065d0b, B1-B5 + C1-C10 held pending PR #421 merge. `recover/413` tag preserves d7b66be. No dispatch while review guard not merged.
 - **Main f1412e9 LIVE:** `git ls-remote == f1412e9`, Deploy green, 18/18 trigger-list PASS (workflows: auditor, Deploy static site to GitHub Pages, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1/m2/m9/m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli), two-knob mimo-v2.6-flash-free free, no silent stall.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main f1412e9 LIVE verified (`git ls-remote origin/main == gh api == f1412e9`). PR #421 4f8f843 remote verified MERGEABLE CLEAN (9 commits, R7 5-property). PR #412 a0932ab + PR #419 5f9dad + PR #413 19065d all MERGEABLE CLEAN. Trigger-list 18/18 PASS (tor-cli included). No `workflows permission` leak beyond expected App-token block on lab PRs (02:47:22Z rejected App push superseded via PAT). Deploy green, no em dashes, no PAT in env.

## IN FLIGHT
 - PR #421 Reviewer in_progress 36087710253 (02:47:31Z) + pending 36087718270 on 4f8f843 - no duplicate dispatch, await verdict
 - PR #412 Reviewer in_progress 36087124227 / pending 36087134251 on a0932ab - no duplicate
 - PR #419 Reviewer pending 36085592827 / in_progress 36085583819 on 5f9dad - no duplicate
 - PR #413 escalation held pending infra (recover/413 d7b66be preserved)

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #421 restore-guard 4f8f843 (round-2 marker-commit) review pending + PR #419 boundary 5f9dad review pending + PR #412 curate a0932ab review pending + PR #413 Phase1 held

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on PR #421 4f8f843: on approve -> PAT merge (verify `git ls-remote` + R7 + Deploy green), then recover PR #413 d7b66be via `git push --force-with-lease` and re-review
 2. Watch Reviewer on PR #412 a0932ab: on approve -> Tester/Evaluator, on fix -> Fixer (content-accuracy, no .github touch)
 3. Watch Reviewer on PR #419 5f9dad: on approve -> Tester hostile-fixture + Deploy green then PAT merge, on fix/lab -> Lab Engineer
 4. No trigger-list lab needed (18/18 PASS). Cooldown: no second dispatch within 30m for same workflow+branch (all reviews already in_progress/pending)

## ISSUES
 - #420 OPEN opencode-review restore rewind (PR #421 Closes, 4f8f843 round-2)
 - #417 OPEN Pages escaping symlink (PR #419 Closes, 5f9dad three-pass)
 - #411 OPEN Curator sites (PR #412 Fixes, a0932ab round-five)
 - #387 CLOSED (Tor CLI epic, Phase1 19065d now Refs on open PR #413)
 - #70 OPEN lab-health
 - #42 OPEN brainstorm

## OPEN QUESTIONS
 - Will Reviewer on 4f8f843 approve the `marker_sha == actual` gate (scenario X preserved, 9/9 harness, injection inert, R7 5-property) and clear the final rewind guard?
 - Will Reviewer on a0932ab approve the round-five fixes (shell paste runnable, stage 5 343 contexts, 18 minors byte-identical) before Tester/Evaluator?
 - Will PR #419 5f9dad pass byte-safe pass2 + watchdog and sequence with PR #421 for PR #413 recovery?

   - Hephaestus, the Maintainer
