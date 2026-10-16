# STATE - Random factory checkpoint
 - **Updated: 2026-10-16 run 38906020765 - Phase 6 #588 in re-eval (head f7c77aa3, eval arm pending)**

## PRs & Issues
 - **PRs:** Open: #588 (Phase 6 desktop publication layer for #582, head f7c77aa3 post-Tester evalfix suite (6 new tests), MERGEABLE/CLEAN, base main, Refs #582; Reviewer approve 13:05:38Z on 5209f3cb plus Tester approve-test 13:10:02Z on f7c77aa3, delta test-only so review stands; re-eval arm pending). MERGED: #587 (Phase 5 terminal publication layer for #582, eval head 5cf92e09, merged 11:58:47Z as c0ec926a via --rebase, branch kept; Refs #582), #586 (Phase 4 assets/audio/identity for #582, eval head 3877403e, merged 11:06:09Z as 316f9628 via --rebase, branch kept; Refs #582), #585 (Phase 3 engine for #582, eval head 6baa327c, merged 10:38:23Z as f245dbcb via --rebase, branch kept; Refs #582), #584 (Phase 2 engine core for #582, eval head 34b0eb95, merged 09:47:35Z as 0f9f0948 via --rebase, branch kept; Refs #582), #583 (Phase 1 docs for #582, eval head e3826248, merged 09:10:29Z as 58f60bc6 via --rebase, branch kept; Refs #582), #581 (Curator landing fix for #580, head f2cbb539, merged 03:47:01Z as 88c3f132 via --rebase, branch kept; Fixes #580), plus earlier.
 - **Issues:** Open: #582 (Rust-migration parent tracker, Phases 1-5 merged on main, Phase 6 in re-eval via #588), #552 (Pac-Man terminal arcade; REOPENED, Wave 2 #579 merged with Refs only - closes ONLY on owner live-terminal confirmation; now also the gameplay reference for the Rust migration, removal-blocked until replacement verified), #70 lab-health, #42 brainstorm standing only.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries, exact set match re-verified this run. No drift.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v2 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - #582 parent stays OPEN through all phases; only the final release-audit PR may carry Closes #582. Phase 6 (Desktop Publication Layer: windowed plus fullscreen GUI on one renderer core, keyboard plus gamepad input with remap, menus plus settings plus scores plus audio controls, Windows plus macOS plus Linux packaging) in re-eval via #588 (Reviewer re-approve on 5209f3cb: all 8 Evaluator 8.4/10 gaps fixed; Tester approve-test on f7c77aa3: 55 unit + 3 headless + 8 hostile + 6 evalfix green, live Xvfb probes; delta 5209f3cb..f7c77aa3 test-only so review stands per precedent); merge only on approve-eval with no newer fix.
 - #552 awaits owner live-terminal confirmation AND serves as the migration reference; no removal of working functionality until replacement verified.
 - TEST-CRASH RULE (standing, mirrors eval-crash rule): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry test once. A second CONSECUTIVE silent death on the same PR routes `lab` (possible runner/model health fault), never a third test. UNACQUIRED deaths do not count; one retry per cooldown window max.
 - Evaluator non-blocking follow-ups queued (not dispatched): Phase 2 eval residuals plus #579 Evaluator residuals plus #578 Reviewer nits plus all prior #575 nits plus #575 Reviewer deep-audit notes plus stale pins, weak disjunction assertion in test_tester_remediation_gate.py:48, pre-existing `--levels 0` help fall-through, plus #573 Tester/ Evaluator advisories plus #574 Reviewer nits plus #574 Tester xfails plus #579 re-review advisory plus residual hardening notes, plus Phase 3 eval advisories, plus Phase 4 Reviewer/Evaluator advisories, plus Phase 5 Reviewer advisories plus Phase 5 eval advisories carried, plus re-eval advisories, plus Phase 6 Reviewer non-blocking nits (half-row guard fragility, frame.rs:109 sole unguarded prod index, app.rs NaN-dt poisoning) left for future hardening.
 - LAB OVERHAUL SUBSTANTIALLY COMPLETE: future infra needs a fresh scoped order, not a repeat Phase 6.
 - Pages: post-merge main Pages deploy verification after tip c0ec926a moves to the next run (main tip still c0ec926a at last deploy check).
 - Write-permission denial count now 18 (latest on #588 at 12:31:14Z linking success-concluded pull_request maintainer run 38901000615 - benign shape, watch only).
 - Prior-run APIError notes (watch, not findings): run 38807340202 and 38807603090 posted transient backend-overload shapes on 2026-10-15/16. A consecutive provider outage that blocks a gate arm routes lab (model fallback), not a single blip.
 - Infra routing guard stays active: any `.github/agents/` follow-up routes to Lab Engineer via `lab`, never `fix`/`continue`.
 - Main tip: c0ec926a (merge of #587).
 - Orphan-main protection holds: verify merge-base with main non-empty before every merge.
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent (applied to #584 34b0eb95, #585 bdad5b00, #586 3877403e, and #587 280b55e1 and 5cf92e09, and #588 fa55ed15 and f7c77aa3).
 - Eval-gate calibration note: surgical infra/docs/test-hardening fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables. #552 remediation and Phases 1-5 merged only after mandatory approve-eval. #583 Phase 1 was docs/hub-only (docs-class), same docs bar - merged 09:10:29Z. #584 Phase 2 (engine code) required and passed the full gate including Evaluator (9.8/10). #585 Phase 3 (engine code) required and passed the full gate including Evaluator (9.8/10). #586 Phase 4 (new crates) required and passed the full gate including Evaluator (9.9/10). #587 Phase 5 (new terminal crate) required and passed the full gate including Evaluator (9.8/10 on re-eval after a 9.7/10 fix round).
 - Duplicate-review note: maintainer + owner near-simultaneous review dispatches settle via per-PR concurrency; stand down when a review arm is pending/in_progress. Same applies to eval arms, fix arms, build arms, and test arms.
 - IP hold (standing): God of War Kratos vs Zeus commission declined twice on binding IP grounds; original mythic-duel alternative stands awaiting owner confirmation.
 - Standing-board close guard: #70 must never carry `Closes #70` in a PR body; merge as Refs only. (#42 same: Refs only.)

## NEXT-RUN PLAYBOOK
1. On Evaluator approve-eval of head f7c77aa3 with no newer fix, merge via --rebase (keep branch), verify main Pages deploy, keep #582 OPEN, then immediately chain the next phase via build on #582.
2. On eval fix findings, route Fixer then fresh review on the new head.
3. Verify post-merge main Pages deploy succeeded after tip c0ec926a.
4. #552 closes ONLY on owner live-terminal confirmation - never auto-close on `Refs #552`; working code stays until Rust replacement verified.
5. Future lab work needs a fresh scoped owner order; do NOT re-dispatch without one.
6. Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits remain queued for a future hardening vehicle.
7. Standing rule: standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Will #588 pass the binding re-eval after the 8.4/10 fix round, or need another round?
 - Will the Owner confirm #552 complete on real terminals now that Wave 2 is merged?
 - After Phase 6 acceptance, is there any residual overhaul scope the owner still wants (or is the mandate closed)?
 - Are the PR-preview pages failures a systematic defect on PR refs or platform blips?
 - What caused the ~50-min agent-step death in eval run 37362541465?
 - What killed the Tester agent step in opencode-test run 38821322108 (exit 143 SIGTERM after ~5.5 min mid-stream)?

 - Hephaestus, the Maintainer
