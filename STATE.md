# STATE - Random factory checkpoint
 - **Updated: 2026-10-12 run 38246936471 - Fixed-head Phase 1 re-approved by Reviewer + Tester, fresh eval dispatched on PR #553**

## PRs & Issues
 - **PRs:** Open: #553 (Pac-Man epic + Phase 1, head e52cbdfb on opencode/issue552-20261012113721, MERGEABLE/CLEAN; Fixer BFS repair re-approved by Reviewer + Tester on the fixed head; fresh opencode-eval dispatched this run). MERGED: #551, #550, #548, #545, #543, #541, #542, #540, #539, #538, #537, #536, #533, #534, #535, #531, #529, #527. CLOSED: #547 (superseded by #548).
 - **Issues:** Open: #70 lab-health, #42 brainstorm standing, #552 Pac-Man tracking (Phase 1 fix re-approved twice, fresh eval in flight). Closed: #549, #546, #544, #532, #530, #528, #526, #515, #518, #504, #507, #498, #436-GUI-detach-unknown (verify; pending owner direction).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields - exact set match verified this run, no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - Pac-Man #552: fixed head e52cbdfb carries Reviewer `/oc approve` (78 passed, live `--ticks 5000` exit 0) + Tester `/oc approve-test` (78 passed, live entrypoint proof, no production touched). Fresh `eval` dispatched this run (prior Evaluator FIX verdict consumed by the Fixer repair; merge still gated on new approve-eval).
 - PR #553 merge rule: Refs #552 only; #552 stays open until final phase passes test and eval. NO merge authorized until Evaluator approve-eval lands on the fixed head.
 - Main tip 1780edba (owner direct push 2026-10-12, control plane back to ubuntu-latest + poisoned-cache guard). Pages deploy state to re-confirm after next merge; PR #553 preview held (action_required) until owner approval.
 - Run sweep: zero new failures (last check: only cancelled/skipped maintainer workflow_run entries, skipped non-matching issue_comment arms, in_progress maintainer arm).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; fixed head needs Reviewer re-confirmation before merge (done: re-approve on e52cbdfb). Test-only Tester commits (single-file tests/, production untouched) do NOT void the review gate per precedent. Fixer production-code changes DID require the fresh review round just completed.
 - Eval-gate calibration note: surgical infra/docs/test-harness fixes may merge on Reviewer approve + Tester approve-test; Evaluator binding gate stays mandatory for product/research/phase deliverables.
 - Eval-crash rule (amended): eval run dying inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown 30 min same-signature). Second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths do not count; one exception per cooldown window max.
 - Duplicate-test note: maintainer + owner near-simultaneous test dispatches settle via per-PR concurrency; stand down when a test arm is pending/in_progress.
 - Error-dump wart status: 13th recurrence logged; escalation note posted to Owner via ping on #70 (run 37552237432). 8th lab mandate withheld per loop guard - awaiting Owner direction.
 - Evaluator follow-up VERIFIED live on main: `archive/prism/benchmarks/bench_vs_codecs.py:28` sys.path depth bug (resolves to nonexistent `archive/archive/obsidian/benchmarks`). Queued as future Builder/test-hardening vehicle.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` names. Lab to assess on second consecutive trigger-step failure.
 - Standing-board close guard: #70 must never carry `Closes #70` in a PR body; merge as Refs only.
 - Evaluator non-blocking notes for the Fixer (do not gate): PACMAN_RENDERER env unreachable from CLI (cli.py:71 passes env=None); `--renderer auto` rejected though detect supports auto; combined `--maze-check --self-check` drops self-check; progress tracker duplicated `## Next steps` heading; kitty.py place_image X/Y convention to verify on real Kitty terminal in renderer phase.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists; watch for new workflow drift).
2. Pac-Man: react to fresh Evaluator verdict on PR #553 (approve-eval -> merge as Refs #552 + chain Phase 2 build; fix verdict -> dispatch fix); Design Council (`/oc design`) before visual polish declared done.
3. Enforce Refs-not-Closes on #553 merge; keep #552 open until final phase.
4. Pages re-confirm only after new merges.
5. Error-dump wart: await Owner direction; do NOT auto-queue an 8th lab mandate.
6. Evaluator follow-up (archived bench helper path + weak assertion) queued for a future hardening vehicle.
7. Council calibration: advisory Desktop Pet audit still pending.
8. Watch: ubuntu-latest agent runs - if hollow-green/silent-stall recurs, the poisoned-cache class is NOT fixed and a lab mandate is warranted.
9. Standing rule: standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Will the fresh eval pass on the fixed head e52cbdfb?
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
