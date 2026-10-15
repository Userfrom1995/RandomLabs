# STATE - Random factory checkpoint
 - **Updated: 2026-10-15 run 38812236196 - schedule tick, Phase 4 build in flight, stand down**

## PRs & Issues
 - **PRs:** Open: none. MERGED: #575 (Pac-Man fullscreen canvas Phase 3 Thoughtful Controls Menus and Remapping for #552, head 65225d66, merged 21:34:53Z via --rebase, branch kept; Refs #552), #577 (Curator README Active sync, head cb779556, merged 21:13:01Z via --rebase, branch kept; Fixes #576), #574 (Pac-Man Phase 2, head d1bcc53e, merged 20:43:41Z via --rebase, branch kept; Refs #552), #573 (Phase 1, head 51b87ee, merged 19:50:48Z via --rebase, branch kept; Refs #552), #572 (remediation, head af67ea82, merged 15:47:17Z via --rebase, branch kept; Refs #552), #571 (Curator docs nav hrefs, head 7fdc22f6, merged 03:51:16Z via --rebase, branch kept; Fixes #570), #569, #567, #566, #565, #564, #563, #562, #560, #559, #558, #557, #556, #553, plus earlier. CLOSED (not merged): #555 (superseded), #547.
 - **Issues:** Open: #552 (Pac-Man terminal arcade; owner-reopened 2026-10-15T14:59:57Z, remediation #572 merged with Refs only, Phase 1 #573 merged with Refs only, Phase 2 #574 merged with Refs only, Phase 3 #575 merged with Refs only, Phase 4 build in flight - NEVER close on intermediate PRs), #70 lab-health, #42 brainstorm standing. Closed: #576 (via Fixes #576 on merge of #577, closed 21:13:01Z), #570 (via Fixes #570 on merge of #571), #568, #561, plus earlier.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields - exact set match re-verified this run, no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - #552 FULLSCREEN WAVE PHASE 4 IN FLIGHT: Phase 3 PR #575 merged 21:34:53Z (full gate green: Reviewer approve 21:19:29Z, Tester approve-test 21:26:03Z, Evaluator approve-eval 9.86/10 21:33:48Z, no newer fix; merge-base 0d8e8733 HAS-BASE). Phase 4 build trigger (final: Settings Customization Verification and Scoreboard, Closes #552) dispatched by run 38810833834; Builder arm opencode run 38811116238 still in_progress at this survey, no Phase 4 PR opened yet. Architect blueprint run 38791339030 still expected in parallel. #552 closes ONLY when the final phase passes the full gate.
 - #552 remediation A/B/C/D DONE and merged (#572, full gate green: Reviewer approve, Tester approve-test, Evaluator approve-eval 9.8/10; main Pages deploy 38763528845 success).
 - Evaluator non-blocking follow-ups queued (not dispatched): #575 nits (pause resume label truncation at 28-col floor, static --keys footer after remap, 408-vs-424 suite wording, 5 Pillow-less parity pass-as-skip rows) plus #575 Reviewer deep-audit notes (programmatic-only empty-bindings fallback, static hint lines, quit_to_title stale fields, SCORES-hardcoded-to-TITLE, fuller mute-vocabulary loops, tiny-width asserts). Plus stale "304 tests" pins in 4 doc spots (collects ~314 after Tester gate commit), weak disjunction assertion in test_tester_remediation_gate.py:48, pre-existing `--levels 0` help fall-through (exit 0 vs `--levels -1` exit 2). Plus #573 Tester advisory: compute(inf) OverflowError xfail (one-word except widening, later wave). Plus #573 Evaluator advisories: stale 41-row count in docs/index.md (pre-existing drift, curator track), O/O legend glyph ambiguity, stale branch line in progress header. Plus #574 Reviewer nits for Phase 3 (dead spans return / CHROME_GLYPHS in compose.py, unused player_glyph/wall_tint_tick/ghost_shimmer in effects.py, duplicate PLAYER_SPRITE_CLOSED + FRIGHT_COLOR drift in atlas.py, too-small message hardcoding COLS/ROWS in layout.py, int(inf) OverflowError holes + Scale __eq__/__hash__ in scale.py/effects.py, kitty same-sprite re-place erase, config version never migrates, stale progress branch field). Plus #574 Tester xfails (inf OverflowError, unreachable via real terminals). Future hardening vehicle, not a gate.
 - LAB OVERHAUL SUBSTANTIALLY COMPLETE: Phase 6 instructed run 38463786451 stood down with evidence; verified live in run 38463966490; NO third lab dispatch per anti-loop bar. Future infra needs a fresh scoped order, not a repeat Phase 6.
 - Pages: main tip 52afcbfd (merge of #575); post-merge main Pages deploys success (38811115972, 38810066071, 38809562318) - deploy watch green this run.
 - Write-permission denial note (watch, not a finding): `github-actions[bot]` comments on #575 (21:02:00Z, run 38806623245 success), #574 (20:29:31Z, success), #573 (19:31:28Z, success), #572 (15:27:18Z, success), #577 (21:07:06Z, run 38807331846 success) - five/six occurrences, all linking success-concluded runs, so benign actor-gate/CLI-assert skips, NOT trigger-step failures; no lab routing per loop guard. A consecutive occurrence WITH a failure conclusion routes lab.
 - Prior-run APIError notes (watch, not findings): run 38807363402 posted "APIError: The backend is temporarily overloaded. Please retry." at 21:11:56Z on #577 (transient, pipeline intact, Tester approve-test had already landed); run 38807603090 posted the same shape on #575. A consecutive provider outage that blocks a gate arm routes lab (model fallback), not a single blip.
 - Reviewer non-blocking note (carried, not a finding): PRs #564/#565 say "tracked on #42" but #42 is titled Brainstorm Board; precedent accepts the linkage, no diff impact.
 - Reviewer advisory (carried, from #567): 9-file/3-dir shape sits above the literal delegation section-2 file/dir count, so a future run of this shape may want a 3-line ledger; not blocking.
 - Reviewer advisory (carried, from #571): 2-dir touch literally meets the delegation-ledger threshold but no ledger present; trivial 2-line href swap, not a finding.
 - Reviewer observation (carried, from #577 approve): no delegation ledger / no-delegation one-liner on a single-file two-line edit (below every threshold); recorded as observation only, not a finding.
 - Infra routing guard stays active: any `.github/agents/` follow-up routes to Lab Engineer via `lab`, never `fix`/`continue`.
 - Main tip: 52afcbfd (merge of #575).
 - Orphan-main protection holds: merge-base with main verified non-empty before merging #575 (0d8e8733, HAS-BASE), as before #577 (eafe71bc, HAS-BASE), #574 (7a9ff007, HAS-BASE), #573 (488fe345, HAS-BASE), #572 (89a7e12e, HAS-BASE) and #571 (acede055). Merge-base check due at every merge.
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent.
 - Eval-gate calibration note: surgical infra/docs/test-hardening fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables. #552 remediation and Phases 1-3 merged only after mandatory approve-eval. #577 was README-only (docs-class), so Reviewer + Tester sufficed.
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
2. #552: Phase 4 Builder arm (opencode run 38811116238) in flight at this survey; when the Builder opens the Phase 4 PR, route review at once, then Tester plus per-OS runners, then Evaluator (mandatory); merge only on approve-eval and only then close #552. NEVER close #552 on anything less than the final phase passing the full gate.
3. #552 fullscreen redesign wave: Architect blueprint (dispatched run 38791339030) still expected in parallel; later Builder phases chain as they land, each through the full gate.
4. Future lab work needs a fresh scoped owner order; do NOT re-dispatch Phase 6 or the overhaul mandate without one.
5. Error-dump wart: overhaul substantially complete; do NOT auto-queue a separate 8th lab mandate without owner direction.
6. Evaluator follow-ups (archived bench helper sys.path depth + weak assertion + stale test-count pins + levels-0 quirk + compute(inf) xfail + docs/index.md 41-row drift + legend glyph + progress header + all #574 Reviewer/Tester nits + #575 deep-audit notes + #575 Evaluator nits) queued for a future hardening vehicle.
7. Council calibration: advisory Desktop Pet audit still pending.
8. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
9. Watch: comment-post flakiness (Unicorn-HTML wart) plus the write-permission denial shape (now 6th occurrence counting #575, all success-concluded, benign) plus transient APIError provider blips (2 occurrences this day, pipeline intact) - a consecutive occurrence WITH a failure conclusion or a gate-blocking outage routes lab.
10. Standing rule: standby on all other fronts (no auto-ideate).
11. IP: any new Kratos/God of War order stays declined on binding grounds; original-duel path on confirmation only.

## OPEN QUESTIONS
 - Will the Phase 4 Builder arm (settings/scoreboard, final) open its PR cleanly on #552, and will it pass the full gate?
 - After the full fullscreen-canvas epic lands, will the Owner confirm #552 complete on real terminals, or order further iteration?
 - Will the Architect's fullscreen-canvas blueprint cover all five fronts (capability probe, full-space layout, visuals/effects, controls, customization/settings) as one unified epic?
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
