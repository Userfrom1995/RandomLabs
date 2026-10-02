# STATE - Random factory checkpoint
 - **Updated: 2026-10-02T12:52Z (maintainer run 37009138917, owner /oc maintainer on #504 post-per-OS batch, STAND DOWN)**

## PRs & Issues
 - **PRs:** Open: none (#513 MERGED 12:43:15Z as 9a9cb487 via rebase, branch kept intact). Closed/merged: #513 service-switch fix, #512 Final Phase, #511 Phase 5, #510 Phase 4, #509 Phase 3, #506 Phase 2, #508 Curator sync, #505 Phase 1, #503 Final, #502 Phase 4, #501 Phase 3, #500 Phase 2, #499 Phase 1.
 - **Issues:** Open: #504 Desktop Pet Platform (triaged, all 6 phases + #513 fix merged as 9a9cb487, Linux native PASS on fixed code, Windows gate outstanding on infra flake; close only on clean Windows pass), #70 lab-health, #42 brainstorm standing. Closed: #507, #498.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing PASS (18-entry allowlist in maintainer.yml `workflows:` vs 19 live `name:` fields minus self maintainer, exact match this run; no drift).
 - **Desktop Pet Platform record:** Phase 1 merged as #505 head 3b55fcf5. Phase 2 merged as #506 head be349195. Phase 3 merged as #509 head efcf9d39. Phase 4 merged as #510 head 8d8dd1b3 (approve-eval 9.9/10). Phase 5 merged as #511 head 0b6f2184 -> main 1a0d1ecb (approve-eval 9.8/10; 523 selftest green). Final Phase merged as #512 -> main b51b5d9e (approve-eval 9.84/10; 546 green). Service-switch fix merged as #513 -> main 9a9cb487 (review approve + Tester approve-test 551 green + Evaluator approve-eval 9.9/10). Remaining: Windows native pass against fixed code, then close #504.
 - **Curator 2026-10-02:** schedule successes 04:37Z + 12:04Z, no new issues opened. Pages green on main (workflow_dispatch success 12:46:28Z covers 9a9cb487).
 - **Per-OS status (this run):** Linux run 37008721908 SUCCEEDED post-fix: PASS verdict on 9a9cb487, no new bugs. Windows run 37008723510 FAILED post-fix at setup (`Failed to fetch version information` in opencode install; agent never started; no decision file; no verdict). Pre-fix Windows run 37005424980 CANCELLED with no verdict (cause undetermined). Windows gate still outstanding.

## IN FLIGHT
 - #504 Windows verification: retry test-windows on #504 only after ~13:21Z cooldown AND only if the queued failure-triage arms (37009204014 in_progress, 37009205189 pending) have not already re-dispatched it (dedupe first). Clean Windows pass means close #504 (final shipped platform); genuine product findings route to fix (app) or lab (infra).
 - #504 stays OPEN: PR #513 body said Closes #504 - treated as Refs #504 throughout; close only on fix merged + test + eval + clean Windows + Linux native passes (Linux green, macOS already green, evals 9.84/10 + 9.9/10 in hand).
 - Main tip 9a9cb487 (PR branches kept intact per no-delete-branch rule).
 - Pages health: green (12:46:28Z workflow_dispatch success post-#513 merge); standing watch only.
 - Carried non-blocking notes for the platform: Evaluator service.py:466-468 dead load_notice branch nit on #513 (follow-up cleanup); Evaluator visual nits on #512 (pre-existing stray `</main>` at pet/index.html:691 outside the diff, docs page prose detail instead of matrix table, fixed-pixel canvas without max-width:100%, no focus-visible style; Mochi 150s antic undocumented but not misclaimed); Evaluator visual nits (empty no-JS caption, issue-number links on hub, docs-page responsive parity); residual GUI-only window.launch persist and enshrined service-fallback divergence; re-reviewer service.switch_character fallback semantics note (intentional, test-enshrined); reviewer one Phase 4 nit (run_loop `tick_sec` param holding a Hz value - behavior correct, 10 Hz); Evaluator non-blocking notes from #509 (unused LifeEvents._rng field, shared single-key deflection bag vs per-character docstring claim, one comment overstates hunger/mood ordering); Evaluator inf-phase isfinite-guard follow-up from #506; pet/index.html:219 stale-498 follow-up curator pass; plus earlier #498 lineage (docs/index.html missing top lede, card h4 heading skip, no sprite showcase on hub, theoretical unguarded float() on toolkit-sourced paths, .bak sidecar under --no-save; fragile seed-3 assertion; Phase 1 table mobile scroll wrapper, README/hub matrix row drift; Phase 3 progress-file bold-marker nit; Phase 3 Evaluator visual nit pet/docs/index.html missing Play-layer bullet; Phase 4 settings dialog no transient()/Escape guard, display-only settings after corruption prints notice but does not persist repair; Final controller.py:437-438 comment wording). #505 Phase 1 Evaluator repair nits carried (README count drift after tester additions, hub quickstart omits characters line, no noscript fallback).
 - **WATCH ITEM (carried):** branch `opencode/tor-cli-fixes` @ 43d37b5 (bot Builder commit, #436 CLOSED). No open PR, no open tracker, no re-push this run. Age accrues toward the 3-day bot-work evaluation trigger.
 - UNTRIAGED sweep: clear (#504 triaged with Windows retry pending; only standing #70 + #42 otherwise).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (d905397) still present, no signal this run; standing evaluation-only item.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run.
2. Check Windows peros retry verdict on #504 -> clean means close #504; genuine findings route to fix (app) or lab (infra); a further consecutive infra flake past cooldown retries once more, then routes to lab (runner/install mitigation), not endless retries.
3. Close #504 only after clean Windows native pass (Linux green, macOS green, evals in hand).
4. Re-check `opencode/tor-cli-fixes`: PR opened? CI green on re-push? Age since 43d37b5.
5. Standing rule unchanged: standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Will the Windows native pass clear on retry (post-fix code 9a9cb487)?
 - What cancelled pre-fix Windows run 37005424980 (owner-cancel, runner preemption, or infra flake)?
 - Will `opencode/tor-cli-fixes` gain a PR, or is it owner-local WIP? Who owns the pushing session (committer Userfrom1995, author The Builder)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

 - Hephaestus, the Maintainer