# STATE - Random factory checkpoint
 - **Updated: 2026-10-16 run 38877146314 - parent issue #582 confirmed live; dispatching Architect on it this run**

## PRs & Issues
 - **PRs:** Open: none (post-merge). MERGED: #581 (Curator landing fix for #580, head f2cbb539, merged 03:47:01Z as 88c3f132 via --rebase, branch kept; Fixes #580), #579 (Pac-Man Wave 2 for #552, eval-fix head 206a42d2, merged 23:45:54Z as 340f055a via --rebase, branch kept; Refs #552), #578 (Phase 4 for #552, head b24f8426, merged 22:18:56Z, branch kept; Closes #552), #575 (Phase 3, head 65225d66, merged 21:34:53Z, branch kept; Refs #552), #577 (Curator README Active sync, head cb779556, merged 21:13:01Z, branch kept; Fixes #576), #574 (Phase 2, head d1bcc53e, merged 20:43:41Z, branch kept; Refs #552), #573 (Phase 1, head 51b87ee, merged 19:50:48Z, branch kept; Refs #552), #572 (remediation, head af67ea82, merged 15:47:17Z, branch kept; Refs #552), #571 (Curator docs nav hrefs, head 7fdc22f6, merged 03:51:16Z, branch kept; Fixes #570), plus earlier. CLOSED (not merged): #555 (superseded), #547.
 - **Issues:** Open: #582 (Rust-migration parent tracker, created 08:57:21Z by run 38876868391; UNTRIAGED at survey - zero comments - routed to Architect THIS run), #552 (Pac-Man terminal arcade; REOPENED, Wave 2 #579 merged with Refs only - closes ONLY on owner live-terminal confirmation; now also the gameplay reference for the Rust migration, removal-blocked until replacement verified), #70 lab-health, #42 brainstorm standing only. Closed: #580 (via #581 merge 03:47:01Z), #576 (via #577), #570 (via #571), plus earlier.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields - exact set match re-verified this run (auditor, curator, ideate, Lab Engineer, opencode-eval, opencode-peros-test, opencode-pr-trigger, opencode-recover, opencode-review, opencode-test, opencode, pages, pet-release, poolduel-m1, poolduel-m10-soak, poolduel-m2, poolduel-m9, postformer-cpu-train, tor-cli). `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - #582 routed to Architect this run (epic-intake rule: >7-feature multi-component project gets the Phase Epic roadmap in progress/ with semantic phase names before any Builder work). Next run: confirm `/oc architect` landed on #582; thereafter sub-issues plus phased builds through the full gate.
 - #552 awaits owner live-terminal confirmation AND now serves as migration reference; no removal of working functionality until replacement verified.
 - TEST-CRASH RULE (standing, mirrors eval-crash rule): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry test once. A second CONSECUTIVE silent death on the same PR routes `lab` (possible runner/model health fault), never a third test. UNACQUIRED deaths do not count; one retry per cooldown window max.
 - Evaluator non-blocking follow-ups queued (not dispatched): #579 Evaluator residuals plus #578 Reviewer nits plus all prior #575 nits plus #575 Reviewer deep-audit notes plus stale pins, weak disjunction assertion in test_tester_remediation_gate.py:48, pre-existing `--levels 0` help fall-through, plus #573 Tester advisory (compute(inf) OverflowError xfail) plus #573 Evaluator advisories plus #574 Reviewer nits plus #574 Tester xfails plus #579 re-review advisory plus residual hardening notes. Future hardening vehicle, not a gate.
 - LAB OVERHAUL SUBSTANTIALLY COMPLETE: Phase 6 instructed run 38463786451 stood down with evidence; verified live in run 38463966490; NO third lab dispatch per anti-loop bar. Future infra needs a fresh scoped order, not a repeat Phase 6.
 - Pages: main tip 88c3f132 (merge of #581); post-merge main Pages deploy VERIFIED success (run 38847323061, 03:48:09Z).
 - First failure-conclusion run of the prior day: opencode-test 38821322108 (failure, 23:04:34Z issue_comment fan-out, agent-step SIGTERM, triaged + retried; retry succeeded). Zero failure/timed_out in this run's survey window.
 - Write-permission denial note (watch, not a finding): 12th occurrence counting the `github-actions[bot]` comment on #581 at 03:41:57Z linking run 38846772522 (concluded success path, same benign actor-gate/CLI-assert skip shape). A consecutive occurrence WITH a failure conclusion routes lab.
 - Prior-run APIError notes (watch, not findings): run 38807363402 and 38807603090 posted transient backend-overload shapes on 2026-10-15/16. A consecutive provider outage that blocks a gate arm routes lab (model fallback), not a single blip.
 - Reviewer non-blocking note (carried, not a finding): PRs #564/#565 say "tracked on #42" but #42 is titled Brainstorm Board; precedent accepts the linkage, no diff impact.
 - Reviewer advisory (carried, from #567): 9-file/3-dir shape sits above the literal delegation section-2 file/dir count, so a future run of this shape may want a 3-line ledger; not blocking.
 - Reviewer advisory (carried, from #571): 2-dir touch literally meets the delegation-ledger threshold but no ledger present; trivial 2-line href swap, not a finding.
 - Reviewer observation (carried, from #577 approve): no delegation ledger / no-delegation one-liner on a single-file two-line edit (below every threshold); recorded as observation only, not a finding.
 - Infra routing guard stays active: any `.github/agents/` follow-up routes to Lab Engineer via `lab`, never `fix`/`continue`.
 - Main tip: 88c3f132 (merge of #581).
 - Orphan-main protection holds: merge-base with main verified non-empty (340f055a) before the #581 merge.
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent.
 - Eval-gate calibration note: surgical infra/docs/test-hardening fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables. #552 remediation and Phases 1-4 merged only after mandatory approve-eval. #577 was README-only (docs-class), so Reviewer + Tester sufficed. #581 was landing-text-only (docs-class), same bar - merged 03:47:01Z.
 - Eval-crash rule (amended): eval run dying inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown 30 min same-signature). Second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths do not count; one exception per cooldown window max.
 - Duplicate-review note: maintainer + owner near-simultaneous review dispatches settle via per-PR concurrency; stand down when a review arm is pending/in_progress. Same applies to eval arms, fix arms, and build arms.
 - IP hold (standing): God of War Kratos vs Zeus commission declined twice on binding IP grounds; original mythic-duel alternative stands awaiting owner confirmation.
 - Error-dump wart status: 13th recurrence logged; escalation note posted to Owner via ping on #70 (run 37552237432). 8th lab mandate withheld per loop guard - awaiting Owner direction.
 - Comment-post flakiness wart: a `github-actions[bot]` comment on #553 at 12:23:43Z contains a raw GitHub Unicorn error HTML page - single occurrence so far, watch for recurrence, route lab on second consecutive trigger/comment-step failure.
 - Evaluator follow-up VERIFIED live on main: `archive/prism/benchmarks/bench_vs_codecs.py:28` sys.path depth bug. Queued as future Builder/test-hardening vehicle.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` names. Lab to assess on second consecutive trigger-step failure.
 - Standing-board close guard: #70 must never carry `Closes #70` in a PR body; merge as Refs only. (#42 same: Refs only.)
 - Evaluator non-blocking notes (do not gate, carried): DEC2026 SYNC vs ansi.py DCS form, cumulative event-log growth, PACMAN_RENDERER env unreachable from CLI, `--renderer auto` rejected, combined `--maze-check --self-check` drops self-check, progress tracker duplicated `## Next steps` heading, Kitty X/Y cell convention, unlabeled maze excerpt caption. Plus Phase 2 notes: Elroy stage-2 speed stacking (ghosts.py:264), notify_dots overflow drop (ghosts.py:151), clear-clobbers-dying race (game.py:149), Elroy-2 clock spin (ghosts.py:204). Plus Phase 4 notes: bare `level-clear` falls through while `level:N` plays the jingle at spawn (shell/app.py), `raw is None` EOF branch unreachable, per-frame preview Game on TITLE. Plus Phase 5 notes: `--levels 0` shows help exit 0, score/config writes lack tmp-file plus rename atomicity, `--modes` one-liners and `--levels` header lean jargony. Plus Final Phase advisory nits: non-clickable code-span cross-links, one `--fps up to 240` unit, footer lab voice; plus re-review nit: duplicate ShellState import (verify.py:144 and :172 as _ShellState).
 - Tester non-blocking note (carried from #572 approve-test, not a finding): `--levels 0` falls through to help (exit 0) because cli.py uses `if args.levels:` with default 0; pre-existing, untouched by remediation, out of scope.
 - TESTING-GAP LESSON (from the reopen): the 92-row verify matrix asserts headless row counts, never rendered frames - multi-cell magnifier text duplication passes green while looking shattered. The #552 Wave 2 Builder PR adds true-pty frame-capture regression tests so this class can never go green-while-broken again.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists; watch for new workflow drift).
2. Confirm `/oc architect` landed on #582; if the Architect delivered the Phase Epic roadmap in progress/, route sub-issue creation plus phased builds through the full gate (research first where algorithmic depth warrants, else build).
3. #552 closes ONLY on owner live-terminal confirmation - never auto-close on `Refs #552`; working code stays until Rust replacement verified.
4. Future lab work needs a fresh scoped owner order; do NOT re-dispatch Phase 6 or the overhaul mandate without one.
5. Error-dump wart: overhaul substantially complete; do NOT auto-queue a separate 8th lab mandate without owner direction.
6. Evaluator follow-ups plus all carried Reviewer/Tester nits queued for a future hardening vehicle.
7. Council calibration: advisory Desktop Pet audit still pending.
8. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
9. Watch: comment-post flakiness (Unicorn-HTML wart) plus the write-permission denial shape plus transient APIError provider blips - a consecutive occurrence WITH a failure conclusion or a gate-blocking outage routes lab.
10. Standing rule: standby on all other fronts (no auto-ideate).
11. IP: any new Kratos/God of War order stays declined on binding grounds; original-duel path on confirmation only.

## OPEN QUESTIONS
 - Did the `/oc architect` trigger land on #582 via the hardcoded step, and what sub-issue split does the blueprint recommend (research, engine, ghost AI, assets/audio, terminal, desktop, WASM, packaging, testing, docs)?
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
 - Should the maintainer trigger poster re-checkout main after in-session merges before reading its own mapping?
 - Opencode verify-step warts: (1) auto-retry counter per-attempt-window vs all-time? (2) branch pattern accepting `opencode/<issue>-*`?
 - What shape will the release pipeline take at publish time going forward?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor)?

 - Hephaestus, the Maintainer