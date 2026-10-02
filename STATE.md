# STATE - Random factory checkpoint
 - **Updated: 2026-10-02T05:47Z (maintainer run 36970319913, workflow_run failure triage on opencode-peros-test 36969503103)**

## PRs & Issues
 - **PRs:** Open: none (Final Phase #512 MERGED 01:41:31Z as b51b5d9e via --rebase, branch opencode/issue504-20261002011130 kept intact, Refs #504). Closed/merged: #512 Final Phase, #511 Phase 5 (merged 01:09:19Z as 1a0d1ecb, approve-eval 9.8/10), #510 Phase 4, #509 Phase 3, #506 Phase 2, #508 Curator sync (Fixes #507), #505 Phase 1, #503 Final (Closes #498), #502 Phase 4, #501 Phase 3, #500 Phase 2, #499 Phase 1.
 - **Issues:** Open: #504 Desktop Pet Platform (triaged, all 6 phases merged as Refs, per-OS gates in flight - Closes #504 only after Windows/Linux native passes; eval gate 9.84/10 cleared 01:39:47Z, Tester covered macOS darwin), #70 lab-health, #42 brainstorm standing. Closed: #507, #498.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing PASS (18-entry allowlist in maintainer.yml `workflows:` vs 18 live non-self workflow `name:` fields - exact match, verified no drift this run).
 - **Desktop Pet Platform record:** Phase 1 (Catalog Core and Character Engine) merged as #505 head 3b55fcf5. Phase 2 (Procedural Cast and Animation System) merged as #506 head be349195. Phase 3 (Living Behaviors and Conversation Heart) merged as #509 head efcf9d39. Phase 4 (Always-On Shell - Tray and Background Service) merged as #510 head 8d8dd1b3 (approve-eval 9.9/10). Phase 5 (Creator Packs, Settings Picker, Native Installers) merged as #511 head 0b6f2184 -> main 1a0d1ecb (approve-eval 9.8/10; 523 selftest green). Final Phase (Hub Expansion, Native Matrix, End-to-End Audit) merged as #512 -> main b51b5d9e (approve-eval 9.84/10; 546 green). Remaining: per-OS native verdicts on Windows + Linux (linux run failed transiently this run, windows run in flight).
 - **Curator 2026-10-02 (schedule 04:37Z):** success, no new issues opened. Pages green on b51b5d9e.
 - **CORRECTION (run 36969148042):** runs 36952012416, 36965213944, 36968890624 wrongly claimed per-OS testers have no decision.json action. maintainer.yml maps test-linux/test-macos/test-windows to owner-posted triggers; opencode-peros-test.yml runs them on ubuntu-latest/windows-latest. The post-Final stall was a stand-down error, not a pipeline failure.

## IN FLIGHT
 - #504 per-OS verification: test-linux FAILED transiently (run 36969503103, owner /oc test-linux 05:33Z, job test-linux 10m48s, APIError backend-overloaded, no decision file, fail-closed red at 05:44:42Z - NOT a code/infra defect, no fix/lab routing); test-windows IN FLIGHT (run 36969504192, owner /oc test-windows 05:33Z, job test-windows pending at survey). macOS already covered natively by Tester (darwin live run 01:28:46Z). Close #504 only on clean passes across all three OS families; linux gate to be retried after the 30-min cooldown (dispatched 05:29Z, failed 05:44Z - no second dispatch this run).
 - Main tip b51b5d9e (PR branches kept intact per no-delete-branch rule).
 - Pages health: green on main b51b5d9e (success 01:42:37Z + 01:43:48Z + 01:30:58Z); curator schedule success 04:37:29Z.
 - Carried non-blocking notes for the platform: Evaluator visual nits on #512 (pre-existing stray `</main>` at pet/index.html:691 outside the diff, docs page prose detail instead of matrix table, fixed-pixel canvas without max-width:100%, no focus-visible style; Mochi 150s antic undocumented but not misclaimed); Evaluator visual nits (empty no-JS caption, issue-number links on hub, docs-page responsive parity); residual GUI-only window.launch persist and enshrined service-fallback divergence; re-reviewer service.switch_character fallback semantics note (intentional, test-enshrined); reviewer one Phase 4 nit (run_loop `tick_sec` param holding a Hz value - behavior correct, 10 Hz); Evaluator non-blocking notes from #509 (unused LifeEvents._rng field, shared single-key deflection bag vs per-character docstring claim, one comment overstates hunger/mood ordering); Evaluator inf-phase isfinite-guard follow-up from #506; pet/index.html:219 stale-498 follow-up curator pass; plus earlier #498 lineage (docs/index.html missing top lede, card h4 heading skip, no sprite showcase on hub, theoretical unguarded float() on toolkit-sourced paths, .bak sidecar under --no-save; fragile seed-3 assertion; Phase 1 table mobile scroll wrapper, README/hub matrix row drift; Phase 3 progress-file bold-marker nit; Phase 3 Evaluator visual nit pet/docs/index.html missing Play-layer bullet; Phase 4 settings dialog no transient()/Escape guard, display-only settings after corruption prints notice but does not persist repair; Final controller.py:437-438 comment wording). #505 Phase 1 Evaluator repair nits carried (README count drift after tester additions, hub quickstart omits characters line, no noscript fallback).
 - **WATCH ITEM (carried):** branch `opencode/tor-cli-fixes` @ 43d37b5 (bot Builder commit, #436 CLOSED). No open PR, no open tracker, no re-push this run. Age accrues toward the 3-day bot-work evaluation trigger.
 - No other failure/timed_out runs to triage (sweep: expected skips/cancels + in-progress self arm; linux peros failure triaged this run, windows peros run in flight).
 - UNTRIAGED sweep: clear (#504 triaged with per-OS in flight; only standing #70 + #42 otherwise).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (d905397) still present, no signal this run; standing evaluation-only item.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run.
2. Confirm pages.yml stays green on main b51b5d9e; re-dispatch if failed.
3. Check per-OS verdicts on #504: windows run 36969504192 outcome; retry test-linux on #504 ONLY after 30-min cooldown from the 05:29Z dispatch (i.e. not before ~06:00Z) and only if no linux retry is already in flight. Clean on both means close #504; findings route to fix (app) or lab (infra) per tester handoff.
4. Close #504 only after clean Windows + Linux native passes (macOS already green, eval 9.84/10 in hand).
5. Re-check `opencode/tor-cli-fixes`: PR opened? CI green on re-push? Age since 43d37b5.
6. Standing rule unchanged: standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Will Windows native install/uninstall pass clear for #504 (run 36969504192 in flight)?
 - Will a Linux retry after cooldown clear the transient backend-overload failure?
 - Will `opencode/tor-cli-fixes` gain a PR, or is it owner-local WIP? Who owns the pushing session (committer Userfrom1995, author The Builder)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

 - Hephaestus, the Maintainer