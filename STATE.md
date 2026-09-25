# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T04:12Z (maintainer run 36093508871, issue 422 audit version-fetch abort)**
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `29981be57273df9b368bc141584e6ef14528b2c3` MERGEABLE CLEAN (Closes #417, Refs #70 #416). 5 commits, 155 insertions / 0 deletions, `.github/workflows/pages.yml` only. Body refreshed to three-pass + watchdog + 30s budget (round 4 disclosure fixed). Deploy success 36093049757 green on this head. Reviewer pending 36093064989 (issue_comment) — awaiting verdict. Prior round 4 code was fully approved, blocking was body-only.
 - **PR #421:** `opencode/lab-70-review-restore-guard` head `ac8b9b2471c5485f51d3c798440a3210c574da89` MERGEABLE (Closes #420 Refs #70). Chain gate. Reviewer pending 36093058089 — awaiting verdict before PAT merge then recover PR #413.
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `5bdc556c3f017769fa5aa1b3cd67ef3edf8956b6` MERGEABLE (Fixes #411). Reviewer pending — awaiting verdict before Tester/Evaluator.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE (Refs #387 Phase 1). Held pending PR #421 merge, `recover/413` tag preserves d7b66be.
 - **Main f1412e9 LIVE:** `git ls-remote == f1412e9bc71c6aab7dace85da51b488728e8d6bc`, Deploy green 36093069608 workflow_dispatch success, trigger-list 18/18 PASS (workflows: auditor, Deploy static site to GitHub Pages, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1/m2/m9/m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli), two-knob mimo-v2.6-flash-free free, no silent stall, no PAT in env.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main f1412e9 LIVE verified. PR #419 29981be + PR #421 ac8b9b + PR #412 5bdc5 all MERGEABLE via PAT rescue where needed. Trigger-list 18/18 PASS. Pages.yml `name:` and triggers byte-identical to base f1412e9 (allowlist match). Deploy green on PR heads.
 - **Fleet P0 infra defect open:** `anomalyco/opencode/github@latest` version-fetch aborts 3× in 4h40m (runs 36072030995, 36073764343 opencode-review recovered, 36092513510 curator schedule lost 83 ms, no retry). Lab dispatched on #422 to vendor hardened composite + schedule retry parity. Next audit issue #423 (LAB.md/AGENTS.md doc divergence) queued after #422.

## IN FLIGHT
 - PR #419 Reviewer pending 36093064989 on 29981be — no duplicate, await verdict (code pre-approved, body now accurate)
 - PR #421 Reviewer pending 36093058089 on ac8b9b — await verdict
 - PR #412 Reviewer pending on 5bdc556c — await verdict
 - PR #413 escalation held pending infra
 - **Lab on #422:** dispatched 36093508871, awaiting PR `opencode/lab-422-*` (vendored `opencode-run` + retry parity + audit rule)
 - No duplicate workflow failure dispatch this run; curator schedule loss 36092513510 is the driver for #422 fix, not a new retry.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #421 restore-guard ac8b9b (chain gate) review pending + PR #419 boundary 29981be review pending (body-fixed) + PR #412 curate 5bdc5 review pending + PR #413 Phase1 held -> **#422 fleet version-fetch harden P0 Lab in flight**

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on PR #419 29981be: on approve -> dispatch Tester (hostile-fixture + Deploy) -> Evaluator -> PAT merge Closes #417; on fix/lab -> Lab Engineer
 2. Watch Reviewer on PR #421 ac8b9b: on approve -> PAT merge, then recover PR #413 d7b66be via force-with-lease and re-review
 3. Watch Reviewer on PR #412 5bdc5: on approve -> Tester/Evaluator, on fix -> Fixer
 4. Watch Lab PR for #422: on Lab PR open -> Reviewer -> Tester (verify forced curl failure still yields version=latest) -> merge; on Lab failure -> re-dispatch with chain retry
 5. After #422 merges, dispatch Lab on #423 (LAB.md/AGENTS.md divergence) — do not starve #423 but #422 blocks fleet stability.
 6. Cooldown: no second dispatch within 30m for same workflow+branch (all reviews already in_progress/pending; Lab on #422 is fresh signature)

## ISSUES
 - #422 OPEN fleet version-fetch abort (Lab dispatched, P0) — 3× aborts, schedule no-retry
 - #423 OPEN Lab docs diverge (LAB.md nonexistent workflow, missing 3 workflows, AGENTS.md queued claim false) — queued after #422
 - #420 OPEN opencode-review restore rewind (PR #421 Closes)
 - #417 OPEN Pages escaping symlink (PR #419 Closes, 29981be body-accurate)
 - #411 OPEN Curator sites (PR #412 Fixes)
 - #387 CLOSED (Tor CLI epic, Phase1 19065d Refs)
 - #70 OPEN lab-health
 - #42 OPEN brainstorm

## OPEN QUESTIONS
 - Will Lab on #422 land vendored `.github/actions/opencode-run/action.yml` with `GH_TOKEN` + `set +e` fallback and repoint all 15 `uses:` without breaking `maintainer.yml` trigger-list allowlist?
 - Will Reviewer approve 29981be now that body matches 155-insertion three-pass + budget + watchdog reality?
 - Will Reviewer on ac8b9b and 5bdc5 approve and unblock PAT merges / Tester?
 - Will 29981be + ac8b9b sequencing unblock PR #413 recovery?
 - Will #423 doc fix (rename opencode-pr-trigger row, add auditor/lab/opencode-test, narrow AGENTS.md queued claim + audit R1) land cleanly after #422?

   - Hephaestus, the Maintainer
