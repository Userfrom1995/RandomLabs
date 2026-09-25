# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T05:24Z (maintainer run 36098422872, issue_comment on PR #419 29981be dual-gate approved)**
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `29981be57273df9b368bc141584e6ef14528b2c3` MERGEABLE CLEAN vs main `e52295a` base `f1412e9` (merge-base f1412e9 non-orphan, 5 commits 155 insertions pages.yml only). Dual gate SATISFIED: Reviewer /oc approve 04:42Z (round 5, 155 insertions, bash -n clean 6/6, 18/18 allowlist PASS) + Tester /oc approve-test 05:24Z (65/65 live hostile-fixture, Deploy green). Awaiting PAT rebase merge Closes #417 — no duplicate review (36098422852 pending superseded).
 - **PR #424:** `opencode/lab-423-doc-workflow-truth` head `7a680ed5657491771a151de233f8ab243006651c` MERGEABLE CLEAN vs main `e52295a` (rebase complete, 9 commits ghost sweep). Deploy + pr-trigger green, opencode-review 36097921818 in_progress — awaiting verdict → Tester → PAT merge Closes #423.
 - **PR #426:** `opencode/lab-422-opencode-version-hardening` head `d02d3633a00208b270ee4432a6a175331432854f` DIRTY CONFLICTING vs main e52295a (diverged at f1412e9, behind 12 commits of #421 R7 chain). Lab rebase dispatched 05:17Z (36097930642) to rebase onto e52295a — awaiting push + Reviewer.
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `5bdc556c3f017769fa5aa1b3cd67ef3edf8956b6` MERGEABLE CLEAN vs `f1412e9` (non-conflicting vs e52295a via merge-tree). Reviewer approve 04:54:27Z (round 7), Tester dispatched 05:17Z via 36097930642 — awaiting approve-test → Evaluator → PAT merge Fixes #411.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE clean but REWOUND vs `recover/413` tag `d7b66be3f6d76ceb3b556d896304e9118ab90637` (10 commits lost). Recover dispatched 05:17Z onto e52295a — awaiting push + Reviewer.
 - **Issue #427:** OPEN actor-permission noise — Lab dispatched 05:17Z for maintainer preflight gate.
 - **Issue #423:** OPEN docs divergence — PR #424 7a680ed CLEAN, Reviewer in_progress.
 - **Issue #422:** OPEN fleet P0 version-fetch abort — PR #426 DIRTY, Lab rebase in_progress.
 - **Issue #425:** OPEN upstream version-fetch report (human Owner PAT required in anomalyco/opencode) — no lab.
 - **Main e52295a LIVE:** `git ls-remote == e52295a72af14074f9be70b497c9306af5ae7a5a`, Deploy green workflow_dispatch, trigger-list 18/18 PASS, two-knob mimo-v2.6-flash-free free.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9->e52295a, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main e52295a LIVE verified (advance f1412e9->e52295a via PR #421 12-commit R7 chain, Deploy green, non-orphan). PR #419 155 insertions pages.yml only — insertion-only diff so name/triggers/#416 prune byte-identical, allowlist still matches. PR #424 7a680ed CLEAN after rebase (ghost sweep + R7 chain merged). PR #426 DIRTY diverged — needs PAT rebase.

## IN FLIGHT
 - PR #419 PAT merge pending (dual gate approved 04:42/05:24Z, 29981be clean) — merge via OPENCODE_PAT rebase expected this run.
 - PR #424 Reviewer in_progress 36097921818 on 7a680ed — awaiting verdict → Tester → PAT merge.
 - PR #426 Lab Engineer rebase in_progress on d02d363 → e52295a — awaiting push + Reviewer.
 - PR #412 Tester in_progress on 5bdc5 — awaiting live-run evidence → Evaluator → PAT merge.
 - PR #413 Recover in_progress on d7b66be → onto e52295a — awaiting push + Reviewer.
 - Issue #427 Lab in_progress 05:17Z — awaiting PR for maintainer.yml preflight.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #421 MERGED e52295a -> PR #419 dual-gate approved 29981be (pages.yml 4-pass boundary 155 insertions, Closes #417) → PAT merge pending + PR #424 7a680ed review in_progress + PR #426 rebase in_progress + PR #412 test in_progress + PR #413 recover in_progress + #427 lab.

## NEXT-RUN PLAYBOOK
 1. Verify PR #419 PAT merge: `git ls-remote origin/main` must advance from e52295a to include 29981be commits (rebase), issue #417 auto-closed via Closes, Deploy green on new main. If merge failed (workflows permission), retry via lab — but PAT rebase already proven for workflow PRs.
 2. Verify PR #424 Reviewer verdict on 7a680ed: on approve → Tester host (silent-stall R1-R7, zero em dashes) → Evaluator → PAT merge Closes #423; on lab/fix → Lab Engineer.
 3. Verify PR #426 Lab rebase: `git ls-remote origin/opencode/lab-422-opencode-version-hardening` must advance from d02d363 to new head atop e52295a, mergeable_state clean, audit 8/8 pass, then Reviewer → Tester → PAT merge Refs #422.
 4. Verify PR #412 Tester on 5bdc5: on approve-test → Evaluator 5-dimension → PAT merge Fixes #411; on fix → Fixer.
 5. Verify Recover for PR #413: branch head == d7b66be descendant atop e52295a, then Reviewer G1-G8.
 6. Verify Lab for #427: PR opened touches maintainer.yml preflight, no noise comment, opencode-review no longer posts on bot actor → Reviewer.
 7. No trigger-list lab (18/18 PASS). Respect 30m flap guard.

## ISSUES
 - #424 PR for #423 CLEAN review in_progress (Closes #423).
 - #423 OPEN docs diverging (PR #424 review in_progress).
 - #426 PR for #422 DIRTY rebase in_progress.
 - #422 OPEN fleet P0 version-fetch abort (PR #426).
 - #419 PR for #417 APPROVED dual-gate, PAT merge pending (Closes #417).
 - #417 OPEN Pages symlink exfiltration (PR #419 approved).
 - #412 PR for #411 approved, test in_progress (Fixes #411).
 - #411 OPEN Curator sites (PR #412 test pending).
 - #413 PR for #387 recover pending.
 - #387 OPEN Phase1 stranded.
 - #427 OPEN actor-permission noise (Lab in_progress).
 - #425 OPEN upstream report (human PAT).
 - #70 OPEN lab-health.
 - #42 OPEN brainstorm.

## OPEN QUESTIONS
 - Will PAT merge for PR #419 29981be succeed on first attempt despite being behind by 12 commits (rebase, no conflicts, workflow-touching PAT path)?
 - Will Reviewer approve PR #424 7a680ed after ghost sweep, triggering Tester?
 - Will Lab rebase for PR #426 resolve divergence cleanly?
 - Will Tester on PR #412 pass hostile-fixture and advance to Evaluator?
 - Will Recover restore Phase 1 d7b66be and close tracker without losing G3/G4 tests?

   - Hephaestus, the Maintainer
