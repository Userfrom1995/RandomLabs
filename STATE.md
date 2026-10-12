# STATE - Random factory checkpoint
 - **Updated: 2026-10-12 run 38280110828 - Phase 4 PR #558 Evaluator FIX 9.2/10, Fixer dispatched**

## PRs & Issues
 - **PRs:** Open: #558 (Phase 4 Input Audio Menus and Shell, head 43d77afe, MERGEABLE, Refs #552; review approve 188 green + approve-test 202 green + eval FIX 9.2/10 menu-clip defect, fix dispatched). MERGED: #557 (Phase 3, 99d401fa, Refs #552; approve 141 green + approve-test 150 green + eval APPROVE-EVAL 9.82/10 on head 371f13de), #556 (Phase 2, 97743bdc, Refs #552; approve + approve-test 114 green + eval APPROVE-EVAL 9.8/10 on head 65ef79b5), #553 (Phase 1, 06093176, Refs #552), #551, #550, #548, #545, #543, #541, #542, #540, #539, #538, #537, #536, #533, #534, #535, #531, #529, #527. CLOSED (not merged): #555 (Curator README sync, superseded by #553, branch kept). CLOSED: #547 (superseded by #548).
 - **Issues:** Open: #70 lab-health, #42 brainstorm standing, #552 Pac-Man tracking (Phase 1 + Phase 2 + Phase 3 merged as Refs, Phase 4 PR #558 in fix). Closed: #554 (fulfilled by #553), #549, #546, #544, #532, #530, #528, #526, #515, #518, #504, #507, #498, #436-GUI-detach-unknown (verify; pending owner direction).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields - exact set match verified this run, no drift (20 yml files incl. maintainer re-confirmed this run). `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - Pac-Man #552: Phase 1 MERGED as Refs #552 (approve + approve-test 81 green + eval APPROVE-EVAL 9.82/10 on head 0a0417b9). Phase 2 MERGED as Refs #552 (approve + approve-test 114 green + eval APPROVE-EVAL 9.8/10 on head 65ef79b5, main now 97743bdc). Phase 3 MERGED as Refs #552 (approve 141 green + approve-test 150 green + eval APPROVE-EVAL 9.82/10 on head 371f13de, main now 99d401fa). Phase 4 (Input Audio Menus and Shell) on PR #558 (head 43d77afe: 5 builder commits + 1 tester commit, 202 green; Reviewer approve on 82789548 + Tester approve-test on 43d77afe + Evaluator FIX 9.2/10 blocking menu-clip defect at screens.py:55/:57/:68; Fixer dispatched this run); #552 stays open until the final phase passes.
 - PR #558 merge rule: body Refs #552, #552 stays open until final phase passes test and eval.
 - Fixer production-code pushes void the prior review round per the rebase-gate rule; fresh review/test/eval required after each. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent (43d77afe verified prior run: 1 file, pacman/tests/test_tester_phase4.py only, via compare 82789548...43d77afe).
 - Bot-permission noise comment on #558 (16:40:41Z, links maintainer pull_request run 38279025402): CLI actor-assert on the bot-authored PR push, expected gate behavior per precedent (runs 38244046489 on #553, 38266598028 on #556, 38276130661 on #557, 38279025402 on #558) - not a failure, no lab escalation.
 - Run sweep: zero failure/timed_out (last-25 check this run returns 0 actionable; remainder skipped/cancelled maintainer workflow_run entries and skipped non-matching issue_comment arms, plus this in_progress run).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent.
 - Eval-gate calibration note: surgical infra/docs/test-harness fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables.
 - Eval-crash rule (amended): eval run dying inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown 30 min same-signature). Second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths do not count; one exception per cooldown window max.
 - Duplicate-review note: maintainer + owner near-simultaneous review dispatches settle via per-PR concurrency; stand down when a review arm is pending/in_progress.
 - Error-dump wart status: 13th recurrence logged; escalation note posted to Owner via ping on #70 (run 37552237432). 8th lab mandate withheld per loop guard - awaiting Owner direction.
 - Comment-post flakiness wart: a `github-actions[bot]` comment on #553 at 12:23:43Z contains a raw GitHub Unicorn error HTML page - single occurrence so far, watch for recurrence, route lab on second consecutive trigger/comment-step failure.
 - Evaluator follow-up VERIFIED live on main: `archive/prism/benchmarks/bench_vs_codecs.py:28` sys.path depth bug. Queued as future Builder/test-hardening vehicle.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` names. Lab to assess on second consecutive trigger-step failure.
 - Standing-board close guard: #70 must never carry `Closes #70` in a PR body; merge as Refs only.
 - Evaluator non-blocking notes (do not gate, carried): DEC2026 SYNC vs ansi.py DCS form (Phase 3 concern), cumulative event-log growth, PACMAN_RENDERER env unreachable from CLI, `--renderer auto` rejected, combined `--maze-check --self-check` drops self-check, progress tracker duplicated `## Next steps` heading, Kitty X/Y cell convention on real terminal, unlabeled maze excerpt caption. Plus Phase 2 notes: Elroy stage-2 speed stacking (ghosts.py:264), notify_dots overflow drop (ghosts.py:151), clear-clobbers-dying race (game.py:149), Elroy-2 clock spin (ghosts.py:204). Plus Phase 4 notes: bare `level-clear` falls through while `level:N` plays the jingle at spawn (shell/app.py), `raw is None` EOF branch unreachable, per-frame preview Game on TITLE.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists; watch for new workflow drift).
2. Pac-Man: react to Fixer push on PR #558, then dispatch fresh review (review -> test -> eval). Design Council (`/oc design`) before visual polish declared done.
3. Pages re-confirm only after new merges (last merge 99d401fa deploy success already recorded).
4. Main tip re-confirm (last verified 99d401fa prior run via ls-remote).
5. Error-dump wart: await Owner direction; do NOT auto-queue an 8th lab mandate.
6. Evaluator follow-up (archived bench helper path + weak assertion) queued for a future hardening vehicle.
7. Council calibration: advisory Desktop Pet audit still pending.
8. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
9. Watch: comment-post flakiness (Unicorn-HTML wart) - second occurrence routes lab.
10. Standing rule: standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Will the Fixer rewrap land all menu lines within 28 cols plus the regression test?
 - How will the fresh review/test/eval round rule on repaired PR #558?
 - Owner direction on the error-dump wart (escalation posted 2026-10-07; 8th mandate withheld)?
 - Evaluator follow-up hardening vehicle (archived bench helper sys.path depth + weak assertion)?
 - What caused the ~50-min agent-step death in eval run 37362541465?
 - Should the stale `opencode/lab-70-docs-sync` branch be deleted, or kept as archaeology?
 - Should the maintainer trigger poster re-checkout main after in-session merges before reading its own mapping?
 - Opencode verify-step warts: (1) auto-retry counter per-attempt-window vs all-time? (2) branch pattern accepting `opencode/<issue>-*`?
 - What shape will the release pipeline take at publish time going forward?
 - Will the Owner open a PR from the `opencode/issue436-gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor)?

 - Hephaestus, the Maintainer
