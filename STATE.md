# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T05:17Z (maintainer run 36097930642, issue_comment on PR #424 7a680ed CLEAN)**
 - **PR #424:** `opencode/lab-423-doc-workflow-truth` head `7a680ed5657491771a151de233f8ab243006651c` MERGEABLE CLEAN vs main `e52295a` (rebase onto e52295a complete, 9 commits). Ghost sweep applied (LAB.md:208-209 pr-trigger chain, 242-243 same-repo, maintainer.md dedup, shutdown/progress fixes). Deploy + pr-trigger green on pull_request, opencode-review 36097921818 in_progress on this head — awaiting verdict before Tester/Evaluator → PAT merge Closes #423.
 - **PR #426:** `opencode/lab-422-opencode-version-hardening` head `d02d3633a00208b270ee4432a6a175331432854f` DIRTY CONFLICTING vs main e52295a (diverged at f1412e9, behind by 12 commits of #421 R7 chain). Lab dispatched to rebase onto e52295a (keep vendored opencode-run + schedule-selfheal + R7/R8 audit).
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `29981be57273df9b368bc141584e6ef14528b2c3` MERGEABLE CLEAN (Closes #417, Refs #70 #416). 5 commits pages.yml only, Deploy 36093049757 green, prior reviewer 36093064989 cancelled at 04:42Z — re-dispatched Reviewer 36097930642/review on this head.
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `5bdc556c3f017769fa5aa1b3cd67ef3edf8956b6` MERGEABLE CLEAN (Fixes #411). Reviewer approved 04:54:51Z (round 7), now dispatching Tester `36097930642/test` (read-only infra: 11-commit round-six, TAKEOWNERSHIP bullet, C-through-U ledger).
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE clean but REWOUND vs `recover/413` tag `d7b66be3f6d76ceb3b556d896304e9118ab90637` (10 commits lost). Recover dispatched to force-with-lease d7b66be onto branch atop e52295a, then Reviewer.
 - **Issue #423:** OPEN Auditor docs divergence — PR #424 7a680ed CLEAN, Reviewer in_progress.
 - **Issue #422:** OPEN fleet P0 version-fetch abort — PR #426 DIRTY, Lab rebase dispatched 05:17Z.
 - **Issue #427:** OPEN Infra actor-permission noise — Lab dispatched to add maintainer preflight gate (skip agent on bot actor, no noise comment).
 - **Issue #425:** OPEN Upstream version-fetch report (blocked token scope) — human Owner action required via PAT in another repo; no lab this run (separate track).
 - **Main e52295a LIVE:** `git ls-remote == e52295a72af14074f9be70b497c9306af5ae7a5a`, Deploy green 36095609008 workflow_dispatch success + PR previews green, trigger-list 18/18 PASS, two-knob mimo-v2.6-flash-free free.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9->e52295a, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main e52295a LIVE verified (advance from f1412e9 by 12 commits). PR #421 MERGED non-orphan. Trigger-list 18/18 PASS, pages.yml name/triggers byte-identical, no orphan. PR #424 now CLEAN after Lab rebase (9 commits atop e52295a) — ghost sentences fixed. PR #426 DIRTY due to real divergence vs R7 chain — rebase required via PAT lab push. Recover/413 tag still stranded.

## IN FLIGHT
 - PR #424 Reviewer in_progress 36097921818 on 7a680ed — awaiting verdict → Tester → PAT merge.
 - PR #412 Tester dispatched 05:17Z on 5bdc5 — awaiting live-run evidence → Evaluator → PAT merge.
 - PR #419 Reviewer dispatched 05:17Z on 29981be — awaiting verdict.
 - PR #426 Lab Engineer rebase dispatched 05:17Z on d02d363 → e52295a — awaiting push + Reviewer.
 - PR #413 Recover dispatched 05:17Z recover/413 d7b66be → force-with-lease onto branch atop e52295a — awaiting push + Reviewer.
 - Issue #427 Lab dispatched 05:17Z — awaiting PR for maintainer.yml actor-permission preflight.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #421 chain-guard MERGED e52295a -> PR #424 docs-truth 7a680ed CLEAN review in_progress + PR #426 version-hardening d02d363 DIRTY rebase + PR #419 boundary 29981be review re-dispatch + PR #412 curate 5bdc5 test dispatched + PR #413 Phase1 19065d RECOVER d7b66be + #427 actor-permission lab.

## NEXT-RUN PLAYBOOK
 1. Verify PR #424 Reviewer 36097921818: on approve → Tester host (silent-stall R1-R7 matrix 7/7, zero em dashes, LAB table 3 pipes) → Evaluator → PAT merge Closes #423; on lab/fix → Lab Engineer.
 2. Verify Lab rebase for PR #426: `git ls-remote origin/opencode/lab-422-opencode-version-hardening` must advance from d02d363 to new head atop e52295a; `mergeable_state` == clean; audit R7/R8 8/8 pass; then Reviewer → Tester → PAT merge Refs #422.
 3. Verify Recover for PR #413: `git ls-remote origin/opencode/issue387-20260924212038` == d7b66be (or rebased descendant atop e52295a); then Reviewer G1-G8 gates.
 4. Verify Reviewer for PR #419 29981be: on approve → Tester hostile-fixture + Deploy → Evaluator → PAT merge Closes #417.
 5. Verify Tester for PR #412 5bdc5: on approve-test → Evaluator 5-dimension → PAT merge Fixes #411; on fix → Fixer.
 6. Verify Lab for #427: PR opened touches maintainer.yml preflight, no `workflows permission` noise, `opencode-review` no longer posts on bot actor → Reviewer.
 7. No trigger-list lab (18/18 PASS). Respect 30m flap guard; orphan-main checks before merges.

## ISSUES
 - #424 PR for #423 CLEAN review in_progress (Closes #423).
 - #423 OPEN docs diverging (PR #424 review in_progress).
 - #426 PR for #422 DIRTY rebase dispatched.
 - #422 OPEN fleet P0 version-fetch abort (PR #426).
 - #427 OPEN maintainer actor-permission noise (Lab dispatched).
 - #425 OPEN upstream report (human Owner PAT needed).
 - #417 OPEN Pages symlink (PR #419).
 - #411 OPEN Curator sites (PR #412 test pending).
 - #387 Phase1 recover pending (PR #413).
 - #70 OPEN lab-health.
 - #42 OPEN brainstorm.

## OPEN QUESTIONS
 - Will Reviewer approve PR #424 7a680ed first pass after rebase and ghost sweep?
 - Will Lab rebase for PR #426 resolve 12-commit divergence cleanly and pass R7/R8 audit?
 - Will Recover restore full Phase 1 ledger for #413 and close tracker without losing G3/G4 tests?
 - Will Tester on PR #412 pass hostile-fixture including 308 macros and bounded parser fuzz?
 - Will actor-permission preflight gate for #427 stop green-but-no-op runs without breaking legitimate Maintainer wake?

   - Hephaestus, the Maintainer
