# STATE - Random factory checkpoint
 - **Updated: 2026-10-15 run 38803775353 - PR #574 Phase 2 eval arm in flight, stood down**

## PRs & Issues
 - **PRs:** Open: #574 only (Pac-Man fullscreen canvas Phase 2 Scaled Sprites Visual Effects and Theming, head d1bcc53e after Tester test-only gate commit on reviewed 781ff4a6, MERGEABLE/CLEAN, Refs #552, eval arm pending from owner /oc eval 20:39:38Z). MERGED: #573 (Pac-Man fullscreen canvas Phase 1, head 51b87ee, merged 19:50:48Z via --rebase, branch kept; Refs #552), #572 (Pac-Man real-terminal remediation for #552, head af67ea82, merged 15:47:17Z via --rebase, branch kept; Refs #552), #571 (Curator docs nav hrefs, head 7fdc22f6, merged 03:51:16Z via --rebase, branch kept; Fixes #570), #569, #567, #566, #565, #564, #563, #562, #560, #559, #558, #557, #556, #553, plus earlier. CLOSED (not merged): #555 (superseded), #547.
 - **Issues:** Open: #552 (Pac-Man terminal arcade; owner-reopened 2026-10-15T14:59:57Z, remediation #572 merged with Refs only, fullscreen-canvas Phase 1 #573 merged with Refs only, Phase 2 in eval gate - NEVER close on intermediate PRs), #70 lab-health, #42 brainstorm standing. Closed: #570 (via Fixes #570 on merge of #571), #568, #561, plus earlier.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields - exact set match verified this run, no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - #574 PHASE 2 IN EVAL GATE: Reviewer /oc approve 20:34:39Z (run 38802322160, full claims re-verified, non-blocking nits queued for Phase 3) + Tester /oc approve-test 20:38:14Z (run 38803084590, 391 passed + 2 xfailed, --verify 70/70, live evidence claimed, test-only commit d1bcc53e pushed) with no newer /oc fix; review gate preserved across the test-only commit per precedent (compare 781ff4a6...d1bcc53e: ahead-by-1, single file pacman/tests/test_tester_visuals_phase2.py). Evaluator arm pending (owner /oc eval 20:39:38Z on top of eval dispatch from run 38803563482); this run stood down per duplicate/eval-crash rule. Merge only on approve-eval. Refs #552 only until the final phase (Phase 4, Closes #552) passes the gate.
 - #552 FULLSCREEN REDESIGN WAVE: Architect dispatched run 38791339030 to chart the fullscreen-canvas epic; Builder Phase 1 landed as #573 (on main) and Phase 2 is in the gate. Each phase via full gate with real-terminal proof. Refs #552 only until owner confirms complete.
 - #552 remediation A/B/C/D DONE and merged (#572, full gate green: Reviewer approve, Tester approve-test, Evaluator approve-eval 9.8/10; main Pages deploy 38763528845 success).
 - Evaluator non-blocking follow-ups queued (not dispatched): stale "304 tests" pins in 4 doc spots (collects ~314 after Tester gate commit), weak disjunction assertion in test_tester_remediation_gate.py:48, pre-existing `--levels 0` help fall-through (exit 0 vs `--levels -1` exit 2). Plus #573 Tester advisory: compute(inf) OverflowError xfail (one-word except widening, later wave). Plus #573 Evaluator advisories: stale 41-row count in docs/index.md (pre-existing drift, curator track), O/O legend glyph ambiguity, stale branch line in progress header. Plus #574 Reviewer nits for Phase 3 (dead spans return / CHROME_GLYPHS in compose.py, unused player_glyph/wall_tint_tick/ghost_shimmer in effects.py, duplicate PLAYER_SPRITE_CLOSED + FRIGHT_COLOR drift in atlas.py, too-small message hardcoding COLS/ROWS in layout.py, int(inf) OverflowError holes + Scale __eq__/__hash__ in scale.py/effects.py, kitty same-sprite re-place erase, config version never migrates, stale progress branch field). Plus #574 Tester xfails (inf OverflowError, unreachable via real terminals). Future hardening vehicle, not a gate.
 - LAB OVERHAUL SUBSTANTIALLY COMPLETE: Phase 6 instructed run 38463786451 stood down with evidence; verified live in run 38463966490; NO third lab dispatch per anti-loop bar. Future infra needs a fresh scoped order, not a repeat Phase 6.
 - Pages: main tip 7a9ff007 (merge of #573); post-merge main-deploy watch CLEARED (Deploy static site run 38802354358 success). PR-preview wart: PR-branch `pull_request` pages runs keep failing on lab PR refs (action_required on #574 preview runs); if a main deploy fails the same way, route lab immediately.
 - Write-permission denial note (watch, not a finding): `github-actions[bot]` comment on #574 at 20:29:31Z reads "User github-actions[bot] does not have write permissions" linking run 38802277784 (maintainer pull_request-event run, concluded success). Same benign actor-gate/CLI-assert skip shape as #573 19:31:28Z and #572 15:27:18Z - third occurrence, but all link success-concluded runs, so NOT a trigger-step failure; no lab routing per loop guard. Fourth consecutive occurrence WITH a failure conclusion routes lab.
 - Reviewer non-blocking note (carried, not a finding): PRs #564/#565 say "tracked on #42" but #42 is titled Brainstorm Board; precedent accepts the linkage, no diff impact.
 - Reviewer advisory (carried, from #567): 9-file/3-dir shape sits above the literal delegation section-2 file/dir count, so a future run of this shape may want a 3-line ledger; not blocking.
 - Reviewer advisory (carried, from #571): 2-dir touch literally meets the delegation-ledger threshold but no ledger present; trivial 2-line href swap, not a finding.
 - Infra routing guard stays active: any `.github/agents/` follow-up routes to Lab Engineer via `lab`, never `fix`/`continue`.
 - Main tip: 7a9ff007 (merge of #573).
 - Orphan-main protection holds: merge-base with main verified non-empty before merging #573 (488fe345, HAS-BASE), as before #572 (89a7e12e, HAS-BASE) and #571 (acede055). Merge-base check due at every merge.
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent.
 - Eval-gate calibration note: surgical infra/docs/test-hardening fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables. #552 remediation and Phase 1 merged only after mandatory approve-eval.
 - Eval-crash rule (amended): eval run dying inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown 30 min same-signature). Second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths do not count; one exception per cooldown window max.
 - Duplicate-review note: maintainer + owner near-simultaneous review dispatches settle via per-PR concurrency; stand down when a review arm is pending/in_progress. Same applies to eval arms.
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
2. #574 Phase 2 in eval gate (eval arm pending on head d1bcc53e): on `approve-eval` with no newer `/oc fix`, merge via --rebase (keep branch), verify main Pages deploy, keep #552 OPEN (Refs only), then auto-chain Phase 3 via build on #552. On eval `fix` verdict, route Fixer. On eval AGENT-STEP silent death with no decision file/comment, retry eval once per 30-min cooldown; second death routes lab. NEVER auto-close #552 (final Phase 4 carries Closes #552).
3. #552 fullscreen redesign wave: Architect blueprint (dispatched run 38791339030) still expected in parallel; later Builder phases (Phase 3, Phase 4) chain as they land, each through the full gate. Refs #552 only until owner confirms complete.
4. Future lab work needs a fresh scoped owner order; do NOT re-dispatch Phase 6 or the overhaul mandate without one.
5. Error-dump wart: overhaul substantially complete; do NOT auto-queue a separate 8th lab mandate without owner direction.
6. Evaluator follow-ups (archived bench helper sys.path depth + weak assertion + stale test-count pins + levels-0 quirk + compute(inf) xfail + docs/index.md 41-row drift + legend glyph + progress header + all #574 Reviewer/Tester nits) queued for a future hardening vehicle.
7. Council calibration: advisory Desktop Pet audit still pending.
8. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
9. Watch: comment-post flakiness (Unicorn-HTML wart) plus the write-permission denial shape (now 3rd occurrence on #574, all success-concluded, benign) - a consecutive occurrence WITH a failure conclusion routes lab.
10. Watch: post-merge main Pages deploy for 7a9ff007 - CLEARED (38802354358 success).
11. Standing rule: standby on all other fronts (no auto-ideate).
12. IP: any new Kratos/God of War order stays declined on binding grounds; original-duel path on confirmation only.

## OPEN QUESTIONS
 - Will Phase 2 PR #574 (head d1bcc53e) pass the mandatory Evaluator audit with real-terminal proof?
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