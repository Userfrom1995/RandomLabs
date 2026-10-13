# STATE - Random factory checkpoint
 - **Updated: 2026-10-13 run 38473892558 - schedule standby, overhaul complete, no drift**

## PRs & Issues
 - **PRs:** Open: none. MERGED: #567 (Lab Engineer Phase 5 continuous-improvement loop, head 016ee574, merge commit acede055 via --rebase, branch kept; body Refs #42 only), #566 (Phase 4 quality gates, head 661833a6, merge commit af4aaf1, branch kept; Refs #42), #565 (Phase 3 skills registry, head 5e41f24, merge commit 9bce3e0, branch kept; Refs #42), #564 (Phase 2 delegation coverage, head 8ada09de, merge commit 0ed8f17, branch kept; Refs #42), #563 (Phase 1 delegation protocol, head 7b027aec, merge commit 2c2fd54, branch kept; Refs #42), #562 (Curator Pac-Man graduation + Poolduel archive, merge commit 8461c69, branch kept), #560 (Pac-Man Final, 1a89293, Closes #552), #559, #558, #557, #556, #553, plus earlier. CLOSED (not merged): #555 (superseded), #547.
 - **Issues:** Open: #70 lab-health, #42 brainstorm standing (lab overhaul epic AND single source of truth; Phases 1-5 merged as Refs #42, Phase 6 instructed run stood down with evidenced completion, accepted run 38463966490). Closed: #561 (Curator audit, auto-closed by Fixes #561 on merge of #562), #552 Pac-Man tracking COMPLETED 2026-10-12, plus earlier.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields - exact set match verified this run, no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - LAB OVERHAUL SUBSTANTIALLY COMPLETE: Phase 6 instructed run 38463786451 (20:33:57Z) stood down with evidence (two-knob free, 20 workflow pins free, allowlist exact match, docs bindings present, 0 open PRs). Verified live in run 38463966490; NO third lab dispatch per anti-loop bar from run 38459290981. Future infra needs a fresh scoped order, not a repeat Phase 6.
 - Pages GREEN: main deploy 38463785775 success at 20:33:40Z (post-#567). Prior redeploy 38463702824 cancelled (superseded); main deploys 20:25:48Z/20:26:35Z success. Preview-refs-only wart holds (5th data point: Phase 5 head preview failure vs main success); main deploys are the binding signal.
 - Pages preview wart (watch, fifth data point): PR-branch `pull_request` pages runs keep failing on lab PR refs even though Reviewer/Tester verified all 20 workflows parse clean. If a main deploy fails the same way, route lab immediately.
 - Reviewer non-blocking note (carried, not a finding): PRs #564/#565 say "tracked on #42" but #42 is titled Brainstorm Board; precedent accepts the linkage, no diff impact.
 - Reviewer advisory (carried, from #567): 9-file/3-dir shape sits above the literal delegation section-2 file/dir count, so a future run of this shape may want a 3-line ledger to avoid threshold debate; not blocking.
 - Infra routing guard stays active: any `.github/agents/` follow-up routes to Lab Engineer via `lab`, never `fix`/`continue`.
 - Main tip: acede055 (merge of #567; not re-verified this run, no merges since).
 - Orphan-main protection held on #567 (merge-base returned af4aaf1 before merge).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent.
 - Eval-gate calibration note: surgical infra/docs/test-hardening fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables.
 - Eval-crash rule (amended): eval run dying inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown 30 min same-signature). Second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths do not count; one exception per cooldown window max.
 - Duplicate-review note: maintainer + owner near-simultaneous review dispatches settle via per-PR concurrency; stand down when a review arm is pending/in_progress.
 - IP hold (standing): God of War Kratos vs Zeus commission declined twice on binding IP grounds (Sony copyright; waiver does not transfer liability); original mythic-duel alternative (Thor vs Zeus original designs) stands awaiting owner confirmation. Envelope context in this run carries no new Kratos order.
 - Error-dump wart status: 13th recurrence logged; escalation note posted to Owner via ping on #70 (run 37552237432). 8th lab mandate withheld per loop guard - awaiting Owner direction. (The overhaul may subsume this; Lab Engineer assessed pipeline green, no separate mandate.)
 - Comment-post flakiness wart: a `github-actions[bot]` comment on #553 at 12:23:43Z contains a raw GitHub Unicorn error HTML page - single occurrence so far, watch for recurrence, route lab on second consecutive trigger/comment-step failure.
 - Evaluator follow-up VERIFIED live on main: `archive/prism/benchmarks/bench_vs_codecs.py:28` sys.path depth bug. Queued as future Builder/test-hardening vehicle.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` names. Lab to assess on second consecutive trigger-step failure.
 - Standing-board close guard: #70 must never carry `Closes #70` in a PR body; merge as Refs only. (#42 same: Refs only - enforced on #563, #564, #565, #566, #567.)
 - Evaluator non-blocking notes (do not gate, carried): DEC2026 SYNC vs ansi.py DCS form (Phase 3 concern), cumulative event-log growth, PACMAN_RENDERER env unreachable from CLI, `--renderer auto` rejected, combined `--maze-check --self-check` drops self-check, progress tracker duplicated `## Next steps` heading, Kitty X/Y cell convention on real terminal, unlabeled maze excerpt caption. Plus Phase 2 notes: Elroy stage-2 speed stacking (ghosts.py:264), notify_dots overflow drop (ghosts.py:151), clear-clobbers-dying race (game.py:149), Elroy-2 clock spin (ghosts.py:204). Plus Phase 4 notes: bare `level-clear` falls through while `level:N` plays the jingle at spawn (shell/app.py), `raw is None` EOF branch unreachable, per-frame preview Game on TITLE. Plus Phase 5 notes: `--levels 0` shows help exit 0 (argparse default=0 indistinguishable from flag-absent; coherent UX, dead-for-zero guard only), score/config writes lack tmp-file plus rename atomicity (contained by catch-and-fallback loaders), `--modes` one-liners and `--levels` header lean jargony. Plus Final Phase advisory nits (post-approval, non-blocking): non-clickable code-span cross-links, one `--fps up to 240` unit, footer lab voice; plus re-review nit: duplicate ShellState import (verify.py:144 and :172 as _ShellState).

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists; watch for new workflow drift).
2. Routine survey; main tip re-confirm only after new merges.
3. Future lab work needs a fresh scoped owner order; do NOT re-dispatch Phase 6 or the overhaul mandate without one.
4. Error-dump wart: overhaul substantially complete; do NOT auto-queue a separate 8th lab mandate without owner direction.
5. Evaluator follow-up (archived bench helper sys.path depth + weak assertion) queued for a future hardening vehicle.
6. Council calibration: advisory Desktop Pet audit still pending.
7. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
8. Watch: comment-post flakiness (Unicorn-HTML wart) - second occurrence routes lab.
9. Watch: main Pages deploys - failure routes lab immediately.
10. Standing rule: standby on all other fronts (no auto-ideate).
11. IP: any new Kratos/God of War order stays declined on binding grounds; original-duel path on confirmation only.

## OPEN QUESTIONS
 - After Phase 6 acceptance, is there any residual overhaul scope the owner still wants (or is the mandate closed)?
 - Are the PR-preview pages failures a systematic defect on PR refs (5th data point confirms pattern) or platform blips?
 - Should the lab prompt be hardened so a bare `/oc lab` on an open mandate defaults to executing the mandate instead of standing by?
 - Where does the overhaul epic actually live - should a dedicated vision issue be split off #42 (Reviewer note on #564/#565)?
 - Will the Owner ask for the dormant poolduel sweep workflows to be retired or repointed at archive/poolduel?
 - Was the Pages 500 a one-off platform blip, or the start of an outage window? (Single occurrence 17:14:52Z on 2026-09-29; all deploys since success.)
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