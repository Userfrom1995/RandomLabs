# STATE - Random factory checkpoint
 - **Updated: 2026-10-15 run 38816153924 - owner /oc maintainer on #578, full gate green, MERGED + #552 CLOSED**

## PRs & Issues
 - **PRs:** Open: none. MERGED: #578 (Phase 4 Settings Customization Verification Scoreboard, head b24f8426, merged 22:18:56Z via --rebase, branch kept; Closes #552), #575 (Phase 3, head 65225d66, merged 21:34:53Z via --rebase, branch kept; Refs #552), #577 (Curator README Active sync, head cb779556, merged 21:13:01Z via --rebase, branch kept; Fixes #576), #574 (Phase 2, head d1bcc53e, merged 20:43:41Z via --rebase, branch kept; Refs #552), #573 (Phase 1, head 51b87ee, merged 19:50:48Z via --rebase, branch kept; Refs #552), #572 (remediation, head af67ea82, merged 15:47:17Z via --rebase, branch kept; Refs #552), #571 (Curator docs nav hrefs, head 7fdc22f6, merged 03:51:16Z via --rebase, branch kept; Fixes #570), plus earlier. CLOSED (not merged): #555 (superseded), #547.
 - **Issues:** Open: #70 lab-health, #42 brainstorm standing. Closed: #552 (Pac-Man terminal arcade fullscreen-canvas epic, closed 22:1xZ after final Phase 4 #578 passed the full gate with approve-eval 9.8/10), #576 (via #577), #570 (via #571), plus earlier.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields - exact set match re-verified this run, no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - NOTHING IN FLIGHT: zero open PRs, zero open project issues. Standing boards (#70, #42) only.
 - #552 FULLSCREEN WAVE COMPLETE: remediation #572 (Refs) + Phases 1-4 (#573/#574/#575 Refs, #578 final Closes) all merged, each only after the mandatory full gate (Reviewer approve, Tester approve-test, Evaluator approve-eval). Phase 4 eval went FIX 9.5/10 first (7 surgical one-liners), Fixer applied all 7, re-gate passed (review + test), second eval returned APPROVE-EVAL 9.8/10, then merge + issue close.
 - Evaluator non-blocking follow-ups queued (not dispatched, future hardening vehicle): #578 final-eval notes (dense controls paragraph index.html:43, static P/Q hints screens.py:108-109/164-166, cycle float-truncation) + #578 Reviewer nits (progress branch field still remediation name, Active Phase still reads Phase 3) + all prior #575 nits (pause resume label truncation at 28-col floor, static --keys footer after remap, 408-vs-424 suite wording, 5 Pillow-less parity pass-as-skip rows) + #575 Reviewer deep-audit notes (programmatic-only empty-bindings fallback, static hint lines, quit_to_title stale fields, SCORES-hardcoded-to-TITLE, fuller mute-vocabulary loops, tiny-width asserts). Plus stale "304 tests" pins in 4 doc spots, weak disjunction assertion in test_tester_remediation_gate.py:48, pre-existing `--levels 0` help fall-through (exit 0 vs `--levels -1` exit 2). Plus #573 Tester advisory: compute(inf) OverflowError xfail. Plus #573 Evaluator advisories: stale 41-row count in docs/index.md, O/O legend glyph ambiguity, stale branch line in progress header. Plus #574 Reviewer nits for Phase 3 (dead spans return / CHROME_GLYPHS in compose.py, unused player_glyph/wall_tint_tick/ghost_shimmer in effects.py, duplicate PLAYER_SPRITE_CLOSED + FRIGHT_COLOR drift in atlas.py, too-small message hardcoding COLS/ROWS in layout.py, int(inf) OverflowError holes + Scale __eq__/__hash__, kitty same-sprite re-place erase, config version never migrates, stale progress branch field). Plus #574 Tester xfails (inf OverflowError, unreachable via real terminals).
 - LAB OVERHAUL SUBSTANTIALLY COMPLETE: Phase 6 instructed run 38463786451 stood down with evidence; verified live in run 38463966490; NO third lab dispatch per anti-loop bar. Future infra needs a fresh scoped order, not a repeat Phase 6.
 - Pages: main tip 5ba7ba13 (merge of #578); post-merge main Pages deploy watch PENDING for 5ba7ba13 (prior deploys for 52afcbfd all success: 38811115972, 38810066071, 38809562318) - if the deploy fails, route lab immediately.
 - Write-permission denial note (watch, not a finding): `github-actions[bot]` comment on #578 at 21:49:25Z links run 38812685321, verified concluded success (pull_request event) - same benign actor-gate/CLI-assert skip shape as #575/#574/#573/#572/#577. A consecutive occurrence WITH a failure conclusion routes lab.
 - Prior-run APIError notes (watch, not findings): run 38807363402 posted "APIError: The backend is temporarily overloaded. Please retry." at 21:11:56Z on #577; run 38807603090 posted the same shape on #575. A consecutive provider outage that blocks a gate arm routes lab (model fallback), not a single blip.
 - Reviewer non-blocking note (carried, not a finding): PRs #564/#565 say "tracked on #42" but #42 is titled Brainstorm Board; precedent accepts the linkage, no diff impact.
 - Reviewer advisory (carried, from #567): 9-file/3-dir shape sits above the literal delegation section-2 file/dir count, so a future run of this shape may want a 3-line ledger; not blocking.
 - Reviewer advisory (carried, from #571): 2-dir touch literally meets the delegation-ledger threshold but no ledger present; trivial 2-line href swap, not a finding.
 - Reviewer observation (carried, from #577 approve): no delegation ledger / no-delegation one-liner on a single-file two-line edit (below every threshold); recorded as observation only, not a finding.
 - Infra routing guard stays active: any `.github/agents/` follow-up routes to Lab Engineer via `lab`, never `fix`/`continue`.
 - Main tip: 5ba7ba13 (merge of #578).
 - Orphan-main protection holds: merge-base with main verified non-empty before every merge to date (52afcbfd for #578). Merge-base check due at every merge.
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent.
 - Eval-gate calibration note: surgical infra/docs/test-hardening fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables. #552 remediation and Phases 1-4 merged only after mandatory approve-eval. #577 was README-only (docs-class), so Reviewer + Tester sufficed.
 - Eval-crash rule (amended): eval run dying inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown 30 min same-signature). Second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths do not count; one exception per cooldown window max.
 - Duplicate-review note: maintainer + owner near-simultaneous review dispatches settle via per-PR concurrency; stand down when a review arm is pending/in_progress. Same applies to eval arms, fix arms, and build arms.
 - IP hold (standing): God of War Kratos vs Zeus commission declined twice on binding IP grounds (Sony copyright; waiver does not transfer liability); original mythic-duel alternative (Thor vs Zeus original designs) stands awaiting owner confirmation.
 - Error-dump wart status: 13th recurrence logged; escalation note posted to Owner via ping on #70 (run 37552237432). 8th lab mandate withheld per loop guard - awaiting Owner direction.
 - Comment-post flakiness wart: a `github-actions[bot]` comment on #553 at 12:23:43Z contains a raw GitHub Unicorn error HTML page - single occurrence so far, watch for recurrence, route lab on second consecutive trigger/comment-step failure.
 - Evaluator follow-up VERIFIED live on main: `archive/prism/benchmarks/bench_vs_codecs.py:28` sys.path depth bug. Queued as future Builder/test-hardening vehicle.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` names. Lab to assess on second consecutive trigger-step failure.
 - Standing-board close guard: #70 must never carry `Closes #70` in a PR body; merge as Refs only. (#42 same: Refs only.)
 - Evaluator non-blocking notes (do not gate, carried): DEC2026 SYNC vs ansi.py DCS form, cumulative event-log growth, PACMAN_RENDERER env unreachable from CLI, `--renderer auto` rejected, combined `--maze-check --self-check` drops self-check, progress tracker duplicated `## Next steps` heading, Kitty X/Y cell convention, unlabeled maze excerpt caption. Plus Phase 2 notes: Elroy stage-2 speed stacking (ghosts.py:264), notify_dots overflow drop (ghosts.py:151), clear-clobbers-dying race (game.py:149), Elroy-2 clock spin (ghosts.py:204). Plus Phase 4 notes: bare `level-clear` falls through while `level:N` plays the jingle at spawn (shell/app.py), `raw is None` EOF branch unreachable, per-frame preview Game on TITLE. Plus Phase 5 notes: `--levels 0` shows help exit 0, score/config writes lack tmp-file plus rename atomicity, `--modes` one-liners and `--levels` header lean jargony. Plus Final Phase advisory nits: non-clickable code-span cross-links, one `--fps up to 240` unit, footer lab voice; plus re-review nit: duplicate ShellState import (verify.py:144 and :172 as _ShellState).
 - Tester non-blocking note (carried from #572 approve-test, not a finding): `--levels 0` falls through to help (exit 0) because cli.py uses `if args.levels:` with default 0; pre-existing, untouched by remediation, out of scope.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists; watch for new workflow drift).
2. Standby posture: zero open PRs, zero open project issues. On new owner directives, issues, or PRs, route per the pipeline (review/test/eval for product work, lab for infra).
3. Main-deploy watch: confirm the post-merge main Pages deploy for 5ba7ba13 succeeded; if it failed, route lab immediately.
4. Future lab work needs a fresh scoped owner order; do NOT re-dispatch Phase 6 or the overhaul mandate without one.
5. Error-dump wart: overhaul substantially complete; do NOT auto-queue a separate 8th lab mandate without owner direction.
6. Evaluator follow-ups (archived bench helper sys.path depth + weak assertion + stale test-count pins + levels-0 quirk + compute(inf) xfail + docs/index.md 41-row drift + legend glyph + progress header + all #574 Reviewer/Tester nits + #575 deep-audit notes + #578 final-eval polish notes) queued for a future hardening vehicle.
7. Council calibration: advisory Desktop Pet audit still pending.
8. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
9. Watch: comment-post flakiness (Unicorn-HTML wart) plus the write-permission denial shape (now 9th occurrence counting #578, all success-concluded, benign) plus transient APIError provider blips (2 occurrences this day, pipeline intact) - a consecutive occurrence WITH a failure conclusion or a gate-blocking outage routes lab.
10. Standing rule: standby on all other fronts (no auto-ideate).
11. IP: any new Kratos/God of War order stays declined on binding grounds; original-duel path on confirmation only.

## OPEN QUESTIONS
 - After the full fullscreen-canvas epic lands, will the Owner confirm #552 complete on real terminals, or order further iteration?
 - Will the Architect's fullscreen-canvas blueprint (run 38791339030) still land in parallel, or is the epic now fully Builder-driven through Phase 4?
 - After Phase 6 acceptance, is there any residual overhaul scope the owner still wants (or is the mandate closed)?
 - Are the PR-preview pages failures a systematic defect on PR refs or platform blips?
 - Should the lab prompt be hardened so a bare `/oc lab` on an open mandate defaults to executing the mandate instead of standing by?
 - Where does the overhaul epic actually live - should a dedicated vision issue be split off #42?
 - Will the Owner ask for the dormant poolduel sweep workflows to be retired or repointed at archive/poolduel?
 - Was the Pages 500 a one-off platform blip, or the start of an outage window? (Single occurrence 17:14:52Z on 2026-09-29; all deploys since success.)
 - Owner direction on the error-dump wart (escalation posted 2026-10-07; 8th mandate withheld)?
 - Evaluator follow-up hardening vehicle (archived bench helper sys.path depth + weak assertion + stale pins)?
 - What caused the ~50-min agent-step death in eval run 37362541465?
 - Should the stale `opencode/lab-70-docs-sync` branch be deleted, or kept as archaeology?
 - Should the maintainer trigger poster re-checkout main after in-session merges before reading its own mapping?
 - Opencode verify-step warts: (1) auto-retry counter per-attempt-window vs all-time? (2) branch pattern accepting `opencode/<issue>-*`?
 - What shape will the release pipeline take at publish time going forward?
 - Will the Owner open a PR from the `opencode/issue436-gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor)?

 - Hephaestus, the Maintainer