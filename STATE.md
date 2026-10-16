# STATE - Random factory checkpoint
 - **Updated: 2026-10-16 run 38916275727 - Phase 7 #589 repair head 2446cf8e re-tested green, re-eval dispatched**

## PRs & Issues
 - **PRs:** Open: #589 (Phase 7 WASM publication layer for #582, head 2446cf8e post-Fixer 5 commits, MERGEABLE/CLEAN, base main; body reads Refs #582). MERGED: #588 (Phase 6 desktop publication layer for #582, eval head f7c77aa3, merged 13:17:10Z as 4db47100 via --rebase, branch kept; Refs #582), #587 (Phase 5 terminal publication layer for #582, eval head 5cf92e09, merged 11:58:47Z as c0ec926a via --rebase, branch kept; Refs #582), #586 (Phase 4 assets/audio/identity for #582, eval head 3877403e, merged 11:06:09Z as 316f9628 via --rebase, branch kept; Refs #582), #585 (Phase 3 engine for #582, eval head 6baa327c, merged 10:38:23Z as f245dbcb via --rebase, branch kept; Refs #582), #584 (Phase 2 engine core for #582, eval head 34b0eb95, merged 09:47:35Z as 0f9f0948 via --rebase, branch kept; Refs #582), #583 (Phase 1 docs for #582, eval head e3826248, merged 09:10:29Z as 58f60bc6 via --rebase, branch kept; Refs #582), #581 (Curator landing fix for #580, head f2cbb539, merged 03:47:01Z as 88c3f132 via --rebase, branch kept; Fixes #580), plus earlier.
 - **Issues:** Open: #582 (Rust-migration parent tracker, Phases 1-6 merged on main, Phase 7 in re-eval on #589 after eval-fix repair plus fresh review plus re-test), #552 (Pac-Man terminal arcade; REOPENED, Wave 2 #579 merged with Refs only - closes ONLY on owner live-terminal confirmation; now also the gameplay reference for the Rust migration, removal-blocked until replacement verified), #70 lab-health, #42 brainstorm standing only.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries, exact set match re-verified this run. No drift.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v2 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - #589 Phase 7 (WebAssembly Publication Layer and Web Hub: zero-dep web crate with C-ABI bridge, play.html plus JS runtime, committed release WASM plus e2e harnesses, web docs plus hub Play entry) in binding re-eval on head 2446cf8e after the Fixer repaired the Evaluator 8.4/10 blocking defect (scores getters renamed to mc_score_get_*, latent importScores persistence break fixed via new mc_scores_push export, wasm rebuilt to 190772 bytes, regression plus browser-E2E scores coverage extended, eval non-blocking follow-ups fixed) plus fresh Reviewer approve 14:28:23Z on 2446cf8e plus Tester approve-test 14:30:08Z on 2446cf8e with no newer fix. Merge waits on approve-eval.
 - #582 parent stays OPEN through all phases; only the final release-audit PR may carry Closes #582.
 - #552 awaits owner live-terminal confirmation AND serves as the migration reference; no removal of working functionality until replacement verified.
 - TEST-CRASH RULE (standing, mirrors eval-crash rule): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry test once. A second CONSECUTIVE silent death on the same PR routes `lab` (possible runner/model health fault), never a third test. UNACQUIRED deaths do not count; one retry per cooldown window max.
 - Evaluator non-blocking follow-ups queued (not dispatched): Phase 2 eval residuals plus #579 Evaluator residuals plus #578 Reviewer nits plus all prior #575 nits plus #575 Reviewer deep-audit notes plus stale pins, weak disjunction assertion in test_tester_remediation_gate.py:48, pre-existing `--levels 0` help fall-through, plus #573 Tester/ Evaluator advisories plus #574 Reviewer nits plus #574 Tester xfails plus #579 re-review advisory plus residual hardening notes, plus Phase 3 eval advisories, plus Phase 4 Reviewer/Evaluator advisories, plus Phase 5 Reviewer advisories plus Phase 5 eval advisories carried, plus re-eval advisories, plus Phase 6 Reviewer non-blocking nits (half-row guard fragility, frame.rs:109 sole unguarded prod index, app.rs NaN-dt poisoning) plus Phase 6 eval residuals (hub evalfix-count naming, desktop.md section depth, install-linux.sh bare---prefix set-u), all left for future hardening. (Phase 7 eval residuals were fixed in the repair: e2e README, docs/web.md 43-count; artifact-level mc_sfx_from(4)==3200 pin covered by the sfx-wire-arm invariant.)
 - LAB OVERHAUL SUBSTANTIALLY COMPLETE: future infra needs a fresh scoped order, not a repeat Phase 6.
 - Pages: post-merge main Pages deploy verification after tip 4db47100 moves to the next merge run (main tip 4db47100 at merge).
 - Write-permission denial count now 19 (latest on #589 at 13:58:23Z linking success-concluded pull_request maintainer run 38911840409 - benign shape, watch only).
 - Prior-run APIError notes (watch, not findings): run 38807340202 and 38807603090 posted transient backend-overload shapes on 2026-10-15/16. A consecutive provider outage that blocks a gate arm routes lab (model fallback), not a single blip.
 - Infra routing guard stays active: any `.github/agents/` follow-up routes to Lab Engineer via `lab`, never `fix`/`continue`.
 - Main tip: 4db47100 (merge of #588).
 - Orphan-main protection holds: verify merge-base with main non-empty before every merge.
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent (applied to #584 34b0eb95, #585 bdad5b00, #586 3877403e, and #587 280b55e1 and 5cf92e09, and #588 fa55ed15 and f7c77aa3, and #589 46c7ca59).
 - Eval-gate calibration note: surgical infra/docs/test-hardening fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables. #552 remediation and Phases 1-6 merged only after mandatory approve-eval. #583 Phase 1 was docs/hub-only (docs-class), same docs bar - merged 09:10:29Z. #584 Phase 2 (engine code) required and passed the full gate including Evaluator (9.8/10). #585 Phase 3 (engine code) required and passed the full gate including Evaluator (9.8/10). #586 Phase 4 (new crates) required and passed the full gate including Evaluator (9.9/10). #587 Phase 5 (new terminal crate) required and passed the full gate including Evaluator (9.8/10 on re-eval after a 9.7/10 fix round). #588 Phase 6 (new desktop crate) required and passed the full gate including Evaluator (9.8/10 on re-eval after an 8.4/10 fix round).
 - Duplicate-review note: maintainer + owner near-simultaneous review dispatches settle via per-PR concurrency; stand down when a review arm is pending/in_progress. Same applies to eval arms, fix arms, build arms, and test arms.
 - IP hold (standing): God of War Kratos vs Zeus commission declined twice on binding IP grounds; original mythic-duel alternative stands awaiting owner confirmation.
 - Standing-board close guard: #70 must never carry `Closes #70` in a PR body; merge as Refs only. (#42 same: Refs only.)

## NEXT-RUN PLAYBOOK
1. On Evaluator approve-eval of head 2446cf8e with no newer fix, merge via --rebase (keep branch, verify main Pages deploy, keep #582 OPEN, then immediately chain the final release-audit phase via build on #582). On eval fix findings, route Fixer then fresh review on the new head.
2. Verify post-merge main Pages deploy succeeded after tip 4db47100 at the next merge.
3. #552 closes ONLY on owner live-terminal confirmation - never auto-close on `Refs #552`; working code stays until Rust replacement verified.
4. Future lab work needs a fresh scoped owner order; do NOT re-dispatch without one.
5. Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits remain queued for a future hardening vehicle.
6. Standing rule: standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Will the Phase 7 scores-getter plus persistence repair pass the binding re-eval?
 - Will the Owner confirm #552 complete on real terminals now that Wave 2 is merged?
 - After Phase 7 plus Final acceptance, is there any residual overhaul scope the owner still wants (or is the mandate closed)?
 - Are the PR-preview pages failures a systematic defect on PR refs or platform blips?
 - What caused the ~50-min agent-step death in eval run 37362541465?
 - What killed the Tester agent step in opencode-test run 38821322108 (exit 143 SIGTERM after ~5.5 min mid-stream)?

 - Hephaestus, the Maintainer