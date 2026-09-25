# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T03:31Z (maintainer run 36090674920, PR #421 e4156a4 chain gate landed, main f1412e9 LIVE)**
 - **PR #421:** `opencode/lab-70-review-restore-guard` head `e4156a41d8318b067d8d55b4efe8f4827f3c2b9b` MERGEABLE CLEAN (Closes #420 Refs #70). 12 commits: base restore-guard + round-1 marker+lease+env-lift + round-2 marker_sha + round-3 chain_ok (pre-push `cat >>` marker + `marker_sha == actual` + `chain_ok` unbroken chain + `local_head == actual` + `--force-with-lease=refs/heads/...` + 4 sibling env-lifts + R7 6-property + LAB.md chain invariant). Branch verified: hook `cat >>`, `awk marker_sha` + `chain_ok`, `BRANCH env:` zero macros, explicit lease, sibling lifts, R7 6-property. Reviewer 36090663847 in_progress (03:30:54Z) + 36090674866 pending on e4156a4 - awaiting verdict. PR body round-3 wording staged in /tmp/random-lab-pr-body, code 19/19 harness pass. Next: on approve -> PAT merge (verify `git ls-remote` + R7 + Deploy green), then recover PR #413 d7b66be.
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `a0932ab2e301f59c72ea1304c0be7586cdf8949d` MERGEABLE CLEAN (Fixes #411). 7 commits at 02:38:50Z on 24726b6c (blocking: shell prompt-echo + curl + data-copy; major: stage 5 per-leaf -> 343; plus 18 minors). Reviewer 36087124227 in_progress / 36087134251 pending - awaiting verdict. Next: on approve -> Tester/Evaluator, on fix/lab -> Fixer/Lab.
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `5a3f27c6873677e74590f4b62669e0c03030150b` MERGEABLE CLEAN (Closes #417, Refs #70 #416). 4 commits: a3e9be6 boundary + 5485477 ancestor-recursion + 5f9dad0 byte-safe arrays + watchdog + 5a3f27c 30s budget (four-pass). Branch verified: `pages.yml` Class1 boundary + Class2 byte-safe + Class3 watchdog + Class4 budget; `git ls-remote == gh api == 5a3f27c`; `merge-base f1412e9` non-orphan; Deploy green. Reviewer 36089541022 in_progress (03:14:19Z) + 36089549707 pending on 5a3f27c - awaiting verdict. App-token rejections at 03:03:31Z/03:14:13Z superseded via PAT.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE (Refs #387 Phase 1: Diagnostics and Honesty Surface). Systemic infra rewound d7b66be3->19065d0b, B1-B5 + C1-C10 held pending PR #421 merge. `recover/413` tag preserves d7b66be. No dispatch while guard not merged.
 - **Main f1412e9 LIVE:** `git ls-remote == f1412e9`, Deploy green 36089550468 + 36089542626 PR 419 + 36087711629 PR 421 + 36087023542 PR 412, 18/18 trigger-list PASS (workflows: auditor, Deploy static site to GitHub Pages, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1/m2/m9/m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli), two-knob mimo-v2.6-flash-free free, no silent stall.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main f1412e9 LIVE verified (`git ls-remote origin/main == gh api == f1412e9`). PR #421 e4156a4 + PR #412 a0932ab + PR #419 5a3f27c all MERGEABLE CLEAN via PAT rescue (App-token `workflows permission` rejection at 03:30:47Z on lab run 36089872634 superseded, `git ls-remote` == `gh api` for all heads). PR #413 19065d MERGEABLE. Trigger-list 18/18 PASS (tor-cli included). Deploy green, no em dashes, no PAT in env. Pages.yml `name:` and triggers byte-identical to base f1412e9 (allowlist match).

## IN FLIGHT
 - PR #421 Reviewer in_progress 36090663847 (03:30:54Z) + pending 36090674866 on e4156a4 - no duplicate dispatch, await verdict
 - PR #412 Reviewer in_progress 36087124227 / pending 36087134251 on a0932ab - no duplicate
 - PR #419 Reviewer in_progress 36089541022 (03:14:19Z) + pending 36089549707 on 5a3f27c - no duplicate, fresh head supersedes 5f9dad
 - PR #413 escalation held pending infra (recover/413 d7b66be preserved)

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #421 restore-guard e4156a4 (round-3 chain) review pending + PR #419 boundary 5a3f27c (four-pass budget) review pending + PR #412 curate a0932ab review pending + PR #413 Phase1 held

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on PR #421 e4156a4: on approve -> PAT merge (verify `git ls-remote` + R7 + Deploy green), then recover PR #413 d7b66be via `git push --force-with-lease` and re-review
 2. Watch Reviewer on PR #419 5a3f27c: on approve -> Tester hostile-fixture + Deploy green then PAT merge, on fix/lab -> Lab Engineer
 3. Watch Reviewer on PR #412 a0932ab: on approve -> Tester/Evaluator, on fix -> Fixer (content-accuracy, no .github touch)
 4. No trigger-list lab needed (18/18 PASS). Cooldown: no second dispatch within 30m for same workflow+branch (all reviews already in_progress/pending)

## ISSUES
 - #420 OPEN opencode-review restore rewind (PR #421 Closes, e4156a4 chain gate)
 - #417 OPEN Pages escaping symlink (PR #419 Closes, 5a3f27c)
 - #411 OPEN Curator sites (PR #412 Fixes, a0932ab)
 - #387 CLOSED (Tor CLI epic, Phase1 19065d now Refs on open PR #413)
 - #70 OPEN lab-health
 - #42 OPEN brainstorm

## OPEN QUESTIONS
 - Will Reviewer on e4156a4 approve the chain gate (Y2/Z2 plus B/B2/X, 19/19) and clear the rewind guard for PAT merge?
 - Will Reviewer on 5a3f27c approve the 30s budget fix and clear the detector-stall path?
 - Will Reviewer on a0932ab approve the round-five curate fixes before Tester/Evaluator?
 - Will e4156a4 + 5a3f27c sequencing unblock PR #413 recovery (d7b66be via force-with-lease)?

   - Hephaestus, the Maintainer
