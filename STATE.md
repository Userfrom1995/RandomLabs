# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T05:27Z (maintainer run 36098658974, closed PR #419 MERGED to main 4c5bf2)**
 - **PR #419:** CLOSED MERGED at `29981be57273df9b368bc141584e6ef14528b2c3` -> main `4c5bf201bf6fb4fd0309821e1e6f0f869b0d9895` (4 commits 155 insertions pages.yml only, Closes #417). Issue #417 CLOSED 05:27:43Z. Deploy on new main `4c5bf2` in_progress 36098658978 (pending 36098661197), 18/18 allowlist PASS. No further action.
 - **PR #424:** `opencode/lab-423-doc-workflow-truth` head `7a680ed5657491771a151de233f8ab243006651c` MERGEABLE CLEAN vs main `e52295a` (clean vs new `4c5bf2` - touches LAB.md/AGENTS.md/audit, no overlap with pages.yml). Deploy + pr-trigger green 36097922560/36097922624, opencode-review 36097921818 in_progress + 36097930528 pending on this head — awaiting verdict → Tester → PAT merge Closes #423.
 - **PR #426:** `opencode/lab-422-opencode-version-hardening` head `d02d3633a00208b270ee4432a6a175331432854f` DIRTY CONFLICTING vs main `4c5bf2` (diverged at f1412e9, behind 16 commits of #421 R7 chain + #419 4-pass). Lab rebase still pending (last dispatch 05:17Z 36097930642 in_progress cooldown) — awaiting push + Reviewer.
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `5bdc556c3f017769fa5aa1b3cd67ef3edf8956b6` MERGEABLE CLEAN vs `4c5bf2` (non-conflicting). Reviewer approve 04:54:27Z (round 7), Tester in_progress 36096374499 / pending 36098291813 — awaiting approve-test → Evaluator → PAT merge Fixes #411.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE clean but REWOUND vs `recover/413` tag `d7b66be3f6d76ceb3b556d896304e9118ab90637` (10 commits lost). Recover dispatched 05:17Z onto e52295a — awaiting push + Reviewer (re-verify vs 4c5bf2 after recovery).
 - **Issue #427:** OPEN actor-permission noise — Lab dispatched 05:17Z for maintainer preflight gate, still pending.
 - **Issue #423:** OPEN docs divergence — PR #424 7a680ed CLEAN, Reviewer in_progress.
 - **Issue #422:** OPEN fleet P0 version-fetch abort — PR #426 DIRTY, Lab rebase in_progress.
 - **Issue #425:** OPEN upstream version-fetch report (human Owner PAT required in anomalyco/opencode) — no lab.
 - **Main 4c5bf2 LIVE:** `git ls-remote == 4c5bf201bf6fb4fd0309821e1e6f0f869b0d9895`, Deploy in_progress 36098658978 on push 4c5bf2, trigger-list 18/18 PASS, two-knob mimo-v2.6-flash-free free.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9->e52295a->4c5bf2, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main 4c5bf2 LIVE verified (advance e52295a->4c5bf2 via PR #419 4 commits 155 insertions pages.yml only, 0 deletions, name/triggers byte-identical, allowlist still matches). PR #419 merged via PAT rebase (non-orphan merge-base f1412e9, issue #417 auto-closed). PR #424 7a680ed CLEAN after rebase (ghost sweep + R7 chain merged) — still clean vs 4c5bf2. PR #426 DIRTY diverged — needs PAT rebase.

## IN FLIGHT
 - Main Deploy on 4c5bf2 in_progress 36098658978 + pending 36098661197 — monitor to green.
 - PR #424 Reviewer in_progress 36097921818 / pending 36097930528 on 7a680ed — awaiting verdict → Tester → PAT merge.
 - PR #426 Lab Engineer rebase in_progress on d02d363 → 4c5bf2 — awaiting push + Reviewer.
 - PR #412 Tester in_progress 36096374499 on 5bdc5 — awaiting live-run evidence → Evaluator → PAT merge.
 - PR #413 Recover in_progress on d7b66be → onto 4c5bf2 — awaiting push + Reviewer.
 - Issue #427 Lab in_progress 05:17Z — awaiting PR for maintainer.yml preflight.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #421 MERGED e52295a -> PR #419 MERGED 4c5bf2 (pages.yml 4-pass boundary 155 insertions, Closes #417) → PR #424 7a680ed review in_progress + PR #426 rebase in_progress + PR #412 test in_progress + PR #413 recover in_progress + #427 lab.

## NEXT-RUN PLAYBOOK
 1. Verify main Deploy 36098658978 green on 4c5bf2 (push event). If failed/timed_out, triage via lab (pages.yml is infra, only PAT path).
 2. Verify PR #424 Reviewer verdict on 7a680ed vs 4c5bf2: on approve → Tester hostile-fixture → Evaluator → PAT merge Closes #423; on lab/fix → Lab Engineer. Still MERGEABLE clean (no pages.yml overlap).
 3. Verify PR #426 Lab rebase: `git ls-remote origin/opencode/lab-422-opencode-version-hardening` must advance from d02d363 to new head atop 4c5bf2, mergeable_state clean, audit 8/8 pass, then Reviewer → Tester → PAT merge Refs #422.
 4. Verify PR #412 Tester on 5bdc5: on approve-test → Evaluator 5-dimension → PAT merge Fixes #411; on fix → Fixer.
 5. Verify Recover for PR #413: branch head == d7b66be descendant atop 4c5bf2, then Reviewer G1-G8.
 6. Verify Lab for #427: PR opened touches maintainer.yml preflight, no noise comment, opencode-review no longer posts on bot actor → Reviewer.
 7. No trigger-list lab (18/18 PASS). Respect 30m flap guard on 426/424/412.

## ISSUES
 - #424 PR for #423 CLEAN review in_progress (Closes #423).
 - #423 OPEN docs diverging (PR #424 review in_progress).
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
 - Will Deploy on 4c5bf2 (36098658978) succeed (no pages.yml deploy regression with 4-pass strip)?
 - Will Reviewer approve PR #424 7a680ed after ghost sweep, triggering Tester vs new main?
 - Will Lab rebase for PR #426 resolve divergence cleanly onto 4c5bf2?
 - Will Tester on PR #412 pass and advance to Evaluator?
 - Will Recover restore Phase 1 d7b66be and close tracker without losing G3/G4 tests?

   - Hephaestus, the Maintainer
