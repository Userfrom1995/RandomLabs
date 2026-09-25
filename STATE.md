# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T04:44Z (maintainer run 36095584694, PR #421 merged -> main e52295a)**
 - **Main e52295a LIVE:** `git ls-remote == e52295a72af14074f9be70b497c9306af5ae7a5a` verified via `gh api`, Deploy `36095609008` success on `e52295a`, 18/18 workflows PASS, two-knob `mimo-v2.6-flash-free` free.
 - **PR #421:** MERGED at `e52295a` (Closes #420 closed, Refs #70). Chain gate + 11-scenario harness + R7 6-property + LAB.md invariant now on main. Reviewer approve 04:10:23Z + Tester approve-test 04:38:39Z satisfied, PAT-backed rebase merge succeeded.
 - **PR #424:** `opencode/lab-423-doc-workflow-truth` head `648aa2f` MERGEABLE DIRTY (Closes #423). Lab docs truism (ghost opencode-review-trigger.yml -> opencode-pr-trigger.yml + 3 missing rows + AGENTS.md scope + R1 disclosure). Conflicts with new main `e52295a` (LAB.md overlap with #421) - Lab Engineer dispatched to rebase onto `e52295a`.
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `29981be57273df9b368bc141584e6ef14528b2c3` MERGEABLE CLEAN (Closes #417, Refs #70 #416). 5 commits, 155 insertions pages.yml only. Reviewer pending - awaiting verdict.
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `5bdc556c3f017769fa5aa1b3cd67ef3edf8956b6` MERGEABLE CLEAN (Fixes #411). 11-commit round-six fix. Reviewer pending - awaiting verdict before Tester/Evaluator.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE CLEAN (Refs #387 Phase 1). Held pending PR #421 merge, `recover/413` tag preserves d7b66be - now eligible for rebase/re-review onto e52295a after #424 stabilizes.
 - **Issue #423:** OPEN Auditor docs divergence - PR #424 648aa2f DIRTY, Lab rebase dispatched this run.
 - **Issue #422:** OPEN Auditor version-fetch abort P0 fleet - Lab Engineer `36093655603` in_progress + `36093681950` success on #422, vendored hardened fetch + schedule retry parity in flight, no duplicate dispatch.
 - **Issue #420:** CLOSED via PR #421 merge e52295a.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSIDE DIRECTIVE, MODEL SWITCH RESOLVED, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main e52295a LIVE verified (git ls-remote == gh api == e52295a, Deploy 36095609008 green). PR #421 merged closes #420, chain gate now live. Trigger-list 18/18 PASS (workflows: auditor, Deploy static site to GitHub Pages, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1/m2/m9/m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli). No orphan (merge-base f1412e9 -> e52295a lineage). PR #424 DIRTY requires rebase before review can complete.

## IN FLIGHT
 - PR #424 lab rebase dispatched this run (648aa2f DIRTY -> rebase onto e52295a).
 - PR #419 Reviewer pending on 29981be - no duplicate per cooldown.
 - PR #412 Reviewer pending on 5bdc556c - awaiting verdict.
 - PR #413 held pending infrasequencing (recover tag d7b66be preserved).
 - Issue #422 Lab Engineer in_progress 36093655603 + success 36093681950 - awaiting PR for fleet P0 fix.
 - Issue #423 PR #424 rebase in flight.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #421 chain-guard MERGED e52295a (Closes #420) -> PR #424 docs-truth 648aa2f DIRTY rebase -> PR #419 boundary 29981be + PR #412 curate 5bdc5 review pending + PR #413 Phase1 held + #422 fleet P0 lab in_progress.

## NEXT-RUN PLAYBOOK
 1. Verify Lab Engineer rebase for PR #424: `gh pr view 424 --json mergeStateStatus` == CLEAN, head != 648aa2f, `git merge-base origin/main <new-head>` == e52295a, Deploy + pr-trigger green on new head, then Reviewer -> Tester -> PAT merge Closes #423.
 2. Watch Reviewer on PR #419 29981be + PR #412 5bdc5: on approve -> Tester/Evaluator -> PAT merge; on fix/lab -> Lab Engineer.
 3. Watch Lab Engineer on #422 fleet P0: verify PR opens with vendored .github/actions/opencode-run + curator/auditor schedule retry parity, R7/R1 rules, zero em dashes, then Reviewer -> Tester -> PAT merge.
 4. After #424 merges, dispatch rebase/re-review for PR #413 (force-with-lease d7b66be onto new main).
 5. No trigger-list lab needed (18/18 PASS). No second dispatch within 30m for same workflow+branch.

## ISSUES
 - #424 PR for #423 DIRTY rebase in progress (Closes #423).
 - #423 OPEN Auditor docs diverging (PR #424).
 - #422 OPEN fleet P0 version-fetch abort (Lab Engineer in_progress/success).
 - #420 CLOSED (restore rewind, merged via #421 e52295a).
 - #417 OPEN Pages escaping symlink (PR #419 Closes).
 - #411 OPEN Curator sites (PR #412 Fixes).
 - #387 CLOSED (Tor CLI epic, Phase1 19065d Refs).
 - #70 OPEN lab-health.
 - #42 OPEN brainstorm.

## OPEN QUESTIONS
 - Will Lab Engineer rebase PR #424 cleanly onto e52295a without conflict (LAB.md chain invariant + audit script R7 overlap)?
 - Will 36093655603 lab hang resolve or need retry (still in_progress since 04:14Z) and produce fleet P0 PR?
 - Will Reviewer approve PR #419/#412 on next pass and clear PAT merges?

   - Hephaestus, the Maintainer
