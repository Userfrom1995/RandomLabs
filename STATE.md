# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T03:58Z (maintainer run 36092532444, workflow_run curator failure 36092513510 on main f1412e9, triaged standby)**
 - **PR #412:** `opencode/issue411-curate-tor-cli-site` head `5bdc556c3f017769fa5aa1b3cd67ef3edf8956b6` MERGEABLE (Fixes #411). 11 commits round-six on a0932ab2 (BLOCKING: TAKEOWNERSHIP restore bullet, plus 2 MAJOR: C-through-U 28-phase ledger, stage1 effort-gate/candidates; 11 minors). Fixer pushed 5bdc556c at 03:49:10Z on latest main f1412e9, 0 behind. Reviewer pending via /oc review 03:49:12Z (run 36091907228 in_progress + 36091972661 pending) - awaiting verdict before Tester/Evaluator. Previous round-five a0932ab2 was fully re-verified fixed. Next: on approve -> Tester/Evaluator, on fix -> Fixer.
 - **PR #421:** `opencode/lab-70-review-restore-guard` head `e4156a41d8318b067d8d55b4efe8f4827f3c2b9b` MERGEABLE CLEAN (Closes #420 Refs #70). 12 commits chain gate. Reviewer pending 36090663847/36090674866 on e4156a4 - no duplicate, await verdict; on approve -> PAT merge then recover PR #413.
 - **PR #419:** `opencode/lab-417-pages-symlink-boundary` head `5a3f27c6873677e74590f4b62669e0c03030150b` MERGEABLE CLEAN (Closes #417, Refs #70 #416). 4 commits four-pass boundary. Reviewer pending 36089541022/36089549707 on 5a3f27c - no duplicate, await verdict.
 - **PR #413:** `opencode/issue387-20260924212038` head `19065d0b7d74bc110b3cc232d3c6fa8fc3655a6c` MERGEABLE (Refs #387 Phase 1: Diagnostics and Honesty Surface). Systemic infra rewound d7b66be3->19065d0b, B1-B5 + C1-C10 held pending PR #421 merge. `recover/413` tag preserves d7b66be. No dispatch while guard not merged.
 - **Main f1412e9 LIVE:** `git ls-remote == f1412e9`, Deploy green 36091894085 + 36089550468, 18/18 trigger-list PASS (workflows: auditor, Deploy static site to GitHub Pages, Lab Engineer, opencode-review, opencode-pr-trigger, opencode-test, ideate, opencode, opencode-recover, poolduel-m1/m2/m9/m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli), two-knob mimo-v2.6-flash-free free, no silent stall.
 - **Curator 36092513510 failure triaged:** schedule failure at 03:58:21Z on main f1412e9, step `Get opencode version` (internal `anomalyco/opencode/github@latest` version fetch) outcome failure 83ms, no decision file, fail-closed correctly summoned maintainer. Previous 9 curator runs skipped, isolated transient, no lab dispatch now; next schedule in 6h will retry. Cooldown respected, no duplicate.

## STANDING OWNER DIRECTIVES (active)
 - GUI HANG DIRECTIVE (2026-09-24), CLI IMPROVEMENT DIRECTIVE v2, WEBSITE DIRECTIVE, MODEL SWITCH RESOLVED f1412e9, DOCUMENTATION INVARIANT, TOR CLI DIRECTIVE, EXCELLENCE CHARTER.

## CRITICAL INFRASTRUCTURE STATE
 - Main f1412e9 LIVE verified (`git ls-remote origin/main == gh api == f1412e9`). PR #412 5bdc556c + PR #421 e4156a4 + PR #419 5a3f27c all MERGEABLE via PAT rescue. PR #413 19065d MERGEABLE. Trigger-list 18/18 PASS (tor-cli included). Deploy green, no em dashes, no PAT in env. Pages.yml `name:` and triggers byte-identical to base f1412e9 (allowlist match).
 - Curator workflow: `curator.yml` `name: curator` present, schedule `0 */6 * * *`, model `opencode/mimo-v2.6-flash-free`; failure was internal version-fetch curl, not code; maintainer triage found 18/18 allowlist PASS, no hardening needed this run.

## IN FLIGHT
 - PR #412 Reviewer in_progress 36091907228 (03:49:15Z) + pending 36091972661 (03:50:13Z) on 5bdc556c - no duplicate dispatch, await verdict (fix 5bdc556c supersedes a0932ab2)
 - PR #421 Reviewer in_progress 36090663847 success 03:30:54Z / 36090674866 cancelled duplicate on e4156a4 - await verdict display (no duplicate, but 63847 succeeded, check merge-readiness next run)
 - PR #419 Reviewer in_progress 36089541022 (03:14:19Z) + pending 36089549707 on 5a3f27c - no duplicate
 - PR #413 escalation held pending infra (recover/413 d7b66be preserved)
 - Curator schedule failure 36092513510 triaged standby, next schedule 09:58Z or manual `/oc curate` on demand

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Tor CLI M1..M5 MERGED -> Lab prompt-align MERGED d25e1e70 -> PR #416 MERGED f1412e9 -> PR #421 restore-guard e4156a4 (chain gate) review pending + PR #419 boundary 5a3f27c review pending + PR #412 curate 5bdc556c (round-six fix) review pending + PR #413 Phase1 held + Curator transient failure triaged

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on PR #412 5bdc556c: on approve -> Tester/Evaluator (Tester hostile-fixture + Deploy green then Evaluator 5-dim), on fix -> Fixer (content-accuracy, no .github touch)
 2. Watch Reviewer on PR #421 e4156a4: on approve -> PAT merge (verify `git ls-remote` + R7 + Deploy green), then recover PR #413 d7b66be via `git push --force-with-lease` and re-review
 3. Watch Reviewer on PR #419 5a3f27c: on approve -> Tester hostile-fixture + Deploy green then PAT merge, on fix/lab -> Lab Engineer
 4. No trigger-list lab needed (18/18 PASS). Cooldown: no second dispatch within 30m for same workflow+branch (all reviews already in_progress/pending; curator schedule cooldown until next tick)
 5. Curator: no re-dispatch on transient version fetch failure 36092513510; next schedule will retry. If curator fails 2x consecutively, dispatch Lab Engineer to harden `curator.yml` version fetch with authenticated retry loop like `maintainer.yml:Get opencode version`.

## ISSUES
 - #420 OPEN opencode-review restore rewind (PR #421 Closes, e4156a4 chain gate)
 - #417 OPEN Pages escaping symlink (PR #419 Closes, 5a3f27c)
 - #411 OPEN Curator sites (PR #412 Fixes, 5bdc556c round-six fix)
 - #387 CLOSED (Tor CLI epic, Phase1 19065d now Refs on open PR #413)
 - #70 OPEN lab-health
 - #42 OPEN brainstorm

## OPEN QUESTIONS
 - Will Reviewer on 5bdc556c approve the round-six fixes (TAKEOWNERSHIP/ledger/stage1 gates) and clear PR #412 for Tester/Evaluator?
 - Will Reviewer on e4156a4 approve the chain gate and clear the rewind guard for PAT merge?
 - Will Reviewer on 5a3f27c approve the 30s budget fix and clear the detector-stall path?
 - Will e4156a4 + 5a3f27c sequencing unblock PR #413 recovery (d7b66be via force-with-lease)?
 - Was curator version-fetch failure 36092513510 a one-off transient (next schedule green) or does it need hardened retry loop in `curator.yml`?

   - Hephaestus, the Maintainer
