# STATE - Random factory checkpoint
 - **Updated: 2026-10-12 run 38265551913 - Phase 1 merged (06093176, Refs #552); Phase 2 build + curator-P555 fix dispatched; unicorn-wall crash explained**

## PRs & Issues
 - **PRs:** Open: #555 (Curator README sync for #554, head c7196cb4, CONFLICTING/DIRTY after Phase 1 merge touched same README lines; Reviewer approve + Tester approve-test landed pre-conflict; Fixer dispatched to rebase/resolve). MERGED: #553 (Pac-Man epic + Phase 1, merged 14:48:33Z as 06093176, Refs #552; Evaluator approve-eval 9.82/10), #551, #550, #548, #545, #543, #541, #542, #540, #539, #538, #537, #536, #533, #534, #535, #531, #529, #527. CLOSED: #547 (superseded by #548).
 - **Issues:** Open: #70 lab-health, #42 brainstorm standing, #552 Pac-Man tracking (Phase 1 merged, Phase 2 build dispatched this run), #554 Curator README sync (open, PR #555 conflicted, fix dispatched). Closed: #549, #546, #544, #532, #530, #528, #526, #515, #518, #504, #507, #498, #436-GUI-detach-unknown (verify; pending owner direction).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries vs 20 live non-maintainer workflow `name:` fields (live list now includes `pet-release`; allowlist already contains pet-release - exact set match verified this run, no drift). `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - Pac-Man #552: Phase 1 merged as Refs #552 (main tip 06093176; both tunnel fixes verified live on main, merge-base with branch head 0a0417b9 exists, no orphan). Phase 2 (Ghost Personalities and Mode Timing) build dispatched this run per the auto-chain rule; #552 stays open until the final phase passes test and eval.
 - PR #555 merge rule: Closes #554 (curator tracking issue, closes on merge). Fixer must rebase onto new main and resolve the README Active-Projects conflict; content already approved twice, no re-review needed. Docs-only so Evaluator gate not required per calibration.
 - Unicorn-wall incident: run 38248689623 (12:23Z) crashed and posted GitHub's 500 error page as the bot comment on #553; owner asked about it 14:48:02Z. Explained in this run's comment (no hidden content, disregard). Crash class noted: if a maintainer run ever posts non-comment content again, route `lab` to harden the comment-posting step.
 - Main tip 06093176 (Phase 1 merge). Pages deploy state to re-confirm after next merge; PR #555 preview held until owner approval.
 - Run sweep: zero new failures (last check: only skipped/cancelled maintainer workflow_run entries, skipped non-matching issue_comment arms).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent. Conflict-only rebases with identical content resolution do NOT void docs-only gates (PR #555 case logged).
 - Eval-gate calibration note: surgical infra/docs/test-harness fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables.
 - Eval-crash rule (amended): eval run dying inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown 30 min same-signature). Second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths do not count; one exception per cooldown window max.
 - Duplicate-test note: maintainer + owner near-simultaneous test dispatches settle via per-PR concurrency; stand down when a test arm is pending/in_progress.
 - Error-dump wart status: 13th recurrence logged; escalation note posted to Owner via ping on #70 (run 37552237432). 8th lab mandate withheld per loop guard - awaiting Owner direction.
 - Evaluator follow-up VERIFIED live on main: `archive/prism/benchmarks/bench_vs_codecs.py:28` sys.path depth bug (resolves to nonexistent `archive/archive/obsidian/benchmarks`). Queued as future Builder/test-hardening vehicle.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` names. Lab to assess on second consecutive trigger-step failure.
 - Standing-board close guard: #70 must never carry `Closes #70` in a PR body; merge as Refs only.
 - Evaluator non-blocking notes (do not gate, carried): DEC2026 SYNC vs ansi.py DCS form (Phase 3 concern), cumulative event-log growth, PACMAN_RENDERER env unreachable from CLI, `--renderer auto` rejected, combined `--maze-check --self-check` drops self-check, progress tracker duplicated `## Next steps` heading, Kitty X/Y cell convention on real terminal, unlabeled maze excerpt caption.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists; watch for new workflow drift).
2. Pac-Man: react to Phase 2 Builder push on #552 (review chain); Design Council (`/oc design`) before visual polish declared done.
3. PR #555: after Fixer rebase, verify CLEAN/MERGEABLE and merge (Closes #554); keep #552 open until final phase.
4. Pages re-confirm only after new merges.
5. Error-dump wart: await Owner direction; do NOT auto-queue an 8th lab mandate.
6. Evaluator follow-up (archived bench helper path + weak assertion) queued for a future hardening vehicle.
7. Council calibration: advisory Desktop Pet audit still pending.
8. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
9. Standing rule: standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Will Phase 2 use a fresh branch from main per the tracker (expected: new opencode/issue552-* branch)?
 - After the #555 rebase, will the conflict resolve to a clean single-line Active Projects entry?
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
