# STATE - Random factory checkpoint
 - **Updated: 2026-10-16 run 38887982861 - Phase 3 eval-fix head re-approved by Reviewer plus Tester on #585 (head 6baa327c), eval dispatched**

## PRs & Issues
 - **PRs:** Open: #585 only (Phase 3 engine for #582, head 6baa327c post-Fixer eval-required tracker repair, MERGEABLE/CLEAN, base main; body reads Refs #582; Reviewer approve 10:31:52Z plus Tester approve-test 10:33:08Z both on head 6baa327c, no newer fix; binding eval dispatched). MERGED: #584 (Phase 2 engine core for #582, eval head 34b0eb95, merged 09:47:35Z as 0f9f0948 via --rebase, branch kept; Refs #582), #583 (Phase 1 docs for #582, eval head e3826248, merged 09:10:29Z as 58f60bc6 via --rebase, branch kept; Refs #582), #581 (Curator landing fix for #580, head f2cbb539, merged 03:47:01Z as 88c3f132 via --rebase, branch kept; Fixes #580), plus earlier.
 - **Issues:** Open: #582 (Rust-migration parent tracker, Phases 1-2 merged on main, Phase 3 in eval via #585), #552 (Pac-Man terminal arcade; REOPENED, Wave 2 #579 merged with Refs only - closes ONLY on owner live-terminal confirmation; now also the gameplay reference for the Rust migration, removal-blocked until replacement verified), #70 lab-health, #42 brainstorm standing only.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries, exact set match re-verified this run. No drift.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - #582 parent stays OPEN through all phases; Phase 3 (Ghost Intelligence, Scoring and Progression) on #585: Reviewer plus Tester both re-approved the eval-fix head 6baa327c, binding Evaluator round dispatched - merge only on approve-eval with no newer fix.
 - #552 awaits owner live-terminal confirmation AND now serves as migration reference; no removal of working functionality until replacement verified.
 - TEST-CRASH RULE (standing, mirrors eval-crash rule): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry test once. A second CONSECUTIVE silent death on the same PR routes `lab` (possible runner/model health fault), never a third test. UNACQUIRED deaths do not count; one retry per cooldown window max.
 - Evaluator non-blocking follow-ups queued (not dispatched): Phase 2 eval residuals (tick dt assert, replay genesis precondition doc, second golden vector, hub nowrap/table polish, maze symmetry prose) plus #579 Evaluator residuals plus #578 Reviewer nits plus all prior #575 nits plus #575 Reviewer deep-audit notes plus stale pins, weak disjunction assertion in test_tester_remediation_gate.py:48, pre-existing `--levels 0` help fall-through, plus #573 Tester advisory (compute(inf) OverflowError xfail) plus #573 Evaluator advisories plus #574 Reviewer nits plus #574 Tester xfails plus #579 re-review advisory plus residual hardening notes, plus Phase 3 eval advisories (harness flag handling, timing string in compared output, saturating_sub, BFS bounds guard, hub overflow guard). Future hardening vehicle, not a gate.
 - LAB OVERHAUL SUBSTANTIALLY COMPLETE: Phase 6 instructed run 38463786451 stood down with evidence; verified live in run 38463966490; NO third lab dispatch per anti-loop bar. Future infra needs a fresh scoped order, not a repeat Phase 6.
 - Pages: main tip 0f9f0948 (merge of #584); post-merge main Pages deploy VERIFIED success (run 38884277603, 10:00:06Z).
 - Write-permission denial count now 15 (latest on #585 linking success-concluded pull_request run 38884224652 - benign shape, watch only).
 - Prior-run APIError notes (watch, not findings): run 38807340202 and 38807603090 posted transient backend-overload shapes on 2026-10-15/16. A consecutive provider outage that blocks a gate arm routes lab (model fallback), not a single blip.
 - Reviewer non-blocking note (carried, not a finding): PRs #564/#565 say "tracked on #42" but #42 is titled Brainstorm Board; precedent accepts the linkage, no diff impact.
 - Reviewer advisory (carried, from #567): 9-file/3-dir shape sits above the literal delegation section-2 file/dir count, so a future run of this shape may want a 3-line ledger; not blocking.
 - Reviewer advisory (carried, from #571): 2-dir touch literally meets the delegation-ledger threshold but no ledger present; trivial 2-line href swap, not a finding.
 - Reviewer observation (carried, from #577 approve): no delegation ledger / no-delegation one-liner on a single-file two-line edit (below every threshold); recorded as observation only, not a finding.
 - Infra routing guard stays active: any `.github/agents/` follow-up routes to Lab Engineer via `lab`, never `fix`/`continue`.
 - Main tip: 0f9f0948 (merge of #584).
 - Orphan-main protection holds: merge-base with main verified non-empty (58f60bc6) before the #584 merge; post-merge tip 0f9f0948 confirmed via ls-remote.
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent (applied to #584 34b0eb95 and #585 bdad5b00).
 - Eval-gate calibration note: surgical infra/docs/test-hardening fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables. #552 remediation and Phases 1-4 merged only after mandatory approve-eval. #577 was README-only (docs-class), so Reviewer + Tester sufficed. #581 was landing-text-only (docs-class), same bar - merged 03:47:01Z. #583 Phase 1 was docs/hub-only (docs-class), same bar - merged 09:10:29Z. #584 Phase 2 (engine code) required and passed the full gate including Evaluator (9.8/10).
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
1. Trigger-list re-verify each run (BOTH allowlists; watch for new workflow drift).
2. Phase 3 #585 in eval on head 6baa327c: on approve-eval with no newer fix, merge via --rebase (keep branch), verify main Pages deploy, keep #582 OPEN, then immediately chain Phase 4 via build on #582.
3. #582 stays OPEN through all phases; only the final release-audit PR may carry Closes #582.
4. #552 closes ONLY on owner live-terminal confirmation - never auto-close on `Refs #552`; working code stays until Rust replacement verified.
5. Future lab work needs a fresh scoped owner order; do NOT re-dispatch Phase 6 or the overhaul mandate without one.
6. Error-dump wart: overhaul substantially complete; do NOT auto-queue a separate 8th lab mandate without owner direction.
7. Evaluator follow-ups plus all carried Reviewer/Tester nits queued for a future hardening vehicle.
8. Council calibration: advisory Desktop Pet audit still pending.
9. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
10. Watch: comment-post flakiness (Unicorn-HTML wart) plus the write-permission denial shape plus transient APIError provider blips - a consecutive occurrence WITH a failure conclusion or a gate-blocking outage routes lab.
11. Standing rule: standby on all other fronts (no auto-ideate).
12. IP: any new Kratos/God of War order stays declined on binding grounds; original-duel path on confirmation only.

## OPEN QUESTIONS
 - Will Phase 3 (#585) pass the binding re-eval cleanly on the repaired head 6baa327c?
 - What sub-issue split does the blueprint recommend after Phase 1 merges (research, engine, ghost AI, assets/audio, terminal, desktop, WASM, packaging, testing, docs)?
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