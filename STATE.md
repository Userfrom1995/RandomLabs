# STATE - Random factory checkpoint
 - **Updated: 2026-10-12 run 38265218854 - PR #553 Phase 1 merged (06093176), PR #555 closed superseded, #554 closed fulfilled, Phase 2 build chained**

## PRs & Issues
 - **PRs:** Open: #553 MERGED this run via rebase (head 0a0417b9, commit 06093176 on main, Refs #552). CLOSED (not merged): #555 (Curator README sync, head c7196cb4 - conflicted with #553's richer README entry on the same line, content fully subsumed; closed as superseded, branch kept). MERGED: #553, #551, #550, #548, #545, #543, #541, #542, #540, #539, #538, #537, #536, #533, #534, #535, #531, #529, #527. CLOSED: #547 (superseded by #548).
 - **Issues:** Open: #70 lab-health, #42 brainstorm standing, #552 Pac-Man tracking (Phase 1 merged as Refs, Phase 2 build dispatched this run). Closed: #554 (fulfilled by #553's README entry on main), #549, #546, #544, #532, #530, #528, #526, #515, #518, #504, #507, #498, #436-GUI-detach-unknown (verify; pending owner direction).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields - exact set match verified this run, no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - Pac-Man #552: Phase 1 (Deterministic Engine Core and Maze Foundation) MERGED as Refs #552 - review approve + test approve-test (81 green) + binding eval APPROVE-EVAL 9.82/10, all on head 0a0417b9, merge CLEAN. Main tip now 06093176. Phase 2 (Ghost Personalities and Mode Timing per tracker) build dispatched this run via decision.json.
 - PR #553 merge rule honored: Refs #552, #552 stays open until final phase passes test and eval.
 - Curator #554/#555 resolved without merge: #553's README Active Projects entry (Pac-Man Terminal Arcade with website/README links) is richer than #555's one-liner and sits on the same line - merging #555 post-#553 would have duplicated the entry. #555 closed superseded with explanation, #554 closed fulfilled.
 - Main tip 06093176 (this run's #553 rebase-merge; prior tip 1780edba was the owner cache-poison revival push). Pages deploy for 06093176 not yet observed at survey time (last pages success 14:45:15Z on 1780edba) - re-confirm next run; no forcing needed, push trigger should queue it.
 - Run sweep: zero new failures (only cancelled/skipped maintainer workflow_run entries, skipped non-matching issue_comment arms, success pages deploys).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent.
 - Eval-gate calibration note: surgical infra/docs/test-harness fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables.
 - Eval-crash rule (amended): eval run dying inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown 30 min same-signature). Second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths do not count; one exception per cooldown window max.
 - Duplicate-test note: maintainer + owner near-simultaneous test dispatches settle via per-PR concurrency; stand down when a test arm is pending/in_progress.
 - Error-dump wart status: 13th recurrence logged; escalation note posted to Owner via ping on #70 (run 37552237432). 8th lab mandate withheld per loop guard - awaiting Owner direction.
 - Comment-post flakiness wart (new): a `github-actions[bot]` comment on #553 at 12:23:43Z contains a raw GitHub Unicorn error HTML page - a hardcoded comment-post step dumped an error page as the body instead of failing cleanly. This is also why the post-approve-eval merge never happened last run cycle (no maintainer decision followed). Single occurrence so far - NOT lab-routed; watch for recurrence, route lab on second consecutive trigger/comment-step failure per standing rule.
 - Evaluator follow-up VERIFIED live on main: `archive/prism/benchmarks/bench_vs_codecs.py:28` sys.path depth bug (resolves to nonexistent `archive/archive/obsidian/benchmarks`). Queued as future Builder/test-hardening vehicle.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` names. Lab to assess on second consecutive trigger-step failure.
 - Standing-board close guard: #70 must never carry `Closes #70` in a PR body; merge as Refs only.
 - Evaluator non-blocking notes (do not gate, carried): DEC2026 SYNC vs ansi.py DCS form (Phase 3 concern), cumulative event-log growth, PACMAN_RENDERER env unreachable from CLI, `--renderer auto` rejected, combined `--maze-check --self-check` drops self-check, progress tracker duplicated `## Next steps` heading, Kitty X/Y cell convention on real terminal, unlabeled maze excerpt caption.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists; watch for new workflow drift).
2. Pac-Man: Phase 2 build should be in flight on #552 (Builder). React to its progress (review on delivery); Design Council (`/oc design`) before visual polish declared done.
3. Pages re-confirm for 06093176 (push deploy should have queued by next run).
4. Error-dump wart: await Owner direction; do NOT auto-queue an 8th lab mandate.
5. Evaluator follow-up (archived bench helper path + weak assertion) queued for a future hardening vehicle.
6. Council calibration: advisory Desktop Pet audit still pending.
7. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
8. Watch: comment-post flakiness (Unicorn-HTML wart) - second occurrence routes lab.
9. Standing rule: standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Will Phase 2 (Ghost Personalities and Mode Timing) land cleanly on the fresh 06093176 main?
 - After merge, what phase branch shape will Phase 2 use (fresh branch from main per tracker)?
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
