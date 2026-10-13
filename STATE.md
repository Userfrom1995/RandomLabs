# STATE - Random factory checkpoint
 - **Updated: 2026-10-13 run 38326659009 - issue_comment on #562, Curator PR review in flight, standby**

## PRs & Issues
 - **PRs:** Open: #562 (Curator: Pac-Man graduation + Poolduel archive + landing sync, head 3ef23d0e, MERGEABLE/CLEAN, branch opencode/issue561-curate-pacman-graduate-poolduel-archive, body Fixes #561; owner /oc review 00:19:11Z queued opencode-review pending, owner /oc maintainer follows). MERGED: #560 (Pac-Man Final, 1a89293, Closes #552), #559, #558, #557, #556, #553, plus earlier. CLOSED (not merged): #555 (superseded), #547.
 - **Issues:** Open: #561 (Curator audit: graduate Pac-Man, archive Poolduel - COVERED by open PR #562, in review), #70 lab-health, #42 brainstorm standing. Closed: #552 Pac-Man tracking COMPLETED 2026-10-12, plus earlier.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields - exact set match verified this run, no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - PR #562: IN REVIEW. Reviewer arm pending (opencode-review queued 00:19:23Z on head 3ef23d0e); no approve/fix verdict yet. No merge authorized until review (plus test for a public-surface PR per precedent) clears. #561 stays open until merge.
 - Post-Pac-Man standby otherwise: zero failure/timed_out in scope this run (recent entries all completed/skipped success, cancelled maintainer skips, or this in_progress run); no untriaged issues (only boards + #561 covered by #562); no ideate.
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent.
 - Eval-gate calibration note: surgical infra/docs/test-harness fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables.
 - Eval-crash rule (amended): eval run dying inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown 30 min same-signature). Second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths do not count; one exception per cooldown window max.
 - Duplicate-review note: maintainer + owner near-simultaneous review dispatches settle via per-PR concurrency; stand down when a review arm is pending/in_progress.
 - Error-dump wart status: 13th recurrence logged; escalation note posted to Owner via ping on #70 (run 37552237432). 8th lab mandate withheld per loop guard - awaiting Owner direction.
 - Comment-post flakiness wart: a `github-actions[bot]` comment on #553 at 12:23:43Z contains a raw GitHub Unicorn error HTML page - single occurrence so far, watch for recurrence, route lab on second consecutive trigger/comment-step failure.
 - Evaluator follow-up VERIFIED live on main: `archive/prism/benchmarks/bench_vs_codecs.py:28` sys.path depth bug. Queued as future Builder/test-hardening vehicle.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` names. Lab to assess on second consecutive trigger-step failure.
 - Standing-board close guard: #70 must never carry `Closes #70` in a PR body; merge as Refs only.
 - Evaluator non-blocking notes (do not gate, carried): DEC2026 SYNC vs ansi.py DCS form (Phase 3 concern), cumulative event-log growth, PACMAN_RENDERER env unreachable from CLI, `--renderer auto` rejected, combined `--maze-check --self-check` drops self-check, progress tracker duplicated `## Next steps` heading, Kitty X/Y cell convention on real terminal, unlabeled maze excerpt caption. Plus Phase 2 notes: Elroy stage-2 speed stacking (ghosts.py:264), notify_dots overflow drop (ghosts.py:151), clear-clobbers-dying race (game.py:149), Elroy-2 clock spin (ghosts.py:204). Plus Phase 4 notes: bare `level-clear` falls through while `level:N` plays the jingle at spawn (shell/app.py), `raw is None` EOF branch unreachable, per-frame preview Game on TITLE. Plus Phase 5 notes: `--levels 0` shows help exit 0 (argparse default=0 indistinguishable from flag-absent; coherent UX, dead-for-zero guard only), score/config writes lack tmp-file plus rename atomicity (contained by catch-and-fallback loaders), `--modes` one-liners and `--levels` header lean jargony. Plus Final Phase advisory nits (post-approval, non-blocking): non-clickable code-span cross-links, one `--fps up to 240` unit, footer lab voice; plus re-review nit: duplicate ShellState import (verify.py:144 and :172 as _ShellState).

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists; watch for new workflow drift).
2. PR #562: react to Reviewer verdict (approve -> dispatch test; findings -> dispatch fix). Then test -> merge (Fixes #561 closes the audit issue).
3. Main tip re-confirm only after new merges.
4. Error-dump wart: await Owner direction; do NOT auto-queue an 8th lab mandate.
5. Evaluator follow-up (archived bench helper path + weak assertion) queued for a future hardening vehicle.
6. Council calibration: advisory Desktop Pet audit still pending.
7. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
8. Watch: comment-post flakiness (Unicorn-HTML wart) - second occurrence routes lab.
9. Standing rule: standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Will the Reviewer approve #562 on the first round, or request public-surface fixes?
 - Was the Pages 500 a one-off platform blip, or the start of an outage window? (Single occurrence 17:14:52Z; all deploys since success.)
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
