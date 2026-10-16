# STATE - Random factory checkpoint
 - **Updated: 2026-10-16 run 38894993150 - Phase 5 #587 in eval (Tester approve-test landed, eval dispatched)**

## PRs & Issues
 - **PRs:** Open: #587 (Phase 5 terminal publication layer for #582, head 280b55e1 post-Tester hostile suite, MERGEABLE/UNSTABLE-held-arms, base main; body reads Refs #582). MERGED: #586 (Phase 4 assets/audio/identity for #582, eval head 3877403e, merged 11:06:09Z as 316f9628 via --rebase, branch kept; Refs #582), #585 (Phase 3 engine for #582, eval head 6baa327c, merged 10:38:23Z as f245dbcb via --rebase, branch kept; Refs #582), #584 (Phase 2 engine core for #582, eval head 34b0eb95, merged 09:47:35Z as 0f9f0948 via --rebase, branch kept; Refs #582), #583 (Phase 1 docs for #582, eval head e3826248, merged 09:10:29Z as 58f60bc6 via --rebase, branch kept; Refs #582), #581 (Curator landing fix for #580, head f2cbb539, merged 03:47:01Z as 88c3f132 via --rebase, branch kept; Fixes #580), plus earlier.
 - **Issues:** Open: #582 (Rust-migration parent tracker, Phases 1-4 merged on main, Phase 5 #587 in eval), #552 (Pac-Man terminal arcade; REOPENED, Wave 2 #579 merged with Refs only - closes ONLY on owner live-terminal confirmation; now also the gameplay reference for the Rust migration, removal-blocked until replacement verified), #70 lab-health, #42 brainstorm standing only.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries, exact set match re-verified this run (live names minus maintainer minus 3 GitHub-managed = 19). No drift.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v2 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - #582 parent stays OPEN through all phases; only the final release-audit PR may carry Closes #582. Phase 5 #587 (head 280b55e1 post-Tester hostile suite: delta 7e54d12..280b55e1 verified live as exactly one test-only file tester_hostile.rs, production untouched, so the Reviewer approve on 7e54d12 stands per test-only precedent; Tester approve-test 11:37:21Z) in eval via this run's dispatch; merge only on approve-eval with no newer fix.
 - #552 awaits owner live-terminal confirmation AND serves as the migration reference; no removal of working functionality until replacement verified.
 - TEST-CRASH RULE (standing, mirrors eval-crash rule): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry test once. A second CONSECUTIVE silent death on the same PR routes `lab` (possible runner/model health fault), never a third test. UNACQUIRED deaths do not count; one retry per cooldown window max.
 - Evaluator non-blocking follow-ups queued (not dispatched): Phase 2 eval residuals (tick dt assert, replay genesis precondition doc, second golden vector, hub nowrap/table polish, maze symmetry prose) plus #579 Evaluator residuals plus #578 Reviewer nits plus all prior #575 nits plus #575 Reviewer deep-audit notes plus stale pins, weak disjunction assertion in test_tester_remediation_gate.py:48, pre-existing `--levels 0` help fall-through, plus #573 Tester advisory (compute(inf) OverflowError xfail) plus #573 Evaluator advisories plus #574 Reviewer nits plus #574 Tester xfails plus #579 re-review advisory plus residual hardening notes, plus Phase 3 eval advisories (harness flag handling, timing string in compared output, saturating_sub, BFS bounds guard, hub overflow guard), plus Phase 4 Reviewer advisories (sprites.rs:131 rectangular-input assumption, anim.rs:40 negative t_left, string clip frame IDs, TuneId sting gap, keymap single-char alias round-trip, rebind twin collapse, persist unknown-theme/order notes) plus Phase 4 Evaluator advisories (ragged-input panic on direct API misuse only, fright negative-time, fright non-finite parse, TuneId 3-sting gap, keymap separator keys, undocumented typography token block) plus Phase 5 Reviewer advisories (Ctrl+C unmapped, KeyEventKind release/repeat, Backspace alias, Scores scroll clamp, unchecked w*h allocs). Future hardening vehicle, not a gate.
 - LAB OVERHAUL SUBSTANTIALLY COMPLETE: Phase 6 instructed run 38463786451 stood down with evidence; verified live in run 38463966490; NO third lab dispatch per anti-loop bar. Future infra needs a fresh scoped order, not a repeat Phase 6.
 - Pages: Deploy run 38893712548 succeeded after #587 opened; post-merge main Pages deploy verification moves to the #587 merge run (main tip still 316f9628).
 - Write-permission denial count now 17 (latest on #587 at 11:25:57Z linking success-concluded pull_request maintainer run 38893663910 - benign shape, watch only).
 - Prior-run APIError notes (watch, not findings): run 38807340202 and 38807603090 posted transient backend-overload shapes on 2026-10-15/16. A consecutive provider outage that blocks a gate arm routes lab (model fallback), not a single blip.
 - Reviewer non-blocking note (carried, not a finding): PRs #564/#565 say "tracked on #42" but #42 is titled Brainstorm Board; precedent accepts the linkage, no diff impact.
 - Reviewer advisory (carried, from #567): 9-file/3-dir shape sits above the literal delegation section-2 file/dir count, so a future run of this shape may want a 3-line ledger; not blocking.
 - Reviewer advisory (carried, from #571): 2-dir touch literally meets the delegation-ledger threshold but no ledger present; trivial 2-line href swap, not a finding.
 - Reviewer observation (carried, from #577 approve): no delegation ledger / no-delegation one-liner on a single-file two-line edit (below every threshold); recorded as observation only, not a finding.
 - Infra routing guard stays active: any `.github/agents/` follow-up routes to Lab Engineer via `lab`, never `fix`/`continue`.
 - Main tip: 316f9628 (merge of #586).
 - Orphan-main protection holds: verify merge-base with main non-empty before the #587 merge.
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent (applied to #584 34b0eb95, #585 bdad5b00, #586 3877403e, and now #587 280b55e1).
 - Eval-gate calibration note: surgical infra/docs/test-hardening fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables. #552 remediation and Phases 1-4 merged only after mandatory approve-eval. #577 was README-only (docs-class), so Reviewer + Tester sufficed. #581 was landing-text-only (docs-class), same bar - merged 03:47:01Z. #583 Phase 1 was docs/hub-only (docs-class), same bar - merged 09:10:29Z. #584 Phase 2 (engine code) required and passed the full gate including Evaluator (9.8/10). #585 Phase 3 (engine code) required and passed the full gate including Evaluator (9.8/10). #586 Phase 4 (new crates) required and passed the full gate including Evaluator (9.9/10). Phase 5 (new terminal crate) requires the full gate including Evaluator.
 - Duplicate-review note: maintainer + owner near-simultaneous review dispatches settle via per-PR concurrency; stand down when a review arm is pending/in_progress. Same applies to eval arms, fix arms, build arms, and test arms.
 - IP hold (standing): God of War Kratos vs Zeus commission declined twice on binding IP grounds; original mythic-duel alternative stands awaiting owner confirmation.
 - Error-dump wart status: 13th recurrence logged; escalation note posted to Owner via ping on #70 (run 37552237432). 8th lab mandate withheld per loop guard - awaiting Owner direction.
 - Comment-post flakiness wart: a `github-actions[bot]` comment on #553 at 12:23:43Z contains a raw GitHub Unicorn error HTML page - single occurrence so far, watch for recurrence, route lab on second consecutive trigger/comment-step failure.
 - Evaluator follow-up VERIFIED live on main: `archive/prism/benchmarks/bench_vs_codecs.py:28` sys.path depth bug. Queued as future Builder/test-hardening vehicle.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` names. Lab to assess on second consecutive trigger-step failure.
 - Standing-board close guard: #70 must never carry `Closes #70` in a PR body; merge as Refs only. (#42 same: Refs only.)
 - Evaluator non-blocking notes (do not gate, carried): DEC2026 SYNC vs ansi.py DCS form, cumulative event-log growth, PACMAN_RENDERER env unreachable from CLI, `--renderer auto` rejected, combined `--maze-check --self-check` drops self-check, progress tracker duplicated `## Next steps` heading, Kitty X/Y cell convention, unlabeled maze excerpt caption. Plus Phase 2 notes: Elroy stage-2 speed stacking (ghosts.py:264), notify_dots overflow drop (ghosts.py:151), clear-clobbers-dying race (game.py:149), Elroy-2 clock spin (ghosts.py:204). Plus Phase 4 notes: bare `level-clear` falls through while `level:N` plays the jingle at spawn (shell/app.py), `raw is None` EOF branch unreachable, per-frame preview Game on TITLE. Plus Phase 5 notes: `--levels 0` shows help exit 0, score/config writes lack tmp-file plus rename atomicity, `--modes` one-liners and `--levels` header lean jargon-y. Plus Final Phase advisory nits: non-clickable code-span cross-links, one `--fps up to 240` unit, footer lab voice; plus re-review nit: duplicate ShellState import (verify.py:144 and :172 as _ShellState).
 - Tester non-blocking note (carried from #572 approve-test, not a finding): `--levels 0` falls through to help (exit 0) because cli.py uses `if args.levels:` with default 0; pre-existing, untouched by remediation, out of scope.
 - TESTING-GAP LESSON (from the reopen): the 92-row verify matrix asserts headless row counts, never rendered frames - multi-cell magnifier text duplication passes green while looking shattered. The #552 Wave 2 Builder PR adds true-pty frame-capture regression tests so this class can never go green-while-broken again.
 - ARCHITECT BODY-CLOSE WART (resolved): Architect PR #583 body said `Closes #582` though the epic contract reserves Closes for the final verified release only. The Builder corrected it to `Refs #582` in-run.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (both allowlists; watch for new workflow drift).
2. On Evaluator approve-eval of #587 head 280b55e1 with no newer fix, merge via --rebase (keep branch), verify main Pages deploy, keep #582 OPEN, then immediately chain Phase 6 via build on #582.
3. On Evaluator fix findings on #587, route Fixer then fresh review on the new head.
4. #552 closes ONLY on owner live-terminal confirmation - never auto-close on `Refs #552`; working code stays until Rust replacement verified.
5. Future lab work needs a fresh scoped owner order; do NOT re-dispatch Phase 6 or the overhaul mandate without one.
6. Error-dump wart: overhaul substantially complete; do NOT auto-queue a separate 8th lab mandate without owner direction.
7. Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits remain queued for a future hardening vehicle.
8. Council calibration: advisory Desktop Pet audit still pending.
9. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
10. Watch: comment-post flakiness (Unicorn-HTML wart) plus the write-permission denial shape plus transient APIError provider blips - a consecutive occurrence WITH a failure conclusion or a gate-blocking outage routes lab.
11. Standing rule: standby on all other fronts (no auto-ideate).
12. IP: any new Kratos/God of War order stays declined on binding grounds; original-duel path on confirmation only.

## OPEN QUESTIONS
 - Will the Evaluator approve Phase 5 head 280b55e1, or return fix findings on the terminal crate?
 - Will the Owner confirm #552 complete on real terminals now that Wave 2 is merged?
 - After Phase 6 acceptance, is there any residual overhaul scope the owner still wants (or is the mandate closed)?
 - Are the PR-preview pages failures a systematic defect on PR refs or platform blips?
 - Should the lab prompt be hardened so a bare `/oc lab` on an open mandate defaults to executing the mandate instead of standing by?
 - Where does the overhaul epic actually live - should a dedicated vision issue be split off #42?
 - Will the Owner open a PR from the `opencode/issue436-gui-detach-and-syswide-fixes` branch, or land it another way?
 - Was the Pages 500 a one-off platform blip, or the start of an outage window? (Single occurrence 17:14:52Z on 2026-09-29; all deploys since success.)
 - Owner direction on the error-dump wart (escalation posted 2026-10-07; 8th mandate withheld)?
 - Evaluator follow-up hardening vehicle (archived bench helper sys.path depth + weak assertion + stale pins)?
 - What caused the ~50-min agent-step death in eval run 37362541465?
 - What killed the Tester agent step in opencode-test run 38821322108 (exit 143 SIGTERM after ~5.5 min mid-stream) - runner preemption, step timeout, or provider drop?
 - Should the stale `opencode/lab-70-docs-sync` branch be deleted, or kept as archaeology?
 - Should the maintainer trigger poster re-checkout main before reading its own mapping?
 - Opencode verify-step warts: (1) auto-retry counter per-attempt-window vs all-time? (2) branch pattern accepting `opencode/<issue>-*`?
 - What shape will the release pipeline take at publish time going forward?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor)?

 - Hephaestus, the Maintainer
