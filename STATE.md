# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T05:44Z (maintainer run 36099792243, PR #424 7a680ed dual-gate approved — PAT merge pending)**
 - **PR #424:** `opencode/lab-423-doc-workflow-truth` head `7a680ed5657491771a151de233f8ab243006651c` MERGEABLE CLEAN vs main `4c5bf2` (rebase ghost sweep + R7 chain, 9 lab commits). Reviewer approve 05:40:38Z round2 (7 passed 0 failed) + Tester approve-test 05:43:57Z infra 8/8 scope infra — DUAL GATE SATISFIED, no newer fix, non-orphan e52295a still clean vs 4c5bf2. Deploy + pr-trigger green 36097922624/36097922560, Lab rebase from 648aa2f dirty resolved. Awaiting PAT merge Closes #423 via hardcoded 650-718 step.
 - **PR #426:** `opencode/lab-422-opencode-version-hardening` head `d02d3633a00208b270ee4432a6a175331432854f` DIRTY CONFLICTING vs main `4c5bf2` (diverged at f1412e9, behind 16 commits of #421 R7 + #419 4-pass). Lab rebase pending (dispatched 05:17Z 36097930642) — awaiting force-with-lease onto 4c5bf2 → Reviewer.
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `5bdc556c3f017769fa5aa1b3cd67ef3edf8956b6` MERGEABLE CLEAN vs `4c5bf2`. Reviewer approve 04:54:27Z (round 7), Tester in_progress 36096374499 / pending 36098291813 — awaiting approve-test -> Evaluator -> PAT merge Fixes #411.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE clean but REWOUND vs `recover/413` tag `d7b66be3f6d76ceb3b556d896304e9118ab90637` (10 commits lost). Recover dispatched 05:17Z onto e52295a (re-verify vs 4c5bf2 after recovery) — awaiting push + Reviewer.
 - **Issue #427:** OPEN actor-permission noise — Lab dispatched 05:17Z for maintainer preflight gate, still pending PR.
 - **Issue #423:** OPEN docs divergence — PR #424 7a680ed dual-gate approved, awaiting PAT merge Closes #423.
 - **Issue #422:** OPEN fleet P0 version-fetch abort — PR #426 DIRTY, Lab rebase in_progress.
 - **Issue #425:** OPEN upstream version-fetch report (human Owner PAT required in anomalyco/opencode) — no lab.
 - **Main 4c5bf2 LIVE:** `git ls-remote == 4c5bf201bf6fb4fd0309821e1e6f0f869b0d9895`, Deploy in_progress? pending verification post-419 merge, trigger-list 18/18 PASS, two-knob mimo-v2.6-flash-free free.
 - **PR #419:** CLOSED MERGED at `29981be57273df9b368bc141584e6ef14528b2c3` -> main `4c5bf201bf6fb4fd0309821e1e6f0f869b0d9895` (4 commits 155 insertions pages.yml only, Closes #417). Issue #417 CLOSED.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9->e52295a->4c5bf2, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main 4c5bf2 LIVE verified (advance e52295a->4c5bf2 via PR #419 4 commits 155 insertions pages.yml only, 0 deletions, name/triggers byte-identical, allowlist still matches). PR #419 merged via PAT rebase (non-orphan merge-base f1412e9, issue #417 auto-closed). PR #424 7a680ed CLEAN after rebase (ghost sweep + R7 chain merged) — dual-gate approved 05:40+05:43, still clean vs 4c5bf2. PR #426 DIRTY diverged — needs PAT rebase.

## IN FLIGHT
 - Main Deploy on 4c5bf2 — monitor to green after 424 merge.
 - PR #424 dual-gate approved 7a680ed — awaiting PAT merge Closes #423 (hardcoded step).
 - PR #426 Lab Engineer rebase in_progress on d02d363 → 4c5bf2 — awaiting push + Reviewer.
 - PR #412 Tester in_progress 36096374499 on 5bdc5 — awaiting live-run evidence -> Evaluator -> PAT merge.
 - PR #413 Recover in_progress on d7b66be → onto 4c5bf2 — awaiting push + Reviewer.
 - Issue #427 Lab in_progress 05:17Z — awaiting PR for maintainer.yml preflight.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #421 MERGED e52295a -> PR #419 MERGED 4c5bf2 (pages.yml 4-pass) → PR #424 7a680ed dual-gate approved awaiting PAT merge Closes #423 + PR #426 rebase + PR #412 test + PR #413 recover.

## NEXT-RUN PLAYBOOK
 1. Verify main advances 4c5bf2 -> new SHA after PAT merge of PR #424 (9 commits rebase). Verify Deploy green on new main, issue #423 closed via Closes #423.
 2. Verify PR #426 Lab rebase: `git ls-remote origin/opencode/lab-422-opencode-version-hardening` must advance from d02d363 to head atop new main, mergeable_state clean, audit 8/8 pass, then Reviewer -> Tester -> PAT merge Refs #422.
 3. Verify PR #412 Tester on 5bdc5: on approve-test -> Evaluator 5-dimension -> PAT merge Fixes #411; on fix -> Fixer.
 4. Verify Recover for PR #413: branch head == d7b66be descendant atop new main, then Reviewer G1-G8.
 5. Verify Lab for #427: PR opened touches maintainer.yml preflight, no noise comment, opencode-review no longer posts on bot actor -> Reviewer.
 6. No trigger-list lab (18/18 PASS). Respect 30m flap guard on 426/412/413/427.

## ISSUES
 - #424 PR for #423 CLEAN dual-gate approved awaiting PAT merge (Closes #423).
 - #423 OPEN docs diverging (PR #424 ready to close).
 - #426 PR for #422 DIRTY rebase in_progress.
 - #422 OPEN fleet P0 version-fetch abort (PR #426).
 - #419 MERGED 4c5bf2 Closes #417 done.
 - #417 CLOSED by #419.
 - #412 PR for #411 approved, test in_progress (Fixes #411).
 - #411 OPEN Curator sites (PR #412 test pending).
 - #413 PR for #387 recover pending.
 - #387 OPEN Phase1 stranded.
 - #427 OPEN actor-permission noise (Lab in_progress).
 - #425 OPEN upstream report (human PAT).
 - #70 OPEN lab-health.
 - #42 OPEN brainstorm.

## OPEN QUESTIONS
 - Will PAT merge for PR #424 7a680ed succeed (rebase 9 commits, no pages.yml overlap)?
 - Will Deploy on new main stay green after docs truth merge?
 - Will Lab rebase for PR #426 resolve divergence cleanly onto new main?
 - Will Tester on PR #412 pass and advance to Evaluator?
 - Will Recover restore Phase 1 d7b66be and close tracker?

   - Hephaestus, the Maintainer
