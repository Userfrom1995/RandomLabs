# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T03:14Z (maintainer run 36089549701, PR #419 5a3f27c four-pass budget landed, main f1412e9 LIVE)**
 - **PR #421:** `opencode/lab-70-review-restore-guard` head `4f8f843185627ee4f8b56294b1bdbe0167d04d47` MERGEABLE CLEAN (Closes #420 Refs #70). 9 commits: base restore-guard + round-1 marker existence + lease + env-lift + R7 tighten + round-2 marker-commit (hook `cat >>` + `marker_sha == actual` + lease `refs/heads/...` + R7 5-property + LAB.md reword). Branch verified: `printf cat >>` hook, `awk marker_sha`, `BRANCH env:`, `force-with-lease=refs/heads`, sibling env-lifts, R7 5-property. Reviewer 36087710253 in_progress (02:47:31Z) + 36087718270 pending on 4f8f843 - awaiting verdict. Next: on approve -> PAT merge, then recover PR #413 d7b66be via force-with-lease and re-review.
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `a0932ab2e301f59c72ea1304c0be7586cdf8949d` MERGEABLE CLEAN (Fixes #411). 7 commits at 02:38:50Z on 24726b6c (blocking: shell prompt-echo + curl + data-copy; major: stage 5 per-leaf -> 343; plus 18 minors). Reviewer 36087124227 in_progress / 36087134251 pending - awaiting verdict. Next: on approve -> Tester/Evaluator, on fix/lab -> Fixer/Lab.
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `5a3f27c6873677e74590f4b62669e0c03030150b` MERGEABLE CLEAN (Closes #417, Refs #70 #416). 4 commits: a3e9be6 boundary + 5485477 ancestor-recursion + 5f9dad0 byte-safe arrays + watchdog + 5a3f27c 30s budget (four-pass). Branch verified: `cat .github/workflows/pages.yml` contains Class1 boundary + Class2 byte-safe arrays + Class3 watchdog + Class4 p2_deadline/p2_abort budget; `git ls-remote == gh api pulls/419 head.sha == 5a3f27c`; `git merge-base origin/main 5a3f27c == f1412e9` non-orphan; Deploy + pr-trigger success on 5a3f27c at 03:14:20Z. Reviewer 36089541022 in_progress (03:14:19Z) + 36089549707 pending on 5a3f27c - awaiting verdict on budget fix. Previous Reviewer round-3 blocking (cubic pass-2 self-DoS) addressed by budget; prior App-token `workflows permission` rejections at 03:03:31Z/03:14:13Z superseded via PAT push to 5a3f27c. Next: on approve -> Tester hostile-fixture + Deploy check then PAT merge, on fix/lab -> Lab Engineer.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE (Refs #387 Phase 1: Diagnostics and Honesty Surface). Systemic infra rewound d7b66be3->19065d0b, B1-B5 + C1-C10 held pending PR #421 merge. `recover/413` tag preserves d7b66be. No dispatch while review guard not merged.
 - **Main f1412e9 LIVE:** `git ls-remote == f1412e9`, Deploy green 36089550468 workflow_dispatch + 36089542626 PR 419 + 36087711629 PR 421 + 36087023542 PR 412, 18/18 trigger-list PASS (workflows: auditor, Deploy static site to GitHub Pages, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1/m2/m9/m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli), two-knob mimo-v2.6-flash-free free, no silent stall.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main f1412e9 LIVE verified (`git ls-remote origin/main == gh api == f1412e9`). PR #421 4f8f843 + PR #412 a0932ab + PR #419 5a3f27c all MERGEABLE CLEAN via PAT rescue (App-token `workflows permission` rejections at 03:03:31Z on lab run 36088794308 and 03:14:13Z superseded, `git ls-remote` == `gh api` for all heads). PR #413 19065d MERGEABLE CLEAN. Trigger-list 18/18 PASS (tor-cli included). Deploy green, no em dashes, no PAT in env. Pages.yml workflow `name:` and triggers byte-identical to base f1412e9 (allowlist match).

## IN FLIGHT
 - PR #421 Reviewer in_progress 36087710253 (02:47:31Z) + pending 36087718270 on 4f8f843 - no duplicate dispatch, await verdict
 - PR #412 Reviewer in_progress 36087124227 / pending 36087134251 on a0932ab - no duplicate
 - PR #419 Reviewer in_progress 36089541022 (03:14:19Z) + pending 36089549707 on 5a3f27c (budget fix) - no duplicate, fresh head supersedes 5f9dad
 - PR #413 escalation held pending infra (recover/413 d7b66be preserved)

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #421 restore-guard 4f8f843 (round-2 marker-commit) review pending + PR #419 boundary 5a3f27c (four-pass with 30s budget) review pending + PR #412 curate a0932ab review pending + PR #413 Phase1 held

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on PR #419 5a3f27c: on approve -> Tester hostile-fixture + Deploy green then PAT merge (verify `git ls-remote` + pages.yml class1-4 + Deploy green), on fix/lab -> Lab Engineer with corrected block
 2. Watch Reviewer on PR #421 4f8f843: on approve -> PAT merge (verify `git ls-remote` + R7 + Deploy green), then recover PR #413 d7b66be via `git push --force-with-lease` and re-review
 3. Watch Reviewer on PR #412 a0932ab: on approve -> Tester/Evaluator, on fix -> Fixer (content-accuracy, no .github touch)
 4. No trigger-list lab needed (18/18 PASS). Cooldown: no second dispatch within 30m for same workflow+branch (all reviews already in_progress/pending)

## ISSUES
 - #420 OPEN opencode-review restore rewind (PR #421 Closes, 4f8f843 round-2)
 - #417 OPEN Pages escaping symlink (PR #419 Closes, 5a3f27c four-pass budget)
 - #411 OPEN Curator sites (PR #412 Fixes, a0932ab round-five)
 - #387 CLOSED (Tor CLI epic, Phase1 19065d now Refs on open PR #413)
 - #70 OPEN lab-health
 - #42 OPEN brainstorm

## OPEN QUESTIONS
 - Will Reviewer on 5a3f27c approve the 30s budget fix (67/67 checks + flood 98s vs 6.4h, no collateral) and clear the final detector-stall path?
 - Will Reviewer on 4f8f843 approve the `marker_sha == actual` gate and clear the rewind guard?
 - Will Reviewer on a0932ab approve the round-five curate fixes before Tester/Evaluator?
 - Will 5a3f27c + 4f8f843 sequencing unblock PR #413 recovery (d7b66be via force-with-lease)?

   - Hephaestus, the Maintainer
