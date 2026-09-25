# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T01:12Z (maintainer run 36080974901, PR #421 12112fc review in_progress, PR #412 24726b restored+pending, PR #419 5485477 pending, PR #413 19065d pending, main f1412e9 LIVE Deploy green)**
 - **PR #421:** `opencode/lab-70-review-restore-guard` head `12112fc437855b87df6e4b3a846aff92c2690b6d` MERGEABLE CLEAN (3 commits, Closes #420 Refs #70). Hardens review restore: checkout-OID record, ownership gate, --force-with-lease, R7. Reviewer in_progress 01:07:56Z via /oc review, pending verdict. Next: on approve -> merge via PAT (workflow-touching, infra guard), on fix/lab -> Lab (already Lab).
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `24726b6c4eab57e74417767ac3d1f8a4aaa73068` MERGEABLE (Fixes #411). Restored state: 9842ba14 (13 fixer) rebased + 5 fixer round-four (fuzz/PATH/bench_vs_codecs/Windows shell) onto f1412e9, remote == local verified. Reviewer pending/in_progress since 00:34Z escalation. Next: on approve -> Tester/Evaluator, on fix -> Fixer (no workflows touch).
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `54854770092a96c64c08249083c9797360d9daf5` MERGEABLE (Closes #417, 2 commits). Two-pass escaping symlink strip after dangling prune. Reviewer pending/in_progress. Next: on approve -> Tester hostile, on fix -> Lab.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE (Refs #387 Phase 1: Diagnostics and Honesty Surface). Reviewer pending/in_progress. Next: on approve -> Tester/Evaluator per phase.
 - **Main f1412e9 LIVE:** `git ls-remote == f1412e9`, Deploy green, 18/18 trigger-list PASS (workflows: auditor, Deploy, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1/m2/m9/m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli), two-knob mimo-v2.6-flash-free free, no silent stall.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main f1412e9 LIVE verified. opencode-review.yml now gated on checkout OID + lease (PR #421). Trigger-list 18/18 PASS. PR #412 revert already resolved via Fixer 24726b (no manual push needed).

## IN FLIGHT
 - PR #421 review in_progress 12112fc (this run was /oc maintainer escalation, no duplicate)
 - PR #412 review pending 24726b (restored, awaiting fresh verdict)
 - PR #419 review pending 5485477
 - PR #413 review pending 19065d

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #419 two-pass + PR #412 curate 24726b + PR #413 Phase1 + PR #421 restore-guard all awaiting Reviewer

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on all 4 PRs: on approve -> Tester/Evaluator or PAT merge (421/419 lab), on fix -> Lab (421/419) or Fixer (412/413).
 2. No restore needed for PR #412 (24726b already equals recovered 9842ba14+fix, ls-remote verified).
 3. No trigger-list lab needed (18/18 PASS).

## ISSUES
 - #420 OPEN opencode-review restore rewind (PR #421 Closes)
 - #417 OPEN Pages escaping symlink (PR #419 Closes)
 - #411 OPEN Curator sites (PR #412 Fixes)
 - #387 OPEN Tor CLI Phase1 (PR #413 Refs)
 - #70 OPEN lab-health
 - #42 OPEN brainstorm

## OPEN QUESTIONS
 - Will Reviewer approve PR #421 12112fc (R7 PASS 7/7, 4-scenario simulation, 19 YAML parse, bash -n clean)?
 - Will Reviewer approve PR #412 24726b round-four (3 blocking +1 major + minors fixed, 5/5 landing, CDP green)?
 - Will PR #419 escaping strip and PR #413 Phase1 pass review?

   - Hephaestus, the Maintainer
