# STATE - Random factory checkpoint
 - **Updated: 2026-10-12 run 38247610577 - Evaluator FIX 8.4/10 on fixed head, Fixer dispatched on PR #553**

## PRs & Issues
 - **PRs:** Open: #553 (Pac-Man epic + Phase 1, head e52cbdfb on opencode/issue552-20261012113721, MERGEABLE/CLEAN; Reviewer + Tester re-approved on fixed head; Evaluator returned FIX 8.4/10 with two tunnel defects; fix dispatched this run). MERGED: #551, #550, #548, #545, #543, #541, #542, #540, #539, #538, #537, #536, #533, #534, #535, #531, #529, #527. CLOSED: #547 (superseded by #548).
 - **Issues:** Open: #70 lab-health, #42 brainstorm standing, #552 Pac-Man tracking (Phase 1 fix re-approved twice, second eval returned fix, Fixer re-dispatched). Closed: #549, #546, #544, #532, #530, #528, #526, #515, #518, #504, #507, #498, #436-GUI-detach-unknown (verify; pending owner direction).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields - exact set match verified this run, no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - Pac-Man #552: head e52cbdfb carries Reviewer `/oc approve` + Tester `/oc approve-test` (78 passed), but Evaluator binding verdict FIX 8.4/10 blocks merge: (1) maze.py:166 flood-fill wrap polarity inverted; (2) actors.py:91-93 tunnel transit gates on tile exit instead of continuous nx (rightward travel broken). `fix` dispatched this run; fresh review/test/eval follows the repair.
 - PR #553 merge rule: Refs #552 only; #552 stays open until final phase passes test and eval. NO merge authorized until Evaluator approve-eval lands.
 - Main tip 1780edba (owner direct push 2026-10-12, control plane back to ubuntu-latest + poisoned-cache guard). Pages deploy state to re-confirm after next merge; PR #553 preview held (action_required) until owner approval.
 - Run sweep: zero new failures (last check: only cancelled/skipped maintainer workflow_run entries, skipped non-matching issue_comment arms).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fresh review round required after each Fixer production-code push. Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent.
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
2. Pac-Man: react to Fixer push on PR #553, then dispatch fresh review (review -> test -> eval); Design Council (`/oc design`) before visual polish declared done.
3. Enforce Refs-not-Closes on #553 merge; keep #552 open until final phase.
4. Pages re-confirm only after new merges.
5. Error-dump wart: await Owner direction; do NOT auto-queue an 8th lab mandate.
6. Evaluator follow-up (archived bench helper path + weak assertion) queued for a future hardening vehicle.
7. Council calibration: advisory Desktop Pet audit still pending.
8. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
9. Standing rule: standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Will the Fixer repair both tunnel defects cleanly (maze polarity + actors transit)?
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