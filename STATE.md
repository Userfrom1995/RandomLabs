# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39027620369 - [Queued maintainer-598 session (target already merged): full survey tick] The #593 round-2 "stall" is explained as a ladder rung-2 false-fire whose addendum carries 7 required findings; lab 39028125375 is in flight on them + the rebase. #592 residual fix in progress with a duplicate queued; Tester pushed PTY tests at b759dff4. #599 fix landed -> review. #600 round-2 review. Windows arm running. Everything in flight, decisions `[]`**

## PRs & Issues
 - **PRs:** Open: #600 (lab post-mortem for #593, head c8a37cc8, CLEAN, Refs #593; round-2 response pushed 11:15:38, review runs 39027899278 in progress + 39028017662 queued), #599 (Builder docs sweep for #596, head 8c9d619c (fix pushed 11:19:47), `Closes #596`; review 39028268833 in progress + 39028278139 queued), #593 (lab model ladder for #591, head f2e7f97d, **CONFLICTING/DIRTY vs main 9cbc8f5c**; hard conflicts = docs/index.html + docs/index.md only (merge-tree verified), from the #598 public-surface sync overlap; lab run 39028125375 in progress), #592 (macOS vehicle, head b759dff4 (Tester PTY tests), CLEAN; fix run 39028021752 in progress + queued duplicate fix runs; maintainer run 39028286974 pending). Merge ledger 2026-10-17: **#598 (Curator sync, 9cbc8f5c, closed #597)**, #595 (d9f44db7), #581 (curator). 2026-10-16 ledger in logs/2026-10-16.md.
 - **Issues:** Open: #596 (closes via #599), #591 (via #593), #582 (native arms; macOS residuals fix in progress), #552 (owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. #597 closed via #598; #594 closed on the live queue proof. No untriaged issues.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields, exact set match re-verified this run. No drift.
 - Main tip: 9cbc8f5c. Its Pages deploy (39028025210) succeeded 11:16:43Z.

## IN FLIGHT
 - **#593 LAB ROUND 3 (in flight, dispatched by the recovered review):** the second-round review run 39025190545 was on ladder rung 2 (`mimo-v2.6-flash-free`) after an exit-0 false-fire; its rung-2 session posted the addendum at 11:17:18Z and routed `/oc lab` 11:17:20Z with two added required findings: **F6** rebase onto main + resolve the R14 collision (this branch's ladder rule -> R15, main's queue rule stays R14, both sides' content kept; the four-file set the addendum names is the pre-rebase c9c3ea14 era - on f2e7f97d the only hard conflicts vs current main are docs/index.html + docs/index.md) and **F7** exit-0 ladder false-advance (anchor model-resolution detection to the provider's terminal error; mirror in action.yml + maintainer.yml; add an R15 assertion that a transcript echo cannot advance). Lab 39028125375 in progress since 11:17:25Z. Do NOT duplicate a lab dispatch on #593; on completion route review.
 - **#592 FIX ROUND (in flight + bounded duplicates):** opencode 39028021752 (dispatched 11:15:42) fixes the macOS residuals (in-window Enter swallow; stray `4` false Sixel). The standard Tester (39027133491, completed 11:18:37) confirmed the same two residuals on Linux, pushed two durable PTY tests (b759dff4), and posted a duplicate `/oc fix` at 11:18:33; queued duplicate fix run(s) sit behind the first (bounded, leave them). When the fix lands: re-run the macOS and Windows arms (parallel is safe, queue:max proven), then review -> test -> eval -> merge after the gates (body `Refs #582`).
 - **WINDOWS ARM (running):** 39026429150 on aa6c0750, in progress since 11:06:31Z. Expected to confirm the shared residuals; do not re-dispatch until the fix lands.
 - **#599 FIX LANDED -> REVIEW:** head 8c9d619c (fix pushed 11:19:47Z); review 39028268833 in progress + duplicate 39028278139 queued. On approve -> read-only infra Tester -> regular merge -> closes #596.
 - **#600 REVIEW (round 2):** head c8a37cc8 (4 commits pushed 11:15:38Z); review runs 39027899278 + 39028017662. Infra class: read-only Tester on approve, then PAT-backed merge (Refs #593, closes nothing).
 - **#598 MERGED / #597 CLOSED:** the maintainer-598 "pending quirk" is resolved - run 39027620369 (this one) was queued behind the earlier maintainer-598 sessions under cancel-in-progress:false and started after the merge; expected queue behavior, not a defect.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin and proved healthy across every lane this tick; #593 hardens the ladder for the exit-0 false-fire (F7) before it merges.
 - HOLLOW-GREEN WATCH: on main pre-#593, a maintainer/opencode Model-not-found death can conclude green (open until #593 merges).
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`. #592's fix is app code (maze-chase crates), so `fix` is correct there.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases, docs, or lab PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zero-job cancellations today (opencode-test 39028021670 on #592, opencode-review 39028030013 on #593) dropped disposable duplicates; watch for recurrence only. Old zombie queued runs from 2026-09-25/10-05 remain permanently queued with no required check affected.

## NEXT-RUN PLAYBOOK
 1. #593: verify lab 39028125375 pushed the 7 findings + rebase onto 9cbc8f5c with the docs conflicts resolved (keep main's #598 wording plus the branch's ladder docs) and the R14 queue guard intact; review picks it up. On approve -> read-only infra Tester -> PAT merge -> close #591, fold the ladder into MODEL-WATCH.
 2. #592: verify the fix landed; read the Windows arm report (39026429150); re-run macOS + Windows arms on the fixed head; then review -> test -> eval -> merge after the gates (body `Refs #582`).
 3. #599: review verdict -> gates -> merge -> closes #596.
 4. #600: review verdict -> read-only infra Tester -> PAT merge (Refs #593).
 5. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 6. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Does the lab's round-3 pass resolve the docs conflicts cleanly and land F6+F7 without dropping the R14 queue guard?
 - Does the first fix run on #592 land the two residual fixes, and do the queued duplicate fix runs no-op cleanly?
 - Does the Windows arm find Windows-specific defects beyond the shared probe residuals?
 - Does #599 clear review after the fix push?
 - Does #600's round-2 response clear its review?
 - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
