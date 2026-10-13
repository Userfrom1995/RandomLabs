# STATE - Random factory checkpoint
 - **Updated: 2026-10-13 run 38460410353 - MERGED #564 (lab Phase 2 delegation coverage), auto-chained Phase 3 via instructed lab**

## PRs & Issues
 - **PRs:** Open: none. MERGED: #564 (Lab Engineer Phase 2 delegation coverage, head 8ada09de, 12 files +16/-9 prompt prose + doc sync, merge commit 0ed8f17 via --rebase, branch kept; Reviewer approve 20:07:15Z + Tester approve-test 20:08:08Z on head 8ada09de, no fix after; body Refs #42 only), #563 (Lab Engineer Phase 1: delegation protocol, head 7b027aec, merge commit 2c2fd54 via --rebase, branch kept; body Refs #42 only), #562 (Curator: Pac-Man graduation + Poolduel archive + landing sync, merge commit 8461c69 via --rebase, branch kept), #560 (Pac-Man Final, 1a89293, Closes #552), #559, #558, #557, #556, #553, plus earlier. CLOSED (not merged): #555 (superseded), #547.
 - **Issues:** Open: #70 lab-health, #42 brainstorm standing (lab overhaul epic AND single source of truth; Phase 1 merged as Refs #42, Phase 2 merged as Refs #42, Phase 3 dispatched; confirmed no separate vision issue exists open or closed). Closed: #561 (Curator audit, auto-closed by Fixes #561 on merge of #562), #552 Pac-Man tracking COMPLETED 2026-10-12, plus earlier.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields - exact set match verified this run, no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - LAB OVERHAUL Phase 3 AUTO-CHAINED WITH INSTRUCTION: Phase 2 PR #564 merged 20:09:00Z as 0ed8f17. Per the intermediate-PR auto-chain rule, dispatched `{"action": "lab", "issue": 42, "instruction": "<Phase 3 execution orders>"}` - skills-registry follow-up plus design-specialist (design-ux/visual/motion) delegation wiring only if fanning out observed (per PR #564 body's Remaining section). Standby not acceptable while mandate is open.
 - Pages redeploy run 38460602447 dispatched in-session on main after the #564 merge (same precedent as #562/#563); next run confirms it green.
 - Pages preview wart (new, watch): PR-branch `pull_request` pages run 38460088260 on the exact merged head 8ada09de failed before any job started ("workflow file issue") even though Reviewer/Tester verified all 20 workflows parse clean. Likely transient/preview-scoped; main deploys are the binding signal. If a main deploy fails the same way, route lab immediately.
 - Infra routing guard stays active: any `.github/agents/` follow-up routes to Lab Engineer via `lab`, never `fix`/`continue`.
 - Main tip: 0ed8f17 (merge of #564).
 - Orphan-main protection held on #564 (merge-base returned 2c2fd54e before merge).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent.
 - Eval-gate calibration note: surgical infra/docs/test-hardening fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables.
 - Eval-crash rule (amended): eval run dying inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown 30 min same-signature). Second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths do not count; one exception per cooldown window max.
 - Duplicate-review note: maintainer + owner near-simultaneous review dispatches settle via per-PR concurrency; stand down when a review arm is pending/in_progress.
 - Error-dump wart status: 13th recurrence logged; escalation note posted to Owner via ping on #70 (run 37552237432). 8th lab mandate withheld per loop guard - awaiting Owner direction. (The overhaul may subsume this; Lab Engineer to assess, no separate mandate this run.)
 - Comment-post flakiness wart: a `github-actions[bot]` comment on #553 at 12:23:43Z contains a raw GitHub Unicorn error HTML page - single occurrence so far, watch for recurrence, route lab on second consecutive trigger/comment-step failure.
 - Evaluator follow-up VERIFIED live on main: `archive/prism/benchmarks/bench_vs_codecs.py:28` sys.path depth bug. Queued as future Builder/test-hardening vehicle.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` names. Lab to assess on second consecutive trigger-step failure.
 - Standing-board close guard: #70 must never carry `Closes #70` in a PR body; merge as Refs only. (#42 same: Refs only - enforced on #563 and #564.)
 - Evaluator non-blocking notes (do not gate, carried): DEC2026 SYNC vs ansi.py DCS form (Phase 3 concern), cumulative event-log growth, PACMAN_RENDERER env unreachable from CLI, `--renderer auto` rejected, combined `--maze-check --self-check` drops self-check, progress tracker duplicated `## Next steps` heading, Kitty X/Y cell convention on real terminal, unlabeled maze excerpt caption. Plus Phase 2 notes: Elroy stage-2 speed stacking (ghosts.py:264), notify_dots overflow drop (ghosts.py:151), clear-clobbers-dying race (game.py:149), Elroy-2 clock spin (ghosts.py:204). Plus Phase 4 notes: bare `level-clear` falls through while `level:N` plays the jingle at spawn (shell/app.py), `raw is None` EOF branch unreachable, per-frame preview Game on TITLE. Plus Phase 5 notes: `--levels 0` shows help exit 0 (argparse default=0 indistinguishable from flag-absent; coherent UX, dead-for-zero guard only), score/config writes lack tmp-file plus rename atomicity (contained by catch-and-fallback loaders), `--modes` one-liners and `--levels` header lean jargony. Plus Final Phase advisory nits (post-approval, non-blocking): non-clickable code-span cross-links, one `--fps up to 240` unit, footer lab voice; plus re-review nit: duplicate ShellState import (verify.py:144 and :172 as _ShellState).

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists; watch for new workflow drift).
2. Confirm Pages redeploy run 38460602447 green; if it failed with the same pre-job "workflow file issue" as preview run 38460088260, route lab immediately.
3. Expect Lab Engineer Phase 3 PR on #42 from the INSTRUCTED dispatch; route through review/test gates; merge as Refs #42, keep #42 open.
4. If Phase 3 lands as intermediate, immediately chain the next phase per auto-chain rule (never halt on intermediate PRs).
5. If instructed lab run stands by again with no PR and no sub-issues, escalate the bare/instructed-standby pattern (do NOT loop a third identical dispatch).
6. Error-dump wart: overhaul may subsume; do NOT auto-queue a separate 8th lab mandate.
7. Evaluator follow-up (archived bench helper sys.path depth + weak assertion) queued for a future hardening vehicle.
8. Council calibration: advisory Desktop Pet audit still pending.
9. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
10. Watch: comment-post flakiness (Unicorn-HTML wart) - second occurrence routes lab.
11. Standing rule: standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Will the instructed Phase 3 lab dispatch land a PR, or stand by (escalation bar from run 38459290981 still applies)?
 - Was preview run 38460088260's pre-job failure a one-off platform blip or a real pages.yml defect on PR refs?
 - Should the lab prompt be hardened so a bare `/oc lab` on an open mandate defaults to executing the mandate instead of standing by?
 - Which skills will survive quality/security review and actually get integrated and used?
 - How will the Lab Engineer sequence the remaining overhaul phases after Phase 3?
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