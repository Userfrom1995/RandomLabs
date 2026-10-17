# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39026467775 - [Owner ping tick on #599] #595 queue:max verified live on main (d9f44db7); #594 PROOF LANDED LIVE (Windows arm started 11:06:31Z, disposable no-op dropped instead) and #594 CLOSED 11:09:30Z; #599 build complete green (head 5551e856, Closes #596) and in review; #593 round-2 finding forwarded manually with a rebase order (branch CONFLICTING, lab 39027293120 live); #598 in Tester; #592 in Tester on aa6c0750 (three RED macOS regression tests committed by the native re-verify; fix round expected); #600 lab post-mortem PR in review; decisions []**

## PRs & Issues
 - **PRs:** Open: #600 (lab harness-isolation post-mortem for the #593 push-noise/error-storm class, head 6b39e631, CLEAN; review 39026779060 in flight; Refs #593), #599 (Builder docs sweep for #596, head 5551e856, body `Closes #596`, all self-gates green; build 39025589665 SUCCESS 10:54:55Z; review 39026683574 in flight plus a queued duplicate 39026701930), #598 (Curator sync, head 95485bb0, CLEAN; Reviewer APPROVED 10:56:21Z; read-only test 39026795157 in flight; `Fixes #597`), #593 (lab ladder + loud failure, head c9c3ea14, DIRTY/CONFLICTING vs main d9f44db7; round-2 review finding on-thread 10:47:48Z; review run 39025190545 stalled in its agent step; owner manually forwarded `/oc lab` 11:04:15Z with the exact rebase order; lab 39027293120 in flight), #592 (macOS vehicle, head f3af64e6 rebased on d9f44db7; Reviewer APPROVED 11:01:45Z; test 39027133491 in flight; the running macOS re-verify 39025499533 tests the stale 582de170). Merge ledger since 2026-10-16: #595 (queue:max + R14 + docs alignment, 10:50:33Z), #590 (Final Phase, Refs #582), #589-#583 (Phases 7-1), #581 (curator). Full ledger in logs/2026-10-16.md.
 - **Issues:** Open: #597 (closes via #598 on merge), #596 (closes via #599 on merge), #591 (closes via #593 + ladder fold), #582 (native parity rows; macOS re-verify found residuals, Windows arm now running on the current head), #552 (owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. **#594 CLOSED 11:09:30Z** - the live proof observed (Windows arm survived and started; no arm displaced; PEROS CONCURRENCY RULE retired). No untriaged issues.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields, exact set match re-verified this run. No drift.
 - Main tip: d9f44db7 (aad7ff9a + #595's three lab commits); pages deploy green after the merge.

## IN FLIGHT
 - **#594 PROOF - DONE AND CLOSED (11:09:30Z):** the macOS arm completed success 11:06:29Z; its handoff comment (11:06:22Z) queued the no-op run 39027424371 from post-fix main `d9f44db7`; the Windows arm 39026429150 (created pre-merge 10:50:30Z, pending 16 min) was NOT displaced and STARTED at 11:06:31Z with real jobs. The run dropped was the disposable no-op (zero jobs by design). Full evidence comment posted on #594. Retire the PEROS CONCURRENCY RULE. The next real-world exercise of `queue: max` is the fresh sequential macOS/Windows pair after the #592 fix round; observe it once to confirm the two-arm case.
 - **#593 (lab ladder, c9c3ea14 -> rebase required):** round-2 review found one resilience hole; branch CONFLICTS with main on AGENTS.md, LAB.md, CREATING_AGENTS.md, labengineer.md, silent-stall-audit.sh, opencode.yml (keep BOTH R14 audit guards, reconcile numbering). Owner manually forwarded `/oc lab` 11:04:15Z (review run 39025190545 stalled after posting findings). Lab 39027293120 live. On push -> re-review -> read-only infra Tester -> PAT-backed merge sweep -> close #591; fold the ladder into MODEL-WATCH. If the stalled review run later completes and forwards a duplicate `/oc lab`, the second lab run simply queues (do not cancel).
 - **#592 (macOS vehicle, head now aa6c0750):** the macOS re-verify (39025499533, success) found two residual probe-window defects, committed three RED regression tests (`maze-chase/crates/terminal/tests/tester_macos_probe_window.rs`: in-window Enter swallow; stray `4` false Sixel), and reported VERDICT FIX on #582 at 11:06:19Z; head aa6c0750 = rebased tree + tester tests. Main Tester 39027133491 is in flight ON THAT HEAD with the RED tests present; expect `/oc fix` -> Fixer applies the framed-reply + replay fix -> re-review -> sequential macOS/Windows native pair on the repaired head (now safe under queue:max) -> eval -> merge (body Refs #582). The Reviewer's approval at 11:01:45Z was on f3af64e6 and does not cover the tester's new tests, but test-only Tester commits do not void a review gate by themselves.
 - **#598 (Curator sync, 95485bb0):** Reviewer APPROVED 10:56:21Z; read-only test 39026795157 in flight; after approval -> merge -> closes #597 (docs class: no eval gate).
 - **#599 (docs sweep, 5551e856):** build complete green; review 39026683574 in flight; after approval -> test -> merge (docs class), close #596. Watch the maze-chase docs overlap with #598 at merge time.
 - **#600 (lab post-mortem, 6b39e631):** review 39026779060 in flight; infra -> read-only Tester -> PAT-backed merge; Refs #593.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Fold #593's registry ladder into this rule once it merges.
 - HOLLOW-GREEN WATCH: on main still pre-#593, a maintainer/opencode Model-not-found death can conclude green; #593 closes this on the maintainer + general arms. The 10:50:50Z bot-actor assert run 39026009833 concluded green again (pull_request arm) - still pre-fix, expected.
 - NEW WATCH (review-run stall class): review run 39025190545 (#593) posted its findings at 10:47:48Z then stayed in the agent step 20+ minutes; the owner declared it stalled and forwarded manually. If it recurs, open a lab ticket (review runs should terminate promptly after posting the decision comment; job timeout 120 min).
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit: today's only merge was the lab-class #595; no new-project merges today, no limit concern.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued; no required check affected. Auditor territory if it recurs.

## NEXT-RUN PLAYBOOK
 1. #594: DONE (closed with evidence). Watch the Windows arm's report on #582 when it lands; native defects from it route normally (fix), they are not a queue regression. Observe the next two-arm sequential dispatch once to confirm the multi-pending case.
 2. #592: Tester verdict on aa6c0750 (RED tests present) -> expect `/oc fix`; Fixer applies the framed-reply/replay fix; then re-review -> fresh sequential macOS then Windows native pair -> eval -> merge (body Refs #582).
 3. #593: lab round pushed? -> re-review -> read-only infra Tester -> PAT merge sweep -> close #591; fold the ladder into MODEL-WATCH and note any duplicate `/oc lab` from the stalled review run.
 4. #599: review verdict -> test -> merge on approve-test (docs class), close #596; check the maze-chase docs overlap vs #598 before merging either.
 5. #598: Tester verdict -> merge -> close #597.
 6. #600: review -> read-only Tester -> PAT merge.
 7. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 8. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Does the next two-arm sequential dispatch keep BOTH arms pending (the multi-pending case under `queue: max`), or does a second real arm get dropped like the no-op was?
 - Does the #593 lab round keep both R14 audit guards while resolving the six-file conflict?
 - Does #599's review pass on 5551e856, and does it collide with #598's maze-chase doc edits at merge time?
 - Is stalled review run 39025190545 a one-off provider hang or a new stall class needing a lab ticket?
 - Do the #592 probe-window residuals get fixed cleanly, and does the fresh native pair come back green?
 - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
