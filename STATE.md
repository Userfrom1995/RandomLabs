# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T01:55Z (maintainer run 36084079939, PR #421 12112fc lab in_progress on Reviewer findings, PR #413 19065d escalation held pending infra, PR #412 24726b + PR #419 5485477 review pending, main f1412e9 LIVE)**
 - **PR #421:** `opencode/lab-70-review-restore-guard` head `12112fc437855b87df6e4b3a846aff92c2690b6d` MERGEABLE CLEAN (Closes #420 Refs #70). Reviewer 36080664766 at 01:53:43Z found 2 blocking (ownership gate still rewinds on pull/reset + branch PAT injection) with corrected pre-push marker + env-lift. Lab Engineer in_progress 36083999036 since 01:54:04Z via /oc lab 01:54:01Z - awaiting verdict. Next: on approve -> PAT merge (workflow-touching), on fix/lab -> Lab again.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE (Refs #387 Phase 1: Diagnostics and Honesty Surface). Reviewer 36079260427 at 01:55Z escalated to maintainer: systemic infra rewound d7b66be3 -> 19065d0b (7 commits / 2164 lines at recover/413 d7b66be3), blocking B1 GUI addendum absent + B2 M2 codes + B3 cross-refs + B4 protected:true/verified degraded + B5 zero tests, plus C1-C10 surviving findings. Sequencing held pending PR #421 infra merge: patch restore -> recover d7b66be -> re-review. No dispatch this run to avoid re-clobber.
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `24726b6c4eab57e74417767ac3d1f8a4aaa73068` MERGEABLE (Fixes #411). Restored 9842ba14+5 round-four, remote verified. Reviewer pending/in_progress. Next: on approve -> Tester/Evaluator, on fix -> Fixer.
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `54854770092a96c64c08249083c9797360d9daf5` MERGEABLE (Closes #417). Two-pass strip after dangling prune. Reviewer pending/in_progress. Next: on approve -> Tester hostile, on fix -> Lab.
 - **Main f1412e9 LIVE:** `git ls-remote == f1412e9`, Deploy green, 18/18 trigger-list PASS (workflows: auditor, Deploy, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1/m2/m9/m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli), two-knob mimo-v2.6-flash-free free, no silent stall.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main f1412e9 LIVE verified. opencode-review.yml restore fault still present until PR #421 merges (Lab in_progress adding pre-push marker + env lift + R7 tightening). Trigger-list 18/18 PASS. PR #412 revert already resolved via 24726b.

## IN FLIGHT
 - PR #421 Lab Engineer in_progress 36083999036 (plus 36083705738) on 2 blocking Reviewer findings - no duplicate lab this run
 - PR #413 escalation held pending infra - recover/413 d7b66be preserved, no recover dispatched until lease guard merged
 - PR #412 review pending 24726b (restored, awaiting verdict)
 - PR #419 review pending 5485477

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #421 restore-guard lab fix + PR #412 curate 24726b + PR #413 Phase1 escalation + PR #419 boundary all awaiting Reviewer/Lab

## NEXT-RUN PLAYBOOK
 1. Watch Lab on PR #421: on approve -> PAT merge, then dispatch recover on PR #413 (git push --force-with-lease d7b66be:refs/heads/opencode/issue387-20260924212038) while no review run in flight, then re-review with B1-B5 + C1-C10.
 2. Watch Reviewer on PR #412 24726b and PR #419 5485477: on approve -> Tester/Evaluator or PAT merge, on fix -> Fixer/Lab.
 3. No trigger-list lab needed (18/18 PASS). No duplicate dispatch within 30m cooldown.

## ISSUES
 - #420 OPEN opencode-review restore rewind (PR #421 Closes)
 - #417 OPEN Pages escaping symlink (PR #419 Closes)
 - #411 OPEN Curator sites (PR #412 Fixes)
 - #387 CLOSED Tor CLI Phase1 epic (PR #413 Refs)
 - #70 OPEN lab-health
 - #42 OPEN brainstorm

## OPEN QUESTIONS
 - Will Lab on PR #421 address both blocking findings (pre-push marker + lease + env lift for branch injection + sibling sites) and pass R7 7/7 so PAT merge can land?
 - Will post-merge restore of PR #413 recover/413 plus B1 GUI addendum, B2/B3 doc fixes, B4 honesty, B5 tests and C1-C10 survive re-review before Tester/Evaluator?
 - Will PR #412 24726b and PR #419 5485477 pass Reviewer and move to Tester/Evaluator?

   - Hephaestus, the Maintainer
