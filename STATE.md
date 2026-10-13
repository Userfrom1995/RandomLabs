# STATE - Random factory checkpoint
 - **Updated: 2026-10-13 run 38459290981 - lab re-dispatched WITH instruction after bare-trigger standby no-op**

## PRs & Issues
 - **PRs:** Open: none. MERGED: #563 (Lab Engineer Phase 1: delegation protocol, head 7b027aec, `.github/agents/` prompt-only +94/-7, merge commit 2c2fd54 via --rebase, branch kept; Reviewer approve 17:16:16Z + Tester approve-test 17:16:58Z on head 7b027aec, no fix after; body Refs #42 only), #562 (Curator: Pac-Man graduation + Poolduel archive + landing sync, merge commit 8461c69 via --rebase, branch kept; Reviewer approve 00:20:30Z + Tester approve-test 00:21:23Z on head 3ef23d0e, no fix after), #560 (Pac-Man Final, 1a89293, Closes #552), #559, #558, #557, #556, #553, plus earlier. CLOSED (not merged): #555 (superseded), #547.
 - **Issues:** Open: #70 lab-health, #42 brainstorm standing (lab overhaul epic AND single source of truth for the restructuring: Phase 1 merged as Refs #42, Phase 2+ sub-issues/PRs all link here; confirmed no separate vision issue exists open or closed, so nothing to reopen). Closed: #561 (Curator audit, auto-closed by Fixes #561 on merge of #562), #552 Pac-Man tracking COMPLETED 2026-10-12, plus earlier.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields - exact set match verified this run, no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - LAB OVERHAUL Phase 2+ RE-DISPATCHED WITH INSTRUCTION: halt-challenge dispatch from run 38458890082 fired as bare `/oc lab` (owner-authored comment 6154015551 at 19:58:37Z, the hardcoded trigger post) and Lab Engineer run 38459117892 (success 1m20s) treated it as taskless and stood by (verification only, no commits/PRs). Owner pinged `/oc maintainer` at 19:59:56Z (this run 38459290981). Re-dispatched `{"action": "lab", "issue": 42, "instruction": "<Phase 2+ execution orders>"}` - the poster appends instruction to `/oc lab`, so this is a new strategy, not a same-signature flap (cooldown does not apply; fresh owner demand plus changed payload). Orders: decompose into scoped/prioritized sub-issues linked to #42, ship Phase 2 as next small review-gated PR, chain phases, track progress/blockers/tests on #42.
 - If the instructed lab run stands by a second time, escalate the pattern (lab-prompt hardening or owner report) instead of re-dispatching bare.
 - Infra routing guard stays active: any `.github/agents/` follow-up routes to Lab Engineer via `lab`, never `fix`/`continue`.
 - Main tip: 2c2fd54 (merge of #563; not re-verified this run, no merges since).
 - Orphan-main protection held on #563 (merge-base returned 8461c69 before merge).
 - Reviewer non-blocking carry-over (not gated, future lab vehicle): `.github/workflows/poolduel-{m1,m2,m9,m10-soak}.yml` still reference `poolduel/results/...`, dormant (workflow_dispatch-only). Route to Lab Engineer only if the Owner asks.
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent.
 - Eval-gate calibration note: surgical infra/docs/test-hardening fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables.
 - Eval-crash rule (amended): eval run dying inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown 30 min same-signature). Second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths do not count; one exception per cooldown window max.
 - Duplicate-review note: maintainer + owner near-simultaneous review dispatches settle via per-PR concurrency; stand down when a review arm is pending/in_progress.
 - Error-dump wart status: 13th recurrence logged; escalation note posted to Owner via ping on #70 (run 37552237432). 8th lab mandate withheld per loop guard - awaiting Owner direction. (The overhaul may subsume this; Lab Engineer to assess, no separate mandate this run.)
 - Comment-post flakiness wart: a `github-actions[bot]` comment on #553 at 12:23:43Z contains a raw GitHub Unicorn error HTML page - single occurrence so far, watch for recurrence, route lab on second consecutive trigger/comment-step failure.
 - Evaluator follow-up VERIFIED live on main: `archive/prism/benchmarks/bench_vs_codecs.py:28` sys.path depth bug. Queued as future Builder/test-hardening vehicle.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` names. Lab to assess on second consecutive trigger-step failure.
 - Standing-board close guard: #70 must never carry `Closes #70` in a PR body; merge as Refs only. (#42 same: Refs only - enforced on #563.)
 - Evaluator non-blocking notes (do not gate, carried): DEC2026 SYNC vs ansi.py DCS form (Phase 3 concern), cumulative event-log growth, PACMAN_RENDERER env unreachable from CLI, `--renderer auto` rejected, combined `--maze-check --self-check` drops self-check, progress tracker duplicated `## Next steps` heading, Kitty X/Y cell convention on real terminal, unlabeled maze excerpt caption. Plus Phase 2 notes: Elroy stage-2 speed stacking (ghosts.py:264), notify_dots overflow drop (ghosts.py:151), clear-clobbers-dying race (game.py:149), Elroy-2 clock spin (ghosts.py:204). Plus Phase 4 notes: bare `level-clear` falls through while `level:N` plays the jingle at spawn (shell/app.py), `raw is None` EOF branch unreachable, per-frame preview Game on TITLE. Plus Phase 5 notes: `--levels 0` shows help exit 0 (argparse default=0 indistinguishable from flag-absent; coherent UX, dead-for-zero guard only), score/config writes lack tmp-file plus rename atomicity (contained by catch-and-fallback loaders), `--modes` one-liners and `--levels` header lean jargony. Plus Final Phase advisory nits (post-approval, non-blocking): non-clickable code-span cross-links, one `--fps up to 240` unit, footer lab voice; plus re-review nit: duplicate ShellState import (verify.py:144 and :172 as _ShellState).

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists; watch for new workflow drift).
2. Expect Lab Engineer sub-issues and Phase 2 PR on #42 from the INSTRUCTED dispatch; route each through review/test gates; merge as Refs #42, keep #42 open.
3. If Phase 2 lands as intermediate, immediately chain the next phase per auto-chain rule (never halt on intermediate PRs).
4. If instructed lab run stands by again with no PR and no sub-issues, escalate the bare/instructed-standby pattern (do NOT loop a third identical dispatch).
5. Error-dump wart: overhaul may subsume; do NOT auto-queue a separate 8th lab mandate.
6. Evaluator follow-up (archived bench helper sys.path depth + weak assertion) queued for a future hardening vehicle.
7. Council calibration: advisory Desktop Pet audit still pending.
8. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
9. Watch: comment-post flakiness (Unicorn-HTML wart) - second occurrence routes lab.
10. Standing rule: standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Will the instructed lab dispatch break the standby loop and land Phase 2 sub-issues + PR?
 - Should the lab prompt be hardened so a bare `/oc lab` on an open mandate defaults to executing the mandate instead of standing by?
 - Which skills will survive quality/security review and actually get integrated and used?
 - How will the Lab Engineer sequence the remaining overhaul phases after Phase 2?
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