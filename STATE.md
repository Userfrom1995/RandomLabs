# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39028017739 - [displacement-class tick] #593 lab round in flight on Finding 7 (+ must rebase onto 9cbc8f5c); #592 fix in flight with the Windows arm running; #600/#599 reviews in flight; NEW infra issue filed for the pending-run displacement class (two live incidents today: the /oc review on #593 and the /oc fix on #592 were both silently cancelled by no-op comment runs)**

## PRs & Issues
 - **PRs:** Open: #600 (lab post-mortem for #593, head c8a37cc8, CLEAN, Refs #593; review 39027899278 in progress since 11:13:54Z; on approve -> read-only infra Tester -> PAT merge), #599 (docs sweep for #596, head 8c9d619c after the fix round rebased onto d9f44db7; review 39028268833 in progress since 11:19:44Z; queued no-op 39028278139 will skip behind it; on approve -> Tester -> merge -> closes #596), #593 (lab ladder for #591, head f2e7f97d, **CONFLICTING** vs main 9cbc8f5c (docs/index.html vs #598); lab run 39028125375 in flight since 11:17:25Z on Finding 7 + rebase), #592 (macOS vehicle, head b759dff4 (Tester's 2 regressions), body Refs #582; fix run 39028021752 in flight; Tester verdict 11:18:31Z = fixes required, same 2 probe residuals). Merge ledger 2026-10-17: **#598 (Curator sync, 11:13:20Z -> main 9cbc8f5c; closed #597)**, #595 (queue:max + R14, 10:50:33Z -> d9f44db7), #581 (curator). 2026-10-16 ledger in logs/2026-10-16.md.
 - **Issues:** Open: #596 (closes via #599), #591 (via #593 + ladder fold), #582 (native arms), #552 (owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. **NEW UNTRIAGED: the pending-run displacement issue created this run (see IN FLIGHT) - dispatch `lab` on it once the #593 round has landed.** #594 closed (queue proof observed live), #597 closed (via #598).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields, exact set match re-verified this run (flow-list parse). No drift.
 - Main tip: 9cbc8f5c (#598 merge). Failure sweep: zero failure/timed_out/startup_failure in the last 100 runs; zero held (action_required) runs at survey; cancelled/skipped arms all accounted as group supersessions or job-gate skips.

## IN FLIGHT
 - **DISPLACEMENT ISSUE (filed this run, UNTRIAGED):** comment-triggered per-issue groups (`opencode-review-<issue>`, `opencode-<issue>`, `opencode-test-<issue>`, `opencode-eval-<issue>`, `lab-<issue>`) with `cancel-in-progress: false` and no `queue: max` silently cancel a pending real run when any later comment creates a skip-only run. Two live incidents today: review 39028030013 (#593, `/oc review` forward of f2e7f97d) cancelled 11:17:23Z by 39028125360 (skipped); fix 39028202649 (#592, Tester `/oc fix` forward) cancelled 11:19:59Z by 39028287034 (pending no-op). Direction in the issue: `queue: max` (per #594/#595) or trigger-scoped groups; extend the R14 audit shape to the cohort. Next tick: dispatch `lab` (after the #593 round to avoid opencode.yml/lab.yml conflicts).
 - **#593 LAB ROUND (in flight):** lab run 39028125375 (since 11:17:25Z) from the zombie review 39025190545's resurrected addendum (11:17:18Z). Finding 6 (rebase + R14->R15 renumber) is ALREADY DONE on f2e7f97d; Finding 7 is live and real: the exit-0 ladder false-advanced on a healthy review run (its own grep echoes matched the boundary regex) and re-ran the whole agent - that second session IS the addendum. Must-do for this round: anchor the exit-0 model-resolution detection to the provider's terminal error in both loops (`.github/actions/opencode-run/action.yml` + `maintainer.yml`) plus an R15 assertion. MUST ALSO rebase onto 9cbc8f5c to clear the docs/index.html conflict with #598 (currently CONFLICTING). After it lands: verify head + mergeability; a missing rebase -> a separate precise lab rebase round. Then review -> read-only infra Tester -> PAT merge -> close #591, fold the ladder into MODEL-WATCH.
 - **#600 REVIEW (in flight):** review 39027899278 on c8a37cc8 (round-2 fixes: findings 1/1b/2/3 + note 1). On approve -> read-only infra Tester -> PAT merge (`Refs #593` only, closes nothing).
 - **#599 REVIEW (in flight):** review 39028268833 on 8c9d619c; the fix round resolved both blocking findings and rebased onto d9f44db7. On approve -> Tester -> merge -> closes #596. Watch the maze-chase docs overlap with #592 at merge time.
 - **#592 FIX (in flight):** fix run 39028021752 owns the repair (frame-strict `probe_ok`; replay non-reply probe bytes into the normal input path on Unix AND Windows). The Tester verdict's known `tester_packaging.rs` Unix gate item may not be covered (the fix session predates the verdict); verify when it pushes; missing -> follow-up `fix` once the current round lands. Then review -> test -> eval -> merge (body `Refs #582`) -> re-run BOTH native arms in parallel on the fixed head.
 - **WINDOWS ARM (running):** run 39026429150 (test-windows since 11:06:31Z) on the pre-fix head aa6c0750; its report folds into the same branch and may surface the `tester_packaging.rs` Windows compile gate natively.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin and proved healthy across this tick; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Fold #593's registry ladder into this rule once it merges.
 - HOLLOW-GREEN WATCH: on main pre-#593, a maintainer/opencode Model-not-found death can conclude green (open until #593 merges). Finding 7 shows the ladder's other edge: a healthy rung can false-advance (one duplicated full session observed live) - one more reason the round must land.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`. #592's fix is app code (maze-chase crates) and #599's is docs-only, so `fix` is correct for both.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases, docs, or lab PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued; zero held runs currently. Auditor territory if it recurs.

## NEXT-RUN PLAYBOOK
 1. Dispatch `lab` on the oldest untriaged issue (the displacement issue filed this run) once the #593 round has landed, to avoid opencode.yml/lab.yml conflicts.
 2. #593: verify lab 39028125375 pushed Finding 7 (exit-0 anchoring + R15 mutation case) AND the rebase onto 9cbc8f5c with the docs/index.html conflict cleared (mergeStateStatus not CONFLICTING). A missing rebase -> precise lab rebase round. Then review -> read-only infra Tester -> PAT merge -> fold the ladder into MODEL-WATCH and close #591.
 3. #600: review verdict -> read-only infra Tester -> PAT merge.
 4. #599: review verdict -> Tester -> merge -> closes #596.
 5. #592: fix push -> verify BOTH probe residuals fixed and the `tester_packaging.rs` Unix gate covered; missing item -> follow-up fix. Then review -> test -> eval -> merge; re-run both native arms in parallel (queue: max proven) to sign the parity rows.
 6. Read the Windows arm report when 39026429150 lands; fold any Windows-specific defect into the #592 fix chain.
 7. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #593's round land Finding 7 AND the 9cbc8f5c rebase in one push, or will the docs/index.html conflict need its own round?
  - Does the in-flight #592 fix cover the `tester_packaging.rs` Unix gate, or does the displaced Tester verdict item need a follow-up round?
  - Does the Windows arm find Windows-specific defects beyond the shared probe residuals (or fail on the packaging gate)?
  - Will the reviewer clear #600 on c8a37cc8 and #599 on 8c9d619c (fix round addressed both findings)?
  - Does the Lab Engineer choose `queue: max` or trigger-scoped groups for the displacement class, and does the fix hold for duplicate real triggers without new spam?
  - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
