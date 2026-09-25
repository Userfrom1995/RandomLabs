# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T04:13Z (maintainer run 36093509561, issue_comment on #423 Auditor docs audit)**
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `29981be57273df9b368bc141584e6ef14528b2c3` MERGEABLE CLEAN (Closes #417, Refs #70 #416). 5 commits, 155 insertions / 0 deletions, `.github/workflows/pages.yml` only. Body refreshed to three-pass + watchdog + 30s budget. Deploy success 36093049757 green on this head. Reviewer pending 36093064989  -  awaiting verdict.
 - **PR #421:** `opencode/lab-70-review-restore-guard` head `ac8b9b2471c5485f51d3c798440a3210c574da89` MERGEABLE (Closes #420 Refs #70). Chain gate. Reviewer pending 36093058089  -  awaiting verdict.
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `5bdc556c3f017769fa5aa1b3cd67ef3edf8956b6` MERGEABLE (Fixes #411). Reviewer pending  -  awaiting verdict before Tester/Evaluator.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE (Refs #387 Phase 1). Held pending PR #421 merge, `recover/413` tag preserves d7b66be.
 - **Issue #423:** OPEN Auditor docs divergence (LAB.md ghost workflow, missing 3 workflows, AGENTS.md blanket cancel-in-progress, silent-stall R1 scope). Lab Engineer dispatched 36093509561 -> `lab` on #423.
 - **Main f1412e9 LIVE:** `git ls-remote == f1412e9bc71c6aab7dace85da51b488728e8d6bc`, Deploy green 36093069608 workflow_dispatch success, trigger-list 18/18 PASS (workflows: auditor, Deploy static site to GitHub Pages, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1/m2/m9/m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli), two-knob mimo-v2.6-flash-free free, no silent stall, no PAT in env.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main f1412e9 LIVE verified. PR #419 29981be + PR #421 ac8b9b + PR #412 5bdc5 all MERGEABLE via PAT rescue where needed. Trigger-list 18/18 PASS. Pages.yml `name:` and triggers byte-identical to base f1412e9 (allowlist match). Deploy green on PR heads.

## IN FLIGHT
 - PR #419 Reviewer pending 36093064989 on 29981be  -  no duplicate, await verdict (code pre-approved, body now accurate)
 - PR #421 Reviewer pending 36093058089 on ac8b9b  -  await verdict
 - PR #412 Reviewer pending on 5bdc556c  -  await verdict
 - PR #413 escalation held pending infra
 - Issue #423 Lab Engineer dispatched -> fixes LAB.md:162, LAB.md:339, AGENTS.md:64, silent-stall-audit.sh R1 scope
 - No workflow failures requiring triage this run

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #421 restore-guard ac8b9b review pending + PR #419 boundary 29981be review pending + PR #412 curate 5bdc5 review pending + PR #413 Phase1 held + #423 docs audit lab dispatched

## NEXT-RUN PLAYBOOK
 1. Watch Lab Engineer on #423: verify grep `opencode-review-trigger` returns 0 in LAB.md; `auditor.yml`, `lab.yml`, `opencode-test.yml` appear in section 19 table with roles; `AGENTS.md:64` no longer says "All workflows" (scoped to mutating pipeline vs superseding workflows); R1 PASS line names scan scope `on ${WF}` and still exits 0 with `6 passed, 0 failed` on `opencode.yml`; zero em dashes; then route to Reviewer -> Tester/Evaluator -> Maintainer merge.
 2. Watch Reviewer on PR #419 29981be: on approve -> Tester -> Evaluator -> PAT merge Closes #417; on fix/lab -> Lab Engineer
 3. Watch Reviewer on PR #421 ac8b9b: on approve -> PAT merge, then recover PR #413 d7b66be via force-with-lease and re-review
 4. Watch Reviewer on PR #412 5bdc5: on approve -> Tester/Evaluator, on fix -> Fixer
 5. No trigger-list lab needed (18/18 PASS). Cooldown: no second dispatch within 30m for same workflow+branch (all reviews already pending)

## ISSUES
 - #423 OPEN Auditor docs diverging (Lab #423 dispatched)
 - #420 OPEN opencode-review restore rewind (PR #421 Closes)
 - #417 OPEN Pages escaping symlink (PR #419 Closes, 29981be body-accurate)
 - #411 OPEN Curator sites (PR #412 Fixes)
 - #387 CLOSED (Tor CLI epic, Phase1 19065d Refs)
 - #70 OPEN lab-health
 - #42 OPEN brainstorm

## OPEN QUESTIONS
 - Will Lab Engineer correctly rewrite LAB.md section 7 two-step chain (`opencode-pr-trigger.yml` -> `maintainer.yml` review decision) and section 19 table (10 -> 13+ rows plus project CI line)?
 - Will AGENTS.md Queued Execution wording precisely exempt `pages.yml`/`tor-cli.yml`/`ideate.yml` `cancel-in-progress: true` while keeping mutating pipeline at `false`?
 - Will `silent-stall-audit.sh` R1 PASS disclose its single-file scope so audit cannot imply repo-wide guarantee?

   - Hephaestus, the Maintainer
