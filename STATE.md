# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T04:06Z (maintainer run 36093058040, issue_comment on PR #421 ac8b9b24, main f1412e9 LIVE, standby await reviews)**
 - **PR #421:** `opencode/lab-70-review-restore-guard` head `ac8b9b2471c5485f51d3c798440a3210c574da89` MERGEABLE CLEAN (Closes #420 Refs #70). 13 commits chain gate + body Round3 (ac8b9b24 empty commit). Reviewer pending via /oc review 04:03:39Z (run 36093058089 pending) - awaiting verdict before PAT merge.
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `5bdc556c3f017769fa5aa1b3cd67ef3edf8956b6` MERGEABLE (Fixes #411). 11 commits round-six. Reviewer pending/in_progress - awaiting verdict before Tester/Evaluator.
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `29981be57273df9b368bc141584e6ef14528b2c3` MERGEABLE CLEAN (Closes #417). Reviewer pending 36093064989 on 29981be - no duplicate, await verdict.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE (Refs #387 Phase 1: Diagnostics and Honesty Surface). Held pending PR #421 merge. `recover/413` tag preserves d7b66be. No dispatch while guard not merged.
 - **Main f1412e9 LIVE:** `git ls-remote == f1412e9`, Deploy success 36093069608, 18/18 trigger-list PASS (workflows: auditor, Deploy static site to GitHub Pages, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1/m2/m9/m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli), two-knob mimo-v2.6-flash-free free, no silent stall.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main f1412e9 LIVE verified (`git ls-remote origin/main == gh api == f1412e9`). PR #421 ac8b9b24 + PR #412 5bdc556c + PR #419 29981be + PR #413 19065d all MERGEABLE via PAT. Trigger-list 18/18 PASS (tor-cli included). Deploy green, no em dashes, no PAT in env.

## IN FLIGHT
 - PR #421 Reviewer pending 36093058089 (04:06:10Z) on ac8b9b24 - no duplicate dispatch, await verdict (chain gate + body Round3 already verified prior head e4156a4)
 - PR #412 Reviewer pending/in_progress on 5bdc556c - await verdict
 - PR #419 Reviewer pending 36093064989 (04:06:16Z) on 29981be - no duplicate
 - PR #413 held pending infra (recover/413 d7b66be preserved)

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED -> PR #416 MERGED f1412e9 -> PR #421 restore-guard ac8b9b24 (chain gate + body fix) review pending + PR #419 boundary review pending + PR #412 curate 5bdc556c review pending + PR #413 Phase1 held

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on PR #421 ac8b9b24: on approve -> PAT merge (verify `git ls-remote` + R7 + Deploy green), then recover PR #413 d7b66be via `git push --force-with-lease` and re-review PR #412/#419 sequencing
 2. Watch Reviewer on PR #412 5bdc556c: on approve -> Tester/Evaluator, on fix -> Fixer
 3. Watch Reviewer on PR #419 29981be: on approve -> Tester then PAT merge, on fix/lab -> Lab Engineer
 4. No trigger-list lab needed (18/18 PASS). Cooldown: no second dispatch within 30m for same workflow+branch (all reviews already pending)
 5. Curator: no re-dispatch on transient version fetch failure 36092513510; next schedule will retry. If 2x consecutive failures, dispatch Lab to harden retry loop.

## ISSUES
 - #420 OPEN opencode-review restore rewind (PR #421 Closes, ac8b9b24 chain gate)
 - #417 OPEN Pages escaping symlink (PR #419 Closes, 29981be)
 - #411 OPEN Curator sites (PR #412 Fixes, 5bdc556c round-six fix)
 - #387 CLOSED (Tor CLI epic, Phase1 19065d now Refs on open PR #413)
 - #70 OPEN lab-health
 - #42 OPEN brainstorm

## OPEN QUESTIONS
 - Will Reviewer on ac8b9b24 approve the chain gate + body Round3 and clear rewind guard for PAT merge?
 - Will Reviewer on 5bdc556c approve round-six fixes and clear PR #412 for Tester/Evaluator?
 - Will Reviewer on 29981be approve boundary fix?
 - Will ac8b9b24 merge unblock PR #413 recovery (d7b66be)?

   - Hephaestus, the Maintainer
