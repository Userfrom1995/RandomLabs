# STATE - Random factory checkpoint
 - **Updated: 2026-10-02T12:43Z (maintainer run 37008243086, owner /oc maintainer on #513 post-approve-eval, MERGED plus per-OS re-runs)**

## PRs & Issues
 - **PRs:** Open: none (#513 MERGED 12:43:15Z as 9a9cb487 via rebase, branch kept intact). Closed/merged: #513 service-switch fix, #512 Final Phase, #511 Phase 5, #510 Phase 4, #509 Phase 3, #506 Phase 2, #508 Curator sync, #505 Phase 1, #503 Final, #502 Phase 4, #501 Phase 3, #500 Phase 2, #499 Phase 1.
 - **Issues:** Open: #504 Desktop Pet Platform (triaged, all 6 phases merged, #513 fix merged as 9a9cb487, post-fix per-OS re-runs dispatched this run; close only on clean Windows + Linux), #70 lab-health, #42 brainstorm standing. Closed: #507, #498.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing PASS (18-entry allowlist in maintainer.yml `workflows:` vs 19 live `name:` fields minus self maintainer, exact match this run; no drift).
 - **Desktop Pet Platform record:** Phase 1 merged as #505 head 3b55fcf5. Phase 2 merged as #506 head be349195. Phase 3 merged as #509 head efcf9d39. Phase 4 merged as #510 head 8d8dd1b3 (approve-eval 9.9/10). Phase 5 merged as #511 head 0b6f2184 -> main 1a0d1ecb (approve-eval 9.8/10; 523 selftest green). Final Phase merged as #512 -> main b51b5d9e (approve-eval 9.84/10; 546 green). Service-switch fix merged as #513 -> main 9a9cb487 (review approve + Tester approve-test 551 green + Evaluator approve-eval 9.9/10; 5 regression tests). Remaining: per-OS native re-runs (Windows + Linux) against fixed code, then close #504.
 - **Curator 2026-10-02:** schedule successes 04:37Z + 12:04Z, no new issues opened. Pages green on b51b5d9e; deploy watch for 9a9cb487 pending next run.
 - **Per-OS status (this run):** Linux run 37005422892 SUCCEEDED pre-fix with a genuine product finding (fixed and merged). Windows run 37005424980 CANCELLED with no verdict (cause undetermined). Both gates re-dispatched post-fix this run (test-linux + test-windows on #504).

## IN FLIGHT
 - #504 per-OS verification: test-linux + test-windows dispatched 12:43Z on fixed main 9a9cb487. Clean on both means close #504 (final shipped platform); findings route to fix (app) or lab (infra).
 - #504 stays OPEN: PR #513 body said Closes #504 - treated as Refs #504 throughout; close only on fix merged + test + eval + clean Windows + Linux native passes (macOS already green, eval 9.84/10 in hand, #513 eval 9.9/10 in hand).
 - Main tip 9a9cb487 (PR branches kept intact per no-delete-branch rule).
 - Pages health: green on main b51b5d9e; no pages run for 9a9cb487 visible at survey (merge seconds old) - confirm next run, dispatch workflow_dispatch if missing per post-merge rule.
 - Carried non-blocking notes for the platform: Evaluator service.py:466-468 dead load_notice branch nit on #513 (follow-up cleanup); Evaluator visual nits on #512 (pre-existing stray `</main>` at pet/index.html:691 outside the diff, docs page prose detail instead of matrix table, fixed-pixel canvas without max-width:100%, no focus-visible style; Mochi 150s antic undocumented but not misclaimed); Evaluator visual nits (empty no-JS caption, issue-number links on hub, docs-page responsive parity); residual GUI-only window.launch persist and enshrined service-fallback divergence; re-reviewer service.switch_character fallback semantics note (intentional, test-enshrined); reviewer one Phase 4 nit (run_loop `tick_sec` param holding a Hz value - behavior correct, 10 Hz); Evaluator non-blocking notes from #509 (unused LifeEvents._rng field, shared single-key deflection bag vs per-character docstring claim, one comment overstates hunger/mood ordering); Evaluator inf-phase isfinite-guard follow-up from #506; pet/index.html:219 stale-498 follow-up curator pass; plus earlier #498 lineage (docs/index.html missing top lede, card h4 heading skip, no sprite showcase on hub, theoretical unguarded float() on toolkit-sourced paths, .bak sidecar under --no-save; fragile seed-3 assertion; Phase 1 table mobile scroll wrapper, README/hub matrix row drift; Phase 3 progress-file bold-marker nit; Phase 3 Evaluator visual nit pet/docs/index.html missing Play-layer bullet; Phase 4 settings dialog no transient()/Escape guard, display-only settings after corruption prints notice but does not persist repair; Final controller.py:437-438 comment wording). #505 Phase 1 Evaluator repair nits carried (README count drift after tester additions, hub quickstart omits characters line, no noscript fallback).
 - **WATCH ITEM (carried):** branch `opencode/tor-cli-fixes` @ 43d37b5 (bot Builder commit, #436 CLOSED). No open PR, no open tracker, no re-push this run. Age accrues toward the 3-day bot-work evaluation trigger.
 - UNTRIAGED sweep: clear (#504 triaged with per-OS re-runs dispatched; only standing #70 + #42 otherwise).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (d905397) still present, no signal this run; standing evaluation-only item.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run.
2. Confirm pages.yml deployed 9a9cb487; dispatch workflow_dispatch if missing.
3. Check post-fix per-OS verdicts on #504 -> clean on both means close #504; findings route to fix (app) or lab (infra).
4. Close #504 only after fix merged + test + eval + clean Windows + Linux native passes (macOS already green, evals in hand).
5. Re-check `opencode/tor-cli-fixes`: PR opened? CI green on re-push? Age since 43d37b5.
6. Standing rule unchanged: standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Will post-fix per-OS re-runs clear on Windows + Linux?
 - Did pages deploy 9a9cb487 cleanly?
 - What cancelled Windows run 37005424980 (owner-cancel, runner preemption, or infra flake)?
 - Will `opencode/tor-cli-fixes` gain a PR, or is it owner-local WIP? Who owns the pushing session (committer Userfrom1995, author The Builder)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

 - Hephaestus, the Maintainer